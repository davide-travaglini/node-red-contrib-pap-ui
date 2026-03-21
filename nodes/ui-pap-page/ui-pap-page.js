module.exports = function (RED) {
    function UIPapPageNode (config) {
        RED.nodes.createNode(this, config)
        this.config = config
        this.name   = config.name || 'Page'

        const server = RED.nodes.getNode(config.server)
        if (server) {
            server.registerPage(this)
            // Register area reference if provided (optional metadata)
            if (config.area) {
                const areaNode = RED.nodes.getNode(config.area)
                if (areaNode) server.registerArea(areaNode)
            }
        }

        this.on('close', function () {})
    }

    RED.nodes.registerType('ui-pap-page', UIPapPageNode)
}
