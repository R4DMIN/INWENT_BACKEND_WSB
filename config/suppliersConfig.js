const dataParser = require('../utils/dataParser');
const { supplierDemoDataDBModel } = require('../models/suppliers/supplierDemoDataSchema')

const SUPPLIERS = {
    supplierDemo: {
        name: 'Dostawca Demo',
        model: supplierDemoDataDBModel,
        mainKey: 'id_asset',
        snKey: 'serial',
        leasingEndKey: 'leasing_end',
        assetModelFirst: 'manufacturer',
        assetModelSecond: 'model',
        assetStatusKey: 'asset_status',
        keys: {
            id_asset: 'ID asset',
            manufacturer: 'manufacturer',
            model: 'model',
            serial: 'Serial',
            descryption_1: 'descryption 1',
            descryption_2: 'descryption 2',
            shop_no: 'shop no',
            leasing_end: 'leasing end',
        },
        keysToPrase: {
            leasing_end: (string) => dataParser.stringToDate('DD.MM.YYYY', string),
            id_asset: (string) => parseInt(string),
        }
    }

}

module.exports = SUPPLIERS