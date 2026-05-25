import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };

  const adminUser = process.env.ADMIN_USERNAME;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminUser || !adminHash) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  if (username !== adminUser) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, adminHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ sub: username }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.json({ token });
});

export default router;
