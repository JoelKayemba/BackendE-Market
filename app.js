const express = require('express');
const app = express();
const port = process.env.PORT || 3300;
const bodyParser = require('body-parser');
const connection = require('./db');

// Importer les routes 
const authRoutes = require('./routes/auth');
const adresseRoutes = require('./routes/adresses');
const profilRoutes= require('./routes/profil');
const EmailRoutes= require('./routes/EnvoieEmail');


app.use(express.json());

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route de test pour afficher "Bonjour"
app.get('/', (req, res) => {
  res.send('Bonjour');
});

// routes
app.use('/auth', authRoutes);
app.use('/adresses', adresseRoutes);
app.use('/profil', profilRoutes);
app.use('/sendEmail', EmailRoutes)


// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});
