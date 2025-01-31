const { EmbedBuilder, AttachmentBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js')
const { profileImage } = require('discord-arts')

module.exports = {
    data: new ContextMenuCommandBuilder()
    .setName("View Profile")
    .setType(ApplicationCommandType.User),
    // .setDescription("View user's information.")
    // .setDMPermission(false)
    // .addUserOption((options) => options
    //     .setName("member")
    //     .setDescription("View a member's information. Leave empty to view your own.")
    // ),
    /**
     * 
     * @param {ContextMenuCommandInteraction} interaction 
     */
    async execute(interaction) {
        await interaction.deferReply()
        const member = interaction.targetMember

        if(member.user.bot) return interaction.editReply({
            embeds: [new EmbedBuilder().setDescription("At this moment, bots are not supported for this command.")],
            flags: 64
        })

        try {
            const fetchedMembers = await interaction.guild.members.fetch();
            const profileBuffer = await profileImage(member.id, {
                borderColor: ['#f90257', '#043a92'],
            })
            const imageAttachment = new AttachmentBuilder(profileBuffer, {
                name: 'profile.png'
            })

            const joinPosition = Array.from(fetchedMembers
                .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
                .keys())
            .indexOf(member.id) + 1

            const topRoles = member.roles.cache
            .sort((a, b) => b.position - a.position)
            .map(role => role)
            .slice(0, 3);

            const userBadges = member.user.flags.toArray()
            const joinTime = parseInt(member.joinedTimestamp / 1000)
            const createdTime = parseInt(member.user.createdTimestamp / 1000)

            const Booster = member.premiumSince ? "<:discordboost7:1084163565419761754>" : "X"

            const Embed = new EmbedBuilder()
            .setAuthor({
                name: `${member.user.tag} | General Information`, 
                iconURL: member.displayAvatarURL()
            })
            .setColor(member.displayColor)
            .setDescription(`On <t:${joinTime}:D>, ${member.user.username} joined as the **${addSuffix(joinPosition)}** member of the guild.`)
            .setImage("attachment://profile.png")
            .addFields([
                {name: "Badges", value: `${addBadges(userBadges).join("")}`, inline: true},
                {name: "Booster", value: `${Booster}`, inline: true},
                {name: "Top Roles", value: `${topRoles.join("").replace(`<@${interaction.guildId}>`)}`, inline: false},
                {name: "Created", value: `<t:${createdTime}:R>`, inline: true},
                {name: "Joined", value: `<t:${joinTime}:R>`, inline: true},
                {name: "Identifier", value: `${member.id}`, inline: false},
                {name: "Avatar", value: `[Link](${member.displayAvatarURL()})`, inline: true},
                {name: "Banner", value: `[Link](${(await member.user.fetch()).bannerURL()})`, inline: true},
            ])

            interaction.editReply({embeds: [Embed], files: [imageAttachment]})
        } catch (error) {
            interaction.editReply({content: "An error eccured: Contact The Developer: <@393582885468372992>"})
            throw error
        }
    }
}

function addSuffix(number) {
    if (number % 100 >= 11 && number % 100 <= 13) return number + "th"
    switch (number % 10) {
        case 1: return number + "st"
        case 2: return number + "nd"
        case 2: return number + "rd"
    }
    return number + "th"
}

function addBadges(badgeNames) {
    if(!badgeNames.length) return ["X"];
    const badgeMap = {
        "ActiveDeveloper": "<:activedeveloper:1084163561888157797>",
        "BugHunterLevel1": "<:discordbughunter1:1084163570482290769>",
        "BugHunterLevel2": "<:discordbughunter2:1084163573930012835>",
        "PremiumEarlySupporter": "<:discordearlysupporter:1084163575880359936>",
        "Partner": "<:discordpartner:1084163585200111636>",
        "Staff": "<:discordstaff:1084163588337438790>",
        "HypeSquadOnlineHouse1": "<:hypesquadbravery:1084163593689370624>", // bravery
        "HypeSquadOnlineHouse2": "<:hypesquadbrilliance:1084163597128704123>", // brilliance
        "HypeSquadOnlineHouse3": "<:hypesquadbalance:1084163591621582848>", // balance
        "Hypesquad": "<:hypesquadevents:1084163600605782096>",
        "CertifiedModerator": "<:discordmod:1084163578938015796>",
        "VerifiedDeveloper": "<:discordbotdev:1084163567395295315> ",
    };
  
    return badgeNames.map(badgeName => badgeMap[badgeName] || '❔');
}