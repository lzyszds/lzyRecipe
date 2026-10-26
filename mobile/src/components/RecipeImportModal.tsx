import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  X,
  Sparkles,
  FileCode,
  FileUp,
  Clipboard as ClipboardIcon,
  Check,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronRight,
  Clock,
  ChefHat,
  ArrowLeft,
  Trash2,
  Settings,
  HelpCircle,
  ImagePlus,
} from 'lucide-react-native';
import { Recipe } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore, isAiConfigured } from '@/store/settingsStore';
import { useImportedRecipesStore } from '@/store/importedRecipesStore';
import { ensureAiIdle, runAiTask } from '@/store/aiTaskStore';
import { logActivity } from '@/store/activityLogStore';
import { requestAiGenerateConfirm } from './AiGenerateConfirmSheet';
import { useAllRecipes } from '@/lib/recipes';
import { toast, alert } from '@/store/feedbackStore';
import { Palette } from '@/constants/theme';
import {
  parseJsonRecipeContent,
  parseRecipesWithAi,
  analyzeDuplicates,
  applyDeduplicationStrategy,
  pickJsonDocument,
  readClipboardContent,
  DeduplicationItem,
  DeduplicationStrategy,
} from '@/lib/recipeImport';
import { fillMissingCovers } from '@/lib/coverImage';

interface RecipeImportModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAiSettings?: () => void;
}

const SAMPLE_AI_TEXT = `【蒜香生抽排骨】
主要食材：小排骨 500克，大蒜 1头（剁成蒜蓉），生抽 2汤匙，老抽 半汤匙，蚝油 1勺，料酒 1勺，白糖 1茶匙，生粉 1勺。
做法步骤：
1. 排骨洗净冷水浸泡半小时去血水，捞出沥干水分；
2. 碗中放入排骨，加入蒜末、生抽、老抽、料酒、白糖抓匀腌制 20 分钟；
3. 热锅下适量油，放入腌好的排骨中火慢煎至两面金黄焦香；
4. 倒入剩余的腌肉酱汁和小半碗温水，盖上锅盖焖烧 8 分钟；
5. 大火收浓汤汁，撒上少许白芝麻出锅。
小窍门：排骨煎至微焦再焖，口感外焦里嫩蒜香浓郁。时长约 25 分钟。`;

const SAMPLE_JSON_TEXT = `[
  {
    "name": "香辣基围虾",
    "category": "海鲜",
    "description": "热油爆香花椒干辣椒，大虾焦香弹牙，下酒下饭必备。",
    "cookTime": 15,
    "difficulty": "easy",
    "ingredients": [
      { "name": "鲜基围虾", "amount": "400g" },
      { "name": "干辣椒段", "amount": "15g" },
      { "name": "花椒粒", "amount": "1小勺" },
      { "name": "葱姜蒜末", "amount": "各1勺" }
    ],
    "steps": [
      { "order": 1, "description": "大虾剪去虾须挑出虾线，用厨房纸吸干表面水分。" },
      { "order": 2, "description": "油温六成热下锅炸至外壳酥脆变红捞出。" },
      { "order": 3, "description": "锅留底油爆香葱姜蒜与干辣椒花椒，倒入炸好的虾大火快速翻炒均匀出锅。" }
    ],
    "tips": "虾身水分一定要吸干，炸的时候才不会溅油且外壳更酥脆。"
  }
]`;

