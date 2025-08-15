"use client";

import { useChat as useAIChat } from "ai/react";

export function useChat(options: {
  api: string;
  headers?: Record<string, string>;
}) {
  console.log("🚀 [USE-CHAT] useChat hook called with options:", options);
  
  const chat = useAIChat({
    api: options.api,
    headers: options.headers,
    onResponse: (response) => {
      console.log("📤 [USE-CHAT] Response received:", response.status, response.statusText);
      console.log("📋 [USE-CHAT] Response headers:", Object.fromEntries(response.headers.entries()));
    },
    onFinish: (message) => {
      console.log("🏁 [USE-CHAT] Chat finished with message:", message);
    },
    onError: (error) => {
      console.error("💥 [USE-CHAT] Chat error:", error);
    },
  });

  console.log("📊 [USE-CHAT] Chat state:", {
    messages: chat.messages.length,
    isLoading: chat.isLoading,
    error: chat.error,
    input: chat.input,
  });

  return chat;
}
