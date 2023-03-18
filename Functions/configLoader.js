const configDatabase = require('../Schemas/MemberLog')

async function loadConfig(client) {
    (await configDatabase.find()).forEach((doc) => {
        client.guildConfig.set(doc.Guild, {
            memberLogChannel: doc.memberLogChannel,
            welcomeLogChannel: doc.welcomeLogChannel,
            messageLogChannel: doc.messageLogChannel,
            voiceLogChannel: doc.voiceLogChannel,
            memberRole: doc.memberRole,
            botRole: doc.botRole
        });
    })

    return console.log("Loaded Guild configs to the Collection.")
}

module.exports = { loadConfig }