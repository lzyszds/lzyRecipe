import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Heart,
  FileText,
  UtensilsCrossed,
  ChefHat,
  ChevronRight,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react-native';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useNotesStore, activeNotes } from '@/store/notesStore';
import { useAllRecipes } from '@/lib/recipes';
import { Palette } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { favorites } = useFavoritesStore();
  const { notes } = useNotesStore();
  const allRecipes = useAllRecipes();
  const validNotes = activeNotes(notes);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
              Alert.alert('志得食谱', '版本：v2.0.0 (Expo 原生版)\n打造治愈、纯粹、丝滑的掌上菜谱。');
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
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
    shadowColor: Palette.cocoa[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.apricot[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Palette.apricot[500],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
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
    flex: 1,
  },
  menuValue: {
    fontSize: 11,
    color: Palette.cocoa[400],
    marginRight: 4,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Palette.oat[100],
    marginLeft: 58,
  },
});
