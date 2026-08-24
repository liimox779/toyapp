import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { guardRequestStream } from '../middleware/uploadGuard.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { embedImageFromBuffer, cosineSimilarity } from '../lib/embeddings.js';

export const searchRouter = Router();
searchRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

const TOP_K = 12;

searchRouter.post('/', guardRequestStream, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'An image file is required (field name "image")' });
  }

  let queryVector;
  try {
    queryVector = await embedImageFromBuffer(req.file.buffer);
  } catch (err) {
    console.error('Failed to compute query embedding:', err);
    return res.status(500).json({
      error: 'Could not process the uploaded image. The CLIP model may still be downloading on first run — please retry shortly.',
    });
  }

  const products = await prisma.product.findMany({
    include: { images: { where: { vectorEmbedding: { not: null } } } },
  });

  // A product may have several angle photos; match on whichever one is closest to the query.
  const scored = products
    .map((product) => {
      let bestScore = -Infinity;
      let matchedImageUrl = product.imageUrl;
      for (const image of product.images) {
        let vector;
        try {
          vector = JSON.parse(image.vectorEmbedding);
        } catch {
          continue;
        }
        const score = cosineSimilarity(queryVector, vector);
        if (score > bestScore) {
          bestScore = score;
          matchedImageUrl = image.imageUrl;
        }
      }
      if (bestScore === -Infinity) return null;
      return { product, score: bestScore, matchedImageUrl };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map(({ product, score, matchedImageUrl }) => ({
      ...product,
      matchedImageUrl,
      similarity: Math.max(0, Math.round(score * 10000) / 100), // percentage, 2dp
    }));

  res.json({ results: scored });
}));
