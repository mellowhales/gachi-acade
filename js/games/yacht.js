/**
 * yacht.js - 야추 다이스 (Yacht Dice / Yahtzee)
 * - 2~4인 실시간 WebRTC P2P 완전 멀티플레이어 보드게임 & 관전자 실시간 동기화
 * - 수납함(원목 슬롯)의 주사위는 정렬에서 완벽히 배제 (값, 상태, 슬롯 위치 불변)
 * - 트레이 위의 주사위만 60fps 텀블링 감속 착지 -> 450ms 텀 -> 125ms 간격 3D 회전 오름차순 정렬
 * - 수납함에서 주사위를 빼도 남아있는 주사위들의 슬롯 위치 불변 (빈 슬롯 유지)
 * - 턴 전환 시 무조건 1-2-3-4-5 전체 초기화 및 트레이 복귀
 * - 족보 알림(S-Straight 등) 1초 노출 후 자연스러운 페이드아웃
 * - 정통 픽셀/주사위 SVG 아이콘 완벽 재현 (Aces~Sixes 블랙 주사위 + 하단 족보 패턴)
 */
const YachtGame = (() => {
  'use strict';

  // 12개 족보 카테고리 정의 (정통 픽셀/다이스 SVG 아이콘 적용)
  const CATEGORIES = [
    { key: 'aces', name: 'Aces', section: 'upper', desc: '1의 눈 총합' },
    { key: 'deuces', name: 'Deuces', section: 'upper', desc: '2의 눈 총합' },
    { key: 'threes', name: 'Threes', section: 'upper', desc: '3의 눈 총합' },
    { key: 'fours', name: 'Fours', section: 'upper', desc: '4의 눈 총합' },
    { key: 'fives', name: 'Fives', section: 'upper', desc: '5의 눈 총합' },
    { key: 'sixes', name: 'Sixes', section: 'upper', desc: '6의 눈 총합' },
    { key: 'choice', name: 'Choice', section: 'lower', desc: '주사위 5개 눈의 총합' },
    { key: 'fourKind', name: '4 of a Kind', section: 'lower', desc: '동일한 눈이 4개 이상일 때 5개 눈의 총합' },
    { key: 'fullHouse', name: 'Full House', section: 'lower', desc: '동일한 눈 3개 + 2개 조합일 때 5개 눈의 총합' },
    { key: 'smallStraight', name: 'S. Straight', section: 'lower', desc: '4개 이상 연속된 숫자(1-2-3-4, 2-3-4-5, 3-4-5-6) 시 고정 15점' },
    { key: 'largeStraight', name: 'L. Straight', section: 'lower', desc: '5개 연속된 숫자(1-2-3-4-5, 2-3-4-5-6) 시 고정 30점' },
    { key: 'yacht', name: 'Yacht', section: 'lower', desc: '5개 주사위 눈이 모두 일치할 때 고정 50점!' }
  ];

  // 사진과 100% 동일한 블랙 주사위 및 픽셀 SVG 아이콘 생성기
  function _getCategoryIconSvg(catKey) {
    switch (catKey) {
      case 'aces':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="1.5" y="1.5" width="17" height="17" rx="3.5" fill="#111827"/>
          <circle cx="10" cy="10" r="2.2" fill="#ffffff"/>
        </svg>`;
      case 'deuces':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="1.5" y="1.5" width="17" height="17" rx="3.5" fill="#111827"/>
          <circle cx="6" cy="6" r="1.8" fill="#ffffff"/>
          <circle cx="14" cy="14" r="1.8" fill="#ffffff"/>
        </svg>`;
      case 'threes':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="1.5" y="1.5" width="17" height="17" rx="3.5" fill="#111827"/>
          <circle cx="5.5" cy="5.5" r="1.6" fill="#ffffff"/>
          <circle cx="10" cy="10" r="1.6" fill="#ffffff"/>
          <circle cx="14.5" cy="14.5" r="1.6" fill="#ffffff"/>
        </svg>`;
      case 'fours':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="1.5" y="1.5" width="17" height="17" rx="3.5" fill="#111827"/>
          <circle cx="6" cy="6" r="1.6" fill="#ffffff"/>
          <circle cx="14" cy="6" r="1.6" fill="#ffffff"/>
          <circle cx="6" cy="14" r="1.6" fill="#ffffff"/>
          <circle cx="14" cy="14" r="1.6" fill="#ffffff"/>
        </svg>`;
      case 'fives':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="1.5" y="1.5" width="17" height="17" rx="3.5" fill="#111827"/>
          <circle cx="5.5" cy="5.5" r="1.5" fill="#ffffff"/>
          <circle cx="14.5" cy="5.5" r="1.5" fill="#ffffff"/>
          <circle cx="10" cy="10" r="1.5" fill="#ffffff"/>
          <circle cx="5.5" cy="14.5" r="1.5" fill="#ffffff"/>
          <circle cx="14.5" cy="14.5" r="1.5" fill="#ffffff"/>
        </svg>`;
      case 'sixes':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="1.5" y="1.5" width="17" height="17" rx="3.5" fill="#111827"/>
          <circle cx="6" cy="5.5" r="1.5" fill="#ffffff"/>
          <circle cx="14" cy="5.5" r="1.5" fill="#ffffff"/>
          <circle cx="6" cy="10" r="1.5" fill="#ffffff"/>
          <circle cx="14" cy="10" r="1.5" fill="#ffffff"/>
          <circle cx="6" cy="14.5" r="1.5" fill="#ffffff"/>
          <circle cx="14" cy="14.5" r="1.5" fill="#ffffff"/>
        </svg>`;
      case 'choice':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="3" y="3" width="3.6" height="3.6" rx="0.5" fill="#111827"/>
          <rect x="13.4" y="3" width="3.6" height="3.6" rx="0.5" fill="#111827"/>
          <rect x="8.2" y="8.2" width="3.6" height="3.6" rx="0.5" fill="#111827"/>
          <rect x="3" y="13.4" width="3.6" height="3.6" rx="0.5" fill="#111827"/>
          <rect x="13.4" y="13.4" width="3.6" height="3.6" rx="0.5" fill="#111827"/>
        </svg>`;
      case 'fourKind':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="4.5" y="4.5" width="4.2" height="4.2" rx="0.5" fill="#111827"/>
          <rect x="11.3" y="4.5" width="4.2" height="4.2" rx="0.5" fill="#111827"/>
          <rect x="4.5" y="11.3" width="4.2" height="4.2" rx="0.5" fill="#111827"/>
          <rect x="11.3" y="11.3" width="4.2" height="4.2" rx="0.5" fill="#111827"/>
        </svg>`;
      case 'fullHouse':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="5.5" y="4.2" width="3.6" height="3.6" rx="0.5" fill="#111827"/>
          <rect x="10.9" y="4.2" width="3.6" height="3.6" rx="0.5" fill="#111827"/>
          <rect x="2.5" y="11.8" width="3.6" height="3.6" rx="0.5" fill="#111827"/>
          <rect x="8.2" y="11.8" width="3.6" height="3.6" rx="0.5" fill="#111827"/>
          <rect x="13.9" y="11.8" width="3.6" height="3.6" rx="0.5" fill="#111827"/>
        </svg>`;
      case 'smallStraight':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="2.5" y="2.5" width="3.4" height="3.4" rx="0.5" fill="#111827"/>
          <rect x="6.5" y="6.5" width="3.4" height="3.4" rx="0.5" fill="#111827"/>
          <rect x="10.5" y="10.5" width="3.4" height="3.4" rx="0.5" fill="#111827"/>
          <rect x="14.5" y="14.5" width="3.4" height="3.4" rx="0.5" fill="#111827"/>
        </svg>`;
      case 'largeStraight':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="2.5" y="2.5" width="3.2" height="3.2" rx="0.5" fill="#111827"/>
          <rect x="5.5" y="7.5" width="3.2" height="3.2" rx="0.5" fill="#111827"/>
          <rect x="8.4" y="12.5" width="3.2" height="3.2" rx="0.5" fill="#111827"/>
          <rect x="11.3" y="7.5" width="3.2" height="3.2" rx="0.5" fill="#111827"/>
          <rect x="14.3" y="2.5" width="3.2" height="3.2" rx="0.5" fill="#111827"/>
        </svg>`;
      case 'yacht':
        return `<svg class="cat-svg-icon" viewBox="0 0 20 20" width="20" height="20">
          <rect x="2.5" y="2.5" width="3.5" height="3.5" rx="0.5" fill="#111827"/>
          <rect x="14" y="2.5" width="3.5" height="3.5" rx="0.5" fill="#111827"/>
          <rect x="8.25" y="8.25" width="3.5" height="3.5" rx="0.5" fill="#111827"/>
          <rect x="2.5" y="14" width="3.5" height="3.5" rx="0.5" fill="#111827"/>
          <rect x="14" y="14" width="3.5" height="3.5" rx="0.5" fill="#111827"/>
        </svg>`;
      default:
        return '';
    }
  }

  // 1~6 주사위 눈별 기본 3D CSS 회전 각도 (X, Y)
  const FACE_ROTATIONS = {
    1: { x: 0,    y: 0 },
    2: { x: 0,    y: -90 },
    3: { x: -90,  y: 0 },
    4: { x: 90,   y: 0 },
    5: { x: 0,    y: 90 },
    6: { x: 0,    y: 180 }
  };

  let _container = null;
  let _onResult  = null;
  let _context   = null;

  let isHost     = false;
  let myId       = '';
  let players    = [];
  let currentTurnIdx = 0;
  let currentRound   = 1;
  const TOTAL_ROUNDS = 12;

  // 턴 상태
  let diceValues       = [1, 2, 3, 4, 5];
  let keptDice         = [false, false, false, false, false];
  let keeperSlotOfDie  = [null, null, null, null, null]; // 각 주사위가 위치한 원목 슬롯 번호 (0~4)
  let rollsLeft        = 3;
  let isRolling        = false;
  let isShaking        = false;
  let isGameOver       = false;
  let activeTooltipCat = null;
  let alignTimeoutIds  = [];
  let comboOverlayTimer = null;
  let comboFadeTimer   = null;

  // 🌟 부드러운 60fps 주사위 물리 텀블링 상태
  let animFrameId   = null;
  let diceRotAngles = [
    { x: 0, y: 0, z: 0, vx: 20, vy: 26, vz: 14 },
    { x: 0, y: 0, z: 0, vx: -24, vy: 22, vz: -16 },
    { x: 0, y: 0, z: 0, vx: 22, vy: -28, vz: 18 },
    { x: 0, y: 0, z: 0, vx: -20, vy: -24, vz: -16 },
    { x: 0, y: 0, z: 0, vx: 26, vy: 20, vz: 20 }
  ];

  // 점수표 데이터
  let scoreSheets = {};

  /* ═══════════════════════════════════════════════════════════════
     초기화 & DOM 렌더링
     ═══════════════════════════════════════════════════════════════ */
  function init(container, onResult, context) {
    _container = container;
    _onResult  = onResult;
    _context   = context || {};

    isHost  = P2P.isHost();
    myId    = String(P2P.getMyId() || '');
    players = (_context.players && _context.players.length > 0)
      ? _context.players
      : [{ id: myId, name: _context.myNickname || '플레이어', isHost: true }];

    currentTurnIdx = 0;
    currentRound   = 1;
    isGameOver     = false;
    activeTooltipCat = null;
    _clearAlignTimeouts();
    _hideComboOverlay();

    scoreSheets = {};
    players.forEach(p => {
      scoreSheets[p.id] = {};
      CATEGORIES.forEach(cat => {
        scoreSheets[p.id][cat.key] = null;
      });
    });

    // 3인 이상 플레이 시 와이드 모드 적용
    if (players.length >= 3) {
      const layout = document.querySelector('.game-main-layout');
      if (layout) layout.classList.add('yacht-wide-mode');
    }

    _resetTurnState();
    _buildLayout();
    P2P.onMessage(_onMessage);

    _updateTurnHeader();
    _renderScoreSheet();
    _updateDiceDisplay();

    // 외부 클릭 시 말풍선 닫기
    document.addEventListener('click', _onDocumentClick);
  }

  function _onDocumentClick(e) {
    if (!activeTooltipCat) return;
    if (e.target.closest('.cat-interactive') || e.target.closest('.cat-tooltip-bubble')) {
      return;
    }
    activeTooltipCat = null;
    _renderScoreSheet();
  }

  function _clearAlignTimeouts() {
    alignTimeoutIds.forEach(id => clearTimeout(id));
    alignTimeoutIds = [];
  }

  function _resetTurnState() {
    _clearAlignTimeouts();
    _hideComboOverlay();
    diceValues      = [1, 2, 3, 4, 5];
    keptDice        = [false, false, false, false, false];
    keeperSlotOfDie = [null, null, null, null, null];
    rollsLeft       = 3;
    isRolling       = false;
    isShaking       = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    // 기본 회전각도 리셋
    for (let i = 0; i < 5; i++) {
      const rot = FACE_ROTATIONS[i + 1];
      diceRotAngles[i].x = rot.x;
      diceRotAngles[i].y = rot.y;
      diceRotAngles[i].z = 0;
    }
  }

  function _buildLayout() {
    _container.innerHTML = `
      <div class="yacht-wrap">
        <!-- 1. 상단 정보 바 (현재 턴 & 라운드 & 잔여 굴림) -->
        <div class="yacht-header card">
          <div class="yh-meta">
            <span class="yh-round-badge" id="yh-round-badge"><i class="fa-solid fa-trophy"></i> 라운드 ${currentRound} / ${TOTAL_ROUNDS}</span>
            <div class="turn-label" id="yh-turn-label">
              <i class="fa-solid fa-dice"></i>
              <span id="yh-turn-text">내 턴</span>
            </div>
            <div class="yh-rolls-badge" id="yh-rolls-badge">
              <span>남은 굴림: </span>
              <strong id="yh-rolls-count" class="rolls-3">3회</strong>
            </div>
          </div>
        </div>

        <!-- 2. 중앙 메인 플레이 영역 (3D 주사위 보드 + 점수표) -->
        <div class="yacht-main-grid">
          
          <!-- 좌측: 3D 주사위 보드 & 굴리기/홀드 컨트롤 -->
          <div class="yacht-board card">
            <div class="yacht-section-title">
              <span><i class="fa-solid fa-cubes"></i> 주사위 트레이</span>
              <span class="yh-sub-hint">주사위를 클릭하여 보관하세요</span>
            </div>

            <!-- 🌟 일체형 원목 3D 주사위 테이블 (상단 벨벳 롤링 존 + 하단 5칸 일체형 원목 슬롯) -->
            <div class="dice-tray-table" id="dice-tray-table">
              
              <!-- 1. 상단 벨벳 롤링 존 (트레이의 주사위들은 항상 자연스러운 가운데 정렬) -->
              <div class="dice-felt-area" id="dice-felt-area">
                <div class="dice-rolling-row" id="dice-rolling-row">
                  ${[0, 1, 2, 3, 4].map(i => `
                    <div class="dice-slot in-tray" id="dice-slot-${i}" data-index="${i}">
                      <div class="dice-3d-wrap" id="dice-wrap-${i}">
                        <div class="dice-cube" id="dice-cube-${i}">
                          <!-- 면 1 (앞) -->
                          <div class="face face-1"><span class="pip pip-c pip-red"></span></div>
                          <!-- 면 2 (우) -->
                          <div class="face face-2"><span class="pip pip-tl"></span><span class="pip pip-br"></span></div>
                          <!-- 면 3 (상) -->
                          <div class="face face-3"><span class="pip pip-tl"></span><span class="pip pip-c"></span><span class="pip pip-br"></span></div>
                          <!-- 면 4 (하) -->
                          <div class="face face-4"><span class="pip pip-tl"></span><span class="pip pip-tr"></span><span class="pip pip-bl"></span><span class="pip pip-br"></span></div>
                          <!-- 면 5 (좌) -->
                          <div class="face face-5"><span class="pip pip-tl"></span><span class="pip pip-tr"></span><span class="pip pip-c"></span><span class="pip pip-bl"></span><span class="pip pip-br"></span></div>
                          <!-- 면 6 (뒤) -->
                          <div class="face face-6"><span class="pip pip-tl"></span><span class="pip pip-tr"></span><span class="pip pip-ml"></span><span class="pip pip-mr"></span><span class="pip pip-bl"></span><span class="pip pip-br"></span></div>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <!-- 🌟 주사위 표면을 덮는 1초 팝업 족보 오버레이 (자연스러운 페이드아웃) -->
                <div class="dice-combo-overlay hidden" id="dice-combo-overlay">
                  <div class="dice-combo-pill" id="dice-combo-pill"></div>
                </div>
              </div>

              <!-- 2. 하단 자연스럽게 붙은 일체형 원목 5칸 수납 슬롯 존 -->
              <div class="dice-wood-shelf" id="dice-wood-shelf">
                ${[0, 1, 2, 3, 4].map(i => `
                  <div class="wood-slot" id="wood-slot-${i}" data-index="${i}"></div>
                `).join('')}
              </div>

            </div>

            <!-- 주사위 굴리기 버튼 -->
            <div class="dice-action-area">
              <button type="button" class="btn-roll-dice" id="btn-roll-dice">
                <div class="btn-roll-inner">
                  <i class="fa-solid fa-shuffle"></i>
                  <span id="btn-roll-text">주사위 굴리기</span>
                </div>
              </button>
            </div>
          </div>

          <!-- 우측: 점수표 (Score Sheet) -->
          <div class="yacht-scoresheet card">
            <div class="scoresheet-table-wrap">
              <table class="scoresheet-table" id="scoresheet-table">
                <thead>
                  <tr id="st-head-row">
                    <th class="col-category">Categories</th>
                    ${players.map(p => `
                      <th class="col-player ${String(p.id) === String(myId) ? 'my-col' : ''}">
                        <div class="th-player-name" title="${_escapeHtml(p.name)}">${_escapeHtml(p.name)}</div>
                      </th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody id="st-body">
                  <!-- 동적 렌더링 -->
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    `;

    _bindDiceSlotEvents();
    _bindRollButtonEvents();
  }

  /* ═══════════════════════════════════════════════════════════════
     3D 주사위 렌더링 & 트레이/원목 슬롯 부드러운 이동 (원목 슬롯 고정 위치)
     ═══════════════════════════════════════════════════════════════ */
  function _bindDiceSlotEvents() {
    const table = document.getElementById('dice-tray-table');
    if (!table) return;

    table.addEventListener('click', (e) => {
      const slot = e.target.closest('.dice-slot');
      if (!slot) return;
      if (!_isMyTurn() || rollsLeft === 3 || isRolling || isShaking || isGameOver) return;
      const idx = parseInt(slot.dataset.index, 10);
      if (isNaN(idx)) return;
      _toggleKeep(idx, true);
    });
  }

  function _updateDiceDisplay(toggledIdx, isToKeeper) {
    const rollingRow = document.getElementById('dice-rolling-row');
    if (!rollingRow) return;

    const canClick = _isMyTurn() && rollsLeft < 3 && !isRolling && !isGameOver;

    // 1. 클릭 가능 여부 및 각도 적용
    for (let i = 0; i < 5; i++) {
      const slotEl = document.getElementById(`dice-slot-${i}`);
      const cubeEl = document.getElementById(`dice-cube-${i}`);
      const val = diceValues[i] || (i + 1);

      if (slotEl) {
        if (canClick) slotEl.classList.add('clickable');
        else slotEl.classList.remove('clickable');
      }

      if (cubeEl && !isShaking) {
        const rot = FACE_ROTATIONS[val] || { x: 0, y: 0 };
        cubeEl.style.transform = `rotateX(${rot.x}deg) rotateY(${rot.y}deg) rotateZ(0deg)`;
      }
    }

    // 2. 트레이 주사위 배치 (unheld 주사위들을 rollingRow에 순서대로 배치하여 가운데 정렬 유지)
    for (let i = 0; i < 5; i++) {
      if (!keptDice[i]) {
        const slotEl = document.getElementById(`dice-slot-${i}`);
        if (slotEl) {
          slotEl.className = 'dice-slot in-tray' + (canClick ? ' clickable' : '');
          rollingRow.appendChild(slotEl);
        }
      }
    }

    // 3. 🌟 수납함 주사위 배치: 각 주사위의 고유 지정 슬롯(keeperSlotOfDie[i])에 배치!
    // (다른 주사위가 빠져도 남은 주사위들은 왼쪽으로 당겨지지 않고 제자리를 지킴)
    for (let slotIdx = 0; slotIdx < 5; slotIdx++) {
      const woodSlot = document.getElementById(`wood-slot-${slotIdx}`);
      if (!woodSlot) continue;

      // 이 슬롯을 차지하고 있는 주사위 찾기
      const dieIdx = keeperSlotOfDie.indexOf(slotIdx);
      if (dieIdx !== -1 && keptDice[dieIdx]) {
        const slotEl = document.getElementById(`dice-slot-${dieIdx}`);
        if (slotEl) {
          slotEl.className = 'dice-slot in-keeper' + (canClick ? ' clickable' : '');
          woodSlot.appendChild(slotEl);
        }
        woodSlot.classList.add('has-die');
      } else {
        woodSlot.classList.remove('has-die');
      }
    }

    // 4. 방금 클릭하여 이동한 단 1개의 주사위에만 슉 이동하는 스우프 애니메이션 적용 (다른 주사위 들썩임 0)
    if (toggledIdx !== undefined && toggledIdx !== null) {
      const targetSlot = document.getElementById(`dice-slot-${toggledIdx}`);
      if (targetSlot) {
        const animClass = isToKeeper ? 'anim-to-keeper' : 'anim-to-tray';
        targetSlot.classList.add(animClass);
        setTimeout(() => {
          if (targetSlot) targetSlot.classList.remove(animClass);
        }, 260);
      }
    }
  }

  function _toggleKeep(idx, isLocal) {
    if (keptDice[idx]) {
      // 수납함 -> 트레이로 꺼내기
      keptDice[idx] = false;
      keeperSlotOfDie[idx] = null;
      _updateDiceDisplay(idx, false);
    } else {
      // 트레이 -> 수납함으로 넣기 (현재 비어있는 가장 왼쪽 슬롯 번호 찾아서 배정)
      const occupiedSlots = [];
      for (let i = 0; i < 5; i++) {
        if (keptDice[i] && keeperSlotOfDie[i] !== null) {
          occupiedSlots.push(keeperSlotOfDie[i]);
        }
      }
      const freeSlot = [0, 1, 2, 3, 4].find(s => !occupiedSlots.includes(s));
      keeperSlotOfDie[idx] = (freeSlot !== undefined) ? freeSlot : 0;
      keptDice[idx] = true;
      _updateDiceDisplay(idx, true);
    }

    _renderScoreSheet();
    if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();

    if (isLocal) {
      P2P.send({
        type: 'YACHT_TOGGLE_KEEP',
        idx: idx,
        kept: keptDice[idx],
        keptDice: [...keptDice],
        keeperSlotOfDie: [...keeperSlotOfDie]
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     주사위 굴리기 & 60fps 텀블링 감속 착지 & 트레이 주사위만 3D 회전 순차 정렬
     ═══════════════════════════════════════════════════════════════ */
  function _bindRollButtonEvents() {
    const btn = document.getElementById('btn-roll-dice');
    if (!btn) return;

    const onStart = (e) => {
      if (!_isMyTurn() || rollsLeft <= 0 || isRolling || isGameOver) return;
      e.preventDefault();
      _startShaking(true);
    };

    const onEnd = (e) => {
      if (!isShaking || !_isMyTurn()) return;
      e.preventDefault();
      _finishRoll(true);
    };

    btn.addEventListener('mousedown', onStart);
    window.addEventListener('mouseup', onEnd);

    btn.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  function _startShaking(isLocal) {
    if (isShaking || isRolling) return;
    isShaking = true;
    _clearAlignTimeouts();
    _hideComboOverlay();

    const btn = document.getElementById('btn-roll-dice');
    if (btn) btn.classList.add('shaking');
    if (typeof Sound !== 'undefined' && Sound.playDing) Sound.playDing();

    for (let i = 0; i < 5; i++) {
      if (keptDice[i]) continue;
      const cube = document.getElementById(`dice-cube-${i}`);
      if (cube) cube.style.transition = 'none';
    }

    // 🌟 트레이에 있는 주사위들만 60fps 실시간 부드러운 물리 텀블링 회전
    let lastTimestamp = performance.now();
    const tumbleLoop = (now) => {
      if (!isShaking) return;
      const dt = Math.min(32, now - lastTimestamp) / 16.67;
      lastTimestamp = now;

      for (let i = 0; i < 5; i++) {
        if (keptDice[i]) continue;
        const d = diceRotAngles[i];
        d.x = (d.x + d.vx * dt) % 360;
        d.y = (d.y + d.vy * dt) % 360;
        d.z = (d.z + d.vz * dt) % 360;

        const cube = document.getElementById(`dice-cube-${i}`);
        if (cube) {
          cube.style.transform = `rotateX(${d.x}deg) rotateY(${d.y}deg) rotateZ(${d.z}deg)`;
        }
      }
      animFrameId = requestAnimationFrame(tumbleLoop);
    };

    animFrameId = requestAnimationFrame(tumbleLoop);

    if (isLocal) {
      P2P.send({ type: 'YACHT_START_SHAKE' });
    }
  }

  function _getNearestTargetAngle(currentAngle, targetAngle) {
    const diff = ((targetAngle - currentAngle) % 360 + 540) % 360 - 180;
    return currentAngle + diff;
  }

  function _finishRoll(isLocal, forcedValues, forcedRollsLeft) {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    isShaking = false;
    isRolling = true;

    const btn = document.getElementById('btn-roll-dice');
    if (btn) btn.classList.remove('shaking');

    if (typeof forcedRollsLeft === 'number') {
      rollsLeft = forcedRollsLeft;
    } else {
      rollsLeft = Math.max(0, rollsLeft - 1);
    }

    // 트레이에 있는 주사위만 새로운 눈 생성 (수납함 주사위는 눈 불변)
    const rawValues = [...diceValues];
    for (let i = 0; i < 5; i++) {
      if (!keptDice[i]) {
        rawValues[i] = (forcedValues && forcedValues[i]) ? forcedValues[i] : Math.floor(1 + Math.random() * 6);
      }
    }
    diceValues = rawValues;

    // 🌟 로컬 롤링 즉시 P2P 패킷을 모든 피어에게 전송하여 완벽 동기화 시작!
    if (isLocal) {
      P2P.send({
        type: 'YACHT_ROLL_RESULT',
        diceValues: diceValues,
        keptDice: keptDice,
        keeperSlotOfDie: keeperSlotOfDie,
        rollsLeft: rollsLeft
      });
    }

    if (typeof Sound !== 'undefined' && Sound.playStart) Sound.playStart();

    // 🌟 1. 트레이 위의 주사위만 현재 각도에서 목표 면으로 최단거리로 부드럽게 감속 착지!
    for (let i = 0; i < 5; i++) {
      if (keptDice[i]) continue;
      const cube = document.getElementById(`dice-cube-${i}`);
      const val = diceValues[i] || 1;
      const rot = FACE_ROTATIONS[val] || { x: 0, y: 0 };
      const d = diceRotAngles[i];

      if (cube) {
        cube.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)';
        const targetX = _getNearestTargetAngle(d.x, rot.x);
        const targetY = _getNearestTargetAngle(d.y, rot.y);
        const targetZ = _getNearestTargetAngle(d.z, 0);

        cube.style.transform = `rotateX(${targetX}deg) rotateY(${targetY}deg) rotateZ(${targetZ}deg)`;
        d.x = targetX;
        d.y = targetY;
        d.z = targetZ;
      }
    }

    // 🌟 2. 수납함의 주사위는 정렬에서 완벽히 배제! 오직 트레이(unheld) 주사위들만 오름차순 정렬 계산
    const unheldIndices = [];
    for (let i = 0; i < 5; i++) {
      if (!keptDice[i]) unheldIndices.push(i);
    }

    const unheldVals = unheldIndices.map(i => rawValues[i]);
    const sortedUnheldVals = [...unheldVals].sort((a, b) => a - b);

    // 🌟 3. 착지 후 450ms 정지 텀을 둔 후, 트레이 주사위들만 3D 회전하며 순차 정렬!
    const landTimer = setTimeout(() => {
      _clearAlignTimeouts();

      unheldIndices.forEach((dieIdx, step) => {
        const stepTimer = setTimeout(() => {
          const targetVal = sortedUnheldVals[step];
          const isChanged = (diceValues[dieIdx] !== targetVal);

          diceValues[dieIdx] = targetVal;

          const cube = document.getElementById(`dice-cube-${dieIdx}`);
          const targetRot = FACE_ROTATIONS[targetVal] || { x: 0, y: 0 };
          const d = diceRotAngles[dieIdx];

          if (cube) {
            cube.style.transition = 'transform 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            const targetX = _getNearestTargetAngle(d.x, targetRot.x);
            const targetY = _getNearestTargetAngle(d.y, targetRot.y);
            cube.style.transform = `rotateX(${targetX}deg) rotateY(${targetY}deg) rotateZ(0deg)`;
            d.x = targetX;
            d.y = targetY;
            d.z = 0;
          }

          _updateDiceDisplay();

          if (isChanged) {
            const slot = document.getElementById(`dice-slot-${dieIdx}`);
            if (slot) {
              slot.classList.add('align-pop');
              setTimeout(() => slot.classList.remove('align-pop'), 250);
            }
            if (typeof Sound !== 'undefined' && Sound.playDiceAlign) {
              Sound.playDiceAlign(step);
            }
          }
        }, step * 125);
        alignTimeoutIds.push(stepTimer);
      });

      // 4. 모든 트레이 주사위 정렬 완료 시점
      const finishTimer = setTimeout(() => {
        isRolling = false;
        unheldIndices.forEach((dieIdx, step) => {
          diceValues[dieIdx] = sortedUnheldVals[step];
        });

        _updateDiceDisplay();
        _updateRollsUI();
        _renderScoreSheet();

        // 🌟 족보 알림: 1초간 팝업 후 부드러운 페이드아웃
        const combo = _detectSpecialCombo(diceValues);
        if (combo) {
          _showComboOverlay(combo);
        }
      }, unheldIndices.length * 125 + 50);
      alignTimeoutIds.push(finishTimer);

    }, 450);
    alignTimeoutIds.push(landTimer);
  }

  /* ═══════════════════════════════════════════════════════════════
     족보 감지 (S-Straight, 4 of a Kind 등) & 자연스러운 페이드아웃 오버레이
     ═══════════════════════════════════════════════════════════════ */
  function _detectSpecialCombo(dice) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    dice.forEach(v => counts[v]++);

    const curPlayer = players[currentTurnIdx];
    const sheet = (curPlayer && scoreSheets[curPlayer.id]) ? scoreSheets[curPlayer.id] : {};

    // 1. Yacht (현재 턴인 플레이어가 아직 야추 점수를 안 냈을 때만 알림)
    if (counts.includes(5) && sheet['yacht'] === null) {
      return { name: 'Yacht', isYacht: true };
    }

    // 2. Large Straight
    const l1 = counts[1] && counts[2] && counts[3] && counts[4] && counts[5];
    const l2 = counts[2] && counts[3] && counts[4] && counts[5] && counts[6];
    if ((l1 || l2) && sheet['largeStraight'] === null) {
      return { name: 'L-Straight', isYacht: false };
    }

    // 3. Small Straight
    const s1 = counts[1] && counts[2] && counts[3] && counts[4];
    const s2 = counts[2] && counts[3] && counts[4] && counts[5];
    const s3 = counts[3] && counts[4] && counts[5] && counts[6];
    if ((s1 || s2 || s3) && sheet['smallStraight'] === null) {
      return { name: 'S-Straight', isYacht: false };
    }

    // 4. Full House
    const has3 = counts.includes(3), has2 = counts.includes(2);
    if (has3 && has2 && sheet['fullHouse'] === null) {
      return { name: 'Full House', isYacht: false };
    }

    // 5. 4 of a Kind
    if (counts.some(c => c >= 4) && sheet['fourKind'] === null) {
      return { name: '4 of a Kind', isYacht: false };
    }

    return null;
  }

  function _showComboOverlay(combo) {
    _hideComboOverlay();
    if (!combo) return;

    const overlay = document.getElementById('dice-combo-overlay');
    const pill = document.getElementById('dice-combo-pill');
    if (!overlay || !pill) return;

    pill.className = 'dice-combo-pill' + (combo.isYacht ? ' is-yacht' : '');
    pill.textContent = combo.name;

    overlay.className = 'dice-combo-overlay';

    if (typeof Sound !== 'undefined' && Sound.playComboAnnouncement) {
      Sound.playComboAnnouncement(combo.isYacht);
    }

    // 🌟 화면에 떠 있는 시간을 1초로 단축 + 0.65초 뒤 부드럽고 자연스러운 페이드아웃 시작
    comboFadeTimer = setTimeout(() => {
      overlay.classList.add('fade-out');
    }, 650);

    comboOverlayTimer = setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.classList.remove('fade-out');
    }, 1050);
  }

  function _hideComboOverlay() {
    if (comboFadeTimer) { clearTimeout(comboFadeTimer); comboFadeTimer = null; }
    if (comboOverlayTimer) { clearTimeout(comboOverlayTimer); comboOverlayTimer = null; }
    const overlay = document.getElementById('dice-combo-overlay');
    if (overlay) {
      overlay.className = 'dice-combo-overlay hidden';
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     족보 점수 계산 & 점수표 렌더링
     ═══════════════════════════════════════════════════════════════ */
  function _calculateCategoryScore(catKey, dice) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    let sum = 0;
    dice.forEach(v => {
      counts[v]++;
      sum += v;
    });

    switch (catKey) {
      case 'aces':   return counts[1] * 1;
      case 'deuces': return counts[2] * 2;
      case 'threes': return counts[3] * 3;
      case 'fours':  return counts[4] * 4;
      case 'fives':  return counts[5] * 5;
      case 'sixes':  return counts[6] * 6;
      case 'choice': return sum;
      case 'fourKind':
        return counts.some(c => c >= 4) ? sum : 0;
      case 'fullHouse':
        const has3 = counts.includes(3), has2 = counts.includes(2), has5 = counts.includes(5);
        return (has3 && has2) || has5 ? sum : 0;
      case 'smallStraight':
        const s1 = counts[1] && counts[2] && counts[3] && counts[4];
        const s2 = counts[2] && counts[3] && counts[4] && counts[5];
        const s3 = counts[3] && counts[4] && counts[5] && counts[6];
        return (s1 || s2 || s3) ? 15 : 0;
      case 'largeStraight':
        const l1 = counts[1] && counts[2] && counts[3] && counts[4] && counts[5];
        const l2 = counts[2] && counts[3] && counts[4] && counts[5] && counts[6];
        return (l1 || l2) ? 30 : 0;
      case 'yacht':
        return counts.includes(5) ? 50 : 0;
      default:
        return 0;
    }
  }

  function _calculateUpperSubtotal(playerId) {
    const sheet = scoreSheets[playerId] || {};
    let subtotal = 0;
    ['aces', 'deuces', 'threes', 'fours', 'fives', 'sixes'].forEach(k => {
      if (typeof sheet[k] === 'number') subtotal += sheet[k];
    });
    return subtotal;
  }

  function _calculateTotalScore(playerId) {
    const sheet = scoreSheets[playerId] || {};
    let total = 0;
    CATEGORIES.forEach(cat => {
      if (typeof sheet[cat.key] === 'number') total += sheet[cat.key];
    });
    const upperSub = _calculateUpperSubtotal(playerId);
    if (upperSub >= 63) total += 35;
    return total;
  }

  function _renderScoreSheet() {
    const tbody = document.getElementById('st-body');
    if (!tbody) return;

    let html = '';

    // 1. 상단 6개 항목 (Aces ~ Sixes)
    CATEGORIES.filter(c => c.section === 'upper').forEach(cat => {
      html += _renderCategoryRow(cat);
    });

    // 2. 상단 소계 (Subtotal 행)
    const isSubTooltipOpen = (activeTooltipCat === 'subtotal');
    html += `
      <tr class="row-subtotal">
        <td class="cat-cell cat-interactive" data-cat="subtotal">
          <div class="cat-cell-inner">
            <strong class="cat-name">Subtotal</strong>
            ${isSubTooltipOpen ? `
              <div class="cat-tooltip-bubble" id="tooltip-subtotal">
                <div class="tooltip-header">
                  <strong>Subtotal</strong>
                  <span class="tooltip-close" data-cat="subtotal">&times;</span>
                </div>
                <div class="tooltip-body">상단 6개 항목(Aces ~ Sixes) 점수의 총합입니다. (63점 이상 시 +35점 보너스 획득)</div>
              </div>
            ` : ''}
          </div>
        </td>
        ${players.map(p => {
          const sub = _calculateUpperSubtotal(p.id);
          const hasBonus = sub >= 63;
          return `
            <td class="score-cell subtotal-cell ${String(p.id) === String(myId) ? 'my-col' : ''}">
              <div class="subtotal-val ${hasBonus ? 'bonus-achieved' : ''}">${sub} / 63</div>
            </td>
          `;
        }).join('')}
      </tr>
    `;

    // 3. +35 보너스 (별개 행)
    const isBonusTooltipOpen = (activeTooltipCat === 'bonus');
    html += `
      <tr class="row-bonus">
        <td class="cat-cell cat-interactive" data-cat="bonus">
          <div class="cat-cell-inner">
            <strong class="cat-name">+35 Bonus</strong>
            ${isBonusTooltipOpen ? `
              <div class="cat-tooltip-bubble" id="tooltip-bonus">
                <div class="tooltip-header">
                  <strong>+35 Bonus</strong>
                  <span class="tooltip-close" data-cat="bonus">&times;</span>
                </div>
                <div class="tooltip-body">상단 항목의 총합이 63점 이상일 경우, 보너스로 35점이 추가 부여됩니다.</div>
              </div>
            ` : ''}
          </div>
        </td>
        ${players.map(p => {
          const sub = _calculateUpperSubtotal(p.id);
          const hasBonus = sub >= 63;
          return `
            <td class="score-cell bonus-cell ${String(p.id) === String(myId) ? 'my-col' : ''}">
              ${hasBonus ? '<span class="bonus-val-small">35</span>' : '<span class="bonus-val-empty">-</span>'}
            </td>
          `;
        }).join('')}
      </tr>
    `;

    // 4. 하단 6개 항목 (Choice ~ Yacht)
    CATEGORIES.filter(c => c.section === 'lower').forEach(cat => {
      html += _renderCategoryRow(cat);
    });

    // 5. 최종 총점 (Total)
    html += `
      <tr class="row-total">
        <td class="cat-cell">
          <div class="cat-cell-inner">
            <strong class="cat-name">Total</strong>
          </div>
        </td>
        ${players.map(p => `
          <td class="score-cell total-cell ${String(p.id) === String(myId) ? 'my-col' : ''}">
            <strong>${_calculateTotalScore(p.id)}점</strong>
          </td>
        `).join('')}
      </tr>
    `;

    tbody.innerHTML = html;
    _bindCategoryTooltipEvents();
    _bindScoreCellEvents();
  }

  function _renderCategoryRow(cat) {
    const isTooltipOpen = (activeTooltipCat === cat.key);
    const iconSvg = _getCategoryIconSvg(cat.key);

    return `
      <tr class="row-category" data-cat="${cat.key}">
        <!-- 🌟 카테고리 셀: 사진과 100% 동일한 픽셀/다이스 SVG 아이콘 + 괄호 없이 깔끔 1줄 표시 -->
        <td class="cat-cell cat-interactive" data-cat="${cat.key}">
          <div class="cat-cell-inner">
            ${iconSvg}
            <strong class="cat-name">${cat.name}</strong>
            ${isTooltipOpen ? `
              <div class="cat-tooltip-bubble" id="tooltip-${cat.key}">
                <div class="tooltip-header">
                  <strong>${cat.name}</strong>
                  <span class="tooltip-close" data-cat="${cat.key}">&times;</span>
                </div>
                <div class="tooltip-body">${cat.desc}</div>
              </div>
            ` : ''}
          </div>
        </td>
        ${players.map(p => {
          const isDev = !!(_context && _context.isDevMode);
          const isTurnPlayer = (String(p.id) === String(players[currentTurnIdx]?.id));
          const isMe = isDev ? isTurnPlayer : (String(p.id) === String(myId));
          const confirmedVal = scoreSheets[p.id][cat.key];
          const isConfirmed = (typeof confirmedVal === 'number');

          // 내 턴 또는 상대방 턴 실시간 예상 점수 프리뷰
          let previewVal = null;
          if (isTurnPlayer && !isConfirmed && rollsLeft < 3 && !isRolling && !isShaking && !isGameOver) {
            previewVal = _calculateCategoryScore(cat.key, diceValues);
          }

          let content = '';
          let cellClass = 'score-cell';
          if (isMe) cellClass += ' my-col';

          if (isConfirmed) {
            cellClass += ' confirmed';
            content = `<span class="score-val confirmed">${confirmedVal}</span>`;
          } else if (previewVal !== null) {
            if (isMe || (isDev && isTurnPlayer)) {
              cellClass += ' preview-active clickable';
              content = `<span class="score-val preview my-preview">${previewVal}</span>`;
            } else {
              cellClass += ' opp-preview-cell';
              content = `<span class="score-val preview opp-preview">${previewVal}</span>`;
            }
          } else {
            content = `<span class="score-val empty">-</span>`;
          }

          return `
            <td class="${cellClass}" data-player="${p.id}" data-cat="${cat.key}">
              ${content}
            </td>
          `;
        }).join('')}
      </tr>
    `;
  }

  function _bindCategoryTooltipEvents() {
    _container.querySelectorAll('.cat-interactive').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.tooltip-close')) {
          e.stopPropagation();
          activeTooltipCat = null;
          _renderScoreSheet();
          return;
        }
        if (e.target.closest('.cat-tooltip-bubble')) {
          return;
        }
        const catKey = cell.dataset.cat;
        activeTooltipCat = (activeTooltipCat === catKey) ? null : catKey;
        _renderScoreSheet();
      });
    });
  }

  function _bindScoreCellEvents() {
    if (!_isMyTurn() || rollsLeft === 3 || isRolling || isShaking || isGameOver) return;

    _container.querySelectorAll('.score-cell.clickable').forEach(cell => {
      cell.addEventListener('click', () => {
        const catKey = cell.dataset.cat;
        if (!catKey) return;
        _confirmScore(catKey, true);
      });
    });
  }

  function _confirmScore(catKey, isLocal) {
    const curPlayer = players[currentTurnIdx];
    if (!curPlayer) return;

    const score = _calculateCategoryScore(catKey, diceValues);
    scoreSheets[curPlayer.id][catKey] = score;

    if (typeof Sound !== 'undefined' && Sound.playWordSubmit) Sound.playWordSubmit();

    const nextTurn = (currentTurnIdx + 1) % players.length;
    const nextRound = (nextTurn === 0) ? (currentRound + 1) : currentRound;

    if (isLocal) {
      P2P.send({
        type: 'YACHT_CONFIRM_SCORE',
        catKey: catKey,
        score: score,
        playerId: curPlayer.id,
        nextTurnIdx: nextTurn,
        round: nextRound
      });
    }

    _advanceToNextTurn(nextTurn, nextRound);
  }

  function _advanceToNextTurn(forcedNextTurn, forcedRound) {
    if (typeof forcedNextTurn === 'number') {
      currentTurnIdx = forcedNextTurn;
      if (typeof forcedRound === 'number') {
        currentRound = forcedRound;
      }
    } else {
      currentTurnIdx = (currentTurnIdx + 1) % players.length;
      if (currentTurnIdx === 0) currentRound++;
    }

    if (currentRound > TOTAL_ROUNDS) {
      _finishGame();
      return;
    }

    _resetTurnState();
    _updateTurnHeader();
    _updateDiceDisplay();
    _renderScoreSheet();
  }

  function _finishGame() {
    isGameOver = true;

    const leaderboard = players.map(p => ({
      id: p.id,
      name: p.name,
      score: _calculateTotalScore(p.id)
    })).sort((a, b) => b.score - a.score);

    const winner = leaderboard[0];
    const iWon = (String(winner.id) === String(myId));

    if (typeof Sound !== 'undefined') {
      if (iWon && Sound.playWin) Sound.playWin();
      else if (Sound.playLose) Sound.playLose();
    }

    setTimeout(() => {
      if (_onResult) _onResult(iWon, null, leaderboard);
    }, 1500);
  }

  function _updateRollsUI() {
    const rollsEl = document.getElementById('yh-rolls-count');
    const btn = document.getElementById('btn-roll-dice');
    const btnText = document.getElementById('btn-roll-text');

    if (rollsEl) {
      rollsEl.textContent = `${rollsLeft}회`;
      rollsEl.className = `rolls-${rollsLeft}`;
    }

    if (btn) {
      const isSpectator = _context && _context.isSpectator;
      const canRoll = !isSpectator && _isMyTurn() && rollsLeft > 0 && !isGameOver;
      btn.disabled = !canRoll;
      if (btnText) {
        if (isSpectator) {
          btnText.textContent = '실시간 관전 중';
        } else {
          btnText.textContent = '주사위 굴리기';
        }
      }
    }
  }

  function _updateTurnHeader() {
    const roundBadge = document.getElementById('yh-round-badge');
    const turnLabel  = document.getElementById('yh-turn-label');
    const turnText   = document.getElementById('yh-turn-text');
    const curPlayer  = players[currentTurnIdx];
    const isMine     = _isMyTurn();
    const isSpectator = _context && _context.isSpectator;

    if (roundBadge) roundBadge.innerHTML = `<i class="fa-solid fa-trophy"></i> 라운드 ${currentRound} / ${TOTAL_ROUNDS}`;

    if (turnLabel) {
      turnLabel.className = 'turn-label ' + (isMine ? 'my-turn' : 'opp-turn');
    }
    if (turnText) {
      if (isSpectator) {
        turnText.textContent = `${curPlayer ? curPlayer.name : '플레이어'} 턴 (관전 중)`;
      } else {
        turnText.textContent = isMine ? '내 턴' : `${curPlayer ? curPlayer.name : '상대방'} 턴`;
      }
    }

    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      window.App.updateInGameTurn(currentTurnIdx);
    }

    _updateRollsUI();
  }

  /* ═══════════════════════════════════════════════════════════════
     P2P 메시지 라우터 & 호스트 릴레이 & 관전자 스냅샷
     ═══════════════════════════════════════════════════════════════ */
  function _onMessage(data, senderId) {
    if (!data || typeof data !== 'object') return;

    if (isHost && senderId && senderId !== 'host') {
      if (['YACHT_START_SHAKE', 'YACHT_ROLL_RESULT', 'YACHT_TOGGLE_KEEP', 'YACHT_CONFIRM_SCORE'].includes(data.type)) {
        P2P.send(data, null, senderId);
      }
    }

    switch (data.type) {
      case 'YACHT_START_SHAKE':
        if (_isMyTurn()) break;
        _startShaking(false);
        break;

      case 'YACHT_ROLL_RESULT':
        if (_isMyTurn()) break;
        rollsLeft = typeof data.rollsLeft === 'number' ? data.rollsLeft : Math.max(0, rollsLeft - 1);
        if (Array.isArray(data.keptDice)) keptDice = data.keptDice;
        if (Array.isArray(data.keeperSlotOfDie)) keeperSlotOfDie = data.keeperSlotOfDie;
        _finishRoll(false, data.diceValues, data.rollsLeft);
        break;

      case 'YACHT_TOGGLE_KEEP':
        if (_isMyTurn()) break;
        if (typeof data.idx === 'number') {
          if (typeof data.kept === 'boolean') {
            keptDice[data.idx] = data.kept;
          }
        }
        if (Array.isArray(data.keptDice)) keptDice = [...data.keptDice];
        if (Array.isArray(data.keeperSlotOfDie)) keeperSlotOfDie = [...data.keeperSlotOfDie];
        _updateDiceDisplay(data.idx, !!keptDice[data.idx]);
        _renderScoreSheet();
        if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();
        break;

      case 'YACHT_CONFIRM_SCORE':
        if (_isMyTurn()) break;
        if (scoreSheets[data.playerId]) {
          scoreSheets[data.playerId][data.catKey] = data.score;
        }
        if (typeof Sound !== 'undefined' && Sound.playWordSubmit) Sound.playWordSubmit();
        _advanceToNextTurn(data.nextTurnIdx, data.round);
        break;

      case 'YACHT_SNAPSHOT':
        if (data.scoreSheets) scoreSheets = data.scoreSheets;
        if (typeof data.currentTurnIdx === 'number') currentTurnIdx = data.currentTurnIdx;
        if (typeof data.currentRound === 'number') currentRound = data.currentRound;
        if (Array.isArray(data.diceValues)) diceValues = data.diceValues;
        if (Array.isArray(data.keptDice)) keptDice = data.keptDice;
        if (Array.isArray(data.keeperSlotOfDie)) keeperSlotOfDie = data.keeperSlotOfDie;
        if (typeof data.rollsLeft === 'number') rollsLeft = data.rollsLeft;
        _updateTurnHeader();
        _updateDiceDisplay();
        _renderScoreSheet();
        break;
    }
  }

  // 🌟 관전자가 중간 입장했을 때 호스트가 보내는 스냅샷
  function sendSnapshotTo(targetPeerId) {
    if (!isHost) return;
    P2P.send({
      type: 'YACHT_SNAPSHOT',
      scoreSheets: scoreSheets,
      currentTurnIdx: currentTurnIdx,
      currentRound: currentRound,
      diceValues: diceValues,
      keptDice: keptDice,
      keeperSlotOfDie: keeperSlotOfDie,
      rollsLeft: rollsLeft
    }, targetPeerId);
  }

  /* ─── 헬퍼 ─── */
  function _isMyTurn() {
    if (_context && _context.isDevMode) return true;
    if (_context && _context.isSpectator) return false;
    const curPlayer = players[currentTurnIdx];
    if (!curPlayer) return false;
    return String(curPlayer.id) === String(myId);
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function destroy() {
    _clearAlignTimeouts();
    _hideComboOverlay();
    document.removeEventListener('click', _onDocumentClick);
    P2P.offMessage(_onMessage);
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    isGameOver = true;
    const layout = document.querySelector('.game-main-layout');
    if (layout) layout.classList.remove('yacht-wide-mode');
  }

  /* ── 인게임 탈주 처리 ── */
  function removePlayer(playerId) {
    const idx = players.findIndex(p => String(p.id) === String(playerId));
    if (idx === -1) return;
    players.splice(idx, 1);
    if (currentTurnIdx >= players.length) currentTurnIdx = 0;
    if (players.length === 1) {
      const winner = players[0];
      const myId = (_context && _context.myId) || '';
      const iWon = String(winner.id) === String(myId) || (winner.isHost && P2P.isHost());
      setTimeout(() => { _onResult && _onResult(iWon); }, 1500);
    }
  }

  return { init, destroy, sendSnapshotTo, removePlayer };
})();
