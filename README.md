# Fan Yidian's homepage

Personal academic homepage, published with GitHub Pages:
<https://fanyd271.github.io/fanyd/>

## Interactive demos

- **AlphaQubit 2 architecture** — `demos/alphaqubit2/`: a layer-by-layer AQ2-full network explainer and streaming-state schedule, mirrored from the saved Site. KaTeX and its fonts are bundled locally; its MIT license is retained in `demos/alphaqubit2/vendor/katex/LICENSE`.
- **OAT spin squeezing** — `demos/oat/`: exact finite-N moments, linked 3D/2D views, preparation time, alignment, and phase encoding.
- **Linear shear** — `demos/oat/shear/`: the earlier demo, preserved with its sandboxed iframe and Content Security Policy.
- **8-GPU parallel training** — `demos/eight-gpu/`: TP/PP/DP allocation and communication, plus an interactive Microbatch/1F1B timeline. Mirrored from the saved Site with its original sandboxed visualizations and Content Security Policy preserved.

The homepage and demos are static HTML/CSS/JavaScript; no build step is needed.
All demo asset links are relative so the site also works under the `/fanyd/` project path.
The exact OAT demo has no external runtime dependencies; the legacy shear demo retains its pinned CDN libraries.

To preview locally, run `python3 -m http.server 8000` in this directory and open <http://localhost:8000/>.

## Resource pages

- `index.html`: profile, publications, education, awards, and service.
- `demos/index.html`: interactive demo collection, available from the Demos navigation link.
- `talks/index.html`: group meeting and presentation materials, available from the Talks navigation link.
- `PPT/`: original presentation PDFs.
- `assets/site.css`: shared light-blue palette, locally bundled fonts, navigation, and buttons.
- `assets/home.css`: homepage layout, publication lists, and the quantum-state illustration panel.
- `assets/resources.css`: collection-specific styles for the Demos and Talks pages.
- `assets/site.js`: accessible mobile navigation and homepage section highlighting.
- `assets/quantum-state.svg`, `assets/quantum-gravity.svg`, `assets/happy-code.svg`: original conceptual illustrations for the homepage carousel, not numerical simulation data.
- `assets/quantum-carousel.js`: eight-second automatic rotation, manual selection, pause controls, and reduced-motion support.
- `assets/fonts/`: STIX Two Text, Source Sans 3, and a common-character Chinese WenKai webfont, with their SIL Open Font Licenses.

To add a presentation, put its PDF in `PPT/` and add a resource card in `talks/index.html` with its title, presentation date, description, and PDF links. Keep cards in reverse chronological order by presentation date, not PDF modification time. Presentation and demo cards are not displayed on the homepage.

## Visual theme

The homepage keeps its light-blue background, with deep-blue and teal details. STIX Two Text is used for editorial headings and Source Sans 3 for Latin body text. Chinese text prefers standard system Kai fonts (Kaiti SC, STKaiti, or KaiTi); the locally bundled WenKai subset is a fallback when those are unavailable. Font licenses and subset details are in `assets/fonts/`. All webfonts are hosted locally, so the main pages do not depend on a font CDN at runtime. Change the palette and font stacks in `assets/site.css`.

Design references: [Sal Pace](https://salpace.github.io/) for academic typography and editorial structure, [Åsmund Folkestad](https://afolkestad.com/) for the connection between physics and visual art, and [QuSoft](https://qusoft.org/) for geometric quantum imagery. No artwork or source code from these sites is included.

The physics carousel adds a gravity-inspired quantum-simulation schematic based on [Jafferis et al. (2022)](https://inqnet.caltech.edu/wormhole2022/), and a finite hyperbolic pentagon tensor-network patch inspired by the [HaPPY code](https://arxiv.org/abs/1503.06237). The gravity illustration represents a model and its gravitational interpretation, not an actual spacetime wormhole. Auto-rotation stops on hover, keyboard interaction, hidden tabs, and when the carousel is off-screen; reduced-motion preferences disable automatic rotation by default. Visitors can still select any figure manually.
