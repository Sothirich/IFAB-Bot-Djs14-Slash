const { DisTube, Playlist, Song } = require('distube')
const { EmbedBuilder } = require('discord.js')
const { SpotifyPlugin } = require('@distube/spotify')
const { SoundCloudPlugin } = require('@distube/soundcloud')
const { YtDlpPlugin } = require('@distube/yt-dlp')
const { DeezerPlugin } = require("@distube/deezer");
const { YouTubePlugin } =  require("@distube/youtube");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
require('dotenv').config();

const YOUTUBE_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const ytDlpBinary = path.join(
    __dirname,
    "..",
    "node_modules",
    "@distube",
    "yt-dlp",
    "bin",
    process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"
);

function createYtDlpCookieFile() {
    const cookies = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "cookies.json"), "utf8"));
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "ifab-ytdlp-"));
    const cookieFile = path.join(directory, "cookies.txt");
    const normalize = value => String(value ?? "").replace(/[\t\r\n]/g, "");
    const rows = cookies
        .filter(cookie => cookie.domain && cookie.name)
        .map(cookie => [
            cookie.httpOnly ? `#HttpOnly_${normalize(cookie.domain)}` : normalize(cookie.domain),
            cookie.hostOnly ? "FALSE" : "TRUE",
            normalize(cookie.path || "/"),
            cookie.secure ? "TRUE" : "FALSE",
            cookie.session ? "0" : String(Math.floor(Number(cookie.expirationDate) || 0)),
            normalize(cookie.name),
            normalize(cookie.value),
        ].join("\t"));

    fs.writeFileSync(cookieFile, `# Netscape HTTP Cookie File\n${rows.join("\n")}\n`, { mode: 0o600 });
    return { cookieFile, directory };
}

function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        const process = spawn(ytDlpBinary, args, { windowsHide: true });
        let stdout = "";
        let stderr = "";

        process.stdout.on("data", chunk => {
            stdout += chunk;
        });
        process.stderr.on("data", chunk => {
            stderr += chunk;
        });
        process.on("error", reject);
        process.on("close", code => {
            if (code === 0) resolve(stdout);
            else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
        });
    });
}

async function resolvePlaylistWithYtDlp(plugin, url, options) {
    const cookie = createYtDlpCookieFile();
    try {
        const stdout = await runYtDlp([
            url,
            "--cookies",
            cookie.cookieFile,
            "--dump-single-json",
            "--no-warnings",
            "--skip-download",
            "--simulate",
            "--flat-playlist",
        ]);
        const info = JSON.parse(stdout);

        if (!Array.isArray(info.entries) || info.entries.length === 0) {
            throw new Error("yt-dlp could not find playable videos in this playlist");
        }

        const songs = info.entries
            .filter(entry => entry?.id && (entry.webpage_url || entry.original_url || entry.url))
            .map(entry => new Song({
                plugin,
                source: entry.extractor || "youtube",
                playFromSource: true,
                id: String(entry.id),
                name: entry.title || entry.fulltitle || "Unknown title",
                url: entry.webpage_url || entry.original_url || entry.url,
                isLive: Boolean(entry.is_live),
                duration: entry.is_live ? 0 : Number(entry.duration) || 0,
                thumbnail: entry.thumbnail || entry.thumbnails?.[0]?.url,
                uploader: {
                    name: entry.uploader,
                    url: entry.uploader_url,
                },
                views: entry.view_count,
                likes: entry.like_count,
            }, options));

        if (songs.length === 0) throw new Error("yt-dlp could not find playable videos in this playlist");

        return new Playlist({
            source: info.extractor || "youtube",
            songs,
            id: String(info.id),
            name: info.title || "YouTube playlist",
            url: info.webpage_url || url,
            thumbnail: info.thumbnail || info.thumbnails?.[0]?.url,
        }, options);
    } finally {
        fs.rmSync(cookie.directory, { recursive: true, force: true });
    }
}

