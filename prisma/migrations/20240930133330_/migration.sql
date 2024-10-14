/*
  Warnings:

  - A unique constraint covering the columns `[macAdress]` on the table `Ordinateur` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `macAdress` to the `Ordinateur` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ordinateur` ADD COLUMN `macAdress` VARCHAR(17) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Ordinateur_macAdress_key` ON `Ordinateur`(`macAdress`);
