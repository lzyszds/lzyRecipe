import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { X, Check, Share2, ShoppingCart, RotateCcw } from 'lucide-react-native';
import { useBentoStore } from '@/store/bentoStore';
import { useAllRecipes } from '@/lib/recipes';
import { buildGroceryList, formatGroceryToText, GroceryItem } from '@/lib/grocery';
import { formatWeekRange } from '@/lib/bentoDate';
import { toast } from '@/store/feedbackStore';
import { Palette } from '@/constants/theme';

interface GrocerySheetProps {
  visible: boolean;
  mondayStr: string;
  weekDates: string[];
  onClose: () => void;
}

export const GrocerySheet: React.FC<GrocerySheetProps> = ({
  visible,
  mondayStr,
  weekDates,
  onClose,
}) => {
  const allRecipes = useAllRecipes();
  const { bentoByDate, purchasedIngredients, togglePurchased, clearPurchased } =
    useBentoStore();

  const groceryData = useMemo(
    () => buildGroceryList(weekDates, bentoByDate, allRecipes),
    [weekDates, bentoByDate, allRecipes]
  );

  const handleCopy = async () => {
    const text = formatGroceryToText(
      mondayStr,
      groceryData.todayItems,
      groceryData.weekItems
    );
    await Clipboard.setStringAsync(text);
    toast({
      type: 'success',
      message: '✅ 采购清单已复制，直接发微信给家人吧！',
    });
  };

  if (!visible) return null;

  const renderSection = (title: string, icon: string, items: GroceryItem[]) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>({items.length}项)</Text>
        </View>

        <View style={styles.itemsCard}>
          {items.map((item) => {
            const isChecked = Boolean(purchasedIngredients[item.key]);
            const amountText = item.amounts.length > 0 ? ` (${item.amounts.join('+')})` : '';
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.itemRow, isChecked && styles.itemRowChecked]}
                onPress={() => togglePurchased(item.key)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    isChecked && styles.checkboxChecked,
                  ]}
                >
                  {isChecked && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                </View>

                <View style={styles.itemTextCol}>
                  <Text
                    style={[styles.itemName, isChecked && styles.itemNameChecked]}
                  >
                    {item.name}
                    <Text style={styles.itemAmount}>{amountText}</Text>
                  </Text>
                  <Text style={styles.dishHints} numberOfLines={1}>
                    用于: {item.dishNames.join('、')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar style="light" animated />
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            {/* 顶栏 */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View style={styles.iconCircle}>
                  <ShoppingCart size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.sheetTitle}>本周采购清单</Text>
                  <Text style={styles.sheetSubtitle}>
                    {formatWeekRange(mondayStr)} · 自动聚合全部便当食材
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={Palette.cocoa[700]} />
              </TouchableOpacity>
            </View>

            {/* 内容区 */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {groceryData.totalCount === 0 ? (
                <View style={styles.emptyContainer}>
                  <ShoppingCart size={40} color={Palette.oat[200]} />
                  <Text style={styles.emptyTitle}>暂无采购需求</Text>
                  <Text style={styles.emptySubtitle}>
                    在上方给便当盒安排想吃的菜后，食材清单会自动在这里汇总出来！
                  </Text>
                </View>
              ) : (
                <>
                  {renderSection('今天马上要用', '⚡', groceryData.todayItems)}
                  {renderSection('本周备货食材', '📦', groceryData.weekItems)}

                  <View style={styles.tipBox}>
                    <Text style={styles.tipText}>
                      💡 去菜场或超市采购时直接点击打勾；缺货时可在便当盒中替换对应菜品。
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            {/* 底部操作条 */}
            {groceryData.totalCount > 0 && (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={clearPurchased}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={14} color={Palette.cocoa[700]} />
                  <Text style={styles.resetBtnText}>重置打勾</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={handleCopy}
                  activeOpacity={0.85}
                >
                  <Share2 size={15} color="#FFFFFF" />
                  <Text style={styles.copyBtnText}>一键复制发给家人</Text>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '82%',
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  sheetSubtitle: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.oat[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  sectionCount: {
    fontSize: 12,
    color: Palette.cocoa[400],
  },
  itemsCard: {
    backgroundColor: Palette.oat[50],
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.oat[200],
    gap: 12,
  },
  itemRowChecked: {
    opacity: 0.5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Palette.cocoa[400],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  itemTextCol: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.cocoa[900],
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: Palette.cocoa[400],
  },
  itemAmount: {
    fontSize: 12,
    fontWeight: '500',
    color: Palette.primary,
  },
  dishHints: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  tipBox: {
    backgroundColor: 'rgba(217, 107, 56, 0.08)',
    borderRadius: 12,
    padding: 12,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    color: Palette.primary,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.cocoa[700],
  },
  emptySubtitle: {
    fontSize: 12,
    color: Palette.cocoa[400],
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.dockBorder,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Palette.oat[100],
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
