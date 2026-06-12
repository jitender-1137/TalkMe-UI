/**
 * Central registry of every API endpoint.
 * Components and services must NEVER hard-code URL strings.
 */
export const ENDPOINTS = {
  // ── Auth (AuthController) ──────────────────────────────────────────────────
  AUTH: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
    UPDATE_PROFILE: "/auth/me",
    SESSIONS: "/auth/sessions",
    REVOKE_SESSION: (sessionId: string) => `/auth/sessions/${sessionId}`,
    REVOKE_ALL_SESSIONS: "/auth/sessions/revoke-all",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    CHANGE_PASSWORD: "/auth/change-password",
    VERIFY_EMAIL: "/auth/verify-email", // kept for compatibility
  },

  // ── Users (UserController) ─────────────────────────────────────────────────
  USERS: {
    PROFILE: "/users/me",
    UPDATE_PROFILE: "/users/me",
    AVATAR: "/users/me/avatar",
    SEARCH: "/users/search",
    BY_ID: (id: string) => `/users/${id}`,
    BLOCK: (id: string) => `/users/${id}/block`,
    UNBLOCK: (id: string) => `/users/${id}/block`,
    BLOCKED: "/users/blocked",
    REPORT: (id: string) => `/users/${id}/report`,
    POSTS: (id: string) => `/users/${id}/posts`,
    PROFILE_BY_ID: (id: string) => `/users/${id}/profile`,
    MUTUAL_FRIENDS: (id: string) => `/users/${id}/mutual-friends`,
  },

  // ── Contacts / Friends (FriendController) ──────────────────────────────────
  CONTACTS: {
    LIST: "/friends",
    REQUESTS: "/friends/requests",
    ADD: "/friends/requests",
    REMOVE: (id: string) => `/friends/${id}`,
    ACCEPT: (id: string) => `/friends/requests/${id}/accept`,
    DECLINE: (id: string) => `/friends/requests/${id}/decline`,
    CANCEL: (id: string) => `/friends/requests/${id}/cancel`,
    BLOCK: (id: string) => `/friends/block/${id}`,
    UNBLOCK: (id: string) => `/friends/block/${id}`,
    BY_ID: (id: string) => `/friends`, // fallback
  },

  // ── Chats (ChatController) ─────────────────────────────────────────────────
  CHATS: {
    LIST: "/chats",
    CREATE: "/chats",
    BY_ID: (id: string) => `/chats/${id}`,
    DELETE: (id: string) => `/chats/${id}`,
    ARCHIVE: (id: string) => `/chats/${id}/archive`,
    UNARCHIVE: (id: string) => `/chats/${id}/archive`, // backend uses PUT with ?archive=false
    PIN: (id: string) => `/chats/${id}/pin`,
    UNPIN: (id: string) => `/chats/${id}/pin`, // backend uses PUT with ?pin=false
    MUTE: (id: string) => `/chats/${id}/mute`,
    UNMUTE: (id: string) => `/chats/${id}/mute`, // backend uses PUT with ?mute=false
    CLEAR: (id: string) => `/chats/${id}/clear`,
    MARK_READ: (id: string) => `/chats/${id}/read`,
    MARK_DELIVERED: (id: string) => `/chats/${id}/delivered`,
    DELIVER_ALL: "/chats/deliver-all",
    SEARCH: "/chats", // fallback
  },

  // ── Messages (MessageController) ──────────────────────────────────────────
  MESSAGES: {
    LIST: (chatId: string) => `/chats/${chatId}/messages`,
    SEARCH: (chatId: string) => `/chats/${chatId}/messages/search`,
    SEND: (chatId: string) => `/chats/${chatId}/messages`,
    BY_ID: (chatId: string, messageId: string) => `/chats/${chatId}/messages/${messageId}`,
    EDIT: (chatId: string, messageId: string) => `/chats/${chatId}/messages/${messageId}`,
    DELETE: (chatId: string, messageId: string) => `/chats/${chatId}/messages/${messageId}`,
    REACT: (chatId: string, messageId: string) => `/chats/${chatId}/messages/${messageId}/reactions`,
    REMOVE_REACTION: (chatId: string, messageId: string, emoji: string) =>
      `/chats/${chatId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    FORWARD: (chatId: string, messageId: string) => `/chats/${chatId}/messages/${messageId}/forward`,
    MARK_DELIVERED: (chatId: string, messageId: string) =>
      `/chats/${chatId}/messages/${messageId}/delivered`,
    MARK_READ_MSG: (chatId: string, messageId: string) =>
      `/chats/${chatId}/messages/${messageId}/read`,
  },

  // ── Groups (Currently chat with ChatType = GROUP in backend) ───────────────
  GROUPS: {
    LIST: "/chats", // fallback
    BY_ID: (id: string) => `/chats/${id}`, // fallback
    CREATE: "/chats", // fallback
    UPDATE: (id: string) => `/chats/${id}`, // fallback
    DELETE: (id: string) => `/chats/${id}`, // fallback
    ADD_MEMBER: (id: string) => `/chats/${id}`, // fallback
    REMOVE_MEMBER: (groupId: string, userId: string) => `/chats/${groupId}`, // fallback
    PROMOTE: (groupId: string, userId: string) => `/chats/${groupId}`, // fallback
    DEMOTE: (groupId: string, userId: string) => `/chats/${groupId}`, // fallback
    LEAVE: (id: string) => `/chats/${id}`, // fallback
    INVITE_LINK: (id: string) => `/chats/${id}`, // fallback
  },

  // ── Notifications (NotificationController) ─────────────────────────────────
  NOTIFICATIONS: {
    LIST: "/notifications",
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: "/notifications/read-all",
    DELETE: (id: string) => `/notifications/${id}`, // fallback
    SETTINGS: "/settings", // notification settings mapped to user settings
    UPDATE_SETTINGS: "/settings",
  },

  // ── Settings (UserSettingController) ───────────────────────────────────────
  SETTINGS: {
    GET: "/settings",
    UPDATE: "/settings",
    PRIVACY: "/settings", // privacy settings mapped to user settings
    UPDATE_PRIVACY: "/settings",
    THEME: "/settings",
    UPDATE_THEME: "/settings",
  },

  // ── Presence (PresenceController) ─────────────────────────────────────────
  PRESENCE: {
    STATUS: (username: string) => `/presence/${username}`,
    BULK: "/presence/status", // fallback
    UPDATE: "/presence/status",
    TYPING_START: (chatId: string) => `/presence/status`, // fallback
    TYPING_STOP: (chatId: string) => `/presence/status`, // fallback
  },

  // ── Stories (StoryController) ──────────────────────────────────────────────
  STATUS: {
    CREATE: "/stories",
    LIST: "/stories/active",
    BY_ID: (storyId: string) => `/stories/${storyId}`,
    VIEW: (storyId: string) => `/stories/${storyId}/view`,
    VIEWERS: (storyId: string) => `/stories/${storyId}/viewers`,
    REACT: (storyId: string) => `/stories/${storyId}`, // fallback
  },

  // ── Posts (PostController) ────────────────────────────────────────────────
  POSTS: {
    LIST: "/posts/feed",
    CREATE: "/posts",
    BY_ID: (postId: string) => `/posts/${postId}`,
    DELETE: (postId: string) => `/posts/${postId}`,
    LIKE: (postId: string) => `/posts/${postId}/like`,
    UNLIKE: (postId: string) => `/posts/${postId}/like`,
    BOOKMARK: (postId: string) => `/posts/${postId}/bookmark`,
    SHARE: (postId: string) => `/posts/${postId}`, // fallback
    COMMENTS: (postId: string) => `/posts/${postId}/comments`,
    CREATE_COMMENT: (postId: string) => `/posts/${postId}/comments`,
    DELETE_COMMENT: (postId: string, commentId: string) => `/posts/${postId}/comments/${commentId}`,
    USER: (userId: string) => `/posts/user/${userId}`,
  },

  // ── Discover (DiscoverController) ─────────────────────────────────────────
  DISCOVER: {
    LIST: "/discover",
    LIKE: (userId: string) => `/discover/${userId}/like`,
    UNLIKE: (userId: string) => `/discover/${userId}/like`,
    MUTUAL_FRIENDS: (userId: string) => `/users/${userId}/mutual-friends`,
    SUGGESTIONS: "/discover", // suggestions fall back to discover profiles
  },

  // ── Match (MatchController) ───────────────────────────────────────────────
  MATCH: {
    START: "/match/queue",
    CANCEL: "/match/queue",
    SKIP: "/match/skip",
    REPORT: "/match/report",
    BLOCK: "/match/queue", // fallback
    ONLINE_COUNT: "/match/session", // fallback
    END: "/match/end", // added
    SESSION: "/match/session", // added
  },

  // ── Uploads (UploadController) ─────────────────────────────────────────────
  UPLOADS: {
    DIRECT: "/uploads",
  },
} as const
