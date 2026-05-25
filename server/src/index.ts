import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(rootDir, '.env') });

import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import authRouter from './routes/auth.js';
import linksRouter from './routes/links.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/links', linksRouter);

// Serve frontend in production
const clientDist = path.join(rootDir, 'client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

await initDb();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
