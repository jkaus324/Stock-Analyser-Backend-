const express = require('express');
const router = express.Router();
const { getStocksBelowPercentage, getUniqueCategories } = require('../controllers/stocks.controller');
const { processStocks } = require('../controllers/indicator.controller');
const { sendStockReportViaEmail } = require('../controllers/report.controller');

router.get('/stocks/:category/:percentage', getStocksBelowPercentage);
router.get('/getindices', getUniqueCategories);
router.get('/stocks/indicators',processStocks);
router.get('/stocks/report',sendStockReportViaEmail);

module.exports = router;
