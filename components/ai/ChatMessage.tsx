"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

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
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10 mt-1">
          <Bot className="h-4 w-4 text-blue-500" />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-[22px] px-4 py-3 text-sm ${
          isUser
            ? "bg-blue-600 text-white"
            : isError
              ? "border border-red-500/30 text-foreground"
              : "border border-border/30 text-foreground"
        }`}
        style={!isUser ? { backgroundColor: isError ? "hsl(var(--card))" : "hsl(var(--card))" } : undefined}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : isError ? (
          <p className="text-red-400 text-sm">{content.replace("_Erro:", "").replace("_", "").trim() || content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
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
