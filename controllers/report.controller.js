const nodemailer = require('nodemailer');
const { stringify } = require('fast-csv');
const fs = require('fs');

async function sendStockReportViaEmail(stockData, recipientEmail) {
    // Convert stock data to CSV
    const csvData = [];
    stockData.forEach(row => csvData.push(row));

    const csvStream = stringify({ headers: true });
    const writableStream = fs.createWriteStream('stock_report.csv');

    csvStream.pipe(writableStream);
    csvData.forEach(row => csvStream.write(row));
    csvStream.end();

    writableStream.on('finish', async () => {
        // Email details
        const senderEmail = "your_email@example.com";
        const senderPassword = "your_password";

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: senderEmail,
                pass: senderPassword
            }
        });

        let mailOptions = {
            from: senderEmail,
            to: recipientEmail,
            subject: 'Stock Data Report',
            text: 'Please find the attached stock data report.',
            attachments: [
                {
                    filename: 'stock_report.csv',
                    path: './stock_report.csv'
                }
            ]
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Email sent successfully');
        } catch (error) {
            console.error('Error sending email:', error);
        }
    });
}

module.exports = {
    sendStockReportViaEmail
};

// // Example usage:
// const stockData = [
//     { Symbol: 'AAPL', Price: 150, Change: 2 },
//     { Symbol: 'GOOGL', Price: 2800, Change: -10 },
//     { Symbol: 'MSFT', Price: 300, Change: 5 }
// ];

// sendStockReportViaEmail(stockData, 'recipient_email@example.com');
