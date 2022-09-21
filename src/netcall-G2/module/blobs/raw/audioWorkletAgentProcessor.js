/* eslint-disable */
registerProcessor('audioWorkletAgentProcessor', class extends AudioWorkletProcessor {
  // Float32Array[][][]
  constructor () {
    super();
    this.inputDataSeq = []
    this.bufferDrop = 0
    this.bufferDropSum = 0
    this.bufferDropTime = 0
    this.port.onmessage = event => {
      if (event.data.type === "outputData"){
        this.inputDataSeq.push(event.data.data)
        this.bufferDrop++
      }
    }
  }

  process (inputs, outputs, parameters) {

    this.port.postMessage({
      type: 'rawinputs',
      inputs,
    });
    
    const inputData = this.inputDataSeq.shift()
    if (inputData && outputs[0] && !this.bufferDropSum){
      if (outputs[0][1]){
        outputs[0][1].set(inputData[0])
      }
      outputs[0][0].set(inputData[0])
    }
    if (this.bufferDrop > 20) {
      this.bufferDropSum += this.bufferDrop
      this.bufferDropTime = currentTime
    }
    this.bufferDrop = 0
    if (this.bufferDropTime && currentTime - this.bufferDropTime > 0.3) {
      this.inputDataSeq = []
      this.port.postMessage({
        type: 'bufferDrop',
        cnt: this.bufferDropSum,
      });
      this.bufferDropTime = 0
      this.bufferDropSum = 0
    }
    return true;
  }
});
