const { SlashCommandBuilder, PermissionFlagsBits, Client, ChatInputCommandInteraction } = require('discord.js')

module.exports = {
    developer: true,
    data: new SlashCommandBuilder()
    .setName("emit")
    .setDescription("Emit the guildMemberAdd/Remove events.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addStringOption((options) => options
        .setName('member')
        .setDescription('member Event')
        .setRequired(true)
        .addChoices(
            { name: 'guildMemberAdd', value: 'guildMemberAdd' },
            { name: 'guildMemberRemove', value: 'guildMemberRemove' }
        )
    ),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    execute(interaction, client) {
        const subCommand = interaction.options.getString("member");

        switch(subCommand) {
            case "guildMemberAdd": {
                client.emit("guildMemberAdd", interaction.member)
                interaction.reply({
                    content: "Emitted GuildMemberAdd",
                    ephemeral: true
                })
            }
            break
            case "guildMemberRemove": {
                client.emit("guildMemberRemove", interaction.member)
                interaction.reply({
                    content: "Emitted GuildMemberRemove",
                    ephemeral: true
                })
            }
            break
        }
    }
}