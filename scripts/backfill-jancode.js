import { prisma } from '../src/lib/prisma.js';

function randomJancode() {
  let code = '';
  for (let i = 0; i < 13; i++) code += Math.floor(Math.random() * 10);
  return code;
}

async function main() {
  const products = await prisma.product.findMany({ where: { jancode: null } });
  for (const product of products) {
    await prisma.product.update({ where: { id: product.id }, data: { jancode: randomJancode() } });
    console.log(`Set jancode for ${product.sku}`);
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
