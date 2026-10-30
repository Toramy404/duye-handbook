param(
    [ValidateRange(1024,65535)][int]$Port = 4318,
    [switch]$NoBrowser,
    [switch]$ResolveOnly,
    [string]$RuntimeDirectory
)
$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { 'C:\Program Files\nodejs\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) {
    if ($NoBrowser -or $ResolveOnly) { throw 'Node.js is required to verify the preview service.' }
    Start-Process (Join-Path $PSScriptRoot 'dist\index.html')
    exit
}
function Resolve-PreviewPath([string]$Value) {
    $encoded = & $nodePath -e "process.stdout.write(Buffer.from(require('node:fs').realpathSync(process.argv[1]),'utf8').toString('base64'))" $Value
    if ($LASTEXITCODE -ne 0) { throw "Cannot resolve preview path: $Value" }
    return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([string]$encoded))
}
$previewRoot = Resolve-PreviewPath $PSScriptRoot
$expectedRoot = Resolve-PreviewPath (Join-Path $previewRoot 'dist')
if ($ResolveOnly) { $previewRoot; exit }
$runtimeRoot = if ($RuntimeDirectory) { [IO.Path]::GetFullPath($RuntimeDirectory) } else { $previewRoot }
if (-not [IO.Directory]::Exists($runtimeRoot)) { throw "Runtime directory does not exist: $runtimeRoot" }
$previewUrl = "http://127.0.0.1:$Port/"
function Get-PreviewHealth {
    try {
        $response = Invoke-WebRequest ($previewUrl + 'health') -UseBasicParsing -TimeoutSec 2
        return ([Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()) | ConvertFrom-Json)
    }
    catch { return $null }
}
function Assert-PreviewIdentity($Health) {
    if ($Health.app -ne 'nightreign-local' -or -not $Health.root) {
        throw "Port $Port belongs to another application."
    }
    $actualRoot = Resolve-PreviewPath ([string]$Health.root)
    if (-not [string]::Equals($actualRoot,$expectedRoot,[StringComparison]::OrdinalIgnoreCase)) {
        throw "Port $Port serves another checkout: $actualRoot"
    }
}
$health = Get-PreviewHealth
$started = $false
$server = $null
if ($null -ne $health) {
    Assert-PreviewIdentity $health
} else {
    $probe = New-Object Net.Sockets.TcpClient
    try {
        $pending = $probe.ConnectAsync('127.0.0.1',$Port)
        try { $null = $pending.Wait(500) } catch {}
        if ($probe.Connected) { throw "Port $Port is occupied but has no matching preview health response." }
    } finally { $probe.Dispose() }
    $previousPort = $env:NIGHTREIGN_PORT
    try {
        $env:NIGHTREIGN_PORT = [string]$Port
        $server = Start-Process -FilePath $nodePath -ArgumentList 'serve.mjs' -WorkingDirectory $previewRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeRoot 'preview.stdout.log') -RedirectStandardError (Join-Path $runtimeRoot 'preview.stderr.log')
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            Start-Sleep -Milliseconds 100
            $server.Refresh()
            if ($server.HasExited) { throw 'Preview process exited before readiness.' }
            $health = Get-PreviewHealth
            if ($null -ne $health) { Assert-PreviewIdentity $health; break }
        }
        if ($null -eq $health) { throw 'Preview service did not become ready.' }
        $server.Id | Set-Content -LiteralPath (Join-Path $runtimeRoot 'preview.pid')
        $started = $true
    } catch {
        if ($null -ne $server -and -not $server.HasExited) { Stop-Process -Id $server.Id -ErrorAction SilentlyContinue }
        throw
    } finally { $env:NIGHTREIGN_PORT = $previousPort }
}
if (-not $NoBrowser) { Start-Process ($previewUrl + '#home') }
[pscustomobject]@{ root=$previewRoot; port=$Port; started=$started; processId=$(if ($started) { $server.Id } else { $null }) } | ConvertTo-Json -Compress
