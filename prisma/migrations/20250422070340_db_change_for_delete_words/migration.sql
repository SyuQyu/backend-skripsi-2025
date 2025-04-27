-- DropForeignKey
ALTER TABLE "ListGoodWords" DROP CONSTRAINT "ListGoodWords_badWordId_fkey";

-- AddForeignKey
ALTER TABLE "ListGoodWords" ADD CONSTRAINT "ListGoodWords_badWordId_fkey" FOREIGN KEY ("badWordId") REFERENCES "ListBadWords"("id") ON DELETE CASCADE ON UPDATE CASCADE;
