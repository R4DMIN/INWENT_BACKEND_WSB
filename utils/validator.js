const email = (email) => {
    const emailRegex = /^(?!.*\.\.)([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
    return emailRegex.test(email); // Zwraca true, jeśli e-mail jest prawidłowy
}

module.exports = {
    email
}