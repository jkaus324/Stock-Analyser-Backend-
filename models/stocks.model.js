const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true
    },
    stock: {
        symbol: {
            type: String,
            required: true
        },
        allTimeHigh: {
            type: Number,
            required: true
        },
        currentPrice: {
            type: Number,
            required: true
        },
        dateUpdated: {
            type: Date,
            required: true,
            default: Date.now
        }
    }
});

module.exports = mongoose.model('Stock', stockSchema);
