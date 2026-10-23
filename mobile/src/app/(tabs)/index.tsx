import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
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
  Heart,
  ChefHat,
  Flame,
  ArrowRight,
} from 'lucide-react-native';
import { useAllRecipes } from '@/lib/recipes';
import { useMealPlanSheetStore } from '@/store/mealPlanSheetStore';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeImage } from '@/components/RecipeImage';
import { getTodayString, getWeekdayName } from '@/lib/bentoDate';
import { Recipe } from '@/types';
import { Palette } from '@/constants/theme';

const INGREDIENT_CHIPS = ['排骨', '五花肉', '冬瓜', '大虾', '番茄', '鸡蛋', '牛肉', '青椒'];


// 高清主厨推荐保底图
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
  const { width: windowWidth } = useWindowDimensions();

  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [activeScene, setActiveScene] = useState<string>('all');

  // 计算两列网格宽度
  const columnWidth = useMemo(() => {
    return Math.floor((windowWidth - 32 - 12) / 2);
  }, [windowWidth]);

  const todayStr = getTodayString();
  const weekdayName = getWeekdayName(todayStr);

  // 计算动态问候
  const inspirationSubtitle = useMemo(() => {
    const hour = new Date().getHours();
    const period = hour < 10 ? '早餐' : hour < 14 ? '午餐' : hour < 20 ? '晚餐' : '夜宵';
    return `${weekdayName}${period}灵感 · 拒绝外卖`;
  }, [weekdayName]);

  // 今日主厨推荐菜
  const heroRecipe = useMemo(() => {
    const found = allRecipes.find(
      (r) => r.name.includes('生炒排骨') || r.name.includes('排骨')
    );
    return found || allRecipes[0];
  }, [allRecipes]);

  // 冰箱清库存默认推荐
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

  // 根据选中的食材实时匹配菜品
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

  // 场景/分类过滤后的双列菜谱流
  const feedRecipes = useMemo(() => {
    if (activeScene === 'fast') {
      return allRecipes.filter((r) => (r.cookTime || 30) <= 25).slice(0, 10);
    }
    if (activeScene === 'chuangxiang') {
      return allRecipes
        .filter((r) => r.category === '川菜' || r.category === '湘菜')
        .slice(0, 10);
    }
    if (activeScene === 'seafood') {
      return allRecipes
        .filter(
          (r) =>
            r.category === '海鲜' ||
            r.name.includes('虾') ||
            r.name.includes('蟹') ||
            r.name.includes('鱼')
        )
        .slice(0, 10);
    }
    if (activeScene === 'soup') {
      return allRecipes
        .filter(
          (r) =>
            r.category === '汤' ||
            r.name.includes('汤') ||
            r.name.includes('煲') ||
            r.name.includes('炖')
        )
        .slice(0, 10);
    }
    if (activeScene === 'comfort') {
      return allRecipes
        .filter((r) => r.category === '家常菜' || r.category === '肉类')
        .slice(0, 10);
    }
    // all: 精选前 12 道高分菜谱
    return allRecipes.slice(0, 12);
  }, [activeScene, allRecipes]);

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
      {/* 
        1. 顶部固定导航与搜索栏 (Native App Header, 独立在 ScrollView 之外，永久固定在顶部不随页面滚动消失)
      */}
      <View style={styles.fixedHeader}>
        {/* 品牌行与快捷入口 */}
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <ChefHat size={16} color="#FFFFFF" strokeWidth={2.4} />
            </View>
            <View style={styles.brandTextWrap}>
              <View style={styles.brandTitleRow}>
                <Text style={styles.brandTitle}>食刻</Text>
                <View style={styles.periodPill}>
                  <Text style={styles.periodPillText}>{inspirationSubtitle}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.push('/favorites')}
              activeOpacity={0.75}
              accessibilityLabel="我的收藏"
            >
              <Heart size={18} color={Palette.cocoa[700]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 移动端搜索胶囊 (点击直达搜索，常驻顶端极速触达) */}
        <TouchableOpacity
          style={styles.searchCapsule}
          onPress={() => router.push('/search')}
          activeOpacity={0.85}
        >
          <Search size={15} color={Palette.cocoa[400]} strokeWidth={2.2} />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            搜索菜品、食材（如：排骨、回锅肉、大虾）...
          </Text>
          <View style={styles.searchCapsuleBtn}>
            <Text style={styles.searchCapsuleBtnText}>搜搜</Text>
            <ArrowRight size={11} color={Palette.primary} strokeWidth={2.5} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 2. 页面主体内容滚动区 */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >

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
                  {heroRecipe.cookTime || 25}分钟 · 鲜香免油炸
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

        {/* 灵感菜谱流区域：纯正双列原生瀑布卡片 */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Sparkles size={16} color="#EA580C" />
            <Text style={styles.sectionTitle}>
             精选菜谱
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{feedRecipes.length}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.sectionMoreBtn}
            onPress={() => router.push('/recipes')}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionMoreText}>查看完整库</Text>
            <ChevronRight size={14} color="#78716C" />
          </TouchableOpacity>
        </View>

        {/* 移动端两列精品卡片流 */}
        <View style={styles.feedGrid}>
          {feedRecipes.map((dish) => (
            <View key={dish.id} style={{ width: columnWidth }}>
              <RecipeCard recipe={dish} />
            </View>
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
  // 顶部常驻固定 Header (不随页面滚动消失)
  fixedHeader: {
    backgroundColor: Palette.canvas,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTextWrap: {
    flex: 1,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.cocoa[900],
    letterSpacing: -0.3,
  },
  periodPill: {
    backgroundColor: Palette.amberSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  periodPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.amberWarm,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 搜索胶囊条
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: Palette.cocoa[400],
  },
  searchCapsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.apricot[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
  },
  searchCapsuleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  // 滚动容器
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 170, // 避免被底部 Dock TabBar 遮挡
  },
  // 场景标签横滑
  scenesScroll: {
    marginBottom: 14,
  },
  scenesScrollContainer: {
    gap: 8,
    paddingRight: 8,
  },
  scenePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.dockBorder,
  },
  scenePillActive: {
    backgroundColor: Palette.cocoa[900],
    borderColor: Palette.cocoa[900],
  },
  scenePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  scenePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // 主厨推荐 Hero 卡片
  heroCard: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#26211E',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
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
    backgroundColor: Palette.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  chefBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
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
    fontSize: 20,
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
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  heroAddBtnText: {
    color: '#1C1917',
    fontSize: 12,
    fontWeight: '800',
  },
  // 冰箱清库存卡片
  inventoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    marginBottom: 20,
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
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inventoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  inventorySubCount: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 12,
  },
  chipPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3EFEA',
  },
  chipPillActive: {
    backgroundColor: Palette.cocoa[900],
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  matchedList: {
    gap: 8,
  },
  matchedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    padding: 9,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  dishThumbWrap: {
    width: 58,
    height: 58,
    borderRadius: 10,
    overflow: 'hidden',
  },
  dishThumb: {
    width: 58,
    height: 58,
    borderRadius: 10,
  },
  dishInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  dishName: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.cocoa[900],
    marginBottom: 2,
  },
  dishCore: {
    fontSize: 11,
    color: Palette.inkMuted,
    marginBottom: 3,
  },
  dishTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodTagPill: {
    backgroundColor: '#EFECE6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  methodTagText: {
    fontSize: 10,
    color: Palette.cocoa[700],
    fontWeight: '600',
  },
  rowAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.dockBorder,
  },
  // 灵感推荐双列流区域
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  countBadge: {
    backgroundColor: Palette.amberSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.amberWarm,
  },
  sectionMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionMoreText: {
    fontSize: 12,
    color: Palette.inkMuted,
    fontWeight: '600',
  },
  feedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
