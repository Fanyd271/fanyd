(() => {
  document.documentElement.classList.add('js');

  const navigation = document.querySelector('.site-nav');
  const toggle = navigation?.querySelector('.nav-toggle');
  const links = navigation?.querySelector('.nav-links');
  if (!navigation || !toggle || !links) return;

  const setMenuOpen = (open, restoreFocus = false) => {
    navigation.dataset.menuOpen = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', event => {
    if (event.target.closest('a')) setMenuOpen(false);
  });
  document.addEventListener('click', event => {
    if (!navigation.contains(event.target)) setMenuOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenuOpen(false, true);
  });

  const desktop = window.matchMedia('(min-width: 1081px)');
  desktop.addEventListener('change', () => setMenuOpen(false));

  const sections = [...document.querySelectorAll('.home-main > section[id]')];
  const sectionLinks = [...links.querySelectorAll('a[href^="#"]')];
  if (!sections.length || !sectionLinks.length || !('IntersectionObserver' in window)) return;

  const visibleSections = new Set();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleSections.add(entry.target);
      else visibleSections.delete(entry.target);
    });
    const closest = [...visibleSections].sort((first, second) => Math.abs(first.getBoundingClientRect().top - 120) - Math.abs(second.getBoundingClientRect().top - 120))[0];
    sectionLinks.forEach(link => {
      if (closest && link.getAttribute('href') === `#${closest.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-90px 0px -45% 0px', threshold: 0 });
  sections.forEach(section => observer.observe(section));
})();
