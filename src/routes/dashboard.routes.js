import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

function countBy(products, field) {
  const counts = new Map();
  for (const product of products) {
    const key = product[field] || 'Uncategorized';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

dashboardRouter.get('/stats', asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    select: { workCategory: true, characterCategory: true },
  });

  res.json({
    totalProducts: products.length,
    byWorkCategory: countBy(products, 'workCategory'),
    byCharacterCategory: countBy(products, 'characterCategory'),
  });
}));
