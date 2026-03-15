/**
 * Quartz Launch Website
 */

import { initScrollAnimations } from './scroll.js';

function initTheme() {
  const toggle = document.querySelector('.theme-toggle');
  const root = document.documentElement;

  const saved = localStorage.getItem('quartz-theme');
  if (saved) {
    root.setAttribute('data-theme', saved);
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      localStorage.setItem('quartz-theme', next);
    });
  }
}

function initDemoLazyLoad() {
  const demoSection = document.getElementById('demo');
  const placeholder = document.getElementById('demo-placeholder');
  if (!demoSection || !placeholder) return;

  let loaded = false;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && !loaded) {
        loaded = true;
        observer.disconnect();

        const wrapper = document.querySelector('.demo-editor-wrapper');
        if (!wrapper) return;

        const iframe = document.createElement('iframe');
        iframe.src = 'demo/index.html';
        iframe.className = 'demo-editor-frame';
        iframe.title = 'Quartz Editor Demo';
        iframe.setAttribute('loading', 'lazy');

        iframe.addEventListener('load', () => {
          placeholder.remove();
        });

        placeholder.insertAdjacentElement('afterend', iframe);
      }
    },
    { rootMargin: '400px 0px' }
  );

  observer.observe(demoSection);
}

document.addEventListener('DOMContentLoaded', () => {
  // Mark JS as loaded for progressive enhancement
  document.body.classList.add('js-loaded');

  initTheme();
  initScrollAnimations();
  initDemoLazyLoad();
});
