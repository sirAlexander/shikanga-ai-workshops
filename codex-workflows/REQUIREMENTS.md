# REQUIREMENTS.md

## Game: Bug Busters
- Single screen browser game: "Bug Busters".
- Player clicks on a moving bug to score points.
- Game lasts for 20 seconds, then displays final score.
- Submit score to backend API; display a top-10 leaderboard (MANDATORY).

## UI/UX
- One-page, beginner-readable interface.
- Game area, score display, start button, end-of-game score modal, leaderboard.
- Audio controls: sound toggle and volume slider (persisted via localStorage).
- Hit feedback: squish visual with varying color, and a floating "+1" indicator per hit.

## Tech
- No frameworks. Use plain HTML/CSS/JavaScript.
- Minimal backend: Node.js (no database, in-memory only).

## API
- GET /health → Health check.
- GET /scores → Returns top 10 scores, JSON.
- POST /scores → Submit player score (JSON, returns updated leaderboard).
  - CORS and OPTIONS preflight must be supported so the UI can load via file:// during development.

## Constraints
- No persistent or external database.
- All files must be beginner-friendly and well-structured.
- Keep each output small, clear, and separated in proper folders.
