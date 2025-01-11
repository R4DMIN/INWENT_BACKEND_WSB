const mongoose = require('mongoose')

const tokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    userIp: { type: String }
})

exports.tokenDBModel = mongoose.model('Token', tokenSchema)