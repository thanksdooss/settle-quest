import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages 하위 경로 배포를 위해 상대 경로로 뽑는다.
  base: './',
  // 실행 환경이 포트를 지정하면 따른다(미리보기 도구 등).
  server: { port: process.env.PORT ? Number(process.env.PORT) : 5173 },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Settle Quest',
        short_name: 'Settle Quest',
        description: '유학생 초기 정착 절차 안내 — 모든 안내에 출처와 마지막 확인일이 붙습니다.',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f7f7f5',
        theme_color: '#1c5d99',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tesseract의 학습 데이터는 크고 CDN에서 온다. 미리 캐시하지 않는다.
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})
