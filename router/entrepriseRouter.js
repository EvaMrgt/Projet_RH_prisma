const entrepriseRouter = require("express").Router()
const bcrypt = require("bcrypt")
const { PrismaClient } = require("@prisma/client")
const authguard = require("../services/authguard")
const hashPasswordExtension = require("../services/extensions/hashPasswordExtension")

const prisma = new PrismaClient().$extends(hashPasswordExtension)

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

// Inscription entreprise
entrepriseRouter.get("/register", (req, res) => {
    res.render("pages/register.twig")
})

entrepriseRouter.post("/register", async (req, res) => {
    try {
        if (req.body.password === req.body.confirmPassword) {
            const entreprise = await prisma.entreprise.create({
                data: {
                    name: req.body.name,
                    mail: req.body.mail,
                    password: req.body.password,
                    director: req.body.director,
                    siret: req.body.siret
                }
            })
            res.redirect("/login")
        } else throw ({ confirmPassword: "Les mots de passe ne correspondent pas" })
    }
    catch (error) {
        res.render("pages/register.twig", { error: error, title: "Inscription Entreprise" })
    }
})

// Connexion entreprise
entrepriseRouter.get("/login", (req, res) => {
    res.render("pages/login.twig")
})

entrepriseRouter.post('/login', async (req, res) => {
    try {
        const entreprise = await prisma.entreprise.findUnique({
            where: {
                mail: req.body.mail
            }
        });
        if (entreprise) {
            if (await bcrypt.compare(req.body.password, entreprise.password)) {
                req.session.entreprise = entreprise;
                res.redirect('/');
            } else {
                throw { password: "Mot de passe incorrect" };
            }
        } else {
            throw { mail: "Cet email n'existe pas" };
        }
    } catch (error) {
        console.error(error);
        res.render("pages/login.twig", { error });
    }
});

// home entreprise : affichage employés et pc et tâches
entrepriseRouter.get('/', authguard, async (req, res) => {
    try {
        const employes = await prisma.employe.findMany({
            where: { entrepriseId: req.session.entreprise.id },
            include: {
                taches: {
                    where: {
                        completed: false // Ne récupère que les tâches non terminées
                    }
                },
                blames: true,
                ordinateur: true
            }
        });

        const ordinateurs = await prisma.ordinateur.findMany({
            where: { entrepriseId: req.session.entreprise.id },
            include: {
                employe: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
                    }
                }
            }
        });

        const taches = await prisma.tache.findMany({
            where: { entrepriseId: req.session.entreprise.id },
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
            where: { entrepriseId: req.session.entreprise.id },
            include: {
                employe: {
                    select: {
                        id: true,
                        firstname: true,
                        lastname: true
                    }
                }
            }
        });

        res.render("pages/home.twig", {
            entreprise: req.session.entreprise,
            employes: employes,
            ordinateurs: ordinateurs,
            taches: taches,
            blames: blames
        });
    } catch (error) {
        res.render("pages/home.twig", {
            entreprise: req.session.entreprise,
            error
        });
    }
});

// Créer un employé
entrepriseRouter.get("/addEmploye", (req, res) => {
    try {
        res.render("pages/addEmploye.twig");
    } catch (error) {
        console.error("Erreur lors du rendu :", error);
        res.status(500).send("Erreur lors du chargement de la page");
    }
});

entrepriseRouter.post('/addEmploye', authguard, upload.single('photo'), async (req, res) => {
    try {
        if (!req.body.firstname || !req.body.lastname || !req.body.mail || !req.body.password) {
            throw new Error("Tous les champs obligatoires doivent être remplis");
        }
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        let photoPath = null;
        if (req.file) {
            photoPath = `/uploads/${req.file.filename}`;
        } else {
            console.error("Aucun fichier n'a été uploadé");
        }

        const employe = await prisma.employe.create({
            data: {
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                mail: req.body.mail,
                password: hashedPassword,
                age: parseInt(req.body.age),
                sexe: req.body.sexe,
                fonction: req.body.fonction,
                photo: photoPath,
                entrepriseId: req.session.entreprise.id
            }
        });
        if (employe.photo) {
            const fullPath = path.join('public', employe.photo);
        }
        req.session.successMessage = "Employé ajouté avec succès";
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render("pages/addEmploye.twig", {
            error: error.message,
            employe: req.session.employe,
            formData: req.body // Pour repopuler le formulaire en cas d'erreur
        });
    }
});

