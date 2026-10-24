import { defineStore } from 'pinia'

export const useLogStore = defineStore('log', {
    state: () => ({
        entries: [] // [{ widgetId, label, payload, topic, timestamp }]
    }),

    getters: {
        recent: (state) => (n = 20) => state.entries.slice(-n).reverse()
    },

    actions: {
        setEntries (entries) {
            this.entries = entries || []
        },
        appendEntry (entry) {
            this.entries.push(entry)
        }
    }
})
