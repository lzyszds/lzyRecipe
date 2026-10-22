import { useMemo, useState } from 'react';
import {
  ArrowsClockwise,
  Bug,
  CloudCheck,
  CloudSlash,
  Image as ImageIcon,
  Lightbulb,
  MagnifyingGlass,
  Microphone,
  NotePencil,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { PageHeader } from '../components/ui/PageHeader';
import { PageMain, EmptyState } from '../components/ui/PageLayout';
import { IconButton } from '../components/ui/IconButton';
import { NoteEditorSheet } from '../components/notes/NoteEditorSheet';
import { activeNotes, useNotesStore, type Note, type NoteKind } from '../store/notesStore';
import { isSyncConfigured, useSettingsStore } from '../store/settingsStore';
import { syncNow, useSyncStore } from '../lib/cloudSync';
import { UI_ICON_WEIGHT } from '../lib/icons';
import { useNavigate } from 'react-router-dom';

type Filter = 'all' | NoteKind;

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return `今天 ${time}`;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

function NoteCard({
  note,
  onOpen,
  onDelete,
}: {
  note: Note;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const images = note.attachments.filter((a) => a.type === 'image');
  const audios = note.attachments.filter((a) => a.type === 'audio');
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="relative bg-white rounded-xl border border-oat-100 card-shadow p-3 pl-3.5 text-left active:scale-[0.995] transition cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <span
          className={clsx(
            'mt-0.5 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
            note.kind === 'bug' ? 'bg-red-50 text-red-500' : 'bg-apricot-50 text-apricot-500'
          )}
        >
          {note.kind === 'bug' ? (
            <Bug size={13} weight={UI_ICON_WEIGHT} />
          ) : (
            <Lightbulb size={13} weight={UI_ICON_WEIGHT} />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-cocoa-900 truncate">{note.title}</h3>
          {note.content && (
            <p className="text-[11px] text-cocoa-700 leading-relaxed mt-1 line-clamp-3 whitespace-pre-wrap">
              {note.content}
            </p>
          )}
          {images.length > 0 && (
            <div className="flex gap-1.5 mt-2 overflow-hidden">
              {images.slice(0, 3).map((img) => (
                <img
                  key={img.id}
                  src={img.data}
                  alt="笔记图片"
                  className="w-14 h-14 rounded-lg object-cover bg-oat-100 flex-shrink-0"
                />
              ))}
              {images.length > 3 && (
                <span className="w-14 h-14 rounded-lg bg-oat-100 text-[11px] text-cocoa-400 flex items-center justify-center flex-shrink-0">
                  +{images.length - 3}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2.5 mt-2 text-[10px] text-cocoa-400">
            <span>{formatTime(note.updatedAt)}</span>
            {images.length > 0 && (
              <span className="flex items-center gap-0.5">
                <ImageIcon size={11} weight={UI_ICON_WEIGHT} />
                {images.length}
              </span>
            )}
            {audios.length > 0 && (
              <span className="flex items-center gap-0.5">
                <Microphone size={11} weight={UI_ICON_WEIGHT} />
                {audios.length}
              </span>
            )}
            {note.attachments.length > 0 && (
              <span className="flex items-center gap-0.5">
                <CloudCheck size={11} weight={UI_ICON_WEIGHT} />
                已存本地
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="删除笔记"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`删除「${note.title}」？删除后同步到其它设备也会一起删除`)) onDelete();
          }}
          className="w-7 h-7 rounded-md text-cocoa-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center flex-shrink-0"
        >
          <Trash size={13} weight={UI_ICON_WEIGHT} />
        </button>
      </div>
    </div>
  );
}

export function Notes() {
  const navigate = useNavigate();
  const notes = useNotesStore((s) => s.notes);
  const removeNote = useNotesStore((s) => s.removeNote);
  const sync = useSettingsStore((s) => s.sync);
  const syncStatus = useSyncStore();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeNotes(notes)
      .filter((note) => filter === 'all' || note.kind === filter)
      .filter(
        (note) =>
          !q ||
          note.title.toLowerCase().includes(q) ||
          note.content.toLowerCase().includes(q)
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, filter, query]);

  const counters = useMemo(() => {
    const all = activeNotes(notes);
    return {
      all: all.length,
      idea: all.filter((n) => n.kind === 'idea').length,
      bug: all.filter((n) => n.kind === 'bug').length,
    };
  }, [notes]);

  const syncReady = isSyncConfigured(sync);
  const syncing = syncStatus.status === 'syncing';

  const syncHint = !syncReady
    ? '未配置云同步'
    : syncing
      ? '同步中…'
      : syncStatus.status === 'error'
        ? '同步失败'
        : syncStatus.lastSyncedAt
          ? `上次同步 ${formatTime(syncStatus.lastSyncedAt)}`
          : '点此同步';

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="笔记"
        showBack
        actions={
          <button
            type="button"
            onClick={() => (syncReady ? void syncNow() : navigate('/settings'))}
            disabled={syncing}
            className={clsx(
              'h-8 px-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition max-w-[9.5rem]',
              syncStatus.status === 'error'
                ? 'bg-red-50 border-red-100 text-red-500'
                : syncReady
                  ? 'bg-white border-oat-200/70 text-cocoa-700'
                  : 'bg-white border-oat-200/70 text-cocoa-400'
            )}
          >
            <ArrowsClockwise size={13} weight={UI_ICON_WEIGHT} className={clsx(syncing && 'animate-spin')} />
            <span className="truncate">{syncHint}</span>
          </button>
        }
      />

      <PageMain className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass
              size={14}
              weight={UI_ICON_WEIGHT}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-400 pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field !bg-white pl-9"
              placeholder="搜索标题或内容"
            />
          </div>
          <button
            type="button"
            onClick={openNew}
            className="h-10 px-3 rounded-xl bg-apricot-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 active:scale-95 transition shadow-cozy-primary"
          >
            <Plus size={14} weight="bold" />
            写笔记
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              ['all', `全部 ${counters.all}`],
              ['idea', `想法 ${counters.idea}`],
              ['bug', `问题 ${counters.bug}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={clsx(
                'shrink-0 px-3 py-1.5 rounded-lg text-xs transition',
                filter === value
                  ? 'bg-apricot-500 text-white font-semibold'
                  : 'bg-white border border-oat-200/60 text-cocoa-700 font-medium'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {!syncReady && (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-2 rounded-xl bg-apricot-50 border border-apricot-200/60 px-3 py-2.5 text-left"
          >
            <CloudSlash size={15} weight={UI_ICON_WEIGHT} className="text-apricot-600 shrink-0" />
            <span className="text-[11px] text-cocoa-700 leading-relaxed">
              笔记目前只保存在本机。到「设置 → 云同步」填好地址和密钥，就能跨设备同步。
            </span>
          </button>
        )}

        {list.length === 0 ? (
          <EmptyState
            icon={<NotePencil size={30} weight="duotone" />}
            title={query ? '没有找到相关笔记' : '还没有笔记'}
            description={query ? '换个关键词试试' : '记录新想法、功能建议或遇到的 bug'}
            actions={
              !query ? (
                <button
                  type="button"
                  onClick={openNew}
                  className="btn btn-primary btn-md"
                >
                  <Plus size={14} weight="bold" />
                  写第一条
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-2.5">
            {list.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onOpen={() => {
                  setEditing(note);
                  setEditorOpen(true);
                }}
                onDelete={() => removeNote(note.id)}
              />
            ))}
            <p className="text-center text-[10px] text-cocoa-400 pt-1 flex items-center justify-center gap-1">
              <IconButton
                icon={<CloudCheck size={12} weight={UI_ICON_WEIGHT} />}
                label="同步"
                className="!w-5 !h-5 !border-0 !bg-transparent !shadow-none"
                onClick={() => (syncReady ? void syncNow() : navigate('/settings'))}
              />
              笔记自动保存，{syncReady ? '每次同步都会上传到云端' : '配置云同步后可跨设备查看'}
            </p>
          </div>
        )}
      </PageMain>

      <NoteEditorSheet
        isOpen={editorOpen}
        note={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          // 已配置同步时，保存后顺手同步一次
          if (isSyncConfigured(useSettingsStore.getState().sync)) void syncNow();
        }}
      />
    </div>
  );
}
