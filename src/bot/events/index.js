const { client } = require('../client');
const { registerReadyEvent } = require('./ready');
const { registerMessageCreateEvent } = require('./messageCreate');
const { registerMessageUpdateEvent } = require('./messageUpdate');
const { registerTypingStartEvent } = require('./typingStart');
const { registerInteractionCreateEvent } = require('./interactionCreate');

const registerEvents = () => {
  registerReadyEvent();
  registerMessageCreateEvent();
  registerMessageUpdateEvent();
  registerTypingStartEvent();
  registerInteractionCreateEvent();

  client.on('error', (error) => {
    console.error('Discord client error:', error);
  });
};

module.exports = { registerEvents };
