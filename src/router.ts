import { createRouter, createWebHashHistory } from 'vue-router'

// 해시 라우팅: GitHub Pages 같은 정적 호스팅에서 새로고침해도 404가 나지 않는다.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('./views/OnboardingView.vue') },
    { path: '/quests', component: () => import('./views/QuestListView.vue') },
    { path: '/ask', component: () => import('./views/AskView.vue') },
    { path: '/quests/:id', component: () => import('./views/QuestDetailView.vue') },
    { path: '/documents', component: () => import('./views/DocumentsView.vue') },
    { path: '/support', component: () => import('./views/SupportView.vue') },
    { path: '/freshness', component: () => import('./views/FreshnessView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
