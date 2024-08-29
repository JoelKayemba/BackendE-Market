const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const connection = require('../db'); // Connexion à la base de données
const nodemailer = require('nodemailer');

// Créer un transporteur pour nodemailer en utilisant iCloud
const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false, // true pour port 465, false pour les autres ports
    auth: {
        user: 'kayembajoel92@icloud.com', 
        pass: 'wnby-isev-aejs-hlgo' 
    }
});

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

            // Options de l'email
            const mailOptions = {
                from: 'kayembajoel92@icloud.com', // Adresse email de l'expéditeur
                to: email, // Adresse email du destinataire
                subject: 'Code de vérification pour réinitialiser votre mot de passe',
                text: `Votre code de vérification pour réinitialiser votre mot de passe est : ${verificationCode}. Ce code est valide pendant 1 heure.`,
            };

            // Envoyer l'email
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Erreur lors de l\'envoi de l\'email:', error);
                    return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email' });
                } else {
                    console.log('Email envoyé: ' + info.response);
                    res.status(200).json({ message: 'Code de vérification envoyé' });
                }
            });
        });
    });
});

// Route pour vérifier le code de vérification
router.post('/verifyCode', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ message: 'Email et code requis' });
    }

    // Vérifier si l'email existe dans la base de données et récupérer le code de vérification
    const checkCodeQuery = 'SELECT reset_code, reset_code_expiration FROM client WHERE email = ?';
    connection.query(checkCodeQuery, [email], async (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification du code:', err);
            return res.status(500).json({ message: 'Erreur interne du serveur' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Email non trouvé' });
        }

        const user = results[0];
        const now = Date.now();

        // Assure que la comparaison est entre des entiers
        if (user.reset_code !== parseInt(code, 10)) {
            return res.status(400).json({ message: 'Code de vérification incorrect' });
        }

        if (now > user.reset_code_expiration) {
            return res.status(400).json({ message: 'Code de vérification expiré' });
        }

        // Code valide
        res.status(200).json({ message: 'Code vérifié avec succès' });
    });
});


// Route pour renvoyer un nouveau code de vérification
router.post('/resendCode', async (req, res) => {
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

        // Générer un nouveau code de vérification à 4 chiffres
        const newVerificationCode = Math.floor(1000 + Math.random() * 9000);

        // Mettre à jour le code de vérification dans la base de données avec une nouvelle date d'expiration
        const newExpiration = Date.now() + 3600000; // 1 heure
        const updateCodeQuery = 'UPDATE client SET reset_code = ?, reset_code_expiration = ? WHERE idclient = ?';
        connection.query(updateCodeQuery, [newVerificationCode, newExpiration, user.idclient], async (err) => {
            if (err) {
                console.error('Erreur lors de la mise à jour du code de vérification:', err);
                return res.status(500).json({ message: 'Erreur interne du serveur' });
            }

            // Envoyer un email avec le nouveau code de vérification
            const mailOptions = {
                from: 'kayembajoel92@icloud.com', // Adresse email de l'expéditeur
                to: email, // Adresse email du destinataire
                subject: 'Nouveau code de vérification',
                text: `Votre nouveau code de vérification pour réinitialiser votre mot de passe est : ${newVerificationCode}. Ce code est valide pendant 1 heure.`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Erreur lors de l\'envoi de l\'email:', error);
                    return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email' });
                } else {
                    console.log('Email envoyé: ' + info.response);
                    res.status(200).json({ message: 'Nouveau code de vérification envoyé' });
                }
            });
        });
    });
});

// Route pour changer le mot de passe
router.post('/change-password', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    try {
        // Hacher le nouveau mot de passe avec bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Mise à jour du mot de passe dans la base de données
        const updatePasswordQuery = 'UPDATE client SET password = ? WHERE email = ?';
        connection.query(updatePasswordQuery, [hashedPassword, email], (err) => {
            if (err) {
                console.error('Erreur lors de la mise à jour du mot de passe:', err);
                return res.status(500).json({ message: 'Erreur interne du serveur' });
            }

            res.status(200).json({ message: 'Mot de passe changé avec succès' });
        });
    } catch (error) {
        console.error('Erreur lors du hachage du mot de passe:', error);
        return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

module.exports = router;
