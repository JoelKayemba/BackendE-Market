const express = require('express');
const multer = require('multer');
const connection = require('../db');

const router = express.Router();

// Configuration de `multer` pour stocker les fichiers localement
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// Route pour ajouter des produits
router.post('/ajoutProduit', upload.array('images', 10), (req, res) => {
  const { nom, description, prix, idBoutique, colors, sizes } = req.body;
  let categories;

  // S'assurer que les catégories sont bien reçues sous forme de tableau
  try {
    categories = JSON.parse(req.body.categories);  // Parse si les catégories sont envoyées comme une chaîne JSON
  } catch (error) {
    return res.status(400).json({ message: 'Les catégories doivent être un tableau JSON valide' });
  }

  // Vérifier les données requises
  if (!nom || !prix || !idBoutique) {
    return res.status(400).json({ message: 'Les champs nom, prix et Boutique_idBoutique sont obligatoires' });
  }

  // Insérer le produit dans la base de données
  const insertProduit = () => {
    return new Promise((resolve, reject) => {
      const sqlProduit = `INSERT INTO produit (nom, description, prix, Boutique_idBoutique) VALUES (?, ?, ?, ?)`;
      connection.query(sqlProduit, [nom, description, prix, idBoutique], (err, result) => {
        if (err) {
          console.error('Erreur lors de l\'ajout du produit:', err);
          return reject('Erreur lors de l\'ajout du produit');
        }
        resolve(result.insertId);
      });
    });
  };

  // Insérer les catégories si elles sont fournies
  const insertCategories = (idProduit) => {
    return new Promise((resolve, reject) => {
      if (!categories || categories.length === 0) return resolve();

      const sqlCheckCategories = `SELECT idCategorie, nom FROM Categorie WHERE nom IN (?)`;
      connection.query(sqlCheckCategories, [categories], (err, results) => {
        if (err) {
          console.error('Erreur lors de la vérification des catégories:', err);
          return reject('Erreur lors de la vérification des catégories');
        }

        const existingCategoryIds = results.map(row => row.idCategorie);
        const missingCategories = categories.filter(category => !results.map(row => row.nom).includes(category));

        const insertMissingCategories = () => {
          return new Promise((resolve, reject) => {
            if (missingCategories.length === 0) return resolve(existingCategoryIds);

            const sqlInsertCategories = `INSERT INTO Categorie (nom) VALUES ?`;
            const values = missingCategories.map(category => [category]);

            connection.query(sqlInsertCategories, [values], (err, result) => {
              if (err) {
                console.error('Erreur lors de l\'ajout des nouvelles catégories:', err);
                return reject('Erreur lors de l\'ajout des nouvelles catégories');
              }

              const newCategoryIds = Array.from({ length: result.affectedRows }, (_, i) => result.insertId + i);
              resolve([...existingCategoryIds, ...newCategoryIds]);
            });
          });
        };

        insertMissingCategories().then(categoryIds => {
          const sqlAssocCategories = `INSERT INTO ProduitCategorie (Produit_idProduit, Categorie_idCategorie) VALUES ?`;
          const associations = categoryIds.map(catId => [idProduit, catId]);

          connection.query(sqlAssocCategories, [associations], (err) => {
            if (err) {
              console.error('Erreur lors de l\'association des catégories:', err);
              return reject('Erreur lors de l\'association des catégories');
            }
            resolve();
          });
        });
      });
    });
  };

  // Insérer les couleurs du produit
  const insertColors = (idProduit) => {
    return new Promise((resolve, reject) => {
      if (colors && colors.length > 0) {
        const sqlColors = `INSERT INTO ProduitColor (color, Produit_idProduit) VALUES ?`;
        const colorValues = colors.map(color => [color, idProduit]);

        connection.query(sqlColors, [colorValues], (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout des couleurs:', err);
            return reject('Erreur lors de l\'ajout des couleurs');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  // Insérer les tailles du produit
  const insertSizes = (idProduit) => {
    return new Promise((resolve, reject) => {
      if (sizes && sizes.length > 0) {
        const sqlSizes = `INSERT INTO ProduitSize (size, Produit_idProduit) VALUES ?`;
        const sizeValues = sizes.map(size => [size, idProduit]);

        connection.query(sqlSizes, [sizeValues], (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout des tailles:', err);
            return reject('Erreur lors de l\'ajout des tailles');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  // Insérer les images du produit
  const insertImages = (idProduit) => {
    return new Promise((resolve, reject) => {
      if (req.files && req.files.length > 0) {
        const imagePaths = req.files.map(file => [file.path, idProduit]);

        const sqlImages = `INSERT INTO image (url, Produit_idProduit) VALUES ?`;
        connection.query(sqlImages, [imagePaths], (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout des images:', err);
            return reject('Erreur lors de l\'ajout des images');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  // Exécuter toutes les insertions en parallèle et récupérer le produit ajouté
  insertProduit()
    .then((idProduit) => {
      return Promise.all([
        insertCategories(idProduit),
        insertColors(idProduit),
        insertSizes(idProduit),
        insertImages(idProduit),
      ]).then(() => idProduit);
    })
    .then((idProduit) => {
      // Récupérer le produit complet avec toutes ses informations
      const sqlGetProduit = `
        SELECT 
          p.idProduit, 
          p.nom, 
          p.description, 
          p.prix, 
          i.url AS image_url
        FROM produit p
        LEFT JOIN image i ON p.idProduit = i.Produit_idProduit
        WHERE p.idProduit = ?
      `;

      connection.query(sqlGetProduit, [idProduit], (err, results) => {
        if (err) {
          console.error('Erreur lors de la récupération du produit ajouté:', err);
          return res.status(500).json({ message: 'Erreur lors de la récupération du produit ajouté' });
        }

        const produitAjoute = {
          idProduit: results[0].idProduit,
          nom: results[0].nom,
          description: results[0].description,
          prix: results[0].prix,
          image_url: results[0].image_url,
        };

        res.status(201).json(produitAjoute);  // Renvoie les informations du produit ajouté
      });
    })
    .catch((errMessage) => {
      res.status(500).json({ message: errMessage });
    });
});

// Route pour récupérer les produits d'une boutique
router.get('/produitsBoutique/:idBoutique', (req, res) => {
  const { idBoutique } = req.params;

  if (!idBoutique) {
    return res.status(400).json({ message: 'idBoutique est requis' });
  }

  const sql = `
    SELECT 
      p.idProduit, 
      p.nom, 
      p.description, 
      p.prix, 
      p.Boutique_idBoutique, 
      i.url AS image_url,
      c.color AS couleur, 
      s.size AS taille
    FROM produit p
    LEFT JOIN image i ON p.idProduit = i.Produit_idProduit
    LEFT JOIN ProduitColor c ON p.idProduit = c.Produit_idProduit
    LEFT JOIN ProduitSize s ON p.idProduit = s.Produit_idProduit
    WHERE p.Boutique_idBoutique = ?
  `;

  connection.query(sql, [idBoutique], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
    }

    const produits = results.map(row => ({
      idProduit: row.idProduit,
      nom: row.nom,
      description: row.description,
      prix: row.prix,
      image: row.image_url,
      couleur: row.couleur,
      taille: row.taille,
    }));

    res.status(200).json(produits);
  });
});

module.exports = router;
