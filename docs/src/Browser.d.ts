/**
 * 设备详情
 */
export interface DeviceInfo {
  /**
   * 该设备所独有的设备 ID（Chrome 81 及以后版本在获取媒体设备权限后才能获得设备 ID）
   */
  deviceId: string;
  /**
   * 能够区分设备的设备名字，例如"外接 USB 网络摄像头"（出于系统安全考虑，如果用户没有打开媒体设备的权限，该属性会被设为空）
   */
  label: string;
}
declare const Device: {
  getDevices(): Promise<{
    video: DeviceInfo[];
    audioIn: DeviceInfo[];
    audioOut: DeviceInfo[];
  }>;
  getCameras(): Promise<DeviceInfo[]>;
  getMicrophones(): Promise<DeviceInfo[]>;
  getSpeakers(): Promise<DeviceInfo[]>;
  clean(): void;
};
export { Device };
