/*
  Warnings:

  - Made the column `productVariantId` on table `Wishlist` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Wishlist" ALTER COLUMN "productVariantId" SET NOT NULL;
