export enum VIDEO_FRAME_RATE_ENUM {
  CHAT_VIDEO_FRAME_RATE_NORMAL = 15,
  CHAT_VIDEO_FRAME_RATE_5 = 5,
  CHAT_VIDEO_FRAME_RATE_10 = 10,
  CHAT_VIDEO_FRAME_RATE_15 = 15,
  CHAT_VIDEO_FRAME_RATE_20 = 20,
  CHAT_VIDEO_FRAME_RATE_25 = 25,
}

/**
 * 视频帧率设置
 */
export const VIDEO_FRAME_RATE = {
  /**
   *    视频通话帧率默认值 最大取每秒15帧
   */
  CHAT_VIDEO_FRAME_RATE_NORMAL: 15,

  /**
   * 视频通话帧率 最大取每秒5帧
   */
  CHAT_VIDEO_FRAME_RATE_5: 5,

  /**
   * 视频通话帧率 最大取每秒10帧
   */
  CHAT_VIDEO_FRAME_RATE_10: 10,

  /**
   * 视频通话帧率 最大取每秒15帧
   */
  CHAT_VIDEO_FRAME_RATE_15: 15,

  /**
   * 视频通话帧率 最大取每秒20帧
   */
  CHAT_VIDEO_FRAME_RATE_20: 20,

  /**
   * 视频通话帧率 最大取每秒25帧
   */
  CHAT_VIDEO_FRAME_RATE_25: 25
}

export enum NERTC_VIDEO_QUALITY_ENUM{
  VIDEO_QUALITY_180p = 180,
  VIDEO_QUALITY_480p = 480,
  VIDEO_QUALITY_720p = 720,
  VIDEO_QUALITY_1080p = 1080,
}

export const NERTC_VIDEO_QUALITY = {
  VIDEO_QUALITY_180p: 180,
  VIDEO_QUALITY_480p: 480,
  VIDEO_QUALITY_720p: 720,
  VIDEO_QUALITY_1080p: 1080,
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
