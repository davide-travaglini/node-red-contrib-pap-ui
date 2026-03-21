import { createRouter, createWebHistory } from 'vue-router'
import PageView from '../views/PageView.vue'
import { defineComponent, h } from 'vue'

const EmptyState = defineComponent({
    render () { return h('div') }
})

export default createRouter({
    history: createWebHistory(window.__PAP__?.basePath || '/pap/ui/'),
    routes: [
        { path: '/',          component: EmptyState },
        { path: '/page/:id',  component: PageView,  props: true }
    ]
})
