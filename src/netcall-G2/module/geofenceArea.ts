import { LBS_REGION_CONFIG } from '../Config'
import { getDefaultLogger } from '../util/webrtcLogger'
import { getParameters } from './parameters'

class GeofenceArea {
  areaCode = 'GLOBAL'
  regions = LBS_REGION_CONFIG
  logger = getDefaultLogger().getChild(() => {
    let tag = `GeofenceArea ` + this.areaCode
    return tag
  })
  setAreaById(areaCode: string) {
    if (!this.regions[areaCode]) {
      this.logger.error(
        `setAreaById: 不存在该区域：${areaCode}。可用区域：${this.getAvailableAreas().join(',')}`
      )
    } else {
      const oldAreaCode = this.areaCode
      this.areaCode = areaCode
      this.logger.log(`setArea: ${oldAreaCode} -> ${areaCode}`)
    }
    for (let i in getParameters().clients) {
      const client = getParameters().clients[i]
      if (!client.destroyed && client.adapterRef.connectState.curState === 'DISCONNECTED') {
        client.adapterRef.lbsManager.loadBuiltinConfig('setArea')
      }
    }
  }
  getAvailableAreas() {
    const areaCodes = []
    for (let areaCode in this.regions) {
      if (this.regions[areaCode] && this.regions[areaCode].nrtc) {
        areaCodes.push(areaCode)
      }
    }
    return areaCodes
  }
  getBuiltinConfig() {
    if (getParameters().forceGeofenceArea !== 'NONE') {
      return this.regions[getParameters().forceGeofenceArea]
    } else {
      return this.regions[this.areaCode]
    }
  }
}

export const geofenceArea = new GeofenceArea()
