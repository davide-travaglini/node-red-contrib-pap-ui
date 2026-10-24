const bcrypt = require('bcryptjs')

const MAX_USERS = 10

module.exports = function (RED) {
    function UIPapAuthNode (config) {
        RED.nodes.createNode(this, config)
        const node = this

        const usernames = Array.isArray(config.usernames) ? config.usernames : []
        node.userMap = {}

        for (let i = 0; i < MAX_USERS; i++) {
            const username = (usernames[i] || '').trim()
            const password = node.credentials['password' + i]
            if (!username || !password) continue
            node.userMap[username] = bcrypt.hashSync(password, 10)
        }

        node.hasUsers = function () {
            return Object.keys(node.userMap).length > 0
        }

        node.verify = function (username, password) {
            if (!username || !password) return false
            const hash = node.userMap[username]
            if (!hash) return false
            return bcrypt.compareSync(password, hash)
        }
    }

    const credentials = {}
    for (let i = 0; i < MAX_USERS; i++) credentials['password' + i] = { type: 'password' }

    RED.nodes.registerType('ui-pap-auth', UIPapAuthNode, { credentials })
}
