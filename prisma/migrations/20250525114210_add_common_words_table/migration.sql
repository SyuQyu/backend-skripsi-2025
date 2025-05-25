-- CreateTable
CREATE TABLE "CommonWord" (
    "id" SERIAL NOT NULL,
    "word" TEXT NOT NULL,

    CONSTRAINT "CommonWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommonWord_word_key" ON "CommonWord"("word");
