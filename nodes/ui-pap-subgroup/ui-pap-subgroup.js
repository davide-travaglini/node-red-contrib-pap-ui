module.exports = function (RED) {
    function UIPapSubgroupNode (config) {
        RED.nodes.createNode(this, config)
        this.config = config
        this.name   = config.name || 'Subgroup'

        const groupNode = RED.nodes.getNode(config.group)
        const pageNode  = groupNode && RED.nodes.getNode(groupNode.config.page)
        const server    = pageNode  && RED.nodes.getNode(pageNode.config.server)

        if (server) {
            server.registerSubgroup(this)
        }

        this.on('close', function () {})
    }

    RED.nodes.registerType('ui-pap-subgroup', UIPapSubgroupNode)
}
