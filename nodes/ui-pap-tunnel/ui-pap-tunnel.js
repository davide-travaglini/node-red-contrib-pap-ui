module.exports = function (RED) {
    function UIPapTunnelNode (config) {
        RED.nodes.createNode(this, config)
        const node = this

        node.enabled = !!config.enabled
        node.domain  = (config.domain || '').trim()
        node.forceInsecure = !!config.forceInsecure

        let listener = null

        if (node.enabled) {
            const editorUnprotected = !RED.settings.adminAuth && RED.settings.httpAdminRoot !== false
            if (editorUnprotected && !node.forceInsecure) {
                node.status({ fill: 'red', shape: 'ring', text: 'blocked: editor unprotected' })
                node.error(
                    'PAP UI Tunnel: refusing to start. The Node-RED editor has no "adminAuth" ' +
                    'configured, so this tunnel would expose the ENTIRE Node-RED HTTP port ' +
                    '(including the flow editor, Function/Exec nodes, everything) to the public ' +
                    'internet. Set "adminAuth" or "httpAdminRoot: false" in settings.js, or ' +
                    'check "I understand the risk" on this node to start anyway.'
                )
                return
            }
            if (editorUnprotected) {
                node.warn(
                    'PAP UI Tunnel: starting with the editor unprotected ("I understand the ' +
                    'risk" is checked) — anyone with the tunnel URL can open and edit your flows.'
                )
            }

            const authtoken = node.credentials.authtoken
            if (!authtoken) {
                node.status({ fill: 'red', shape: 'ring', text: 'missing authtoken' })
                node.error('PAP UI Tunnel: no ngrok authtoken configured')
            } else {
                const ngrok = require('@ngrok/ngrok')
                const port  = RED.settings.uiPort || 1880

                node.status({ fill: 'yellow', shape: 'dot', text: 'connecting…' })

                ngrok.connect({
                    addr:      port,
                    authtoken: authtoken,
                    domain:    node.domain || undefined
                }).then(l => {
                    listener  = l
                    node.url  = l.url()
                    node.status({ fill: 'green', shape: 'dot', text: node.url })
                    node.log('PAP UI Tunnel active: ' + node.url)
                }).catch(err => {
                    node.status({ fill: 'red', shape: 'ring', text: 'error' })
                    node.error('PAP UI Tunnel failed to start: ' + err.message)
                })
            }
        }

        node.on('close', async function (done) {
            if (listener) {
                try { await listener.close() } catch (e) {}
            }
            done()
        })
    }

    RED.nodes.registerType('ui-pap-tunnel', UIPapTunnelNode, {
        credentials: { authtoken: { type: 'password' } }
    })
}
