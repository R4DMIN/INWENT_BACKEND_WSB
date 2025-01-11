const { test, describe } = require('node:test')
const assert = require('node:assert')

const validator = require('./../utils/validator')

describe('email validator', () => {

    const casesToTest = [
        ['test@123.pl', true],
        ['user.name@example.com', true],
        ['user+test@example.com', true],
        ['user123@example.co.uk', true],
        ['test@domain.io', true],
        ['@example.com', false],
        ['test@.com', false],
        ['test@com', false],
        ['test@123..com', false],
        ['test@com.', false],
        ['test',false],
        ['test@domena,com',false],
        ['test.com',false],
        ['.com@test',false],
        ['123@123.123',false],
        ['test',false],
        ['test@user@test.com',false],
    ]

    casesToTest.forEach(element => {
        test(`validate ${element[0]} should return ${element[1]}`, () => {
            assert.deepStrictEqual(validator.email(element[0]), element[1])
        })
    });
})