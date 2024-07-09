const fs = require('fs');
const path = require('path'); // Import the path module
const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();
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

const sendEmailWithBrevo = async (email, filePath) => {
  try {
    let defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = "Stock Data";
    sendSmtpEmail.htmlContent = "<html><body><p>Please find the attached CSV file with the stock data.</p></body></html>";
    sendSmtpEmail.sender = { "name": "Your Name", "email": process.env.EMAIL };
    sendSmtpEmail.to = [{ "email": email }];
    sendSmtpEmail.attachment = [{ "url": `file://${filePath}`, "name": "stock-data.csv" }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully');
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
    await sendEmailWithBrevo(email, tempFilePath);

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
