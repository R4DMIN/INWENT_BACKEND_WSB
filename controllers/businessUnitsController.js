const businessUnitsRouter = require('express').Router()
const logger = require('../utils/logger')
const { businessUnitDBModel } = require('./../models/businessUnitSchema')
const { assetLocationDBModel } = require('./../models/assetLocationSchema')
const { userAuthentication } = require('../utils/authMiddleware')
const { userBusinessUnitDBModel } = require('../models/userBusinessUnitSchema')
const { assetDataDBModel } = require('../models/assetDataSchema')

/** dodaje nowe BU do bazy danych */
businessUnitsRouter.post('/', userAuthentication, (request, response, next) => {
    new businessUnitDBModel(request.body)
        .save()
        .then(() => {
            return response.status(200).json({
                message: { type: 'Ok', text: `został zapisany w bazie danych.` }
            })
        })
        .catch((err) => next(err))
})

businessUnitsRouter.put('/:id', userAuthentication, (request, response, next) => {
    const { short_name, full_name, city, street, zip_code } = request.body
    const id = request.params.id

    businessUnitDBModel
        .findByIdAndUpdate(id, { short_name, full_name, city, street, zip_code }, { new: true, runValidators: true })
        .then((result) => {
            return response.status(200).json({
                message: {
                    type: 'ok', text: `Zapisano jednostkę organizacyjną "${result.short_name}"`
                }
            })
        })
        .catch(error => next(error))
})

/** pobiera listę BU z podstawowymi danymi */
businessUnitsRouter.get('/', userAuthentication, (request, response, next) => {
    businessUnitDBModel
        .find({}, { short_name: 1, full_name: 1, city: 1, street: 1, zip_code: 1 })
        .then(result => {
            return response.json(result)
        })
        .catch(error => next(error))
})

/** pobiera listę BU zalogowanego użytkownika TODO*/
businessUnitsRouter.get('/user', userAuthentication, (request, response, next) => {
    businessUnitDBModel
        .find({}, { short_name: 1 })
        .then(result => {
            return response.json(result)
        })
        .catch(error => next(error))
})

/** usuwa wskazane BU jeżeli nie ma do niego przypisanych żadnych lokalizacji */
businessUnitsRouter.delete('/:id', userAuthentication, async (request, response, next) => {
    const id = request.params.id

    try {
        const assetLocation = await assetLocationDBModel.findOne({ business_unit_ID: id }, { id: 1 })
        if (assetLocation) return response.status(405).json({
            message: { type: 'Warning', text: `Nie można usunąć jednostki organizacyjnej z przypisanymi lokalizacjami.` }
        })

        const asset = await assetDataDBModel.findOne({ business_unit_ID: id }, { id: 1 })
        if (asset) return response.status(405).json({
            message: { type: 'Warning', text: `Nie można usunąć jednostki organizacyjnej z przypisanymi assetami.` }
        })

        const user = await userBusinessUnitDBModel.findOne({ business_unit_ID: id }, { id: 1 })
        if (user) return response.status(405).json({
            message: { type: 'Warning', text: `Nie można usunąć jednostki organizacyjnej przypisanej do użytkownika.` }
        })

        const deleteBusinessUnit = await businessUnitDBModel.findByIdAndDelete(id)

        return response.status(200).json({ message: { type: 'ok', text: `Jednostke organizacyjną'${deleteBusinessUnit.short_name}'` } })
    }
    catch (error) { next(error) }
})

module.exports = businessUnitsRouter