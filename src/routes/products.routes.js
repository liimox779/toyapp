import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireEditor } from '../middleware/auth.js';
import { guardRequestStream } from '../middleware/uploadGuard.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { embedImageFromUrl, embedImageFromBuffer } from '../lib/embeddings.js';
import { uploadToStorage, deleteFromStorage } from '../lib/storage.js';

export const productsRouter = Router();
productsRouter.use(requireAuth);

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

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

const PRICE_FIELDS = [
  'retailPrice',
  'retailSpecialPrice',
  'agentPrice',
  'usedPrice',
  'usedSpecialPrice',
  'usedIncompletePrice',
  'usedIncompleteSpecialPrice',
  'partPrice',
  'partSpecialPrice',
  'partIncompletePrice',
  'partIncompleteSpecialPrice',
];

const TEXT_FIELDS = [
  'sku',
  'jancode',
  'imageUrl',
  'workCategory',
  'characterCategory',
  'modelName',
  'characterName',
  'series',
  'height',
  'weight',
];

function buildProductData(body) {
  const data = {};
  for (const field of TEXT_FIELDS) {
    if (body[field] !== undefined) data[field] = String(body[field]).trim();
  }
  for (const field of PRICE_FIELDS) {
    if (body[field] === undefined) continue;
    if (body[field] === null || body[field] === '') {
      data[field] = null;
    } else {
      const num = Number(body[field]);
      data[field] = Number.isFinite(num) ? num : null;
    }
  }
  return data;
}

function formatLogValue(v) {
  return v === null || v === undefined || v === '' ? '—' : v;
}

function buildChangeSummary(existing, data) {
  const changes = [];
  for (const field of [...TEXT_FIELDS, ...PRICE_FIELDS]) {
    if (data[field] === undefined) continue;
    if (data[field] !== existing[field]) {
      changes.push(`${field}: ${formatLogValue(existing[field])} → ${formatLogValue(data[field])}`);
    }
  }
  return changes.length ? changes.join(', ') : 'No field changes';
}

function logActivity(action, { sku, modelName, summary, username }) {
  return prisma.activityLog.create({
    data: { action, sku, modelName, summary, username: username || 'unknown' },
  });
}

// Keeps Product.imageUrl/vectorEmbedding (used for card thumbnails and as a fast search fallback)
// in sync with whichever ProductImage is currently flagged isPrimary.
async function syncPrimaryImage(productId, imageUrl, vectorEmbedding) {
  const existingPrimary = await prisma.productImage.findFirst({ where: { productId, isPrimary: true } });
  if (existingPrimary) {
    await prisma.productImage.update({ where: { id: existingPrimary.id }, data: { imageUrl, vectorEmbedding } });
  } else {
    await prisma.productImage.create({ data: { productId, imageUrl, vectorEmbedding, isPrimary: true } });
  }
}

productsRouter.post('/upload-image', requireEditor, guardRequestStream, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'An image file is required (field name "image")' });
  }

  const ext = EXT_BY_MIME[req.file.mimetype] || 'jpg';
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const imageUrl = await uploadToStorage(filename, req.file.buffer, req.file.mimetype);

  let vectorEmbedding = null;
  try {
    vectorEmbedding = await embedImageFromBuffer(req.file.buffer);
  } catch (err) {
    console.warn(`Embedding computation failed for uploaded image: ${err.message}`);
  }

  res.json({ imageUrl, vectorEmbedding });
}));

productsRouter.get('/', asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { images: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
  });
  res.json({ products });
}));

productsRouter.get('/:id', asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(req.params.id) },
    include: { images: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
  });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product });
}));

productsRouter.post('/', requireEditor, asyncHandler(async (req, res) => {
  const data = buildProductData(req.body ?? {});
  if (!data.sku || !data.jancode || !data.imageUrl) {
    return res.status(400).json({ error: 'sku, jancode, and imageUrl are required' });
  }
  if (data.retailPrice === undefined || data.retailPrice === null) {
    return res.status(400).json({ error: 'retailPrice is required' });
  }

  const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existing) {
    return res.status(409).json({ error: `SKU "${data.sku}" already exists` });
  }

  let vectorEmbedding = null;
  if (Array.isArray(req.body.vectorEmbedding)) {
    vectorEmbedding = JSON.stringify(req.body.vectorEmbedding);
  } else {
    try {
      const vector = await embedImageFromUrl(data.imageUrl);
      vectorEmbedding = JSON.stringify(vector);
    } catch (err) {
      console.warn(`Embedding computation failed for new product ${data.sku}: ${err.message}`);
    }
  }

  const product = await prisma.product.create({ data: { ...data, vectorEmbedding } });
  await syncPrimaryImage(product.id, product.imageUrl, product.vectorEmbedding);
  await logActivity('CREATE', {
    sku: product.sku,
    modelName: product.modelName,
    summary: `Created product "${product.modelName}" (${product.sku})`,
    username: req.user?.username,
  });
  res.status(201).json({ product });
}));

