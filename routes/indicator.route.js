// Function to calculate Exponential Moving Average (EMA)
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

// Main function to process multiple stocks
const processStocks = async (stockList, period) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    for (const company of stockList) {
        const stockData = await scrapeStockData(page, company);
        if (stockData.currentPrice !== null) {
            const prices = [stockData.currentPrice]; // Assuming this is just a single price for now

            // Calculate EMA and MMA
            const ema = calculateEMA(prices, period);
            const mma = calculateMMA(prices, period);

            console.log(`Stock: ${company}`);
            console.log(`Current Price: ${stockData.currentPrice}`);
            console.log(`52-Week High: ${stockData.fiftyTwoWeekHigh}`);
            console.log(`EMA: ${ema}`);
            console.log(`MMA: ${mma}`);
        }
    }

    await browser.close();
};

// Example usage
const stockList = ['RELIANCE', 'TCS', 'INFY']; // Replace with your list of stocks
const period = 10; // Replace with your desired period for EMA and MMA
processStocks(stockList, period);
