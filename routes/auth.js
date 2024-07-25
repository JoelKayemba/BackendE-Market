// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const connection = require('../db');

// Route de test pour /auth
router.get('/', (req, res) => {
  res.send('Route auth est active');
});

// Route pour l'inscription
router.post('/register', async (req, res) => {
  const { username, email, phoneNumber, password, confirmPassword } = req.body;

  /*if (!username || !email || !phoneNumber || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }*/
 

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const query = `INSERT INTO client (nom_utilisation, email, password, Numero_téléphone) VALUES (?, ?, ?, ?)`;
  const values = [username, email, hashedPassword, phoneNumber];

  connection.query(query, values, (err, results) => {
    if (err) {
      console.error('Error inserting user:', err);
      return res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
    res.status(201).json({ message: `Inscription réussie pour ${username}` });
  });
});

module.exports = router;
