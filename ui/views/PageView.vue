<template>
    <div>
        <div v-if="page">
            <h2 class="page-view__title">{{ page.name }}</h2>
            <WidgetBody :page="page" />
        </div>
        <div v-else class="page-view__not-found">
            Pagina non trovata.
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLayoutStore } from '../stores/layout.js'
import WidgetBody from '../components/body/WidgetBody.vue'

const props = defineProps({
    id: { type: String, required: true }
})

const layoutStore = useLayoutStore()

const page = computed(() => layoutStore.pageById(props.id))
</script>

<style scoped>
.page-view__title {
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 20px;
}

.page-view__not-found {
    color: var(--color-muted);
    text-align: center;
    padding: 80px 0;
}
</style>
