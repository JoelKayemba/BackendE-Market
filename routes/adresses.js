const express = require('express');
const router = express.Router();
const connection = require('../db');

// Route pour ajouter une adresse et supprimer les anciennes
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
    parDefaut = 1
  } = req.body;

  try {
      // Étape 1 : Supprimer toutes les adresses existantes pour cet utilisateur
      const deleteAddressesQuery = 'DELETE FROM adresse WHERE idclient = ?';
      connection.query(deleteAddressesQuery, [userId], (err) => {
          if (err) {
              console.error('Erreur lors de la suppression des anciennes adresses:', err);
              return res.status(500).json({ message: 'Erreur lors de la suppression des anciennes adresses' });
          }
      
          // Étape 2 : Ajouter la nouvelle adresse
          const insertAddressQuery = `
              INSERT INTO adresse (
                  pays, province, ville, rue, numero, code_postal, appartement, latitude, longitude, parDefaut, idclient
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const values = [
              pays, province, ville, rue, numero, codePostal, appartement, latitude, longitude, parDefaut, userId
          ];
      
          connection.query(insertAddressQuery, values, (err, results) => {
              if (err) {
                  console.error('Erreur lors de l\'insertion de l\'adresse:', err);
                  return res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'adresse' });
              }
      
              // Vérifier si l'insertion a réussi et obtenir l'ID de l'adresse insérée
              const addressId = results.insertId;
              if (!addressId) {
                  return res.status(500).json({ message: 'ID manquant pour l\'adresse ajoutée' });
              }
      
              // Récupérer les détails de l'adresse ajoutée
              const selectAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
              connection.query(selectAddressQuery, [addressId], (err, rows) => {
                  if (err) {
                      console.error('Erreur lors de la récupération des détails de l\'adresse:', err);
                      return res.status(500).json({ message: 'Erreur lors de la récupération des détails de l\'adresse' });
                  }
      
                  // Envoyer la réponse avec l'adresse ajoutée
                  res.status(201).json({ idadresse: addressId, adresse: rows[0] });
              });
          });
      });
  } catch (error) {
    console.error('Erreur inattendue:', error);
    res.status(500).json({ message: 'Erreur inattendue' });
  }
});
  

// Route pour récupérer les adresses d'un utilisateur spécifique
router.get('/', (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
      return res.status(400).json({ message: 'ID du client manquant' });
  }

  const query = 'SELECT * FROM adresse WHERE idclient = ?';

  connection.query(query, [userId], (err, results) => {
      if (err) {
          console.error('Erreur lors de la récupération des adresses :', err);
          return res.status(500).json({ message: 'Erreur lors du chargement des adresses' });
      }

      console.log('Adresses trouvées pour l\'utilisateur:', results);

      if (results.length === 0) {
               // Si aucune adresse n'est trouvée, renvoyer une adresse par défaut
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

            const updateAllAddressesQuery = 'UPDATE adresse SET parDefaut = 0 WHERE idclient = ?';
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

                    // Sélectionner l'adresse mise à jour
                    const selectAddressQuery = 'SELECT * FROM adresse WHERE idadresse = ?';
                    connection.query(selectAddressQuery, [id], (err, rows) => {
                        if (err) {
                            console.error('Erreur lors de la récupération des détails de l\'adresse:', err);
                            return res.status(500).json({ message: 'Erreur lors de la récupération des détails de l\'adresse' });
                        }

                        // Réponse avec l'adresse mise à jour
                        res.status(200).json({ idadresse: rows[0].idadresse });
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
            pays = ?, province = ?, ville = ?, rue = ?, numero = ?, code_postal = ?, appartement = ?,
            latitude = ?, longitude = ?, parDefaut = IFNULL(?, parDefaut)
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
  
            // S'assurer de renvoyer l'ID de l'adresse mise à jour avec les données mises à jour
            res.status(200).json({ idadresse: id, adresse: rows[0] });
          });
        });
      });
    } catch (error) {
      console.error('Erreur inattendue:', error);
      res.status(500).json({ message: 'Erreur inattendue' });
    }
  });
  

// route pour supprimer une adresse
router.delete('/:id/supprimer', async (req, res) => {
    const { id } = req.params;

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

            const deleteAddressQuery = 'DELETE FROM adresse WHERE idadresse = ?';
            connection.query(deleteAddressQuery, [id], (err) => {
                if (err) {
                    console.error('Erreur lors de la suppression de l\'adresse:', err);
                    return res.status(500).json({ message: 'Erreur lors de la suppression de l\'adresse' });
                }

                // Renvoie l'ID de l'adresse supprimée pour confirmation
                res.status(200).json({ message: 'Adresse supprimée avec succès.', idadresse: id });
            });
        });
    } catch (error) {
        console.error('Erreur inattendue:', error);
        res.status(500).json({ message: 'Erreur inattendue' });
    }
});


module.exports = router;
