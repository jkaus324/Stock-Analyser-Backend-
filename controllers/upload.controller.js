const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Stock = require('../models/stocks.model');

const uploadStocks = (req, res) => {
  const directoryPath = path.join(__dirname, '../lists');

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).json({ message: 'Unable to scan directory', error: err });
    }

    let results = [];
    let filesProcessed = 0;

    files.forEach((file) => {
      const filePath = path.join(directoryPath, file);

      let category;
      let isHeader = true;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          // Normalize keys by trimming spaces and newlines
          const trimmedData = {};
          for (const key in data) {
            const trimmedKey = key.trim();
            trimmedData[trimmedKey] = data[key];
          }

          // Debug logging
          console.log('Trimmed Data:', trimmedData);

          if (isHeader) {
            category = trimmedData['SYMBOL']; // First element represents the category
            isHeader = false;
          } else {
            // For all rows starting from the 17th line, set stock values to zero
            const symbol = trimmedData['SYMBOL'];
            const name = symbol; // Set name to symbol for now

            if (symbol) {
              results.push({
                category,
                stock: {
                  symbol,
                  name,
                  allTimeHigh: 0,
                  currentPrice: 0,
                  dateUpdated: new Date(), // Default to current date
                },
              });
            } else {
              console.warn(`Invalid data row in file ${file}:`, trimmedData);
            }
          }
        })
        .on('end', async () => {
          filesProcessed++;
          if (filesProcessed === files.length) {
            try {
              await Stock.insertMany(results);
              res.status(200).json({ message: 'Stocks uploaded successfully!' });
            } catch (error) {
              console.error('Failed to upload stocks:', error);
              res.status(500).json({ message: 'Failed to upload stocks', error });
            }
          }
        });
    });
  });
};

module.exports = {
  uploadStocks,
};
