const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// Affiche la page de connexion
exports.getLoginPage = (req, res) => {
    res.render("pages/login.twig");
};

// Gère la connexion des entreprises et des employés
exports.login = async (req, res) => {
    try {
        const entreprise = await prisma.entreprise.findUnique({
            where: { mail: req.body.mail }
        });
        if (entreprise && await bcrypt.compare(req.body.password, entreprise.password)) {
            req.session.entreprise = entreprise;
            res.redirect('/home');
        } else {
            const employe = await prisma.employe.findUnique({
                where: { email: req.body.mail }
            });
            if (employe && await bcrypt.compare(req.body.password, employe.password)) {
                req.session.employe = employe;
                res.redirect('/employe/home');
            } else {
                throw new Error("Identifiants incorrects");
            }
        }
    } catch (error) {
        res.render("pages/login.twig", { error: error.message });
    }
};

// Affiche la page d'inscription
exports.getRegisterPage = (req, res) => {
    res.render("pages/register.twig");
};

// Gère l'inscription d'une nouvelle entreprise
exports.register = async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const entreprise = await prisma.entreprise.create({
            data: {
                name: req.body.name,
                mail: req.body.mail,
                password: hashedPassword,
                director: req.body.director,
                siret: req.body.siret
            }
        });
        res.redirect('/login');
    } catch (error) {
        res.render("pages/register.twig", { error: error.message });
    }
};

// Affiche le tableau de bord de l'entreprise
exports.getHome = async (req, res) => {
    try {
        const entreprise = await prisma.entreprise.findUnique({
            where: { id: req.session.entreprise.id },
            include: {
                employes: {
                    include: {
                        ordinateur: true,
                        taches: true
                    }
                },
                ordinateurs: true,
                taches: {
                    include: {
                        employes: true
                    }
                }
            }
        });
        res.render("pages/home.twig", { entreprise });
    } catch (error) {
        res.status(500).send("Une erreur est survenue");
    }
};

// Ajoute un nouvel employé à l'entreprise
exports.ajouterEmploye = async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const nouvelEmploye = await prisma.employe.create({
            data: {
                name: req.body.name,
                email: req.body.email,
                fonction: req.body.fonction,
                password: hashedPassword,
                age: parseInt(req.body.age),
                sexe: req.body.sexe,
                entrepriseId: req.session.entreprise.id
            }
        });
        res.redirect('/home');
    } catch (error) {
        res.status(500).send("Erreur lors de l'ajout de l'employé");
    }
};

// Ajoute un nouvel ordinateur à l'entreprise
exports.ajouterOrdinateur = async (req, res) => {
    try {
        const nouvelOrdinateur = await prisma.ordinateur.create({
            data: {
                nom: req.body.nom,
                entrepriseId: req.session.entreprise.id
            }
        });
        res.redirect('/home');
    } catch (error) {
        res.status(500).send("Erreur lors de l'ajout de l'ordinateur");
    }
};

// Supprime un ordinateur de l'entreprise
exports.supprimerOrdinateur = async (req, res) => {
    try {
        await prisma.ordinateur.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.redirect('/home');
    } catch (error) {
        res.status(500).send("Erreur lors de la suppression de l'ordinateur");
    }
};

// Associe un employé à un ordinateur
exports.associerEmployeOrdinateur = async (req, res) => {
    try {
        const { employeId, ordinateurId } = req.body;
        await prisma.employe.update({
            where: { id: parseInt(employeId) },
            data: { ordinateurId: parseInt(ordinateurId) }
        });
        res.redirect('/home');
    } catch (error) {
        res.status(500).send("Erreur lors de l'association employé-ordinateur");
    }
};

// Crée une nouvelle tâche et l'assigne à un ou plusieurs employés
exports.creerTache = async (req, res) => {
    try {
        const { description, deadline, employeIds } = req.body;
        await prisma.tache.create({
            data: {
                description,
                deadline: new Date(deadline),
                entrepriseId: req.session.entreprise.id,
                employes: {
                    connect: employeIds.map(id => ({ id: parseInt(id) }))
                }
            }
        });
        res.redirect('/home');
    } catch (error) {
        res.status(500).send("Erreur lors de la création de la tâche");
    }
};

// Met à jour le statut d'une tâche
exports.updateTacheStatus = async (req, res) => {
    try {
        const { tacheId, completed } = req.body;
        await prisma.tache.update({
            where: { id: parseInt(tacheId) },
            data: { completed: completed === 'true' }
        });
        res.redirect('/home');
    } catch (error) {
        res.status(500).send("Erreur lors de la mise à jour du statut de la tâche");
    }
};

// Déconnecte l'utilisateur (entreprise ou employé)
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/login');
};