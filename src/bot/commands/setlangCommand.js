const { MessageFlags } = require('discord.js');
const { db } = require('../db');
const { isAdministrator } = require('../helpers');
const { t, setLocale, LOCALE_NAMES } = require('../../i18n');

const handleSetlangCommand = async (interaction) => {
  if (!interaction.inGuild()) return;

  if (!isAdministrator(interaction.member)) {
    await interaction.reply({ content: t('setlang.notAdmin'), flags: MessageFlags.Ephemeral });
    return;
  }

  const locale = interaction.options.getString('locale', true);
  await setLocale(db, locale);

  await interaction.reply({
    content: t('setlang.updated', { localeName: LOCALE_NAMES[locale] }),
    flags: MessageFlags.Ephemeral,
  });
};

module.exports = { handleSetlangCommand };
