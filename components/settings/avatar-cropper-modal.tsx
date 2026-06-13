"use client"

import { useState, useCallback, useEffect } from "react"
import Cropper from "react-easy-crop"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import getCroppedImg from "@/lib/cropImage"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface AvatarCropperModalProps {
  isOpen: boolean
  imageFile: File | null
  onClose: () => void
  onCropComplete: (file: File) => void
}

export function AvatarCropperModal({ isOpen, imageFile, onClose, onCropComplete }: AvatarCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImageSrc(url)
      // Reset state
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setIsProcessing(false)
      
      return () => URL.revokeObjectURL(url)
    } else {
      setImageSrc(null)
    }
  }, [imageFile])

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels)
      if (croppedFile) {
        onCropComplete(croppedFile)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsProcessing(false)
      onClose()
    }
  }

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0])
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[300px] bg-black rounded-md overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteHandler}
              onZoomChange={setZoom}
            />
          )}
        </div>

        <div className="px-2 py-4">
          <label className="text-xs font-medium text-muted-foreground mb-3 block">Zoom</label>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={handleZoomChange}
            className="w-full"
          />
        </div>

        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
