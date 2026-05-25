import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/minicard.db');

export const db = createClient({
  url: `file:${dbPath}`,
});

export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      image_url TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    )
  `);
}
