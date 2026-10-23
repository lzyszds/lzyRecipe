import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { alert } from '@/store/feedbackStore';
import {
  Heart,
  FileText,
  UtensilsCrossed,
  ChefHat,
  ChevronRight,
  Sparkles,
  Info,
  ShieldCheck,
  Cloud,
} from 'lucide-react-native';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useNotesStore, activeNotes } from '@/store/notesStore';
import { useAllRecipes } from '@/lib/recipes';
import { useSettingsStore, isSyncConfigured, isAiConfigured } from '@/store/settingsStore';
import { useSyncStore } from '@/lib/cloudSync';
import { SyncSettingsModal } from '@/components/SyncSettingsModal';
import { AiSettingsModal } from '@/components/AiSettingsModal';
import { Palette } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { favorites } = useFavoritesStore();
  const { notes } = useNotesStore();
  const allRecipes = useAllRecipes();
  const validNotes = activeNotes(notes);

  const { sync, ai } = useSettingsStore();
  const { status: syncStatus, lastSyncedAt } = useSyncStore();
  const [syncModalVisible, setSyncModalVisible] = React.useState(false);
  const [aiModalVisible, setAiModalVisible] = React.useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 顶部固定导航栏（微信风格，固定在最顶部永不随内容滚动） */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>个人中心</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 用户名片 */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <ChefHat size={32} color="#FFFFFF" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>厨房掌勺人</Text>
            <Text style={styles.profileBio}>认真做饭，好好生活 🌿</Text>
          </View>
        </View>

        {/* 统计指标 */}
        <View style={styles.statsCard}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/favorites')}
            activeOpacity={0.75}
          >
            <Text style={styles.statNum}>{favorites.length}</Text>
            <Text style={styles.statLabel}>已收藏</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/notes')}
            activeOpacity={0.75}
          >
            <Text style={styles.statNum}>{validNotes.length}</Text>
            <Text style={styles.statLabel}>随手记</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/recipes')}
            activeOpacity={0.75}
          >
            <Text style={styles.statNum}>{allRecipes.length}</Text>
            <Text style={styles.statLabel}>菜谱库</Text>
          </TouchableOpacity>
        </View>

        {/* 多端云同步卡片 */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setSyncModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: '#EFF6FF' }]}>
              <Cloud size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>多端云同步</Text>
              <Text style={styles.menuSubtitle}>
                {!isSyncConfigured(sync)
                  ? '与电脑端、Web版保持菜谱与收藏一致'
                  : syncStatus === 'syncing'
                  ? '正在同步数据…'
                  : lastSyncedAt
                  ? `上次同步 ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : '已配置，待同步'}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: !isSyncConfigured(sync)
                      ? Palette.cocoa[400]
                      : syncStatus === 'syncing'
                      ? '#3B82F6'
                      : syncStatus === 'error'
                      ? '#EF4444'
                      : '#10B981',
                  },
                ]}
              />
              <Text style={styles.statusPillText}>
                {!isSyncConfigured(sync) ? '未配置' : syncStatus === 'syncing' ? '同步中' : '已就绪'}
              </Text>
            </View>
            <ChevronRight size={16} color={Palette.cocoa[400]} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* AI 智能助手设置项 */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setAiModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: '#FFF7ED' }]}>
              <Sparkles size={18} color={Palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>AI 智能厨师</Text>
              <Text style={styles.menuSubtitle}>
                {!isAiConfigured(ai)
                  ? '配置 OpenAI 兼容接口（DeepSeek/通义/OpenAI）'
                  : `${ai.model || '已接入'} · 随时待命`}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: !isAiConfigured(ai)
                      ? Palette.cocoa[400]
                      : '#10B981',
                  },
                ]}
              />
              <Text style={styles.statusPillText}>
                {!isAiConfigured(ai) ? '未配置' : '已就绪'}
              </Text>
            </View>
            <ChevronRight size={16} color={Palette.cocoa[400]} />
          </TouchableOpacity>
        </View>

        {/* 核心功能列表 */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/favorites')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: Palette.apricot[50] }]}>
              <Heart size={18} color={Palette.apricot[500]} fill={Palette.apricot[100]} />
            </View>
            <Text style={styles.menuTitle}>我的收藏</Text>
            <Text style={styles.menuValue}>{favorites.length} 道</Text>
            <ChevronRight size={16} color={Palette.cocoa[400]} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/notes')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: '#EBF4F6' }]}>
              <FileText size={18} color="#4A8B99" />
            </View>
            <Text style={styles.menuTitle}>灵感与烹饪笔记</Text>
            <Text style={styles.menuValue}>{validNotes.length} 篇</Text>
            <ChevronRight size={16} color={Palette.cocoa[400]} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/weekly-plan')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: '#F4EEDF' }]}>
              <Sparkles size={18} color="#C48827" />
            </View>
            <Text style={styles.menuTitle}>每周餐盘智能管家</Text>
            <Text style={styles.menuValue}>自动排餐</Text>
            <ChevronRight size={16} color={Palette.cocoa[400]} />
          </TouchableOpacity>
        </View>

        {/* 关于与系统信息 */}
        <View style={styles.menuSection}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIconBg, { backgroundColor: Palette.oat[100] }]}>
              <ShieldCheck size={18} color={Palette.cocoa[700]} />
            </View>
            <Text style={styles.menuTitle}>运行架构</Text>
            <Text style={styles.menuValue}>React Native + Expo 原生</Text>
          </View>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              alert({
                title: '志得食谱',
                message: '版本：v2.0.0 (Expo 原生版)\n打造治愈、纯粹、丝滑的掌上菜谱。',
                icon: 'info',
                confirmText: '太棒了',
              });
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBg, { backgroundColor: Palette.oat[100] }]}>
              <Info size={18} color={Palette.cocoa[700]} />
            </View>
            <Text style={styles.menuTitle}>关于食谱</Text>
            <Text style={styles.menuValue}>v2.0.0</Text>
            <ChevronRight size={16} color={Palette.cocoa[400]} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 云同步配置弹窗 */}
      <SyncSettingsModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
      />

      {/* AI 智能厨师配置弹窗 */}
      <AiSettingsModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  header: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: Palette.oat[50],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.dockBorder,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.cocoa[900],
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.oat[100],
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.apricot[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  profileBio: {
    fontSize: 12,
    color: Palette.cocoa[400],
    marginTop: 4,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Palette.oat[100],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  statLabel: {
    fontSize: 11,
    color: Palette.cocoa[400],
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Palette.oat[200],
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.oat[100],
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  menuIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.cocoa[900],
  },
  menuSubtitle: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginTop: 2,
  },
  menuValue: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginRight: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.oat[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.cocoa[700],
  },
  menuDivider: {
    height: 1,
    backgroundColor: Palette.oat[100],
    marginLeft: 58,
  },
});
