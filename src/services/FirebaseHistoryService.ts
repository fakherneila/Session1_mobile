import { signInAnonymously } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../environments/firebase.config";
import { HistoryEntry } from "./HistoryService";

const getOrCreateUid = async (): Promise<string> => {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  if (!auth.currentUser) {
    throw new Error("Utilisateur Firebase indisponible");
  }
  return auth.currentUser.uid;
};

export const syncHistory = async (
  entries: HistoryEntry[],
): Promise<{ synced: number; failed: number }> => {
  const uid = await getOrCreateUid();
  let synced = 0;
  let failed = 0;
console.log("UID:", uid);
console.log("Entries to sync:", entries.length);

  for (const entry of entries) {
    try {
      await setDoc(
        doc(db, "users", uid, "positions", String(entry.timestamp)),
        entry,
        {
          merge: true,
        },
      );
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return { synced, failed };
};
