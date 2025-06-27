/*
  Warnings:

  - You are about to drop the column `faculty` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `nim` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "faculty",
DROP COLUMN "gender",
DROP COLUMN "nim",
DROP COLUMN "phone";
