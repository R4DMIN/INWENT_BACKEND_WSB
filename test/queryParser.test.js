const { test, describe } = require('node:test')
const assert = require('node:assert')

const { getQueryFromColumnsList, makeObjectFlat, makeObjectListFlat } = require('./../utils/queryParser')

describe('getQueryFromColumnsList', () => {

    test('should return empty object when columnsQueryArray is empty ', () => {
        const columnsQueryArray = []
        const populateSchemaList = [
            {
                path: 'business_unit_ID',
                keys: ['short_name', 'full_name', 'address']
            },
        ]

        const [query, populateQueryArray] = getQueryFromColumnsList(columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(query, {})
        assert.deepStrictEqual(populateQueryArray, [])
    })

    test('should return a query object with all columns and an empty populateQueryArray when no populate schema is provided', () => {
        const columnsQueryArray = ['business_unit', 'location', 'location_description']
        const populateSchemaList = []

        const [query, populateQueryArray] = getQueryFromColumnsList(columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(query, { business_unit: 1, location: 1, location_description: 1 })
        assert.deepStrictEqual(populateQueryArray, [])
    })

    test('should exclude keys found in populate schema from query and include them in populateQueryArray with single key', () => {
        const columnsQueryArray = ['short_name', 'location', 'location_description']
        const populateSchemaList = [
            {
                path: 'business_unit_ID',
                keys: ['short_name', 'full_name', 'address']
            },
        ]
        const [query, populateQueryArray] = getQueryFromColumnsList(columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(query, { location: 1, location_description: 1 })
        assert.deepStrictEqual(populateQueryArray, [{ path: 'business_unit_ID', select: 'short_name' }])
    })

    test('should include multiple keys in populateQueryArray when found in the same populate schema', () => {
        const columnsQueryArray = ['short_name', 'full_name', 'location', 'location_description']
        const populateSchemaList = [
            {
                path: 'business_unit_ID',
                keys: ['short_name', 'full_name', 'address']
            },
        ]
        const [query, populateQueryArray] = getQueryFromColumnsList(columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(query, { location: 1, location_description: 1 })
        assert.deepStrictEqual(populateQueryArray, [{ path: 'business_unit_ID', select: 'short_name full_name' }])
    })

    test('should use alias from the "as" property in populate schema for specific keys', () => {
        const columnsQueryArray = ['business_unit', 'location', 'location_description']
        const populateSchemaList = [
            {
                path: 'business_unit_ID',
                keys: ['business_unit', 'full_name', 'address'],
                as: { business_unit: 'short_name' }
            },
        ]
        const [query, populateQueryArray] = getQueryFromColumnsList(columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(query, { location: 1, location_description: 1 })
        assert.deepStrictEqual(populateQueryArray, [{ path: 'business_unit_ID', select: 'short_name' }])
    })

    test('should correctly handle virtual keys and include them in the populate query while excluding them from the main query', () => {
        const columnsQueryArray = ['short_name', 'business_unit_adress', 'location', 'location_description']
        const populateSchemaList = [
            {
                path: 'business_unit_ID',
                keys: ['short_name', 'full_name', 'address', 'business_unit_adress'],
                virtual: { business_unit_adress: 'street city zip_code' }
            },
        ]
        const [query, populateQueryArray] = getQueryFromColumnsList(columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(query, { location: 1, location_description: 1 })
        assert.deepStrictEqual(populateQueryArray, [{ path: 'business_unit_ID', select: 'short_name street city zip_code' }])
    })

    test('should handle complex cases with multiple populate schemas and a mix of direct keys, aliases, and virtual keys', () => {
        const columnsQueryArray = ['id', 'sn', 'last_invent', 'manufacturer', 'model', 'business_unit', 'location', 'address']
        const populateSchemaList = [
            {
                path: 'assignment_location_ID',
                keys: ['business_unit', 'location', 'location_description']
            },
            {
                path: 'model_ID',
                keys: ['manufacturer', 'model', 'device_type', 'model_description', 'photo']
            },
            {
                path: 'business_unit_ID',
                keys: ['business_unit', 'full_name', 'address'],
                as: { business_unit: 'short_name' },
                virtual: { address: 'street city zip_code' }
            }
        ]
        const [query, populateQueryArray] = getQueryFromColumnsList(columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(query, { id: 1, sn: 1, last_invent: 1 })
        assert.deepStrictEqual(populateQueryArray, [
            { path: 'model_ID', select: 'manufacturer model' },
            { path: 'assignment_location_ID', select: 'business_unit location' },
            {
                path: 'business_unit_ID',
                select: 'short_name street city zip_code'
            }
        ])
    })
})

describe('makeObjectFlat', () => {

    test('should return the original object unchanged when no populateSchemaList is provided, and all keys in the columnsQueryArray exist directly in the object', () => {
        const columnsQueryArray = ['business_unit', 'location', 'location_description']
        const populateSchemaList = []

        const object = {
            id: 123,
            business_unit: 'sklep1',
            location: 'Toruń',
            location_description: 'fajny'
        }

        const result = makeObjectFlat(object, columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(result, object)
    })

    test('should flatten a field from a nested object into the main object based on the columnsQueryArray and the populateSchemaList defining the path and keys', () => {
        const columnsQueryArray = ['short_name', 'location', 'location_description']
        const populateSchemaList = [
            {
                path: 'business_unit_ID',
                keys: ['short_name', 'full_name', 'address']
            },
        ]

        const object = {
            id: 123,
            business_unit_ID: { short_name: 'sklep 1' },
            location: 'Toruń',
            location_description: 'fajny'
        }

        const expectedObject = {
            id: 123,
            short_name: 'sklep 1',
            location: 'Toruń',
            location_description: 'fajny'
        }

        const result = makeObjectFlat(object, columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(result, expectedObject)
    })

    test('should flatten multiple fields from a nested object into the main object when multiple keys are specified in the columnsQueryArray and populateSchemaList', () => {
        const columnsQueryArray = ['short_name', 'full_name', 'location', 'location_description']
        const populateSchemaList = [
            {
                path: 'business_unit_ID',
                keys: ['short_name', 'full_name', 'address']
            },
        ]

        const object = {
            id: 123,
            business_unit_ID: { short_name: 'sklep 1', full_name: 'super duper sklep' },
            location: 'Toruń',
            location_description: 'fajny'
        }

        const expectedObject = {
            id: 123,
            short_name: 'sklep 1',
            full_name: 'super duper sklep',
            location: 'Toruń',
            location_description: 'fajny'
        }

        const result = makeObjectFlat(object, columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(result, expectedObject)
    })

    test('should map a nested field to an alias in the flattened object when an alias is defined in the populateSchemaList', () => {
        const columnsQueryArray = ['business_unit', 'location', 'location_description']
        const populateSchemaList = [
            {
                path: 'business_unit_ID',
                keys: ['business_unit', 'full_name', 'address'],
                as: { business_unit: 'short_name' }
            },
        ]

        const object = {
            id: 123,
            business_unit_ID: { short_name: 'sklep 1' },
            location: 'Toruń',
            location_description: 'fajny'
        }

        const expectedObject = {
            id: 123,
            business_unit: 'sklep 1',
            location: 'Toruń',
            location_description: 'fajny'
        }

        const result = makeObjectFlat(object, columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(result, expectedObject)
    })

    test('should include virtual fields from a nested object in the flattened output if defined in the populateSchemaList', () => {
        const columnsQueryArray = ['short_name', 'business_unit_adress', 'location', 'location_description']
        const populateSchemaList = [
            {
                path: 'business_unit_ID',
                keys: ['short_name', 'full_name', 'address', 'business_unit_adress'],
                virtual: { business_unit_adress: 'street city zip_code' }
            },
        ]
        const object = {
            id: 123,
            business_unit_ID: { short_name: 'sklep 1', business_unit_adress: 'ulica miasto kod pocztowy' },
            location: 'Toruń',
            location_description: 'fajny'
        }

        const expectedObject = {
            id: 123,
            short_name: 'sklep 1',
            business_unit_adress: 'ulica miasto kod pocztowy',
            location: 'Toruń',
            location_description: 'fajny'
        }

        const result = makeObjectFlat(object, columnsQueryArray, populateSchemaList)

        assert.deepStrictEqual(result, expectedObject)
    })

    test('should handle multiple nested objects, applying transformations, aliases, and virtual fields from the populateSchemaList to the main object based on the columnsQueryArray', () => {
        const columnsQueryArray = ['id', 'sn', 'last_invent', 'manufacturer', 'model', 'business_unit', 'location', 'address']
        const populateSchemaList = [
            {
                path: 'assignment_location_ID',
                keys: ['business_unit', 'location', 'location_description']
            },
            {
                path: 'model_ID',
                keys: ['manufacturer', 'model', 'device_type', 'model_description', 'photo']
            },
            {
                path: 'business_unit_ID',
                keys: ['business_unit', 'full_name', 'address'],
                as: { business_unit: 'short_name' },
                virtual: { address: 'street city zip_code' }
            }
        ]

        const object = {
            id: 123,
            sn: 'a1b2c3',
            last_invent: 'jakaś data',
            assignment_location_ID: { location: 'lokalizacja' },
            model_ID: { manufacturer: 'producent', model: 'model' },
            business_unit_ID: { short_name: 'sklep 1', address: 'ulica miasto kod pocztowy' }
        }

        const expectedObject = {
            id: 123,
            sn: 'a1b2c3',
            last_invent: 'jakaś data',
            manufacturer: 'producent',
            model: 'model',
            business_unit: 'sklep 1',
            location: 'lokalizacja',
            address: 'ulica miasto kod pocztowy'
        }

        const result = makeObjectFlat(object, columnsQueryArray, populateSchemaList)
        assert.deepStrictEqual(result, expectedObject)
    })

    test('should handle cases where some nested fields are missing in the columnsQueryArray or populateSchemaList, resulting in empty values for those fields in the flattened object', () => {
        const columnsQueryArray = ['id', 'sn', 'last_invent', 'manufacturer', 'model', 'business_unit', 'location', 'address']
        const populateSchemaList = [
            {
                path: 'assignment_location_ID',
                keys: ['business_unit', 'location', 'location_description']
            },
            {
                path: 'model_ID',
                keys: ['manufacturer', 'model', 'device_type', 'model_description', 'photo']
            },
            {
                path: 'business_unit_ID',
                keys: ['business_unit', 'full_name', 'address'],
                as: { business_unit: 'short_name' },
                virtual: { address: 'street city zip_code' }
            }
        ]

        const object = {
            id: 123,
            sn: 'a1b2c3',
            last_invent: 'jakaś data',
            assignment_location_ID: { location: 'lokalizacja' },
            business_unit_ID: { short_name: 'sklep 1', address: 'ulica miasto kod pocztowy' }
        }

        const expectedObject = {
            id: 123,
            sn: 'a1b2c3',
            last_invent: 'jakaś data',
            manufacturer: '',
            model: '',
            business_unit: 'sklep 1',
            location: 'lokalizacja',
            address: 'ulica miasto kod pocztowy'
        }

        const result = makeObjectFlat(object, columnsQueryArray, populateSchemaList)
        assert.deepStrictEqual(result, expectedObject)
    })

    describe('makeObjectListFlat', () => {
        test('should return flatten object list based on columns and population schema', () => {
            const columnsQueryArray = ['id', 'sn', 'last_invent', 'manufacturer', 'model', 'business_unit', 'location', 'address']
            const populateSchemaList = [
                {
                    path: 'assignment_location_ID',
                    keys: ['business_unit', 'location', 'location_description']
                },
                {
                    path: 'model_ID',
                    keys: ['manufacturer', 'model', 'device_type', 'model_description', 'photo']
                },
                {
                    path: 'business_unit_ID',
                    keys: ['business_unit', 'full_name', 'address'],
                    as: { business_unit: 'short_name' },
                    virtual: { address: 'street city zip_code' }
                }
            ]

            const objectList = [{
                id: 123,
                sn: 'a1b2c3',
                last_invent: 'jakaś data',
                assignment_location_ID: { location: 'lokalizacja1' },
                model_ID: { manufacturer: 'producent', model: 'model' },
                business_unit_ID: { short_name: 'sklep 1', address: 'ulica miasto kod pocztowy' }
            }, {
                id: 124,
                sn: 'a1b2c4',
                last_invent: 'jakaś data2',
                assignment_location_ID: { location: 'lokalizacja2' },
                model_ID: { manufacturer: 'producent', model: 'model' },
                business_unit_ID: { short_name: 'sklep 1', address: 'ulica miasto kod pocztowy' }
            }, {
                id: 125,
                sn: 'a1b2c5',
                last_invent: 'jakaś data3',
                assignment_location_ID: { location: 'lokalizacja3' },
                business_unit_ID: { short_name: 'sklep 2', address: 'ulica miasto kod pocztowy 2' }
            },
            ]

            const expectedListObject = [{
                id: 123,
                sn: 'a1b2c3',
                last_invent: 'jakaś data',
                manufacturer: 'producent',
                model: 'model',
                business_unit: 'sklep 1',
                location: 'lokalizacja1',
                address: 'ulica miasto kod pocztowy'
            }, {
                id: 124,
                sn: 'a1b2c4',
                last_invent: 'jakaś data2',
                manufacturer: 'producent',
                model: 'model',
                business_unit: 'sklep 1',
                location: 'lokalizacja2',
                address: 'ulica miasto kod pocztowy'
            }, {
                id: 125,
                sn: 'a1b2c5',
                last_invent: 'jakaś data3',
                manufacturer: '',
                model: '',
                business_unit: 'sklep 2',
                location: 'lokalizacja3',
                address: 'ulica miasto kod pocztowy 2'
            }
            ]

            const result = makeObjectListFlat(objectList, columnsQueryArray, populateSchemaList)
            assert.deepStrictEqual(result, expectedListObject)
        })
    })

})