const fs = require("fs");
const csvParser = require("csv-parser");
const logger = require('../utils/logger')
const SUPPLIERS = require('../config/suppliersConfig')

// status przetwarzania plików
let processStatus = {
    active: false,
    assetTotal: 0,
    assetFinished: 0,
    assetUpdated: 0,
    assetAdded: 0,
    assetError: 0,
    assetOutdated: 0
}

const clearProcessStatus = () => {
    processStatus = {
        active: false,
        assetTotal: 0,
        assetFinished: 0,
        assetUpdated: 0,
        assetAdded: 0,
        assetError: 0,
        assetOutdated: 0
    }
}

// informację o dostawcach do przetwarzania pliku


// sprwadza czy plik ma poprawne nagłowki dla danego dostawcy
const verifySupplierCsvHeaders = (supplier, filePath) => {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('headers', (headers) => {
                //końćzy odczytywanie pliku po odczytaniu nagłówków 
                stream.destroy()
                let correctHeaders = true;
                Object.keys(SUPPLIERS[supplier].keys).forEach(key => {
                    //console.log(key, SUPPLIERS[supplier].keys[key]);
                    if (!headers.includes(SUPPLIERS[supplier].keys[key])) correctHeaders = false
                });
                resolve(correctHeaders)
            })
            .on('error', (error) => {
                logger.error(`"verifySupplierCsvHeaders()" - błąd przy odczycie pliku`)
                reject(error)
            })
    })
}

//podmienia klucze i wartości na te używane w bazie danych
const changeSuppllierFileKeys = (supplier, object) => {
    const SUPPLIER = SUPPLIERS[supplier]
    let newObejct = {}
    Object.keys(SUPPLIER.keys).forEach(key => {
        if (!SUPPLIER.keysToPrase[key])
            newObejct[key] = object[SUPPLIER.keys[key]]
        else {
            newObejct[key] = SUPPLIER.keysToPrase[key](object[SUPPLIER.keys[key]])
        }
    });
    newObejct.INW_outdated = false
    newObejct.INW_processed = true
    newObejct.INW_last_update = new Date(Date.now())
    return newObejct
}

//funkcja updatujaca dane z pluku dla wskazanego dostawcy
const updateSupplierFile = (supplier, filePath) => {
    return new Promise((resolve, reject) => {
        const SUPPLIER = SUPPLIERS[supplier]
        const mainKey = SUPPLIER.mainKey
        const supplierModel = SUPPLIER.model

        processStatus.active = true

        supplierModel.updateMany({}, { INW_processed: false })
            .then(() => {
                logger.dev(` supplierModel.updateMany({}, { INW_processed: false })`)
                let processPromises = []
                //ropoczni odczytywanie pliku
                fs.createReadStream(filePath)
                    .pipe(csvParser())
                    .on('data', (row) => {
                        //dla każedgo obiektu (lini) wykonaj 
                        row = changeSuppllierFileKeys(supplier, row)
                        logger.dev(`dla każedgo obiektu ${row[mainKey]} wykonaj  changeSuppllierFileKeys(supplier, row)`)
                        processStatus.assetTotal += 1
                        const updatePromise = supplierModel
                            .findOneAndUpdate({ [mainKey]: row[mainKey] }, row, { new: true })
                            .then(result => {
                                // jeżeli znaleziono w bazie danych to updatuj jeżeli nie to dodaj nowy wpis
                                if (!result) {
                                    const addPromises = new supplierModel(row)
                                        .save()
                                        .then(() => {
                                            processStatus.assetAdded += 1
                                        })
                                        .catch((error) => {
                                            processStatus.assetError += 1
                                            logger.error(`updateSupplierFile(${supplier}, ${filePath}) => supplierModel.save.catch` + error)
                                        })
                                    // w tabeli zaopisujemy wszystkie operacje dodawania 
                                    processPromises.push(addPromises)
                                } else {
                                    processStatus.assetUpdated += 1
                                }
                            })
                            .catch(error => {
                                processStatus.assetError += 1
                                logger.error(`updateSupplierFile(${supplier}, ${filePath}) => supplierModel.findOneAndUpdate.catch` + error)
                            })
                        // w tabeli zapisujemy wszystkie operację updatu
                        processPromises.push(updatePromise)
                    })
                    .on('error', (error) => {
                        logger.error(`updateSupplierFile(${supplier}, ${filePath}) => fs.createReadStream` + error)
                    })
                    .on('end', () => {
                        // po zakończeniu odczytu pliku zaczekaj na wszystkie prommise 
                        logger.dev(`Zakończono przetwarzanie pliku, oczekuje na promisses`)
                        logger.dev(processPromises)
                        Promise.all(processPromises)
                            .then(() => {
                                supplierModel.updateMany({ INW_processed: false }, { INW_processed: true, INW_outdated: true })
                                    .then((result) => {
                                        processStatus.assetOutdated = result.modifiedCount
                                        console.log(processStatus);
                                        clearProcessStatus()
                                    })
                                    .catch(() => {
                                        logger.error(`updateSupplierFile(${supplier}, ${filePath}) => supplierModel.updateMany({...},{...INW_outdated})` + error)
                                    })
                            })
                    })

            })
            .catch((error) => {
                logger.error(`updateSupplierFile(${supplier}, ${filePath}) =>  supplierModel.updateMany().catch` + error)
            })
    })
}

//głowna funkcja przetwarzająca plik
const verifySupplierFileAndUpdate = (supplier, filePath) => {
    return new Promise((resolve) => {
        // sprawdź czy plik nie jest aktaulnie przetwarzany
        if (processStatus.active) {
            resolve([200, { message: { type: 'Warning', text: `Trwa przetwarzanie pliku, spróbuj później` } }])
            return
        }
        if (!SUPPLIERS[supplier]) {
            resolve([200, { message: { type: 'Error', text: `Błąd techniczny skontaktuj sie z suportem` } }])
            logger.error(`verifySupplierFileAndUpdate(${supplier},path) - Wrong supplier name`)
            return
        }

        // sprawdź czy plik jest poprawny dla danego dostawcy
        verifySupplierCsvHeaders(supplier, filePath)
            .then((response) => {
                // jeżeli weryfikacja przebiegał pomyślnie to:
                if (response) {
                    logger.dev(`Werfikacja przebiegła pomyślnie, rozpoczyna się updatowanie danych.`)
                    resolve([200, { message: { type: 'Ok', text: `Plik poprawny, rozpoczęto przetwarzanie danych.` } }])
                    updateSupplierFile(supplier, filePath)
                }
                else {
                    logger.dev(`Werfikacja nie przebiegła pomyślnie. Przesłany plik CSV jest nieporpawny dla dostawcy: "${supplier}"`)
                    resolve([200, { message: { type: 'Warning', text: `Przesłany plik CSV jest nieporpawny dla dostawcy: "${supplier}"` } }])
                }
            })
            .catch(() => {
                logger.dev(`Bład analizy pliku`)
                resolve([200, { message: { type: 'Error', text: `Bład analizy pliku` } }])
            })
    })
}

module.exports = { verifySupplierFileAndUpdate }