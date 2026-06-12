"use client"

import { create } from "zustand"
import type { MatchStatus, MatchFilters, Stranger, StrangerMessage } from "./types"

interface MatchState {
  status: MatchStatus
  filters: MatchFilters
  stranger: Stranger | null
  messages: StrangerMessage[]
  searchTime: number
  
  // Actions
  setStatus: (status: MatchStatus) => void
  setFilters: (filters: Partial<MatchFilters>) => void
  setStranger: (stranger: Stranger | null) => void
  addMessage: (message: StrangerMessage) => void
  revealMedia: (messageId: string) => void
  clearMessages: () => void
  resetMatch: () => void
  incrementSearchTime: () => void
}

const defaultFilters: MatchFilters = {
  ageRange: [18, 35],
  gender: "any",
  interests: [],
  region: "global",
}

export const useMatchStore = create<MatchState>((set) => ({
  status: "idle",
  filters: defaultFilters,
  stranger: null,
  messages: [],
  searchTime: 0,
  
  setStatus: (status) => set({ status }),
  
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),
  
  setStranger: (stranger) => set({ stranger }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  revealMedia: (messageId) => set((state) => ({
    messages: state.messages.map((msg) =>
      msg.id === messageId && msg.media
        ? { ...msg, media: { ...msg.media, isBlurred: false } }
        : msg
    )
  })),
  
  clearMessages: () => set({ messages: [] }),
  
  resetMatch: () => set({
    status: "idle",
    stranger: null,
    messages: [],
    searchTime: 0,
  }),
  
  incrementSearchTime: () => set((state) => ({
    searchTime: state.searchTime + 1
  })),
}))
