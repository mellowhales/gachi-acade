/**
 * typing.js - 타자연습 대결 (2~5인 실시간 다자간 속타 레이스)
 * [업데이트] 3라운드 시스템 추가 - 가장 많이 이긴 사람이 최종 승리
 * P2P: { type:'typing_sentence', sentence, round } 
 *      { type:'typing_progress', playerId, typed, percent }
 *      { type:'typing_done', winnerName, winnerId, round }
 *      { type:'typing_next_round', round, sentence }
 *      { type:'typing_rematch' }
 */
const TypingGame = (() => {
  const SENTENCES = [
    '빠른 갈색 여우가 게으른 개를 뛰어 넘었습니다.',
    '우리는 매일 조금씩 성장하고 더 나은 내일을 만들어 갑니다.',
    '별이 빛나는 밤하늘 아래서 우리는 꿈을 꾸며 미래를 그립니다.',
    '인생은 짧고 예술은 길다고 했지만 지금 이 순간이 가장 소중합니다.',
    '청춘이란 인생의 어느 한 시기를 말하는 것이 아니라 마음가짐을 가리키는 말입니다.',
    '지식은 힘이고 배움은 우리를 성장시키며 꾸준한 노력은 성공을 이룹니다.',
    '가을의 단풍은 붉고 노랗게 물들어 온 산을 아름답게 수놓고 있었습니다.',
    '친구와 나누는 소소한 이야기와 함께하는 시간이 인생의 큰 행복입니다.',
    '프로그래밍은 창의적인 문제 해결 과정이며 코드 한 줄이 세상을 바꿀 수 있습니다.',
    '넓은 바다 너머 지평선을 바라보며 새로운 출발을 다짐하는 선원의 이야기.',
    '하늘은 스스로 돕는 자를 돕는다는 말처럼 노력하는 사람에게 기회가 찾아옵니다.',
    '바람이 불어와 나뭇잎을 흔들고 작은 새는 나뭇가지에 앉아 노래를 불렀습니다.',
  ];

  let MAX_ROUNDS = 3;

  let sentence      = '';
  let myTyped       = '';
  let gameOver      = false;  // 전체 게임 종료
  let roundOver     = false;  // 현재 라운드 종료
  let myDone        = false;
  let playersList   = [];
  let playersProgress = {};

  // 라운드 관련 상태
  let currentRound  = 1;
  let roundWins     = {};  // { [playerId]: winCount }
  let usedSentences = new Set();

  let _onResult = null;
  let _context  = null;

  function init(container, onResult, context) {
    _onResult  = onResult;
    _context   = context || {};
    MAX_ROUNDS = (_context && typeof _context.targetRounds === 'number') ? Math.max(1, Math.min(8, _context.targetRounds)) : 3;
    currentRound = 1;
    roundWins  = {};
    sentence   = '';
    myTyped    = '';
    gameOver   = false;
    roundOver  = false;
    myDone     = false;
    currentRound = 1;
    usedSentences = new Set();

    playersList = (_context.players && _context.players.length > 0)
      ? _context.players
      : [{ id: 'host', name: '호스트', isHost: true }];

    playersProgress = {};
    roundWins       = {};
    playersList.forEach(p => {
      playersProgress[p.id] = { name: p.name, percent: 0, typed: '' };
      roundWins[p.id] = 0;
    });

    _renderLayout(container);
    _renderProgressSection();
    _updateRoundBadge();

    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);

    const isHostUser = P2P.isHost() || !!(_context && _context.isHost);
    if (isHostUser) {
      const picked = _pickSentence();
      P2P.send({ type: 'typing_sentence', sentence: picked, round: currentRound });
      _setupSentence(picked);
    }
  }

  function _pickSentence() {
    const available = SENTENCES.filter(s => !usedSentences.has(s));
    const pool = available.length > 0 ? available : SENTENCES;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    usedSentences.add(picked);
    return picked;
  }

  function _renderLayout(container) {
    container.innerHTML = `
      <div class="typing-wrap">
        <div class="typing-card card">
          <!-- 라운드 배지 + 승리 현황 -->
          <div class="typing-round-header" id="typing-round-header">
            <span class="typing-round-badge" id="typing-round-badge">
              <i class="fa-solid fa-flag"></i> Round ${currentRound} / ${MAX_ROUNDS}
            </span>
          </div>

          <div class="typing-prompt-box" id="typing-prompt">
            <span style="color:var(--t4)"><i class="fa-solid fa-spinner fa-spin"></i> 문장을 준비하고 있습니다...</span>
          </div>
          <input type="text" id="typing-input" class="typing-input-field"
            placeholder="문장 준비 중..."
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" disabled />

          <div class="typing-progress-section" id="typing-progress-container"></div>

          <div class="typing-opp-preview" id="typing-opp-preview">
            <span style="color:var(--t4);font-size:0.82rem;"><i class="fa-regular fa-keyboard"></i> 실시간 속타 대결 진행 중...</span>
          </div>
        </div>
      </div>
    `;

    const inputEl = container.querySelector('#typing-input');
    inputEl.addEventListener('input', _onInput);
  }

  function _renderProgressSection() {
    const container = document.getElementById('typing-progress-container');
    if (!container) return;

    const myId = _context.myId || 'me';
    let html = '';

    playersList.forEach(p => {
      const prog  = playersProgress[p.id] || { name: p.name, percent: 0 };
      const isMe  = (p.id === myId) || (p.isHost && P2P.isHost());
      const wins  = roundWins[p.id] || 0;
      const winsHtml = wins > 0
        ? `<span class="typing-win-badge">${'⭐'.repeat(wins)}</span>`
        : '';

      html += `
        <div class="typing-progress-row" id="tp-row-${p.id}">
          <div class="progress-who ${isMe ? 'me' : 'opp'}">${_escapeHtml(p.name)}${winsHtml}</div>
          <div class="progress-track">
            <div class="progress-fill ${isMe ? 'me' : 'opp'}" id="tp-fill-${p.id}" style="width:${prog.percent}%"></div>
          </div>
          <div class="progress-pct ${isMe ? 'me' : 'opp'}" id="tp-pct-${p.id}">${prog.percent}%</div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function _updateRoundBadge() {
    const badge = document.getElementById('typing-round-badge');
    if (badge) badge.innerHTML = `<i class="fa-solid fa-flag"></i> Round ${currentRound} / ${MAX_ROUNDS}`;
  }

  function _setupSentence(sent) {
    sentence = sent;
    myTyped  = '';
    myDone   = false;
    roundOver = false;

    // 진행률 초기화
    playersList.forEach(p => {
      playersProgress[p.id].percent = 0;
      playersProgress[p.id].typed   = '';
    });
    _renderProgressSection();
    _updateRoundBadge();

    _renderPrompt();
    const inputEl = document.getElementById('typing-input');
    if (inputEl) {
      inputEl.value    = '';
      inputEl.disabled = false;
      inputEl.placeholder = '여기에 문장을 정확하게 타이핑하세요...';
      setTimeout(() => inputEl.focus(), 100);
    }
  }

  function _renderPrompt() {
    const el = document.getElementById('typing-prompt');
    if (!el) return;
    let html = '';
    for (let i = 0; i < sentence.length; i++) {
      const ch  = sentence[i] === ' ' ? '&nbsp;' : sentence[i];
      let cls   = 'typing-char';
      if (i < myTyped.length) {
        cls += myTyped[i] === sentence[i] ? ' correct' : ' wrong';
      } else if (i === myTyped.length) {
        cls += ' cursor';
      }
      html += `<span class="${cls}">${ch}</span>`;
    }
    el.innerHTML = html;
  }

  function _onInput() {
    if (gameOver || myDone || roundOver) return;
    const inputEl = document.getElementById('typing-input');
    if (!inputEl) return;
    myTyped = inputEl.value;
    if (typeof Sound !== 'undefined') Sound.playTypeKey();

    let correctLen = 0;
    for (let i = 0; i < myTyped.length && i < sentence.length; i++) {
      if (myTyped[i] === sentence[i]) correctLen++;
      else break;
    }
    const percent = Math.round((correctLen / sentence.length) * 100);
    _renderPrompt();

    const myId = _context.myId || 'me';
    _updatePlayerProgress(myId, percent, myTyped);
    P2P.send({ type: 'typing_progress', playerId: myId, percent, typed: myTyped });

    if (myTyped === sentence) {
      myDone    = true;
      roundOver = true;
      inputEl.disabled = true;
      _updatePlayerProgress(myId, 100, myTyped);

      const myName = _context.myNickname || '나';
      P2P.send({ type: 'typing_done', winnerName: myName, winnerId: myId, round: currentRound });

      // 내가 이 라운드 승리
      _handleRoundWin(myId, myName, true);
    }
  }

  function _handleRoundWin(winnerId, winnerName, isLocal) {
    roundWins[winnerId] = (roundWins[winnerId] || 0) + 1;

    // 왼쪽 사이드바 업데이트 (gsp-item)
    _updateSidebarWins();

    // 타이핑 진행률 섹션 승리 횟수 업데이트
    _renderProgressSection();
    // 진행률 바는 유지
    playersList.forEach(p => {
      const fill = document.getElementById('tp-fill-' + p.id);
      const pct  = document.getElementById('tp-pct-'  + p.id);
      if (fill) fill.style.width = (playersProgress[p.id].percent || 0) + '%';
      if (pct)  pct.textContent  = (playersProgress[p.id].percent || 0) + '%';
    });

    const myId = _context.myId || 'me';
    const iWon = (String(winnerId) === String(myId));

    if (typeof Sound !== 'undefined') {
      if (iWon) Sound.playWin(); else Sound.playPop();
    }

    // 라운드 결과 표시
    const prompt = document.getElementById('typing-prompt');
    if (prompt) {
      prompt.innerHTML = `
        <div style="text-align:center;padding:12px 0;">
          <div style="font-size:1.5rem;font-weight:900;color:${iWon?'var(--green-deep)':'var(--coral)'};">
            ${iWon ? '<i class="fa-solid fa-trophy"></i> 이번 라운드 승리!' : `<i class="fa-solid fa-flag-checkered"></i> ${_escapeHtml(winnerName)}님이 먼저 완료!`}
          </div>
          <div style="font-size:0.9rem;color:var(--t3);margin-top:6px;">
            ${currentRound < MAX_ROUNDS ? '잠시 후 다음 라운드가 시작됩니다...' : '최종 결과를 집계합니다...'}
          </div>
        </div>
      `;
    }

    // 3초 후 다음 라운드 또는 게임 종료
    const isHostUser = P2P.isHost() || !!(_context && _context.isHost);
    if (isHostUser) {
      setTimeout(() => {
        if (currentRound < MAX_ROUNDS) {
          currentRound++;
          const nextSent = _pickSentence();
          P2P.send({ type: 'typing_next_round', round: currentRound, sentence: nextSent });
          _setupSentence(nextSent);
        } else {
          _finalizeGame();
        }
      }, 3000);
    }
  }

  function _finalizeGame() {
    gameOver = true;
    const myId = _context.myId || 'me';

    // 최다 승리자 결정
    let maxWins   = 0;
    let winnerId  = null;
    let winnerName = '';
    playersList.forEach(p => {
      const w = roundWins[p.id] || 0;
      if (w > maxWins) { maxWins = w; winnerId = p.id; winnerName = p.name; }
    });

    const iWon = (String(winnerId) === String(myId));
    P2P.send({ type: 'typing_final', winnerId, winnerName, roundWins });

    setTimeout(() => { _onResult && _onResult(iWon); }, 1200);
  }

  function _updateSidebarWins() {
    playersList.forEach((p, idx) => {
      const item = document.getElementById(`gsp-item-${idx}`);
      if (!item) return;
      const wins = roundWins[p.id] || 0;

      // 기존 승리 배지 제거 후 새로 추가
      let badge = item.querySelector('.gsp-win-count-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'gsp-win-count-badge';
        const meta = item.querySelector('.gsp-meta');
        if (meta) meta.appendChild(badge);
      }
      if (wins > 0) {
        badge.innerHTML = `<i class="fa-solid fa-trophy"></i> ${wins}승`;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    });
  }

  function _updatePlayerProgress(pId, pct, typed) {
    if (!playersProgress[pId]) return;
    playersProgress[pId].percent = pct;
    playersProgress[pId].typed   = typed;

    const fillEl = document.getElementById('tp-fill-' + pId);
    const pctEl  = document.getElementById('tp-pct-'  + pId);
    if (fillEl) fillEl.style.width = pct + '%';
    if (pctEl)  pctEl.textContent  = pct + '%';

    const myId = _context.myId || 'me';
    if (pId !== myId && typed !== undefined) {
      const prev = document.getElementById('typing-opp-preview');
      if (prev) {
        const pName = playersProgress[pId].name || '상대방';
        prev.innerHTML = `<span><b>[${_escapeHtml(pName)}]</b> ${_escapeHtml(typed)}</span>`;
      }
    }
  }

  function _onMessage(data, senderId) {
    if (!data || typeof data !== 'object') return;

    // 3인 이상: 호스트가 게스트 패킷을 릴레이
    if (P2P.isHost() && senderId) {
      if (['typing_progress','typing_done'].includes(data.type)) {
        P2P.send(data, null, senderId);
      }
    }

    if (data.type === 'typing_sentence') {
      currentRound = data.round || 1;
      _setupSentence(data.sentence);

    } else if (data.type === 'typing_next_round') {
      currentRound = data.round;
      _setupSentence(data.sentence);

    } else if (data.type === 'typing_progress') {
      _updatePlayerProgress(data.playerId, data.percent || 0, data.typed || '');

    } else if (data.type === 'typing_done') {
      if (!roundOver) {
        roundOver = true;
        const inputEl = document.getElementById('typing-input');
        if (inputEl) { inputEl.disabled = true; inputEl.value = ''; }
        _updatePlayerProgress(data.winnerId || data.winnerName, 100, '');
        _handleRoundWin(data.winnerId, data.winnerName, false);
      }

    } else if (data.type === 'typing_final') {
      if (!gameOver) {
        gameOver = true;
        const myId = _context.myId || 'me';
        // 승리 횟수 동기화
        if (data.roundWins) {
          Object.assign(roundWins, data.roundWins);
          _renderProgressSection();
          _updateSidebarWins();
        }
        const iWon = (String(data.winnerId) === String(myId));
        setTimeout(() => { _onResult && _onResult(iWon); }, 1200);
      }

    } else if (data.type === 'typing_rematch') {
      _doRematch();
    }
  }

  function rematch()    { P2P.send({ type: 'typing_rematch' }); _doRematch(); }
  function _doRematch() { const c = document.getElementById('game-content'); if (c) init(c, _onResult, _context); }
  function destroy()    { P2P.offMessage(_onMessage); }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { init, rematch, destroy };
})();
