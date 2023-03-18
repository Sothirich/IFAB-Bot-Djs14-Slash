const { Schema, model } = require('mongoose')

module.exports = model("MemberLog", new Schema ({
    Guild: String,
    memberLogChannel: String,
    welcomeLogChannel: String,
    messageLogChannel: String,
    voiceLogChannel: String,
    memberRole: String,
    botRole: String
}))