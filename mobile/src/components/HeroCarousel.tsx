/**
 * 今日主厨精选：折叠卡片堆叠轮播
 *
 * - 顶卡跟手横向拖拽，超过阈值翻飞淡出，堆叠补位；不足弹回
 * - 自动播放每 4.5s 折叠一张（顶卡折回卡堆，其余卡延迟柔和上浮）
 * - 手动交互后重新计时；拖拽期间自动播放暂停
 * - React.memo 隔离：换页状态变化只重渲染本组件，不牵动首页大列表
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import { Image } from 'expo-image';
import { Utensils, Clock, Plus } from 'lucide-react-native';
import type { Recipe } from '@/types';

// 高清主厨推荐保底图
const HERO_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80';

/** 堆叠层数（可见 3 层 + 隐没层）— 由 slides.length 决定 */
const AUTO_PLAY_MS = 4500;
/** 翻飞触发阈值（px） */
const FLY_THRESHOLD = 70;

interface HeroCarouselProps {
  slides: Recipe[];
  onOpen: (recipe: Recipe) => void;
  onAddToPlan: (e: any, recipe: Recipe) => void;
}

const HeroCarouselImpl = ({ slides, onOpen, onAddToPlan }: HeroCarouselProps) => {
    const { width: windowWidth } = useWindowDimensions();
    const nSlides = slides.length;
    const heroWidth = Math.max(Math.floor(windowWidth - 32), 200);

    const [heroIndex, setHeroIndex] = useState(0);
    const [outgoingCard, setOutgoingCard] = useState<number | null>(null);
    const heroIndexRef = useRef(0);
    const heroDraggingRef = useRef(false);
    const heroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 每张卡的动画值
    const heroX = useRef(slides.map(() => new Animated.Value(0))).current;
    const heroY = useRef(slides.map(() => new Animated.Value(0))).current;
    const heroScale = useRef(slides.map(() => new Animated.Value(1))).current;
    const heroOpacity = useRef(slides.map(() => new Animated.Value(1))).current;

    /** 堆叠位型：offset 0=顶卡 1/2=折叠层 ≥3=隐没 */
    const slotTargets = useCallback(
      (offset: number) => {
        if (offset <= 0) return { x: 0, y: 0, scale: 1, opacity: 1 };
        if (offset === 1) return { x: 0, y: -16, scale: 0.92, opacity: 0.55 };
        if (offset === 2) return { x: 0, y: -28, scale: 0.84, opacity: 0.3 };
        return { x: 0, y: -36, scale: 0.8, opacity: 0 };
      },
      []
    );

    /** 所有卡片柔和滑动到 active 对应的堆叠位型 */
    const settleDeck = useCallback(
      (active: number) => {
        for (let i = 0; i < nSlides; i++) {
          const offset = (i - active + nSlides) % nSlides;
          const t = slotTargets(offset);
          if (offset > 0 && offset < nSlides - 1) {
            Animated.parallel([
              Animated.timing(heroX[i], { toValue: t.x, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.timing(heroY[i], { toValue: t.y, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.timing(heroScale[i], { toValue: t.scale, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.timing(heroOpacity[i], { toValue: t.opacity, duration: 440, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]).start();
          } else {
            heroX[i].setValue(t.x);
            heroY[i].setValue(t.y);
            heroScale[i].setValue(t.scale);
            heroOpacity[i].setValue(t.opacity);
          }
        }
      },
      [nSlides, heroX, heroY, heroScale, heroOpacity, slotTargets]
    );

    /** 推进一张：顶卡折叠回落进卡堆，其余卡延迟柔和上浮补位 */
    const advanceHero = useCallback(() => {
      if (nSlides <= 1) return;
      const out = heroIndexRef.current;
      const next = (out + 1) % nSlides;

      Animated.parallel([
        Animated.timing(heroY[out], { toValue: -30, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(heroScale[out], { toValue: 0.82, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(heroOpacity[out], { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        const back = slotTargets(nSlides - 1);
        heroX[out].setValue(back.x);
        heroY[out].setValue(back.y);
        heroScale[out].setValue(back.scale);
        heroOpacity[out].setValue(back.opacity);
      });

      heroIndexRef.current = next;
      setHeroIndex(next);
      // 补位卡延迟 90ms 柔和上浮（先看折叠，再看滑上来，节奏分明）
      for (let i = 0; i < nSlides; i++) {
        if (i === out) continue;
        const offset = (i - next + nSlides) % nSlides;
        const t = slotTargets(offset);
        Animated.parallel([
          Animated.timing(heroX[i], { toValue: t.x, duration: 480, delay: 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(heroY[i], { toValue: t.y, duration: 480, delay: 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(heroScale[i], { toValue: t.scale, duration: 480, delay: 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(heroOpacity[i], { toValue: t.opacity, duration: 480, delay: 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      }
    }, [nSlides, heroX, heroY, heroScale, heroOpacity, slotTargets]);

    /** 自动播放计时（手动交互后调用以重新计时） */
    const startHeroTimer = useCallback(() => {
      if (heroTimerRef.current) clearInterval(heroTimerRef.current);
      if (nSlides <= 1) return;
      heroTimerRef.current = setInterval(() => {
        if (heroDraggingRef.current) return;
        advanceHero();
      }, AUTO_PLAY_MS);
    }, [nSlides, advanceHero]);

    useEffect(() => {
      settleDeck(0);
      startHeroTimer();
      return () => {
        if (heroTimerRef.current) clearInterval(heroTimerRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nSlides]);

    /** 翻飞中的卡保持最高层级，淡出落位后才沉底（避免层级跳变穿帮） */
    const zIndexOf = useCallback(
      (i: number) => {
        if (i === outgoingCard) return nSlides + 10;
        const offset = (i - heroIndex + nSlides) % nSlides;
        return nSlides - offset;
      },
      [outgoingCard, heroIndex, nSlides]
    );

    // 手势：横向拖拽顶卡跟手，松手超阈值翻飞、否则弹回
    const heroPanResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onPanResponderGrant: () => {
          heroDraggingRef.current = true;
          if (heroTimerRef.current) clearInterval(heroTimerRef.current);
        },
        onPanResponderMove: (_, g) => {
          heroX[heroIndexRef.current].setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const top = heroIndexRef.current;
          heroDraggingRef.current = false;
          const dx = g.dx ?? 0;
          const card = heroX[top];
          if (Math.abs(dx) > FLY_THRESHOLD && nSlides > 1) {
            const flyX = dx > 0 ? heroWidth + 80 : -heroWidth - 80;
            const next = (top + 1) % nSlides;
            setOutgoingCard(top);
            Animated.parallel([
              Animated.timing(card, { toValue: flyX, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.timing(heroOpacity[top], { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start(() => {
              const back = slotTargets(nSlides - 1);
              card.setValue(back.x);
              heroY[top].setValue(back.y);
              heroScale[top].setValue(back.scale);
              heroOpacity[top].setValue(back.opacity);
              heroIndexRef.current = next;
              setHeroIndex(next);
              setOutgoingCard(null);
              settleDeck(next);
            });
          } else {
            Animated.spring(card, { toValue: 0, friction: 7, tension: 60, useNativeDriver: true }).start();
          }
          startHeroTimer();
        },
      })
    ).current;

    return (
      <View style={styles.heroViewport} {...heroPanResponder.panHandlers}>
        {slides.map((dish, i) => {
          const offset = (i - heroIndex + nSlides) % nSlides;
          // 隐没层不渲染（动画值仍保留，回堆时可瞬间复用）
          if (offset >= nSlides - 1 && i !== outgoingCard) return null;
          return (
            <Animated.View
              key={dish.id}
              style={[
                styles.heroSlide,
                {
                  width: heroWidth,
                  opacity: heroOpacity[i],
                  zIndex: zIndexOf(i),
                  transform: [
                    { translateX: heroX[i] },
                    { translateY: heroY[i] },
                    { scale: heroScale[i] },
                  ],
                },
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
            </Animated.View>
          );
        })}

        {/* 轮播指示点（随堆叠推进同步） */}
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
      </View>
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
    right: 0,
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
