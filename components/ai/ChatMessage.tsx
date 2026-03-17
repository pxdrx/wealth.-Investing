"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";
  const isError = !isUser && content.includes("Erro:");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "rounded-br-md bg-muted/50 text-foreground"
            : isError
              ? "rounded-bl-md border border-red-500/30"
              : "rounded-bl-md border border-border/40"
        }`}
        style={!isUser ? { backgroundColor: "hsl(var(--background))" } : undefined}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        ) : isError ? (
          <p className="text-red-400 text-sm">{content.replace(/_Erro:|_/g, "").trim() || content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-strong:text-foreground">
            <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            {isStreaming && (
              <motion.span
                className="inline-block h-3 w-0.5 bg-blue-500 align-middle ml-0.5"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
