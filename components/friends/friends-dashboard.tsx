"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AllFriends } from "./all-friends"
import { FriendRequests } from "./friend-requests"
import { Users, UserPlus } from "lucide-react"
import { useContactRequests } from "@/src/api/hooks/useContacts"

export function FriendsDashboard() {
  const { data: requests = [] } = useContactRequests()
  const requestCount = requests.length

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background pb-16 md:pb-0">
      {/* Page Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border bg-card">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Friends</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your connections
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex flex-col flex-1 overflow-hidden">
        <div className="shrink-0 px-6 pt-4 bg-card border-b border-border">
          <TabsList className="h-10 bg-muted p-1 w-full sm:w-auto">
            <TabsTrigger
              value="all"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              All Friends
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              Requests
              {requestCount > 0 && (
                <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-1.5">
                  {requestCount}
                </span>
              )}
            </TabsTrigger>

          </TabsList>
        </div>

        <TabsContent value="all" className="flex-1 overflow-y-auto overscroll-contain mt-0 pb-24 md:pb-4">
          <AllFriends />
        </TabsContent>

        <TabsContent value="requests" className="flex-1 overflow-y-auto overscroll-contain mt-0 pb-24 md:pb-4">
          <FriendRequests onCountChange={() => {}} />
        </TabsContent>


      </Tabs>
    </div>
  )
}