export const RecipeImportModal: React.FC<RecipeImportModalProps> = ({
  visible,
  onClose,
  onOpenAiSettings,
}) => {
  const { ai } = useSettingsStore();
  const allExistingRecipes = useAllRecipes();
  const { addImportedRecipes, saveOrUpdateRecipe } = useImportedRecipesStore();

  const [activeTab, setActiveTab] = useState<'ai' | 'json'>('ai');
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // 输入态
  const [aiText, setAiText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  // 预览态
  const [dedupItems, setDedupItems] = useState<DeduplicationItem[]>([]);
  const [strategy, setStrategy] = useState<DeduplicationStrategy>('skip');
  const [autoFillCovers, setAutoFillCovers] = useState(true);
  const [importing, setImporting] = useState(false);
  const [coverProgress, setCoverProgress] = useState<{ done: number; total: number } | null>(
    null
  );

  const aiReady = isAiConfigured(ai);

  // 统计信息
  const previewStats = useMemo(() => {
    const total = dedupItems.length;
    const duplicates = dedupItems.filter((i) => i.isDuplicate).length;
    const newItems = total - duplicates;
    const selectedCount = dedupItems.filter((i) => i.selected).length;
    return { total, duplicates, newItems, selectedCount };
  }, [dedupItems]);

  // 本次待导入且缺少封面的菜品数量
  const missingCoverCount = useMemo(
    () =>
      dedupItems.filter(
        (item) =>
          item.selected &&
          (strategy !== 'skip' || !item.isDuplicate) &&
          !String(item.recipe.coverImage || '').trim()
      ).length,
    [dedupItems, strategy]
  );

  const handleReset = () => {
    setAiText('');
    setJsonText('');
    setStep('input');
    setDedupItems([]);
    setStrategy('skip');
    setAutoFillCovers(true);
    setImporting(false);
    setCoverProgress(null);
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // 一键填入剪贴板
  const handlePasteClipboard = async (target: 'ai' | 'json') => {
    const text = await readClipboardContent();
    if (!text.trim()) {
      toast({ type: 'warning', message: '剪贴板内容为空' });
      return;
    }
    if (target === 'ai') {
      setAiText(text);
    } else {
      setJsonText(text);
    }
    toast({ type: 'success', message: '已粘贴剪贴板内容' });
  };

  // 选择本地 JSON 文件
  const handlePickFile = async () => {
    setLoading(true);
    setLoadingMsg('正在读取本地文件…');
    try {
      const res = await pickJsonDocument();
      if (!res.ok) {
        if (res.error === 'FILE_PICKER_NATIVE_MISSING') {
          alert({
            title: '提示',
            message:
              '当前原生运行环境未加载文件管理器模块。\n\n推荐：直接在微信或浏览器中复制 JSON，点击下方的「从剪贴板读取」即可一键导入！',
            confirmText: '我知道了',
          });
        } else if (res.error !== '已取消选择') {
          toast({ type: 'error', message: res.error || '文件读取失败' });
        }
        return;
      }
      setJsonText(res.content || '');
      toast({ type: 'success', message: `已成功载入文件「${res.name}」` });
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  // 解析并进入去重预览
  const processParsedRecipes = (recipes: Recipe[]) => {
    if (recipes.length === 0) {
      toast({ type: 'warning', message: '未找到可导入的菜谱数据' });
      return;
    }
    const analyzed = analyzeDuplicates(recipes, allExistingRecipes);
    setDedupItems(analyzed);
    setStep('preview');
  };

  // AI 解析提交（二次确认：渠道商切换 + 补充要求 + 忙碌守卫）
  const handleAiParse = async () => {
    if (!aiText.trim()) {
      toast({ type: 'warning', message: '请先输入或粘贴菜谱文本' });
      return;
    }
    if (!aiReady) {
      alert({
        title: '未配置 AI 助手',
        message: 'AI 导入需要连接大模型接口（支持 NVIDIA NIM、硅基流动、DeepSeek等，提供免费额度）。',
        confirmText: '前往配置',
        cancelText: '取消',
        onConfirm: () => {
          onClose();
          onOpenAiSettings?.();
        },
      });
      return;
    }
    if (!ensureAiIdle()) return;

    const confirmed = await requestAiGenerateConfirm({
      title: 'AI 智能解析菜谱文本',
      description: '将把输入文本交给所选渠道，提取整理为标准菜谱结构。',
      inputLabel: '补充解析要求（可选）',
      inputPlaceholder: '如：忽略广告段落、只要前两道菜',
      estimated: '约需 10-30 秒',
      confirmText: '开始解析',
    });
    if (!confirmed?.confirmed) return;

    // 补充要求附加到解析文本末尾，与原文一并交给 AI
    const textForAi = confirmed.input
      ? `${aiText.trim()}\n\n补充要求：${confirmed.input}`
      : aiText.trim();

    setLoading(true);
    setLoadingMsg('AI 厨师正在智能解析食材与烹饪步骤…');
    try {
      const recipes = await runAiTask('AI 智能解析', () =>
        parseRecipesWithAi(textForAi, confirmed.config)
      );
      toast({ type: 'success', message: `成功识别出 ${recipes.length} 道菜谱` });
      logActivity({
        type: 'ai',
        action: 'AI 智能解析',
        detail: `解析出 ${recipes.length} 道菜谱`,
        meta: { 渠道: confirmed.config.providerId || '—', 模型: confirmed.config.model || '—' },
      });
      processParsedRecipes(recipes);
    } catch (err: any) {
      toast({ type: 'error', message: err.message || 'AI 解析失败，请重试' });
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  // JSON 解析提交
  const handleJsonParse = () => {
    if (!jsonText.trim()) {
      toast({ type: 'warning', message: '请先输入或导入 JSON 文本' });
      return;
    }
    const res = parseJsonRecipeContent(jsonText);
    if (!res.ok) {
      toast({ type: 'error', message: res.error || 'JSON 解析失败' });
      return;
    }
    toast({ type: 'success', message: `成功解析出 ${res.recipes.length} 道菜谱` });
    processParsedRecipes(res.recipes);
  };

  // 切换单项选择状态
  const toggleItemSelect = (id: string) => {
    setDedupItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // 全选/全不选
  const handleToggleSelectAll = () => {
    const allSelected = dedupItems.every((i) => i.selected);
    setDedupItems((prev) => prev.map((i) => ({ ...i, selected: !allSelected })));
  };

  // 切换去重策略
  const handleStrategyChange = (newStrategy: DeduplicationStrategy) => {
    setStrategy(newStrategy);
    if (newStrategy === 'skip') {
      // 跳过重复：取消勾选重复项
      setDedupItems((prev) =>
        prev.map((i) => (i.isDuplicate ? { ...i, selected: false } : i))
      );
    } else {
      // 覆盖或保留两者：勾选重复项
      setDedupItems((prev) =>
        prev.map((i) => (i.isDuplicate ? { ...i, selected: true } : i))
      );
    }
  };

  // 确认导入执行
  const handleConfirmImport = async () => {
    const finalRecipes = applyDeduplicationStrategy(dedupItems, strategy);
    if (finalRecipes.length === 0) {
      toast({ type: 'warning', message: '请至少选择 1 道要导入的菜谱' });
      return;
    }

    setImporting(true);
    try {
      let recipesToSave = finalRecipes;
      let filledCovers = 0;

      if (autoFillCovers) {
        const missingTotal = recipesToSave.filter(
          (r) => !String(r.coverImage || '').trim()
        ).length;
        if (missingTotal > 0) {
          setCoverProgress({ done: 0, total: missingTotal });
          recipesToSave = await fillMissingCovers(recipesToSave, (p) =>
            setCoverProgress({ done: p.done, total: p.total })
          );
          filledCovers =
            missingTotal -
            recipesToSave.filter((r) => !String(r.coverImage || '').trim()).length;
        }
      }

      if (strategy === 'overwrite') {
        recipesToSave.forEach((r) => saveOrUpdateRecipe(r));
      } else {
        addImportedRecipes(recipesToSave);
      }
      toast({
        type: 'success',
        message: `成功导入 ${recipesToSave.length} 道菜谱${
          filledCovers > 0 ? `，已补全 ${filledCovers} 张封面` : ''
        }！`,
      });
      logActivity({
        type: 'recipe',
        action: '导入菜谱',
        detail: `${recipesToSave.length} 道${filledCovers > 0 ? `，自动补封面 ${filledCovers} 张` : ''}`,
        meta: { 方式: 'AI 解析导入', 策略: strategy },
      });
      handleClose();
    } catch (err: any) {
      toast({ type: 'error', message: err.message || '导入失败' });
    } finally {
      setImporting(false);
      setCoverProgress(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {/* 弹窗头部 */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconBg}>
                <FileUp size={18} color={Palette.primary} strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {step === 'input' ? '菜谱智能导入' : '核验与去重预览'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {step === 'input'
                    ? '支持 AI 自由文本提取、JSON 批量文件与剪贴板导入'
                    : `共识别出 ${previewStats.total} 道菜谱，请确认导入清单`}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, importing && styles.btnDisabled]}
              onPress={() => {
                if (!importing) handleClose();
              }}
              disabled={importing}
              activeOpacity={0.7}
            >
              <X size={18} color={Palette.cocoa[700]} />
            </TouchableOpacity>
          </View>

          {/* 步骤 1: 输入与选择模式 */}
          {step === 'input' && (
            <View style={styles.body}>
              {/* Tab 切换 */}
              <View style={styles.tabBar}>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'ai' && styles.tabItemActive]}
                  onPress={() => setActiveTab('ai')}
                  activeOpacity={0.8}
                >
                  <Sparkles
                    size={15}
                    color={activeTab === 'ai' ? Palette.primary : Palette.cocoa[400]}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'ai' && styles.tabTextActive,
                    ]}
                  >
                    AI 文本智能提取
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'json' && styles.tabItemActive]}
                  onPress={() => setActiveTab('json')}
                  activeOpacity={0.8}
                >
                  <FileCode
                    size={15}
                    color={activeTab === 'json' ? Palette.primary : Palette.cocoa[400]}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'json' && styles.tabTextActive,
                    ]}
                  >
                    JSON 文件 / 粘贴导入
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {activeTab === 'ai' ? (
                  /* AI 提取面板 */
                  <View style={styles.tabContent}>
                    {/* AI 状态卡片 */}
                    <View style={styles.statusBanner}>
                      <View style={styles.statusLeft}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: aiReady ? '#10B981' : '#F59E0B' },
                          ]}
                        />
                        <Text style={styles.statusLabel}>
                          {aiReady
                            ? `AI 服务已就绪（模型: ${ai.model || '标准模型'}）`
                            : '尚未配置 AI Key，点击右侧去配置'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.settingsLinkBtn}
                        onPress={() => {
                          onClose();
                          onOpenAiSettings?.();
                        }}
                        activeOpacity={0.8}
                      >
                        <Settings size={13} color={Palette.primary} />
                        <Text style={styles.settingsLinkText}>配置模型</Text>
                      </TouchableOpacity>
                    </View>

                    {/* 操作快捷按钮组 */}
                    <View style={styles.quickToolsRow}>
                      <TouchableOpacity
                        style={styles.toolBtn}
                        onPress={() => handlePasteClipboard('ai')}
                        activeOpacity={0.75}
                      >
                        <ClipboardIcon size={13} color={Palette.cocoa[700]} />
                        <Text style={styles.toolBtnText}>粘贴剪贴板</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.toolBtn}
                        onPress={() => setAiText(SAMPLE_AI_TEXT)}
                        activeOpacity={0.75}
                      >
                        <Copy size={13} color={Palette.cocoa[700]} />
                        <Text style={styles.toolBtnText}>填入示例</Text>
                      </TouchableOpacity>

                      {Boolean(aiText) && (
                        <TouchableOpacity
                          style={styles.toolBtn}
                          onPress={() => setAiText('')}
                          activeOpacity={0.75}
                        >
                          <Trash2 size={13} color="#DC2626" />
                          <Text style={[styles.toolBtnText, { color: '#DC2626' }]}>
                            清空
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* 多行输入框 */}
                    <View style={styles.textAreaContainer}>
                      <TextInput
                        style={styles.textArea}
                        multiline
                        placeholder="粘贴任意菜谱文本（支持单道或多道菜品，从小红书、下厨房、公众号或备忘录复制的文章即可，AI 会自动提炼出纯净菜名、食材用量与有序步骤）..."
                        placeholderTextColor={Palette.cocoa[400]}
                        value={aiText}
                        onChangeText={setAiText}
                        textAlignVertical="top"
                      />
                    </View>
                    <Text style={styles.charCount}>
                      已输入 {aiText.length} 字符
                    </Text>
                  </View>
                ) : (
                  /* JSON 导入面板 */
                  <View style={styles.tabContent}>
                    {/* 快捷按钮组 */}
                    <View style={styles.quickToolsRow}>
                      <TouchableOpacity
                        style={[styles.toolBtn, styles.toolBtnHighlight]}
                        onPress={handlePickFile}
                        activeOpacity={0.75}
                      >
                        <FileUp size={13} color={Palette.primary} />
                        <Text style={[styles.toolBtnText, { color: Palette.primary, fontWeight: '700' }]}>
                          选择本地 JSON 文件
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.toolBtn}
                        onPress={() => handlePasteClipboard('json')}
                        activeOpacity={0.75}
                      >
                        <ClipboardIcon size={13} color={Palette.cocoa[700]} />
                        <Text style={styles.toolBtnText}>从剪贴板读取</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.toolBtn}
                        onPress={() => setJsonText(SAMPLE_JSON_TEXT)}
                        activeOpacity={0.75}
                      >
                        <Copy size={13} color={Palette.cocoa[700]} />
                        <Text style={styles.toolBtnText}>示例模板</Text>
                      </TouchableOpacity>
                    </View>

                    {/* 多行输入框 */}
                    <View style={styles.textAreaContainer}>
                      <TextInput
                        style={[styles.textArea, styles.jsonTextArea]}
                        multiline
                        placeholder="在此直接粘贴标准 JSON 格式数据（支持单个菜谱对象 {...} 或菜谱列表 [{...}, {...}]）..."
                        placeholderTextColor={Palette.cocoa[400]}
                        value={jsonText}
                        onChangeText={setJsonText}
                        textAlignVertical="top"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <Text style={styles.charCount}>
                      已输入 {jsonText.length} 字符
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* 底部提交动作栏 */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.primarySubmitBtn,
                    loading && styles.btnDisabled,
                  ]}
                  onPress={activeTab === 'ai' ? handleAiParse : handleJsonParse}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primarySubmitBtnText}>{loadingMsg}</Text>
                    </View>
                  ) : (
                    <Text style={styles.primarySubmitBtnText}>
                      {activeTab === 'ai' ? '开始 AI 提取' : '解析并预览'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 步骤 2: 核验与去重预览 */}
          {step === 'preview' && (
            <View style={styles.body}>
              {/* 去重与数量提示横幅 */}
              <View style={styles.previewSummaryCard}>
                <View style={styles.summaryBadgesRow}>
                  <View style={styles.summaryBadge}>
                    <Text style={styles.summaryBadgeVal}>{previewStats.total}</Text>
                    <Text style={styles.summaryBadgeLbl}>待导入总数</Text>
                  </View>

                  <View style={[styles.summaryBadge, { backgroundColor: '#F0FDF4' }]}>
                    <Text style={[styles.summaryBadgeVal, { color: '#16A34A' }]}>
                      {previewStats.newItems}
                    </Text>
                    <Text style={styles.summaryBadgeLbl}>全新菜品</Text>
                  </View>

                  <View
                    style={[
                      styles.summaryBadge,
                      {
                        backgroundColor:
                          previewStats.duplicates > 0 ? '#FFFBEB' : '#F5F5F4',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.summaryBadgeVal,
                        {
                          color:
                            previewStats.duplicates > 0 ? '#D97706' : Palette.cocoa[400],
                        },
                      ]}
                    >
                      {previewStats.duplicates}
                    </Text>
                    <Text style={styles.summaryBadgeLbl}>重复项</Text>
                  </View>
                </View>

                {/* 存在重复时：展示去重策略切换 */}
                {previewStats.duplicates > 0 && (
                  <View style={styles.strategyRowWrap}>
                    <Text style={styles.strategyTitle}>重复处理策略：</Text>
                    <View style={styles.strategySegment}>
                      <TouchableOpacity
                        style={[
                          styles.strategyItem,
                          strategy === 'skip' && styles.strategyItemActive,
                        ]}
                        onPress={() => handleStrategyChange('skip')}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.strategyItemText,
                            strategy === 'skip' && styles.strategyItemTextActive,
                          ]}
                        >
                          跳过重复
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.strategyItem,
                          strategy === 'overwrite' && styles.strategyItemActive,
                        ]}
                        onPress={() => handleStrategyChange('overwrite')}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.strategyItemText,
                            strategy === 'overwrite' && styles.strategyItemTextActive,
                          ]}
                        >
                          覆盖更新
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.strategyItem,
                          strategy === 'rename' && styles.strategyItemActive,
                        ]}
                        onPress={() => handleStrategyChange('rename')}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.strategyItemText,
                            strategy === 'rename' && styles.strategyItemTextActive,
                          ]}
                        >
                          保留两者
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* 封面缺失自动补全开关 */}
              <View style={styles.coverFillCard}>
                <View style={styles.coverFillIcon}>
                  <ImagePlus size={16} color={Palette.primary} strokeWidth={2.3} />
                </View>
                <View style={styles.coverFillInfo}>
                  <Text style={styles.coverFillTitle}>自动补全缺失封面</Text>
                  <Text style={styles.coverFillSubtitle}>
                    {missingCoverCount > 0
                      ? `本次有 ${missingCoverCount} 道菜谱缺少封面，导入时自动匹配美食图`
                      : '所选菜谱均已有封面'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.coverFillToggle}
                  onPress={() => setAutoFillCovers((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.switchTrack, autoFillCovers && styles.switchTrackOn]}>
                    <View style={[styles.switchKnob, autoFillCovers && styles.switchKnobOn]} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* 全选操作条 */}
              <View style={styles.selectAllRow}>
                <TouchableOpacity
                  style={styles.selectAllToggle}
                  onPress={handleToggleSelectAll}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      dedupItems.every((i) => i.selected) && styles.checkboxActive,
                    ]}
                  >
                    {dedupItems.every((i) => i.selected) && (
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                  <Text style={styles.selectAllText}>全选</Text>
                </TouchableOpacity>

                <Text style={styles.selectedCountText}>
                  已勾选 {previewStats.selectedCount} / {previewStats.total} 道
                </Text>
              </View>

              {/* 菜品预览列表 */}
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.previewListContent}
                showsVerticalScrollIndicator={false}
              >
                {dedupItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.recipePreviewCard,
                      item.selected && styles.recipePreviewCardSelected,
                    ]}
                    onPress={() => toggleItemSelect(item.id)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        item.selected && styles.checkboxActive,
                      ]}
                    >
                      {item.selected && (
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      )}
                    </View>

                    <View style={styles.recipePreviewInfo}>
                      <View style={styles.recipePreviewTop}>
                        <Text style={styles.recipePreviewName} numberOfLines={1}>
                          {item.recipe.name}
                        </Text>
                        <View style={styles.recipeCategoryBadge}>
                          <Text style={styles.recipeCategoryBadgeText}>
                            {item.recipe.category}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.recipePreviewDesc} numberOfLines={1}>
                        {item.recipe.description || '暂无描述'}
                      </Text>

                      <View style={styles.recipeMetaRow}>
                        <View style={styles.recipeMetaItem}>
                          <Clock size={11} color={Palette.cocoa[400]} />
                          <Text style={styles.recipeMetaText}>
                            {item.recipe.cookTime || 20} 分钟
                          </Text>
                        </View>

                        <Text style={styles.recipeMetaDot}>·</Text>

                        <Text style={styles.recipeMetaText}>
                          {item.recipe.ingredients.length} 种食材
                        </Text>

                        <Text style={styles.recipeMetaDot}>·</Text>

                        <Text style={styles.recipeMetaText}>
                          {item.recipe.steps.length} 个步骤
                        </Text>
                      </View>

                      {/* 重复状态提示 */}
                      {item.isDuplicate && (
                        <View style={styles.dupAlertTag}>
                          <AlertCircle size={11} color="#D97706" />
                          <Text style={styles.dupAlertText}>
                            {item.duplicateReason}
                            {strategy === 'skip'
                              ? '（策略：跳过）'
                              : strategy === 'overwrite'
                              ? '（策略：将覆盖已有）'
                              : '（策略：将重命名保留）'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 封面补全进度 */}
              {coverProgress && (
                <View style={styles.coverProgressRow}>
                  <ActivityIndicator size="small" color={Palette.primary} />
                  <Text style={styles.coverProgressText}>
                    正在补全封面 {coverProgress.done}/{coverProgress.total}…
                  </Text>
                </View>
              )}

              {/* 预览页底部操作栏 */}
              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, importing && styles.btnDisabled]}
                  onPress={() => setStep('input')}
                  disabled={importing}
                  activeOpacity={0.8}
                >
                  <ArrowLeft size={16} color={Palette.cocoa[700]} />
                  <Text style={styles.secondaryBtnText}>返回修改</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryConfirmBtn,
                    (previewStats.selectedCount === 0 || importing) && styles.btnDisabled,
                  ]}
                  onPress={handleConfirmImport}
                  disabled={previewStats.selectedCount === 0 || importing}
                  activeOpacity={0.85}
                >
                  {importing && coverProgress ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <CheckCircle2 size={16} color="#FFFFFF" />
                  )}
                  <Text style={styles.primaryConfirmBtnText}>
                    {importing && coverProgress
                      ? `补全封面 ${coverProgress.done}/${coverProgress.total}`
                      : importing
                      ? '正在导入…'
                      : `确认导入 (${previewStats.selectedCount})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '88%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Palette.apricot[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  headerSubtitle: {
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
  body: {
    flex: 1,
  },
  // TabBar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 10,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F5F3EF',
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: Palette.apricot[50],
    borderWidth: 1,
    borderColor: Palette.apricot[200],
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.cocoa[400],
  },
  tabTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  // Scroll
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  tabContent: {
    gap: 10,
  },
  // Status banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F8F6',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: Palette.cocoa[700],
    flex: 1,
  },
  settingsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  settingsLinkText: {
    fontSize: 12,
    color: Palette.primary,
    fontWeight: '700',
  },
  // Quick tools
  quickToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
  },
  toolBtnHighlight: {
    backgroundColor: Palette.apricot[50],
    borderColor: Palette.apricot[200],
  },
  toolBtnText: {
    fontSize: 12,
    color: Palette.cocoa[700],
    fontWeight: '600',
  },
  // Text area
  textAreaContainer: {
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    padding: 12,
    minHeight: 180,
  },
  textArea: {
    fontSize: 13,
    color: Palette.cocoa[900],
    lineHeight: 20,
    minHeight: 160,
  },
  jsonTextArea: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  charCount: {
    fontSize: 11,
    color: Palette.cocoa[400],
    textAlign: 'right',
  },
  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.dockBorder,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.dockBorder,
  },
  primarySubmitBtn: {
    backgroundColor: Palette.primary,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primarySubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  // Preview
  previewSummaryCard: {
    backgroundColor: '#FAF8F5',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
  },
  summaryBadgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryBadge: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.dockBorder,
  },
  summaryBadgeVal: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  summaryBadgeLbl: {
    fontSize: 10,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  strategyRowWrap: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.dockBorder,
  },
  strategyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[700],
    marginBottom: 6,
  },
  strategySegment: {
    flexDirection: 'row',
    backgroundColor: '#EBE5DC',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  strategyItem: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  strategyItemActive: {
    backgroundColor: '#FFFFFF',
  },
  strategyItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[400],
  },
  strategyItemTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  coverFillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Palette.apricot[50],
    borderWidth: 1,
    borderColor: Palette.apricot[100],
  },
  coverFillIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFillInfo: {
    flex: 1,
  },
  coverFillTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  coverFillSubtitle: {
    fontSize: 10.5,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  coverFillToggle: {
    paddingLeft: 4,
  },
  switchTrack: {
    width: 40,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#D8D0C7',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: Palette.primary,
  },
  switchKnob: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchKnobOn: {
    alignSelf: 'flex-end',
  },
  coverProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Palette.oat[50],
  },
  coverProgressText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  selectAllToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[700],
  },
  selectedCountText: {
    fontSize: 12,
    color: Palette.cocoa[400],
  },
  previewListContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 16,
    gap: 8,
  },
  recipePreviewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.dockBorder,
    gap: 10,
  },
  recipePreviewCardSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: Palette.primary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Palette.cocoa[400],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  recipePreviewInfo: {
    flex: 1,
  },
  recipePreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recipePreviewName: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.cocoa[900],
    flex: 1,
    marginRight: 6,
  },
  recipeCategoryBadge: {
    backgroundColor: Palette.amberSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recipeCategoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.amberWarm,
  },
  recipePreviewDesc: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginBottom: 6,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  recipeMetaText: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  recipeMetaDot: {
    marginHorizontal: 5,
    color: Palette.cocoa[200],
    fontSize: 12,
  },
  dupAlertTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    gap: 4,
  },
  dupAlertText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3EF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.cocoa[700],
  },
  primaryConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  primaryConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
