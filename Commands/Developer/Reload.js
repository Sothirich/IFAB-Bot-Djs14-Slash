const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { loadEvents } = require('../../Handlers/event')
const { loadCommands } = require('../../Handlers/command')


module.exports = {
    developer: true,
    data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription('Reload your commands/events.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((options) => options
        .setName('type')
        .setDescription('type of option to reload')
        .setRequired(true)
        .addChoices(
            { name: 'events', value: 'events' },
            { name: 'commands', value: 'commands' }
        )
    ),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {client} client 
     */
    execute(interaction, client) {
        const choice = interaction.options.getString("type");

        switch(choice) {
            case "events": {
                for (const [key, value] of client.events)
                    client.removeListener(`${key}`, value, true)
                
                loadEvents(client)
                interaction.reply({
                    content: 'Reloaded Events.',
                    ephemeral: true
                })
            }
            break
            case "commands": {
                loadCommands(client)
                interaction.reply({
                    content: 'Reloaded Commands.',
                    ephemeral: true
                })
            }
            break
        }
    }
}