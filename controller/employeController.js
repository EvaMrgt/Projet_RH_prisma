
exports.getHome = async (req, res) => {
    try {
        const employe = await prisma.employe.findUnique({
            where: { id: req.session.employe.id },
            include: {
                taches: true,
                ordinateur: true
            }
        });
        res.render("pages/employe/home.twig", { employe });
    } catch (error) {
        res.status(500).send("Une erreur est survenue");
    }
};

exports.updateTacheStatus = async (req, res) => {
    try {
        const { tacheId, completed } = req.body;
        await prisma.tache.update({
            where: { id: parseInt(tacheId) },
            data: { completed: completed === 'true' }
        });
        res.redirect('/employe/home');
    } catch (error) {
        res.status(500).send("Erreur lors de la mise à jour du statut de la tâche");
    }
};