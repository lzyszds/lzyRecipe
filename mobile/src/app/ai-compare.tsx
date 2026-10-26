import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ensureAiIdle, runAiTask } from '@/store/aiTaskStore';
import { logActivity } from '@/store/activityLogStore';
import {
  ArrowLeft,
  Sparkles,
  Swords,
  Copy,
  Check,
  AlertCircle,
  Clock,
  ChefHat,
  Lightbulb,
  Layers,
  KeyRound,
  Server,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { Palette, Radius } from '@/constants/theme';
import { RECIPE_CATEGORIES } from '@/constants/recipeCategories';
import {
  AI_CHANNELS,
  getAiChannelMeta,
  getChannelBaseUrl,
  getChannelModel,
} from '@/constants/aiChannels';
import {
  useSettingsStore,
  isAiConfigured,
  AiSettings,
} from '@/store/settingsStore';
import { generateRecipeWithAi, AiRecipeGenResult } from '@/lib/aiRecipe';
import { toast } from '@/store/feedbackStore';

/** 单个对比分支：渠道 + 模型 + 生成结果 */
interface CompareBranch {
  channelId: string;
  model: string;
  state: {
    status: 'idle' | 'loading' | 'done' | 'error';
    result?: AiRecipeGenResult;
    error?: string;
    elapsedMs?: number;
  };
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '简单',
  medium: '家常',
  hard: '进阶',
};

/** 根据渠道与当前保存的各渠道配置，组装该分支真正生效的 AI 配置 */
function buildBranchConfig(
  branch: CompareBranch,
  ai: AiSettings
): { config: AiSettings | null; missing: string } {
  const meta = getAiChannelMeta(branch.channelId);
  const baseUrl = getChannelBaseUrl(branch.channelId, ai.channelBaseUrls);
  const apiKey =
    ai.channelKeys?.[branch.channelId]?.trim() ||
    (ai.providerId === branch.channelId ? ai.apiKey?.trim() : '') ||
    '';
  const model =
    branch.model.trim() || getChannelModel(branch.channelId, ai.channelModels);

  if (!baseUrl) {
    return { config: null, missing: '请先在「AI 智能工具」中填写该渠道的接口地址' };
  }
  if (!apiKey) {
    return { config: null, missing: '该渠道还没有填写 API Key，请先在「AI 智能工具」中配置' };
  }
  if (!model) {
    return { config: null, missing: '请填写该组要试用的模型名称' };
  }

  return {
    config: { providerId: meta.id, baseUrl, apiKey, model },
    missing: '',
  };
}

export default function AiCompareScreen() {
  const router = useRouter();
  const { ai } = useSettingsStore();
  const fordwardReady = isAiConfigured(ai);

  const [dishName, setDishName] = useState('');
  const [extraPrompt, setExtraPrompt] = useState('');

  const initBranch = (slot: 'A' | 'B'): CompareBranch => {
    // A 默认取当前生效渠道，B 默认 DeepSeek 官方，方便直接开试
    if (slot === 'A') {
      const channelId = ai.providerId || 'nvidia';
      return {
        channelId,
        model: getChannelModel(channelId, ai.channelModels),
        state: { status: 'idle' },
      };
    }
    const channelId = ai.providerId === 'deepseek' ? 'nvidia' : 'deepseek';
    return {
      channelId,
      model: getChannelModel(channelId, ai.channelModels),
      state: { status: 'idle' },
    };
  };

  const [branchA, setBranchA] = useState<CompareBranch>(() => initBranch('A'));
  const [branchB, setBranchB] = useState<CompareBranch>(() => initBranch('B'));

  // 渠道配置在打开时可能尚未合入 store，挂载后再兜底初始化一次
  useEffect(() => {
    setBranchA(initBranch('A'));
    setBranchB(initBranch('B'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const duplicated =
    branchA.channelId === branchB.channelId &&
    branchA.model.trim() === branchB.model.trim();

  const canStart = Boolean(dishName.trim()) && !duplicated;

  const runBranch = useCallback(
    async (
      branch: CompareBranch,
      name: string,
      prompt: string,
      setter: React.Dispatch<React.SetStateAction<CompareBranch>>
    ) => {
      const { config, missing } = buildBranchConfig(branch, ai);
      if (!config) {
        setter((prev) => ({
          ...prev,
          state: { status: 'error', error: missing },
        }));
        return;
      }

      const startedAt = Date.now();
      setter((prev) => ({
        ...prev,
        state: { status: 'loading', error: undefined },
      }));
      try {
        const result = await runAiTask('AI 试菜对比', () =>
          generateRecipeWithAi({
            field: 'all',
            recipeName: name,
            categoryOptions: RECIPE_CATEGORIES,
            extraPrompt: prompt || undefined,
            aiSettings: config,
          })
        );
        logActivity({
          type: 'ai',
          action: 'AI 试菜对比',
          detail: `${name}（${config.model}）`,
          meta: { 渠道: config.providerId || '—', 模型: config.model || '—', 耗时: `${((Date.now() - startedAt) / 1000).toFixed(1)}s` },
        });
        setter((prev) => ({
          ...prev,
          state: {
            status: 'done',
            result,
            elapsedMs: Date.now() - startedAt,
          },
        }));
      } catch (err: any) {
        setter((prev) => ({
          ...prev,
          state: {
            status: 'error',
            error: err?.message || '生成失败',
            elapsedMs: Date.now() - startedAt,
          },
        }));
      }
    },
    [ai]
  );

  const handleStart = () => {
    // 有其他 AI 任务在跑时，拦截并提示
    if (!ensureAiIdle()) return;
    if (!dishName.trim()) {
      toast({ type: 'warning', message: '请先输入要对比生成的菜名' });
      return;
    }
    if (duplicated) {
      toast({ type: 'warning', message: '两组渠道与模型完全相同，先改一组再开试' });
      return;
    }

    const name = dishName.trim();
    const prompt = extraPrompt.trim();
    setBranchA((prev) => ({ ...prev, state: { status: 'loading' } }));
    setBranchB((prev) => ({ ...prev, state: { status: 'loading' } }));
    runBranch(branchA, name, prompt, setBranchA);
    runBranch(branchB, name, prompt, setBranchB);
  };

  const handleCopyJson = async (label: string, result: AiRecipeGenResult) => {
    try {
      await Clipboard.setStringAsync(JSON.stringify(result, null, 2));
      toast({ type: 'success', message: `已复制 ${label} 组的食谱 JSON` });
    } catch {
      toast({ type: 'error', message: '复制失败，请重试' });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部固定导航 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color={Palette.cocoa[900]} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Swords size={16} color={Palette.primary} />
          <Text style={styles.headerTitle}>AI 试菜对比</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* 试吃菜名与补充要求 */}
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>试吃菜名</Text>
          <TextInput
            style={styles.input}
            value={dishName}
            onChangeText={setDishName}
            placeholder="输入要对比的菜名（如：生炒排骨）"
            placeholderTextColor={Palette.cocoa[400]}
            returnKeyType="done"
          />
          <Text style={styles.fieldLabel}>补充要求（可选）</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={extraPrompt}
            onChangeText={setExtraPrompt}
            placeholder="如：家庭厨房可执行、香味浓郁"
            placeholderTextColor={Palette.cocoa[400]}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>

        {duplicated && (
          <Text style={styles.warnNote}>
            两组渠道与模型完全相同，先改一组再开试
          </Text>
        )}

        {!fordwardReady && (
          <Text style={styles.warnNote}>
            尚未配置任何可用渠道，请先到「我的 → AI 智能工具」完成配置
          </Text>
        )}

        <TouchableOpacity
          style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!canStart || branchA.state.status === 'loading' || branchB.state.status === 'loading'}
          activeOpacity={0.85}
        >
          <Sparkles size={15} color="#FFFFFF" />
          <Text style={styles.startBtnText}>开始对比生成（约 1 分钟）</Text>
        </TouchableOpacity>

        <BranchResult
          slot="A"
          branch={branchA}
          ai={ai}
          onChannelChange={(channelId) =>
            setBranchA((prev) => ({
              ...prev,
              channelId,
              model: getChannelModel(channelId, ai.channelModels),
            }))
          }
          onModelChange={(model) => setBranchA((prev) => ({ ...prev, model }))}
          onCopy={() =>
            branchA.state.result && handleCopyJson('A', branchA.state.result)
          }
        />

        <BranchResult
          slot="B"
          branch={branchB}
          ai={ai}
          onChannelChange={(channelId) =>
            setBranchB((prev) => ({
              ...prev,
              channelId,
              model: getChannelModel(channelId, ai.channelModels),
            }))
          }
          onModelChange={(model) => setBranchB((prev) => ({ ...prev, model }))}
          onCopy={() =>
            branchB.state.result && handleCopyJson('B', branchB.state.result)
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

interface BranchResultProps {
  slot: 'A' | 'B';
  branch: CompareBranch;
  ai: AiSettings;
  onChannelChange: (channelId: string) => void;
  onModelChange: (model: string) => void;
  onCopy: () => void;
}

function BranchResult({
  slot,
  branch,
  ai,
  onChannelChange,
  onModelChange,
  onCopy,
}: BranchResultProps) {
  const meta = getAiChannelMeta(branch.channelId);
  const keyReady = Boolean(
    ai.channelKeys?.[branch.channelId]?.trim() ||
      (ai.providerId === branch.channelId && ai.apiKey?.trim())
  );

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <View style={styles.slotBadge}>
          <Text style={styles.slotBadgeText}>{slot}</Text>
        </View>
        <Text style={styles.resultTitle}>试吃模型组 {slot}</Text>
        {branch.state.elapsedMs != null && (
          <View style={styles.elapsedRow}>
            <Clock size={11} color={Palette.cocoa[400]} />
            <Text style={styles.elapsedText}>
              {(branch.state.elapsedMs / 1000).toFixed(1)}s
            </Text>
          </View>
        )}
      </View>

      {/* 渠道选择（图标式，仅选中显示名字） */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.channelChipsRow}
      >
        {AI_CHANNELS.map((channel) => {
          const isSelected = channel.id === branch.channelId;
          const ChannelIcon = channel.icon;
          return (
            <TouchableOpacity
              key={channel.id}
              style={[
                styles.channelChip,
                !isSelected && styles.channelChipIconOnly,
                isSelected && styles.channelChipActive,
              ]}
              onPress={() => onChannelChange(channel.id)}
              activeOpacity={0.75}
            >
              <ChannelIcon
                size={isSelected ? 13 : 16}
                color={isSelected ? Palette.primary : channel.iconColor}
              />
              {isSelected && (
                <Text style={styles.channelChipText} numberOfLines={1}>
                  {channel.name}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 当前渠道生效信息 + 模型输入 */}
      <View style={styles.channelInfoRow}>
        <View style={styles.channelInfoItem}>
          <Server size={11} color={Palette.cocoa[400]} />
          <Text style={styles.channelInfoText} numberOfLines={1}>
            {getChannelBaseUrl(branch.channelId, ai.channelBaseUrls) || '未配置地址'}
          </Text>
        </View>
        <View style={[styles.channelInfoItem, !keyReady && styles.channelInfoKeyWarn]}>
          <KeyRound size={11} color={keyReady ? '#10B981' : '#C2410C'} />
          <Text style={[styles.channelInfoText, !keyReady && { color: '#C2410C' }]}>
            {keyReady ? 'Key 已配置' : 'Key 未配置'}
          </Text>
        </View>
      </View>
      <TextInput
        style={[styles.input, styles.inputMono]}
        value={branch.model}
        onChangeText={onModelChange}
        placeholder={meta.model || '输入该组要试用的模型名称'}
        placeholderTextColor={Palette.cocoa[400]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
      />

      {/* 生成状态 / 结果 */}
      {branch.state.status === 'error' ? (
        <View style={styles.errorBox}>
          <AlertCircle size={14} color="#C2410C" />
          <Text style={styles.errorText}>{branch.state.error}</Text>
        </View>
      ) : branch.state.status === 'loading' ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Palette.primary} />
          <Text style={styles.loadingText}>正在定用料、编排步骤与闭环自检…</Text>
        </View>
      ) : branch.state.result ? (
        <ResultBody result={branch.state.result} onCopy={onCopy} />
      ) : (
        <Text style={styles.loadingText}>待开始</Text>
      )}
    </View>
  );
}

function ResultBody({
  result,
  onCopy,
}: {
  result: AiRecipeGenResult;
  onCopy: () => void;
}) {
  const unused = result.warnings?.unusedIngredients || [];
  const totalIngredients = result.ingredients?.length || 0;
  const closedCount = Math.max(0, totalIngredients - unused.length);

  return (
    <View>
      {/* 元信息 */}
      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Layers size={10} color={Palette.cocoa[700]} />
          <Text style={styles.metaChipText}>{result.category || '未分类'}</Text>
        </View>
        <View style={styles.metaChip}>
          <Clock size={10} color={Palette.cocoa[700]} />
          <Text style={styles.metaChipText}>{result.cookTime || 0}分钟</Text>
        </View>
        <View style={styles.metaChip}>
          <ChefHat size={10} color={Palette.cocoa[700]} />
          <Text style={styles.metaChipText}>
            {DIFFICULTY_LABEL[result.difficulty || ''] || '普通'}
          </Text>
        </View>
      </View>

      {result.description ? (
        <Text style={styles.resultDescription}>{result.description}</Text>
      ) : null}

      {/* 闭环体检 */}
      <View style={[styles.closureBox, unused.length > 0 && styles.closureBoxWarn]}>
        <View style={styles.closureRow}>
          {unused.length === 0 ? (
            <>
              <Check size={13} color="#16A34A" />
              <Text style={styles.closureOkText}>
                食材×步骤闭环通过（{closedCount}/{totalIngredients}）
              </Text>
            </>
          ) : (
            <>
              <AlertCircle size={13} color="#C2410C" />
              <Text style={styles.closureWarnText}>
                有 {unused.length} 个食材未在步骤中使用
              </Text>
            </>
          )}
        </View>
        {unused.length > 0 && (
          <Text style={styles.closureDetail}>{unused.join('、')}</Text>
        )}
      </View>

      {/* 用料清单 */}
      <Text style={styles.resultSectionLabel}>用料</Text>
      <View style={styles.ingredientWrap}>
        {(result.ingredients || []).map((ing, idx) => {
          const isUnused = unused.includes(ing.name);
          return (
            <View
              key={`${ing.name}-${idx}`}
              style={[styles.ingredientChip, isUnused && styles.ingredientChipWarn]}
            >
              <Text
                style={[styles.ingredientText, isUnused && styles.ingredientTextWarn]}
                numberOfLines={1}
              >
                {ing.name} {ing.amount || ''}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 步骤 */}
      <Text style={styles.resultSectionLabel}>步骤</Text>
      {(result.steps || []).map((step) => (
        <View key={step.order} style={styles.stepRow}>
          <View style={styles.stepIndex}>
            <Text style={styles.stepIndexText}>{step.order}</Text>
          </View>
          <Text style={styles.stepText}>{step.description}</Text>
        </View>
      ))}

      {/* 小贴士 */}
      {result.tips ? (
        <>
          <Text style={styles.resultSectionLabel}>小贴士</Text>
          <View style={styles.tipsBox}>
            <Lightbulb size={12} color={Palette.apricot[600]} />
            <Text style={styles.tipsText}>{result.tips}</Text>
          </View>
        </>
      ) : null}

      <TouchableOpacity style={styles.copyBtn} onPress={onCopy} activeOpacity={0.8}>
        <Copy size={13} color={Palette.cocoa[700]} />
        <Text style={styles.copyBtnText}>复制 JSON</Text>
      </TouchableOpacity>
    </View>
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
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: Palette.canvas,
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
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.cocoa[900],
    marginTop: 4,
  },
  input: {
    backgroundColor: Palette.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: Palette.cocoa[900],
  },
  inputMulti: {
    minHeight: 52,
    lineHeight: 18,
  },
  inputMono: {
    fontSize: 12.5,
    marginTop: 4,
  },
  warnNote: {
    fontSize: 11,
    color: '#C2410C',
    marginBottom: 8,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    marginBottom: 16,
  },
  startBtnDisabled: {
    opacity: 0.5,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotBadge: {
    backgroundColor: Palette.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  slotBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  resultTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  elapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  elapsedText: {
    fontSize: 10.5,
    color: Palette.cocoa[400],
  },
  channelChipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: Palette.oat[100],
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 5,
  },
  channelChipIconOnly: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    borderRadius: 15,
  },
  channelChipActive: {
    backgroundColor: 'rgba(217, 107, 56, 0.12)',
    borderColor: Palette.primary,
  },
  channelChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  channelInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  channelInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.canvas,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  channelInfoKeyWarn: {
    borderWidth: 1,
    borderColor: '#F3C89E',
  },
  channelInfoText: {
    fontSize: 10,
    color: Palette.cocoa[400],
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Palette.cocoa[400],
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(217, 83, 56, 0.08)',
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 11.5,
    color: '#C2410C',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Palette.canvas,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  resultDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: Palette.cocoa[700],
    marginBottom: 8,
  },
  closureBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1E7DD',
    backgroundColor: 'rgba(22, 163, 74, 0.06)',
    padding: 10,
    marginBottom: 10,
    gap: 3,
  },
  closureBoxWarn: {
    borderColor: '#F3C89E',
    backgroundColor: 'rgba(217, 107, 56, 0.06)',
  },
  closureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  closureOkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  closureWarnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  closureDetail: {
    fontSize: 11,
    color: '#C2410C',
  },
  resultSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.cocoa[900],
    marginTop: 6,
    marginBottom: 6,
  },
  ingredientWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  ingredientChip: {
    backgroundColor: Palette.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  ingredientChipWarn: {
    borderColor: '#F3C89E',
    backgroundColor: 'rgba(217, 107, 56, 0.08)',
  },
  ingredientText: {
    fontSize: 11,
    color: Palette.cocoa[700],
  },
  ingredientTextWarn: {
    color: '#C2410C',
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  stepIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Palette.tagWarm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: Palette.cocoa[900],
  },
  tipsBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: Palette.apricot[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.apricot[100],
    padding: 10,
  },
  tipsText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: Palette.cocoa[700],
  },
  copyBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
});
