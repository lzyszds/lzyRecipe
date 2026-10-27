import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { X, Image as ImageIcon, MessageSquareText, Copy } from 'lucide-react-native';
import { BottomSheetModal } from './BottomSheetModal';
import { RecipeImage } from './RecipeImage';
import { Recipe } from '@/types';
import { GroceryItem } from '@/lib/grocery';
import {
  WeeklyPlanDayShare,
  shareText,
} from '@/lib/share';
import { toast } from '@/store/feedbackStore';
import { Palette, Radius } from '@/constants/theme';

/**
 * 一键分享卡片：把菜谱 / 采购清单 / 一周便当计划渲染成精美图片卡片，
 * 截图后调起系统分享面板发到微信等任意 App；同时保留纯文本分享与复制兜底。
 */
export type ShareCardPayload =
  | { kind: 'recipe'; recipe: Recipe; text: string }
  | {
      kind: 'grocery';
      weekRange: string;
      todayItems: GroceryItem[];
      weekItems: GroceryItem[];
      text: string;
    }
  | { kind: 'weeklyPlan'; weekRange: string; days: WeeklyPlanDayShare[]; text: string };

interface ShareCardModalProps {
  visible: boolean;
  payload: ShareCardPayload | null;
  onClose: () => void;
}

const CARD_WIDTH = 316;
/** 卡片内每个分组最多展示的条目数，超出折叠为「还有 N 项」，避免分享图过长 */
const MAX_ITEMS_PER_SECTION = 12;

const difficultyLabels: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

/* ---------------- 三种分享卡片 ---------------- */

