import { io } from 'socket.io-client'
import { useConnectionStore } from '../stores/connection.js'
import { useLayoutStore } from '../stores/layout.js'
import { useDevicesStore } from '../stores/devices.js'
import { useScenesStore } from '../stores/scenes.js'

let socket = null

export function useSocket () {
    if (!socket) {
        socket = io({
            path:       window.__PAP__?.socketPath || '/pap/socket.io',
            transports: ['websocket', 'polling']
        })

        socket.on('connect', () => {
            useConnectionStore().status = 'connected'
        })

        socket.on('disconnect', () => {
            useConnectionStore().status = 'disconnected'
        })

        socket.on('connect_error', () => {
            useConnectionStore().status = 'disconnected'
        })

        socket.on('pap:layout', (data) => {
            useLayoutStore().setLayout(data)
        })

        socket.on('pap:state', (snapshot) => {
            useDevicesStore().applySnapshot(snapshot)
        })

        socket.on('pap:update', ({ widgetId, payload }) => {
            useDevicesStore().applyUpdate(widgetId, payload)
        })

        socket.on('pap:scenes', (scenes) => {
            useScenesStore().setScenes(scenes)
        })

        socket.on('pap:layout-changed', () => {
            useLayoutStore().fetchLayout()
        })
    }
    return socket
}
