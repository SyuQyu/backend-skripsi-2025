/*
  Warnings:

  - A unique constraint covering the columns `[word,badWordId]` on the table `ListGoodWords` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ListGoodWords_word_badWordId_key" ON "ListGoodWords"("word", "badWordId");
