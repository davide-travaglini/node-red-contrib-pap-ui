# node-red-contrib-pap-ui

[![npm version](https://img.shields.io/npm/v/node-red-contrib-pap-ui.svg)](https://www.npmjs.com/package/node-red-contrib-pap-ui)
[![npm downloads](https://img.shields.io/npm/dm/node-red-contrib-pap-ui.svg)](https://www.npmjs.com/package/node-red-contrib-pap-ui)
[![Node.js ≥16](https://img.shields.io/badge/node-%3E%3D16-brightgreen.svg)](https://nodejs.org)
[![Node-RED ≥2](https://img.shields.io/badge/node--red-%3E%3D2.0-red.svg)](https://nodered.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

If you'd like to support me, [![Ko-fi](https://img.shields.io/badge/Buy%20me%20a%20coffee-%23FF5E5B?logo=ko-fi&logoColor=white&style=flat)](https://ko-fi.com/davidetravaglini)

> **Standalone home automation dashboard for Node-RED** — no Dashboard 2.0 required.

A tile-based, real-time dashboard built with Vue 3 and Socket.IO. Configure your layout directly in the Node-RED editor using a hierarchy of config nodes, then wire widget nodes to your data flows.

---

## Screenshots
Based on [Victor Lucachi's concept](https://dribbble.com/shots/10356530-Node-Red-Dashboard-Concept)

![PAP UI Dashboard](https://cdn.dribbble.com/userupload/26193859/file/original-825747dd05de34090ed4f25fbaaf9665.png?resize=752x&vertical=center)

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

## Beta Limitations

- **No persistence** — widget states reset when Node-RED restarts. Wire your devices to send initial values on startup.
- **No authentication** — the dashboard is publicly accessible on the Node-RED port.
- **Scenes UI** — the scene save/restore API exists but there is no UI to manage scenes yet.
- **Mobile** — layout is responsive but a proper bottom-navigation for mobile is not yet implemented.
- **Single server** — only one `ui-pap-server` instance is supported per Node-RED process.

---

## Roadmap

- [ ] `ui-pap-button` — momentary push button
- [ ] `ui-pap-slider` — range slider with min/max/step
- [ ] `ui-pap-chart` — time-series line/bar chart
- [ ] `ui-pap-scene` — scene activation tile
- [ ] Light widget with color wheel *(paused for beta)*
- [ ] Thermostat widget with history graph *(paused for beta)*
- [ ] Mobile bottom navigation
- [ ] Persistent state via Node-RED context
- [ ] Authentication / access control

---

## Development

```bash
git clone https://github.com/davide-vigano/node-red-contrib-pap-ui
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

Apache-2.0 © Davide Vigano
