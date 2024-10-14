-- DropForeignKey
ALTER TABLE `tache` DROP FOREIGN KEY `Tache_employeId_fkey`;

-- AlterTable
ALTER TABLE `tache` MODIFY `employeId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Tache` ADD CONSTRAINT `Tache_employeId_fkey` FOREIGN KEY (`employeId`) REFERENCES `Employe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
