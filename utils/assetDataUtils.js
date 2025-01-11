const logger = require('./logger')
const { isValidObjectId } = require('mongoose');
const { assetDataDBModel } = require('./../models/assetDataSchema')
const { assetLocationDBModel } = require('./../models/assetLocationSchema');
const { getSupplierAssetData, linkSupplierData } = require('./supplierDataUtils');

/** aktualizuje dane istneijącego assetu  */
const inwentExistAsset = async (assetToInwent) => {
    return new Promise(async (resolve) => {
        try {
            logger.dev('assetToinwent', assetToInwent)

            /** zmienna przechowująca klucze do aktualizacji */
            let dataToUpdate = {}

            //sprawdź czy opis został przekazany
            if (assetToInwent.description)
                dataToUpdate.description = assetToInwent.description

            //sprawdź czy lokalizacja została zmieniona a jeżeli tak to
            if (isValidObjectId(assetToInwent.assignment_location_ID))
                dataToUpdate = { ...dataToUpdate, ...await assigmentDataFromLocationID(assetToInwent.assignment_location_ID) }
            else
                dataToUpdate.status = 'UNASSIGNED'

            // dodanie czasu inwentaryzacji 
            dataToUpdate.last_invent = new Date(Date.now())

            /** zinwentaryzowany asset */
            const inwentAsset = await assetDataDBModel.findByIdAndUpdate(assetToInwent.id, dataToUpdate, { new: true })
            resolve({
                message: { type: 'Ok', text: `Zinwentaryzowano urządzenia z numerem seryjnym "${inwentAsset.sn}"` },
                status: 'success'
            })
        }
        catch (error) {
            logger.error('ADU2 - inwentNewAsset() - ', error, 'assetData - ', assetToInwent)
            resolve({
                message: { type: 'error', text: `Błąd przy inwentaryzacji asset SN:${assetToInwent.sn}. Spróbuj ponownie później lub skontaktuj się z pomocą techniczną. (ADU2)` },
                status: 'fail',
                data: assetToInwent
            })
        }
    })
}

/** dodanie nowego assetu poprzez inwentaryzację  */
const inwentNewAsset = async (assetToInwent) => {
    return new Promise(async (resolve) => {
        const newAsset = new assetDataDBModel({ sn: assetToInwent.sn, last_invent: new Date(Date.now()) })

        //sprawdź czy przekazano poprawne ID modelu
        if (isValidObjectId(assetToInwent.model_ID))
            newAsset.model_ID = assetToInwent.model_ID
        else
            resolve({ status: 'fail', data: assetToInwent, message: { type: 'Warning', text: 'Nie można zapisać assetu bez przypisanego modelu.' } })

        //sprawdź czy przekazano id lokalizacji
        if (isValidObjectId(assetToInwent.assignment_location_ID))
            newAsset.set(await assigmentDataFromLocationID(assetToInwent.assignment_location_ID))

        else if (isValidObjectId(assetToInwent.business_unit_ID)) {
            newAsset.business_unit_ID = assetToInwent.business_unit_ID
            newAsset.status = 'UNASSIGNED'
        } else resolve({
            message: { type: 'warning', text: 'Nie przypisano jednostki organizacyjnej.' },
            status: 'fail',
            data: assetToInwent
        })


        //jeżeli dodano komentarz to zapisz
        if (assetToInwent.description)
            newAsset.description = assetToInwent.description

        try {
            if (isValidObjectId(assetToInwent.supplier_ID) && assetToInwent.supplierKey) {
                const dataFromSupplier = await getSupplierAssetData(assetToInwent.supplier_ID, assetToInwent.supplierKey)
                logger.dev('data', dataFromSupplier.leasing_end)
                newAsset.supplier_ID = dataFromSupplier.supplier_ID
                newAsset.leasing_end = dataFromSupplier.leasing_end
                newAsset.supplier_key = dataFromSupplier.supplierKey
                linkSupplierData(newAsset.id, newAsset.supplier_ID, newAsset.supplier_key)
            }

            const newAssetSaved = await newAsset.save()
            resolve({
                message: { type: 'Ok', text: `Zinwentaryzowano urządzenia z numerem seryjnym "${newAssetSaved.sn}"` },
                status: 'success'
            })
        }
        catch (error) {
            logger.error('ADU1 - inwentNewAsset() - ', error, 'assetData - ', assetToInwent)
            resolve({
                message: { type: 'error', text: 'Błąd zapisu danych, spróbuj ponownie później lub skontaktuj się z pomocą techniczną. (ADU1)' },
                status: 'fail',
                data: assetToInwent
            })
        }
    })
}

/** inwentaryzacja przekazanego assetu */
const inwentAsset = async (assetToInwent) => {
    // jeżeli asset ma poprawne ID to zinwentaryzuj urzedzenie z podanymi danymi
    if (isValidObjectId(assetToInwent.id)) {
        return inwentExistAsset(assetToInwent)
            .then((result) => result)
        //jeżeli ID jest nie poprawne to utwórz nowy wpis w bazie danych 
    } else {
        return inwentNewAsset(assetToInwent)
            .then((result) => result)
    }
}

const assigmentDataFromLocationID = async (assignment_location_ID) => {
    return new Promise(async (resolve, reject) => {

        let verifedData = {} //dane do zapisania po weryfikacji
        try {
            //łądowanie danych assetu i lokalizacji do weryfikacji
            const locationData = await assetLocationDBModel.findById(assignment_location_ID, { business_unit_ID: 1, stock: 1 })
            /* const assetData = await assetDataDBModel.findById(id, { business_unit_ID: 1 }) */

            verifedData.business_unit_ID = locationData.business_unit_ID
            verifedData.assignment_location_ID = locationData.id

            if (locationData.stock === true)
                verifedData.status = 'FREE'
            else
                verifedData.status = 'INSTALLED'

            resolve(verifedData)
        }
        catch (error) {
            logger.error('ADU3 - assigmentDataFromLocationID() - ', error)
            reject({ type: 'error', text: 'Błąd przy weryfikacji danych, spróbuj ponownie później lub skontaktuj się z pomocą techniczną. (ADU3)' })
        }
    })
}



module.exports = {
    inwentAsset,
    assigmentDataFromLocationID
}