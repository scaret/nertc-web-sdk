class CompatAudioInputList{
  enabled: boolean = false
  compatAudioInputList: string[] = []
  localStorageKey = "compatAudioInputList"
  load(){
    let listFromLocalStorage:string[] = []
    try{
      listFromLocalStorage = JSON.parse(localStorage.getItem(this.localStorageKey) || "[]")
    }catch(e){
      
    }
    listFromLocalStorage.forEach((label)=>{
      if (!this.has(label)){
        this.compatAudioInputList.unshift(label)
      }
    })
  }
  addUnique(label: string){
    this.load()
    const index = this.compatAudioInputList.indexOf(label)
    if (index > -1){
      this.compatAudioInputList.splice(index, 1)
    }
    this.compatAudioInputList.push(label)
    this.save()
  }
  has(label: string){
    return this.compatAudioInputList.indexOf(label) > -1
  }
  private save(){
    const list = this.compatAudioInputList.slice(-20)
    // 下次getDevices，设备列表会出现【兼容模式】字样
    localStorage.setItem(this.localStorageKey, JSON.stringify(list))
  }
}

export const compatAudioInputList = new CompatAudioInputList()