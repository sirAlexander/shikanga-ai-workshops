const gameDuration = 20;
const bugSize = 44;
let score = 0, timeLeft = gameDuration, timerId = null, gameActive = false;

const bugEl = document.getElementById('bug'),
      gameArea = document.getElementById('game-area'),
      scoreEl = document.getElementById('score'),
      timerEl = document.getElementById('timer'),
      startBtn = document.getElementById('start-btn'),
      modal = document.getElementById('modal'),
      modalMsg = document.getElementById('modal-msg'),
      modalScore = document.getElementById('final-score'),
      nameInput = document.getElementById('player-name'),
      submitBtn = document.getElementById('submit-score-btn'),
      playAgainBtn = document.getElementById('play-again-btn'),
      modalErr = document.getElementById('modal-error'),
      leaderboard = document.getElementById('leaderboard'),
      leaderboardErr = document.getElementById('leaderboard-error');

bugEl.style.display = 'none';

function randPos() {
  const areaRect = gameArea.getBoundingClientRect();
  const min = 0, max = 400 - bugSize; // handle game area fixed size
  return {
    left: Math.random() * max,
    top: Math.random() * max,
  };
}

function moveBug() {
  if (!gameActive) return;
  const pos = randPos();
  bugEl.style.left = pos.left+'px';
  bugEl.style.top = pos.top+'px';
}

function startGame() {
  score = 0;
  timeLeft = gameDuration;
  scoreEl.textContent = score;
  timerEl.textContent = timeLeft;
  modal.classList.add('hidden');
  modalErr.textContent = '';
  nameInput.value = '';
  gameActive = true;
  startBtn.disabled = true;
  bugEl.textContent = '🪲';
  bugEl.style.display = 'flex';
  moveBug();
  timerId = setInterval(()=>{
    timeLeft--;
    timerEl.textContent = timeLeft;
    if(timeLeft<=0){ endGame(); }
    else moveBug();
  }, 1000);
}

function bugClick(e) {
  if(!gameActive) return;
  score++;
  scoreEl.textContent = score;
  moveBug();
}

function endGame() {
  clearInterval(timerId);
  gameActive = false;
  startBtn.disabled = false;
  bugEl.style.display = 'none';
  showModal();
}

function showModal() {
  modal.classList.remove('hidden');
  modalMsg.textContent = 'Game Over!';
  modalScore.textContent = 'Score: '+score;
  nameInput.value = '';
  submitBtn.disabled = false;
  modalErr.textContent = '';
}

function handleNameInput(){
  if(nameInput.value.length>12) nameInput.value = nameInput.value.slice(0,12);
}

// --- API base detection ----------------------------------------------------
// If served from the backend (http origin), use same-origin relative paths.
// If opened from file://, default to http://localhost:3000 so leaderboard and
// score submission work without a bundler/dev server.
const API_BASE = (window.location.protocol.startsWith('http'))
  ? ''
  : (window.localStorage.getItem('BUG_BUSTERS_BACKEND') || 'http://localhost:3000');

function apiUrl(path) {
  // path starts with '/'
  return API_BASE ? `${API_BASE}${path}` : path;
}

// API
async function updateLeaderboard() {
  leaderboard.innerHTML = '<li>Loading...</li>';
  leaderboardErr.textContent = '';
  try {
    const res = await fetch(apiUrl('/scores'));
    if (!res.ok) throw new Error('Network');
    const data = await res.json();
    leaderboard.innerHTML = data.length ? data.map((s,i)=>
       `<li>${i+1}. ${s.name} - ${s.score}</li>`).join('') : '<li>No scores yet.</li>';
  } catch(e){
    leaderboardErr.textContent = 'Failed to load leaderboard.';
    leaderboard.innerHTML = '';
    console.error('Leaderboard error:', e);
  }
}

async function submitScore() {
  const name = nameInput.value.trim().slice(0,12) || 'Player';
  submitBtn.disabled = true;
  modalErr.textContent = '';
  try {
    const res = await fetch(apiUrl('/scores'), {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name, score }),
    });
    if(!res.ok) throw new Error('Network');
    await updateLeaderboard();
    modalMsg.textContent = 'Score submitted!';
    submitBtn.disabled = true;
  } catch(e){
    modalErr.textContent = 'Failed to submit. Try later.';
    submitBtn.disabled = false;
    console.error('Submit error:', e);
  }
}

// Event Listeners
startBtn.addEventListener('click', startGame);
bugEl.addEventListener('click', bugClick);
bugEl.addEventListener('keydown', e=>{
  if((e.key==='Enter'||e.key===' '||e.key==='Spacebar') && gameActive){
    bugClick();
  }
});
playAgainBtn.addEventListener('click', ()=>{
  modal.classList.add('hidden');
  startGame();
});
submitBtn.addEventListener('click', submitScore);
nameInput.addEventListener('input', handleNameInput);

window.addEventListener('DOMContentLoaded', ()=>{
  updateLeaderboard();
  // For keyboard focus (accessibility)
  bugEl.setAttribute('tabindex', '0');
});
