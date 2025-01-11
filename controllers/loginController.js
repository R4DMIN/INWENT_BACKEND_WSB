require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || './.env' })

const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter = require('express').Router()
const { userDBModel } = require('../models/userSchema')
const { tokenDBModel } = require('../models/authTokenShema')
const { userAuthentication } = require('./../utils/authMiddleware')
const logger = require('./../utils/logger')
const { email } = require('../utils/validator')

loginRouter.post('/', async (request, response, next) => {
    const { email, password } = request.body
    const userIp = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
    try {
        const user = await userDBModel.findOne({ email })

        const passwordCorrect = user === null
            ? false
            : await bcrypt.compare(password, user.password_hash)

        if (!(user && passwordCorrect)) {
            return response.status(401).json({
                message: { type: 'warning', text: 'Dane logowania niepoprawne' }
            })
        }

        // objekt do tokenu 
        const userForToken = {
            email: user.email,
            id: user.id,
            ip: userIp
        }

        //wygenerowanie tokenu
        const userAuthToken = jwt.sign(
            userForToken,
            process.env.TOKEN_SECRET,
            { expiresIn: '30m' }
        )

        //zapisanie tokenu w bazie danych
        const newToken = new tokenDBModel({
            token: userAuthToken,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            userId: user.id,
            userIp: userIp
        })

        //zapisanie tokenu w bazie danych
        await newToken.save()

        //wysłanie tokenu do użytkownika 
        response
            .status(200)
            .send({ token: userAuthToken })
    }
    catch (error) { next(error) }
})

loginRouter.get('/user', userAuthentication, async (request, response, next) => {
    const userId = request.userAuth.id
    try {
        const loggedUser = await userDBModel
            .findById(userId, { first_name: 1, last_name: 1, email: 1, selected_business_unit: 1, role: 1 })
            .populate('selected_business_unit')
        response.status(200).json(loggedUser)
    }
    catch (error) {
        response.status(400).json({
            message: { type: 'error', text: 'Nie udało się załadować danych użytkownika' }
        })
        logger.error('User info error - ', error)
    }
})

loginRouter.delete('/', userAuthentication, async (request, response, next) => {
    const token = request.userAuth.token
    try {
        await tokenDBModel.deleteOne({ token: token })
        response.status(200).json({
            message: { type: 'ok', text: 'Użytkownik wylogowany.' }
        })
    }
    catch (error) {
        response.status(400).json({
            message: { type: 'error', text: 'Wystąpił nieoczkiwany bład.' }
        })
        logger.error('Logout error - ', error)
    }

})

module.exports = loginRouter