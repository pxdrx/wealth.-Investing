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

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-[22px] px-4 py-3 text-sm ${
          isUser
            ? "bg-blue-600 text-white"
            : "text-foreground"
        }`}
        style={!isUser ? { backgroundColor: "hsl(var(--card))" } : undefined}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            {isStreaming && (
              <motion.span
                className="inline-block h-3 w-0.5 bg-foreground align-middle ml-0.5"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