// Modifier un employé
entrepriseRouter.get('/editEmploye/:id', authguard, async (req, res) => {
    try {
        const employeId = parseInt(req.params.id);

        const employe = await prisma.employe.findUnique({
            where: { id: employeId }
        });

        if (!employe) {
            throw new Error("Employé non trouvé");
        }

        if (employe.entrepriseId !== req.session.entreprise.id) {
            throw new Error("Vous n'avez pas l'autorisation de modifier cet employé");
        }

        res.render("pages/editEmploye.twig", {
            employe: employe,
            entreprise: req.session.entreprise
        });
    } catch (error) {
        console.error("Erreur dans GET /editEmploye/:id:", error);
        res.status(404).render("pages/login.twig", {
            error: error.message,
            entreprise: req.session.entreprise
        });
    }
});

entrepriseRouter.post('/editEmploye/:id', authguard, upload.single('photo'), async (req, res) => {
    try {
        const employeId = parseInt(req.params.id);

        let updateData = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            mail: req.body.mail,
            age: req.body.age ? parseInt(req.body.age) : undefined,
            sexe: req.body.sexe,
            fonction: req.body.fonction
        };

        // Si une nouvelle photo a été uploadée
        if (req.file) {
            updateData.photo = `/uploads/${req.file.filename}`;
        }

        const updatedEmploye = await prisma.employe.update({
            where: { id: employeId },
            data: updateData
        });

        res.redirect('/');
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'employé:", error);
        res.status(400).render("pages/editEmploye.twig", {
            error: error.message,
            employe: req.body,
            entreprise: req.session.entreprise
        });
    }
});

// Supprimer un employé
entrepriseRouter.get('/deleteEmploye/:id', authguard, async (req, res) => {
    try {
        const employeId = parseInt(req.params.id);
        // Vérifier si l'employé existe et appartient à l'entreprise
        const employe = await prisma.employe.findUnique({
            where: { id: employeId },
            include: { entreprise: true }
        });

        if (!employe) {
            throw new Error("Employé non trouvé");
        }

        if (employe.entrepriseId !== req.session.entreprise.id) {
            throw new Error("Vous n'avez pas l'autorisation de supprimer cet employé");
        }
        // Supprimer l'employé
        await prisma.employe.delete({
            where: { id: employeId }
        });

        res.redirect('/');
    } catch (error) {
        console.error("ça marche pas pute:", error);
        res.status(400).render("pages/home.twig", {
            error: error.message,
            entreprise: req.session.entreprise
        });
    }
});

// Créer un ordinateur
entrepriseRouter.get('/addOrdi', authguard, async (req, res) => {
    try {
        const employes = await prisma.employe.findMany({
            where: { entrepriseId: req.session.entreprise.id },
            select: { id: true, firstname: true, lastname: true }
        });
        res.render("pages/addOrdi.twig", {
            entreprise: req.session.entreprise,
            employes: employes
        });
    } catch (error) {
        console.error(error);
        res.status(500).render("pages/addOrdi.twig", {
            error: "Une erreur est survenue lors du chargement de la page",
            entreprise: req.session.entreprise
        });
    }
});

