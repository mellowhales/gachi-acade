/**
 * chess.js - chess.js 라이브러리 기반 2인 실시간 P2P 정통 클래식 체스 모듈
 * (고화질 벡터 SVG 체스 기물, 8분 각자 체스 시계 타이머, 가로 잘림 원천 차단)
 */
const ChessGame = (() => {
  'use strict';

  let _container = null;
  let _onResult = null;
  let _context = null;

  let chess = null;
  let myColor = 'w'; // 'w' (백) or 'b' (흑)
  let selectedSquare = null;
  let validMoves = [];
  let lastMove = null; // { from: 'e2', to: 'e4' }
  let gameOver = false;

  let pendingPromotion = null; // { from, to }

  // ⏱️ 각자 8분 (480초) 체스 시계
  const TOTAL_PLAYER_TIME = 480; // 8분
  let whiteTime = TOTAL_PLAYER_TIME;
  let blackTime = TOTAL_PLAYER_TIME;
  let timerInterval = null;
  let lastTickTime = 0;

  // 🌟 고화질 정밀 벡터 체스 기물 SVG 세트
  const PIECE_SVGS = {
    'w': {
      'k': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z" fill="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>`,
      'q': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm17 0a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25L7 14l2 12z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none"/><path d="M11 29a35 35 1 0 1 23 0M12.5 31.5h20M11.5 34.5a35 35 1 0 0 22 0M10.5 37.5a35 35 1 0 0 24 0" fill="none"/></g></svg>`,
      'r': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2.5-4.5l1.5-13.5h13l1.5 13.5h-16zM11 14h23l-2-6H13l-2 6z" stroke-linecap="butt"/><path d="M12 18h21M14 29.5h17M14 14v-4m4.5 4v-4m4.5 4v-4m4.5 4v-4m4.5 4v-4" fill="none"/></g></svg>`,
      'b': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter"/></g></svg>`,
      'n': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.5-10.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#000"/></g></svg>`,
      'p': `<svg viewBox="0 0 45 45" class="svg-piece"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    'b': {
      'k': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#1a1a1a" stroke-linecap="butt"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z" fill="#1a1a1a"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#fff"/></g></svg>`,
      'q': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="#1a1a1a" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm17 0a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25L7 14l2 12z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke="#fff"/><path d="M11 29a35 35 1 0 1 23 0M12.5 31.5h20M11.5 34.5a35 35 1 0 0 22 0M10.5 37.5a35 35 1 0 0 24 0" fill="none" stroke="#fff"/></g></svg>`,
      'r': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="#1a1a1a" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2.5-4.5l1.5-13.5h13l1.5 13.5h-16zM11 14h23l-2-6H13l-2 6z" stroke-linecap="butt"/><path d="M12 18h21M14 29.5h17M14 14v-4m4.5 4v-4m4.5 4v-4m4.5 4v-4m4.5 4v-4" fill="none" stroke="#fff"/></g></svg>`,
      'b': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#1a1a1a" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#fff" stroke-linejoin="miter"/></g></svg>`,
      'n': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#1a1a1a"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#1a1a1a"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.5-10.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#fff"/></g></svg>`,
      'p': `<svg viewBox="0 0 45 45" class="svg-piece"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#1a1a1a" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`
    }
  };

  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

  function init(container, onResult, context) {
    _container = container;
    _onResult = onResult;
    _context = context;

    const ChessConstructor = (typeof Chess === 'function') ? Chess : window.Chess;
    if (!ChessConstructor) {
      container.innerHTML = '<div style="padding:20px;color:red;text-align:center;">체스 엔진(chess.js)을 불러오지 못했습니다.</div>';
      return;
    }

    chess = new ChessConstructor();
    selectedSquare = null;
    validMoves = [];
    lastMove = null;
    gameOver = false;
    pendingPromotion = null;

    whiteTime = TOTAL_PLAYER_TIME;
    blackTime = TOTAL_PLAYER_TIME;

    // 🎯 0번 플레이어가 백('w', 선공), 1번 플레이어가 흑('b', 후공)
    const players = _context.players || [];
    const myId = _context.myId || '';
    if (players.length >= 2 && String(players[1].id) === String(myId)) {
      myColor = 'b'; // 1번 플레이어는 흑
    } else {
      myColor = 'w'; // 0번 플레이어는 백
    }

    _renderGameLayout();
    _updateUI();
    _startTimer();

    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);
  }

  function _renderGameLayout() {
    const oppColor = (myColor === 'w') ? 'b' : 'w';
    const oppName = (_context.players && _context.players.length >= 2)
      ? (_context.players.find(p => p.id !== _context.myId)?.name || '상대방')
      : '상대방';
    const myName = _context.myNickname || '나';

    _container.innerHTML = `
      <div class="chess-wrap">
        <!-- 상단 헤더: 턴 인디케이터 & 상태 -->
        <div class="chess-header-area">
          <div class="turn-indicator">
            <span class="turn-label" id="chess-turn-label">
              <i class="fa-solid fa-chess"></i>
              <span id="chess-turn-text">턴 계산 중...</span>
            </span>
          </div>
          <div class="chess-status-badge hidden" id="chess-status-badge">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span id="chess-status-text">체크!</span>
          </div>
        </div>

        <!-- ⏱️ 상단 상대방 체스 시계 -->
        <div class="chess-clock-bar opp-clock" id="chess-opp-clock-bar">
          <div class="clock-user">
            <span class="clock-color-dot ${oppColor === 'w' ? 'white-dot' : 'black-dot'}"></span>
            <span class="clock-name">${_escapeHtml(oppName)}</span>
          </div>
          <div class="clock-digital" id="chess-opp-clock-time">08:00</div>
        </div>

        <!-- 체스판 메인 카드 -->
        <div class="chess-card card">
          <div class="chess-board-container">
            <div class="chess-board" id="chess-board"></div>
          </div>
        </div>

        <!-- ⏱️ 하단 내 체스 시계 -->
        <div class="chess-clock-bar my-clock" id="chess-my-clock-bar">
          <div class="clock-user">
            <span class="clock-color-dot ${myColor === 'w' ? 'white-dot' : 'black-dot'}"></span>
            <span class="clock-name">${_escapeHtml(myName)}</span>
          </div>
          <div class="clock-digital" id="chess-my-clock-time">08:00</div>
        </div>

        <!-- 프로모션 승급 모달 -->
        <div class="chess-promotion-overlay hidden" id="chess-promotion-modal">
          <div class="chess-promotion-box card">
            <h4>승급할 기물 선택</h4>
            <div class="promotion-choices">
              <button type="button" class="btn-promo" data-piece="q">
                <span class="promo-icon" id="promo-q"></span>
                <span class="promo-name">퀸</span>
              </button>
              <button type="button" class="btn-promo" data-piece="r">
                <span class="promo-icon" id="promo-r"></span>
                <span class="promo-name">룩</span>
              </button>
              <button type="button" class="btn-promo" data-piece="b">
                <span class="promo-icon" id="promo-b"></span>
                <span class="promo-name">비숍</span>
              </button>
              <button type="button" class="btn-promo" data-piece="n">
                <span class="promo-icon" id="promo-n"></span>
                <span class="promo-name">나이트</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    _container.querySelectorAll('.btn-promo').forEach(btn => {
      btn.addEventListener('click', () => {
        const piece = btn.dataset.piece;
        _selectPromotion(piece);
      });
    });

    _renderBoard();
  }

  function _renderBoard() {
    const boardEl = document.getElementById('chess-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    const ranks = (myColor === 'w') ? [...RANKS].reverse() : [...RANKS];
    const files = (myColor === 'w') ? [...FILES] : [...FILES].reverse();

    const isCheck = chess.in_check();
    const turn = chess.turn();

    ranks.forEach(rank => {
      files.forEach(file => {
        const square = file + rank;
        const piece = chess.get(square);

        const fileIdx = FILES.indexOf(file);
        const rankIdx = RANKS.indexOf(rank);
        const isDark = (fileIdx + rankIdx) % 2 === 0;

        const sqEl = document.createElement('div');
        sqEl.className = 'chess-square ' + (isDark ? 'dark' : 'light');
        sqEl.dataset.square = square;

        if (lastMove && (lastMove.from === square || lastMove.to === square)) {
          sqEl.classList.add('last-move');
        }

        if (selectedSquare === square) {
          sqEl.classList.add('selected');
        }

        if (isCheck && piece && piece.type === 'k' && piece.color === turn) {
          sqEl.classList.add('in-check');
        }

        const moveTarget = validMoves.find(m => m.to === square);
        if (moveTarget) {
          const isCapture = !!moveTarget.captured;
          const marker = document.createElement('div');
          marker.className = isCapture ? 'chess-capture-ring' : 'chess-move-dot';
          sqEl.appendChild(marker);
        }

        // 고화질 벡터 SVG 기물 렌더링
        if (piece) {
          const pieceWrap = document.createElement('div');
          pieceWrap.className = 'chess-piece-wrap';
          pieceWrap.innerHTML = PIECE_SVGS[piece.color][piece.type] || '';
          sqEl.appendChild(pieceWrap);
        }

        // 좌표 라벨 (가장자리)
        if (file === files[0]) {
          const rankLabel = document.createElement('span');
          rankLabel.className = 'chess-coord-rank';
          rankLabel.textContent = rank;
          sqEl.appendChild(rankLabel);
        }
        if (rank === ranks[ranks.length - 1]) {
          const fileLabel = document.createElement('span');
          fileLabel.className = 'chess-coord-file';
          fileLabel.textContent = file;
          sqEl.appendChild(fileLabel);
        }

        sqEl.addEventListener('click', () => _handleSquareClick(square));
        boardEl.appendChild(sqEl);
      });
    });
  }

  function _handleSquareClick(square) {
    if (gameOver) return;

    const isDev = !!(_context && _context.isDevMode);
    const isMyTurn = isDev || (chess.turn() === myColor);
    if (!isMyTurn) return;

    const piece = chess.get(square);

    // 1. 이미 선택된 기물이 있고 목적지 칸을 클릭한 경우
    if (selectedSquare) {
      const targetMove = validMoves.find(m => m.to === square);
      if (targetMove) {
        if (targetMove.flags.includes('p')) {
          pendingPromotion = { from: selectedSquare, to: square };
          _showPromotionModal();
          return;
        }

        _makeMove(selectedSquare, square);
        return;
      }
    }

    // 2. 내 기물을 새로 선택한 경우 (개발자 모드 시 현재 턴 기물 선택 가능)
    if (piece && (isDev ? piece.color === chess.turn() : piece.color === myColor)) {
      selectedSquare = square;
      validMoves = chess.moves({ square: square, verbose: true });
      _renderBoard();
      return;
    }

    // 3. 취소
    selectedSquare = null;
    validMoves = [];
    _renderBoard();
  }

  function _makeMove(from, to, promotion = 'q') {
    const move = chess.move({ from, to, promotion });
    if (!move) return;

    lastMove = { from, to };
    selectedSquare = null;
    validMoves = [];

    if (typeof Sound !== 'undefined') {
      if (move.captured) Sound.playApplePop();
      else Sound.playStone();
    }

    // P2P 패킷 브로드캐스트 (남은 체스 시계 시간 포함)
    P2P.send({
      type: 'chess_move',
      from: from,
      to: to,
      promotion: promotion,
      whiteTime: whiteTime,
      blackTime: blackTime
    });

    _renderBoard();
    _updateUI();
    _checkGameStatus();
  }

  function _showPromotionModal() {
    const modal = document.getElementById('chess-promotion-modal');
    if (!modal) return;

    ['q', 'r', 'b', 'n'].forEach(p => {
      const el = document.getElementById(`promo-${p}`);
      if (el) el.innerHTML = PIECE_SVGS[myColor][p];
    });

    modal.classList.remove('hidden');
  }

  function _selectPromotion(piece) {
    const modal = document.getElementById('chess-promotion-modal');
    if (modal) modal.classList.add('hidden');

    if (pendingPromotion) {
      const { from, to } = pendingPromotion;
      pendingPromotion = null;
      _makeMove(from, to, piece);
    }
  }

  /* ── ⏱️ 체스 시계 타이머 (자기 턴에만 시간 감소) ── */
  function _startTimer() {
    _stopTimer();
    lastTickTime = Date.now();

    timerInterval = setInterval(() => {
      if (gameOver) {
        _stopTimer();
        return;
      }

      const now = Date.now();
      const dt = (now - lastTickTime) / 1000;
      lastTickTime = now;

      const currentTurn = chess.turn(); // 'w' or 'b'
      if (currentTurn === 'w') {
        whiteTime = Math.max(0, whiteTime - dt);
        if (whiteTime <= 0) {
          _handleTimeout('w');
          return;
        }
      } else {
        blackTime = Math.max(0, blackTime - dt);
        if (blackTime <= 0) {
          _handleTimeout('b');
          return;
        }
      }

      _updateClocksUI();
    }, 100);
  }

  function _stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function _formatTime(sec) {
    const totalSec = Math.ceil(sec);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function _updateClocksUI() {
    const myClockTimeEl = document.getElementById('chess-my-clock-time');
    const oppClockTimeEl = document.getElementById('chess-opp-clock-time');
    const myClockBar = document.getElementById('chess-my-clock-bar');
    const oppClockBar = document.getElementById('chess-opp-clock-bar');

    const mySec = (myColor === 'w') ? whiteTime : blackTime;
    const oppSec = (myColor === 'w') ? blackTime : whiteTime;

    if (myClockTimeEl) myClockTimeEl.textContent = _formatTime(mySec);
    if (oppClockTimeEl) oppClockTimeEl.textContent = _formatTime(oppSec);

    const isMyTurn = (chess.turn() === myColor);

    if (myClockBar) {
      myClockBar.classList.toggle('is-running', isMyTurn);
      myClockBar.classList.toggle('is-critical', mySec <= 30);
    }
    if (oppClockBar) {
      oppClockBar.classList.toggle('is-running', !isMyTurn);
      oppClockBar.classList.toggle('is-critical', oppSec <= 30);
    }
  }

  function _handleTimeout(loserColor) {
    if (gameOver) return;
    gameOver = true;
    _stopTimer();

    const iWon = (loserColor !== myColor);
    const reason = iWon ? '상대방의 시간 초과로 승리!' : '시간 초과로 패배하셨습니다!';

    if (typeof Sound !== 'undefined') {
      if (iWon) Sound.playWin();
      else Sound.playLose();
    }

    setTimeout(() => {
      _onResult && _onResult(iWon, null);
    }, 1000);
  }

  function _updateUI() {
    const label = document.getElementById('chess-turn-label');
    const text = document.getElementById('chess-turn-text');
    const statusBadge = document.getElementById('chess-status-badge');
    const statusText = document.getElementById('chess-status-text');

    const turn = chess.turn(); // 'w' or 'b'
    const isMyTurn = (turn === myColor);
    const colorName = (turn === 'w') ? '백(White)' : '흑(Black)';

    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      window.App.updateInGameTurn(turn);
    }

    if (label) {
      label.className = 'turn-label ' + (isMyTurn ? 'my-turn' : 'opp-turn');
    }
    if (text) {
      const icon = (turn === 'w')
        ? '<i class="fa-regular fa-circle" style="color:var(--t1);"></i>'
        : '<i class="fa-solid fa-circle" style="color:#1a1a1a;"></i>';
      text.innerHTML = `${icon} <span>${isMyTurn ? '내 차례 ('+colorName+')' : '상대방 차례 ('+colorName+')'}</span>`;
    }

    if (chess.in_check() && !chess.in_checkmate()) {
      if (statusBadge) statusBadge.classList.remove('hidden');
      if (statusText) statusText.textContent = isMyTurn ? '내 킹이 체크당했습니다!' : '상대방 킹 체크!';
    } else {
      if (statusBadge) statusBadge.classList.add('hidden');
    }

    _updateClocksUI();
  }

  function _checkGameStatus() {
    if (gameOver) return;

    if (chess.in_checkmate()) {
      gameOver = true;
      _stopTimer();
      const loserColor = chess.turn();
      const iWon = (loserColor !== myColor);

      if (typeof Sound !== 'undefined') {
        if (iWon) Sound.playWin();
        else Sound.playLose();
      }

      setTimeout(() => {
        _onResult && _onResult(iWon, null);
      }, 1000);
      return;
    }

    if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition() || chess.insufficient_material()) {
      gameOver = true;
      _stopTimer();
      let reason = '무승부입니다.';
      if (chess.in_stalemate()) reason = '스테일메이트(무승부)입니다.';
      else if (chess.in_threefold_repetition()) reason = '3회 동형 반복으로 무승부입니다.';
      else if (chess.insufficient_material()) reason = '기물 부족으로 무승부입니다.';

      setTimeout(() => {
        _onResult && _onResult(false, { isDraw: true, reason });
      }, 1000);
    }
  }

  function _onMessage(data) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'CHESS_SYNC_STATE') {
      if (data.fen && typeof game !== 'undefined' && game) {
        game.load(data.fen);
        selectedSquare = null;
        possibleMoves = [];
        _renderBoard();
        _updateTurnIndicator();
      }
    } else if (data.type === 'chess_move') {
      if (typeof data.whiteTime === 'number') whiteTime = data.whiteTime;
      if (typeof data.blackTime === 'number') blackTime = data.blackTime;

      const move = chess.move({
        from: data.from,
        to: data.to,
        promotion: data.promotion || 'q'
      });

      if (move) {
        lastMove = { from: data.from, to: data.to };
        selectedSquare = null;
        validMoves = [];

        if (typeof Sound !== 'undefined') {
          if (move.captured) Sound.playApplePop();
          else Sound.playStone();
        }

        _renderBoard();
        _updateUI();
        _checkGameStatus();
      }
    } else if (data.type === 'chess_snapshot') {
      if (data.fen && typeof chess !== 'undefined') {
        chess.load(data.fen);
      }
      whiteTime = (typeof data.whiteTime === 'number') ? data.whiteTime : whiteTime;
      blackTime = (typeof data.blackTime === 'number') ? data.blackTime : blackTime;
      lastMove = data.lastMove || null;
      gameOver = !!data.gameOver;
      _renderBoard();
      _updateUI();
      if (!gameOver) _startTimer();
    } else if (data.type === 'chess_rematch') {
      _doRematch();
    }
  }

  function sendSnapshotTo(targetPeerId) {
    if (typeof P2P !== 'undefined' && P2P.isHost && P2P.isHost()) {
      P2P.send({
        type: 'chess_snapshot',
        fen: chess.fen(),
        whiteTime: whiteTime,
        blackTime: blackTime,
        lastMove: lastMove,
        gameOver: gameOver
      }, targetPeerId);
    }
  }

  function rematch() {
    P2P.send({ type: 'chess_rematch' });
    _doRematch();
  }

  function _doRematch() {
    if (_container) init(_container, _onResult, _context);
  }

  function destroy() {
    _stopTimer();
    P2P.offMessage(_onMessage);
    gameOver = true;
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return {
    init,
    destroy,
    rematch,
    sendSnapshotTo
  };
})();
