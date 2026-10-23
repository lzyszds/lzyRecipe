import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Flame,
  Calendar,
  ChevronRight,
  Utensils,
  ShoppingCart,
  X,
  Sparkles,
} from 'lucide-react-native';
import { useBentoStore } from '../store/bentoStore';
import { useAllRecipes } from '../lib/recipes';
import { getTodayString, formatMonthDay, getWeekdayName } from '../lib/bentoDate';
import { buildGroceryList } from '../lib/grocery';
import { Palette } from '../constants/theme';

export const DynamicIsland: React.FC = () => {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  // Pulsing animation for the green live status indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;

  // Expansion animation
  const expandAnim = useRef(new Animated.Value(0)).current;

  const todayStr = getTodayString();
  const { getDayBento, bentoByDate } = useBentoStore();
  const allRecipes = useAllRecipes();
  const recipeMap = React.useMemo(() => new Map(allRecipes.map((r) => [r.id, r])), [allRecipes]);

  const todayBento = getDayBento(todayStr);
  const groceryToday = React.useMemo(
    () => buildGroceryList([todayStr], bentoByDate, allRecipes).todayItems,
    [todayStr, bentoByDate, allRecipes]
  );

  const totalDishes =
    todayBento.breakfast.length + todayBento.lunch.length + todayBento.dinner.length;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, pulseOpacity]);

  const toggleExpand = () => {
    if (!expanded) {
      setExpanded(true);
      Animated.spring(expandAnim, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(expandAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setExpanded(false));
    }
  };

  const handleClose = () => {
    Animated.timing(expandAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setExpanded(false));
  };

  const handleGoBento = () => {
    handleClose();
    router.push('/weekly-plan');
  };

  return (
    <View style={styles.container}>
      {/* 顶部灵动岛胶囊状态 */}
      <TouchableOpacity
        style={styles.capsule}
        onPress={toggleExpand}
        activeOpacity={0.85}
        testID="dynamic-island-capsule"
      >
        <View style={styles.flameWrap}>
          <Flame size={13} color="#F97316" fill="#F97316" />
        </View>
        <Text style={styles.capsuleText}>今日宜下厨</Text>
        <View style={styles.pulseContainer}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <View style={styles.pulseDot} />
        </View>
      </TouchableOpacity>

      {/* 展开后的灵动岛下拉面板 */}
      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.expandedCard,
                  {
                    opacity: expandAnim,
                    transform: [
                      {
                        scale: expandAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.92, 1],
                        }),
                      },
                      {
                        translateY: expandAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* 展开面板顶栏 */}
                <View style={styles.expandedHeader}>
                  <View style={styles.expandedTitleRow}>
                    <View style={styles.expandedIconBadge}>
                      <Flame size={14} color="#F97316" fill="#F97316" />
                    </View>
                    <View>
                      <Text style={styles.expandedTitle}>下厨灵感岛</Text>
                      <Text style={styles.expandedDate}>
                        {formatMonthDay(todayStr)} · {getWeekdayName(todayStr)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeBtn}
                    activeOpacity={0.7}
                  >
                    <X size={15} color="#A8A29E" />
                  </TouchableOpacity>
                </View>

                {/* 今日三餐快速概览 */}
                <View style={styles.mealsCard}>
                  <View style={styles.mealRow}>
                    <Text style={styles.mealTag}>早餐</Text>
                    <Text style={styles.mealText} numberOfLines={1}>
                      {todayBento.breakfast.length > 0
                        ? todayBento.breakfast
                            .map((i) => recipeMap.get(i.recipeId)?.name)
                            .filter(Boolean)
                            .join('、')
                        : '暂未排餐'}
                    </Text>
                  </View>
                  <View style={styles.mealDivider} />
                  <View style={styles.mealRow}>
                    <Text style={styles.mealTag}>午餐</Text>
                    <Text style={styles.mealText} numberOfLines={1}>
                      {todayBento.lunch.length > 0
                        ? todayBento.lunch
                            .map((i) => recipeMap.get(i.recipeId)?.name)
                            .filter(Boolean)
                            .join('、')
                        : '暂未排餐'}
                    </Text>
                  </View>
                  <View style={styles.mealDivider} />
                  <View style={styles.mealRow}>
                    <Text style={styles.mealTag}>晚餐</Text>
                    <Text style={styles.mealText} numberOfLines={1}>
                      {todayBento.dinner.length > 0
                        ? todayBento.dinner
                            .map((i) => recipeMap.get(i.recipeId)?.name)
                            .filter(Boolean)
                            .join('、')
                        : '暂未排餐'}
                    </Text>
                  </View>
                </View>

                {/* 待采购提示 */}
                {groceryToday.length > 0 && (
                  <View style={styles.groceryAlert}>
                    <ShoppingCart size={13} color="#F97316" />
                    <Text style={styles.groceryAlertText} numberOfLines={1}>
                      今日待买：{groceryToday.map((g) => g.name).slice(0, 3).join('、')}等{' '}
                      {groceryToday.length} 样
                    </Text>
                  </View>
                )}

                {/* 快捷跳转按钮 */}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleGoBento}
                  activeOpacity={0.85}
                >
                  <View style={styles.actionBtnLeft}>
                    <Utensils size={14} color="#FAFAF9" />
                    <Text style={styles.actionBtnText}>
                      查看今日便当盒 ({totalDishes} 道菜)
                    </Text>
                  </View>
                  <ChevronRight size={14} color="#A8A29E" />
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1917',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 6,
  },
  flameWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleText: {
    color: '#FAFAF9',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pulseContainer: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 46,
  },
  expandedCard: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#1C1917',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      },
    }),
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  expandedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandedIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 115, 22, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedTitle: {
    color: '#FAFAF9',
    fontSize: 14,
    fontWeight: '800',
  },
  expandedDate: {
    color: '#A8A29E',
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  mealTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mealText: {
    fontSize: 12,
    color: '#E7E5E4',
    flex: 1,
  },
  mealDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  groceryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  groceryAlertText: {
    fontSize: 11,
    color: '#FB923C',
    flex: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EA580C',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
