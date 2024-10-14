/*
  Warnings:

  - You are about to drop the `_employetotache` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `employeId` to the `Tache` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_employetotache` DROP FOREIGN KEY `_EmployeToTache_A_fkey`;

-- DropForeignKey
ALTER TABLE `_employetotache` DROP FOREIGN KEY `_EmployeToTache_B_fkey`;

-- AlterTable
ALTER TABLE `tache` ADD COLUMN `employeId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `_employetotache`;

-- AddForeignKey
ALTER TABLE `Tache` ADD CONSTRAINT `Tache_employeId_fkey` FOREIGN KEY (`employeId`) REFERENCES `Employe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
