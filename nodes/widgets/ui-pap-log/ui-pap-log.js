const { deferInit, resolveServer } = require('../widget-helpers')

module.exports = function (RED) {
    function UIPapLogNode (config) {
        RED.nodes.createNode(this, config)
        const node = this
        let server = null

        deferInit(RED, node, config, (srv, ids) => {
            server = srv
            node._ids = ids

            node._dynConfig = {
                label:       config.name     || 'Activity Log',
                icon:        config.icon     || 'list',
                maxEntries:  Number(config.maxEntries) || 10,
                driverLabel: config.driverLabel || '',
                gridW:       config.gridW       || 2,
                gridH:       config.gridH       || 2
            }

            server.registerWidget({
                id: node.id, type: 'log',
                subgroupId: ids.subgroupId, groupId: ids.groupId, pageId: ids.pageId,
                order: config.order || 0,
                config: node._dynConfig
            }, node)
        })

        // Purely global display (reads the server-wide action log) — no per-widget
        // state/input to speak of, only dynamic config overrides are meaningful here.
        node.on('input', function (msg, send, done) {
            try {
            if (!server) server = resolveServer(RED, config)
            if (!server) return done()

            let updated = false
            const aliases = { name: 'label' }
            const allowedProps = ['label', 'name', 'icon', 'maxEntries', 'driverLabel', 'gridW', 'gridH']

            for (const prop of allowedProps) {
                if (msg[prop] !== undefined) {
                    const targetKey = aliases[prop] || prop
                    node._dynConfig[targetKey] = msg[prop]
                    updated = true
                }
            }

            if (updated) {
                server.registerWidget({
                    id: node.id, type: 'log',
                    subgroupId: node._ids.subgroupId,
                    groupId:    node._ids.groupId,
                    pageId:     node._ids.pageId,
                    order: config.order || 0,
                    config: node._dynConfig
                }, node)
                server.io.emit('pap:layout', server.buildLayoutPayload())
            }
            done()
            } catch (err) {
                done(err)
            }
        })

        node.on('close', function (done) {
            if (server) server.unregisterWidget(node.id)
            done()
        })
    }

    RED.nodes.registerType('ui-pap-log', UIPapLogNode)
}
