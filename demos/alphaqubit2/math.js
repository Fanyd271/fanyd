import katex from './vendor/katex/katex.mjs';

/** Render mathematical labels and derivations locally with real LaTeX typesetting. */
export function renderMath(root = document) {
  const elements = [...(root.matches?.('[data-tex]') ? [root] : []), ...root.querySelectorAll('[data-tex]')];
  for (const element of elements) {
    const tex = element.getAttribute('data-tex') || '';
    if (element.dataset.renderedTex === tex && element.querySelector('.katex')) continue;
    try {
      katex.render(tex, element, {
        displayMode: element.dataset.display === 'block', throwOnError: true,
        strict: 'warn', trust: false, output: 'htmlAndMathml',
      });
      element.dataset.renderedTex = tex;
      element.classList.remove('math-error');
    } catch (error) {
      element.textContent = tex;
      element.classList.add('math-error');
      (window.__mathErrors ||= []).push({ tex, message: error.message });
      console.error('Math rendering failed:', tex, error.message);
    }
  }
}
