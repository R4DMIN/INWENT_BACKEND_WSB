const { isValidObjectId } = require('mongoose');
const assetDataRouter = require('express').Router()
const { assetDataDBModel } = require('../models/assetDataSchema')
const logger = require('../utils/logger')
const { findSnInSupplierData } = require('../utils/supplierDataUtils')
const { inwentAsset, assigmentDataFromLocationID } = require('../utils/assetDataUtils')
const { getQueryFromColumnsList, makeObjectListFlat } = require(`../utils/queryParser`)
const { userAuthentication } = require('../utils/authMiddleware')

/** schemat do populacji z modelu assetLocationDBModel */
const assetLocationPopulateSchema = {
    path: 'assignment_location_ID',
    keys: ['business_unit', 'location', 'location_description']
}

/** schemat do populacji z modelu assetModelDBModel */
const assetModelPopulateSchema = {
    path: 'model_ID',
    keys: ['manufacturer', 'model', 'device_type', 'model_description', 'photo']
}

/** schemat do populacji z modelu businessUnitDBModel */
const businessUnitPopulateSchema = {
    path: 'business_unit_ID',
    keys: ['business_unit', 'full_name', 'address'],
    as: {
        business_unit: 'short_name'
    },
    virtual: {
        address: 'street city zip_code'
    }
}

/** lista dostępnych populacji */
const populateSchemaList = [assetLocationPopulateSchema, assetModelPopulateSchema, businessUnitPopulateSchema]

/** zwraca listę assetów, możliwość wybrania column poprzez quert.columns oraz filtrów poprzez query.filter */
assetDataRouter.get('/', userAuthentication, (request, response, next) => {
    /** zawiera filtry w postaci klucz:string  */
    const filter = request.query.filter
    /** tablica zaweirająca liste kolumn */
    const coumnsQueryArray = request.query.columns ? request.query.columns.split(',') : []
    const [findQuery, populateQuery] = getQueryFromColumnsList(coumnsQueryArray, populateSchemaList)
    // zapytanie do bazy danych
    assetDataDBModel
        .find(filter, findQuery)
        .populate(populateQuery)
        .then(result => response.json(
            makeObjectListFlat(result, coumnsQueryArray, populateSchemaList)
        ))
        .catch(error => next(error))
})

/** zwraca wszystkie lub wybrane klucze z danych urządzenia z podanym ID */
assetDataRouter.get('/:id', userAuthentication, (request, response, next) => {
    /** id assetu */
    const id = request.params.id
    /** tablica zaweirająca liste kolumn */
    const coumnsQueryArray = request.query.columns ? request.query.columns.split(',') : []
    const [findQuery, populateQuery] = getQueryFromColumnsList(coumnsQueryArray, populateSchemaList)

    //zapytanie do bazy danych
    assetDataDBModel
        .findById(id, findQuery)
        .populate(populateQuery)
        .then(result => response.json(result))
        .catch(error => next(error))
})

/** modyfikacja assetu z podanym ID */
assetDataRouter.put('/:id', userAuthentication, async (request, response, next) => {
    let dataToUpdate = {}
    const id = request.params.id
    const body = request.body

    // poniżej sprawdzamy czy klucze dostępne do aedycji zostały przekazane w requestcie
    if (body.model_ID && isValidObjectId(body.model_ID))
        dataToUpdate.model_ID = body.model_ID
    if (body.description)
        dataToUpdate.description = body.description

    try {
        if (body.assignment_location_ID) {
            const verifedLocationData = await assigmentDataFromLocationID(body.assignment_location_ID)
            dataToUpdate = { ...dataToUpdate, ...verifedLocationData }
        }
    }
    catch (error) {
        response.status(400).json({ message: error })
    }

    if (Object.keys(dataToUpdate).length <= 0) {
        logger.error(`ERROR 400 | przy aktualizowaniu danych assetu | data: ${body} url: ${request.url}`)
        return response.status(400).json({
            message: { type: 'Error', text: `Nie przesłano danych do aktualizacji lub są one błęne.` }
        })
    }

    assetDataDBModel
        .findByIdAndUpdate(id, dataToUpdate, { new: true })
        .then(result => response.json({
            message: { type: 'Ok', text: `Zaktualizowano dane assetu z numerem seryjnym: '${result.sn}'` },
            data: result
        }))
        .catch(error => next(error))
})

