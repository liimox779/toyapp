import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../src/lib/prisma.js';
import { embedImageFromBuffer } from '../src/lib/embeddings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'stock');

async function main() {
  const files = fs.readdirSync(IMAGES_DIR).filter((f) => f.toLowerCase().endsWith('.jpg'));

  for (const file of files) {
    const sku = path.basename(file, '.jpg');
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (!existing) {
      console.warn(`Skipping ${sku}: no matching product in database`);
      continue;
    }

    const buffer = fs.readFileSync(path.join(IMAGES_DIR, file));
    const imageUrl = `/images/stock/${file}`;

    let vectorEmbedding = existing.vectorEmbedding;
    try {
      const vector = await embedImageFromBuffer(buffer);
      vectorEmbedding = JSON.stringify(vector);
    } catch (err) {
      console.warn(`Embedding computation failed for ${sku}: ${err.message}`);
    }

    await prisma.product.update({ where: { sku }, data: { imageUrl, vectorEmbedding } });
    console.log(`Updated ${sku} -> ${imageUrl}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
