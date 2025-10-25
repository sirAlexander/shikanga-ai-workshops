# TEST.md

## Test Plan for Bug Busters

### Manual Test Cases
1. Launch game UI. Confirm it displays start button, score 0, and leaderboard.
2. Play a game: confirm bug appears/moves, clicking increases score, timer counts down.
3. Game ends after 20 seconds: end screen shows final score.
4. Submitting score populates leaderboard; leaderboard updates correctly.
5. Score cannot be submitted after time runs out.
6. Refreshing does **not** preserve leaderboard (memory-only backend).
7. API: GET /health returns 200 OK ("OK").
8. API: GET /scores returns JSON array of top 10 scores.
9. API: POST /scores accepts JSON {name, score} and returns updated leaderboard.
10. Audio controls: toggle mutes/unmutes hit sound; volume slider scales loudness (changes are persisted on reload).
11. Hit feedback: on each hit, a color-varied squish appears under the bug and fades; a "+1" text floats up.

### Automated
- Script hits /health, /scores, and POSTs scores to validate happy path and errors.
- Optional: add a simple Playwright or Cypress check for presence of audio controls (out of scope for this minimal plan).

Quick dev sanity checks:
- Python: `python tests/test_check_files_tool.py`
- Python: `python tests/validate_step5_expected_tree.py`
