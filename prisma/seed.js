import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { embedImageFromUrl } from '../src/lib/embeddings.js';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'P@$$w0rd';

const sampleProducts = [
  {
    sku: 'FIG-NRT-001',
    imageUrl: 'https://picsum.photos/seed/naruto-figure/600/600',
    workCategory: 'ฟิกเกอร์',
    characterCategory: 'อนิเมะ',
    modelName: 'Naruto Uzumaki Sage Mode',
    characterName: 'นารูโตะ อุซึมากิ',
    series: 'นารูโตะ ชิปปูเดน',
    height: '25 cm',
    weight: '1.2 kg',
    retailPrice: 4500,
    retailSpecialPrice: 4200,
    agentPrice: 3600,
    usedPrice: 3200,
    usedSpecialPrice: 2900,
    usedIncompletePrice: 2500,
    usedIncompleteSpecialPrice: 2200,
    partPrice: 1200,
    partSpecialPrice: 1000,
    partIncompletePrice: 800,
    partIncompleteSpecialPrice: 650,
  },
  {
    sku: 'FIG-LUFFY-002',
    imageUrl: 'https://picsum.photos/seed/luffy-figure/600/600',
    workCategory: 'ฟิกเกอร์',
    characterCategory: 'อนิเมะ',
    modelName: 'Luffy Gear 5',
    characterName: 'มังกี้ ดี ลูฟี่',
    series: 'วันพีซ',
    height: '30 cm',
    weight: '1.5 kg',
    retailPrice: 6800,
    retailSpecialPrice: 6300,
    agentPrice: 5400,
    usedPrice: 4900,
    usedSpecialPrice: 4500,
    usedIncompletePrice: 3800,
    usedIncompleteSpecialPrice: 3400,
    partPrice: 1800,
    partSpecialPrice: 1500,
    partIncompletePrice: 1200,
    partIncompleteSpecialPrice: 950,
  },
  {
    sku: 'FIG-STM-003',
    imageUrl: 'https://picsum.photos/seed/saitama-figure/600/600',
    workCategory: 'ฟิกเกอร์',
    characterCategory: 'อนิเมะ',
    modelName: 'One Punch Man Standard Ver.',
    characterName: 'ไซตามะ',
    series: 'One Punch Man',
    height: '22 cm',
    weight: '0.9 kg',
    retailPrice: 3900,
    retailSpecialPrice: 3600,
    agentPrice: 3100,
    usedPrice: 2700,
    usedSpecialPrice: 2400,
    usedIncompletePrice: 2100,
    usedIncompleteSpecialPrice: 1800,
    partPrice: 1000,
    partSpecialPrice: 850,
    partIncompletePrice: 700,
    partIncompleteSpecialPrice: 550,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: { role: 'admin' },
    create: { username: ADMIN_USERNAME, password: passwordHash, role: 'admin' },
  });
  console.log(`Seeded admin user "${ADMIN_USERNAME}"`);

  for (const product of sampleProducts) {
    const existing = await prisma.product.findUnique({ where: { sku: product.sku } });
    if (existing) {
      console.log(`Skipping existing product ${product.sku}`);
      continue;
    }

    let vectorEmbedding = null;
    try {
      console.log(`Computing CLIP embedding for ${product.sku} (first run downloads the model, this can take a while)...`);
      const vector = await embedImageFromUrl(product.imageUrl);
      vectorEmbedding = JSON.stringify(vector);
    } catch (err) {
      console.warn(`Could not compute embedding for ${product.sku}: ${err.message}`);
      console.warn('Product will be created without a vector; visual search will skip it until re-indexed.');
    }

    await prisma.product.create({
      data: { ...product, vectorEmbedding },
    });
    console.log(`Created product ${product.sku}`);
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
