const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Stock = require('../models/stocks.model');

// Helper function to parse CSV file
const parseCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
};

// Function to safely parse a number from a string
const safeParseFloat = (value) => {
    if (typeof value === 'string') {
        return parseFloat(value.replace(/,/g, ''));
    }
    return NaN;
};

// Upload function to read CSV files and store data
const uploadStocks = async (req, res) => {
    try {
        const files = fs.readdirSync(path.join(__dirname, '../lists'));

        for (const file of files) {
            if (path.extname(file) === '.csv') {
                const filePath = path.join(__dirname, '../lists', file);
                const data = await parseCSV(filePath);

                for (const row of data) {
                    // Check for headers and correct them
                    const headers = Object.keys(row);
                    const symbolKey = headers[0];
                    const allTimeHighKey = headers[1];
                    const currentPriceKey = headers[2];

                    const symbol = row[symbolKey];
                    const allTimeHighStr = row[allTimeHighKey];
                    const currentPriceStr = row[currentPriceKey];

                    if (!symbol || !allTimeHighStr || !currentPriceStr) {
                        console.warn(`Skipping row due to missing data: ${JSON.stringify(row)}`);
                        continue;
                    }

                    const allTimeHigh = safeParseFloat(allTimeHighStr);
                    const currentPrice = safeParseFloat(currentPriceStr);

                    if (isNaN(allTimeHigh) || isNaN(currentPrice)) {
                        console.warn(`Skipping row due to invalid number format: ${JSON.stringify(row)}`);
                        continue;
                    }

                    const stockData = {
                        category: path.basename(file, '.csv'),
                        symbol: symbol,
                        allTimeHigh: allTimeHigh,
                        currentPrice: currentPrice
                    };

                    const stock = new Stock(stockData);
                    await stock.save();
                }
            }
        }

        res.status(200).send('Stocks uploaded successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while uploading stocks');
    }
};

module.exports = {
    uploadStocks
};
