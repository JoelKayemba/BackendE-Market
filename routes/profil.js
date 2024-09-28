const express = require('express');
const router = express.Router();
const connection = require('../db');

// Route pour mettre à jour ou créer les informations de profil
router.put('/modifier', async (req, res) => {
    const { idclient, bio, sexe, date_naissance, email, nom_utilisation, numero_telephone } = req.body;

    if (!idclient || !email || !nom_utilisation || !numero_telephone) {
        return res.status(400).json({ message: 'Email, nom d\'utilisateur, et numéro de téléphone sont obligatoires' });
    }

    try {
        // Étape 1 : Vérifier si le profil existe déjà pour ce client
        const checkProfilQuery = 'SELECT * FROM profil WHERE Client_idClient = ?';
        connection.query(checkProfilQuery, [idclient], (err, results) => {
            if (err) {
                console.error('Erreur lors de la vérification du profil:', err);
                return res.status(500).json({ message: 'Erreur lors de la vérification du profil' });
            }

            if (results.length === 0) {
                // Étape 2 : Si le profil n'existe pas, l'insérer
                const insertProfilQuery = `
                    INSERT INTO profil (bio, sexe, date_naissance, Client_idClient) 
                    VALUES (?, ?, ?, ?)
                `;
                connection.query(insertProfilQuery, [bio, sexe, date_naissance, idclient], (err) => {
                    if (err) {
                        console.error('Erreur lors de l\'insertion du profil:', err);
                        return res.status(500).json({ message: 'Erreur lors de l\'ajout du profil' });
                    }

                    // Mise à jour des informations du client (email, nom d'utilisateur, numéro de téléphone)
                    const updateClientQuery = `
                        UPDATE client SET email = ?, username = ?, telephone = ? WHERE idClient = ?
                    `;
                    connection.query(updateClientQuery, [email, nom_utilisation, numero_telephone, idclient], (err) => {
                        if (err) {
                            console.error('Erreur lors de la mise à jour du client:', err);
                            return res.status(500).json({ message: 'Erreur lors de la mise à jour du client' });
                        }

                        res.status(201).json({ message: 'Profil créé avec succès' });
                    });
                });
            } else {
                // Étape 3 : Si le profil existe, le mettre à jour
                const updateProfilQuery = `
                    UPDATE profil 
                    SET bio = ?, sexe = ?, date_naissance = ?
                    WHERE Client_idClient = ?
                `;
                connection.query(updateProfilQuery, [bio, sexe, date_naissance, idclient], (err) => {
                    if (err) {
                        console.error('Erreur lors de la mise à jour du profil:', err);
                        return res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
                    }

                    // Mise à jour des informations du client (email, nom d'utilisateur, numéro de téléphone)
                    const updateClientQuery = `
                        UPDATE client SET email = ?, username = ?, telephone = ? WHERE idClient = ?
                    `;
                    connection.query(updateClientQuery, [email, nom_utilisation, numero_telephone, idclient], (err) => {
                        if (err) {
                            console.error('Erreur lors de la mise à jour du client:', err);
                            return res.status(500).json({ message: 'Erreur lors de la mise à jour du client' });
                        }

                        res.status(200).json({ message: 'Profil mis à jour avec succès' });
                    });
                });
            }
        });
    } catch (error) {
        console.error('Erreur inattendue:', error);
        res.status(500).json({ message: 'Erreur inattendue' });
    }
});
// Route pour récupérer les informations de profil
router.get('/', async (req, res) => {
    const { idclient } = req.query;

    if (!idclient) {
        return res.status(400).json({ message: 'ID client manquant' });
    }

    try {
        const profilQuery = `
            SELECT c.email, c.username, c.telephone, p.bio, p.sexe, p.date_naissance
            FROM client c 
            LEFT JOIN profil p ON c.idClient = p.Client_idClient 
            WHERE c.idClient = ?
        `;

        connection.query(profilQuery, [idclient], (err, results) => {
            if (err) {
                console.error('Erreur lors de la récupération du profil:', err);
                return res.status(500).json({ message: 'Erreur lors de la récupération du profil' });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: 'Profil non trouvé.' });
            }

            res.status(200).json(results[0]);
        });
    } catch (error) {
        console.error('Erreur inattendue:', error);
        res.status(500).json({ message: 'Erreur inattendue' });
    }
});

// Route pour supprimer le compte
router.delete('/supprimer', async (req, res) => {
    const { idclient } = req.body;

    if (!idclient) {
        return res.status(400).json({ message: 'ID client est obligatoire pour supprimer le compte' });
    }

    try {
        // Supprimer le profil de l'utilisateur
        const deleteProfilQuery = 'DELETE FROM profil WHERE Client_idClient = ?';
        connection.query(deleteProfilQuery, [idclient], (err) => {
            if (err) {
                console.error('Erreur lors de la suppression du profil:', err);
                return res.status(500).json({ message: 'Erreur lors de la suppression du profil' });
            }

            // Supprimer les adresses de l'utilisateur 
            const deleteAdresseQuery = 'DELETE FROM adresse WHERE idClient = ?';
            connection.query(deleteAdresseQuery, [idclient], (err) => {
                if (err) {
                    console.error('Erreur lors de la suppression des adresses:', err);
                    return res.status(500).json({ message: 'Erreur lors de la suppression des adresses' });
                }

                // Supprimer le client lui-même
                const deleteClientQuery = 'DELETE FROM client WHERE idClient = ?';
                connection.query(deleteClientQuery, [idclient], (err) => {
                    if (err) {
                        console.error('Erreur lors de la suppression du client:', err);
                        return res.status(500).json({ message: 'Erreur lors de la suppression du client' });
                    }

                    res.status(200).json({ message: 'Compte supprimé avec succès' });
                });
            });
        });
    } catch (error) {
        console.error('Erreur inattendue:', error);
        res.status(500).json({ message: 'Erreur inattendue' });
    }
});

module.exports = router;
