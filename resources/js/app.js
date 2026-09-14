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
        const app = createApp({ render: () => h(App, props) })

        // Global error boundary: a render crash in one tool shows a
        // recoverable banner instead of leaving a dead page behind.
        app.config.errorHandler = (err, instance, info) => {
            console.error('[global-error]', err, info)
            if (document.getElementById('global-error-banner')) return
            const banner = document.createElement('div')
            banner.id = 'global-error-banner'
            banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;background:#1a1512;color:#f5e6c8;border:1px solid #b8860b;padding:12px 16px;font:12px monospace;display:flex;gap:12px;align-items:center;box-shadow:0 4px 24px rgba(0,0,0,.5)'
            const msg = document.createElement('span')
            msg.textContent = 'Something broke on this page.'
            const reload = document.createElement('button')
            reload.textContent = 'Reload'
            reload.style.cssText = 'background:#d4a04a;border:none;color:#0d0a06;padding:6px 12px;cursor:pointer;font:inherit'
            reload.onclick = () => window.location.reload()
            const dismiss = document.createElement('button')
            dismiss.textContent = 'Dismiss'
            dismiss.style.cssText = 'background:transparent;border:1px solid #b8860b;color:#d4a04a;padding:6px 12px;cursor:pointer;font:inherit'
            dismiss.onclick = () => banner.remove()
            banner.append(msg, reload, dismiss)
            document.body.appendChild(banner)
        }

        return app
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