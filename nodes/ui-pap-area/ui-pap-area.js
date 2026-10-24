module.exports = function (RED) {
    function UIPapAreaNode (config) {
        RED.nodes.createNode(this, config)
        this.config = config
        this.name   = config.name || 'Area'

        const server = RED.nodes.getNode(config.server)
        if (server) {
            server.registerArea(this)
        }

        this.on('close', function (done) {
            if (server) server.unregisterArea(this.id)
            done()
        })
    }

    RED.nodes.registerType('ui-pap-area', UIPapAreaNode)
}
