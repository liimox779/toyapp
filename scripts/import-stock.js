import fs from 'fs';
import { prisma } from '../src/lib/prisma.js';

const JSON_PATH = new URL('../scratch_stock_import.json', import.meta.url);

async function main() {
  const products = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

  for (const p of products) {
    const imageUrl = `https://placehold.co/400x400/e5e7eb/6b7280?text=${encodeURIComponent(p.sku)}`;
    const data = { ...p, imageUrl };

    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (existing) {
      await prisma.product.update({ where: { sku: p.sku }, data });
      console.log(`Updated ${p.sku}`);
    } else {
      await prisma.product.create({ data: { ...data, vectorEmbedding: null } });
      console.log(`Created ${p.sku}`);
    }
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
