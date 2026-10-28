/**
 * 今日主厨精选：堆叠卡组轮播（Tinder 式）
 *
 * - GestureHandler + Reanimated：手势与动画全程 UI 线程，丝滑跟手
 * - 顶卡横向拖拽跟手（带微倾斜），超过阈值翻飞淡出，堆叠补位；不足弹回
 * - 自动播放每 4.5s 翻飞一张；拖拽期间暂停
 * - React.memo 隔离：换页状态变化只重渲染本组件，不牵动首页大列表
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import ReaAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing as ReaEasing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Utensils, Clock, Plus } from 'lucide-react-native';
import type { Recipe } from '@/types';

// 高清主厨推荐保底图
const HERO_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80';

/** 自动播放间隔 */
const AUTO_PLAY_MS = 4500;
/** 翻飞触发阈值（px） */
const FLY_THRESHOLD = 70;

interface HeroCarouselProps {
  slides: Recipe[];
  onOpen: (recipe: Recipe) => void;
  onAddToPlan: (e: any, recipe: Recipe) => void;
}

/** 堆叠位型：0=顶卡 1/2=折叠层 ≥3=隐没 */
const slotFor = (p: number) => {
  if (p <= 0) return { y: 0, s: 1, o: 1 };
  if (p === 1) return { y: -16, s: 0.92, o: 0.55 };
  if (p === 2) return { y: -28, s: 0.84, o: 0.3 };
  return { y: -36, s: 0.8, o: 0 };
};

interface DeckCardProps {
  dish: Recipe;
  cardIndex: number;
  position: number;
  total: number;
  cardWidth: number;
  flySignal: number;
  onFlyDone: (cardIndex: number) => void;
  onDragState: (down: boolean) => void;
  onOpen: (recipe: Recipe) => void;
  onAddToPlan: (e: any, recipe: Recipe) => void;
}

