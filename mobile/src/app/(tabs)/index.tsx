import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Search,
  Utensils,
  Clock,
  Plus,
  SlidersHorizontal,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import { useAllRecipes } from '@/lib/recipes';
import { useMealPlanSheetStore } from '@/store/mealPlanSheetStore';
import { DynamicIsland } from '@/components/DynamicIsland';
import { RecipeImage } from '@/components/RecipeImage';
import { getTodayString, getWeekdayName } from '@/lib/bentoDate';
import { Recipe } from '@/types';
import { Palette } from '@/constants/theme';

const INGREDIENT_CHIPS = ['排骨', '五花肉', '冬瓜', '大虾', '番茄', '鸡蛋', '牛肉', '青椒'];

// Default high-res fallback food image for the Hero card matching reference UI
const HERO_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80';

function getCookingMethodTag(dish: Recipe): string {
  const t = dish.cookTime || 20;
  const n = dish.name;
  if (/红烧|酱烧/.test(n)) return `${t}分钟 · 红烧`;
  if (/炖|煲|清炖|慢炖|老火|汤/.test(n)) return `${t}分钟 · 慢炖`;
  if (/蒸|清蒸|粉蒸/.test(n)) return `${t}分钟 · 清蒸`;
  if (/生炒|生煎/.test(n)) return `${t}分钟 · 生炒`;
  if (/烤/.test(n)) return `${t}分钟 · 烘烤`;
  if (/拌|凉/.test(n)) return `${t}分钟 · 凉拌`;
  if (t <= 20) return `${t}分钟 · 小炒`;
  return `${t}分钟 · 家常`;
}

function getCoreIngredients(dish: Recipe): string {
  if (dish.name.includes('排骨')) return '排骨 · 蒜末 · 柱侯酱';
  if (dish.name.includes('回锅肉')) return '五花肉 · 青蒜苗 · 豆瓣酱';
  if (dish.name.includes('红烧肉')) return '五花肉 · 冰糖 · 生抽';
  const list = dish.ingredients
    ?.map((i) => i.name.replace(/（.*）|\(.*\)/g, '').trim())
    .filter(Boolean);
  if (list && list.length > 0) {
    return list.slice(0, 3).join(' · ');
  }
  return '鲜香下饭 · 烹饪方便';
}

