// script.js - Igreja Presbiteriana em Casa Forte
// Refactored: Clean Code, Modular, No Loose Globals

document.addEventListener("DOMContentLoaded", () => {
  initThemeManager();
  initMobileDrawer();
  initSmoothScroll();
  initScrollObserver();
});

/**
 * Gerencia a alternância entre tema claro e escuro.
 */
function initThemeManager() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) return; // Early return

  const body = document.body;
  const themeIcon = themeToggleBtn.querySelector('i');
  const savedTheme = localStorage.getItem('theme');

  // Inicialização baseada na preferência salva
  if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
    updateThemeIcon(true);
  }

  themeToggleBtn.addEventListener('click', () => {
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
  });

  function updateThemeIcon(isDark) {
    if (!themeIcon) return;
    if (isDark) {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    } else {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    }
  }
}

/**
 * Controla a abertura e fechamento do menu lateral em dispositivos móveis.
 */
function initMobileDrawer() {
  const openDrawerBtn = document.getElementById('openDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const drawerLinks = document.querySelectorAll('.drawer-link');

  if (!mobileDrawer) return; // Early return

  const openDrawer = () => {
    mobileDrawer.classList.add('active');
    if (drawerOverlay) drawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Evita scroll do fundo
  };

  const closeDrawer = () => {
    mobileDrawer.classList.remove('active');
    if (drawerOverlay) drawerOverlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (openDrawerBtn) openDrawerBtn.addEventListener('click', openDrawer);
  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  drawerLinks.forEach(link => link.addEventListener('click', closeDrawer));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileDrawer.classList.contains('active')) {
      closeDrawer();
    }
  });
}

/**
 * Adiciona rolagem suave para âncoras internas, compensando o header fixo.
 */
function initSmoothScroll() {
  const navLinks = document.querySelectorAll('.nav-links a, .drawer-links a');
  if (!navLinks.length) return; // Early return

  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      
      if (href && href.startsWith('#') && href.length > 1) {
        e.preventDefault();
        const targetSection = document.getElementById(href.substring(1));
        
        if (targetSection) {
          const header = document.querySelector('header');
          const navbarHeight = header ? header.offsetHeight : 0;
          const offsetTop = targetSection.getBoundingClientRect().top + window.scrollY - navbarHeight;
          
          window.scrollTo({
            top: offsetTop,
            behavior: "smooth"
          });
        }
      }
    });
  });
}

/**
 * Observa os elementos para disparar animações CSS quando entrarem na viewport.
 */
function initScrollObserver() {
  const revealElements = document.querySelectorAll('.reveal');
  if (!revealElements.length) return; // Early return

  const revealOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, revealOptions);

  revealElements.forEach(el => revealObserver.observe(el));
}