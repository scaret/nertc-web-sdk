package com.netease.nimlib.sdk.avchat.constant;

import com.netease.nimlib.avchat.biz.constant.IAVChatService;

/**
 * 网络通话控制命令（音视频开关及模式切换枚举）
 */
public enum AVChatControlCommand {
    /**
     * 未知类型，错误的值
     */
    UNKNOWN(-1),
    /**
     * 通知对方自己打开了音频
     */
    NOTIFY_AUDIO_ON(IAVChatService.ControlCommand.AUDIO_ON),
    /**
     * 通知对方自己关闭了音频
     */
    NOTIFY_AUDIO_OFF(IAVChatService.ControlCommand.AUDIO_OFF),
    /**
     * 通知对方自己打开了视频
     */
    NOTIFY_VIDEO_ON(IAVChatService.ControlCommand.VIDEO_ON),
    /**
     * 通知对方自己关闭了视频
     */
    NOTIFY_VIDEO_OFF(IAVChatService.ControlCommand.VIDEO_OFF),
    /**
     * 音频切换到视频
     */
    SWITCH_AUDIO_TO_VIDEO(IAVChatService.ControlCommand.AUDIO_TO_VIDEO),
    /**
     * 同意从音频切换到视频
     */
    SWITCH_AUDIO_TO_VIDEO_AGREE(IAVChatService.ControlCommand.AGREE_AUDIO_TO_VIDEO),
    /**
     * 拒绝从音频切换到视频
     */
    SWITCH_AUDIO_TO_VIDEO_REJECT(IAVChatService.ControlCommand.REJECT_AUDIO_TO_VIDEO),
    /**
     * 视频切换到音频
     */
    SWITCH_VIDEO_TO_AUDIO(IAVChatService.ControlCommand.VIDEO_TO_AUDIO),
    /**
     * 占线
     */
    BUSY(IAVChatService.ControlCommand.BUSY),

    /**
     * 通知对方响铃
     */
    START_NOTIFY_RECEIVED(IAVChatService.ControlCommand.NOTIFY_RECIEVED),

    /**
     * 通知对方开始了视频录制
     */
    NOTIFY_RECORD_START(IAVChatService.ControlCommand.NOTIFY_RECORD_START),

    /**
     * 通知对方结束了视频录制
     */
    NOTIFY_RECORD_STOP(IAVChatService.ControlCommand.NOTIFY_RECORD_STOP);

    private int value;

    AVChatControlCommand(int value) {
        this.value = value;
    }

    public int getValue() {
        return value;
    }

    public static AVChatControlCommand typeOfValue(int value) {
        for (AVChatControlCommand e : values()) {
            if (e.getValue() == value) {
                return e;
            }
        }
        return UNKNOWN;
    }
}
