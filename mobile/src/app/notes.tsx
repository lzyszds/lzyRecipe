import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, FileText, Trash2, X } from 'lucide-react-native';
import { useNotesStore, activeNotes, Note } from '@/store/notesStore';
import { confirm, toast } from '@/store/feedbackStore';
import { Palette } from '@/constants/theme';

export default function NotesScreen() {
  const router = useRouter();
  const { notes, addNote, removeNote } = useNotesStore();
  const validNotes = activeNotes(notes);

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleCreate = () => {
    if (!title.trim() && !content.trim()) {
      toast({ type: 'warning', message: '请至少输入标题或内容' });
      return;
    }
    addNote({
      kind: 'idea',
      title: title.trim() || '随手笔记',
      content: content.trim(),
    });
    setTitle('');
    setContent('');
    setModalVisible(false);
    toast({ type: 'success', message: '灵感笔记已保存！' });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: '删除笔记',
      message: '确定要删除这条烹饪笔记吗？删除后将无法恢复。',
      confirmText: '确定删除',
      destructive: true,
      icon: 'trash',
    });
    if (ok) {
      removeNote(id);
      toast({ type: 'success', message: '笔记已删除' });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={18} color={Palette.cocoa[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>烹饪灵感与笔记</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={validNotes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteTitle}>{item.title}</Text>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={15} color={Palette.cocoa[400]} />
              </TouchableOpacity>
            </View>
            {Boolean(item.content) && (
              <Text style={styles.noteContent}>{item.content}</Text>
            )}
            <Text style={styles.noteDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText size={44} color={Palette.cocoa[200]} />
            <Text style={styles.emptyTitle}>还没有笔记记录</Text>
            <Text style={styles.emptySubtitle}>
              记录改良配比、火候心得或做菜新灵感
            </Text>
          </View>
        }
      />

      {/* 新增笔记弹窗 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>记录新灵感</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={Palette.cocoa[400]} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalTitleInput}
              placeholder="笔记标题（如：做糖醋排骨的独门秘诀）"
              placeholderTextColor={Palette.cocoa[400]}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={styles.modalContentInput}
              placeholder="写下心得体会、火候或改良用量..."
              placeholderTextColor={Palette.cocoa[400]}
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleCreate}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSubmitBtnText}>保存笔记</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.oat[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: Palette.oat[50],
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.apricot[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 6,
    gap: 12,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.oat[100],
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.cocoa[900],
    flex: 1,
  },
  noteContent: {
    fontSize: 12,
    lineHeight: 18,
    color: Palette.cocoa[700],
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 10,
    color: Palette.cocoa[400],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.cocoa[900],
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Palette.cocoa[400],
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.cocoa[900],
  },
  modalTitleInput: {
    backgroundColor: Palette.oat[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: Palette.cocoa[900],
    marginBottom: 12,
  },
  modalContentInput: {
    backgroundColor: Palette.oat[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    height: 100,
    fontSize: 13,
    color: Palette.cocoa[900],
    marginBottom: 16,
  },
  modalSubmitBtn: {
    backgroundColor: Palette.apricot[500],
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
