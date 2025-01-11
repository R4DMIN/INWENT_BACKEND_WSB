const validator = require('../utils/validator')
const mongoose = require('../utils/dbconnect')

const userBusinessUnitSchema = new mongoose.Schema({
    user_ID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    business_unit_ID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'businessUnitData',
        required: true
    }
})

userBusinessUnitSchema.index({ user_ID: 1, business_unit_ID: 1 }, { unique: true })

exports.userBusinessUnitDBModel = mongoose.model('userBusinessUnit', userBusinessUnitSchema)