const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} = require('discord.js');
const { t } = require('../../i18n');

const buildControlPanelMessage = ({ user, blocked }) => {
  const closeButton = new ButtonBuilder()
    .setCustomId(`modmail:close:${user.id}`)
    .setLabel(t('controlPanel.closeButton'))
    .setStyle(ButtonStyle.Danger);

  const blockButton = new ButtonBuilder()
    .setCustomId(`modmail:block:${user.id}`)
    .setLabel(blocked ? t('controlPanel.blockButtonBlocked') : t('controlPanel.blockButtonActive'))
    .setStyle(blocked ? ButtonStyle.Secondary : ButtonStyle.Danger)
    .setDisabled(blocked);

  const unblockButton = new ButtonBuilder()
    .setCustomId(`modmail:unblock:${user.id}`)
    .setLabel(blocked ? t('controlPanel.unblockButtonActive') : t('controlPanel.unblockButtonBlocked'))
    .setStyle(ButtonStyle.Success)
    .setDisabled(!blocked);

  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(t('controlPanel.header', { id: user.id })),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(t('controlPanel.closeDescription')))
        .setButtonAccessory(closeButton),
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(t('controlPanel.blockDescription')))
        .setButtonAccessory(blockButton),
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(t('controlPanel.unblockDescription')))
        .setButtonAccessory(unblockButton),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
};

module.exports = { buildControlPanelMessage };
