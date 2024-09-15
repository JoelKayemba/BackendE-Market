const express = require('express');
const connection = require('../db'); // Assurez-vous que la connexion à la base de données est bien configurée

// Création du routeur Express
const router = express.Router();

// Route pour récupérer toutes les boutiques d'un utilisateur
router.get('/boutiquesUtilisateur', (req, res) => {
    const { idclient } = req.query;

    if (!idclient) {
        return res.status(400).json({ message: 'idclient est requis' });
    }

    const sql = `
        SELECT nom, type, categorie, email, numero_telephone, image1, image2, image3, image4, description 
        FROM boutique 
        WHERE idclient = ?
    `;

    connection.query(sql, [idclient], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Erreur lors de la récupération des boutiques' });
        }

        res.status(200).json(results);
    });
});

module.exports = router;
