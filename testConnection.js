// testConnection.js
const connection = require('./db');

// Exécuter une requête simple pour tester la connexion
connection.query('SELECT 1 + 1 AS solution', (err, results) => {
  if (err) {
    console.error('Error executing query:', err);
    return;
  }
  console.log('Query result:', results[0].solution);
  connection.end(); // Fermer la connexion après le test
});
