require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js')
const { Guilds, GuildMembers, GuildMessages, GuildMessageReactions, MessageContent, GuildVoiceStates } = GatewayIntentBits
const { User, Message, GuildMember, ThreadMember } = Partials

const client = new Client({
    intents: [ Guilds, GuildMembers, GuildMessages, GuildMessageReactions, MessageContent, GuildVoiceStates ],
    partials: [ User, Message, GuildMember, ThreadMember ]
});

client.events = new Collection()
client.commands = new Collection()
client.subCommands = new Collection()
client.guildConfig = new Collection()
client.messageDelete = new Collection()

const { connect } = require('mongoose')
connect(process.env.Database, {})

const { loadEvents } = require('./Handlers/event');
loadEvents(client);

const { loadConfig } = require('./Functions/configLoader');
loadConfig(client);

const { loadDistube } = require('./Handlers/distube');
loadDistube(client);

client.login(process.env.token).then(() => {
    console.log(`Client logged in as ${client.user.username}`)
    client.user.setActivity(`With  ${client.guilds.cache.size} guild(s)`)
})