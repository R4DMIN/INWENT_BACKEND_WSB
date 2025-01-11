const modelDataRouter = require('express').Router()
const { assetDataDBModel } = require('./../models/assetDataSchema')
const { assetModelsDBModel } = require('./../models/assetModelSchema')
const logger = require('../utils/logger')
const { convertObjectValuesToNumber, idToObjectId } = require('../utils/dataParser')
const { userAuthentication } = require('../utils/authMiddleware')

/** pobiera listę modeli z podstawowymi danymi */
modelDataRouter.get('/', userAuthentication, (request, response, next) => {
    assetModelsDBModel
        .find({}, { manufacturer: 1, model: 1, device_type: 1 })
        .then(result => {
            return response.json(result)
        })
        .catch(error => next(error))
})

/** pobiera szczegółowe dane dla wskazanego ID z bazy danych*/
modelDataRouter.get('/:id', userAuthentication, (request, response, next) => {
    const id = idToObjectId(request.params.id)

    assetModelsDBModel
        .findById(id, { manufacturer: 1, model: 1, device_type: 1, model_description: 1, photo: 1 })
        .then(result => {
            assetDataDBModel.countDocuments({ model_ID: id })
                .then(countResult => {
                    return response.json({ ...result.toJSON(), asset_count: countResult })
                })
                .catch(err => {
                    logger.error(err)
                    return response.json({ ...result.toJSON, asset_count: '?' })
                })

        })
        .catch(error => next(error))
})

/** pobiera szczegółowe dane dla wskazanego ID z bazy danych*/
modelDataRouter.get('/box/:id', userAuthentication, (request, response, next) => {
    const id = idToObjectId(request.params.id)
    const getPhoto = Number(request.query.photo)

    assetModelsDBModel
        .findById(id, { manufacturer: 1, model: 1, device_type: 1, photo: getPhoto })
        .then(result => {
            return response.json(result)
        })
        .catch(error => next(error))
})

/** pobiera dane wskazane kolumny przekazane w zapytaniu */
modelDataRouter.get('/columns/:id', userAuthentication, (request, response, next) => {
    const id = idToObjectId(request.params.id)
    const columnToResponse = convertObjectValuesToNumber(request.query)

    assetModelsDBModel
        .findById(id, columnToResponse)
        .then(result => {
            return response.json(result)
        })
        .catch(error => next(error))
})

/** dodaje nowy model do bazy danych */
modelDataRouter.post('/', userAuthentication, (request, response, next) => {
    new assetModelsDBModel({
        manufacturer: request.body.manufacturer,
        model: request.body.model,
        device_type: request.body.device_type,
        model_description: request.body.model_description,
        photo: request.body.photo
    })
        .save()
        .then((result) => {
            return response.status(200).json({
                message: { type: 'Ok', text: `Model "${result.manufacturer} ${result.model}" został zapisany w bazie danych.` },
                data: result.id
            })
        })
        .catch((err) => next(err))
})

/** sprawdza czy jakieś assety nie maja przypisanego tego modelu jeżeli nie to go usuwa */
modelDataRouter.delete('/:id', userAuthentication, (request, response, next) => {
    const id = request.params.id
    assetDataDBModel
        .findOne({ model_ID: id }, { id: 1 })
        .then((result) => {
            if (!result) {
                assetModelsDBModel
                    .findByIdAndDelete(id)
                    .then(result => {
                        if (!result)
                            return response.status(200).json({
                                message: { type: 'Error', text: `Nie ma użądzenia ID:${id}` },
                                status: 'fail'
                            })
                        else
                            return response.status(200).json({
                                message: { type: 'Ok', text: `Model "${result.manufacturer} ${result.model}" został usunięty.` },
                                data: result
                            })
                    })
                    .catch(error => next(error))
            } else {
                return response.status(200).json({
                    message: { type: 'Warning', text: `Wybrany model ma przypisane urządzenia, nie można go usnąć.` },
                    status: 'fail',
                })
            }
        })
        .catch((error) => next(error))
})

/** aktualizuje pola photo i model_desciption jeżeli nie są false*/
modelDataRouter.put('/:id', userAuthentication, (request, response, next) => {
    const id = request.params.id
    let body = {}

    if (request.body.model_description !== false) body.model_description = request.body.model_description
    if (request.body.photo !== false) body.photo = request.body.photo

    assetModelsDBModel
        .findByIdAndUpdate(id, body, { new: true })
        .then(result => {
            console.log(result);

            return response.json({
                message: { type: 'Ok', text: `Zapisano zmiany w modelu "${result.manufacturer} ${result.model}".` }
            })
        })
        .catch(error => next(error))
})

/** pobierz listę producentów  */
modelDataRouter.get('/manufacturer/list', userAuthentication, (request, response, next) => {
    assetModelsDBModel
        .distinct('manufacturer')
        .then(result => response.json(result))
        .catch(err => logger.error(err))

})

module.exports = modelDataRouter