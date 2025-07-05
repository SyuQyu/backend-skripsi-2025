/*
  Warnings:

  - You are about to drop the `ListBadWords` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BadWordGoodWord" DROP CONSTRAINT "BadWordGoodWord_badWordId_fkey";

-- DropTable
DROP TABLE "ListBadWords";

-- CreateTable
CREATE TABLE "BadWord" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadWord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BadWordGoodWord" ADD CONSTRAINT "BadWordGoodWord_badWordId_fkey" FOREIGN KEY ("badWordId") REFERENCES "BadWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
