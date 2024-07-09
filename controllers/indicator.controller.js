const puppeteer = require('puppeteer');
const Stock = require('../models/stocks.model');

const calculateEMA = (prices, period) => {
  const k = 2 / (period + 1);
  let emaArray = [prices[0]]; // Start with the first price
  for (let i = 1; i < prices.length; i++) {
    emaArray.push(prices[i] * k + emaArray[i - 1] * (1 - k));
  }
  return emaArray;
};

// Function to calculate Mean Moving Average (MMA)
const calculateMMA = (prices, period) => {
  let mmaArray = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      mmaArray.push(null); // Not enough data points to calculate MMA
    } else {
      const avg = prices.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0) / period;
      mmaArray.push(avg);
    }
  }
  return mmaArray;
};

// Function to scrape stock data from Yahoo Finance
const scrapeStockData = async (page, company, period) => {
  const url = `https://finance.yahoo.com/quote/${company}.NS/history/`;
  await page.goto(url, { waitUntil: 'networkidle2' });

  const stockData = await page.evaluate((period) => {
    const rows = Array.from(document.querySelectorAll('table[data-test="historical-prices"] tbody tr'));
    const historicalPrices = rows.slice(0, period).map(row => {
      const cells = row.querySelectorAll('td');
      return {
        date: cells[0].textContent,
        close: parseFloat(cells[5].textContent.replace(',', ''))
      };
    });

    const currentPrice = parseFloat(document.querySelector('fin-streamer[data-field="regularMarketPrice"]')?.textContent.replace(',', '') || null);
    const fiftyTwoWeekHigh = parseFloat(document.querySelector('td[data-test="FIFTY_TWO_WK_RANGE-value"]')?.textContent.split(' - ')[1].replace(',', '') || null);

    return {
      currentPrice,
      fiftyTwoWeekHigh,
      historicalPrices
    };
  }, period);

  return stockData;
};

// Main function to process multiple stocks
const processStocks = async (req, res) => {
  try {
    const stockList = JSON.parse(req.query.stockList); // Parse stockList from query string
    const period = parseInt(req.query.period) || 10; // Define the period for EMA and MMA
    const calculateEMAFlag = req.query.calculateEMAFlag === 'true'; // Convert to boolean
    const calculateMMAFlag = req.query.calculateMMAFlag === 'true'; // Convert to boolean

    console.log('Received stockList:', stockList);
    console.log('Period:', period);
    console.log('Calculate EMA:', calculateEMAFlag);
    console.log('Calculate MMA:', calculateMMAFlag);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let results = [];

    for (const company of stockList) {
      const stockRecord = await Stock.findOne({ symbol: company }).exec();
      if (!stockRecord) {
        continue;
      }

      const stockData = await scrapeStockData(page, company, period);
      if (stockData.historicalPrices.length > 0) {
        const prices = stockData.historicalPrices.map(data => data.close);

        let ema = null;
        let mma = null;

        if (calculateEMAFlag) {
          ema = calculateEMA(prices, period);
        }
        if (calculateMMAFlag) {
          mma = calculateMMA(prices, period);
        }

        results.push({
          symbol: company,
          highestPrice: stockRecord.allTimeHigh,
          currentPrice: stockRecord.currentPrice,
          ema: calculateEMAFlag ? ema : null,
          mma: calculateMMAFlag ? mma : null
        });
      }
    }

    await browser.close();
    res.json(results);
  } catch (error) {
    console.error('Error processing stocks:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  processStocks
};
