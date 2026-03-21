module.exports = function (RED) {
    function UIPapGroupNode (config) {
        RED.nodes.createNode(this, config)
        this.config = config
        this.name   = config.name || 'Group'

        const pageNode = RED.nodes.getNode(config.page)
        const server   = pageNode && RED.nodes.getNode(pageNode.config.server)

        if (server) {
            server.registerGroup(this)
        }

        this.on('close', function () {})
    }

    RED.nodes.registerType('ui-pap-group', UIPapGroupNode)
}
