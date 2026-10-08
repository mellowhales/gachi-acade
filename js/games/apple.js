/**
 * apple.js - 사과게임 (2~8인 다인원 실시간 동시 경쟁, 동일 배열 동기화 및 상대방 실시간 진행상황 관전)
 * P2P:
 *  - { type:'apple_init_grid', rawGrid }
 *  - { type:'apple_req_grid' }
 *  - { type:'apple_score', playerId, score, removedCells }
 *  - { type:'apple_rematch' }
 */
const AppleGame = (() => {
  const COLS = 17;
  const ROWS = 10;
  const CELL_SIZE = 38; // PC 한눈에 들어오는 사이즈
  const MINI_CELL_SIZE = 26; // 상대방 관전 미니 캔버스 사이즈
  const TIME_LIMIT = 60;

  let canvas, ctx;
  let grid = [];
  let rawGridData = null; // 공통 원본 숫자 배열 (100% 동일 배열 보장)
  let score = 0;
  let isDragging = false;
  let dragStart = null;
  let dragEnd = null;
  let timeLeft = TIME_LIMIT;
  let timerInterval = null;
  let gameOver = false;
  let animId = null;

  let playersScores = {}; // playerId -> { name, score }
  let playersBoards = {}; // playerId -> Set of "r,c" removed keys
  let playersList = [];

  let _activeViewerPlayerId = null; // 현재 실시간 관전 중인 상대방 ID
  let _viewerCanvas = null;
  let _viewerCtx = null;

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
    _activeViewerPlayerId = null;

    playersList = (_context.players && _context.players.length > 0)
      ? _context.players
      : [{ id: 'host', name: '호스트', isHost: true }];

    playersScores = {};
    playersBoards = {};
    playersList.forEach(p => {
      playersScores[p.id] = { name: p.name, score: 0 };
      playersBoards[p.id] = new Set();
    });

    const isHost = _context.isHost || P2P.isHost();

    // 1. 호스트는 공통 배열 생성 및 브로드캐스트
    if (isHost) {
      _generateGrid();
      setTimeout(() => {
        _broadcastGrid();
      }, 50);
    } else {
      // 2. 게스트는 초기 임시 생성 후 호스트에게 동기화 요청
      _generateGrid();
      P2P.send({ type: 'apple_req_grid' });
    }

    container.innerHTML = `
      <div class="apple-wrap">
        <div class="timer-text" id="ap-timer-text">${TIME_LIMIT}</div>
        <div class="timer-bar-wrap" style="width:100%;max-width:540px;">
          <div class="timer-bar" id="ap-timer-bar" style="width:100%"></div>
        </div>

        <!-- 상대방 관전 안내 힌트 바 -->
        <div class="apple-live-hint">
          <i class="fa-solid fa-eye" style="color:var(--primary);"></i>
          <span>상대방 카드를 클릭하면 <strong>실시간 진행 상황</strong>을 볼 수 있습니다.</span>
        </div>

        <div class="apple-scores-row" id="ap-scores-container"></div>

        <div class="apple-grid-wrap">
          <canvas id="apple-canvas"
            width="${COLS * CELL_SIZE}"
            height="${ROWS * CELL_SIZE}"></canvas>
        </div>

        <!-- 🔍 상대방 실시간 관전 모달 오버레이 -->
        <div class="apple-opp-modal hidden" id="apple-opp-modal">
          <div class="apple-opp-modal-card">
            <div class="apple-opp-modal-header">
              <div class="apple-opp-modal-title">
                <i class="fa-solid fa-tv" style="color:var(--green);"></i>
                <span id="ap-opp-modal-name">상대방 실시간 화면</span>
                <span class="apple-live-badge"><i class="fa-solid fa-circle"></i> LIVE</span>
              </div>
              <button type="button" class="btn-icon sm" id="btn-close-ap-opp" title="닫기">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="apple-opp-stats-row">
              <span id="ap-opp-stat-score">획득 점수: 0점</span>
              <span class="ap-divider">•</span>
              <span id="ap-opp-stat-remains">남은 사과: ${ROWS * COLS}개</span>
            </div>
            <div class="apple-opp-canvas-wrap">
              <canvas id="apple-opp-canvas"
                width="${COLS * MINI_CELL_SIZE}"
                height="${ROWS * MINI_CELL_SIZE}"></canvas>
            </div>
            <p class="apple-opp-sub-hint">창을 닫아도 내 게임은 계속 진행 중입니다. (ESC 또는 바깥 클릭 시 닫기)</p>
          </div>
        </div>
      </div>
    `;

    canvas = container.querySelector('#apple-canvas');
    ctx = canvas.getContext('2d', { alpha: false });

    // 관전 모달 이벤트 바인딩
    const closeBtn = container.querySelector('#btn-close-ap-opp');
    const modalEl = container.querySelector('#apple-opp-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', _closeOpponentViewer);
    }
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) _closeOpponentViewer();
      });
    }

    _viewerCanvas = container.querySelector('#apple-opp-canvas');
    if (_viewerCanvas) {
      _viewerCtx = _viewerCanvas.getContext('2d', { alpha: false });
    }

    _renderScoreCards();
    _draw();
    _startTimer();

    canvas.addEventListener('mousedown', _onMouseDown);
    canvas.addEventListener('mousemove', _onMouseMove);
    window.addEventListener('mouseup', _onMouseUp);

    canvas.addEventListener('touchstart', _onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', _onTouchMove, { passive: false });
    window.addEventListener('touchend', _onTouchEnd);

    window.addEventListener('keydown', _onKeyDown);

    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);
  }

  function _onKeyDown(e) {
    if (e.key === 'Escape' && _activeViewerPlayerId) {
      _closeOpponentViewer();
    }
  }

  /**
   * 호스트가 100% 동일한 사과 난수 매트릭스를 생성
   */
  function _generateGrid() {
    grid = [];
    rawGridData = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      rawGridData[r] = [];
      for (let c = 0; c < COLS; c++) {
        const val = Math.floor(Math.random() * 9) + 1;
        grid[r][c] = { val, removed: false };
        rawGridData[r][c] = val;
      }
    }
  }

  function _broadcastGrid() {
    if (!rawGridData) return;
    P2P.send({
      type: 'apple_init_grid',
      rawGrid: rawGridData
    });
  }

  /**
   * 게스트가 호스트의 원본 그리드를 수신받아 동일하게 적용
   */
  function _applyRawGrid(receivedRawGrid) {
    if (!receivedRawGrid || !Array.isArray(receivedRawGrid)) return;
    rawGridData = receivedRawGrid;
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        const val = (receivedRawGrid[r] && receivedRawGrid[r][c]) ? receivedRawGrid[r][c] : (Math.floor(Math.random() * 9) + 1);
        grid[r][c] = { val, removed: false };
      }
    }
    _draw();
    if (_activeViewerPlayerId) {
      _drawOpponentBoard();
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
        <div class="apple-score-card ${isMe ? 'me' : 'opp'}" id="ap-card-${p.id}" data-player-id="${p.id}" title="${isMe ? '나' : '클릭하여 실시간 화면 관전'}">
          <div class="label">
            ${_escapeHtml(p.name)}
            ${!isMe ? '<i class="fa-solid fa-magnifying-glass ap-view-icon" title="실시간 화면 보기"></i>' : ''}
          </div>
          <div class="val" id="ap-val-${p.id}">${pScore}</div>
        </div>
      `;
    });

    container.innerHTML = html;

    // 상대방 카드 클릭 이벤트 바인딩
    container.querySelectorAll('.apple-score-card.opp').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = card.getAttribute('data-player-id');
        if (targetId) openOpponentViewer(targetId);
      });
    });
  }

  function _updateSingleScore(playerId, newScore) {
    if (playersScores[playerId]) {
      playersScores[playerId].score = newScore;
    }
    const valEl = document.getElementById('ap-val-' + playerId);
    if (valEl) valEl.textContent = newScore;
  }

  /* ── 캔버스 렌더링 스케줄러 ── */
  function _requestDraw() {
    if (animId) return;
    animId = requestAnimationFrame(() => {
      animId = null;
      _draw();
    });
  }

  /* ── 내 캔버스 렌더링 ── */
  function _draw() {
    if (!ctx || !canvas) return;

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
        const cell = grid[r] ? grid[r][c] : null;
        if (cell && !cell.removed) {
          const isSelected = sel && isDragging &&
            r >= sel.minR && r <= sel.maxR &&
            c >= sel.minC && c <= sel.maxC;
          _drawApple(ctx, c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, cell.val, isSelected);
        }
      }
    }

    // 드래그 선택 박스
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

  /* ── 2D 플랫 사과 그리기 (공통 함수) ── */
  function _drawApple(targetCtx, x, y, size, val, isSelected) {
    const cx = x + size / 2;
    const cy = y + size / 2 + 1;
    const r = size * 0.38;

    // 1. 꼭지
    targetCtx.fillStyle = '#654321';
    targetCtx.fillRect(cx - 1, cy - r - Math.max(3, size * 0.12), Math.max(1.8, size * 0.06), Math.max(3, size * 0.15));

    // 2. 잎사귀
    targetCtx.fillStyle = '#38a169';
    targetCtx.beginPath();
    targetCtx.ellipse(cx + size * 0.1, cy - r - size * 0.08, size * 0.09, size * 0.05, Math.PI / 4, 0, Math.PI * 2);
    targetCtx.fill();

    // 3. 둥근 사과 바디
    targetCtx.fillStyle = isSelected ? '#ff4d4d' : '#ee3838';
    targetCtx.beginPath();
    targetCtx.arc(cx, cy, r, 0, Math.PI * 2);
    targetCtx.fill();

    // 4. 선택 시 선명한 테두리
    if (isSelected) {
      targetCtx.strokeStyle = '#276749';
      targetCtx.lineWidth = 2.5;
      targetCtx.stroke();
    }

    // 5. 정중앙 선명한 숫자 텍스트
    targetCtx.fillStyle = '#ffffff';
    targetCtx.font = `900 ${Math.floor(size * 0.48)}px Pretendard, sans-serif`;
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillText(val, cx, cy + 1);
  }

  /* =====================================================================
     🔍 상대방 실시간 진행 상황 뷰어 (Live Opponent Inspection)
     ===================================================================== */
  function openOpponentViewer(playerId) {
    if (!playerId) return;
    const myId = _context.myId || 'me';
    if (playerId === myId) return;

    _activeViewerPlayerId = playerId;
    const modal = document.getElementById('apple-opp-modal');
    if (!modal) return;

    const pObj = playersList.find(p => p.id === playerId) || { name: '상대방' };
    const nameEl = document.getElementById('ap-opp-modal-name');
    if (nameEl) nameEl.textContent = `${pObj.name}님의 실시간 보드`;

    _updateViewerStatsText();
    modal.classList.remove('hidden');
    _drawOpponentBoard();
  }

  function _closeOpponentViewer() {
    _activeViewerPlayerId = null;
    const modal = document.getElementById('apple-opp-modal');
    if (modal) modal.classList.add('hidden');
  }

  function _updateViewerStatsText() {
    if (!_activeViewerPlayerId) return;
    const curScore = playersScores[_activeViewerPlayerId] ? playersScores[_activeViewerPlayerId].score : 0;
    const removedSet = playersBoards[_activeViewerPlayerId] || new Set();
    const remains = Math.max(0, (ROWS * COLS) - removedSet.size);

    const scoreEl = document.getElementById('ap-opp-stat-score');
    const remainsEl = document.getElementById('ap-opp-stat-remains');
    if (scoreEl) scoreEl.textContent = `획득 점수: ${curScore}점`;
    if (remainsEl) remainsEl.textContent = `남은 사과: ${remains}개`;
  }

  function _drawOpponentBoard() {
    if (!_viewerCtx || !_viewerCanvas || !_activeViewerPlayerId) return;

    // 미니 캔버스 배경
    _viewerCtx.fillStyle = '#f7f5f0';
    _viewerCtx.fillRect(0, 0, _viewerCanvas.width, _viewerCanvas.height);

    // 미니 모눈 라인
    _viewerCtx.strokeStyle = '#e8e2d8';
    _viewerCtx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      _viewerCtx.beginPath();
      _viewerCtx.moveTo(c * MINI_CELL_SIZE, 0);
      _viewerCtx.lineTo(c * MINI_CELL_SIZE, _viewerCanvas.height);
      _viewerCtx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      _viewerCtx.beginPath();
      _viewerCtx.moveTo(0, r * MINI_CELL_SIZE);
      _viewerCtx.lineTo(_viewerCanvas.width, r * MINI_CELL_SIZE);
      _viewerCtx.stroke();
    }

    const removedSet = playersBoards[_activeViewerPlayerId] || new Set();

    // 상대방 사과 렌더링 (동일한 원본 배열 사용!)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const isRemoved = removedSet.has(`${r},${c}`);
        if (!isRemoved) {
          const val = (rawGridData && rawGridData[r]) ? rawGridData[r][c] : (grid[r] ? grid[r][c].val : 1);
          _drawApple(_viewerCtx, c * MINI_CELL_SIZE, r * MINI_CELL_SIZE, MINI_CELL_SIZE, val, false);
        } else {
          // 제거된 사과는 은은한 빈칸 처리
          _viewerCtx.fillStyle = 'rgba(237, 232, 225, 0.4)';
          _viewerCtx.fillRect(c * MINI_CELL_SIZE + 1, r * MINI_CELL_SIZE + 1, MINI_CELL_SIZE - 2, MINI_CELL_SIZE - 2);
        }
      }
    }
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

      // 내 보드 상태도 저장
      if (!playersBoards[myId]) playersBoards[myId] = new Set();
      cells.forEach(({ r, c }) => playersBoards[myId].add(`${r},${c}`));

      // 🌟 상대방들에게 점수 및 제거된 셀 좌표 전송 (실시간 관전 동기화)
      P2P.send({
        type: 'apple_score',
        playerId: myId,
        score: score,
        removedCells: cells
      });

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
    _closeOpponentViewer();

    const leaderboard = [];
    playersList.forEach(p => {
      const pScore = (playersScores[p.id] ? playersScores[p.id].score : 0);
      leaderboard.push({ name: p.name, score: pScore, id: p.id });
    });
    leaderboard.sort((a, b) => b.score - a.score);

    const myName = _context.myNickname || '나';
    const isWinner = leaderboard.length > 0 && leaderboard[0].name === myName;

    setTimeout(() => {
      _onResult && _onResult(isWinner, null, leaderboard);
    }, 600);
  }

  function _onMessage(data) {
    if (!data) return;

    if (data.type === 'apple_init_grid') {
      _applyRawGrid(data.rawGrid);
    } else if (data.type === 'apple_req_grid') {
      if (P2P.isHost() || _context.isHost) {
        _broadcastGrid();
      }
    } else if (data.type === 'apple_score') {
      _updateSingleScore(data.playerId, data.score);

      // 상대방의 제거된 셀 저장
      if (!playersBoards[data.playerId]) {
        playersBoards[data.playerId] = new Set();
      }
      if (Array.isArray(data.removedCells)) {
        data.removedCells.forEach(({ r, c }) => {
          playersBoards[data.playerId].add(`${r},${c}`);
        });
      }

      // 현재 해당 플레이어를 관전 중이라면 즉각 다시 그리기!
      if (_activeViewerPlayerId === data.playerId) {
        _updateViewerStatsText();
        _drawOpponentBoard();
      }
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
    _closeOpponentViewer();
    const c = document.getElementById('game-content');
    if (c) init(c, _onResult, _context);
  }

  function destroy() {
    _stopTimer();
    _closeOpponentViewer();
    window.removeEventListener('mouseup', _onMouseUp);
    window.removeEventListener('touchend', _onTouchEnd);
    window.removeEventListener('keydown', _onKeyDown);
    P2P.offMessage(_onMessage);
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { init, rematch, destroy, openOpponentViewer };
})();
