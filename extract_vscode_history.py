import json
import os
import glob
import shutil
from datetime import datetime, timezone

TARGET_TIME_UTC = datetime(2026, 6, 12, 11, 30, 0, tzinfo=timezone.utc)
FRONTEND_DIR = "/Users/jitenderyadav/Development/chat/frontend"

# We check both Code and Cursor history directories
HISTORY_DIRS = [
    "/Users/jitenderyadav/Library/Application Support/Code/User/History",
    "/Users/jitenderyadav/Library/Application Support/Cursor/User/History"
]

target_files = [
    "components/providers/websocket-provider.tsx",
    "src/api/client.ts",
    "src/api/hooks/useChats.ts",
    "src/api/hooks/useContacts.ts",
    "src/api/hooks/useLogin.ts",
    "src/api/hooks/useNotifications.ts",
    "components/match/match-dashboard.tsx",
    "components/app-shell/app-shell.tsx",
    "components/app-shell/auth-context.tsx",
    "components/app-shell/navigation-config.ts",
    "components/app-shell/mobile-bottom-nav.tsx",
    "components/app-shell/desktop-sidebar.tsx",
    "components/app-shell/auth-guard.tsx"
]

def main():
    found_history = {}
    
    for hdir in HISTORY_DIRS:
        if not os.path.exists(hdir):
            print(f"History dir does not exist: {hdir}")
            continue
            
        print(f"Scanning history dir: {hdir}...")
        entries_files = glob.glob(os.path.join(hdir, "*", "entries.json"))
        
        for entries_path in entries_files:
            try:
                with open(entries_path, "r") as f:
                    data = json.load(f)
                resource_uri = data.get("resource")
                if resource_uri and resource_uri.startswith("file://"):
                    file_path = os.path.abspath(resource_uri[7:])
                    
                    # Match relative path to one of our target files
                    matched_tf = None
                    for tf in target_files:
                        if file_path.endswith(tf):
                            matched_tf = tf
                            break
                            
                    if matched_tf:
                        entries = data.get("entries", [])
                        best_entry = None
                        best_dt = None
                        
                        # Find the latest entry before cutoff
                        for entry in entries:
                            timestamp = entry.get("timestamp")
                            if isinstance(timestamp, int):
                                dt = datetime.fromtimestamp(timestamp / 1000.0, tz=timezone.utc)
                            else:
                                dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                                
                            if dt < TARGET_TIME_UTC:
                                if best_dt is None or dt > best_dt:
                                    best_dt = dt
                                    best_entry = entry
                                    
                        if best_entry:
                            entry_id = best_entry.get("id")
                            entry_file_path = os.path.join(os.path.dirname(entries_path), entry_id)
                            # If we find entries across multiple history directories, keep the latest one
                            if matched_tf not in found_history or best_dt > found_history[matched_tf][0]:
                                found_history[matched_tf] = (best_dt, entry_file_path)
            except Exception as e:
                pass

    print("\n--- FOUND HISTORY ENTRIES BEFORE 5:00 PM IST ---")
    for tf, (dt, path) in sorted(found_history.items()):
        size = os.path.getsize(path)
        print(f"  {tf} | Time: {dt.isoformat()} | Size: {size} bytes | Source Path: {path}")

if __name__ == "__main__":
    main()
