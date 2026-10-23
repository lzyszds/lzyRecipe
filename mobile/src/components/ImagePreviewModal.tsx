import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { getLocalCoverSource } from '../lib/coverAssets';
import { resolveCoverUrl } from './RecipeImage';

interface ImagePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  coverImage?: string;
  title?: string;
  category?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  onClose,
  coverImage,
  title,
  category,
}) => {
  if (!visible) return null;

  const localSource = coverImage ? getLocalCoverSource(coverImage) : null;
  const remoteUrl = resolveCoverUrl(coverImage);
  const source = localSource || (remoteUrl ? { uri: remoteUrl } : null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          {/* 顶栏操作区 */}
          <View style={styles.topBar}>
            <View style={styles.titleBox}>
              {Boolean(title) && (
                <Text style={styles.titleText} numberOfLines={1}>
                  {title}
                </Text>
              )}
              {Boolean(category) && (
                <Text style={styles.categoryText}>{category}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.75}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* 大图预览主显示区（轻触任意位置即可关闭） */}
          <Pressable style={styles.imageContainer} onPress={onClose}>
            {source ? (
              <Image
                source={source}
                style={styles.previewImage}
                contentFit="contain"
                transition={200}
              />
            ) : (
              <View style={styles.noImageBox}>
                <Text style={styles.noImageText}>暂无可用高清大图</Text>
              </View>
            )}
          </Pressable>

          {/* 底部引导栏 */}
          <View style={styles.bottomBar}>
            <Text style={styles.bottomHintText}>轻触图片或背景任意处关闭</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 10, 0.95)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  titleBox: {
    flex: 1,
    paddingRight: 16,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  categoryText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  noImageBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  noImageText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  bottomBar: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  bottomHintText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
