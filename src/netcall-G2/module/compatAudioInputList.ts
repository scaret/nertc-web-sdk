class CompatAudioInputList{
  enabled: boolean = false
  compatTracks: {source: MediaStreamTrack, dest: MediaStreamTrack}[] = []
  findSource(destTrackId: string){
    const pair = this.compatTracks.find((pair)=>{
      return pair.dest.id === destTrackId
    })
    return pair ? pair.source : null
  }
}

export const compatAudioInputList = new CompatAudioInputList()