const fileUploadRouter = require('express').Router()
const logger = require('../utils/logger')
const multer = require('multer')
const { verifySupplierFileAndUpdate } = require('../utils/processSupplierFiles')
const { userAuthentication } = require('../utils/authMiddleware')

const suppliersFilesStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'upload/tempfiles/suppliers/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});
const suppliersFilesUpload = multer({ storage: suppliersFilesStorage });


fileUploadRouter.post('/suppliers/csv', userAuthentication, suppliersFilesUpload.single('file'), (request, response, next) => {

    if (!request.body.supplier) {
        logger.error(`${request.originalUrl} BAD REQUEST request does not have a supplier name`)
        return response.json({ type: 'Error', message: `Błędne żądanie skontaktuj się z pomocą techniczną` })
    }
    if (!request.file) {
        return response.json({ type: 'Warning', message: `Nie przesłano pliku` })
    }

    verifySupplierFileAndUpdate(request.body.supplier, request.file.path)
        .then(res => response.status(res[0]).json(res[1]))
})

module.exports = fileUploadRouter