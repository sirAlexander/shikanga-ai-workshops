# Bug Busters: UI/UX Design Spec

## Layout Overview
- **One page app, centered content, responsive (desktop/mobile).**

### Header
- Game title: "Bug Busters" (centered, playful font).

### Game Area
- Fixed-size square game area (e.g., 400x400px, centered).
- Simple colored background.
- 1 moving bug (cartoon, e.g. SVG or emoji) animates in the box.
- Player clicks bug to score a point (no double-tap).

### UI Elements
- **Score**: Always visible above game area. Updates with every bug click.
- **Timer**: Beside or below score (shows seconds left).
- **Start Button**: Centered below game area. Disabled/hidden when game in progress.

### End-of-Game Modal
- Large overlay/modal appears after 20s.
- Shows final score and input for player name (text field, max 12 chars).
- Submit button to send score to backend (+ loading indicator).
- "Play Again" button to restart.

### Leaderboard
- Top-10 leaderboard, always visible (right side on desktop, below game on mobile).
- Each entry: rank, name, score (e.g. 1. Alex - 12).

## Feedback & Error
- Show simple error/warning messages for failed network calls.
- Basic loading spinner for leaderboard/network actions.

## Accessibility & Style
- Use high-contrast, clear fonts, large buttons for mobile.
- All interactive elements keyboard-accessible.

## Flow
1. Player loads page, sees title, board, and Start button.
2. Click Start → bug appears/moves, score & timer active.
3. 20s end: modal overlays, prompts name, submits, leaderboard updates.
4. Player can replay as often as desired.