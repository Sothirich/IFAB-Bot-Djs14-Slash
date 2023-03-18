const { EmbedBuilder, Message } = require("discord.js");
require('dotenv').config();

module.exports = {
    name: "messageUpdate",
    /**
     * @param {Message} oldMessage 
     * @param {Message} newMessage 
     */
    async execute(oldMessage, newMessage, client) {
        const guildConfig = client.guildConfig.get(oldMessage.guildId);
        if (!guildConfig) return;

        const messageLogChannel = (await oldMessage.guild.channels.fetch()).get(guildConfig.messageLogChannel)
        if (!messageLogChannel) return;

        if (!oldMessage.author || oldMessage.author.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const count = 1950;

        const Original = oldMessage.content.slice(0, count) + (oldMessage.content.length > 1950 ? " ..." : "");
        const Edited = newMessage.content.slice(0, count) + (newMessage.content.length > 1950 ? " ..." : "");

        const Log = new EmbedBuilder()
            .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.avatarURL({ dynamic: true, size: 512 }) })
            .setTitle(`Message edited in #${newMessage.channel.name}`)
            .setDescription([
                `**Before:** ${Original}`,
                `**[+After:](${newMessage.url})** ${Edited}`,
            ].join("\n").slice("0", "4096"))
            .setFooter({ text: `ID: ${newMessage.author.id}` })
            .setTimestamp()

        messageLogChannel.send({embeds: [Log]})
    }
}