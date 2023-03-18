const { EmbedBuilder, Message } = require("discord.js");
require('dotenv').config();

module.exports = {
    name: "messageDelete",
    /**
     * @param {Message} message 
     */
    async execute(message, client) {
        const guildConfig = client.guildConfig.get(message.guildId);
        if (!guildConfig) return;

        const messageLogChannel = (await message.guild.channels.fetch()).get(guildConfig.messageLogChannel)
        if (!messageLogChannel) return;

        if (!message.author || message.author.bot) return;

        const Log = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.avatarURL({ dynamic: true, size: 512 }) })
            .setTitle(`Message deleted in #${message.channel.name}`)
            .setDescription([
                `${message.content ? message.content : "None"}`,
                `\nMessage ID: ${message.id}`
            ].join("\n"))
            .setFooter({ text: `ID: ${message.author.id}` })
            .setTimestamp()

        if (message.attachments.size >= 1) {
            Log.addFields(
                {
                    name: "Attachments:",
                    value: `${message.attachments.map(a => a.url)}`,
                    inline: true
                },
            )
        }
        messageLogChannel.send({embeds: [Log]})
    }
}