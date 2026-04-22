"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /**
   * Optional callback fired whenever the current draft starts with "/".
   * Receives the full slash query (e.g. "/coach" or "/analyst EURUSD") while
   * the user is typing a command, or `null` once the draft no longer starts
   * with "/". Preserves existing API — callers ignoring this prop see no
   * behaviour change.
   */
  onSlash?: (query: string | null) => void;
  value?: string;
}

export function ChatInput({ onSubmit, disabled, placeholder, onSlash, value }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Allow parent-controlled seeding of draft (e.g. slash command auto-clear).
  useEffect(() => {
    if (typeof value === "string") setText(value);
  }, [value]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (!onSlash) return;
    onSlash(text.startsWith("/") ? text : null);
  }, [text, onSlash]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setText("");
  }, [text, disabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="relative group mx-auto w-full">
      {/* Glow effect behind the input */}
      <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-teal-500/0 opacity-0 group-focus-within:opacity-100 blur-md transition-opacity duration-500" />
      
      <div className="relative flex items-end gap-2 sm:gap-3 rounded-[28px] border border-white/10 dark:border-white/5 bg-white/5 dark:bg-black/20 backdrop-blur-xl px-3 sm:px-5 py-2.5 sm:py-3.5 transition-all focus-within:border-blue-500/40 focus-within:bg-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.1)]">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Digite sua dúvida para análise..."}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50 py-1 max-h-[140px]"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-50 disabled:shadow-none transition-all"
        >
          <Send className="h-4.5 w-4.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
