const Stock = require('../models/stocks.model');

// Get stocks below a certain percentage of their all-time high
const getStocksBelowPercentage = async (req, res) => {
  const percentage = req.params.percentage;
  try {
    const stocks = await Stock.find();
    const filteredStocks = stocks.filter(stock => {
      return stock.currentPrice <= stock.allTimeHigh * (1 - (percentage / 100));
    });
    res.json(filteredStocks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getStocksBelowPercentage,
};
