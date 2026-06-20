"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChatService } from "../services/chat.service"
import { QUERY_KEYS } from "../query-keys"
import { showSuccessToast, showErrorToast } from "../error-handler"
import type { Chat, CreateChatPayload, MuteChatPayload } from "../types"
import { getAccessToken } from "../token-store"
import { useLiveQuery } from "dexie-react-hooks"
import { db, mapResponseToLocalChat, putChatSafely } from "../db"
import { shouldSync } from "../sync-throttle"
import { useEffect, useState, useCallback } from "react"

// Per-chatId sync guards (module-level, survive re-renders and reconnects)
const chatSyncInFlight = new Map<string, boolean>()
const chatSyncLastRan = new Map<string, number>()
const CHAT_SYNC_COOLDOWN_MS = 30_000

/** Custom hook to reactively track token changes. */
export function useAuthToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getAccessToken());

    const handleTokenChange = (e: any) => {
      setToken(e.detail);
    };

    window.addEventListener("auth:token-changed", handleTokenChange);
    return () => {
      window.removeEventListener("auth:token-changed", handleTokenChange);
    };
  }, []);

  return token;
}

/** Returns true when the cached session belongs to a guest user. */
function useIsGuest(): boolean {
  const qc = useQueryClient()
  const me = qc.getQueryData<any>(QUERY_KEYS.AUTH.ME)
  return me?.isGuest === true
}

// ── Query: chat list (Dexie local cache + background API sync) ──────────────────
export function useChats() {
  const isGuest = useIsGuest()
  const token = useAuthToken()

  // 1. Live Query from IndexedDB
  const localChats = useLiveQuery(async () => {
    if (isGuest || typeof window === "undefined" || !getAccessToken()) return [];
    
    const chats = await db.chats.toArray();
    // Sort: pinned first, then by last message timestamp / updatedAt descending
    return chats.sort((a, b) => {
      const aPinned = a.pinned || a.isPinned || false;
      const bPinned = b.pinned || b.isPinned || false;
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      
      const aTime = a.lastMessage?.timestamp || a.updatedAt || "";
      const bTime = b.lastMessage?.timestamp || b.updatedAt || "";
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [isGuest, token]);

  // 2. Background Sync
  useEffect(() => {
    if (isGuest || typeof window === "undefined" || !token) return;

    let active = true;
    const syncChats = async () => {
      if (!shouldSync("chats:list")) return;
      try {
        const chats = await ChatService.getChats();
        if (!active) return;

        // Bulk put in transaction
        await db.transaction("rw", db.chats, async () => {
          for (const c of chats) {
            await putChatSafely(c);
          }
        });
      } catch (err: any) {
        console.warn("[Dexie Sync] Error syncing chats:", err?.message || err, err);
      }
    };

    syncChats();

    return () => {
      active = false;
    };
  }, [isGuest, token]);

  return {
    data: localChats || [],
    isLoading: localChats === undefined,
  };
}

// ── Query: single chat (Dexie local cache + background API sync) ────────────────
export function useChat(chatId: string) {
  const token = useAuthToken()

  const localChat = useLiveQuery(() => {
    if (!chatId) return undefined;
    return db.chats.get(chatId);
  }, [chatId]);

  useEffect(() => {
    if (!chatId || !token) return;

    // Guard: skip if already syncing this chat or synced recently
    if (chatSyncInFlight.get(chatId)) return;
    const lastRan = chatSyncLastRan.get(chatId) || 0;
    if (Date.now() - lastRan < CHAT_SYNC_COOLDOWN_MS) return;

    let active = true;
    const syncSingleChat = async () => {
      if (chatSyncInFlight.get(chatId)) return;
      chatSyncInFlight.set(chatId, true);
      chatSyncLastRan.set(chatId, Date.now());
      try {
        const c = await ChatService.getChatById(chatId);
        if (!active) return;
        await putChatSafely(c);
      } catch (err: any) {
        console.warn("[Dexie Sync] Error syncing single chat:", err?.message || err, err);
      } finally {
        chatSyncInFlight.set(chatId, false);
      }
    };

    syncSingleChat();

    return () => {
      active = false;
    };
  }, [chatId, token]);

  return {
    data: localChat,
    isLoading: localChat === undefined && Boolean(chatId),
  };
}

// ── Query: search chats ───────────────────────────────────────────────────────
export function useSearchChats(query: string) {
  return useQuery({
    queryKey: QUERY_KEYS.CHATS.SEARCH(query),
    queryFn: () => ChatService.searchChats(query),
    enabled: query.trim().length > 0,
    staleTime: 30 * 1000,
  })
}

// ── Mutation: create chat ─────────────────────────────────────────────────────
export function useCreateChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateChatPayload) => ChatService.createChat(payload),
    onSuccess: async (newChat) => {
      await putChatSafely(newChat);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
    },
    onError: showErrorToast,
  })
}

