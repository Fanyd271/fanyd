import { mountArchitecture } from './architecture.js';
import { mountStreaming } from './streaming.js';

const demo = Object.freeze({ groupSize: 6, realD: 512, rnnLayers: 5, spatialLayers: 9 });
const architecture = mountArchitecture(document.getElementById('arch-view'), demo);
const streaming = mountStreaming(document.getElementById('stream-view'), demo);
const tabs = [...document.querySelectorAll('.workspace-tab')];
function selectTab(name, updateHistory = true) {
  const streamingSelected = name === 'streaming';
  tabs.forEach((button, i) => {
    const active = streamingSelected ? i === 1 : i === 0;
    button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
  });
  document.getElementById('arch-view').hidden = streamingSelected;
  document.getElementById('stream-view').hidden = !streamingSelected;
  if (streamingSelected) { architecture?.pause?.(); architecture?.onLeave?.(); streaming?.onEnter?.(); }
  else { streaming?.pause?.(); streaming?.onLeave?.(); architecture?.onEnter?.(); }
  if (updateHistory && location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
}
tabs.forEach((button, i) => {
  button.addEventListener('click', () => selectTab(i === 1 ? 'streaming' : 'architecture'));
  button.addEventListener('keydown', e => {
    if (['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
      e.preventDefault(); const index = e.key === 'Home' ? 0 : e.key === 'End' ? 1 : i === 0 ? 1 : 0;
      selectTab(index ? 'streaming' : 'architecture'); tabs[index].focus();
    }
  });
});
window.addEventListener('hashchange', () => selectTab(location.hash === '#streaming' ? 'streaming' : 'architecture', false));
selectTab(location.hash === '#streaming' ? 'streaming' : 'architecture', false);
const dialog = document.getElementById('about-dialog');
document.getElementById('about-open').addEventListener('click', () => dialog.showModal());
document.getElementById('about-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { architecture?.pause?.(); architecture?.onLeave?.(); streaming?.pause?.(); streaming?.onLeave?.(); } });
window.addEventListener('pagehide', () => { architecture?.destroy?.(); streaming?.destroy?.(); });
