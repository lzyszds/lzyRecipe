import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Trash2,
  Cloud,
  Info,
  HelpCircle,
  X,
} from 'lucide-react-native';
import { useFeedbackStore, ToastType } from '../store/feedbackStore';
import { Palette } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// 1. 全局自建 Toast（悬浮灵动胶囊）
// ============================================================================
export const GlobalCustomToast: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { currentToast, hideToast } = useFeedbackStore();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentToast) {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 9,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }
  }, [currentToast]);

  if (!currentToast) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 0],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.5, 1],
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const renderIcon = (type: ToastType = 'success') => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={15} color={Palette.sage} strokeWidth={2.6} />;
      case 'error':
        return <AlertCircle size={15} color={Palette.roseWarm} strokeWidth={2.4} />;
      case 'warning':
        return <AlertTriangle size={15} color="#F59E0B" strokeWidth={2.4} />;
      case 'info':
      default:
        return <Sparkles size={15} color={Palette.primary} strokeWidth={2.4} />;
    }
  };

  return (
    <View
      style={[
        styles.toastWrapper,
        { top: Math.max(insets.top, 14) + 6 },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.toastBubble,
          {
            transform: [{ translateY }, { scale }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.toastContent}
          onPress={hideToast}
          activeOpacity={0.9}
        >
          <View style={styles.toastIconWrapper}>
            {renderIcon(currentToast.type)}
          </View>
          <Text style={styles.toastText} numberOfLines={2}>
            {currentToast.message}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ============================================================================
// 2. 全局自建确认/警告对话框（彻底替代系统原生 Alert.alert）
// ============================================================================
export const GlobalCustomDialog: React.FC = () => {
  const { dialog, closeDialog } = useFeedbackStore();
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (dialog) {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 75,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [dialog]);

  if (!dialog) return null;

  const isAlertOnly = dialog.type === 'alert';
  const isDestructive = Boolean(dialog.destructive);

  // 顶层图标判定
  const renderDialogIcon = () => {
    if (isDestructive || dialog.icon === 'trash') {
      return (
        <View style={[styles.dialogIconBox, { backgroundColor: Palette.roseSoft }]}>
          <Trash2 size={24} color={Palette.roseWarm} strokeWidth={2.2} />
        </View>
      );
    }
    if (dialog.icon === 'cloud') {
      return (
        <View style={[styles.dialogIconBox, { backgroundColor: '#EFF6FF' }]}>
          <Cloud size={24} color="#2563EB" strokeWidth={2.2} />
        </View>
      );
    }
    if (dialog.icon === 'sparkles') {
      return (
        <View style={[styles.dialogIconBox, { backgroundColor: '#FEF3C7' }]}>
          <Sparkles size={24} color="#D97706" strokeWidth={2.2} />
        </View>
      );
    }
    if (dialog.icon === 'warning') {
      return (
        <View style={[styles.dialogIconBox, { backgroundColor: '#FEF3C7' }]}>
          <AlertTriangle size={24} color="#D97706" strokeWidth={2.2} />
        </View>
      );
    }
    return (
      <View style={[styles.dialogIconBox, { backgroundColor: Palette.primarySoft }]}>
        <HelpCircle size={24} color={Palette.primary} strokeWidth={2.2} />
      </View>
    );
  };

  return (
    <Modal
      visible={Boolean(dialog)}
      transparent
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={() => closeDialog(false)}
    >
      <StatusBar style="light" animated />
      <Pressable style={styles.dialogOverlay} onPress={() => closeDialog(false)}>
        <Animated.View
          style={[
            styles.dialogCard,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* 顶部醒目图标 */}
          {renderDialogIcon()}

          {/* 标题与描述 */}
          <Text style={styles.dialogTitle}>{dialog.title}</Text>
          {Boolean(dialog.message) && (
            <Text style={styles.dialogMessage}>{dialog.message}</Text>
          )}

          {/* 操作按钮区 */}
          <View style={styles.dialogActions}>
            {!isAlertOnly && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => closeDialog(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelButtonText}>
                  {dialog.cancelText || '取消'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.confirmButton,
                isDestructive && styles.destructiveButton,
                isAlertOnly && styles.fullWidthButton,
              ]}
              onPress={() => closeDialog(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmButtonText}>
                {dialog.confirmText || '确定'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// ============================================================================
// 3. 根级挂载组件，聚合 Toast 与 Dialog
// ============================================================================
export const GlobalCustomFeedback: React.FC = () => {
  return (
    <>
      <GlobalCustomToast />
      <GlobalCustomDialog />
    </>
  );
};

const styles = StyleSheet.create({
  // Toast Styles
  toastWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
  },
  toastBubble: {
    backgroundColor: 'rgba(28, 22, 18, 0.94)',
    borderRadius: 999,
    maxWidth: SCREEN_WIDTH - 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  toastIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Dialog Styles
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 18, 14, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECE4D8',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 16,
  },
  dialogIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dialogTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: Palette.ink,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  dialogMessage: {
    fontSize: 13,
    color: Palette.inkMuted,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  dialogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 15,
    backgroundColor: Palette.tagWarm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8DFD3',
  },
  cancelButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Palette.inkMuted,
  },
  confirmButton: {
    flex: 1.2,
    height: 44,
    borderRadius: 15,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  destructiveButton: {
    backgroundColor: Palette.roseWarm,
    shadowColor: Palette.roseWarm,
  },
  fullWidthButton: {
    flex: 1,
  },
  confirmButtonText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
