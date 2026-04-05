# Quartz Website

Marketing website for the Quartz VS Code extension: [quartz-editor.dev](https://quartz-editor.dev/)

## Development

Start the local dev server:

```bash
cd website
node serve.js
```

Opens at [http://localhost:8090](http://localhost:8090). The server auto-resolves `/images/` from the project root.

## Production Build

```bash
cd website
node build.js
```

Outputs to `website/dist/` with:
- Bundled + minified JS (esbuild)
- CSS, HTML, assets, and images copied from project root
- Cloudflare `_headers` file with security headers

## Deployment (Cloudflare Pages)

The site is configured for Cloudflare Pages via `wrangler.toml`.

### First-time setup

1. Install Wrangler: `npm install -g wrangler`
2. Authenticate: `wrangler login`
3. Build: `cd website && node build.js`
4. Deploy: `cd website && wrangler pages deploy dist --project-name=quartz-editor`

### Subsequent deploys

```bash
cd website && node build.js && wrangler pages deploy dist --project-name=quartz-editor
```

### Custom domain

After the first deploy, go to Cloudflare Pages dashboard → your project → Custom domains → add your domain.

## Structure

```
website/
├── index.html          # Main page
├── css/
│   ├── variables.css   # Design tokens (colors, type scale, spacing)
│   ├── reset.css       # CSS reset
│   ├── base.css        # Base styles, reveal animations
│   ├── animations.css  # Keyframe animations
│   ├── components/     # button.css, card.css
│   └── sections/       # navbar, hero, showcase, features, demo, footer
├── js/
│   ├── main.js         # Entry point (theme, demo lazy-load)
│   └── scroll.js       # IntersectionObserver scroll animations
├── demo/               # Embedded Quartz editor demo (iframe)
├── assets/             # Favicon, fonts
├── build.js            # Production build script
├── serve.js            # Dev server
└── wrangler.toml       # Cloudflare Pages config
```

## Editing

- **Colors/spacing**: Edit `css/variables.css`
- **Sections**: Each section has its own CSS file in `css/sections/`
- **Images**: Product screenshots live in the project root `images/` directory
- **Demo editor**: The embedded editor in `demo/` is a standalone TipTap instance
