const express = require('express');
const router = express.Router();
const { getStocksBelowPercentage, getUniqueCategories } = require('../controllers/stocks.controller');
const { processStocks } = require('../controllers/indicator.controller');

router.get('/stocks/:category/:percentage', getStocksBelowPercentage);
router.get('/getindices', getUniqueCategories);
router.get('/stocks/indicators',processStocks);

module.exports = router;
