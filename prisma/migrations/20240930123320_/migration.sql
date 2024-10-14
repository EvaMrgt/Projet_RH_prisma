-- CreateTable
CREATE TABLE `Tache` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NOT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `entrepriseId` INTEGER NOT NULL,
    `fichierPath` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_EmployeToTache` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_EmployeToTache_AB_unique`(`A`, `B`),
    INDEX `_EmployeToTache_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Tache` ADD CONSTRAINT `Tache_entrepriseId_fkey` FOREIGN KEY (`entrepriseId`) REFERENCES `Entreprise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EmployeToTache` ADD CONSTRAINT `_EmployeToTache_A_fkey` FOREIGN KEY (`A`) REFERENCES `Employe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EmployeToTache` ADD CONSTRAINT `_EmployeToTache_B_fkey` FOREIGN KEY (`B`) REFERENCES `Tache`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
