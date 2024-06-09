const puppeteer = require('puppeteer');
const Stock = require('../models/stocks.model');

const scrapeStockData = async (symbol) => {
    const url = `https://finance.yahoo.com/quote/${symbol}`;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const stockData = await page.evaluate(() => {
        const getTextContent = (selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent : null;
        };

        const currentPrice = getTextContent('fin-streamer[data-field="regularMarketPrice"]');
        const fiftyTwoWeekRange = getTextContent('td[data-test="FIFTY_TWO_WK_RANGE-value"]');

        if (!fiftyTwoWeekRange) {
            return null;
        }

        const fiftyTwoWeekHigh = fiftyTwoWeekRange.split(' - ')[1];

        return {
            currentPrice: parseFloat(currentPrice.replace(/,/g, '')),
            fiftyTwoWeekHigh: parseFloat(fiftyTwoWeekHigh.replace(/,/g, ''))
        };
    });

    await browser.close();

    return stockData;
};

const updateStockData = async (category) => {
    const stocks = await Stock.find({ category });

    // Use concurrency for faster scraping
    const promises = stocks.map(async (stock) => {
        try {
            console.log(`Scraping data for ${stock.stock.symbol}`);
            const stockData = await scrapeStockData(stock.stock.symbol);

            if (stockData && stockData.currentPrice && stockData.fiftyTwoWeekHigh) {
                stock.stock.currentPrice = stockData.currentPrice;
                stock.stock.allTimeHigh = stockData.fiftyTwoWeekHigh;

                await stock.save();
                console.log(`Updated data for ${stock.stock.symbol}`);
            }
        } catch (error) {
            console.error(`Error scraping data for ${stock.stock.symbol}:`, error);
        }
    });

    await Promise.all(promises);
    console.log('All stock data updated');
};

// Get stocks below a certain percentage of their all-time high
const getStocksBelowPercentage = async (req, res) => {
  const { category, percentage } = req.params;

  try {
    // Update stock data
    console.log(`Updating stock data for category: ${category}`);
    await updateStockData(category);

    // Find and filter stocks
    const stocks = await Stock.find({ category });
    const filteredStocks = stocks.filter(stock => {
      const diffPercentage = ((stock.stock.allTimeHigh - stock.stock.currentPrice) / stock.stock.currentPrice) * 100;
      return diffPercentage >= percentage;
    });

    res.json(filteredStocks);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getStocksBelowPercentage,
};
