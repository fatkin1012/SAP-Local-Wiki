# SAP Local Wiki

A local-first SAP case knowledge app for saving proven solutions, screenshots, and reusable troubleshooting notes.

Goal: capture the fix once, find it fast next time.

## Features

1. Create SAP cases with title, requirement, and resolution steps.
2. Attach multiple T-codes to one case.
3. Search by T-code, title, requirement, or solution text.
4. Filter by T-code chips.
5. Upload or paste screenshots with Ctrl+V.
6. Edit existing solutions and screenshots.
7. Open screenshots in fullscreen picture viewer.
8. Annotate screenshots in viewer.
9. Use brush color and size controls.
10. Erase parts of drawings with eraser mode.
11. Undo drawing actions.
12. Save annotated screenshot as a new copy.
13. Export all local wiki data to JSON backup.
14. Import JSON backup to restore wiki data.
15. Install as a PWA app (Install App flow).
16. Keep data local in browser localStorage.

## Privacy Model

- No backend database is used.
- No cloud sync is built in.
- Data is stored in browser localStorage on your machine.
- GitHub receives data only if you manually commit files; localStorage data is not part of git.

## Backup and Transfer

Use header buttons:

- Export Backup: downloads all cases to a JSON file.
- Import Backup: restore from exported JSON on this browser/device.

This makes it easy to move your wiki data to another machine manually.

## Run Modes

### Development mode

```bash
npm.cmd ci
npm.cmd run dev
```

Open http://localhost:3000.

### Production mode (recommended for daily use)

Build once after code changes:

```bash
npm.cmd run build
```

Start app server:

```bash
npm.cmd run start
```

Use this mode when you do not want to run dev each time.

### Type check

```bash
npm.cmd run typecheck
```

## PWA Install Flow

1. Start the app in production mode.
2. Open http://localhost:3000 in Edge or Chrome.
3. Click Install App when the install prompt appears.
4. Launch from Start Menu/Desktop like an app window.

Note: The app still runs from your local machine; keep the local server running when you use it.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
