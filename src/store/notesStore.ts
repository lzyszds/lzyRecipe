import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NoteKind = 'idea' | 'bug';

export interface NoteAttachment {
  id: string;
  type: 'image' | 'audio';
  /** data URL：图片为压缩后的 JPEG，音频为录音原始编码 */
  data: string;
  /** 音频时长（秒） */
  duration?: number;
  createdAt: string;
}

export interface Note {
  id: string;
  kind: NoteKind;
  title: string;
  content: string;
  attachments: NoteAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

export interface NotesDraft {
  kind: NoteKind;
  title: string;
  content: string;
}

const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024; // 单条附件上限，避免同步请求过大

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.round((base64.length * 3) / 4);
}

interface NotesState {
  notes: Note[];
  addNote: (input: NotesDraft & { attachments?: NoteAttachment[] }) => string;
  updateNote: (id: string, patch: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
  removeNote: (id: string) => void;
  /** 合并云端数据（按 updatedAt 取较新的一条） */
  mergeRemote: (remote: Note[]) => void;
  restore: (notes: Note[]) => void;
}

const nowIso = () => new Date().toISOString();

export function createNote(input: NotesDraft & { attachments?: NoteAttachment[] }): Note {
  const time = nowIso();
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: input.kind,
    title: input.title.trim(),
    content: input.content.trim(),
    attachments: input.attachments ?? [],
    tags: [],
    createdAt: time,
    updatedAt: time,
  };
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      addNote: (input) => {
        const note = createNote(input);
        set((state) => ({ notes: [note, ...state.notes] }));
        return note.id;
      },
      updateNote: (id, patch) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, ...patch, updatedAt: nowIso() } : note
          ),
        })),
      removeNote: (id) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, deleted: true, updatedAt: nowIso() } : note
          ),
        })),
      mergeRemote: (remote) => {
        const map = new Map(get().notes.map((note) => [note.id, note]));
        for (const incoming of remote) {
          const local = map.get(incoming.id);
          if (!local || incoming.updatedAt >= local.updatedAt) map.set(incoming.id, incoming);
        }
        set({ notes: [...map.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
      },
      restore: (notes) =>
        set({ notes: [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) }),
    }),
    { name: 'notes-storage' }
  )
);

/** 附件是否超出单条限制（图片压缩后通常远小于上限，主要防长录音） */
export function isAttachmentTooLarge(dataUrl: string): boolean {
  return estimateDataUrlBytes(dataUrl) > MAX_ATTACHMENT_BYTES;
}

export function activeNotes(notes: Note[]): Note[] {
  return notes.filter((note) => !note.deleted);
}