const RecipeShareCard: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  const ingredients = recipe.ingredients || [];
  const shown = ingredients.slice(0, 8);
  const hiddenCount = ingredients.length - shown.length;

  return (
    <View style={styles.card}>
      <View style={styles.cardCoverWrap}>
        <RecipeImage
          coverImage={recipe.coverImage}
          name={recipe.name}
          category={recipe.category}
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {recipe.name}
        </Text>
        <Text style={styles.cardMeta}>
          {recipe.category || '家常菜'} · {recipe.cookTime || 20} 分钟 ·{' '}
          {difficultyLabels[recipe.difficulty] || '普通'}
        </Text>
        {Boolean(recipe.description?.trim()) && (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {recipe.description.trim()}
          </Text>
        )}

        {shown.length > 0 && (
          <View style={styles.ingGrid}>
            {shown.map((ing, idx) => (
              <View key={idx} style={styles.ingChip}>
                <Text style={styles.ingChipName} numberOfLines={1}>
                  {ing.name}
                </Text>
                {Boolean(ing.amount?.trim()) && (
                  <Text style={styles.ingChipAmount} numberOfLines={1}>
                    {ing.amount}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        {hiddenCount > 0 && (
          <Text style={styles.cardMore}>等共 {ingredients.length} 种用料</Text>
        )}

        {Boolean(recipe.steps?.length) && (
          <Text style={styles.cardStepsHint}>
            共 {recipe.steps.length} 步详细做法，打开「食刻 CookMoment」查看
          </Text>
        )}
      </View>
      <CardFooter />
    </View>
  );
};

const GroceryShareCard: React.FC<{
  weekRange: string;
  todayItems: GroceryItem[];
  weekItems: GroceryItem[];
}> = ({ weekRange, todayItems, weekItems }) => {
  const renderSection = (title: string, items: GroceryItem[]) => {
    if (items.length === 0) return null;
    const shown = items.slice(0, MAX_ITEMS_PER_SECTION);
    const hiddenCount = items.length - shown.length;
    return (
      <View style={styles.grocerySection}>
        <Text style={styles.grocerySectionTitle}>
          {title}
          <Text style={styles.grocerySectionCount}>（{items.length} 项）</Text>
        </Text>
        {shown.map((item) => (
          <View key={item.key} style={styles.groceryRow}>
            <View style={styles.groceryDot} />
            <Text style={styles.groceryName} numberOfLines={1}>
              {item.name}
              {item.amounts.length > 0 ? ` ${item.amounts.join('+')}` : ''}
            </Text>
            <Text style={styles.groceryDishes} numberOfLines={1}>
              {item.dishNames.join('、')}
            </Text>
          </View>
        ))}
        {hiddenCount > 0 && (
          <Text style={styles.cardMore}>…还有 {hiddenCount} 项，详见 App 内清单</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeadBand}>
        <Text style={styles.cardHeadTitle}>本周采购清单</Text>
        <Text style={styles.cardHeadSubtitle}>{weekRange}</Text>
      </View>
      <View style={styles.cardBody}>
        {renderSection('今天马上要用', todayItems)}
        {renderSection('本周备货食材', weekItems)}
        {todayItems.length === 0 && weekItems.length === 0 && (
          <Text style={styles.cardMore}>暂未安排菜品，清单为空</Text>
        )}
      </View>
      <CardFooter />
    </View>
  );
};

const WeeklyPlanShareCard: React.FC<{
  weekRange: string;
  days: WeeklyPlanDayShare[];
}> = ({ weekRange, days }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeadBand}>
        <Text style={styles.cardHeadTitle}>一周便当计划</Text>
        <Text style={styles.cardHeadSubtitle}>{weekRange}</Text>
      </View>
      <View style={styles.cardBody}>
        {days.map((day, idx) => (
          <View key={idx} style={styles.planRow}>
            <View style={styles.planDayCol}>
              <Text style={styles.planWeekday}>{day.weekday}</Text>
              <Text style={styles.planDate}>{day.dateLabel}</Text>
            </View>
            <View style={styles.planMealsCol}>
              <Text style={styles.planMealLine} numberOfLines={1}>
                <Text style={styles.planMealTag}>早 </Text>
                {day.breakfast}
              </Text>
              <Text style={styles.planMealLine} numberOfLines={1}>
                <Text style={styles.planMealTag}>午 </Text>
                {day.lunch}
              </Text>
              <Text style={styles.planMealLine} numberOfLines={1}>
                <Text style={styles.planMealTag}>晚 </Text>
                {day.dinner}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <CardFooter />
    </View>
  );
};

const CardFooter: React.FC = () => (
  <View style={styles.cardFooter}>
    <View style={styles.footerAccent} />
    <Text style={styles.footerText}>食刻 CookMoment · 拒绝外卖，好好吃饭</Text>
  </View>
);

/* ---------------- 弹窗主体 ---------------- */

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  visible,
  payload,
  onClose,
}) => {
  const shotRef = useRef<ViewShotRef>(null);
  const [sharing, setSharing] = useState(false);

  if (!payload) return null;

  const handleShareImage = async () => {
    if (Platform.OS === 'web') {
      toast({ type: 'info', message: '网页端暂不支持图片分享，试试分享文字吧' });
      return;
    }
    setSharing(true);
    try {
      const uri = await shotRef.current?.capture();
      if (!uri) throw new Error('capture failed');
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error('sharing unavailable');
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: '分享食刻卡片',
      });
    } catch {
      toast({ type: 'error', message: '图片生成失败，试试分享文字吧' });
    } finally {
      setSharing(false);
    }
  };

  const handleShareText = () => {
    void shareText(payload.text, '食刻 CookMoment');
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(payload.text);
    toast({ type: 'success', message: '已复制到剪贴板' });
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} sheetStyle={styles.sheet}>
      {/* 顶栏 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>分享卡片</Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={18} color={Palette.cocoa[700]} />
        </TouchableOpacity>
      </View>

      {/* 卡片预览（截图区域） */}
      {payload.kind === 'recipe' && (
        <ViewShot ref={shotRef} options={{ format: 'png' }}>
          <RecipeShareCard recipe={payload.recipe} />
        </ViewShot>
      )}
      {payload.kind === 'grocery' && (
        <ViewShot ref={shotRef} options={{ format: 'png' }}>
          <GroceryShareCard
            weekRange={payload.weekRange}
            todayItems={payload.todayItems}
            weekItems={payload.weekItems}
          />
        </ViewShot>
      )}
      {payload.kind === 'weeklyPlan' && (
        <ViewShot ref={shotRef} options={{ format: 'png' }}>
          <WeeklyPlanShareCard weekRange={payload.weekRange} days={payload.days} />
        </ViewShot>
      )}

      {/* 操作区 */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleShareImage}
          disabled={sharing}
          activeOpacity={0.85}
        >
          {sharing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ImageIcon size={16} color="#FFFFFF" />
          )}
          <Text style={styles.primaryBtnText}>分享图片</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleShareText}
          activeOpacity={0.8}
        >
          <MessageSquareText size={15} color={Palette.cocoa[700]} />
          <Text style={styles.secondaryBtnText}>分享文字</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleCopy}
          activeOpacity={0.8}
        >
          <Copy size={15} color={Palette.cocoa[700]} />
          <Text style={styles.secondaryBtnText}>复制</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.oat[100],
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* 卡片通用 */
  card: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    backgroundColor: Palette.cardBg,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.oat[200],
  },
  cardCoverWrap: {
    width: '100%',
    height: 168,
    backgroundColor: Palette.oat[100],
  },
  cardHeadBand: {
    backgroundColor: Palette.primarySoft,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 3,
  },
  cardHeadTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  cardHeadSubtitle: {
    fontSize: 12,
    color: Palette.cocoa[400],
  },
  cardBody: {
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: Palette.cocoa[700],
  },
  ingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.tagWarm,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  ingChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[900],
  },
  ingChipAmount: {
    fontSize: 11,
    color: Palette.primary,
  },
  cardMore: {
    fontSize: 11,
    color: Palette.inkLight,
  },
  cardStepsHint: {
    fontSize: 12,
    color: Palette.cocoa[400],
  },

  /* 采购卡 */
  grocerySection: {
    gap: 6,
  },
  grocerySectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  grocerySectionCount: {
    fontSize: 11,
    fontWeight: '500',
    color: Palette.cocoa[400],
  },
  groceryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groceryDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.primary,
  },
  groceryName: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.cocoa[900],
    flexShrink: 0,
  },
  groceryDishes: {
    fontSize: 11,
    color: Palette.inkLight,
    flex: 1,
    textAlign: 'right',
  },

  /* 计划卡 */
  planRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.oat[200],
  },
  planDayCol: {
    width: 52,
    gap: 2,
  },
  planWeekday: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  planDate: {
    fontSize: 10,
    color: Palette.inkLight,
  },
  planMealsCol: {
    flex: 1,
    gap: 3,
  },
  planMealLine: {
    fontSize: 12,
    color: Palette.cocoa[700],
  },
  planMealTag: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.primary,
  },

  /* 卡片页脚品牌条 */
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.oat[50],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.oat[200],
  },
  footerAccent: {
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.primary,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.cocoa[400],
  },

  /* 操作区 */
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    paddingVertical: 13,
    borderRadius: 16,
    gap: 6,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.oat[100],
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 5,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
});
