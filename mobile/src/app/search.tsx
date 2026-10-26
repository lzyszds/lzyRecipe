import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  X,
  Flame,
  History,
  Trash2,
  Sparkles,
  CalendarPlus,
  UtensilsCrossed,
} from 'lucide-react-native';
import { useAllRecipes, getCategoriesWithCounts } from '@/lib/recipes';
import { RecipeImage } from '@/components/RecipeImage';
import { useMealPlanSheetStore } from '@/store/mealPlanSheetStore';
import { useSearchHistoryStore } from '@/store/searchHistoryStore';
import {
  SearchHit,
  getMatchLabel,
  searchRecipes,
} from '@/lib/search';
import { DifficultyLevel, Recipe } from '@/types';
import { Palette } from '@/constants/theme';

const HOT_SEARCHES = ['牛肉', '大虾', '鸡翅', '豆腐', '排骨', '西红柿', '川菜', '海鲜'];

const DIFFICULTY_LABEL: Record<DifficultyLevel, string> = {
  easy: '简单',
  medium: '家常',
  hard: '进阶',
};

interface SearchResultRowProps {
  hit: SearchHit;
  onPress: (recipe: Recipe) => void;
  onAddToPlan: (recipe: Recipe) => void;
}

function SearchResultRow({ hit, onPress, onAddToPlan }: SearchResultRowProps) {
  const { recipe } = hit;
  const matchLabel = getMatchLabel(hit);

  return (
    <TouchableOpacity
      style={styles.resultRow}
      onPress={() => onPress(recipe)}
      activeOpacity={0.85}
    >
      <View style={styles.resultThumb}>
        <RecipeImage
          coverImage={recipe.coverImage}
          name={recipe.name}
          category={recipe.category}
        />
      </View>

      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>
          {recipe.name}
        </Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          <Text style={styles.resultCategory}>{recipe.category}</Text>
          {' · '}
          {recipe.cookTime || 0}分钟 · {DIFFICULTY_LABEL[recipe.difficulty] || '普通'}
        </Text>
        {matchLabel ? (
          <View style={styles.matchPill}>
            <Text style={styles.matchPillText}>{matchLabel}</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.rowAddBtn}
        onPress={(event) => {
          event?.stopPropagation?.();
          onAddToPlan(recipe);
        }}
        activeOpacity={0.8}
        accessibilityLabel={`将${recipe.name}排入便当盒`}
      >
        <CalendarPlus size={16} color={Palette.primary} strokeWidth={2.3} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const allRecipes = useAllRecipes();
  const openMealPlanSheet = useMealPlanSheetStore((s) => s.openSheet);

  const history = useSearchHistoryStore((s) => s.history);
  const addSearch = useSearchHistoryStore((s) => s.addSearch);
  const removeSearch = useSearchHistoryStore((s) => s.removeSearch);
  const clearHistory = useSearchHistoryStore((s) => s.clearHistory);

  const [keyword, setKeyword] = useState('');
  const trimmedKeyword = keyword.trim();

  const { hits, mode } = useMemo(
    () => searchRecipes(allRecipes, trimmedKeyword),
    [allRecipes, trimmedKeyword]
  );

  const categories = useMemo(
    () =>
      getCategoriesWithCounts(allRecipes)
        .filter((category) => category.count > 0)
        .slice(0, 9),
    [allRecipes]
  );

  const commitKeyword = () => {
    if (trimmedKeyword) addSearch(trimmedKeyword);
  };

  const handleTagPress = (tag: string) => {
    setKeyword(tag);
    addSearch(tag);
  };

  const handleOpenRecipe = (recipe: Recipe) => {
    commitKeyword();
    Keyboard.dismiss();
    router.push({
      pathname: '/recipe/[id]',
      params: { id: recipe.id },
    });
  };

  const handleAddToPlan = (recipe: Recipe) => {
    commitKeyword();
    Keyboard.dismiss();
    openMealPlanSheet(recipe);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部固定搜索栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color={Palette.cocoa[900]} />
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Search size={16} color={Palette.cocoa[400]} />
          <TextInput
            style={styles.input}
            placeholder="搜菜名、食材、口味（如：番茄 鸡蛋）"
            placeholderTextColor={Palette.cocoa[400]}
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={commitKeyword}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
          />
          {keyword.length > 0 && (
            <TouchableOpacity
              onPress={() => setKeyword('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={15} color={Palette.cocoa[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {trimmedKeyword.length === 0 ? (
        <ScrollView
          style={styles.discoverScroll}
          contentContainerStyle={styles.discoverContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 最近搜索 */}
          {history.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionTitleRow, styles.sectionTitleRowFlush]}>
                  <History size={14} color={Palette.cocoa[700]} />
                  <Text style={styles.sectionTitle}>最近搜索</Text>
                </View>
                <TouchableOpacity
                  onPress={clearHistory}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={14} color={Palette.cocoa[400]} />
                </TouchableOpacity>
              </View>
              <View style={styles.tagsContainer}>
                {history.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.historyTag}
                    onPress={() => handleTagPress(tag)}
                    onLongPress={() => removeSearch(tag)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity
                      onPress={(event) => {
                        event?.stopPropagation?.();
                        removeSearch(tag);
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <X size={11} color={Palette.cocoa[400]} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.historyHint}>轻点再次搜索，长按可删除单条记录</Text>
            </View>
          )}

          {/* 热门搜索 */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Flame size={14} color={Palette.apricot[500]} />
              <Text style={styles.sectionTitle}>热门搜索</Text>
            </View>
            <View style={styles.tagsContainer}>
              {HOT_SEARCHES.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tag}
                  onPress={() => handleTagPress(tag)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 分类快搜 */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <UtensilsCrossed size={14} color={Palette.sage} />
              <Text style={styles.sectionTitle}>按分类快搜</Text>
            </View>
            <View style={styles.tagsContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryTag}
                  onPress={() => handleTagPress(category.name)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.tagText}>{category.name}</Text>
                  <Text style={styles.categoryCount}>{category.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.tipCard}>
            <Sparkles size={14} color={Palette.primary} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>搜索小技巧</Text>
              <Text style={styles.tipText}>
                支持菜名、食材、分类与口味；多个词用空格分隔（如“番茄 鸡蛋”），连写也能识别（如“番茄鸡蛋”），同义词也可命中（搜“西红柿”能找到番茄菜）。
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={hits}
          keyExtractor={(item) => item.recipe.id}
          style={styles.resultList}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.resultSeparator} />}
          ListHeaderComponent={
            <View style={styles.resultHeader}>
              <Text style={styles.resultSummary}>
                找到 <Text style={styles.bold}>{hits.length}</Text> 道关于“{trimmedKeyword}”的菜谱
              </Text>
              {mode === 'fuzzy' && (
                <View style={styles.fuzzyPill}>
                  <Sparkles size={10} color={Palette.primary} />
                  <Text style={styles.fuzzyPillText}>智能相近结果</Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <SearchResultRow
              hit={item}
              onPress={handleOpenRecipe}
              onAddToPlan={handleAddToPlan}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <UtensilsCrossed size={38} color={Palette.cocoa[200]} />
              <Text style={styles.emptyTitle}>没有找到“{trimmedKeyword}”</Text>
              <Text style={styles.emptyText}>
                试试更短的关键词，或直接按食材搜索
              </Text>
              <View style={[styles.tagsContainer, styles.emptyTags]}>
                {HOT_SEARCHES.slice(0, 5).map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tag}
                    onPress={() => handleTagPress(tag)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
    backgroundColor: Palette.oat[50],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.oat[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: Palette.cocoa[900],
    paddingVertical: 0,
  },
  discoverScroll: {
    flex: 1,
  },
  discoverContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitleRowFlush: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
    marginBottom: 0,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Palette.oat[200],
  },
  historyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Palette.oat[200],
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.apricot[50],
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Palette.apricot[100],
  },
  categoryCount: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.apricot[600],
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.cocoa[700],
  },
  historyHint: {
    marginTop: 8,
    fontSize: 10,
    color: Palette.cocoa[400],
  },
  tipCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Palette.apricot[50],
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.apricot[100],
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.apricot[600],
    marginBottom: 4,
  },
  tipText: {
    fontSize: 11.5,
    lineHeight: 18,
    color: Palette.cocoa[700],
  },
  resultList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    flexGrow: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 10,
  },
  resultSummary: {
    flex: 1,
    fontSize: 12,
    color: Palette.cocoa[400],
  },
  bold: {
    fontWeight: '700',
    color: Palette.apricot[600],
  },
  fuzzyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  fuzzyPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.primary,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 9,
    gap: 11,
    borderWidth: 1,
    borderColor: '#F0E9DF',
  },
  resultThumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Palette.tagWarm,
  },
  resultInfo: {
    flex: 1,
    gap: 3,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.ink,
  },
  resultMeta: {
    fontSize: 10.5,
    color: Palette.inkMuted,
  },
  resultCategory: {
    color: Palette.apricot[600],
    fontWeight: '600',
  },
  matchPill: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.tagWarm,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 1,
  },
  matchPillText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  rowAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultSeparator: {
    height: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: Palette.cocoa[400],
  },
  emptyTags: {
    justifyContent: 'center',
    marginTop: 18,
  },
});
