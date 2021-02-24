/**
 * 视频分辨率设置
 */
export const VIDEO_QUALITY = {
  /**
   * 视频默认分辨率 640x480
   */
  CHAT_VIDEO_QUALITY_NORMAL: 0,

  /**
   * 视频低分辨率 176x144
   */
  CHAT_VIDEO_QUALITY_LOW: 1,

  /**
   * 视频中分辨率 352x288
   */
  CHAT_VIDEO_QUALITY_MEDIUM: 2,

  /**
   * 视频高分辨率 480x360
   */
  CHAT_VIDEO_QUALITY_HIGH: 3,

  /**
   *视频480p分辨率 640x480
   */
  CHAT_VIDEO_QUALITY_480P: 4,

  /**
   * 视频540P分辨率 960x540
   */
  CHAT_VIDEO_QUALITY_540P: 5,

  /**
   * 视频720P分辨率 1080x720
   */
  CHAT_VIDEO_QUALITY_720P: 6,

  /**
   * 视频720P分辨率 1920x1080
   */
  CHAT_VIDEO_QUALITY_1080P: 7
}


/**
 * 视频帧率设置
 */
export const VIDEO_FRAME_RATE = {
  /**
   *    视频通话帧率默认值 最大取每秒15帧
   */
  CHAT_VIDEO_FRAME_RATE_NORMAL: 0,

  /**
   * 视频通话帧率 最大取每秒5帧
   */
  CHAT_VIDEO_FRAME_RATE_5: 1,

  /**
   * 视频通话帧率 最大取每秒10帧
   */
  CHAT_VIDEO_FRAME_RATE_10: 2,

  /**
   * 视频通话帧率 最大取每秒15帧
   */
  CHAT_VIDEO_FRAME_RATE_15: 3,

  /**
   * 视频通话帧率 最大取每秒20帧
   */
  CHAT_VIDEO_FRAME_RATE_20: 4,

  /**
   * 视频通话帧率 最大取每秒25帧
   */
  CHAT_VIDEO_FRAME_RATE_25: 5
}


export const WEBRTC2_VIDEO_QUALITY = {
  VIDEO_QUALITY_180p: 2,
  VIDEO_QUALITY_480p: 4,
  VIDEO_QUALITY_720p: 8,
  VIDEO_QUALITY_1080p: 16
}

export const VIDEO_QUALITY_REV = {
  [VIDEO_QUALITY.CHAT_VIDEO_QUALITY_NORMAL]: '640x480',
  [VIDEO_QUALITY.CHAT_VIDEO_QUALITY_LOW]: '176x144',
  [VIDEO_QUALITY.CHAT_VIDEO_QUALITY_MEDIUM]: '352x288',
  [VIDEO_QUALITY.CHAT_VIDEO_QUALITY_HIGH]: '480x360',
  [VIDEO_QUALITY.CHAT_VIDEO_QUALITY_480P]: '640x480',
  [VIDEO_QUALITY.CHAT_VIDEO_QUALITY_540P]: '960x540',
  [VIDEO_QUALITY.CHAT_VIDEO_QUALITY_720P]: '1280x720',
  [VIDEO_QUALITY.CHAT_VIDEO_QUALITY_1080P]: '1920x1080',
}

export const WEBRTC2_VIDEO_QUALITY_REV = {
  [WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_180p]: '320x180',
  [WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_480p]: '640x480',
  [WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_720p]: '1280x720',
  [WEBRTC2_VIDEO_QUALITY.VIDEO_QUALITY_1080p]: '1920x1080'
}


/**
 * 校验器
 *
 * @param {Number} value 待校验值
 */
export function validateVideoQuality (value:number) {
  const keys = Object.keys(VIDEO_QUALITY)
  let valid = false
  for (let key in keys) {
    if (VIDEO_QUALITY[key as keyof typeof VIDEO_QUALITY] === value) {
      valid = true
    }
  }
  return valid
}
