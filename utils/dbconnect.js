require('dotenv').config()
const logger = require('../utils/logger')
const mongoose = require('mongoose')
mongoose.set('strictQuery', false)

const mongoUrl = process.env.ASSET_DATA_MONGODB_URL

// POŁĄCZENIE Z BAZĄ DANYCH

mongoose
    .connect(mongoUrl, { autoIndex: true })
    .then(result => {
        logger.info('Connected to MongoDB');
    })
    .catch(error => {
        logger.error('Can\'t connect to MongoDB', error.message);
    })

module.exports = mongoose