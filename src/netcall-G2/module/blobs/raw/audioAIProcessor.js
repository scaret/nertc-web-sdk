/**
 * 模拟一个AI Worklet
 * 其实是个Delay
 */
registerProcessor('audioAIProcessor', class extends AudioWorkletProcessor {
  constructor () {
    super();
    // 尚未接入AI，以延迟1秒为例
    this.inputSamplesHistory = []
    this.delayMs = 3000
  }

  process (inputs, outputs, parameters) {
    const now = Date.now()
    const input = inputs[0].map((channel)=>{
      return channel.slice(0)
    });
    const output = outputs[0];
    this.inputSamplesHistory.push({
      input,
      ms: now
    })
    const firstItem = this.inputSamplesHistory[0]
    if (firstItem){
      if (now - firstItem.ms > this.delayMs){
        this.inputSamplesHistory.shift()
        output.forEach((channel, index)=>{
          for (let i = 0; i < channel.length; i++){
            if (firstItem.input[index] && firstItem.input[index][i]){
              channel[i] = firstItem.input[index][i]
            }
          }
        })
      }
    }
    return true;
  }
});