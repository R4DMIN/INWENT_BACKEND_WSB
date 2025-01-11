const { test, describe } = require('node:test')
const assert = require('node:assert')

const stringToDate = require('../utils/dataParser').stringToDate

describe('stringToDate', () => {
    test('should return a valid Date object for "DD-MM-YYYY" format', () => {
        const result = stringToDate('DD-MM-YYYY', '15-11-2024')
        assert.deepStrictEqual(result, new Date(2024, 10, 15)) // Months are 0-indexed
    })

    test('should return a valid Date object for "MM/DD/YYYY" format', () => {
        const result = stringToDate('MM/DD/YYYY', '11/15/2024')
        assert.deepStrictEqual(result, new Date(2024, 10, 15))
    })

    test('should return null for an empty string', () => {
        const result = stringToDate('DD-MM-YYYY', '')
        assert.strictEqual(result, null)
    })

    test('should return null for a format without separators', () => {
        const result = stringToDate('DDMMYYYY', '15112024')
        assert.strictEqual(result, null)
    })

    test('should return null if the date string does not match the format', () => {
        const result = stringToDate('DD-MM-YYYY', '15/11/2024')
        assert.strictEqual(result, null)
    })

    test('should return null if any of the parts are undefined', () => {
        const result = stringToDate('DD-MM-YYYY', '15-11')
        assert.strictEqual(result, null)
    })

    test('should handle alternative year format "RRRR"', () => {
        const result = stringToDate('DD-MM-RRRR', '15-11-2024')
        assert.deepStrictEqual(result, new Date(2024, 10, 15))
    })

    test('should return a null for invalid date values', () => {
        const result = stringToDate('DD-MM-YYYY', '32-13-2024') // Invalid day and month
        assert.deepStrictEqual(result, null) 
    })
})
