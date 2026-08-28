/**
 * janggi.js - 2인 실시간 WebRTC P2P 정통 한국 장기 (Korean Chess / Janggi)
 * 1. 실제 정통 장기 기물 실물 이미지 적용 (assets/janggi/*.png)
 * 2. 왕 포획(외통) 승패 시스템 완벽 동기화 (왕이 잡히면 잡은 사람은 승리, 잡힌 사람은 패배 화면 즉시 표시)
 * 3. 기권 승패 완벽 처리
 * 4. 담백한 '장군' 배지 및 상단 우측 '기권' 버튼
 * 5. 마상상마 (안상차림) 표준 기본 단일 룰 즉시 대국 시작
 */
const JanggiGame = (() => {
  'use strict';

  let _container = null;
  let _onResult = null;
  let _context = null;

  // 진영: 'cho' (초, 楚, 청색, 선공), 'han' (한, 漢, 적색, 후공)
  let mySide = 'cho';
  let currentTurn = 'cho';
  let isHost = false;
  let myId = '';
  let players = [];
  let isGameOver = false;

  // 10행 9열 보드 (board[r][c], r: 0~9, c: 0~8)
  let board = Array(10).fill(null).map(() => Array(9).fill(null));

  // 선택된 기물 및 이동 가능 경로
  let selectedPos = null; // { r, c }
  let legalMoves = [];    // [{ r, c, isCapture }]
  let lastMove = null;    // { from: { r, c }, to: { r, c } }
  let isCheck = false;    // 장군 여부

  // 기물 크기 등급 정의 (대: king / 중: cha, po, ma, sang / 소: sa, zol)
  const PIECE_SIZE_CLASS = {
    king: 'piece-size-large',
    cha:  'piece-size-medium',
    po:   'piece-size-medium',
    ma:   'piece-size-medium',
    sang: 'piece-size-medium',
    sa:   'piece-size-small',
    zol:  'piece-size-small'
  };

  /* ═══════════════════════════════════════════════════════════════
     초기화 및 레이아웃 빌드
     ═══════════════════════════════════════════════════════════════ */
  function init(container, onResult, context) {
    _container = container;
    _onResult = onResult;
    _context = context || {};

    isHost = P2P.isHost();
    myId = String(P2P.getMyId() || '');
    players = (_context.players && _context.players.length > 0)
      ? _context.players
      : [{ id: myId, name: _context.myNickname || '플레이어', isHost: true }];

    // 0번 플레이어가 초('cho', 청색/선공), 1번 플레이어가 한('han', 홍색/후공)
    if (players.length >= 2 && String(players[1].id) === String(myId)) {
      mySide = 'han';
    } else {
      mySide = 'cho';
    }

    isGameOver = false;
    currentTurn = 'cho';

    selectedPos = null;
    legalMoves = [];
    lastMove = null;
    isCheck = false;

    // 표준 마상상마(안상차림) 초기 배치 생성
    _buildStandardBoard();
    _renderLayout();

    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);

    if (typeof Sound !== 'undefined' && Sound.playStart) Sound.playStart();
  }

  // 🌟 전국 표준 기본 룰: 마상상마 (안상차림)
  function _buildStandardBoard() {
    board = Array(10).fill(null).map(() => Array(9).fill(null));

    // 1. 한(漢) 진영 배치 (상단 rows 0~3) : 좌측 [마, 상], 우측 [상, 마]
    board[0][0] = { side: 'han', type: 'cha' };
    board[0][1] = { side: 'han', type: 'ma' };
    board[0][2] = { side: 'han', type: 'sang' };
    board[0][3] = { side: 'han', type: 'sa' };
    board[0][5] = { side: 'han', type: 'sa' };
    board[0][6] = { side: 'han', type: 'sang' };
    board[0][7] = { side: 'han', type: 'ma' };
    board[0][8] = { side: 'han', type: 'cha' };
    board[1][4] = { side: 'han', type: 'king' };
    board[2][1] = { side: 'han', type: 'po' };
    board[2][7] = { side: 'han', type: 'po' };
    for (let c = 0; c < 9; c += 2) {
      board[3][c] = { side: 'han', type: 'zol' };
    }

    // 2. 초(楚) 진영 배치 (하단 rows 6~9) : 좌측 [마, 상], 우측 [상, 마]
    board[9][0] = { side: 'cho', type: 'cha' };
    board[9][1] = { side: 'cho', type: 'ma' };
    board[9][2] = { side: 'cho', type: 'sang' };
    board[9][3] = { side: 'cho', type: 'sa' };
    board[9][5] = { side: 'cho', type: 'sa' };
    board[9][6] = { side: 'cho', type: 'sang' };
    board[9][7] = { side: 'cho', type: 'ma' };
    board[9][8] = { side: 'cho', type: 'cha' };
    board[8][4] = { side: 'cho', type: 'king' };
    board[7][1] = { side: 'cho', type: 'po' };
    board[7][7] = { side: 'cho', type: 'po' };
    for (let c = 0; c < 9; c += 2) {
      board[6][c] = { side: 'cho', type: 'zol' };
    }
  }

  function _renderLayout() {
    const oppName = (players.length >= 2)
      ? (players.find(p => String(p.id) !== String(myId))?.name || '상대방')
      : '상대방';

    // 화점(성점) 위치 좌표 목록: 졸/병(rows 3, 6, cols 0,2,4,6,8) 및 포(rows 2, 7, cols 1,7)
    const starPoints = [
      { r: 2, c: 1 }, { r: 2, c: 7 },
      { r: 3, c: 0 }, { r: 3, c: 2 }, { r: 3, c: 4 }, { r: 3, c: 6 }, { r: 3, c: 8 },
      { r: 6, c: 0 }, { r: 6, c: 2 }, { r: 6, c: 4 }, { r: 6, c: 6 }, { r: 6, c: 8 },
      { r: 7, c: 1 }, { r: 7, c: 7 }
    ];

    _container.innerHTML = `
      <div class="janggi-wrap">
        
        <!-- 상단 헤더: 턴 알림 + 담백한 '장군' 알림 + 우측 기권 버튼 -->
        <div class="janggi-header-area">
          <div class="turn-indicator">
            <span class="turn-label ${currentTurn === 'cho' ? 'cho-turn' : 'han-turn'}" id="jg-turn-label">
              <i class="fa-solid fa-chess-board"></i>
              <span id="jg-turn-text">${currentTurn === mySide ? '내 턴' : `${oppName} 턴`}</span>
            </span>
          </div>

          <div class="janggi-header-actions">
            <!-- 🌟 담백한 '장군' 배지 -->
            <div class="janggi-status-badge hidden" id="jg-status-badge">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span id="jg-status-text">장군</span>
            </div>
            <button type="button" class="btn-jg-header-resign" id="btn-jg-resign" title="대국 기권">
              <i class="fa-solid fa-flag"></i>
              <span>기권</span>
            </button>
          </div>
        </div>

        <!-- 🌟 원목 대국판 (가로 420 : 세로 470) -->
        <div class="janggi-card">
          <div class="janggi-board-container" id="jg-board-container">
            <div class="janggi-wood-board" id="jg-board">
              <!-- SVG 정밀 격자선 + 궁성 사선 + 정통 화점(성점) 레이어 -->
              <svg class="janggi-grid-svg" viewBox="0 0 420 470" preserveAspectRatio="none">
                <!-- 외곽 테두리선 (굵은 흑색선 2.5px) -->
                <rect x="25" y="25" width="370" height="420" class="jg-border-line" />

                <!-- 내부 가로선 10개 (y=25 ~ 445, 간격 46.67) -->
                ${Array(10).fill(0).map((_, r) => `
                  <line x1="25" y1="${25 + r * 46.67}" x2="395" y2="${25 + r * 46.67}" class="jg-inner-line" />
                `).join('')}

                <!-- 내부 세로선 9개 (x=25 ~ 395, 간격 46.25) -->
                ${Array(9).fill(0).map((_, c) => `
                  <line x1="${25 + c * 46.25}" y1="25" x2="${25 + c * 46.25}" y2="445" class="jg-inner-line" />
                `).join('')}

                <!-- 상단 한(漢) 궁성 X자 대각선 (3,0)-(5,2) & (5,0)-(3,2) -->
                <line x1="${25 + 3 * 46.25}" y1="25" x2="${25 + 5 * 46.25}" y2="${25 + 2 * 46.67}" class="jg-palace-line" />
                <line x1="${25 + 5 * 46.25}" y1="25" x2="${25 + 3 * 46.25}" y2="${25 + 2 * 46.67}" class="jg-palace-line" />

                <!-- 하단 초(楚) 궁성 X자 대각선 (3,7)-(5,9) & (5,7)-(3,9) -->
                <line x1="${25 + 3 * 46.25}" y1="${25 + 7 * 46.67}" x2="${25 + 5 * 46.25}" y2="445" class="jg-palace-line" />
                <line x1="${25 + 5 * 46.25}" y1="${25 + 7 * 46.67}" x2="${25 + 3 * 46.25}" y2="445" class="jg-palace-line" />

                <!-- 정통 장기판 화점(성점) 마커들 -->
                ${starPoints.map(p => {
                  const sx = 25 + p.c * 46.25;
                  const sy = 25 + p.r * 46.67;
                  return `
                    <g class="jg-star-marker">
                      <line x1="${sx - 4}" y1="${sy}" x2="${sx + 4}" y2="${sy}" stroke="#111111" stroke-width="1.6" />
                      <line x1="${sx}" y1="${sy - 4}" x2="${sx}" y2="${sy + 4}" stroke="#111111" stroke-width="1.6" />
                    </g>
                  `;
                }).join('')}
              </svg>

              <!-- 기물 및 인터랙션 레이어 -->
              <div class="janggi-pieces-layer" id="jg-pieces-layer"></div>
            </div>
          </div>
        </div>

      </div>
    `;

    _bindEvents();
    _renderBoardPieces();
  }

  /* ═══════════════════════════════════════════════════════════════
     이벤트 바인딩
     ═══════════════════════════════════════════════════════════════ */
  function _bindEvents() {
    const resignBtn = document.getElementById('btn-jg-resign');
    if (resignBtn) {
      resignBtn.addEventListener('click', () => {
        if (isGameOver) return;
        if (confirm('정말로 기권하시겠습니까?')) {
          _resign(true);
        }
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     기물 렌더링 (실제 정통 장기 기물 실물 이미지 적용)
     ═══════════════════════════════════════════════════════════════ */
  function _renderBoardPieces() {
    const layer = document.getElementById('jg-pieces-layer');
    if (!layer) return;

    let html = '';

    // 내가 'han'(적색)이면 보드를 180도 뒤집어서 내 기물이 아래쪽에 오도록 렌더링
    const flip = (mySide === 'han');

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const displayR = flip ? (9 - r) : r;
        const displayC = flip ? (8 - c) : c;

        // 실제 판 좌표 % 위치 계산 (외곽 마진 25px / 전체 420x470 viewBox 기준)
        const leftPercent = ((25 + displayC * 46.25) / 420) * 100;
        const topPercent = ((25 + displayR * 46.67) / 470) * 100;

        const piece = board[r][c];
        const isSelected = selectedPos && (selectedPos.r === r && selectedPos.c === c);
        const isLastMoveFrom = lastMove && lastMove.from.r === r && lastMove.from.c === c;
        const isLastMoveTo = lastMove && lastMove.to.r === r && lastMove.to.c === c;

        // 이동 가능 타겟 확인
        const moveTarget = legalMoves.find(m => m.r === r && m.c === c);

        // 1. 기물이 있는 경우: 실제 실물 기물 이미지 렌더링
        if (piece) {
          const sizeClass = PIECE_SIZE_CLASS[piece.type] || 'piece-size-medium';
          const isDev = !!(_context && _context.isDevMode);
          const isMyPiece = isDev ? (piece.side === currentTurn) : (piece.side === mySide);
          const canClick = (_isMyTurn() && isMyPiece && !isGameOver);

          // 선택되었을 때 4개의 블루 코너 브래킷 (┌ ┐ └ ┘)
          const selectionBracketsHtml = isSelected ? `
            <div class="jg-select-brackets">
              <span class="bracket-tl"></span>
              <span class="bracket-tr"></span>
              <span class="bracket-bl"></span>
              <span class="bracket-br"></span>
            </div>
          ` : '';

          html += `
            <div class="janggi-piece piece-${piece.side} piece-${piece.type} ${sizeClass} ${isSelected ? 'selected' : ''} ${isLastMoveTo ? 'last-move' : ''} ${canClick ? 'clickable' : ''}"
                 style="left: ${leftPercent}%; top: ${topPercent}%;"
                 data-r="${r}" data-c="${c}">
              <img src="assets/janggi/${piece.side}_${piece.type}.png" 
                   alt="${piece.side}_${piece.type}" 
                   class="jg-piece-img" 
                   draggable="false"
                   onerror="this.onerror=null; this.src='assets/janggi/${piece.side}_${piece.type}.svg';" />
              ${selectionBracketsHtml}
            </div>
          `;
        }

        // 2. 이동 가능 마커 렌더링
        if (moveTarget) {
          html += `
            <div class="janggi-move-dot ${moveTarget.isCapture ? 'is-capture' : ''}"
                 style="left: ${leftPercent}%; top: ${topPercent}%;"
                 data-r="${r}" data-c="${c}">
              <div class="dot-inner"></div>
            </div>
          `;
        }

        // 3. 직전 이동 출발지 표시
        if (isLastMoveFrom && !piece) {
          html += `
            <div class="janggi-last-from-marker" style="left: ${leftPercent}%; top: ${topPercent}%;"></div>
          `;
        }
      }
    }

    layer.innerHTML = html;
    _bindPieceEvents();
  }

  function _bindPieceEvents() {
    const layer = document.getElementById('jg-pieces-layer');
    if (!layer) return;

    // 기물 클릭
    layer.querySelectorAll('.janggi-piece').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!_isMyTurn() || isGameOver) return;

        const r = parseInt(el.dataset.r, 10);
        const c = parseInt(el.dataset.c, 10);
        const piece = board[r][c];

        // 내 기물을 클릭했을 때 선택 (개발자 모드 시 현재 턴 기물 선택)
        const isDev = !!(_context && _context.isDevMode);
        if (piece && (isDev ? piece.side === currentTurn : piece.side === mySide)) {
          if (selectedPos && selectedPos.r === r && selectedPos.c === c) {
            selectedPos = null;
            legalMoves = [];
          } else {
            selectedPos = { r, c };
            legalMoves = _getLegalMoves(r, c);
            if (typeof Sound !== 'undefined' && Sound.playDing) Sound.playDing();
          }
          _renderBoardPieces();
          return;
        }

        // 선택된 상태에서 상대 기물 클릭 (포획)
        if (selectedPos) {
          const move = legalMoves.find(m => m.r === r && m.c === c);
          if (move) {
            _makeMove(selectedPos.r, selectedPos.c, r, c, true);
          }
        }
      });
    });

    // 이동 마커 클릭
    layer.querySelectorAll('.janggi-move-dot').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!selectedPos || !_isMyTurn() || isGameOver) return;

        const r = parseInt(el.dataset.r, 10);
        const c = parseInt(el.dataset.c, 10);
        _makeMove(selectedPos.r, selectedPos.c, r, c, true);
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     이동 실행 & P2P 동기화 & 턴 교체 & 왕 포획 승패 처리
     ═══════════════════════════════════════════════════════════════ */
  function _makeMove(fromR, fromC, toR, toC, isLocal) {
    const piece = board[fromR][fromC];
    const targetPiece = board[toR][toC];
    if (!piece) return;

    const isCapturingKing = (targetPiece && targetPiece.type === 'king');

    // 기물 이동 및 포획
    board[toR][toC] = piece;
    board[fromR][fromC] = null;
    lastMove = { from: { r: fromR, c: fromC }, to: { r: toR, c: toC } };
    selectedPos = null;
    legalMoves = [];

    // 포획 사운드 / 착수 사운드
    if (typeof Sound !== 'undefined') {
      if (targetPiece) {
        if (Sound.playPop) Sound.playPop();
      } else {
        if (Sound.playStart) Sound.playStart();
      }
    }

    // 턴 교체
    currentTurn = (currentTurn === 'cho') ? 'han' : 'cho';

    // 🌟 장군 (Check) 검사
    const oppSide = (piece.side === 'cho') ? 'han' : 'cho';
    isCheck = _isKingUnderAttack(oppSide);

    // 🌟 P2P 동기화 (왕이 잡혔을 때도 반드시 상대방에게 패킷 전송 후 승패 처리!)
    if (isLocal) {
      P2P.send({
        type: 'JANGGI_MOVE',
        from: { r: fromR, c: fromC },
        to: { r: toR, c: toC },
        nextTurn: currentTurn,
        isKingCaptured: isCapturingKing,
        winnerSide: piece.side
      });
    }

    _updateTurnUI();
    _renderBoardPieces();

    // 🌟 왕 포획 시 승패 종료 처리 (양쪽 플레이어 화면 모두에 즉시 게임 결과창 팝업!)
    if (isCapturingKing) {
      const iWon = (piece.side === mySide);
      _finishGame(iWon, iWon ? '상대 궁(王)을 포획하여 승리하셨습니다!' : '궁(王)이 포획되어 패배하셨습니다.');
      return;
    }
  }

  function _resign(isLocal) {
    if (isLocal) {
      P2P.send({
        type: 'JANGGI_RESIGN',
        resignerSide: mySide
      });
      _finishGame(false, '기권하여 패배했습니다.');
    }
  }

  function _finishGame(iWon, reason) {
    if (isGameOver) return;
    isGameOver = true;

    if (typeof Sound !== 'undefined') {
      if (iWon && Sound.playWin) Sound.playWin();
      else if (Sound.playLose) Sound.playLose();
    }

    setTimeout(() => {
      if (_onResult) _onResult(iWon, reason);
    }, 1000);
  }

  function _updateTurnUI() {
    const turnLabel = document.getElementById('jg-turn-label');
    const turnText  = document.getElementById('jg-turn-text');
    const isMine = _isMyTurn();
    const oppName = (players.length >= 2)
      ? (players.find(p => String(p.id) !== String(myId))?.name || '상대방')
      : '상대방';

    if (turnLabel) {
      turnLabel.className = 'turn-label ' + (currentTurn === 'cho' ? 'cho-turn' : 'han-turn') + (isMine ? ' my-turn' : ' opp-turn');
    }
    if (turnText) {
      turnText.textContent = isMine ? '내 턴' : `${oppName} 턴`;
    }

    // 🌟 담백한 '장군' 배지 알림
    const statusBadge = document.getElementById('jg-status-badge');
    const statusText  = document.getElementById('jg-status-text');
    if (statusBadge && statusText) {
      if (isCheck) {
        statusBadge.classList.remove('hidden');
        statusText.textContent = '장군';
        if (typeof Sound !== 'undefined' && Sound.playDing) Sound.playDing();
      } else {
        statusBadge.classList.add('hidden');
      }
    }

    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      const turnIdx = (currentTurn === 'cho') ? 0 : 1;
      window.App.updateInGameTurn(turnIdx);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     장기 기물 이동 규칙 엔진 (정통 한국 장기)
     ═══════════════════════════════════════════════════════════════ */
  function _isInsideBoard(r, c) {
    return r >= 0 && r < 10 && c >= 0 && c < 9;
  }

  function _isInsidePalace(r, c, side) {
    if (c < 3 || c > 5) return false;
    if (side === 'han') return (r >= 0 && r <= 2);
    if (side === 'cho') return (r >= 7 && r <= 9);
    return (r >= 0 && r <= 2) || (r >= 7 && r <= 9);
  }

  function _getLegalMoves(r, c) {
    const piece = board[r][c];
    if (!piece) return [];

    const side = piece.side;
    const oppSide = (side === 'cho') ? 'han' : 'cho';
    const moves = [];

    const addMove = (tr, tc) => {
      if (!_isInsideBoard(tr, tc)) return;
      const target = board[tr][tc];
      if (!target) {
        moves.push({ r: tr, c: tc, isCapture: false });
      } else if (target.side === oppSide) {
        // 포는 포를 잡을 수 없음!
        if (piece.type === 'po' && target.type === 'po') return;
        moves.push({ r: tr, c: tc, isCapture: true });
      }
    };

    switch (piece.type) {
      // ── 1. 차 (車): 가로/세로 직선 광선 + 궁성 대각선 ──
      case 'cha': {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        dirs.forEach(([dr, dc]) => {
          let step = 1;
          while (true) {
            const tr = r + dr * step;
            const tc = c + dc * step;
            if (!_isInsideBoard(tr, tc)) break;
            const target = board[tr][tc];
            if (!target) {
              moves.push({ r: tr, c: tc, isCapture: false });
            } else {
              if (target.side === oppSide) moves.push({ r: tr, c: tc, isCapture: true });
              break;
            }
            step++;
          }
        });

        // 궁성 대각선 이동 (코너에서 중앙 또는 반대 코너로)
        _getPalaceDiagonalLines(r, c).forEach(line => {
          for (let i = 0; i < line.length; i++) {
            const pt = line[i];
            const target = board[pt.r][pt.c];
            if (!target) {
              moves.push({ r: pt.r, c: pt.c, isCapture: false });
            } else {
              if (target.side === oppSide) moves.push({ r: pt.r, c: pt.c, isCapture: true });
              break;
            }
          }
        });
        break;
      }

      // ── 2. 포 (包): 기물 1개를 넘어야 이동 (포는 포를 넘거나 잡을 수 없음) ──
      case 'po': {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        dirs.forEach(([dr, dc]) => {
          let jumped = false;
          let step = 1;
          while (true) {
            const tr = r + dr * step;
            const tc = c + dc * step;
            if (!_isInsideBoard(tr, tc)) break;
            const target = board[tr][tc];

            if (!jumped) {
              if (target) {
                // 포는 포를 다리로 삼을 수 없음
                if (target.type === 'po') break;
                jumped = true;
              }
            } else {
              // 다리를 넘은 후
              if (!target) {
                moves.push({ r: tr, c: tc, isCapture: false });
              } else {
                // 포는 포를 잡을 수 없음
                if (target.side === oppSide && target.type !== 'po') {
                  moves.push({ r: tr, c: tc, isCapture: true });
                }
                break;
              }
            }
            step++;
          }
        });

        // 궁성 대각선 포 점프 (중앙에 포가 아닌 기물이 있을 때 반대 코너로 점프)
        _getPalaceDiagonalLines(r, c).forEach(line => {
          if (line.length >= 2) {
            const center = line[0];
            const corner = line[1];
            const centerPiece = board[center.r][center.c];
            if (centerPiece && centerPiece.type !== 'po') {
              const target = board[corner.r][corner.c];
              if (!target) {
                moves.push({ r: corner.r, c: corner.c, isCapture: false });
              } else if (target.side === oppSide && target.type !== 'po') {
                moves.push({ r: corner.r, c: corner.c, isCapture: true });
              }
            }
          }
        });
        break;
      }

      // ── 3. 마 (馬): 1직진 + 1대각 (첫 직진 멱 검사) ──
      case 'ma': {
        const maSteps = [
          { block: [-1, 0], dests: [[-2, -1], [-2, 1]] },
          { block: [1, 0],  dests: [[2, -1], [2, 1]] },
          { block: [0, -1], dests: [[-1, -2], [1, -2]] },
          { block: [0, 1],  dests: [[-1, 2], [1, 2]] }
        ];
        maSteps.forEach(s => {
          const br = r + s.block[0], bc = c + s.block[1];
          if (_isInsideBoard(br, bc) && !board[br][bc]) {
            // 멱이 안 막혔을 때
            s.dests.forEach(([dr, dc]) => addMove(r + dr, c + dc));
          }
        });
        break;
      }

      // ── 4. 상 (象): 1직진 + 2대각 (1차 직진 멱 & 2차 대각 멱 검사) ──
      case 'sang': {
        const sangSteps = [
          // 위쪽
          { b1: [-1, 0], b2: [-2, -1], dest: [-3, -2] },
          { b1: [-1, 0], b2: [-2, 1],  dest: [-3, 2] },
          // 아래쪽
          { b1: [1, 0],  b2: [2, -1],  dest: [3, -2] },
          { b1: [1, 0],  b2: [2, 1],   dest: [3, 2] },
          // 왼쪽
          { b1: [0, -1], b2: [-1, -2], dest: [-2, -3] },
          { b1: [0, -1], b2: [1, -2],  dest: [2, -3] },
          // 오른쪽
          { b1: [0, 1],  b2: [-1, 2],  dest: [-2, 3] },
          { b1: [0, 1],  b2: [1, 2],   dest: [2, 3] }
        ];
        sangSteps.forEach(s => {
          const b1r = r + s.b1[0], b1c = c + s.b1[1];
          const b2r = r + s.b2[0], b2c = c + s.b2[1];
          if (_isInsideBoard(b1r, b1c) && !board[b1r][b1c] &&
              _isInsideBoard(b2r, b2c) && !board[b2r][b2c]) {
            addMove(r + s.dest[0], c + s.dest[1]);
          }
        });
        break;
      }

      // ── 5. 궁 (宮) & 사 (士): 궁성(3x3) 내부에서만 선을 따라 1칸 ──
      case 'king':
      case 'sa': {
        const palaceSide = (r <= 2) ? 'han' : 'cho';
        // 가로/세로 1칸
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
          const tr = r + dr, tc = c + dc;
          if (_isInsidePalace(tr, tc, palaceSide)) addMove(tr, tc);
        });

        // 궁성 대각선 1칸 (중앙과 4개 코너 간 연결)
        const diagPaths = _getPalaceDirectDiagonalNeighbors(r, c);
        diagPaths.forEach(pt => addMove(pt.r, pt.c));
        break;
      }

      // ── 6. 졸 (卒) / 병 (兵): 전진 1칸 또는 좌/우 1칸 (적 궁성 진입 시 대각 전진 가능) ──
      case 'zol': {
        const fwd = (side === 'cho') ? -1 : 1;
        // 직진 1칸
        addMove(r + fwd, c);
        // 좌/우 1칸
        addMove(r, c - 1);
        addMove(r, c + 1);

        // 적 궁성 내 대각선 전진 (코너 -> 중앙 또는 중앙 -> 반대 코너)
        const enemyPalaceSide = (side === 'cho') ? 'han' : 'cho';
        if (_isInsidePalace(r, c, enemyPalaceSide)) {
          const diagNeighbors = _getPalaceDirectDiagonalNeighbors(r, c);
          diagNeighbors.forEach(pt => {
            // 전진 방향 대각선만 허용
            if ((side === 'cho' && pt.r < r) || (side === 'han' && pt.r > r)) {
              addMove(pt.r, pt.c);
            }
          });
        }
        break;
      }
    }

    return moves;
  }

  // 궁성 대각선 직선 경로들 (차, 포 용도)
  function _getPalaceDiagonalLines(r, c) {
    const lines = [];
    // 상단 한 궁성 (3~5, 0~2, center: (1, 4))
    if (r === 0 && c === 3) lines.push([{ r: 1, c: 4 }, { r: 2, c: 5 }]);
    if (r === 0 && c === 5) lines.push([{ r: 1, c: 4 }, { r: 2, c: 3 }]);
    if (r === 2 && c === 3) lines.push([{ r: 1, c: 4 }, { r: 0, c: 5 }]);
    if (r === 2 && c === 5) lines.push([{ r: 1, c: 4 }, { r: 0, c: 3 }]);
    if (r === 1 && c === 4) {
      lines.push([{ r: 0, c: 3 }]);
      lines.push([{ r: 0, c: 5 }]);
      lines.push([{ r: 2, c: 3 }]);
      lines.push([{ r: 2, c: 5 }]);
    }

    // 하단 초 궁성 (3~5, 7~9, center: (8, 4))
    if (r === 7 && c === 3) lines.push([{ r: 8, c: 4 }, { r: 9, c: 5 }]);
    if (r === 7 && c === 5) lines.push([{ r: 8, c: 4 }, { r: 9, c: 3 }]);
    if (r === 9 && c === 3) lines.push([{ r: 8, c: 4 }, { r: 7, c: 5 }]);
    if (r === 9 && c === 5) lines.push([{ r: 8, c: 4 }, { r: 7, c: 3 }]);
    if (r === 8 && c === 4) {
      lines.push([{ r: 7, c: 3 }]);
      lines.push([{ r: 7, c: 5 }]);
      lines.push([{ r: 9, c: 3 }]);
      lines.push([{ r: 9, c: 5 }]);
    }
    return lines;
  }

  // 궁성 내 직접 인접한 대각선 이웃 점들 (궁, 사, 졸/병 용도)
  function _getPalaceDirectDiagonalNeighbors(r, c) {
    // 상단 한 궁성
    if (r === 1 && c === 4) return [{ r: 0, c: 3 }, { r: 0, c: 5 }, { r: 2, c: 3 }, { r: 2, c: 5 }];
    if ((r === 0 && c === 3) || (r === 0 && c === 5) || (r === 2 && c === 3) || (r === 2 && c === 5)) {
      return [{ r: 1, c: 4 }];
    }
    // 하단 초 궁성
    if (r === 8 && c === 4) return [{ r: 7, c: 3 }, { r: 7, c: 5 }, { r: 9, c: 3 }, { r: 9, c: 5 }];
    if ((r === 7 && c === 3) || (r === 7 && c === 5) || (r === 9 && c === 3) || (r === 9 && c === 5)) {
      return [{ r: 8, c: 4 }];
    }
    return [];
  }

  // 특정 진영의 왕이 상대방 기물에게 공격받고 있는지 (장군) 검사
  function _isKingUnderAttack(kingSide) {
    let kingPos = null;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (p && p.side === kingSide && p.type === 'king') {
          kingPos = { r, c };
          break;
        }
      }
      if (kingPos) break;
    }
    if (!kingPos) return false;

    const oppSide = (kingSide === 'cho') ? 'han' : 'cho';
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board[r][c];
        if (p && p.side === oppSide) {
          const oppMoves = _getLegalMoves(r, c);
          if (oppMoves.some(m => m.r === kingPos.r && m.c === kingPos.c)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /* ═══════════════════════════════════════════════════════════════
     P2P 메시지 라우터 & 관전자 스냅샷
     ═══════════════════════════════════════════════════════════════ */
  function _onMessage(data, senderId) {
    if (!data || typeof data !== 'object') return;

    if (isHost && senderId && senderId !== 'host') {
      if (['JANGGI_MOVE', 'JANGGI_RESIGN'].includes(data.type)) {
        P2P.send(data, null, senderId);
      }
    }

    switch (data.type) {
      case 'JANGGI_MOVE':
        _makeMove(data.from.r, data.from.c, data.to.r, data.to.c, false);
        break;

      case 'JANGGI_RESIGN':
        _finishGame(data.resignerSide !== mySide, '상대방이 기권하여 승리했습니다!');
        break;

      case 'JANGGI_SNAPSHOT':
        if (data.board) board = data.board;
        if (data.currentTurn) currentTurn = data.currentTurn;
        if (data.lastMove) lastMove = data.lastMove;
        _updateTurnUI();
        _renderBoardPieces();
        break;
    }
  }

  function sendSnapshotTo(targetPeerId) {
    if (!isHost) return;
    P2P.send({
      type: 'JANGGI_SNAPSHOT',
      board: board,
      currentTurn: currentTurn,
      lastMove: lastMove
    }, targetPeerId);
  }

  /* ─── 헬퍼 ─── */
  function _isMyTurn() {
    if (_context && _context.isDevMode) return true;
    if (_context && _context.isSpectator) return false;
    return currentTurn === mySide;
  }

  function destroy() {
    P2P.offMessage(_onMessage);
    isGameOver = true;
  }

  return { init, destroy, sendSnapshotTo };
})();
