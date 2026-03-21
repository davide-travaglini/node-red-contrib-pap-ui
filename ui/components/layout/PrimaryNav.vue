<template>
    <nav class="primary-nav">
        <div class="primary-nav__brand">{{ appTitle }}</div>

        <div v-if="layoutStore.areas.length > 0">
            <div v-for="area in sortedAreas" :key="area.id" class="primary-nav__area">
                <div class="primary-nav__area-label">{{ area.name }}</div>
                <button
                    v-for="page in pagesForArea(area.id)"
                    :key="page.id"
                    class="primary-nav__page"
                    :class="{ 'is-active': route.params.id === page.id }"
                    @click="navigate(page)"
                >
                    <i v-if="page.icon" :class="'fa fa-' + page.icon" />
                    {{ page.name }}
                </button>
            </div>
            <!-- Pages with no area -->
            <div v-if="pagesWithoutArea.length" class="primary-nav__area">
                <button
                    v-for="page in pagesWithoutArea"
                    :key="page.id"
                    class="primary-nav__page"
                    :class="{ 'is-active': route.params.id === page.id }"
                    @click="navigate(page)"
                >
                    <i v-if="page.icon" :class="'fa fa-' + page.icon" />
                    {{ page.name }}
                </button>
            </div>
        </div>

        <div v-else>
            <button
                v-for="page in sortedPages"
                :key="page.id"
                class="primary-nav__page"
                :class="{ 'is-active': route.params.id === page.id }"
                @click="navigate(page)"
            >
                <i v-if="page.icon" :class="'fa fa-' + page.icon" />
                {{ page.name }}
            </button>
        </div>
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

const appTitle = window.__PAP__?.title || 'PAP UI'

const sortedPages = computed(() =>
    [...layoutStore.pages].sort((a, b) => (a.order || 0) - (b.order || 0))
)

const sortedAreas = computed(() =>
    [...layoutStore.areas].sort((a, b) => (a.order || 0) - (b.order || 0))
)

const pagesWithoutArea = computed(() =>
    sortedPages.value.filter(p => !p.areaId)
)

function pagesForArea (areaId) {
    return sortedPages.value.filter(p => p.areaId === areaId)
}

function navigate (page) {
    uiStore.setGroupFilter(null)
    router.push('/page/' + page.id)
}
</script>

<style scoped>
.primary-nav {
    width: var(--nav-primary-w);
    flex-shrink: 0;
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    padding: 16px 0;
    overflow-y: auto;
    transition: width 0.2s ease;
}

/* Tablet: icon-only mode */
@media (max-width: 1024px) {
    .primary-nav {
        padding: 12px 0;
    }
    .primary-nav__brand {
        font-size: 0.8rem;
        padding: 0 8px 16px;
        text-align: center;
    }
    .primary-nav__area-label {
        display: none;
    }
    .primary-nav__page {
        justify-content: center;
        padding: 10px 8px;
        font-size: 0.75rem;
    }
    .primary-nav__page span {
        display: none;
    }
}

/* Mobile: hide completely */
@media (max-width: 767px) {
    .primary-nav {
        display: none;
    }
}

.primary-nav__brand {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-accent);
    padding: 0 16px 20px;
    letter-spacing: 0.05em;
}

.primary-nav__area {
    margin-bottom: 8px;
}

.primary-nav__area-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted);
    padding: 8px 16px 4px;
}

.primary-nav__page {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    color: var(--color-text);
    padding: 9px 16px;
    font-size: 0.9rem;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: background 0.15s, color 0.15s;
}

.primary-nav__page:hover {
    background: rgba(255,255,255,0.05);
}

.primary-nav__page.is-active {
    border-left-color: var(--color-accent);
    color: var(--color-accent);
    background: var(--color-accent-bg, rgba(61,210,141,0.1));
}
</style>
