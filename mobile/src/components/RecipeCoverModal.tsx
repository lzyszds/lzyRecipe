import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Camera,
  Image as ImageIcon,
  Link,
  Search,
  Sparkles,
  RefreshCw,
  Check,
  X,
  UploadCloud,
  ZoomIn,
} from 'lucide-react-native';
import { BottomSheetModal } from './BottomSheetModal';
import { ImagePreviewModal } from './ImagePreviewModal';
import { Palette, Radius } from '../constants/theme';
import { pickAndUploadImage, takePhotoAndUpload } from '../lib/upload';
import { searchBaiduImages, generateAiFoodImage, persistImageToServer } from '../lib/coverImage';
import { toast } from '../store/feedbackStore';

interface RecipeCoverModalProps {
  visible: boolean;
  onClose: () => void;
  recipeName: string;
  category?: string;
  currentCover?: string;
  onSelectCover: (coverUrl: string) => Promise<void> | void;
}

type TabType = 'upload' | 'baidu' | 'ai';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 48 - 16) / 3;

export const RecipeCoverModal: React.FC<RecipeCoverModalProps> = ({
  visible,
  onClose,
  recipeName,
  category,
  currentCover,
  onSelectCover,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('baidu');

  // 本地上传与链接
  const [customUrl, setCustomUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // 百度搜图
  const [baiduQuery, setBaiduQuery] = useState(recipeName);
  const [baiduImages, setBaiduImages] = useState<string[]>([]);
  const [selectedBaiduUrl, setSelectedBaiduUrl] = useState<string | null>(null);
  const [searchingBaidu, setSearchingBaidu] = useState(false);
  const [baiduPage, setBaiduPage] = useState(0);

  // AI 生图
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');

  // 提交中状态
  const [saving, setSaving] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setBaiduQuery(recipeName);
      setSelectedBaiduUrl(null);
      setCustomUrl('');
      // 默认加载一次百度图片
      handleSearchBaidu(recipeName, 0);
    }
  }, [visible, recipeName]);

  const handleSearchBaidu = async (query: string, page = 0) => {
    if (!query.trim()) return;
    setSearchingBaidu(true);
    try {
      const results = await searchBaiduImages(query, page, 15);
      if (page === 0) {
        setBaiduImages(results);
      } else {
        setBaiduImages((prev) => [...prev, ...results]);
      }
      setBaiduPage(page);
    } catch (e: any) {
      toast({ type: 'error', message: '搜图失败，请稍后重试' });
    } finally {
      setSearchingBaidu(false);
    }
  };

  const handlePickFromAlbum = async () => {
    setUploading(true);
    try {
      const res = await pickAndUploadImage();
      if (res.ok && res.url) {
        await onSelectCover(res.url);
        toast({ type: 'success', message: '封面已更新' });
        onClose();
      } else if (res.error && res.error !== '已取消选择') {
        toast({ type: 'error', message: res.error });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    setUploading(true);
    try {
      const res = await takePhotoAndUpload();
      if (res.ok && res.url) {
        await onSelectCover(res.url);
        toast({ type: 'success', message: '拍照上传成功' });
        onClose();
      } else if (res.error && res.error !== '已取消拍摄') {
        toast({ type: 'error', message: res.error });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleApplyCustomUrl = async () => {
    const trimmed = customUrl.trim();
    if (!trimmed) {
      toast({ type: 'info', message: '请输入图片网络地址' });
      return;
    }
    setSaving(true);
    try {
      const serverUrl = await persistImageToServer(trimmed);
      await onSelectCover(serverUrl);
      toast({ type: 'success', message: '封面已更新' });
      onClose();
    } catch (e) {
      toast({ type: 'error', message: '应用图片地址失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyBaiduImage = async () => {
    if (!selectedBaiduUrl) return;
    setSaving(true);
    try {
      const serverUrl = await persistImageToServer(selectedBaiduUrl);
      await onSelectCover(serverUrl);
      toast({ type: 'success', message: '百度搜图封面已替换' });
      onClose();
    } catch (e) {
      toast({ type: 'error', message: '保存封面失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAi = async () => {
    setAiGenerating(true);
    try {
      const result = await generateAiFoodImage(recipeName, category);
      setAiImageUrl(result.imageUrl);
      setAiPrompt(result.prompt);
    } catch (e) {
      toast({ type: 'error', message: 'AI生图失败，请重试' });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAiImage = async () => {
    if (!aiImageUrl) return;
    setSaving(true);
    try {
      const serverUrl = await persistImageToServer(aiImageUrl);
      await onSelectCover(serverUrl);
      toast({ type: 'success', message: 'AI专属封面已应用' });
      onClose();
    } catch (e) {
      toast({ type: 'error', message: '应用AI封面失败' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} sheetStyle={styles.sheetContainer}>
      {/* 头部标题与关闭 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>自定义菜品封面</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {recipeName}
          </Text>
        </View>
        <Pressable hitSlop={12} onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={Palette.cocoa[700]} />
        </Pressable>
      </View>

      {/* 选项卡切换 */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'baidu' && styles.tabBtnActive]}
          onPress={() => setActiveTab('baidu')}
        >
          <Search size={16} color={activeTab === 'baidu' ? Palette.cocoa[900] : Palette.cocoa[400]} />
          <Text style={[styles.tabText, activeTab === 'baidu' && styles.tabTextActive]}>
            百度搜图
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, activeTab === 'ai' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ai')}
        >
          <Sparkles size={16} color={activeTab === 'ai' ? Palette.cocoa[900] : Palette.cocoa[400]} />
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>
            AI 绘图
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, activeTab === 'upload' && styles.tabBtnActive]}
          onPress={() => setActiveTab('upload')}
        >
          <UploadCloud size={16} color={activeTab === 'upload' ? Palette.cocoa[900] : Palette.cocoa[400]} />
          <Text style={[styles.tabText, activeTab === 'upload' && styles.tabTextActive]}>
            本地/链接
          </Text>
        </Pressable>
      </View>

      {/* 内容区域 */}
      <View style={styles.body}>
        {/* 1. 百度搜图 */}
        {activeTab === 'baidu' && (
          <View style={styles.tabContent}>
            <View style={styles.searchBar}>
              <Search size={16} color={Palette.cocoa[400]} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={baiduQuery}
                onChangeText={setBaiduQuery}
                placeholder="搜索菜品美食大片..."
                placeholderTextColor={Palette.cocoa[400]}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchBaidu(baiduQuery, 0)}
              />
              <Pressable
                style={styles.searchSubmitBtn}
                onPress={() => handleSearchBaidu(baiduQuery, 0)}
                disabled={searchingBaidu}
              >
                {searchingBaidu ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.searchSubmitText}>搜索</Text>
                )}
              </Pressable>
            </View>

            <ScrollView
              style={styles.imageGridScroll}
              contentContainerStyle={styles.imageGridContent}
              showsVerticalScrollIndicator={false}
            >
              {baiduImages.map((imgUrl, idx) => {
                const isSelected = selectedBaiduUrl === imgUrl;
                return (
                  <Pressable
                    key={`${imgUrl}-${idx}`}
                    style={[styles.gridItem, isSelected && styles.gridItemSelected]}
                    onPress={() => setSelectedBaiduUrl(imgUrl)}
                    onLongPress={() => setZoomUrl(imgUrl)}
                  >
                    <Image
                      source={{ uri: imgUrl }}
                      style={styles.gridImage}
                      contentFit="cover"
                      transition={150}
                    />
                    {isSelected && (
                      <>
                        <View style={styles.gridItemBadge}>
                          <Check size={14} color="#FFFFFF" strokeWidth={3} />
                        </View>
                        <Pressable
                          style={styles.gridItemZoom}
                          onPress={() => setZoomUrl(imgUrl)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <ZoomIn size={12} color="#FFFFFF" />
                        </Pressable>
                      </>
                    )}
                  </Pressable>
                );
              })}

              {baiduImages.length > 0 && (
                <Pressable
                  style={styles.loadMoreBtn}
                  onPress={() => handleSearchBaidu(baiduQuery, baiduPage + 1)}
                  disabled={searchingBaidu}
                >
                  <RefreshCw size={14} color={Palette.cocoa[700]} />
                  <Text style={styles.loadMoreText}>换一批图片</Text>
                </Pressable>
              )}
            </ScrollView>

            <View style={styles.footerAction}>
              <Pressable
                style={[
                  styles.primaryActionBtn,
                  (!selectedBaiduUrl || saving) && styles.primaryActionBtnDisabled,
                ]}
                onPress={handleApplyBaiduImage}
                disabled={!selectedBaiduUrl || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.primaryActionText}>确认使用选中图片</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* 2. AI 智能生图 */}
        {activeTab === 'ai' && (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.aiPreviewContainer}>
              {aiImageUrl ? (
                <Pressable
                  style={styles.aiImageWrapper}
                  onPress={() => setZoomUrl(aiImageUrl)}
                  disabled={aiGenerating}
                >
                  <Image
                    source={{ uri: aiImageUrl }}
                    style={styles.aiPreviewImage}
                    contentFit="cover"
                  />
                  {!aiGenerating && (
                    <View style={styles.aiZoomHint}>
                      <ZoomIn size={12} color="#FFFFFF" />
                      <Text style={styles.aiZoomHintText}>轻触放大预览</Text>
                    </View>
                  )}
                  {aiGenerating && (
                    <View style={styles.aiGeneratingOverlay}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text style={styles.aiGeneratingText}>正在重绘美食大片...</Text>
                    </View>
                  )}
                </Pressable>
              ) : (
                <View style={styles.aiEmptyBox}>
                  <Sparkles size={36} color={Palette.sage[500]} />
                  <Text style={styles.aiEmptyTitle}>AI 定制高画质美食封面</Text>
                  <Text style={styles.aiEmptyDesc}>
                    大模型将根据菜品专属特点，构图生动光影与盘饰，生成餐厅级封面
                  </Text>
                </View>
              )}
            </View>

            {aiPrompt ? (
              <View style={styles.aiPromptCard}>
                <Text style={styles.aiPromptLabel}>摄影灵感提示词</Text>
                <Text style={styles.aiPromptText}>{aiPrompt}</Text>
              </View>
            ) : null}

            <View style={styles.aiActionsRow}>
              <Pressable
                style={[styles.aiGenBtn, aiGenerating && styles.aiGenBtnDisabled]}
                onPress={handleGenerateAi}
                disabled={aiGenerating}
              >
                {aiGenerating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Sparkles size={18} color="#FFFFFF" />
                    <Text style={styles.aiGenBtnText}>
                      {aiImageUrl ? '重新生成一张' : '立即开始 AI 生成'}
                    </Text>
                  </>
                )}
              </Pressable>

              {aiImageUrl && (
                <Pressable
                  style={[styles.aiApplyBtn, saving && styles.aiApplyBtnDisabled]}
                  onPress={handleApplyAiImage}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.aiApplyBtnText}>设为菜品封面</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </ScrollView>
        )}

        {/* 3. 本地上传与外链 */}
        {activeTab === 'upload' && (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>手机原生选择</Text>
            <View style={styles.uploadButtonsRow}>
              <Pressable
                style={styles.uploadOptionBtn}
                onPress={handlePickFromAlbum}
                disabled={uploading}
              >
                <ImageIcon size={24} color={Palette.cocoa[900]} />
                <Text style={styles.uploadOptionTitle}>手机相册选取</Text>
                <Text style={styles.uploadOptionHint}>支持剪裁与压缩</Text>
              </Pressable>

              <Pressable
                style={styles.uploadOptionBtn}
                onPress={handleTakePhoto}
                disabled={uploading}
              >
                <Camera size={24} color={Palette.cocoa[900]} />
                <Text style={styles.uploadOptionTitle}>现场拍照</Text>
                <Text style={styles.uploadOptionHint}>拍摄你的烹饪成果</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>或输入网络图片直链</Text>
            <View style={styles.urlInputRow}>
              <Link size={16} color={Palette.cocoa[400]} style={styles.searchIcon} />
              <TextInput
                style={styles.urlInput}
                value={customUrl}
                onChangeText={setCustomUrl}
                placeholder="https://example.com/cover.jpg"
                placeholderTextColor={Palette.cocoa[400]}
                autoCapitalize="none"
              />
            </View>

            <Pressable
              style={[
                styles.primaryActionBtn,
                (!customUrl.trim() || saving) && styles.primaryActionBtnDisabled,
              ]}
              onPress={handleApplyCustomUrl}
              disabled={!customUrl.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.primaryActionText}>保存外链封面</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        )}
      </View>

      {/* 放大预览弹窗 */}
      <ImagePreviewModal
        visible={Boolean(zoomUrl)}
        onClose={() => setZoomUrl(null)}
        coverImage={zoomUrl || undefined}
        title={recipeName}
        category={category}
      />
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    height: '82%',
    paddingBottom: 24,
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
    maxWidth: 240,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: Palette.oat[100],
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Palette.oat[50],
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Palette.oat[200],
  },
  tabBtnActive: {
    backgroundColor: Palette.sand[100],
    borderColor: Palette.cocoa[900],
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.cocoa[400],
  },
  tabTextActive: {
    color: Palette.cocoa[900],
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabContent: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.oat[100],
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.cocoa[900],
    paddingVertical: 8,
  },
  searchSubmitBtn: {
    backgroundColor: Palette.cocoa[900],
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.md,
  },
  searchSubmitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  imageGridScroll: {
    flex: 1,
  },
  imageGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Palette.oat[100],
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gridItemSelected: {
    borderColor: Palette.cocoa[900],
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridItemBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Palette.cocoa[900],
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridItemZoom: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiZoomHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiZoomHintText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadMoreBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 6,
    borderRadius: Radius.md,
    backgroundColor: Palette.oat[100],
  },
  loadMoreText: {
    fontSize: 13,
    color: Palette.cocoa[700],
    fontWeight: '600',
  },
  footerAction: {
    paddingVertical: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.cocoa[900],
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  primaryActionBtnDisabled: {
    opacity: 0.45,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiPreviewContainer: {
    width: '100%',
    height: 220,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Palette.oat[100],
    marginBottom: 12,
  },
  aiEmptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  aiEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.cocoa[900],
    marginTop: 10,
  },
  aiEmptyDesc: {
    fontSize: 12,
    color: Palette.cocoa[400],
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  aiImageWrapper: {
    flex: 1,
    position: 'relative',
  },
  aiPreviewImage: {
    width: '100%',
    height: '100%',
  },
  aiGeneratingOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  aiGeneratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aiPromptCard: {
    backgroundColor: Palette.oat[50],
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.oat[200],
  },
  aiPromptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.cocoa[400],
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  aiPromptText: {
    fontSize: 12,
    color: Palette.cocoa[700],
    lineHeight: 18,
  },
  aiActionsRow: {
    gap: 10,
    paddingBottom: 20,
  },
  aiGenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.sage[600],
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  aiGenBtnDisabled: {
    opacity: 0.5,
  },
  aiGenBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.cocoa[900],
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  aiApplyBtnDisabled: {
    opacity: 0.5,
  },
  aiApplyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.cocoa[700],
    marginBottom: 10,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  uploadOptionBtn: {
    flex: 1,
    backgroundColor: Palette.oat[50],
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.oat[200],
  },
  uploadOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.cocoa[900],
    marginTop: 8,
  },
  uploadOptionHint: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.oat[200],
    marginVertical: 16,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.oat[100],
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  urlInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.cocoa[900],
    paddingVertical: 6,
  },
});
