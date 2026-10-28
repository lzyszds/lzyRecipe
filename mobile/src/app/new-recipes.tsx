/**
 * 每日上新：展示近期（30 天内）加入菜谱库的菜谱，按天分组倒序浏览。
 * 数据源为全库 createdAt 时间戳（内置库与每日新生成菜谱都带创建时间），
 * 纯本地查询，无网络依赖。
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, PartyPopper, Clock } from 'lucide-react-native';
import { useAllRecipes } from '@/lib/recipes';
import type { Recipe } from '@/types';
import { RecipeImage as RecipeImageComp } from '@/components/RecipeImage';
import { Palette } from '@/constants/theme';

const MAX_DAYS_GROUPS = 10;

function dayLabel(at: number): string {
  const now = new Date();
  const d = new Date(at);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (at >= startOfToday) return '今天上新';
  if (at >= startOfToday - 86400000) return '昨天上新';
  return `${d.getMonth() + 1}月${d.getDate()}日 新增`;
}

export default function NewRecipesScreen(): React.ReactNode {
  const router = useRouter();
  const allRecipes = useAllRecipes();

  // 冷启动帧固定"今天"：React 纯净性规则不允许在渲染/useMemo 里调 Date.now
  const [now] = useState(() => Date.now());

  const groups = useMemo(() => {
    const start = now - 30 * 86400000;
    const fresh = allRecipes.filter((r) => {
      const at = new Date(r.createdAt || 0).getTime();
      return at >= start && at > 0;
    });
    fresh.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const map = new Map<string, Recipe[]>();
    const out: { label: string; items: Recipe[] }[] = [];
    for (const r of fresh) {
      const label = dayLabel(new Date(r.createdAt).getTime());
      if (!map.has(label)) {
        map.set(label, []);
        out.push({ label, items: map.get(label)! });
        if (out.length >= MAX_DAYS_GROUPS) break;
      }
      map.get(label)!.push(r);
    }
    return out;
  }, [allRecipes, now]);

  const totalFresh = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={20} color={Palette.cocoa[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>每日上新</Text>
        <Text style={styles.countText}>{totalFresh} 道新菜</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 && (
          <View style={styles.emptyWrap}>
            <PartyPopper size={32} color={Palette.cocoa[200]} />
            <Text style={styles.emptyText}>近 30 天暂无新菜上架，敬请期待</Text>
          </View>
        )}

        {groups.map((group) => (
          <View key={group.label} style={styles.dayGroup}>
            <View style={styles.dayHeader}>
              <PartyPopper size={13} color={Palette.primary} />
              <Text style={styles.dayLabel}>{group.label}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{group.items.length}</Text>
              </View>
            </View>
            <View style={styles.grid}>
              {group.items.map((dish) => (
                <TouchableOpacity
                  key={dish.id}
                  style={styles.gridCell}
                  onPress={() =>
                    router.push({ pathname: '/recipe/[id]', params: { id: dish.id } })
                  }
                  activeOpacity={0.86}
                >
                  <View style={styles.imageWrap}>
                    <RecipeImageComp
                      coverImage={dish.coverImage}
                      name={dish.name}
                      category={dish.category}
                    />
                    <View style={styles.timeBadge}>
                      <Clock size={10} color="#FFFFFF" />
                      <Text style={styles.timeBadgeText}>{dish.cookTime || 0}分</Text>
                    </View>
                  </View>
                  <Text style={styles.dishName} numberOfLines={1}>
                    {dish.name}
                  </Text>
                  <Text style={styles.dishMeta} numberOfLines={1}>
                    {dish.category} · {dish.ingredients?.length || 0} 种用料
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
    flex: 1,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 13,
    color: Palette.cocoa[400],
  },
  dayGroup: {
    marginBottom: 18,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dayLabel: {
    fontSize: 13,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCell: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 7,
    borderWidth: 1,
    borderColor: '#F0E9DF',
  },
  imageWrap: {
    height: 118,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Palette.tagWarm,
    position: 'relative',
  },
  timeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 30, 28, 0.72)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  dishName: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
    color: Palette.ink,
  },
  dishMeta: {
    marginTop: 2,
    marginBottom: 2,
    fontSize: 10.5,
    color: Palette.inkMuted,
  },
});
