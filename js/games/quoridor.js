/**
 * quoridor.js - 2인 실시간 P2P 명작 전략 보드게임 쿼리도 (Quoridor)
 * (9x9 보드, 10개 벽, 폰 점프/대각선 룰, BFS 경로 차단 방지 알고리즘, 반응형 3D 원목 보드)
 */
const QuoridorGame = (() => {
  'use strict';

  const BOARD_SIZE = 9;
  const INITIAL_WALLS = 10;

  let _container = null;
  let _onResult = null;
  let _context = null;

  let myPlayerIdx = 0; // 0 (하단 파랑) or 1 (상단 빨강)
  let currentTurn = 0; // 0 or 1
  let gameOver = false;

  // 폰 위치 { row, col }
  let pawns = [
    { row: 8, col: 4 }, // 플레이어 0 (목표: row 0)
    { row: 0, col: 4 }  // 플레이어 1 (목표: row 8)
  ];

  // 남은 벽 개수
  let wallsLeft = [INITIAL_WALLS, INITIAL_WALLS];

  // 설치된 벽 집합
  // 가로벽 hWalls: 0~7 행, 0~7 열 (2칸 길이, (r,c)와 (r, c+1) 아래를 막음)
  // 세로벽 vWalls: 0~7 행, 0~7 열 (2칸 길이, (r,c)와 (r+1, c) 오른쪽을 막음)
  let hWalls = new Set(); // Key: "r,c"
  let vWalls = new Set(); // Key: "r,c"

  // 조작 모드: 'move' (말 이동), 'wall-h' (가로 벽), 'wall-v' (세로 벽)
  let currentMode = 'move';
  let hoveredWall = null; // { row, col, type: 'h'|'v' }

  function init(container, onResult, context) {
    _container = container;
    _onResult = onResult;
    _context = context || {};

    pawns = [
      { row: 8, col: 4 },
      { row: 0, col: 4 }
    ];
    wallsLeft = [INITIAL_WALLS, INITIAL_WALLS];
    hWalls.clear();
    vWalls.clear();
    currentTurn = 0;
    gameOver = false;
    currentMode = 'move';
    hoveredWall = null;

    const isSpectator = !!(_context && _context.isSpectator);
    const players = _context.players || [];
    const myId = _context.myId;
    if (isSpectator) {
      myPlayerIdx = -1;
    } else if (players.length >= 2 && String(players[1].id) === String(myId)) {
      myPlayerIdx = 1;
    } else {
      myPlayerIdx = 0;
    }

    _renderGameLayout();
    _updateUI();

    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);
  }

  function _renderGameLayout() {
    _container.innerHTML = `
      <div class="quoridor-wrap">
        <!-- 상단 헤더: 턴 & 모드 컨트롤 -->
        <div class="quoridor-header-area">
          <div class="turn-indicator">
            <span class="turn-label" id="qd-turn-label">
              <i class="fa-solid fa-shapes"></i>
              <span id="qd-turn-text">턴 계산 중...</span>
            </span>
          </div>
          <div class="qd-goal-hint" id="qd-goal-hint">
            ${myPlayerIdx === 0 ? '목표: 맨 위쪽(상단) 끝 줄 도달' : '목표: 맨 아래쪽(하단) 끝 줄 도달'}
          </div>
        </div>

        <!-- 🎮 조작 모드 툴바 -->
        <div class="quoridor-toolbar card">
          <button type="button" class="qd-tool-btn active" id="qd-btn-move" data-mode="move">
            <i class="fa-solid fa-person-walking"></i>
            <span>말 이동</span>
          </button>
          <button type="button" class="qd-tool-btn" id="qd-btn-wall-h" data-mode="wall-h">
            <span class="wall-icon-h"></span>
            <span>가로 벽 (<b id="qd-my-walls-h">10</b>)</span>
          </button>
          <button type="button" class="qd-tool-btn" id="qd-btn-wall-v" data-mode="wall-v">
            <span class="wall-icon-v"></span>
            <span>세로 벽 (<b id="qd-my-walls-v">10</b>)</span>
          </button>
        </div>

        <!-- 9x9 메인 쿼리도 보드 카드 -->
        <div class="quoridor-card card">
          <div class="quoridor-board-container" id="quoridor-board-container">
            <div class="quoridor-cells-grid" id="quoridor-cells-grid"></div>
            <div class="quoridor-walls-layer" id="quoridor-walls-layer"></div>
          </div>
        </div>
      </div>
    `;

    // 툴바 리스너
    _container.querySelectorAll('.qd-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!_isMyTurn() || gameOver) return;
        const mode = btn.dataset.mode;
        if ((mode === 'wall-h' || mode === 'wall-v') && wallsLeft[myPlayerIdx] <= 0) {
          _showNotice('남은 벽이 없습니다!', true);
          if (typeof Sound !== 'undefined') Sound.playError();
          return;
        }
        _setMode(mode);
      });
    });

    // 🌟 보드 컨테이너 레벨 스마트 자석 스냅 마우스/터치 리스너
    const boardContainer = document.getElementById('quoridor-board-container');
    if (boardContainer) {
      boardContainer.addEventListener('mousemove', _onBoardMouseMove);
      boardContainer.addEventListener('mouseleave', _onBoardMouseLeave);
      boardContainer.addEventListener('click', _onBoardClick);
      // 모바일 터치 지원
      boardContainer.addEventListener('touchmove', _onBoardTouchMove, { passive: true });
      boardContainer.addEventListener('touchend', _onBoardClick);
    }

    _renderBoard();
  }

  function _setMode(mode) {
    currentMode = mode;
    hoveredWall = null;
    _container.querySelectorAll('.qd-tool-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    const boardContainer = document.getElementById('quoridor-board-container');
    if (boardContainer) {
      boardContainer.classList.toggle('wall-mode-active', mode === 'wall-h' || mode === 'wall-v');
    }

    _renderBoard();
  }

  /* ── 🌟 스마트 자석 스냅: 마우스 위치에서 가장 가까운 (r, c) 교차점 계산 ── */
  function _getSnappedWallCoords(clientX, clientY) {
    const boardContainer = document.getElementById('quoridor-board-container');
    if (!boardContainer) return null;

    const rect = boardContainer.getBoundingClientRect();
    const pad = 12; // padding
    const innerW = rect.width - 2 * pad;
    const innerH = rect.height - 2 * pad;
    if (innerW <= 0 || innerH <= 0) return null;

    const relX = clientX - rect.left - pad;
    const relY = clientY - rect.top - pad;

    const cellW = innerW / BOARD_SIZE;
    const cellH = innerH / BOARD_SIZE;

    // 8개의 교차점 (0 ~ 7)
    let c = Math.round(relX / cellW - 1);
    let r = Math.round(relY / cellH - 1);

    c = Math.max(0, Math.min(BOARD_SIZE - 2, c));
    r = Math.max(0, Math.min(BOARD_SIZE - 2, r));

    return { row: r, col: c };
  }

  function _onBoardMouseMove(e) {
    if (!_isMyTurn() || (currentMode !== 'wall-h' && currentMode !== 'wall-v') || gameOver) return;
    const coords = _getSnappedWallCoords(e.clientX, e.clientY);
    if (coords) {
      const type = (currentMode === 'wall-h') ? 'h' : 'v';
      if (!hoveredWall || hoveredWall.row !== coords.row || hoveredWall.col !== coords.col || hoveredWall.type !== type) {
        hoveredWall = { row: coords.row, col: coords.col, type: type };
        _renderWallsOnly();
      }
    }
  }

  function _onBoardTouchMove(e) {
    if (e.touches && e.touches.length > 0) {
      _onBoardMouseMove(e.touches[0]);
    }
  }

  function _onBoardMouseLeave() {
    if (hoveredWall) {
      hoveredWall = null;
      _renderWallsOnly();
    }
  }

  function _onBoardClick(e) {
    if (!_isMyTurn() || (currentMode !== 'wall-h' && currentMode !== 'wall-v') || gameOver) return;

    // 폰 클릭인 경우 무시
    if (e.target.closest('.qd-cell.valid-target')) return;

    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX);
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY);
    if (clientX === undefined) return;

    const coords = _getSnappedWallCoords(clientX, clientY);
    if (!coords) return;

    _handleWallClick(coords.row, coords.col);
  }

  function _renderBoard() {
    const cellsGrid = document.getElementById('quoridor-cells-grid');
    if (!cellsGrid) return;
    cellsGrid.innerHTML = '';

    const isDev = !!(_context && _context.isDevMode);
    const activePlayer = isDev ? currentTurn : myPlayerIdx;
    const isMyTurn = _isMyTurn();
    const validMoves = (isMyTurn && currentMode === 'move' && !gameOver)
      ? _getValidMoves(activePlayer)
      : [];

    // 1. 9x9 타일 셀 렌더링
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'qd-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (myPlayerIdx === 0 && r === 0) cell.classList.add('goal-p0');
        if (myPlayerIdx === 1 && r === 8) cell.classList.add('goal-p1');

        if (pawns[0].row === r && pawns[0].col === c) {
          const pawn0 = document.createElement('div');
          pawn0.className = 'qd-pawn pawn-p0' + (currentTurn === 0 ? ' is-turn' : '');
          pawn0.innerHTML = '<span class="pawn-core"></span>';
          cell.appendChild(pawn0);
        } else if (pawns[1].row === r && pawns[1].col === c) {
          const pawn1 = document.createElement('div');
          pawn1.className = 'qd-pawn pawn-p1' + (currentTurn === 1 ? ' is-turn' : '');
          pawn1.innerHTML = '<span class="pawn-core"></span>';
          cell.appendChild(pawn1);
        }

        const isMoveTarget = validMoves.some(m => m.row === r && m.col === c);
        if (isMoveTarget) {
          const dot = document.createElement('div');
          dot.className = 'qd-move-dot';
          cell.appendChild(dot);
          cell.classList.add('valid-target');
          cell.addEventListener('click', (e) => {
            e.stopPropagation();
            _handleMovePawn(r, c);
          });
        }

        cellsGrid.appendChild(cell);
      }
    }

    _renderWallsOnly();
  }

  function _renderWallsOnly() {
    const wallsLayer = document.getElementById('quoridor-walls-layer');
    if (!wallsLayer) return;
    wallsLayer.innerHTML = '';

    const isMyTurn = _isMyTurn();

    // 1. 설치된 가로 벽 렌더링
    hWalls.forEach(k => {
      const [r, c] = k.split(',').map(Number);
      const wallEl = document.createElement('div');
      wallEl.className = 'qd-placed-wall wall-h';
      wallEl.style.top = `calc(${(r + 1) * (100 / 9)}% - 5px)`;
      wallEl.style.left = `calc(${c * (100 / 9)}% + 3px)`;
      wallEl.style.width = `calc(${2 * (100 / 9)}% - 6px)`;
      wallsLayer.appendChild(wallEl);
    });

    // 2. 설치된 세로 벽 렌더링
    vWalls.forEach(k => {
      const [r, c] = k.split(',').map(Number);
      const wallEl = document.createElement('div');
      wallEl.className = 'qd-placed-wall wall-v';
      wallEl.style.left = `calc(${(c + 1) * (100 / 9)}% - 5px)`;
      wallEl.style.top = `calc(${r * (100 / 9)}% + 3px)`;
      wallEl.style.height = `calc(${2 * (100 / 9)}% - 6px)`;
      wallsLayer.appendChild(wallEl);
    });

    // 3. 호버 중인 고스트 벽 미리보기
    if (hoveredWall && isMyTurn && (currentMode === 'wall-h' || currentMode === 'wall-v') && !gameOver) {
      const { row: r, col: c, type } = hoveredWall;
      const isValid = _isValidWallPlacement(r, c, type);
      const ghostEl = document.createElement('div');
      ghostEl.className = `qd-ghost-wall wall-${type} ${isValid ? 'valid' : 'invalid'}`;

      if (type === 'h') {
        ghostEl.style.top = `calc(${(r + 1) * (100 / 9)}% - 5px)`;
        ghostEl.style.left = `calc(${c * (100 / 9)}% + 3px)`;
        ghostEl.style.width = `calc(${2 * (100 / 9)}% - 6px)`;
      } else {
        ghostEl.style.left = `calc(${(c + 1) * (100 / 9)}% - 5px)`;
        ghostEl.style.top = `calc(${r * (100 / 9)}% + 3px)`;
        ghostEl.style.height = `calc(${2 * (100 / 9)}% - 6px)`;
      }
      wallsLayer.appendChild(ghostEl);
    }
  }

  function _handleMovePawn(row, col) {
    if (!_isMyTurn() || gameOver) return;

    const isDev = !!(_context && _context.isDevMode);
    const activePlayer = isDev ? currentTurn : myPlayerIdx;

    pawns[activePlayer] = { row, col };

    if (typeof Sound !== 'undefined') Sound.playStone();

    P2P.send({
      type: 'quoridor_move',
      action: 'pawn',
      playerIdx: activePlayer,
      row: row,
      col: col
    });

    _checkWinCondition();
    if (!gameOver) {
      _nextTurn();
    }
  }

  function _handleWallClick(row, col) {
    if (!_isMyTurn() || (currentMode !== 'wall-h' && currentMode !== 'wall-v') || gameOver) return;

    const isDev = !!(_context && _context.isDevMode);
    const activePlayer = isDev ? currentTurn : myPlayerIdx;

    if (wallsLeft[activePlayer] <= 0) {
      _showNotice('남은 벽이 없습니다!', true);
      if (typeof Sound !== 'undefined') Sound.playError();
      return;
    }

    const type = (currentMode === 'wall-h') ? 'h' : 'v';
    if (!_isValidWallPlacement(row, col, type)) {
      _showNotice('여기에 벽을 놓을 수 없거나 상대방의 길이 완전히 막힙니다!', true);
      if (typeof Sound !== 'undefined') Sound.playError();
      return;
    }

    // 벽 설치 실행
    if (type === 'h') hWalls.add(`${row},${col}`);
    else vWalls.add(`${row},${col}`);

    wallsLeft[activePlayer]--;
    hoveredWall = null;

    if (typeof Sound !== 'undefined') Sound.playApplePop();

    P2P.send({
      type: 'quoridor_move',
      action: 'wall',
      playerIdx: activePlayer,
      wallType: type,
      row: row,
      col: col
    });

    _setMode('move');
    _nextTurn();
  }

  /* ── 룰 검증: 벽 설치 가능 여부 & BFS 경로 차단 검사 ── */
  function _isValidWallPlacement(r, c, type) {
    if (r < 0 || r >= BOARD_SIZE - 1 || c < 0 || c >= BOARD_SIZE - 1) return false;

    // 1. 이미 같은 자리에 벽이 있는지
    if (type === 'h') {
      if (hWalls.has(`${r},${c}`)) return false;
      if (hWalls.has(`${r},${c - 1}`)) return false;
      if (hWalls.has(`${r},${c + 1}`)) return false;
      if (vWalls.has(`${r},${c}`)) return false; // 정중앙 십자 교차 금지
    } else {
      if (vWalls.has(`${r},${c}`)) return false;
      if (vWalls.has(`${r - 1},${c}`)) return false;
      if (vWalls.has(`${r + 1},${c}`)) return false;
      if (hWalls.has(`${r},${c}`)) return false; // 정중앙 십자 교차 금지
    }

    // 2. 가상으로 벽을 넣고 BFS로 양쪽 플레이어 모두 목표 도달 경로가 있는지 검증
    if (type === 'h') hWalls.add(`${r},${c}`);
    else vWalls.add(`${r},${c}`);

    const p0CanReach = _hasPathToGoal(0);
    const p1CanReach = _hasPathToGoal(1);

    // 가상 벽 원복
    if (type === 'h') hWalls.delete(`${r},${c}`);
    else vWalls.delete(`${r},${c}`);

    return p0CanReach && p1CanReach;
  }

  // BFS 최단 경로 존재 검사
  function _hasPathToGoal(playerIdx) {
    const start = pawns[playerIdx];
    const targetRow = (playerIdx === 0) ? 0 : 8;

    const queue = [{ r: start.row, c: start.col }];
    const visited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));
    visited[start.row][start.col] = true;

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      if (r === targetRow) return true;

      const neighbors = _getAccessibleNeighbors(r, c);
      for (const next of neighbors) {
        if (!visited[next.r][next.c]) {
          visited[next.r][next.c] = true;
          queue.push(next);
        }
      }
    }
    return false;
  }

  function _getAccessibleNeighbors(r, c) {
    const list = [];
    const dirs = [
      { dr: -1, dc: 0 }, // 상
      { dr: 1, dc: 0 },  // 하
      { dr: 0, dc: -1 }, // 좌
      { dr: 0, dc: 1 }   // 우
    ];

    for (const d of dirs) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
        if (!_isBlockedByWall(r, c, nr, nc)) {
          list.push({ r: nr, c: nc });
        }
      }
    }
    return list;
  }

  // 두 칸 사이에 벽이 가로막고 있는지 검사
  function _isBlockedByWall(r1, c1, r2, c2) {
    if (r1 === r2) {
      // 좌우 이동 (c1 -> c2)
      const minC = Math.min(c1, c2);
      // minC 열 오른쪽에 세로벽이 있는지 검사 (r1 또는 r1-1 행)
      if (vWalls.has(`${r1},${minC}`) || vWalls.has(`${r1 - 1},${minC}`)) {
        return true;
      }
    } else if (c1 === c2) {
      // 상하 이동 (r1 -> r2)
      const minR = Math.min(r1, r2);
      // minR 행 아래쪽에 가로벽이 있는지 검사 (c1 또는 c1-1 열)
      if (hWalls.has(`${minR},${c1}`) || hWalls.has(`${minR},${c1 - 1}`)) {
        return true;
      }
    }
    return false;
  }

  /* ── 폰의 합법적 이동 가능 칸 계산 (점프 & 대각선 룰 포함) ── */
  function _getValidMoves(playerIdx) {
    const me = pawns[playerIdx];
    const opp = pawns[1 - playerIdx];
    const moves = [];

    const dirs = [
      { dr: -1, dc: 0 }, // 상
      { dr: 1, dc: 0 },  // 하
      { dr: 0, dc: -1 }, // 좌
      { dr: 0, dc: 1 }   // 우
    ];

    for (const d of dirs) {
      const nr = me.row + d.dr;
      const nc = me.col + d.dc;

      if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
      if (_isBlockedByWall(me.row, me.col, nr, nc)) continue;

      // 이동할 칸에 상대방 말이 있는 경우 (점프 룰)
      if (nr === opp.row && nc === opp.col) {
        const jumpR = nr + d.dr;
        const jumpC = nc + d.dc;

        const canJumpStraight = (
          jumpR >= 0 && jumpR < BOARD_SIZE &&
          jumpC >= 0 && jumpC < BOARD_SIZE &&
          !_isBlockedByWall(opp.row, opp.col, jumpR, jumpC)
        );

        if (canJumpStraight) {
          // 1. 일직선 2칸 점프
          moves.push({ row: jumpR, col: jumpC });
        } else {
          // 2. 뒤에 벽이 있거나 보드 밖이면 대각선 점프 2방향 허용
          const sideDirs = (d.dr !== 0)
            ? [{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }] // 상하 이동 중이면 좌우로 대각 점프
            : [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }]; // 좌우 이동 중이면 상하로 대각 점프

          for (const sd of sideDirs) {
            const diagR = opp.row + sd.dr;
            const diagC = opp.col + sd.dc;
            if (
              diagR >= 0 && diagR < BOARD_SIZE &&
              diagC >= 0 && diagC < BOARD_SIZE &&
              !_isBlockedByWall(opp.row, opp.col, diagR, diagC)
            ) {
              moves.push({ row: diagR, col: diagC });
            }
          }
        }
      } else {
        // 일반 1칸 이동
        moves.push({ row: nr, col: nc });
      }
    }

    return moves;
  }

  function _nextTurn() {
    currentTurn = 1 - currentTurn;
    _renderBoard();
    _updateUI();
  }

  function _checkWinCondition() {
    if (gameOver) return;

    if (pawns[0].row === 0) {
      _endGame(0);
    } else if (pawns[1].row === 8) {
      _endGame(1);
    }
  }

  function _endGame(winnerIdx) {
    gameOver = true;
    const iWon = (winnerIdx === myPlayerIdx);

    if (typeof Sound !== 'undefined') {
      if (iWon) Sound.playWin();
      else Sound.playLose();
    }

    setTimeout(() => {
      _onResult && _onResult(iWon, null);
    }, 1000);
  }

  function _isMyTurn() {
    if (_context && _context.isDevMode) return true;
    if (myPlayerIdx < 0 || (_context && _context.isSpectator)) return false;
    return currentTurn === myPlayerIdx;
  }

  function _updateUI() {
    const label = document.getElementById('qd-turn-label');
    const text = document.getElementById('qd-turn-text');
    const myH = document.getElementById('qd-my-walls-h');
    const myV = document.getElementById('qd-my-walls-v');

    const isMine = _isMyTurn();
    const isSpectator = !!(_context && _context.isSpectator);
    const curName = (currentTurn === 0) ? '<i class="fa-solid fa-circle" style="color:#3182ce;"></i> 파랑 (하단)' : '<i class="fa-solid fa-circle" style="color:#e53e3e;"></i> 빨강 (상단)';

    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      window.App.updateInGameTurn(currentTurn);
    }

    if (label) label.className = 'turn-label ' + (isMine ? 'my-turn' : 'opp-turn');
    if (text) text.innerHTML = isSpectator ? `${curName} 차례 (관전 중)` : (isMine ? '내 차례' : `${curName} 차례`);

    if (myH) myH.textContent = myPlayerIdx >= 0 ? wallsLeft[myPlayerIdx] : '-';
    if (myV) myV.textContent = myPlayerIdx >= 0 ? wallsLeft[myPlayerIdx] : '-';
  }

  function _showNotice(msg, isError = false) {
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast(msg, isError ? 'error' : 'info');
    }
  }

  function _onMessage(data, senderId) {
    if (!data || typeof data !== 'object') return;
    if (gameOver && data.type !== 'quoridor_rematch') return;

    // 호스트 릴레이: 2인 전용이지만 다인원 환경/일관성 대비
    if (typeof P2P !== 'undefined' && P2P.isHost && P2P.isHost() && senderId) {
      if (['quoridor_move', 'quoridor_rematch'].includes(data.type)) {
        P2P.send(data, null, senderId);
      }
    }

    if (data.type === 'quoridor_move') {
      const playerIdx = (typeof data.playerIdx === 'number') ? data.playerIdx : (1 - myPlayerIdx);
      if (playerIdx === myPlayerIdx) return; // 본인의 패킷 에코 방지

      if (data.action === 'pawn') {
        pawns[playerIdx] = { row: data.row, col: data.col };
        if (typeof Sound !== 'undefined') Sound.playStone();
        _checkWinCondition();
        if (!gameOver) {
          currentTurn = 1 - playerIdx;
          _renderBoard();
          _updateUI();
        }
      } else if (data.action === 'wall') {
        if (data.wallType === 'h') {
          hWalls.add(`${data.row},${data.col}`);
        } else if (data.wallType === 'v') {
          vWalls.add(`${data.row},${data.col}`);
        }
        wallsLeft[playerIdx]--;
        if (typeof Sound !== 'undefined') Sound.playApplePop();
        currentTurn = 1 - playerIdx;
        _renderBoard();
        _updateUI();
      }
    } else if (data.type === 'quoridor_snapshot') {
      pawns = data.pawns || pawns;
      wallsLeft = data.wallsLeft || wallsLeft;
      hWalls = new Set(data.hWalls || []);
      vWalls = new Set(data.vWalls || []);
      currentTurn = (typeof data.currentTurn === 'number') ? data.currentTurn : currentTurn;
      gameOver = !!data.gameOver;
      _renderBoard();
      _updateUI();
    } else if (data.type === 'quoridor_rematch') {
      _doRematch();
    }
  }

  function sendSnapshotTo(targetPeerId) {
    if (typeof P2P !== 'undefined' && P2P.isHost && P2P.isHost()) {
      P2P.send({
        type: 'quoridor_snapshot',
        pawns: pawns,
        wallsLeft: wallsLeft,
        hWalls: Array.from(hWalls),
        vWalls: Array.from(vWalls),
        currentTurn: currentTurn,
        gameOver: gameOver
      }, targetPeerId);
    }
  }

  function rematch() {
    P2P.send({ type: 'quoridor_rematch' });
    _doRematch();
  }

  function _doRematch() {
    const container = _container || document.getElementById('game-content');
    if (container) init(container, _onResult, _context);
  }

  function destroy() {
    P2P.offMessage(_onMessage);
    gameOver = true;
  }

  return {
    init,
    destroy,
    rematch,
    sendSnapshotTo
  };
})();
