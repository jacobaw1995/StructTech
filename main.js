/* =======================================================
   STRUCTTECH MAIN SITE — Shared JS
   ======================================================= */

(function () {
  'use strict';

  /* ── NAV SCROLL EFFECT ── */
  const nav = document.querySelector('.site-nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 48);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── MOBILE NAV TOGGLE ── */
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.nav-mobile');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('nav-open');
    });
  }
  // Close on mobile link click
  if (mobileNav) {
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        document.body.classList.remove('nav-open');
      });
    });
  }
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('nav-open')) {
      if (!nav.contains(e.target) && !mobileNav.contains(e.target)) {
        document.body.classList.remove('nav-open');
      }
    }
  });

  /* ── ACTIVE NAV LINK ── */
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(link => {
    const href = link.getAttribute('href') || '';
    const page = path.split('/').pop() || 'index.html';
    if (
      (href === 'index.html' && (page === 'index.html' || page === '')) ||
      (href !== 'index.html' && href !== '' && page === href)
    ) {
      link.classList.add('active');
    }
  });

  /* ── SCROLL REVEAL ANIMATIONS ── */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left');
  if (revealEls.length) {
    // Apply stagger delays to grid children
    document.querySelectorAll('.problem-grid .reveal, .steps-grid .reveal, .phase-cards .reveal').forEach((el, i) => {
      el.style.transitionDelay = `${i * 0.07}s`;
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Fire once
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    revealEls.forEach(el => observer.observe(el));
  }

  /* ── SMOOTH ANCHOR SCROLL ── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68;
        const top = target.getBoundingClientRect().top + window.scrollY - offset - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ── CTA TRACKING ── */
  document.querySelectorAll('a[href*="audit.structtek.com"], .track-cta').forEach(el => {
    el.addEventListener('click', () => {
      if (typeof fbq !== 'undefined') {
        fbq('track', 'Lead', { content_name: 'Scan CTA Click', content_category: 'Main Site' });
      }
      if (typeof gtag !== 'undefined') {
        gtag('event', 'cta_click', { event_category: 'engagement', event_label: 'scan_cta' });
      }
    });
  });

})();
