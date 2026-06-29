"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  Camera,
  StopCircle,
  Headphones,
  Search,
  Film,
  Sticker,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildGiphyUrl } from "@/lib/giphy";
import { isBlockedGifQuery, isCleanGifRating } from "@/lib/moderation/gif-filter";
import { useChatPrefs } from "@/lib/chat/chat-prefs-store";
import { replyHasThumbnail, replyPreviewLabel } from "@/lib/chat/reply-preview";
import type { ReplyTo, PendingAttachment } from "./types";

interface MessageInputProps {
  onSend: (content: string) => void;
  replyTo?: ReplyTo | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  onTyping?: (isTyping: boolean) => void;
  onRecordingChange?: (recording: "audio" | null) => void;
  onAttachClick?: (type: "image" | "video" | "audio" | "document" | "camera") => void;
  pendingAttachment?: PendingAttachment | null;
  onCancelAttachment?: () => void;
  onRecordComplete?: (file: File) => void;
  onSendMediaDirectly?: (url: string, type: "image" | "sticker") => void;
  /** Text to repopulate the composer with (e.g. a moderation-rejected message to edit). */
  restoreDraft?: string | null;
  /** Called once `restoreDraft` has been consumed so the parent can clear it. */
  onRestoreConsumed?: () => void;
}

const attachmentOptions = [
  { id: "document", icon: FileText, label: "Document", color: "bg-[#7f66ff]" },
  { id: "camera", icon: Camera, label: "Camera", color: "bg-[#ec407a]" },
  { id: "image", icon: ImageIcon, label: "Gallery", color: "bg-[#ac44cf]" },
  { id: "video", icon: Video, label: "Video", color: "bg-[#f44336]" },
  { id: "audio", icon: Headphones, label: "Audio", color: "bg-[#ff9800]" },
];

const emojiCategories = [
  {
    name: "Smileys & Emotion",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😇",
      "🙂",
      "🙃",
      "😉",
      "😌",
      "😍",
      "🥰",
      "😘",
      "😗",
      "😙",
      "😚",
      "😋",
      "😛",
      "😝",
      "😜",
      "🤪",
      "🤨",
      "🧐",
      "🤓",
      "😎",
      "🥸",
      "🤩",
      "🥳",
      "😏",
      "😒",
      "😞",
      "😔",
      "😟",
      "😕",
      "🙁",
      "☹️",
      "😣",
      "😖",
      "😫",
      "😩",
      "🥺",
      "😢",
      "😭",
      "😤",
      "😠",
      "😡",
      "🤬",
      "🤯",
      "😳",
      "🥵",
      "🥶",
      "😱",
      "😨",
      "😰",
      "😥",
      "😓",
      "🤗",
      "🤔",
      "🫣",
      "🤭",
      "🤫",
      "🤥",
      "😶",
      "😐",
      "😑",
      "😬",
      "🫠",
      "🙄",
      "😯",
      "😦",
      "😧",
      "😮",
      "😲",
      "🥱",
      "😴",
      "🤤",
      "😪",
      "😵",
      "🤐",
      "🥴",
      "🤢",
      "🤮",
      "🤧",
      "😷",
      "🤒",
      "🤕",
    ],
  },
  {
    name: "Gestures & Body",
    emojis: [
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "👌",
      "🤌",
      "🤏",
      "✌️",
      "🤞",
      "🫰",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "👍",
      "👎",
      "✊",
      "👊",
      "🤛",
      "🤜",
      "👏",
      "🙌",
      "👐",
      "🫶",
      "🤲",
      "🤝",
      "🙏",
      "✍️",
      "💅",
      "🤳",
    ],
  },
  {
    name: "Hearts & Symbols",
    emojis: [
      "❤️",
      "🩷",
      "🧡",
      "💛",
      "💚",
      "💙",
      "🩵",
      "💜",
      "🤎",
      "🖤",
      "🩶",
      "🤍",
      "💔",
      "❤️‍🔥",
      "❤️‍🩹",
      "❣️",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💘",
      "💝",
      "💟",
      "💌",
      "💤",
      "💢",
      "💣",
      "💥",
      "💦",
      "💫",
      "💬",
      "💭",
      "🗯️",
    ],
  },
  {
    name: "Food & Activity",
    emojis: [
      "🍏",
      "🍎",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🫐",
      "🍍",
      "🥑",
      "🥦",
      "🍕",
      "🍔",
      "🍟",
      "🌭",
      "🍿",
      "🍩",
      "🍪",
      "🎂",
      "🧁",
      "🍫",
      "🍬",
      "🍭",
      "🍦",
      "🍷",
      "🍺",
      "🍻",
      "🥂",
      "🥃",
      "☕",
      "🥤",
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🥎",
      "🎾",
      "🏐",
      "🏉",
      "🎱",
      "🏓",
      "🎮",
      "🕹️",
      "👾",
      "🎯",
    ],
  },
];