entrepriseRouter.post('/addOrdi', authguard, async (req, res) => {
    try {
        const { macAdress, employeId } = req.body;
        // Valider le format de l'adresse MAC
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        if (!macRegex.test(macAdress)) {
            throw new Error("Format d'adresse MAC invalide");
        }
        // Créer l'objet de données pour l'ordinateur
        const ordinateurData = {
            macAdress: macAdress,
            entrepriseId: req.session.entreprise.id
        };
        // Créer l'ordinateur
        const ordinateur = await prisma.ordinateur.create({
            data: ordinateurData
        });
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
});

// Supprimer un ordinateur
entrepriseRouter.get('/deleteOrdi/:id', authguard, async (req, res) => {
    try {
        const ordinateurId = parseInt(req.params.id);
        // Vérifier si l'ordinateur existe et appartient à l'entreprise
        const ordinateur = await prisma.ordinateur.findUnique({
            where: { id: ordinateurId },
            include: { entreprise: true }
        });

        if (!ordinateur) {
            throw new Error("Ordinateur non trouvé");
        }

        if (ordinateur.entrepriseId !== req.session.entreprise.id) {
            throw new Error("Vous n'avez pas l'autorisation de supprimer cet ordinateur");
        }

        // Supprimer l'ordinateur
        await prisma.ordinateur.delete({
            where: { id: ordinateurId }
        });

        res.redirect('/');
    } catch (error) {
        console.error("Erreur lors de la suppression de l'ordinateur:", error);
        res.status(400).render("/home", {
            error: error.message,
            entreprise: req.session.entreprise
        });
    }
});

// Assigner ou réassigner un ordinateur à un employé
entrepriseRouter.post('/assignOrdinateur', authguard, async (req, res) => {
    try {
        const employeId = parseInt(req.body.employeId);
        const ordinateurId = parseInt(req.body.ordinateurId);

        if (!req.session.entreprise || !req.session.entreprise.id) {
            throw new Error("Session d'entreprise non valide");
        }

        // Vérifier si l'employé existe et appartient à l'entreprise
        const employe = await prisma.employe.findUnique({
            where: {
                id: employeId,
                entrepriseId: parseInt(req.session.entreprise.id)
            }
        });

        if (!employe) {
            throw new Error(`Employé non trouvé ou n'appartient pas à l'entreprise. ID: ${employeId}`);
        }

        // Vérifier si l'ordinateur existe et appartient à l'entreprise
        const ordinateur = await prisma.ordinateur.findUnique({
            where: {
                id: ordinateurId,
                entrepriseId: parseInt(req.session.entreprise.id)
            }
        });

        if (!ordinateur) {
            throw new Error(`Ordinateur non trouvé ou n'appartient pas à l'entreprise. ID: ${ordinateurId}`);
        }

        // Vérifier si l'ordinateur est déjà assigné à un autre employé
        const currentAssignment = await prisma.employe.findFirst({
            where: { ordinateurId: ordinateurId }
        });

        if (currentAssignment && currentAssignment.id !== employeId) {
            // Désassigner l'ordinateur de l'employé actuel
            await prisma.employe.update({
                where: { id: currentAssignment.id },
                data: { ordinateurId: null }
            });
        }

        // Associer l'ordinateur au nouvel employé
        const updatedEmploye = await prisma.employe.update({
            where: { id: employeId },
            data: { ordinateurId: ordinateurId }
        });

        res.redirect('/');
    } catch (error) {
        console.error("Erreur lors de l'association de l'ordinateur:", error);
        res.status(400).render("pages/home", {
            error: error.message,
            entreprise: req.session.entreprise
        });
    }
});

// Ajouter un blâme à un employé
entrepriseRouter.get('/addBlame', authguard, async (req, res) => {
    try {
        const entrepriseId = req.session.entreprise.id;
        const employes = await prisma.employe.findMany({
            where: {
                entrepriseId: entrepriseId
            }
        });
        const blames = await prisma.blame.findMany({
            where: {
                entrepriseId: entrepriseId
            }
        });

        res.render('pages/addBlame.twig', {
            blames: blames,
            title: 'Liste des blâmes',
            employes: employes,
            entreprise: req.session.entreprise
        });
    } catch (error) {
        res.render("pages/home.twig", { error });
    }
});

entrepriseRouter.post('/addBlame', authguard, async (req, res) => {
    const { employeId, description } = req.body;

    try {
        const result = await prisma.$transaction(async (prisma) => {
            const newBlame = await prisma.blame.create({
                data: {
                    description,
                    employeId: parseInt(employeId),
                    entrepriseId: req.session.entreprise.id
                }
            });

            const blames = await prisma.blame.count({
                where: { employeId: parseInt(employeId) }
            });

            const employe = await prisma.employe.findUnique({
                where: { id: parseInt(employeId) }
            });

            if (blames >= 3) {
                await prisma.employe.update({
                    where: { id: parseInt(employeId) },
                    data: { ordinateurId: null }
                });
                await prisma.employe.delete({
                    where: { id: parseInt(employeId) }
                });
                return { success: true, employeDeleted: true, message: "Employé supprimé après 3 blâmes" };
            }

            res.redirect("/")
        });

        res.json(result);
    } catch (error) {
        console.error('Error in /addBlame:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

//delete blame
entrepriseRouter.get('/deleteBlame/:id', authguard, async (req, res) => {
    try {
        const blameId = parseInt(req.params.id);
        const blame = await prisma.blame.findUnique({
            where: { id: blameId },
            include: { employe: true }
        });

        // Vérifier si le blâme existe et appartient à l'entreprise de l'utilisateur connecté
        if (!blame || blame.employe.entrepriseId !== req.session.entreprise.id) {
            return res.status(404).send("Blâme non trouvé ou non autorisé");
        }

        // Supprimer le blâme
        await prisma.blame.delete({
            where: { id: blameId }
        });

        res.redirect('/addBlame');
    } catch (error) {
        console.error("Erreur lors de la suppression du blâme:", error);
        res.redirect('/addBlame');
    }
});

// Créer une tâche
entrepriseRouter.get('/addTache', authguard, async (req, res) => {
    try {
        const entrepriseId = req.session.entreprise.id;
        const employes = await prisma.employe.findMany({
            where: {
                entrepriseId: entrepriseId
            }
        })
        const taches = await prisma.tache.findMany({
            where: {
                entrepriseId: entrepriseId
            },
        });
        // Rendre la vue avec les tâches récupérées
        res.render('pages/addTache.twig', {
            taches: taches,
            title: 'Liste des tâches',
            employes: employes,
            entreprise: req.session.entreprise
        });
    } catch (error) {
        res.render("pages/home.twig", { error });
    }
});

entrepriseRouter.post('/addTache', authguard, async (req, res) => {
    try {
        const tache = await prisma.tache.create({
            data: {
                description: req.body.description,
                deadline: new Date(req.body.dateLimit).toISOString(),
                entrepriseId: req.session.entreprise.id,
            }
        });
        res.redirect('/');
    } catch (error) {
        console.error("Erreur lors de la création de la tâche:", error);
        res.render("pages/home.twig", { error });
    }
});

//assigner une tache à un employé
entrepriseRouter.post('/assignTache', authguard, async (req, res) => {
    try {
        const employeId = parseInt(req.body.employeId);
        const tacheId = parseInt(req.body.taches);

        if (!req.session.entreprise || !req.session.entreprise.id) {
            throw new Error("Session d'entreprise non valide");
        }

        // Vérifier si l'employé existe et appartient à l'entreprise
        const employe = await prisma.employe.findUnique({
            where: {
                id: employeId,
                entrepriseId: parseInt(req.session.entreprise.id)
            }
        });

        if (!employe) {
            throw new Error(`Employé non trouvé ou n'appartient pas à l'entreprise. ID: ${employeId}`);
        }

        // Associer la tâche à l'employé
        const updatedTache = await prisma.tache.update({
            where: { id: tacheId },
            data: { employeId: employeId }
        });

        res.redirect('/');
    } catch (error) {
        console.error("Erreur lors de l'association de la tâche:", error);
        res.status(400).render("pages/home.twig", {
            error: error.message,
            entreprise: req.session.entreprise
        });
    }
});

//terminer tâche
entrepriseRouter.post('/terminerTache/:id', async (req, res) => {
    try {
        await prisma.tache.update({
            where: { id: parseInt(req.params.id) },
            data: { completed: true }
        });
        res.redirect('/');
    } catch (error) {
        res.status(500).send("Erreur lors de la mise à jour de la tâche");
    }
});

// Supprimer une tâche
entrepriseRouter.get('/deleteTache/:id', authguard, async (req, res) => {
    try {
        const tacheId = parseInt(req.params.id);

        const tache = await prisma.tache.findUnique({
            where: { id: tacheId },
            include: { entreprise: true }
        });

        if (!tache) {
            throw new Error("Tâche non trouvée");
        }

        if (tache.entrepriseId !== req.session.entreprise.id) {
            throw new Error("Vous n'avez pas l'autorisation de supprimer cette tâche");
        }

        await prisma.tache.delete({
            where: { id: tacheId }
        });

        res.redirect('/');
    } catch (error) {
        console.error("Erreur lors de la suppression de la tâche:", error);
        res.status(400).render("pages/home", {
            error: error.message,
            entreprise: req.session.entreprise
        });
    }
});

//upload un fichier pour la tâche
entrepriseRouter.post('/addFichier/:tacheId', upload.single('fichier'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error("Aucun fichier n'a été téléchargé");
        }

        await prisma.tache.update({
            where: { id: parseInt(req.params.tacheId) },
            data: { fichierPath: req.file.path }
        });

        res.redirect("/home");

    } catch (error) {
        console.error(error);
        return res.status(500).send("Erreur lors du téléchargement du fichier");
    }
});

// Déconnexion
entrepriseRouter.get("/logout", (req, res) => {
    req.session.destroy()
    res.redirect("/login")
})

module.exports = entrepriseRouter