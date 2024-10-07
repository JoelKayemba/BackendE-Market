const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const connection = require('../db');

// Route de test pour /auth
router.get('/', (req, res) => {
  res.send('Route auth est active');
});

// Route pour l'inscription
router.post('/register', async (req, res) => {
  const { username, email, phoneNumber, password, confirmPassword } = req.body;

  if (!username || !email || !phoneNumber || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
  }

  try {
    const checkEmailQuery = 'SELECT * FROM client WHERE email = ?';
    connection.query(checkEmailQuery, [email], (err, results) => {
      if (err) {
        console.error('Error checking email:', err);
        return res.status(500).json({ message: 'Erreur lors de la vérification de l\'email' });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }

      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return res.status(500).json({ message: 'Erreur lors du hachage du mot de passe' });
        }

        const insertQuery = 'INSERT INTO client (username, email, motDePasse, telephone) VALUES (?, ?, ?, ?)';
        const values = [username, email, hashedPassword, phoneNumber];

        connection.query(insertQuery, values, (err, results) => {
          if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).json({ message: 'Erreur lors de l\'inscription' });
          }

          res.status(201).json({ message: `Inscription réussie pour ${username}` });
        });
      });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Erreur inattendue' });
  }
});

// Route pour la connexion
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Veuillez fournir un email et un mot de passe' });
  }

  connection.query('SELECT * FROM client WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Error querying the database:', err);
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
    if (results.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const user = results[0];

    const isPasswordValid = await bcrypt.compare(password, user.motDePasse);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Créer le token JWT
    const token = jwt.sign({ id: user.idClient }, 'your_jwt_secret', { expiresIn: '1h' });

    // Répondre avec le token, l'ID utilisateur, l'email et le nom d'utilisation
    res.status(200).json({ 
      message: 'Connexion réussie', 
      token, 
      userId: user.idClient, 
      email: user.email, 
      username: user.username 
    });
  });
});

module.exports = router;



