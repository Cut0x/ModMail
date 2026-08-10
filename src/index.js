const { config } = require('./config');
const { client } = require('./bot/client');
const { registerEvents } = require('./bot/events');

registerEvents();

client.login(config.token);
