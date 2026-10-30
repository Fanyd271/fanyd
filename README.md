# Fan Yidian's homepage

Personal academic homepage, published with GitHub Pages:
<https://fanyd271.github.io/fanyd/>

## Interactive demos

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
- `assets/resources.css`: shared styles for the Demos and Talks pages.

To add a presentation, put its PDF in `PPT/` and add a resource card in `talks/index.html` with its title, presentation date, description, and PDF links. Keep cards in reverse chronological order by presentation date, not PDF modification time. Presentation and demo cards are not displayed on the homepage.
