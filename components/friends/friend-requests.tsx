"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Users, Mail, ChevronRight, UserPlus, BadgeCheck } from "lucide-react";
import { cn, getAvatarUrl } from "@/lib/utils";
import {
  useContactRequests,
  useAcceptContactRequest,
  useDeclineContactRequest,
  useAddContact,
} from "@/src/api/hooks/useContacts";
import { useSuggestedFriends } from "@/src/api/hooks/useDiscover";
import { useNavigation } from "@/components/app-shell/navigation-context";
import type { FriendRequest } from "@/src/api/types";

const formatRelativeTime = (dateStr: string | undefined | null) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

export function FriendRequests({ searchQuery }: { searchQuery: string }) {
  const { data: requests = [], isLoading } = useContactRequests();
  const acceptMutation = useAcceptContactRequest();
  const declineMutation = useDeclineContactRequest();
  const { setActiveTab } = useNavigation();

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? requests.filter(
        (r) =>
          (r.sender?.name || "").toLowerCase().includes(q) ||
          (r.sender?.username || "").toLowerCase().includes(q),
      )
    : requests;

  const respondAll = () => requests.forEach((r) => acceptMutation.mutate(r.id));

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* New requests banner */}
      {requests.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl p-3.5 bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20">
          <div className="relative shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold ring-2 ring-background">
              {requests.length}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">{requests.length} New Requests</p>
            <p className="text-xs text-muted-foreground">Respond to connect and grow your network</p>
          </div>
          <button
            onClick={respondAll}
            className="shrink-0 h-9 px-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 cursor-pointer"
          >
            Respond All
          </button>
        </div>
      )}

      {/* Requests list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading requests...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {q ? "No matching requests" : "All caught up"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {q ? "Try a different name" : "No pending friend requests"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {filtered.map((req) => (
              <RequestRow
                key={req.id}
                request={req}
                onAccept={() => acceptMutation.mutate(req.id)}
                onReject={() => declineMutation.mutate(req.id)}
                busy={
                  (acceptMutation.isPending && acceptMutation.variables === req.id) ||
                  (declineMutation.isPending && declineMutation.variables === req.id)
                }
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* People You May Know */}
      <PeopleYouMayKnow onViewAll={() => setActiveTab("discover")} />
    </div>
  );
}

function RequestRow({
  request,
  onAccept,
  onReject,
  busy,
}: {
  request: FriendRequest;
  onAccept: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const name = request.sender?.name || "Unknown User";
  const username = request.sender?.username
    ? `@${request.sender.username}`
    : `@${name.toLowerCase().replace(/\s+/g, "")}`;
  const timeAgo = formatRelativeTime(request.createdAt || request.sender?.createdAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="flex items-center gap-3 p-2.5 rounded-2xl border border-border/60 bg-card/50"
    >
      <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/10">
        <AvatarImage src={getAvatarUrl(request.sender?.avatar, request.sender?.gender)} />
        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-sm text-foreground truncate">{name}</span>
          {request.sender?.verified && (
            <BadgeCheck className="h-4 w-4 text-primary fill-primary/20 shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {username}
          {timeAgo && <span> · {timeAgo}</span>}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onAccept}
          disabled={busy}
          aria-label="Accept"
          className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          <Check className="h-5 w-5" />
        </button>
        <button
          onClick={onReject}
          disabled={busy}
          aria-label="Decline"
          className="h-10 w-10 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted-foreground/10 disabled:opacity-50 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}

function PeopleYouMayKnow({ onViewAll }: { onViewAll: () => void }) {
  const { data: suggestionsData } = useSuggestedFriends();
  const addContact = useAddContact();
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const people = (suggestionsData?.items ?? []).filter((p) => !dismissed[p.id]);
  if (people.length === 0) return null;

  return (
    <section className="pt-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-base font-bold text-foreground leading-none">People You May Know</h2>
            <p className="text-xs text-muted-foreground mt-1">Based on your activity</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          View All
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden -mx-1 px-1 pb-1">
        {people.map((person) => {
          const mutual = person.mutualFriendsCount ?? person.mutualFriends ?? 0;
          const isAdded = added[person.id];
          return (
            <div
              key={person.id}
              className="relative shrink-0 w-40 rounded-2xl border border-border/60 bg-card/50 p-3 flex flex-col items-center text-center"
            >
              <button
                onClick={() => setDismissed((s) => ({ ...s, [person.id]: true }))}
                aria-label="Dismiss"
                className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                <AvatarImage src={getAvatarUrl(person.avatar, person.gender)} />
                <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <p className="mt-2 font-semibold text-sm text-foreground truncate max-w-full">
                {person.name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate max-w-full">
                @{person.username}
              </p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" />
                {mutual} mutual {mutual === 1 ? "friend" : "friends"}
              </p>
              <button
                onClick={() => {
                  if (isAdded) return;
                  setAdded((s) => ({ ...s, [person.id]: true }));
                  addContact.mutate(person.id);
                }}
                className={cn(
                  "mt-2.5 w-full h-9 rounded-full text-sm font-semibold transition-colors cursor-pointer",
                  isAdded
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {isAdded ? "Requested" : "Add"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
