const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const stockRoutes = require('./routes/stocks.route');
const uploadRoutes = require('./routes/upload.route');

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.log(err));

// Use stock routes
app.use('/api/stocks', stockRoutes);
app.use('/api/upload', uploadRoutes);

// Define the port to listen on
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
