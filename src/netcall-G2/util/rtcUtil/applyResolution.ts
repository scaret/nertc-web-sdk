import {ILogger} from "../../types";

export async function applyResolution(track: MediaStreamTrack, targetWidth:number, targetHeight: number, logger: ILogger){
  const settingsBefore = track.getSettings()
  if (!settingsBefore.width || !settingsBefore.height){
    logger.log(`applyResolution 摄像头不支持动态修改分辨率 【${track.label}】`)
  } else if (settingsBefore.width !== targetWidth || settingsBefore.height !== targetHeight){
    const constraint:MediaTrackConstraints = {
      aspectRatio: settingsBefore.width / settingsBefore.height
    }

    // 仅控制一项，以保留长宽比
    if (settingsBefore.width / settingsBefore.height >= targetWidth / targetHeight) {
      constraint.width = targetWidth
    } else {
      constraint.height = targetHeight
    }
    await track.applyConstraints(constraint)

    // 检查新的长宽比是否应用成功
    const settingsAfter = track.getSettings()
    if (settingsBefore.width !== settingsAfter.width || settingsBefore.height !== settingsAfter.height){
      logger.log(`applyResolution 成功修改分辨率 ${settingsBefore.width}x${settingsBefore.height} => ${settingsAfter.width}x${settingsAfter.height} 【${track.label}】`)
    }else{
      logger.warn(`applyResolution 无法修改分辨率为${targetWidth}x${targetHeight}，目前的分辨率：${settingsBefore.width}x${settingsBefore.height} 【${track.label}】`)
    }
  } else {
    logger.log(`applyResolution 无需修改分辨率 ${settingsBefore.width}x${settingsBefore.height} 【${track.label}】`)
  }
}