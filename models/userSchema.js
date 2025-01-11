const logger = require('../utils/logger')
const validator = require('../utils/validator')
const mongoose = require('../utils/dbconnect')

/** deklaracja modelu mongose dla użytkowników */
const userDataShema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        dropDups: true,
        required: true,
        validate: {
            validator: validator.email,
            message: props => `${props.value} nie jest poprawnym adresem e-mail!`
        }
    },
    first_name: {
        type: String,
        required: true,
        minLength: [3, 'Imię wymaga minimum 3 znaków']
    },
    last_name: {
        type: String,
        required: true,
        minLength: [3, 'Imię wymaga minimum 3 znaków']
    },
    password_hash: String,
    role: {
        type: String,
        required: true
    },
    selected_business_unit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'businessUnitData'
    }
})

/** pola wirtualne */
userDataShema.virtual('full_name').get(function () {
    return `${this.first_name} ${this.last_name}`
})

/** konfiguracja */

userDataShema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
        delete returnedObject.password_hash
    }
})

userDataShema.set('toObject', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
        delete returnedObject.password_hash
    }
})

exports.userDBModel = mongoose.model('user', userDataShema)
