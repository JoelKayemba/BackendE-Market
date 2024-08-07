const express = require('express');
const router = express.Router();
const connection = require('../db');

// Route pour ajouter une adresse
router.post('/', async (req, res) => {
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

      if (!results.insertId) {
        return res.status(500).json({ message: 'ID manquant pour l\'adresse ajoutée' });
      }

      const selectAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
      connection.query(selectAddressQuery, [results.insertId], (err, rows) => {
        if (err) {
          console.error('Erreur lors de la récupération des détails de l\'adresse:', err);
          return res.status(500).json({ message: 'Erreur lors de la récupération des détails de l\'adresse' });
        }

        res.status(201).json(rows[0]);
      });
    });
  } catch (error) {
    console.error('Erreur inattendue:', error);
    res.status(500).json({ message: 'Erreur inattendue' });
  }
});

// Route pour mettre à jour une adresse par défaut
router.patch('/:id/parDefaut', async (req, res) => {
  const { id } = req.params;
  const { parDefaut } = req.body;

  if (parDefaut === undefined) {
    return res.status(400).json({ message: 'Le champ parDefaut est requis.' });
  }

  try {
    const checkAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
    connection.query(checkAddressQuery, [id], (err, results) => {
      if (err) {
        console.error('Erreur lors de la vérification de l\'adresse:', err);
        return res.status(500).json({ message: 'Erreur lors de la vérification de l\'adresse' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Adresse non trouvée.' });
      }

      const userId = results[0].idclient;

      const updateAllAddressesQuery = 'UPDATE adresse SET parDefaut = ? WHERE idclient = ?';
      connection.query(updateAllAddressesQuery, [false, userId], (err) => {
        if (err) {
          console.error('Erreur lors de la mise à jour des adresses de l\'utilisateur:', err);
          return res.status(500).json({ message: 'Erreur lors de la mise à jour des adresses' });
        }

        const updateAddressQuery = 'UPDATE adresse SET parDefaut = ? WHERE idadresse = ?';
        connection.query(updateAddressQuery, [parDefaut, id], (err) => {
          if (err) {
            console.error('Erreur lors de la mise à jour de l\'adresse:', err);
            return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'adresse' });
          }

          const selectAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
          connection.query(selectAddressQuery, [id], (err, rows) => {
            if (err) {
              console.error('Erreur lors de la récupération des détails de l\'adresse:', err);
              return res.status(500).json({ message: 'Erreur lors de la récupération des détails de l\'adresse' });
            }

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
router.put('/:id', async (req, res) => {
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

  try {
    const checkAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
    connection.query(checkAddressQuery, [id], (err, results) => {
      if (err) {
        console.error('Erreur lors de la vérification de l\'adresse:', err);
        return res.status(500).json({ message: 'Erreur lors de la vérification de l\'adresse' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Adresse non trouvée.' });
      }

      const updateAddressQuery = `
        UPDATE adresse SET
        pays = ?, province = ?, ville = ?, rue = ?, numéro = ?, code_postal = ?, appartement = ?,
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

        const selectAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
        connection.query(selectAddressQuery, [id], (err, rows) => {
          if (err) {
            console.error('Erreur lors de la récupération des détails de l\'adresse:', err);
            return res.status(500).json({ message: 'Erreur lors de la récupération des détails de l\'adresse' });
          }

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
