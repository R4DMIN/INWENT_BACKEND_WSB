const logger = require('../utils/logger')
const mongoose = require('../utils/dbconnect')

/** Deklaracja modelu mongose dla danych assetu */
const assetDataShema = new mongoose.Schema({
    sn: {
        type: String,
        unique: true,
        dropDups: true,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'NEW'
    },
    description: { type: String },
    description_extra: { type: String },
    last_invent: { type: Date },
    leasing_end: { type: Date },
    business_unit_ID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'businessUnitData'
    },
    model_ID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'assetModel'
    },
    assignment_location_ID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'assetLocation'
    },
    assignment_employee_ID: {

    },
    assignment_shipment_ID: {

    },
    supplier_ID: {
        type: mongoose.Schema.Types.ObjectId, // Typ Mixed pozwoli na przechowywanie różnych typów danych
    },
    supplier_key: {
        type: String
    },
    create_date: {
        type: Date,
        required: true,
        default: new Date(Date.now())
    }
})

/** Konfiguracja  */
assetDataShema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        returnedObject.last_invent = returnedObject.last_invent ? new Date(returnedObject.last_invent).toLocaleString() : ''
        returnedObject.leasing_end = returnedObject.leasing_end ? new Date(returnedObject.leasing_end).toLocaleString() : ''
        delete returnedObject._id
        delete returnedObject.__v
    }
})

assetDataShema.set('toObject', {
    transform: (document, returnedObject, options) => {
        returnedObject.id = returnedObject._id.toString()
        if (returnedObject.last_invent) returnedObject.last_invent = returnedObject.last_invent ? new Date(returnedObject.last_invent).toLocaleString() : ''
        if (returnedObject.leasing_end) returnedObject.leasing_end = returnedObject.leasing_end ? new Date(returnedObject.leasing_end).toLocaleString() : ''
        delete returnedObject._id
        delete returnedObject.__v
    }
})

exports.assetDataDBModel = mongoose.model('assetData', assetDataShema)