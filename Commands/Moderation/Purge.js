const { SlashCommandBuilder, PermissionFlagsBits, ChatInputCommandInteraction, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Deletes a specified number of messages from a channel or a target.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addNumberOption((options) => options
        .setName("amount")
        .setDescription("Select the amount of messages to delete from a channel or a target.")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((options) => options
        .setName("target")
        .setDescription("Select a target to clear their message.")
    ),
    /**
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const { channel, options} = interaction;

        const Amount = options.getNumber("amount");
        const Target = options.getMember("target");

        const Messages = await channel.messages.fetch();

        const Embed = new EmbedBuilder()

        if (Target) { 
            let  i = 0;
            let filtered = [];
            Messages.filter((m) => {
                if (m.author.id === Target.id && Amount > i) {
                    filtered.push(m);
                    i++;
                }
            })

            channel.bulkDelete(filtered, true).then(messages => {
                interaction.reply({
                    embeds: [Embed.setDescription(`🧹 Cleared ${messages.size} message(s) from ${Target}.`)], 
                    flags: 64
                })
            })
        } else {
            channel.bulkDelete(Amount, true).then(messages => {
                interaction.reply({
                    embeds: [Embed.setDescription(`🧹 Cleared ${messages.size} message(s) from this channel.`)],
                    flags: 64
                })
            })
        }
    }
}