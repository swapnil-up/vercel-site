import './bootstrap';
import { createApp, h } from "vue";
import { createInertiaApp } from "@inertiajs/vue3";
import AppLayout from "@/Layouts/AppLayout.vue";

createInertiaApp({
    resolve: (name) => {
        const pages = import.meta.glob("./Pages/**/*.vue", { eager: true });
        let page = pages[`./Pages/${name}.vue`].default;

        page.layout = page.layout || AppLayout; //pass others as a prop if neeeded

        return page;
    },
    setup({ el, App, props, plugin }) {
        createApp({ render: () => h(App, props) })
            .use(plugin)
            .mount(el);
    },
});
