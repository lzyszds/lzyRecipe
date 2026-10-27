import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
  Pressable,
  Easing,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Ellipse,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import ReaAnimated, {
  useSharedValue,
  useAnimatedProps,
  withTiming as reaTiming,
  Easing as ReaEasing,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { Sparkles } from 'lucide-react-native';
import { Palette, Radius } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 描线动画改用 Reanimated 驱动：UI 线程逐帧更新 SVG 属性，避免 JS 桥逐帧更新大量元素造成的掉帧卡顿
const ReaPath = ReaAnimated.createAnimatedComponent(Path);
const ReaRect = ReaAnimated.createAnimatedComponent(Rect);
const ReaCircle = ReaAnimated.createAnimatedComponent(Circle);
const ReaEllipse = ReaAnimated.createAnimatedComponent(Ellipse);
// 进度条矩形仍用 RN Animated（宽度走 JS 插值，与描线无关）
const AnimatedRect = Animated.createAnimatedComponent(Rect);

// 参考稿（gemini-svg）统一金色描边：所有线条只用金渐变，无深色描边
const GOLD = {
  fill: 'none' as const,
  stroke: 'url(#goldGradient)',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// 描线虚线总长（离线测得各组路径长度，取最大值 1102，向上取整留余量）
const SKETCH_DASH = 1200;

// 会话级冷启动标记（仅冷启动展示一次，避免路由深层切换时重复遮挡）
let hasShownSplashThisSession = false;

const PROGRESS_TRACK_WIDTH = 160;

interface AppSplashScreenProps {
  onFinish?: () => void;
  forceShow?: boolean;
}

export function AppSplashScreen({ onFinish, forceShow = false }: AppSplashScreenProps) {
  // 如果当前会话已经展示过且非强制，则直接不渲染
  const shouldRender = forceShow || !hasShownSplashThisSession;
  const [visible, setVisible] = useState(shouldRender);
  // 加载设计稿同款站酷快乐体（品牌标题专用）；加载失败时降级系统字体，不阻塞开屏
  const [fontsLoaded, fontError] = useFonts({
    'ZCOOL KuaiLe': require('../../assets/fonts/ZCOOLKuaiLe-Regular.ttf'),
  });
  const fontReady = fontsLoaded || !!fontError;

  // 动画驱动值
  // 1. 边缘描线进度 (1000 -> 0) — Reanimated 共享值，UI 线程驱动
  const lineProgress = useSharedValue(SKETCH_DASH);
  // 全部描线元素共享同一份 animatedProps：一次 worklet 求值，所有线条同步走针
  const sketchDash = useAnimatedProps(() => ({ strokeDashoffset: lineProgress.value }));
  // 2. 线条层整体透明度与微缩放 (1 -> 0)
  const lineLayerOpacity = useRef(new Animated.Value(1)).current;
  const lineLayerScale = useRef(new Animated.Value(1)).current;
  // 3. 真实 3D 实体图透明度 (0 -> 1，纯显隐淡入不缩放)
  const imageOpacity = useRef(new Animated.Value(0)).current;
  // 4. 底部品牌与文案淡入 (0 -> 1，快速就绪)
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(8)).current;
  // 5. 进度条推进 (0 -> 1)
  const progressBarAnim = useRef(new Animated.Value(0)).current;
  // 6. 星光装饰淡入
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  // 7. 整个全屏开屏退场动画 (1 -> 0)
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const isExiting = useRef(false);

  const handleFinish = () => {
    if (isExiting.current) return;
    isExiting.current = true;
    hasShownSplashThisSession = true;

    // 平滑退场淡出
    Animated.parallel([
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(exitScale, {
        toValue: 1.05,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onFinish?.();
    });
  };

  // 流程定时器（描线 / 消融 / 星光 / 退场各阶段）
  const flowTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearFlowTimers = () => {
    flowTimersRef.current.forEach(clearTimeout);
    flowTimersRef.current = [];
  };

  const scheduleFlowStep = (fn: () => void, delay: number) => {
    flowTimersRef.current.push(setTimeout(fn, delay));
  };

  // 完整的开屏动画流程（阶段 1 ~ 5）
  const runSplashFlow = () => {
    clearFlowTimers();

    // 阶段 1：边缘流光线条匀速描画 (0ms ~ 2200ms) — 线性匀速，画完即衔接图片，不留空窗
    lineProgress.value = reaTiming(0, {
      duration: 2200,
      easing: ReaEasing.linear,
    });

    // 阶段 2：真实的进度多阶段递进 (伴随动画与资源加载节奏)
    Animated.sequence([
      // 0ms ~ 600ms：快速起步准备 (0% -> 35%)
      Animated.timing(progressBarAnim, {
        toValue: 0.35,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      // 600ms ~ 1500ms：线条匀速描绘成形 (35% -> 72%)
      Animated.timing(progressBarAnim, {
        toValue: 0.72,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      // 1500ms ~ 2500ms：3D 渲染图融合替换注入 (72% -> 92%)
      Animated.timing(progressBarAnim, {
        toValue: 0.92,
        duration: 1000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      // 2500ms ~ 3400ms：资源就绪平滑走满 100%
      Animated.timing(progressBarAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    // 阶段 3：在 2300ms 处启动“线稿消融 ➔ 3D 实图渐变替换”（画完即换，无缝衔接）
    scheduleFlowStep(() => {
      Animated.parallel([
        Animated.timing(lineLayerOpacity, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(lineLayerScale, {
          toValue: 1.04,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // 真实图片：纯显隐淡入（不做缩放弹跳）
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 2300);

    // 阶段 4：金色星光四散闪耀 (2500ms)
    scheduleFlowStep(() => {
      Animated.timing(sparkleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 2500);

    // 阶段 5：走满后自动退场进入 App 主界面 (3700ms)
    scheduleFlowStep(() => {
      handleFinish();
    }, 3700);
  };

  useEffect(() => {
    if (!shouldRender) {
      SplashScreen.hideAsync().catch(() => {});
      return;
    }

    // 字体未就绪先不启动动画：保持原生启动图遮挡，避免 TTF 解析卡在描线中途
    if (!fontReady) return;

    // 字体就绪后再隐藏原生静态启动屏，无缝衔接动态开屏
    SplashScreen.hideAsync().catch(() => {});

    // 底部品牌与进度条从一开始立即平滑就位 (0ms ~ 200ms)
    Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(brandTranslateY, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 启动完整开屏流程（阶段 1 ~ 5）
    runSplashFlow();

    return () => {
      clearFlowTimers();
    };
  }, [shouldRender, fontReady]);

  if (!visible || !fontReady) return null;

  const progressWidthInterpolate = progressBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PROGRESS_TRACK_WIDTH],
  });

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: exitOpacity,
          transform: [{ scale: exitScale }],
        },
      ]}
      pointerEvents="auto"
    >
      {/* 设计稿同款径向暖光背景 (中心奶油白 → 边缘浅棕) */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 175"
        preserveAspectRatio="xMidYMid slice"
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="splashBgGlow" cx="50%" cy="38%" r="85%">
            <Stop offset="0%" stopColor="#FFF8EE" />
            <Stop offset="55%" stopColor="#F6E7CF" />
            <Stop offset="100%" stopColor="#E8D3B2" />
          </RadialGradient>
        </Defs>
        <Rect x={-50} y={-50} width={200} height={275} fill="url(#splashBgGlow)" />
      </Svg>

      {/* 顶部：品牌徽标 + 跳过胶囊按钮（贴心交互，避免赶时间） */}
      <View style={styles.topBar}>
        <View style={styles.badgePill}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>CookMoment</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.skipButton,
            pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
          ]}
          onPress={handleFinish}
          hitSlop={12}
        >
          <Text style={styles.skipButtonText}>跳过</Text>
        </Pressable>
      </View>

      {/* 核心舞台视觉区 (线稿描画 ➔ 3D实图无缝替换) */}
      <View style={styles.stageContainer}>
        {/* 底部柔和立体阴影 (叠层椭圆模拟柔焦，避开 SVG 滤镜在 Android 上的渲染开销) */}
        <View style={styles.bottomGlowWrap}>
          <Svg width={300} height={48} viewBox="0 0 300 40">
            <Ellipse cx={150} cy={22} rx={135} ry={14} fill="#8C5A2C" opacity={0.08} />
            <Ellipse cx={150} cy={22} rx={120} ry={12} fill="#8C5A2C" opacity={0.09} />
            <Ellipse cx={150} cy={22} rx={105} ry={10} fill="#8C5A2C" opacity={0.11} />
          </Svg>
        </View>

        {/* 1. 下层：真实 3D 小黄鸭主厨高清图片 (透明度 0 ➔ 1，纯显隐淡入) */}
        <Animated.View style={[styles.imageWrap, { opacity: imageOpacity }]}>
          <Image
            source={require('../../assets/images/093926azcUrjbXBsmEPSSw.png')}
            style={styles.realImage}
            contentFit="contain"
            transition={200}
            priority="high"
          />
        </Animated.View>

        {/* 2. 上层：高精度金色矢量轮廓描画层 (线稿绘制 ➔ 闪亮消融) */}
        <Animated.View
          style={[
            styles.svgLayerWrap,
            {
              opacity: lineLayerOpacity,
              transform: [{ scale: lineLayerScale }],
            },
          ]}
          pointerEvents="none"
        >
          <Svg width={310} height={310} viewBox="0 0 400 400">
            <Defs>
              <LinearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#F5CE6E" />
                <Stop offset="25%" stopColor="#FFF0C4" />
                <Stop offset="50%" stopColor="#EFB84D" />
                <Stop offset="75%" stopColor="#D1932B" />
                <Stop offset="100%" stopColor="#F3C765" />
              </LinearGradient>
            </Defs>

            {/* ===== 描线层：85 条线合并为 9 条复合路径（每帧仅 9 次节点更新，告别逐元素桥调卡顿）===== */}
            {/* decor (16 条线合一, len≈881) */}
            <ReaPath
              d="M 4.85 107.12 Q 22.35 102.12 34.85 114.62 Q 42.35 122.12 44.85 129.62 Q 24.85 127.12 14.85 119.62 Q 7.35 112.12 4.85 107.12 Z M 4.85 107.12 Q 24.85 117.12 44.85 129.62 M 23.85 148.12 Q 23.85 154.62 17.35 154.62 Q 23.85 154.62 23.85 161.12 Q 23.85 154.62 30.35 154.62 Q 23.85 154.62 23.85 148.12 Z M 52.35 164.62 Q 52.35 177.12 38.85 177.12 Q 52.35 177.12 52.35 189.62 Q 52.35 177.12 65.85 177.12 Q 52.35 177.12 52.35 164.62 Z M 24.85 219.62 Q 47.35 217.12 59.85 234.62 Q 64.85 244.62 67.35 252.12 Q 44.85 249.62 32.35 237.12 Q 24.85 227.12 24.85 219.62 Z M 24.85 219.62 Q 47.35 234.62 67.35 252.12 M 242.35 37.12 Q 252.35 44.62 244.85 59.62 Q 237.35 69.62 219.85 74.62 Q 217.35 57.12 227.35 44.62 Q 234.85 37.12 242.35 37.12 Z M 242.35 37.12 Q 232.35 54.62 219.85 74.62 M 307.85 66.12 C 307.85 70.54 304.28 74.12 299.85 74.12 C 295.44 74.12 291.85 70.54 291.85 66.12 C 291.85 61.7 295.44 58.12 299.85 58.12 C 304.28 58.12 307.85 61.7 307.85 66.12 Z M 324.35 54.12 C 324.35 56.05 322.79 57.62 320.85 57.62 C 318.92 57.62 317.35 56.05 317.35 54.12 C 317.35 52.18 318.92 50.62 320.85 50.62 C 322.79 50.62 324.35 52.18 324.35 54.12 Z M 394.85 232.12 Q 379.85 227.12 367.35 237.12 Q 362.35 242.12 359.85 249.62 Q 377.35 254.62 387.35 247.12 Q 394.85 239.62 394.85 232.12 Z M 359.85 249.62 Q 377.35 239.62 394.85 232.12 M 355.85 257.12 Q 355.85 266.12 347.35 266.12 Q 355.85 266.12 355.85 274.62 Q 355.85 266.12 364.35 266.12 Q 355.85 266.12 355.85 257.12 Z M 379.85 287.12 C 379.85 289.88 377.62 292.12 374.85 292.12 C 372.1 292.12 369.85 289.88 369.85 287.12 C 369.85 284.35 372.1 282.12 374.85 282.12 C 377.62 282.12 379.85 284.35 379.85 287.12 Z M 315.85 299.62 Q 334.85 287.12 352.35 292.12 Q 359.85 294.62 364.85 299.62 Q 344.85 312.12 329.85 307.12 Q 319.85 304.62 315.85 299.62 Z M 306.35 321.12 C 306.35 324.71 303.45 327.62 299.85 327.62 C 296.27 327.62 293.35 324.71 293.35 321.12 C 293.35 317.53 296.27 314.62 299.85 314.62 C 303.45 314.62 306.35 317.53 306.35 321.12 Z"
              {...GOLD}
              strokeWidth={2}
              strokeDasharray={SKETCH_DASH}
              animatedProps={sketchDash}
            />
            {/* hat (5 条线合一, len≈683) */}
            <ReaPath
              d="M 97.96 158.84 C 64.96 156.84 44.96 129.34 60.96 104.34 C 54.96 74.34 82.46 51.84 113.96 57.84 C 137.46 34.34 182.46 39.34 192.46 65.84 C 200.96 84.34 194.96 100.84 180.96 106.84 M 60.96 104.34 C 77.46 109.34 89.96 124.34 92.46 134.34 M 113.96 57.84 C 124.96 74.34 127.46 89.34 125.96 102.84 M 172.46 81.84 C 167.46 91.84 162.46 99.34 157.46 104.34 M 92.46 135.84 C 107.46 109.34 157.46 94.34 180.96 100.84 L 190.96 122.84 C 159.96 114.34 114.96 131.84 98.96 162.84 Z"
              {...GOLD}
              strokeWidth={3.5}
              strokeDasharray={SKETCH_DASH}
              animatedProps={sketchDash}
            />
            {/* duck (11 条线合一, len≈521) */}
            <ReaPath
              d="M 99.06 162.98 C 90.06 189.48 95.06 219.48 106.06 242.98 M 191.06 122.98 C 222.57 134.48 247.57 159.48 257.57 191.98 M 257.57 191.98 C 261.06 171.98 274.06 167.98 280.06 182.98 C 282.57 189.48 289.06 191.98 288.06 201.98 C 287.06 214.48 282.57 226.98 272.57 234.48 M 162.57 132.98 C 166.06 124.48 171.06 127.98 169.06 134.48 C 174.06 125.98 177.57 130.98 173.06 136.98 M 171.57 187.98 C 171.57 192.95 167.53 196.98 162.57 196.98 C 157.59 196.98 153.57 192.95 153.57 187.98 C 153.57 183.01 157.59 178.98 162.57 178.98 C 167.53 178.98 171.57 183.01 171.57 187.98 Z M 162.57 184.98 C 162.57 186.36 161.45 187.48 160.06 187.48 C 158.69 187.48 157.57 186.36 157.57 184.98 C 157.57 183.59 158.69 182.48 160.06 182.48 C 161.45 182.48 162.57 183.59 162.57 184.98 Z M 228.19 164.72 C 230.53 168.78 229.92 173.54 226.82 175.34 C 223.71 177.14 219.29 175.3 216.93 171.23 C 214.59 167.17 215.2 162.42 218.31 160.62 C 221.43 158.82 225.85 160.65 228.19 164.72 Z M 222.06 164.98 C 222.06 166.08 221.17 166.98 220.06 166.98 C 218.96 166.98 218.06 166.08 218.06 164.98 C 218.06 163.88 218.96 162.98 220.06 162.98 C 221.17 162.98 222.06 163.88 222.06 164.98 Z M 176.06 197.98 C 182.57 194.48 187.57 184.48 197.57 177.98 C 207.57 171.98 217.57 179.48 227.57 180.98 C 234.06 181.98 231.06 189.48 221.06 191.98 C 207.57 192.98 192.57 200.98 180.06 202.98 C 175.06 202.98 174.06 199.48 176.06 197.98 Z M 182.57 202.48 C 192.57 214.48 217.57 210.98 224.06 191.48 M 190.06 200.98 C 200.06 205.98 212.57 202.98 217.57 192.98"
              {...GOLD}
              strokeWidth={3.5}
              strokeDasharray={SKETCH_DASH}
              animatedProps={sketchDash}
            />
            {/* calendar (17 条线合一, len≈782) */}
            <ReaPath
              d="M 221.03 129.73 L 228.03 94.73 Q 232.53 79.73 249.03 83.23 L 332.53 99.73 Q 347.53 103.23 344.03 119.73 L 321.03 229.73 M 339.03 101.23 Q 351.03 104.73 348.03 121.23 L 326.03 224.73 M 343.03 103.23 Q 355.03 107.23 352.03 123.23 L 330.03 219.73 M 226.03 106.23 L 334.03 128.23 M 252.53 91.23 C 252.53 67.23 267.53 69.73 269.03 83.23 M 261.03 93.23 C 261.03 95.99 258.79 98.23 256.03 98.23 C 253.27 98.23 251.03 95.99 251.03 93.23 C 251.03 90.47 253.27 88.23 256.03 88.23 C 258.79 88.23 261.03 90.47 261.03 93.23 Z M 314.03 103.23 C 314.03 79.73 329.03 82.23 330.03 96.23 M 322.53 105.23 C 322.53 107.99 320.29 110.23 317.53 110.23 C 314.76 110.23 312.53 107.99 312.53 105.23 C 312.53 102.47 314.76 100.23 317.53 100.23 C 320.29 100.23 322.53 102.47 322.53 105.23 Z M 239.74 124.73 L 251.8 129.6 Q 255.5 131.1 254 134.8 L 249.13 146.85 Q 247.64 150.57 243.92 149.07 L 231.87 144.2 Q 228.15 142.7 229.66 139 L 234.53 126.94 Q 236.03 123.23 239.74 124.73 Z M 268.74 130.73 L 280.8 135.6 Q 284.5 137.1 283 140.8 L 278.13 152.85 Q 276.64 156.57 272.92 155.07 L 260.87 150.2 Q 257.15 148.7 258.66 145 L 263.53 132.94 Q 265.03 129.23 268.74 130.73 Z M 297.74 136.73 L 309.8 141.6 Q 313.5 143.1 312 146.8 L 307.13 158.85 Q 305.64 162.57 301.92 161.07 L 289.87 156.2 Q 286.15 154.7 287.66 151 L 292.53 138.94 Q 294.03 135.23 297.74 136.73 Z M 233.74 153.73 L 245.8 158.6 Q 249.5 160.1 248 163.8 L 243.13 175.85 Q 241.64 179.57 237.92 178.07 L 225.87 173.2 Q 222.15 171.7 223.66 168 L 228.53 155.94 Q 230.03 152.23 233.74 153.73 Z M 262.74 159.73 L 274.8 164.6 Q 278.5 166.1 277 169.8 L 272.13 181.85 Q 270.64 185.57 266.92 184.07 L 254.87 179.2 Q 251.15 177.7 252.66 174 L 257.53 161.94 Q 259.03 158.23 262.74 159.73 Z M 291.74 165.73 L 303.8 170.6 Q 307.5 172.1 306 175.8 L 301.13 187.85 Q 299.64 191.57 295.92 190.07 L 283.87 185.2 Q 280.15 183.7 281.66 180 L 286.53 167.94 Q 288.03 164.23 291.74 165.73 Z M 290.03 171.23 L 299.03 179.73 L 319.03 159.73 M 285.74 194.73 L 297.8 199.6 Q 301.5 201.1 300 204.8 L 295.13 216.85 Q 293.64 220.57 289.92 219.07 L 277.87 214.2 Q 274.15 212.7 275.66 209 L 280.53 196.94 Q 282.03 193.23 285.74 194.73 Z M 289.03 201.23 L 294.03 206.23 L 301.03 196.23"
              {...GOLD}
              strokeWidth={2.5}
              strokeDasharray={SKETCH_DASH}
              animatedProps={sketchDash}
            />
            {/* clock (3 条线合一, len≈37) */}
            <ReaPath
              d="M 379.91 182.01 C 379.91 199.96 365.36 214.51 347.41 214.51 C 329.46 214.51 314.91 199.96 314.91 182.01 C 314.91 164.06 329.46 149.51 347.41 149.51 C 365.36 149.51 379.91 164.06 379.91 182.01 Z M 371.41 182.01 C 371.41 195.26 360.67 206.01 347.41 206.01 C 334.15 206.01 323.41 195.26 323.41 182.01 C 323.41 168.76 334.15 158.01 347.41 158.01 C 360.67 158.01 371.41 168.76 371.41 182.01 Z M 348.91 163.01 L 344.91 183.01 L 357.91 193.01"
              {...GOLD}
              strokeWidth={3.5}
              strokeDasharray={SKETCH_DASH}
              animatedProps={sketchDash}
            />
            {/* spoon (8 条线合一, len≈334) */}
            <ReaPath
              d="M 82.12 264.14 C 75.61 244.14 79.12 224.14 90.61 226.63 C 100.61 229.14 104.12 249.14 109.12 267.63 M 94.12 227.63 L 90.61 214.14 C 90.61 194.14 80.61 176.63 65.61 179.14 C 52.12 181.63 54.12 204.14 67.12 215.63 C 75.61 222.63 82.12 226.63 85.61 234.14 M 100.61 246.63 L 117.12 269.14 M 67.12 184.14 C 59.12 186.63 60.61 202.63 70.61 210.63 C 78.12 216.63 84.12 211.63 84.12 201.63 M 231.07 217.12 L 238.94 215.73 Q 241.9 215.21 242.42 218.16 L 243.81 226.03 Q 244.33 229 241.39 229.52 L 233.5 230.9 Q 230.54 231.42 230.02 228.47 L 228.63 220.6 Q 228.12 217.63 231.07 217.12 Z M 231.12 224.63 L 234.61 227.63 L 240.12 220.63 M 264.86 217.92 L 273.99 213.85 Q 276.73 212.62 277.94 215.38 L 282.01 224.5 Q 283.24 227.23 280.49 228.47 L 271.36 232.54 Q 268.62 233.76 267.4 231.02 L 263.33 221.88 Q 262.12 219.14 264.86 217.92 Z M 266.12 226.63 L 270.12 229.63 L 276.12 221.63"
              {...GOLD}
              strokeWidth={3.5}
              strokeDasharray={SKETCH_DASH}
              animatedProps={sketchDash}
            />
            {/* pot (14 条线合一, len≈815) */}
            <ReaPath
              d="M 168.35 313.27 C 164.76 321.34 136.29 316.51 104.75 302.47 C 73.22 288.41 50.56 270.5 54.16 262.43 C 57.76 254.34 86.23 259.19 117.76 273.23 C 149.31 287.27 171.95 305.2 168.35 313.27 Z M 162.42 310.63 C 159.72 316.69 134.63 311.39 106.38 298.81 C 78.12 286.23 57.41 271.13 60.11 265.07 C 62.8 259 87.88 264.31 116.14 276.87 C 144.4 289.47 165.11 304.57 162.42 310.63 Z M 51.26 275.85 L 48.26 304.34 C 47.76 324.34 77.76 337.85 111.26 340.85 C 132.76 341.85 145.26 334.34 149.26 319.34 L 161.26 302.85 M 55.26 270.85 C 36.26 264.34 35.26 279.34 50.26 287.85 M 166.26 302.85 C 175.26 304.34 172.76 315.85 155.26 315.85 L 132.76 314.34 M 67.76 285.85 C 71.26 274.34 97.76 277.85 97.76 294.34 M 76.26 277.85 L 84.26 280.85 L 82.76 274.85 L 86.26 279.34 L 92.26 278.85 M 153.26 277.85 C 153.26 290 143.41 299.85 131.26 299.85 C 119.11 299.85 109.26 290 109.26 277.85 C 109.26 265.7 119.11 255.85 131.26 255.85 C 143.41 255.85 153.26 265.7 153.26 277.85 Z M 129.26 255.85 C 129.26 255.85 125.26 262.85 122.76 262.85 C 127.76 264.85 131.26 264.34 131.26 264.34 C 131.26 264.34 130.26 270.85 132.76 271.85 C 134.26 266.85 135.26 263.85 135.26 263.85 C 135.26 263.85 141.26 265.85 142.76 263.85 C 139.26 260.85 135.26 259.85 135.26 259.85 C 135.26 259.85 138.26 254.85 136.26 253.85 C 132.76 256.85 132.26 258.85 132.26 258.85 Z M 148.26 262.85 C 151.26 244.34 171.26 234.34 177.76 237.85 C 181.26 244.34 176.26 255.85 169.26 262.85 M 152.76 261.85 Q 165.26 249.34 177.76 237.85 M 152.26 279.34 C 156.26 259.34 187.76 249.34 204.26 260.85 C 201.26 279.34 177.76 294.34 152.26 286.85 Z M 152.26 282.85 Q 177.76 271.85 204.26 260.85 M 153.26 289.34 C 167.76 287.85 197.76 284.34 206.26 297.85 C 196.26 310.85 170.26 309.34 152.76 294.34 Z"
              {...GOLD}
              strokeWidth={3}
              strokeDasharray={SKETCH_DASH}
              animatedProps={sketchDash}
            />
            {/* book (10 条线合一, len≈1102) */}
            <ReaPath
              d="M 152.93 291.72 Q 179.93 295.72 205.93 297.72 M 198.93 317.72 L 218.93 250.72 C 222.43 242.72 228.93 240.72 238.93 240.72 L 280.93 242.72 C 287.43 242.72 290.93 245.72 295.93 241.72 L 335.93 224.23 C 342.43 221.72 345.93 225.72 342.93 232.72 L 315.93 295.72 C 312.43 302.72 307.43 305.72 300.93 307.72 L 277.43 317.72 C 270.93 321.72 264.93 321.72 258.93 318.72 L 205.93 324.23 C 199.93 324.23 197.43 321.72 198.93 317.72 Z M 291.93 243.72 L 263.93 319.72 M 299.93 242.72 L 272.93 319.23 M 200.93 307.72 L 217.93 236.72 C 239.93 230.72 269.93 232.72 290.93 242.72 M 215.93 242.72 C 238.93 236.72 268.93 237.72 289.93 243.72 M 220.93 232.72 C 242.43 226.72 270.93 229.23 290.93 241.72 M 290.93 242.72 C 302.43 224.23 317.43 211.72 324.93 207.72 L 320.93 229.23 M 292.93 242.72 C 305.93 227.72 322.43 216.72 332.43 212.72 L 327.93 227.72 M 294.93 242.72 C 309.93 231.72 324.93 222.72 333.93 219.23 M 239.93 290.72 C 233.93 287.72 234.93 277.72 243.93 277.72 C 248.93 269.23 260.93 269.23 264.93 277.72 C 273.93 277.72 274.93 287.72 266.93 291.72 L 262.93 300.72 L 238.93 300.72 Z"
              {...GOLD}
              strokeWidth={2.5}
              strokeDasharray={SKETCH_DASH}
              animatedProps={sketchDash}
            />

            {/* 静态点缀（不参与描线动画） */}
            <Ellipse cx={145}
              cy={214.5}
              rx={11}
              ry={7.5}
              transform="rotate(-15 145 214.5)"
              fill="none" stroke="url(#goldGradient)" strokeLinecap="round" strokeLinejoin="round"
              strokeWidth={2}
              strokeDasharray="2 2" />
            <Ellipse cx={245}
              cy={179.5}
              rx={8}
              ry={10}
              transform="rotate(-15 245 179.5)"
              fill="none" stroke="url(#goldGradient)" strokeLinecap="round" strokeLinejoin="round"
              strokeWidth={2}
              strokeDasharray="2 2" />
            <Path d="M307.5 164.5 A39 39 0 1 1 325 223"
              fill="none" stroke="url(#goldGradient)" strokeLinecap="round" strokeLinejoin="round"
              strokeWidth={2}
              strokeDasharray="5 4" />
                    </Svg>
        </Animated.View>

        {/* 3. 星光点缀 (使用 Lucide 图标保证零原生 Emoji 规范) */}
        <Animated.View
          style={[
            styles.sparkleWrap,
            { opacity: sparkleOpacity },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.sparkleItem, { top: 140, left: 12 }]}>
            <Sparkles size={20} color="#F5B82E" />
          </View>
          <View style={[styles.sparkleItem, { top: 118, right: 4 }]}>
            <Sparkles size={16} color="#F5B82E" />
          </View>
          <View style={[styles.sparkleItem, { bottom: 34, right: 20 }]}>
            <Sparkles size={18} color="#FF9442" />
          </View>
        </Animated.View>
      </View>

      {/* 底部品牌标语与自推进度条 */}
      <Animated.View
        style={[
          styles.bottomBrandContainer,
          {
            opacity: brandOpacity,
            transform: [{ translateY: brandTranslateY }],
          },
        ]}
      >
        <View style={styles.brandTitleRow}>
          <Text style={[styles.brandTitle, fontsLoaded && { fontFamily: 'ZCOOL KuaiLe' }]}>
            食刻
          </Text>
          <View style={styles.brandSubBadge}>
            <Text style={styles.brandSubBadgeText}>美味准时</Text>
          </View>
        </View>

        <Text style={styles.brandSlogan}>每一刻 · 都是热气腾腾的好食光</Text>

        {/* 优雅加载进度条 (设计稿同款金橙渐变) */}
        <View style={styles.progressBarTrack}>
          <Svg width={156} height={4} viewBox="0 0 156 4">
            <Defs>
              <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#F5B82E" />
                <Stop offset="50%" stopColor="#E87A3E" />
                <Stop offset="100%" stopColor="#D96B43" />
              </LinearGradient>
            </Defs>
            <AnimatedRect
              x={0}
              y={0}
              width={progressWidthInterpolate}
              height={4}
              rx={2}
              fill="url(#progressGrad)"
            />
          </Svg>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E8D3B2',
    zIndex: 99999,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(140, 98, 57, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(140, 98, 57, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.primary,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C6239',
    letterSpacing: 0.8,
  },
  skipButton: {
    backgroundColor: 'rgba(38, 33, 30, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(38, 33, 30, 0.08)',
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.inkMuted,
  },
  stageContainer: {
    width: 310,
    height: 310,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bottomGlowWrap: {
    position: 'absolute',
    // 锅底实测: 基准图 y≈666/671 → 舞台 y≈275, 椭圆中心(距包裹顶 26.4)对准锅底
    bottom: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    width: 310,
    height: 310,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  realImage: {
    width: '100%',
    height: '100%',
  },
  svgLayerWrap: {
    position: 'absolute',
    // 描线整体微调：原稿偏高 ~20px，但底部元素随之偏低，收敛到 +8
    top: 8,
    width: 310,
    height: 310,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleWrap: {
    ...StyleSheet.absoluteFill,
  },
  sparkleItem: {
    position: 'absolute',
  },
  bottomBrandContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 8,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 36,
    color: '#4A3525',
    letterSpacing: 2,
    textShadowColor: 'rgba(74, 53, 37, 0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  brandSubBadge: {
    backgroundColor: '#D96B43',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    shadowColor: '#D96B43',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  brandSubBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFDF9',
    letterSpacing: 1,
  },
  brandSlogan: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8C6D53',
    letterSpacing: 1.2,
    marginBottom: 20,
  },
  progressBarTrack: {
    width: PROGRESS_TRACK_WIDTH,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: '#E3CBB0',
    overflow: 'hidden',
    padding: 2,
    alignItems: 'flex-start',
  },
});