productsRouter.put('/:id', requireEditor, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const data = buildProductData(req.body ?? {});

  if (data.sku && data.sku !== existing.sku) {
    const dup = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (dup) return res.status(409).json({ error: `SKU "${data.sku}" already exists` });
  }

  if (Array.isArray(req.body.vectorEmbedding) && data.imageUrl && data.imageUrl !== existing.imageUrl) {
    data.vectorEmbedding = JSON.stringify(req.body.vectorEmbedding);
  } else if (data.imageUrl && data.imageUrl !== existing.imageUrl) {
    try {
      const vector = await embedImageFromUrl(data.imageUrl);
      data.vectorEmbedding = JSON.stringify(vector);
    } catch (err) {
      console.warn(`Embedding computation failed for updated product ${id}: ${err.message}`);
    }
  }

  const summary = buildChangeSummary(existing, data);
  const product = await prisma.product.update({ where: { id }, data });
  if (data.imageUrl && data.imageUrl !== existing.imageUrl) {
    await syncPrimaryImage(product.id, product.imageUrl, product.vectorEmbedding);
  }
  await logActivity('UPDATE', {
    sku: product.sku,
    modelName: product.modelName,
    summary,
    username: req.user?.username,
  });
  res.json({ product });
}));

productsRouter.delete('/:id', requireEditor, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  await prisma.product.delete({ where: { id } });
  await logActivity('DELETE', {
    sku: existing.sku,
    modelName: existing.modelName,
    summary: `Deleted product "${existing.modelName}" (${existing.sku})`,
    username: req.user?.username,
  });
  res.json({ ok: true });
}));

// --- Additional angle photos ---

productsRouter.post('/:id/images', requireEditor, asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { imageUrl, vectorEmbedding, isPrimary } = req.body ?? {};
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });

  const embeddingJson = Array.isArray(vectorEmbedding) ? JSON.stringify(vectorEmbedding) : null;

  if (isPrimary) {
    await prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
  }

  const image = await prisma.productImage.create({
    data: { productId, imageUrl, vectorEmbedding: embeddingJson, isPrimary: !!isPrimary },
  });

  if (isPrimary) {
    await prisma.product.update({ where: { id: productId }, data: { imageUrl, vectorEmbedding: embeddingJson } });
  }

  res.status(201).json({ image });
}));

productsRouter.patch('/:id/images/:imageId/set-primary', requireEditor, asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const imageId = Number(req.params.imageId);
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) return res.status(404).json({ error: 'Image not found' });

  await prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
  await prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } });
  await prisma.product.update({
    where: { id: productId },
    data: { imageUrl: image.imageUrl, vectorEmbedding: image.vectorEmbedding },
  });

  res.json({ ok: true });
}));

productsRouter.delete('/:id/images/:imageId', requireEditor, asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const imageId = Number(req.params.imageId);
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) return res.status(404).json({ error: 'Image not found' });

  const totalCount = await prisma.productImage.count({ where: { productId } });
  if (totalCount <= 1) {
    return res.status(400).json({ error: 'Cannot delete the only remaining photo' });
  }

  await prisma.productImage.delete({ where: { id: imageId } });
  await deleteFromStorage(image.imageUrl).catch((err) => console.warn(`Storage cleanup failed: ${err.message}`));

  if (image.isPrimary) {
    const next = await prisma.productImage.findFirst({ where: { productId }, orderBy: { createdAt: 'asc' } });
    if (next) {
      await prisma.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
      await prisma.product.update({
        where: { id: productId },
        data: { imageUrl: next.imageUrl, vectorEmbedding: next.vectorEmbedding },
      });
    }
  }

  res.json({ ok: true });
}));
