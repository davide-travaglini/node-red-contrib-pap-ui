const { deferInit, resolveServer } = require('../widget-helpers')

module.exports = function (RED) {
    function UIPapChartNode (config) {
        RED.nodes.createNode(this, config)
        const node = this
        let server = null

        const maxPoints = Math.max(5, Number(config.maxPoints) || 60)

        deferInit(RED, node, config, (srv, ids) => {
            server = srv
            node._ids = ids

            node._dynConfig = {
                label:       config.name        || 'Chart',
                icon:        config.icon        || 'line-chart',
                accentColor: config.accentColor || 'blue',
                unit:        config.unit        || '',
                decimals:    config.decimals    ?? 1,
                maxPoints,
                driverLabel: config.driverLabel || '',
                gridW:       config.gridW       || 2,
                gridH:       config.gridH       || 1
            }

            // Restore any history already persisted on the server (context-backed).
            const existing = server.stateCache[node.id]
            node._history = (existing && Array.isArray(existing.history)) ? existing.history : []

            server.registerWidget({
                id: node.id, type: 'chart',
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
            if (msg.config && typeof msg.config === 'object') {
                Object.assign(node._dynConfig, msg.config)
                updated = true
            }

            const aliases = { name: 'label', color: 'accentColor' }
            const allowedProps = ['label', 'name', 'icon', 'accentColor', 'color', 'unit', 'decimals', 'driverLabel', 'gridW', 'gridH']

            for (const prop of allowedProps) {
                if (msg[prop] !== undefined) {
                    const targetKey = aliases[prop] || prop
                    node._dynConfig[targetKey] = msg[prop]
                    updated = true
                }
            }

            if (updated) {
                server.registerWidget({
                    id: node.id, type: 'chart',
                    subgroupId: node._ids.subgroupId,
                    groupId:    node._ids.groupId,
                    pageId:     node._ids.pageId,
                    order: config.order || 0,
                    config: node._dynConfig
                }, node)
                server.io.emit('pap:layout', server.buildLayoutPayload())
            }

            if (msg.payload !== undefined && msg.payload !== null) {
                const value = (typeof msg.payload === 'object') ? msg.payload.value : msg.payload
                if (value != null && !Number.isNaN(Number(value))) {
                    node._history.push({ t: msg.timestamp || Date.now(), v: Number(value) })
                    if (node._history.length > node._dynConfig.maxPoints) {
                        node._history.splice(0, node._history.length - node._dynConfig.maxPoints)
                    }
                }
                server.broadcastState(node.id, { value, history: node._history })
                node.status({ fill: 'blue', shape: 'dot', text: String(value) })
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

    RED.nodes.registerType('ui-pap-chart', UIPapChartNode)
}
