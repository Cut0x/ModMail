const { client } = require('../client');
const { handleInteractionCreate } = require('../interactions');

const registerInteractionCreateEvent = () => {
  client.on('interactionCreate', handleInteractionCreate);
};

module.exports = { registerInteractionCreateEvent };
