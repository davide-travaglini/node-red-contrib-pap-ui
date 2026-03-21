const path    = require('path')
const fs      = require('fs')
const express = require('express')

module.exports = function (RED) {
    const distPath = path.join(__dirname, '..', '..', 'resources', 'dist')

    // ── Singleton tracking (one Socket.IO server per Node-RED process) ───────
    let io                = null
    let currentSockPath   = null
    let connectionHandler = null
    const registeredBasePaths = new Set()

    function getIO (socketPath) {
        if (io && currentSockPath === socketPath) return io
        if (io) { try { io.close() } catch (e) {} }
        const { Server } = require('socket.io')
        io = new Server(RED.server, {
            path:        socketPath,
            cors:        { origin: '*' },
            serveClient: false
        })
        currentSockPath = socketPath
        return io
    }

    function registerRoutes (basePath, socketPath, theme, title, accentColor) {
        if (registeredBasePaths.has(basePath)) return
        registeredBasePaths.add(basePath)

        // ── Static assets (JS/CSS chunks) ─────────────────────────────────────
        RED.httpNode.use(basePath + '/assets',
            express.static(path.join(distPath, 'assets'), { maxAge: '1y' }))

        // ── index.html with runtime config injected ────────────────────────────
        function serveIndex (_req, res) {
            try {
                let html = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8')
                const injection =
                    `<base href="${basePath}/">\n` +
                    `<script>window.__PAP__=${JSON.stringify({ basePath: basePath + '/', socketPath, theme, title, accentColor })}</script>\n`
                html = html.replace('<head>', '<head>\n' + injection)
                res.type('html').send(html)
            } catch (e) {
                res.status(503).send(
                    '<pre>PAP UI: index.html not found.\nRun: npm install &amp;&amp; npm run build</pre>'
                )
            }
        }

        // Serve index.html at all SPA routes (no redirect — avoids loop)
        RED.httpNode.get(basePath,        serveIndex)
        RED.httpNode.get(basePath + '/',  serveIndex)
        RED.httpNode.get(basePath + '/*', serveIndex)

        // ── REST API ───────────────────────────────────────────────────────────
        RED.httpNode.get(basePath + '/api/layout', (_req, res) => {
            res.json(activeServerNode ? activeServerNode.buildLayoutPayload() : { areas: [], pages: [] })
        })

        RED.httpNode.get(basePath + '/api/state', (_req, res) => {
            res.json(activeServerNode ? activeServerNode.stateCache : {})
        })

        RED.httpNode.get(basePath + '/api/scenes', (_req, res) => {
            res.json(activeServerNode ? activeServerNode.scenes : [])
        })

        RED.httpNode.post(basePath + '/api/scenes', express.json(), (req, res) => {
            if (!activeServerNode) return res.status(503).json({ error: 'server not ready' })
            const scene = req.body
            scene.id = scene.id || `scene-${Date.now()}`
            const idx = activeServerNode.scenes.findIndex(s => s.id === scene.id)
            if (idx >= 0) activeServerNode.scenes[idx] = scene
            else          activeServerNode.scenes.push(scene)
            activeServerNode.io.emit('pap:scenes', activeServerNode.scenes)
            res.json(scene)
        })

        RED.httpNode.delete(basePath + '/api/scenes/:id', (req, res) => {
            if (!activeServerNode) return res.status(503).json({ error: 'server not ready' })
            activeServerNode.scenes = activeServerNode.scenes.filter(s => s.id !== req.params.id)
            activeServerNode.io.emit('pap:scenes', activeServerNode.scenes)
            res.json({ ok: true })
        })
    }

    // ── Active server reference (last deployed wins) ─────────────────────────
    let activeServerNode = null

    // ── Node Constructor ─────────────────────────────────────────────────────
    function UIPapServerNode (config) {
        RED.nodes.createNode(this, config)
        const node = this

        const rawPath    = (config.path || 'pap/ui').replace(/^\/|\/$/g, '')
        node.theme       = config.theme       || 'dark'
        node.title       = config.title       || 'PAP UI'
        node.accentColor = config.accentColor || '#3dd28d'
        node.basePath    = '/' + rawPath
        node.socketPath  = node.basePath + '/socket.io'

        // Layout tree: areas[], pages[] (pages have areaId, groups, subgroups, widgets)
        node.layout         = { areas: {}, pages: {} }
        node.stateCache     = {}
        node.widgetRegistry = {}
        node.scenes         = []

        node.io = getIO(node.socketPath)
        registerRoutes(node.basePath, node.socketPath, node.theme, node.title, node.accentColor)
        activeServerNode = node

        node.status({ fill: 'green', shape: 'dot', text: node.basePath + '/' })

        // Remove previous connection handler to avoid stacking on re-deploy
        if (connectionHandler) node.io.removeListener('connection', connectionHandler)
        connectionHandler = function (socket) {
            // Always read from activeServerNode so re-deploys don't break existing sockets
            socket.emit('pap:layout', activeServerNode?.buildLayoutPayload() ?? { areas: [], pages: [] })
            socket.emit('pap:state',  activeServerNode?.stateCache ?? {})
            socket.emit('pap:scenes', activeServerNode?.scenes ?? [])

            socket.on('pap:action', (msg) => {
                const widgetNode = activeServerNode?.widgetRegistry?.[msg.widgetId]
                if (widgetNode) {
                    widgetNode.send({ payload: msg.payload, topic: msg.topic || '' })
                }
            })
        }
        node.io.on('connection', connectionHandler)

        // Notify already-connected clients of the new layout after re-deploy
        node.io.emit('pap:layout', node.buildLayoutPayload())
        node.io.emit('pap:state',  node.stateCache)

        node.on('close', function (done) {
            if (activeServerNode === node) activeServerNode = null
            done()
        })
    }

    // ── Public API for child nodes ────────────────────────────────────────────

    UIPapServerNode.prototype.registerArea = function (areaNode) {
        const existing = this.layout.areas[areaNode.id] || {}
        this.layout.areas[areaNode.id] = {
            ...existing,
            id:    areaNode.id,
            name:  areaNode.name,
            order: areaNode.config.order || 0
        }
    }

    UIPapServerNode.prototype.registerPage = function (pageNode) {
        const existing = this.layout.pages[pageNode.id] || {}
        this.layout.pages[pageNode.id] = {
            ...existing,
            id:          pageNode.id,
            name:        pageNode.name,
            icon:        pageNode.config.icon        || '',
            order:       pageNode.config.order       || 0,
            areaId:      pageNode.config.area        || null,
            isHome:      !!pageNode.config.isHome,
            gridColumns: pageNode.config.gridColumns || 4,
            groups:      existing.groups || {}
        }
    }

    UIPapServerNode.prototype.registerGroup = function (groupNode) {
        const pageId = groupNode.config.page
        if (!this.layout.pages[pageId])
            this.layout.pages[pageId] = { id: pageId, groups: {} }
        const page     = this.layout.pages[pageId]
        const existing = page.groups[groupNode.id] || {}
        page.groups[groupNode.id] = {
            ...existing,
            id:        groupNode.id,
            name:      groupNode.name,
            icon:      groupNode.config.icon  || '',
            order:     groupNode.config.order || 0,
            subgroups: existing.subgroups || {}
        }
    }

    UIPapServerNode.prototype.registerSubgroup = function (subgroupNode) {
        const groupId  = subgroupNode.config.group
        const groupNode = RED.nodes.getNode(groupId)
        if (!groupNode) return
        const pageId   = groupNode.config.page

        if (!this.layout.pages[pageId])
            this.layout.pages[pageId] = { id: pageId, groups: {} }
        const page = this.layout.pages[pageId]

        if (!page.groups[groupId])
            page.groups[groupId] = { id: groupId, subgroups: {} }
        const group    = page.groups[groupId]
        const existing = group.subgroups[subgroupNode.id] || {}

        group.subgroups[subgroupNode.id] = {
            ...existing,
            id:      subgroupNode.id,
            name:    subgroupNode.name,
            icon:    subgroupNode.config.icon  || '',
            order:   subgroupNode.config.order || 0,
            widgets: existing.widgets || {}
        }
    }

    UIPapServerNode.prototype.registerWidget = function (def, widgetNode) {
        const { id, pageId, groupId, subgroupId, type, order, config } = def

        if (!this.layout.pages[pageId])
            this.layout.pages[pageId] = { id: pageId, groups: {} }
        const page = this.layout.pages[pageId]

        if (!page.groups[groupId])
            page.groups[groupId] = { id: groupId, subgroups: {} }
        const group = page.groups[groupId]

        if (!group.subgroups[subgroupId])
            group.subgroups[subgroupId] = { id: subgroupId, widgets: {} }

        group.subgroups[subgroupId].widgets[id] = { id, type, order: order || 0, config }
        this.widgetRegistry[id] = widgetNode
    }

    UIPapServerNode.prototype.unregisterWidget = function (id) {
        delete this.widgetRegistry[id]
        for (const page of Object.values(this.layout.pages))
            for (const group of Object.values(page.groups || {}))
                for (const subgroup of Object.values(group.subgroups || {}))
                    delete subgroup.widgets[id]
        delete this.stateCache[id]
    }

    UIPapServerNode.prototype.broadcastState = function (widgetId, payload) {
        this.stateCache[widgetId] = payload
        this.io.emit('pap:update', { widgetId, payload })
    }

    UIPapServerNode.prototype.buildLayoutPayload = function () {
        const areas = Object.values(this.layout.areas)
            .sort((a, b) => (a.order || 0) - (b.order || 0))

        const pages = Object.values(this.layout.pages)
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(p => ({
                ...p,
                groups: Object.values(p.groups || {})
                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                    .map(g => ({
                        ...g,
                        subgroups: Object.values(g.subgroups || {})
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map(sg => ({
                                ...sg,
                                widgets: Object.values(sg.widgets || {})
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                            }))
                    }))
            }))

        return { areas, pages }
    }

    RED.nodes.registerType('ui-pap-server', UIPapServerNode)
}
