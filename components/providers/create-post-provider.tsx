"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import CreatePostModal from "@/components/news/create-post-modal"

interface CreatePostContextType {
  openCreatePost: () => void
  closeCreatePost: () => void
}

const CreatePostContext = createContext<CreatePostContextType | undefined>(undefined)

export function CreatePostProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openCreatePost = () => setIsOpen(true)
  const closeCreatePost = () => setIsOpen(false)

  return (
    <CreatePostContext.Provider value={{ openCreatePost, closeCreatePost }}>
      {children}
      <CreatePostModal isOpen={isOpen} onClose={closeCreatePost} />
    </CreatePostContext.Provider>
  )
}

export function useCreatePost() {
  const context = useContext(CreatePostContext)
  if (context === undefined) {
    throw new Error("useCreatePost must be used within a CreatePostProvider")
  }
  return context
}
