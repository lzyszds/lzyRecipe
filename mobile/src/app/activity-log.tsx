import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  UtensilsCrossed,
  Layers,
  Sparkles,
  ImagePlus,
  Heart,
  Trash2,
  Clock,
  CookingPot,
} from 'lucide-react-native';
import { Palette } from '@/constants/theme';
import {
  useActivityLogStore,
  ACTIVITY_TYPE_LABELS,
  ActivityType,
  ActivityEntry,
} from '@/store/activityLogStore';
import { confirm } from '@/store/feedbackStore';
import { useBentoStore, MealType } from '@/store/bentoStore';
import { useAllRecipes } from '@/lib/recipes';

const FILTERS: { key: 'all' | ActivityType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'recipe', label: '菜谱' },
  { key: 'bento', label: '便当盒' },
  { key: 'ai', label: 'AI' },
  { key: 'cover', label: '封面' },
  { key: 'favorite', label: '收藏' },
];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
};

const TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  recipe: <UtensilsCrossed size={14} color={Palette.primary} />,
  bento: <CookingPot size={14} color="#C48827" />,
  ai: <Sparkles size={14} color="#7C5CFC" />,
  cover: <ImagePlus size={14} color="#2E7D6B" />,
  favorite: <Heart size={14} color="#E0564F" />,
};

