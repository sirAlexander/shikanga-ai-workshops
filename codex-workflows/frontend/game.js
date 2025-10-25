const gameDuration = 20;
const bugSize = 44;
let score = 0, timeLeft = gameDuration, timerId = null, gameActive = false;
let audioCtx = null; // created on first interaction
let soundEnabled = true;
let soundVolume = 0.6; // 0..1
const LS_SOUND_ENABLED = 'BB_SOUND_ENABLED';
const LS_SOUND_VOL = 'BB_SOUND_VOL';

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
  // Try resume context on gesture if it exists but suspended
  try { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch {}
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
  // Render a squish effect at the current bug position before moving
  try {
    renderSquishEffect();
  } catch {}
  try {
    playSquishSound();
  } catch {}
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
  // Load persisted audio settings
  try {
    const savedEnabled = localStorage.getItem(LS_SOUND_ENABLED);
    if (savedEnabled !== null) soundEnabled = savedEnabled === '1';
    const savedVol = parseFloat(localStorage.getItem(LS_SOUND_VOL));
    if (!Number.isNaN(savedVol)) soundVolume = Math.min(1, Math.max(0, savedVol));
  } catch {}

  updateLeaderboard();
  // For keyboard focus (accessibility)
  bugEl.setAttribute('tabindex', '0');

  // Wire audio controls
  const toggleBtn = document.getElementById('sound-toggle');
  const volSlider = document.getElementById('sound-volume');
  if (toggleBtn && volSlider) {
    volSlider.value = String(soundVolume);
    updateAudioUI(toggleBtn);
    toggleBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      persistAudio();
      updateAudioUI(toggleBtn);
    });
    volSlider.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      soundVolume = isNaN(v) ? 0.6 : Math.min(1, Math.max(0, v));
      persistAudio();
    });
  }
});

// --- Visual Effects --------------------------------------------------------
function renderSquishEffect() {
  // Get current bug position within the game area
  const left = parseFloat(getComputedStyle(bugEl).left || '0');
  const top  = parseFloat(getComputedStyle(bugEl).top  || '0');

  const squish = document.createElement('div');
  squish.className = 'squish';
  squish.style.left = `${left - 2}px`;   // nudge to center backdrop
  squish.style.top  = `${top - 2}px`;
  // random slight rotation so it feels less repetitive
  const rot = (Math.random()*24 - 12).toFixed(1) + 'deg';
  squish.style.setProperty('--rot', rot);
  // varied splat color hue
  const hue = Math.floor(Math.random()*360);
  squish.style.background = `radial-gradient(hsla(${hue}, 80%, 60%, 0.28), hsla(${hue}, 80%, 60%, 0.12) 40%, transparent 70%)`;

  const emoji = document.createElement('div');
  emoji.className = 'bug-emoji';
  emoji.textContent = '🪲';
  squish.appendChild(emoji);

  gameArea.appendChild(squish);
  // Cleanup after animation
  setTimeout(()=> squish.remove(), 1000);

  // Floating +1 score indicator
  const float = document.createElement('div');
  float.className = 'score-float';
  float.textContent = '+1';
  float.style.left = (left + bugSize/2) + 'px';
  float.style.top  = (top - 6) + 'px';
  gameArea.appendChild(float);
  setTimeout(()=> float.remove(), 750);
}

function playSquishSound() {
  if (!soundEnabled) return;
  if (!(window.AudioContext || window.webkitAudioContext)) return;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  const ctx = audioCtx;
  const now = ctx.currentTime;

  // Short pitch-down squelch
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(240, now);
  osc.frequency.exponentialRampToValueAtTime(90, now + 0.09);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22 * soundVolume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.14);

  // Optional tiny noise burst for texture
  const noiseDur = 0.08;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * noiseDur, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0; i<data.length; i++) data[i] = (Math.random()*2-1) * 0.45;
  const noise = ctx.createBufferSource();
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, now);
  ng.gain.exponentialRampToValueAtTime(0.12 * soundVolume, now + 0.005);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + noiseDur);
  noise.buffer = buffer;
  noise.connect(ng).connect(ctx.destination);
  noise.start(now);
}

function persistAudio() {
  try {
    localStorage.setItem(LS_SOUND_ENABLED, soundEnabled ? '1' : '0');
    localStorage.setItem(LS_SOUND_VOL, String(soundVolume));
  } catch {}
}

function updateAudioUI(toggleBtn) {
  toggleBtn.setAttribute('aria-pressed', String(!soundEnabled));
  toggleBtn.title = soundEnabled ? 'Sound: On' : 'Sound: Off';
  toggleBtn.textContent = soundEnabled ? '🔊' : '🔈';
}
