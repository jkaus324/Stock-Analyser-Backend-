const express = require('express');
const { uploadStocks } = require('../controllers/upload.controller');

const router = express.Router();

router.post('/upload', uploadStocks);

module.exports = router;
