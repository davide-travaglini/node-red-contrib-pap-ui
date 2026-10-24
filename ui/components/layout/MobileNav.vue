<template>
    <nav class="mobile-nav">
        <button
            v-for="page in sortedPages"
            :key="page.id"
            class="mobile-nav__page"
            :class="{ 'is-active': route.params.id === page.id }"
            @click="navigate(page)"
        >
            <i v-if="page.icon" :class="'fa fa-' + page.icon" />
            <span>{{ page.name }}</span>
        </button>
    </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLayoutStore } from '../../stores/layout.js'
import { useUiStore }     from '../../stores/ui.js'

const route       = useRoute()
const router      = useRouter()
const layoutStore = useLayoutStore()
const uiStore     = useUiStore()

const sortedPages = computed(() =>
    [...layoutStore.pages].sort((a, b) => (a.order || 0) - (b.order || 0))
)

function navigate (page) {
    uiStore.setGroupFilter(null)
    router.push('/page/' + page.id)
}
</script>

<style scoped>
.mobile-nav {
    display: none;
}

@media (max-width: 767px) {
    .mobile-nav {
        display: flex;
        width: 100%;
        background: var(--color-surface);
        border-top: 1px solid var(--theme-surface-active);
        overflow-x: auto;
        flex-shrink: 0;
    }
}

.mobile-nav__page {
    flex: 1;
    min-width: 64px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    background: none;
    border: none;
    color: var(--color-muted);
    padding: 8px 4px 6px;
    font-size: 0.62rem;
    cursor: pointer;
}

.mobile-nav__page i {
    font-size: 1.1rem;
}

.mobile-nav__page span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 72px;
}

.mobile-nav__page.is-active {
    color: var(--color-accent);
}
</style>
