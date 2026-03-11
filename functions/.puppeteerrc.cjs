const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Changes the cache location for Puppeteer to a local folder
    // so it gets included in the functions deployment.
    cacheDirectory: join(process.cwd(), '.cache', 'puppeteer'),
};
