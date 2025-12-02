import { openDB, DBSchema } from 'idb';

interface ClothItem {
  id: string;
  image: Blob;
  category: 'top' | 'bottom' | 'full';
  tags: string[];
  createdAt: number;
}

interface NaomiDB extends DBSchema {
  clothes: {
    key: string;
    value: ClothItem;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'naomi-wardrobe';

export async function initDB() {
  return openDB<NaomiDB>(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore('clothes', { keyPath: 'id' });
      store.createIndex('by-date', 'createdAt');
    },
  });
}

export async function addCloth(image: Blob, category: 'top' | 'bottom' | 'full' = 'top') {
  const db = await initDB();
  const id = crypto.randomUUID();
  await db.add('clothes', {
    id,
    image,
    category,
    tags: [],
    createdAt: Date.now(),
  });
  return id;
}

export async function getClothes() {
  const db = await initDB();
  return db.getAllFromIndex('clothes', 'by-date');
}

export async function deleteCloth(id: string) {
  const db = await initDB();
  await db.delete('clothes', id);
}
