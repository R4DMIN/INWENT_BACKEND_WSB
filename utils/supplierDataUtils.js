const SUPPLIERS = require('../config/suppliersConfig')
const { supplierAssetModelDBModel } = require('../models/supplierAssetModelSchema')
const logger = require('../utils/logger')

const findSnInSupplierData = async (snToFind) => {
    //dla wszystkich dostawców skonfigurowanach w SUPPLIERS 
    try {
        for (const supplierKey of Object.keys(SUPPLIERS)) {
            const { name, model, snKey, leasingEndKey, assetModelFirst, assetModelSecond, leasingEndKey2 } = SUPPLIERS[supplierKey]
            const supplierResult = await model.findOne({ [snKey]: { '$regex': `^${snToFind}$`, $options: 'i' } })

            if (supplierResult) {
                const modelString = `${supplierResult[assetModelFirst]} ${supplierResult[assetModelSecond]}`
                const model_ID = await getModelIDFromSupplierModel(modelString, supplierKey)
                return ({
                    id: '',
                    supplier_ID: supplierResult.id,
                    supplierKey: supplierKey,
                    sn: supplierResult[snKey],
                    leasing_end: supplierResult[leasingEndKey]
                        ? new Date(supplierResult[leasingEndKey]).toLocaleString()
                        : supplierResult[leasingEndKey2]
                            ? new Date(supplierResult[leasingEndKey2]).toLocaleString()
                            : undefined,
                    model_ID: model_ID
                })
            } else {
                return null
            }
        }
    }
    catch (error) {
        throw error
    }
}

const getSupplierAssetData = async (id, supplierKey) => {
    try {
        const { model, leasingEndKey } = SUPPLIERS[supplierKey]
        const supplierData = await model.findById(id)
        const response = {
            supplier_ID: supplierData.id,
            leasing_end: new Date(supplierData[leasingEndKey]),
            supplierKey: supplierKey
        }

        return response
    } catch { throw error }
}

const getModelIDFromSupplierModel = async (modelString, supplierKey) => {
    try {
        const supplierAssetModel = await supplierAssetModelDBModel
            .findOne({ supplier_key: supplierKey, supplier_model: modelString })
        if (!supplierAssetModel || !supplierAssetModel.model_ID) return undefined
        return supplierAssetModel.model_ID
    } catch { throw error }
}

const linkSupplierData = async (assetID, supplierID, supplierKey) => {
    const { model } = SUPPLIERS[supplierKey]
    try {
        const saveData = await model.findByIdAndUpdate(supplierID, { INW_asset_ID: assetID })
        return
    } catch (error) { throw error }
}

module.exports = { findSnInSupplierData, getSupplierAssetData, linkSupplierData }