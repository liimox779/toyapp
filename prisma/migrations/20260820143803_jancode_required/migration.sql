/*
  Warnings:

  - Made the column `jancode` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
INSERT INTO "new_Product" ("agentPrice", "characterCategory", "characterName", "createdAt", "height", "id", "imageUrl", "jancode", "modelName", "partIncompletePrice", "partIncompleteSpecialPrice", "partPrice", "partSpecialPrice", "retailPrice", "retailSpecialPrice", "series", "sku", "updatedAt", "usedIncompletePrice", "usedIncompleteSpecialPrice", "usedPrice", "usedSpecialPrice", "vectorEmbedding", "weight", "workCategory") SELECT "agentPrice", "characterCategory", "characterName", "createdAt", "height", "id", "imageUrl", "jancode", "modelName", "partIncompletePrice", "partIncompleteSpecialPrice", "partPrice", "partSpecialPrice", "retailPrice", "retailSpecialPrice", "series", "sku", "updatedAt", "usedIncompletePrice", "usedIncompleteSpecialPrice", "usedPrice", "usedSpecialPrice", "vectorEmbedding", "weight", "workCategory" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
