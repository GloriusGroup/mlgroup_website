# Glorius Lab — ML & Data Science Subgroup Website

Website for the **Data Science Subgroup** of the [Glorius Lab](https://www.uni-muenster.de/Chemie.oc/glorius/) at the Organisch-Chemisches Institut, University of Munster. The group focuses on machine learning, data-driven approaches, and computational methods applied to organic chemistry.

<p align="center">
  <img src="src/data/emu.svg" width="300" alt="Running Emu" />
</p>


## Tech Stack

| Layer | Technology |
|---|---|
| Runtime / bundler / package manager | [Bun](https://bun.sh) |
| Frontend | React 19 + TypeScript |
| Server | `Bun.serve()` (no Express) |
| Styling | Plain CSS with custom properties |
| Analytics | PostHog (GDPR-compliant, opt-out by default) |

## Getting Started

### Prerequisites

Install [Bun](https://bun.sh):

```bash
curl -fsSL https://bun.sh/install | bash
```

### Install Dependencies

```bash
bun install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_PUBLIC_POSTHOG_KEY=          # PostHog project API key (leave empty to disable)
VITE_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
VITE_PUBLIC_POSTHOG_ENABLED=false # Enable/disable analytics
DEV_THEME_SWITCH=true             # Show accent color dev switcher in navbar
```

Bun auto-loads `.env` — no dotenv needed.

### Development

```bash
bun dev
```

Starts the server with hot module reloading at `http://localhost:3000`.

### Production

```bash
bun start
```

Runs with `NODE_ENV=production`.

## Content

Team members, projects, and publications are driven by JSON files in `src/data/` — no code changes needed to update content.

## Features

- Dark / light mode toggle
- Animated parallax molecule canvas background
- Circuit-board themed decorative patterns
- Scroll-reveal animations
- Responsive design
- GDPR-compliant analytics (PostHog, disabled by default)
- Accessibility: skip-to-content, focus-visible, `prefers-reduced-motion`

## License

MIT. See [Glorius Lab](https://www.uni-muenster.de/Chemie.oc/glorius/) for more about our research group.
