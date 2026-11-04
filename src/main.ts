import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './style.css';
import { usePlayerStore } from './stores/playerStore';
import { AudioService } from './services/AudioService';

async function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());
  // 先读存档再挂载，UI 第一帧就是正确的进度
  const player = usePlayerStore();
  await player.load();
  AudioService.configure(player.save.settings);
  app.mount('#app');
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(async () => {
        // 首次加载的资源早于 SW 接管，主动补进缓存，保证第一次访问后就能离线运行
        const urls = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin));
        const cache = await caches.open('leek-harvest-v1');
        await cache.addAll([...new Set([location.href, ...urls])]);
      })
      .catch(() => undefined);
  }
}
void bootstrap();
