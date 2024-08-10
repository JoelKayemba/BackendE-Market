const express = require('express');
const router = express.Router();
const stripe = require('stripe')('votre-cle-secrete-stripe');
const connection = require('../db'); // Connexion à la base de données
const bodyParser = require('body-parser');

const endpointSecret = 'votre-secret-webhook';

router.post('/stripe-webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        return res.sendStatus(400);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // Récupérer les informations de la session
        const paymentIntentId = session.payment_intent;
        const clientEmail = session.customer_email;

        // Mettre à jour votre base de données pour enregistrer le paiement
        const updatePaymentQuery = 'UPDATE commandes SET status = ?, payment_intent = ? WHERE email = ?';
        connection.query(updatePaymentQuery, ['paid', paymentIntentId, clientEmail], (err) => {
            if (err) {
                console.error('Erreur lors de la mise à jour du paiement:', err);
                return res.status(500).json({ message: 'Erreur interne du serveur' });
            }
            console.log('Paiement mis à jour avec succès dans la base de données.');
        });
    }

    // Répondre à Stripe pour indiquer que l'événement a été traité correctement
    res.status(200).json({ received: true });
});

module.exports = router;
