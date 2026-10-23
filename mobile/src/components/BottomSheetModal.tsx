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
 * 1. 遮罩背景原地渐现（绝不跟随从底部滑出），内容卡片自底部平滑滑入；
 * 2. 支持全区域平滑下滑拖拽关闭（Drag to Close），顶部设有原生胶囊拖拽条；
 * 3. 智能手势判定：拖动距离 > 80px 或向下甩动初速度 > 0.4 立即顺滑滑落退出，否则弹性复位。
 */
export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  onClose,
  children,
  sheetStyle,
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [isRendered, setIsRendered] = useState(visible);

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

  // 弹窗卡片背景响应器：仅在明显向下拖动时接管
  const bodyPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 向下滑动超过 12px 且垂直位移明显大于水平位移时接管
        return (
          gestureState.dy > 12 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx * 1.5)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.45) {
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
      onRequestClose={onClose}
    >
      <StatusBar style="light" animated />
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
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
      </View>
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
