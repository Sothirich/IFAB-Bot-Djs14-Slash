const { GuildMember, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const moment = require('moment')
const { profileImage } = require('discord-arts')

module.exports = {
    name: "guildMemberAdd",
    /**
     * @param {GuildMember} member
     */
    async execute(member, client) {
        const guildConfig = client.guildConfig.get(member.guild.id);
        if (!guildConfig) return;

        const guildRoles = member.guild.roles.cache;
        let assignedRole = member.user.bot ? guildRoles.get(guildConfig.botRole) : guildRoles.get(guildConfig.memberRole)

        if (!assignedRole) assignedRole = "Not configured."
        else await member.roles.add(assignedRole).catch(() => {
            assignedRole = "Failed due to Role Hierarchy"
        })

        const memberLogChannel = (await member.guild.channels.fetch()).get(guildConfig.memberLogChannel)
        const welcomeLogChannel = (await member.guild.channels.fetch()).get(guildConfig.welcomeLogChannel)
        if (!memberLogChannel) return;

        let color = "#74e21e"
        let risk = "Fairly Safe"

        const accountCreation = parseInt(member.user.createdTimestamp / 1000)
        const joiningTime = parseInt(member.joinedAt / 1000)

        const monthsAgo = moment().subtract(2, "months").unix()
        const weeksAgo = moment().subtract(2, "weeks").unix()
        const daysAgo = moment().subtract(2, "days").unix()

        if (accountCreation >= monthsAgo) {
            color = "#e2bb1e"
            risk = "Medium"
        }
        if (accountCreation >= weeksAgo) {
            color = "#e24d1e"
            risk = "High"
        }
        if (accountCreation >= daysAgo) {
            color = "#e21e1e"
            risk = "Extreme"
        }

        const Embed = new EmbedBuilder()
        .setAuthor({
            name: `${member.user.tag}`,
            iconURL: member.displayAvatarURL({dynamic: true, size: 512})
        })
        .setColor(color)
        .setTitle("Member Joined")
        .setThumbnail(member.user.displayAvatarURL({dynamic: true, size: 512}))
        .setDescription([
            `• User: ${member.user}`,
            `• Account Type: ${member.user.bot ? "Bot" : "User"}`,
            `• Role Assigned: ${assignedRole}`,
            `• Risk Level: ${risk}`,
            `• Account Created: <t:${accountCreation}:D> | <t:${accountCreation}:R>`,
            `• Account Joined: <t:${joiningTime}:D> | <t:${joiningTime}:R>`,
        ].join("\n"))
        .setFooter({text: `ID: ${member.id}`})
        .setTimestamp();

        if (risk == "Extreme" || risk == "High"){
            const Buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setCustomId(`MemberLogging-Kick-${member.id}`)
                .setLabel("Kick")
                .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                .setCustomId(`MemberLogging-Ban-${member.id}`)
                .setLabel("Ban")
                .setStyle(ButtonStyle.Danger)
            )

            memberLogChannel.send({embeds: [Embed], components: [Buttons]})
        } else memberLogChannel.send({embeds: [Embed]})

        if (!welcomeLogChannel) return;

        try {
            const profileBuffer = await profileImage(member.id, {
                borderColor: ['#f90257', '#043a92'],
            })
            const imageAttachment = new AttachmentBuilder(profileBuffer, {
                name: 'profile.png'
            })

            const welcomeEmbed = new EmbedBuilder()
            .setColor(member.displayColor)
            .setTitle(`Welcome to ${member.guild.name}`)
            .setImage("attachment://profile.png")
            .setDescription(`**User**: ${member.user} | ID: ${member.id}`)
            .addFields([
                {name: "Account Created", value: `<t:${accountCreation}:R>`, inline: true},
                {name: "Account Joined", value: `<t:${joiningTime}:R>`, inline: true},
            ])

            welcomeLogChannel.send({embeds: [welcomeEmbed], files: [imageAttachment]})
        } catch (error) {
            welcomeLogChannel.send({content: "An error eccured: Contact The Developer: <@393582885468372992>"})
            throw error
        }
    }
}