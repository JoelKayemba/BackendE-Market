const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const crypto = require('crypto');
const connection = require('../db'); // Connexion à la base de données

// Charger le fichier de configuration Firebase
const serviceAccount = require('../config/e-market-4d3cc-firebase-adminsdk-bfcex-c1ff13a584.json');

// Initialiser Firebase si ce n'est pas déjà fait
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://e-market-4d3cc.firebaseio.com' // URL de votre base de données Firebase
    });
}

// Route pour envoyer le code de vérification
router.post('/sendVerificationCode', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email requis' });
    }

    // Vérifier si l'email existe dans la base de données
    const checkEmailQuery = 'SELECT * FROM client WHERE email = ?';
    connection.query(checkEmailQuery, [email], async (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification de l\'email:', err);
            return res.status(500).json({ message: 'Erreur interne du serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Email non trouvé' });
        }

        const user = results[0];

        // Générer un code de vérification à 4 chiffres
        const verificationCode = Math.floor(1000 + Math.random() * 9000);

        // Sauvegarder le code de vérification dans la base de données avec une date d'expiration
        const expiration = Date.now() + 3600000; // 1 heure
        const saveCodeQuery = 'UPDATE client SET reset_code = ?, reset_code_expiration = ? WHERE idclient = ?';
        connection.query(saveCodeQuery, [verificationCode, expiration, user.idclient], async (err) => {
            if (err) {
                console.error('Erreur lors de la sauvegarde du code de vérification:', err);
                return res.status(500).json({ message: 'Erreur interne du serveur' });
            }

            // Envoyer un email avec Firebase Admin
            const mailOptions = {
                to: email,
                from: 'kayembajoel92@gmail.com',
                subject: 'Code de vérification pour réinitialiser votre mot de passe',
                text: `Votre code de vérification pour réinitialiser votre mot de passe est : ${verificationCode}. Ce code est valide pendant 1 heure.`,
            };

            try {
                await admin.firestore().collection('mail').add(mailOptions);
                res.status(200).json({ message: 'Code de vérification envoyé' });
            } catch (error) {
                console.error('Erreur lors de l\'envoi de l\'email via Firebase:', error);
                return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email' });
            }
        });
    });
});

module.exports = router;
