class VoiceCapture extends AudioWorkletProcessor {
 process(inputs,outputs){
  const channel=inputs[0]&&inputs[0][0];
  if(channel){const copy=channel.slice();this.port.postMessage(copy,[copy.buffer]);}
  // A connected, silent output keeps the graph running without microphone feedback.
  if(outputs[0])for(const output of outputs[0])output.fill(0);
  return true;
 }
}
registerProcessor('duye-voice-capture',VoiceCapture);
