import { createRouter, createWebHashHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/ingles', name: 'english', component: () => import('./views/EnglishView.vue') },
    { path: '/ingles/irregular-verbs', name: 'irregular-verbs', component: () => import('./views/IrregularVerbsView.vue') },
    { path: '/ingles/irregular-verbs/quiz', name: 'quiz', component: () => import('./views/QuizView.vue') },
    { path: '/juego', name: 'game', component: () => import('./views/GameView.vue') },
    { path: '/resultados', name: 'results', component: () => import('./views/ResultsView.vue') },
    { path: '/revision', name: 'review', component: () => import('./views/ReviewView.vue') },
  ],
})
