# SAP Local Wiki

Since SAP GUI has way too many different T-codes and so many different functions, this project is a local wiki where you can save how you got specific data or solved specific SAP issues.

The goal is simple: capture your working solution once, then search and reuse it anytime.

## What This Web App Can Do

1. Create SAP cases with rich details.
2. Add multiple T-codes to one case.
3. Search cases by T-code, title, requirement, or solution steps.
4. Filter cases by T-code chips.
5. Upload multiple screenshots when creating a case.
6. Paste screenshots directly with Ctrl+V when creating a case.
7. Remove screenshots before saving a case.
8. Expand and collapse each case to view full details.
9. Edit solution text for an existing case.
10. Add more screenshots while editing a case.
11. Remove screenshots while editing a case.
12. Paste screenshots with Ctrl+V while editing a case.
13. Open screenshots in a fullscreen picture viewer.
14. Navigate screenshots in the viewer (Prev/Next and keyboard arrows).
15. Draw marks/signs on screenshots in the viewer.
16. Change drawing color and brush size.
17. Clear drawn marks in the viewer.
18. Save a marked version as a new screenshot copy.
19. Copy all case T-codes to clipboard.
20. Remove cases you no longer need.
21. Keep all data in local storage so your notes stay on your machine.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS

## Getting Started

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Build

```bash
npm run build
```

## Notes

- Data is stored in browser localStorage, not in a backend database.
- This is designed to be a local knowledge tool for SAP work patterns.
