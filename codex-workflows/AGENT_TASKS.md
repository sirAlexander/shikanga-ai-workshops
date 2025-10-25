# AGENT_TASKS.md

## Designer
- Produce a single-page UI/UX spec for "Bug Busters" (layout, expected interactions, leaderboard, etc.).
- Deliver a basic wireframe sketch in design/wireframe.md (ASCII or image link).
- Include audio controls (sound on/off toggle, volume slider) placement and labels.
- Specify hit feedback: squish visual with color variation and a floating "+1" indicator.

## Frontend Developer
- Implement UI in HTML/CSS/JS following spec in design/design_spec.md.
- Game logic: moving bug, click-to-score, countdown timer (20s), end-of-game modal.
- Implement AJAX calls to backend for leaderboard (GET/POST /scores), render top-10 board.
- Add sound effects on hit using WebAudio; must be gated by user gesture.
- Add audio controls (toggle + volume) with state persisted in localStorage.
- Add animated squish visual (color-varied) and a floating "+1" near the hit position.

## Backend Developer
- Node.js server only (no frameworks/database).
- Serve static files if necessary for frontend.
- Endpoints:
    - GET /health: basic check.
    - GET /scores: returns top 10 scores, in-memory.
    - POST /scores: receives {name, score} JSON, adds/updates, returns updated leaderboard.
- Provide package.json with a working `start` script.
- Enable CORS for GET/POST /scores and handle OPTIONS preflight so file:// gameplay can submit and read scores during local development.

## Tester
- Write a clear test plan for UI & API routes (in TEST.md).
- Provide a minimal script that checks the API endpoints and leaderboard flow.
