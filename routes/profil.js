const express = require('express');
const router = express.Router();
const connection = require('../db');

// Route pour mettre à jour les informations de profil
router.put('/modifier', async (req, res) => {
    const { idclient, prenom, sexe, date_naissance, email, nom_utilisation } = req.body;

    if (!idclient || !email || !nom_utilisation) {
        return res.status(400).json({ message: 'Email et nom d\'utilisateur sont obligatoires' });
    }

    try {
        // Supprimer l'ancien profil s'il existe
        const deleteProfilQuery = 'DELETE FROM profil WHERE idclient = ?';
        connection.query(deleteProfilQuery, [idclient], (err) => {
            if (err) {
                console.error('Erreur lors de la suppression de l\'ancien profil:', err);
                return res.status(500).json({ message: 'Erreur lors de la suppression de l\'ancien profil' });
            }

            // Ajouter le nouveau profil
            const insertProfilQuery = `
                INSERT INTO profil (idclient, prenom, sexe, date_naissance)
                VALUES (?, ?, ?, ?)
            `;
            connection.query(insertProfilQuery, [idclient, prenom, sexe, date_naissance], (err) => {
                if (err) {
                    console.error('Erreur lors de l\'ajout du nouveau profil:', err);
                    return res.status(500).json({ message: 'Erreur lors de l\'ajout du nouveau profil' });
                }

                // Mise à jour des informations du client (email et nom d'utilisateur)
                const updateClientQuery = `
                    UPDATE client SET email = ?, nom_utilisation = ? WHERE idclient = ?
                `;
                connection.query(updateClientQuery, [email, nom_utilisation, idclient], (err) => {
                    if (err) {
                        console.error('Erreur lors de la mise à jour du client:', err);
                        return res.status(500).json({ message: 'Erreur lors de la mise à jour du client' });
                    }

                    res.status(200).json({ message: 'Profil mis à jour avec succès' });
                });
            });
        });
    } catch (error) {
        console.error('Erreur inattendue:', error);
        res.status(500).json({ message: 'Erreur inattendue' });
    }
});


// pour recuperer les informations
router.get('/', async (req, res) => {
    const { idclient } = req.query;

    if (!idclient) {
        return res.status(400).json({ message: 'ID client manquant' });
    }

    try {
        const profilQuery = `
            SELECT c.email, c.nom_utilisation, p.prenom, p.sexe, p.date_naissance 
            FROM client c 
            LEFT JOIN profil p ON c.idclient = p.idclient 
            WHERE c.idclient = ?
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

// route pour supprimer le compte
router.delete('/supprimer', async (req, res) => {
    const { idclient } = req.body;

    if (!idclient) {
        return res.status(400).json({ message: 'ID client est obligatoire pour supprimer le compte' });
    }

    try {
        // Commencer par supprimer le profil de l'utilisateur
        const deleteProfilQuery = 'DELETE FROM profil WHERE idclient = ?';
        connection.query(deleteProfilQuery, [idclient], (err) => {
            if (err) {
                console.error('Erreur lors de la suppression du profil:', err);
                return res.status(500).json({ message: 'Erreur lors de la suppression du profil' });
            }

            // Ensuite, supprimer les adresses de l'utilisateur 
            const deleteAdresseQuery = 'DELETE FROM adresse WHERE idclient = ?';
            connection.query(deleteAdresseQuery, [idclient], (err) => {
                if (err) {
                    console.error('Erreur lors de la suppression des adresses:', err);
                    return res.status(500).json({ message: 'Erreur lors de la suppression des adresses' });
                }

                // Enfin, supprimer le client lui-même
                const deleteClientQuery = 'DELETE FROM client WHERE idclient = ?';
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
