-- DropForeignKey
ALTER TABLE `employe` DROP FOREIGN KEY `Employe_ordinateurId_fkey`;

-- AlterTable
ALTER TABLE `employe` MODIFY `ordinateurId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Employe` ADD CONSTRAINT `Employe_ordinateurId_fkey` FOREIGN KEY (`ordinateurId`) REFERENCES `Ordinateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