/**
 * Get-or-create a 1:1 chat with a user. Reuses an existing private chat (found in
 * the local Dexie cache) instead of creating a duplicate; only calls createChat
 * when none exists locally (the backend also dedups as the server-side guarantee).
 * Use this for "Message" actions (news/feed, discover, profile) so two users never
 * end up with multiple chat ids.
 */
export function useOpenOrCreateChat() {
  const createChat = useCreateChat()
  return useCallback(
    async (targetUserId: string): Promise<Chat> => {
      if (!targetUserId) throw new Error("targetUserId is required")
      try {
        const chats = await db.chats.toArray()
        const existing = chats.find((c: any) => {
          const isGroup = c.chatType === "GROUP" || c.type === "group"
          if (isGroup) return false
          return (
            c.otherUser?.id === targetUserId ||
            (c.participants || []).some((p: any) => p?.id === targetUserId)
          )
        })
        if (existing) return existing as unknown as Chat
      } catch {
        /* Dexie read failed — fall back to create (backend dedups anyway). */
      }
      return await createChat.mutateAsync({ participantId: targetUserId })
    },
    [createChat],
  )
}

// ── Mutation: delete chat ─────────────────────────────────────────────────────
export function useDeleteChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.deleteChat(chatId),
    onSuccess: async (_data, chatId) => {
      // 1. Remove from local Dexie database instantly
      await db.transaction("rw", [db.chats, db.messages, db.sync_state], async () => {
        await db.chats.delete(chatId);
        await db.messages.where("chatId").equals(chatId).delete();
        await db.sync_state.delete(chatId);
      });

      // 2. Clear QueryClient caches
      queryClient.setQueryData<any[]>(QUERY_KEYS.CHATS.LIST, (oldChats) => {
        if (!oldChats) return oldChats
        return oldChats.filter((c) => c.id !== chatId)
      })
      queryClient.removeQueries({ queryKey: QUERY_KEYS.CHATS.DETAIL(chatId) })
      queryClient.removeQueries({ queryKey: QUERY_KEYS.MESSAGES.LIST(chatId) })

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      }, 500)

      showSuccessToast("Conversation deleted")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: archive chat ────────────────────────────────────────────────────
export function useArchiveChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.archiveChat(chatId),
    onSuccess: async (_data, chatId) => {
      await db.chats.update(chatId, { archived: true, isArchived: true });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Conversation archived")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: unarchive chat ──────────────────────────────────────────────────
export function useUnarchiveChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.unarchiveChat(chatId),
    onSuccess: async (_data, chatId) => {
      await db.chats.update(chatId, { archived: false, isArchived: false });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Conversation unarchived")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: pin chat ────────────────────────────────────────────────────────
export function usePinChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.pinChat(chatId),
    onSuccess: async (_data, chatId) => {
      await db.chats.update(chatId, { pinned: true, isPinned: true });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Conversation pinned")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: unpin chat ──────────────────────────────────────────────────────
export function useUnpinChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.unpinChat(chatId),
    onSuccess: async (_data, chatId) => {
      await db.chats.update(chatId, { pinned: false, isPinned: false });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Conversation unpinned")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: mute chat ───────────────────────────────────────────────────────
export function useMuteChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ chatId, payload }: { chatId: string; payload: MuteChatPayload }) =>
      ChatService.muteChat(chatId, payload),
    onSuccess: async (_data, { chatId }) => {
      await db.chats.update(chatId, { muted: true, isMuted: true });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Notifications muted")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: unmute chat ─────────────────────────────────────────────────────
export function useUnmuteChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.unmuteChat(chatId),
    onSuccess: async (_data, chatId) => {
      await db.chats.update(chatId, { muted: false, isMuted: false });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Notifications unmuted")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: clear chat ──────────────────────────────────────────────────────
export function useClearChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.clearChat(chatId),
    onSuccess: async (_data, chatId) => {
      await db.transaction("rw", [db.messages, db.sync_state], async () => {
        await db.messages.where("chatId").equals(chatId).delete();
        await db.sync_state.delete(chatId);
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MESSAGES.LIST(chatId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
      showSuccessToast("Chat cleared")
    },
    onError: showErrorToast,
  })
}

// ── Mutation: mark chat as read ───────────────────────────────────────────────
export function useMarkChatAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (chatId: string) => ChatService.markAsRead(chatId),
    onSuccess: async (_data, chatId) => {
      await db.chats.update(chatId, { unreadCount: 0 });
      queryClient.setQueryData<Chat[]>(QUERY_KEYS.CHATS.LIST, (oldChats) => {
        if (!oldChats) return oldChats
        return oldChats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
      })
      queryClient.setQueryData<Chat>(QUERY_KEYS.CHATS.DETAIL(chatId), (oldChat) => {
        if (!oldChat) return oldChat
        return { ...oldChat, unreadCount: 0 }
      })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS.LIST })
    },
    onError: showErrorToast,
  })
}
