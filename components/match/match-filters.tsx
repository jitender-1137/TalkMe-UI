"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"
import type { MatchFilters, Gender } from "./types"

interface MatchFiltersProps {
  filters: MatchFilters
  onFilterChange: (filters: Partial<MatchFilters>) => void
  disabled?: boolean
}

const availableInterests = [
  "Music", "Movies", "Gaming", "Sports", "Travel", "Food", "Art",
  "Technology", "Books", "Fitness", "Photography", "Fashion", "Nature"
]

const regions = [
  { value: "global", label: "Global" },
  { value: "na", label: "North America" },
  { value: "eu", label: "Europe" },
  { value: "asia", label: "Asia" },
  { value: "latam", label: "Latin America" },
  { value: "oceania", label: "Oceania" },
  { value: "africa", label: "Africa" },
]

export function MatchFiltersPanel({
  filters,
  onFilterChange,
  disabled = false,
}: MatchFiltersProps) {
  const toggleInterest = (interest: string) => {
    const currentInterests = filters.interests
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter((i) => i !== interest)
      : [...currentInterests, interest]
    onFilterChange({ interests: newInterests })
  }

  return (
    <div className="space-y-6 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">Age Range</Label>
          <span className="text-sm text-muted-foreground">
            {filters.ageRange[0]} - {filters.ageRange[1]} years
          </span>
        </div>
        <Slider
          value={filters.ageRange}
          onValueChange={(value) => onFilterChange({ ageRange: value as [number, number] })}
          min={18}
          max={65}
          step={1}
          disabled={disabled}
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Gender Preference</Label>
        <div className="flex gap-2">
          {(["any", "male", "female", "other"] as Gender[]).map((gender) => (
            <Button
              key={gender}
              size="sm"
              variant={filters.gender === gender ? "default" : "outline"}
              onClick={() => onFilterChange({ gender })}
              disabled={disabled}
              className="capitalize flex-1"
            >
              {gender}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Region</Label>
        <Select
          value={filters.region}
          onValueChange={(value) => onFilterChange({ region: value })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent>
            {regions.map((region) => (
              <SelectItem key={region.value} value={region.value}>
                {region.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">Interests</Label>
          {filters.interests.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFilterChange({ interests: [] })}
              disabled={disabled}
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {availableInterests.map((interest) => {
            const isSelected = filters.interests.includes(interest)
            return (
              <Badge
                key={interest}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/80"
                } ${isSelected ? "" : "hover:bg-accent"}`}
                onClick={() => !disabled && toggleInterest(interest)}
              >
                {interest}
                {isSelected && <X className="ml-1 h-3 w-3" />}
              </Badge>
            )
          })}
        </div>
      </div>
    </div>
  )
}
