const logger = require('../../utils/logger')
const mongoose = require('../../utils/dbconnect')

/** Deklaracja schematu modelu mongose dla danych dostawcy TESMA */
const supplierDemoDataSchema = new mongoose.Schema({
    id_asset: {
        type: Number,
        unique: true,
        dropDups: true,
        required: true
    },
    manufacturer: {
        type: String
    },
    model: {
        type: String
    },
    serial: {
        type: String
    },
    descryption_1: {
        type: String
    },
    descryption_2: {
        type: String
    },
    shop_no: {
        type: String
    },
    leasing_end: {
        type: Date
    },
    INW_last_update: {
        type: Date
    },
    INW_processed: {
        type: Boolean,
        default: true
    },
    INW_outdated: {
        type: Boolean,
        default: false
    },
    INW_asset_ID: {
        type: String
    }

})

/** Konfiguracja  */
supplierDemoDataSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

exports.supplierDemoDataDBModel = mongoose.model('supplierDemoData', supplierDemoDataSchema)