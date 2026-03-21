import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
    state: () => ({
        selectedGroupId:    null,
        selectedSubgroupId: null
    }),

    actions: {
        setGroupFilter (id) {
            this.selectedGroupId    = id
            this.selectedSubgroupId = null
        },
        setSubgroupFilter (id) {
            this.selectedSubgroupId = id
        },
        resetFilters () {
            this.selectedGroupId    = null
            this.selectedSubgroupId = null
        }
    }
})
