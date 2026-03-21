<template>
    <div class="widget-body">
        <template v-for="group in visibleGroups" :key="group.id">
            <template v-for="subgroup in visibleSubgroups(group)" :key="subgroup.id">
                <div v-if="subgroup.widgets?.length" class="widget-body__section">
                    <div class="widget-body__section-header">
                        <i v-if="group.icon" :class="'fa fa-' + group.icon" class="widget-body__group-icon" />
                        <span class="widget-body__group-name">{{ group.name }}</span>
                        <template v-if="group.subgroups?.length > 1">
                            <span class="widget-body__sep">›</span>
                            <i v-if="subgroup.icon" :class="'fa fa-' + subgroup.icon" class="widget-body__subgroup-icon" />
                            <span class="widget-body__subgroup-name">{{ subgroup.name }}</span>
                        </template>
                    </div>

                    <div class="widget-grid">
                        <WidgetTile
                            v-for="widget in sortedWidgets(subgroup)"
                            :key="widget.id"
                            :widget="widget"
                            @action="handleAction"
                        />
                    </div>
                </div>
            </template>
        </template>

        <div v-if="isEmpty" class="widget-body__empty">
            No widgets to display.
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUiStore }      from '../../stores/ui.js'
import { useDevicesStore } from '../../stores/devices.js'
import WidgetTile from './WidgetTile.vue'

const props = defineProps({
    page: { type: Object, required: true }
})

const uiStore      = useUiStore()
const devicesStore = useDevicesStore()

const sortedGroups = computed(() =>
    [...(props.page.groups || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
)

const visibleGroups = computed(() => {
    if (!uiStore.selectedGroupId) return sortedGroups.value
    return sortedGroups.value.filter(g => g.id === uiStore.selectedGroupId)
})

function visibleSubgroups (group) {
    const all = [...(group.subgroups || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
    if (!uiStore.selectedSubgroupId) return all
    return all.filter(sg => sg.id === uiStore.selectedSubgroupId)
}

function sortedWidgets (subgroup) {
    return [...(subgroup.widgets || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
}

const isEmpty = computed(() =>
    visibleGroups.value.every(g => visibleSubgroups(g).every(sg => !sg.widgets?.length))
)

function handleAction (widget) {
    const state = devicesStore.stateOf(widget.id)
    if (widget.type === 'switch') {
        if (widget.config.readOnly) return
        devicesStore.sendAction(widget.id, { on: !(state?.on ?? false) })
    }
}
</script>

<style scoped>
.widget-body {
    display: flex;
    flex-direction: column;
    gap: 28px;
}

.widget-body__section {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.widget-body__section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-bottom: 8px;
}

.widget-body__group-icon,
.widget-body__subgroup-icon {
    font-size: 0.75rem;
    color: var(--color-muted);
}

.widget-body__group-name {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-text);
    text-transform: uppercase;
    letter-spacing: 0.12em;
}

.widget-body__sep {
    color: var(--color-muted);
    font-size: 0.8rem;
}

.widget-body__subgroup-name {
    font-size: 0.75rem;
    color: var(--color-muted);
}

.widget-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 110px));
    grid-auto-rows: minmax(80px, 110px);
    gap: 10px;
}

.widget-body__empty {
    color: var(--color-muted);
    text-align: center;
    padding: 60px 0;
    font-size: 0.9rem;
}
</style>
