import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ImagePlus, Sparkles, CheckCircle2, RotateCw } from 'lucide-react-native';
import { BottomSheetModal } from './BottomSheetModal';
import { Palette, Radius } from '../constants/theme';
import { fillMissingCovers, countMissingCovers } from '@/lib/coverImage';
import { useImportedRecipesStore } from '@/store/importedRecipesStore';
import { toast } from '@/store/feedbackStore';

interface CoverRepairModalProps {
  visible: boolean;
  onClose: () => void;
}

type Phase = 'idle' | 'running' | 'done';

export const CoverRepairModal: React.FC<CoverRepairModalProps> = ({ visible, onClose }) => {
  const importedRecipes = useImportedRecipesStore((s) => s.importedRecipes);
  const updateImportedRecipeCovers = useImportedRecipesStore(
    (s) => s.updateImportedRecipeCovers
  );

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0, name: '' });
  const [result, setResult] = useState({ success: 0, failed: 0 });

  const missing = useMemo(() => importedRecipes.filter((r) => !String(r.coverImage || '').trim()), [
    importedRecipes,
  ]);
  const missingCount = countMissingCovers(importedRecipes);

  const handleClose = () => {
    // 补全进行中允许收起弹窗后台继续，避免误触导致任务状态丢失
    if (phase !== 'running') {
      setPhase('idle');
      setProgress({ done: 0, total: 0, name: '' });
      setResult({ success: 0, failed: 0 });
    }
    onClose();
  };

  const handleStart = async () => {
    if (missing.length === 0) return;
    const pending = missing;

    setPhase('running');
    setProgress({ done: 0, total: pending.length, name: pending[0]?.name || '' });

    try {
      const filled = await fillMissingCovers(pending, (p) => {
        setProgress({ done: p.done, total: p.total, name: p.name || '' });
      });

      const covers: Record<string, string> = {};
      filled.forEach((recipe) => {
        if (String(recipe.coverImage || '').trim()) {
          covers[recipe.id] = recipe.coverImage;
        }
      });

      if (Object.keys(covers).length > 0) {
        updateImportedRecipeCovers(covers);
      }

      const success = Object.keys(covers).length;
      const failed = pending.length - success;
      setResult({ success, failed });
      setPhase('done');

      toast({
        type: success > 0 ? 'success' : 'warning',
        message:
          success > 0
            ? `已补全 ${success} 道菜谱封面${failed > 0 ? `，${failed} 道未找到合适图片` : ''}`
            : '暂未找到合适的封面图片，请稍后重试',
      });
    } catch (err: any) {
      setPhase('idle');
      toast({ type: 'error', message: err?.message || '封面补全失败，请重试' });
    }
  };

  const percent =
    progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

  return (
    <BottomSheetModal visible={visible} onClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <ImagePlus size={18} color={Palette.primary} strokeWidth={2.4} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>封面缺失补全</Text>
            <Text style={styles.headerSubtitle}>
              自动为缺少封面的菜谱匹配美食实拍图
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryNum}>{missingCount}</Text>
            <Text style={styles.summaryLabel}>道菜谱暂无封面</Text>
          </View>
          <View style={styles.summaryRight}>
            <Sparkles size={13} color={Palette.apricot[500]} />
            <Text style={styles.summaryHint}>百度实拍优先 · AI 生图兜底</Text>
          </View>
        </View>

        {missing.length > 0 && phase === 'idle' && (
          <View style={styles.previewNames}>
            {missing.slice(0, 6).map((recipe) => (
              <View key={recipe.id} style={styles.nameChip}>
                <Text style={styles.nameChipText} numberOfLines={1}>
                  {recipe.name}
                </Text>
              </View>
            ))}
            {missing.length > 6 && (
              <View style={[styles.nameChip, styles.nameChipMore]}>
                <Text style={[styles.nameChipText, styles.nameChipMoreText]}>
                  +{missing.length - 6}
                </Text>
              </View>
            )}
          </View>
        )}

        {phase === 'running' && (
          <View style={styles.progressBox}>
            <View style={styles.progressInfo}>
              <ActivityIndicator size="small" color={Palette.primary} />
              <Text style={styles.progressText} numberOfLines={1}>
                正在为「{progress.name}」匹配封面
              </Text>
              <Text style={styles.progressCount}>
                {progress.done}/{progress.total}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
          </View>
        )}

        {phase === 'done' && (
          <View style={styles.doneBox}>
            <CheckCircle2 size={22} color={Palette.sage} />
            <View style={styles.doneTextWrap}>
              <Text style={styles.doneTitle}>补全完成</Text>
              <Text style={styles.doneSubtitle}>
                成功补全 {result.success} 道
                {result.failed > 0 ? `，${result.failed} 道未找到合适图片` : ''}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          {phase === 'idle' && (
            <TouchableOpacity
              style={[styles.primaryBtn, missingCount === 0 && styles.btnDisabled]}
              onPress={handleStart}
              disabled={missingCount === 0}
              activeOpacity={0.85}
            >
              <Sparkles size={15} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>
                {missingCount === 0 ? '所有菜谱均已有封面' : `开始补全 ${missingCount} 道封面`}
              </Text>
            </TouchableOpacity>
          )}

          {phase === 'running' && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.secondaryBtnText}>后台继续，稍后查看</Text>
            </TouchableOpacity>
          )}

          {phase === 'done' && (
            <>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setPhase('idle');
                  setResult({ success: 0, failed: 0 });
                }}
                activeOpacity={0.8}
              >
                <RotateCw size={14} color={Palette.cocoa[700]} />
                <Text style={styles.secondaryBtnText}>再次检查</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleClose}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>完成</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    paddingTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Palette.apricot[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.ink,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: Palette.inkMuted,
    marginTop: 3,
  },
  summaryCard: {
    backgroundColor: Palette.oat[50],
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  summaryNum: {
    fontSize: 26,
    fontWeight: '800',
    color: Palette.primary,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryHint: {
    fontSize: 10.5,
    color: Palette.cocoa[400],
  },
  previewNames: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  nameChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    maxWidth: '48%',
  },
  nameChipMore: {
    backgroundColor: Palette.tagWarm,
    borderColor: Palette.tagWarm,
  },
  nameChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  nameChipMoreText: {
    color: Palette.cocoa[400],
  },
  progressBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.oat[200],
    padding: 14,
    gap: 12,
    marginTop: 14,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  progressCount: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Palette.primary,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.oat[100],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Palette.primary,
  },
  doneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.sageSoft,
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: 14,
  },
  doneTextWrap: {
    flex: 1,
  },
  doneTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Palette.sage,
  },
  doneSubtitle: {
    fontSize: 11.5,
    color: Palette.cocoa[700],
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Palette.oat[100],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.cocoa[700],
  },
  btnDisabled: {
    backgroundColor: Palette.oat[200],
  },
});
