import shutil
import os

FRONTEND_DIR = "/Users/jitenderyadav/Development/chat/frontend"

dirs_to_delete = [
    "components/lobby",
    "components/stranger",
    "components/stranger-talk",
    "app/(authenticated)/stranger",
    "app/(authenticated)/stranger-talk",
    "app/(authenticated)/match"
]

files_to_delete = [
    "components/app-shell/guest-stranger-talk-form.tsx"
]

def main():
    print("Starting deletion of evening directories and files...")
    for d in dirs_to_delete:
        path = os.path.join(FRONTEND_DIR, d)
        if os.path.exists(path):
            shutil.rmtree(path)
            print(f"Deleted directory: {d}")
        else:
            print(f"Directory did not exist: {d}")
            
    for f in files_to_delete:
        path = os.path.join(FRONTEND_DIR, f)
        if os.path.exists(path):
            os.remove(path)
            print(f"Deleted file: {f}")
        else:
            print(f"File did not exist: {f}")
            
    print("Deletion completed!")

if __name__ == "__main__":
    main()
