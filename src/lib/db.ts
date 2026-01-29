import { openDB, type DBSchema, type IDBPDatabase } from "idb";

const DB_NAME = "nearai-chat-db";
const DB_VERSION = 1;
const STORE_NAME = "key-value";

interface ChatDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<ChatDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ChatDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
};

export const db = {
  get: async <T>(key: string): Promise<T | null> => {
    const database = await getDB();
    const val = await database.get(STORE_NAME, key);
    return (val as T) ?? null;
  },

  set: async (key: string, value: unknown): Promise<void> => {
    const database = await getDB();
    await database.put(STORE_NAME, value, key);
  },

  del: async (key: string): Promise<void> => {
    const database = await getDB();
    await database.delete(STORE_NAME, key);
  },

  getAllKeys: async (): Promise<string[]> => {
    const database = await getDB();
    return database.getAllKeys(STORE_NAME);
  },
};
