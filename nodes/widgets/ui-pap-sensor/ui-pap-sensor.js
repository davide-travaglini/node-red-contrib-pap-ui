const { deferInit, resolveServer } = require('../widget-helpers')

module.exports = function (RED) {
    function UIPapSensorNode (config) {
        RED.nodes.createNode(this, config)
        const node = this
        let server = null

        deferInit(RED, node, config, (srv, ids) => {
            server = srv
            node._ids = ids

            node._dynConfig = {
                label:       config.name        || 'Sensor',
                unit:        config.unit        || '',
                icon:        config.icon        || 'tachometer',
                accentColor: config.accentColor || 'green',
                readOnly:    config.readOnly !== false,
                min:         config.min      ?? 0,
                max:         config.max      ?? 100,
                step:        config.step     ?? 1,
                decimals:    config.decimals ?? 0,
                driverLabel: config.driverLabel || '',
                gridW:       config.gridW       || 1,
                gridH:       config.gridH       || 1
            }

            server.registerWidget({
                id: node.id, type: 'sensor',
                subgroupId: ids.subgroupId, groupId: ids.groupId, pageId: ids.pageId,
                order: config.order || 0,
                config: node._dynConfig
            }, node)
        })

        node.on('input', function (msg) {
            if (!server) server = resolveServer(RED, config)
            if (!server) return

            let updated = false
            if (msg.config && typeof msg.config === 'object') {
                Object.assign(node._dynConfig, msg.config)
                updated = true
            }

            const aliases = { name: 'label', color: 'accentColor' }
            const allowedProps = ['label', 'name', 'unit', 'icon', 'accentColor', 'color', 'readOnly', 'min', 'max', 'step', 'decimals', 'driverLabel', 'gridW', 'gridH']
            
            for (const prop of allowedProps) {
                if (msg[prop] !== undefined) {
                    const targetKey = aliases[prop] || prop
                    node._dynConfig[targetKey] = msg[prop]
                    updated = true
                }
            }

            if (updated) {
                server.registerWidget({
                    id: node.id, type: 'sensor',
                    subgroupId: node._ids.subgroupId,
                    groupId:    node._ids.groupId,
                    pageId:     node._ids.pageId,
                    order: config.order || 0,
                    config: node._dynConfig
                }, node)
                server.io.emit('pap:layout', server.buildLayoutPayload())
            }

            if (msg.payload !== undefined) {
                const value = typeof msg.payload === 'object' ? msg.payload : { value: msg.payload }
                server.broadcastState(node.id, value)
                node.status({ fill: 'blue', shape: 'dot', text: String(value.value ?? msg.payload) })
            }
        })

        node.on('close', function (done) {
            if (server) server.unregisterWidget(node.id)
            done()
        })
    }

    RED.nodes.registerType('ui-pap-sensor', UIPapSensorNode)
}
