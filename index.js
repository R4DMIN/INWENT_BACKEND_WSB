const app = require('./app');
const config = require('./config/config');
const logger = require('./utils/logger');

app.listen(config.PORT, () => {
    logger.info(`Server started at port ${config.PORT}`);
});