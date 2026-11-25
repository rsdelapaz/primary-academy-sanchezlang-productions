import { createRouter, createWebHashHistory } from 'vue-router'
import { gameSession } from './presentation/game-session'
import { guardGameRoute } from './presentation/game-route-guard'
import { studySession } from './presentation/study-session'
import { guardStudyRoute } from './presentation/study-route-guard'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/configure/:subjectId?/:topicId?/:modeId?', name: 'choose-challenge', component: () => import('./views/ConfigurationView.vue') },
    { path: '/subjects/:subjectId', name: 'subject', redirect: (to) => ({ name: 'choose-challenge', params: { subjectId: to.params.subjectId } }) },
    { path: '/subjects/:subjectId/topics/:topicId', name: 'topic', redirect: (to) => ({ name: 'choose-challenge', params: { subjectId: to.params.subjectId, topicId: to.params.topicId } }) },
    { path: '/subjects/:subjectId/topics/:topicId/modes', name: 'modes', redirect: (to) => ({ name: 'choose-challenge', params: { subjectId: to.params.subjectId, topicId: to.params.topicId } }) },
    { path: '/subjects/:subjectId/topics/:topicId/modes/:modeId/config', name: 'configuration', redirect: (to) => ({ name: 'choose-challenge', params: { subjectId: to.params.subjectId, topicId: to.params.topicId, modeId: to.params.modeId } }) },
    { path: '/subjects/:subjectId/topics/:topicId/modes/:modeId/play', name: 'play', component: () => import('./views/GameView.vue'), meta: { requiresActiveGame: true } },
    { path: '/subjects/:subjectId/topics/:topicId/modes/:modeId/results', name: 'results', component: () => import('./views/ResultsView.vue'), meta: { requiresCompletedGame: true } },
    { path: '/subjects/:subjectId/topics/:topicId/modes/:modeId/review', name: 'review', component: () => import('./views/ReviewView.vue'), meta: { requiresCompletedGame: true } },
    { path: '/subjects/:subjectId/topics/:topicId/study', name: 'study', component: () => import('./views/StudyView.vue'), meta: { requiresStudySession: true } },
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
  if (decision.kind === 'redirect') return { name: decision.name, params: decision.params }

  const studyDecision = guardStudyRoute({
    requiresStudySession: to.meta.requiresStudySession === true,
    subjectId: typeof to.params.subjectId === 'string' ? to.params.subjectId : undefined,
    topicId: typeof to.params.topicId === 'string' ? to.params.topicId : undefined,
  }, studySession.value)
  return studyDecision.kind === 'allow' ? true : { name: studyDecision.name }
})
