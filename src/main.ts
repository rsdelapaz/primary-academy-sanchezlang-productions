import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { initializeTheme } from './presentation/theme-preference'
import './styles.css'
import './epic-experience.css'
import './epic-chrome.css'
import './wizard.css'
import './home-world.css'

await initializeTheme()

createApp(App).use(router).mount('#app')
