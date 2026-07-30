// ═══════════════════════════════════════════
//  THEME
//  ───────────────────────────────────────────
//  The stored choice is applied by a tiny inline script in <head> so the
//  correct palette is painted on the first frame. This file only handles the
//  toggling afterwards. With nothing stored we leave data-theme off entirely,
//  which lets the prefers-color-scheme block in the stylesheet decide.
// ═══════════════════════════════════════════
const THEME_KEY = 'ananke-theme';

function currentTheme() {
  const set = document.documentElement.getAttribute('data-theme');
  if (set) return set;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  const root = document.documentElement;

  // Crossfade every surface at once, then drop the class so hover and scroll
  // transitions elsewhere are not competing with a global rule.
  root.classList.add('theme-transition');
  root.setAttribute('data-theme', theme);
  window.setTimeout(() => root.classList.remove('theme-transition'), 320);

  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode */ }

  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-pressed', String(theme === 'light'));
  });

  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

document.querySelectorAll('.theme-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });
});

// Reflect the label on load without writing to storage — a visitor who has
// never chosen is still following the system, and saving here would freeze
// them to whatever their OS happened to be set to on their first visit.
(function syncToggleLabels() {
  const theme = currentTheme();
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-pressed', String(theme === 'light'));
  });
})();

// Follow the OS if it changes and the visitor has never picked a side.
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  let stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
  if (!stored) document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: currentTheme() } }));
});

// ═══════════════════════════════════════════
//  MOBILE MENU
// ═══════════════════════════════════════════
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
}

function closeMobileMenu() {
  if (mobileMenu) mobileMenu.classList.remove('open');
  if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
}

// ═══════════════════════════════════════════
//  NAVBAR SCROLL EFFECT
// ═══════════════════════════════════════════
const navbar = document.getElementById('navbar');
if (navbar) {
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ═══════════════════════════════════════════
//  SCROLL FADE-IN ANIMATIONS
// ═══════════════════════════════════════════
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const fadeElements = document.querySelectorAll(
  '.feature-card, .process-step, .client-list li, .section-title, .quote-text, .mission-text, .vm-card'
);

if (!reduceMotion) {
  fadeElements.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, 80 * i);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  fadeElements.forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════
//  INEVITABLE — GOLDEN LETTER WAVE ON HOVER
// ═══════════════════════════════════════════
const tagline = document.querySelector('.italic-line');
if (tagline) {
  const childNodes = [...tagline.childNodes];
  tagline.innerHTML = '';

  childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      [...node.textContent].forEach(ch => {
        if (ch === ' ') {
          tagline.appendChild(document.createTextNode(' '));
        } else {
          const s = document.createElement('span');
          s.className = 'char';
          s.textContent = ch;
          tagline.appendChild(s);
        }
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      [...node.textContent].forEach(ch => {
        const s = document.createElement('span');
        s.className = 'char ' + node.className;
        s.textContent = ch;
        tagline.appendChild(s);
      });
    }
  });

  const chars = tagline.querySelectorAll('.char');

  tagline.addEventListener('mouseenter', () => {
    chars.forEach((ch, i) => {
      ch.classList.remove('flare');
      void ch.offsetWidth;
      ch.style.animationDelay = `${i * 0.045}s`;
      ch.classList.add('flare');
    });
  });
}

