const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const { userDBModel } = require('../models/userSchema')
mongoose.set('strictQuery', false)

const args = require('minimist')(process.argv.slice(2))

const email = args.email
const password = args.password
console.log(args)
console.log(email)
console.log(password)

if (!email || !password) {
    console.error('Użycie: npm run addroot -- --email admin@inwent.com --password secret')
    process.exit(1)
}

const mongoUrl = process.env.ASSET_DATA_MONGODB_URL
mongoose.connect(mongoUrl, { autoIndex: true })
    .then(async () => {
        try {
            const existingUser = await userDBModel.findOne({ email: email })
            if (existingUser) {
                console.error(`Użytkownik z email: ${email} już istnieje.`)
                process.exit(1)
            }

            const passwordHash = await bcrypt.hash(password, 10)

            const newUser = new userDBModel({
                email: email,
                password_hash: passwordHash,
                first_name: 'master',
                last_name: 'admin',
                role: 'admin'
            })

            const savedUser = await newUser.save();
            console.log(`Administrator z email: ${savedUser.email} został dodany pomyślnie.`)

        }
        catch (error) {
            console.error('Błąd podczas dodawania użytkownika:', error.message)
        }
    })

    .catch(error => {
        console.error('Błąd podczas dodawania użytkownika:', error.message)
    })
    .finally(() => {
        mongoose.connection.close()
    })


