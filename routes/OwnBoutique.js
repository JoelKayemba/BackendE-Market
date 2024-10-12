const express = require('express');
const connection = require('../db');   

// Création du routeur Express
const router = express.Router();

// Route pour récupérer toutes les boutiques d'un utilisateur
router.get('/boutiquesUtilisateur', (req, res) => {
    const { idclient } = req.query;

    if (!idclient) {
        return res.status(400).json({ message: 'idclient est requis' });
    }

    const sql = `
        SELECT 
            b.idBoutique, b.nom, b.type, b.email, b.telephone AS numero_telephone, b.description,
            c.nom AS categorie, 
            i.url AS image_url
        FROM Boutique b
        LEFT JOIN BoutiqueCategorie bc ON b.idBoutique = bc.Boutique_id
        LEFT JOIN Categorie c ON bc.Categorie_id = c.idCategorie
        LEFT JOIN Image i ON b.idBoutique = i.Boutique_idBoutique
        WHERE b.Client_idClient = ?
    `;

    connection.query(sql, [idclient], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Erreur lors de la récupération des boutiques' });
        }

        // Transformation des résultats pour regrouper les catégories et les images par boutique
        const boutiques = results.reduce((acc, row) => {
            const { idBoutique, nom, type, email, numero_telephone, description, categorie, image_url } = row;

            // Initialisation de la boutique dans l'accumulateur s'il n'existe pas déjà
            if (!acc[idBoutique]) {
                acc[idBoutique] = {
                    idBoutique,
                    nom,
                    type,
                    email,
                    numero_telephone,
                    description,
                    categories: [], 
                    images: []
                };
            }

            // Ajout de la catégorie si elle n'est pas déjà présente
            if (categorie && !acc[idBoutique].categories.includes(categorie)) {
                acc[idBoutique].categories.push(categorie);
            }

            // Ajout de l'image si elle n'est pas déjà présente
            if (image_url && !acc[idBoutique].images.includes(image_url)) {
                acc[idBoutique].images.push(image_url);
            }

            return acc;
        }, {});

        // Conversion en tableau
        const boutiquesArray = Object.values(boutiques);

        res.status(200).json(boutiquesArray);
    });
});

module.exports = router;