export default function HomeScreen() {
  const router = useRouter();
  const allRecipes = useAllRecipes();
  const openMealPlanSheet = useMealPlanSheetStore((s) => s.openSheet);

  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  const todayStr = getTodayString();
  const weekdayName = getWeekdayName(todayStr);

  // Compute dynamic meal period & inspiration subtitle
  const inspirationSubtitle = useMemo(() => {
    const hour = new Date().getHours();
    const period = hour < 10 ? '早餐' : hour < 14 ? '午餐' : hour < 20 ? '晚餐' : '夜宵';
    return `${weekdayName}${period}灵感 · 拒绝外卖`;
  }, [weekdayName]);

  // Find Hero Recommendation Dish (生炒排骨 or featured)
  const heroRecipe = useMemo(() => {
    const found = allRecipes.find(
      (r) => r.name.includes('生炒排骨') || r.name.includes('排骨')
    );
    return found || allRecipes[0];
  }, [allRecipes]);

  // Pre-configured classic dishes for the ingredient card default view
  const defaultDishes = useMemo(() => {
    const ribs =
      allRecipes.find((r) => r.name.includes('生炒排骨') || r.name.includes('排骨')) ||
      allRecipes[0];
    const pork =
      allRecipes.find((r) => r.name === '回锅肉' || r.name.includes('回锅肉')) ||
      allRecipes.find((r) => r.name.includes('红烧肉')) ||
      allRecipes[1];
    return [ribs, pork].filter(Boolean) as Recipe[];
  }, [allRecipes]);

  // Real-time matched dishes based on ingredient selection
  const matchedRecipes = useMemo(() => {
    if (!selectedIngredient) {
      return defaultDishes;
    }
    const filtered = allRecipes.filter((r) =>
      r.ingredients.some(
        (ing) =>
          ing.name.includes(selectedIngredient) ||
          r.name.includes(selectedIngredient) ||
          r.description?.includes(selectedIngredient)
      )
    );
    return filtered.length > 0 ? filtered.slice(0, 4) : defaultDishes;
  }, [selectedIngredient, allRecipes, defaultDishes]);

  // 20分钟快手菜 (cookTime <= 25)
  const quickDishes = useMemo(() => {
    return allRecipes.filter((r) => (r.cookTime || 30) <= 25).slice(0, 6);
  }, [allRecipes]);

  const handleToggleIngredient = (ing: string) => {
    setSelectedIngredient((prev) => (prev === ing ? null : ing));
  };

  const handleOpenRecipe = (recipe: Recipe) => {
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id },
    });
  };

  const handleAddToPlan = (e: any, recipe: Recipe) => {
    e?.stopPropagation?.();
    openMealPlanSheet(recipe);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部居中灵动岛胶囊（纯净浮空，不与真机系统状态栏冲突） */}
      <View style={styles.topIslandRow}>
        <DynamicIsland />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 顶部问候与搜索栏 */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingLeft}>
            <Text style={styles.subtitleText}>{inspirationSubtitle}</Text>
            <Text style={styles.titleText}>今天想吃点什么？</Text>
          </View>
          <TouchableOpacity
            style={styles.searchCircleBtn}
            onPress={() => router.push('/search')}
            activeOpacity={0.8}
            accessibilityLabel="搜索菜谱"
          >
            <Search size={20} color="#1C1917" />
          </TouchableOpacity>
        </View>

        {/* 今日主厨推荐 Banner 卡片 */}
        {heroRecipe && (
          <TouchableOpacity
            style={styles.heroCard}
            onPress={() => handleOpenRecipe(heroRecipe)}
            activeOpacity={0.92}
          >
            <Image
              source={{ uri: heroRecipe.coverImage || HERO_IMAGE_FALLBACK }}
              style={styles.heroImage}
              contentFit="cover"
              transition={200}
            />
            {/* 渐变遮罩层 */}
            <View style={styles.heroOverlay} />

            {/* 顶部标签 */}
            <View style={styles.heroTopRow}>
              <View style={styles.chefBadge}>
                <Utensils size={12} color="#FFFFFF" />
                <Text style={styles.chefBadgeText}>今日主厨推荐</Text>
              </View>
              <View style={styles.heroMetaPill}>
                <Clock size={12} color="#FFFFFF" />
                <Text style={styles.heroMetaText}>
                  {heroRecipe.cookTime || 25}分钟 · 生炒免油炸
                </Text>
              </View>
            </View>

            {/* 底部信息与加餐盘 */}
            <View style={styles.heroBottomRow}>
              <View style={styles.heroInfoCol}>
                <Text style={styles.heroDishName} numberOfLines={1}>
                  {heroRecipe.name.includes('生炒排骨')
                    ? '焦香蒜香生炒排骨'
                    : heroRecipe.name}
                </Text>
                <Text style={styles.heroIngredients} numberOfLines={1}>
                  {heroRecipe.ingredients.length > 0
                    ? heroRecipe.ingredients.map((i) => i.name).slice(0, 4).join(' · ')
                    : '排骨 · 独头蒜 · 柱侯酱 · 小米辣'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.heroAddBtn}
                onPress={(e) => handleAddToPlan(e, heroRecipe)}
                activeOpacity={0.85}
              >
                <Plus size={14} color="#1C1917" strokeWidth={2.5} />
                <Text style={styles.heroAddBtnText}>加餐盘</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* 冰箱清库存 · 点食材配菜 卡片 */}
        <View style={styles.inventoryCard}>
          {/* 卡片头部 */}
          <View style={styles.inventoryHeader}>
            <View style={styles.inventoryTitleRow}>
              <View style={styles.inventoryIconBadge}>
                <SlidersHorizontal size={14} color="#EA580C" />
              </View>
              <Text style={styles.inventoryTitle}>冰箱清库存 · 点食材配菜</Text>
            </View>
            <Text style={styles.inventorySubCount}>
              {selectedIngredient ? `已匹配 ${matchedRecipes.length} 道` : '默认推荐 2 道'}
            </Text>
          </View>

          {/* 食材选择 Chips */}
          <View style={styles.chipsWrap}>
            {INGREDIENT_CHIPS.map((ing) => {
              const active = selectedIngredient === ing;
              return (
                <TouchableOpacity
                  key={ing}
                  style={[styles.chipPill, active && styles.chipPillActive]}
                  onPress={() => handleToggleIngredient(ing)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {ing}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 匹配菜谱列表 */}
          <View style={styles.matchedList}>
            {matchedRecipes.map((dish, idx) => {
              const coreIngredients = getCoreIngredients(dish);

              const displayName =
                dish.name.includes('生炒排骨')
                  ? '焦香蒜香生炒排骨'
                  : dish.name.includes('回锅肉')
                  ? '川味青蒜苗回锅肉'
                  : dish.name;

              const methodTag = getCookingMethodTag(dish);

              return (
                <TouchableOpacity
                  key={`${dish.id}-${idx}`}
                  style={styles.matchedRow}
                  onPress={() => handleOpenRecipe(dish)}
                  activeOpacity={0.8}
                >
                  <RecipeImage
                    coverImage={dish.coverImage}
                    name={dish.name}
                    category={dish.category}
                    style={styles.dishThumb}
                    containerStyle={styles.dishThumbWrap}
                  />

                  <View style={styles.dishInfo}>
                    <Text style={styles.dishName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={styles.dishCore} numberOfLines={1}>
                      核心: {coreIngredients}
                    </Text>
                    <View style={styles.dishTagWrap}>
                      <View style={styles.methodTagPill}>
                        <Text style={styles.methodTagText}>{methodTag}</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.rowAddBtn}
                    onPress={(e) => handleAddToPlan(e, dish)}
                    activeOpacity={0.75}
                  >
                    <Plus size={18} color="#1C1917" strokeWidth={2.2} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 20分钟快手菜 区域 */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Sparkles size={16} color="#EA580C" />
            <Text style={styles.sectionTitle}>20分钟快手菜</Text>
          </View>
          <TouchableOpacity
            style={styles.sectionMoreBtn}
            onPress={() => router.push('/recipes')}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionMoreText}>查看更多</Text>
            <ChevronRight size={14} color="#78716C" />
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          {quickDishes.map((dish) => (
            <TouchableOpacity
              key={dish.id}
              style={styles.quickCard}
              onPress={() => handleOpenRecipe(dish)}
              activeOpacity={0.88}
            >
              <RecipeImage
                coverImage={dish.coverImage}
                name={dish.name}
                category={dish.category}
                style={styles.quickCardImage}
                containerStyle={styles.quickCardImageWrap}
              />
              <View style={styles.quickCardContent}>
                <Text style={styles.quickCardTitle} numberOfLines={1}>
                  {dish.name}
                </Text>
                <View style={styles.quickCardMetaRow}>
                  <View style={styles.quickCardTimeBadge}>
                    <Clock size={10} color="#EA580C" />
                    <Text style={styles.quickCardTimeText}>
                      {dish.cookTime || 20}分钟
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.quickCardAddBtn}
                    onPress={(e) => handleAddToPlan(e, dish)}
                    activeOpacity={0.8}
                  >
                    <Plus size={14} color="#EA580C" strokeWidth={2.2} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  topIslandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? 6 : 2,
    paddingBottom: 6,
    zIndex: 10,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 170, // 充足间距确保不会被底部悬浮 Dock TabBar 遮挡
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 14,
  },
  greetingLeft: {
    flex: 1,
  },
  subtitleText: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '600',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.3,
  },
  searchCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7DFD4',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      },
    }),
  },
  heroCard: {
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#26211E',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
      },
    }),
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 25, 23, 0.42)',
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
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  chefBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroMetaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  heroInfoCol: {
    flex: 1,
    paddingRight: 12,
  },
  heroDishName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  heroIngredients: {
    color: '#E7E5E4',
    fontSize: 12,
    fontWeight: '500',
  },
  heroAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    gap: 4,
  },
  heroAddBtnText: {
    color: '#1C1917',
    fontSize: 13,
    fontWeight: '800',
  },
  inventoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBE5DC',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      },
    }),
  },
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inventoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inventoryIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inventoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
  },
  inventorySubCount: {
    fontSize: 11,
    color: '#A8A29E',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chipPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#F3EFEA',
  },
  chipPillActive: {
    backgroundColor: '#1C1917',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#44403C',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  matchedList: {
    gap: 10,
  },
  matchedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  dishThumbWrap: {
    width: 62,
    height: 62,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dishThumb: {
    width: 62,
    height: 62,
    borderRadius: 12,
  },
  dishInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  dishName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
    marginBottom: 3,
  },
  dishCore: {
    fontSize: 11,
    color: '#78716C',
    marginBottom: 4,
  },
  dishTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodTagPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  methodTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  rowAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3EFEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
  },
  sectionMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionMoreText: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '500',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EBE5DC',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      },
    }),
  },
  quickCardImageWrap: {
    width: '100%',
    height: 110,
  },
  quickCardImage: {
    width: '100%',
    height: 110,
  },
  quickCardContent: {
    padding: 10,
  },
  quickCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 6,
  },
  quickCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickCardTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  quickCardTimeText: {
    fontSize: 11,
    color: '#EA580C',
    fontWeight: '600',
  },
  quickCardAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
});
