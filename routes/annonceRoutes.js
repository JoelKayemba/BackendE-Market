const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const connection = require('../db');

// Configuration de Multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Nom du fichier
  },
});

const upload = multer({ storage });

// Route pour ajouter une annonce
router.post('/ajouter', upload.fields([{ name: 'image' }, { name: 'video' }]), async (req, res) => {
    const { idclient, titre, description, lien } = req.body;
    const image = req.files['image'] ? req.files['image'][0].filename : null;
    const video = req.files['video'] ? req.files['video'][0].filename : null;

    if (!idclient || !titre) {
        return res.status(400).json({ message: 'ID client et titre sont obligatoires' });
    }

    try {
        const query = `
            INSERT INTO annonce (idclient, titre, description, lien, image, video)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const values = [idclient, titre, description, lien, image, video];

        connection.query(query, values, (err, results) => {
            if (err) {
                console.error('Erreur lors de l\'ajout de l\'annonce:', err);
                return res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'annonce' });
            }

            const idannonce = results.insertId;

            // Renvoyer l'annonce ajoutée au frontend
            connection.query('SELECT * FROM annonce WHERE idannonce = ?', [idannonce], (err, rows) => {
                if (err) {
                    console.error('Erreur lors de la récupération de l\'annonce:', err);
                    return res.status(500).json({ message: 'Erreur lors de la récupération de l\'annonce ajoutée' });
                }
                res.status(201).json({ annonce: rows[0] });
            });
        });
    } catch (error) {
        console.error('Erreur inattendue:', error);
        res.status(500).json({ message: 'Erreur inattendue' });
    }
});


// Route pour récupérer toutes les annonces

router.get('/', (req, res) => {
    const query = 'SELECT * FROM annonce';
    connection.query(query, (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des annonces :', err);
            return res.status(500).json({ message: 'Erreur lors de la récupération des annonces' });
        }
        res.status(200).json({ annonces: results });
    });
});


// Route pour récupérer les annonces d'un client spécifique
router.get('/client/:idclient', (req, res) => {
    const { idclient } = req.params;
    const query = 'SELECT * FROM annonce WHERE idclient = ?';

    connection.query(query, [idclient], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des annonces du client:', err);
            return res.status(500).json({ message: 'Erreur lors de la récupération des annonces du client' });
        }

        res.status(200).json({ annonces: results });
    });
});

// Route pour récupérer toutes les annonces de manière aléatoire
router.get('/annonces', (req, res) => {
    const query = 'SELECT * FROM annonce ORDER BY RAND()';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des annonces :', err);
            return res.status(500).json({ message: 'Erreur lors de la récupération des annonces' });
        }
        res.status(200).json({ annonces: results });
    });
});


module.exports = router;
