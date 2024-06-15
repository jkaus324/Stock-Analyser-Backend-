const axios = require('axios');
const cheerio = require('cheerio');
const Stock = require('../models/stocks.model'); // Assuming you have a Stock model

const scrapeStockData = async (company) => {
    console.log(`company: ${company}`);
    const url = `https://finance.yahoo.com/quote/${company}.NS`;
    console.log(`url: ${url}`);
    
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        const priceElement = $('fin-streamer[data-field="regularMarketPrice"] span');
        const rangeElement = $('fin-streamer[data-field="fiftyTwoWeekRange"]');

        const rangeText = rangeElement.attr('data-value');
        const highestPrice = rangeText.split(' - ')[1].trim();

        return {
            currentPrice: priceElement.text().trim(),
            highestPrice
        };
    } catch (error) {
        console.error(`Error fetching data for ${company}:`, error);
        return null;
    }
};

const updateStockData = async (category) => {
    const stocks = await Stock.find({ category });

    const concurrentLimit = 5;
    let i = 0;

    while (i < stocks.length) {
        const promises = [];

        for (let j = 0; j < concurrentLimit && i < stocks.length; j++, i++) {
            promises.push((async (stock) => {
                try {
                    const stockData = await scrapeStockData(stock.symbol);
                    console.log(`Scraping data for ${stock.symbol}`);

                    if (stockData && stockData.currentPrice && stockData.highestPrice) {
                        stock.currentPrice = parseFloat(stockData.currentPrice.replace(/,/g, ''));
                        stock.allTimeHigh = parseFloat(stockData.highestPrice.replace(/,/g, ''));

                        await stock.save();
                        console.log(`Updated data for ${stock.symbol}`);
                    }
                } catch (error) {
                    console.error(`Error scraping data for ${stock.symbol}:`, error);
                }

                // Add a small delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            })(stocks[i]));
        }

        await Promise.all(promises);
    }

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
            const diffPercentage = ((stock.allTimeHigh - stock.currentPrice) / stock.currentPrice) * 100;
            if (diffPercentage <= 0) {
                console.log(stock.symbol);
                console.log("currentPrice", stock.currentPrice);
                console.log("allTimeHigh", stock.allTimeHigh);
            }
            return diffPercentage >= percentage;
        });

        console.log("number of filteredStocks", filteredStocks.length);
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
