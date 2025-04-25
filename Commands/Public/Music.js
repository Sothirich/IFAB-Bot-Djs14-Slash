
const {
    Client,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionsBitField,
    PermissionFlagsBits
} = require("discord.js");
const lyricsFinder = require('lyrics-finder');

/**
 * Helper to check bot permissions in a channel.
 */
function hasBotPermissions(guild, channel, perms) {
    return guild.members.me.permissionsIn(channel).has(perms);
}

/**
 * Helper to build a queue embed page.
 */
function buildQueueEmbed(queue, page, perPage = 10) {
    const start = page * perPage + 1;
    const end = Math.min(start + perPage, queue.songs.length);
    const upNext = queue.songs
        .slice(start, end)
        .map((song, idx) =>
            `**${start + idx}**. **[${song.name}](${song.url})** | \`${song.formattedDuration}\` | \`Requested By: ${song.user.tag}\``)
        .join("\n") || "No more songs in queue.";

    return new EmbedBuilder()
        .setTitle(`🎶 Queue: ${queue.songs.length - 1}`)
        .setColor('#ED4245')
        .setDescription(
            `__Now Playing:__\n${formatSong(queue.songs[0])}\n\n__Up Next:__\n${upNext}`
        )
        .setFooter({ text: `Page: ${page + 1}` });
}

/**
 * Helper to format a song line.
 */
function formatSong(song) {
    return `**[${song.name}](${song.url})** | \`${song.formattedDuration}\` | \`Requested By: ${song.user.tag}\``;
}

/**
 * Helper to send error embed.
 */
