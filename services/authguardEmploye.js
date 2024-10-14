const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

const authguardEmploye = async (req, res, next) => {
    try {
        if (req.session.employe) {
            let employe = await prisma.employe.findUnique({
                where: {
                    mail: req.session.employe.mail
                }
            })
            if (employe) return next()
            throw { authguardEmploye: "Employé non connecté" }
        }
        throw { authguardEmploye: "Employé non connecté" }
    } catch (error) {
        res.redirect("/loginEmploye")
    }
}

module.exports = authguardEmploye