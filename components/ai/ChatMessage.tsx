"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { Brain, User } from "lucide-react";

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
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex w-full gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar (only for AI) */}
      {!isUser && (
        <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-md ${
          isError
            ? "bg-red-500/10 border border-red-500/20"
            : "bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20"
        }`}>
          <Brain className={`h-4 w-4 ${isError ? "text-red-500" : "text-emerald-500"}`} />
        </div>
      )}

      {/* Message Bubble */}
      <div className={`flex flex-col gap-1 w-full max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`relative px-5 py-4 text-[15px] leading-relaxed ${
            isUser
              ? "rounded-[24px] rounded-tr-[4px] bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)]"
              : isError
                ? "rounded-[24px] rounded-tl-[4px] bg-red-500/10 border border-red-500/30 text-foreground"
                : "rounded-[24px] rounded-tl-[4px] bg-card/60 border border-border/50 shadow-soft dark:shadow-soft-dark backdrop-blur-xl text-foreground"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : isError ? (
            <p className="text-red-400 font-medium">{content.replace(/_Erro:|_/g, "").trim() || content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-display prose-headings:text-foreground prose-strong:text-emerald-500 prose-a:text-blue-500">
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
              {isStreaming && (
                <motion.span
                  className="inline-block h-3.5 w-1.5 bg-emerald-500 rounded-full align-middle ml-1"
                  animate={{ opacity: [1, 0.2] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
