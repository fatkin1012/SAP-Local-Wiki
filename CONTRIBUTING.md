# CONTRIBUTING — Toolbox compatibility

This project follows a minimal contract so Toolbox can import and run it as a native feature.

## Required
- `package.json` with `dev` / `build` / `start` scripts.
- `src/GeneratedFeatureRoot.tsx` exporting `default` a React component.
- `.env.example` listing required env keys.
- `README.md` with start/build instructions.

## Root component rules
- No top-level DOM side-effects; use `useEffect` for runtime actions.
- Do not auto-register service workers.
- If using React Router, centralize router creation (e.g. `src/routes.tsx`) and avoid hard-binding `createBrowserRouter`.

## Scripts
- Dev: `npm ci && npm run dev`
- Build: `npm run build`
- Preview: `npm run start`
- Type-check: `npm run typecheck`

## Checklist (copy/paste)
- [ ] `dev` / `build` / `start` scripts present
- [ ] `src/GeneratedFeatureRoot.tsx` exists and `export default` a React component
- [ ] `.env.example` present
- [ ] No module-top-level DOM or SW registration
- [ ] Runtime deps in `dependencies` (not `devDependencies`)

Replace placeholders and keep this file with the project for future maintainers.
