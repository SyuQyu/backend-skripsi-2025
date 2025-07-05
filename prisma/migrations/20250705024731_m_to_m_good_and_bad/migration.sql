/*
  Warnings:

  - You are about to drop the `ListGoodWords` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ListGoodWords" DROP CONSTRAINT "ListGoodWords_badWordId_fkey";

-- DropTable
DROP TABLE "ListGoodWords";

-- CreateTable
CREATE TABLE "GoodWord" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadWordGoodWord" (
    "id" TEXT NOT NULL,
    "badWordId" TEXT NOT NULL,
    "goodWordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadWordGoodWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoodWord_word_key" ON "GoodWord"("word");

-- CreateIndex
CREATE UNIQUE INDEX "BadWordGoodWord_badWordId_goodWordId_key" ON "BadWordGoodWord"("badWordId", "goodWordId");

-- AddForeignKey
ALTER TABLE "BadWordGoodWord" ADD CONSTRAINT "BadWordGoodWord_badWordId_fkey" FOREIGN KEY ("badWordId") REFERENCES "ListBadWords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadWordGoodWord" ADD CONSTRAINT "BadWordGoodWord_goodWordId_fkey" FOREIGN KEY ("goodWordId") REFERENCES "GoodWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
