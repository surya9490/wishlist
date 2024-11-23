/*
  Warnings:

  - Made the column `customerId` on table `Wishlist` required. This step will fail if there are existing NULL values in that column.
  - Made the column `shop` on table `Wishlist` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Wishlist" ALTER COLUMN "customerId" SET NOT NULL,
ALTER COLUMN "shop" SET NOT NULL;
