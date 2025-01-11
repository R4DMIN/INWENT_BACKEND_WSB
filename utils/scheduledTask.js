const { tokenDBModel } = require('./../models/authTokenShema')
const logger = require('./logger')

const deleteExpiredTokens = async () => {
    try {
        logger.info('Shedule start - deleting expired tokens')
        const tokenList = await tokenDBModel.find({})
        const tokensAtStart = tokenList.length
        tokenList.forEach(async (token) => {
            if (token.expiresAt < new Date(Date.now()))
                await tokenDBModel.findByIdAndDelete(token._id)
        })
        logger.info(`Shedule finish - deleting expired tokens`)
    }
    catch (error) {
        logger.error('deleteExpiredTokens - ', error)
    }
}

const sheduledTask = { deleteExpiredTokens }

module.exports = sheduledTask