"use client";

import { useChat } from "@/components/use-chat";
import { ChatInput } from "@/components/chatinput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { CodeBlock } from "@/components/ui/code-block";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShareButton } from "@/components/share-button";
import { FrameworkSelector } from "@/components/framework-selector";
import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Download, RefreshCw, Share, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ChatProps {
  appId: string;
}

export function Chat({ appId }: ChatProps) {
  console.log("🚀 [CHAT COMPONENT] Chat component rendered with appId:", appId);
  
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    reload,
    clear,
  } = useChat({
    api: "/api/chat",
    headers: {
      "App-Id": appId,
    },
  });

  console.log("📊 [CHAT COMPONENT] Messages count:", messages.length);
  console.log("🔄 [CHAT COMPONENT] Is loading:", isLoading);
  console.log("❌ [CHAT COMPONENT] Error:", error);

  const [showFrameworkSelector, setShowFrameworkSelector] = useState(false);

  const handleShare = async () => {
    console.log("📤 [CHAT COMPONENT] Share button clicked");
    try {
      const shareData = {
        title: "Check out this AI app!",
        text: "I just created this amazing app with AI!",
        url: window.location.href,
      };

      if (navigator.share) {
        await navigator.share(shareData);
        console.log("✅ [CHAT COMPONENT] Native share successful");
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
        console.log("📋 [CHAT COMPONENT] Link copied to clipboard");
      }
    } catch (error) {
      console.error("❌ [CHAT COMPONENT] Share failed:", error);
      toast.error("Failed to share");
    }
  };

  const handleCopy = async (text: string) => {
    console.log("📋 [CHAT COMPONENT] Copy button clicked");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
      console.log("✅ [CHAT COMPONENT] Text copied successfully");
    } catch (error) {
      console.error("❌ [CHAT COMPONENT] Copy failed:", error);
      toast.error("Failed to copy");
    }
  };

  const handleDownload = async (text: string, filename: string) => {
    console.log("💾 [CHAT COMPONENT] Download button clicked for:", filename);
    try {
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started!");
      console.log("✅ [CHAT COMPONENT] Download started successfully");
    } catch (error) {
      console.error("❌ [CHAT COMPONENT] Download failed:", error);
      toast.error("Failed to download");
    }
  };

  const handleReload = () => {
    console.log("🔄 [CHAT COMPONENT] Reload button clicked");
    reload();
  };

  const handleClear = () => {
    console.log("🧹 [CHAT COMPONENT] Clear button clicked");
    clear();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-semibold">AI Chat</h1>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFrameworkSelector(!showFrameworkSelector)}
                >
                  {showFrameworkSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Framework
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Select framework</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleReload} disabled={isLoading}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reload conversation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear conversation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ShareButton onShare={handleShare} />
        </div>
      </div>

      {showFrameworkSelector && (
        <div className="p-4 border-b">
          <FrameworkSelector />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2" />
            <p>Start a conversation with the AI</p>
          </div>
        ) : (
          messages.map((message, index) => {
            console.log(`💬 [CHAT COMPONENT] Rendering message ${index}:`, message);
            return (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${message.role === "user" ? "bg-blue-500" : "bg-green-500"}`} />
                    <span className="text-sm font-medium capitalize">{message.role}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {message.role === "assistant" && (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(message.content)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy message</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(message.content, `message-${index + 1}.txt`)}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download message</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                  </div>
                </div>
                <div className="prose prose-sm max-w-none">
                  <Markdown content={message.content} />
                </div>
              </Card>
            );
          })
        )}
        {isLoading && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium">AI</span>
            </div>
            <div className="text-muted-foreground">Thinking...</div>
          </Card>
        )}
        {error && (
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium text-red-700">Error</span>
            </div>
            <div className="text-red-700">{error.message}</div>
          </Card>
        )}
      </div>

      <div className="p-4 border-t">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
        />
      </div>
    </div>
  );
}
