'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // A service worker must never cache the development site. Otherwise localhost
    // can keep serving an old build (including removed authentication screens),
    // even when the Next.js development server is not running.
    if (process.env.NODE_ENV !== 'production') {
      const clearDevelopmentCaches = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames
              .filter((name) => name.startsWith('villa-rental-'))
              .map((name) => caches.delete(name))
          );
        }
      };

      clearDevelopmentCaches().catch((error) => {
        console.error('Failed to clear development service worker caches:', error);
      });
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered:', registration.scope);

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!reloaded) {
            reloaded = true;
            window.location.reload();
          }
        });
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    };

    registerSW();
  }, []);

  return null;
}
