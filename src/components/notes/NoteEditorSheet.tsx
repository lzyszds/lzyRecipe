import { useEffect, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Microphone,
  Stop,
  Trash,
  CircleNotch,
  FileAudio,
} from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { BottomSheet } from './../ui/BottomSheet';
import { Button } from './../ui/Button';
import { IconButton } from './../ui/IconButton';
import { useNotesStore, isAttachmentTooLarge, type Note, type NoteKind, type NoteAttachment } from '../../store/notesStore';
import { useSettingsStore } from '../../store/settingsStore';
import { compressImage, transcribeAudio, type AiConfig } from '../../lib/ai';
import { UI_ICON_WEIGHT } from '../../lib/icons';

interface NoteEditorSheetProps {
  isOpen: boolean;
  /** 传入则为编辑，否则为新建 */
  note: Note | null;
  onClose: () => void;
  onSaved?: (noteId: string) => void;
}

const newAttachmentId = () => `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 笔记编辑器：文字 + 语音（录音并转文字）+ 图片 */
export function NoteEditorSheet({ isOpen, note, onClose, onSaved }: NoteEditorSheetProps) {
  const addNote = useNotesStore((s) => s.addNote);
  const updateNote = useNotesStore((s) => s.updateNote);

  const [kind, setKind] = useState<NoteKind>('idea');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [error, setError] = useState('');

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const ai = useSettingsStore((s) => s.ai);
  const micSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';

  // 打开时载入内容
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setKind(note?.kind ?? 'idea');
    setTitle(note?.title ?? '');
    setContent(note?.content ?? '');
    setAttachments(note?.attachments ?? []);
  }, [isOpen, note]);

  // 关闭时停止录音（stopRecording 只操作 ref，无需加入依赖）
  useEffect(() => {
    if (isOpen) return;
    stopRecording();
  }, [isOpen]);

  // 卸载时同样停止录音，避免麦克风一直占用
  useEffect(() => () => stopRecording(), []);

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = undefined;
    setRecording(false);
  }

  const aiConfig: AiConfig = {
    baseUrl: ai.baseUrl,
    apiKey: ai.apiKey,
    model: ai.model,
    transcribeModel: ai.transcribeModel,
  };

  const handleAudio = async (blob: Blob, duration: number) => {
    if (isAttachmentTooLarge(`data:${blob.type};base64,${'A'.repeat(Math.ceil((blob.size * 4) / 3))}`)) {
      setError('录音太长（超过 12MB），请分几次记录');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('读取录音失败'));
      reader.readAsDataURL(blob);
    });
    const attachment: NoteAttachment = {
      id: newAttachmentId(),
      type: 'audio',
      data: dataUrl,
      duration,
      createdAt: new Date().toISOString(),
    };
    // 先插入附件，转写失败也不丢录音
    setAttachments((prev) => [...prev, attachment]);

    setTranscribing(true);
    try {
      const text = await transcribeAudio(aiConfig, blob, { language: 'zh' });
      setContent((prev) => (prev ? `${prev}\n${text}` : text));
    } catch (err) {
      setError(
        `语音已保存，但转文字失败：${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setTranscribing(false);
    }
  };

  const startRecording = async () => {
    setError('');
    if (!micSupported) {
      setError('当前环境不支持录音，请用 App 或支持麦克风的浏览器');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      const startAt = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        void handleAudio(blob, Math.round((Date.now() - startAt) / 1000));
      };
      recorder.start();
      recorderRef.current = recorder;
      setElapsed(0);
      setRecording(true);
      timerRef.current = window.setInterval(
        () => setElapsed(Math.round((Date.now() - startAt) / 1000)),
        500
      );
    } catch (err) {
      setError(`无法使用麦克风：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    const next: NoteAttachment[] = [];
    for (const file of Array.from(files).slice(0, 6)) {
      try {
        const data = await compressImage(file, { maxSize: 1280, quality: 0.82 });
        next.push({
          id: newAttachmentId(),
          type: 'image',
          data,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    setAttachments((prev) => [...prev, ...next]);
  };

  const handleSave = () => {
    if (!title.trim() && !content.trim() && attachments.length === 0) {
      setError('写点什么再保存吧（标题、正文、语音或图片都可以）');
      return;
    }
    const finalTitle = title.trim() || content.trim().slice(0, 18) || '未命名笔记';
    if (note) {
      updateNote(note.id, { kind, title: finalTitle, content: content.trim(), attachments });
      onSaved?.(note.id);
    } else {
      const id = addNote({ kind, title: finalTitle, content: content.trim(), attachments });
      onSaved?.(id);
    }
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => {
        stopRecording();
        onClose();
      }}
      title={note ? '编辑笔记' : '新笔记'}
      description="记录想法和问题，可加语音、图片"
      bodyClassName="space-y-3"
    >
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white">
        {(
          [
            ['idea', '想法'],
            ['bug', '问题 / Bug'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={clsx(
              'h-9 rounded-lg text-xs font-semibold transition-colors',
              kind === value ? 'bg-apricot-500 text-white' : 'text-cocoa-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="input-field bg-white"
        placeholder="标题（可不填）"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="input-area !min-h-[9rem] bg-white"
        placeholder="写点想法、新功能、发现的 bug……也可以用语音说"
      />

      {(attachments.length > 0 || transcribing) && (
        <div className="grid grid-cols-4 gap-2">
          {attachments.map((att) =>
            att.type === 'image' ? (
              <div key={att.id} className="relative aspect-square rounded-lg overflow-hidden bg-oat-100">
                <img src={att.data} alt="笔记图片" className="w-full h-full object-cover" />
                <button
                  type="button"
                  aria-label="删除图片"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((item) => item.id !== att.id))
                  }
                  className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/50 text-white flex items-center justify-center"
                >
                  <Trash size={11} weight="bold" />
                </button>
              </div>
            ) : (
              <div
                key={att.id}
                className="relative aspect-square rounded-lg bg-white border border-oat-100 flex flex-col items-center justify-center gap-1"
              >
                <FileAudio size={18} weight={UI_ICON_WEIGHT} className="text-apricot-500" />
                <span className="text-[10px] text-cocoa-400">语音 {formatDuration(att.duration ?? 0)}</span>
                <audio src={att.data} className="hidden" />
                <button
                  type="button"
                  aria-label="播放语音"
                  onClick={() => new Audio(att.data).play()}
                  className="text-[10px] text-apricot-600 font-medium"
                >
                  播放
                </button>
                <button
                  type="button"
                  aria-label="删除语音"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((item) => item.id !== att.id))
                  }
                  className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/50 text-white flex items-center justify-center"
                >
                  <Trash size={11} weight="bold" />
                </button>
              </div>
            )
          )}
          {transcribing && (
            <div className="aspect-square rounded-lg bg-white border border-dashed border-oat-200 flex flex-col items-center justify-center gap-1">
              <CircleNotch size={16} weight="bold" className="animate-spin text-apricot-500" />
              <span className="text-[9px] text-cocoa-400">转文字…</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-500 bg-red-50 rounded-lg p-2.5 leading-relaxed">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <IconButton
          icon={
            recording ? (
              <Stop size={16} weight="fill" className="text-red-500" />
            ) : (
              <Microphone size={16} weight={UI_ICON_WEIGHT} />
            )
          }
          label={recording ? '停止录音' : '语音输入'}
          onClick={() => (recording ? stopRecording() : void startRecording())}
          className={clsx(recording && '!bg-red-50 !border-red-200')}
          disabled={transcribing}
        />
        <IconButton
          icon={<ImageIcon size={16} weight={UI_ICON_WEIGHT} />}
          label="添加图片"
          onClick={() => fileRef.current?.click()}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {recording && (
          <span className="text-[11px] text-red-500 font-medium animate-pulse">
            正在录音 {formatDuration(elapsed)}
          </span>
        )}
        {!recording && transcribing && (
          <span className="text-[11px] text-cocoa-400">正在把语音转成文字…</span>
        )}
        <Button className="ml-auto" onClick={handleSave} disabled={transcribing}>
          保存笔记
        </Button>
      </div>
    </BottomSheet>
  );
}
