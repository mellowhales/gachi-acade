/**
 * wordchain.js - 끝말잇기
 * - 전체 시간 225초 (기존 150초의 1.5배), 턴 시간은 전체 시간에 비례
 * - 3라운드 제도: 각 라운드 종료(시간 초과) 시 생존자 승리, 3라운드 중 최다 승리가 최종 승리
 * - 단어 제출 성공 시 1초 연출 동안 타이머 일시정지 (억울한 시간초과 방지)
 * - 라운드 전환 시 단어 목록 및 알림판 완벽 초기화
 * P2P: { type:'wc_word', word, nextTurnIndex, totalTimeLeft, whoName }
 *      { type:'wc_invalid_attempt', word, error, playerName }
 *      { type:'wc_timeout', loserName, loserId }
 *      { type:'wc_round_result', winnerId, winnerName, roundWins, nextRound, startWord }
 *      { type:'wc_final', winnerId, winnerName, roundWins }
 */
const WordchainGame = (() => {
  const DUEUM_MAP = {
    '라': '나', '락': '낙', '란': '난', '랄': '날', '람': '남', '랍': '납', '랑': '낭',
    '래': '내', '랭': '냉', '려': '여', '력': '역', '련': '연', '렬': '열', '렴': '염',
    '렵': '엽', '령': '영', '례': '예', '로': '노', '록': '녹', '론': '논', '롱': '농',
    '뢰': '뇌', '료': '요', '룡': '용', '루': '누', '류': '유', '륙': '육', '륜': '윤',
    '률': '율', '륭': '융', '륵': '늑', '름': '늠', '릉': '능', '리': '이', '린': '인',
    '림': '임', '립': '입',
    '녀': '여', '녁': '역', '년': '연', '념': '염', '녕': '영', '녜': '예', '뇨': '요',
    '뉴': '유', '뉵': '육', '니': '이', '닉': '익', '닐': '일', '님': '임', '닙': '입'
  };

  const TOTAL_GAME_TIME = 225.0; // 전체 게임 시간 (225초)
  let MAX_ROUNDS        = 3;     // 총 라운드 수 (동적 설정)
  const START_WORDS = ['하늘','바다','산','강','꽃','나무','구름','별','달','해','사과','나비','가방','우주','사랑'];

  let containerEl = null;
  let words = [];
  let lastWord = '';
  let usedWords = new Set();
  let gameOver = false;
  let currentTurnIndex = 0;

  let totalTimeLeft = TOTAL_GAME_TIME;
  let currentTurnLimit = 20.0;
  let turnTimeLeft = 20.0;
  let timerInterval = null;
  let lastTickTime = 0;
  let isValidating = false;

  let currentRound = 1;
  let roundWins    = {}; // { [playerId]: winCount }

  let playersList = [];
  let _onResult = null;
  let _context = null;

  function init(container, onResult, context) {
    if (typeof KkutuDict !== 'undefined') { KkutuDict.ensureLoaded(); }
    containerEl = container;
    _onResult = onResult;
    _context = context || {};
    MAX_ROUNDS = (_context && typeof _context.targetRounds === 'number') ? Math.max(1, Math.min(8, _context.targetRounds)) : 3;
    currentRound = 1;
    roundWins = {};
    words = [];
    lastWord = '';
    usedWords = new Set();
    gameOver = false;
    currentTurnIndex = 0;
    isValidating = false;
    totalTimeLeft = TOTAL_GAME_TIME;
    currentRound = 1;

    playersList = (_context.players && _context.players.length > 0)
      ? _context.players
      : [{ id: 'host', name: '호스트', isHost: true }];

    roundWins = {};
    playersList.forEach(p => { roundWins[p.id] = 0; });

    const initialWord = _context.startWord || '하늘';
    usedWords.add(initialWord);
    lastWord = initialWord;
    words.push({ word: initialWord, playerName: '시작 단어' });

    container.innerHTML = `
      <div class="wordchain-wrap">
        <!-- 턴 알림 & 상단 전체/턴 게이지 -->
        <div class="wc-header-area">
          <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
            <div class="turn-indicator" style="margin-bottom:0;">
              <span class="turn-label" id="wc-turn-label">
                <i class="fa-solid fa-comments"></i>
                <span id="wc-turn-text">턴 준비 중...</span>
              </span>
            </div>
            <span id="wc-round-badge" style="
              padding:5px 14px;border-radius:999px;font-size:0.82rem;font-weight:900;
              background:var(--green-tint);border:1.5px solid var(--green-border);color:var(--green-deep);
            "><i class="fa-solid fa-flag"></i> Round ${currentRound} / ${MAX_ROUNDS}</span>
          </div>
          <div class="wc-timer-bars">
            <div class="timer-bar-wrap" title="현재 턴 남은 시간">
              <div class="timer-bar" id="wc-turn-bar" style="width:100%"></div>
            </div>
          </div>
        </div>

        <!-- 🌟 상단 메인 스테이지 (제시어 팝업 디스플레이 + 에러 전광판) -->
        <div class="wordchain-card card wc-stage-card">
          <div class="wc-stage-content">
            <div class="wc-target-display">
              <div class="wc-current-badge">
                <span class="wc-sub-label" id="wc-stage-sub-label">이어받을 글자</span>
                <div class="wc-focus-word-box">
                  <div class="wc-focus-char" id="wc-focus-char">늘</div>
                </div>
                <div class="wc-dueum-hint" id="wc-dueum-hint"></div>
              </div>
            </div>

            <!-- 상단 에러 / 실패 메시지 전광판 -->
            <div class="wc-notice-board" id="wc-notice-board"></div>
          </div>

          <!-- 이전 단어 기록 칩 목록 -->
          <div class="wordchain-chain" id="wc-chain"></div>
        </div>

        <!-- 🌟 하단 내가 입력할 독립 텍스트 필드 -->
        <div class="wc-bottom-input-bar card">
          <div class="wc-input-inner">
            <input type="text" id="wc-input" class="wc-user-input"
              placeholder="단어를 입력하세요..."
              autocomplete="off" spellcheck="false" disabled />
            <button type="button" class="btn btn-primary" id="wc-submit" disabled>
              <i class="fa-solid fa-paper-plane"></i>
              <span>전송</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const input = container.querySelector('#wc-input');
    const submit = container.querySelector('#wc-submit');

    submit.addEventListener('click', _handleSubmit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') _handleSubmit(); });

    _renderChain();
    _updateStageDisplay();
    _updateTurnUI();

    if (typeof Sound !== 'undefined') {
      Sound.startBgm('wordchain');
    }

    _startTurnTimer();

    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);
  }

  function _isMyTurn() {
    if (_context && _context.isDevMode) return true;
    if (_context && _context.isSpectator) return false;
    const curPlayer = playersList[currentTurnIndex];
    if (!curPlayer) return false;
    const myId = _context.myId || 'me';
    return (curPlayer.id === myId) || (curPlayer.isHost && P2P.isHost());
  }

  /* ── 턴 제한시간 계산 ── */
  function _calcTurnLimit() {
    const ratio = Math.max(0.15, totalTimeLeft / TOTAL_GAME_TIME);
    return Math.max(4.0, 20.0 * ratio);
  }

  async function _handleSubmit() {
    if (!_isMyTurn() || gameOver || isValidating) return;
    const input = document.getElementById('wc-input');
    const submit = document.getElementById('wc-submit');
    if (!input) return;
    const rawVal = input.value.trim();
    if (!rawVal) return;

    const lastChar = lastWord[lastWord.length - 1];
    const dueumChar = DUEUM_MAP[lastChar];

    let word = rawVal;
    if (!rawVal.startsWith(lastChar) && (!dueumChar || !rawVal.startsWith(dueumChar))) {
      word = lastChar + rawVal;
    }

    const myName = _context.myNickname || '나';

    const basicError = _validateBasicWord(word);
    if (basicError) {
      _triggerWordError(word, myName, true);
      return;
    }

    isValidating = true;
    if (submit) submit.disabled = true;

    const isDictionaryWord = await _checkDictionaryWord(word);
    isValidating = false;

    if (!isDictionaryWord) {
      if (submit) submit.disabled = false;
      _triggerWordError(word, myName, true);
      return;
    }

    input.value = '';
    _triggerWordSuccess(word, myName, true);
  }

  /* ── 단어 입력 성공 시: ★ 즉시 타이머 일시정지 ★ 후 1초 팝업 연출 ── */
  function _triggerWordSuccess(word, playerName, isLocal) {
    // 🌟 핵심: 단어 제출 성공 즉시 타이머 멈춤 (시간초과 억울한 패배 방지)
    _stopTimer();

    const focusEl = document.getElementById('wc-focus-char');
    const subLabel = document.getElementById('wc-stage-sub-label');

    if (focusEl) {
      focusEl.textContent = word;
      focusEl.className = 'wc-focus-char bounce-pop';
    }
    if (subLabel) {
      subLabel.textContent = `[${playerName}] 제출 완료!`;
    }

    if (typeof Sound !== 'undefined') Sound.playWordSubmit();

    // 1초 동안 완성 단어를 팡! 띄워준 후 다음 단어로 넘어가면서 새 턴 타이머 시작
    setTimeout(() => {
      if (gameOver) return;
      _addWord(word, playerName, isLocal);
    }, 1000);
  }

  /* ── 오답 입력 시 에러 연출 ── */
  function _triggerWordError(word, playerName, isLocal, customErrorMsg) {
    const focusEl = document.getElementById('wc-focus-char');
    const subLabel = document.getElementById('wc-stage-sub-label');

    if (focusEl) {
      focusEl.textContent = word;
      focusEl.className = 'wc-focus-char error-bounce';
    }
    if (subLabel) {
      subLabel.textContent = customErrorMsg ? `[${playerName}] ${customErrorMsg}` : `[${playerName}] 사전에 없는 단어!`;
    }

    if (typeof Sound !== 'undefined') Sound.playError();

    if (isLocal) {
      P2P.send({
        type: 'wc_invalid_attempt',
        word: word,
        playerName: playerName,
        error: customErrorMsg || '사전에 없는 단어입니다!'
      });
    }

    setTimeout(() => {
      if (gameOver) return;
      _updateStageDisplay();
      const submit = document.getElementById('wc-submit');
      if (submit && _isMyTurn()) submit.disabled = false;
    }, 900);
  }

  function _validateBasicWord(word) {
    if (word.length < 2) {
      return '2글자 이상의 단어만 입력할 수 있습니다!';
    }

    const koreanOnly = /^[\uAC00-\uD7A3]+$/;
    if (!koreanOnly.test(word)) {
      return '한글 단어만 입력할 수 있습니다!';
    }

    if (usedWords.has(word)) {
      return `"${word}" 은(는) 이미 사용된 단어입니다!`;
    }

    if (lastWord !== '') {
      const lastChar = lastWord[lastWord.length - 1];
      const dueumChar = DUEUM_MAP[lastChar] || lastChar;
      const firstChar = word[0];

      if (firstChar !== lastChar && firstChar !== dueumChar) {
        if (lastChar !== dueumChar) {
          return `"${lastChar}" 또는 "${dueumChar}"(으)로 시작해야 합니다!`;
        } else {
          return `"${lastChar}"(으)로 시작해야 합니다!`;
        }
      }
    }

    return null;
  }

  async function _checkDictionaryWord(word) {
    // 🌟 끄투코리아 429,580개 단어 데이터베이스에서 0ms 즉시 검색
    if (typeof KkutuDict !== 'undefined') {
      if (!KkutuDict.isReady()) {
        await KkutuDict.ensureLoaded();
      }
      return KkutuDict.has(word);
    }
    return true;
  }

  function _addWord(word, playerName, isLocal, forcedNextIdx) {
    usedWords.add(word);
    lastWord = word;
    words.push({ word, playerName });

    _renderChain();
    _updateStageDisplay();

    const nextIdx = (forcedNextIdx !== undefined && forcedNextIdx !== null)
      ? forcedNextIdx
      : (currentTurnIndex + 1) % playersList.length;
    currentTurnIndex = nextIdx;

    if (isLocal) {
      P2P.send({
        type: 'wc_word',
        word: word,
        nextTurnIndex: nextIdx,
        totalTimeLeft: totalTimeLeft,
        whoName: playerName
      });
    }

    _updateTurnUI();
    _startTurnTimer();
  }

  function _renderChain() {
    const chain = document.getElementById('wc-chain');
    if (!chain) return;
    chain.innerHTML = '';
    const myName = _context.myNickname || '나';

    words.forEach(({ word, playerName }, idx) => {
      const isStart = playerName === '시작 단어';
      const isMe = playerName === myName;
      const isLatest = (idx === words.length - 1 && idx > 0);

      const chip = document.createElement('div');
      chip.className = 'wc-history-chip ' + (isStart ? 'start-chip' : (isMe ? 'me-chip' : 'opp-chip')) + (isLatest ? ' is-latest' : '');
      chip.innerHTML = `
        <span class="wc-chip-num">#${idx + 1}</span>
        <span class="wc-chip-author">${_escapeHtml(playerName)}</span>
        <strong class="wc-chip-word">${_escapeHtml(word)}</strong>
        ${isLatest ? '<span class="wc-chip-badge">최신</span>' : ''}
      `;
      chain.appendChild(chip);
    });
    chain.scrollTop = chain.scrollHeight;
  }

  function _updateStageDisplay() {
    const focusCharEl = document.getElementById('wc-focus-char');
    const dueumHintEl = document.getElementById('wc-dueum-hint');
    const subLabel    = document.getElementById('wc-stage-sub-label');

    if (!lastWord) return;
    const lastChar = lastWord[lastWord.length - 1];
    const dueum = DUEUM_MAP[lastChar];

    if (subLabel) subLabel.textContent = '이어받을 글자';
    if (focusCharEl) {
      focusCharEl.textContent = lastChar;
      focusCharEl.className = 'wc-focus-char';
    }

    if (dueumHintEl) {
      dueumHintEl.textContent = dueum ? `(두음: ${dueum})` : '';
    }
  }

  function _updateTurnUI() {
    const label = document.getElementById('wc-turn-label');
    const text  = document.getElementById('wc-turn-text');
    const input = document.getElementById('wc-input');
    const submit = document.getElementById('wc-submit');
    const curPlayer = playersList[currentTurnIndex];
    const isMine = _isMyTurn();

    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      window.App.updateInGameTurn(currentTurnIndex);
    }

    if (label) label.className = 'turn-label ' + (isMine ? 'my-turn' : 'opp-turn');
    if (text)  text.textContent = isMine ? '내 차례' : `${curPlayer ? curPlayer.name : '상대방'} 차례`;

    if (input) {
      input.disabled = !isMine;
      input.placeholder = isMine ? '이어서 단어 입력 후 Enter...' : `${curPlayer ? curPlayer.name : '상대방'}이 입력 중입니다...`;
      if (isMine) {
        input.value = '';
        setTimeout(() => input.focus(), 80);
      }
    }
    if (submit) submit.disabled = !isMine;
  }

  /* ── 실시간 턴 타이머 ── */
  function _startTurnTimer() {
    _stopTimer();
    currentTurnLimit = _calcTurnLimit();
    turnTimeLeft = currentTurnLimit;
    lastTickTime = Date.now();

    _updateTimerBar();

    timerInterval = setInterval(() => {
      if (gameOver) {
        _stopTimer();
        return;
      }

      const now = Date.now();
      const dt = (now - lastTickTime) / 1000;
      lastTickTime = now;

      totalTimeLeft = Math.max(0, totalTimeLeft - dt);
      turnTimeLeft = Math.max(0, turnTimeLeft - dt);

      _updateTimerBar();

      if (typeof Sound !== 'undefined') {
        const timeRatio = Math.max(0, totalTimeLeft / TOTAL_GAME_TIME);
        Sound.setBgmSpeed(timeRatio);
      }

      if (turnTimeLeft <= 0 || totalTimeLeft <= 0) {
        _stopTimer();
        if (!gameOver) {
          const curPlayer = playersList[currentTurnIndex];
          const loserName = curPlayer ? curPlayer.name : (_context.myNickname || '플레이어');
          const loserId   = curPlayer ? curPlayer.id : (_context.myId || '');

          if (_isMyTurn()) {
            P2P.send({ type: 'wc_timeout', loserName: loserName, loserId: loserId });
            _handleRoundEnd(false, null, loserName);
          }
        }
      }
    }, 50);
  }

  function _stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function _updateTimerBar() {
    const tb = document.getElementById('wc-turn-bar');
    if (!tb) return;

    const ratio = Math.max(0, Math.min(1, turnTimeLeft / currentTurnLimit));
    tb.style.width = (ratio * 100) + '%';

    if (ratio <= 0.25) {
      tb.className = 'timer-bar critical';
    } else if (ratio <= 0.5) {
      tb.className = 'timer-bar warning';
    } else {
      tb.className = 'timer-bar';
    }
  }

  function _showStageNotice(msg, isValidating = false) {
    const board = document.getElementById('wc-notice-board');
    if (!board) return;
    board.innerHTML = msg;
    board.className = 'wc-notice-board show' + (isValidating ? ' validating' : ' error shake');
    setTimeout(() => board && board.classList.remove('shake'), 400);
  }

  function _clearStageNotice() {
    const board = document.getElementById('wc-notice-board');
    if (board) {
      board.textContent = '';
      board.className = 'wc-notice-board';
    }
  }

  /* ── P2P 메시지 수신 ── */
  function _onMessage(data, senderId) {
    if (!data || typeof data !== 'object') return;

    if (P2P.isHost() && senderId) {
      if (['wc_word', 'wc_invalid_attempt', 'wc_timeout'].includes(data.type)) {
        P2P.send(data, null, senderId);
      }
    }

    if (data.type === 'WC_SYNC_STATE') {
      if (Array.isArray(data.words)) words = data.words;
      if (data.lastWord) lastWord = data.lastWord;
      if (typeof data.currentTurnIndex === 'number') currentTurnIndex = data.currentTurnIndex;
      if (typeof data.totalTimeLeft === 'number') totalTimeLeft = data.totalTimeLeft;
      if (typeof data.gameOver === 'boolean') gameOver = data.gameOver;
      _renderChain();
      _updateStageDisplay();
      _updateTurnUI();
    } else if (data.type === 'wc_word') {
      // 🌟 상대방이 단어 제출 시 내 로컬 타이머도 즉시 일시정지
      _stopTimer();

      if (typeof data.totalTimeLeft === 'number') totalTimeLeft = data.totalTimeLeft;
      const focusEl  = document.getElementById('wc-focus-char');
      const subLabel = document.getElementById('wc-stage-sub-label');
      if (focusEl)  { focusEl.textContent = data.word; focusEl.className = 'wc-focus-char bounce-pop'; }
      if (subLabel) subLabel.textContent = `[${data.whoName || '상대방'}] 제출 완료!`;
      if (typeof Sound !== 'undefined') Sound.playWordSubmit();
      setTimeout(() => {
        if (gameOver) return;
        _addWord(data.word, data.whoName || '상대방', false, data.nextTurnIndex);
      }, 1000);

    } else if (data.type === 'wc_invalid_attempt') {
      _triggerWordError(data.word, data.playerName || '상대방', false, data.error);

    } else if (data.type === 'wc_timeout') {
      const myId    = _context.myId || '';
      const loserId = data.loserId  || '';
      let iLost;
      if (loserId) {
        iLost = (loserId === myId);
      } else {
        iLost = (data.loserName === (_context.myNickname || '나'));
      }
      _stopTimer();
      _handleRoundEnd(!iLost, iLost ? null : myId, data.loserName || '상대방');

    } else if (data.type === 'wc_round_result') {
      // 호스트가 보내는 라운드 결과 -> 게스트도 새 라운드 시작!
      if (data.roundWins) Object.assign(roundWins, data.roundWins);
      _updateSidebarWins();
      setTimeout(() => {
        _startNextRound(data.nextRound, data.startWord);
      }, 2500);

    } else if (data.type === 'wc_snapshot') {
      words = data.words || words;
      usedWords = new Set(data.usedWords || []);
      currentTurnIndex = (typeof data.currentTurnIndex === 'number') ? data.currentTurnIndex : currentTurnIndex;
      lastWord = data.lastWord || lastWord;
      currentRound = data.currentRound || currentRound;
      if (data.roundWins) Object.assign(roundWins, data.roundWins);
      totalTimeLeft = (typeof data.totalTimeLeft === 'number') ? data.totalTimeLeft : totalTimeLeft;
      gameOver = !!data.gameOver;
      _renderChain();
      _updateStageDisplay();
      _updateTurnUI();
      _updateRoundBadge();
      _updateSidebarWins();
      if (!gameOver) _startTurnTimer();
    } else if (data.type === 'wc_final') {
      // 게임 최종 결과
      if (data.roundWins) Object.assign(roundWins, data.roundWins);
      if (!gameOver) {
        gameOver = true;
        const myId = _context.myId || '';
        const iWon = (String(data.winnerId) === String(myId));
        _stopTimer();
        _showStageNotice(iWon ? '<i class="fa-solid fa-trophy"></i> 최종 승리!' : `<i class="fa-solid fa-trophy"></i> ${data.winnerName}님 최종 우승!`, false);
        const input  = document.getElementById('wc-input');
        const submit = document.getElementById('wc-submit');
        if (input)  input.disabled  = true;
        if (submit) submit.disabled = true;
        setTimeout(() => { _onResult && _onResult(iWon); }, 1500);
      }
    }
  }

  /* ── 라운드 종료 처리 ── */
  function _handleRoundEnd(iWon, winnerId, loserName) {
    _stopTimer();
    const myId     = _context.myId || '';
    const myName   = _context.myNickname || '나';

    let actualWinnerId   = winnerId;
    let actualWinnerName = '';
    if (actualWinnerId) {
      const wp = playersList.find(p => String(p.id) === String(actualWinnerId));
      actualWinnerName = wp ? wp.name : '승리자';
    } else if (loserName) {
      const winner = playersList.find(p => p.name !== loserName);
      actualWinnerId   = winner ? winner.id   : '';
      actualWinnerName = winner ? winner.name  : '';
    }

    if (iWon && myId) {
      roundWins[myId] = (roundWins[myId] || 0) + 1;
    } else if (actualWinnerId && !iWon) {
      roundWins[actualWinnerId] = (roundWins[actualWinnerId] || 0) + 1;
    }

    const safeLoserName = loserName || (iWon ? '상대방' : myName);
    _updateSidebarWins();
    _showStageNotice(iWon ? `<i class="fa-solid fa-award"></i> 라운드 ${currentRound} 승리!` : `<i class="fa-solid fa-hourglass-end"></i> ${safeLoserName}님 시간 초과 (라운드 ${currentRound})`, false);

    const input  = document.getElementById('wc-input');
    const submit = document.getElementById('wc-submit');
    if (input)  input.disabled  = true;
    if (submit) submit.disabled = true;

    // 호스트가 다음 라운드 또는 최종 결과 발행
    if (P2P.isHost()) {
      const snap = JSON.parse(JSON.stringify(roundWins));
      if (currentRound < MAX_ROUNDS) {
        const nextRound = currentRound + 1;
        const nextStartWord = START_WORDS[Math.floor(Math.random() * START_WORDS.length)];
        P2P.send({
          type: 'wc_round_result',
          roundWins: snap,
          nextRound: nextRound,
          startWord: nextStartWord
        });
        setTimeout(() => {
          _startNextRound(nextRound, nextStartWord);
        }, 2500);
      } else {
        let maxWins = 0, finalWinnerId = null, finalWinnerName = '';
        playersList.forEach(p => {
          const w = roundWins[p.id] || 0;
          if (w > maxWins) { maxWins = w; finalWinnerId = p.id; finalWinnerName = p.name; }
        });
        P2P.send({ type:'wc_final', winnerId:finalWinnerId, winnerName:finalWinnerName, roundWins:snap });
        gameOver = true;
        setTimeout(() => {
          const myWon = (String(finalWinnerId) === String(myId));
          _onResult && _onResult(myWon);
        }, 2000);
      }
    }
  }

  /* 🌟 다음 라운드 시작 (모든 플레이어 단어 목록 및 알림판 깨끗이 초기화) 🌟 */
  function _startNextRound(nextRound, startWord) {
    currentRound = nextRound || (currentRound + 1);
    words         = [];
    usedWords     = new Set();
    currentTurnIndex = 0;
    totalTimeLeft    = TOTAL_GAME_TIME;
    isValidating     = false;

    const initialWord = startWord || START_WORDS[Math.floor(Math.random() * START_WORDS.length)];
    usedWords.add(initialWord);
    lastWord = initialWord;
    words.push({ word: initialWord, playerName: '시작 단어' });

    // 🌟 화면 초기화
    _renderChain();
    _updateStageDisplay();
    _updateTurnUI();
    _updateRoundBadge();
    _clearStageNotice(); // 🌟 이전 라운드 알림판 완벽 제거!

    const input  = document.getElementById('wc-input');
    const submit = document.getElementById('wc-submit');
    if (input)  { input.disabled  = false; input.value = ''; }
    if (submit) submit.disabled = !_isMyTurn();

    if (typeof Sound !== 'undefined') Sound.startBgm('wordchain');
    _startTurnTimer();
  }

  function _updateRoundBadge() {
    const badge = document.getElementById('wc-round-badge');
    if (badge) badge.innerHTML = `<i class="fa-solid fa-flag"></i> Round ${currentRound} / ${MAX_ROUNDS}`;
  }

  function _updateSidebarWins() {
    playersList.forEach((p, idx) => {
      const item = document.getElementById(`gsp-item-${idx}`);
      if (!item) return;
      const wins = roundWins[p.id] || 0;
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

  function destroy() {
    _stopTimer();
    if (typeof Sound !== 'undefined') Sound.startBgm('lobby');
    P2P.offMessage(_onMessage);
  }

  function rematch() {
    const c = document.getElementById('game-content');
    if (c) init(c, _onResult, _context);
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function sendSnapshotTo(targetPeerId) {
    if (!P2P.isHost()) return;
    P2P.send({
      type: 'wc_snapshot',
      words: words,
      usedWords: Array.from(usedWords),
      currentTurnIndex: currentTurnIndex,
      lastWord: lastWord,
      currentRound: currentRound,
      roundWins: roundWins,
      totalTimeLeft: totalTimeLeft,
      gameOver: gameOver
    }, targetPeerId);
  }

  return { init, destroy, rematch, sendSnapshotTo };
})();
