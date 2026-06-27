"use client";

import { useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useMatchStore } from "./match-store";
import { MatchRadar } from "./match-radar";
import { StrangerChatScreen } from "./stranger-chat-screen";
import { ArrowLeft, Square, Users, Zap } from "lucide-react";
import { useWebSocket } from "@/components/providers";
import { useAuth } from "@/components/app-shell/auth-context";
import { useGetActiveSession, useMatchOnlineCount } from "@/src/api/hooks/useMatch";
import { useLobbyUsers } from "@/src/api/hooks/useProfile";
import type { StrangerMessage } from "./types";
import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";

function getSessionDb(sessionId: string) {
  const dbName = `random-chat-${sessionId}`;
  const sdb = new Dexie(dbName);
  sdb.version(1).stores({
    messages: "id, timestamp",
  });
  return sdb;
}

const saveSessionMessage = async (sessionId: string, msg: any) => {
  try {
    const sdb = getSessionDb(sessionId);
    await sdb.table("messages").put(msg);
  } catch (err) {
    console.error("Failed to save session message:", err);
  }
};

const clearSessionDb = async (sessionId: string) => {
  try {
    await Dexie.delete(`random-chat-${sessionId}`);
  } catch (err) {
    console.error("Failed to clear session DB:", err);
  }
};

