'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export interface ChatContextType {
  selectedConversationId: string | null
  setSelectedConversationId: (id: string | null) => void
  showMobileSecondaryPanel: boolean
  setShowMobileSecondaryPanel: (show: boolean) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [showMobileSecondaryPanel, setShowMobileSecondaryPanel] = useState(true)

  return (
    <ChatContext.Provider
      value={{
        selectedConversationId,
        setSelectedConversationId,
        showMobileSecondaryPanel,
        setShowMobileSecondaryPanel,
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
