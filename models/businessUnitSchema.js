const mongoose = require('../utils/dbconnect')

/** walidatory danych  */

const zipCodeValidator = (zipCode) => {
    const pattern = /^\d{2}-\d{3}$/
    return pattern.test(zipCode)
}

const businessUnitSchema = new mongoose.Schema({
    full_name: {
        type: String,
        require: [true, "Brak pełenj nazwy jednostki organizacyjnej."],
        unique: [true, "Podana pełna nazwa jednostki organizacyjnej już istnieje w bazie danych."],
        minLength: [8, "Pełna nazwa jednostki ogrganizacyjnej wymaga min 8 znkaów."],
        maxLength: [30, "Pełna nazwa jednostki organizacyjnej może mieć max 30 znaków."]
    },
    short_name: {
        type: String,
        require: [true, "Brak skróconej nazwy jednostki organizacyjnej."],
        unique: [true, "Podana skrócona nazwa jednostki organizacyjnej już istnieje w bazie danych."],
        minLength: [3, "Skrócona nazwa jednostki ogrganizacyjnej wymaga min 3 znkaów."],
        maxLength: [6, "Skrócona nazwa jednostki organizacyjnej może mieć max 6 znaków."]
    },
    city: {
        type: String
    },
    zip_code: {
        type: String,
        validate: {
            validator: zipCodeValidator,
            message: 'Podano błędny kod pocztowy.'
        }
    },
    street: {
        type: String,
        minLenght: [4, "Nazwa ulicy wymaga min 4 znaków."],
        maxLength: [20, "Nazwa ulicy nie może mieć więcej niż 20 znaków."]
    },
})

/** pola wirtualne  */

businessUnitSchema.virtual('address').get(function () {
    return `ul. ${this.street} ${this.city} ${this.zip_code}`;
});

/** Konfiguracja  */

businessUnitSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

exports.businessUnitDBModel = mongoose.model('businessUnitData', businessUnitSchema)