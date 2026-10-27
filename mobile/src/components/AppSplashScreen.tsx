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
  Stop,
} from 'react-native-svg';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { Sparkles } from 'lucide-react-native';
import { Palette, Radius } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 构造 SVG Animated 驱动组件
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// 会话级冷启动标记（仅冷启动展示一次，避免路由深层切换时重复遮挡）
let hasShownSplashThisSession = false;

const PROGRESS_TRACK_WIDTH = 170;

interface AppSplashScreenProps {
  onFinish?: () => void;
  forceShow?: boolean;
}

export function AppSplashScreen({ onFinish, forceShow = false }: AppSplashScreenProps) {
  // 如果当前会话已经展示过且非强制，则直接不渲染
  const shouldRender = forceShow || !hasShownSplashThisSession;
  const [visible, setVisible] = useState(shouldRender);

  // 动画驱动值
  // 1. 边缘描线进度 (1000 -> 0)
  const lineProgress = useRef(new Animated.Value(1000)).current;
  // 2. 线条层整体透明度与微缩放 (1 -> 0)
  const lineLayerOpacity = useRef(new Animated.Value(1)).current;
  const lineLayerScale = useRef(new Animated.Value(1)).current;
  // 3. 真实 3D 实体图透明度与微弹缩放 (0 -> 1)
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(0.92)).current;
  // 4. 底部品牌与文案淡入 (0 -> 1，快速就绪)
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(8)).current;
  // 5. 进度条推进 (0 -> 1)
  const progressBarAnim = useRef(new Animated.Value(0)).current;
  const [progressPercent, setProgressPercent] = useState(0);
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

  useEffect(() => {
    if (!shouldRender) {
      SplashScreen.hideAsync().catch(() => {});
      return;
    }

    // 挂载后立即隐藏原生静态启动屏，无缝衔接动态开屏
    SplashScreen.hideAsync().catch(() => {});

    // 监听进度条真实数值更新百分比 (0% -> 100%)
    const progressListenerId = progressBarAnim.addListener(({ value }) => {
      setProgressPercent(Math.min(100, Math.max(0, Math.floor(value * 100))));
    });

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

    // 阶段 1：边缘流光线条飞速描画 (0ms ~ 1100ms)
    Animated.timing(lineProgress, {
      toValue: 0,
      duration: 1100,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();

    // 阶段 2：真实的进度多阶段递进 (伴随动画与资源加载节奏)
    Animated.sequence([
      // 0ms ~ 450ms：快速起步准备 (0% -> 35%)
      Animated.timing(progressBarAnim, {
        toValue: 0.35,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      // 450ms ~ 1100ms：线条匀速描绘成形 (35% -> 72%)
      Animated.timing(progressBarAnim, {
        toValue: 0.72,
        duration: 650,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      // 1100ms ~ 1650ms：3D 渲染图融合替换注入 (72% -> 92%)
      Animated.timing(progressBarAnim, {
        toValue: 0.92,
        duration: 550,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      // 1650ms ~ 2100ms：资源就绪平滑走满 100%
      Animated.timing(progressBarAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    // 阶段 3：在 1100ms 处启动“线稿消融 ➔ 3D 实图渐变替换与果冻微弹”
    const replaceTimer = setTimeout(() => {
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

      Animated.parallel([
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(imageScale, {
          toValue: 1,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1100);

    // 阶段 4：金色星光四散闪耀 (1250ms)
    const sparkleTimer = setTimeout(() => {
      Animated.timing(sparkleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 1250);

    // 阶段 5：走满后自动退场进入 App 主界面 (2400ms)
    const exitTimer = setTimeout(() => {
      handleFinish();
    }, 2400);

    return () => {
      progressBarAnim.removeListener(progressListenerId);
      clearTimeout(replaceTimer);
      clearTimeout(sparkleTimer);
      clearTimeout(exitTimer);
    };
  }, [shouldRender]);

  if (!visible) return null;

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
      {/* 顶部跳过胶囊按钮（贴心交互，避免赶时间） */}
      <View style={styles.topBar}>
        <View style={styles.badgePill}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>COOK MOMENT</Text>
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
        {/* 底部柔和立体阴影 */}
        <View style={styles.bottomGlowWrap}>
          <Svg width={240} height={36} viewBox="0 0 240 36">
            <Ellipse
              cx={120}
              cy={18}
              rx={95}
              ry={11}
              fill="#8C5A2C"
              opacity={0.16}
            />
          </Svg>
        </View>

        {/* 1. 下层：真实 3D 小黄鸭主厨高清图片 (透明度 0 ➔ 1，伴随果冻微弹) */}
        <Animated.View
          style={[
            styles.imageWrap,
            {
              opacity: imageOpacity,
              transform: [{ scale: imageScale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/images/093926azcUrjbXBsmEPSSw.webp')}
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
          <Svg width={300} height={300} viewBox="0 0 400 400">
            <Defs>
              <LinearGradient id="sketchOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFD449" />
                <Stop offset="45%" stopColor="#FF9442" />
                <Stop offset="100%" stopColor={Palette.primary} />
              </LinearGradient>
              <LinearGradient id="sketchGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FFF2D6" />
                <Stop offset="50%" stopColor="#E5A83B" />
                <Stop offset="100%" stopColor="#BD7422" />
              </LinearGradient>
            </Defs>

            {/* (A) 主厨帽云朵波浪外轮廓 */}
            <AnimatedPath
              d="M125 150 C95 130, 110 70, 155 75 C175 40, 230 40, 248 72 C285 70, 298 120, 268 145 C248 160, 220 155, 205 150 Z"
              fill="none"
              stroke="url(#sketchOrange)"
              strokeWidth={3.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={1000}
              strokeDashoffset={lineProgress}
            />
            <AnimatedPath
              d="M142 145 C170 135, 225 135, 252 142 L248 162 C220 156, 170 156, 145 162 Z"
              fill="none"
              stroke="url(#sketchOrange)"
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={1000}
              strokeDashoffset={lineProgress}
            />

            {/* (B) 小黄鸭圆润脸蛋与身体 */}
            <AnimatedPath
              d="M145 162 C125 185, 128 245, 175 260 C235 272, 280 235, 272 185 C265 155, 245 158, 248 162"
              fill="none"
              stroke="url(#sketchOrange)"
              strokeWidth={3.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={1000}
              strokeDashoffset={lineProgress}
            />

            {/* 灵动双眼 */}
            <AnimatedCircle
              cx={186}
              cy={186}
              r={7.5}
              fill="none"
              stroke="#9E5B28"
              strokeWidth={2.4}
              strokeDasharray={100}
              strokeDashoffset={lineProgress}
            />
            <AnimatedCircle
              cx={240}
              cy={184}
              r={7.5}
              fill="none"
              stroke="#9E5B28"
              strokeWidth={2.4}
              strokeDasharray={100}
              strokeDashoffset={lineProgress}
            />

            {/* 微笑鸭嘴 */}
            <AnimatedPath
              d="M198 195 C210 185, 228 185, 238 198 C225 212, 208 212, 198 195 Z"
              fill="none"
              stroke="url(#sketchOrange)"
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={200}
              strokeDashoffset={lineProgress}
            />

            {/* (C) 右上角打卡日历 */}
            <AnimatedRect
              x={250}
              y={98}
              width={92}
              height={112}
              rx={16}
              transform="rotate(13 250 98)"
              fill="none"
              stroke="url(#sketchGold)"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeDasharray={500}
              strokeDashoffset={lineProgress}
            />
            {/* 日历对勾 */}
            <AnimatedPath
              d="M298 165 L308 175 L328 152"
              fill="none"
              stroke="#E5A83B"
              strokeWidth={4.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={100}
              strokeDashoffset={lineProgress}
            />

            {/* (D) 悬浮时钟与指针 */}
            <AnimatedCircle
              cx={330}
              cy={186}
              r={28}
              fill="none"
              stroke="url(#sketchGold)"
              strokeWidth={2.8}
              strokeDasharray={300}
              strokeDashoffset={lineProgress}
            />
            <AnimatedPath
              d="M330 186 L332 168 M330 186 L342 195"
              fill="none"
              stroke="url(#sketchGold)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={100}
              strokeDashoffset={lineProgress}
            />

            {/* (E) 木勺与左手 */}
            <AnimatedEllipse
              cx={112}
              cy={190}
              rx={14}
              ry={18}
              transform="rotate(-30 112 190)"
              fill="none"
              stroke="url(#sketchGold)"
              strokeWidth={2.8}
              strokeDasharray={150}
              strokeDashoffset={lineProgress}
            />
            <AnimatedPath
              d="M125 185 C112 170, 95 185, 108 205 L135 245"
              fill="none"
              stroke="url(#sketchGold)"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeDasharray={200}
              strokeDashoffset={lineProgress}
            />

            {/* (F) 沸腾炖锅与小番茄 */}
            <AnimatedPath
              d="M85 248 C85 240, 175 240, 175 248 L168 288 C165 304, 98 304, 92 288 Z"
              fill="none"
              stroke="url(#sketchGold)"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={400}
              strokeDashoffset={lineProgress}
            />
            <AnimatedCircle
              cx={156}
              cy={254}
              r={18}
              fill="none"
              stroke="url(#sketchOrange)"
              strokeWidth={2.8}
              strokeDasharray={200}
              strokeDashoffset={lineProgress}
            />

            {/* (G) 翻开的菜谱书 */}
            <AnimatedPath
              d="M225 252 L268 232 L312 254 L306 308 L265 288 L220 306 Z"
              fill="none"
              stroke="url(#sketchGold)"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={500}
              strokeDashoffset={lineProgress}
            />
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
          <View style={[styles.sparkleItem, { top: 12, left: 24 }]}>
            <Sparkles size={20} color="#F5B82E" />
          </View>
          <View style={[styles.sparkleItem, { top: 140, right: 18 }]}>
            <Sparkles size={16} color="#F5B82E" />
          </View>
          <View style={[styles.sparkleItem, { bottom: 20, right: 36 }]}>
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
          <Text style={styles.brandTitle}>食刻</Text>
          <View style={styles.brandSubBadge}>
            <Text style={styles.brandSubBadgeText}>美味准时</Text>
          </View>
        </View>

        <Text style={styles.brandSlogan}>每一刻 · 都是热气腾腾的好食光</Text>

        {/* 胶囊进度条与实时动态百分比 */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: progressWidthInterpolate },
              ]}
            >
              <View style={styles.progressBarGlowDot} />
            </Animated.View>
          </View>
          <Text style={styles.progressPercentText}>{progressPercent}%</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F7E9D2',
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
    fontSize: 10,
    fontWeight: '700',
    color: '#8C6239',
    letterSpacing: 1.5,
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
    bottom: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrap: {
    width: 290,
    height: 290,
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
    width: 300,
    height: 300,
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
    fontSize: 32,
    fontWeight: '900',
    color: '#3E2A1E',
    letterSpacing: 2,
  },
  brandSubBadge: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    shadowColor: Palette.primary,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#8C6D53',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  progressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarTrack: {
    width: PROGRESS_TRACK_WIDTH,
    height: 7,
    borderRadius: Radius.full,
    backgroundColor: '#E5D1B8',
    overflow: 'hidden',
    padding: 1,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  progressBarGlowDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFF2D6',
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C6239',
    minWidth: 32,
    textAlign: 'left',
  },
});
