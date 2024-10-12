// categoriesRoutes.js
const express = require('express');
const connection = require('../db'); // Assurez-vous que la connexion à la base de données est correctement configurée

const router = express.Router();

// Route pour obtenir toutes les catégories existantes
router.get('/categories', (req, res) => {
  const sql = `SELECT nom FROM Categorie`;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des catégories:', err);
      return res.status(500).json({ message: 'Erreur lors de la récupération des catégories' });
    }
    
    const categories = results.map((row) => row.nom);
    res.status(200).json({ categories });
  });
});

module.exports = router;
