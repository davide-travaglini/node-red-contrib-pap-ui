<template>
    <div
        class="widget-tile"
        :class="[`widget-tile--${widget.type}`, { 'is-on': isOn, 'is-readonly': isReadOnly }, accentClass]"
        :style="{
            '--w': widget.config.gridW || 1,
            '--h': widget.config.gridH || 1,
            'aspectRatio': `${widget.config.gridW || 1} / ${widget.config.gridH || 1}`
        }"
        @click="handleClick"
    >
        <!-- Top row: icon — not shown for gauge -->
        <div v-if="widget.type !== 'gauge'" class="widget-tile__top">
            <i :class="iconClass" class="widget-tile__icon" />
        </div>

        <!-- Gauge arc (only for gauge type) -->
        <div v-if="widget.type === 'gauge'" class="widget-tile__top widget-tile__top--gauge"></div>
        <div v-if="widget.type === 'gauge'" class="widget-tile__gauge">
            <svg viewBox="0 0 100 72" class="gauge-svg">
                <path class="gauge-track" :d="gaugeTrackPath" />
                <path v-if="gaugeFillPath" class="gauge-fill" :d="gaugeFillPath"
                      :style="{ stroke: gaugeStrokeColor }" />
                <text x="50" y="53" text-anchor="middle" class="gauge-val-text"
                      :font-size="gaugeValFontSize">{{ displayValue }}</text>
                <text x="50" y="65" text-anchor="middle" class="gauge-unit-text">{{ widget.config.unit }}</text>
            </svg>
        </div>

        <!-- Main value (switch and sensor) -->
        <div v-else class="widget-tile__main"
            :class="{
                'widget-tile__main--stepper':    widget.type === 'sensor' && !isReadOnly,
                'widget-tile__main--unit-below': widget.type === 'sensor' && isReadOnly && longUnit
            }"
        >
            <button
                v-if="widget.type === 'sensor' && !isReadOnly"
                class="widget-tile__step-btn"
                @click.stop="sensorStep(-(widget.config.step ?? 1))"
            ><i class="fa fa-chevron-left" /></button>

            <span class="widget-tile__value">{{ displayValue }}</span>
            <span v-if="displayUnit" class="widget-tile__unit">{{ displayUnit }}</span>

            <button
                v-if="widget.type === 'sensor' && !isReadOnly"
                class="widget-tile__step-btn"
                @click.stop="sensorStep(widget.config.step ?? 1)"
            ><i class="fa fa-chevron-right" /></button>
        </div>

        <!-- Driver label at bottom -->
        <div class="widget-tile__footer">
            <span v-if="widget.config.driverLabel" class="widget-tile__driver-label">{{ widget.config.driverLabel }}</span>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useDevicesStore } from '../../stores/devices.js'

const props = defineProps({
    widget: { type: Object, required: true }
})

const emit = defineEmits(['action'])

const devicesStore = useDevicesStore()
const state = computed(() => devicesStore.stateOf(props.widget.id))

const isOn = computed(() => {
    if (props.widget.type === 'switch') return !!(state.value?.on)
    return false
})

const iconClass = computed(() => {
    const t   = props.widget.type
    const cfg = props.widget.config
    if (t === 'switch') {
        const name = isOn.value ? (cfg.iconOn || 'toggle-on') : (cfg.iconOff || 'toggle-off')
        return `fa fa-${name}`
    }
    if (t === 'sensor') return cfg.icon ? `fa fa-${cfg.icon}` : 'fa fa-tachometer'
    return 'fa fa-cube'
})

const displayValue = computed(() => {
    const s = state.value
    const t = props.widget.type
    if (!s) return '—'
    if (t === 'switch') return s.on ? 'ON' : 'OFF'
    if (t === 'sensor' || t === 'gauge') {
        const v = s.value
        if (v == null) return '—'
        return Number(v).toFixed(props.widget.config.decimals ?? 0)
    }
    return '—'
})

const displayUnit = computed(() => {
    if (props.widget.type === 'sensor') return props.widget.config.unit || ''
    return null
})

const longUnit = computed(() =>
    props.widget.type === 'sensor' && (props.widget.config.unit || '').length > 3
)

