const { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Client } = require("discord.js")
const { Configuration, OpenAIApi } = require("openai")
require('dotenv').config();

module.exports = {
    data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask anything from OpenAI ChatGPT version 3")
    .setDMPermission(false)
    .addStringOption((options) => options
        .setName("text")
        .setDescription("Provide any statement you want to ask!")
        .setRequired(true)
    ),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        await interaction.deferReply()

        interaction.editReply({ embeds: [new EmbedBuilder().setAuthor({ name: `${client.user.username} is generating response...`, iconURL: client.user.displayAvatarURL() })] })
        
        try {
            const configuration = new Configuration({
                apiKey: process.env.ChatGPT,
            })

            const openai = new OpenAIApi(configuration)

            const response = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: interaction.options.getString('text'),
                temperature: 0,
                max_tokens: 2048
            });
            
            const Embed = new EmbedBuilder()
            .setDescription(`**${interaction.options.getString("text")}**\n\n\`\`\`${response.data.choices[0].text}\`\`\``)
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp()
            .setFooter({ text: client.user.username })

            return interaction.editReply({ embeds: [Embed] })
        } catch (error) {
            if (error) console.log(error)

            return interaction.editReply({embeds: [new EmbedBuilder().setAuthor({ name: `Something went wrong... Please try again later!`, iconURL: client.user.displayAvatarURL() })]})
        }
    }
}