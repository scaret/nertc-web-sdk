/*
 * Copyright (c) 2021 NetEase, Inc.  All rights reserved.
 */

/**
 * 视频分辨率设置
 */
export declare const VIDEO_QUALITY: {
  /**
   * 视频默认分辨率 640x480
   */
  CHAT_VIDEO_QUALITY_NORMAL: number;
  /**
   * 视频低分辨率 176x144
   */
  CHAT_VIDEO_QUALITY_LOW: number;
  /**
   * 视频中分辨率 352x288
   */
  CHAT_VIDEO_QUALITY_MEDIUM: number;
  /**
   * 视频高分辨率 480x360
   */
  CHAT_VIDEO_QUALITY_HIGH: number;
  /**
   *视频480p分辨率 640x480
   */
  CHAT_VIDEO_QUALITY_480P: number;
  /**
   * 视频540P分辨率 960x540
   */
  CHAT_VIDEO_QUALITY_540P: number;
  /**
   * 视频720P分辨率 1080x720
   */
  CHAT_VIDEO_QUALITY_720P: number;
  /**
   * 视频720P分辨率 1920x1080
   */
  CHAT_VIDEO_QUALITY_1080P: number;
};


export declare const VIDEO_QUALITY_REV: {
  [x: number]: string;
};
export declare const WEBRTC2_VIDEO_QUALITY_REV: {
  [x: number]: string;
};
/**
 * 校验器
 *
 * @param {Number} value 待校验值
 */
export declare function validateVideoQuality(value: number): boolean;
