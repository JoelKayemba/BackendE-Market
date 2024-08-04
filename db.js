const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost', 
  user: 'root',     
  password: 'Jojokay92', 
  database: 'E-Market',                      
});

connection.connect(error => {
  if (error) {
    console.error('Erreur de connexion : ', error);
    return;
  }
  console.log('Connecté à la base de données MySQL');
});

module.exports = connection;
