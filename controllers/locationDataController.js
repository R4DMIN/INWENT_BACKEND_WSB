const locationDataRouter = require('express').Router()
const { isValidObjectId } = require('mongoose');
const { assetLocationDBModel } = require('../models/assetLocationSchema')
const { assetDataDBModel } = require('../models/assetDataSchema')
const logger = require('../utils/logger')
const { idToObjectId } = require('../utils/dataParser')
const { getQueryFromColumnsList, makeObjectFlat, makeObjectListFlat } = require(`../utils/queryParser`)
const { userAuthentication } = require('../utils/authMiddleware')

/** schemat do populacji z modelu businessUnitDBModel */
const businessUnitPopulateSchema = {
    path: 'business_unit_ID',
    keys: ['business_unit', 'full_name', 'address'],
    as: {
        business_unit: 'short_name'
    }
}

/** lista dostępnych populacji */
const populateSchemaList = [businessUnitPopulateSchema]


/** Zwraca ilość urządzeń przypisanych do lokalizacji */
const getDeviceInLocationCount = async (locationId) => {
    if (!isValidObjectId(locationId)) {
        logger.error(`getDeviceInLocationCount() - przekazano błędne ID`)
        return '?'
    }
    try {
        const result = await assetDataDBModel.countDocuments({ assignment_location_ID: locationId })
        return result
    }
    catch (error) {
        logger.error(`getDeviceInLocationCount() | ` + error)
        return '?'
    }
}

/** Dodaj nową lokalizację */
locationDataRouter.post('/', userAuthentication, (request, response, next) => {

    if (!request.body || !request.body.business_unit_ID || !request.body.location || request.body.stock === undefined)
        return response.status(200).json({
            message: { type: 'Warning', text: 'Brak wymaganych danych.' }
        })

    new assetLocationDBModel({
        business_unit_ID: request.body.business_unit_ID,
        location: request.body.location,
        location_description: request.body.location_description,
        stock: request.body.stock
    })
        .save()
        .then((result => {
            return response.status(200).json({
                data: result.id,
                message: { type: 'Ok', text: `Lokalizacja "${result.location}" została zapisana poprawnie.` },
            })
        }))
        .catch((err) => next(err))
})

/** Pobierz wszystkie dla wskazanej jednostki organizacyjnej */
locationDataRouter.get('/', userAuthentication, (request, response, next) => {

    if (!isValidObjectId(request.query.business_unit_ID)) {
        logger.error('brak bussines_unit w "locationDataRouter.get(/)"')
        return response.status(400).json({
            message: { type: 'Error', text: `Nie podano jednosti organizacyjnej.` }
        })
    }
    const columnsQueryArray = request.query.columns
        ? request.query.columns.split(',')
        : ['location', 'location_description', 'business_unit', 'stock']

    let [findQuery, populateQuery] = getQueryFromColumnsList(columnsQueryArray, populateSchemaList)

    // zapytanie do bazy danych
    assetLocationDBModel
        .find({ business_unit_ID: request.query.business_unit_ID }, findQuery)
        .populate(populateQuery)
        .then(result => {
            return response.json(
                makeObjectListFlat(result, columnsQueryArray, populateSchemaList)
            )
        })
        .catch(error => next(error))
})

/** pobierz wszystkie dane o lokalizacji oraz ilośc przypisanych asetów */
locationDataRouter.get('/:id', userAuthentication, async (request, response, next) => {
    const locationId = idToObjectId(request.params.id)

    const columnsQueryArray = request.query.columns
        ? request.query.columns.split(',')
        : ['location', 'location_description', 'business_unit', 'assetCount', 'stock']

    const [findQuery, populateQuery] = getQueryFromColumnsList(columnsQueryArray, populateSchemaList)

    if (findQuery.assetCount) findQuery.assetCount = (await getDeviceInLocationCount(locationId)).toString()

    //pobieranie ilości urządzeń w lokalizacji
    assetLocationDBModel
        //find{co szukać(wartośc)}, {jakie pola zwracać np sn : 1 zwróci id i SN }
        .findById(locationId, findQuery)
        .populate(populateQuery)
        .then(result => {
            return response.json(makeObjectFlat(result.toObject(), columnsQueryArray, populateSchemaList))
        })
        .catch(error => next(error))
})

/** pobiera dane wskazanych kolumny przekazanych w zapytaniu */
locationDataRouter.get('/columns/:id', userAuthentication, async (request, response, next) => {
    const id = idToObjectId(request.params.id)

    let [findQuery, populateQuery] = getQueryFromColumnsList(columnsQueryArray, populateSchemaList)

    //jeżeli potrzeba to pobierz ilość przypisanych danych
    if (findQuery.assetCount) {
        const assetCount = await getDeviceInLocationCount(locationId)
        findQuery.assetCount = assetCount.toString()
    }

    assetLocationDBModel
        .findById(id, findQuery)
        .then(result => {
            return response.json(result)
        })
        .populate(populateQuery)
        .catch(error => next(error))
})

//** usuwanie lokalizacji przez ID */
locationDataRouter.delete('/:id', userAuthentication, (request, response, next) => {
    const id = idToObjectId(request.params.id)

    assetDataDBModel
        .findOne({ assignment_location_ID: id }, { id: 1 })
        .then((assetResult) => {
            if (!assetResult) {
                assetLocationDBModel
                    .findByIdAndDelete(id)
                    .then(locationResult => {
                        response.status(200).json({
                            message: { type: 'Ok', text: `Lokalizacja "${locationResult.location}" z jednostki organizacyjnej "${locationResult.business_unit}" została usunięta.` }
                        })
                    })
                    .catch(error => next(error))
            } else {
                response.json({
                    message: { type: 'Warning', text: `Wybrana lokalizacja ma przypisane urządzenia, nie można usnąć.` },
                    status: 'fail'
                })
            }
        })
        .catch((error) => next(error))
})

/** aktualizacja danych (nie zmieni przypisania bussines_unit) */
locationDataRouter.put('/:id', userAuthentication, (request, response, next) => {
    let body = {
        location: request.body.location && request.body.location,
        location_description: request.body.location_description && request.body.location_description
    }

    assetLocationDBModel
        .findByIdAndUpdate(request.params.id, body, { runValidators: true, new: true })
        .then(result => {
            //console.log(result);
            return response.json({
                data: result.id,
                message: { type: 'Ok', text: `Zaktualizowana lokalizację '${result.location}'.` }
            })
        })
        .catch(error => next(error))
})

module.exports = locationDataRouter