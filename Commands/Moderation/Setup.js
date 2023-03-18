const { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder, ChannelType } = require('discord.js')
const database = require("../../Schemas/MemberLog")

module.exports = {
    data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure some setting for your guild.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((subCommand) => subCommand
        .setName('autorole')
        .setDescription("Configure the auto roled for your guild.")
        .addRoleOption((options) => options
            .setName("member_role")
            .setDescription("Set the role to be automatically added the new members.")
            .setRequired(true)
        )
        .addRoleOption((options) => options
            .setName("bot_role")
            .setDescription("Set the role to be automatically added the new bots.")
        ),
    )
    .addSubcommand((subCommand) => subCommand
        .setName('welcomelog')
        .setDescription("Configure the Welcome logging channel for your guild.")
        .addChannelOption((options) => options
            .setName("log_channel")
            .setDescription("Select the logging channel for Welcome Message.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('memberlog')
        .setDescription("Configure the member logging system for your guild.")
        .addChannelOption((options) => options
            .setName("log_channel")
            .setDescription("Select the logging channel for MemberLog Mesasage.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('messagelog')
        .setDescription("Configure the Message logging channel for your guild.")
        .addChannelOption((options) => options
            .setName("log_channel")
            .setDescription("Select the logging channel for Deleted/Edited Message.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('voicelog')
        .setDescription("Configure the Voice logging channel for your guild.")
        .addChannelOption((options) => options
            .setName("log_channel")
            .setDescription("Select the logging channel for Voice Status.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute(interaction, client) {
        const { guild, options } = interaction
        const subCommand = options.getSubcommand()

        const guildConfig = client.guildConfig.get(guild.id);
        let memberLogChannel = null
        let welcomeLogChannel = null
        let messageLogChannel = null
        let voiceLogChannel = null
        let memberRole =  null
        let botRole = null
        
        if (guildConfig) {
            memberLogChannel = guildConfig.memberLogChannel
            welcomeLogChannel = guildConfig.welcomeLogChannel
            messageLogChannel = guildConfig.messageLogChannel
            voiceLogChannel = guildConfig.voiceLogChannel
            memberRole = guildConfig.memberRole
            botRole = guildConfig.botRole
        }

        switch(subCommand) {
            case "memberlog": {
                memberLogChannel = options.getChannel("log_channel").id
                await database.findOneAndUpdate(
                    {Guild: guild.id},
                    {memberLogChannel: memberLogChannel},
                    {new: true, upsert: true}
                )
            }
            break
            case ("welcomelog"): {
                welcomeLogChannel = options.getChannel("log_channel").id
                await database.findOneAndUpdate(
                    {Guild: guild.id},
                    {welcomeLogChannel: welcomeLogChannel},
                    {new: true, upsert: true}
                )
            }
            break
            case ("messagelog"): {
                messageLogChannel = options.getChannel("log_channel").id
                await database.findOneAndUpdate(
                    {Guild: guild.id},
                    {messageLogChannel: messageLogChannel},
                    {new: true, upsert: true}
                )
            }
            break
            case ("voicelog"): {
                voiceLogChannel = options.getChannel("log_channel").id
                await database.findOneAndUpdate(
                    {Guild: guild.id},
                    {voiceLogChannel: voiceLogChannel},
                    {new: true, upsert: true}
                )
            }
            break
            case ("autorole"): {
                memberRole = options.getRole("member_role") ? options.getRole("member_role").id : null
                botRole = options.getRole("bot_role") ? options.getRole("bot_role").id : botRole

                await database.findOneAndUpdate(
                    {Guild: guild.id},
                    {
                        memberRole: memberRole,
                        botRole: botRole
                    },
                    {new: true, upsert: true}
                )
            }
            break
        }

        client.guildConfig.set(guild.id, {
            memberLogChannel: memberLogChannel,
            welcomeLogChannel: welcomeLogChannel,
            messageLogChannel: messageLogChannel,
            memberRole: memberRole,
            botRole: botRole
        })

        const Embed = new EmbedBuilder()
        .setColor("Green")
        .setAuthor({
            name: `${guild.name}`, 
            iconURL: guild.iconURL({dynamic: true})
        })
        .setTitle("Server Configuration")
        .setDescription([
            `• Welcome Channel: ${welcomeLogChannel ? `<#${welcomeLogChannel}>` : "Not Specified."}`,
            `• Join/Left Log Channel: ${memberLogChannel ? `<#${memberLogChannel}>` : "Not Specified."}`,
            `• Message Log Channel: ${messageLogChannel ? `<#${messageLogChannel}>` : "Not Specified."}`,
            `• Voice Log Channel: ${voiceLogChannel ? `<#${voiceLogChannel}>` : "Not Specified."}`,
            `• Member Auto-Role: ${memberRole ? `<@&${memberRole}>` : "Not Specified." }`,
            `• Bot Auto-Role: ${botRole ? `<@&${botRole}>` : "Not Specified." }`
        ].join("\n"))
        .setTimestamp()

        interaction.reply({embeds: [Embed]})
    }
}