import { prisma } from '../src/lib/prisma.js';

async function main() {
  const products = await prisma.product.findMany({ include: { images: true } });

  for (const product of products) {
    if (product.images.length > 0) {
      console.log(`Skipping ${product.sku}: already has ${product.images.length} image(s)`);
      continue;
    }
    await prisma.productImage.create({
      data: {
        productId: product.id,
        imageUrl: product.imageUrl,
        vectorEmbedding: product.vectorEmbedding,
        isPrimary: true,
      },
    });
    console.log(`Backfilled primary image for ${product.sku}`);
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
