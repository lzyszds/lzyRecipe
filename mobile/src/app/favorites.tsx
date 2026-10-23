import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, UtensilsCrossed } from 'lucide-react-native';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useAllRecipes } from '@/lib/recipes';
import { RecipeCard } from '@/components/RecipeCard';
import { Palette } from '@/constants/theme';

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites } = useFavoritesStore();
  const allRecipes = useAllRecipes();

  const favoriteRecipes = allRecipes.filter((r) => favorites.includes(r.id));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color={Palette.cocoa[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的收藏 ({favoriteRecipes.length})</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={favoriteRecipes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <RecipeCard recipe={item} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Heart size={44} color={Palette.cocoa[200]} />
            <Text style={styles.emptyTitle}>暂无收藏菜谱</Text>
            <Text style={styles.emptySubtitle}>在浏览菜谱时点击爱心，把心仪的美食收纳在这里吧</Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push('/recipes')}
              activeOpacity={0.8}
            >
              <Text style={styles.exploreBtnText}>去发现美味</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
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
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.cocoa[900],
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Palette.cocoa[400],
    textAlign: 'center',
    lineHeight: 18,
  },
  exploreBtn: {
    marginTop: 12,
    backgroundColor: Palette.apricot[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  exploreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
