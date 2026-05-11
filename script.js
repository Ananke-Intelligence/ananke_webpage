// ═══════════════════════════════════════════
//  MOBILE MENU
// ═══════════════════════════════════════════
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

function closeMobileMenu() {
  mobileMenu.classList.remove('open');
}

document.addEventListener('click', (e) => {
  if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
    mobileMenu.classList.remove('open');
  }
});

// ═══════════════════════════════════════════
//  NAVBAR SCROLL EFFECT
// ═══════════════════════════════════════════
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.style.borderBottomColor = 'rgba(139, 112, 53, 0.6)';
  } else {
    navbar.style.borderBottomColor = 'rgba(139, 112, 53, 0.4)';
  }
});

// ═══════════════════════════════════════════
//  SCROLL FADE-IN ANIMATIONS
// ═══════════════════════════════════════════
const fadeElements = document.querySelectorAll(
  '.feature-card, .process-step, .client-list li, .section-title, .quote-text, .mission-text, .vm-card'
);

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