function getYtDlpAudioUrl(url) {
    return new Promise((resolve, reject) => {
        let requested = false;
        const server = http.createServer((request, response) => {
            if (requested || request.url !== "/audio") {
                response.writeHead(404).end();
                return;
            }

            requested = true;
            clearTimeout(startTimeout);
            let cookie;
            try {
                cookie = createYtDlpCookieFile();
            } catch (error) {
                console.error(`[yt-dlp] Could not prepare YouTube cookies: ${error.message}`);
            }
            const ytDlp = spawn(ytDlpBinary, [
                url,
                ...(cookie ? ["--cookies", cookie.cookieFile] : []),
                "--no-playlist",
                "--no-warnings",
                "--no-progress",
                // Use the PO-token provider's supported client instead of android_vr.
                "--extractor-args",
                "youtube:player_client=mweb",
                "--js-runtimes",
                "node",
                "--format",
                "bestaudio/best",
                "--output",
                "-",
            ], { windowsHide: true });
            let stderr = "";
            let cleanedUp = false;
            const close = () => server.close();
            const cleanup = () => {
                if (!cookie || cleanedUp) return;
                cleanedUp = true;
                fs.rmSync(cookie.directory, { recursive: true, force: true });
            };

            response.writeHead(200, { "Content-Type": "audio/webm" });
            ytDlp.stdout.pipe(response);
            ytDlp.stderr.on("data", chunk => {
                stderr += chunk;
            });
            ytDlp.on("error", error => {
                console.error(`[yt-dlp] ${error.message}`);
                response.destroy(error);
                close();
                cleanup();
            });
            ytDlp.on("close", code => {
                if (code && stderr) console.error(`[yt-dlp] ${stderr.trim()}`);
                response.end();
                close();
                cleanup();
            });
            request.on("close", () => {
                if (!ytDlp.killed) ytDlp.kill();
                close();
            });
        });
        const startTimeout = setTimeout(() => server.close(), 30_000);

        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (!address || typeof address === "string") {
                server.close();
                reject(new Error("yt-dlp fallback could not create a local stream server"));
                return;
            }
            server.unref();
            resolve(`http://127.0.0.1:${address.port}/audio`);
        });
    });
}

// Keep YouTube search handled by @distube/youtube, but fall back to yt-dlp when
// YouTube changes a player response and ytdl-core cannot find stream formats.
class ResilientYouTubePlugin extends YouTubePlugin {
    async resolve(url, options) {
        try {
            return await super.resolve(url, options);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack || "" : "";

            if (!/Unsupported YouTube Playlist response|@distube[\\/]ytpl/i.test(`${message}\n${stack}`)) {
                throw error;
            }

            console.warn(`[YouTube] ${message}. Retrying playlist resolution with yt-dlp.`);
            return resolvePlaylistWithYtDlp(this, url, options);
        }
    }

    async getStreamURL(song) {
        try {
            return await super.getStreamURL(song);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            if (!/playable formats|UNPLAYABLE_FORMATS/i.test(message)) {
                throw error;
            }

            console.warn(`[YouTube] ${message}. Retrying with yt-dlp.`);
            return getYtDlpAudioUrl(song.url);
        }
    }
}

function loadDistube(client) {
    client.distube = new DisTube(client, {
        emitAddListWhenCreatingQueue: false,
        emitAddSongWhenCreatingQueue: false,
        savePreviousSongs: false,
        ffmpeg: {
            // YouTube's signed media URLs can reject FFmpeg's default Lavf user agent.
            args: {
                input: {
                    user_agent: YOUTUBE_USER_AGENT,
                },
            },
        },
        plugins: [
            new ResilientYouTubePlugin({
                cookies: JSON.parse(fs.readFileSync("cookies.json")),
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
            // Keep the manually installed nightly binary; startup updates only install stable.
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
        .on("ffmpegDebug", message => {
            if (/error|forbidden|invalid|http|tls/i.test(message)) {
                console.error(`[FFmpeg] ${message}`);
            }
        })
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
            queue.autoplay = false;
            queue.volume = 100;
        })
};

module.exports = { loadDistube }
