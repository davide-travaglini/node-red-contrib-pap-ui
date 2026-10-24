const path    = require('path')
const fs      = require('fs')
const express = require('express')
const session = require('express-session')

module.exports = function (RED) {
    const distPath = path.join(__dirname, '..', '..', 'resources', 'dist')

    function loginPageHtml (basePath, title, error) {
        return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — Login</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#1a1a1e;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#eee}
  form{background:#26262b;padding:32px;border-radius:12px;width:280px;box-shadow:0 8px 24px rgba(0,0,0,.4)}
  h1{margin:0 0 20px;font-size:18px;text-align:center}
  input{width:100%;padding:10px;margin-bottom:12px;border-radius:6px;border:1px solid #444;
        background:#1a1a1e;color:#eee;box-sizing:border-box}
  button{width:100%;padding:10px;border-radius:6px;border:none;background:#3dd28d;
         color:#0a0a0a;font-weight:600;cursor:pointer}
  .err{color:#ff6b6b;font-size:13px;margin:-4px 0 12px;text-align:center}
</style></head><body>
<form method="POST" action="${basePath}/api/login">
  <h1>${title}</h1>
  ${error ? `<div class="err">Invalid username or password</div>` : ''}
  <input type="text" name="username" placeholder="Username" autofocus required>
  <input type="password" name="password" placeholder="Password" required>
  <button type="submit">Log in</button>
</form>
</body></html>`
    }

    // ── Singleton tracking (one Socket.IO server per Node-RED process) ───────
    let io                = null
    let currentSockPath   = null
    let connectionHandler = null
    let sharedSession     = null
    const registeredBasePaths = new Set()

    // Single shared express-session instance, used both as HTTP middleware and
    // (via io.engine.use) to populate socket.request.session for Socket.IO auth.
    function getSession () {
        if (!sharedSession) {
            sharedSession = session({
                secret:            RED.settings.credentialSecret || 'pap-ui-session-secret',
                resave:            false,
                saveUninitialized: false,
                cookie:            { sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }
            })
        }
        return sharedSession
    }

    function getIO (socketPath) {
        if (io && currentSockPath === socketPath) return io
        // NOTE: deliberately NOT calling io.close() here. Engine.IO's close()
        // unconditionally calls httpServer.close() even when the httpServer was
        // supplied externally (as RED.server is here) — that would shut down
        // Node-RED's entire shared HTTP server, not just this socket path, the
        // moment a ui-pap-server's URL path changes across a re-deploy. The old
        // engine instance is simply dropped; it stops receiving requests once
        // Express routes the new path to the new instance instead.
        const { Server } = require('socket.io')
        io = new Server(RED.server, {
            path:        socketPath,
            cors:        { origin: '*' },
            serveClient: false
        })
        io.engine.use(getSession())
        io.use((socket, next) => {
            const authNode = activeServerNode ? activeServerNode.authNode : null
            if (!authNode || !authNode.hasUsers()) return next()
            if (socket.request.session && socket.request.session.papUser) return next()
            next(new Error('unauthorized'))
        })
        currentSockPath = socketPath
        return io
    }

    function registerRoutes (basePath, socketPath, theme, title, accentColor) {
        if (registeredBasePaths.has(basePath)) return
        registeredBasePaths.add(basePath)

        // ── Session (always mounted; a no-op unless an ui-pap-auth node is wired
        // to the active ui-pap-server — checked dynamically in requireAuth below,
        // so toggling auth on/off across re-deploys doesn't require re-registering
        // routes) ────────────────────────────────────────────────────────────────
        RED.httpNode.use(basePath, getSession())

        function getAuthNode () {
            return activeServerNode ? activeServerNode.authNode : null
        }

        function requireAuth (req, res, next) {
            const authNode = getAuthNode()
            if (!authNode || !authNode.hasUsers()) return next()
            if (req.session && req.session.papUser) return next()
            if (req.path.indexOf('/api/') === 0) return res.status(401).json({ error: 'unauthorized' })
            return res.redirect(basePath + '/login')
        }

        // ── Login / logout (always public) ──────────────────────────────────
        RED.httpNode.get(basePath + '/login', (req, res) => {
            const authNode = getAuthNode()
            if (!authNode || !authNode.hasUsers() || (req.session && req.session.papUser)) {
                return res.redirect(basePath + '/')
            }
            res.type('html').send(loginPageHtml(basePath, title, req.query.error))
        })

        RED.httpNode.post(basePath + '/api/login', express.urlencoded({ extended: false }), express.json(), (req, res) => {
            const authNode = getAuthNode()
            const { username, password } = req.body || {}
            if (authNode && authNode.verify(username, password)) {
                req.session.papUser = username
                if (req.is('application/json')) return res.json({ ok: true })
                return res.redirect(basePath + '/')
            }
            if (req.is('application/json')) return res.status(401).json({ error: 'invalid credentials' })
            return res.redirect(basePath + '/login?error=1')
        })

        RED.httpNode.post(basePath + '/api/logout', (req, res) => {
            req.session.destroy(() => res.json({ ok: true }))
        })

        // ── Static assets (JS/CSS chunks) ─────────────────────────────────────
        RED.httpNode.use(basePath + '/assets',
            express.static(path.join(distPath, 'assets'), { maxAge: '1y' }))

        // ── PWA files at dist root (manifest, service worker, icons, favicon) ──
        // index:false so it never serves dist/index.html itself here — that still
        // goes through serveIndex() below for the runtime config injection.
        RED.httpNode.use(basePath, express.static(distPath, { index: false }))

        // Everything below this point (API + SPA catch-all) requires a session
        // when an ui-pap-auth node with configured users is wired to the server.
        RED.httpNode.use(basePath, requireAuth)

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

        // ── REST API ─────────────────────────────────────────────────────────
        // Must be registered before the SPA catch-all below, otherwise
        // `basePath + '/*'` matches every /api/* request first and always
        // serves index.html instead of JSON.
        RED.httpNode.get(basePath + '/api/layout', (_req, res) => {
            res.json(activeServerNode ? activeServerNode.buildLayoutPayload() : { areas: [], pages: [] })
        })

        RED.httpNode.get(basePath + '/api/state', (_req, res) => {
            res.json(activeServerNode ? activeServerNode.stateCache : {})
        })

        RED.httpNode.get(basePath + '/api/scenes', (_req, res) => {
            res.json(activeServerNode ? activeServerNode.scenes : [])
        })

        RED.httpNode.get(basePath + '/api/log', (_req, res) => {
            res.json(activeServerNode ? activeServerNode.actionLog : [])
        })

        RED.httpNode.post(basePath + '/api/scenes', express.json(), (req, res) => {
            if (!activeServerNode) return res.status(503).json({ error: 'server not ready' })
            const scene = req.body
            scene.id = scene.id || `scene-${Date.now()}`
            const idx = activeServerNode.scenes.findIndex(s => s.id === scene.id)
            if (idx >= 0) activeServerNode.scenes[idx] = scene
            else          activeServerNode.scenes.push(scene)
            activeServerNode.io.emit('pap:scenes', activeServerNode.scenes)
            activeServerNode.persist()
            res.json(scene)
        })

        RED.httpNode.delete(basePath + '/api/scenes/:id', (req, res) => {
            if (!activeServerNode) return res.status(503).json({ error: 'server not ready' })
            activeServerNode.scenes = activeServerNode.scenes.filter(s => s.id !== req.params.id)
            activeServerNode.io.emit('pap:scenes', activeServerNode.scenes)
            activeServerNode.persist()
            res.json({ ok: true })
        })

        // ── SPA catch-all (must come after the /api/* routes above) ──────────
        RED.httpNode.get(basePath,        serveIndex)
        RED.httpNode.get(basePath + '/',  serveIndex)
        RED.httpNode.get(basePath + '/*', serveIndex)
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
        node.authNode    = config.auth ? RED.nodes.getNode(config.auth) : null

        // Layout tree: areas[], pages[] (pages have areaId, groups, subgroups, widgets)
        node.layout         = { areas: {}, pages: {} }
        node.widgetRegistry = {}

        // Persisted across restarts via Node-RED context (survives if contextStorage
        // is configured with a file-backed store in settings.js; otherwise memory-only
        // for this process' lifetime, same as before).
        const ctx = node.context()
        node.stateCache = ctx.get('stateCache') || {}
        node.scenes     = ctx.get('scenes')     || []
        node.actionLog  = ctx.get('actionLog')  || []

        const MAX_LOG_ENTRIES = 200

        node.persist = function () {
            ctx.set('stateCache', node.stateCache)
            ctx.set('scenes',     node.scenes)
            ctx.set('actionLog',  node.actionLog)
        }

        /** Finds a widget's display label by walking the layout tree. */
        node.findWidgetLabel = function (widgetId) {
            for (const page of Object.values(node.layout.pages))
                for (const group of Object.values(page.groups || {}))
                    for (const subgroup of Object.values(group.subgroups || {}))
                        if (subgroup.widgets[widgetId]) return subgroup.widgets[widgetId].config.label
            return widgetId
        }

        node.logAction = function (widgetId, payload, topic) {
            const entry = {
                widgetId,
                label:     node.findWidgetLabel(widgetId),
                payload,
                topic:     topic || '',
                timestamp: Date.now()
            }
            node.actionLog.push(entry)
            if (node.actionLog.length > MAX_LOG_ENTRIES) {
                node.actionLog.splice(0, node.actionLog.length - MAX_LOG_ENTRIES)
            }
            node.io.emit('pap:log-entry', entry)
            node.persist()
        }

        node.io = getIO(node.socketPath)
        registerRoutes(node.basePath, node.socketPath, node.theme, node.title, node.accentColor)
        activeServerNode = node

        node.status({ fill: 'green', shape: 'dot', text: node.basePath + '/' })

        // Remove previous connection handler to avoid stacking on re-deploy
        if (connectionHandler) node.io.removeListener('connection', connectionHandler)
        connectionHandler = function (socket) {
            // An unhandled 'error' event on an EventEmitter (which ws/socket.io
            // sockets are) throws and takes down the whole Node-RED process —
            // always have a listener, even if there's nothing more to do than log.
            socket.on('error', (err) => {
                if (activeServerNode) activeServerNode.warn('PAP UI: socket error: ' + (err && err.message))
            })

            // Always read from activeServerNode so re-deploys don't break existing sockets
            socket.emit('pap:layout', activeServerNode?.buildLayoutPayload() ?? { areas: [], pages: [] })
            socket.emit('pap:state',  activeServerNode?.stateCache ?? {})
            socket.emit('pap:scenes', activeServerNode?.scenes ?? [])
            socket.emit('pap:log-snapshot', activeServerNode?.actionLog ?? [])

            socket.on('pap:action', (msg) => {
                try {
                    // Validate shape before forwarding into the flow / broadcasting to
                    // every other connected client — a malformed message from one
                    // client must not be able to crash the push pipeline or corrupt
                    // state for everybody else.
                    if (!msg || typeof msg !== 'object' || typeof msg.widgetId !== 'string' || !msg.widgetId) return
                    const widgetNode = activeServerNode?.widgetRegistry?.[msg.widgetId]
                    if (widgetNode) {
                        const topic = typeof msg.topic === 'string' ? msg.topic : ''
                        widgetNode.send({ payload: msg.payload, topic })
                        activeServerNode?.logAction(msg.widgetId, msg.payload, topic)
                    }
                } catch (err) {
                    if (activeServerNode) activeServerNode.warn('PAP UI: error handling pap:action: ' + (err && err.message))
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
        this.persist()
        this.io.emit('pap:layout', this.buildLayoutPayload())
    }

    // ── Deregistration (mirrors register* above) ─────────────────────────────
    // Without these, deleting/renaming an area/page/group/subgroup node and
    // redeploying leaves a stale entry in the layout tree forever (it's only
    // ever merged into, never pruned) — a slow memory/UI-state leak and the
    // source of "ghost" groups/subgroups reappearing after edits.

    UIPapServerNode.prototype.unregisterArea = function (areaId) {
        delete this.layout.areas[areaId]
        this.io.emit('pap:layout', this.buildLayoutPayload())
    }

    UIPapServerNode.prototype.unregisterPage = function (pageId) {
        delete this.layout.pages[pageId]
        this.io.emit('pap:layout', this.buildLayoutPayload())
    }

    UIPapServerNode.prototype.unregisterGroup = function (groupId) {
        for (const page of Object.values(this.layout.pages)) {
            if (page.groups) delete page.groups[groupId]
        }
        this.io.emit('pap:layout', this.buildLayoutPayload())
    }

    UIPapServerNode.prototype.unregisterSubgroup = function (subgroupId) {
        for (const page of Object.values(this.layout.pages))
            for (const group of Object.values(page.groups || {}))
                if (group.subgroups) delete group.subgroups[subgroupId]
        this.io.emit('pap:layout', this.buildLayoutPayload())
    }

    UIPapServerNode.prototype.broadcastState = function (widgetId, payload) {
        this.stateCache[widgetId] = payload
        this.io.emit('pap:update', { widgetId, payload })
        this.persist()
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