const DeckCard = ({
  dish,
  cardIndex,
  position,
  total,
  cardWidth,
  flySignal,
  onFlyDone,
  onDragState,
  onOpen,
  onAddToPlan,
}: DeckCardProps) => {
  const slot = slotFor(position);
  const x = useSharedValue(0);
  const rot = useSharedValue(0);
  const y = useSharedValue(slot.y);
  const sc = useSharedValue(slot.s);
  const op = useSharedValue(slot.o);
  const flyingRef = useRef(false);

  /** 顶卡翻飞淡出，落位后通知卡组重排 */
  const flyOut = (dir: number) => {
    if (flyingRef.current) return;
    flyingRef.current = true;
    onDragState(true);
    x.value = withTiming(dir * (cardWidth + 80), { duration: 280, easing: ReaEasing.out(ReaEasing.quad) });
    rot.value = withTiming(dir * 14, { duration: 280, easing: ReaEasing.out(ReaEasing.quad) });
    op.value = withTiming(0, { duration: 240, easing: ReaEasing.out(ReaEasing.quad) }, (finished) => {
      if (finished) {
        flyingRef.current = false;
        runOnJS(onFlyDone)(cardIndex);
      }
    });
  };

  // 自动播放信号：顶卡响应翻飞
  useEffect(() => {
    if (position === 0 && flySignal > 0) flyOut(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flySignal]);

  // 位型变化：飞出的卡瞬间归位隐没；新顶卡弹簧上浮；其余柔和滑动
  useEffect(() => {
    const t = slotFor(position);
    if (position === total - 1) {
      x.value = 0;
      rot.value = 0;
      y.value = t.y;
      sc.value = t.s;
      op.value = 0;
    } else if (position === 0) {
      x.value = withSpring(0, { damping: 20, stiffness: 200 });
      rot.value = withSpring(0, { damping: 20, stiffness: 200 });
      y.value = withSpring(t.y, { damping: 20, stiffness: 200 });
      sc.value = withSpring(t.s, { damping: 20, stiffness: 200 });
      op.value = withTiming(1, { duration: 250 });
    } else {
      x.value = withTiming(0, { duration: 420, easing: ReaEasing.out(ReaEasing.cubic) });
      rot.value = withTiming(0, { duration: 420 });
      y.value = withTiming(t.y, { duration: 420, easing: ReaEasing.out(ReaEasing.cubic) });
      sc.value = withTiming(t.s, { duration: 420, easing: ReaEasing.out(ReaEasing.cubic) });
      op.value = withTiming(t.o, { duration: 420, easing: ReaEasing.out(ReaEasing.cubic) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  // 顶卡横向拖拽手势：更早的横向激活阈值 + 更大的纵向容忍，
  // 确保鼠标/触控斜向拖拽也是"先抢激活、再取消页面滚动"，避免翻页被外层滚动吃掉
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(position === 0)
        .activeOffsetX([-6, 6])
        .failOffsetY([-14, 14])
        .shouldCancelWhenOutside(false)
        .onStart(() => {
          runOnJS(onDragState)(true);
        })
        // onFinalize 无论激活/失败/取消都会触发：确保拖拽暂停状态必定解除
        .onFinalize(() => {
          runOnJS(onDragState)(false);
        })
        .onUpdate((e) => {
          x.value = e.translationX;
          rot.value = e.translationX * 0.02;
        })
        .onEnd((e) => {
          if (Math.abs(e.translationX) > FLY_THRESHOLD) {
            x.value = withTiming(
              Math.sign(e.translationX) * (cardWidth + 80),
              { duration: 280, easing: ReaEasing.out(ReaEasing.quad) },
              (finished) => {
                if (finished) {
                  flyingRef.current = false;
                  runOnJS(onFlyDone)(cardIndex);
                }
              }
            );
            rot.value = withTiming(Math.sign(e.translationX) * 14, { duration: 280 });
            op.value = withTiming(0, { duration: 240 });
          } else {
            x.value = withSpring(0, { damping: 18, stiffness: 180 });
            rot.value = withSpring(0, { damping: 18, stiffness: 180 });
          }
        }),
    [position, cardWidth, onDragState, onFlyDone]
  );

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: sc.value },
      { rotate: `${rot.value}deg` },
    ],
    opacity: op.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <ReaAnimated.View
        style={[
          styles.heroSlide,
          { width: cardWidth, zIndex: total - position },
          // Web 鼠标/触控拖拽会先被浏览器当作页面滚动手势接管，这里直接声明禁用
          Platform.OS === 'web' && { touchAction: 'none' as any },
          cardStyle,
        ]}
      >
        <TouchableOpacity
          style={styles.heroSlidePress}
          onPress={() => onOpen(dish)}
          activeOpacity={0.92}
        >
          <Image
            source={{ uri: dish.coverImage || HERO_IMAGE_FALLBACK }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
          {/* 渐变遮罩 */}
          <View style={styles.heroOverlay} />

          {/* 顶部标签 */}
          <View style={styles.heroTopRow}>
            <View style={styles.chefBadge}>
              <Utensils size={12} color="#FFFFFF" />
              <Text style={styles.chefBadgeText}>今日主厨精选</Text>
            </View>
            <View style={styles.heroMetaPill}>
              <Clock size={12} color="#FFFFFF" />
              <Text style={styles.heroMetaText}>
                {dish.cookTime || 25}分钟 · 鲜香免油炸
              </Text>
            </View>
          </View>

          {/* 底部信息与加餐盘 */}
          <View style={styles.heroBottomRow}>
            <View style={styles.heroInfoCol}>
              <Text style={styles.heroDishName} numberOfLines={1}>
                {dish.name}
              </Text>
              <Text style={styles.heroIngredients} numberOfLines={1}>
                {dish.ingredients.length > 0
                  ? dish.ingredients.map((it) => it.name).slice(0, 4).join(' · ')
                  : dish.description}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.heroAddBtn}
              onPress={(e) => onAddToPlan(e, dish)}
              activeOpacity={0.85}
            >
              <Plus size={14} color="#1C1917" strokeWidth={2.5} />
              <Text style={styles.heroAddBtnText}>加餐盘</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ReaAnimated.View>
    </GestureDetector>
  );
};

const HeroCarouselImpl = ({ slides, onOpen, onAddToPlan }: HeroCarouselProps) => {
  const { width: windowWidth } = useWindowDimensions();
  const heroWidth = Math.max(Math.floor(windowWidth - 32), 200);
  const nSlides = slides.length;

  // 卡组顺序：order[0] 为顶卡
  const [order, setOrder] = useState<number[]>(() => slides.map((_, i) => i));
  const [flySignal, setFlySignal] = useState(0);
  const draggingRef = useRef(false);

  // slides 内容变化时才重置卡组（数组引用每次渲染都会变，用内容签名防抖）
  const slideSig = slides.map((s) => s.id).join('|');
  useEffect(() => {
    setOrder((prev) => {
      const next = slides.map((_, i) => i);
      return prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next;
    });
    setFlySignal(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideSig]);

  /** 翻飞落位：顶卡沉底，其余补位 */
  const handleFlyDone = useCallback((cardIndex: number) => {
    setOrder((o) => [...o.filter((i) => i !== cardIndex), cardIndex]);
  }, []);

  const handleDragState = useCallback((down: boolean) => {
    draggingRef.current = down;
  }, []);

  // 自动播放：拖拽期间暂停
  useEffect(() => {
    if (nSlides <= 1) return;
    const timer = setInterval(() => {
      if (!draggingRef.current) setFlySignal((v) => v + 1);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [nSlides]);

  const heroIndex = order[0] ?? 0;

  return (
    <GestureHandlerRootView style={styles.heroViewport}>
      {slides.map((dish, i) => {
        const position = order.indexOf(i);
        // 隐没层不渲染
        if (position >= nSlides - 1) return null;
        return (
          <DeckCard
            key={dish.id}
            dish={dish}
            cardIndex={i}
            position={position}
            total={nSlides}
            cardWidth={heroWidth}
            flySignal={flySignal}
            onFlyDone={handleFlyDone}
            onDragState={handleDragState}
            onOpen={onOpen}
            onAddToPlan={onAddToPlan}
          />
        );
      })}

      {/* 轮播指示点（随卡组推进同步） */}
      {nSlides > 1 && (
        <View style={styles.heroDots} pointerEvents="none">
          {slides.map((slide, i) => (
            <View
              key={slide.id}
              style={[styles.heroDot, i === heroIndex ? styles.heroDotActive : styles.heroDotIdle]}
            />
          ))}
        </View>
      )}
    </GestureHandlerRootView>
  );
};
HeroCarouselImpl.displayName = 'HeroCarousel';

export const HeroCarousel = React.memo(HeroCarouselImpl);

const styles = StyleSheet.create({
  heroViewport: {
    position: 'relative',
    height: 258,
    marginBottom: 16,
  },
  heroSlide: {
    position: 'absolute',
    left: 0,
    top: 36,
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#26211E',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  heroSlidePress: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  chefBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chefBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  heroMetaText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 2,
  },
  heroInfoCol: {
    flex: 1,
    gap: 3,
  },
  heroDishName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 6,
  },
  heroIngredients: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
  },
  heroAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F7F1E8',
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  heroAddBtnText: {
    color: '#1C1917',
    fontSize: 12,
    fontWeight: '800',
  },
  heroDots: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    zIndex: 2,
  },
  heroDot: {
    width: 5,
    height: 4.5,
    borderRadius: 3,
  },
  heroDotActive: {
    width: 16,
    backgroundColor: '#FFFFFF',
  },
  heroDotIdle: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
});
