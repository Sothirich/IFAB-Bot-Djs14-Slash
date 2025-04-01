const { DisTube } = require('distube')
const { EmbedBuilder } = require('discord.js')
const { SpotifyPlugin } = require('@distube/spotify')
const { SoundCloudPlugin } = require('@distube/soundcloud')
const { YtDlpPlugin } = require('@distube/yt-dlp')
const { DeezerPlugin } = require("@distube/deezer");
const { YouTubePlugin } =  require("@distube/youtube");
const fs = require("fs");
require('dotenv').config();

function loadDistube(client) {
    client.distube = new DisTube(client, {
        emitAddListWhenCreatingQueue: false,
        emitAddSongWhenCreatingQueue: false,
        savePreviousSongs: false,
        plugins: [
            new YouTubePlugin({
                cookies: JSON.parse(fs.readFileSync("cookies.json")),
                ytdlOptions: {
                    agent: {
                        pipelining: 5,
                        maxRedirections: 0,
                        localAddress: "127.0.0.1",
                    },
                }
            }),
            new SpotifyPlugin({
                api: {
                    clientId: process.env.SpotifyID,
                    clientSecret: process.env.SpotifySecret,
                    topTracksCountry: "KH",
                },
            }),
            new SoundCloudPlugin(),
            new DeezerPlugin(),
            new YtDlpPlugin({ update: false }),
        ],
        customFilters: {
            "8D": "apulsator=hz=0.08",
            "slowed": "aresample=48000,asetrate=48000*0.8",
            "bassboost": "bass=g=10",
            "nightcore": "aresample=48000,asetrate=48000*1.25",
            "normalizer": "dynaudnorm=f=200",
            "mono": "pan=mono|c0=.5c0+.5c1",
            "stereo": "pan=stereo|c0=.5c0+.5c1|c1=.5c2+.5c3",
        }
    });

    const status = (queue) => `Volume: \`${queue.volume}%\` | Filter: \`${queue.filters.names.join(', ') || "Off"}\` | Loop: \`${queue.repeatMode ? queue.repeatMode == 2 ? "All Queue" : "This Song" : "Off"}\` | Autoplay: \`${queue.autoplay ? "On" : "Off"}\``;
    
    client.distube
        .on('playSong', (queue, song) =>queue.textChannel.send({
            embeds: [
                new EmbedBuilder()
                .setTitle("Playing :notes: " + song.name)
                .setURL(song.url)
                .setColor('#ED4245')
                .addFields(
                    {
                        name: "Duration",
                        value: `\`${song.formattedDuration}\``
                    },
                    {
                        name: "QueueStatus",
                        value: `${status(queue)}`
                    },
                )
                .setThumbnail(song.thumbnail)
                .setFooter({ text: `Requested by: ${song.user.tag}`, iconURL: song.user.displayAvatarURL({ dynamic: true }) })
            ]
        })
        .then(msg => {
            client.messageDelete.set(queue.textChannel.guildId, {
                messageId: msg.id
            })
        })
        )

        .on("noRelated", queue => queue.textChannel.send("Cannot find any related songs.")
            .then(msg => { setTimeout(() => msg.delete().catch(e => console.log(e)), 5000) })
        )

        .on('addSong', (queue, song) =>queue.textChannel.send({
            embeds: [new EmbedBuilder()
                .setTitle("Added :thumbsup: " + song.name)
                .setURL(song.url)
                .setColor("#ED4245")
                .addFields(
                    {
                        name: `${queue.songs.length - 1} Songs in the Queue`,
                        value: `Duration: \`${queue.formattedDuration}\``
                    },
                    {
                        name: "Duration",
                        value: `\`${song.formattedDuration}\``
                    },
                )
                .setThumbnail(song.thumbnail)
                .setFooter(
                    { 
                        text: `Requested by: ${song.user.tag}`, 
                        iconURL: song.user.displayAvatarURL({ dynamic: true }) 
                    }
                )
            ]
        }).then(msg => { setTimeout(() => msg.delete().catch(e => console.log(e)), 10000) }))

        .on("playList", (queue, playlist, song) => queue.textChannel.send({
            embeds: [new EmbedBuilder()
                .setTitle("Playing Playlist :notes: " + playlist.name + ` - \`[${playlist.songs.length} songs]\``)
                .setURL(playlist.url)
                .setColor("#ED4245")
                .addFields(
                    {
                        name: "Current Track:",
                        value: `[${song.name}](${song.url})`
                    },
                    {
                        name: "Duration",
                        value: `\`${playlist.formattedDuration}\``
                    },
                    {
                        name: `${queue.songs.length} Songs in the Queue`,
                        value: `Duration: \`${format(queue.duration * 1000)}\``
                    },
                )
                .setThumbnail(playlist.thumbnail.url)
                .setFooter({ text: `Requested by: ${song.user.tag}`, iconURL: song.user.displayAvatarURL({ dynamic: true }) })
            ]
        }).then(msg => { setTimeout(() => msg.delete().catch(e => console.log(e)), (song.duration + "000")) }))
        
        .on('addList', (queue, playlist) => queue.textChannel.send({
            embeds: [new EmbedBuilder()
                .setTitle("Added Playlist :thumbsup: " + playlist.name + ` - \`[${playlist.songs.length} songs]\``)
                .setURL(playlist.url)
                .setColor("#ED4245")
                .addFields(
                    {
                        name: "Duration",
                        value: `\`${playlist.formattedDuration}\``
                    },
                    {
                        name: `${queue.songs.length - 1} Songs in the Queue`,
                        value: `Duration: \`${queue.formattedDuration}\``
                    },
                )
                .setThumbnail(playlist.thumbnail.url)
            ]
        }).then(msg => { setTimeout(() => msg.delete().catch(e => console.log(e)), 20000) })
        )

        .on('error', (e, queue, song) => {
            queue.textChannel.send(`🛑 An ERROR encountered:\n ${e.toString().slice(0, 1974)}`);
        })

        .on('finishSong', queue => {
            const messageDelete = client.messageDelete.get(queue.textChannel.guildId)

            if (messageDelete) queue.textChannel.messages.fetch(messageDelete.messageId)
            .then(fetchedMsg => {fetchedMsg.delete()})
            .catch(console.error);

            client.messageDelete.clear();
        })

        .on('deleteQueue', queue => {
            const messageDelete = client.messageDelete.get(queue.textChannel.guildId)

            if (messageDelete) queue.textChannel.messages.fetch(messageDelete.messageId)
            .then(fetchedMsg => {fetchedMsg.delete()})
            .catch(console.error);
            
            client.messageDelete.clear();
        })

        .on('empty', queue => queue.textChannel.send('Voice channel is empty! Leaving the channel...')
            .then(msg => { setTimeout(() => msg.delete().catch(e => console.log(e)), 5000) })
        )

        .on("initQueue", queue => {
            queue.autoplay = true;
            queue.volume = 100;
        })
};

module.exports = { loadDistube }