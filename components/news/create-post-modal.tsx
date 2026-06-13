"use client"

import { useState, useRef } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PostService } from "@/src/api/services/post.service"
import { UploadService } from "@/src/api/services/upload.service"
import { QUERY_KEYS } from "@/src/api/query-keys"
import { X, Image as ImageIcon, ArrowLeft, Loader2 } from "lucide-react"

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const [step, setStep] = useState<"select" | "details">("select")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) return
      setIsUploading(true)
      
      try {
        // Upload media first
        const isVideo = selectedFile.type.startsWith("video/")
        const uploadRes = await UploadService.uploadFile(selectedFile, isVideo ? "video" : "image")
        
        // Create post with media URL
        await PostService.createPost({
          content: caption,
          media: [uploadRes.url]
        })
      } finally {
        setIsUploading(false)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.POSTS.FEED })
      handleClose()
    }
  })

  const handleClose = () => {
    setStep("select")
    setSelectedFile(null)
    setPreviewUrl(null)
    setCaption("")
    onClose()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setStep("details")
    }
  }

  const handleSubmit = () => {
    createPostMutation.mutate()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      {/* Close Button Outside */}
      <button 
        onClick={handleClose}
        className="absolute top-4 right-4 text-white hover:text-zinc-300"
      >
        <X className="h-8 w-8" />
      </button>

      {/* Modal Container */}
      <div className="w-full max-w-[800px] overflow-hidden rounded-xl bg-zinc-900 shadow-2xl flex flex-col h-[70vh] max-h-[800px]">
        {/* Header */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
          <div className="flex-1">
            {step === "details" && (
              <button onClick={() => setStep("select")} className="text-zinc-100 hover:text-zinc-300">
                <ArrowLeft className="h-6 w-6" />
              </button>
            )}
          </div>
          <h2 className="text-base font-semibold text-zinc-100">Create new post</h2>
          <div className="flex-1 text-right">
            {step === "details" && (
              <button 
                onClick={handleSubmit} 
                disabled={isUploading}
                className="text-sm font-semibold text-blue-500 hover:text-blue-400 disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Share"}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {step === "select" ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6">
              <ImageIcon className="h-24 w-24 text-zinc-100 mb-4 stroke-1" />
              <h3 className="text-xl font-normal text-zinc-100 mb-6">Drag photos and videos here</h3>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 active:bg-blue-700"
              >
                Select from computer
              </button>
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                accept="image/*,video/*"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col md:flex-row">
              {/* Media Preview */}
              <div className="flex-1 bg-black flex items-center justify-center border-r border-zinc-800 h-[300px] md:h-full">
                {previewUrl && (
                  selectedFile?.type.startsWith("video/") ? (
                    <video src={previewUrl} className="w-full h-full object-contain" controls />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  )
                )}
              </div>
              
              {/* Details Pane */}
              <div className="w-full md:w-[340px] flex flex-col bg-zinc-900 h-full">
                <div className="flex items-center p-4 border-b border-zinc-800">
                  <div className="h-7 w-7 rounded-full bg-zinc-800 mr-3" />
                  <span className="font-semibold text-zinc-100 text-sm">New Post</span>
                </div>
                <textarea 
                  className="w-full flex-1 resize-none bg-transparent p-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
