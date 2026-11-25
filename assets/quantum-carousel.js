(() => {
  const carousel = document.querySelector('[data-quantum-carousel]');
  if (!carousel) return;

  const slides = [...carousel.querySelectorAll('.quantum-slide')];
  const tabs = [...carousel.querySelectorAll('.carousel-tab')];
  const rotationButton = carousel.querySelector('.carousel-toggle');
  const rotationLabel = rotationButton?.querySelector('span');
  const pauseIcon = rotationButton?.querySelector('[data-pause-icon]');
  const playIcon = rotationButton?.querySelector('[data-play-icon]');
  const status = carousel.querySelector('.carousel-status');
  if (slides.length < 2 || tabs.length !== slides.length || !rotationButton || !status) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const delay = Number(carousel.dataset.rotationDelay) || 8000;
  let currentIndex = 0;
  let rotationPaused = reducedMotion.matches;
  let pointerInside = false;
  let onScreen = true;
  let timeoutId;

  const stopRotation = () => window.clearTimeout(timeoutId);
  const scheduleRotation = () => {
    stopRotation();
    if (rotationPaused || pointerInside || document.hidden || !onScreen) return;
    timeoutId = window.setTimeout(() => showSlide(currentIndex + 1), delay);
  };

  const updateRotationButton = () => {
    rotationButton.setAttribute('aria-label', rotationPaused ? 'Start automatic slide rotation' : 'Pause automatic slide rotation');
    rotationLabel.textContent = rotationPaused ? 'Play' : 'Pause';
    pauseIcon.toggleAttribute('hidden', rotationPaused);
    playIcon.toggleAttribute('hidden', !rotationPaused);
  };

  const pauseRotation = () => {
    rotationPaused = true;
    updateRotationButton();
    stopRotation();
  };

  const showSlide = (requestedIndex, manual = false) => {
    currentIndex = (requestedIndex + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      slide.hidden = index !== currentIndex;
      slide.inert = index !== currentIndex;
      slide.setAttribute('aria-hidden', String(index !== currentIndex));
    });
    tabs.forEach((tab, index) => tab.setAttribute('aria-pressed', String(index === currentIndex)));
    carousel.dataset.activeSlide = String(currentIndex);
    if (manual) {
      pauseRotation();
      status.textContent = slides[currentIndex].getAttribute('aria-label');
    }
    scheduleRotation();
  };

  tabs.forEach((tab, index) => tab.addEventListener('click', () => showSlide(index, true)));
  rotationButton.addEventListener('click', () => {
    rotationPaused = !rotationPaused;
    updateRotationButton();
    scheduleRotation();
  });
  carousel.addEventListener('mouseenter', () => { pointerInside = true; stopRotation(); });
  carousel.addEventListener('mouseleave', () => { pointerInside = false; scheduleRotation(); });
  carousel.addEventListener('focusin', event => {
    if (!rotationButton.contains(event.target)) pauseRotation();
  });
  carousel.addEventListener('keydown', event => {
    if (!event.target.closest('.carousel-tab') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = currentIndex + (event.key === 'ArrowLeft' ? -1 : 1);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = slides.length - 1;
    showSlide(nextIndex, true);
    tabs[currentIndex].focus();
  });
  document.addEventListener('visibilitychange', scheduleRotation);
  reducedMotion.addEventListener('change', event => {
    if (event.matches) pauseRotation();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      onScreen = entries.some(entry => entry.isIntersecting);
      scheduleRotation();
    }, { threshold: 0 }).observe(carousel);
  }

  updateRotationButton();
  showSlide(0);
})();
