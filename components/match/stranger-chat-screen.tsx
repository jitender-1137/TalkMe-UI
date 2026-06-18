"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMatchStore } from "./match-store";
import { StrangerChatHeader } from "./stranger-chat-header";
import { StrangerChatBubble } from "./stranger-chat-bubble";
import { useWebSocket } from "@/components/providers";
import { UploadService } from "@/src/api/services/upload.service";
import { toast } from "sonner";
import { MessageInput } from "@/components/chat/message-input";
import { CameraModal } from "@/components/chat/camera-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Stranger, StrangerMessage } from "./types";

interface StrangerChatScreenProps {
  stranger: Stranger;
  messages: StrangerMessage[];
  onSendMessage: (content: string, type?: "text" | "image", media?: any) => void;
  onSkip: () => void;
  onReport: () => void;
  onBlock: () => void;
  onExit: () => void;
  onRevealMedia: (messageId: string) => void;
  onHideMedia: (messageId: string) => void;
}

export function StrangerChatScreen({
  stranger,
  messages,
  onSendMessage,
  onSkip,
  onReport,
  onBlock,
  onExit,
  onRevealMedia,
  onHideMedia,
}: StrangerChatScreenProps) {
  const { status } = useMatchStore();
  const { sendEvent } = useWebSocket();
  const isDisconnected = status === "disconnected";

  const [isUploading, setIsUploading] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const [newChatConfirm, setNewChatConfirm] = useState(false);
  const [endChatConfirm, setEndChatConfirm] = useState(false);
  const newChatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const endChatTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (newChatTimerRef.current) clearTimeout(newChatTimerRef.current);
      if (endChatTimerRef.current) clearTimeout(endChatTimerRef.current);
    };
  }, []);

  const handleNewChatClick = () => {
    if (newChatConfirm) {
      if (newChatTimerRef.current) clearTimeout(newChatTimerRef.current);
      setNewChatConfirm(false);
      onSkip();
    } else {
      setNewChatConfirm(true);
      newChatTimerRef.current = setTimeout(() => {
        setNewChatConfirm(false);
      }, 3000);
    }
  };

  const handleEndChatClick = () => {
    if (endChatConfirm) {
      if (endChatTimerRef.current) clearTimeout(endChatTimerRef.current);
      setEndChatConfirm(false);
      onExit();
    } else {
      setEndChatConfirm(true);
      endChatTimerRef.current = setTimeout(() => {
        setEndChatConfirm(false);
      }, 3000);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef(false);

  // Compute image exchange permission state from message history
  const imageExchangeState = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const content = messages[i].content;
      if (content === "__IMAGE_ACCEPT__") return "approved";
      if (content === "__IMAGE_REJECT__") return "rejected";
      if (content === "__IMAGE_REQUEST__") return "requested";
    }
    return "idle";
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup typing notification on unmount
  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        sendEvent("stranger_typing_stopped", {});
      }
    };
  }, [sendEvent]);

  const handleSend = (content: string) => {
    if (!content.trim() || isDisconnected) return;
    onSendMessage(content.trim(), "text");
  };

  const handleTyping = (isTyping: boolean) => {
    if (isDisconnected) return;
    if (isTyping) {
      isTypingRef.current = true;
      sendEvent("stranger_typing_started", {});
    } else {
      isTypingRef.current = false;
      sendEvent("stranger_typing_stopped", {});
    }
  };

  const verifyImagePermission = () => {
    if (isDisconnected) return false;

    if (imageExchangeState === "idle" || imageExchangeState === "rejected") {
      // Send image exchange request
      onSendMessage("__IMAGE_REQUEST__", "text");
      toast.info("Image exchange request sent to stranger.");
      return false;
    } else if (imageExchangeState === "requested") {
      toast.warning("Waiting for stranger to approve image exchange.");
      return false;
    }
    return true;
  };

  const handleAttachClick = (type: "image" | "video" | "audio" | "document" | "camera") => {
    if (type === "image") {
      if (verifyImagePermission()) {
        fileInputRef.current?.click();
      }
    } else if (type === "camera") {
      if (verifyImagePermission()) {
        setShowCameraModal(true);
      }
    } else {
      toast.warning("Only image sharing is supported in stranger chat.");
    }
  };

  const handleSendMediaDirectly = (url: string, type: "image" | "sticker") => {
    if (isDisconnected) return;
    onSendMessage("", "image", {
      type: "image",
      url: url,
      isBlurred: true,
    });
    toast.success(`${type === "image" ? "GIF" : "Sticker"} sent successfully`);
  };

  const handleImageClick = () => {
    if (verifyImagePermission()) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isDisconnected) return;

    setIsUploading(true);
    try {
      const response = await UploadService.uploadFile(file, "image");
      if (response && response.url) {
        // Send image message
        onSendMessage("", "image", {
          type: "image",
          url: response.url,
          fileName: file.name,
          fileSize: file.size.toString(),
          mimeType: file.type,
          isBlurred: true,
        });
        toast.success("Image sent successfully");
      }
    } catch (err) {
      console.error("Failed to upload image:", err);
      toast.error("Failed to send image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGifSelect = (gifUrl: string) => {
    if (isDisconnected) return;
    onSendMessage("", "image", {
      type: "image",
      url: gifUrl,
      isBlurred: true,
    });
    toast.success("GIF sent successfully");
  };

  const handleCameraCapture = async (file: File) => {
    if (isDisconnected) return;

    setIsUploading(true);
    try {
      const response = await UploadService.uploadFile(file, "image");
      if (response && response.url) {
        onSendMessage("", "image", {
          type: "image",
          url: response.url,
          fileName: file.name,
          fileSize: file.size.toString(),
          mimeType: file.type,
          isBlurred: true,
        });
        toast.success("Photo sent successfully");
      }
    } catch (err) {
      console.error("Failed to upload camera capture:", err);
      toast.error("Failed to send photo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-background relative">
      {/* Header */}
      <StrangerChatHeader
        stranger={stranger}
        onSkip={onSkip}
        onReport={onReport}
        onBlock={onBlock}
      />

      {/* Chat messages list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-1">
          {/* Connection notice */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-6"
          >
            <div className="bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold shadow-inner">
              Connected with {stranger.anonymousName}
            </div>
          </motion.div>

          {/* Shared interests */}
          {stranger.interests.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex justify-center mb-4"
            >
              <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-border/50">
                Shared interests: {stranger.interests.join(", ")}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <StrangerChatBubble
                key={message.id}
                message={message}
                onRevealMedia={() => onRevealMedia(message.id)}
                onHideMedia={() => onHideMedia(message.id)}
                onAcceptImageRequest={() => onSendMessage("__IMAGE_ACCEPT__", "text")}
                onRejectImageRequest={() => onSendMessage("__IMAGE_REJECT__", "text")}
              />
            ))}
          </AnimatePresence>

          {/* Disconnection notice */}
          {isDisconnected && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center my-4"
            >
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-5 py-2.5 rounded-full text-sm font-semibold shadow-md">
                Stranger has disconnected.
              </div>
            </motion.div>
          )}

          {/* Typing indicator */}
          <AnimatePresence>
            {stranger.isTyping && !isDisconnected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 px-4 py-2"
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-muted-foreground"
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {stranger.anonymousName} is typing...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* File input (hidden) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Matchmaking controls toolbar */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-white/5 bg-card/45 select-none shrink-0">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChatClick}
            className={cn(
              "h-8 text-xs rounded-full px-3.5 font-medium transition-all duration-200 border-transparent",
              newChatConfirm
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-primary/10 hover:bg-primary/20 text-primary",
            )}
          >
            {newChatConfirm ? "Confirm?" : "New Chat"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndChatClick}
            className={cn(
              "h-8 text-xs rounded-full px-3.5 font-medium transition-all duration-200",
              endChatConfirm
                ? "bg-destructive hover:bg-destructive/90 text-white border-transparent"
                : "border-destructive/30 hover:border-destructive/60 hover:bg-destructive/10 text-destructive",
            )}
          >
            {endChatConfirm ? "Confirm?" : "End Chat"}
          </Button>
        </div>
      </div>

      <MessageInput
        onSend={handleSend}
        disabled={isDisconnected || isUploading}
        onTyping={handleTyping}
        onAttachClick={handleAttachClick}
        onSendMediaDirectly={handleSendMediaDirectly}
      />

      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}
