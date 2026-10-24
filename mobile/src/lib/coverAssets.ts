// 已废弃本地封面文件引用，所有菜谱封面统一采用在线 HTTP(S) 地址或莫兰迪色优雅占位
export const LOCAL_COVERS: Record<string, any> = {};

export function getLocalCoverSource(_path: string) {
  return null;
}
