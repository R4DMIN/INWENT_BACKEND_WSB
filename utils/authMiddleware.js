require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || './.env' })
const { userDBModel } = require('../models/userSchema')
const { tokenDBModel } = require('./../models/authTokenShema')
const logger = require('./logger')

const userAuthentication = async (request, response, next) => {
    const authHeader = request.headers['authorization']
    const reqToken = authHeader && authHeader.split(' ')[1]

    if (!reqToken) {
        return response.status(401).json({ message: { type: 'error', text: 'Błąd autoryzacji, zaloguj się ponownie.' } })
    }

    try {
        const token = await tokenDBModel.findOne({ token: reqToken })
        if (!token) {
            return response.status(401).json({ message: { type: 'error', text: 'Nieautoryzowany dostęp.' } })
        }

        if (new Date(Date.now()) > token.expiresAt) {
            return response.status(403).json({ message: { type: 'error', text: 'Błąd autoryzacji, zaloguj się ponownie.' } })
        }
        await tokenDBModel.findByIdAndUpdate(token._id, { expiresAt: new Date(Date.now() + 30 * 60 * 1000) })
        request.userAuth = { id: token.userId, token: token.token }
        next()
    }
    catch (error) {
        logger.error('Auth Error - ', error)
        response.status(403).json({ message: { type: 'error', text: 'Błąd autoryzacji, zaloguj się ponownie.' } })
    }
}

const getRoleAuthentication = async (request, response, next) => {
    const userID = request.userAuth.id
    try {
        const user = await userDBModel.findById(userID, { role: 1 })
        if (!user) {
            return response.status(403).json({ message: { type: 'error', text: 'Błąd autoryzacji, zaloguj się ponownie.' } })
        }
        request.userAuth.role = user.role
        next()
    }
    catch (error) {
        logger.error('Auth Error - ', error)
        response.status(403).json({ message: { type: 'error', text: 'Błąd autoryzacji, zaloguj się ponownie.' } })
    }
}

const roleAuthentication = (roles) => async (request, response, next) => {
    const userID = request.userAuth.id
    try {
        const user = await userDBModel.findById(userID)

        if (!user) {
            return response.status(403).json({ message: { type: 'error', text: 'Błąd autoryzacji, zaloguj się ponownie.' } })
        }

        if (!roles.includes(user.role)) {
            return response.status(401).json({ message: { type: 'error', text: 'Brak uprawnienie do wykonania tej akcji.' } })
        }

        next()
    }
    catch (error) {
        logger.error('Auth Error - ', error)
        response.status(403).json({ message: { type: 'error', text: 'Błąd autoryzacji, zaloguj się ponownie.' } })
    }
}

module.exports = { userAuthentication, roleAuthentication, getRoleAuthentication }