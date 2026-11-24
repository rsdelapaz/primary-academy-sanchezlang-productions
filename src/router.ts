import { createRouter, createWebHashHistory } from 'vue-router'
import { gameSession } from './presentation/game-session'
import { guardGameRoute } from './presentation/game-route-guard'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/subjects/:subjectId', name: 'subject', component: () => import('./views/SubjectView.vue') },
    { path: '/subjects/:subjectId/topics/:topicId', name: 'topic', component: () => import('./views/TopicView.vue') },
    { path: '/subjects/:subjectId/topics/:topicId/modes', name: 'modes', component: () => import('./views/ModesView.vue') },
    { path: '/subjects/:subjectId/topics/:topicId/modes/:modeId/config', name: 'configuration', component: () => import('./views/ConfigurationView.vue') },
    { path: '/subjects/:subjectId/topics/:topicId/modes/:modeId/play', name: 'play', component: () => import('./views/GameView.vue'), meta: { requiresActiveGame: true } },
    { path: '/subjects/:subjectId/topics/:topicId/modes/:modeId/results', name: 'results', component: () => import('./views/ResultsView.vue'), meta: { requiresCompletedGame: true } },
    { path: '/subjects/:subjectId/topics/:topicId/modes/:modeId/review', name: 'review', component: () => import('./views/ReviewView.vue'), meta: { requiresCompletedGame: true } },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
})

router.beforeEach((to) => {
  const decision = guardGameRoute({
    requiresActiveGame: to.meta.requiresActiveGame === true,
    requiresCompletedGame: to.meta.requiresCompletedGame === true,
    subjectId: typeof to.params.subjectId === 'string' ? to.params.subjectId : undefined,
    topicId: typeof to.params.topicId === 'string' ? to.params.topicId : undefined,
    modeId: typeof to.params.modeId === 'string' ? to.params.modeId : undefined,
  }, gameSession.value)
  return decision.kind === 'allow' ? true : { name: decision.name, params: decision.params }
})
