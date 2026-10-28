import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Download, Clock3 } from 'lucide-react-native';
import { BottomSheetModal } from './BottomSheetModal';
import { useUpdateStore } from '@/store/updateStore';
import { downloadAndInstallApk, isInAppInstallSupported } from '@/lib/updater';
import { toast } from '@/store/feedbackStore';
import { Palette, Radius } from '@/constants/theme';

/**
 * 应用内整包更新弹窗：发现新版本 → 展示版本信息与更新说明 →
 * 应用内下载 APK（带进度条）→ 自动拉起系统安装器。
 * 由 _layout 全局挂载，检测到新版本时自动弹出。
 */
export const UpdateModal: React.FC = () => {
  const {
    available,
    visible,
    downloading,
    progress,
    setVisible,
    setDownloading,
    setProgress,
  } = useUpdateStore();

  // 关闭弹窗时重置下载状态
  useEffect(() => {
    if (!visible) {
      setDownloading(false);
      setProgress(0);
    }
  }, [visible, setDownloading, setProgress]);

  if (!available) return null;

  const handleUpdate = async () => {
    if (!isInAppInstallSupported()) {
      toast({ type: 'info', message: '请在手机上打开 App 进行更新' });
      return;
    }
    setDownloading(true);
    setProgress(0);
    try {
      await downloadAndInstallApk(available.apkUrl, (ratio) => setProgress(ratio));
      setDownloading(false);
      // 安装器已拉起，关闭弹窗；用户装完新包后版本号即更新
      setVisible(false);
    } catch (err: any) {
      setDownloading(false);
      toast({
        type: 'error',
        message: err?.message?.includes('cancel')
          ? '已取消下载'
          : `下载失败：${err?.message || '未知错误'}`,
      });
    }
  };

  const percent = Math.round(progress * 100);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={() => {
        if (!downloading) setVisible(false);
      }}
      sheetStyle={styles.sheet}
    >
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Download size={22} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>发现新版本</Text>
        <Text style={styles.versionText}>v{available.versionName}</Text>

        {Boolean(available.notes?.trim()) && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{available.notes!.trim()}</Text>
          </View>
        )}

        {downloading ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(percent, 3)}%` }]} />
            </View>
            <Text style={styles.progressText}>正在下载更新包 {percent}%</Text>
            <ActivityIndicator size="small" color={Palette.primary} style={styles.spinner} />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.updateBtn}
            onPress={handleUpdate}
            activeOpacity={0.85}
          >
            <Download size={16} color="#FFFFFF" />
            <Text style={styles.updateBtnText}>立即更新</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.laterBtn}
          onPress={() => setVisible(false)}
          disabled={downloading}
          activeOpacity={0.7}
        >
          <Clock3 size={13} color={Palette.cocoa[400]} />
          <Text style={styles.laterBtnText}>{downloading ? '下载中，请稍候' : '以后再说'}</Text>
        </TouchableOpacity>

        {Platform.OS === 'android' && (
          <Text style={styles.hintText}>
            首次更新时系统会询问"允许安装未知应用"，请选择允许
          </Text>
        )}
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  versionText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primary,
    marginTop: 4,
  },
  notesBox: {
    alignSelf: 'stretch',
    backgroundColor: Palette.oat[50],
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Palette.oat[200],
  },
  notesText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: Palette.cocoa[700],
  },
  progressWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 18,
    gap: 8,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.oat[200],
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.primary,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  spinner: { marginTop: 2 },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: Palette.primary,
    paddingVertical: 13,
    borderRadius: 16,
    gap: 6,
    marginTop: 18,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  updateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  laterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  laterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.cocoa[400],
  },
  hintText: {
    fontSize: 11,
    color: Palette.inkLight,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
});
