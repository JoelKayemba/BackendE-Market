const express = require('express');
const app = express();
const port = process.env.PORT || 3300;
const bodyParser = require('body-parser');
const connection = require('./db');
const path = require('path');

// Importer les routes 
const authRoutes = require('./routes/auth');
const adresseRoutes = require('./routes/adresses');
const profilRoutes= require('./routes/profil');
const EmailRoutes= require('./routes/EnvoieEmail');
const annonceRoutes= require('./routes/annonceRoutes');
const ajoutBoutique= require('./routes/AjoutBoutique');
const ownBoutique = require('./routes/OwnBoutique');
const categories= require('./routes/categories');
const ajoutProduit= require('./routes/AjoutProduit')
//const ownPrestataire = require('./routes/OwnPrestataire');

app.use(express.json());

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir les fichiers statiques du répertoire 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route de test pour afficher "Bonjour"
app.get('/', (req, res) => {
  res.send('Bonjour');
});

// routes
app.use('/auth', authRoutes);
app.use('/adresses', adresseRoutes);
app.use('/profil', profilRoutes);
app.use('/sendEmail', EmailRoutes);
app.use('/annonce', annonceRoutes);
app.use('/boutique', ajoutBoutique);
app.use('/ownBoutique' , ownBoutique);
app.use('/categorie', categories);
app.use('/produit', ajoutProduit);
//app.use('/ownPrestataire', ownPrestataire);

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});
