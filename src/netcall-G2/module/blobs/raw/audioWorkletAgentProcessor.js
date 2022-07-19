/* eslint-disable */
registerProcessor('audioWorkletAgentProcessor', class extends AudioWorkletProcessor {
  // Float32Array[][][]
  constructor () {
    super();
    this.inputDataSeq = []
    this.port.onmessage = event => {
      if (event.data.type === "outputData"){
        this.inputDataSeq.push(event.data.data)
      }
    }
  }

  process (inputs, outputs, parameters) {

    this.port.postMessage({
      type: 'rawinputs',
      inputs,
    });
    
    const inputData = this.inputDataSeq.shift()
    if (inputData && outputs[0]){
      if (outputs[0][1]){
        outputs[0][1].set(inputData[0])
      }
      outputs[0][0].set(inputData[0])
    }

    return true;
  }
});