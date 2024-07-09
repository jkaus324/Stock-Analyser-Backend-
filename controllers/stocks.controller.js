const Stock = require('../models/stocks.model'); // Assuming you have a Stock model
const puppeteer = require('puppeteer');

const scrapeStockData = async (page, company) => {
    // console.log(`company: ${company}`);
    const url = `https://finance.yahoo.com/quote/${company}.NS/`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const stockData = await page.evaluate(() => {
        const priceElement = document.querySelector('fin-streamer[data-field="regularMarketPrice"] span');
        const rangeElement = document.querySelector('fin-streamer[data-field="fiftyTwoWeekRange"]');

        const currentPrice = priceElement ? parseFloat(priceElement.textContent.trim().replace(/,/g, '')) : null;
        let fiftyTwoWeekHigh = null;
        if (rangeElement) {
            const rangeText = rangeElement.getAttribute('data-value');
            fiftyTwoWeekHigh = parseFloat(rangeText.split(' - ')[1].trim().replace(/,/g, ''));
        }

        return { currentPrice, fiftyTwoWeekHigh };
    });

    if (stockData.currentPrice === null || stockData.currentPrice === 206.52) {
        console.error(`Failed to retrieve correct current price for ${company}.`);
    }

    return stockData;
};

const updateStockData = async (category) => {
    const stocks = await Stock.find({ category });
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 60000
    });

    const concurrentLimit = 5;
    let i = 0;
    const promises = [];  // Move the declaration of promises outside the while loop

    while (i < stocks.length) {
        const batchPromises = [];  // Temporary array to hold the promises for the current batch

        for (let j = 0; j < concurrentLimit && i < stocks.length; j++, i++) {
            batchPromises.push((async (stock) => {
                const page = await browser.newPage();
                try {
                    const stockData = await scrapeStockData(page, stock.symbol);
                    // console.log(`Scraping data for ${stock.symbol}`);
                    console.log(stockData);

                    if (stockData && stockData.currentPrice && stockData.fiftyTwoWeekHigh) {
                        stock.currentPrice = parseInt(stockData.currentPrice);
                        stock.allTimeHigh = parseInt(stockData.fiftyTwoWeekHigh);

                        await stock.save();
                        // console.log(`Updated data for ${stock.symbol}`);
                    }
                } catch (error) {
                    console.error(`Error scraping data for ${stock.symbol}:`, error);
                } finally {
                    await page.close();
                }
            })(stocks[i]));

            // Add a small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Add the batch promises to the main promises array
        promises.push(...batchPromises);

        // Wait for the current batch to complete before continuing
        await Promise.all(batchPromises);
    }

    await Promise.all(promises);

    await browser.close();
    console.log('All stock data updated');
};

// Get stocks below a certain percentage of their all-time high
const getStocksBelowPercentage = async (req, res) => {
    const { category, percentage } = req.params;

    try {
        // Update stock data
        console.log(`Updating stock data for category: ${category}`);
        // await updateStockData(category);

        // Find and filter stocks
        const stocks = await Stock.find({ category });
        const filteredStocks = stocks.filter(stock => {
            const diffPercentage = ((stock.allTimeHigh - stock.currentPrice) / stock.currentPrice) * 100;
            if (diffPercentage <= 0) {
                console.log(stock.symbol);
                console.log("currentPrice", stock.currentPrice);
                console.log("allTimeHigh", stock.allTimeHigh);
            }
            // if(diffPercentage>=200  || diffPercentage<0){
            //     console.log(`Percentage of the stock ${stock.symbol} is ${diffPercentage} which is exceptionally out of bound`);
            // }
            return (diffPercentage >= percentage) && (diffPercentage<=200);
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
        console.log(uniqueCategories);
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
