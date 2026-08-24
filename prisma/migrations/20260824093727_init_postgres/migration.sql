-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "jancode" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "workCategory" TEXT NOT NULL,
    "characterCategory" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "height" TEXT NOT NULL,
    "weight" TEXT NOT NULL,
    "retailPrice" DOUBLE PRECISION NOT NULL,
    "retailSpecialPrice" DOUBLE PRECISION,
    "agentPrice" DOUBLE PRECISION,
    "usedPrice" DOUBLE PRECISION,
    "usedSpecialPrice" DOUBLE PRECISION,
    "usedIncompletePrice" DOUBLE PRECISION,
    "usedIncompleteSpecialPrice" DOUBLE PRECISION,
    "partPrice" DOUBLE PRECISION,
    "partSpecialPrice" DOUBLE PRECISION,
    "partIncompletePrice" DOUBLE PRECISION,
    "partIncompleteSpecialPrice" DOUBLE PRECISION,
    "vectorEmbedding" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "vectorEmbedding" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
