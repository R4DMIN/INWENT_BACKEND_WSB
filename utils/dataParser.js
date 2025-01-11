const logger = require('./logger')

String.prototype.toObjectId = function () {
    var ObjectId = (require('mongoose').Types.ObjectId);
    return new ObjectId(this.toString());
};

const stringToDate = (format, string) => {

    //jeżeli string jest pusty zwróć null
    if (string === '') return null

    // znajdź wszystkie znaki specjalne jako separatory
    const separatorRegex = /[^A-Za-z0-9]/
    const separators = format.match(separatorRegex)

    //jeżeli nie znaleziono separatorów zwróc null
    if (!separators) return null

    const separator = separators[0]
    // podzieli format i date używając separatora
    const formatParts = format.split(separator)
    const stringParts = string.split(separator)

    // sprawdź czy liczba części pasuje 
    if (formatParts.length !== stringParts.length) return null;

    let day, month, year;

    formatParts.forEach((part, index) => {
        switch (part.toUpperCase()) {
            case 'DD':
                day = parseInt(stringParts[index], 10)
                break;
            case 'MM':
                month = parseInt(stringParts[index], 10) - 1 //miesiące w js są od 0 - 11 
                break;
            case 'YYYY':
            case 'RRRR':
                year = parseInt(stringParts[index])
                break;
            default:
                return null
        }
    });

    // sprawdź czy wysztkie zmienne mają wartość 
    if (day === undefined || month === undefined || year === undefined)
        return null

    // sprwdź czy dane są poprawne 
    if (day > 31 || day < 1) return null
    if (month > 12 || month < 1) return null

    return new Date(year, month, day)
}

/** Przyjumje ID mongo jako string i zwraca jako ObjectId  */
const idToObjectId = (id) => {
    return id.toObjectId()
}

/** konwertuje wszstkie wartości kluczy na typ Number, jeżeli nie ma takiej możliwosci to pomija dany klucz*/
const convertObjectValuesToNumber = (object) => {
    const newObject = {}

    Object.keys(object).forEach(key => {
        const newValue = Number(object[key])
        if (!isNaN(newValue))
            newObject[key] = newValue
    });
    return newObject
}

module.exports = { stringToDate, idToObjectId, convertObjectValuesToNumber }