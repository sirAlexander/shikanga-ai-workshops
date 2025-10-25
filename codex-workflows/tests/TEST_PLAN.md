# TEST_PLAN.md

## Bug Busters Test Plan

### Manual Verification
- UI loads: Title, start button, score, timer, leaderboard are visible.
- Game starts: Bug animates, score and timer update, clicking bug increases score.
- Game ends at 20s: modal overlays, final score shown, allows name entry and score submission.
- Leaderboard displays top-10 after submission.
- Edge: API/network failures and missing fields show error messages.

### Automated/API Tests
- GET /health returns 200 and status JSON.
- GET /scores returns 200 & top 10 scores as JSON.
- POST /scores with valid body adds score; invalid body returns error.
- Server does **not** persist scores after restart.

### Accessibility & Constraints
- Game, modal, and buttons keyboard accessible.
- No framework dependencies; all files readable for beginners.

---