export function MatchDashboard({
  onGoToLobby,
  onStart,
}: {
  onGoToLobby?: () => void;
  onStart?: () => void;
}) {
  const {
    status,
    stranger,
    searchTime,
    setStatus,
    setStranger,
    clearMessages,
    resetMatch,
    incrementSearchTime,
    setPartnerReconnecting,
  } = useMatchStore();

  const { user } = useAuth();
  const { registerHandler, sendEvent } = useWebSocket();
  // True while the local user is the one ending the chat (exit/skip). The backend
  // echoes MATCH_ENDED to BOTH participants, so this lets us ignore our own echo
  // and only show the "stranger left" prompt when the PARTNER ended the chat.
  const selfEndedRef = useRef(false);

  // API queries
  const { data: activeSession } = useGetActiveSession();
  // Live "present users" counts for the two landing cards. Quick Chat shows the
  // matchmaking pool (live via /topic/match/online); Live Lobby shows the online
  // lobby roster (same source the lobby screen counts).
  const { data: matchOnlineCount = 0 } = useMatchOnlineCount();
  const { data: lobbyUsers = [] } = useLobbyUsers();
  const lobbyOnlineCount = lobbyUsers.length;

  // Restore active session on mount
  useEffect(() => {
    if (activeSession && status === "idle") {
      setStranger({
        // Keep the partner anonymous — never reveal their real username/name.
        id: activeSession.partner?.id || "stranger",
        anonymousName: "Stranger",
        interests: Array.from(activeSession.partner?.interests || []),
        chatId: activeSession.chatId,
        sessionId: activeSession.id,
        isGuest: activeSession.partner?.isGuest || false,
      });
      setStatus("matched");
    }
  }, [activeSession, status, setStranger, setStatus]);

  // Sync search time counter
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "searching") {
      interval = setInterval(() => {
        incrementSearchTime();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, incrementSearchTime]);

  // General WebSocket matchmaking event handlers
  useEffect(() => {
    if (!registerHandler) return;

    const unbindWaiting = registerHandler("WAITING", () => {
      console.log("[Matchmaker] WAITING received");
      setStatus("searching");
    });

    const unbindMatchFound = registerHandler("MATCH_FOUND", (payload: any) => {
      console.log("[Matchmaker] MATCH_FOUND received:", payload);
      if (payload) {
        setStranger({
          // Keep the partner anonymous — never reveal their real username/name.
          id: payload.partner?.id || "stranger",
          anonymousName: "Stranger",
          interests: Array.from(payload.partner?.interests || []),
          chatId: payload.sessionId,
          sessionId: payload.sessionId,
          isGuest: payload.partner?.isGuest || false,
        });
        setStatus("matched");
        setPartnerReconnecting(false);
        clearMessages();
      }
    });

    // Partner's socket dropped but the server is holding the session open during the
    // reconnect grace — surface a transient "reconnecting…" banner instead of ending.
    const unbindReconnecting = registerHandler("STRANGER_RECONNECTING", () => {
      console.log("[Matchmaker] STRANGER_RECONNECTING received");
      setPartnerReconnecting(true);
    });

    // Partner came back within the grace window — clear the banner, chat continues.
    const unbindReconnected = registerHandler("STRANGER_RECONNECTED", () => {
      console.log("[Matchmaker] STRANGER_RECONNECTED received");
      setPartnerReconnecting(false);
    });

    const unbindDisconnect = registerHandler("STRANGER_DISCONNECTED", (payload: any) => {
      console.log("[Matchmaker] STRANGER_DISCONNECTED received");
      if (stranger?.sessionId) {
        clearSessionDb(stranger.sessionId);
      }
      setPartnerReconnecting(false);
      setStatus("disconnected");
    });

    const unbindMatchEnded = registerHandler("MATCH_ENDED", (payload: any) => {
      console.log("[Matchmaker] MATCH_ENDED received");
      if (selfEndedRef.current) {
        // We initiated the exit/skip — local handlers already set the right state
        // (idle or searching). Just consume our own echo.
        selfEndedRef.current = false;
        return;
      }
      // The PARTNER left (exited or jumped to a new chat). Keep the user here and
      // surface the rematch prompt instead of dropping them back to Connect.
      setPartnerReconnecting(false);
      setStatus("disconnected");
    });

    return () => {
      unbindWaiting();
      unbindMatchFound();
      unbindReconnecting();
      unbindReconnected();
      unbindDisconnect();
      unbindMatchEnded();
    };
  }, [
    registerHandler,
    stranger?.sessionId,
    setStranger,
    setStatus,
    clearMessages,
    resetMatch,
    setPartnerReconnecting,
  ]);

  // Session-specific WebSocket message event handlers
  useEffect(() => {
    if (!registerHandler || !stranger?.sessionId) return;
    const sessionId = stranger.sessionId;

    const unbindMsgReceived = registerHandler("MESSAGE_RECEIVED", (payload: any) => {
      console.log("[Matchmaker] MESSAGE_RECEIVED received:", payload);
      if (payload) {
        saveSessionMessage(sessionId, {
          id: payload.id,
          content: payload.content,
          timestamp: payload.timestamp,
          time: new Date(payload.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isFromStranger: true,
        });
      }
    });

    const unbindGifReceived = registerHandler("GIF_RECEIVED", (payload: any) => {
      console.log("[Matchmaker] GIF_RECEIVED received:", payload);
      if (payload) {
        saveSessionMessage(sessionId, {
          id: payload.id,
          content: "",
          timestamp: payload.timestamp,
          time: new Date(payload.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isFromStranger: true,
          media: payload.media ? { ...payload.media, isBlurred: true } : undefined,
        });
      }
    });

    const unbindImgReceived = registerHandler("IMAGE_RECEIVED", (payload: any) => {
      console.log("[Matchmaker] IMAGE_RECEIVED received:", payload);
      if (payload) {
        saveSessionMessage(sessionId, {
          id: payload.id,
          content: "",
          timestamp: payload.timestamp,
          time: new Date(payload.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isFromStranger: true,
          media: payload.media ? { ...payload.media, isBlurred: true } : undefined,
        });
      }
    });

    const unbindImgReq = registerHandler("IMAGE_REQUEST_RECEIVED", (payload: any) => {
      console.log("[Matchmaker] IMAGE_REQUEST_RECEIVED received");
      saveSessionMessage(sessionId, {
        id: `req-${Date.now()}`,
        content: "__IMAGE_REQUEST__",
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isFromStranger: true,
      });
    });

    const unbindImgAccepted = registerHandler("IMAGE_REQUEST_ACCEPTED", (payload: any) => {
      console.log("[Matchmaker] IMAGE_REQUEST_ACCEPTED received");
      saveSessionMessage(sessionId, {
        id: `acc-${Date.now()}`,
        content: "__IMAGE_ACCEPT__",
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isFromStranger: true,
      });
    });

    const unbindImgDeclined = registerHandler("IMAGE_REQUEST_DECLINED", (payload: any) => {
      console.log("[Matchmaker] IMAGE_REQUEST_DECLINED received");
      saveSessionMessage(sessionId, {
        id: `rej-${Date.now()}`,
        content: "__IMAGE_REJECT__",
        timestamp: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isFromStranger: true,
      });
    });

    return () => {
      unbindMsgReceived();
      unbindGifReceived();
      unbindImgReceived();
      unbindImgReq();
      unbindImgAccepted();
      unbindImgDeclined();
    };
  }, [registerHandler, stranger?.sessionId]);

  // Reactive message list from IndexedDB using useLiveQuery
  const messages =
    useLiveQuery(async () => {
      if (!stranger?.sessionId) return [];
      const sdb = getSessionDb(stranger.sessionId);
      return await sdb.table("messages").orderBy("timestamp").toArray();
    }, [stranger?.sessionId]) || [];

  const formatMsg = (id: string, content: string, isFromStranger: boolean, media?: any) => {
    const timestamp = Date.now();
    const time = new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      id,
      content,
      timestamp,
      time,
      isFromStranger,
      media,
    };
  };

  const startSearch = () => {
    setStatus("searching");
    clearMessages();
    setStranger(null);
    sendEvent("START_MATCHING", {});
  };

  const stopSearch = () => {
    sendEvent("EXIT_CHAT", {});
    resetMatch();
  };

  const handleSendMessage = useCallback(
    (content: string, type: "text" | "image" = "text", media?: any) => {
      if (!stranger?.sessionId) return;
      const sessionId = stranger.sessionId;

      if (content === "__IMAGE_REQUEST__") {
        sendEvent("REQUEST_IMAGE", {});
        saveSessionMessage(sessionId, formatMsg(`req-${Date.now()}`, "__IMAGE_REQUEST__", false));
      } else if (content === "__IMAGE_ACCEPT__") {
        sendEvent("ACCEPT_IMAGE_REQUEST", {});
      } else if (content === "__IMAGE_REJECT__") {
        sendEvent("DECLINE_IMAGE_REQUEST", {});
      } else {
        if (type === "image") {
          const isGif = media?.url?.includes("giphy") || media?.url?.includes(".gif");
          const mediaPayload = media ? { ...media, isBlurred: true } : undefined;
          if (isGif) {
            sendEvent("SEND_GIF", { media: mediaPayload });
            saveSessionMessage(sessionId, formatMsg(`gif-${Date.now()}`, "", false, mediaPayload));
          } else {
            sendEvent("SEND_IMAGE", { media: mediaPayload });
            saveSessionMessage(sessionId, formatMsg(`img-${Date.now()}`, "", false, mediaPayload));
          }
        } else {
          sendEvent("SEND_MESSAGE", { content });
          saveSessionMessage(sessionId, formatMsg(`msg-${Date.now()}`, content, false));
        }
      }
    },
    [stranger, sendEvent],
  );

  const handleSkip = () => {
    selfEndedRef.current = true;
    if (stranger?.sessionId) {
      clearSessionDb(stranger.sessionId);
    }
    setStatus("searching");
    setStranger(null);
    clearMessages();
    sendEvent("NEW_CHAT", {});
  };

  const handleReport = () => {
    handleSkip();
  };

  const handleBlock = () => {
    handleExit();
  };

  const handleExit = () => {
    selfEndedRef.current = true;
    if (stranger?.sessionId) {
      sendEvent("EXIT_CHAT", {});
      clearSessionDb(stranger.sessionId);
    }
    resetMatch();
  };

  // "Stranger left" prompt actions (shown when the partner ends the chat).
  const handleFindAnother = () => {
    if (stranger?.sessionId) clearSessionDb(stranger.sessionId);
    startSearch();
  };

  const handleBackToConnect = () => {
    if (stranger?.sessionId) clearSessionDb(stranger.sessionId);
    resetMatch();
  };

  const formatSearchTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRevealMedia = async (messageId: string) => {
    if (!stranger?.sessionId) return;
    try {
      const sdb = getSessionDb(stranger.sessionId);
      const msg = await sdb.table("messages").get(messageId);
      if (msg && msg.media) {
        msg.media.isBlurred = false;
        await sdb.table("messages").put(msg);
      }
    } catch (err) {
      console.error("Failed to reveal media:", err);
    }
  };

  const handleHideMedia = async (messageId: string) => {
    if (!stranger?.sessionId) return;
    try {
      const sdb = getSessionDb(stranger.sessionId);
      const msg = await sdb.table("messages").get(messageId);
      if (msg && msg.media) {
        msg.media.isBlurred = true;
        await sdb.table("messages").put(msg);
      }
    } catch (err) {
      console.error("Failed to hide media:", err);
    }
  };

  // Render chat screen when matched or disconnected
  if ((status === "matched" || status === "disconnected") && stranger) {
    return (
      <>
        <StrangerChatScreen
          stranger={stranger}
          messages={messages}
          onSendMessage={handleSendMessage}
          onSkip={handleSkip}
          onReport={handleReport}
          onBlock={handleBlock}
          onExit={handleExit}
          onRevealMedia={handleRevealMedia}
          onHideMedia={handleHideMedia}
        />

        {/* Stranger-left prompt — keep the user here with a clear choice instead of
            silently dropping them back to the Connect landing. */}
        <AnimatePresence>
          {status === "disconnected" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl text-center"
              >
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                  <Users className="h-7 w-7" />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  {stranger.anonymousName} left the chat
                </h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Your chat partner has left. Want to meet someone new?
                </p>

                <div className="mt-6 flex flex-col gap-2.5">
                  <Button
                    onClick={handleFindAnother}
                    className="w-full h-12 rounded-2xl gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-semibold text-base shadow-lg shadow-primary/25"
                  >
                    <Zap className="h-5 w-5" />
                    Find another stranger
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBackToConnect}
                    className="w-full h-12 rounded-2xl gap-2 font-semibold text-base"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Back to Connect
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Searching view — radar + live status
  if (status === "searching") {
    return (
      <div className="flex flex-col h-full overflow-y-auto pb-6 md:pb-4">
        <div className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col items-center gap-1">
              <MatchRadar isSearching />
              <AnimatePresence mode="wait">
                <motion.div
                  key="searching"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Zap className="h-4 w-4 animate-pulse" />
                    <span className="font-medium">Searching for a match...</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Time elapsed: {formatSearchTime(searchTime)}
                  </span>
                  <Button
                    variant="outline"
                    onClick={stopSearch}
                    className="mt-2 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    <Square className="h-4 w-4" />
                    Cancel Search
                  </Button>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Live "X online" badge shown on each Connect card (pulsing green dot).
  const OnlinePill = ({ count, label }: { count: number; label: string }) => (
    <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <span>
        {count.toLocaleString()} {label}
      </span>
    </div>
  );

  // Idle landing — "Connect" entry screen (one-tap chooser)
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="w-full max-w-md mx-auto px-4 pt-1 pb-8 space-y-4">
        <p className="text-sm text-muted-foreground">Start a conversation in one tap</p>

        {/* Quick Chat — anonymous matchmaking */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl p-5 bg-linear-to-br from-violet-800 to-indigo-800 shadow-lg shadow-indigo-950/40 border border-indigo-700/30"
        >
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Zap className="h-6 w-6 text-white" fill="currentColor" />
            </div>
            <div className="pt-0.5">
              <h2 className="text-xl font-bold text-white">Quick Chat</h2>
              <p className="text-sm text-white/80 mt-1 leading-snug">
                Instantly match with someone anonymously.
              </p>
              <OnlinePill count={matchOnlineCount} label="online to match" />
            </div>
          </div>
          <Button
            onClick={() => {
              onStart?.();
              startSearch();
            }}
            className="w-full mt-4 h-12 rounded-2xl bg-white text-violet-700 hover:bg-white/90 font-semibold text-base shadow-sm"
          >
            Start
          </Button>
        </motion.div>

        {/* Live Lobby — see who's online */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          className="rounded-3xl p-5 bg-gradient-to-br from-emerald-900 to-emerald-950 border border-emerald-700/30 shadow-lg shadow-emerald-950/40"
        >
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="pt-0.5">
              <h2 className="text-xl font-bold text-white">Live Lobby</h2>
              <p className="text-sm text-white/70 mt-1 leading-snug">
                See who&apos;s online and start chatting.
              </p>
              <OnlinePill count={lobbyOnlineCount} label="online now" />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onGoToLobby}
            className="w-full mt-4 h-12 rounded-2xl bg-transparent border-white/20 text-white hover:bg-white/10 font-semibold text-base"
          >
            Go to Lobby
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
