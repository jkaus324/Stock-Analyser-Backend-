const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const nodemailer = require('nodemailer');
const Stock = require('../models/stocks.model'); // Assuming you have a Stock model

// Function to convert data to CSV
const convertDataToCsv = async (data, filePath) => {
    const csvWriter = createCsvWriter({
        path: filePath,
        header: [
            {id: 'symbol', title: 'Symbol'},
            {id: 'currentPrice', title: 'Current Price'},
            {id: 'allTimeHigh', title: 'All Time High'},
        ]
    });

    await csvWriter.writeRecords(data);
    console.log('CSV file was written successfully');
};

// Function to send email with CSV attachment
const sendEmailWithCsv = async (email, filePath) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Use your email service provider
        auth: {
            user: 'your-email@gmail.com', // Your email
            pass: 'your-email-password' // Your email password
        }
    });

    const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Stock Data',
        text: 'Please find the attached CSV file with the stock data.',
        attachments: [
            {
                filename: path.basename(filePath),
                path: filePath
            }
        ]
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
};

// Controller function
const sendStockDataAsCsv = async (req, res) => {
    const { category, email } = req.params;
    const tempFilePath = path.join(__dirname, 'stock-data.csv');

    try {
        // Update stock data
        await updateStockData(category);

        // Find stocks
        const stocks = await Stock.find({ category });
        const stockData = stocks.map(stock => ({
            symbol: stock.symbol,
            currentPrice: stock.currentPrice,
            allTimeHigh: stock.allTimeHigh
        }));

        // Convert data to CSV
        await convertDataToCsv(stockData, tempFilePath);

        // Send email with CSV attachment
        await sendEmailWithCsv(email, tempFilePath);

        // Clean up temporary file
        fs.unlinkSync(tempFilePath);

        res.status(200).json({ message: 'CSV file sent via email successfully' });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    sendStockDataAsCsv
};
