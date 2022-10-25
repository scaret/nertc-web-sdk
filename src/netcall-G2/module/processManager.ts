import { generateUUID } from '../util/rtcUtil/utils'
import { getParameters } from './parameters'

const SESSION_STORAGE_KEY = 'NERTC_PAGEID'
const LOCAL_STROAGE_KEY = 'NERTC_BROWSERID'

class ProcessManager {
  public id = new Date()
  // processId会在每次刷新时变化。整个页面共享一个processId
  public processId: string
  // pageId 标识不同的标签页。同一个页面刷新时不变化
  public pageId: string
  // browserId 标识不同的浏览器。同一个站点的同一个浏览器共享一个browserId
  public browserId: string

  constructor() {
    const uniqueId = `${generateUUID().substr(0, 4)}-${new Date()
      .toISOString()
      .replace(/[^\d]/g, '')}`
    this.processId = `proc-${uniqueId}`

    if (!getParameters().reportPageBrowserId) {
      this.pageId = ''
      this.browserId = ''
      return
    }

    try {
      let pageId = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (!pageId) {
        pageId = `page-` + uniqueId
        sessionStorage.setItem(SESSION_STORAGE_KEY, pageId)
      }
      this.pageId = pageId
    } catch (e) {
      // 无法读写sessionStorage
      this.pageId = ''
    }

    try {
      let browserId = sessionStorage.getItem(LOCAL_STROAGE_KEY)
      if (!browserId) {
        browserId = `brow-` + uniqueId
        localStorage.setItem(LOCAL_STROAGE_KEY, browserId)
      }
      this.browserId = browserId
    } catch (e) {
      // 无法读写localStorage
      this.browserId = ''
    }
  }
}

export const processManager = new ProcessManager()