const stickerPacks = [
  {
    id: "faces",
    name: "Cute Faces",
    icon: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=smile",
    stickers: [
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=joy",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=smile",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=laugh",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=cool",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=wink",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=tongue",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=heart-eyes",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=love",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=sad",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=angry",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=shock",
      "https://api.dicebear.com/7.x/fun-emoji/svg?seed=scared",
    ],
  },
  {
    id: "robots",
    name: "Robots",
    icon: "https://api.dicebear.com/7.x/bottts/svg?seed=bot1",
    stickers: [
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot1",
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot2",
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot3",
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot4",
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot5",
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot6",
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot7",
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot8",
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot9",
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot10",
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot11",
      "https://api.dicebear.com/7.x/bottts/svg?seed=bot12",
    ],
  },
  {
    id: "cats",
    name: "Cute Cats",
    icon: "https://robohash.org/cat3.png?set=set4",
    stickers: [
      "https://robohash.org/cat1.png?set=set4",
      "https://robohash.org/cat2.png?set=set4",
      "https://robohash.org/cat3.png?set=set4",
      "https://robohash.org/cat4.png?set=set4",
      "https://robohash.org/cat5.png?set=set4",
      "https://robohash.org/cat6.png?set=set4",
      "https://robohash.org/cat7.png?set=set4",
      "https://robohash.org/cat8.png?set=set4",
      "https://robohash.org/cat9.png?set=set4",
      "https://robohash.org/cat10.png?set=set4",
      "https://robohash.org/cat11.png?set=set4",
      "https://robohash.org/cat12.png?set=set4",
    ],
  },
  {
    id: "adventurers",
    name: "Heroes",
    icon: "https://api.dicebear.com/7.x/adventurer/svg?seed=adv1",
    stickers: [
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv1",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv2",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv3",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv4",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv5",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv6",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv7",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv8",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv9",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv10",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv11",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=adv12",
    ],
  },
  {
    id: "doodles",
    name: "Doodles",
    icon: "https://api.dicebear.com/7.x/croodles/svg?seed=doodle5",
    stickers: [
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle1",
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle2",
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle3",
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle4",
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle5",
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle6",
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle7",
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle8",
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle9",
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle10",
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle11",
      "https://api.dicebear.com/7.x/croodles/svg?seed=doodle12",
    ],
  },
];

