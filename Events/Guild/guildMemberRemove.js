const { GuildMember, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    name: "guildMemberRemove",
    /**
     * @param {GuildMember} member
     */
    async execute(member, client) {
        const guildConfig = client.guildConfig.get(member.guild.id);
        if (!guildConfig) return;

        const memberLogChannel = (await member.guild.channels.fetch()).get(guildConfig.memberLogChannel)
        if (!memberLogChannel) return;

        if (!memberLogChannel.permissionsFor(client.user).has(PermissionsBitField.Flags.ViewChannel || PermissionsBitField.Flags.SendMessages))
        return;
        
        const accountCreation = parseInt(member.user.createdTimestamp / 1000)
        
        const Embed = new EmbedBuilder()
        .setAuthor({
            name: `${member.user.tag}`,
            iconURL: member.displayAvatarURL({dynamic: true, size: 512})
        })
        .setTitle("Member Left")
        .setThumbnail(member.user.displayAvatarURL({dynamic: true, size: 512}))
        .setDescription([
            `• User: ${member.user}`,
            `• Account Type: ${member.user.bot ? "Bot" : "User"}`,
            `• Account Created: <t:${accountCreation}:D> | <t:${accountCreation}:R>`,
        ].join("\n"))
        .setFooter({text: `ID: ${member.id}`})
        .setTimestamp();

        memberLogChannel.send({embeds: [Embed]})
    }
}