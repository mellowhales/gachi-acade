/**
 * gomoku.js - 오목 (반응형 유동적 바둑판 & 간결한 흑/백 표기 & 셔플 지원)
 * P2P: { type:'gomoku_move', row, col } | { type:'gomoku_rematch' }
 */
const GomokuGame = (() => {
  const BOARD_SIZE = 15;
  const CELL = 56;
  const STONE_R = 24;
  const PADDING = 34;
  const CANVAS_SIZE = PADDING * 2 + CELL * (BOARD_SIZE - 1); // 852px

  let canvas, ctx;
  let board = [];          // 0=빈칸, 1=흑, 2=백
  let myColor = 1;         // 1=흑, 2=백
  let currentTurn = 1;     // 현재 턴 (1 또는 2)
  let gameOver = false;
  let resizeObserver = null;
  let _onResult = null;
  let _context = null;

  function init(container, onResult, context) {
    _onResult = onResult;
    _context = context || {};

    const players = _context.players || [];
    const myId = _context.myId || '';
    const isPlayer0Me = (players.length > 0 && String(players[0].id) === String(myId));

    // 🎯 0번 플레이어가 무조건 흑(1, 선공), 1번 플레이어가 백(2, 후공)
    const amISpectator = !!(_context && _context.isSpectator) || (!isPlayer0Me && !(players.length > 1 && String(players[1].id) === String(myId)));
    myColor = amISpectator ? 0 : (isPlayer0Me ? 1 : 2);
    currentTurn = 1; // 1 = 흑 선공
    gameOver = false;
    board = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(0));

    const p0Name = players[0] ? players[0].name : '플레이어1';
    const p1Name = players[1] ? players[1].name : '플레이어2';

    container.innerHTML = `
      <div class="gomoku-wrap">
        <div class="turn-indicator" id="gm-turn-indicator">
          <span class="turn-label" id="gm-turn-label">
            <i class="fa-solid fa-circle" style="color:#1a1a1a"></i>
            <span id="gm-turn-text">흑의 차례 ${myColor === 0 ? '' : (myColor === 1 ? '(내 턴)' : '(상대 턴)')}</span>
          </span>
        </div>
        <div class="gomoku-canvas-wrap" id="gm-canvas-wrap">
          <canvas id="gomoku-canvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
        </div>
        <div class="gomoku-info-card">
          <span><b>[흑 선공]</b> ${p0Name}</span>
          <span>VS</span>
          <span><b>[백 후공]</b> ${p1Name}</span>
        </div>
      </div>
    `;

    canvas = container.querySelector('#gomoku-canvas');
    ctx = canvas.getContext('2d');

    _setupCanvasSize();
    window.addEventListener('resize', _setupCanvasSize);

    const wrap = document.getElementById('gm-canvas-wrap');
    if (wrap && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        _setupCanvasSize();
      });
      resizeObserver.observe(wrap);
    }

    canvas.addEventListener('click', _handleClick);
    canvas.addEventListener('touchend', _handleTouch, { passive: false });

    _updateTurnIndicator();
    _draw();

    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);
  }

  function _setupCanvasSize() {
    if (!canvas) return;
    const wrap = document.getElementById('gm-canvas-wrap');
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height) || rect.width || 600);

    if (size > 0) {
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
    }
    _draw();
  }

  function _draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    bgGrad.addColorStop(0, '#eec98d');
    bgGrad.addColorStop(0.5, '#e2ba7c');
    bgGrad.addColorStop(1, '#d5ab6b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = '#6b4618';
    ctx.lineWidth = 3;
    ctx.strokeRect(PADDING - 2, PADDING - 2, (BOARD_SIZE - 1) * CELL + 4, (BOARD_SIZE - 1) * CELL + 4);

    ctx.strokeStyle = '#7c5321';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const x = PADDING + i * CELL;
      const y = PADDING + i * CELL;
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, PADDING + (BOARD_SIZE - 1) * CELL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL, y);
      ctx.stroke();
    }

    const starPoints = [3, 7, 11];
    ctx.fillStyle = '#6b4618';
    for (const r of starPoints) {
      for (const c of starPoints) {
        const px = PADDING + c * CELL;
        const py = PADDING + r * CELL;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] !== 0) {
          _drawStone(r, c, board[r][c]);
        }
      }
    }
  }

  function _drawStone(row, col, color) {
    const cx = PADDING + col * CELL;
    const cy = PADDING + row * CELL;
    const isBlack = color === 1;

    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3.5;
    ctx.shadowOffsetY = 3.5;

    const grad = ctx.createRadialGradient(cx - 7, cy - 7, 2, cx, cy, STONE_R);
    if (isBlack) {
      grad.addColorStop(0, '#777777');
      grad.addColorStop(0.65, '#222222');
      grad.addColorStop(1, '#050505');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.8, '#ededed');
      grad.addColorStop(1, '#cccccc');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, STONE_R, 0, Math.PI * 2);
    ctx.fill();

    if (!isBlack) {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  function _getBoardPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const col = Math.round((x - PADDING) / CELL);
    const row = Math.round((y - PADDING) / CELL);
    return { row, col };
  }

  function _handleClick(e) {
    if (gameOver) return;
    const isDev = !!(_context && _context.isDevMode);
    if (!isDev && currentTurn !== myColor) return;
    const { row, col } = _getBoardPos(e.clientX, e.clientY);
    _tryPlace(row, col);
  }

  function _handleTouch(e) {
    e.preventDefault();
    if (gameOver) return;
    const isDev = !!(_context && _context.isDevMode);
    if (!isDev && currentTurn !== myColor) return;
    const touch = e.changedTouches[0];
    const { row, col } = _getBoardPos(touch.clientX, touch.clientY);
    _tryPlace(row, col);
  }

  function _tryPlace(row, col) {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
    if (board[row][col] !== 0) return;

    const isDev = !!(_context && _context.isDevMode);
    const colorToPlace = isDev ? currentTurn : myColor;
    _placeStone(row, col, colorToPlace);
    P2P.send({ type: 'gomoku_move', row, col });
  }

  function _placeStone(row, col, color) {
    board[row][col] = color;
    _draw();
    if (typeof Sound !== 'undefined') Sound.playStone();

    const won = _checkWin(row, col, color);
    if (won) {
      gameOver = true;
      const iWon = color === myColor;
      setTimeout(() => {
        _onResult && _onResult(iWon);
      }, 400);
      return;
    }

    currentTurn = currentTurn === 1 ? 2 : 1;
    _updateTurnIndicator();
  }

  function _checkWin(row, col, color) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let step = 1; step < 5; step++) {
        const r = row + dr * step, c = col + dc * step;
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE || board[r][c] !== color) break;
        count++;
      }
      for (let step = 1; step < 5; step++) {
        const r = row - dr * step, c = col - dc * step;
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE || board[r][c] !== color) break;
        count++;
      }
      if (count >= 5) return true;
    }
    return false;
  }

  function _updateTurnIndicator() {
    const label = document.getElementById('gm-turn-label');
    if (!label) return;

    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      window.App.updateInGameTurn(currentTurn === 1 ? 'black' : 'white');
    }

    const isMyTurn = currentTurn === myColor;
    label.className = 'turn-label ' + (isMyTurn ? 'my-turn' : 'opp-turn');
    const colorName = currentTurn === 1 ? '흑' : '백';
    const icon = currentTurn === 1
      ? '<i class="fa-solid fa-circle" style="color:#1a1a1a"></i>'
      : '<i class="fa-regular fa-circle" style="color:#718096"></i>';
    label.innerHTML = `${icon} <span>${isMyTurn ? '내 차례 ('+colorName+')' : '상대방 차례 ('+colorName+')'}</span>`;
  }

  function _onMessage(data) {
    if (data.type === 'GOMOKU_SYNC_STATE') {
      if (Array.isArray(data.board)) board = data.board;
      if (typeof data.currentTurn === 'number') currentTurn = data.currentTurn;
      if (typeof data.gameOver === 'boolean') gameOver = data.gameOver;
    } else if (data.type === 'gomoku_snapshot') {
      board = data.board || board;
      currentTurn = (typeof data.currentTurn === 'number') ? data.currentTurn : currentTurn;
      gameOver = !!data.gameOver;
      _updateTurnIndicator();
      _draw();
    } else if (data.type === 'gomoku_move') {
      if (gameOver) return;
      _placeStone(data.row, data.col, currentTurn);
    } else if (data.type === 'gomoku_rematch') {
      _doRematch();
    }
  }

  function sendSnapshotTo(targetPeerId) {
    if (typeof P2P !== 'undefined' && P2P.isHost && P2P.isHost()) {
      P2P.send({
        type: 'gomoku_snapshot',
        board: board,
        currentTurn: currentTurn,
        gameOver: gameOver
      }, targetPeerId);
    }
  }

  function rematch() {
    P2P.send({ type: 'gomoku_rematch' });
    _doRematch();
  }

  function _doRematch() {
    const container = document.getElementById('game-content');
    if (container) init(container, _onResult, _context);
  }

  function destroy() {
    window.removeEventListener('resize', _setupCanvasSize);
    if (resizeObserver) {
      try { resizeObserver.disconnect(); } catch (_) {}
      resizeObserver = null;
    }
    if (canvas) {
      canvas.removeEventListener('click', _handleClick);
      canvas.removeEventListener('touchend', _handleTouch);
    }
    P2P.offMessage(_onMessage);
    canvas = null;
    ctx = null;
  }

  return { init, rematch, destroy, sendSnapshotTo };
})();
