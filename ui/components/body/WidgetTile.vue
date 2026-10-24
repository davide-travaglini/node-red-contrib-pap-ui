<template>
    <div
        class="widget-tile"
        :class="[`widget-tile--${widget.type}`, { 'is-on': isOn, 'is-readonly': isReadOnly, 'is-pending': isPending }, accentClass]"
        :style="{
            '--w': widget.config.gridW || 1,
            '--h': widget.config.gridH || 1
        }"
        @click="handleClick"
    >
        <!-- Top row: icon — not shown for gauge -->
        <div v-if="widget.type !== 'gauge'" class="widget-tile__top">
            <i :class="iconClass" class="widget-tile__icon" />
            <button
                v-if="widget.type === 'thermostat' && modes.length > 1"
                class="widget-tile__mode-pill"
                @click.stop="cycleMode"
            >{{ currentMode }}</button>
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

        <!-- Action tiles: button / scene — no state, just a centered icon-tap target -->
        <div v-else-if="isActionType" class="widget-tile__main widget-tile__main--action">
            <i :class="iconClass" class="widget-tile__action-icon" />
        </div>

        <!-- Chart: rolling line chart + latest value + min/max -->
        <div v-else-if="widget.type === 'chart'" class="widget-tile__main widget-tile__main--chart">
            <div class="widget-tile__chart-value">
                <span class="widget-tile__value">{{ displayValue }}</span>
                <span v-if="displayUnit" class="widget-tile__unit">{{ displayUnit }}</span>
            </div>
            <svg v-if="chartPoints.length > 1" viewBox="0 0 100 32" class="widget-tile__chart-svg" preserveAspectRatio="none">
                <polyline :points="chartPolyline" class="widget-tile__chart-line" />
            </svg>
            <div v-if="chartPoints.length > 1" class="widget-tile__chart-range">
                <span>min {{ chartMin }}</span>
                <span>max {{ chartMax }}</span>
            </div>
        </div>

        <!-- Clock: purely client-side digital clock -->
        <div v-else-if="widget.type === 'clock'" class="widget-tile__main widget-tile__main--clock">
            <span class="widget-tile__clock-time">{{ clockTime }}</span>
            <span v-if="widget.config.showDate" class="widget-tile__clock-date">{{ clockDate }}</span>
        </div>

        <!-- Log: global activity feed -->
        <div v-else-if="widget.type === 'log'" class="widget-tile__main widget-tile__main--log">
            <div v-if="logEntries.length === 0" class="widget-tile__log-empty">Nessuna attività</div>
            <div v-for="entry in logEntries" :key="entry.timestamp + entry.widgetId" class="widget-tile__log-row">
                <span class="widget-tile__log-time">{{ formatLogTime(entry.timestamp) }}</span>
                <span class="widget-tile__log-label">{{ entry.label }}</span>
            </div>
        </div>

        <!-- Slider -->
        <div v-else-if="widget.type === 'slider'" class="widget-tile__main widget-tile__main--slider">
            <div class="widget-tile__slider-value">
                <span class="widget-tile__value">{{ displayValue }}</span>
                <span v-if="displayUnit" class="widget-tile__unit">{{ displayUnit }}</span>
            </div>
            <input
                type="range"
                class="widget-tile__range"
                :min="widget.config.min ?? 0"
                :max="widget.config.max ?? 100"
                :step="widget.config.step ?? 1"
                :value="sliderValue"
                :disabled="isReadOnly"
                @click.stop
                @input="onSliderInput"
                @change="onSliderChange"
            >
        </div>

        <!-- Light -->
        <div v-else-if="widget.type === 'light'" class="widget-tile__main widget-tile__main--light">
            <span class="widget-tile__value">{{ displayValue }}</span>
            <input
                v-if="widget.config.hasBrightness && isOn"
                type="range"
                class="widget-tile__range widget-tile__range--mini"
                min="0" max="100"
                :value="brightnessValue"
                :disabled="isReadOnly"
                @click.stop
                @input="onBrightnessInput"
                @change="onBrightnessChange"
            >
        </div>

        <!-- Thermostat -->
        <div v-else-if="widget.type === 'thermostat'" class="widget-tile__main widget-tile__main--thermostat">
            <span class="widget-tile__value">{{ displayValue }}</span>
            <span v-if="displayUnit" class="widget-tile__unit">{{ displayUnit }}</span>
            <div v-if="!isReadOnly" class="widget-tile__setpoint-row">
                <button class="widget-tile__step-btn" @click.stop="thermostatStep(-(widget.config.step ?? 0.5))">
                    <i class="fa fa-chevron-left" />
                </button>
                <span class="widget-tile__setpoint-value">{{ setPointDisplay }}</span>
                <button class="widget-tile__step-btn" @click.stop="thermostatStep(widget.config.step ?? 0.5)">
                    <i class="fa fa-chevron-right" />
                </button>
            </div>
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
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useDevicesStore } from '../../stores/devices.js'
import { useLogStore } from '../../stores/log.js'

