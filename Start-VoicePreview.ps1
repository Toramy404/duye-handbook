param([int]$Port=4318, [string]$Python='python', [switch]$Setup, [switch]$NoOpen)
$ErrorActionPreference='Stop'
$projectRoot=$PSScriptRoot
$pythonExe=Join-Path $projectRoot '.voice-runtime\venv\Scripts\python.exe'
if ($Setup) {
    Push-Location $projectRoot
    try {
        if (-not (Test-Path -LiteralPath $pythonExe)) { & $Python -m venv .voice-runtime\venv; if ($LASTEXITCODE -ne 0) {throw 'Python environment creation failed'} }
        & $pythonExe -m pip install --disable-pip-version-check -r scripts/voice-requirements.txt
        if ($LASTEXITCODE -ne 0) {throw 'Voice dependency installation failed'}
        & $pythonExe scripts/setup_voice.py
        if ($LASTEXITCODE -ne 0) {throw 'Voice model download or verification failed'}
        & $pythonExe scripts/build_voice_lexicon.py --check
        if ($LASTEXITCODE -ne 0) {throw 'Voice pronunciation index needs review'}
    } finally {Pop-Location}
}
if (-not (Test-Path -LiteralPath $pythonExe)) {throw 'First run: .\Start-VoicePreview.ps1 -Setup -Python <Python3.12 path>'}
if ($Port -ne 4318) {throw 'This preview uses port 4318 to keep personal records isolated. Do not change the port.'}
$healthUrl="http://127.0.0.1:$Port/health"
$health=$null
try {$health=Invoke-RestMethod $healthUrl -TimeoutSec 2} catch {}
$expected=[IO.Path]::GetFullPath((Join-Path $projectRoot 'dist'))
if ($health) {
    if ($health.app -ne 'nightreign-voice-preview' -or [IO.Path]::GetFullPath($health.root) -ne $expected) {throw 'Port 4318 belongs to another preview. Close that preview yourself before starting voice mode.'}
} else {
    $logDir=Join-Path $projectRoot 'reports\voice-preview'
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $process=Start-Process -FilePath $pythonExe -ArgumentList @('-u','scripts/voice_server.py','--port',"$Port") -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'server.log') -RedirectStandardError (Join-Path $logDir 'server-error.log')
    for ($i=0;$i -lt 30;$i++) {
        Start-Sleep -Milliseconds 250
        if ($process.HasExited) {throw 'Voice service stopped; inspect reports/voice-preview/server-error.log'}
        try {$health=Invoke-RestMethod $healthUrl -TimeoutSec 1;break} catch {}
    }
    if (-not $health -or $health.app -ne 'nightreign-voice-preview' -or [IO.Path]::GetFullPath($health.root) -ne $expected) {throw 'Voice service did not start at the expected address'}
    $process.Id | Set-Content -LiteralPath (Join-Path $logDir 'server.pid')
}
Write-Output "Voice preview ready: http://127.0.0.1:$Port/#voice"
if (-not $NoOpen) {Start-Process "http://127.0.0.1:$Port/#voice"}
