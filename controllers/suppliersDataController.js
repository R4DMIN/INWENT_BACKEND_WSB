const suppliersDataRouter = require('express').Router()
const SUPPLIERS = require('../config/suppliersConfig')
const logger = require('../utils/logger')
const { userAuthentication, roleAuthentication } = require('../utils/authMiddleware')
const { supplierAssetModelDBModel } = require('../models/supplierAssetModelSchema')
const { isValidObjectId } = require('mongoose')
const { getQueryFromColumnsList, makeObjectFlat, makeObjectListFlat } = require(`../utils/queryParser`)

/** schemat do populacji z modelu assetModelDBModel */
const assetModelPopulateSchema = {
    path: 'model_ID',
    keys: ['manufacturer', 'model', 'device_type', 'model_description', 'photo']
}

/** lista dostępnych populacji */
const populateSchemaList = [assetModelPopulateSchema]

/** pobiera dane assetu z bazy danych dostawców w zależnośći od przekazanej nazwy dostawcy i ID  */
suppliersDataRouter.get('/assetdata', userAuthentication, (request, response, next) => {
    if (!request.query.supplier || !request.query.id)
        return response.json({
            message: { type: 'Error', text: `Błędne zapytanie, skontatuj się z pomocą techniczną.` },
        })
    const supplier = request.query.supplier
    const id = request.query.id

    const supplierModel = SUPPLIERS[supplier].model
    supplierModel
        .findById(id, {})
        .then(result => {
            return response.json(result)
        })
        .catch(err => next(err))
})

suppliersDataRouter.patch('/processmodels', userAuthentication, roleAuthentication(['admin']), async (request, response, next) => {
    const supplierKey = 'supplierDemo'


    const modelKey1 = SUPPLIERS[supplierKey].assetModelFirst
    const modelKey2 = SUPPLIERS[supplierKey].assetModelSecond
    const supplierDBModel = SUPPLIERS[supplierKey].model

    try {

        const aggregateSupplierModels = await supplierDBModel
            .aggregate([
                {
                    $group: {
                        _id: {
                            [modelKey1]: `$${modelKey1}`, // Dynamiczne ustawienie pola
                            [modelKey2]: `$${modelKey2}`  // Dynamiczne ustawienie pola
                        }
                    }
                },
                {
                    $project: {
                        _id: 0, // Ukrycie pola `_id`
                        [modelKey1]: `$_id.${modelKey1}`, // Dynamiczne przypisanie klucza
                        [modelKey2]: `$_id.${modelKey2}`  // Dynamiczne przypisanie klucza
                    }
                }
            ])

        let counter = 0
        aggregateSupplierModels.forEach(async (supplierModel) => {
            const supplierModelString = `${supplierModel[modelKey1]} ${supplierModel[modelKey2]}`
            const supplierAssetModel = await supplierAssetModelDBModel.findOne({ supplier_key: supplierKey, supplier_model: supplierModelString })
            if (!supplierAssetModel) {
                const newSupplierAssetModel = new supplierAssetModelDBModel({
                    supplier_key: supplierKey,
                    supplier_model: supplierModelString
                })
                const saved = await newSupplierAssetModel.save()
                counter = counter++
            }
        })
        return response.status(200).json({
            message: {
                type: 'ok',
                text: `ładowanie modeli`
            }
        })
    }
    catch (error) { next(error) }

})

suppliersDataRouter.get('/model', userAuthentication, roleAuthentication(['admin', 'powerUser']), async (request, response, next) => {
    const filter = request.query.filterBounded === 'true'
        ? {
            $or: [
                { model_ID: { $exists: false } },
                { model_ID: { $eq: null } }
            ]
        }
        : {}

    const coumnsQueryArray = 'model_ID,supplier_key,supplier_model,device_type,manufacturer,model'.split(',')
    const [findQuery, populateQuery] = getQueryFromColumnsList(coumnsQueryArray, populateSchemaList)

    try {
        const suppliersModelsList = await supplierAssetModelDBModel
            .find(filter)
            .populate(populateQuery)
        return response.status(200).json(makeObjectListFlat(suppliersModelsList, coumnsQueryArray, populateSchemaList))
    }
    catch (error) { next(error) }
})

suppliersDataRouter.get('/boundedmodel/:modelID', userAuthentication, async (request, response, next) => {
    const modelID = request.params.modelID

    try {
        const boundedToModel = await supplierAssetModelDBModel.find({ model_ID: modelID })
        return response.status(200).json(boundedToModel)
    }
    catch (error) { next(error) }
})

suppliersDataRouter.put('/model/:id', userAuthentication, roleAuthentication(['admin', 'powerUser']), async (request, response, next) => {
    const id = request.params.id
    const model_ID = request.body.model_ID

    try {
        if (!isValidObjectId(model_ID) && model_ID !== null)
            return response.status(200).json({
                message: {
                    type: 'error',
                    text: 'Nie zapisano, błędne dane.'
                }
            })

        await supplierAssetModelDBModel.findByIdAndUpdate(id, { model_ID })

        return response.status(200).json({
            message: {
                type: 'info',
                text: 'Zapisano !'
            }
        })
    }
    catch (error) { next(error) }
})

module.exports = suppliersDataRouter