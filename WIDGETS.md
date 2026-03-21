# PAP UI — Widget Catalog

## Status Legend
- ✅ Implemented (beta)
- ⏸️ Paused (planned post-beta)
- 📋 Planned

---

## ✅ ui-pap-switch

Toggle on/off tile. Full background accent color when ON.

**Input:** `msg.payload` — `true`/`false` or truthy/falsy → sets state
**Input:** `msg.config` — partial config object to override at runtime (e.g. `{ label, iconOn, accentColor, readOnly }`)
**Output:** `{ on: boolean }` on user toggle (if not read-only)

**Static properties:** name, subgroup, order, iconOn, iconOff, accentColor, readOnly, driverLabel, gridW, gridH

**Dynamic via `msg.config`:** label, iconOn, iconOff, accentColor, readOnly, driverLabel, gridW, gridH

---

## ✅ ui-pap-sensor

Numeric value display. Optional stepper (◀ ▶) for writable setpoints.

**Input:** `msg.payload` — `number` or `{ value: number }` → updates display
**Input:** `msg.config` — partial config object (e.g. `{ unit, min, max, decimals }`)
**Output:** `{ value: number }` on stepper click (if not read-only)

**Static properties:** name, subgroup, order, unit, readOnly, min, max, step, decimals, accentColor, icon, driverLabel, gridW, gridH

**Dynamic via `msg.config`:** label, unit, min, max, step, decimals, accentColor, readOnly, driverLabel, gridW, gridH

---

## ✅ ui-pap-gauge

Arc gauge (tachometer style, 270° sweep). Read-only.

**Input:** `msg.payload` — `number` or `{ value: number }` → updates arc fill
**Input:** `msg.config` — partial config object (e.g. `{ min, max, ranges }`)
**Output:** none

**Static properties:** name, subgroup, order, unit, min, max, decimals, accentColor, ranges, icon, driverLabel, gridW, gridH

**Dynamic via `msg.config`:** label, unit, min, max, decimals, accentColor, ranges, driverLabel, gridW, gridH

**Color ranges** (`ranges` array): each entry `{ type, from, to, color }` where:
- `type`: `"abs"` (compare against absolute value) or `"pct"` (compare against 0–100% fill)
- `from`: lower bound (inclusive); `null` = no lower bound
- `to`: upper bound (inclusive)
- `color`: hex color string

Ranges are sorted by `from` and first match wins. If none match, `accentColor` is used.

**SVG arc:** cx=50, cy=46, r=38, start=135°, sweep=270° clockwise.

---

## ⏸️ ui-pap-light

Dimmable + color light tile with popup color wheel.

Paused for beta — planned for v0.2.

**Planned properties:** name, subgroup, hasColor, hasDimming, accentColor, driverLabel, gridW, gridH
**Planned input:** `boolean` | `number (brightness)` | `{ on, brightness, color: {h,s,l} }`

---

## ⏸️ ui-pap-thermostat

Temperature sensor with history graph and schedule display.

Paused for beta — planned for v0.2.

**Planned properties:** name, subgroup, unit, schedules (JSON), driverLabel, gridW, gridH
**Planned input:** `number` | `{ temp, humidity?, mode? }`

---

## 📋 ui-pap-button

Momentary push button. Emits a configurable payload on press.

**Planned input:** none (or initial label)
**Planned output:** `{ payload: configuredValue }` on press

---

## 📋 ui-pap-slider

Horizontal range slider.

**Planned input:** `number`
**Planned output:** `{ value: number }` on change

**Planned properties:** min, max, step, unit, accentColor

---

## 📋 ui-pap-chart

Time-series line/bar chart. Buffers history in-memory.

**Planned input:** `number` | `{ value, timestamp? }`
**Planned output:** none

**Planned properties:** unit, duration (minutes), chartType (line/bar), accentColor

---

## 📋 ui-pap-scene

Scene activation tile. Triggers a saved scene on click.

**Planned input:** scene state updates
**Planned output:** `{ sceneId }` on activation
