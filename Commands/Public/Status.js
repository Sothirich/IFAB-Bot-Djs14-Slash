const { Client, ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { connection } = require("mongoose");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Displays the status of  the client and Database Connection."),
    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */

    async execute(interaction, client) {
        const Embed = new EmbedBuilder()
        .setDescription([
            `**Client**: \`🟢 ONLINE\` = \`${client.ws.ping}ms\``,
            `**Uptime**: <t:${parseInt(client.readyTimestamp / 1000)}:R>\n`,
            `**Database**: \`${switchTo(connection.readyState)}\``,
        ].join("\n"))

        interaction.reply({embeds: [Embed]})
    }
}

function switchTo (value) {
    var status = " ";
    switch (value) {
        case 0: {
            status = `🔴 DISCONNECTED`
            break;
        }
        case 1: {
            status = `🟢 CONNECTED`
            break;
        }
        case 2: {
            status = `🟠 CONNECTING`
            break;
        }
        case 3: {
            status = `🟡 DISCONNECTING`
            break;
        }
    }

    return status;
}