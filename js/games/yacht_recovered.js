/**
 * yacht.js - 야추 다이스 (Yacht Dice / Yahtzee)
 * - 2~4인 실시간 WebRTC P2P 턴제 멀티플레이어 보드게임
 * - 3D CSS 큐브 주사위 5개 물리 롤링 모션 (누르고 있을 때 쉐이킹, 손 뗄 때 굴림)
 * - 1턴당 최대 3번 굴림 & 클릭하여 주사위 홀드(Keep)
 * - 한국 표준 12개 족보 계산 & 63점 상단 보너스(+35점)
 * - 미확정 점수 회색 프리뷰 & 확정 점수 진한 표기
 * - 12라운드 종료 시 최종 점수 집계 리더보드
 */
const YachtGame = (() => {
  'use strict';

  // 12개 족보 카테고리 정의
  const CATEGORIES = [
    { key: 'aces', name: 'Aces (1)', section: 'upper', desc: '1의 눈 총합' },
    { key: 'deuces', name: 'Deuces (2)', section: 'upper', desc: '2의 눈 총합' },
    { key: 'threes', name: 'Threes (3)', section: 'upper', desc: '3의 눈 총합' },
    { key: 'fours', name: 'Fours (4)', section: 'upper', desc: '4의 눈 총합' },
    { key: 'fives', name: 'Fives (5)', section: 'upper', desc: '5의 눈 총합' },
    { key: 'sixes', name: 'Sixes (6)', section: 'upper', desc: '6의 눈 총합' },
    { key: 'choice', name: 'Choice (초이스)', section: 'lower', desc: '주사위 5개 총합' },
    { key: 'fourKind', name: '4 of a Kind (포커)', section: 'lower', desc: '동일 눈 4개 이상 시 총합' },
    { key: 'fullHouse', name: 'Full House (풀하우스)', section: 'lower', desc: '3개 동일 + 2개 동일 시 총합' },
    { key: 'smallStraight', name: 'S. Straight (스몰 스트레이트)', section: 'lower', desc: '4개 연속 숫자 시 15점' },
    { key: 'largeStraight', name: 'L. Straight (라지 스트레이트)', section: 'lower', desc: '5개 연속 숫자 시 30점' },
    { key: 'yacht', name: 'Yacht (야추)', section: 'lower', desc: '5개 동일 눈 시 50점!' }
  ];

  // 주사위 1~6 면의 3D 회전 각도 (rotateX, rotateY)
  const FACE_ROTATIONS = {
    1: { x: 0,   y: 0 },
    2: { x: -90, y: 0 },
    3: { x: 0,   y: -90 },
    4: { x: 0,   y: 90 },
    5: { x: 90,  y: 0 },
    6: { x: 180, y: 0 }
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
  let diceValues    = [1, 1, 1, 1, 1]; // 5개 주사위 눈
  let keptDice      = [false, false, false, false, false]; // 홀드 상태
  let rollsLeft     = 3; // 남은 굴림 횟수 (3, 2, 1, 0)
  let isRolling     = false;
  let isShaking     = false;
  let shakeInterval = null;
  let isGameOver    = false;

  // 점수표 데이터: { [playerId]: { aces: 3, deuces: null, ..., bonus: 35, total: 180 } }
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

    // 점수표 초기화
    scoreSheets = {};
    players.forEach(p => {
      scoreSheets[p.id] = {};
      CATEGORIES.forEach(cat => {
        scoreSheets[p.id][cat.key] = null; // null = 미확정
      });
    });

    _resetTurnState();
    _buildLayout();
    P2P.onMessage(_onMessage);

    // 턴 UI 업데이트
    _updateTurnHeader();
    _renderScoreSheet();
    _updateDiceDisplay();
  }

  function _resetTurnState() {
    diceValues = [1, 2, 3, 4, 5];
    keptDice   = [false, false, false, false, false];
    rollsLeft  = 3;
    isRolling  = false;
    isShaking  = false;
    if (shakeInterval) {
      clearInterval(shakeInterval);
      shakeInterval = null;
    }
  }

  function _buildLayout() {
    _container.innerHTML = `
      <div class="yacht-wrap">
        <!-- 1. 상단 정보 바 (현재 턴 & 라운드 & 주사위 굴림 잔여 횟수) -->
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
          <div class="yh-guide-text" id="yh-guide-text">
            주사위 굴리기 버튼을 길게 눌렀다 떼어 주사위를 굴리세요!
          </div>
        </div>

        <!-- 2. 중앙 메인 플레이 영역 (3D 주사위 보드 + 럭셔리 점수표) -->
        <div class="yacht-main-grid">
          
          <!-- 좌측: 3D 주사위 보드 & 굴리기/홀드 컨트롤 -->
          <div class="yacht-board card">
            <div class="yacht-section-title">
              <span><i class="fa-solid fa-cubes"></i> 주사위 트레이</span>
              <span class="yh-sub-hint">주사위를 클릭하여 홀드(Keep)하세요</span>
            </div>

            <!-- 3D 주사위 5개 배치 영역 -->
            <div class="dice-tray" id="dice-tray">
              ${[0, 1, 2, 3, 4].map(i => `
                <div class="dice-slot" data-index="${i}">
                  <div class="dice-3d-wrap" id="dice-wrap-${i}">
                    <div class="dice-cube" id="dice-cube-${i}">
                      <div class="face face-1"><span class="pip pip-c"></span></div>
                      <div class="face face-2"><span class="pip pip-tl"></span><span class="pip pip-br"></span></div>
                      <div class="face face-3"><span class="pip pip-tl"></span><span class="pip pip-c"></span><span class="pip pip-br"></span></div>
                      <div class="face face-4"><span class="pip pip-tl"></span><span class="pip pip-tr"></span><span class="pip pip-bl"></span><span class="pip pip-br"></span></div>
                      <div class="face face-5"><span class="pip pip-tl"></span><span class="pip pip-tr"></span><span class="pip pip-c"></span><span class="pip pip-bl"></span><span class="pip pip-br"></span></div>
                      <div class="face face-6"><span class="pip pip-tl"></span><span class="pip pip-tr"></span><span class="pip pip-ml"></span><span class="pip pip-mr"></span><span class="pip pip-bl"></span><span class="pip pip-br"></span></div>
                    </div>
                  </div>
                  <div class="dice-keep-tag hidden" id="dice-keep-tag-${i}"><i class="fa-solid fa-lock"></i> KEEP</div>
                </div>
              `).join('')}
            </div>

            <!-- 주사위 굴리기 버튼 (Hold & Release 인터랙션) -->
            <div class="dice-action-area">
              <button type="button" class="btn-roll-dice" id="btn-roll-dice">
                <div class="btn-roll-inner">
                  <i class="fa-solid fa-shuffle"></i>
                  <span id="btn-roll-text">주사위 굴리기 (누르고 있기)</span>
                </div>
                <div class="btn-roll-progress" id="btn-roll-progress"></div>
              </button>
            </div>
          </div>

          <!-- 우측: 럭셔리 점수표 (Score Sheet) -->
          <div class="yacht-scoresheet card">
            <div class="yacht-section-title">
              <span><i class="fa-solid fa-table-list"></i> 점수 기록표</span>
              <span class="yh-sub-hint">회색 점수는 이번 턴 예상 점수입니다</span>
            </div>

            <div class="scoresheet-table-wrap">
              <table class="scoresheet-table" id="scoresheet-table">
                <thead>
                  <tr id="st-head-row">
                    <th class="col-category">카테고리</th>
                    ${players.map(p => `
                      <th class="col-player ${String(p.id) === String(myId) ? 'my-col' : ''}">
                        <div class="th-player-name">${_escapeHtml(p.name)}</div>
                        ${String(p.id) === String(myId) ? '<span class="th-me-badge">나</span>' : ''}
                      </th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody id="st-body">
                  <!-- JS 동적 렌더링 -->
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    `;

    _bindDiceEvents();
    _bindRollButtonEvents();
  }

  /* ═══════════════════════════════════════════════════════════════
     주사위 3D 인터랙션 & 물리 롤링
     ═══════════════════════════════════════════════════════════════ */
  function _bindDiceEvents() {
    for (let i = 0; i < 5; i++) {
      const slot = _container.querySelector(`.dice-slot[data-index="${i}"]`);
      if (!slot) continue;
      slot.addEventListener('click', () => {
        if (!_isMyTurn() || isRolling || isShaking || rollsLeft === 3 || isGameOver) return;
        _toggleKeepDice(i, true);
      });
    }
  }

  function _toggleKeepDice(idx, isLocal) {
    keptDice[idx] = !keptDice[idx];
    _updateDiceDisplay();
    if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();

    if (isLocal) {
      P2P.send({
        type: 'YACHT_TOGGLE_KEEP',
        idx: idx,
        kept: keptDice[idx]
      });
    }
  }

  function _bindRollButtonEvents() {
    const btn = document.getElementById('btn-roll-dice');
    if (!btn) return;

    // 마우스 / 터치 누르고 있을 때 (Shake 시작)
    const onStart = (e) => {
      if (!_isMyTurn() || isRolling || isShaking || rollsLeft <= 0 || isGameOver) return;
      e.preventDefault();
      _startShake(true);
    };

    // 마우스 / 터치 손 뗄 때 (Roll 실행)
    const onEnd = (e) => {
      if (!isShaking || !_isMyTurn()) return;
      e.preventDefault();
      _releaseAndRoll(true);
    };

    btn.addEventListener('mousedown', onStart);
    window.addEventListener('mouseup', onEnd);

    btn.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  function _startShake(isLocal) {
    if (isShaking) return;
    isShaking = true;
    const btn = document.getElementById('btn-roll-dice');
    if (btn) btn.classList.add('shaking');

    if (typeof Sound !== 'undefined' && Sound.playDing) Sound.playDing();

    // 3D 주사위 큐브들을 무작위 각도로 빠르게 흔들기
    shakeInterval = setInterval(() => {
      for (let i = 0; i < 5; i++) {
        if (keptDice[i]) continue;
        const cube = document.getElementById(`dice-cube-${i}`);
        if (cube) {
          const rx = Math.floor(Math.random() * 360);
          const ry = Math.floor(Math.random() * 360);
          const rz = Math.floor(Math.random() * 360);
          cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(1.08)`;
        }
      }
    }, 60);

    if (isLocal) {
      P2P.send({ type: 'YACHT_START_SHAKE' });
    }
  }

  function _releaseAndRoll(isLocal, forcedValues) {
    if (!isShaking && !forcedValues) return;
    isShaking = false;
    isRolling = true;
    if (shakeInterval) {
      clearInterval(shakeInterval);
      shakeInterval = null;
    }

    const btn = document.getElementById('btn-roll-dice');
    if (btn) btn.classList.remove('shaking');

    rollsLeft--;

    // 주사위 눈 결정 (홀드 안 된 주사위만 새로 굴림)
    const newValues = [...diceValues];
    for (let i = 0; i < 5; i++) {
      if (!keptDice[i]) {
        newValues[i] = (forcedValues && forcedValues[i]) ? forcedValues[i] : Math.floor(1 + Math.random() * 6);
      }
    }
    diceValues = newValues;

    if (typeof Sound !== 'undefined' && Sound.playStart) Sound.playStart();

    // 굴러 떨어져 착지하는 3D 애니메이션 (0.7초)
    for (let i = 0; i < 5; i++) {
      if (keptDice[i]) continue;
      const cube = document.getElementById(`dice-cube-${i}`);
      if (cube) {
        const targetFace = FACE_ROTATIONS[diceValues[i]];
        // 바닥에 2바퀴 굴러 최종 각도로 정착
        const finalX = targetFace.x + 720;
        const finalY = targetFace.y + 720;
        cube.style.transition = 'transform 0.75s cubic-bezier(0.25, 1.5, 0.5, 1)';
        cube.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg) rotateZ(0deg) scale(1)`;
      }
    }

    setTimeout(() => {
      isRolling = false;
      _updateRollsUI();
      _updateDiceDisplay();
      _renderScoreSheet(); // 미확정 점수 프리뷰 실시간 계산 갱신

      // 야추(50점) 대박 족보 달성 시 축하 사운드
      if (_calculateCategoryScore('yacht', diceValues) === 50) {
        if (typeof Sound !== 'undefined' && Sound.playWin) Sound.playWin();
      }
    }, 780);

    if (isLocal) {
      P2P.send({
        type: 'YACHT_ROLL_RESULT',
        diceValues: diceValues,
        rollsLeft: rollsLeft
      });
    }
  }

  function _updateDiceDisplay() {
    for (let i = 0; i < 5; i++) {
      const slot = _container.querySelector(`.dice-slot[data-index="${i}"]`);
      const cube = document.getElementById(`dice-cube-${i}`);
      const keepTag = document.getElementById(`dice-keep-tag-${i}`);

      if (slot) slot.classList.toggle('is-kept', keptDice[i]);
      if (keepTag) keepTag.classList.toggle('hidden', !keptDice[i]);

      if (cube && !isRolling && !isShaking) {
        const targetFace = FACE_ROTATIONS[diceValues[i]];
        cube.style.transition = 'transform 0.25s ease';
        cube.style.transform = `rotateX(${targetFace.x}deg) rotateY(${targetFace.y}deg) scale(1)`;
      }
    }
  }

  function _updateRollsUI() {
    const rollsEl = document.getElementById('yh-rolls-count');
    const btn = document.getElementById('btn-roll-dice');
    const btnText = document.getElementById('btn-roll-text');
    const guideEl = document.getElementById('yh-guide-text');

    if (rollsEl) {
      rollsEl.textContent = `${rollsLeft}회`;
      rollsEl.className = `rolls-${rollsLeft}`;
    }

    if (btn) {
      const canRoll = _isMyTurn() && rollsLeft > 0 && !isGameOver;
      btn.disabled = !canRoll;
      if (btnText) {
        if (rollsLeft === 3) btnText.textContent = '주사위 굴리기 (누르고 있기)';
        else if (rollsLeft > 0) btnText.textContent = `다시 굴리기 (${rollsLeft}회 남음)`;
        else btnText.textContent = '점수표에서 항목을 선택하세요!';
      }
    }

    if (guideEl) {
      if (!_isMyTurn()) {
        const curPlayer = players[currentTurnIdx];
        guideEl.textContent = `${curPlayer ? curPlayer.name : '상대방'}님이 주사위를 굴리는 중입니다...`;
      } else if (rollsLeft === 3) {
        guideEl.textContent = '주사위 굴리기 버튼을 길게 눌렀다 떼어 주사위를 굴리세요!';
      } else if (rollsLeft > 0) {
        guideEl.textContent = '킵할 주사위를 클릭하여 선택하거나, 우측 점수표에서 확정할 항목을 클릭하세요.';
      } else {
        guideEl.textContent = '3번의 굴림이 끝났습니다. 우측 점수표에서 점수를 기록할 칸을 클릭하세요!';
      }
    }
  }

  function _updateTurnHeader() {
    const roundBadge = document.getElementById('yh-round-badge');
    const turnLabel  = document.getElementById('yh-turn-label');
    const turnText   = document.getElementById('yh-turn-text');
    const curPlayer  = players[currentTurnIdx];
    const isMine     = _isMyTurn();

    if (roundBadge) roundBadge.innerHTML = `<i class="fa-solid fa-trophy"></i> 라운드 ${currentRound} / ${TOTAL_ROUNDS}`;

    if (turnLabel) {
      turnLabel.className = 'turn-label ' + (isMine ? 'my-turn' : 'opp-turn');
    }
    if (turnText) {
      turnText.textContent = isMine ? '내 턴' : `${curPlayer ? curPlayer.name : '상대방'} 턴`;
    }

    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      window.App.updateInGameTurn(currentTurnIdx);
    }

    _updateRollsUI();
  }

  /* ═══════════════════════════════════════════════════════════════
     한국 표준 12개 족보 계산 & 점수표 렌더링
     ═══════════════════════════════════════════════════════════════ */
  function _calculateCategoryScore(catKey, dice) {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // 1~6 인덱스 카운트
    let sum = 0;
    dice.forEach(v => {
      counts[v]++;
      sum += v;
    });

    switch (catKey) {
      // 상단 6개 항목
      case 'aces':   return counts[1] * 1;
      case 'deuces': return counts[2] * 2;
      case 'threes': return counts[3] * 3;
      case 'fours':  return counts[4] * 4;
      case 'fives':  return counts[5] * 5;
      case 'sixes':  return counts[6] * 6;

      // 하단 6개 항목
      case 'choice':
        return sum;

      case 'fourKind':
        // 동일 눈 4개 이상
        return counts.some(c => c >= 4) ? sum : 0;

      case 'fullHouse':
        // 3개 동일 + 2개 동일 조합 (또는 5개 모두 같은 경우도 풀하우스 성립)
        const has3 = counts.includes(3);
        const has2 = counts.includes(2);
        const has5 = counts.includes(5);
        return (has3 && has2) || has5 ? sum : 0;

      case 'smallStraight':
        // 4개 연속 숫자 (1-2-3-4, 2-3-4-5, 3-4-5-6) -> 15점
        const s1 = counts[1] && counts[2] && counts[3] && counts[4];
        const s2 = counts[2] && counts[3] && counts[4] && counts[5];
        const s3 = counts[3] && counts[4] && counts[5] && counts[6];
        return (s1 || s2 || s3) ? 15 : 0;

      case 'largeStraight':
        // 5개 연속 숫자 (1-2-3-4-5, 2-3-4-5-6) -> 30점
        const l1 = counts[1] && counts[2] && counts[3] && counts[4] && counts[5];
        const l2 = counts[2] && counts[3] && counts[4] && counts[5] && counts[6];
        return (l1 || l2) ? 30 : 0;

      case 'yacht':
        // 5개 모두 동일한 눈 -> 50점
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
    if (upperSub >= 63) total += 35; // 35점 상단 보너스
    return total;
  }

  function _renderScoreSheet() {
    const tbody = document.getElementById('st-body');
    if (!tbody) return;

    let html = '';

    // 1. 상단 섹션 (Upper Section)
    CATEGORIES.filter(c => c.section === 'upper').forEach(cat => {
      html += _renderCategoryRow(cat);
    });

    // 상단 소계 & 보너스 행
    html += `
      <tr class="row-subtotal">
        <td class="cat-cell">
          <strong>상단 소계</strong>
          <span class="sub-desc">63점 이상 시 +35점 보너스</span>
        </td>
        ${players.map(p => {
          const sub = _calculateUpperSubtotal(p.id);
          const hasBonus = sub >= 63;
          return `
            <td class="score-cell subtotal-cell ${String(p.id) === String(myId) ? 'my-col' : ''}">
              <div class="subtotal-val ${hasBonus ? 'bonus-achieved' : ''}">${sub} / 63</div>
              ${hasBonus ? '<span class="bonus-badge">+35 보너스 획득!</span>' : ''}
            </td>
          `;
        }).join('')}
      </tr>
    `;

    // 2. 하단 섹션 (Lower Section)
    CATEGORIES.filter(c => c.section === 'lower').forEach(cat => {
      html += _renderCategoryRow(cat);
    });

    // 3. 최종 총점 행
    html += `
      <tr class="row-total">
        <td class="cat-cell">
          <strong>최종 총점</strong>
        </td>
        ${players.map(p => `
          <td class="score-cell total-cell ${String(p.id) === String(myId) ? 'my-col' : ''}">
            <strong>${_calculateTotalScore(p.id)}점</strong>
          </td>
        `).join('')}
      </tr>
    `;

    tbody.innerHTML = html;
    _bindScoreCellEvents();
  }

  function _renderCategoryRow(cat) {
    return `
      <tr class="row-category" data-cat="${cat.key}">
        <td class="cat-cell">
          <strong>${cat.name}</strong>
          <span class="sub-desc">${cat.desc}</span>
        </td>
        ${players.map(p => {
          const isMe = String(p.id) === String(myId);
          const isTurnPlayer = (String(p.id) === String(players[currentTurnIdx]?.id));
          const confirmedVal = scoreSheets[p.id][cat.key];
          const isConfirmed = (typeof confirmedVal === 'number');

          // 내 턴이고, 1번 이상 굴렸고, 아직 확정되지 않은 칸이면 미확정 회색 프리뷰 점수 표시
          let previewVal = null;
          let isClickable = false;
          if (isMe && isTurnPlayer && !isConfirmed && rollsLeft < 3 && !isRolling && !isShaking && !isGameOver) {
            previewVal = _calculateCategoryScore(cat.key, diceValues);
            isClickable = true;
          }

          let content = '';
          let cellClass = 'score-cell';
          if (isMe) cellClass += ' my-col';

          if (isConfirmed) {
            cellClass += ' confirmed';
            content = `<span class="score-val confirmed">${confirmedVal}</span>`;
          } else if (previewVal !== null) {
            cellClass += ' preview-active clickable';
            content = `<span class="score-val preview">${previewVal}</span>`;
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

    _renderScoreSheet();

    if (isLocal) {
      P2P.send({
        type: 'YACHT_CONFIRM_SCORE',
        catKey: catKey,
        score: score,
        playerId: curPlayer.id
      });
    }

    // 다음 턴으로 전진
    _advanceToNextTurn();
  }

  function _advanceToNextTurn() {
    currentTurnIdx = (currentTurnIdx + 1) % players.length;

    // 모든 플레이어가 1바퀴 돌았으면 다음 라운드
    if (currentTurnIdx === 0) {
      currentRound++;
    }

    // 12라운드가 모두 끝났으면 게임 종료!
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

    // 리더보드 계산
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

  /* ═══════════════════════════════════════════════════════════════
     P2P 메시지 라우터 & 호스트 릴레이
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
        _startShake(false);
        break;

      case 'YACHT_ROLL_RESULT':
        if (_isMyTurn()) break;
        rollsLeft = data.rollsLeft;
        _releaseAndRoll(false, data.diceValues);
        break;

      case 'YACHT_TOGGLE_KEEP':
        if (_isMyTurn()) break;
        keptDice[data.idx] = data.kept;
        _updateDiceDisplay();
        if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();
        break;

      case 'YACHT_CONFIRM_SCORE':
        if (_isMyTurn()) break;
        scoreSheets[data.playerId][data.catKey] = data.score;
        if (typeof Sound !== 'undefined' && Sound.playWordSubmit) Sound.playWordSubmit();
        _renderScoreSheet();
        _advanceToNextTurn();
        break;
    }
  }

  /* ─── 헬퍼 ─── */
  function _isMyTurn() {
    const curPlayer = players[currentTurnIdx];
    if (!curPlayer) return false;
    return String(curPlayer.id) === String(myId);
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function destroy() {
    P2P.offMessage(_onMessage);
    if (shakeInterval) {
      clearInterval(shakeInterval);
      shakeInterval = null;
    }
    window.removeEventListener('mouseup', _releaseAndRoll);
    window.removeEventListener('touchend', _releaseAndRoll);
    isGameOver = true;
  }

  return { init, destroy };
})();
