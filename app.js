const express = require('express');
const app = express();
const port = process.env.PORT || 3300;
const connection = require('./db');

// Importer les routes d'authentification
const authRoutes = require('./routes/auth');

app.use(express.json());

// Route de test pour afficher "Bonjour"
app.get('/', (req, res) => {
  res.send('Bonjour');
});

// Utiliser les routes d'authentification
app.use('/auth', authRoutes);

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${port}`);
});
