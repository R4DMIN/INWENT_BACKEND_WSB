const logger = require('../utils/logger')
const mongoose = require('../utils/dbconnect')

/** Deklaracja modelu moongose dla modeli urządzeń */
const assetModelsDataSchema = new mongoose.Schema({
    manufacturer: {
        type: String,
        required: [true, `Proszę uzupełnić pole "Producent"`],
        minLength: [2, 'Nazwa producenta wymaga minimum 2 znaków']
    },
    model: {
        type: String,
        required: [true, `Proszę uzupełnić pole "Model"`],
        minLength: [3, 'Nazwa modelu wymaga minimum 3 znaków']
    },
    device_type: {
        type: String,
        required: [true, `Proszę uzupełnić pole "Typ Urządzenia"`],
        minLength: [3, 'Typ urządzenia wymaga minimum 3 znaków']
    },
    model_description: {
        type: String,
    },
    photo: {
        type: String
    }
})


/** Konfiguracja */
assetModelsDataSchema.index({ manufacturer: 1, model: 1 }, { unique: true })

assetModelsDataSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

exports.assetModelsDBModel = mongoose.model('assetModel', assetModelsDataSchema)