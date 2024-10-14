const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authguardEmploye = require("../services/authguardEmploye")

const employeRouter = express.Router();

//multer
const multer = require('multer');
const path = require('path');

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join('public', 'uploads'))
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

//login
employeRouter.get("/loginEmploye", async (req, res) => {
    res.render("pages/loginEmploye.twig")
})

employeRouter.post("/loginEmploye", async (req, res) => {
    try {
        const { mail, password } = req.body;
        const allEmployes = await prisma.employe.findMany({
            select: { mail: true }
        });

        const employe = await prisma.employe.findUnique({
            where: { mail },
            include: { entreprise: true }
        });

        if (!employe || !employe.entreprise) {
            console.error("Employé ou entreprise non trouvé");
            return res.status(400).send("Email ou mot de passe incorrect");
        }

        const validPassword = await bcrypt.compare(password, employe.password);
        console.error("Mot de passe valide:", validPassword ? "Oui" : "Non");

        if (!validPassword) {
            console.error("Mot de passe invalide");
            return res.status(400).send("Email ou mot de passe incorrect");
        }

        // Stockage des informations de l'employé dans la session
        req.session.employe = {
            id: employe.id,
            nom: employe.nom,
            prenom: employe.prenom,
            mail: employe.mail,
            entrepriseId: employe.entreprise.id
        };

        res.redirect("/homeEmploye");
    } catch (error) {
        console.error("Erreur lors de la connexion :", error);
        res.status(500).send("Erreur lors de la connexion");
    }
});

// homeEmploye
employeRouter.get('/homeEmploye', authguardEmploye, async (req, res) => {
    try {
        const employe = await prisma.employe.findUnique({
            where: { id: req.session.employe.id },
            include: {
                ordinateur: true,
                blames: true,
                taches: true,
                entreprise: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        const taches = await prisma.tache.findMany({
            where: {
                employeId: req.session.employe.id
            },
            include: {
                employes: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
                    }
                }
            }
        });

        const blames = await prisma.blame.findMany({
            where: { employeId: req.session.employe.id },
            include: {
                entreprise: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        // Ajout du nom de l'entreprise et de la fonction de l'employé
        const entrepriseName = employe.entreprise ? employe.entreprise.name : "Non spécifié";
        const employeFunction = employe.fonction || "Non spécifié"; // Ajout de la fonction de l'employé

        res.render("pages/homeEmploye.twig", {
            employe: employe,
            taches: taches,
            blames: blames,
            entrepriseName: entrepriseName,
            employeFunction: employeFunction // Ajout de la fonction de l'employé dans les données envoyées à la vue
        });
    } catch (error) {
        console.error("Erreur lors du chargement des données de l'employé:", error);
        res.render("pages/homeEmploye.twig", {
            employe: req.session.employe,
            error: "Une erreur est survenue lors du chargement des données",
            entrepriseName: "Non disponible",
            employeFunction: "Non disponible" // En cas d'erreur, on ajoute quand même cette information
        });
    }
});

// Route pour marquer une tâche comme terminée
employeRouter.post('/taches/:id/complete', authguardEmploye, async (req, res) => {
    const tacheId = parseInt(req.params.id);
    try {
        await prisma.tache.update({
            where: { id: tacheId },
            data: { completed: true }
        });
        res.redirect('/homeEmploye');
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la tâche:", error);
        res.status(500).json({ error: "Erreur lors de la mise à jour de la tâche" });
    }
});

//modifier le profil
employeRouter.get('/editProfile/:id', authguardEmploye, async (req, res) => {
    try {
        const employe = await prisma.employe.findUnique({
            where: { id: req.session.employe.id },
            select: { mail: true, photo: true }
        });

        res.render("pages/editProfile.twig", {
            employe: employe,
            successMessage: req.session.successMessage,
            errorMessage: req.session.errorMessage
        });

        // Effacez les messages après les avoir affichés
        delete req.session.successMessage;
        delete req.session.errorMessage;
    } catch (error) {
        console.error("Erreur lors du chargement du profil:", error);
        res.status(500).send("Erreur lors du chargement du profil");
    }
});

employeRouter.post('/editProfile', authguardEmploye, upload.single('photo'), async (req, res) => {
    try {
        const { mail, password, newPassword } = req.body;
        const employeId = req.session.employe.id;

        // Vérifier le mot de passe actuel
        const employe = await prisma.employe.findUnique({ where: { id: employeId } });
        const isPasswordValid = await bcrypt.compare(password, employe.password);

        if (!isPasswordValid) {
            req.session.errorMessage = "Mot de passe actuel incorrect";
            return res.redirect('/homeEmploye');
        }

        // Préparer les données à mettre à jour
        let updateData = { mail };

        // Mettre à jour le mot de passe si un nouveau est fourni
        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateData.password = hashedPassword;
        }

        // Mettre à jour la photo si une nouvelle est uploadée
        if (req.file) {
            updateData.photo = `/uploads/${req.file.filename}`;
        }

        // Mettre à jour l'employé
        await prisma.employe.update({
            where: { id: employeId },
            data: updateData
        });

        req.session.successMessage = "Profil mis à jour avec succès";
        res.redirect('/homeEmploye');
    } catch (error) {
        console.error("Erreur lors de la mise à jour du profil:", error);
        req.session.errorMessage = "Erreur lors de la mise à jour du profil";
        res.redirect('/login');
    }
});

// Route pour la déconnexion
employeRouter.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Erreur lors de la déconnexion:", err);
        }
        res.redirect('/loginEmploye');
    });
});

module.exports = employeRouter;