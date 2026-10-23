import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  StyleProp,
  ViewStyle,
  PanResponder,
  Keyboard,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  sheetStyle?: StyleProp<ViewStyle>;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 原生质感底部抽屉：
 * 1. 遮罩背景原地渐现，内容卡片自底部平滑滑入；
 * 2. 具备完整的输入法软键盘自适应（Keyboard Avoiding），在 Android / iOS 上软键盘升起时，
 *    自动平滑上移卡片底部并限制卡片最大高度，彻底解决输入框与操作按钮被软键盘遮挡的问题；
 * 3. 支持顶部胶囊把手拖拽关闭，软键盘弹出时智能停用页面内手势劫持，保障滚动输入极度顺滑。
 */
export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  onClose,
  children,
  sheetStyle,
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [isRendered, setIsRendered] = useState(visible);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const isKeyboardVisibleRef = useRef(false);

  // 监听输入法软键盘弹出与收起（Android 与 iOS 统一兼容）
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      const h = e?.endCoordinates?.height || 0;
      setKeyboardHeight(h);
      isKeyboardVisibleRef.current = true;
      Animated.timing(keyboardHeightAnim, {
        toValue: h,
        duration: Platform.OS === 'ios' ? (e.duration || 250) : 160,
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e: any) => {
      setKeyboardHeight(0);
      isKeyboardVisibleRef.current = false;
      Animated.timing(keyboardHeightAnim, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e?.duration || 200) : 140,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 顶部拖拽条响应器：零延迟即时捕获手势
  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        } else {
          // 向上轻微阻尼
          translateY.setValue(gestureState.dy * 0.15);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || gestureState.vy > 0.4) {
          Keyboard.dismiss();
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 24,
            stiffness: 300,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // 弹窗卡片背景响应器：软键盘弹出时严禁劫持滚动
  const bodyPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 软键盘开启时不劫持任何滑动，交给内层 ScrollView
        if (isKeyboardVisibleRef.current) return false;
        // 向下滑动超过 30px 且垂直位移明显大于水平位移时接管
        return (
          gestureState.dy > 30 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 2) &&
          gestureState.vy > 0.35
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.45) {
          Keyboard.dismiss();
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 24,
            stiffness: 300,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      translateY.setValue(SCREEN_HEIGHT * 0.7);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 26,
        stiffness: 280,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    } else {
      Keyboard.dismiss();
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsRendered(false);
      });
    }
  }, [visible]);

  if (!isRendered) return null;

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
    >
      <StatusBar style="light" animated />
      <Animated.View
        style={[
          styles.overlay,
          { paddingBottom: keyboardHeightAnim },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            keyboardHeight > 0 && {
              maxHeight: Math.max(
                280,
                SCREEN_HEIGHT - keyboardHeight - (Platform.OS === 'android' ? 36 : 48)
              ),
            },
            { transform: [{ translateY }] },
          ]}
          {...bodyPanResponder.panHandlers}
        >
          {/* 原生触感拖拽把手区：拖拽或点击均可操作 */}
          <View
            style={styles.handleContainer}
            {...handlePanResponder.panHandlers}
          >
            <View style={styles.handleBar} />
          </View>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 20,
  },
  handleContainer: {
    width: '100%',
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingTop: 6,
  },
  handleBar: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
  },
});
