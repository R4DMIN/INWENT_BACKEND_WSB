require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || './.env' })
const IS_TEST_ENV = process.env.NODE_ENV === 'test'

const colours = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    fg: {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        gray: '\x1b[90m',
        crimson: '\x1b[38m' // Scarlet
    },
    bg: {
        black: '\x1b[40m',
        red: '\x1b[41m',
        green: '\x1b[42m',
        yellow: '\x1b[43m',
        blue: '\x1b[44m',
        magenta: '\x1b[45m',
        cyan: '\x1b[46m',
        white: '\x1b[47m',
        gray: '\x1b[100m',
        crimson: '\x1b[48m'
    }
};

const getTime = () => {
    const dateString = new Date().toISOString()
    return colours.fg.magenta + `[${dateString}]` + colours.reset
}

const info = (...params) => {
    if (!IS_TEST_ENV) console.log(getTime(), colours.bg.white + 'INFO:', colours.reset, ...params)
}

const warning = (...params) => {
    if (!IS_TEST_ENV) console.log(getTime(), colours.bg.yellow + 'WARNING:', colours.reset, ...params)
}

const error = (...params) => {
    console.log(getTime(), colours.bg.red + 'ERROR:', colours.reset, ...params)
}

const dataError = (...params) => {
    if (!IS_TEST_ENV) console.log(getTime(), colours.bg.cyan + 'Data Error:', colours.reset, ...params)
}

const dev = (...params) => {
    console.log(getTime(), colours.bg.cyan + 'DEV:', colours.reset, ...params)
}

module.exports = {
    info, warning, error, dev, dataError, colours
}