import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getMediaUrl } from '@/src/api/client'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAvatarUrl(avatar?: string | null, gender?: string | null): string | undefined {
  if (avatar) return getMediaUrl(avatar);
  if (!gender) return '/placeholder-user.jpg';
  
  const lowerGender = gender.toLowerCase();
  if (lowerGender === 'male') return '/avtar/male-default.png';
  if (lowerGender === 'female') return '/avtar/female-default.png';
  
  return '/placeholder-user.jpg';
}
