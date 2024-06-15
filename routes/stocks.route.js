const express = require('express');
const router = express.Router();
const { getStocksBelowPercentage, getUniqueCategories } = require('../controllers/stocks.controller');

router.get('/stocks/:category/:percentage', getStocksBelowPercentage);
router.get('/getindices', getUniqueCategories);

module.exports = router;
