const { loadCommands } = require('../../Handlers/command')

module.exports = {
    name: "clientReady",
    once: true,
    execute(client) {
        console.log("The client is now ready.")

        loadCommands(client)
    }
}