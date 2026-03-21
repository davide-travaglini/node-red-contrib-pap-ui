<template>
    <nav class="secondary-nav">
        <!-- All -->
        <button
            class="secondary-nav__item"
            :class="{ 'is-active': uiStore.selectedGroupId === null }"
            @click="uiStore.resetFilters()"
        >
            All
        </button>

        <!-- Groups + subgroups -->
        <template v-for="group in sortedGroups" :key="group.id">
            <button
                class="secondary-nav__item secondary-nav__item--group"
                :class="{ 'is-active': uiStore.selectedGroupId === group.id && uiStore.selectedSubgroupId === null }"
                @click="uiStore.setGroupFilter(group.id)"
            >
                <i v-if="group.icon" :class="'fa fa-' + group.icon" class="secondary-nav__icon" />
                {{ group.name }}
            </button>

            <template v-if="group.subgroups?.length > 1">
                <button
                    v-for="subgroup in sortedSubgroups(group)"
                    :key="subgroup.id"
                    class="secondary-nav__item secondary-nav__item--subgroup"
                    :class="{ 'is-active': uiStore.selectedSubgroupId === subgroup.id }"
                    @click="selectSubgroup(group.id, subgroup.id)"
                >
                    <i v-if="subgroup.icon" :class="'fa fa-' + subgroup.icon" class="secondary-nav__icon" />
                    {{ subgroup.name }}
                </button>
            </template>
        </template>
    </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useUiStore } from '../../stores/ui.js'

const props = defineProps({
    page: { type: Object, required: true }
})

const uiStore = useUiStore()

const sortedGroups = computed(() =>
    [...(props.page.groups || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
)

function sortedSubgroups (group) {
    return [...(group.subgroups || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
}

function selectSubgroup (groupId, subgroupId) {
    if (uiStore.selectedGroupId !== groupId) {
        uiStore.selectedGroupId = groupId
    }
    uiStore.setSubgroupFilter(subgroupId)
}
</script>

<style scoped>
.secondary-nav {
    width: var(--nav-secondary-w);
    flex-shrink: 0;
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    padding: 16px 0;
    overflow-y: auto;
}

.secondary-nav__item {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    border-left: 3px solid transparent;
    color: var(--color-text);
    padding: 9px 16px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}

.secondary-nav__item--subgroup {
    padding-left: 28px;
    font-size: 0.8rem;
    color: var(--color-muted);
}

.secondary-nav__icon {
    font-size: 0.75rem;
    flex-shrink: 0;
    opacity: 0.7;
}

.secondary-nav__item:hover {
    background: rgba(255,255,255,0.05);
}

.secondary-nav__item.is-active {
    border-left-color: var(--color-accent);
    color: var(--color-accent);
    background: var(--color-accent-bg, rgba(61,210,141,0.08));
}

.secondary-nav__item--subgroup.is-active {
    border-left-color: var(--color-accent);
    opacity: 0.85;
}
</style>