async function sendError(interaction, error) {
    const errorEmbed = new EmbedBuilder()
        .setColor("#ED4245")
        .setDescription(`⛔ Alert: ${error}`);
    if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ embeds: [errorEmbed], flags: 64 });
    }
    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("music")
        .setDescription("Complete music system.")
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel)
        .addSubcommand(sub => sub.setName('play').setDescription("Play a song.").addStringOption(opt => opt.setName("song").setDescription("Provide a name or URL of the song.").setRequired(true)))
        .addSubcommand(sub => sub.setName('skip').setDescription("Skip the currently playing song."))
        .addSubcommand(sub => sub.setName('clear').setDescription("Clear the queue."))
        .addSubcommand(sub => sub.setName('queue').setDescription("Show the music queue."))
        .addSubcommand(sub => sub.setName('lyrics').setDescription("Get song lyrics").addStringOption(opt => opt.setName("title").setDescription("Provide the title of the song.")))
        .addSubcommand(sub => sub.setName('shuffle').setDescription("Shuffle the queue."))
        .addSubcommand(sub => sub.setName('forceplay').setDescription("Play the song immediately without skipping songs.").addStringOption(opt => opt.setName("song").setDescription("Provide a name or URL of the song.").setRequired(true)))
        .addSubcommand(sub => sub.setName('playnext').setDescription("Queue the song after the current song.").addStringOption(opt => opt.setName("song").setDescription("Provide a name or URL of the song.").setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription("Remove specific song(s).").addNumberOption(opt => opt.setName("index").setDescription("Provide the position of the song.").setMinValue(1).setRequired(true)).addNumberOption(opt => opt.setName("toindex").setDescription("Provide the last position of the song you want to remove.").setMinValue(1)))
        .addSubcommand(sub => sub.setName('volume').setDescription("Alter the volume of the bot.").addNumberOption(opt => opt.setName("percentage").setDescription("Provide a value between 1 and 100.").setMinValue(1).setMaxValue(100).setRequired(true)))
        .addSubcommand(sub => sub.setName('pause').setDescription("Pause the currently playing song."))
        .addSubcommand(sub => sub.setName('resume').setDescription("Resume the currently playing song."))
        .addSubcommand(sub => sub.setName('relatedsong').setDescription("Add a Related Song."))
        .addSubcommand(sub => sub.setName('jump').setDescription("Jump to specific position.").addNumberOption(opt => opt.setName("position").setDescription("Provide the position of the song.").setMinValue(1).setRequired(true)))
        .addSubcommand(sub => sub.setName('loop').setDescription("Toggle loop mode.").addStringOption(opt => opt.setName("mode").setDescription("Provide loop mode.").setRequired(true).addChoices({ name: 'off', value: '0' }, { name: 'song', value: '1' }, { name: "queue", value: "2" })))
        .addSubcommand(sub => sub.setName('autoplay').setDescription("Toggle autoplay mode."))
        .addSubcommand(sub => sub.setName('move').setDescription("Move specific song to specific position.").addNumberOption(opt => opt.setName("fromindex").setDescription("Provide the position of the song.").setMinValue(1).setRequired(true)).addNumberOption(opt => opt.setName("toindex").setDescription("Provide the index you want to move to.").setMinValue(1).setRequired(true)))
        .addSubcommand(sub => sub.setName('nowplaying').setDescription("Show info of the current song."))
        .addSubcommand(sub => sub.setName('leave').setDescription("Disconnect the bot"))
        .addSubcommand(sub => sub.setName('filter').setDescription("Set the song filter.").addStringOption(opt => opt.setName("type").setDescription("Provide filter type.").setRequired(true).addChoices(
            { name: "reset", value: "reset" },
            { name: "8D", value: "8D" },
            { name: "slowed", value: "slowed" },
            { name: "bassboost", value: "bassboost" },
            { name: "nightcore", value: "nightcore" },
            { name: "normalizer", value: "normalizer" },
            { name: "mono", value: "mono" },
            { name: "stereo", value: "stereo" },
        ))),

    /**
     * @param {ChatInputCommandInteraction} interaction
     * @param {Client} client
     */
    async execute(interaction, client) {
        const { options, member, guild, channel } = interaction;
        const voiceChannel = member.voice.channel;

        // Permission checks
        if (!voiceChannel) {
            return interaction.reply({ content: "You must be in a voice channel to use music commands.", flags: 64 });
        }
        if (!hasBotPermissions(guild, channel, [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) {
            return interaction.reply({ content: `I do not have permission to view or send messages in <#${channel.id}>`, flags: 64 });
        }
        if (!hasBotPermissions(guild, voiceChannel, [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect])) {
            return interaction.reply({ content: `I do not have permission to view/join <#${voiceChannel.id}>.`, flags: 64 });
        }

        const menu = options.getSubcommand();
        let queue;
        try {
            queue = await client.distube.getQueue(voiceChannel);
        } catch (e) {
            queue = null;
        }

        if (guild.members.me.voice.channelId && voiceChannel.id !== guild.members.me.voice.channelId && queue) {
            return interaction.reply({ content: `I'm already in <#${guild.members.me.voice.channelId}>`, flags: 64 });
        }
        // Only require queue for commands that need it
        const commandsRequireQueue = [
            "skip", "clear", "queue", "shuffle", "relatedsong", "jump", "loop", "autoplay",
            "remove", "move", "nowplaying", "volume", "filter"
        ];
        if (commandsRequireQueue.includes(menu) && (!queue || !queue.songs || queue.songs.length === 0)) {
            return interaction.reply({ content: "There is no queue.", flags: 64 });
        }

        try {
            switch (menu) {
                case "play": {
                    await interaction.deferReply();
                    await client.distube.play(voiceChannel, options.getString("song"), {
                        member,
                        textChannel: channel,
                    });
                    await interaction.deleteReply();
                    break;
                }
                case "volume": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    const volume = options.getNumber("percentage");
                    queue.setVolume(volume);
                    await interaction.reply({ content: `Volume has been set to \`${volume}%\``, flags: 64 });
                    break;
                }
                case "queue": {
                    if (!queue || !queue.songs || queue.songs.length === 0) {
                        return interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle(`🎶 Queue: 0`)
                                    .setColor('#ED4245')
                                    .setDescription(`No songs in the queue.`)
                                    .setFooter({ text: 'Page: 0' })
                            ],
                            flags: 64
                        });
                    }
                    if (queue.songs.length === 1) {
                        return interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle(`🎶 Queue: 0`)
                                    .setColor('#ED4245')
                                    .setDescription(`__Now Playing:__\n${formatSong(queue.songs[0])}\n`)
                                    .setFooter({ text: 'Page: 0' })
                            ],
                            flags: 64
                        });
                    }
                    let currentPage = 0;
                    const perPage = 10;
                    const lastPage = Math.ceil((queue.songs.length - 1) / perPage);

                    const embeds = [];
                    for (let i = 0; i < lastPage; i++) {
                        embeds.push(buildQueueEmbed(queue, i, perPage));
                    }

                    const msg = await interaction.reply({ embeds: [embeds[currentPage]], fetchReply: true });
                    await msg.react('⬅️');
                    await msg.react('➡️');

                    const filter = (reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === member.id;
                    const collector = msg.createReactionCollector({ filter, time: 60000 });

                    collector.on('collect', async (reaction, user) => {
                        await reaction.users.remove(user);
                        if (reaction.emoji.name === '⬅️') {
                            currentPage = (currentPage === 0) ? lastPage - 1 : currentPage - 1;
                        } else if (reaction.emoji.name === '➡️') {
                            currentPage = (currentPage === lastPage - 1) ? 0 : currentPage + 1;
                        }
                        await interaction.editReply({ embeds: [embeds[currentPage]] });
                    });

                    setTimeout(() => interaction.deleteReply().catch(() => {}), 60 * 1000);
                    break;
                }
                case "skip": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    if (!queue.autoplay && queue.songs.length === 1) {
                        queue.stop();
                        await interaction.reply({ content: "⏩ Song has been skipped. And the queue now is empty!", flags: 64 });
                    } else {
                        queue.skip();
                        await interaction.reply({ content: "⏩ Song has been skipped.", flags: 64 });
                    }
                    break;
                }
                case "pause": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    if (queue.paused) {
                        queue.resume();
                        await interaction.reply({ content: "⏯ Song has been resumed.", flags: 64 });
                    } else {
                        queue.pause();
                        await interaction.reply({ content: "⏸ Song has been paused.", flags: 64 });
                    }
                    break;
                }
                case "resume": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    if (queue.paused) {
                        queue.resume();
                        await interaction.reply({ content: "⏯ Song has been resumed.", flags: 64 });
                    } else {
                        await interaction.reply({ content: "🚫 The queue is not paused!", flags: 64 });
                    }
                    break;
                }
                case "clear": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    queue.stop();
                    await interaction.reply({ content: `⏹ Cleared the Queue.`, flags: 64 });
                    break;
                }
                case "shuffle": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    queue.shuffle();
                    await interaction.reply({ content: "🔀 Song has been shuffled.", flags: 64 });
                    break;
                }
                case "relatedsong": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    await interaction.deferReply({ flags: 64 });
                    await queue.addRelatedSong();
                    await interaction.editReply({ content: `🔄 **${queue.songs[queue.songs.length - 1].name}** has been added.`, flags: 64 });
                    break;
                }
                case "jump": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    await interaction.deferReply({ flags: 64 });
                    if (queue.songs.length === 1) {
                        return interaction.editReply({ content: "There's no song to jump to.", flags: 64 });
                    }
                    let position = options.getNumber("position");
                    position = Math.min(position, queue.songs.length - 1);
                    const song = queue.songs[position];
                    queue.jump(position);
                    await interaction.editReply({ content: `*️⃣ Jumped successfully.\nLoaded: **${song.name}**`, flags: 64 });
                    break;
                }
                case "loop": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    const mode = options.getString("mode");
                    queue.setRepeatMode(parseInt(mode));
                    const modeText = mode === "1" ? "Song-Loop" : mode === "2" ? "Queue-Loop" : "Off";
                    await interaction.reply({ content: `🔁 Loop is set to **${modeText}**`, flags: 64 });
                    break;
                }
                case "autoplay": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    const autoplay = queue.toggleAutoplay();
                    await interaction.reply({ content: `🔂 Autoplay is set to ${autoplay ? "On" : "Off"}`, flags: 64 });
                    break;
                }
                case "remove": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    await interaction.deferReply({ flags: 64 });
                    if (queue.songs.length === 1) {
                        return interaction.editReply({ content: "There's no song to remove.", flags: 64 });
                    }
                    let index = options.getNumber("index");
                    let lastIndex = options.getNumber("toindex") || index;
                    lastIndex = Math.min(lastIndex, queue.songs.length - 1);
                    const amount = lastIndex - index + 1;
                    const song = queue.songs[index];
                    queue.songs.splice(index, amount > 1 ? amount : 1);
                    const text = amount > 1
                        ? `🔽 Successfully removed ${amount} song${amount > 1 ? "s" : ""}.`
                        : `🔽 Successfully removed **${song.name}**.`;
                    await interaction.editReply({ content: text, flags: 64 });
                    break;
                }
                case "move": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    await interaction.deferReply({ flags: 64 });
                    const index = options.getNumber("fromindex");
                    const newIndex = options.getNumber("toindex");
                    if (index > queue.songs.length - 1) {
                        return interaction.editReply({ content: `Song in index ${index} does not exist!`, flags: 64 });
                    }
                    if (index === newIndex) {
                        return interaction.editReply({ content: `You want to move index ${index} to the same index!??`, flags: 64 });
                    }
                    const song = queue.songs[index];
                    queue.songs.splice(index, 1);
                    queue.addToQueue(song, newIndex);
                    await interaction.editReply({ content: `🔽 Successfully moved **${song.name}** to index ${newIndex}`, flags: 64 });
                    break;
                }
                case "lyrics": {
                    await interaction.deferReply({ flags: 64 });
                    let songTitle = options.getString("title");
                    let lyrics = "None";
                    if (songTitle) {
                        lyrics = await lyricsFinder("", songTitle) || "None";
                        if (lyrics === "None") {
                            return interaction.editReply({ content: `Lyrics not found...`, flags: 64 });
                        }
                        return interaction.editReply({
                            embeds: [new EmbedBuilder().setTitle(`${songTitle} - Lyrics`).setDescription(lyrics)],
                            flags: 64
                        });
                    }
                    if (!guild.members.me.voice.channelId || !queue || !queue.songs || queue.songs.length === 0) {
                        return interaction.editReply({ content: `There's no song playing in the queue.`, flags: 64 });
                    }
                    const currentsong = queue.songs[0];
                    const filterTitle = currentsong.name.toLowerCase().replace(/[\[\]()|+]*(music|audio|official|lyrics|lyric|video|mv|slowed|reverb|tik|tok|tiktok|\+)?[\[\]()|+]*/g, "");
                    lyrics = await lyricsFinder("", filterTitle.trim()) || "None";
                    if (lyrics === "None") {
                        return interaction.editReply({ content: `Lyrics not found...`, flags: 64 });
                    }
                    return interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(`${currentsong.name}`)
                                .setURL(currentsong.url)
                                .setThumbnail(currentsong.thumbnail)
                                .setDescription(lyrics)
                        ],
                        flags: 64
                    });
                }
                case "nowplaying": {
                    if (!queue || !queue.songs || queue.songs.length === 0) {
                        return interaction.reply({ content: "There is no song currently playing.", flags: 64 });
                    }
                    await interaction.deferReply({ flags: 64 });
                    const currentsong = queue.songs[0];
                    const status = q => `Volume: \`${q.volume}%\` | Filter: \`${q.filters.names.join(', ') || "Off"}\` | Loop: \`${q.repeatMode ? (q.repeatMode === 2 ? 'All Queue' : 'This Song') : 'Off'}\` | Autoplay: \`${q.autoplay ? 'On' : 'Off'}\``;
                    const status1 = q => `Requested by: **${currentsong.user}** | Duration: \`${q.formattedCurrentTime} / ${currentsong.formattedDuration}\``;
                    await interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(`${currentsong.name}`)
                                .setURL(currentsong.url)
                                .addFields(
                                    { name: "QueueStatus", value: status(queue) },
                                    { name: "SongStatus", value: status1(queue) },
                                    { name: "Download Song:", value: `>>> [\`Click here\`](${currentsong.streamURL})` }
                                )
                                .setThumbnail(currentsong.thumbnail)
                                .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) })
                                .setTimestamp()
                        ],
                        flags: 64
                    });
                    break;
                }
                case "forceplay": {
                    await interaction.deferReply();
                    const length = queue && queue.songs ? queue.songs.length : 0;
                    await client.distube.play(voiceChannel, options.getString("song"), {
                        member,
                        textChannel: channel,
                        position: 1
                    });
                    if (queue && length >= 1) {
                        queue.skip();
                    }
                    await interaction.deleteReply();
                    break;
                }
                case "leave": {
                    if (!guild.members.me.voice.channelId) {
                        return interaction.reply({ content: `I'm not in the channel. So how can you kick me?!`, flags: 64 });
                    }
                    client.distube.voices.leave(guild);
                    await interaction.reply({ content: `Leaving the <#${guild.members.me.voice.channelId}>`, flags: 64 });
                    break;
                }
                case "playnext": {
                    await interaction.deferReply();
                    await client.distube.play(voiceChannel, options.getString("song"), {
                        textChannel: channel,
                        member,
                        position: 1
                    });
                    await interaction.deleteReply();
                    break;
                }
                case "filter": {
                    if (!queue) return sendError(interaction, "No queue found.");
                    const filter = options.getString("type");
                    queue.filters.clear();
                    if (filter !== 'reset') {
                        queue.filters.add(filter);
                    }
                    await interaction.reply({ content: `🔁 Filter is set to **${filter}**`, flags: 64 });
                    break;
                }
                default:
                    await sendError(interaction, "Unknown subcommand.");
            }
        } catch (error) {
            console.error(error);
            await sendError(interaction, error.message || error);
        }
    }
};
