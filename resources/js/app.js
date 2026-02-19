import './bootstrap';
import '../css/app.css';

import { createApp, h } from 'vue';
import { createInertiaApp, Head, Link } from '@inertiajs/vue3';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ZiggyVue } from 'ziggy-js';
import AppLayout from "@/Layouts/AppLayout.vue";

const appName = import.meta.env.VITE_APP_NAME || 'Swapnil Upadhyay';

createInertiaApp({
    title: (title) => title ? `${title} - ${appName}` : appName,

    resolve: async (name) => {
        const page = await resolvePageComponent(
            `./Pages/${name}.vue`, 
            import.meta.glob('./Pages/**/*.vue')
        );
        page.default.layout = page.default.layout || AppLayout;

        return page;
    },

    setup({ el, App, props, plugin }) {
        return createApp({ render: () => h(App, props) })
            .use(plugin)
            .use(ZiggyVue)
            .component('Head', Head)
            .component('Link', Link)
            .mount(el);
    },
    
    progress: {
        color: '#4B5563',
        showSpinner: true,
    },
});