function formatDayLabel(at: number): string {
  const now = new Date();
  const d = new Date(at);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (at >= startOfToday) return '今天';
  if (at >= startOfToday - 86400000) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatTime(at: number): string {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 把日志里混排的菜谱 id（gen0123 / 内置 id / 自建 id）替换成菜名：
 * 日志详情曾直接入库 id 字符串，读时人话化比迁移历史数据更稳
 */
function makeHumanizer(allRecipes: { id: string; name: string }[]) {
  const idNameMap = new Map(allRecipes.map((r) => [r.id, r.name]));
  return {
    nameOf: (id: string) => idNameMap.get(id) || null,
    humanize: (text: string): string => {
      let out = text;
      for (const [id, name] of idNameMap) {
        if (out.includes(id)) out = out.split(id).join(name);
      }
      return out;
    },
  };
}

export default function ActivityLogScreen() {
  const router = useRouter();
  const entries = useActivityLogStore((s) => s.entries);
  const clearLog = useActivityLogStore((s) => s.clearLog);
  const bentoByDate = useBentoStore((s) => s.bentoByDate);

  const [filter, setFilter] = useState<'all' | ActivityType>('all');
  const [weekOffset, setWeekOffset] = useState<0 | 1 | null>(null);

  const allRecipes = useAllRecipes();
  const { nameOf, humanize } = makeHumanizer(allRecipes);

  const weekStart = useMemo(() => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }, []);

  // 便当盒筛选时：统计本周/上周带饭内容（直接从便当盒数据聚合，历史操作日志补充已删项）
  const bentoWeekList = useMemo(() => {
    if (filter !== 'bento') return [];
    const start = weekStart - (weekOffset ?? 0) * 7 * 86400000;
    const end = start + 7 * 86400000;
    const rows: { date: string; meal: MealType; recipeId: string; eaten: boolean }[] = [];
    Object.values(bentoByDate).forEach((day) => {
      const t = new Date(`${day.date}T00:00:00`).getTime();
      if (t >= start && t < end) {
        (['breakfast', 'lunch', 'dinner'] as MealType[]).forEach((meal) => {
          day[meal].forEach((item) => {
            rows.push({ date: day.date, meal, recipeId: item.recipeId, eaten: Boolean(item.eatenAt) });
          });
        });
      }
    });
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [filter, bentoByDate, weekOffset, weekStart]);

  const visibleEntries = useMemo(() => {
    const base = filter === 'all' ? entries : entries.filter((e) => e.type === filter);
    if (filter === 'bento' && weekOffset !== null) {
      const start = weekStart - weekOffset * 7 * 86400000;
      const end = start + 7 * 86400000;
      return base.filter((e) => e.at >= start && e.at < end);
    }
    return base;
  }, [entries, filter, weekOffset, weekStart]);

  // 按天分组
  const grouped = useMemo(() => {
    const groups: { label: string; items: ActivityEntry[] }[] = [];
    const map = new Map<string, ActivityEntry[]>();
    visibleEntries.forEach((e) => {
      const label = formatDayLabel(e.at);
      if (!map.has(label)) {
        map.set(label, []);
        groups.push({ label, items: map.get(label)! });
      }
      map.get(label)!.push(e);
    });
    return groups;
  }, [visibleEntries]);

  const handleClear = async () => {
    const ok = await confirm({
      title: '清空操作历史',
      message: '将清除全部操作记录，此操作不可恢复。',
      confirmText: '清空',
      icon: 'trash',
    });
    if (ok) clearLog();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={20} color={Palette.cocoa[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>操作历史</Text>
        <TouchableOpacity
          onPress={handleClear}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={18} color={Palette.cocoa[400]} />
        </TouchableOpacity>
      </View>

      {/* 类型筛选 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => {
              setFilter(f.key);
              setWeekOffset(null);
            }}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 便当盒周筛选 */}
      {filter === 'bento' && (
        <View style={styles.weekRow}>
          {[
            { label: '本周带饭', offset: 0 as const },
            { label: '上周带饭', offset: 1 as const },
          ].map((w) => (
            <TouchableOpacity
              key={w.offset}
              style={[styles.weekChip, weekOffset === w.offset && styles.weekChipActive]}
              onPress={() => setWeekOffset(weekOffset === w.offset ? null : w.offset)}
              activeOpacity={0.75}
            >
              <Clock size={12} color={weekOffset === w.offset ? Palette.primary : Palette.cocoa[400]} />
              <Text style={[styles.weekText, weekOffset === w.offset && styles.weekTextActive]}>
                {w.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* 便当盒周视图：聚合展示本周/上周带饭清单 */}
        {filter === 'bento' && weekOffset !== null && (
          <View style={styles.bentoSummary}>
            <Text style={styles.bentoSummaryTitle}>
              {weekOffset === 0 ? '本周' : '上周'}共带饭 {bentoWeekList.length} 份
            </Text>
            {bentoWeekList.slice(0, 30).map((row, idx) => (
              <Text key={`${row.date}-${row.meal}-${row.recipeId}-${idx}`} style={styles.bentoSummaryRow}>
                {row.date.slice(5)} · {MEAL_LABELS[row.meal]} · {nameOf(row.recipeId) || '已删除的菜谱'}
                {row.eaten ? ' ✓已吃' : ''}
              </Text>
            ))}
            {bentoWeekList.length === 0 && (
              <Text style={styles.bentoSummaryRow}>该周暂无带饭记录</Text>
            )}
          </View>
        )}

        {grouped.length === 0 && bentoWeekList.length === 0 && (
          <View style={styles.emptyWrap}>
            <Clock size={32} color={Palette.cocoa[200]} />
            <Text style={styles.emptyText}>还没有操作记录</Text>
          </View>
        )}

        {grouped.map((group) => (
          <View key={group.label} style={styles.dayGroup}>
            <Text style={styles.dayLabel}>{group.label}</Text>
            <View style={styles.dayCard}>
              {group.items.map((entry) => (
                <View key={entry.id} style={styles.entryRow}>
                  <View style={styles.entryIcon}>{TYPE_ICONS[entry.type]}</View>
                  <View style={styles.entryMain}>
                    <Text style={styles.entryAction} numberOfLines={1}>
                      {entry.action}
                    </Text>
                    {entry.detail ? (
                      <Text style={styles.entryDetail} numberOfLines={2}>
                        {humanize(entry.detail)}
                      </Text>
                    ) : null}
                    {entry.meta &&
                      Object.keys(entry.meta).length > 0 && (
                        <View style={styles.metaRow}>
                          {Object.entries(entry.meta)
                            .slice(0, 4)
                            .map(([k, v]) => (
                              <View key={k} style={styles.metaChip}>
                                <Text style={styles.metaText}>
                                  {humanize(k)}: {humanize(String(v))}
                                </Text>
                              </View>
                            ))}
                        </View>
                      )}
                  </View>
                  <Text style={styles.entryTime}>{formatTime(entry.at)}</Text>
                </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  },
  filterBar: {
    flexGrow: 0,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: Palette.primarySoft,
    borderWidth: 1.5,
    borderColor: Palette.primary,
  },
  filterText: {
    fontSize: 12,
    color: Palette.cocoa[700],
  },
  filterTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  weekChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  weekChipActive: {
    backgroundColor: Palette.primarySoft,
    borderWidth: 1.5,
    borderColor: Palette.primary,
  },
  weekText: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  weekTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  bentoSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  bentoSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.cocoa[900],
    marginBottom: 8,
  },
  bentoSummaryRow: {
    fontSize: 12,
    color: Palette.cocoa[700],
    lineHeight: 20,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 13,
    color: Palette.cocoa[400],
  },
  dayGroup: {
    marginBottom: 16,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[400],
    marginBottom: 8,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0EAE2',
  },
  entryIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Palette.oat[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryMain: {
    flex: 1,
  },
  entryAction: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  entryDetail: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  metaChip: {
    backgroundColor: Palette.oat[100],
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  metaText: {
    fontSize: 10,
    color: Palette.cocoa[700],
  },
  entryTime: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
});
