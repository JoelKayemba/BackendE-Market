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
    // Vérifier si l'email est déjà utilisé
    const checkEmailQuery = 'SELECT * FROM client WHERE email = ?';
    connection.query(checkEmailQuery, [email], (err, results) => {
      if (err) {
        console.error('Error checking email:', err);
        return res.status(500).json({ message: 'Erreur lors de la vérification de l\'email' });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }

      // Hacher le mot de passe
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return res.status(500).json({ message: 'Erreur lors du hachage du mot de passe' });
        }

        // Insérer le nouvel utilisateur
        const insertQuery = 'INSERT INTO client (nom_utilisation, email, password, Numero_téléphone) VALUES (?, ?, ?, ?)';
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

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ id: user.idclient }, 'your_jwt_secret', { expiresIn: '1h' });

    res.status(200).json({ message: 'Connexion réussie', token, userId: user.idclient });
  });
});


// Route pour ajouter une adresse
router.post('/adresses', async (req, res) => {
  const {
    userId,
    pays,
    province,
    ville,
    rue,
    numero,
    codePostal,
    appartement,
    latitude,
    longitude,
    parDefaut
  } = req.body;

  // Validation des champs requis
 /* if (!userId || !pays || !province || !ville || !rue || !numero || !latitude || !longitude || typeof parDefaut === 'undefined') {
    return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis.' });
  }*/

  try {
    const insertAddressQuery = `
      INSERT INTO adresse (
        pays, province, ville, rue, numéro, code_postal, appartement, latitude, longitude, parDefaut, idclient
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      pays, province, ville, rue, numero, codePostal, appartement, latitude, longitude, parDefaut, userId
    ];

    connection.query(insertAddressQuery, values, async (err, results) => {
      if (err) {
        console.error('Erreur lors de l\'insertion de l\'adresse:', err);
        return res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'adresse' });
      }

      // Vérifiez si results.insertId contient l'ID inséré
      if (!results.insertId) {
        return res.status(500).json({ message: 'ID manquant pour l\'adresse ajoutée' });
      }

      // Récupérer les détails de l'adresse nouvellement insérée
      const selectAddressQuery = `
        SELECT * FROM adresse WHERE idadresse = ?
      `;
      connection.query(selectAddressQuery, [results.insertId], (err, rows) => {
        if (err) {
          console.error('Erreur lors de la récupération des détails de l\'adresse:', err);
          return res.status(500).json({ message: 'Erreur lors de la récupération des détails de l\'adresse' });
        }

        // Renvoyer les détails de l'adresse
        res.status(201).json(rows[0]);
      });
    });
  } catch (error) {
    console.error('Erreur inattendue:', error);
    res.status(500).json({ message: 'Erreur inattendue' });
  }
});



//route pour mettre a jour l'adresse par defaut
router.patch('/adresses/:id/parDefaut', async (req, res) => {
  const { id } = req.params;
  const { parDefaut } = req.body;

  if (parDefaut === undefined) {
    return res.status(400).json({ message: 'Le champ parDefaut est requis.' });
  }

  try {
    // Vérifiez si l'adresse existe
    const checkAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
    connection.query(checkAddressQuery, [id], (err, results) => {
      if (err) {
        console.error('Erreur lors de la vérification de l\'adresse:', err);
        return res.status(500).json({ message: 'Erreur lors de la vérification de l\'adresse' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Adresse non trouvée.' });
      }

      // Récupérez l'ID du client de l'adresse
      const userId = results[0].idclient;

      // Mettre à jour toutes les adresses de l'utilisateur pour ne pas être par défaut
      const updateAllAddressesQuery = 'UPDATE adresse SET parDefaut = ? WHERE idclient = ?';
      connection.query(updateAllAddressesQuery, [false, userId], (err) => {
        if (err) {
          console.error('Erreur lors de la mise à jour des adresses de l\'utilisateur:', err);
          return res.status(500).json({ message: 'Erreur lors de la mise à jour des adresses' });
        }

        // Mettre à jour l'adresse spécifique pour qu'elle soit par défaut
        const updateAddressQuery = 'UPDATE adresse SET parDefaut = ? WHERE idadresse = ?';
        connection.query(updateAddressQuery, [parDefaut, id], (err) => {
          if (err) {
            console.error('Erreur lors de la mise à jour de l\'adresse:', err);
            return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'adresse' });
          }

          // Récupérer les détails de l'adresse mise à jour
          const selectAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
          connection.query(selectAddressQuery, [id], (err, rows) => {
            if (err) {
              console.error('Erreur lors de la récupération des détails de l\'adresse:', err);
              return res.status(500).json({ message: 'Erreur lors de la récupération des détails de l\'adresse' });
            }

            // Renvoyer les détails de l'adresse mise à jour
            res.status(200).json(rows[0]);
          });
        });
      });
    });
  } catch (error) {
    console.error('Erreur inattendue:', error);
    res.status(500).json({ message: 'Erreur inattendue' });
  }
});


// Route pour mettre à jour une adresse
router.put('/adresses/:id', async (req, res) => {
  const { id } = req.params;
  const {
    pays,
    province,
    ville,
    rue,
    numero,
    codePostal,
    appartement,
    latitude,
    longitude,
    parDefaut
  } = req.body;

  // Validation des champs requis
  /*if (!pays || !province || !ville || !rue || !numero || !latitude || !longitude) {
    return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis.' });
  }*/

  try {
    // Vérifiez si l'adresse existe
    const checkAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
    connection.query(checkAddressQuery, [id], (err, results) => {
      if (err) {
        console.error('Erreur lors de la vérification de l\'adresse:', err);
        return res.status(500).json({ message: 'Erreur lors de la vérification de l\'adresse' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Adresse non trouvée.' });
      }

      // Mettre à jour l'adresse
      const updateAddressQuery = `
        UPDATE adresse SET
          pays = ?, province = ?, ville = ?, rue = ?, numero = ?, code_postal = ?, appartement = ?,
          latitude = ?, longitude = ?, parDefaut = ?
        WHERE idadresse = ?
      `;
      const values = [
        pays, province, ville, rue, numero, codePostal, appartement, latitude, longitude, parDefaut, id
      ];

      connection.query(updateAddressQuery, values, (err) => {
        if (err) {
          console.error('Erreur lors de la mise à jour de l\'adresse:', err);
          return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'adresse' });
        }

        // Récupérer les détails de l'adresse mise à jour
        const selectAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
        connection.query(selectAddressQuery, [id], (err, rows) => {
          if (err) {
            console.error('Erreur lors de la récupération des détails de l\'adresse:', err);
            return res.status(500).json({ message: 'Erreur lors de la récupération des détails de l\'adresse' });
          }

          // Renvoyer les détails de l'adresse mise à jour
          res.status(200).json(rows[0]);
        });
      });
    });
  } catch (error) {
    console.error('Erreur inattendue:', error);
    res.status(500).json({ message: 'Erreur inattendue' });
  }
});




module.exports = router;
