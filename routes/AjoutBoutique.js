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

const router = express.Router();

router.post('/ajoutBoutique', upload.array('images', 10), (req, res) => {
  const { nom, type, categorie, email, numero_telephone, description, idclient } = req.body;

  if (!idclient || isNaN(idclient) || parseInt(idclient, 10) <= 0) {
    return res.status(400).json({ message: 'idclient est requis et doit être un nombre valide' });
  }

  const clientId = parseInt(idclient, 10);
  const categories = Array.isArray(categorie) ? categorie : [categorie];

  const insertBoutique = (callback) => {
    const sqlBoutique = `
      INSERT INTO Boutique 
      (nom, type, telephone, email, description, Client_idClient) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const valuesBoutique = [nom, type, numero_telephone, email, description, clientId];

    connection.query(sqlBoutique, valuesBoutique, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erreur lors de l\'ajout de la boutique' });
      }
      callback(result.insertId);
    });
  };

  const insertCategories = (idBoutique) => {
    const sqlCheckCategories = `SELECT idCategorie, nom FROM Categorie WHERE nom IN (?)`;
    connection.query(sqlCheckCategories, [categories], (err, results) => {
      if (err) {
        console.error('Erreur lors de la vérification des catégories:', err);
        return res.status(500).json({ message: 'Erreur lors de la vérification des catégories' });
      }
  
      const existingCategories = results.map(row => row.nom);
      const existingCategoryIds = results.map(row => row.idCategorie);
      const missingCategories = categories.filter(category => !existingCategories.includes(category));
  
      const insertMissingCategories = (callback) => {
        if (missingCategories.length === 0) return callback(existingCategoryIds);
  
        const insertSql = `INSERT INTO Categorie (nom) VALUES ?`;
        const values = missingCategories.map(category => [category]);
  
        connection.query(insertSql, [values], (err, result) => {
          if (err) {
            console.error('Erreur lors de l\'ajout des catégories manquantes:', err);
            return res.status(500).json({ message: 'Erreur lors de l\'ajout des catégories manquantes' });
          }
          const newCategoryIds = Array.from({ length: result.affectedRows }, (_, i) => result.insertId + i);
          callback([...existingCategoryIds, ...newCategoryIds]);
        });
      };
  
      insertMissingCategories((allCategoryIds) => {
        const sqlAssociation = `INSERT INTO BoutiqueCategorie (Boutique_id, Categorie_id) VALUES ?`;
        const associations = allCategoryIds.map(catId => [idBoutique, catId]);
  
        connection.query(sqlAssociation, [associations], (err) => {
          if (err) {
            console.error('Erreur lors de l\'association des catégories à la boutique:', err);
            return res.status(500).json({ message: 'Erreur lors de l\'association des catégories à la boutique' });
          }
          insertImages(idBoutique);
        });
      });
    });
  };

  const insertImages = (idBoutique) => {
    const images = req.files.map(file => [file.path, idBoutique]);
  
    if (images.length === 0) {
      return sendBoutiqueDetails(idBoutique); // Si pas d'images, terminer en envoyant les détails
    }
  
    const sqlImages = `
      INSERT INTO Image (url, Boutique_idBoutique) 
      VALUES ?
    `;
  
    connection.query(sqlImages, [images], (err) => {
      if (err) {
        console.error('Erreur lors de l\'ajout des images:', err);
        return res.status(500).json({ message: 'Erreur lors de l\'ajout des images' });
      }
      sendBoutiqueDetails(idBoutique);
    });
  };

  const sendBoutiqueDetails = (idBoutique) => {
    const sqlDetails = `
      SELECT 
        b.idBoutique, b.nom, b.type, b.email, b.telephone AS numero_telephone, b.description,
        c.nom AS categorie, 
        i.url AS image_url
      FROM Boutique b
      LEFT JOIN BoutiqueCategorie bc ON b.idBoutique = bc.Boutique_id
      LEFT JOIN Categorie c ON bc.Categorie_id = c.idCategorie
      LEFT JOIN Image i ON b.idBoutique = i.Boutique_idBoutique
      WHERE b.idBoutique = ?
    `;

    connection.query(sqlDetails, [idBoutique], (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération des détails de la boutique:', err);
        return res.status(500).json({ message: 'Erreur lors de la récupération des détails de la boutique' });
      }

      const boutique = {
        idBoutique: results[0].idBoutique,
        nom: results[0].nom,
        type: results[0].type,
        email: results[0].email,
        numero_telephone: results[0].numero_telephone,
        description: results[0].description,
        categories: Array.from(new Set(results.map(row => row.categorie).filter(Boolean))),
        images: results.map(row => row.image_url).filter(Boolean),
      };

      res.status(201).json(boutique);
    });
  };

  insertBoutique((idBoutique) => {
    insertCategories(idBoutique);
  });
});

module.exports = router;
