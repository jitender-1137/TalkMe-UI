/**
 * Centralized React Query key factory.
 * Every hook must use these keys — never inline strings.
 *
 * Convention: keys are arrays so React Query can do partial cache invalidation.
 *   QUERY_KEYS.CHATS.LIST              → ["chats"]
 *   QUERY_KEYS.CHATS.DETAIL("abc")     → ["chats", "abc"]
 *   QUERY_KEYS.MESSAGES.LIST("abc")    → ["messages", "abc"]
 */
export const QUERY_KEYS = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  AUTH: {
    ME: ["auth", "me"] as const,
    SESSIONS: ["auth", "sessions"] as const,
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  PROFILE: {
    SELF: ["profile"] as const,
    BY_ID: (userId: string) => ["profile", userId] as const,
  },

  // ── Profile views ("who viewed my profile") ────────────────────────────────
  PROFILE_VIEWS: {
    LIST: ["profile-views"] as const,
    COUNT: ["profile-views", "count"] as const,
  },

  // ── Contacts ──────────────────────────────────────────────────────────────
  CONTACTS: {
    LIST: ["contacts"] as const,
    DETAIL: (id: string) => ["contacts", id] as const,
    REQUESTS: ["contacts", "requests"] as const,
    BLOCKED: ["contacts", "blocked"] as const,
  },

  // ── Chats ─────────────────────────────────────────────────────────────────
  CHATS: {
    LIST: ["chats"] as const,
    DETAIL: (id: string) => ["chats", id] as const,
    ARCHIVED: ["chats", "archived"] as const,
    PINNED: ["chats", "pinned"] as const,
    SEARCH: (q: string) => ["chats", "search", q] as const,
  },

  // ── Messages ──────────────────────────────────────────────────────────────
  MESSAGES: {
    LIST: (chatId: string) => ["messages", chatId] as const,
    DETAIL: (chatId: string, messageId: string) => ["messages", chatId, messageId] as const,
  },

  // ── Groups ────────────────────────────────────────────────────────────────
  GROUPS: {
    LIST: ["groups"] as const,
    DETAIL: (id: string) => ["groups", id] as const,
    MEMBERS: (id: string) => ["groups", id, "members"] as const,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  NOTIFICATIONS: {
    LIST: ["notifications"] as const,
    SETTINGS: ["notifications", "settings"] as const,
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  SETTINGS: {
    ALL: ["settings"] as const,
    PRIVACY: ["settings", "privacy"] as const,
    THEME: ["settings", "theme"] as const,
  },

  // ── Presence ──────────────────────────────────────────────────────────────
  PRESENCE: {
    USER: (userId: string) => ["presence", userId] as const,
    BULK: (userIds: string[]) => ["presence", "bulk", ...userIds] as const,
    LOBBY: ["presence", "lobby"] as const,
  },

  // ── Stories ───────────────────────────────────────────────────────────────
  STORIES: {
    FEED: ["stories", "feed"] as const,
    VIEWERS: (storyId: string) => ["stories", storyId, "viewers"] as const,
  },

  // ── Posts ─────────────────────────────────────────────────────────────────
  POSTS: {
    FEED: ["posts", "feed"] as const,
    USER: (userId: string) => ["posts", "user", userId] as const,
    DETAIL: (postId: string) => ["posts", "detail", postId] as const,
    LIKES: (postId: string) => ["posts", postId, "likes"] as const,
    COMMENTS: (postId: string) => ["posts", postId, "comments"] as const,
    COMMENT_REPLIES: (postId: string, commentId: string) =>
      ["posts", postId, "comments", commentId, "replies"] as const,
  },

  // ── Discover ──────────────────────────────────────────────────────────────
  DISCOVER: {
    LIST: ["discover"] as const,
    SUGGESTIONS: ["discover", "suggestions"] as const,
  },

  // ── Match ─────────────────────────────────────────────────────────────────
  MATCH: {
    ONLINE_COUNT: ["match", "online-count"] as const,
  },
} as const
