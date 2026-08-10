const {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} = require('discord.js');

const buildControlPanelMessage = ({ user, blocked }) => {
  const closeButton = new ButtonBuilder()
    .setCustomId(`modmail:close:${user.id}`)
    .setLabel('Close ticket')
    .setStyle(ButtonStyle.Danger);

  const blockButton = new ButtonBuilder()
    .setCustomId(`modmail:block:${user.id}`)
    .setLabel(blocked ? 'User blocked' : 'Block user')
    .setStyle(blocked ? ButtonStyle.Secondary : ButtonStyle.Danger)
    .setDisabled(blocked);

  const unblockButton = new ButtonBuilder()
    .setCustomId(`modmail:unblock:${user.id}`)
    .setLabel(blocked ? 'Unblock user' : 'User not blocked')
    .setStyle(ButtonStyle.Success)
    .setDisabled(!blocked);

  const container = new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ModMail Ticket\nUser: <@${user.id}>\nID: \`${user.id}\``),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Close this ticket.'))
        .setButtonAccessory(closeButton),
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Block incoming DMs from this user.'))
        .setButtonAccessory(blockButton),
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Allow incoming DMs again.'))
        .setButtonAccessory(unblockButton),
    );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
  };
};

module.exports = { buildControlPanelMessage };
