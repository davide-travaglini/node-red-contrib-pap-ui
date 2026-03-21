import { defineStore } from 'pinia'
import { useSocket } from '../composables/useSocket.js'

export const useScenesStore = defineStore('scenes', {
    state: () => ({
        scenes: []
    }),

    actions: {
        setScenes (scenes) {
            this.scenes = scenes || []
        },
        async saveScene (scene) {
            const res = await fetch('/pap/api/scenes', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(scene)
            })
            return res.json()
        },
        async deleteScene (id) {
            await fetch(`/pap/api/scenes/${id}`, { method: 'DELETE' })
        }
    }
})
