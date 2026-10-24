const { deferInit, resolveServer } = require('../widget-helpers')

module.exports = function (RED) {
    function UIPapLightNode (config) {
        RED.nodes.createNode(this, config)
        const node = this
        let server = null

        deferInit(RED, node, config, (srv, ids) => {
            server = srv
            node._ids = ids

            node._dynConfig = {
                label:         config.name          || 'Light',
                iconOn:        config.iconOn         || 'lightbulb-o',
                iconOff:       config.iconOff        || 'lightbulb-o',
                accentColor:   config.accentColor    || 'yellow',
                readOnly:      !!config.readOnly,
                confirmOff:    !!config.confirmOff,
                hasBrightness: !!config.hasBrightness,
                hasColor:      !!config.hasColor,
                driverLabel:   config.driverLabel    || '',
                gridW:         config.gridW          || 1,
                gridH:         config.gridH          || 1
            }

            server.registerWidget({
                id: node.id, type: 'light',
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
            const allowedProps = ['label', 'name', 'iconOn', 'iconOff', 'accentColor', 'color', 'readOnly', 'confirmOff', 'hasBrightness', 'hasColor', 'driverLabel', 'gridW', 'gridH']

            for (const prop of allowedProps) {
                if (msg[prop] !== undefined) {
                    const targetKey = aliases[prop] || prop
                    node._dynConfig[targetKey] = msg[prop]
                    updated = true
                }
            }

            if (updated) {
                server.registerWidget({
                    id: node.id, type: 'light',
                    subgroupId: node._ids.subgroupId,
                    groupId:    node._ids.groupId,
                    pageId:     node._ids.pageId,
                    order: config.order || 0,
                    config: node._dynConfig
                }, node)
                server.io.emit('pap:layout', server.buildLayoutPayload())
            }

            if (msg.payload !== undefined) {
                const current = server.stateCache[node.id] || {}
                // Only merge a plain object (shape expected by the UI) or a boolean
                // shorthand for on/off. Anything else (string/number/null/array) is
                // coerced to on/off rather than spread into state — spreading an
                // arbitrary primitive (e.g. a string) would otherwise inject
                // numeric-indexed keys into shared state and corrupt every other
                // connected client's view of this widget.
                const incoming =
                    typeof msg.payload === 'boolean'      ? { on: msg.payload } :
                    (msg.payload && typeof msg.payload === 'object' && !Array.isArray(msg.payload)) ? msg.payload :
                    { on: !!msg.payload }
                const state = { ...current, ...incoming }
                server.broadcastState(node.id, state)
                node.status({ fill: state.on ? 'yellow' : 'grey', shape: 'dot', text: state.on ? 'on' : 'off' })
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

    RED.nodes.registerType('ui-pap-light', UIPapLightNode)
}
