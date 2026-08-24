-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sku" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "workCategory" TEXT NOT NULL,
    "characterCategory" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "height" TEXT NOT NULL,
    "weight" TEXT NOT NULL,
    "retailPrice" REAL NOT NULL,
    "retailSpecialPrice" REAL,
    "agentPrice" REAL,
    "usedPrice" REAL,
    "usedSpecialPrice" REAL,
    "usedIncompletePrice" REAL,
    "usedIncompleteSpecialPrice" REAL,
    "partPrice" REAL,
    "partSpecialPrice" REAL,
    "partIncompletePrice" REAL,
    "partIncompleteSpecialPrice" REAL,
    "vectorEmbedding" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
