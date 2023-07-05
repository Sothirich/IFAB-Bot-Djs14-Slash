const { Client, ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionsBitField, PermissionFlagsBits } = require("discord.js");
const lyricsFinder = require('lyrics-finder')

module.exports = {
    data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Complete music system.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ViewChannel)
    .addSubcommand((subCommand) => subCommand
        .setName('play')
        .setDescription("Play a song.")
        .addStringOption((options) => options
            .setName("song")
            .setDescription("Provide a name or URL of the song.")
            .setRequired(true)
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('skip')
        .setDescription("Skip the currently playing song.")
    )
    .addSubcommand((subCommand) => subCommand
        .setName('clear')
        .setDescription("Clear the queue.")
    )
    .addSubcommand((subCommand) => subCommand
        .setName('queue')
        .setDescription("Show the music queue.")
    )
    .addSubcommand((subCommand) => subCommand
        .setName('lyrics')
        .setDescription("Get song lyrics")
        .addStringOption((options) => options
            .setName("title")
            .setDescription("Provide the title of the song.")
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('shuffle')
        .setDescription("Shuffle the queue.")
    )
    .addSubcommand((subCommand) => subCommand
        .setName('forceplay')
        .setDescription("Play the song immediately without skipping songs.")
        .addStringOption((options) => options
            .setName("song")
            .setDescription("Provide a name or URL of the song.")
            .setRequired(true)
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('playnext')
        .setDescription("Queue the song after the current song.")
        .addStringOption((options) => options
            .setName("song")
            .setDescription("Provide a name or URL of the song.")
            .setRequired(true)
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('remove')
        .setDescription("Remove specific song(s).")
        .addNumberOption((options) => options
            .setName("index")
            .setDescription("Provide the position of the song.")
            .setMinValue(1)
            .setRequired(true)
        )
        .addNumberOption((options) => options
            .setName("toindex")
            .setDescription("Provide the last position of the song you want to remove.")
            .setMinValue(1)
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('volume')
        .setDescription("Alter the volume of the bot.")
        .addNumberOption((options) => options
            .setName("percentage")
            .setDescription("Provide a value between 1 and 100.")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('pause')
        .setDescription("Pause the currently playing song.")
    )
    .addSubcommand((subCommand) => subCommand
        .setName('resume')
        .setDescription("Resume the currently playing song.")
    )
    .addSubcommand((subCommand) => subCommand
        .setName('relatedsong')
        .setDescription("Add a Related Song.")
    )
    .addSubcommand((subCommand) => subCommand
        .setName('jump')
        .setDescription("Jump to specific position.")
        .addNumberOption((options) => options
            .setName("position")
            .setDescription("Provide the position of the song.")
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('loop')
        .setDescription("Toggle loop mode.")
        .addStringOption((options) => options
            .setName("mode")
            .setDescription("Provide loop mode.")
            .setRequired(true)
            .addChoices(
                { name: 'off', value: '0' },
                { name: 'song', value: '1' },
                { name: "queue", value: "2" }
            )
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('autoplay')
        .setDescription("Toggle autoplay mode.")
    )
    .addSubcommand((subCommand) => subCommand
        .setName('move')
        .setDescription("Move specific song to specific position.")
        .addNumberOption((options) => options
            .setName("fromindex")
            .setDescription("Provide the position of the song.")
            .setMinValue(1)
            .setRequired(true)
        )
        .addNumberOption((options) => options
            .setName("toindex")
            .setDescription("Provide the index you want to move to.")
            .setMinValue(1)
            .setRequired(true)
        )
    )
    .addSubcommand((subCommand) => subCommand
        .setName('nowplaying')
        .setDescription("Show info of the current song.")
    )
    .addSubcommand((subCommand) => subCommand
        .setName('leave')
        .setDescription("Disconnect the bot")
    )
    .addSubcommand((subCommand) => subCommand
        .setName('filter')
        .setDescription("Set the song filter.")
        .addStringOption((options) => options
            .setName("type")
            .setDescription("Provide filter type.")
            .setRequired(true)
            .addChoices(
                { name: "reset" , value: "reset" },
                { name: "8D" , value: "8D" },
                { name: "slowed" , value: "slowed" },
                { name: "bassboost" , value: "bassboost" },
                { name: "nightcore" , value: "nightcore" },
                { name: "normalizer" , value: "normalizer" },
                { name: "mono" , value: "mono" },
                { name: "stereo" , value: "stereo" },
            )
        )
    ),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        const { options, member, guild, channel } = interaction;
        const voiceChannel = member.voice.channel;
        
        if (!voiceChannel)
        return interaction.reply({ content: "You must be in a voice channel to use music commands.", ephemeral: true });
        
        if (!channel.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.ViewChannel))
        return interaction.reply({ content: `I do not have permission to view this channel <#${channel.id}>`, ephemeral: true });

        if (!voiceChannel.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.ViewChannel))
        return interaction.reply({ content: `I do not have permission to join this channel <#${voiceChannel.id}>.`, ephemeral: true });
        
        const menu = options.getSubcommand();
        const queue = await client.distube.getQueue(voiceChannel);
        
        if (guild.members.me.voice.channelId && voiceChannel.id !== guild.members.me.voice.channelId && queue)
            return interaction.reply({ content: `I'm already in <#${guild.members.me.voice.channelId}>`, ephemeral: true });

        if (!["lyrics", "play", "forceplay", "playnext", "leave"].includes(menu) && !queue) 
            return interaction.reply({ content: "There is no queue.", ephemeral: true });

        try {
            switch (menu) {
                case "play": {
                    await interaction.deferReply();
                    client.distube.play(member.voice.channel, options.getString("song"), {
                        member: member,
                        textChannel: channel,
                    });

                    return await interaction.deleteReply();
                }
                case "volume": {
                    let volume = options.getNumber("percentage")
                    queue.setVolume(volume)

                    return interaction.reply({ content: `Volume has been set to \`${volume}%\``, ephemeral: true });
                }
                case "queue": {
                    let currentPage = 0;
                    let length = queue.songs.length - 1;

                    let lastPage = 0;
                    if (length % 10 == 0) lastPage = Math.floor(length / 10);
                    else lastPage = (Math.floor(length / 10) + 1);

                    if (length == 0)
                        return interaction.reply({embeds: [new EmbedBuilder()
                                .setTitle(`🎶 Queue: 0`)
                                .setColor('#ED4245')
                                .setDescription(`__Now Playing:__\n${queue.songs.map(song => `**[${song.name}](${song.url})** | \`${song.formattedDuration}\` | \`Requested By: ${song.user.tag}\``).slice(0, 1).join("\n")}\n`)
                                .setFooter({text: 'Page: 0'})
                            ], ephemeral: true });

                    const embeds = [];
                        let k = 0;
                        for (let i = 0; i < queue.songs.length; i += 10) {
                            k += 10;
                            const info = queue.songs.map((song, id) => `**${id}**. **[${song.name}](${song.url})** | \`${song.formattedDuration}\` | \`Requested By: ${song.user.tag}\``).slice(i + 1, k + 1).join("\n");
                            const embed = new EmbedBuilder()
                                .setTitle(`🎶 Queue: ${queue.songs.length - 1}`)
                                .setColor('#ED4245')
                                .setDescription(`__Now Playing:__\n${queue.songs.map(song => `**[${song.name}](${song.url})** | \`${song.formattedDuration}\` | \`Requested By: ${song.user.tag}\``).slice(0, 1).join("\n")}\n\n__Up Next:__\n${info}\n`)
                                .setFooter({text: `Page: ${k/10} of ${lastPage}`})
                        embeds.push(embed);
                    }

                    return interaction.reply({embeds: [embeds[currentPage]], fetchReply: true }).then(_msg => {
                            _msg.react('⬅️').then(() => _msg.react('➡️'));
                            setTimeout(() => interaction.deleteReply().catch(e => console.log(e)), 60 * 1000);

                            const filter = (reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === member.id;
                            const collector = _msg.createReactionCollector({ filter, time: 60000 });

                            collector.on('collect', async (reaction, user) => {
                                reaction.users.remove(user)

                                if (reaction.emoji.name === '⬅️') {
                                    if (currentPage == 0) currentPage = lastPage - 1;
                                    else currentPage--;
                                    return interaction.editReply({embeds: [embeds[currentPage]], fetchReply: true });
                                } else if (reaction.emoji.name === '➡️') {
                                    if (currentPage == lastPage - 1) currentPage = 0;
                                    else currentPage++;
                                    return interaction.editReply({embeds: [embeds[currentPage]], fetchReply: true });
                                }
                            });
                        });
                }
                case "skip": {
                    queue.skip()
                    return interaction.reply({ content: "⏩ Song has been skipped.", ephemeral: true });
                }
                case "pause": {
                    if (queue.paused) {
                        queue.resume()
                        return interaction.reply({ content: "⏯ Song has been resumed for you xD.", ephemeral: true });
                    }
                    queue.pause()

                    return interaction.reply({ content: "⏸ Song has been paused.", ephemeral: true });
                }
                case "resume": {
                    if (queue.paused) {
                        queue.resume()

                        return interaction.reply({ content: "⏯ Song has been resumed.", ephemeral: true });
                    } else {
                        return interaction.reply({ content: "🚫 The queue is not paused!", ephemeral: true });
                    }
                }
                case "clear": {
                    queue.stop()

                    return interaction.reply({ content: `⏹ Cleared the Queue.`, ephemeral: true });
                }
                case "shuffle": {
                    queue.shuffle();

                    return interaction.reply({ content: "🔀 Song has been shuffled.", ephemeral: true });
                }
                case "relatedsong": {
                    await interaction.deferReply({ ephemeral: true });
                    await queue.addRelatedSong();
                    
                    return interaction.editReply({ content: `🔄 **${queue.songs[queue.songs.length-1].name}** has been added.`, ephemeral: true });
                }
                case "jump": {
                    await interaction.deferReply({ ephemeral: true });
                    if (queue.songs.length - 1 == 0) return interaction.editReply({ content: "There's no song to jump to.", ephemeral: true });

                    let position = options.getNumber("position");
                    if (position > queue.songs.length - 1) position = queue.songs.length - 1;

                    let song = queue.songs[position];
                    queue.jump(position)
                    
                    return interaction.editReply({ content: `*️⃣ Jumped successfully.\n Loaded: **${song.name}**`, ephemeral: true });
                }
                case "loop": {
                    let Mode2 = options.getString("mode");
                    queue.setRepeatMode(parseInt(Mode2));

                    return interaction.reply({ content: `🔁 Loop is set to **${Mode2 == 1 ? "Song-Loop" : Mode2 == 2 ? "Queue-Loop" : "Off"}**`, ephemeral: true });
                }
                case "autoplay": {
                    let autoplay = queue.toggleAutoplay();

                    return interaction.reply({ content: `🔂 Autoplay is set to ${autoplay ? "On" : "Off"}`, ephemeral: true });
                }
                case "remove": {
                    await interaction.deferReply({ ephemeral: true });
                    if (queue.songs.length - 1 == 0) return interaction.editReply({ content: "There's no song to remove.", ephemeral: true });
                    let index = options.getNumber("index");
                    let lastIndex = options.getNumber("toindex");

                    let song = queue.songs[index];

                    if (lastIndex > queue.songs.length - 1) lastIndex = queue.songs.length - 1;
                    let amount = lastIndex - index + 1;

                    queue.songs.splice(index, amount>1 ? amount: 1);
                    const text = amount>1? `🔽 Successfully removed ${amount} song${amount > 1 ? "s" : ""}.`: `🔽 Successfully removed **${song.name}**.`
                    
                    return interaction.editReply({ content: `${text}`, ephemeral: true });
                }
                case "move": {
                    await interaction.deferReply({ ephemeral: true });
                    let index = options.getNumber("fromindex");
                    let newIndex = options.getNumber("toindex");

                    if (index > queue.songs.length - 1)
                    return interaction.editReply({ content: `Song in index ${index} does not exist!`, ephemeral: true });

                    if (index == newIndex)
                    return interaction.editReply({ content: `You want to move index ${index} to the same index!??`, ephemeral: true });

                    let song = queue.songs[index];
                    queue.songs.splice(index, 1);
                    queue.addToQueue(song, newIndex);

                    return interaction.editReply({ content: `🔽 Successfully moved **${song.name}** to index ${index}`, ephemeral: true });
                }
                case "lyrics": {
                    await interaction.deferReply({ ephemeral: true });
                    let songTitle = options.getString("title")
                    if (songTitle) {
                        let lyrics = await lyricsFinder("", songTitle) || "None"

                        if (lyrics === `None`)
                            return interaction.editReply({ content: `Lyrics not found...`, ephemeral: true })
                        else return interaction.editReply({
                            embeds: [new EmbedBuilder()
                                .setTitle(`${songTitle} - Lyrics`)
                                .setDescription(lyrics)
                            ]
                            , ephemeral: true });
                    }

                    if (!guild.members.me.voice.channelId || !queue)
                        return interaction.editReply({ content: `There's no song playing in the queue.`, ephemeral: true });
                    
                    let currentsong = queue.songs[0];
                    let filterTitle = currentsong.name.toLowerCase().replace(/[\[\]()|+]*(music|audio|official|lyrics|lyric|video|mv|slowed|reverb|tik|tok|tiktok|\+)?[\[\]()|+]*/g, "")
                    let lyrics = await lyricsFinder("", filterTitle.trim()) || "None";

                    if (lyrics === `None`)
                        return interaction.editReply({ content: `Lyrics not found...`, ephemeral: true })
                    else return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setTitle(`${currentsong.name}`)
                            .setURL(currentsong.url)
                            .setThumbnail(currentsong.thumbnail)
                            .setDescription(lyrics)
                        ], ephemeral: true });
                }
                case "nowplaying": {
                    await interaction.deferReply({ ephemeral: true });
                    let currentsong = queue.songs[0];
                    const status = queue => `Volume: \`${queue.volume}%\` | Filter: \`${queue.filters.names.join(', ') || "Off"}\` | Loop: \`${queue.repeatMode ? (queue.repeatMode === 2 ? 'All Queue' : 'This Song') : 'Off'}\` | Autoplay: \`${queue.autoplay ? 'On' : 'Off'}\``;
                    const status1 = queue => `Requested by: **${currentsong.user}** | Duration: \`${queue.formattedCurrentTime} / ${currentsong.formattedDuration}\``;

                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setTitle(`${currentsong.name}`)
                            .setURL(currentsong.url)
                            .addFields(
                                {
                                    name: "QueueStatus",
                                    value: `${status(queue)}`
                                },
                                {
                                    name: "SongStatus",
                                    value: `${status1(queue)}`
                                },
                                {
                                    name: "Download Song:",
                                    value: `>>> [\`Click here\`](${currentsong.streamURL})`
                                },
                            )
                            .setThumbnail(currentsong.thumbnail)
                            .setFooter({ text: `${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) })
                            .setTimestamp()
                        ], ephemeral: true });
                }
                case "forceplay": {
                    await interaction.deferReply();
                    client.distube.play(member.voice.channel, options.getString("song"), {
                        member: member,
                        textChannel: channel,
                        skip: true
                    });
                    
                    return await interaction.deleteReply();
                }
                case "leave": {
                    if (!guild.members.me.voice.channelId)
                        return interaction.reply({ content: `I'm not in the channel. So how can you kick me?!`, ephemeral: true });

                    client.distube.voices.leave(voiceChannel);

                    return interaction.reply({ content: `Leaving the <#${guild.members.me.voice.channelId}>`, ephemeral: true });
                }
                case "playnext": {
                    await interaction.deferReply();
                    client.distube.play(member.voice.channel, options.getString("song"),{ 
                        textChannel: channel, 
                        member: member, 
                        position: 1 
                    });
                    return await interaction.deleteReply();
                }
                case "filter": {
                    let filter = options.getString("type");

                    if (filter === 'reset')
                        queue.filters.clear()
                    else {
                        queue.filters.clear()
                        queue.filters.add(filter)
                    }

                    return interaction.reply({ content: `🔁 Filter is set to **${options.getString("type")}**`, ephemeral: true });
                }
            }
        } catch (error) {
            console.log(error);
        }
    }
}