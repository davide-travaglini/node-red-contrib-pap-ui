# node-red-contrib-pap-ui

> **Standalone home automation dashboard for Node-RED** — no Dashboard 2.0 required.

A tile-based, real-time dashboard built with Vue 3 and Socket.IO. Configure your layout directly in the Node-RED editor using a hierarchy of config nodes, then wire widget nodes to your data flows.

---

## Screenshots
Based on [Victor Lucachi's concept](https://dribbble.com/shots/10356530-Node-Red-Dashboard-Concept)

![PAP UI Dashboard](mockup.webp)

---

## Installation

### Via npm
```bash
cd ~/.node-red
npm install node-red-contrib-pap-ui
```

Then restart Node-RED.

### Via Palette Manager
Search for `node-red-contrib-pap-ui` in the Node-RED palette manager and install.

---

## Quick Start

1. Add a **`ui-pap-server`** config node — set the URL path, theme, and title
2. Add a **`ui-pap-page`** config node — set the name and mark it as Home page
3. Add a **`ui-pap-group`** and a **`ui-pap-subgroup`** inside the page
4. Add widget nodes (**switch**, **sensor**, **gauge**) referencing the subgroup
5. Click **Deploy**
6. Open `http://localhost:1880/pap/ui` in your browser

---

## Node Hierarchy

Every widget must be connected to the full configuration chain:

```
ui-pap-server  (one per dashboard)
  └─ ui-pap-page  (one or more pages)
       └─ ui-pap-group  (groups shown as section headers)
            └─ ui-pap-subgroup  (sub-sections within a group)
                 └─ widgets: ui-pap-switch, ui-pap-sensor, ui-pap-gauge
```

---

## Node Reference

### `ui-pap-server` *(config)*

The root configuration node. Creates the HTTP routes and Socket.IO server.

| Property | Default | Description |
|----------|---------|-------------|
| Path | `pap/ui` | URL base path. Dashboard at `http://host:port/{path}` |
| Theme | `dark` | `dark`, `light`, or `auto` (follows OS preference) |
| Title | `PAP UI` | Dashboard title shown in the browser tab |
| Auth | — | Optional reference to a `ui-pap-auth` config node. Leave empty for a public dashboard. |

---

### `ui-pap-auth` *(config)*

Stores up to 10 username/password pairs (bcrypt-hashed at runtime). See
[Authentication](#authentication--ui-pap-auth) above.

---

### `ui-pap-tunnel` *(config)*

Starts an ngrok tunnel exposing the Node-RED HTTP port publicly. See
[Remote access](#remote-access--ui-pap-tunnel) above.

| Property | Default | Description |
|----------|---------|-------------|
| Authtoken | — | ngrok authtoken (credential, encrypted at rest) |
| Static domain | — | Free ngrok static domain, e.g. `yourname.ngrok-free.app` |
| Enabled | `false` | Starts the tunnel on deploy when checked |
| I understand the risk | `false` | Required to start the tunnel if the editor has no `adminAuth` |

---

### `ui-pap-page` *(config)*

Defines a page (tab) in the dashboard navigation.

| Property | Default | Description |
|----------|---------|-------------|
| Name | — | Page display name |
| Icon | — | Font Awesome icon name (e.g. `home`, `bolt`, `thermometer-half`) |
| Home page | `false` | If checked, this page loads by default |
| Grid columns | `4` | Number of tile columns in the grid |
| Order | `0` | Sort order in the left navigation |
| Server | — | Reference to `ui-pap-server` |

---

### `ui-pap-group` *(config)*

A group of subgroups within a page. Renders as a section header.

| Property | Default | Description |
|----------|---------|-------------|
| Name | — | Section header text |
| Icon | — | Font Awesome icon name shown next to the section header and in the secondary nav |
| Order | `0` | Sort order within the page |
| Page | — | Reference to `ui-pap-page` |

---

### `ui-pap-subgroup` *(config)*

A subgroup of widgets within a group.

| Property | Default | Description |
|----------|---------|-------------|
| Name | — | Subgroup name (shown when group has multiple subgroups) |
| Icon | — | Font Awesome icon name shown in the section header and nav |
| Order | `0` | Sort order within the group |
| Group | — | Reference to `ui-pap-group` |

---

### `ui-pap-switch`

An interactive on/off tile.

**Input:** `msg.payload` — `true`/`false` or any truthy/falsy value → sets the switch state.
**Input:** `msg.config` or root properties (e.g. `msg.name`) — property overrides (see [Dynamic Configuration](#dynamic-configuration)).

**Output:** `msg.payload = { on: true/false }` — emitted when the user clicks the tile (unless Read only).

| Property | Default | Description |
|----------|---------|-------------|
| Name | `Switch` | Display label |
| Subgroup | — | Reference to `ui-pap-subgroup` |
| Order | `0` | Sort order |
| Icon ON | `toggle-on` | Font Awesome icon when state is ON |
| Icon OFF | `toggle-off` | Font Awesome icon when state is OFF |
| Accent Color | `blue` | Tile background color when ON |
| Read only | `false` | If checked, tile is display-only (no click action) |
| Driver | — | Hardware label shown on the tile (e.g. `ARDUINO RELAY`) |
| Grid size | `1 × 1` | Width × height in tile units |

**Example flow:**
```
[inject true/false] → [ui-pap-switch] → [mqtt out to device]
```

---

### `ui-pap-sensor`

A numeric value display tile. Can optionally act as a writable setpoint with up/down buttons.

**Input:** `msg.payload` — a number or `{ value: number }` → updates the displayed value.
**Input:** `msg.config` or root properties (e.g. `msg.name`) — property overrides (see [Dynamic Configuration](#dynamic-configuration)).

**Output:** `msg.payload = { value: number }` — emitted when the user clicks ◀ ▶ (only when not Read only).

| Property | Default | Description |
|----------|---------|-------------|
| Name | `Sensor` | Display label |
| Subgroup | — | Reference to `ui-pap-subgroup` |
| Unit | — | Display unit (e.g. `°C`, `%`, `W`) |
| Read only | `true` | If unchecked, shows ◀ ▶ stepper buttons and enables output |
| Min | `0` | Minimum value (stepper lower bound) |
| Max | `100` | Maximum value (stepper upper bound) |
| Step | `1` | Increment/decrement step |
| Decimals | `0` | Decimal places to show |
| Accent Color | `green` | Tile tint color (always visible) |
| Driver | — | Hardware label |
| Grid size | `1 × 1` | Width × height in tile units |

---

### `ui-pap-gauge`

A read-only arc gauge tile (tachometer style, 270° sweep).

**Input:** `msg.payload` — a number or `{ value: number }` → updates the arc fill.
**Input:** `msg.config` or root properties (e.g. `msg.name`) — property overrides (see [Dynamic Configuration](#dynamic-configuration)).

**Output:** none.

| Property | Default | Description |
|----------|---------|-------------|
| Name | `Gauge` | Display label |
| Subgroup | — | Reference to `ui-pap-subgroup` |
| Unit | — | Display unit (e.g. `V`, `A`, `W`) |
| Min | `0` | Arc start value (0% fill) |
| Max | `100` | Arc end value (100% fill) |
| Decimals | `0` | Decimal places to show |
| Fallback color | `orange` | Arc fill color when no range matches |
| Color ranges | `[]` | List of threshold-based color rules (see below) |
| Driver | — | Hardware label |
| Grid size | `1 × 1` | Width × height in tile units |

#### Color ranges

Define any number of color ranges. Each entry has:

| Field | Description |
|-------|-------------|
| Type | `value` — compare against absolute value; `%` — compare against arc fill (0–100) |
| From | Lower bound (inclusive). Leave empty for no lower bound. |
| To | Upper bound (inclusive). |
| Color | Hex color for the arc fill. |

Ranges are evaluated in ascending `from` order. The arc takes the color of the **first matching range** (`from ≤ value ≤ to`). If no range matches, the fallback color is used.

**Example — traffic-light gauge (0–100 W):**

| Type | From | To | Color |
|------|------|----|-------|
| value | 0 | 70 | `#3dd28d` |
| value | 71 | 90 | `#ff7d44` |
| value | 91 | 100 | `#ff3b3b` |

---

## Dynamic Configuration

All widget nodes (switch, sensor, gauge) accept a `msg.config` object or direct **root-level `msg` properties** (e.g., `msg.name`, `msg.color`) on their input to override static configuration at runtime — **without redeploying**.

```js
// Override sensor label and accent color using root properties
node.send({ name: 'Room Temp', color: 'blue', payload: 22.4 })

// Change gauge scale at runtime using msg.config
node.send({ config: { min: 0, max: 500, unit: 'W' }, payload: 237.5 })

// Update gauge color ranges dynamically
node.send({
    config: {
        ranges: [
            { type: 'pct', from: 0,  to: 70,  color: '#3dd28d' },
            { type: 'pct', from: 70, to: 90,  color: '#ff7d44' },
            { type: 'pct', from: 90, to: 100, color: '#ff3b3b' }
        ]
    },
    payload: 85
})
```

Properties are **merged** with the node's static config and persist until overridden again or Node-RED is redeployed. `msg.payload` and properties can be sent together in the same message.

Supported direct override properties vary by node but generally include: `name` (or `label`), `color` (or `accentColor`), `icon`, `iconOn`, `iconOff`, `unit`, `min`, `max`, `step`, `decimals`, `driverLabel`, `readOnly`, `ranges`, `gridW`, `gridH`.

---

## Architecture

```
Node-RED flow
     │
     │  msg.payload
     ▼
ui-pap-widget node
     │  broadcastState()
     ▼
ui-pap-server node
     │  Socket.IO: pap:update
     ▼
Vue SPA (browser)
     │  Pinia store: devices
     ▼
WidgetTile renders

User interaction (click, stepper)
     │  Socket.IO: pap:action
     ▼
ui-pap-server
     │  widgetNode.send()
     ▼
ui-pap-widget output → downstream flow
```

- **Vue 3 SPA** built with Vite, served directly by Node-RED's HTTP server
- **Socket.IO** for real-time bidirectional state updates
- **No database** — state is in-memory; upstream nodes should re-send initial values on Node-RED restart
- **Pinia stores**: `layout` (page/group/widget tree), `devices` (widget states), `ui` (filters), `connection`, `scenes`

---

## Socket.IO Protocol

| Event | Direction | Payload |
|-------|-----------|---------|
| `pap:layout` | Server → Client | Full layout tree (pages, groups, widgets) |
| `pap:state` | Server → Client | Snapshot of all widget states `{ [widgetId]: payload }` |
| `pap:update` | Server → Client | Single widget update `{ widgetId, payload }` |
| `pap:action` | Client → Server | User interaction `{ widgetId, payload, topic }` |

---

### `ui-pap-button`

A momentary push-button tile. No input state — every tap emits an output.

**Output:** `msg.payload = true` on every click.

| Property | Default | Description |
|----------|---------|-------------|
| Name | `Button` | Display label |
| Subgroup | — | Reference to `ui-pap-subgroup` |
| Order | `0` | Sort order |
| Icon | `hand-pointer-o` | Font Awesome icon name |
| Accent Color | `blue` | Tile tint color |
| Driver | — | Hardware label |
| Grid size | `1 × 1` | Width × height in tile units |

---

### `ui-pap-slider`

A writable range widget rendered as a horizontal drag slider.

**Input:** `msg.payload` — a number or `{ value: number }` → updates the fill.
**Output:** `msg.payload = { value: number }`, emitted when the user releases the slider (unless Read only).

| Property | Default | Description |
|----------|---------|-------------|
| Name | `Slider` | Display label |
| Subgroup | — | Reference to `ui-pap-subgroup` |
| Unit | — | Display unit |
| Read only | `false` | If checked, the slider is disabled |
| Min / Max / Step / Decimals | `0 / 100 / 1 / 0` | Range bounds |
| Accent Color | `blue` | Tile tint color |
| Driver | — | Hardware label |
| Grid size | `2 × 1` | Width × height in tile units |

---

### `ui-pap-light`

An on/off tile with an optional inline brightness slider.

**Input:** `msg.payload` — boolean (on/off) or `{ on, brightness, color }` merged with current state.
**Output:** `{ on }` on tap, `{ on: true, brightness }` when the brightness slider is released (unless Read only).

| Property | Default | Description |
|----------|---------|-------------|
| Name | `Light` | Display label |
| Subgroup | — | Reference to `ui-pap-subgroup` |
| Icon ON / OFF | `lightbulb-o` | Font Awesome icon names |
| Read only | `false` | If checked, tile and slider are display-only |
| Brightness | `true` | Shows an inline 0–100 brightness slider when the light is on |
| Color | `false` | Reserved — color payload is passed through, no color-wheel UI yet |
| Accent Color | `yellow` | Tile background color when ON |
| Driver | — | Hardware label |
| Grid size | `1 × 1` | Width × height in tile units |

---

### `ui-pap-thermostat`

Shows the current measured temperature and lets the user adjust the setpoint and cycle modes.

**Input:** `msg.payload = { value: currentTemp, setPoint, mode }` (merge — send only the fields that changed).
**Output:** `{ setPoint, mode }`, emitted on ± setpoint buttons or when tapping the mode pill (unless Read only).

| Property | Default | Description |
|----------|---------|-------------|
| Name | `Thermostat` | Display label |
| Subgroup | — | Reference to `ui-pap-subgroup` |
| Unit | `°C` | Display unit |
| Read only | `false` | If checked, hides the setpoint stepper and mode pill |
| Min / Max / Step / Decimals | `5 / 35 / 0.5 / 1` | Setpoint bounds |
| Modes | `Manual,Automatic,Off` | Comma-separated list, cycled by tapping the mode pill |
| Accent Color | `orange` | Tile tint color |
| Driver | — | Hardware label |
| Grid size | `1 × 1` | Width × height in tile units |

---

### `ui-pap-scene`

A scene-activation tile. No input state — every tap emits an output with the scene name as topic.

**Output:** `msg.payload = true`, `msg.topic = <scene name>` on every click.

| Property | Default | Description |
|----------|---------|-------------|
| Name | `Scene` | Display label, also used as `msg.topic` |
| Subgroup | — | Reference to `ui-pap-subgroup` |
| Icon | `bolt` | Font Awesome icon name |
| Accent Color | `purple` | Tile tint color |
| Driver | — | Hardware label |
| Grid size | `1 × 1` | Width × height in tile units |

---

### `ui-pap-chart`

A time-series line chart tile. No output — pure display.

**Input:** `msg.payload` — a number or `{ value: number }`. Each input appends one point to a
rolling history (capped at "History points"), shown as a mini line chart with the latest value
and a min/max readout for the visible window. History is persisted via Node-RED context together
with the rest of the dashboard state.

| Property | Default | Description |
|----------|---------|-------------|
| Name | `Chart` | Display label |
| Subgroup | — | Reference to `ui-pap-subgroup` |
| Unit | — | Display unit |
| Decimals | `1` | Decimal places to show |
| History points | `60` | Number of samples kept in the rolling window |
| Accent Color | `blue` | Tile tint color |
| Driver | — | Hardware label |
| Grid size | `2 × 1` | Width × height in tile units |

---

## PWA

The dashboard is installable as a Progressive Web App — a manifest and service worker (built
with `vite-plugin-pwa`) cache the app shell for offline use and let browsers offer "Install app".
`start_url`/`scope` are relative, so installation works correctly under any `ui-pap-server` `path`.
API calls (`/api/*`) and Socket.IO are never cached — they always hit the network.

Note: the manifest's name/icon/theme are fixed at build time and do not follow a specific
`ui-pap-server` instance's `title`/`accentColor`.

---

## Authentication — `ui-pap-auth`

Add a **`ui-pap-auth`** config node to require a login before the dashboard (and its REST API /
Socket.IO data) becomes accessible. Stores up to 10 username/password pairs (bcrypt-hashed at
runtime). Reference it from the `Auth` field on `ui-pap-server` — leave that field empty to keep
the dashboard public (previous, default behavior).

Because Node-RED never sends stored passwords back to the editor, **every password must be
re-typed each time you edit and save the `ui-pap-auth` node** — leaving a row's password empty
removes that user on save.

---

## Remote access — `ui-pap-tunnel`

Add a **`ui-pap-tunnel`** config node to expose this Node-RED instance over the internet via an
[ngrok](https://ngrok.com) tunnel — no VPN, no router port-forwarding, no account on the router.
Use ngrok's free **static domain** (e.g. `yourname.ngrok-free.app`) so the URL never changes,
which is required for the dashboard's installed PWA to keep working across restarts.

> ⚠️ **Security:** ngrok tunnels the *entire* Node-RED HTTP port, not just the PAP UI dashboard
> path — if the Node-RED editor isn't protected, the tunnel exposes it too. The node **refuses to
> start** unless `adminAuth` (or `httpAdminRoot: false`) is set in `settings.js`, or you explicitly
> check "I understand the risk" on the node. Pair this with `ui-pap-auth` so the dashboard itself
> also requires a login. See the node's Help panel for details.

---

## Beta Limitations

- **Scenes UI** — the scene save/restore REST API exists and now actually works (see fixed-route
  note below), but there is still no editor UI to manage saved scenes — use `ui-pap-scene` tiles
  for simple trigger-a-flow scenes in the meantime.
- **Single server** — only one `ui-pap-server` instance is supported per Node-RED process.
- **Light color** — `hasColor` passes a `color` field through but there is no color-wheel picker
  in the tile yet; drive it from a flow (e.g. a separate color-picker UI elsewhere).

---

## Roadmap

- [x] `ui-pap-button` — momentary push button
- [x] `ui-pap-slider` — range slider with min/max/step
- [x] `ui-pap-scene` — scene activation tile
- [x] Light widget (on/off + brightness slider; color is pass-through, no wheel yet)
- [x] Thermostat widget (setpoint + mode; no history graph yet)
- [x] Mobile bottom navigation
- [x] Persistent state via Node-RED context
- [x] PWA (installable dashboard, offline app shell)
- [x] Authentication / access control (`ui-pap-auth`)
- [x] Remote access tunnel (`ui-pap-tunnel`, ngrok)
- [x] `ui-pap-chart` — time-series line chart
- [ ] Light widget color wheel
- [ ] Thermostat widget history graph / sparkline

---

## Development

```bash
git clone https://github.com/davide-travaglini/node-red-contrib-pap-ui
cd node-red-contrib-pap-ui
npm install

# Build the Vue SPA
npm run build

# Watch mode (rebuild on save)
npm run dev
```

Then symlink into your Node-RED installation:
```bash
cd ~/.node-red
npm install /path/to/node-red-contrib-pap-ui
```

---

## License

Apache-2.0 © Davide Travaglini
