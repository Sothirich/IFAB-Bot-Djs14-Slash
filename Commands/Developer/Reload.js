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
    async execute(interaction, client) {
        const choice = interaction.options.getString("type");
        
        try {
            switch(choice) {
                case "events": {
                    await interaction.deferReply({ ephemeral: true });
    
                    for (const [key, value] of client.events)
                        client.removeListener(`${key}`, value, true)
                    
                    loadEvents(client)
                    return interaction.editReply({
                        content: 'Reloaded Events.',
                        ephemeral: true
                    });
                }
                case "commands": {
                    await interaction.deferReply({ ephemeral: true });
    
                    loadCommands(client)
                    return interaction.editReply({
                        content: 'Reloaded Commands.',
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            console.log(error);
        }
        
    }
}