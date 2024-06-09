const express = require('express');
const router = express.Router();
const { getStocksBelowPercentage } = require('../controllers/stocks.controller');

router.get(`/stocks/below/:percentage`, getStocksBelowPercentage);

module.exports = router;