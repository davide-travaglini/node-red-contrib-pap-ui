import { defineStore } from 'pinia'

export const useLayoutStore = defineStore('layout', {
    state: () => ({
        areas:   [],
        pages:   [],
        loading: false
    }),

    getters: {
        pageById: (state) => (id) => state.pages.find(p => p.id === id),

        areaById: (state) => (id) => state.areas.find(a => a.id === id),

        groupsForPage: (state) => (pageId) => {
            const page = state.pages.find(p => p.id === pageId)
            return page ? (page.groups || []) : []
        },

        subgroupsForGroup: () => (page, groupId) => {
            if (!page) return []
            const group = (page.groups || []).find(g => g.id === groupId)
            return group ? (group.subgroups || []) : []
        },

        widgetsForSubgroup: () => (page, groupId, subgroupId) => {
            if (!page) return []
            const group = (page.groups || []).find(g => g.id === groupId)
            if (!group) return []
            const subgroup = (group.subgroups || []).find(sg => sg.id === subgroupId)
            return subgroup ? (subgroup.widgets || []) : []
        },

        // Flat list of all widgets with full ancestry context
        allWidgets: (state) => {
            const widgets = []
            for (const page of state.pages) {
                for (const group of (page.groups || [])) {
                    for (const subgroup of (group.subgroups || [])) {
                        for (const widget of (subgroup.widgets || [])) {
                            widgets.push({
                                ...widget,
                                pageId:     page.id,
                                groupId:    group.id,
                                subgroupId: subgroup.id
                            })
                        }
                    }
                }
            }
            return widgets
        }
    },

    actions: {
        async fetchLayout () {
            this.loading = true
            try {
                const basePath = (window.__PAP__?.basePath || '/pap/ui/').replace(/\/$/, '')
                const data = await fetch(basePath + '/api/layout').then(r => r.json())
                this.areas = data.areas || []
                this.pages = data.pages || []
            } catch (e) {
                console.error('[pap] failed to fetch layout', e)
            } finally {
                this.loading = false
            }
        },
        setLayout (data) {
            this.areas = data.areas || []
            this.pages = data.pages || []
        }
    }
})
