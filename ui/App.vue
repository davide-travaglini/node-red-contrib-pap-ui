<template>
    <div class="pap-layout">
        <PrimaryNav />
        <SecondaryNav v-if="showSecondaryNav" :page="currentPage" />
        <main class="pap-body">
            <router-view />
        </main>
    </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PrimaryNav   from './components/layout/PrimaryNav.vue'
import SecondaryNav from './components/layout/SecondaryNav.vue'
import { useSocket }      from './composables/useSocket.js'
import { useLayoutStore } from './stores/layout.js'
import { useUiStore }     from './stores/ui.js'

// Apply theme from server config
function applyTheme (theme) {
    if (theme === 'auto') {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.dataset.theme = dark ? 'dark' : 'light'
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            document.documentElement.dataset.theme = e.matches ? 'dark' : 'light'
        })
    } else {
        document.documentElement.dataset.theme = theme || 'dark'
    }
}
applyTheme(window.__PAP__?.theme)

// Apply accent color from server config
function applyAccent (hex) {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const root = document.documentElement
    root.style.setProperty('--color-accent',    hex)
    root.style.setProperty('--color-accent-bg', `rgba(${r},${g},${b},0.1)`)
}
applyAccent(window.__PAP__?.accentColor)

const route       = useRoute()
const router      = useRouter()
const layoutStore = useLayoutStore()
const uiStore     = useUiStore()

const currentPage = computed(() =>
    route.params.id ? layoutStore.pageById(route.params.id) : null
)

// SecondaryNav visible if >1 group OR single group has >1 subgroup
const showSecondaryNav = computed(() => {
    if (!currentPage.value) return false
    const groups = currentPage.value.groups || []
    if (groups.length > 1) return true
    if (groups.length === 1 && (groups[0].subgroups || []).length > 1) return true
    return false
})

// Reset both filters whenever the page changes (back/forward, URL change, etc.)
watch(() => route.params.id, () => { uiStore.resetFilters() })

onMounted(async () => {
    useSocket()
    await layoutStore.fetchLayout()
    if (route.path === '/') {
        const home = layoutStore.pages.find(p => p.isHome)
        if (home) router.push('/page/' + home.id)
    }
})
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    height: 100%;
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
}

.pap-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
}

.pap-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    min-width: 0;
}

/* ── Responsive ─────────────────────────────────────────── */

/* Tablet: shrink primary nav */
@media (max-width: 1024px) {
    :root {
        --nav-primary-w:   56px;
        --nav-secondary-w: 160px;
    }
}

/* Mobile: hide sidebars, show bottom nav */
@media (max-width: 767px) {
    :root {
        --nav-primary-w:   0px;
        --nav-secondary-w: 0px;
    }

    .pap-layout {
        flex-direction: column-reverse;
    }

    .pap-body {
        padding: 12px;
        overflow-y: auto;
        flex: 1;
    }
}
</style>
