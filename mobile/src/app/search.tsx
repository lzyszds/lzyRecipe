import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, X, Flame } from 'lucide-react-native';
import { useAllRecipes } from '@/lib/recipes';
import { RecipeCard } from '@/components/RecipeCard';
import { Palette } from '@/constants/theme';

const HOT_SEARCHES = ['牛肉', '大虾', '鸡翅', '豆腐', '排骨', '西红柿', '川菜', '海鲜'];

export default function SearchScreen() {
  const router = useRouter();
  const allRecipes = useAllRecipes();
  const [keyword, setKeyword] = useState('');

  const searchResults = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return [];
    return allRecipes.filter(
      (r) =>
        r.name.toLowerCase().includes(kw) ||
        r.category.toLowerCase().includes(kw) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(kw))
    );
  }, [allRecipes, keyword]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 搜索顶栏 */}
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
            placeholder="搜菜名、食材（如：虾、牛肉）..."
            placeholderTextColor={Palette.cocoa[400]}
            value={keyword}
            onChangeText={setKeyword}
            autoFocus
            returnKeyType="search"
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword('')}>
              <X size={15} color={Palette.cocoa[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 搜索结果或热门标签 */}
      {keyword.trim().length === 0 ? (
        <View style={styles.hotSection}>
          <View style={styles.hotHeader}>
            <Flame size={14} color={Palette.apricot[500]} />
            <Text style={styles.hotTitle}>热门搜索</Text>
          </View>
          <View style={styles.tagsContainer}>
            {HOT_SEARCHES.map((tag, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.tag}
                onPress={() => setKeyword(tag)}
                activeOpacity={0.75}
              >
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultSummary}>
              找到 <Text style={styles.bold}>{searchResults.length}</Text> 个关于“{keyword}”的菜谱
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <RecipeCard recipe={item} />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>没有搜到相关菜谱，换个食材试试吧</Text>
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
  hotSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  hotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  hotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
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
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.cocoa[700],
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  resultSummary: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 4,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
    color: Palette.apricot[600],
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 13,
    color: Palette.cocoa[400],
  },
});
