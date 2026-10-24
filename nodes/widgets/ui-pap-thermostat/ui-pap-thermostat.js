const { deferInit, resolveServer } = require('../widget-helpers')

module.exports = function (RED) {
    function UIPapThermostatNode (config) {
        RED.nodes.createNode(this, config)
        const node = this
        let server = null

        const modes = (config.modes || 'Manual,Automatic,Off')
            .split(',').map(s => s.trim()).filter(Boolean)

        deferInit(RED, node, config, (srv, ids) => {
            server = srv
            node._ids = ids

            node._dynConfig = {
                label:       config.name        || 'Thermostat',
                icon:        config.icon        || 'thermometer-half',
                accentColor: config.accentColor || 'orange',
                readOnly:    !!config.readOnly,
                unit:        config.unit     || '°C',
                min:         config.min      ?? 5,
                max:         config.max      ?? 35,
                step:        config.step     ?? 0.5,
                decimals:    config.decimals ?? 1,
                modes,
                driverLabel: config.driverLabel || '',
                gridW:       config.gridW       || 1,
                gridH:       config.gridH       || 1
            }

            server.registerWidget({
                id: node.id, type: 'thermostat',
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
            const allowedProps = ['label', 'name', 'icon', 'accentColor', 'color', 'readOnly', 'unit', 'min', 'max', 'step', 'decimals', 'modes', 'driverLabel', 'gridW', 'gridH']

            for (const prop of allowedProps) {
                if (msg[prop] !== undefined) {
                    const targetKey = aliases[prop] || prop
                    node._dynConfig[targetKey] = msg[prop]
                    updated = true
                }
            }

            if (updated) {
                server.registerWidget({
                    id: node.id, type: 'thermostat',
                    subgroupId: node._ids.subgroupId,
                    groupId:    node._ids.groupId,
                    pageId:     node._ids.pageId,
                    order: config.order || 0,
                    config: node._dynConfig
                }, node)
                server.io.emit('pap:layout', server.buildLayoutPayload())
            }

            // payload: { value: currentTemp, setPoint, mode }
            if (msg.payload !== undefined) {
                const current  = server.stateCache[node.id] || {}
                const incoming = typeof msg.payload === 'object' ? msg.payload : { value: msg.payload }
                const state    = { ...current, ...incoming }
                server.broadcastState(node.id, state)
                node.status({ fill: 'orange', shape: 'dot', text: `${state.value ?? '?'}${node._dynConfig.unit} / set ${state.setPoint ?? '?'}` })
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

    RED.nodes.registerType('ui-pap-thermostat', UIPapThermostatNode)
}
