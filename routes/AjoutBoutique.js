const express = require('express');
const multer = require('multer');
const path = require('path');
const connection = require('../db');

// Configuration de `multer` pour stocker les fichiers localement
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// Création du routeur Express
const router = express.Router();

// Route pour ajouter une boutique avec des images
router.post('/ajoutBoutique', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 }
]), (req, res) => {
  const { nom, type, categorie, email, numero_telephone, description, idclient } = req.body;

  if (!idclient) {
    return res.status(400).json({ message: 'idclient est requis' });
  }

  const images = {};
  if (req.files.image1) images.image1 = req.files.image1[0].path;
  if (req.files.image2) images.image2 = req.files.image2[0].path;
  if (req.files.image3) images.image3 = req.files.image3[0].path;
  if (req.files.image4) images.image4 = req.files.image4[0].path;

  const sql = `
    INSERT INTO boutique 
    (nom, type, categorie, email, numero_telephone, image1, image2, image3, image4, description, idclient) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [nom, type, categorie, email, numero_telephone, images.image1, images.image2, images.image3, images.image4, description, idclient];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur lors de l\'ajout de la boutique' });
    }
    res.status(201).json({ message: 'Boutique ajoutée avec succès', idboutique: result.insertId });
  });
});

module.exports = router;
