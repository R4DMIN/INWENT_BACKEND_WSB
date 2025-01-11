const mongoose = require('../utils/dbconnect')


const supplierAssetModelSchema = new mongoose.Schema({
    model_ID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'assetModel',
    },
    supplier_key: {
        type: String,
        required: true
    },
    supplier_model: {
        type: String,
        required: true
    }
})

supplierAssetModelSchema.index({ supplier_key: 1, supplier_model: 1 }, { unique: true })

supplierAssetModelSchema.set('toObject', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

supplierAssetModelSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

exports.supplierAssetModelDBModel = mongoose.model('supplierAssetModel', supplierAssetModelSchema)