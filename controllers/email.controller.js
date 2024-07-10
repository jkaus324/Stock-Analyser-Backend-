const fs = require('fs');
const path = require('path'); // Import the path module
require('dotenv').config();
const nodemailer = require('nodemailer');
const Stock = require('../models/stocks.model'); // Adjust the path as necessary

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const convertDataToCsv = async (data, filePath) => {
    const csvWriter = createCsvWriter({
        path: filePath,
        header: [
            { id: 'symbol', title: 'Symbol' },
            { id: 'currentPrice', title: 'Current Price' },
            { id: 'allTimeHigh', title: 'All Time High' },
        ]
    });

    await csvWriter.writeRecords(data);
    console.log('CSV file was written successfully to', filePath);
};

const sendEmail = async (email, filePath) => {
  try {
     const transporter = nodemailer.createTransport({
       host: process.env.SMTP_HOST,
       port: process.env.SMTP_PORT,
       auth: {
         user: process.env.SMTP_USER,
         pass: process.env.SMTP_PASS
       }
     });
     const mailOptions = {
       from: process.env.SMTP_USER,
       to: email,
       subject: 'Stock Data',
       attachments: [
         {
           filename: 'stock-data.csv',
           path: filePath
         }
       ]
     };
     await transporter.sendMail(mailOptions, (error, info) => {
       if (error) {
         console.error('Error sending email:', error);
       } else {
         console.log('Email sent:', info.response);
       }
     })
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

const sendStockDataAsCsv = async (req, res) => {
  const { category, email } = req.params;
  const tempFilePath = path.join(__dirname, 'stock-data.csv');

  try {
    console.log('Temporary CSV file path:', tempFilePath);

    // Find stocks
    const stocks = await Stock.find({ category });
    if (!stocks.length) {
      res.status(404).json({ message: 'No stocks found for the given category' });
      return;
    }

    const stockData = stocks.map(stock => ({
      symbol: stock.symbol,
      currentPrice: stock.currentPrice,
      allTimeHigh: stock.allTimeHigh
    }));

    // Convert data to CSV
    await convertDataToCsv(stockData, tempFilePath);

    // Send email with CSV attachment using Brevo
    await sendEmail(email, tempFilePath);

    res.status(200).json({ message: 'CSV file sent via email successfully' });
  } catch (err) {
    console.error('Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message });
    }
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log('Temporary CSV file deleted:', tempFilePath);
    }
  }
};

module.exports = {
  sendStockDataAsCsv
};
