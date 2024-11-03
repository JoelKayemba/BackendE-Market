const express = require('express');
const router = express.Router();
const connection = require('../db');

// Route pour ajouter une adresse et supprimer les anciennes
router.post('/', async (req, res) => {
  const {
    boutiqueId,
    pays,
    province,
    ville,
    rue,
    numero,
    codePostal,
    appartement,
    latitude,
    longitude,
    parDefaut = 1
  } = req.body;

  


  try {
    // Supprimer les anciennes adresses
    const deleteAddressesQuery = 'DELETE FROM adresse WHERE idBoutique = ?';
    connection.query(deleteAddressesQuery, [boutiqueId], (err) => {
      if (err) {
        console.error('Erreur lors de la suppression des anciennes adresses:', err);
        return res.status(500).json({ message: 'Erreur lors de la suppression des anciennes adresses' });
      }
      
      // Ajouter la nouvelle adresse
      const insertAddressQuery = `
        INSERT INTO adresse (
          pays, province, ville, rue, numero, code_postal, appartement, latitude, longitude, parDefaut, idBoutique
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        pays, province, ville, rue, numero, codePostal, appartement, latitude, longitude, parDefaut, boutiqueId
      ];

      connection.query(insertAddressQuery, values, (err, results) => {
        if (err) {
          console.error('Erreur lors de l\'insertion de l\'adresse:', err);
          return res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'adresse' });
        }
       
        // Récupérer et envoyer la nouvelle adresse
        const addressId = results.insertId;
        const selectAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
        connection.query(selectAddressQuery, [addressId], (err, rows) => {
          if (err) {
            console.error('Erreur lors de la récupération de l\'adresse:', err);
            return res.status(500).json({ message: 'Erreur lors de la récupération de l\'adresse' });
          }

          res.status(201).json({ idadresse: addressId, adresse: rows[0] });
        });
      });
    });
  } catch (error) {
    console.error('Erreur inattendue:', error);
    res.status(500).json({ message: 'Erreur inattendue' });
  }
});

// Route pour récupérer les adresses
router.get('/', (req, res) => {
  const boutiqueId = req.query.boutiqueId;
  if (!boutiqueId) return res.status(400).json({ message: 'ID de la boutique manquant' });

  const query = 'SELECT * FROM adresse WHERE idBoutique = ?';
  connection.query(query, [boutiqueId], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des adresses :', err);
      return res.status(500).json({ message: 'Erreur lors du chargement des adresses' });
    }

    if (results.length === 0) {
      const adresseDefaut = {
        id: 'default-0',
        pays: 'Pays',
        province: 'Provinces',
        ville: 'Ville',
        rue: 'Rue',
        numero: '123',
        codePostal: '00000',
        appartement: 'Apt 1',
        latitude: null,
        longitude: null,
        parDefaut: true,
      };
      return res.status(200).json({ adresses: [adresseDefaut] });
    }

    const adressesAvecId = results.map(adresse => ({
      id: adresse.idadresse,
      pays: adresse.pays,
      province: adresse.province,
      ville: adresse.ville,
      rue: adresse.rue,
      numero: adresse.numero,
      codePostal: adresse.code_postal,
      appartement: adresse.appartement,
      latitude: adresse.latitude,
      longitude: adresse.longitude,
      parDefaut: adresse.parDefaut,
    }));

    res.status(200).json({ adresses: adressesAvecId });
  });
});

// Route pour mettre à jour une adresse par défaut
router.patch('/:id/parDefaut', async (req, res) => {
  const { id } = req.params;
  const { parDefaut } = req.body;
  if (parDefaut === undefined) return res.status(400).json({ message: 'Le champ parDefaut est requis.' });

  try {
    const checkAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
    connection.query(checkAddressQuery, [id], (err, results) => {
      if (err || results.length === 0) {
        return res.status(500).json({ message: 'Erreur lors de la vérification de l\'adresse' });
      }
      const boutiqueId = results[0].idBoutique;

      const updateAllAddressesQuery = 'UPDATE adresse SET parDefaut = 0 WHERE idBoutique = ?';
      connection.query(updateAllAddressesQuery, [boutiqueId], (err) => {
        if (err) return res.status(500).json({ message: 'Erreur lors de la mise à jour des adresses' });

        const updateAddressQuery = 'UPDATE adresse SET parDefaut = 1 WHERE idadresse = ?';
        connection.query(updateAddressQuery, [id], (err) => {
          if (err) return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'adresse' });

          res.status(200).json({ idadresse: id });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur inattendue' });
  }
});

// Route pour mettre à jour une adresse
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { pays, province, ville, rue, numero, codePostal, appartement, latitude, longitude, parDefaut } = req.body;

  try {
    const updateAddressQuery = `
      UPDATE adresse SET
      pays = ?, province = ?, ville = ?, rue = ?, numero = ?, code_postal = ?, appartement = ?,
      latitude = ?, longitude = ?, parDefaut = IFNULL(?, parDefaut)
      WHERE idadresse = ?
    `;
    const values = [pays, province, ville, rue, numero, codePostal, appartement, latitude, longitude, parDefaut, id];

    connection.query(updateAddressQuery, values, (err) => {
      if (err) return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'adresse' });

      res.status(200).json({ idadresse: id });
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur inattendue' });
  }
});

module.exports = router;
