# Build and contribute

The guide has one content source: plain Markdown. GitHub displays the source directly; the local generator makes static HTML from an explicit list of chapters. Mermaid code fences render in both GitHub and the website.

## Local website

Use Node.js 22 or newer. From the repository root:

```sh
npm ci --registry=https://registry.npmjs.org
npm run check
npm run build
npm run check:site
npm run preview
```

The preview prints its local address. It also serves a `/x360/` alias for checking project-path hosting. Stop it with Ctrl+C. These commands build and inspect documentation only; they do not invoke the NAND analyzer or contact a console. Tests use synthetic fixtures.

Generated files live in `dist/`, which is ignored by Git. Source Markdown, the dependency lockfile and build scripts belong in Git. Guide styles, search, Mermaid and the homepage 3D model use locally bundled assets. External source links are provided for attribution and further reading.

## GitHub Pages

The included workflow validates pull requests and builds a Pages artifact. Deployment runs only on a push to `main` or a manual workflow run on `main`.

1. Push the reviewed repository changes through your normal process.
2. In the repository's **Settings → Pages**, choose **GitHub Actions** as the build and deployment source.
3. Run the **Field Guide** workflow, or push to `main`.
4. Use the deployment URL returned by GitHub. A workflow file in the checkout does not mean the site is already published.

Relative links support a project site such as `/x360/`, as well as a domain root. A different static host can serve the contents of `dist/`; no server-side runtime is needed. See GitHub's [custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) for Pages permissions and environment settings.

## Edit a chapter

Use descriptive headings and relative links: `[NAND explained](NAND_EXPLAINED.md)` from another chapter, or `[Start here](docs/START_HERE.md)` from the root README. Preserve existing filenames so old GitHub links still work. Use standard Markdown tables and fenced `mermaid` blocks; no site-only components are needed.

A new public page must be added to `site/content.mjs`. That explicit publication list prevents a stray local report from automatically becoming a website page. The builder copies only listed Markdown and selected assets. Do not add binary console material to the asset list.

Keep diagrams conceptual, with short labels and a sentence explaining the same idea in prose. The website uses [Mermaid's strict security mode](https://mermaid.js.org/config/schema-docs/config) and retains diagram source when rendering fails or JavaScript is unavailable. Links inside diagrams are not required for navigation.

### Timeline and method status

Edit the [exploit timeline](EXPLOIT_TIMELINE.md) as ordinary Markdown: `##` headings group eras, and each `### Date — Milestone title` starts an event. Keep events newest first. The site turns these headings into a vertical timeline at build time, preserving the text, links and heading anchors. GitHub displays the same chapter without custom HTML or scripts. Distinguish release dates from demonstrations, announcements and later documentation checkpoints.

Use `> **Legacy** — ...` for superseded methods or retired entry points and explain the replacement or remaining use. Use `> **Beta** — ...` where the author labels a method experimental. Age alone does not make a method obsolete. Keep these notices aligned with `site/method-meta.mjs`, which supplies sidebar badges and the shared glitch-method order. Put newer variants first, followed by current alternatives and legacy methods; do not infer release dates from version numbers or repository upload dates.

## Check the evidence

Link technical claims to original authors or maintained source projects. Record the release and date you inspected when support is changing. Do not turn one board's results into universal compatibility. Distinguish a game entry point, a privilege escalation, a payload, a persistent installation, and a user-facing launcher.

Use M$ in original prose as the project's community style. Preserve real URLs, exact code identifiers and source titles where changing them would break attribution. Give credit near the explanation as well as in [Sources and thanks](CREDITS.md).

## Validate before sharing

- `npm run check` runs synthetic tests, validates portable skills and checks working files for sensitive data.
- `npm run check:history` separately checks reachable local Git history.
- `npm run build && npm run check:site` checks built links, anchors and publication output.
- `git diff --check` catches whitespace errors.
- Review desktop and narrow-screen layouts, search results, the light theme and several diagrams.

Automated scans can miss identifiers. Inspect the diff too. Do not post a scanner's input files or private console reports to get help. Read [Privacy](PRIVACY.md) before handling historical exposure.

## Maintain the NAND inspector

The [NAND inspector](NAND_ANALYZER.md) shares `nand/core.ts` between the browser worker and Node CLI. Keep filesystem access in `nand/cli.ts` and browser interaction in `site/nand-ui.ts`. The core must not make network requests, persist data or discover local files. All fixtures are synthetic and are generated in temporary directories.

After editing the parser or CLI, run `npm run build:nand` to regenerate the standalone Node program in the analysis skill. Then run `npm run skills:sync`, `npm run check`, `npm run build` and `npm run check:site`. TypeScript checking is included in `check`; `check:nand` rejects a stale bundled program. Review the generated script with its source change.

The build produces a single-file offline browser app, Node CLI, ESM library and SHA-256 checksums in `dist/downloads/`. The standalone HTML includes its styles, code and Blob worker; its content security policy blocks network connections. Test it from a local file as well as the hosted page. Test the demo, a synthetic input, unsupported sizes, cancellation, clearing and export on desktop and narrow screens. Never use private console data for website screenshots or test fixtures.

Keep agent planning and one-off research notes out of the public reading path. Include the exact `Co-Author: s33g's Agent` trailer in every commit made for this repository. No license change is implied by contributing.

## Maintain the portable skills

The [skill installation guide](AGENT_SKILLS.md) covers using the seven workflows in other agent tools. Each `skills/<name>/` folder is self-contained. Keep its instructions in `SKILL.md`; add no dependency on a sibling skill or a path outside that folder.

`scripts/skill-catalog.mjs` explicitly maps the reference chapters bundled with each skill. Edit the canonical chapter in `docs/`, then run `npm run skills:sync` to regenerate its portable copies. Links to other bundled chapters remain local; links to the rest of the guide point to GitHub. Commit the generated references with the chapter changes so installation does not require a build step.

`npm run check:skills` rejects missing or stale references, unsupported entry-point metadata, escaping local links and unexpected files. The site build also rejects stale references and publishes only the catalog's allowed files. Test each skill in a clean directory without the rest of the repository. A valid folder is not evidence that every agent tool has been tested.

## Homepage model

`site/model-config.mjs` records the source model and license links. `site/console-model.mjs` uses Three.js to render `assets/console-mesh.json` with selected green edges and a shaded surface, as a transparent header background. Rotation pauses when the model is offscreen or the tab is hidden. The button pauses rotation; reduced-motion preferences start the model paused.

Keep the creator and CC BY attribution visible. If WebGL or the local mesh cannot load, the source link remains available.

To regenerate the geometry, download the original GLB from the creator’s model page, keep that download outside the repository, then run:

```sh
node scripts/prepare-model.mjs <downloaded-model.glb>
```

The converter reads only that file and writes the geometry-only JSON. It rejects external buffers and unsupported mesh types. Review its output and the [model attribution](../assets/console-model.LICENSE.md), then rebuild and check the model in a browser. Do not put the original download or its textures in the publication list.
