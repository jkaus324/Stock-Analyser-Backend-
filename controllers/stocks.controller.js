const Stock = require('../models/stocks.model'); // Assuming you have a Stock model
const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer');


const scrapeStockData = async (page, company) => {
    console.log(`company: ${company}`);
    const url = `https://finance.yahoo.com/quote/${company}.NS`;
    console.log(`url: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const { currentPrice, highestPrice } = await page.evaluate(() => {
        const priceElement = document.querySelector('fin-streamer[data-field="regularMarketPrice"] span');
        const rangeElement = document.querySelector('fin-streamer[data-field="fiftyTwoWeekRange"]');
};



const updateStockData = async (category) => {
    const stocks = await Stock.find({ category });
    const browser = await puppeteer.launch();

    const concurrentLimit = 5;
    let i = 0;

    while (i < stocks.length) {
        const promises = [];

        for (let j = 0; j < concurrentLimit && i < stocks.length; j++, i++) {
            promises.push((async (stock) => {
                try {
                    const stockData = await scrapeStockData(browser, stock.symbol);
                    if (stockData && stockData.currentPrice && stockData.highestPrice) {
                        stock.currentPrice = parseFloat(stockData.currentPrice.replace(/,/g, ''));
                        stock.allTimeHigh = parseFloat(stockData.highestPrice.replace(/,/g, ''));

                        await stock.save();
                        console.log(`Updated data for ${stock.symbol}`);
                    } else {
                        console.warn(`No data found for ${stock.symbol}`);
                    }
                } catch (error) {
                    console.error(`Error scraping data for ${stock.symbol}:`, error.message);
                }

                // Add a small delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            })(stocks[i]));
        }

        await Promise.all(promises);
    }

    await browser.close();
    console.log('All stock data updated');
};

// Get stocks below a certain percentage of their all-time high
const getStocksBelowPercentage = async (req, res) => {
    const { category, percentage } = req.params;

    try {
        // Update stock data
        // console.log(`Updating stock data for category: ${category}`);
        await updateStockData(category);

        // Find and filter stocks
        const stocks = await Stock.find({ category });
        const filteredStocks = stocks.filter(stock => {
            let diffPercentage = 0;
            if (stock.allTimeHigh >= 10 && stock.currentPrice >= 10) {
                diffPercentage = ((stock.allTimeHigh - stock.currentPrice) / stock.allTimeHigh) * 100;
            }

            return diffPercentage >= percentage;
        });

        console.log("Number of filtered stocks:", filteredStocks.length);
        res.json(filteredStocks);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: err.message });
    }
};

// Get unique categories
const getUniqueCategories = async (req, res) => {
    try {
        const uniqueCategories = await Stock.distinct('category');
        res.json(uniqueCategories);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getStocksBelowPercentage,
    getUniqueCategories
};
