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
      {/* Avatar */}
      <div className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md ${
        isUser 
          ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20" 
          : isError
            ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20"
            : "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-teal-500/20"
      }`}>
        {isUser ? <User className="h-4.5 w-4.5 text-white" /> : <Brain className="h-4.5 w-4.5 text-white" />}
      </div>

      {/* Message Bubble */}
      <div className="flex flex-col gap-1 w-full max-w-[80%]">
        <span className={`text-[11px] font-semibold tracking-wider uppercase px-1 ${
          isUser ? "text-right text-muted-foreground" : "text-left text-muted-foreground"
        }`}>
          {isUser ? "Você" : "AI Coach"}
        </span>
        <div
          className={`relative px-5 py-4 text-[15px] leading-relaxed shadow-sm ${
            isUser
              ? "rounded-2xl rounded-tr-sm bg-gradient-to-br from-blue-600/10 to-indigo-600/5 text-foreground border border-blue-500/20"
              : isError
                ? "rounded-2xl rounded-tl-sm bg-red-500/10 border border-red-500/30"
                : "rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 dark:border-white/5 backdrop-blur-md"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : isError ? (
            <p className="text-red-400 font-medium">{content.replace(/_Erro:|_/g, "").trim() || content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-display prose-headings:text-foreground prose-strong:text-emerald-500">
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
