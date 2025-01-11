const logger = require('../utils/logger')
const mongoose = require('../utils/dbconnect')
const { Schema } = mongoose;

/** Deklaracja modelu mongose dla danych lokalizacji */
const assetLocationDataShema = new mongoose.Schema({
    business_unit_ID: {
        type: Schema.Types.ObjectId,
        ref: 'businessUnitData',
        required: true
    },
    location: {
        type: String,
        required: true,
        minLength: [3, 'Nazwa wymaga minimum 3 znaków']
    },
    location_description: {
        type: String,
        //minLength: [3, 'Opis wymaga minimum 3 znaków']
    },
    stock: {
        type: Boolean,
        required: true
    }
})

/** Konfiguracja */

assetLocationDataShema.index({ business_unit_ID: 1, location: 1 }, { unique: true })

assetLocationDataShema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

assetLocationDataShema.set('toObject', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

exports.assetLocationDBModel = mongoose.model('assetLocation', assetLocationDataShema)