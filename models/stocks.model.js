const mongoose = require('mongoose');

const indexSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        index: true // Add an index for category
    },
    symbol: {
        type: String,
        required: true,
        index: true // Add an index for symbol
    },
    allTimeHigh: {
        type: Number,
        required: true
    },
    currentPrice: {
        type: Number,
        required: true
    }
});

// Create a compound index on category and symbol
indexSchema.index({ category: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model('Stock', indexSchema);
