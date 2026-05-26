import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET è pubblico
router.get('/', async (_req: Request, res: Response) => {
  const result = await db.execute('SELECT * FROM links ORDER BY created_at DESC');
  const links = result.rows.map(row => ({
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    notes: row.notes,
    tags: JSON.parse(row.tags as string),
    imageUrl: row.image_url,
    createdAt: row.created_at,
  }));
  res.json(links);
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id, url, title, description, notes, tags, imageUrl, createdAt } = req.body;
  await db.execute({
    sql: `INSERT INTO links (id, url, title, description, notes, tags, image_url, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            url=excluded.url, title=excluded.title, description=excluded.description,
            notes=excluded.notes, tags=excluded.tags, image_url=excluded.image_url`,
    args: [id, url, title, description || '', notes || '', JSON.stringify(tags || []), imageUrl || '', createdAt],
  });
  res.status(201).json({ id });
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  await db.execute({ sql: 'DELETE FROM links WHERE id = ?', args: [req.params.id] });
  res.status(204).end();
});

export default router;