// ═══════════════════════════════════════════
//  HERO NETWORK
//  ───────────────────────────────────────────
//  Nodes drift; any two closer than LINK_DIST are joined, and the line fades
//  with distance. Everything the pointer does is a local strengthening of
//  that same rule — nodes lean in, the join radius grows, opacity rises — so
//  the mesh visibly organises itself around the cursor and relaxes when it
//  leaves. Structure emerging from scattered points is the whole argument of
//  the page, so the interaction is the claim rather than decoration.
// ═══════════════════════════════════════════
(function heroNetwork() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const hero = canvas.closest('#hero') || canvas.parentElement;

  const LINK_DIST   = 132;   // px between nodes before a line is drawn
  const CURSOR_R    = 190;   // radius of pointer influence
  const MAX_NODES   = 88;
  const SPEED       = 0.16;

  let nodes = [];
  let w = 0, h = 0, dpr = 1;
  let rafId = null;
  let onScreen = true;
  const pointer = { x: 0, y: 0, active: false };

  // Palette comes from the stylesheet so the drawing follows the theme
  // instead of keeping its own copy of the brand colours.
  let rgb = '201,144,42';
  let nodeAlpha = 0.55;
  let linkAlpha = 0.16;

  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const v = cs.getPropertyValue('--gold-rgb').trim();
    if (v) rgb = v.replace(/\s+/g, '');
    // Gold at low alpha nearly disappears on cream, so light mode needs more
    // of it, not less. This is the one place the two themes disagree.
    const light = cs.getPropertyValue('--scheme').trim() === 'light';
    nodeAlpha = light ? 0.85 : 0.55;
    linkAlpha = light ? 0.28 : 0.16;
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.min(MAX_NODES, Math.round((w * h) / 15000));
    nodes = [];
    for (let i = 0; i < target; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
        r: 1 + Math.random() * 1.6
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;

      // Wrap rather than bounce. A bounce reads as a wall, and there is no
      // wall — the field is meant to feel like it continues past the frame.
      if (n.x < -20) n.x = w + 20;
      if (n.x > w + 20) n.x = -20;
      if (n.y < -20) n.y = h + 20;
      if (n.y > h + 20) n.y = -20;

      if (pointer.active) {
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < CURSOR_R && d > 1) {
          const pull = (1 - d / CURSOR_R) * 0.24;
          n.x += (dx / d) * pull;
          n.y += (dy / d) * pull;
        }
      }
    }

    // Links. O(n²) over <=88 nodes is ~3.8k checks a frame, which is nothing.
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;

        let reach = LINK_DIST;
        let boost = 0;
        if (pointer.active) {
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const md = Math.hypot(pointer.x - mx, pointer.y - my);
          if (md < CURSOR_R) {
            const near = 1 - md / CURSOR_R;
            reach = LINK_DIST * (1 + near * 0.55);
            boost = near * 0.5;
          }
        }

        if (d2 < reach * reach) {
          const d = Math.sqrt(d2);
          const o = (1 - d / reach) * (linkAlpha + boost);
          ctx.strokeStyle = `rgba(${rgb},${o.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Nodes on top, brightening inside the cursor field.
    for (const n of nodes) {
      let o = nodeAlpha;
      let r = n.r;
      if (pointer.active) {
        const d = Math.hypot(pointer.x - n.x, pointer.y - n.y);
        if (d < CURSOR_R) {
          const near = 1 - d / CURSOR_R;
          o = Math.min(1, nodeAlpha + near * 0.45);
          r = n.r + near * 1.3;
        }
      }
      ctx.fillStyle = `rgba(${rgb},${o.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() {
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (rafId === null && !reduceMotion) rafId = requestAnimationFrame(loop);
  }
  function stop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }

  readPalette();
  resize();

  if (reduceMotion) {
    // A single still frame: the structure is still visible, nothing moves.
    draw();
  } else {
    start();
  }

  // Pointer is tracked on the hero, not the canvas — the canvas has
  // pointer-events disabled so it never intercepts a click on the buttons.
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const rect = hero.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = true;
  });
  hero.addEventListener('pointerleave', () => { pointer.active = false; });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      if (reduceMotion) draw();
    }, 150);
  });

  document.addEventListener('themechange', () => {
    readPalette();
    if (reduceMotion) draw();
  });

  // Do not burn a rAF loop on a hero that has scrolled out of view, or on a
  // tab nobody is looking at.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      if (onScreen && !document.hidden) start(); else stop();
    }, { threshold: 0 }).observe(hero);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !onScreen) stop(); else start();
  });
})();
