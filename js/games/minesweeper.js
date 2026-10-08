/**
 * minesweeper.js - 멀티플레이어 실시간 지뢰찾기 (2~8인 동시 경쟁)
 * 
 * - 동일 배열 동기화 (호스트가 지뢰 맵 생성 및 브로드캐스트)
 * - 공정한 스타트 (중앙 안전 구역 보장)
 * - 하트 시스템 (3목숨 ❤️❤️❤️ - 지뢰 밟아도 기절 페널티 후 재도전)
 * - 더블클릭/숫자클릭 코드(Chord) 일괄 오픈 지원
 * - 깃발 모드 토글 (PC 우클릭 + 모바일 원터치 전환)
 * - 상대방 진행상황 실시간 관전 (미니 보드 라이브 동기화)
 */
const MinesweeperGame = (() => {
  const COLS = 14;
  const ROWS = 14;
  const TOTAL_CELLS = COLS * ROWS; // 196
  const MINE_COUNT = 28; // 약 14% 밀도
  const TOTAL_SAFE = TOTAL_CELLS - MINE_COUNT; // 168
  const TIME_LIMIT = 180; // 3분

  let containerEl = null;
  let boardEl = null;
  let timerInterval = null;
  let timeLeft = TIME_LIMIT;
  let gameOver = false;

  // 로컬 플레이어 상태
  let localBoard = []; // 2D array of cell objects
  let rawMinesData = null; // 공통 지뢰 위치 목록 [{r, c}, ...]
  let myLives = 3;
  let myOpenedCount = 0;
  let isFlagMode = false; // 모바일/토글용 깃발 모드
  let isStunned = false; // 지뢰 폭발 시 일시 기절

  // 멀티플레이어 상태
  let playersList = [];
  let playersState = {}; // playerId -> { name, openedCount, lives, status, revealed: Set, flags: Set, explodes: Set }

  // 관전 모달
  let _activeViewerPlayerId = null;
  let _viewerGridEl = null;

  let _onResult = null;
  let _context = null;

  function init(container, onResult, context) {
    containerEl = container;
    _onResult = onResult;
    _context = context || {};
    timeLeft = TIME_LIMIT;
    gameOver = false;
    myLives = 3;
    myOpenedCount = 0;
    isFlagMode = false;
    isStunned = false;
    _activeViewerPlayerId = null;

    playersList = (_context.players && _context.players.length > 0)
      ? _context.players
      : [{ id: 'host', name: '호스트', isHost: true }];

    const myId = _getMyPlayerId();

    playersState = {};
    playersList.forEach(p => {
      playersState[p.id] = {
        name: p.name,
        openedCount: 0,
        lives: 3,
        status: 'playing', // 'playing' | 'eliminated' | 'cleared'
        revealed: new Set(),
        flags: new Set(),
        explodes: new Set()
      };
    });

    const isHost = _context.isHost || P2P.isHost();

    // 1. 호스트는 공통 지뢰 맵 생성 및 브로드캐스트
    if (isHost) {
      _generateMinefield();
      setTimeout(() => {
        _broadcastBoard();
      }, 50);
    } else {
      // 2. 게스트는 임시 맵 생성 후 호스트에게 동기화 요청
      _generateMinefield();
      P2P.send({ type: 'ms_req_board' });
    }

    _renderGameShell();
    _renderBoard();
    _renderScoreCards();
    _startTimer();

    window.addEventListener('keydown', _onKeyDown);
    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);
  }

  function _getMyPlayerId() {
    return _context.myId || P2P.getMyId() || 'me';
  }

  function _onKeyDown(e) {
    if (e.key === 'Escape' && _activeViewerPlayerId) {
      _closeOpponentViewer();
    }
  }

  /* ── 1. 공통 지뢰 필드 생성 (호스트) ── */
  function _generateMinefield() {
    localBoard = [];
    rawMinesData = [];

    // 빈 보드 생성
    for (let r = 0; r < ROWS; r++) {
      localBoard[r] = [];
      for (let c = 0; c < COLS; c++) {
        localBoard[r][c] = {
          r, c,
          isMine: false,
          neighborMines: 0,
          revealed: false,
          flagged: false,
          exploded: false
        };
      }
    }

    // 중앙 2x2 안전 지대 (r: 6~7, c: 6~7) 제외
    const forbidden = new Set();
    const midR = Math.floor(ROWS / 2);
    const midC = Math.floor(COLS / 2);
    for (let dr = -1; dr <= 0; dr++) {
      for (let dc = -1; dc <= 0; dc++) {
        forbidden.add(`${midR + dr},${midC + dc}`);
      }
    }

    // 지뢰 무작위 배치
    let placed = 0;
    while (placed < MINE_COUNT) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      const key = `${r},${c}`;
      if (!forbidden.has(key) && !localBoard[r][c].isMine) {
        localBoard[r][c].isMine = true;
        rawMinesData.push({ r, c });
        placed++;
      }
    }

    _calcNeighborMines();
  }

  function _calcNeighborMines() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (localBoard[r][c].isMine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
              if (localBoard[nr][nc].isMine) count++;
            }
          }
        }
        localBoard[r][c].neighborMines = count;
      }
    }
  }

  function _broadcastBoard() {
    if (!rawMinesData) return;
    P2P.send({
      type: 'ms_init_board',
      mines: rawMinesData
    });
  }

  /**
   * 게스트가 수신받은 지뢰 목록으로 100% 동일하게 재구성
   */
  function _applyReceivedMines(mines) {
    if (!Array.isArray(mines)) return;
    rawMinesData = mines;

    // 보드 초기화
    for (let r = 0; r < ROWS; r++) {
      localBoard[r] = [];
      for (let c = 0; c < COLS; c++) {
        localBoard[r][c] = {
          r, c,
          isMine: false,
          neighborMines: 0,
          revealed: false,
          flagged: false,
          exploded: false
        };
      }
    }

    mines.forEach(({ r, c }) => {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        localBoard[r][c].isMine = true;
      }
    });

    _calcNeighborMines();
    _renderBoard();

    if (_activeViewerPlayerId) {
      _renderOpponentBoardView();
    }
  }

  /* ── 2. 게임 UI 렌더링 ── */
  function _renderGameShell() {
    containerEl.innerHTML = `
      <div class="minesweeper-wrap">
        <!-- 타이머 & 진행 바 -->
        <div class="timer-text" id="ms-timer-text">${timeLeft}</div>
        <div class="timer-bar-wrap" style="width:100%;max-width:540px;">
          <div class="timer-bar" id="ms-timer-bar" style="width:100%"></div>
        </div>

        <!-- 상대방 관전 안내 힌트 -->
        <div class="apple-live-hint">
          <i class="fa-solid fa-eye" style="color:var(--primary);"></i>
          <span>상대방 카드를 클릭하면 <strong>실시간 지뢰찾기 화면</strong>을 볼 수 있습니다.</span>
        </div>

        <!-- 플레이어 상태 카드 목록 -->
        <div class="ms-scores-row" id="ms-scores-container"></div>

        <!-- 내 상태 바 & 도구 툴바 -->
        <div class="ms-toolbar">
          <div class="ms-stat-box ms-lives-box" id="ms-lives-display">
            <span class="ms-stat-label">내 목숨:</span>
            <span class="ms-hearts" id="ms-hearts-icons">❤️❤️❤️</span>
          </div>
          <div class="ms-stat-box">
            <span class="ms-stat-label">발굴 진척:</span>
            <span class="ms-stat-val" id="ms-progress-text">0 / ${TOTAL_SAFE} (0%)</span>
          </div>
          <button type="button" class="btn btn-outline btn-sm ms-btn-flag-toggle" id="btn-ms-flag-mode" title="터치/클릭 시 깃발 꽂기 모드로 전환">
            <i class="fa-solid fa-flag"></i> <span>깃발 모드 OFF</span>
          </button>
        </div>

        <!-- 메인 지뢰찾기 보드 -->
        <div class="ms-board-wrap" id="ms-board-wrap">
          <div class="ms-board" id="ms-board"></div>
        </div>

        <!-- 🔍 상대방 실시간 관전 모달 -->
        <div class="apple-opp-modal hidden" id="ms-opp-modal">
          <div class="apple-opp-modal-card ms-opp-card">
            <div class="apple-opp-modal-header">
              <div class="apple-opp-modal-title">
                <i class="fa-solid fa-bomb" style="color:var(--green);"></i>
                <span id="ms-opp-modal-name">상대방 실시간 화면</span>
                <span class="apple-live-badge"><i class="fa-solid fa-circle"></i> LIVE</span>
              </div>
              <button type="button" class="btn-icon sm" id="btn-close-ms-opp" title="닫기">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="apple-opp-stats-row">
              <span id="ms-opp-stat-lives">목숨: ❤️❤️❤️</span>
              <span class="ap-divider">•</span>
              <span id="ms-opp-stat-progress">발굴: 0 / ${TOTAL_SAFE}</span>
              <span class="ap-divider">•</span>
              <span id="ms-opp-stat-status" class="ms-opp-status-badge">진행 중</span>
            </div>
            <div class="ms-opp-board-wrap">
              <div class="ms-opp-board" id="ms-opp-board"></div>
            </div>
            <p class="apple-opp-sub-hint">창을 닫아도 내 게임은 계속 진행 중입니다. (ESC 또는 바깥 클릭 시 닫기)</p>
          </div>
        </div>
      </div>
    `;

    boardEl = containerEl.querySelector('#ms-board');

    // 깃발 모드 토글 버튼
    const flagBtn = containerEl.querySelector('#btn-ms-flag-mode');
    if (flagBtn) {
      flagBtn.addEventListener('click', () => {
        isFlagMode = !isFlagMode;
        flagBtn.classList.toggle('active', isFlagMode);
        flagBtn.querySelector('span').textContent = isFlagMode ? '깃발 모드 ON' : '깃발 모드 OFF';
        if (typeof Sound !== 'undefined' && Sound.playClick) Sound.playClick();
      });
    }

    // 모달 닫기
    const closeBtn = containerEl.querySelector('#btn-close-ms-opp');
    const modalEl = containerEl.querySelector('#ms-opp-modal');
    if (closeBtn) closeBtn.addEventListener('click', _closeOpponentViewer);
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) _closeOpponentViewer();
      });
    }

    _viewerGridEl = containerEl.querySelector('#ms-opp-board');
  }

  function _renderBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = localBoard[r][c];
        const cellEl = document.createElement('div');
        cellEl.className = 'ms-cell' + (cell.revealed ? ' revealed' : '') + (cell.flagged ? ' flagged' : '') + (cell.exploded ? ' exploded' : '');
        cellEl.setAttribute('data-r', r);
        cellEl.setAttribute('data-c', c);

        _updateCellDisplay(cellEl, cell);

        // 클릭 이벤트
        cellEl.addEventListener('click', (e) => {
          e.preventDefault();
          _onCellClick(r, c);
        });

        // 우클릭 (깃발 토글)
        cellEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          _toggleFlag(r, c);
        });

        boardEl.appendChild(cellEl);
      }
    }
  }

  function _updateCellDisplay(cellEl, cell) {
    if (cell.exploded) {
      cellEl.className = 'ms-cell revealed exploded';
      cellEl.innerHTML = '<i class="fa-solid fa-burst" style="color:#ffffff;"></i>';
    } else if (cell.revealed) {
      cellEl.className = 'ms-cell revealed' + (cell.neighborMines > 0 ? ` num-${cell.neighborMines}` : ' empty');
      cellEl.innerHTML = cell.neighborMines > 0 ? `<span>${cell.neighborMines}</span>` : '';
    } else if (cell.flagged) {
      cellEl.className = 'ms-cell flagged';
      cellEl.innerHTML = '<i class="fa-solid fa-flag" style="color:#ef4444;"></i>';
    } else {
      cellEl.className = 'ms-cell covered';
      cellEl.innerHTML = '';
    }
  }

  function _renderScoreCards() {
    const container = document.getElementById('ms-scores-container');
    if (!container) return;

    let html = '';
    const myId = _getMyPlayerId();

    playersList.forEach(p => {
      const state = playersState[p.id] || { openedCount: 0, lives: 3, status: 'playing' };
      const isMe = (p.id === myId) || (p.isHost && P2P.isHost());
      const pct = Math.round((state.openedCount / TOTAL_SAFE) * 100);

      let heartsStr = '';
      for (let i = 0; i < state.lives; i++) heartsStr += '❤️';
      for (let i = state.lives; i < 3; i++) heartsStr += '🖤';

      let statusBadge = '';
      if (state.status === 'eliminated') {
        statusBadge = '<span class="ms-card-badge boom">탈락</span>';
      } else if (state.status === 'cleared') {
        statusBadge = '<span class="ms-card-badge win">완주!</span>';
      }

      html += `
        <div class="ms-score-card ${isMe ? 'me' : 'opp'}" id="ms-card-${p.id}" data-player-id="${p.id}" title="${isMe ? '나' : '클릭하여 실시간 화면 관전'}">
          <div class="label">
            <span class="ms-pname">${_escapeHtml(p.name)}</span>
            ${statusBadge}
            ${!isMe ? '<i class="fa-solid fa-magnifying-glass ap-view-icon" title="실시간 화면 보기"></i>' : ''}
          </div>
          <div class="ms-card-meta">
            <span class="ms-card-hearts" id="ms-card-hearts-${p.id}">${heartsStr}</span>
            <span class="ms-card-count" id="ms-card-val-${p.id}">${state.openedCount}칸 (${pct}%)</span>
          </div>
          <div class="ms-card-prog-bar">
            <div class="ms-card-prog-fill" id="ms-card-bar-${p.id}" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // 상대방 카드 클릭 시 라이브 뷰어 오픈
    container.querySelectorAll('.ms-score-card.opp').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = card.getAttribute('data-player-id');
        if (targetId) openOpponentViewer(targetId);
      });
    });
  }

  function _updateScoreCardUI(playerId) {
    const state = playersState[playerId];
    if (!state) return;

    const valEl = document.getElementById('ms-card-val-' + playerId);
    const barEl = document.getElementById('ms-card-bar-' + playerId);
    const heartsEl = document.getElementById('ms-card-hearts-' + playerId);
    const pct = Math.min(100, Math.round((state.openedCount / TOTAL_SAFE) * 100));

    if (valEl) valEl.textContent = `${state.openedCount}칸 (${pct}%)`;
    if (barEl) barEl.style.width = pct + '%';
    if (heartsEl) {
      let heartsStr = '';
      for (let i = 0; i < state.lives; i++) heartsStr += '❤️';
      for (let i = state.lives; i < 3; i++) heartsStr += '🖤';
      heartsEl.textContent = heartsStr;
    }
  }

  /* ── 3. 게임 플레이 로직 ── */
  function _onCellClick(r, c) {
    if (gameOver || isStunned || myLives <= 0) return;

    // 깃발 모드가 켜져있다면 깃발 토글
    if (isFlagMode) {
      _toggleFlag(r, c);
      return;
    }

    const cell = localBoard[r][c];

    // 이미 열린 칸 클릭 시 (Chord 기능: 주변 깃발 수가 맞으면 일괄 오픈)
    if (cell.revealed) {
      _chordOpen(r, c);
      return;
    }

    if (cell.flagged) return;

    // 지뢰를 밟았을 때!
    if (cell.isMine) {
      _hitMine(r, c);
      return;
    }

    // 안전한 칸 열기
    _revealSafeCell(r, c);
  }

  function _toggleFlag(r, c) {
    if (gameOver || isStunned || myLives <= 0) return;
    const cell = localBoard[r][c];
    if (cell.revealed) return;

    cell.flagged = !cell.flagged;
    const cellEl = _getCellElement(r, c);
    if (cellEl) _updateCellDisplay(cellEl, cell);

    if (typeof Sound !== 'undefined' && Sound.playClick) Sound.playClick();

    const myId = _getMyPlayerId();
    if (playersState[myId]) {
      const key = `${r},${c}`;
      if (cell.flagged) playersState[myId].flags.add(key);
      else playersState[myId].flags.delete(key);
    }

    P2P.send({
      type: 'ms_update',
      playerId: myId,
      action: 'flag',
      r, c,
      flagged: cell.flagged,
      openedCount: myOpenedCount,
      lives: myLives,
      status: myLives <= 0 ? 'eliminated' : (myOpenedCount >= TOTAL_SAFE ? 'cleared' : 'playing')
    });
  }

  function _hitMine(r, c) {
    const cell = localBoard[r][c];
    cell.exploded = true;
    cell.revealed = true;
    myLives--;

    const cellEl = _getCellElement(r, c);
    if (cellEl) _updateCellDisplay(cellEl, cell);

    const myId = _getMyPlayerId();
    if (playersState[myId]) {
      playersState[myId].lives = myLives;
      playersState[myId].explodes.add(`${r},${c}`);
    }

    // 효과음 & 화면 쉐이크/플래시
    _triggerExplosionEffect();

    _updateMyToolbarUI();
    _updateScoreCardUI(myId);

    const myStatus = myLives <= 0 ? 'eliminated' : 'playing';
    if (playersState[myId]) playersState[myId].status = myStatus;

    P2P.send({
      type: 'ms_update',
      playerId: myId,
      action: 'explode',
      r, c,
      openedCount: myOpenedCount,
      lives: myLives,
      status: myStatus
    });

    if (myLives <= 0) {
      // 탈락!
      _handleElimination();
    } else {
      // 1.5초 스턴 (기절 페널티)
      isStunned = true;
      const wrap = document.getElementById('ms-board-wrap');
      if (wrap) wrap.classList.add('ms-stunned');
      setTimeout(() => {
        isStunned = false;
        if (wrap) wrap.classList.remove('ms-stunned');
      }, 1500);
    }
  }

  function _triggerExplosionEffect() {
    if (typeof Sound !== 'undefined') {
      if (Sound.playBomb) Sound.playBomb();
      else if (Sound.playLose) Sound.playLose();
    }

    const wrap = document.getElementById('ms-board-wrap');
    if (wrap) {
      wrap.classList.add('shake', 'flash-red');
      setTimeout(() => wrap.classList.remove('shake', 'flash-red'), 400);
    }
  }

  function _revealSafeCell(startR, startC) {
    const newlyOpened = [];
    const queue = [{ r: startR, c: startC }];
    const myId = _getMyPlayerId();

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      const cell = localBoard[r][c];
      if (cell.revealed || cell.flagged || cell.isMine) continue;

      cell.revealed = true;
      myOpenedCount++;
      newlyOpened.push({ r, c, neighborMines: cell.neighborMines });

      const cellEl = _getCellElement(r, c);
      if (cellEl) _updateCellDisplay(cellEl, cell);

      if (playersState[myId]) {
        playersState[myId].revealed.add(`${r},${c}`);
        playersState[myId].openedCount = myOpenedCount;
      }

      // 인접 지뢰가 0개인 빈칸이면 주변 8칸도 연쇄 확장
      if (cell.neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
              const nCell = localBoard[nr][nc];
              if (!nCell.revealed && !nCell.flagged && !nCell.isMine) {
                queue.push({ r: nr, c: nc });
              }
            }
          }
        }
      }
    }

    if (newlyOpened.length > 0) {
      if (typeof Sound !== 'undefined' && Sound.playClick) Sound.playClick();
      _updateMyToolbarUI();
      _updateScoreCardUI(myId);

      const isClear = myOpenedCount >= TOTAL_SAFE;
      const status = isClear ? 'cleared' : 'playing';
      if (playersState[myId]) playersState[myId].status = status;

      // P2P 동기화 전송
      P2P.send({
        type: 'ms_update',
        playerId: myId,
        action: 'reveal',
        openedList: newlyOpened,
        openedCount: myOpenedCount,
        lives: myLives,
        status: status
      });

      if (isClear) {
        _handleGameClear();
      }
    }
  }

  /**
   * 숫자 셀 클릭 시 주변 깃발 수가 일치하면 닫힌 인접 칸 일괄 오픈 (Chord 기능)
   */
  function _chordOpen(r, c) {
    const cell = localBoard[r][c];
    if (!cell.revealed || cell.neighborMines === 0) return;

    let flagCount = 0;
    const neighbors = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          neighbors.push(localBoard[nr][nc]);
          if (localBoard[nr][nc].flagged) flagCount++;
        }
      }
    }

    if (flagCount === cell.neighborMines) {
      neighbors.forEach(n => {
        if (!n.revealed && !n.flagged) {
          if (n.isMine) {
            _hitMine(n.r, n.c);
          } else {
            _revealSafeCell(n.r, n.c);
          }
        }
      });
    }
  }

  function _updateMyToolbarUI() {
    const heartsEl = document.getElementById('ms-hearts-icons');
    if (heartsEl) {
      let str = '';
      for (let i = 0; i < myLives; i++) str += '❤️';
      for (let i = myLives; i < 3; i++) str += '🖤';
      heartsEl.textContent = str;
    }

    const progEl = document.getElementById('ms-progress-text');
    if (progEl) {
      const pct = Math.min(100, Math.round((myOpenedCount / TOTAL_SAFE) * 100));
      progEl.textContent = `${myOpenedCount} / ${TOTAL_SAFE} (${pct}%)`;
    }
  }

  function _handleElimination() {
    isStunned = true;
    showToast('모든 목숨을 소진하여 탈락했습니다! 남은 플레이어를 관전하세요.', 'warn');
    const wrap = document.getElementById('ms-board-wrap');
    if (wrap) wrap.classList.add('ms-eliminated');

    // 다른 생존자가 없으면 바로 종료 검사
    _checkAllPlayersFinished();
  }

  function _handleGameClear() {
    if (typeof Sound !== 'undefined' && Sound.playWin) Sound.playWin();
    showToast('축하합니다! 모든 안전한 칸을 발굴하여 완주했습니다!', 'success');
    _checkAllPlayersFinished();
  }

  function _getCellElement(r, c) {
    if (!boardEl) return null;
    return boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  }

  /* ── 4. 타이머 및 게임 종료 ── */
  function _startTimer() {
    _stopTimer();
    timerInterval = setInterval(() => {
      timeLeft--;
      _updateTimerUI();
      if (timeLeft <= 0) {
        _stopTimer();
        _endGame('시간 종료! 최종 결과를 집계합니다.');
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
    const tt = document.getElementById('ms-timer-text');
    const tb = document.getElementById('ms-timer-bar');
    if (!tt || !tb) return;
    tt.textContent = timeLeft;
    const pct = (timeLeft / TIME_LIMIT) * 100;
    tb.style.width = pct + '%';
    if (timeLeft <= 15)      { tt.className = 'timer-text critical'; tb.className = 'timer-bar critical'; }
    else if (timeLeft <= 30) { tt.className = 'timer-text warning';  tb.className = 'timer-bar warning'; }
    else                     { tt.className = 'timer-text';          tb.className = 'timer-bar'; }
  }

  function _checkAllPlayersFinished() {
    const allFinished = playersList.every(p => {
      const st = playersState[p.id];
      return st && (st.status === 'eliminated' || st.status === 'cleared');
    });

    if (allFinished) {
      setTimeout(() => {
        _endGame('모든 플레이어의 발굴이 완료되었습니다!');
      }, 800);
    }
  }

  function _endGame(reason) {
    if (gameOver) return;
    gameOver = true;
    _stopTimer();
    _closeOpponentViewer();

    // 순위표 정렬: 1) 클리어 여부 2) 열린 칸 수 (내림차순) 3) 남은 목숨 (내림차순)
    const leaderboard = [];
    playersList.forEach(p => {
      const st = playersState[p.id] || { openedCount: 0, lives: 0, status: 'eliminated' };
      leaderboard.push({
        id: p.id,
        name: p.name,
        score: st.openedCount,
        lives: st.lives,
        status: st.status,
        scoreText: `${st.openedCount}칸 (${st.lives}❤️)`
      });
    });

    leaderboard.sort((a, b) => {
      if (a.status === 'cleared' && b.status !== 'cleared') return -1;
      if (b.status === 'cleared' && a.status !== 'cleared') return 1;
      if (b.score !== a.score) return b.score - a.score;
      return b.lives - a.lives;
    });

    const myId = _getMyPlayerId();
    const myName = _context.myNickname || '나';
    const isWinner = leaderboard.length > 0 && (leaderboard[0].id === myId || leaderboard[0].name === myName);

    setTimeout(() => {
      _onResult && _onResult(isWinner, reason, leaderboard);
    }, 700);
  }

  /* =====================================================================
     🔍 상대방 실시간 관전 모달 (Live Opponent Inspection)
     ===================================================================== */
  function openOpponentViewer(playerId) {
    if (!playerId) return;
    const myId = _getMyPlayerId();
    if (playerId === myId) return;

    _activeViewerPlayerId = playerId;
    const modal = document.getElementById('ms-opp-modal');
    if (!modal) return;

    const pObj = playersList.find(p => p.id === playerId) || { name: '상대방' };
    const nameEl = document.getElementById('ms-opp-modal-name');
    if (nameEl) nameEl.textContent = `${pObj.name}님의 실시간 지뢰찾기`;

    _updateViewerStatsHeader();
    modal.classList.remove('hidden');
    _renderOpponentBoardView();
  }

  function _closeOpponentViewer() {
    _activeViewerPlayerId = null;
    const modal = document.getElementById('ms-opp-modal');
    if (modal) modal.classList.add('hidden');
  }

  function _updateViewerStatsHeader() {
    if (!_activeViewerPlayerId) return;
    const st = playersState[_activeViewerPlayerId] || { openedCount: 0, lives: 3, status: 'playing' };

    const livesEl = document.getElementById('ms-opp-stat-lives');
    const progEl = document.getElementById('ms-opp-stat-progress');
    const statusEl = document.getElementById('ms-opp-stat-status');

    if (livesEl) {
      let str = '';
      for (let i = 0; i < st.lives; i++) str += '❤️';
      for (let i = st.lives; i < 3; i++) str += '🖤';
      livesEl.textContent = `목숨: ${str}`;
    }
    if (progEl) {
      const pct = Math.min(100, Math.round((st.openedCount / TOTAL_SAFE) * 100));
      progEl.textContent = `발굴: ${st.openedCount} / ${TOTAL_SAFE} (${pct}%)`;
    }
    if (statusEl) {
      if (st.status === 'eliminated') {
        statusEl.className = 'ms-opp-status-badge boom';
        statusEl.textContent = '폭사 탈락';
      } else if (st.status === 'cleared') {
        statusEl.className = 'ms-opp-status-badge win';
        statusEl.textContent = '발굴 완주!';
      } else {
        statusEl.className = 'ms-opp-status-badge';
        statusEl.textContent = '진행 중';
      }
    }
  }

  function _renderOpponentBoardView() {
    if (!_viewerGridEl || !_activeViewerPlayerId) return;
    const st = playersState[_activeViewerPlayerId] || { revealed: new Set(), flags: new Set(), explodes: new Set() };

    _viewerGridEl.innerHTML = '';
    _viewerGridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    _viewerGridEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const key = `${r},${c}`;
        const isExploded = st.explodes.has(key);
        const isRevealed = st.revealed.has(key);
        const isFlagged = st.flags.has(key);

        const cellEl = document.createElement('div');
        if (isExploded) {
          cellEl.className = 'ms-opp-cell revealed exploded';
          cellEl.innerHTML = '<i class="fa-solid fa-burst"></i>';
        } else if (isRevealed) {
          const neighbor = localBoard[r] ? localBoard[r][c].neighborMines : 0;
          cellEl.className = 'ms-opp-cell revealed' + (neighbor > 0 ? ` num-${neighbor}` : ' empty');
          cellEl.innerHTML = neighbor > 0 ? `<span>${neighbor}</span>` : '';
        } else if (isFlagged) {
          cellEl.className = 'ms-opp-cell flagged';
          cellEl.innerHTML = '<i class="fa-solid fa-flag"></i>';
        } else {
          cellEl.className = 'ms-opp-cell covered';
        }

        _viewerGridEl.appendChild(cellEl);
      }
    }
  }

  /* ── 5. P2P 메시지 핸들러 ── */
  function _onMessage(data) {
    if (!data) return;

    if (data.type === 'ms_init_board') {
      _applyReceivedMines(data.mines);
    } else if (data.type === 'ms_req_board') {
      if (P2P.isHost() || _context.isHost) {
        _broadcastBoard();
      }
    } else if (data.type === 'ms_update') {
      const pId = data.playerId;
      if (!playersState[pId]) return;

      const st = playersState[pId];
      if (data.openedCount !== undefined) st.openedCount = data.openedCount;
      if (data.lives !== undefined) st.lives = data.lives;
      if (data.status) st.status = data.status;

      if (data.action === 'reveal' && Array.isArray(data.openedList)) {
        data.openedList.forEach(({ r, c }) => {
          st.revealed.add(`${r},${c}`);
          st.flags.delete(`${r},${c}`);
        });
      } else if (data.action === 'flag') {
        const key = `${data.r},${data.c}`;
        if (data.flagged) st.flags.add(key);
        else st.flags.delete(key);
      } else if (data.action === 'explode') {
        st.explodes.add(`${data.r},${data.c}`);
        st.revealed.add(`${data.r},${data.c}`);
      }

      _updateScoreCardUI(pId);

      // 관전 중인 상대방이라면 뷰어도 즉각 갱신
      if (_activeViewerPlayerId === pId) {
        _updateViewerStatsHeader();
        _renderOpponentBoardView();
      }

      _checkAllPlayersFinished();
    } else if (data.type === 'ms_rematch') {
      _doRematch();
    }
  }

  function rematch() {
    P2P.send({ type: 'ms_rematch' });
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
    window.removeEventListener('keydown', _onKeyDown);
    P2P.offMessage(_onMessage);
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { init, rematch, destroy, openOpponentViewer };
})();
