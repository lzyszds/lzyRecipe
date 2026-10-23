import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Check,
  Plus,
  Trash2,
  Clock,
  Flame,
  ChefHat,
  Sparkles,
} from 'lucide-react-native';
import { BottomSheetModal } from './BottomSheetModal';
import { Palette, Radius } from '../constants/theme';
import { Recipe, Ingredient, Step, DifficultyLevel } from '../types';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { toast } from '../store/feedbackStore';

interface RecipeEditModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: Recipe;
  onSaved?: (updated: Recipe) => void;
}

const CATEGORIES = [
  '家常菜',
  '快手菜',
  '川菜',
  '粤菜',
  '湘菜',
  '汤羹',
  '主食',
  '减脂餐',
  '甜品饮料',
  '下酒菜',
];

export const RecipeEditModal: React.FC<RecipeEditModalProps> = ({
  visible,
  onClose,
  recipe,
  onSaved,
}) => {
  const [name, setName] = useState(recipe.name);
  const [category, setCategory] = useState(recipe.category);
  const [cookTime, setCookTime] = useState(String(recipe.cookTime || 20));
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(recipe.difficulty || 'medium');
  const [description, setDescription] = useState(recipe.description || '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe.ingredients?.length ? [...recipe.ingredients] : [{ name: '', amount: '' }]
  );
  const [steps, setSteps] = useState<Step[]>(
    recipe.steps?.length
      ? recipe.steps.map((s, idx) => ({ ...s, order: idx + 1 }))
      : [{ order: 1, description: '' }]
  );
  const [tips, setTips] = useState(recipe.tips || '');

  useEffect(() => {
    if (visible) {
      setName(recipe.name);
      setCategory(recipe.category);
      setCookTime(String(recipe.cookTime || 20));
      setDifficulty(recipe.difficulty || 'medium');
      setDescription(recipe.description || '');
      setIngredients(
        recipe.ingredients?.length ? [...recipe.ingredients] : [{ name: '', amount: '' }]
      );
      setSteps(
        recipe.steps?.length
          ? recipe.steps.map((s, idx) => ({ ...s, order: idx + 1 }))
          : [{ order: 1, description: '' }]
      );
      setTips(recipe.tips || '');
    }
  }, [visible, recipe]);

  const handleAddIngredient = () => {
    setIngredients((prev) => [...prev, { name: '', amount: '' }]);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateIngredient = (index: number, field: 'name' | 'amount', value: string) => {
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddStep = () => {
    setSteps((prev) => [...prev, { order: prev.length + 1, description: '' }]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1 }))
    );
  };

  const handleUpdateStep = (index: number, text: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, description: text } : s))
    );
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ type: 'info', message: '请输入菜谱名称' });
      return;
    }

    const cleanIngredients = ingredients.filter(
      (item) => item.name.trim() || item.amount.trim()
    );
    const cleanSteps = steps
      .filter((s) => s.description.trim())
      .map((s, idx) => ({ order: idx + 1, description: s.description.trim() }));

    const updatedRecipe: Recipe = {
      ...recipe,
      name: trimmedName,
      category: category.trim() || '家常菜',
      cookTime: parseInt(cookTime, 10) || 20,
      difficulty,
      description: description.trim(),
      ingredients: cleanIngredients.length ? cleanIngredients : recipe.ingredients,
      steps: cleanSteps.length ? cleanSteps : recipe.steps,
      tips: tips.trim(),
    };

    useImportedRecipesStore.getState().saveOrUpdateRecipe(updatedRecipe);
    toast({ type: 'success', message: '菜谱修改已保存' });
    if (onSaved) onSaved(updatedRecipe);
    onClose();
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} sheetStyle={styles.sheetContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>编辑菜谱</Text>
            <Text style={styles.subtitle}>修改配方、用量与制作步骤</Text>
          </View>
          <Pressable hitSlop={12} onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Palette.cocoa[700]} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 菜名 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>菜品名称 *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="例如：西红柿炒鸡蛋"
              placeholderTextColor={Palette.cocoa[400]}
            />
          </View>

          {/* 分类 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>所属分类</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 烹饪时长与难度 */}
          <View style={styles.twoCols}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>耗时(分钟)</Text>
              <View style={styles.inputWithIcon}>
                <Clock size={16} color={Palette.cocoa[400]} style={styles.iconPrefix} />
                <TextInput
                  style={styles.textInputWithIcon}
                  value={cookTime}
                  onChangeText={setCookTime}
                  keyboardType="numeric"
                  placeholder="20"
                  placeholderTextColor={Palette.cocoa[400]}
                />
              </View>
            </View>

            <View style={[styles.fieldGroup, { flex: 1.2 }]}>
              <Text style={styles.fieldLabel}>难度</Text>
              <View style={styles.difficultyRow}>
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => {
                  const labelMap = { easy: '简单', medium: '中等', hard: '较难' };
                  const isSelected = difficulty === level;
                  return (
                    <Pressable
                      key={level}
                      style={[styles.diffBtn, isSelected && styles.diffBtnActive]}
                      onPress={() => setDifficulty(level)}
                    >
                      <Text style={[styles.diffBtnText, isSelected && styles.diffBtnTextActive]}>
                        {labelMap[level]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 菜品简介 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>风味描述 / 简介</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="这道菜鲜嫩多汁，酸甜可口..."
              placeholderTextColor={Palette.cocoa[400]}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* 食材清单 */}
          <View style={styles.fieldGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.fieldLabel}>用料清单 ({ingredients.length})</Text>
              <Pressable style={styles.addInlineBtn} onPress={handleAddIngredient}>
                <Plus size={14} color={Palette.cocoa[900]} />
                <Text style={styles.addInlineText}>加食材</Text>
              </Pressable>
            </View>

            {ingredients.map((item, index) => (
              <View key={`ing-${index}`} style={styles.ingredientRow}>
                <TextInput
                  style={[styles.textInput, { flex: 2 }]}
                  value={item.name}
                  onChangeText={(val) => handleUpdateIngredient(index, 'name', val)}
                  placeholder="食材名称"
                  placeholderTextColor={Palette.cocoa[400]}
                />
                <TextInput
                  style={[styles.textInput, { flex: 1.5 }]}
                  value={item.amount}
                  onChangeText={(val) => handleUpdateIngredient(index, 'amount', val)}
                  placeholder="用量(如 2个)"
                  placeholderTextColor={Palette.cocoa[400]}
                />
                <Pressable
                  hitSlop={8}
                  style={styles.deleteRowBtn}
                  onPress={() => handleRemoveIngredient(index)}
                >
                  <Trash2 size={16} color={Palette.cocoa[400]} />
                </Pressable>
              </View>
            ))}
          </View>

          {/* 制作步骤 */}
          <View style={styles.fieldGroup}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.fieldLabel}>制作步骤 ({steps.length})</Text>
              <Pressable style={styles.addInlineBtn} onPress={handleAddStep}>
                <Plus size={14} color={Palette.cocoa[900]} />
                <Text style={styles.addInlineText}>加步骤</Text>
              </Pressable>
            </View>

            {steps.map((item, index) => (
              <View key={`step-${index}`} style={styles.stepCard}>
                <View style={styles.stepTopBar}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>第 {item.order} 步</Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    style={styles.deleteRowBtn}
                    onPress={() => handleRemoveStep(index)}
                  >
                    <Trash2 size={15} color={Palette.cocoa[400]} />
                  </Pressable>
                </View>
                <TextInput
                  style={[styles.textInput, styles.textArea, { minHeight: 64 }]}
                  value={item.description}
                  onChangeText={(val) => handleUpdateStep(index, val)}
                  placeholder="详细描述烹饪手法、火候与时间..."
                  placeholderTextColor={Palette.cocoa[400]}
                  multiline
                />
              </View>
            ))}
          </View>

          {/* 大厨贴士 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>独家心得 / 烹饪贴士</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={tips}
              onChangeText={setTips}
              placeholder="例如：鸡蛋里滴几滴料酒会更嫩滑..."
              placeholderTextColor={Palette.cocoa[400]}
              multiline
              numberOfLines={2}
            />
          </View>
        </ScrollView>

        {/* 底部保存按钮 */}
        <View style={styles.footer}>
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.saveBtnText}>保存菜谱</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    height: '90%',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.oat[200],
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  subtitle: {
    fontSize: 12,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: Palette.oat[100],
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[700],
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Palette.oat[100],
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.cocoa[900],
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Palette.oat[100],
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Palette.sand[100],
    borderColor: Palette.cocoa[900],
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  chipTextActive: {
    color: Palette.cocoa[900],
    fontWeight: '700',
  },
  twoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.oat[100],
    borderRadius: Radius.md,
    paddingHorizontal: 10,
  },
  iconPrefix: {
    marginRight: 6,
  },
  textInputWithIcon: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: Palette.cocoa[900],
  },
  difficultyRow: {
    flexDirection: 'row',
    backgroundColor: Palette.oat[100],
    borderRadius: Radius.md,
    padding: 3,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  diffBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  diffBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[400],
  },
  diffBtnTextActive: {
    color: Palette.cocoa[900],
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Palette.sand[100],
    borderRadius: Radius.sm,
  },
  addInlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  deleteRowBtn: {
    padding: 6,
  },
  stepCard: {
    backgroundColor: Palette.oat[50],
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.oat[200],
  },
  stepTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepBadge: {
    backgroundColor: Palette.cocoa[900],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Palette.oat[200],
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.cocoa[900],
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
