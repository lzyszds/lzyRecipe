import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Keyboard,
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
  BookOpen,
  Layers,
  ListOrdered,
  Lightbulb,
  Wand2,
  ChevronDown,
} from 'lucide-react-native';
import { BottomSheetModal } from './BottomSheetModal';
import { Palette, Radius } from '../constants/theme';
import { RECIPE_CATEGORIES, RECIPE_TAGS, MAX_RECIPE_TAGS, inferRecipeTags } from '../constants/recipeCategories';
import { Recipe, Ingredient, Step, DifficultyLevel } from '../types';
import { useImportedRecipesStore } from '../store/importedRecipesStore';
import { generateRecipeWithAi, RecipeGenField } from '../lib/aiRecipe';
import { toast } from '../store/feedbackStore';
import { ensureAiIdle, runAiTask } from '../store/aiTaskStore';
import { logActivity } from '../store/activityLogStore';
import { requestAiGenerateConfirm } from './AiGenerateConfirmSheet';

interface RecipeEditModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: Recipe;
  onSaved?: (updated: Recipe) => void;
}

const CATEGORIES: string[] = [...RECIPE_CATEGORIES];

/** 各字段生成入口的文案 */
const FIELD_META: Record<RecipeGenField, { title: string; desc?: string }> = {
  all: {
    title: 'AI 一键生成整道食谱',
    desc: '将分两步生成：先定用料与风味，再按用料逐条编排步骤（食材保证全部用到），质量更稳。',
  },
  description: { title: 'AI 生成风味描述' },
  ingredients: { title: 'AI 生成标准用料清单' },
  steps: { title: 'AI 编排烹饪步骤' },
  tips: { title: 'AI 生成关键小诀窍' },
};

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
  const [tags, setTags] = useState<string[]>(recipe.tags || []);
  const scrollViewRef = useRef<any>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // AI 局部/全局生成 loading 状态 (记录正在生成的字段：'all' | 'description' | 'ingredients' | 'steps' | 'tips' | null)
  const [aiGeneratingField, setAiGeneratingField] = useState<RecipeGenField | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
      setTags(recipe.tags || []);
      setAiGeneratingField(null);
    }
  }, [visible, recipe]);

  // 内容是否相对原菜谱有实际修改（保存按钮仅在修改后可用）
  const isDirty = useMemo(() => {
    // 归一化：去首尾空格、忽略全空行、步骤按顺序位对比
    const normIngredients = (list: Ingredient[]) =>
      list
        .map((i) => `${i.name.trim()}|${i.amount.trim()}`)
        .filter((s) => s !== '|');
    const normSteps = (list: Step[]) =>
      list
        .map((s, idx) => `${idx}|${s.description.trim()}`)
        .filter((s) => !s.endsWith('|'));

    return (
      name.trim() !== recipe.name.trim() ||
      category !== recipe.category ||
      String(recipe.cookTime || 20) !== cookTime ||
      (recipe.difficulty || 'medium') !== difficulty ||
      description.trim() !== (recipe.description || '').trim() ||
      tips.trim() !== (recipe.tips || '').trim() ||
      JSON.stringify(tags) !== JSON.stringify(recipe.tags || []) ||
      JSON.stringify(normIngredients(ingredients)) !==
        JSON.stringify(normIngredients(recipe.ingredients || [])) ||
      JSON.stringify(normSteps(steps)) !== JSON.stringify(normSteps(recipe.steps || []))
    );
  }, [name, category, cookTime, difficulty, description, ingredients, steps, tips, tags, recipe]);

  // AI 字段生成调度器（二次确认 → 渠道/模型可选 → 全局忙碌守卫）
  const handleAiGenerate = async (field: RecipeGenField) => {
    const dishName = name.trim();
    if (!dishName) {
      toast({ type: 'info', message: '请先在上方输入菜名，AI 才能精准为您生成食谱哦！' });
      return;
    }

    // 本弹窗内已有生成任务，或全局有其他 AI 任务在跑时，拦截并提示
    if (aiGeneratingField) {
      toast({ type: 'warning', message: `已有 AI 在生成「${FIELD_META[aiGeneratingField].title}」中，请稍候再试` });
      return;
    }
    if (!ensureAiIdle()) return;

    const fieldMeta = FIELD_META[field];
    const confirmed = await requestAiGenerateConfirm({
      title: fieldMeta.title,
      dishName,
      description: fieldMeta.desc,
      estimated: field === 'all' ? '约需 1 分钟' : '约需 10-30 秒',
    });
    // 未确认或所选渠道配置不完整（弹层已兜底提示）时中止
    if (!confirmed?.confirmed) return;

    setAiGeneratingField(field);
    try {
      const result = await runAiTask(fieldMeta.title, () =>
        generateRecipeWithAi({
          field,
          recipeName: dishName,
          category,
          categoryOptions: CATEGORIES,
          cookTime,
          difficulty,
          currentIngredients: ingredients,
          currentSteps: steps,
          extraPrompt: confirmed.input || undefined,
          aiSettings: confirmed.config,
        })
      );

      if (field === 'all') {
        if (result.category) setCategory(result.category);
        if (result.cookTime) setCookTime(String(result.cookTime));
        if (result.difficulty) setDifficulty(result.difficulty);
        if (result.description) setDescription(result.description);
        if (result.ingredients && result.ingredients.length > 0) {
          setIngredients(result.ingredients);
        }
        if (result.steps && result.steps.length > 0) {
          setSteps(result.steps.map((s, i) => ({ ...s, order: i + 1 })));
        }
        if (result.tips) setTips(result.tips);
        toast({ type: 'success', message: `已成功为您生成「${dishName}」完整食谱！` });
      } else if (field === 'description' && result.description) {
        setDescription(result.description);
        toast({ type: 'success', message: '已生成菜品风味描述' });
      } else if (field === 'ingredients' && result.ingredients?.length) {
        setIngredients(result.ingredients);
        toast({ type: 'success', message: `已生成 ${result.ingredients.length} 样标准用料清单` });
      } else if (field === 'steps' && result.steps?.length) {
        setSteps(result.steps.map((s, i) => ({ ...s, order: i + 1 })));
        toast({ type: 'success', message: `已生成 ${result.steps.length} 步条理清晰的烹饪步骤` });
      } else if (field === 'tips' && result.tips) {
        setTips(result.tips);
        toast({ type: 'success', message: '已生成大厨烹饪秘诀' });
      }

      logActivity({
        type: 'ai',
        action: fieldMeta.title,
        detail: dishName,
        meta: { 渠道: confirmed.config.providerId || '—', 模型: confirmed.config.model || '—' },
      });

      // 一致性体检结果提示：有食材漏用时要明确告诉用户
      const unusedList = result.warnings?.unusedIngredients || [];
      if (unusedList.length > 0) {
        toast({
          type: 'warning',
          message: `注意：「${unusedList.join('、')}」未出现在步骤中，建议手动检查或重新生成步骤`,
        });
      }
    } catch (err: any) {
      toast({
        type: 'error',
        message: err.message || 'AI 生成失败，请检查网络或在设置中检查配置',
      });
    } finally {
      setAiGeneratingField(null);
    }
  };

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
    if (!isDirty) return;
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

    // 标签：用户勾选优先；为空时按内容自动推断兜底
    const nextTags = tags.length
      ? tags
      : inferRecipeTags({
          name: trimmedName,
          description: description.trim(),
          cookTime: parseInt(cookTime, 10) || 20,
          ingredients: cleanIngredients,
          category: category.trim() || '家常菜',
        });

    const updatedRecipe: Recipe = {
      ...recipe,
      name: trimmedName,
      category: category.trim() || '家常菜',
      cookTime: parseInt(cookTime, 10) || 20,
      difficulty,
      description: description.trim(),
      ingredients: cleanIngredients.length ? cleanIngredients : recipe.ingredients,
      steps: cleanSteps.length ? cleanSteps : recipe.steps,
      tags: nextTags,
      tips: tips.trim(),
    };

    useImportedRecipesStore.getState().saveOrUpdateRecipe(updatedRecipe);
    toast({ type: 'success', message: '菜谱修改已保存' });
    logActivity({
      type: 'recipe',
      action: '编辑菜谱',
      detail: `${trimmedName}（${updatedRecipe.category}）`,
      meta: { 分类: updatedRecipe.category, 标签: updatedRecipe.tags?.join('/') || '无' },
    });
    if (onSaved) onSaved(updatedRecipe);
    onClose();
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} sheetStyle={styles.sheetContainer}>
      <View style={styles.keyboardContainer}>
        {/* 顶部标题栏 */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerIconBadge}>
              <ChefHat size={16} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.title}>编辑菜谱</Text>
              <Text style={styles.subtitle}>智能润色配方、用料与做饭步骤</Text>
            </View>
          </View>
          <View style={styles.headerRightActions}>
            {isKeyboardVisible && (
              <TouchableOpacity
                onPress={() => Keyboard.dismiss()}
                style={styles.hideKeyboardPill}
                activeOpacity={0.7}
              >
                <ChevronDown size={14} color={Palette.primary} />
                <Text style={styles.hideKeyboardText}>收起键盘</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={16} color={Palette.inkMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollBody}
          contentContainerStyle={[
            styles.scrollContent,
            isKeyboardVisible && { paddingBottom: 160 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* AI 全局一键生成 Banner */}
          <View style={styles.aiBanner}>
            <View style={styles.aiBannerLeft}>
              <View style={styles.aiBannerIconBadge}>
                <Sparkles size={16} color="#EA580C" />
              </View>
              <View style={styles.aiBannerTextCol}>
                <Text style={styles.aiBannerTitle}>AI 智能一键生成完整食谱</Text>
                <Text style={styles.aiBannerDesc}>
                  两步生成：先定用料 → 再按用料编排步骤，保证每个食材都用上
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.aiBannerBtn,
                aiGeneratingField === 'all' && styles.aiBannerBtnDisabled,
              ]}
              onPress={() => handleAiGenerate('all')}
              disabled={aiGeneratingField !== null}
              activeOpacity={0.8}
            >
              {aiGeneratingField === 'all' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.aiBtnRow}>
                  <Wand2 size={13} color="#FFFFFF" />
                  <Text style={styles.aiBannerBtnText}>一键生成</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* 1. 菜品名称 */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeaderRow}>
              <View style={styles.fieldTitleRow}>
                <BookOpen size={14} color={Palette.primary} />
                <Text style={styles.fieldLabel}>菜品名称 *</Text>
              </View>
            </View>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="例如：焦香蒜香生炒排骨"
              placeholderTextColor={Palette.inkLight}
            />
          </View>

          {/* 2. 所属分类 + 特性标签 */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeaderRow}>
              <View style={styles.fieldTitleRow}>
                <Layers size={14} color={Palette.primary} />
                <Text style={styles.fieldLabel}>所属分类</Text>
              </View>
              <Text style={styles.fieldSubHint}>左右滑动可选择更多分类</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 特性标签（多选） */}
            <View style={styles.fieldTitleRow}>
              <Text style={styles.fieldLabel}>特性标签</Text>
              <Text style={styles.fieldSubHint}>可多选，用于筛选与推荐</Text>
            </View>
            <View style={styles.tagWrap}>
              {RECIPE_TAGS.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() =>
                      setTags((prev) =>
                        isSelected
                          ? prev.filter((t) => t !== tag)
                          : prev.length >= MAX_RECIPE_TAGS
                          ? prev
                          : [...prev, tag]
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 3. 烹饪时长与难度 */}
          <View style={styles.twoColsRow}>
            <View style={[styles.fieldCard, { flex: 1 }]}>
              <View style={styles.fieldTitleRow}>
                <Clock size={14} color={Palette.primary} />
                <Text style={styles.fieldLabel}>烹饪用时(分)</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={cookTime}
                onChangeText={setCookTime}
                keyboardType="numeric"
                placeholder="25"
                placeholderTextColor={Palette.inkLight}
              />
            </View>

            <View style={[styles.fieldCard, { flex: 1.25 }]}>
              <View style={styles.fieldTitleRow}>
                <Flame size={14} color={Palette.primary} />
                <Text style={styles.fieldLabel}>烹饪难度</Text>
              </View>
              <View style={styles.diffRow}>
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => {
                  const labelMap = { easy: '简单', medium: '家常', hard: '进阶' };
                  const isSelected = difficulty === level;
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[styles.diffBtn, isSelected && styles.diffBtnActive]}
                      onPress={() => setDifficulty(level)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.diffBtnText,
                          isSelected && styles.diffBtnTextActive,
                        ]}
                      >
                        {labelMap[level]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 4. 风味描述 / 简介 (带 AI 生成按钮) */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeaderRow}>
              <View style={styles.fieldTitleRow}>
                <Sparkles size={14} color={Palette.primary} />
                <Text style={styles.fieldLabel}>风味描述 / 菜品特色</Text>
              </View>
              <TouchableOpacity
                style={styles.aiActionPill}
                onPress={() => handleAiGenerate('description')}
                disabled={aiGeneratingField !== null}
                activeOpacity={0.8}
              >
                {aiGeneratingField === 'description' ? (
                  <ActivityIndicator size="small" color={Palette.primary} />
                ) : (
                  <>
                    <Sparkles size={11} color={Palette.primary} />
                    <Text style={styles.aiActionPillText}>AI 润色简介</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="这道菜外焦里嫩，蒜香扑鼻，无需油炸清爽下饭..."
              placeholderTextColor={Palette.inkLight}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* 5. 用料清单 (带 AI 生成配料按钮) */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeaderRow}>
              <View style={styles.fieldTitleRow}>
                <Layers size={14} color={Palette.primary} />
                <Text style={styles.fieldLabel}>用料食材清单 ({ingredients.length})</Text>
              </View>
              <View style={styles.headerRightActions}>
                <TouchableOpacity
                  style={styles.aiActionPill}
                  onPress={() => handleAiGenerate('ingredients')}
                  disabled={aiGeneratingField !== null}
                  activeOpacity={0.8}
                >
                  {aiGeneratingField === 'ingredients' ? (
                    <ActivityIndicator size="small" color={Palette.primary} />
                  ) : (
                    <>
                      <Sparkles size={11} color={Palette.primary} />
                      <Text style={styles.aiActionPillText}>AI 配用料</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addInlineBtn}
                  onPress={handleAddIngredient}
                  activeOpacity={0.8}
                >
                  <Plus size={13} color={Palette.ink} />
                  <Text style={styles.addInlineText}>加食材</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.ingredientList}>
              {ingredients.map((item, index) => (
                <View key={`ing-${index}`} style={styles.ingredientRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 2 }]}
                    value={item.name}
                    onChangeText={(val) => handleUpdateIngredient(index, 'name', val)}
                    placeholder="食材 (如 排骨)"
                    placeholderTextColor={Palette.inkLight}
                  />
                  <TextInput
                    style={[styles.textInput, { flex: 1.4 }]}
                    value={item.amount}
                    onChangeText={(val) => handleUpdateIngredient(index, 'amount', val)}
                    placeholder="用量 (如 500g)"
                    placeholderTextColor={Palette.inkLight}
                  />
                  <TouchableOpacity
                    hitSlop={8}
                    style={styles.deleteRowBtn}
                    onPress={() => handleRemoveIngredient(index)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={15} color="#A8A29E" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* 6. 制作步骤 (带 AI 生成步骤按钮) */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeaderRow}>
              <View style={styles.fieldTitleRow}>
                <ListOrdered size={14} color={Palette.primary} />
                <Text style={styles.fieldLabel}>烹饪制作步骤 ({steps.length})</Text>
              </View>
              <View style={styles.headerRightActions}>
                <TouchableOpacity
                  style={styles.aiActionPill}
                  onPress={() => handleAiGenerate('steps')}
                  disabled={aiGeneratingField !== null}
                  activeOpacity={0.8}
                >
                  {aiGeneratingField === 'steps' ? (
                    <ActivityIndicator size="small" color={Palette.primary} />
                  ) : (
                    <>
                      <Sparkles size={11} color={Palette.primary} />
                      <Text style={styles.aiActionPillText}>AI 生成步骤</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addInlineBtn}
                  onPress={handleAddStep}
                  activeOpacity={0.8}
                >
                  <Plus size={13} color={Palette.ink} />
                  <Text style={styles.addInlineText}>加步骤</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.stepsList}>
              {steps.map((item, index) => (
                <View key={`step-${index}`} style={styles.stepCardItem}>
                  <View style={styles.stepTopBar}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>第 {item.order} 步</Text>
                    </View>
                    <TouchableOpacity
                      hitSlop={8}
                      style={styles.deleteRowBtn}
                      onPress={() => handleRemoveStep(index)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color="#A8A29E" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.textArea, { minHeight: 68 }]}
                    value={item.description}
                    onChangeText={(val) => handleUpdateStep(index, val)}
                    placeholder="描述具体的处理手法、下锅油温、调料顺序与火候时长..."
                    placeholderTextColor={Palette.inkLight}
                    multiline
                    onFocus={() => {
                      if (index >= steps.length - 2) {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 200);
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* 7. 大厨贴士 (带 AI 生成小贴士) */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeaderRow}>
              <View style={styles.fieldTitleRow}>
                <Lightbulb size={14} color={Palette.primary} />
                <Text style={styles.fieldLabel}>大厨独家心得 / 防翻车秘诀</Text>
              </View>
              <TouchableOpacity
                style={styles.aiActionPill}
                onPress={() => handleAiGenerate('tips')}
                disabled={aiGeneratingField !== null}
                activeOpacity={0.8}
              >
                {aiGeneratingField === 'tips' ? (
                  <ActivityIndicator size="small" color={Palette.primary} />
                ) : (
                  <>
                    <Sparkles size={11} color={Palette.primary} />
                    <Text style={styles.aiActionPillText}>AI 生成秘诀</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={tips}
              onChangeText={setTips}
              placeholder="例如：生炒前洗净并控干水分，煎至两面金黄再下酱汁，肉质格外焦香..."
              placeholderTextColor={Palette.inkLight}
              multiline
              numberOfLines={3}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 200);
              }}
            />
          </View>
        </ScrollView>

        {/* 底部保存按钮 */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, !isDirty && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isDirty}
            activeOpacity={0.85}
          >
            <Check
              size={18}
              color={isDirty ? '#FFFFFF' : Palette.cocoa[400]}
              strokeWidth={2.5}
            />
            <Text style={[styles.saveBtnText, !isDirty && styles.saveBtnTextDisabled]}>
              {isDirty ? '保存菜谱' : '尚未修改'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    height: '92%',
    maxHeight: '92%',
    backgroundColor: Palette.canvas,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
    backgroundColor: Palette.canvas,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.ink,
  },
  subtitle: {
    fontSize: 11,
    color: Palette.inkMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.tagWarm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hideKeyboardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 3,
    borderWidth: 1,
    borderColor: '#F7D4BC',
  },
  hideKeyboardText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderRadius: Radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
    gap: 10,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aiBannerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBannerTextCol: {
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  aiBannerDesc: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 14,
  },
  aiBannerBtn: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  aiBannerBtnDisabled: {
    opacity: 0.6,
  },
  aiBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fieldCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 12,
  },
  twoColsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fieldTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.ink,
  },
  fieldSubHint: {
    fontSize: 11,
    color: Palette.inkLight,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#F7D4BC',
  },
  aiActionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  addInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.tagWarm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  addInlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.ink,
  },
  textInput: {
    backgroundColor: Palette.sheet,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#E7DFD4',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Palette.ink,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Palette.tagWarm,
  },
  chipActive: {
    backgroundColor: Palette.primary,
  },
  chipText: {
    fontSize: 12,
    color: Palette.ink,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  diffRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radius.md,
    backgroundColor: Palette.tagWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffBtnActive: {
    backgroundColor: Palette.primary,
  },
  diffBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.ink,
  },
  diffBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ingredientList: {
    gap: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteRowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Palette.tagWarm,
  },
  stepsList: {
    gap: 10,
  },
  stepCardItem: {
    backgroundColor: Palette.sheet,
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  stepTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepBadge: {
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Palette.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.dockBorder,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
    borderRadius: Radius.lg,
    paddingVertical: 13,
    gap: 6,
  },
  saveBtnDisabled: {
    backgroundColor: Palette.cocoa[200],
  },
  saveBtnTextDisabled: {
    color: Palette.cocoa[700],
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