export function MessageInput({
  onSend,
  replyTo,
  onCancelReply,
  disabled = false,
  onTyping,
  onRecordingChange,
  onAttachClick,
  pendingAttachment,
  onCancelAttachment,
  onRecordComplete,
  onSendMediaDirectly,
  restoreDraft,
  onRestoreConsumed,
}: MessageInputProps) {
  const enterToSend = useChatPrefs((s) => s.enterToSend);
  const [message, setMessage] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // WhatsApp-like Picker States
  const [activePickerTab, setActivePickerTab] = useState<"emoji" | "gif" | "sticker">("emoji");
  const [emojiSearch, setEmojiSearch] = useState("");
  const [activeStickerPack, setActiveStickerPack] = useState<string>("faces");
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<string[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [gifOffset, setGifOffset] = useState(0);
  const [hasMoreGifs, setHasMoreGifs] = useState(true);
  // True when the current GIF search was refused for referencing explicit content.
  const [gifBlocked, setGifBlocked] = useState(false);
  const isLoadingRef = useRef(false);

  // Reset pagination when search query changes
  useEffect(() => {
    setGifOffset(0);
    setGifs([]);
    setHasMoreGifs(true);
    isLoadingRef.current = true; // Block scroll triggers while first page is loading
  }, [gifQuery]);

  // Autofocus input when chat input opens or disabled changes
  useEffect(() => {
    if (!disabled && inputRef.current) {
      // Focus synchronously to capture user gesture event chain for mobile virtual keyboards
      inputRef.current.focus();

      // Short delay fallback for slower layout rendering
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [disabled]);

  // Auto-resize textarea height when message text changes or is cleared
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`;
    }
  }, [message]);

  // Repopulate the composer with a hard-rejected (non-clean) message so the user can
  // edit it. Only fill an EMPTY input so a freshly-typed draft isn't clobbered; place
  // the cursor at the end and focus for immediate editing. Consume it so the parent
  // can clear the trigger and a later rejection can restore again.
  useEffect(() => {
    if (!restoreDraft) return;
    const current = inputRef.current?.value ?? message;
    if (!current.trim()) {
      setMessage(restoreDraft);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          const end = el.value.length;
          el.setSelectionRange(end, end);
        }
      });
    }
    onRestoreConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreDraft]);

  // Debounced GIF search effect
  useEffect(() => {
    if (!showEmojiPicker || activePickerTab !== "gif") return;

    let active = true;

    // Refuse explicit searches outright — never query Giphy for them.
    if (isBlockedGifQuery(gifQuery)) {
      setGifBlocked(true);
      setGifs([]);
      setHasMoreGifs(false);
      setLoadingGifs(false);
      isLoadingRef.current = false;
      return;
    }
    setGifBlocked(false);

    const fetchGifs = async () => {
      if (active) {
        setLoadingGifs(true);
        isLoadingRef.current = true;
      }

      try {
        const url = buildGiphyUrl(gifQuery, { limit: 16, offset: gifOffset });
        const res = await fetch(url);
        const data = await res.json();
        if (active && data && data.data) {
          // Defense-in-depth: drop any item whose own rating is above our cap, in
          // case the request-level rating filter is ever ignored/bypassed.
          const newUrls = data.data
            .filter((item: any) => isCleanGifRating(item))
            .map((item: any) => item.images.fixed_height.url);
          setGifs((prev) => (gifOffset === 0 ? newUrls : [...prev, ...newUrls]));
          setHasMoreGifs(data.data.length === 16);
        }
      } catch (err) {
        console.error("Error fetching GIFs:", err);
        if (active && gifOffset === 0) {
          // Fallback static high quality animated GIFs
          setGifs([
            "https://media.giphy.com/media/VOPK1LDHoWGm4/giphy.gif",
            "https://media.giphy.com/media/t3s3vE6BHNRG8/giphy.gif",
            "https://media.giphy.com/media/cuPm42CAACU4O2lYOi/giphy.gif",
            "https://media.giphy.com/media/l3q2zVr6cu95nF6O4/giphy.gif",
            "https://media.giphy.com/media/Cmr1YTLao3TRm/giphy.gif",
            "https://media.giphy.com/media/kEKcOWl8RMLde/giphy.gif",
            "https://media.giphy.com/media/ASd0Ukj0y3q1i/giphy.gif",
            "https://media.giphy.com/media/10UUe8ZsLnaqwo/giphy.gif",
          ]);
          setHasMoreGifs(false);
        }
      } finally {
        if (active) {
          setLoadingGifs(false);
          isLoadingRef.current = false;
        }
      }
    };

    const timer = setTimeout(fetchGifs, gifOffset === 0 ? 400 : 50);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [gifQuery, showEmojiPicker, activePickerTab, gifOffset]);

  // Handle scroll pagination for GIF container
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (activePickerTab !== "gif" || isLoadingRef.current || !hasMoreGifs) return;
    const target = e.currentTarget;
    const reachedBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 45;
    if (reachedBottom) {
      isLoadingRef.current = true; // Synchronously guard against repeat triggers
      setGifOffset((prev) => prev + 16);
    }
  };

  // Helper search function for Emojis
  const getFilteredEmojis = () => {
    if (!emojiSearch.trim()) return null;
    const query = emojiSearch.toLowerCase();
    const results: string[] = [];

    emojiCategories.forEach((cat) => {
      if (cat.name.toLowerCase().includes(query)) {
        cat.emojis.forEach((e) => {
          if (!results.includes(e)) results.push(e);
        });
      }
    });

    const keywords: Record<string, string[]> = {
      smile: ["😀", "😃", "😄", "😁", "😆", "😅", "😊", "🙂"],
      laugh: ["😆", "😅", "😂", "🤣"],
      love: ["😍", "🥰", "😘", "❤️", "💕", "💖", "🫶"],
      heart: [
        "❤️",
        "🩷",
        "🧡",
        "💛",
        "💚",
        "💙",
        "🩵",
        "💜",
        "🖤",
        "🩶",
        "🤍",
        "💔",
        "❤️‍🔥",
        "❤️‍🩹",
        "❣️",
      ],
      sad: ["😞", "😔", "😟", "😕", "🙁", "☹️", "🥺", "😢", "😭"],
      angry: ["😤", "😠", "😡", "🤬"],
      hands: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "👍", "👎", "👏", "🙌", "🙏"],
      yes: ["👍", "👌", "✌️", "👏", "🙌"],
      no: ["👎", "👊", "🙅"],
      ok: ["👌", "👍"],
      cool: ["😎", "😏"],
      cry: ["😢", "😭", "😿"],
      fire: ["🔥"],
      party: ["🎉", "🥳"],
      game: ["🎮", "🕹️", "👾", "🎯"],
      food: [
        "🍏",
        "🍎",
        "🍊",
        "🍋",
        "🍌",
        "🍉",
        "🍇",
        "🍓",
        "🫐",
        "🍍",
        "🥑",
        "🥦",
        "🍕",
        "🍔",
        "🍟",
        "🌭",
        "🍿",
      ],
    };

    Object.keys(keywords).forEach((kw) => {
      if (kw.includes(query) || query.includes(kw)) {
        keywords[kw].forEach((e) => {
          if (!results.includes(e)) results.push(e);
        });
      }
    });

    return results.slice(0, 40);
  };

  const handleMessageChange = (val: string) => {
    setMessage(val);
    if (onTyping) {
      if (!isTypingRef.current && val.trim().length > 0) {
        isTypingRef.current = true;
        onTyping(true);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onTyping(false);
      }, 2000);
    }
  };

  const handleSend = useCallback(() => {
    if (message.trim() || pendingAttachment) {
      onSend(message.trim());
      setMessage("");
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTyping?.(false);
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      inputRef.current?.focus();
    }
  }, [message, onSend, onTyping, pendingAttachment]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Respect the user's "Enter is send" preference. When disabled, Enter inserts
    // a newline (default textarea behaviour) and the send button is used instead.
    if (e.key === "Enter" && !e.shiftKey && enterToSend) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        if (onRecordComplete) {
          onRecordComplete(file);
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      onRecordingChange?.("audio");
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    setIsRecording(false);
    onRecordingChange?.(null);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
    }
    setRecordingTime(0);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      if (shouldSend) {
        mediaRecorderRef.current.stop();
      } else {
        const stream = mediaRecorderRef.current.stream;
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const commonEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "🎉"];

  // WhatsApp-style: close the emoji/GIF/sticker picker when clicking anywhere
  // outside it (the picker, the toggle button, and any selected emoji are
  // marked with data-emoji-keep so those clicks don't dismiss it).
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target && target.closest("[data-emoji-keep]")) return;
      setShowEmojiPicker(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showEmojiPicker]);

  // Same WhatsApp-style behaviour for the attachment (+) menu: clicking outside
  // it (or its toggle) closes it.
  useEffect(() => {
    if (!showAttachMenu) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target && target.closest("[data-attach-keep]")) return;
      setShowAttachMenu(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showAttachMenu]);

  const renderPicker = () => {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Category bar (WhatsApp-style): emoji / GIF / sticker — on top */}
        <div className="flex items-center px-3 shrink-0">
          {(
            [
              { id: "emoji", icon: Smile },
              { id: "gif", icon: Film },
              { id: "sticker", icon: Sticker },
            ] as const
          ).map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActivePickerTab(id)}
              type="button"
              className={cn(
                "flex-1 h-9 flex items-center justify-center rounded-full transition-all active:scale-95",
                activePickerTab === id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon
                className="h-5.5 w-5.5"
                fill={activePickerTab === id ? "currentColor" : "none"}
                fillOpacity={activePickerTab === id ? 0.15 : 0}
              />
            </button>
          ))}
        </div>

        {/* Header search bar */}
        {activePickerTab !== "sticker" ? (
          <div className="p-2.5 shrink-0">
            <div className="flex items-center gap-2 bg-black/10 dark:bg-white/6 rounded-full px-3.5 h-9">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder={activePickerTab === "emoji" ? "Search Emojis" : "Search GIFs"}
                value={activePickerTab === "emoji" ? emojiSearch : gifQuery}
                onChange={(e) => {
                  if (activePickerTab === "emoji") {
                    setEmojiSearch(e.target.value);
                  } else {
                    setGifQuery(e.target.value);
                  }
                }}
                className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        ) : (
          <div className="p-2 border-b border-border flex gap-2 bg-muted/30 overflow-x-auto shrink-0 scrollbar-none">
            {stickerPacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setActiveStickerPack(pack.id as any)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all shrink-0",
                  activeStickerPack === pack.id
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-muted text-muted-foreground border-transparent hover:bg-muted/70",
                )}
              >
                <img src={pack.icon} className="w-3.5 h-3.5 object-contain rounded-sm" alt="" />
                {pack.name}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          {/* EMOJI TAB CONTENT */}
          {activePickerTab === "emoji" && (
            <div>
              {getFilteredEmojis() ? (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground px-1 mb-2">
                    Search Results
                  </h4>
                  <div className="grid grid-cols-7 gap-1">
                    {getFilteredEmojis()?.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleMessageChange(message + emoji)}
                        className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-muted rounded-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Popular Quick reaction header row */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-muted-foreground px-1 mb-2">
                      Frequently Used
                    </h4>
                    <div className="grid grid-cols-7 gap-1">
                      {commonEmojis.map((emoji) => (
                        <button
                          key={`popular-${emoji}`}
                          type="button"
                          onClick={() => handleMessageChange(message + emoji)}
                          className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-muted rounded-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  {emojiCategories.map((category) => (
                    <div key={category.name} className="mb-4">
                      <h4 className="text-xs font-semibold text-muted-foreground px-1 mb-2">
                        {category.name}
                      </h4>
                      <div className="grid grid-cols-7 gap-1">
                        {category.emojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleMessageChange(message + emoji)}
                            className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-muted rounded-lg transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* GIF TAB CONTENT */}
          {activePickerTab === "gif" && (
            <div className="space-y-2">
              {gifBlocked ? (
                <div className="flex flex-col items-center justify-center gap-1 py-16 px-6 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    This search isn’t allowed
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    Try a different keyword — explicit content is blocked.
                  </p>
                </div>
              ) : loadingGifs && gifOffset === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : gifs.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                  No GIFs found
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {gifs.map((gifUrl, idx) => (
                      <button
                        key={`${gifUrl}-${idx}`}
                        type="button"
                        onClick={() => {
                          onSendMediaDirectly?.(gifUrl, "image");
                          setShowEmojiPicker(false);
                        }}
                        className="relative h-24 rounded-lg overflow-hidden bg-muted hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                      >
                        <img
                          src={gifUrl}
                          className="w-full h-full object-cover"
                          alt="gif"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                  {loadingGifs && gifOffset > 0 && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                  {!hasMoreGifs && gifs.length > 0 && (
                    <div className="text-center text-[10px] text-muted-foreground py-2">
                      No more GIFs
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STICKERS TAB CONTENT */}
          {activePickerTab === "sticker" && (
            <div className="grid grid-cols-4 gap-2">
              {stickerPacks
                .find((p) => p.id === activeStickerPack)
                ?.stickers.map((stickerUrl, idx) => (
                  <button
                    key={`${stickerUrl}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSendMediaDirectly?.(stickerUrl, "sticker");
                      setShowEmojiPicker(false);
                    }}
                    className="flex items-center justify-center p-1.5 hover:bg-muted rounded-xl transition-all hover:scale-105 active:scale-95 duration-200"
                  >
                    <img
                      src={stickerUrl}
                      className="w-14 h-14 object-contain rounded-md"
                      alt="sticker"
                    />
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card shrink-0 flex flex-col">
      <div className="px-1 pb-6 md:pb-3 pt-3 max-w-3xl mx-auto space-y-2 w-full">
        {/* Reply preview */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <div className="flex-1 min-w-0 border-l-4 border-primary pl-2">
                  <p className="text-xs font-semibold text-primary">{replyTo.senderName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {replyPreviewLabel(replyTo)}
                  </p>
                </div>
                {replyHasThumbnail(replyTo) && (
                  <div className="h-10 w-10 shrink-0 rounded overflow-hidden bg-black/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={replyTo.mediaUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={onCancelReply}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending attachment preview */}
        <AnimatePresence>
          {pendingAttachment && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <div className="flex-1 min-w-0 border-l-4 border-primary pl-2">
                  <p className="text-xs font-semibold text-primary">
                    Attachment ({pendingAttachment.type})
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {pendingAttachment.file.name}
                  </p>
                </div>
                {pendingAttachment.previewUrl && (
                  <div className="h-10 w-10 relative rounded overflow-hidden mr-2 shrink-0">
                    {pendingAttachment.type === "image" ? (
                      <img
                        src={pendingAttachment.previewUrl}
                        alt="Preview"
                        className="object-cover h-full w-full"
                      />
                    ) : pendingAttachment.type === "video" ? (
                      <video
                        src={pendingAttachment.previewUrl}
                        className="object-cover h-full w-full"
                      />
                    ) : null}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={onCancelAttachment}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording UI */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-3 h-3 rounded-full bg-destructive"
                />
                <span className="text-sm font-medium text-destructive">
                  Recording {formatRecordingTime(recordingTime)}
                </span>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => stopRecording(false)}
                  className="text-destructive hover:text-destructive"
                >
                  <StopCircle className="h-5 w-5 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={() => stopRecording(true)}>
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isRecording && (
          <div className="flex items-end gap-0.5 bg-black/10 dark:bg-white/12 border border-card/50 rounded-3xl px-2 py-0.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            {/* Emoji button */}
            <div className="relative shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-emoji-keep
                disabled={disabled}
                className="h-9 w-9 hover:bg-muted-foreground/10 rounded-full flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowAttachMenu(false);
                }}
              >
                <Smile className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>

              {/* Desktop Emoji/GIF/Sticker picker */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    data-emoji-keep
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="hidden sm:flex sm:absolute sm:bottom-full sm:left-0 sm:right-auto sm:mb-3 bg-popover border border-border rounded-2xl shadow-xl w-87.5 h-100 flex-col overflow-hidden z-50"
                  >
                    {renderPicker()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Text input */}
            <div className="flex-1 relative min-h-9 flex items-center">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                disabled={disabled}
                autoFocus={true}
                rows={1}
                className={cn(
                  "w-full resize-none bg-transparent border-0 p-0 text-base focus:ring-0 focus:outline-none",
                  "placeholder:text-muted-foreground max-h-32 min-h-6 py-0.5 px-2 scrollbar-thin transition-colors",
                )}
                style={{
                  height: "auto",
                }}
              />
            </div>

            {/* Attachment button */}
            <div className="relative shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                data-attach-keep
                disabled={disabled}
                className="h-9 w-9 hover:bg-muted-foreground/10 rounded-full flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                onClick={() => {
                  setShowAttachMenu(!showAttachMenu);
                  setShowEmojiPicker(false);
                }}
              >
                <Paperclip className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>

              {/* Attachment menu */}
              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div
                    data-attach-keep
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute bottom-full right-0 mb-3 p-3 bg-popover border border-border rounded-[24px] shadow-xl w-[260px] z-50"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {attachmentOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              setShowAttachMenu(false);
                              onAttachClick?.(option.id as any);
                            }}
                            className="flex flex-col items-center gap-2 p-2 hover:bg-muted/50 rounded-2xl transition-all duration-200"
                          >
                            <div
                              className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform duration-200 hover:scale-105 active:scale-95",
                                option.color,
                              )}
                            >
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-[11px] font-medium text-foreground/90">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Send / Record button */}
            <div className="shrink-0">
              {message.trim() || pendingAttachment ? (
                <Button
                  size="icon"
                  disabled={disabled}
                  className="h-9 w-9 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                  onClick={handleSend}
                >
                  <Send className="h-4.5 w-4.5 text-primary-foreground" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  className="h-9 w-9 hover:bg-muted-foreground/10 rounded-full flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                  onClick={startRecording}
                >
                  <Mic className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Emoji/GIF/Sticker picker (placed below the input text area) */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            data-emoji-keep
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 320, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex sm:hidden w-full bg-popover flex-col overflow-hidden"
          >
            {renderPicker()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
