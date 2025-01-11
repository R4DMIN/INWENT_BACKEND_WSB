const bcrypt = require('bcrypt')
const userRouter = require('express').Router()
const { userDBModel } = require('../models/userSchema')
const logger = require('../utils/logger')
const { userAuthentication, roleAuthentication, getRoleAuthentication } = require('./../utils/authMiddleware')
const { isValidObjectId } = require('mongoose')
const { userBusinessUnitDBModel } = require('./../models/userBusinessUnitSchema')
const { businessUnitDBModel } = require('../models/businessUnitSchema')

const saltRounds = 10

userRouter.post('/businessUnits/:userID', userAuthentication, roleAuthentication(['admin']), async (request, response, next) => {
    const userID = request.params.userID
    const newBusinessUnitIDs = request.body
    try {
        await userBusinessUnitDBModel.deleteMany({ user_ID: userID })
        await newBusinessUnitIDs.forEach(newBusinessUnitID => {
            const query = new userBusinessUnitDBModel({ user_ID: userID, business_unit_ID: newBusinessUnitID })
            query.save()
        })

        return response.status(200).json({
            message: { type: 'ok', text: 'Jednostkio organizacyjne przypisane.' }
        })

    }
    catch (error) {
        logger.error(error)
        return response.status(400).json({
            message: { type: 'Error', text: 'Wystąpił bład.' }
        })
    }
})

userRouter.get('/businessUnitIDs/:userID', userAuthentication, roleAuthentication(['admin']), async (request, response, next) => {
    const userID = request.params.userID
    if (!userID) return response.status(400).json({
        message: {
            type: 'warning',
            text: 'Brak wymaganych danych.'
        }
    })
    try {
        const businessUnits = await userBusinessUnitDBModel.find({ user_ID: userID }, { business_unit_ID: 1 })
        return response.status(200).json(businessUnits.map(BU => BU.business_unit_ID))
    }
    catch (error) { next(error) }
})

userRouter.get('/', userAuthentication, roleAuthentication(['admin']), async (request, response, next) => {
    try {
        const userList = await userDBModel.find({})
        return response.status(200).json(userList)
    }
    catch (error) {
        next(error)
    }
})
/* 
userRouter.get('/:id', userAuthentication, roleAuthentication(['admin']), async (request, response, next) => {
    const id = request.params.id
    try {
        const user = await userDBModel.findById(id)
        return response.status(200).json(user)
    }
    catch (error) {
        next(error)
    }
}) */

userRouter.get('/businessUnits', userAuthentication, getRoleAuthentication, async (request, response, next) => {
    const userID = request.userAuth.id
    const userRole = request.userAuth.role
    try {
        if (userRole === 'admin') {
            const busienssUnits = await businessUnitDBModel
                .find({}, { short_name: 1 })
            return response.status(200).json(busienssUnits)
        } else {
            const busienssUnits = await userBusinessUnitDBModel
                .find({ user_ID: userID }, { business_unit_ID: 1 })
                .populate({ path: 'business_unit_ID', select: 'short_name' })
            return response.status(200).json(busienssUnits.map((BU) => BU.business_unit_ID))
        }
    } catch (error) { next(error) }
})

userRouter.put('/saveActiveBusinessUnit/:businessUnitID', userAuthentication, async (request, response, next) => {
    const busienssUnitID = request.params.businessUnitID
    const userID = request.userAuth.id
    try {
        await userDBModel.findByIdAndUpdate(userID, { selected_business_unit: busienssUnitID })
        response.status(200)
    } catch (error) { next(error) }
})

userRouter.post('/', userAuthentication, roleAuthentication(['admin']), async (request, response, next) => {
    const { email, first_name, last_name, password, role } = request.body

    if (!email || !first_name || !last_name || !password || !role)
        return response.status(400).json({ message: { type: 'warning', text: 'Nie wprowadzono wszystkich wymaganych danych.' } })

    const password_hash = await bcrypt.hash(password, saltRounds)

    const user = new userDBModel({
        email,
        first_name,
        last_name,
        password_hash,
        role
    })

    try {
        const savedUser = await user.save()
        response.status(201).json({
            message: { type: 'ok', text: `Poprawnie zapisano użytkownika ${savedUser.first_name} ${savedUser.last_name} z adresem email: ${savedUser.email}` }
        })
    }
    catch (error) { next(error) }
})

userRouter.delete('/', userAuthentication, roleAuthentication(['admin']), async (request, response, next) => {
    const { email, id } = request.body
    let idToDelete = null
    try {
        if (!id) {
            const userToDelete = await userDBModel
                .findOne({ email: email }, { id: 1 })
            idToDelete = userToDelete ? userToDelete.id : null
        } else {
            idToDelete = isValidObjectId(id) ? id : null
        }
        if (!idToDelete)
            response.status(400).json({ message: { type: 'warning', text: 'Użytkownik nie istnieje w bazie danych.' } })
        else {
            const deleteUser = await userDBModel
                .findByIdAndDelete(idToDelete)

            response.status(200).json({ message: { type: 'ok', text: `Usnięto użytkownika '${deleteUser.email}'` } })
        }
    }
    catch (error) { next(error) }

})

userRouter.put('/update/:id', userAuthentication, roleAuthentication(['admin']), async (request, response, next) => {
    const { email, first_name, last_name, role } = request.body
    const id = request.params.id

    try {
        const user = await userDBModel.findByIdAndUpdate(id, { email: email, first_name: first_name, last_name: last_name, role: role })
        if (!user)
            return response.status(400).json({
                message: { type: 'warning', text: 'Nie odnaleziono użytkownika.' }
            })
        else
            return response.status(200).json({
                message: { type: 'ok', text: 'Dane użytkownika zmienione poprawnie.' }
            })
    }
    catch (error) {
        next(error)
    }
})

userRouter.put('/resetpassword/:id', userAuthentication, roleAuthentication(['admin']), async (request, response, next) => {
    const { password } = request.body
    const id = request.params.id

    if (!password)
        return response.status(400).json({
            message: { type: 'warning', text: 'Nie udało się zmienić hasła sprawdź poprawnośc wprowadzonych danych.' }
        })

    try {

        const passwordHash = await bcrypt.hash(password, saltRounds)
        const user = await userDBModel.findByIdAndUpdate(id, { password_hash: passwordHash })
        if (!user)
            return response.status(400).json({
                message: { type: 'warning', text: 'Nie udało się zmienić hasła sprawdź poprawnośc wprowadzonych danych.' }
            })
        else
            response.status(200).json({ message: { type: 'Ok', text: 'Hasło zmienione poprawnie.' } })
    }
    catch (error) { next(error) }
})


userRouter.put('/updatepassword/', userAuthentication, async (request, response, next) => {
    const { email, oldPassword, newPassword } = request.body
    const userTokenId = request.userAuth.id

    const user = await userDBModel.findById(userTokenId)

    const passwordCorrect = user === null
        ? false
        : await bcrypt.compare(oldPassword, user.password_hash)

    if (!(user && passwordCorrect && email === user.email)) {
        return response.status(401).json({
            message: { type: 'warning', text: 'Nie udało się zmienić hasła sprawdź poprawnośc wprowadzonych danych.' }
        })
    }

    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)
    try {
        await userDBModel
            .findByIdAndUpdate(user.id, { password_hash: newPasswordHash })

        response.status(200).json({ message: { type: 'Ok', text: 'Hasło zmienione poprawnie.' } })
    }
    catch (error) { next(error) }

})


module.exports = userRouter