const accentClass = computed(() => {
    const t   = props.widget.type
    const cfg = props.widget.config
    if (!cfg.accentColor) return null
    if (t === 'switch' && isOn.value) return `tile-accent--${cfg.accentColor}`
    if (t === 'sensor')               return `tile-accent--${cfg.accentColor}`
    return null
})

const isReadOnly = computed(() => !!props.widget.config.readOnly)

const gaugeFraction = computed(() => {
    const s = state.value
    if (!s || s.value == null) return 0
    const cfg = props.widget.config
    return Math.min(1, Math.max(0,
        (s.value - (cfg.min ?? 0)) / ((cfg.max ?? 100) - (cfg.min ?? 0))
    ))
})

const gaugeTrackPath = computed(() => arcPath(135, 405))

const gaugeFillPath = computed(() => {
    const sweep = gaugeFraction.value * 270
    if (sweep < 1) return ''
    return arcPath(135, 135 + sweep)
})

const gaugeValFontSize = computed(() => {
    const len = displayValue.value.length
    if (len <= 3) return 16
    if (len <= 5) return 14
    if (len <= 7) return 11
    return 9
})

const gaugeStrokeColor = computed(() => {
    const cfg    = props.widget.config
    const s      = state.value
    const ranges = cfg.ranges
    if (ranges && ranges.length && s && s.value != null) {
        const absVal = s.value
        const pctVal = gaugeFraction.value * 100
        const sorted = [...ranges].sort((a, b) => (a.from ?? -Infinity) - (b.from ?? -Infinity))
        for (const r of sorted) {
            const cmp  = (r.type === 'pct') ? pctVal : absVal
            const from = r.from ?? -Infinity
            const to   = r.to   ??  Infinity
            if (cmp >= from && cmp <= to) return r.color
        }
    }
    const colorMap = {
        yellow: 'var(--theme-accent-yellow)',
        orange: 'var(--theme-accent-orange)',
        purple: 'var(--theme-accent-purple)',
        blue:   'var(--theme-accent-blue)',
        green:  'var(--theme-accent-green)'
    }
    return colorMap[cfg.accentColor] || 'var(--theme-accent-orange)'
})

function arcPath (startDeg, endDeg) {
    const toRad = d => d * Math.PI / 180
    const cx = 50, cy = 46, r = 38
    const x1 = cx + r * Math.cos(toRad(startDeg))
    const y1 = cy + r * Math.sin(toRad(startDeg))
    const x2 = cx + r * Math.cos(toRad(endDeg))
    const y2 = cy + r * Math.sin(toRad(endDeg))
    const large = (endDeg - startDeg) > 180 ? 1 : 0
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

function sensorStep (delta) {
    const cfg     = props.widget.config
    const current = state.value?.value ?? cfg.min ?? 0
    const next    = Math.min(cfg.max ?? 100, Math.max(cfg.min ?? 0, current + delta))
    devicesStore.sendAction(props.widget.id, { value: next })
}

function handleClick () {
    if (props.widget.type === 'switch' && isReadOnly.value) return
    emit('action', props.widget)
}
</script>

<style scoped>
.widget-tile {
    grid-column: span var(--w, 1);
    grid-row:    span var(--h, 1);
    background: var(--color-surface);
    border-radius: 12px;
    padding: 10px 10px 8px;
    display: flex;
    flex-direction: column;
    gap: 0;
    cursor: pointer;
    transition: background 0.15s;
    position: relative;
    overflow: hidden;
    min-width: 0;
    min-height: 0;
}

.widget-tile::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    opacity: 0;
    background: radial-gradient(ellipse at top left, rgba(61,210,141,0.12), transparent 70%);
    transition: opacity 0.2s;
    pointer-events: none;
}

.widget-tile.is-on::before { opacity: 1; }

.widget-tile:hover {
    background: var(--theme-surface-hover);
}

/* Top row */
.widget-tile__top {
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    margin-bottom: 4px;
}

.widget-tile__icon {
    font-size: 1rem;
    color: var(--color-muted);
    transition: color 0.15s;
}

.widget-tile.is-on .widget-tile__icon {
    color: var(--color-accent);
}

