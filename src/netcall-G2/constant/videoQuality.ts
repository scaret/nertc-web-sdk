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


export const NERTC_VIDEO_QUALITY = {
  VIDEO_QUALITY_180p: 2,
  VIDEO_QUALITY_480p: 4,
  VIDEO_QUALITY_720p: 8,
  VIDEO_QUALITY_1080p: 16
}

export const NERTC_VIDEO_QUALITY_REV = {
  [NERTC_VIDEO_QUALITY.VIDEO_QUALITY_180p]: '320x180',
  [NERTC_VIDEO_QUALITY.VIDEO_QUALITY_480p]: '640x480',
  [NERTC_VIDEO_QUALITY.VIDEO_QUALITY_720p]: '1280x720',
  [NERTC_VIDEO_QUALITY.VIDEO_QUALITY_1080p]: '1920x1080'
}

export const STREAM_TYPE = {
  HIGH: 0,
  LOW: 1,
}
