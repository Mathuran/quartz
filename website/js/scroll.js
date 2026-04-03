/**
 * Scroll-driven animations using Intersection Observer
 * (GSAP-free for Phase 1 — can be enhanced with GSAP ScrollTrigger later)
 */

export function initScrollAnimations() {
  // Reveal elements on scroll
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  );

  document.querySelectorAll('.reveal, .stagger-children').forEach((el) => {
    revealObserver.observe(el);
  });

  // Navbar scroll state
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const heroSection = document.querySelector('.hero');

    const navObserver = new IntersectionObserver(
      ([entry]) => {
        navbar.classList.toggle('scrolled', !entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' },
    );

    if (heroSection) {
      navObserver.observe(heroSection);
    }
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const navHeight = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--nav-height'),
        );
        const y = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  // Scroll hint fade out
  const scrollHint = document.querySelector('.scroll-hint');
  if (scrollHint) {
    const hideOnScroll = () => {
      if (window.scrollY > 100) {
        scrollHint.style.opacity = '0';
        scrollHint.style.transition = 'opacity 0.3s ease';
        window.removeEventListener('scroll', hideOnScroll);
      }
    };
    window.addEventListener('scroll', hideOnScroll, { passive: true });
  }
}
