const admin = require('firebase-admin');
const express = require('express');
const router = express.Router();
const serviceAccount = require('./config/e-market-4d3cc-firebase-adminsdk-bfcex-c1ff13a584.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://e-market-4d3cc.firebaseio.com'
});
