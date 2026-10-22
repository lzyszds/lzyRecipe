import { useEffect, useRef, useState } from 'react';
import { ArrowUp, CircleNotch, Sparkle } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { BottomSheet } from './ui/BottomSheet';
import { useSettingsStore, isAiConfigured } from '../store/settingsStore';
import { askAboutRecipe } from '../lib/aiRecipes';
import type { Recipe } from '../types';

interface QaMessage {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = ['可以少放辣吗？', '冰箱里没有这个食材，能换什么？', '一个人吃的话用量怎么调？'];

/** 菜谱详情页的 AI 问答抽屉：围绕当前这道菜回答做法问题 */
export function RecipeQaSheet({
  recipe,
  isOpen,
  onClose,
}: {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<QaMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const aiSettings = useSettingsStore((s) => s.ai);
  const aiReady = isAiConfigured(aiSettings);

  // 切换到别的菜谱时清空对话
  useEffect(() => {
    setMessages([]);
    setError('');
  }, [recipe.id]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen]);

  const send = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setError('');
    setDraft('');
    const history = messages;
    setMessages([...history, { role: 'user', content: text }]);
    setBusy(true);
    try {
      const answer = await askAboutRecipe({ recipe }, history, text);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessages(history);
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="问 AI"
      description={`关于「${recipe.name}」的做法问题都可以问`}
      bodyClassName="space-y-3"
    >
      {!aiReady && (
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2.5 leading-relaxed">
          还没配置 AI：请到「个人中心 → 设置 → AI 助手」填写接口地址、API Key 和模型名称。
        </p>
      )}

      <div ref={listRef} className="h-[min(42vh,360px)] overflow-y-auto space-y-2.5 pr-0.5">
        {messages.length === 0 ? (
          <div className="space-y-8 pt-2 text-center">
            <div>
              <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-apricot-50 text-apricot-500">
                <Sparkle size={20} weight="fill" />
              </span>
              <p className="text-xs font-semibold text-cocoa-900 mt-2">做这道菜遇到问题？</p>
              <p className="text-[11px] text-cocoa-400 mt-1">AI 会结合食材和步骤来回答</p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  disabled={!aiReady || busy}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-oat-200/70 text-[11px] text-cocoa-700 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={clsx('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <p
                className={clsx(
                  'max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap',
                  message.role === 'user'
                    ? 'bg-apricot-500 text-white rounded-br-md'
                    : 'bg-white border border-oat-100 text-cocoa-700 rounded-bl-md'
                )}
              >
                {message.content}
              </p>
            </div>
          ))
        )}
        {busy && (
          <p className="flex items-center gap-1.5 text-[11px] text-cocoa-400">
            <CircleNotch size={12} weight="bold" className="animate-spin" />
            正在思考…
          </p>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-red-500 bg-red-50 rounded-lg p-2.5 leading-relaxed">{error}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="input-field bg-white flex-1"
          placeholder="输入问题，例如：可以少放盐吗？"
        />
        <button
          type="submit"
          aria-label="发送"
          disabled={!draft.trim() || busy || !aiReady}
          className="w-10 h-10 rounded-xl bg-apricot-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95 transition"
        >
          <ArrowUp size={16} weight="bold" />
        </button>
      </form>
    </BottomSheet>
  );
}

