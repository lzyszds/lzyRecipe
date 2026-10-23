import * as ImagePicker from 'expo-image-picker';
import { useSettingsStore } from '../store/settingsStore';

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * 上传图片文件到自建同步服务器 (POST /upload)
 * @param fileUri 手机本地图片文件地址 (file://...)
 * @returns 线上图片公开访问 URL (https://sync.lzyszds.cn/covers/...)
 */
export async function uploadImageFile(fileUri: string): Promise<string> {
  const settings = useSettingsStore.getState();
  const endpoint = (settings.sync?.endpoint?.trim() || 'https://sync.lzyszds.cn').replace(/\/+$/, '');
  const token = settings.sync?.token?.trim() || '';

  const rawFilename = fileUri.split('/').pop() || `recipe_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(rawFilename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const filename = rawFilename.includes('.') ? rawFilename : `${rawFilename}.${ext}`;

  const formData = new FormData();
  formData.append('image', {
    uri: fileUri,
    name: filename,
    type,
  } as any);

  const res = await fetch(`${endpoint}/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'application/json',
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`上传失败 (HTTP ${res.status}): ${text || res.statusText}`);
  }

  const json = await res.json();
  if (!json?.url) {
    throw new Error(json?.error || '服务器未返回图片地址');
  }

  return json.url;
}

/**
 * 唤起系统相册选取封面图片并上传至服务器
 */
export async function pickAndUploadImage(): Promise<UploadResult> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, error: '需要相册访问权限才能选取菜谱封面' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { ok: false, error: '已取消选择' };
    }

    const localUri = result.assets[0].uri;
    const remoteUrl = await uploadImageFile(localUri);
    return { ok: true, url: remoteUrl };
  } catch (err: any) {
    return { ok: false, error: err?.message || '上传异常' };
  }
}

/**
 * 唤起系统相机拍摄新封面并上传至服务器
 */
export async function takePhotoAndUpload(): Promise<UploadResult> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, error: '需要相机访问权限才能拍摄菜谱封面' };
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { ok: false, error: '已取消拍摄' };
    }

    const localUri = result.assets[0].uri;
    const remoteUrl = await uploadImageFile(localUri);
    return { ok: true, url: remoteUrl };
  } catch (err: any) {
    return { ok: false, error: err?.message || '上传异常' };
  }
}