const props = defineProps({
    widget: { type: Object, required: true }
})

const emit = defineEmits(['action'])

const devicesStore = useDevicesStore()
const state = computed(() => devicesStore.stateOf(props.widget.id))
const isPending = computed(() => devicesStore.isPending(props.widget.id))

const isActionType = computed(() => ['button', 'scene'].includes(props.widget.type))

const isOn = computed(() => {
    if (props.widget.type === 'switch' || props.widget.type === 'light') return !!(state.value?.on)
    return false
})

const iconClass = computed(() => {
    const t   = props.widget.type
    const cfg = props.widget.config
    if (t === 'switch' || t === 'light') {
        const name = isOn.value ? (cfg.iconOn || 'toggle-on') : (cfg.iconOff || 'toggle-off')
        return `fa fa-${name}`
    }
    if (t === 'sensor')      return cfg.icon ? `fa fa-${cfg.icon}` : 'fa fa-tachometer'
    if (t === 'slider')      return cfg.icon ? `fa fa-${cfg.icon}` : 'fa fa-sliders'
    if (t === 'thermostat')  return cfg.icon ? `fa fa-${cfg.icon}` : 'fa fa-thermometer-half'
    if (t === 'button')      return cfg.icon ? `fa fa-${cfg.icon}` : 'fa fa-hand-pointer-o'
    if (t === 'scene')       return cfg.icon ? `fa fa-${cfg.icon}` : 'fa fa-bolt'
    if (t === 'chart')       return cfg.icon ? `fa fa-${cfg.icon}` : 'fa fa-line-chart'
    if (t === 'clock')       return cfg.icon ? `fa fa-${cfg.icon}` : 'fa fa-clock-o'
    if (t === 'log')         return cfg.icon ? `fa fa-${cfg.icon}` : 'fa fa-list'
    return 'fa fa-cube'
})

const displayValue = computed(() => {
    const s = state.value
    const t = props.widget.type
    if (t === 'switch' || t === 'light') return s?.on ? 'ON' : 'OFF'
    if (t === 'sensor' || t === 'gauge' || t === 'slider') {
        if (!s || s.value == null) return '—'
        return Number(s.value).toFixed(props.widget.config.decimals ?? 0)
    }
    if (t === 'thermostat' || t === 'chart') {
        if (!s || s.value == null) return '—'
        return Number(s.value).toFixed(props.widget.config.decimals ?? 1)
    }
    return '—'
})

const displayUnit = computed(() => {
    if (['sensor', 'slider', 'thermostat', 'chart'].includes(props.widget.type)) return props.widget.config.unit || ''
    return null
})

const longUnit = computed(() =>
    props.widget.type === 'sensor' && (props.widget.config.unit || '').length > 3
)

const accentClass = computed(() => {
    const t   = props.widget.type
    const cfg = props.widget.config
    if (!cfg.accentColor) return null
    if ((t === 'switch' || t === 'light') && isOn.value) return `tile-accent--${cfg.accentColor}`
    if (['sensor', 'slider', 'thermostat', 'button', 'scene', 'chart', 'clock'].includes(t)) return `tile-accent--${cfg.accentColor}`
    return null
})

const isReadOnly = computed(() => !!props.widget.config.readOnly)

// ---- Slider ----
const sliderValue = computed(() => state.value?.value ?? props.widget.config.min ?? 0)

function onSliderInput (e) {
    // live-update local display only; commit happens on 'change'
}
function onSliderChange (e) {
    devicesStore.sendAction(props.widget.id, { value: Number(e.target.value) })
}

// ---- Light brightness ----
const brightnessValue = computed(() => state.value?.brightness ?? 0)

function onBrightnessInput (e) { /* live drag, commit on change */ }
function onBrightnessChange (e) {
    devicesStore.sendAction(props.widget.id, { on: true, brightness: Number(e.target.value) })
}

// ---- Thermostat ----
const modes = computed(() => props.widget.config.modes || [])
const currentMode = computed(() => state.value?.mode || modes.value[0] || '')
const setPointDisplay = computed(() => {
    const sp = state.value?.setPoint
    return sp == null ? '—' : Number(sp).toFixed(props.widget.config.decimals ?? 1)
})

