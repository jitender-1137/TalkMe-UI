"use client"

import { useState } from "react"
import { Users } from "lucide-react"
import { AllFriends } from "./all-friends"
import { FriendRequests } from "./friend-requests"
import { useContactRequests } from "@/src/api/hooks/useContacts"
import { AppLayout } from "@/components/ui/app-layout"

export function FriendsDashboard() {
  const { data: requests = [] } = useContactRequests()
  const requestCount = requests.length
  const [activeTab, setActiveTab] = useState("all")

  return (
    <div className="h-full w-full">
      <AppLayout
        title="Friends"
        icon={Users}
        filterChips={[
          { id: "all", label: "All Friends" },
          { id: "requests", label: "Requests", badge: requestCount },
        ]}
        activeFilterId={activeTab}
        onFilterChange={setActiveTab}
        collapseFiltersToHeader={true}
      >
        <div className="flex-1 px-6 pb-6 mt-0">
          {activeTab === "all" ? (
            <AllFriends />
          ) : (
            <FriendRequests onCountChange={() => {}} />
          )}
        </div>
      </AppLayout>
    </div>
  )
}
