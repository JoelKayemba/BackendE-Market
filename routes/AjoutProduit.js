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
          image_url: results.map(row => row.image_url) 
        };

        

        res.status(201).json(produitAjoute);  // Renvoie les informations du produit ajouté
      });
    })
    .catch((errMessage) => {
      res.status(500).json({ message: errMessage });
    });
});


// Route pour récupérer les produits d'une boutique avec les catégories associées et les images en tableau
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
      GROUP_CONCAT(DISTINCT i.url) AS images,  -- Concaténer les images en une seule chaîne
      c.color AS couleur, 
      s.size AS taille,
      cat.nom AS categorie
    FROM produit p
    LEFT JOIN image i ON p.idProduit = i.Produit_idProduit
    LEFT JOIN ProduitColor c ON p.idProduit = c.Produit_idProduit
    LEFT JOIN ProduitSize s ON p.idProduit = s.Produit_idProduit
    LEFT JOIN ProduitCategorie pc ON p.idProduit = pc.Produit_idProduit
    LEFT JOIN Categorie cat ON pc.Categorie_idCategorie = cat.idCategorie
    WHERE p.Boutique_idBoutique = ?
    GROUP BY p.idProduit, c.color, s.size, cat.nom
  `;

  connection.query(sql, [idBoutique], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
    }

    const produits = results.reduce((acc, row) => {
      const existingProduct = acc.find((prod) => prod.idProduit === row.idProduit);
    
      if (existingProduct) {
        // Ajouter la catégorie si elle n'est pas déjà incluse
        if (!existingProduct.categories.includes(row.categorie)) {
          existingProduct.categories.push(row.categorie);
        }
    
        // Ajouter la couleur si elle n'est pas déjà incluse
        if (row.couleur && !existingProduct.couleurs.includes(row.couleur)) {
          existingProduct.couleurs.push(row.couleur);
        }
    
        // Ajouter la taille si elle n'est pas déjà incluse
        if (row.taille && !existingProduct.tailles.includes(row.taille)) {
          existingProduct.tailles.push(row.taille);
        }
    
      } else {
        acc.push({
          idProduit: row.idProduit,
          nom: row.nom,
          description: row.description,
          prix: row.prix,
          images: row.images ? row.images.split(',') : [],  // Convertir la chaîne en tableau d'images
          couleurs: row.couleur ? [row.couleur] : [],  // Initialiser un tableau pour les couleurs
          tailles: row.taille ? [row.taille] : [],     // Initialiser un tableau pour les tailles
          categories: row.categorie ? [row.categorie] : [] // Créer un tableau de catégories
        });
      }
      return acc;
    }, []);
    

    res.status(200).json(produits);
  });
});

// route pour modifier un produit
router.put('/modifierProduit/:idProduit', upload.array('images', 10), (req, res) => {
  const { nom, description, prix, idBoutique } = req.body;
  let categories, colors, sizes;

  // Analyser les catégories
  try {
    categories = JSON.parse(req.body.categories);
  } catch (error) {
    return res.status(400).json({ message: 'Les catégories doivent être un tableau JSON valide' });
  }

  // Analyser les couleurs
  try {
    colors = JSON.parse(req.body.colors);
  } catch (error) {
    colors = []; // Définir un tableau vide si l'analyse échoue
  }

  // Analyser les tailles
  try {
    sizes = JSON.parse(req.body.sizes);
  } catch (error) {
    sizes = []; // Définir un tableau vide si l'analyse échoue
  }

  // Mise à jour du produit dans la base de données
  const updateProduit = () => {
    return new Promise((resolve, reject) => {
      const sqlUpdateProduit = `
        UPDATE produit 
        SET nom = ?, description = ?, prix = ?, Boutique_idBoutique = ? 
        WHERE idProduit = ?
      `;
      connection.query(sqlUpdateProduit, [nom, description, prix, idBoutique, req.params.idProduit], (err, result) => {
        if (err) {
          console.error('Erreur lors de la mise à jour du produit:', err);
          return reject('Erreur lors de la mise à jour du produit');
        }
        resolve();
      });
    });
  };

  // Mise à jour des catégories
  const updateCategories = (idProduit) => {
    return new Promise((resolve, reject) => {
      if (categories && categories.length > 0) {
        // Supprimer les anciennes associations de catégories
        const sqlDeleteCategories = `DELETE FROM ProduitCategorie WHERE Produit_idProduit = ?`;
        connection.query(sqlDeleteCategories, [idProduit], (err) => {
          if (err) {
            console.error('Erreur lors de la suppression des anciennes catégories:', err);
            return reject('Erreur lors de la suppression des anciennes catégories');
          }
  
          // Récupérer les IDs des catégories en fonction de leurs noms
          const sqlGetCategoryIds = `SELECT idCategorie FROM Categorie WHERE nom IN (?)`;
          connection.query(sqlGetCategoryIds, [categories], (err, results) => {
            if (err) {
              console.error('Erreur lors de la récupération des IDs des catégories:', err);
              return reject('Erreur lors de la récupération des IDs des catégories');
            }
  
            const categoryIds = results.map(row => row.idCategorie);
            if (categoryIds.length === 0) {
              return resolve(); // Aucune catégorie trouvée, rien à insérer
            }
  
            // Associer les catégories trouvées au produit
            const categoryValues = categoryIds.map(catId => [idProduit, catId]);
            const sqlInsertCategories = `INSERT INTO ProduitCategorie (Produit_idProduit, Categorie_idCategorie) VALUES ?`;
            connection.query(sqlInsertCategories, [categoryValues], (err) => {
              if (err) {
                console.error('Erreur lors de l\'ajout des nouvelles catégories:', err);
                return reject('Erreur lors de l\'ajout des nouvelles catégories');
              }
              resolve();
            });
          });
        });
      } else {
        resolve(); // Si pas de catégories, ne rien changer
      }
    });
  };
  

  // Mise à jour des tailles
  const updateSizes = (idProduit) => {
    return new Promise((resolve, reject) => {
      if (Array.isArray(sizes) && sizes.length > 0) {
        const sqlDeleteSizes = `DELETE FROM ProduitSize WHERE Produit_idProduit = ?`;
        connection.query(sqlDeleteSizes, [idProduit], (err) => {
          if (err) {
            console.error('Erreur lors de la suppression des anciennes tailles:', err);
            return reject('Erreur lors de la suppression des anciennes tailles');
          }

          const sizeValues = sizes.map(size => [size, idProduit]);
          const sqlInsertSizes = `INSERT INTO ProduitSize (size, Produit_idProduit) VALUES ?`;
          connection.query(sqlInsertSizes, [sizeValues], (err) => {
            if (err) {
              console.error('Erreur lors de l\'ajout des nouvelles tailles:', err);
              return reject('Erreur lors de l\'ajout des nouvelles tailles');
            }
            resolve();
          });
        });
      } else {
        resolve(); // Si pas de tailles, pas de mise à jour
      }
    });
  };

  // Mise à jour des couleurs
  const updateColors = (idProduit) => {
    return new Promise((resolve, reject) => {
      if (Array.isArray(colors) && colors.length > 0) {
        const sqlDeleteColors = `DELETE FROM ProduitColor WHERE Produit_idProduit = ?`;
        connection.query(sqlDeleteColors, [idProduit], (err) => {
          if (err) {
            console.error('Erreur lors de la suppression des anciennes couleurs:', err);
            return reject('Erreur lors de la suppression des anciennes couleurs');
          }

          const colorValues = colors.map(color => [color, idProduit]);
          const sqlInsertColors = `INSERT INTO ProduitColor (color, Produit_idProduit) VALUES ?`;
          connection.query(sqlInsertColors, [colorValues], (err) => {
            if (err) {
              console.error('Erreur lors de l\'ajout des nouvelles couleurs:', err);
              return reject('Erreur lors de l\'ajout des nouvelles couleurs');
            }
            resolve();
          });
        });
      } else {
        resolve(); // Si pas de couleurs, pas de mise à jour
      }
    });
  };

  // Mise à jour des images
  const updateImages = (idProduit) => {
    return new Promise((resolve, reject) => {
      if (req.files && req.files.length > 0) {
        const imagePaths = req.files.map(file => [file.path, idProduit]);
        const sqlInsertImages = `INSERT INTO image (url, Produit_idProduit) VALUES ?`;
        connection.query(sqlInsertImages, [imagePaths], (err) => {
          if (err) {
            console.error('Erreur lors de l\'ajout des nouvelles images:', err);
            return reject('Erreur lors de l\'ajout des nouvelles images');
          }
          resolve();
        });
      } else {
        resolve(); // Si pas de nouvelles images, ne rien changer
      }
    });
  };

  // Exécuter toutes les mises à jour
  updateProduit()
    .then(() => Promise.all([
      updateCategories(req.params.idProduit),
      updateSizes(req.params.idProduit),
      updateColors(req.params.idProduit),
      updateImages(req.params.idProduit),
    ]))
    .then(() => {
      res.status(200).json({ message: 'Produit modifié avec succès' });
    })
    .catch((errMessage) => {
      res.status(500).json({ message: errMessage });
    });
});




// Route pour supprimer un produit
router.delete('/supprimerProduit/:idProduit', (req, res) => {
  const { idProduit } = req.params;

  if (!idProduit) {
    return res.status(400).json({ message: 'L\'ID du produit est requis' });
  }

  // Supprimer les associations liées au produit
  const deleteAssociations = () => {
    return new Promise((resolve, reject) => {
      const sqlDeleteAssociations = `
        DELETE FROM ProduitCategorie WHERE Produit_idProduit = ?;
        DELETE FROM ProduitColor WHERE Produit_idProduit = ?;
        DELETE FROM ProduitSize WHERE Produit_idProduit = ?;
        DELETE FROM image WHERE Produit_idProduit = ?;
      `;
      connection.query(sqlDeleteAssociations, [idProduit, idProduit, idProduit, idProduit], (err) => {
        if (err) {
          console.error('Erreur lors de la suppression des associations liées au produit:', err);
          return reject('Erreur lors de la suppression des associations');
        }
        resolve();
      });
    });
  };

  // Supprimer le produit
  const deleteProduit = () => {
    return new Promise((resolve, reject) => {
      const sqlDeleteProduit = `DELETE FROM produit WHERE idProduit = ?`;
      connection.query(sqlDeleteProduit, [idProduit], (err) => {
        if (err) {
          console.error('Erreur lors de la suppression du produit:', err);
          return reject('Erreur lors de la suppression du produit');
        }
        resolve();
      });
    });
  };

  // Exécuter la suppression
  deleteAssociations()
    .then(deleteProduit)
    .then(() => {
      res.status(200).json({ message: 'Produit supprimé avec succès' });
    })
    .catch((errMessage) => {
      res.status(500).json({ message: errMessage });
    });
});


module.exports = router;