/** usuwanie assetu po ID */
assetDataRouter.delete('/:id', userAuthentication, (request, response, next) => {
    const id = request.params.id
    assetDataDBModel
        .findByIdAndDelete(id)
        .then(request => {
            response.status(200).json({
                message: { type: 'Ok', text: `Asset usunięty` }
            })
        })
        .catch(error => next(error))
})

/** Wyszukuje asset po ID, jeżeli nie znajdzie w bazie INWENT to sprawdza bazy dostawców */
assetDataRouter.get('/findSn/:sn', userAuthentication, async (request, response, next) => {
    /** numer seryjny */
    const snToFind = request.params.sn
    /** tablica zawierająca liste kolumn */
    const coumnsQueryArray = request.query.columns ? request.query.columns.split(',') : []
    const [findQuery, populateQuery] = getQueryFromColumnsList(coumnsQueryArray, populateSchemaList)

    // sprawdź czy numer seryjny zotał przekazany jeżeli nie to 400 Bad Request
    if (!snToFind || snToFind === 'undefined')
        return response.status(400).json({
            message: { type: 'Warning', text: 'Nie przekazano numeru seryjnego.' }
        })
    try {
        // sprawdź czy podany SN znajduję się w bazie assetów 
        let result = await assetDataDBModel
            .findOne({ sn: { '$regex': `^${snToFind}$`, $options: 'i' } }, findQuery)
            .populate(populateQuery)

        // jeżeli znaleziono to zwróć dane
        if (result)
            return response.status(200).json({
                message: { type: 'Info', text: `Znaleziono urządzenie z SN:${result.sn} w bazie INWENT` },
                find: 'inwent',
                data: result
            })
        //jeżeli nie to przeszukaj bazy dostawców
        else {
            result = await findSnInSupplierData(snToFind)
            // jeżeli znaleziono to zwróć dane
            if (result)
                return response.status(200).json({
                    message: { type: 'Info', text: `Znaleziono urządzenie z SN:${result.sn} w bazie "${result.supplierKey}"` },
                    find: 'supplier',
                    data: result
                })
            // jeżeli nie to zwróc wyszukiwany SN
            else {
                return response.status(200).json({
                    data: { sn: snToFind },
                    find: 'none',
                    message: { type: 'Warning', text: 'Nie znaleziono w bazie INWENT ani u żadnego dostawcy' }
                })
            }
        }
    }
    catch (err) { next(err) }
})

/** inwentaryzacja - aktualizacja assetu o wskazanym ID  */
// TODO - dodać weryfikacje po BU w którym robimy inwentaryzację 
assetDataRouter.patch('/invent', userAuthentication, async (request, response, next) => {
    const asset = request.body
    const result = await inwentAsset(asset)

    return response.status(result.status === 'success' ? 200 : 400).json(result)
})

/** inwentaryzacja - dodanie nowego asetu  */
// TODO - dodać weryfikacje po BU w którym robimy inwentaryzację 
assetDataRouter.patch('/inventlist', userAuthentication, async (request, response, next) => {
    const assetList = request.body

    let count = {
        total: 0,
        success: 0,
        fail: 0
    }

    try {
        const results = await Promise.all(
            assetList.map(async (asset) => {
                count.total++
                return inwentAsset(asset)
                    .then(result => result)
            })
        )

        /** lista assetów których proces inwentaryzajci się nie powiódł  */
        let assetToReturn = []

        // sprawdzanie wyników inwentAsset(asset)
        results.forEach((result) => {
            if (result.status === 'success')
                count.success++

            if (result.status === 'fail') {
                count.fail++
                assetToReturn.push(result.data)
            }

        })

        return response.status(200).json({
            message: count.fail === 0
                ? { type: 'Ok', text: `Zapisano inwentaryzację ${count.success} z ${count.total} urządzeń.` }
                : count.success === 0
                    ? { type: 'Error', text: `Nie udało się zinwentaryzować żadnego urządzenia, sprawdź poprawność danych lub skontatuj się z pomocą techniczną.` }
                    : { type: 'Warning', text: `Zapisano inwentarzyację ${count.success} z ${count.total} urządzeń, niezinwentaryzowane urządzenia pozostały na liśćie.` }
            ,
            data: assetToReturn
        })

    }
    catch (error) {
        logger.error("assetDataRouter.patch('/inventlist') - ", error)
        return response.status(500).json({
            message: { type: 'Error', text: 'Błąd przetwarzania' },
        });
    }
})

module.exports = assetDataRouter