function thermostatStep (delta) {
    const cfg     = props.widget.config
    const current = state.value?.setPoint ?? cfg.min ?? 0
    const next    = Math.min(cfg.max ?? 100, Math.max(cfg.min ?? 0, +(current + delta).toFixed(2)))
    devicesStore.sendAction(props.widget.id, { setPoint: next, mode: state.value?.mode })
}

function cycleMode () {
    const list = modes.value
    if (!list.length) return
    const idx  = list.indexOf(currentMode.value)
    const next = list[(idx + 1) % list.length]
    devicesStore.sendAction(props.widget.id, { setPoint: state.value?.setPoint, mode: next })
}

// ---- Chart ----
const chartPoints = computed(() => {
    const s = state.value
    return (s && Array.isArray(s.history)) ? s.history : []
})

const chartPolyline = computed(() => {
    const pts = chartPoints.value
    if (pts.length < 2) return ''
    const values = pts.map(p => p.v)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = (max - min) || 1
    const stepX = 100 / (pts.length - 1)
    return pts.map((p, i) => {
        const x = (i * stepX).toFixed(2)
        const y = (32 - ((p.v - min) / range) * 30 - 1).toFixed(2)
        return `${x},${y}`
    }).join(' ')
})

const chartMin = computed(() => {
    const values = chartPoints.value.map(p => p.v)
    return values.length ? Math.min(...values).toFixed(props.widget.config.decimals ?? 1) : '—'
})

const chartMax = computed(() => {
    const values = chartPoints.value.map(p => p.v)
    return values.length ? Math.max(...values).toFixed(props.widget.config.decimals ?? 1) : '—'
})

// ---- Clock (purely client-side) ----
const now = ref(new Date())
let clockTimer = null
onMounted(() => {
    if (props.widget.type === 'clock') {
        clockTimer = setInterval(() => { now.value = new Date() }, 1000)
    }
})
onUnmounted(() => {
    if (clockTimer) clearInterval(clockTimer)
})

function clockFormatter (opts) {
    const cfg = props.widget.config
    try {
        return new Intl.DateTimeFormat(undefined, {
            timeZone: cfg.timezone || undefined,
            ...opts
        })
    } catch (e) {
        return new Intl.DateTimeFormat(undefined, opts)
    }
}

const clockTime = computed(() => {
    if (props.widget.type !== 'clock') return ''
    const cfg = props.widget.config
    return clockFormatter({ hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !!cfg.hour12 }).format(now.value)
})

const clockDate = computed(() => {
    if (props.widget.type !== 'clock') return ''
    return clockFormatter({ weekday: 'short', day: '2-digit', month: 'short' }).format(now.value)
})

// ---- Log ----
const logStore = useLogStore()
const logEntries = computed(() => {
    if (props.widget.type !== 'log') return []
    return logStore.recent(props.widget.config.maxEntries || 10)
})

