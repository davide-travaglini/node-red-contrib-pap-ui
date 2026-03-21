import { defineStore } from 'pinia'
import { useSocket } from '../composables/useSocket.js'

export const useDevicesStore = defineStore('devices', {
    state: () => ({
        states: {} // { [widgetId]: payload }
    }),

    getters: {
        stateOf: (state) => (widgetId) => state.states[widgetId] ?? null
    },

    actions: {
        applySnapshot (snapshot) {
            this.states = snapshot || {}
        },
        applyUpdate (widgetId, payload) {
            this.states[widgetId] = payload
        },
        sendAction (widgetId, payload, topic = '') {
            // Optimistic update
            this.states[widgetId] = { ...(this.states[widgetId] || {}), ...payload }
            // Send to Node-RED
            const socket = useSocket()
            socket.emit('pap:action', { widgetId, payload, topic })
        }
    }
})
