/**
 * alkkagi.js - 2인 실시간 WebRTC P2P 정통 알까기 (Alkkagi / Korean Stone Flicking)
 * 1. 기물 중심 대형 가이드 원 + 당긴 만큼 중심에서부터 차오르는 반투명 흰색 원형 파워 게이지
 * 2. 콤팩트하고 세련된 소형 조준 화살표
 * 3. 둔탁하고 묵직한 목각 선택 효과음 (playAlkkagiSelect)
 * 4. 상대방이 조준 중인 기물 & 드래그 방향 실시간 P2P 가시화 (ALKKAGI_AIM_MOVE)
 * 5. 낙장불입 (한번 선택한 기물은 다른 기물로 변경 불가, 반드시 해당 기물로 발사)
 */
const AlkkagiGame = (() => {
  'use strict';

  let _container = null;
  let _onResult = null;
  let _context = null;

  // 캔버스 및 렌더링
  let canvas = null;
  let ctx = null;
  let animId = null;

  // 논리 좌표계: 원목판(420 x 470) + 사방 50px 외곽 여백 = 전체 520 x 570
  const BOARD_MARGIN = 50;
  const BOARD_WIDTH = 420;
  const BOARD_HEIGHT = 470;
  const CANVAS_WIDTH = BOARD_WIDTH + BOARD_MARGIN * 2;   // 520
  const CANVAS_HEIGHT = BOARD_HEIGHT + BOARD_MARGIN * 2; // 570

  // 원목 대국판 실제 영역
  const BOARD_RECT = {
    minX: BOARD_MARGIN,
    maxX: BOARD_MARGIN + BOARD_WIDTH,
    minY: BOARD_MARGIN,
    maxY: BOARD_MARGIN + BOARD_HEIGHT
  };

  // 진영: 'cho' (초, 楚, 청색, 선공), 'han' (한, 漢, 적색, 후공)
  let mySide = 'cho';
  let currentTurn = 'cho';
  let isHost = false;
  let myId = '';
  let players = [];
  let isGameOver = false;
  let isSimulating = false;
  let simSafetyTimer = null;

  // 기물 목록: [{ id, side, type, x, y, vx, vy, radius, mass, isDead, isFalling, fallProgress, rotation }]
  let pieces = [];

  // 이미지 프리로드 캐시
  const pieceImages = {};
  const IMAGE_NAMES = [
    'cho_king', 'cho_cha', 'cho_po', 'cho_ma', 'cho_sang', 'cho_sa', 'cho_zol',
    'han_king', 'han_cha', 'han_po', 'han_ma', 'han_sang', 'han_sa', 'han_zol'
  ];

  // 🌟 드래그 조준 및 낙장불입(선택 고정) 상태
  let lockedPiece = null;       // 한번 선택되어 고정된 내 기물
  let isDragging = false;
  let currentDragPos = null;
  const MAX_DRAG_DIST = 110;
  const GAUGE_MAX_RADIUS = 54;  // 기물 중심 대형 가이드 원 반경

  // 🌟 상대방 실시간 조준 동기화 상태
  let oppAimPieceId = null;
  let oppDragPos = null;
  let lastAimSendTime = 0;

  // 사운드 쓰로틀링
  let lastHitSoundTime = 0;

  /* ═══════════════════════════════════════════════════════════════
     초기화 및 에셋 로드
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

    if (players.length >= 2 && String(players[1].id) === String(myId)) {
      mySide = 'han';
    } else {
      mySide = 'cho';
    }

    isGameOver = false;
    currentTurn = 'cho';
    isSimulating = false;
    if (simSafetyTimer) {
      clearTimeout(simSafetyTimer);
      simSafetyTimer = null;
    }
    lockedPiece = null;
    isDragging = false;
    currentDragPos = null;
    oppAimPieceId = null;
    oppDragPos = null;

    _preloadImages();
    _initPieces();
    _renderLayout();
    _initCanvas();

    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);

    if (typeof Sound !== 'undefined' && Sound.playStart) Sound.playStart();
  }

  function _preloadImages() {
    IMAGE_NAMES.forEach(name => {
      if (!pieceImages[name]) {
        const img = new Image();
        img.src = `assets/janggi/${name}.png`;
        pieceImages[name] = img;
      }
    });
  }

  // 🌟 16개 초(楚) + 16개 한(漢) 장기알 초기 배치
  function _initPieces() {
    pieces = [];
    let idCounter = 1;

    const PIECE_CONFIGS = {
      king: { radius: 24, mass: 2.6 },
      cha:  { radius: 20, mass: 1.7 },
      po:   { radius: 20, mass: 1.7 },
      ma:   { radius: 20, mass: 1.6 },
      sang: { radius: 20, mass: 1.6 },
      sa:   { radius: 17, mass: 1.2 },
      zol:  { radius: 17, mass: 1.2 }
    };

    const getPos = (r, c) => ({
      x: BOARD_MARGIN + 25 + c * 46.25,
      y: BOARD_MARGIN + 25 + r * 46.67
    });

    // 1. 한(漢, 상단) 16개
    const hanPlacements = [
      { r: 0, c: 0, type: 'cha' }, { r: 0, c: 1, type: 'ma' }, { r: 0, c: 2, type: 'sang' },
      { r: 0, c: 3, type: 'sa' }, { r: 0, c: 5, type: 'sa' }, { r: 0, c: 6, type: 'sang' },
      { r: 0, c: 7, type: 'ma' }, { r: 0, c: 8, type: 'cha' },
      { r: 1, c: 4, type: 'king' },
      { r: 2, c: 1, type: 'po' }, { r: 2, c: 7, type: 'po' },
      { r: 3, c: 0, type: 'zol' }, { r: 3, c: 2, type: 'zol' }, { r: 3, c: 4, type: 'zol' },
      { r: 3, c: 6, type: 'zol' }, { r: 3, c: 8, type: 'zol' }
    ];

    hanPlacements.forEach(p => {
      const pos = getPos(p.r, p.c);
      const conf = PIECE_CONFIGS[p.type] || PIECE_CONFIGS.zol;
      pieces.push({
        id: idCounter++,
        side: 'han',
        type: p.type,
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        radius: conf.radius,
        mass: conf.mass,
        isDead: false,
        isFalling: false,
        fallProgress: 0,
        rotation: 0
      });
    });

    // 2. 초(楚, 하단) 16개
    const choPlacements = [
      { r: 9, c: 0, type: 'cha' }, { r: 9, c: 1, type: 'ma' }, { r: 9, c: 2, type: 'sang' },
      { r: 9, c: 3, type: 'sa' }, { r: 9, c: 5, type: 'sa' }, { r: 9, c: 6, type: 'sang' },
      { r: 9, c: 7, type: 'ma' }, { r: 9, c: 8, type: 'cha' },
      { r: 8, c: 4, type: 'king' },
      { r: 7, c: 1, type: 'po' }, { r: 7, c: 7, type: 'po' },
      { r: 6, c: 0, type: 'zol' }, { r: 6, c: 2, type: 'zol' }, { r: 6, c: 4, type: 'zol' },
      { r: 6, c: 6, type: 'zol' }, { r: 6, c: 8, type: 'zol' }
    ];

    choPlacements.forEach(p => {
      const pos = getPos(p.r, p.c);
      const conf = PIECE_CONFIGS[p.type] || PIECE_CONFIGS.zol;
      pieces.push({
        id: idCounter++,
        side: 'cho',
        type: p.type,
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        radius: conf.radius,
        mass: conf.mass,
        isDead: false,
        isFalling: false,
        fallProgress: 0,
        rotation: 0
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     DOM 레이아웃 렌더링
     ═══════════════════════════════════════════════════════════════ */
  function _renderLayout() {
    const oppName = (players.length >= 2)
      ? (players.find(p => String(p.id) !== String(myId))?.name || '상대방')
      : '상대방';

    _container.innerHTML = `
      <div class="alkkagi-wrap">
        
        <!-- 상단 헤더: 턴 알림 + 우측 기권 버튼 -->
        <div class="alkkagi-header-area">
          <div class="turn-indicator">
            <span class="turn-label ${currentTurn === 'cho' ? 'cho-turn' : 'han-turn'}" id="ak-turn-label">
              <i class="fa-solid fa-chess-board"></i>
              <span id="ak-turn-text">${currentTurn === mySide ? '내 턴' : `${oppName} 턴`}</span>
            </span>
          </div>

          <div class="alkkagi-header-actions">
            <button type="button" class="btn-jg-header-resign" id="btn-ak-resign" title="대국 기권">
              <i class="fa-solid fa-flag"></i>
              <span>기권</span>
            </button>
          </div>
        </div>

        <!-- 🌟 원목 대국판 + 흰색 매끄러운 여백 캔버스 (520 : 570) -->
        <div class="alkkagi-arena-card">
          <canvas id="ak-canvas" width="520" height="570"></canvas>
        </div>

      </div>
    `;

    _bindEvents();
  }

  function _bindEvents() {
    const resignBtn = document.getElementById('btn-ak-resign');
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
     캔버스 및 마우스/터치 인터랙션 (낙장불입 & 둔탁한 터치음)
     ═══════════════════════════════════════════════════════════════ */
  function _initCanvas() {
    canvas = document.getElementById('ak-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    _adjustCanvasSize();
    window.addEventListener('resize', _adjustCanvasSize);

    // 마우스 이벤트
    canvas.addEventListener('mousedown', _onPointerDown);
    window.addEventListener('mousemove', _onPointerMove, { passive: false });
    window.addEventListener('mouseup', _onPointerUp);

    // 터치 이벤트
    canvas.addEventListener('touchstart', _onTouchStart, { passive: false });
    window.addEventListener('touchmove', _onTouchMove, { passive: false });
    window.addEventListener('touchend', _onTouchEnd);

    _startPhysicsLoop();
  }

  function _adjustCanvasSize() {
    if (!canvas) return;
    const card = canvas.parentElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    
    const scaleX = canvas.width / CANVAS_WIDTH;
    const scaleY = canvas.height / CANVAS_HEIGHT;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  }

  function _getLogicalCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    let lx = (clientX - rect.left) * scaleX;
    let ly = (clientY - rect.top) * scaleY;

    if (mySide === 'han') {
      lx = CANVAS_WIDTH - lx;
      ly = CANVAS_HEIGHT - ly;
    }

    return { x: lx, y: ly };
  }

  function _onPointerDown(e) {
    if (!_isMyTurn() || isGameOver || isSimulating) return;

    const pos = _getLogicalCoords(e);
    const isDev = !!(_context && _context.isDevMode);
    const activeSide = isDev ? currentTurn : mySide;
    
    // 🌟 이미 선택된 기물이 있는 경우 (낙장불입) -> 어디를 클릭하든 해당 기물의 조준 시작
    if (lockedPiece) {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      currentDragPos = { x: pos.x, y: pos.y };
      return;
    }

    // 새로운 내 기물 클릭 탐색 (개발자 모드 시 현재 턴 기물 탐색)
    const clicked = pieces.find(p => {
      if (p.side !== activeSide || p.isDead || p.isFalling) return false;
      const d = Math.hypot(p.x - pos.x, p.y - pos.y);
      return d <= (p.radius + 6);
    });

    if (clicked) {
      e.preventDefault();
      e.stopPropagation();
      
      // 🌟 낙장불입: 한번 선택하면 발사할 때까지 변경 불가!
      lockedPiece = clicked;
      isDragging = true;
      currentDragPos = { x: pos.x, y: pos.y };

      // 🌟 둔탁한 목각 선택 효과음 (playAlkkagiSelect)
      if (typeof Sound !== 'undefined' && Sound.playAlkkagiSelect) {
        Sound.playAlkkagiSelect();
      }
    }
  }

  function _onPointerMove(e) {
    if (!lockedPiece || !isDragging || isSimulating) return;
    e.preventDefault();
    e.stopPropagation();
    currentDragPos = _getLogicalCoords(e);

    // 🌟 상대방에게 내 실시간 드래그 좌표 전송 (40ms 쓰로틀링)
    const now = performance.now();
    if (now - lastAimSendTime > 40) {
      lastAimSendTime = now;
      P2P.send({
        type: 'ALKKAGI_AIM_MOVE',
        pieceId: lockedPiece.id,
        dragX: currentDragPos.x,
        dragY: currentDragPos.y
      });
    }
  }

  function _onPointerUp() {
    if (!lockedPiece || !isDragging || isSimulating) {
      isDragging = false;
      return;
    }

    isDragging = false;

    if (!currentDragPos) return;

    const dx = lockedPiece.x - currentDragPos.x;
    const dy = lockedPiece.y - currentDragPos.y;
    const dist = Math.hypot(dx, dy);

    // 🌟 거리가 8 이상 당겨졌을 때만 발사 (8 미만이면 고정된 상태 유지하여 다시 당길 수 있음)
    if (dist >= 8) {
      const powerRatio = Math.min(1.0, dist / MAX_DRAG_DIST);
      const angle = Math.atan2(dy, dx);

      // 질량 비례 발사 파워 (왕: 44.0, 중기물: 40.0, 쫄병: 38.5)
      let maxLaunchSpeed = 38.5;
      if (lockedPiece.type === 'king') {
        maxLaunchSpeed = 44.0;
      } else if (['cha', 'po', 'ma', 'sang'].includes(lockedPiece.type)) {
        maxLaunchSpeed = 40.0;
      }

      const launchSpeed = maxLaunchSpeed * powerRatio;
      const vx = Math.cos(angle) * launchSpeed;
      const vy = Math.sin(angle) * launchSpeed;

      const shootPieceId = lockedPiece.id;
      lockedPiece = null;
      currentDragPos = null;

      _shoot(shootPieceId, vx, vy, powerRatio, true);
    }
  }

  function _onTouchStart(e) {
    _onPointerDown(e);
  }

  function _onTouchMove(e) {
    _onPointerMove(e);
  }

  function _onTouchEnd(e) {
    _onPointerUp();
  }

  /* ═══════════════════════════════════════════════════════════════
     발사 및 물리 시뮬레이션 엔진
     ═══════════════════════════════════════════════════════════════ */
  function _shoot(pieceId, vx, vy, powerRatio, isLocal) {
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece) return;

    oppAimPieceId = null;
    oppDragPos = null;

    piece.vx = vx;
    piece.vy = vy;
    isSimulating = true;

    if (simSafetyTimer) clearTimeout(simSafetyTimer);
    simSafetyTimer = setTimeout(() => {
      if (isSimulating) {
        _forceStopAndEndTurn();
      }
    }, 3800);

    if (typeof Sound !== 'undefined' && Sound.playAlkkagiFlick) {
      Sound.playAlkkagiFlick(powerRatio);
    }

    if (isLocal) {
      P2P.send({
        type: 'ALKKAGI_SHOOT',
        pieceId: pieceId,
        vx: vx,
        vy: vy,
        powerRatio: powerRatio
      });
    }

    _updateTurnUI();
  }

  function _startPhysicsLoop() {
    let lastTime = performance.now();

    function loop(currentTime) {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
      lastTime = currentTime;

      _updatePhysics(dt);
      _renderCanvas();

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
  }

  function _updatePhysics(dt) {
    if (!isSimulating && pieces.every(p => !p.isFalling)) return;

    const SUB_STEPS = 5;
    const subDt = dt / SUB_STEPS;

    const FRICTION = 0.88;
    const LINEAR_DRAG = 0.35;

    let stillMoving = false;

    for (let step = 0; step < SUB_STEPS; step++) {
      // 1. 위치 및 감속 갱신
      pieces.forEach(p => {
        if (p.isDead) return;

        if (p.isFalling) {
          p.fallProgress += subDt * 3.5;
          p.rotation += subDt * 9.0;
          if (p.fallProgress >= 1.0) {
            p.isDead = true;
            p.isFalling = false;
          }
          return;
        }

        p.x += p.vx * subDt * 60;
        p.y += p.vy * subDt * 60;

        p.vx *= Math.pow(FRICTION, subDt * 60);
        p.vy *= Math.pow(FRICTION, subDt * 60);

        const curSpd = Math.hypot(p.vx, p.vy);
        if (curSpd > 0) {
          const drop = Math.min(curSpd, LINEAR_DRAG * subDt * 60);
          p.vx -= (p.vx / curSpd) * drop;
          p.vy -= (p.vy / curSpd) * drop;
        }

        if (Math.hypot(p.vx, p.vy) < 0.12) {
          p.vx = 0;
          p.vy = 0;
        } else {
          stillMoving = true;
        }

        // 🌟 원목 대국판 턱을 완전히 벗어났을 때 낙하 판정
        const isOffWoodBoard = (
          p.x + p.radius < BOARD_RECT.minX ||
          p.x - p.radius > BOARD_RECT.maxX ||
          p.y + p.radius < BOARD_RECT.minY ||
          p.y - p.radius > BOARD_RECT.maxY
        );

        if (isOffWoodBoard) {
          p.isFalling = true;
          p.fallProgress = 0;
          p.vx *= 0.25;
          p.vy *= 0.25;

          if (typeof Sound !== 'undefined' && Sound.playAlkkagiFall) {
            Sound.playAlkkagiFall();
          }
        }
      });

      // 2. 2D 탄성 충돌 & 비스듬한 굴절 반사 (Approaching Check)
      for (let i = 0; i < pieces.length; i++) {
        const p1 = pieces[i];
        if (p1.isDead || p1.isFalling) continue;

        for (let j = i + 1; j < pieces.length; j++) {
          const p2 = pieces[j];
          if (p2.isDead || p2.isFalling) continue;

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = p1.radius + p2.radius;

          if (dist < minDist && dist > 0.0001) {
            const nx = dx / dist;
            const ny = dy / dist;

            const kx = p1.vx - p2.vx;
            const ky = p1.vy - p2.vy;
            const relVelAlongNormal = kx * nx + ky * ny;

            if (relVelAlongNormal > 0) {
              const overlap = (minDist - dist);
              p1.x -= nx * overlap * 0.5;
              p1.y -= ny * overlap * 0.5;
              p2.x += nx * overlap * 0.5;
              p2.y += ny * overlap * 0.5;

              const RESTITUTION = 0.96;
              const impulse = -(1 + RESTITUTION) * relVelAlongNormal / (1 / p1.mass + 1 / p2.mass);

              p1.vx += (impulse / p1.mass) * nx;
              p1.vy += (impulse / p1.mass) * ny;
              p2.vx -= (impulse / p2.mass) * nx;
              p2.vy -= (impulse / p2.mass) * ny;

              stillMoving = true;

              const now = performance.now();
              if (relVelAlongNormal > 0.35 && (now - lastHitSoundTime > 40)) {
                lastHitSoundTime = now;
                if (typeof Sound !== 'undefined' && Sound.playAlkkagiHit) {
                  Sound.playAlkkagiHit(relVelAlongNormal * 0.1);
                }
              }
            }
          }
        }
      }
    }

    const hasFalling = pieces.some(p => p.isFalling);

    if (!stillMoving && !hasFalling && isSimulating) {
      _finishSimulationAndSwitchTurn();
    }
  }

  function _forceStopAndEndTurn() {
    if (simSafetyTimer) clearTimeout(simSafetyTimer);
    simSafetyTimer = null;

    pieces.forEach(p => {
      p.vx = 0;
      p.vy = 0;
      if (p.isFalling) {
        p.isDead = true;
        p.isFalling = false;
      }
    });

    _finishSimulationAndSwitchTurn();
  }

  function _finishSimulationAndSwitchTurn() {
    if (simSafetyTimer) clearTimeout(simSafetyTimer);
    simSafetyTimer = null;

    isSimulating = false;
    lockedPiece = null;
    currentDragPos = null;
    oppAimPieceId = null;
    oppDragPos = null;

    pieces.forEach(p => {
      p.vx = 0;
      p.vy = 0;
    });

    const choCount = pieces.filter(p => p.side === 'cho' && !p.isDead).length;
    const hanCount = pieces.filter(p => p.side === 'han' && !p.isDead).length;

    if (hanCount === 0 && choCount > 0) {
      _finishGame(mySide === 'cho', '한(漢)의 모든 기물을 떨어뜨려 초(楚) 승리!');
      return;
    } else if (choCount === 0 && hanCount > 0) {
      _finishGame(mySide === 'han', '초(楚)의 모든 기물을 떨어뜨려 한(漢) 승리!');
      return;
    } else if (choCount === 0 && hanCount === 0) {
      _finishGame(false, '모든 기물이 떨어져 무승부입니다!');
      return;
    }

    const nextTurn = (currentTurn === 'cho') ? 'han' : 'cho';
    currentTurn = nextTurn;

    P2P.send({
      type: 'ALKKAGI_TURN_END',
      nextTurn: nextTurn,
      pieces: pieces.map(p => ({
        id: p.id, side: p.side, type: p.type,
        x: p.x, y: p.y, isDead: p.isDead
      }))
    });

    _updateTurnUI();
  }

  function _resign(isLocal) {
    if (isLocal) {
      P2P.send({
        type: 'ALKKAGI_RESIGN',
        resignerSide: mySide
      });
      _finishGame(false, '기권하여 패배했습니다.');
    }
  }

  function _finishGame(iWon, reason) {
    if (isGameOver) return;
    isGameOver = true;
    if (simSafetyTimer) clearTimeout(simSafetyTimer);

    if (typeof Sound !== 'undefined') {
      if (iWon && Sound.playWin) Sound.playWin();
      else if (Sound.playLose) Sound.playLose();
    }

    setTimeout(() => {
      if (_onResult) _onResult(iWon, reason);
    }, 1000);
  }

  function _updateTurnUI() {
    const turnLabel = document.getElementById('ak-turn-label');
    const turnText  = document.getElementById('ak-turn-text');
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

    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      const turnIdx = (currentTurn === 'cho') ? 0 : 1;
      window.App.updateInGameTurn(turnIdx);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     캔버스 렌더링 엔진 (실시간 상대방 조준 & 신규 게이지 비주얼)
     ═══════════════════════════════════════════════════════════════ */
  function _renderCanvas() {
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();

    if (mySide === 'han') {
      ctx.translate(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.rotate(Math.PI);
    }

    // 2. 도톰한 3D 입체 원목 대국판
    _drawWoodenBoard();

    // 3. 기물 렌더링
    _drawPieces();

    // 4. 🌟 내 조준 상태 렌더링
    if (lockedPiece) {
      if (isDragging && currentDragPos) {
        _drawAimingIndicator(lockedPiece, currentDragPos, false);
      } else {
        // 선택되었으나 아직 안 당겼을 때: 중심 가이드 원 표시
        _drawSelectedPieceGuide(lockedPiece);
      }
    }

    // 5. 🌟 상대방 실시간 조준 상태 렌더링
    if (oppAimPieceId && oppDragPos && currentTurn !== mySide) {
      const oppPiece = pieces.find(p => p.id === oppAimPieceId);
      if (oppPiece && !oppPiece.isDead) {
        _drawAimingIndicator(oppPiece, oppDragPos, true);
      }
    }

    ctx.restore();
  }

  function _drawWoodenBoard() {
    const bx = BOARD_RECT.minX;
    const by = BOARD_RECT.minY;
    const bw = BOARD_WIDTH;
    const bh = BOARD_HEIGHT;

    ctx.save();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;

    ctx.fillStyle = '#c99a61';
    _fillRoundedRect(ctx, bx - 6, by - 6, bw + 12, bh + 12, 10);

    ctx.restore();

    const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
    grad.addColorStop(0, '#fce8a6');
    grad.addColorStop(0.45, '#fae29c');
    grad.addColorStop(1, '#f2d486');
    ctx.fillStyle = grad;
    _fillRoundedRect(ctx, bx, by, bw, bh, 6);

    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.25;
    ctx.beginPath();

    for (let r = 0; r < 10; r++) {
      const y = by + 25 + r * 46.67;
      ctx.moveTo(bx + 25, y);
      ctx.lineTo(bx + 395, y);
    }

    for (let c = 0; c < 9; c++) {
      const x = bx + 25 + c * 46.25;
      ctx.moveTo(x, by + 25);
      ctx.lineTo(x, by + 445);
    }

    // 한 궁성 X선
    ctx.moveTo(bx + 25 + 3 * 46.25, by + 25);
    ctx.lineTo(bx + 25 + 5 * 46.25, by + 25 + 2 * 46.67);
    ctx.moveTo(bx + 25 + 5 * 46.25, by + 25);
    ctx.lineTo(bx + 25 + 3 * 46.25, by + 25 + 2 * 46.67);

    // 초 궁성 X선
    ctx.moveTo(bx + 25 + 3 * 46.25, by + 25 + 7 * 46.67);
    ctx.lineTo(bx + 25 + 5 * 46.25, by + 445);
    ctx.moveTo(bx + 25 + 5 * 46.25, by + 25 + 7 * 46.67);
    ctx.lineTo(bx + 25 + 3 * 46.25, by + 445);

    ctx.stroke();

    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx + 25, by + 25, 370, 420);

    const starPoints = [
      { r: 2, c: 1 }, { r: 2, c: 7 },
      { r: 3, c: 0 }, { r: 3, c: 2 }, { r: 3, c: 4 }, { r: 3, c: 6 }, { r: 3, c: 8 },
      { r: 6, c: 0 }, { r: 6, c: 2 }, { r: 6, c: 4 }, { r: 6, c: 6 }, { r: 6, c: 8 },
      { r: 7, c: 1 }, { r: 7, c: 7 }
    ];

    ctx.lineWidth = 1.6;
    starPoints.forEach(p => {
      const sx = bx + 25 + p.c * 46.25;
      const sy = by + 25 + p.r * 46.67;
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy);
      ctx.lineTo(sx + 4, sy);
      ctx.moveTo(sx, sy - 4);
      ctx.lineTo(sx, sy + 4);
      ctx.stroke();
    });
  }

  function _fillRoundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
    context.fill();
  }

  function _drawPieces() {
    pieces.forEach(p => {
      if (p.isDead) return;

      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.isFalling) {
        const scale = Math.max(0.01, 1.0 - p.fallProgress);
        ctx.scale(scale, scale);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, 1.0 - p.fallProgress);
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.40)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
      }

      if (mySide === 'han') {
        ctx.rotate(Math.PI);
      }

      const imgKey = `${p.side}_${p.type}`;
      const img = pieceImages[imgKey];
      const drawW = p.radius * 2.38;
      const drawH = drawW * (105 / 119);

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = (p.side === 'cho') ? '#0b388f' : '#cc1f1a';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  /* 🌟 선택된 기물 기본 가이드 링 (아직 당기기 전) */
  function _drawSelectedPieceGuide(p) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = (p.side === 'cho') ? 'rgba(0, 112, 243, 0.9)' : 'rgba(229, 62, 62, 0.9)';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = (p.side === 'cho') ? 'rgba(0, 112, 243, 0.4)' : 'rgba(229, 62, 62, 0.4)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
  }

  /* 🌟 조준 시 당긴 만큼 점점 커지는 깔끔한 고리 (흰색 반투명 채움 X) + 방향 화살표 */
  function _drawAimingIndicator(p, dragPos, isOpponent) {
    const dx = p.x - dragPos.x;
    const dy = p.y - dragPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      _drawSelectedPieceGuide(p);
      return;
    }

    const powerRatio = Math.min(1.0, dist / MAX_DRAG_DIST);
    const angle = Math.atan2(dy, dx); // 발사 방향 각도

    ctx.save();

    // 1. 최대 파워 외곽 기준선 (연한 점선 가이드 링)
    ctx.beginPath();
    ctx.arc(p.x, p.y, GAUGE_MAX_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. 🌟 당기는 힘(powerRatio)에 따라 기물 둘레에서부터 점점 커지는 깔끔한 고리 (투명 채움 없이 순수 링만)
    const ringRadius = (p.radius + 4) + (GAUGE_MAX_RADIUS - (p.radius + 4)) * powerRatio;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = (p.side === 'cho') ? '#0070f3' : '#e53e3e';
    ctx.lineWidth = 2.6;
    ctx.shadowColor = (p.side === 'cho') ? 'rgba(0, 112, 243, 0.55)' : 'rgba(229, 62, 62, 0.55)';
    ctx.shadowBlur = 6;
    ctx.stroke();

    // 3. 조준 반대 방향 슬링샷 당김 점선
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(dragPos.x, dragPos.y);
    ctx.strokeStyle = 'rgba(60, 60, 60, 0.65)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. 🌟 콤팩트하고 세련된 소형 조준 화살표
    const arrowStartDist = GAUGE_MAX_RADIUS + 4;
    const arrowLen = 14 + powerRatio * 22; // 깔끔한 화살표
    const arrowColor = (p.side === 'cho') ? '#0070f3' : '#e53e3e';
    const arrowGlow = (p.side === 'cho') ? 'rgba(0, 112, 243, 0.7)' : 'rgba(229, 62, 62, 0.7)';

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);

    ctx.shadowColor = arrowGlow;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = arrowColor;
    ctx.fillStyle = arrowColor;
    ctx.lineWidth = 2.8 + powerRatio * 1.2;

    ctx.beginPath();
    ctx.moveTo(arrowStartDist, 0);
    ctx.lineTo(arrowStartDist + arrowLen, 0);
    ctx.stroke();

    // 콤팩트 화살촉 삼각형
    const tipX = arrowStartDist + arrowLen;
    const headSize = 7 + powerRatio * 3;
    ctx.beginPath();
    ctx.moveTo(tipX + headSize, 0);
    ctx.lineTo(tipX, -headSize * 0.55);
    ctx.lineTo(tipX, headSize * 0.55);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.restore();
  }

  /* ═══════════════════════════════════════════════════════════════
     P2P 메시지 핸들러 & 스냅샷
     ═══════════════════════════════════════════════════════════════ */
  function _onMessage(data, senderId) {
    if (!data || typeof data !== 'object') return;

    if (isHost && senderId && senderId !== 'host') {
      if (['ALKKAGI_SHOOT', 'ALKKAGI_AIM_MOVE', 'ALKKAGI_TURN_END', 'ALKKAGI_SYNC', 'ALKKAGI_RESIGN'].includes(data.type)) {
        P2P.send(data, null, senderId);
      }
    }

    switch (data.type) {
      case 'ALKKAGI_AIM_MOVE':
        oppAimPieceId = data.pieceId;
        oppDragPos = { x: data.dragX, y: data.dragY };
        break;

      case 'ALKKAGI_SHOOT':
        oppAimPieceId = null;
        oppDragPos = null;
        _shoot(data.pieceId, data.vx, data.vy, data.powerRatio, false);
        break;

      case 'ALKKAGI_TURN_END':
        if (simSafetyTimer) clearTimeout(simSafetyTimer);
        simSafetyTimer = null;
        isSimulating = false;
        lockedPiece = null;
        oppAimPieceId = null;
        oppDragPos = null;

        if (data.pieces) {
          data.pieces.forEach(dp => {
            const lp = pieces.find(p => p.id === dp.id);
            if (lp) {
              lp.x = dp.x;
              lp.y = dp.y;
              lp.vx = 0;
              lp.vy = 0;
              lp.isDead = dp.isDead;
              lp.isFalling = false;
            }
          });
        }
        if (data.nextTurn) currentTurn = data.nextTurn;
        _updateTurnUI();
        break;

      case 'ALKKAGI_SYNC':
        if (data.pieces) {
          data.pieces.forEach(dp => {
            const lp = pieces.find(p => p.id === dp.id);
            if (lp) {
              lp.x = dp.x;
              lp.y = dp.y;
              lp.vx = 0;
              lp.vy = 0;
              lp.isDead = dp.isDead;
            }
          });
        }
        if (data.currentTurn) currentTurn = data.currentTurn;
        _updateTurnUI();
        break;

      case 'ALKKAGI_RESIGN':
        _finishGame(data.resignerSide !== mySide, '상대방이 기권하여 승리했습니다!');
        break;

      case 'ALKKAGI_SNAPSHOT':
        if (data.pieces) pieces = data.pieces;
        if (data.currentTurn) currentTurn = data.currentTurn;
        _updateTurnUI();
        break;
    }
  }

  function sendSnapshotTo(targetPeerId) {
    if (!isHost) return;
    P2P.send({
      type: 'ALKKAGI_SNAPSHOT',
      pieces: pieces,
      currentTurn: currentTurn
    }, targetPeerId);
  }

  function _isMyTurn() {
    if (_context && _context.isDevMode) return true;
    if (_context && _context.isSpectator) return false;
    return currentTurn === mySide;
  }

  function destroy() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    if (simSafetyTimer) {
      clearTimeout(simSafetyTimer);
      simSafetyTimer = null;
    }
    window.removeEventListener('resize', _adjustCanvasSize);
    window.removeEventListener('mousemove', _onPointerMove);
    window.removeEventListener('mouseup', _onPointerUp);
    window.removeEventListener('touchmove', _onTouchMove);
    window.removeEventListener('touchend', _onTouchEnd);

    P2P.offMessage(_onMessage);
    isGameOver = true;
  }

  return { init, destroy, sendSnapshotTo };
})();
