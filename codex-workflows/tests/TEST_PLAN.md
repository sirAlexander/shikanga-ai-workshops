# TEST_PLAN.md

## Bug Busters Test Plan

### Manual Verification
- UI loads: Title, start button, score, timer, leaderboard are visible.
- Audio controls visible: a sound toggle and a volume slider.
- Game starts: Bug animates, score and timer update, clicking bug increases score.
- Game ends at 20s: modal overlays, final score shown, allows name entry and score submission.
- Leaderboard displays top-10 after submission.
- On each hit: temporary squish effect (random hue) and a floating "+1" are visible and fade out.
- Sound toggle: when off, no squish sound plays; when on, sound plays. Volume slider noticeably changes loudness and persists after page reload.
- Edge: API/network failures and missing fields show error messages.

### Automated/API Tests
- GET /health returns 200 and status JSON.
- GET /scores returns 200 & top 10 scores as JSON.
- POST /scores with valid body adds score; invalid body returns error.
- Server does **not** persist scores after restart.
 - (Optional UI) Add smoke test for audio controls presence.

### Accessibility & Constraints
- Game, modal, and buttons keyboard accessible.
- No framework dependencies; all files readable for beginners.

---