function formatLogTime (ts) {
    return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// ---- Gauge (unchanged) ----
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
    if ((props.widget.type === 'switch' || props.widget.type === 'light') && isReadOnly.value) return
    if (['slider', 'thermostat', 'gauge', 'chart', 'clock', 'log'].includes(props.widget.type)) return

    // Ask for confirmation before turning OFF / closing, if the widget opts in.
    if ((props.widget.type === 'switch' || props.widget.type === 'light') &&
        props.widget.config.confirmOff && isOn.value) {
        const label = props.widget.config.label || 'questo dispositivo'
        if (!window.confirm(`Confermi di voler spegnere/chiudere "${label}"?`)) return
    }

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
    justify-content: space-between;
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

.widget-tile__mode-pill {
    border: none;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    color: var(--color-text);
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 8px;
    cursor: pointer;
}

.widget-tile__mode-pill:hover { background: rgba(255,255,255,0.22); }

/* Main value */
.widget-tile__main {
    flex: 1;
    display: flex;
    align-items: center;
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
.widget-tile--switch:not(.is-on) .widget-tile__value,
.widget-tile--light:not(.is-on) .widget-tile__value {
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
.tile-accent--yellow .widget-tile__icon,
.tile-accent--yellow .widget-tile__action-icon,
.tile-accent--yellow .widget-tile__unit,
.tile-accent--yellow .widget-tile__clock-date,
.tile-accent--yellow .widget-tile__setpoint-value { color: #1b1b1e !important; }

.tile-accent--orange .widget-tile__value,
.tile-accent--orange .widget-tile__driver-label,
.tile-accent--orange .widget-tile__icon,
.tile-accent--orange .widget-tile__action-icon,
.tile-accent--orange .widget-tile__unit,
.tile-accent--orange .widget-tile__clock-date,
.tile-accent--orange .widget-tile__setpoint-value,
.tile-accent--purple .widget-tile__value,
.tile-accent--purple .widget-tile__driver-label,
.tile-accent--purple .widget-tile__icon,
.tile-accent--purple .widget-tile__action-icon,
.tile-accent--purple .widget-tile__unit,
.tile-accent--purple .widget-tile__clock-date,
.tile-accent--purple .widget-tile__setpoint-value,
.tile-accent--blue   .widget-tile__value,
.tile-accent--blue   .widget-tile__driver-label,
.tile-accent--blue   .widget-tile__icon,
.tile-accent--blue   .widget-tile__action-icon,
.tile-accent--blue   .widget-tile__unit,
.tile-accent--blue   .widget-tile__clock-date,
.tile-accent--blue   .widget-tile__setpoint-value,
.tile-accent--green  .widget-tile__value,
.tile-accent--green  .widget-tile__driver-label,
.tile-accent--green  .widget-tile__icon,
.tile-accent--green  .widget-tile__action-icon,
.tile-accent--green  .widget-tile__unit,
.tile-accent--green  .widget-tile__clock-date,
.tile-accent--green  .widget-tile__setpoint-value { color: #ffffff !important; }

[class*="tile-accent--"] .widget-tile__clock-date,
[class*="tile-accent--"] .widget-tile__unit { opacity: 0.85; }

[class*="tile-accent--"]::before { display: none; }
[class*="tile-accent--"]:hover { filter: brightness(1.08); }

/* ---- Pending (action sent, waiting for real state confirmation) ---- */
@keyframes widget-tile-pulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.55; }
}

.widget-tile.is-pending {
    animation: widget-tile-pulse 1s ease-in-out infinite;
}

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

/* ---- Action tiles (button / scene) ---- */
.widget-tile__main--action {
    flex-direction: column;
}

.widget-tile__action-icon {
    font-size: 1.8rem;
    color: var(--color-muted);
}

.widget-tile.is-readonly .widget-tile__action-icon { opacity: 0.6; }

/* ---- Slider ---- */
.widget-tile__main--slider {
    flex-direction: column;
    justify-content: center;
    gap: 6px;
}

.widget-tile__slider-value {
    display: flex;
    align-items: baseline;
    gap: 3px;
}

.widget-tile__range {
    width: 100%;
    accent-color: var(--color-accent);
    cursor: pointer;
}

[class*="tile-accent--"] .widget-tile__range { accent-color: #ffffff; }

.widget-tile__range--mini {
    margin-top: 4px;
}

/* ---- Light ---- */
.widget-tile__main--light {
    flex-direction: column;
    gap: 4px;
}

/* ---- Thermostat ---- */
.widget-tile__main--thermostat {
    flex-direction: column;
    gap: 2px;
}

.widget-tile__setpoint-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 4px;
}

.widget-tile__setpoint-value {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
    min-width: 28px;
    text-align: center;
}

/* ---- Chart ---- */
.widget-tile__main--chart {
    flex-direction: column;
    gap: 4px;
    justify-content: flex-start;
}

.widget-tile__chart-value {
    display: flex;
    align-items: baseline;
    gap: 3px;
}

.widget-tile__chart-svg {
    width: 100%;
    flex: 1;
    min-height: 0;
}

.widget-tile__chart-line {
    fill: none;
    stroke: var(--color-accent);
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
}

[class*="tile-accent--"] .widget-tile__chart-line { stroke: #ffffff; }

.widget-tile__chart-range {
    display: flex;
    justify-content: space-between;
    font-size: 0.6rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

[class*="tile-accent--"] .widget-tile__chart-range { color: inherit; opacity: 0.85; }

/* ---- Clock ---- */
.widget-tile__main--clock {
    flex-direction: column;
    gap: 2px;
}

.widget-tile__clock-time {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1;
    font-variant-numeric: tabular-nums;
}

.widget-tile__clock-date {
    font-size: 0.7rem;
    color: var(--color-muted);
    text-transform: capitalize;
}

/* ---- Log ---- */
.widget-tile__main--log {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 4px;
    overflow-y: auto;
    cursor: default;
}

.widget-tile__log-empty {
    color: var(--color-muted);
    font-size: 0.8rem;
    text-align: center;
    padding: 12px 0;
}

.widget-tile__log-row {
    display: flex;
    gap: 8px;
    font-size: 0.75rem;
    padding: 3px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}

.widget-tile__log-time {
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
}

.widget-tile__log-label {
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
