/**
 * baskin31.js - 베스킨라빈스 31 (2~5인 다인원 턴 순환 대결)
 * P2P: { type:'br31_pick', count, nextTurnIndex, whoName } | { type:'br31_rematch' }
 */
const Baskin31Game = (() => {
  const MAX_NUM = 31;

  let currentNum = 0;
  let currentTurnIndex = 0;
  let playersList = [];
  let gameOver = false;
  let calledNums = [];
  let _onResult = null;
  let _context = null;

  const PLAYER_COLORS = ['#48bb78', '#3182ce', '#805ad5', '#dd6b20', '#d69e2e'];

  function init(container, onResult, context) {
    _onResult = onResult;
    _context = context || {};
    currentNum = 0;
    currentTurnIndex = 0;
    gameOver = false;
    calledNums = [];

    playersList = (_context.players && _context.players.length > 0)
      ? _context.players
      : [{ id: 'host', name: '호스트', isHost: true }];

    let rows = '';
    for (let i = 1; i <= MAX_NUM; i++) {
      rows += `<div class="baskin-num" id="bn-${i}">${i}</div>`;
    }

    container.innerHTML = `
      <div class="baskin-wrap">
        <div class="turn-indicator">
          <span class="turn-label" id="br-turn-label">
            <i class="fa-solid fa-crown"></i>
            <span id="br-turn-text">턴 로딩 중...</span>
          </span>
        </div>
        <div class="baskin-card card">
          <div class="baskin-counter">
            <span id="br-current">0</span>
            <small style="font-size:1.4rem;color:var(--t3)"> / 31</small>
          </div>
          <div class="baskin-current-label" id="br-label">게임 시작! 1~3개의 숫자를 선택하세요.</div>
          <div class="baskin-progress" id="br-progress">${rows}</div>
          <div class="baskin-pick-buttons">
            <button class="baskin-pick-btn" data-count="1" id="br-btn-1">+1</button>
            <button class="baskin-pick-btn" data-count="2" id="br-btn-2">+2</button>
            <button class="baskin-pick-btn" data-count="3" id="br-btn-3">+3</button>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.baskin-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!_isMyTurn() || gameOver) return;
        _pick(parseInt(btn.dataset.count), true);
      });
    });

    _updateUI();
    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);
  }

  function _isMyTurn() {
    if (_context && _context.isDevMode) return true;
    if (_context && _context.isSpectator) return false;
    if (!playersList || playersList.length === 0) return false;
    const safeIdx = ((currentTurnIndex % playersList.length) + playersList.length) % playersList.length;
    const curPlayer = playersList[safeIdx];
    if (!curPlayer) return false;
    const myId = _context.myId || 'me';
    return String(curPlayer.id) === String(myId) || (curPlayer.isHost && P2P.isHost());
  }

  function _pick(count, isInitiator) {
    if (gameOver) return;
    if (count < 1 || count > 3) return;
    const newNum = currentNum + count;
    if (newNum > MAX_NUM) return;

    const curPlayer = playersList[currentTurnIndex];
    const colorIdx = currentTurnIndex % PLAYER_COLORS.length;

    for (let n = currentNum + 1; n <= newNum; n++) {
      calledNums.push({ num: n, playerIndex: currentTurnIndex });
      _markNum(n, colorIdx, false);
    }
    currentNum = newNum;
    if (typeof Sound !== 'undefined') Sound.playBaskinPick();

    // 31 도달 확인
    if (currentNum === MAX_NUM) {
      gameOver = true;
      _markNum(MAX_NUM, colorIdx, true);
      _updateUI();

      if (isInitiator) {
        P2P.send({
          type: 'br31_pick',
          count: count,
          nextTurnIndex: currentTurnIndex,
          whoName: curPlayer ? curPlayer.name : '플레이어'
        });
      }

      const loserName = curPlayer ? curPlayer.name : '플레이어';
      const myName = _context.myNickname || '나';
      const iLost = loserName === myName;

      setTimeout(() => {
        _onResult && _onResult(!iLost);
      }, 800);
      return;
    }

    // 다음 턴 순환
    const nextIdx = (currentTurnIndex + 1) % playersList.length;
    currentTurnIndex = nextIdx;

    if (isInitiator) {
      P2P.send({
        type: 'br31_pick',
        count: count,
        nextTurnIndex: nextIdx,
        whoName: curPlayer ? curPlayer.name : '플레이어'
      });
    }

    _updateUI();
  }

  function _markNum(n, colorIdx, is31) {
    const el = document.getElementById('bn-' + n);
    if (!el) return;
    el.className = 'baskin-num';
    if (is31) {
      el.classList.add('called-31');
    } else {
      el.classList.add('called-num');
      el.classList.add('called-p' + (colorIdx % 5));
    }
  }

  function _updateUI() {
    const currentEl = document.getElementById('br-current');
    const labelEl   = document.getElementById('br-label');
    const turnLabel = document.getElementById('br-turn-label');
    const turnText  = document.getElementById('br-turn-text');

    const curPlayer = playersList[currentTurnIndex];
    const isMine = _isMyTurn();

    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      window.App.updateInGameTurn(currentTurnIndex);
    }

    if (currentEl) {
      currentEl.textContent = currentNum;
      if (currentNum >= 28)      currentEl.style.color = 'var(--coral)';
      else if (currentNum >= 24) currentEl.style.color = 'var(--yellow)';
      else                       currentEl.style.color = 'var(--green-deep)';
    }

    if (labelEl) {
      if (gameOver) {
        labelEl.textContent = (currentNum === MAX_NUM) ? `${curPlayer ? curPlayer.name : '플레이어'}님이 31을 선언하여 패배했습니다!` : '';
      } else {
        const rem  = MAX_NUM - currentNum;
        const maxP = Math.min(3, rem);
        labelEl.textContent = isMine
          ? (`남은 숫자: ${rem} | 최대 ${maxP}개까지 선택 가능`)
          : (`${curPlayer ? curPlayer.name : '상대방'}님이 숫자를 선택 중입니다...`);
      }
    }

    if (turnLabel) {
      turnLabel.className = 'turn-label ' + (isMine ? 'my-turn' : 'opp-turn');
    }
    if (turnText) {
      turnText.textContent = isMine ? '내 차례' : `${curPlayer ? curPlayer.name : '상대방'} 차례`;
    }

    const rem2 = MAX_NUM - currentNum;
    for (let i = 1; i <= 3; i++) {
      const btn = document.getElementById('br-btn-' + i);
      if (btn) btn.disabled = !(isMine && !gameOver && i <= rem2);
    }
  }

  function _onMessage(data, senderId) {
    if (!data || typeof data !== 'object') return;
    // 3인 이상: 호스트가 게스트 패킷을 다른 게스트들에게 릴레이
    if (P2P.isHost() && senderId) {
      if (['br31_pick', 'br31_rematch'].includes(data.type)) {
        P2P.send(data, null, senderId);
      }
    }
    if (data.type === 'br31_pick') {
      if (gameOver) return;
      _pick(data.count, false);
    } else if (data.type === 'br31_snapshot') {
      currentNum = data.currentNum || 0;
      currentTurnIndex = data.currentTurnIndex || 0;
      gameOver = !!data.gameOver;
      calledNums = data.calledNums || [];
      calledNums.forEach(item => {
        const colorIdx = (item.playerIndex || 0) % PLAYER_COLORS.length;
        _markNum(item.num, colorIdx, item.num === MAX_NUM);
      });
      _updateUI();
    } else if (data.type === 'br31_rematch') {
      _doRematch();
    }
  }

  function sendSnapshotTo(targetPeerId) {
    if (!P2P.isHost()) return;
    P2P.send({
      type: 'br31_snapshot',
      currentNum: currentNum,
      currentTurnIndex: currentTurnIndex,
      gameOver: gameOver,
      calledNums: calledNums
    }, targetPeerId);
  }

  function rematch() {
    P2P.send({ type: 'br31_rematch' });
    _doRematch();
  }

  function _doRematch() {
    const c = document.getElementById('game-content');
    if (c) init(c, _onResult, _context);
  }

  function destroy() {
    P2P.offMessage(_onMessage);
  }

  /* ── 인게임 탈주 처리 ── */
  function removePlayer(playerId) {
    const idx = playersList.findIndex(p => String(p.id) === String(playerId));
    if (idx === -1) return;
    playersList.splice(idx, 1);
    if (currentTurnIndex >= playersList.length) currentTurnIndex = 0;
    if (playersList.length === 1) {
      const winner = playersList[0];
      const myId = (_context && _context.myId) || '';
      const iWon = String(winner.id) === String(myId) || (winner.isHost && P2P.isHost());
      setTimeout(() => { _onResult && _onResult(iWon); }, 1500);
    }
  }

  return { init, rematch, destroy, sendSnapshotTo, removePlayer };
})();
