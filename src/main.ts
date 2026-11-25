import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { initializeTheme } from './presentation/theme-preference'
import './styles.css'

await initializeTheme()

createApp(App).use(router).mount('#app')
