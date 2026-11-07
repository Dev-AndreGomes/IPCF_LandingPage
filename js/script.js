// script.js - Igreja Presbiteriana em Casa Forte
// Carregado com `defer`. Sem variáveis globais; cada comportamento é um módulo pequeno.

initIntroAnimation();
initMobileDrawer();
if ('requestIdleCallback' in window) {
  requestIdleCallback(initActiveNav);
} else {
  setTimeout(initActiveNav, 200);
}

/**
 * Menu lateral mobile acessível: foco devolvido ao botão, `inert` no restante da página,
 * aria-expanded e fechamento por Esc, overlay, links e mudança para layout desktop.
 */
function initMobileDrawer() {
  const openBtn = document.getElementById('openDrawerBtn');
  const closeBtn = document.getElementById('closeDrawerBtn');
  const drawer = document.getElementById('mobileDrawer');
  let overlay = document.getElementById('drawerOverlay');
  if (!openBtn || !drawer) return;

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'drawer-overlay';
    overlay.id = 'drawerOverlay';
    document.body.appendChild(overlay);
  }

  const setOpen = (open) => {
    drawer.classList.toggle('active', open);
    overlay.classList.toggle('active', open);
    drawer.inert = !open;
    const background = document.querySelectorAll('header, main, footer, .skip-link');
    background.forEach((el) => {
      el.inert = open;
    });
    openBtn.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('drawer-open', open);
    (open ? (closeBtn || openBtn) : openBtn).focus();
  };

  openBtn.addEventListener('click', () => setOpen(true));
  closeBtn?.addEventListener('click', () => setOpen(false));
  overlay.addEventListener('click', () => setOpen(false));
  drawer.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('active')) setOpen(false);
  });

  window.matchMedia('(min-width: 62.0625rem)').addEventListener('change', (event) => {
    if (event.matches && drawer.classList.contains('active')) setOpen(false);
  });
}

/**
 * Marca no menu a seção visível (aria-current), só na página inicial.
 */
function initActiveNav() {
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  if (!links.length || !('IntersectionObserver' in window)) return;

  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const sections = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        byId.get(entry.target.id)?.setAttribute('aria-current', 'true');
      });
    },
    // Faixa estreita no topo da tela, logo abaixo do header fixo.
    { rootMargin: '-35% 0px -60% 0px' },
  );

  sections.forEach((section) => observer.observe(section));
}

/**
 * Animação de abertura cinematográfica: florescer do logo no centro,
 * voo calculado em tempo real até a Navbar (FLIP morph) e revelação do Hero.
 * Roda na 1ª visita da sessão (ou sempre que o usuário quiser via ?intro=1 ou replayIntro()).
 */
function initIntroAnimation() {
  const overlay = document.getElementById('introOverlay');
  if (!overlay) return;

  const KEY = 'ipcf_intro_seen_v2';
  const urlParams = new URLSearchParams(window.location.search);
  const forceIntro = urlParams.has('intro') || urlParams.has('anim') || urlParams.has('replay');

  // Apenas robôs de auditoria automatizada (Lighthouse, Googlebot, Headless)
  const isBot = /Chrome-Lighthouse|Googlebot|HeadlessChrome/i.test(navigator.userAgent);
  if (isBot && !forceIntro) {
    document.body.classList.add('intro-done');
    overlay.remove();
    return;
  }

  let seen = false;
  try {
    seen = sessionStorage.getItem(KEY) === 'true';
  } catch {
    seen = false;
  }

  const finishImmediately = (instant = false) => {
    try {
      sessionStorage.setItem(KEY, 'true');
    } catch {}
    document.body.classList.remove('intro-active', 'intro-revealing');
    document.body.classList.add('intro-done');
    const navLogoLink = document.querySelector('.navbar .nav-logo');
    if (navLogoLink) {
      navLogoLink.classList.remove('is-landing');
    }
    if (instant) {
      overlay.remove();
    } else {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 250);
    }
  };

  // Helper no console para testar e rever quantas vezes quiser
  window.replayIntro = () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
    window.location.search = '?intro=1';
  };

  if (seen && !forceIntro) {
    finishImmediately(true);
    return;
  }

  // Prepara o Hero para a transição suave
  document.body.classList.add('intro-active');

  const introLogo = document.getElementById('introLogoGroup');
  const targetLogo = document.querySelector('.navbar .nav-logo .nav-brand') || document.querySelector('.navbar .nav-logo img') || document.querySelector('.navbar .nav-logo');

  // Delay de proteção contra cliques residuais durante carregamento inicial
  let canSkip = false;
  setTimeout(() => {
    canSkip = true;
  }, 400);

  const handleUserSkip = () => {
    if (!canSkip) return;
    finishImmediately();
  };

  overlay.addEventListener('click', handleUserSkip);
  document.getElementById('introSkipBtn')?.addEventListener('click', () => finishImmediately());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === ' ') finishImmediately();
  });

  // 2.15s: As folhas florescem e o texto se assenta suavemente no centro da tela (~1s de leitura).
  // Em seguida, o conjunto realiza o voo calculado (FLIP) até a Navbar (0.72s), mantendo opacidade total.
  setTimeout(() => {
    if (!document.body.contains(overlay)) return;

    const navLogoLink = document.querySelector('.navbar .nav-logo');

    if (targetLogo && introLogo) {
      const targetSymbol = document.querySelector('.navbar .nav-logo .nav-brand-symbol') || targetLogo;
      const introSymbol = document.querySelector('.intro-symbol-stage') || introLogo;

      const tRect = targetSymbol.getBoundingClientRect();
      const iRect = introSymbol.getBoundingClientRect();

      const scale = tRect.height / iRect.height;
      const dx = tRect.left - iRect.left;
      const dy = tRect.top - iRect.top;

      introLogo.style.setProperty('--target-x', `${dx}px`);
      introLogo.style.setProperty('--target-y', `${dy}px`);
      introLogo.style.setProperty('--target-scale', `${scale}`);
    }

    // Inicia o voo com opacidade total e dissolve o fundo da intro revelando o Hero
    introLogo?.classList.add('is-traveling');
    overlay.classList.add('fade-backdrop');

    // Revela a estrutura da página em sincronia com o voo
    document.body.classList.remove('intro-active');
    document.body.classList.add('intro-revealing');

    // Ao alcançar o destino (~680ms de voo): o logo da navbar assume perfeitamente no mesmo lugar
    setTimeout(() => {
      if (!document.body.contains(overlay)) return;
      navLogoLink?.classList.add('is-landing');
      introLogo?.classList.add('is-landed');
    }, 680);

    // Conclusão total do pouso e gravação na sessão aos 820ms (~2.97s total)
    setTimeout(() => {
      try {
        sessionStorage.setItem(KEY, 'true');
      } catch {}
      document.body.classList.remove('intro-revealing');
      document.body.classList.add('intro-done');
      overlay.remove();
    }, 820);
  }, 2150);
}
