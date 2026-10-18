import { Preferences } from "@capacitor/preferences";

export interface HistoryEntry {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  timestamp: number;
  source?: string;
}

const HISTORY_KEY = "geo_history";
const HISTORY_LIMIT = 100;

export type HistoryEntryInput = Omit<HistoryEntry, "id" | "timestamp">;

const createId = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return Date.now().toString();
};

const readHistory = async (): Promise<HistoryEntry[]> => {
  const { value } = await Preferences.get({ key: HISTORY_KEY });

  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
};

export async function addEntry(entry: HistoryEntryInput): Promise<void> {
  const history = await readHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: createId(),
    timestamp: Date.now(),
  };

  await Preferences.set({
    key: HISTORY_KEY,
    value: JSON.stringify([newEntry, ...history].slice(0, HISTORY_LIMIT)),
  });
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return readHistory();
}

export async function clearHistory(): Promise<void> {
  await Preferences.remove({ key: HISTORY_KEY });
}

export async function deleteEntry(id: string): Promise<void> {
  const history = await readHistory();
  const filteredHistory = history.filter((entry) => entry.id !== id);

  await Preferences.set({
    key: HISTORY_KEY,
    value: JSON.stringify(filteredHistory),
  });
}

const HistoryService = {
  addEntry,
  getHistory,
  clearHistory,
  deleteEntry,
};

export default HistoryService;
