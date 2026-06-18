'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import type { ChatContact, MediaAttachment } from '@/components/chat/types'

export interface ProfileModalState {
  contact: ChatContact
  userId?: string | null
  sharedMedia?: MediaAttachment[]
}

export interface ChatContextType {
  selectedConversationId: string | null
  setSelectedConversationId: (id: string | null) => void
  showMobileSecondaryPanel: boolean
  setShowMobileSecondaryPanel: (show: boolean) => void
  profileModal: ProfileModalState | null
  setProfileModal: (modal: ProfileModalState | null) => void
  /**
   * Tab to return to when the mobile chat screen is dismissed with Back.
   * Set by whoever opens a chat from another tab (Discover, News, …); null
   * means "stay on the Chats tab and show the conversation list".
   */
  chatReturnTab: string | null
  setChatReturnTab: (tab: string | null) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [showMobileSecondaryPanel, setShowMobileSecondaryPanel] = useState(true)
  const [profileModal, setProfileModal] = useState<ProfileModalState | null>(null)
  const [chatReturnTab, setChatReturnTab] = useState<string | null>(null)

  return (
    <ChatContext.Provider
      value={{
        selectedConversationId,
        setSelectedConversationId,
        showMobileSecondaryPanel,
        setShowMobileSecondaryPanel,
        profileModal,
        setProfileModal,
        chatReturnTab,
        setChatReturnTab,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider')
  }
  return context
}
