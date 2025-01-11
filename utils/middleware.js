const logger = require('./logger')

const requestLogger = (request, response, next) => {
    logger.info('Method:', request.method)
    logger.info('Path:  ', request.path)
    logger.info('Body:  ', request.body)
    next()
}

const unknownEndpoint = (request, response) => {
    const method = request.method
    const url = request.url
    logger.dev(`Error 404 | method: ${method} | url: '${url}'`)
    response.status(404).send({
        message: { type: 'Error', text: 'SERVER ERROR 404 | The requested URL was not found.' }
    })
}

const errorHandler = (error, request, response, next) => {
    if (error.name === 'CastError') {
        logger.error(error)
        return response.status(400).send({
            message: { type: 'Error', text: 'Błędne dane skontaktuj się z pomocą techniczną' },
        })
    }
    if (error.code === 11000) {
        const keys = Object.keys(error.keyValue)
        logger.warning(`errorHandeler - UserError - duplicate keys ${keys}`)
        if (keys.length === 1) {
            return response.status(400).send({
                message: { type: 'Warning', text: `W bazie danych istnieje ${keys[0]} z wartością ${error.keyValue[keys[0]]}` },
            })
        } else {
            let responseMessage = 'W bazie danych jest już połaczenie danych: '
            keys.forEach(key => {
                responseMessage += `"${key}":"${error.keyValue[key]}" `
            });
            return response.status(400).send({
                message: { type: 'Warning', text: responseMessage },
            })
        }
    }

    if (error.name === 'ValidationError') {
        return response.status(400).send({
            message: { type: 'Warning', text: error.errors[Object.keys(error.errors)[0]].message },
        })
    }

    if (error.name === 'MongooseError') {
        logger.error("MongooseError - DataBase connection problem");
        return response.status(500).send({})
    }

    logger.error("no error handling: ", error.name, error.code);
    next(error)
}

module.exports = {
    requestLogger,
    unknownEndpoint,
    errorHandler
}