# Fan Yidian's homepage

Personal academic homepage, published with GitHub Pages:
<https://fanyd271.github.io/fanyd/>

## Interactive demos

- **OAT spin squeezing** — `demos/oat/`: exact finite-N moments, linked 3D/2D views, preparation time, alignment, and phase encoding.
- **Linear shear** — `demos/oat/shear/`: the earlier demo, preserved with its sandboxed iframe and Content Security Policy.

The homepage and demos are static HTML/CSS/JavaScript; no build step is needed.
All demo asset links are relative so the site also works under the `/fanyd/` project path.
The exact OAT demo has no external runtime dependencies; the legacy shear demo retains its pinned CDN libraries.

To preview locally, run `python3 -m http.server 8000` in this directory and open <http://localhost:8000/>.
