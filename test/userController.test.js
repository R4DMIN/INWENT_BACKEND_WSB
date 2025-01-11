const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const bcrypt = require('bcrypt')
const { userDBModel } = require('./../models/userSchema')
const { tokenDBModel } = require('./../models/authTokenShema')
const app = require('../app')
const mongoose = require('mongoose')

const api = supertest(app)

const usersInDb = async () => {
    const users = await userDBModel.find({})
    return users.map(u => u.toJSON())
}

const activeSesions = async () => {
    const sesions = await tokenDBModel.find({})
    return sesions.map(s => s.toJSON())
}

describe('userDBmodel and userAuthentication test when there is initially only root (root@inwent.pl) usern in db ', () => {
    before(async () => {
        await userDBModel.deleteMany({})
        await tokenDBModel.deleteMany({})

        const password_hash = await bcrypt.hash('passwordroot', 10)
        const user = new userDBModel({
            email: 'root@inwent.pl',
            first_name: 'root',
            last_name: 'root',
            password_hash,
            role: 'admin'
        })

        await user.save()
    })

    after(async () => {
        await mongoose.disconnect()
        await mongoose.connection.close()
    })

    const credentialsRoot = {
        email: 'root@inwent.pl',
        password: 'passwordroot'
    }

    const user1 = {
        email: 'user1@inwent.pl',
        first_name: 'name1',
        last_name: 'last_name1',
        password: 'password1',
        full_name: 'name1 last_name1',
        role: 'user'
    }

    const credentials1 = {
        email: 'user1@inwent.pl',
        password: 'password1'
    }

    const user2 = {
        email: 'user2@inwent.pl',
        first_name: 'name2',
        last_name: 'last_name2',
        password: 'password2',
        full_name: 'name3 last_name3',
        role: 'user'
    }

    const credentials2 = {
        email: 'user2@inwent.pl',
        password: 'password2'
    }

    const user3 = {
        email: 'user3@inwent.pl',
        first_name: 'name3',
        last_name: 'last_name3',
        password: 'password3',
        full_name: 'name3 last_name3',
        role: 'user'
    }

    const credentials3 = {
        email: 'user3@inwent.pl',
        password: 'password3'
    }

    let activeToken = null

    test('failed to create a user before logging in to the root account', async () => {
        const usersAtStart = await usersInDb()

        const response = await api
            .post('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send(user1)
            .expect(401)
            .expect('Content-Type', /application\/json/)

        const usersAtEnd = await usersInDb()
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })

    test('login succeeds with correct data (root@inwent.pl) and receive token', async () => {

        const sesionsAtStart = await activeSesions()

        const authResponse = await api
            .post('/api/login')
            .send(credentialsRoot)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        activeToken = authResponse.body.token

        const response = await api
            .get('/api/login/user')
            .set('Authorization', `Bearer ${activeToken}`)
            .send(credentialsRoot)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const sesionsAtEnd = await activeSesions()
        assert.strictEqual(response.body.email, 'root@inwent.pl')
        assert.strictEqual(response.body.first_name, 'root')
        assert.strictEqual(response.body.last_name, 'root')
        assert.strictEqual(sesionsAtEnd.length, sesionsAtStart.length + 1)

    })

    test('creation succeeds with a fresh email (user1@inwent.pl)', async () => {
        const usersAtStart = await usersInDb()
        const response = await api
            .post('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send(user1)
            .expect(201)
            .expect('Content-Type', /application\/json/)

        assert.deepStrictEqual(response.body.message, { type: 'ok', text: `Poprawnie zapisano użytkownika ${user1.first_name} ${user1.last_name} z adresem email: ${user1.email}` })

        const usersAtEnd = await usersInDb()
        assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)
    })

    test('load user list from DB', async () => {
        const usersCount = await usersInDb()

        const response = await api
            .get('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send()
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(usersCount.length, response.body.length)
    })

    test('creation fails with proper message and stauscode if email alredy taken (user1@inwent.pl)', async () => {
        const usersAtStart = await usersInDb()

        const response = await api
            .post('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send(user1)
            .expect(400)
            .expect('Content-Type', /application\/json/)

        const usersAtEnd = await usersInDb()
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
        assert.strictEqual(response.body.message.text, 'W bazie danych istnieje email z wartością user1@inwent.pl')
    })

    test('creation succeeds with a fresh email (user2@inwent.pl)', async () => {
        const usersAtStart = await usersInDb()

        const response = await api
            .post('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send(user2)
            .expect(201)
            .expect('Content-Type', /application\/json/)

        assert.deepStrictEqual(response.body.message, { type: 'ok', text: `Poprawnie zapisano użytkownika ${user2.first_name} ${user2.last_name} z adresem email: ${user2.email}` })

        const usersAtEnd = await usersInDb()
        assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

    })

    test('no sesions after root@inwent.pl logout', async () => {

        const sesionsAtStart = await activeSesions()

        const response = await api
            .delete('/api/login')
            .set('Authorization', `Bearer ${activeToken}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const sesionsAtEnd = await activeSesions()

        assert.deepStrictEqual(response.body.message, { type: 'ok', text: 'Użytkownik wylogowany.' })
        assert.strictEqual(sesionsAtEnd.length, sesionsAtStart.length - 1)

    })

    test('creation fail with a fresh email (user3@inwent.pl) after root@inwent.pl logout', async () => {
        const usersAtStart = await usersInDb()

        const response = await api
            .post('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send(user3)
            .expect(401)
            .expect('Content-Type', /application\/json/)

        const usersAtEnd = await usersInDb()
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
        assert.strictEqual(response.body.message.text, 'Nieautoryzowany dostęp.')
    })

    test('login fails with incorrect credentials (root@inwent.pl)', async () => {
        const sesionsAtStart = await activeSesions()

        const credentialsInvalid = {
            email: 'root@inwent.pl',
            password: 'sekret2'
        }

        const response = await api
            .post('/api/login')
            .send(credentialsInvalid)
            .expect(401)
            .expect('Content-Type', /application\/json/)

        const sesionsAtEnd = await activeSesions()

        assert.deepStrictEqual(response.body, { message: { type: 'warning', text: 'Dane logowania niepoprawne' } })
        assert.strictEqual(sesionsAtEnd.length, sesionsAtStart.length)
    })

    test('creation fail with a fresh email (user3@inwent.pl) with user1@inewent.pl permissions', async () => {
        const usersAtStart = await usersInDb()

        const response = await api
            .post('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send(user3)
            .expect(401)
            .expect('Content-Type', /application\/json/)

        const usersAtEnd = await usersInDb()
        assert.strictEqual(usersAtEnd.length, usersAtStart.length)
        assert.strictEqual(response.body.message.text, 'Nieautoryzowany dostęp.')
    })

    test('fail update password for user1@inwent.pl when user1 not logged', async () => {

        const response = await api
            .put('/api/users/updatepassword')
            .send({ email: user1.email, oldPassword: 'dupa123', newPassword: 'newPassword1' })
            .expect(401)
            .expect('Content-Type', /application\/json/)

        assert.deepStrictEqual(response.body.message, { type: 'error', text: 'Błąd autoryzacji, zaloguj się ponownie.' })
    })

    test('login succeeds with correct data (user1@inwent.pl) and recive token', async () => {

        const sesionsAtStart = await activeSesions()

        const authResponse = await api
            .post('/api/login')
            .send(credentials1)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        activeToken = authResponse.body.token

        const response = await api
            .get('/api/login/user')
            .set('Authorization', `Bearer ${activeToken}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const sesionsAtEnd = await activeSesions()

        assert.strictEqual(response.body.email, user1.email)
        assert.strictEqual(response.body.first_name, user1.first_name)
        assert.strictEqual(response.body.last_name, user1.last_name)
        assert.strictEqual(sesionsAtEnd.length, sesionsAtStart.length + 1)

    })

    test('fail update password for user1@inwent.pl when old password is incorret', async () => {

        const response = await api
            .put('/api/users/updatepassword')
            .set('Authorization', `Bearer ${activeToken}`)
            .send({ email: user1.email, oldPassword: 'dupa123', newPassword: 'newPassword1' })
            .expect(401)
            .expect('Content-Type', /application\/json/)

        assert.deepStrictEqual(response.body, { message: { type: 'warning', text: 'Nie udało się zmienić hasła sprawdź poprawnośc wprowadzonych danych.' } })
    })

    test('succeeds update password for user1@inwent.pl', async () => {

        const response = await api
            .put('/api/users/updatepassword')
            .set('Authorization', `Bearer ${activeToken}`)
            .send({ email: user1.email, oldPassword: user1.password, newPassword: 'newPassword1' })
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.deepStrictEqual(response.body, { message: { type: 'Ok', text: 'Hasło zmienione poprawnie.' } })
    })

    test('fails remove user2@inwent.pl with user1@inewent.pl permissions', async () => {
        const response = await api
            .delete('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send({ email: user1.email })
            .expect(401)
            .expect('Content-Type', /application\/json/)

        assert.strictEqual(response.body.message.text, 'Brak uprawnienie do wykonania tej akcji.')
    })

    test('no sesions after user1@inwent.pl logout', async () => {

        const sesionsAtStart = await activeSesions()

        const response = await api
            .delete('/api/login')
            .set('Authorization', `Bearer ${activeToken}`)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const sesionsAtEnd = await activeSesions()

        assert.deepStrictEqual(response.body.message, { type: 'ok', text: 'Użytkownik wylogowany.' })
        assert.strictEqual(sesionsAtEnd.length, sesionsAtStart.length - 1)

    })

    test('login fails with old password data (user1@inwent.pl)', async () => {

        const response = await api
            .post('/api/login')
            .send(credentials1)
            .expect(401)
            .expect('Content-Type', /application\/json/)

        assert.deepStrictEqual(response.body, { message: { type: 'warning', text: 'Dane logowania niepoprawne' } })
    })

    test('login succeeds with new password (user1@inwent.pl)', async () => {
        const sesionsAtStart = await activeSesions()

        const response = await api
            .post('/api/login')
            .send({ email: user1.email, password: 'newPassword1' })
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const sesionsAtEnd = await activeSesions()

        assert.strictEqual(!(!response.body.token), true)
        assert.strictEqual(sesionsAtEnd.length, sesionsAtStart.length + 1)

        activeToken = response.body.token
    })

    test('multiple user logged succeeds (root@inewent.pl)', async () => {

        const sesionsAtStart = await activeSesions()

        const response = await api
            .post('/api/login')
            .send(credentialsRoot)
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const sesionsAtEnd = await activeSesions()

        assert.strictEqual(!(!response.body.token), true)
        assert.strictEqual(sesionsAtEnd.length, sesionsAtStart.length + 1)

        activeToken = response.body.token

    })

    test('succeeds remove user2@inwent.pl by email from database', async () => {
        const response = await api
            .delete('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send({ email: user2.email })
            .expect(200)
            .expect('Content-Type', /application\/json/)

        assert.deepStrictEqual(response.body, { message: { type: 'ok', text: `Usnięto użytkownika '${user2.email}'` } })
    })

    test('succeeds load user list and remove user1@inwent by id from database', async () => {

        const usersAtStart = await usersInDb()

        const userListResponse = await api
            .get('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send()
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const userIdToDelete = userListResponse.body[1].id

        const response = await api
            .delete('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send({ id: userIdToDelete })
            .expect(200)
            .expect('Content-Type', /application\/json/)

        const usersAtEnd = await usersInDb()
        assert.deepStrictEqual(response.body, { message: { type: 'ok', text: `Usnięto użytkownika '${user1.email}'` } })
        assert.strictEqual(usersAtEnd.length, usersAtStart.length - 1)
    })

    test('failure when deleting a non-existent user from the database', async () => {
        const response = await api
            .delete('/api/users')
            .set('Authorization', `Bearer ${activeToken}`)
            .send({ email: 'test@aaa.pl' })
            .expect(400)
            .expect('Content-Type', /application\/json/)

        assert.deepStrictEqual(response.body, { message: { type: 'warning', text: 'Użytkownik nie istnieje w bazie danych.' } })
    })

})