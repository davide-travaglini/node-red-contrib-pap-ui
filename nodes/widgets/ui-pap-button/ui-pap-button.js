const { deferInit, resolveServer } = require('../widget-helpers')

module.exports = function (RED) {
    function UIPapButtonNode (config) {
        RED.nodes.createNode(this, config)
        const node = this
        let server = null

        deferInit(RED, node, config, (srv, ids) => {
            server = srv
            node._ids = ids

            node._dynConfig = {
                label:       config.name        || 'Button',
                icon:        config.icon        || 'hand-pointer-o',
                accentColor: config.accentColor || 'blue',
                driverLabel: config.driverLabel || '',
                gridW:       config.gridW       || 1,
                gridH:       config.gridH       || 1
            }

            server.registerWidget({
                id: node.id, type: 'button',
                subgroupId: ids.subgroupId, groupId: ids.groupId, pageId: ids.pageId,
                order: config.order || 0,
                config: node._dynConfig
            }, node)
        })

        node.on('input', function (msg, send, done) {
            try {
                if (!server) server = resolveServer(RED, config)
                if (!server) return done()

                let updated = false
                const aliases = { name: 'label', color: 'accentColor' }
                const allowedProps = ['label', 'name', 'icon', 'accentColor', 'color', 'driverLabel', 'gridW', 'gridH']

                for (const prop of allowedProps) {
                    if (msg[prop] !== undefined) {
                        const targetKey = aliases[prop] || prop
                        node._dynConfig[targetKey] = msg[prop]
                        updated = true
                    }
                }

                if (updated) {
                    server.registerWidget({
                        id: node.id, type: 'button',
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

    RED.nodes.registerType('ui-pap-button', UIPapButtonNode)
}
