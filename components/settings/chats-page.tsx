"use client";

import { ChevronDown, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLobbyStore } from "@/components/lobby/lobby-store";
import { useChatPrefs, type ChatFontSize } from "@/lib/chat/chat-prefs-store";
import { showSuccessToast, showErrorToast } from "@/src/api/error-handler";

interface ChatsPageProps {
  /** Navigate to the Appearance sub-view (chat theme lives there). */
  onOpenAppearance: () => void;
}

/** #profile/chats — conversation preferences and chat storage. */
export function ChatsPage({ onOpenAppearance }: ChatsPageProps) {
  const enterToSend = useChatPrefs((s) => s.enterToSend);
  const mediaAutoDownload = useChatPrefs((s) => s.mediaAutoDownload);
  const fontSize = useChatPrefs((s) => s.fontSize);
  const setEnterToSend = useChatPrefs((s) => s.setEnterToSend);
  const setMediaAutoDownload = useChatPrefs((s) => s.setMediaAutoDownload);
  const setFontSize = useChatPrefs((s) => s.setFontSize);
  const clearLobbyData = useLobbyStore((state) => state.clearAllData);

  // Export the locally-cached chat data to a downloadable JSON file.
  const handleExport = () => {
    try {
      const { conversations, messages, blockedUsers } = useLobbyStore.getState();
      const payload = {
        exportedAt: new Date().toISOString(),
        conversations,
        messages,
        blockedUsers,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `talkme-chats-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showSuccessToast("Chats exported", "Your local chat data was downloaded.");
    } catch (e) {
      showErrorToast(e as Error);
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto text-left">
      <div className="bg-card text-card-foreground flex flex-col gap-5 rounded-xl border border-border/80 p-6 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-foreground">Chat Settings</h3>
          <p className="text-xs text-muted-foreground">
            Customise how your conversations look and behave.
          </p>
        </div>

        {/* Enter is send */}
        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Enter is send</Label>
            <p className="text-xs text-muted-foreground">
              Press Enter to send; Shift+Enter for a new line
            </p>
          </div>
          <Switch checked={enterToSend} onCheckedChange={setEnterToSend} />
        </div>

        {/* Media auto-download */}
        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Media auto-download</Label>
            <p className="text-xs text-muted-foreground">Automatically download photos and GIFs</p>
          </div>
          <Switch checked={mediaAutoDownload} onCheckedChange={setMediaAutoDownload} />
        </div>

        {/* Font size */}
        <div className="border-t border-border/50 pt-4 space-y-1.5">
          <Label htmlFor="chat-font-size" className="text-sm font-medium">
            Chat font size
          </Label>
          <div className="relative">
            <select
              id="chat-font-size"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value as ChatFontSize)}
              className="pl-3 pr-8 border-input h-10 w-full min-w-0 rounded-md border bg-background py-1 text-sm shadow-xs outline-none cursor-pointer appearance-none focus-visible:border-ring focus-visible:ring-[3px] text-foreground"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          </div>
        </div>

        {/* Chat theme → appearance */}
        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Chat theme</Label>
            <p className="text-xs text-muted-foreground">Change app appearance and theme</p>
          </div>
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={onOpenAppearance}>
            Customise
          </Button>
        </div>
      </div>

      {/* Storage & data */}
      <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Storage &amp; Data</h3>
        <Button variant="outline" className="w-full gap-2 cursor-pointer" onClick={handleExport}>
          <ImageIcon className="h-4 w-4" />
          Export chats
        </Button>
        <Button
          variant="destructive"
          className="w-full gap-2 cursor-pointer"
          onClick={() => {
            if (confirm("Clear locally cached chat history on this device?")) {
              clearLobbyData();
              showSuccessToast("Local chat cache cleared");
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Clear local chat cache
        </Button>
      </div>
    </div>
  );
}
