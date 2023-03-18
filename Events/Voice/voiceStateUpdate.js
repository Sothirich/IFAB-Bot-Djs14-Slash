const { VoiceState, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "voiceStateUpdate",
    /**
     * @param {VoiceState} oldState
     * @param {VoiceState} newState
     */
    async execute(oldState, newState, client) {
        const { member, guild } = newState;
        const guildConfig = client.guildConfig.get(guild.id);
        if (!guildConfig) return;

        const voiceLogChannel = (await guild.channels.fetch()).get(guildConfig.voiceLogChannel)
        if (!voiceLogChannel) return;
        
        const oldChannel = oldState.channel;
        const newChannel = newState.channel;

        const Log = new EmbedBuilder()
        .setAuthor({ name: member.user.tag, iconURL: member.user.avatarURL({ dynamic: true, size: 512 }) })
        .setFooter({ text: `ID: ${member.user.id}` })
        .setTimestamp()

        if (!oldChannel)
            voiceLogChannel.send({embeds: [Log
                .setTitle(`Member joined voice channel`)
                .setColor('#74e21e')
                .setDescription(`**${member.user.tag}** joined #${newChannel.name}`)
            ]})
        else if (!newChannel)
            voiceLogChannel.send({embeds: [Log
                .setTitle(`Member left voice channel`)
                .setColor('#e24d1e')
                .setDescription(`**${member.user.tag}** left #${oldChannel.name}`)
            ]})
        else voiceLogChannel.send({embeds: [Log
            .setTitle(`Member changed voice channel`)
            .setColor('#e2bb1e')
            .setDescription([
                `**Before:** #${oldChannel.name}`,
                `**+After:** #${newChannel.name}`,
            ].join("\n"))
        ]})
    }
}