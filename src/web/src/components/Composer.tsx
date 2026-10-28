import { Hash, Loader2, SendHorizontal } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { cn } from '../lib/utils';

const MAX_LENGTH = 4000;
const MAX_TEXTAREA_HEIGHT = 220;

interface ComposerProps {
  onSubmit: (content: string) => void | Promise<void>;
}

export function Composer({ onSubmit }: ComposerProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();

    // Wait for the mobile viewport to settle before opening the keyboard.
    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus({ preventScroll: true });
    }, 180);

    return () => window.clearTimeout(focusTimer);
  }, [resizeTextarea]);

  useEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value]);

  const submit = useCallback(async () => {
    const content = value.trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    setValue('');

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }

    try {
      await onSubmit(content);
    } catch {
      setValue(content);
    } finally {
      setIsSubmitting(false);
      window.requestAnimationFrame(() => {
        resizeTextarea();
        textareaRef.current?.focus({ preventScroll: true });
      });
    }
  }, [isSubmitting, onSubmit, resizeTextarea, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void submit();
    }
  };

  const insertTagToken = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    const needsSpace = start > 0 && !/\s$/.test(value.slice(0, start));
    const prefix = needsSpace ? ' #' : '#';
    const nextValue = `${value.slice(0, start)}${prefix}${value.slice(end)}`;

    setValue(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + prefix.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const canSubmit = value.trim().length > 0 && !isSubmitting;

  return (
    <section aria-label="Quick dump composer" className="mb-8">
      <div
        className={cn(
          'overflow-hidden rounded-2xl border bg-zinc-900/80 shadow-2xl shadow-black/30 backdrop-blur transition-colors duration-200',
          isFocused
            ? 'border-amber-400/30 ring-1 ring-amber-400/10'
            : 'border-zinc-800 hover:border-zinc-700/80',
        )}
      >
        <label htmlFor="memo-composer" className="sr-only">
          Tulis memo baru
        </label>
        <textarea
          id="memo-composer"
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus
          rows={3}
          maxLength={MAX_LENGTH}
          placeholder="Tulis apa pun yang melintas, Paa..."
          className="min-h-[92px] w-full resize-none bg-transparent px-4 pb-2 pt-4 text-[15px] leading-relaxed text-zinc-100 caret-amber-300 placeholder:text-zinc-600 focus:outline-none sm:text-base"
        />

        <div className="flex items-center justify-between gap-2 border-t border-zinc-800/70 px-2.5 py-2">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={insertTagToken}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800/70 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
              aria-label="Sisipkan tag"
            >
              <Hash className="h-4 w-4" aria-hidden="true" />
              Tag
            </button>
            <span className="hidden truncate pl-1 text-[11px] text-zinc-600 sm:inline">
              Ctrl/⌘ + Enter
            </span>
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="group flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-[13px] font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <SendHorizontal
                className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            )}
            Dump
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-4 px-1 text-[11px] text-zinc-600">
        <span>Offline-first · tersimpan di perangkat</span>
        <span className={cn(value.length > MAX_LENGTH * 0.9 && 'text-amber-400')}>
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
    </section>
  );
}
