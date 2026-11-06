import { Hash, Loader2, SendHorizontal } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

import { cn, haptic } from '../lib/utils';
import { isDockedViewport, useVirtualKeyboard } from '../lib/viewport';

const MAX_LENGTH = 4000;
const MAX_TEXTAREA_HEIGHT = 220;
const DOCKED_TEXTAREA_HEIGHT = 168;
const KEYBOARD_TEXTAREA_HEIGHT = 120;

interface ComposerProps {
  onSubmit: (content: string) => void | Promise<void>;
}

/** Keep focus (and the virtual keyboard) on the textarea when tapping toolbar buttons. */
const keepTextareaFocus = (event: MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
};

export function Composer({ onSubmit }: ComposerProps) {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyboardOpen = useVirtualKeyboard(sectionRef);

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const limit = isDockedViewport()
      ? keyboardOpen
        ? KEYBOARD_TEXTAREA_HEIGHT
        : DOCKED_TEXTAREA_HEIGHT
      : MAX_TEXTAREA_HEIGHT;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, limit)}px`;
  }, [keyboardOpen]);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value]);

  // Publish the docked height so the stream can reserve space underneath it.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof ResizeObserver === 'undefined') return;

    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      const height = entry.borderBoxSize?.[0]?.blockSize ?? section.offsetHeight;
      root.style.setProperty('--composer-height', `${Math.ceil(height)}px`);
    });

    observer.observe(section);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--composer-height');
    };
  }, []);

  useEffect(() => {
    // Desktop: focus straight away. Touch: wait for the viewport to settle and
    // never let the browser scroll the page to reveal the field.
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const focusTimer = window.setTimeout(
      () => textareaRef.current?.focus({ preventScroll: true }),
      coarse ? 260 : 0,
    );

    return () => window.clearTimeout(focusTimer);
  }, []);

  const submit = useCallback(async () => {
    const content = value.trim();
    if (!content || isSubmitting) return;

    const textarea = textareaRef.current;
    const hadFocus = document.activeElement === textarea;

    setIsSubmitting(true);
    setValue('');
    haptic();

    try {
      await onSubmit(content);

      // The new memo lands at the top of the stream; bring it into view on phones.
      if (isDockedViewport() && window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setValue(content);
    } finally {
      setIsSubmitting(false);
      window.requestAnimationFrame(() => {
        resizeTextarea();
        if (hadFocus) textareaRef.current?.focus({ preventScroll: true });
      });
    }
  }, [isSubmitting, onSubmit, resizeTextarea, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void submit();
    }
  };

  const insertTagToken = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    haptic();

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    const needsSpace = start > 0 && !/\s$/.test(value.slice(0, start));
    const prefix = needsSpace ? ' #' : '#';
    const nextValue = `${value.slice(0, start)}${prefix}${value.slice(end)}`;

    if (nextValue.length > MAX_LENGTH) return;

    setValue(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus({ preventScroll: true });
      const cursor = start + prefix.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const canSubmit = value.trim().length > 0 && !isSubmitting;
  const nearLimit = value.length > MAX_LENGTH * 0.9;

  return (
    <section
      ref={sectionRef}
      aria-label="Quick dump composer"
      data-keyboard={keyboardOpen ? 'open' : 'closed'}
      className={cn(
        // Phones: docked to the bottom edge, within thumb reach.
        'composer-dock fixed inset-x-0 bottom-0 z-30 border-t border-lumos-line/70 bg-lumos-bg/85 px-3 pt-2.5 backdrop-blur-xl',
        // Larger screens: inline at the top of the stream.
        'sm:static sm:z-auto sm:mb-8 sm:transform-none sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none',
      )}
    >
      <div className="mx-auto w-full max-w-xl">
        <div
          className={cn(
            'overflow-hidden rounded-2xl border bg-lumos-surface/90 shadow-panel transition-[border-color,box-shadow] duration-300 ease-glide sm:bg-lumos-surface/80 sm:backdrop-blur',
            isFocused
              ? 'border-lumos-accent/40 shadow-glow ring-1 ring-lumos-accent/15'
              : 'border-lumos-line hover:border-lumos-line-strong',
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
            rows={2}
            maxLength={MAX_LENGTH}
            autoComplete="off"
            autoCapitalize="sentences"
            spellCheck
            aria-keyshortcuts="Control+Enter Meta+Enter"
            placeholder="Tulis apa pun yang melintas, Paa..."
            // 16px minimum on touch screens stops iOS from zooming on focus.
            className="block min-h-[60px] w-full resize-none overscroll-contain bg-transparent px-4 pb-2 pt-3.5 text-base leading-relaxed text-zinc-100 caret-lumos-accent placeholder:text-zinc-500 focus:outline-none sm:min-h-[92px] sm:pt-4 sm:text-[15px]"
          />

          <div className="flex items-center justify-between gap-2 border-t border-lumos-line/60 px-2 py-1.5 sm:px-2.5 sm:py-2">
            <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onMouseDown={keepTextareaFocus}
                onClick={insertTagToken}
                className="flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-zinc-400 transition-[background-color,color,transform] duration-150 ease-glide hover:bg-lumos-elevated hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumos-accent/45 active:scale-95 active:bg-lumos-elevated active:text-lumos-accent sm:min-h-9"
                aria-label="Sisipkan tag"
              >
                <Hash className="h-4 w-4" aria-hidden="true" />
                Tag
              </button>
              <span className="hidden truncate pl-1 text-[11px] text-zinc-500 sm:inline">
                Ctrl/⌘ + Enter
              </span>
              {value.length > 0 && (
                <span
                  className={cn(
                    'pl-1 text-[11px] tabular-nums text-zinc-500 sm:hidden',
                    nearLimit && 'font-medium text-lumos-accent',
                  )}
                >
                  {value.length}/{MAX_LENGTH}
                </span>
              )}
            </div>

            <button
              type="button"
              onMouseDown={keepTextareaFocus}
              onClick={() => void submit()}
              disabled={!canSubmit}
              aria-keyshortcuts="Control+Enter Meta+Enter"
              className="group flex min-h-10 items-center gap-2 rounded-xl bg-lumos-accent px-4 text-[13px] font-semibold text-lumos-accent-ink shadow-lg shadow-lumos-accent/25 transition-[background-color,box-shadow,transform,color] duration-150 ease-glide hover:bg-lumos-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lumos-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-lumos-surface active:scale-95 active:bg-lumos-accent-strong disabled:cursor-not-allowed disabled:bg-lumos-elevated disabled:text-zinc-500 disabled:shadow-none disabled:active:scale-100 sm:min-h-9"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <SendHorizontal
                  className="h-4 w-4 transition-transform duration-200 ease-glide group-enabled:group-hover:-translate-y-0.5 group-enabled:group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              )}
              Dump
            </button>
          </div>
        </div>

        <div className="mt-2 hidden items-center justify-between gap-4 px-1 text-[11px] text-zinc-500 sm:flex">
          <span>Offline-first · tersimpan di perangkat</span>
          <span className={cn('tabular-nums', nearLimit && 'font-medium text-lumos-accent')}>
            {value.length}/{MAX_LENGTH}
          </span>
        </div>
      </div>
    </section>
  );
}
