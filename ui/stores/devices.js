import { defineStore } from 'pinia'
import { useSocket } from '../composables/useSocket.js'

const PENDING_TIMEOUT_MS = 15000

export const useDevicesStore = defineStore('devices', {
    state: () => ({
        states: {},  // { [widgetId]: payload }
        pending: {}  // { [widgetId]: true } — action sent, waiting for a real state update
    }),

    getters: {
        stateOf:     (state) => (widgetId) => state.states[widgetId] ?? null,
        isPending:   (state) => (widgetId) => !!state.pending[widgetId]
    },

    actions: {
        applySnapshot (snapshot) {
            this.states = snapshot || {}
        },
        applyUpdate (widgetId, payload) {
            this.states[widgetId] = payload
            delete this.pending[widgetId]
        },
        sendAction (widgetId, payload, topic = '') {
            // Optimistic update
            this.states[widgetId] = { ...(this.states[widgetId] || {}), ...payload }
            // Mark pending until the next real update confirms it (or times out)
            this.pending[widgetId] = true
            setTimeout(() => { delete this.pending[widgetId] }, PENDING_TIMEOUT_MS)
            // Send to Node-RED
            const socket = useSocket()
            socket.emit('pap:action', { widgetId, payload, topic })
        }
    }
})