/* Main value */
.widget-tile__main {
    flex: 1;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 3px;
    padding: 2px 0;
}

.widget-tile__value {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.15s;
}

.widget-tile.is-on .widget-tile__value {
    color: var(--color-accent);
}

/* OFF state: dim the value */
.widget-tile--switch:not(.is-on) .widget-tile__value {
    color: var(--color-muted);
}

.widget-tile__unit {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-muted);
    line-height: 1;
}

/* Sensor with long unit: stack vertically */
.widget-tile__main--unit-below {
    flex-direction: column;
    align-items: center;
    gap: 1px;
}

.widget-tile__main--unit-below .widget-tile__value {
    font-size: 1.4rem;
}

.widget-tile__main--unit-below .widget-tile__unit {
    font-size: 0.7rem;
}

/* Footer */
.widget-tile__footer {
    margin-top: auto;
    padding-top: 4px;
    min-height: 14px;
}

.widget-tile__driver-label {
    font-size: 0.62rem;
    color: var(--color-muted);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    opacity: 0.7;
    display: block;
}

/* ---- Accent tile backgrounds ---- */
.tile-accent--yellow { background: var(--theme-accent-yellow) !important; }
.tile-accent--orange { background: var(--theme-accent-orange) !important; }
.tile-accent--purple { background: var(--theme-accent-purple) !important; }
.tile-accent--blue   { background: var(--theme-accent-blue)   !important; }
.tile-accent--green  { background: var(--theme-accent-green)  !important; }

.tile-accent--yellow .widget-tile__value,
.tile-accent--yellow .widget-tile__driver-label,
.tile-accent--yellow .widget-tile__icon { color: #1b1b1e !important; }

.tile-accent--orange .widget-tile__value,
.tile-accent--orange .widget-tile__driver-label,
.tile-accent--orange .widget-tile__icon,
.tile-accent--purple .widget-tile__value,
.tile-accent--purple .widget-tile__driver-label,
.tile-accent--purple .widget-tile__icon,
.tile-accent--blue   .widget-tile__value,
.tile-accent--blue   .widget-tile__driver-label,
.tile-accent--blue   .widget-tile__icon,
.tile-accent--green  .widget-tile__value,
.tile-accent--green  .widget-tile__driver-label,
.tile-accent--green  .widget-tile__icon { color: #ffffff !important; }

[class*="tile-accent--"]::before { display: none; }
[class*="tile-accent--"]:hover { filter: brightness(1.08); }

/* ---- Read-only tile ---- */
.widget-tile.is-readonly { cursor: default; }
.widget-tile.is-readonly:hover {
    background: var(--color-surface) !important;
    filter: none !important;
}

/* ---- Sensor stepper (horizontal) ---- */
.widget-tile__main--stepper {
    justify-content: space-between;
    align-items: center;
}

.widget-tile__step-btn {
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    color: var(--color-text);
    font-size: 0.7rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s;
    padding: 0;
    flex-shrink: 0;
}

.widget-tile__step-btn:hover  { background: rgba(255,255,255,0.22); }
.widget-tile__step-btn:active { background: rgba(255,255,255,0.35); }

[class*="tile-accent--"] .widget-tile__step-btn       { background: rgba(0,0,0,0.15); color: inherit; }
[class*="tile-accent--"] .widget-tile__step-btn:hover  { background: rgba(0,0,0,0.28); }

/* ---- Gauge widget ---- */
.widget-tile__top--gauge {
    /* same space as icon row but empty, keeps vertical rhythm in sync */
    pointer-events: none;
}

.widget-tile__gauge {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.gauge-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
}

.gauge-track {
    fill: none;
    stroke: rgba(255,255,255,0.08);
    stroke-width: 7;
    stroke-linecap: round;
}

.gauge-fill {
    fill: none;
    stroke-width: 7;
    stroke-linecap: round;
}

.gauge-val-text {
    font-weight: 700;
    fill: var(--color-text);
    font-family: 'Inter', sans-serif;
}

.gauge-unit-text {
    font-size: 7px;
    font-weight: 600;
    fill: var(--color-muted);
    font-family: 'Inter', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.12em;
}
</style>
