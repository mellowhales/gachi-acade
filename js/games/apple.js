/**
 * apple.js - 사과게임 (2~5인 다인원 실시간 동시 경쟁 및 일러스트 사과 렌더링)
 * P2P: { type:'apple_score', playerId, score } | { type:'apple_rematch' }
 */
const AppleGame = (() => {
  const COLS = 17;
  const ROWS = 10;
  const CELL_SIZE = 38; // PC 한눈에 들어오는 컴팩트 사이즈
  const TIME_LIMIT = 60;

  let canvas, ctx;
  let grid = [];
  let score = 0;
  let isDragging = false;
  let dragStart = null;
  let dragEnd = null;
  let timeLeft = TIME_LIMIT;
  let timerInterval = null;
  let gameOver = false;
  let animId = null;

  let playersScores = {}; // playerId -> { name, score }
  let playersList = [];

  let _onResult = null;
  let _context = null;

  function init(container, onResult, context) {
    _onResult = onResult;
    _context = context || {};
    score = 0;
    timeLeft = TIME_LIMIT;
    gameOver = false;
    isDragging = false;
    dragStart = null;
    dragEnd = null;

    playersList = (_context.players && _context.players.length > 0)
      ? _context.players
      : [{ id: 'host', name: '호스트', isHost: true }];

    playersScores = {};
    playersList.forEach(p => {
      playersScores[p.id] = { name: p.name, score: 0 };
    });

    _generateGrid();

    container.innerHTML = `
      <div class="apple-wrap">
        <div class="timer-text" id="ap-timer-text">${TIME_LIMIT}</div>
        <div class="timer-bar-wrap" style="width:100%;max-width:540px;">
          <div class="timer-bar" id="ap-timer-bar" style="width:100%"></div>
        </div>

        <div class="apple-scores-row" id="ap-scores-container"></div>

        <div class="apple-grid-wrap">
          <canvas id="apple-canvas"
            width="${COLS * CELL_SIZE}"
            height="${ROWS * CELL_SIZE}"></canvas>
        </div>
      </div>
    `;

    canvas = container.querySelector('#apple-canvas');
    ctx = canvas.getContext('2d', { alpha: false });

    _renderScoreCards();
    _draw();
    _startTimer();

    canvas.addEventListener('mousedown', _onMouseDown);
    canvas.addEventListener('mousemove', _onMouseMove);
    window.addEventListener('mouseup', _onMouseUp);

    canvas.addEventListener('touchstart', _onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', _onTouchMove, { passive: false });
    window.addEventListener('touchend', _onTouchEnd);

    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);
  }

  function _generateGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        const val = Math.floor(Math.random() * 9) + 1;
        grid[r][c] = { val, removed: false };
      }
    }
  }

  function _renderScoreCards() {
    const container = document.getElementById('ap-scores-container');
    if (!container) return;

    let html = '';
    const myId = _context.myId || 'me';

    playersList.forEach(p => {
      const pScore = (playersScores[p.id] ? playersScores[p.id].score : 0);
      const isMe = (p.id === myId) || (p.isHost && P2P.isHost());

      html += `
        <div class="apple-score-card ${isMe ? 'me' : 'opp'}" id="ap-card-${p.id}">
          <div class="label">${_escapeHtml(p.name)}</div>
          <div class="val" id="ap-val-${p.id}">${pScore}</div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function _updateSingleScore(playerId, newScore) {
    if (playersScores[playerId]) {
      playersScores[playerId].score = newScore;
    }
    const valEl = document.getElementById('ap-val-' + playerId);
    if (valEl) valEl.textContent = newScore;
  }

  /* ── 캔버스 렌더링 스케줄러 (초고속 반응속도) ── */
  function _requestDraw() {
    if (animId) return;
    animId = requestAnimationFrame(() => {
      animId = null;
      _draw();
    });
  }

  /* ── 캔버스 렌더링 ── */
  function _draw() {
    if (!ctx) return;

    // 따뜻한 크림톤 격자 배경
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 은은한 모눈 그리드 라인
    ctx.strokeStyle = '#ede8e1';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(canvas.width, r * CELL_SIZE);
      ctx.stroke();
    }

    const sel = _getSelectedRect();

    // 사과 렌더링
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = grid[r][c];
        if (!cell.removed) {
          const isSelected = sel && isDragging &&
            r >= sel.minR && r <= sel.maxR &&
            c >= sel.minC && c <= sel.maxC;
          _drawApple(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, cell.val, isSelected);
        }
      }
    }

    // 드래그 선택 박스 (초고속 렌더링)
    if (sel && isDragging) {
      ctx.strokeStyle = '#2f855a';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(72, 187, 120, 0.22)';
      const x = sel.minC * CELL_SIZE + 2;
      const y = sel.minR * CELL_SIZE + 2;
      const w = (sel.maxC - sel.minC + 1) * CELL_SIZE - 4;
      const h = (sel.maxR - sel.minR + 1) * CELL_SIZE - 4;

      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    }
  }

  /* ── 깔끔하고 단순하며 귀여운 2D 플랫 사과 그리기 ── */
  function _drawApple(x, y, size, val, isSelected) {
    const cx = x + size / 2;
    const cy = y + size / 2 + 1;
    const r = size * 0.38;

    // 1. 꼭지 (심플 갈색 핀)
    ctx.fillStyle = '#654321';
    ctx.fillRect(cx - 1, cy - r - 5, 2.5, 6);

    // 2. 잎사귀 (심플 초록 타원)
    ctx.fillStyle = '#38a169';
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy - r - 3, 3.5, 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // 3. 심플 둥근 사과 바디
    ctx.fillStyle = isSelected ? '#ff4d4d' : '#ee3838';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 4. 선택 시 선명한 테두리
    if (isSelected) {
      ctx.strokeStyle = '#276749';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 5. 정중앙 선명한 숫자 텍스트
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.floor(size * 0.48)}px Pretendard, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(val, cx, cy + 1);

    ctx.restore();
  }

  function _getGridPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const c = Math.floor(x / CELL_SIZE);
    const r = Math.floor(y / CELL_SIZE);
    return {
      r: Math.max(0, Math.min(ROWS - 1, r)),
      c: Math.max(0, Math.min(COLS - 1, c))
    };
  }

  function _getSelectedRect() {
    if (!dragStart || !dragEnd) return null;
    return {
      minR: Math.min(dragStart.r, dragEnd.r),
      maxR: Math.max(dragStart.r, dragEnd.r),
      minC: Math.min(dragStart.c, dragEnd.c),
      maxC: Math.max(dragStart.c, dragEnd.c)
    };
  }

  function _onMouseDown(e) {
    if (gameOver) return;
    isDragging = true;
    dragStart = _getGridPos(e.clientX, e.clientY);
    dragEnd = dragStart;
    _draw();
  }

  function _onMouseMove(e) {
    if (!isDragging || gameOver) return;
    dragEnd = _getGridPos(e.clientX, e.clientY);
    _requestDraw();
  }

  function _onMouseUp() {
    if (!isDragging || gameOver) return;
    isDragging = false;
    _checkSum();
    dragStart = null;
    dragEnd = null;
    _draw();
  }

  function _onTouchStart(e) {
    if (gameOver) return;
    e.preventDefault();
    isDragging = true;
    const t = e.touches[0];
    dragStart = _getGridPos(t.clientX, t.clientY);
    dragEnd = dragStart;
    _draw();
  }

  function _onTouchMove(e) {
    if (!isDragging || gameOver) return;
    e.preventDefault();
    const t = e.touches[0];
    dragEnd = _getGridPos(t.clientX, t.clientY);
    _requestDraw();
  }

  function _onTouchEnd() {
    if (!isDragging || gameOver) return;
    isDragging = false;
    _checkSum();
    dragStart = null;
    dragEnd = null;
    _draw();
  }

  function _checkSum() {
    const sel = _getSelectedRect();
    if (!sel) return;

    let sum = 0;
    const cells = [];
    for (let r = sel.minR; r <= sel.maxR; r++) {
      for (let c = sel.minC; c <= sel.maxC; c++) {
        if (!grid[r][c].removed) {
          sum += grid[r][c].val;
          cells.push({ r, c });
        }
      }
    }

    if (sum === 10 && cells.length > 0) {
      cells.forEach(({ r, c }) => {
        grid[r][c].removed = true;
      });
      score += cells.length;

      const myId = _context.myId || 'me';
      _updateSingleScore(myId, score);
      P2P.send({ type: 'apple_score', playerId: myId, score: score });
      if (typeof Sound !== 'undefined') Sound.playApplePop();
    }
  }

  function _startTimer() {
    _stopTimer();
    timerInterval = setInterval(() => {
      timeLeft--;
      _updateTimerUI();
      if (timeLeft <= 0) {
        _stopTimer();
        _endGame();
      }
    }, 1000);
  }

  function _stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function _updateTimerUI() {
    const tt = document.getElementById('ap-timer-text');
    const tb = document.getElementById('ap-timer-bar');
    if (!tt || !tb) return;
    tt.textContent = timeLeft;
    const pct = (timeLeft / TIME_LIMIT) * 100;
    tb.style.width = pct + '%';
    if (timeLeft <= 10)     { tt.className = 'timer-text critical'; tb.className = 'timer-bar critical'; }
    else if (timeLeft <= 20){ tt.className = 'timer-text warning';  tb.className = 'timer-bar warning'; }
    else                    { tt.className = 'timer-text';          tb.className = 'timer-bar'; }
  }

  function _endGame() {
    gameOver = true;
    _stopTimer();

    const leaderboard = [];
    playersList.forEach(p => {
      const pScore = (playersScores[p.id] ? playersScores[p.id].score : 0);
      leaderboard.push({ name: p.name, score: pScore });
    });
    leaderboard.sort((a, b) => b.score - a.score);

    const myName = _context.myNickname || '나';
    const isWinner = leaderboard.length > 0 && leaderboard[0].name === myName;

    setTimeout(() => {
      _onResult && _onResult(isWinner, null, leaderboard);
    }, 600);
  }

  function _onMessage(data) {
    if (data.type === 'apple_score') {
      _updateSingleScore(data.playerId, data.score);
    } else if (data.type === 'apple_rematch') {
      _doRematch();
    }
  }

  function rematch() {
    P2P.send({ type: 'apple_rematch' });
    _doRematch();
  }

  function _doRematch() {
    _stopTimer();
    const c = document.getElementById('game-content');
    if (c) init(c, _onResult, _context);
  }

  function destroy() {
    _stopTimer();
    window.removeEventListener('mouseup', _onMouseUp);
    window.removeEventListener('touchend', _onTouchEnd);
    P2P.offMessage(_onMessage);
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { init, rematch, destroy };
})();
