const { CommandInteraction } = require('discord.js')
require('dotenv').config();

module.exports = {
    name: "interactionCreate",
    /**
     * 
     * @param {CommandInteraction} interaction 
     */
    execute(interaction, client) {
        if (!interaction.isChatInputCommand() && !interaction.isUserContextMenuCommand()) return;

        const command = client.commands.get(interaction.commandName)
        if (!command) 
        return interaction.reply({
            content: "This Command is outdated.",
            flags: 64
        });

        if (command.developer && interaction.user.id !== process.env.DEV_ID)
        return interaction.reply({
            content: "This command is only available to the developer.",
            flags: 64
        })

        const permission = command.data.default_member_permissions;

        if (permission) {
            if (!interaction.member.permissions.has(permission))
            return interaction.reply({ content: `You do not have the required permission for this command: \`${interaction.commandName}\`.`, flags: 64 })

            else if (!interaction.guild.members.me.permissions.has(permission))
            return interaction.reply({ content: `I do not have the required permission for this command: \`${interaction.commandName}\`.`, flags: 64 })
        }
        // const subCommand = interaction.options.getSubcommand(false)
        // if (subCommand) {
        //     const subCommandFile = client.subCommands.get(`${interaction.commandName}.${subCommand}`)
        //     if (!subCommandFile)
        //     return interaction.reply({
        //         content: "This SubCommand is outdated.",
        //         flags: 64
        //     });

        //     subCommandFile.execute(interaction, client)
        // } else command.execute(interaction, client);

        command.execute(interaction, client);
    }

    
}