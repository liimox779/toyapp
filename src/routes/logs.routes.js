import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const logsRouter = Router();
logsRouter.use(requireAuth);

logsRouter.get('/', asyncHandler(async (req, res) => {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ logs });
}));
