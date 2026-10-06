/**
 * seotda.js - 가치아케이드 2장 섯다 (Seotda)
 * 2~5인 실시간 멀티플레이 & AI 봇 지원, 판돈/베팅 시스템, 정통 족보(38광땡~망통, 암행어사, 땡잡이, 구사)
 */
const SeotdaGame = (() => {
  'use strict';

  /* ── 화투패 20장 정의 ── */
  const HWATU_CARDS = [
    { id: '1_gwang', month: 1, type: 'gwang', name: '1광', img: 'assets/hwatu/1_gwang.svg' },
    { id: '1_pi',    month: 1, type: 'pi',    name: '1삥', img: 'assets/hwatu/1_pi.svg' },
    { id: '2_yul',   month: 2, type: 'yul',   name: '2열', img: 'assets/hwatu/2_yul.svg' },
    { id: '2_pi',    month: 2, type: 'pi',    name: '2피', img: 'assets/hwatu/2_pi.svg' },
    { id: '3_gwang', month: 3, type: 'gwang', name: '3광', img: 'assets/hwatu/3_gwang.svg' },
    { id: '3_pi',    month: 3, type: 'pi',    name: '3피', img: 'assets/hwatu/3_pi.svg' },
    { id: '4_yul',   month: 4, type: 'yul',   name: '4열', img: 'assets/hwatu/4_yul.svg' },
    { id: '4_pi',    month: 4, type: 'pi',    name: '4피', img: 'assets/hwatu/4_pi.svg' },
    { id: '5_yul',   month: 5, type: 'yul',   name: '5열', img: 'assets/hwatu/5_yul.svg' },
    { id: '5_pi',    month: 5, type: 'pi',    name: '5피', img: 'assets/hwatu/5_pi.svg' },
    { id: '6_yul',   month: 6, type: 'yul',   name: '6열', img: 'assets/hwatu/6_yul.svg' },
    { id: '6_pi',    month: 6, type: 'pi',    name: '6피', img: 'assets/hwatu/6_pi.svg' },
    { id: '7_yul',   month: 7, type: 'yul',   name: '7열', img: 'assets/hwatu/7_yul.svg' },
    { id: '7_pi',    month: 7, type: 'pi',    name: '7피', img: 'assets/hwatu/7_pi.svg' },
    { id: '8_gwang', month: 8, type: 'gwang', name: '8광', img: 'assets/hwatu/8_gwang.svg' },
    { id: '8_yul',   month: 8, type: 'yul',   name: '8열', img: 'assets/hwatu/8_yul.svg' },
    { id: '9_yul',   month: 9, type: 'yul',   name: '9열', img: 'assets/hwatu/9_yul.svg' },
    { id: '9_pi',    month: 9, type: 'pi',    name: '9피', img: 'assets/hwatu/9_pi.svg' },
    { id: '10_yul',  month: 10, type: 'yul',  name: '10열', img: 'assets/hwatu/10_yul.svg' },
    { id: '10_pi',   month: 10, type: 'pi',   name: '10피', img: 'assets/hwatu/10_pi.svg' },
  ];
  const CARD_BACK_IMG = 'assets/hwatu/card_back.svg';

  /* ── 족보 랭크 상수 ── */
  const HAND_RANK = {
    GWANG_38: 100,    // 38광땡
    GWANG_13_18: 90,  // 13광땡, 18광땡
    DDAENG_10: 80,    // 장땡
    // 9땡~1땡: 70 + month (71~79)
    ALLI: 65,         // 알리 (1+2)
    DOKSA: 60,        // 독사 (1+4)
    GUBBING: 55,      // 구삥 (1+9)
    JANGBBING: 50,    // 장삥 (1+10)
    JANGSA: 45,       // 장사 (4+10)
    SERYUK: 40,       // 세륙 (4+6)
    // 갑오(9끗): 29
    // 8끗~1끗: 20 + k (21~28)
    // 망통: 10
  };

  /* ── 게임 상태 변수 ── */
  let _container = null;
  let _onResult = null;
  let _context = null;
  let _myId = null;
  let _isHost = false;

  const START_CHIPS = 10000;
  const DEFAULT_ANTE = 100;

  /* ── 사람 같은 봇 닉네임 풀 ── */
  const BOT_NICKNAMES = [
    '타짜조승우', '불꽃피망', '포커페이스', '한강뷰가자', '황금손',
    '밑장빼기금지', '섯다마스터', '고니의제자', '아귀의의수', '평경장'
  ];

  let _state = {
    round: 1,
    pot: 0,
    currentTurnIdx: 0,
    bettingStage: 1,    // 1: 1차 베팅(1장 수령), 2: 2차 베팅(2장 수령), 3: 쇼다운
    highestBet: 0,
    lastRaiseAmount: DEFAULT_ANTE,
    dealerIdx: 0,
    isGameOver: false,
    isNagari: false,    // 구사 재경기 플래그
    players: [],        // { id, name, isBot, chips, currentBet, totalBet, folded, cards: [], hand: null }
    deck: [],
    revealedCards: false, // 로컬 쪼기/오픈 여부
  };

  let _botTimer = null;
  let _turnCountdownTimer = null;
  let _turnTimeLeft = 15;

  /* ═══════════════════════════════════════════════════════════════════
     1. 족보 계산기 (Hand Evaluator)
     ═══════════════════════════════════════════════════════════════════ */
  function evaluateHand(card1, card2) {
    if (!card1 || !card2) return { rank: 0, name: '패 대기 중', desc: '' };

    const c1 = typeof card1 === 'string' ? HWATU_CARDS.find(c => c.id === card1) : card1;
    const c2 = typeof card2 === 'string' ? HWATU_CARDS.find(c => c.id === card2) : card2;
    if (!c1 || !c2) return { rank: 0, name: '미확인 패', desc: '' };

    const m1 = Math.min(c1.month, c2.month);
    const m2 = Math.max(c1.month, c2.month);

    const hasId = (id) => c1.id === id || c2.id === id;

    // 1. 38광땡
    if (hasId('3_gwang') && hasId('8_gwang')) {
      return { rank: HAND_RANK.GWANG_38, name: '38광땡', desc: '천하무적 최고의 패!', isSpecial: '38gwang' };
    }

    // 2. 13광땡, 18광땡
    if (hasId('1_gwang') && hasId('3_gwang')) {
      return { rank: HAND_RANK.GWANG_13_18, name: '13광땡', desc: '강력한 광땡 (암행어사 주의)', isSpecial: '13gwang' };
    }
    if (hasId('1_gwang') && hasId('8_gwang')) {
      return { rank: HAND_RANK.GWANG_13_18, name: '18광땡', desc: '강력한 광땡 (암행어사 주의)', isSpecial: '18gwang' };
    }

    // 3. 특수 족보 판별 (암행어사, 땡잡이, 멍구, 구사)
    const isAmhaeng = hasId('4_yul') && hasId('7_yul');
    const isDdaengJabi = hasId('3_gwang') && hasId('7_yul');
    const isMeongGu = hasId('4_yul') && hasId('9_yul');
    const isGusa = (m1 === 4 && m2 === 9) && !isMeongGu;

    // 4. 땡 (장땡 & 1땡~9땡)
    if (m1 === m2) {
      if (m1 === 10) {
        return { rank: HAND_RANK.DDAENG_10, name: '장땡', desc: '10땡! 광땡 바로 아래 최상위 땡' };
      }
      return { rank: 70 + m1, name: `${m1}땡`, desc: `${m1}월의 땡 (땡잡이 주의)` };
    }

    // 5. 알리, 독사, 구삥, 장삥, 장사, 세륙
    if (m1 === 1 && m2 === 2) return { rank: HAND_RANK.ALLI, name: '알리', desc: '1월과 2월의 조합' };
    if (m1 === 1 && m2 === 4) return { rank: HAND_RANK.DOKSA, name: '독사', desc: '1월과 4월의 조합' };
    if (m1 === 1 && m2 === 9) return { rank: HAND_RANK.GUBBING, name: '구삥', desc: '1월과 9월의 조합' };
    if (m1 === 1 && m2 === 10) return { rank: HAND_RANK.JANGBBING, name: '장삥', desc: '1월과 10월의 조합' };
    if (m1 === 4 && m2 === 10) return { rank: HAND_RANK.JANGSA, name: '장사', desc: '4월과 10월의 조합' };
    if (m1 === 4 && m2 === 6) return { rank: HAND_RANK.SERYUK, name: '세륙', desc: '4월과 6월의 조합' };

    // 6. 특수 패 단독 보유 시 기본 명칭
    if (isAmhaeng) return { rank: 21, name: '암행어사', desc: '13/18광땡을 잡는 비밀병기 (평소 1끗)', isSpecial: 'amhaeng' };
    if (isDdaengJabi) return { rank: 10, name: '땡잡이', desc: '1땡~9땡을 잡는 사냥꾼 (평소 망통)', isSpecial: 'ddaengjabi' };
    if (isMeongGu) return { rank: 10, name: '멍텅구리 구사', desc: '장땡 이하 판을 엎고 재경기!', isSpecial: 'meonggu' };
    if (isGusa) return { rank: 23, name: '구사', desc: '알리 이하 판을 엎고 재경기!', isSpecial: 'gusa' };

    // 7. 갑오 & 끗 & 망통
    const sumMod = (m1 + m2) % 10;
    if (sumMod === 9) return { rank: 29, name: '갑오 (9끗)', desc: '끗 중 최상위인 9끗' };
    if (sumMod === 0) return { rank: 10, name: '망통', desc: '0끗' };
    return { rank: 20 + sumMod, name: `${sumMod}끗`, desc: `${sumMod}끗` };
  }

  /* ═══════════════════════════════════════════════════════════════════
     2. 쇼다운 판정 (최종 승자 및 특수 족보 상성 해결)
     ═══════════════════════════════════════════════════════════════════ */
  function resolveShowdown(activePlayers) {
    if (!activePlayers || activePlayers.length === 0) return { winners: [], isNagari: false, reason: '' };

    // 1명만 남은 경우 (나머지 전부 다이)
    if (activePlayers.length === 1) {
      return { winners: [activePlayers[0]], isNagari: false, reason: '기권승' };
    }

    const evals = activePlayers.map(p => {
      const evalResult = evaluateHand(p.cards[0], p.cards[1]);
      return { player: p, eval: evalResult };
    });

    const has38Gwang = evals.some(e => e.eval.isSpecial === '38gwang');
    const hasOtherGwang = evals.some(e => e.eval.isSpecial === '13gwang' || e.eval.isSpecial === '18gwang');
    const hasDdaeng1to9 = evals.some(e => e.eval.rank >= 71 && e.eval.rank <= 79);
    const hasJangDdaeng = evals.some(e => e.eval.rank === HAND_RANK.DDAENG_10);
    const highestStandardRank = Math.max(...evals.map(e => e.eval.rank));

    // 1. 멍텅구리 구사 재경기 검사 (광땡이 없고 장땡 이하일 때 재경기)
    const meongGuPlayer = evals.find(e => e.eval.isSpecial === 'meonggu');
    if (meongGuPlayer && !has38Gwang && !hasOtherGwang) {
      return { winners: [], isNagari: true, reason: '멍텅구리 구사로 인한 재경기! (판돈 이월)' };
    }

    // 2. 일반 구사 재경기 검사 (땡 이상이 없고 알리 이하일 때 재경기)
    const gusaPlayer = evals.find(e => e.eval.isSpecial === 'gusa');
    if (gusaPlayer && !has38Gwang && !hasOtherGwang && !hasJangDdaeng && !hasDdaeng1to9 && highestStandardRank <= HAND_RANK.ALLI) {
      return { winners: [], isNagari: true, reason: '구사로 인한 재경기! (판돈 이월)' };
    }

    // 3. 암행어사 카운터 검사 (13/18광땡이 판에 있으면 암행어사가 잡음)
    const amhaengEntry = evals.find(e => e.eval.isSpecial === 'amhaeng');
    if (amhaengEntry && hasOtherGwang && !has38Gwang) {
      return {
        winners: [amhaengEntry.player],
        isNagari: false,
        reason: '암행어사 출두요! 13/18광땡을 격파하고 승리!'
      };
    }

    // 4. 땡잡이 카운터 검사 (1땡~9땡이 있고 광땡/장땡이 없으면 땡잡이가 잡음)
    const ddaengJabiEntry = evals.find(e => e.eval.isSpecial === 'ddaengjabi');
    if (ddaengJabiEntry && hasDdaeng1to9 && !has38Gwang && !hasOtherGwang && !hasJangDdaeng) {
      return {
        winners: [ddaengJabiEntry.player],
        isNagari: false,
        reason: '땡잡이 성공! 1~9땡을 사냥하여 승리!'
      };
    }

    // 5. 기본 최고 랭크 판정
    let maxRank = -1;
    evals.forEach(e => {
      if (e.eval.rank > maxRank) maxRank = e.eval.rank;
    });

    const topEntries = evals.filter(e => e.eval.rank === maxRank);
    return {
      winners: topEntries.map(e => e.player),
      isNagari: false,
      reason: topEntries[0].eval.name + ' 승리!'
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     3. 초기화 & 생명주기
     ═══════════════════════════════════════════════════════════════════ */
  function init(container, onResult, context) {
    _container = container;
    _onResult = onResult;
    _context = context || {};
    _myId = _context.myId || 'host';
    _isHost = !!_context.isHost;

    _isHost = (typeof P2P !== 'undefined' && typeof P2P.isHost === 'function') ? P2P.isHost() : !!_context.isHost;

    if (typeof P2P !== 'undefined' && typeof P2P.onMessage === 'function') {
      P2P.offMessage(_onP2PMessage);
      P2P.onMessage(_onP2PMessage);
    }

    _state.round = 1;
    _state.pot = 0;
    _state.isGameOver = false;
    _state.isNagari = false;
    _state.dealerIdx = 0;

    // 참가자 목록 초기화 (최대 5인)
    const rawPlayers = (_context.players && _context.players.length > 0)
      ? _context.players.slice(0, 5)
      : [{ id: _myId, name: '나', isHost: true }];

    let botNickIdx = 0;
    const shuffledNicknames = [...BOT_NICKNAMES].sort(() => Math.random() - 0.5);

    _state.players = rawPlayers.map(p => {
      let assignedName = p.name || '플레이어';
      if (p.isBot && (!p.name || p.name.startsWith('봇') || p.name.startsWith('Bot'))) {
        assignedName = shuffledNicknames[botNickIdx++ % shuffledNicknames.length];
      }
      return {
        id: String(p.id),
        name: assignedName,
        isBot: !!p.isBot,
        chips: START_CHIPS,
        currentBet: 0,
        totalBet: 0,
        folded: false,
        cards: [],
        hand: null,
        theme: p.theme,
        avatarIcon: p.avatarIcon || 'fa-solid fa-user'
      };
    });

    _renderTemplate();

    if (_isHost) {
      _startNewRound();
    }
  }

  function destroy() {
    clearTimeout(_botTimer);
    clearInterval(_turnCountdownTimer);
    if (typeof P2P !== 'undefined' && typeof P2P.offMessage === 'function') {
      P2P.offMessage(_onP2PMessage);
    }
    if (_container) _container.innerHTML = '';
  }

  /* ═══════════════════════════════════════════════════════════════════
     4. 라운드 진행 & 덱 관리
     ═══════════════════════════════════════════════════════════════════ */
  function _startNewRound() {
    if (_state.isGameOver) return;

    // 파산자(칩 0) 제외
    const alivePlayers = _state.players.filter(p => p.chips > 0);
    if (alivePlayers.length <= 1) {
      _handleMatchOver(alivePlayers[0]);
      return;
    }

    // 덱 셔플
    _state.deck = [...HWATU_CARDS].sort(() => Math.random() - 0.5);

    // 베팅 변수 리셋 (재경기인 경우 팟 유지)
    if (!_state.isNagari) {
      _state.pot = 0;
    }
    _state.isNagari = false;
    _state.highestBet = DEFAULT_ANTE;
    _state.lastRaiseAmount = DEFAULT_ANTE;
    _state.bettingStage = 1;
    _state.revealedCards = false;

    // 앤티(기본 판돈) 걷기 및 1차 카드 배분 (각 1장)
    _state.players.forEach(p => {
      p.currentBet = 0;
      p.totalBet = 0;
      p.folded = p.chips <= 0;
      p.cards = [];
      p.hand = null;

      if (!p.folded) {
        const ante = Math.min(p.chips, DEFAULT_ANTE);
        p.chips -= ante;
        p.currentBet = ante;
        p.totalBet = ante;
        _state.pot += ante;

        // 1번째 카드 지급
        p.cards.push(_state.deck.pop());
      }
    });

    _state.dealerIdx = (_state.dealerIdx + 1) % _state.players.length;
    // 첫 턴은 딜러 다음 살아있는 사람
    _state.currentTurnIdx = _findNextAliveIdx(_state.dealerIdx);

    if (window.Sound) {
      Sound.playChipBet();
      setTimeout(() => Sound.playHwatuDeal(), 200);
    }

    _syncAndRender();
    _startTurnTimer();
  }

  function _findNextAliveIdx(fromIdx) {
    const len = _state.players.length;
    for (let i = 1; i <= len; i++) {
      const idx = (fromIdx + i) % len;
      if (!_state.players[idx].folded && _state.players[idx].chips > 0) {
        return idx;
      }
    }
    return fromIdx;
  }

  /* ═══════════════════════════════════════════════════════════════════
     5. 베팅 액션 처리 (다이, 체크, 콜, 삥, 따당, 하프, 쿼터, 올인)
     ═══════════════════════════════════════════════════════════════════ */
  function handleBetAction(action, playerId) {
    const curPlayer = _state.players[_state.currentTurnIdx];
    if (!curPlayer || String(curPlayer.id) !== String(playerId)) return;
    if (curPlayer.folded) return;

    clearInterval(_turnCountdownTimer);

    const neededToCall = _state.highestBet - curPlayer.currentBet;

    switch (action) {
      case 'fold':
        curPlayer.folded = true;
        if (window.Sound) Sound.playSeotdaFold();
        break;

      case 'check':
        if (neededToCall > 0) return; // 낼 판돈이 있으면 체크 불가
        if (window.Sound) Sound.playClick();
        break;

      case 'call': {
        const pay = Math.min(curPlayer.chips, neededToCall);
        curPlayer.chips -= pay;
        curPlayer.currentBet += pay;
        curPlayer.totalBet += pay;
        _state.pot += pay;
        if (window.Sound) Sound.playChipBet();
        break;
      }

      case 'ping': { // 기본액(100) 베팅
        const pay = Math.min(curPlayer.chips, neededToCall + DEFAULT_ANTE);
        curPlayer.chips -= pay;
        curPlayer.currentBet += pay;
        curPlayer.totalBet += pay;
        _state.pot += pay;
        _state.highestBet = curPlayer.currentBet;
        _state.lastRaiseAmount = DEFAULT_ANTE;
        if (window.Sound) Sound.playChipBet();
        break;
      }

      case 'dadang': { // 앞사람 레이즈의 2배 레이즈
        const raise = Math.max(DEFAULT_ANTE, _state.lastRaiseAmount * 2);
        const pay = Math.min(curPlayer.chips, neededToCall + raise);
        curPlayer.chips -= pay;
        curPlayer.currentBet += pay;
        curPlayer.totalBet += pay;
        _state.pot += pay;
        _state.highestBet = curPlayer.currentBet;
        _state.lastRaiseAmount = raise;
        if (window.Sound) Sound.playChipBet();
        break;
      }

      case 'half': { // 팟의 50% 레이즈
        const raise = Math.max(DEFAULT_ANTE, Math.floor(_state.pot * 0.5));
        const pay = Math.min(curPlayer.chips, neededToCall + raise);
        curPlayer.chips -= pay;
        curPlayer.currentBet += pay;
        curPlayer.totalBet += pay;
        _state.pot += pay;
        _state.highestBet = curPlayer.currentBet;
        _state.lastRaiseAmount = raise;
        if (window.Sound) Sound.playChipBet();
        break;
      }

      case 'quarter': { // 팟의 25% 레이즈
        const raise = Math.max(DEFAULT_ANTE, Math.floor(_state.pot * 0.25));
        const pay = Math.min(curPlayer.chips, neededToCall + raise);
        curPlayer.chips -= pay;
        curPlayer.currentBet += pay;
        curPlayer.totalBet += pay;
        _state.pot += pay;
        _state.highestBet = curPlayer.currentBet;
        _state.lastRaiseAmount = raise;
        if (window.Sound) Sound.playChipBet();
        break;
      }

      case 'allin': { // 올인
        const pay = curPlayer.chips;
        curPlayer.chips = 0;
        curPlayer.currentBet += pay;
        curPlayer.totalBet += pay;
        _state.pot += pay;
        if (curPlayer.currentBet > _state.highestBet) {
          _state.lastRaiseAmount = curPlayer.currentBet - _state.highestBet;
          _state.highestBet = curPlayer.currentBet;
        }
        if (window.Sound) Sound.playChipBet();
        break;
      }
    }

    _checkBettingStageComplete();
  }

  function _checkBettingStageComplete() {
    const active = _state.players.filter(p => !p.folded);

    // 1명 빼고 다 다이한 경우 즉시 승리
    if (active.length <= 1) {
      _showdownAndPayout();
      return;
    }

    // 모든 생존자의 현재 베팅액이 최고 베팅액과 일치하거나 올인했는지 확인
    const isStageDone = active.every(p => p.chips === 0 || p.currentBet === _state.highestBet);

    if (isStageDone) {
      if (_state.bettingStage === 1) {
        // 2차 스테이지로 진입: 2번째 카드 지급
        _state.bettingStage = 2;
        _state.highestBet = 0;
        _state.lastRaiseAmount = DEFAULT_ANTE;
        _state.players.forEach(p => {
          p.currentBet = 0;
          if (!p.folded) {
            p.cards.push(_state.deck.pop());
          }
        });

        if (window.Sound) Sound.playHwatuDeal();
        _state.currentTurnIdx = _findNextAliveIdx(_state.dealerIdx);
        _syncAndRender();
        _startTurnTimer();
      } else {
        // 2차 베팅 완료 -> 쇼다운
        _showdownAndPayout();
      }
    } else {
      // 다음 사람에게 턴 넘김
      _state.currentTurnIdx = _findNextAliveIdx(_state.currentTurnIdx);
      _syncAndRender();
      _startTurnTimer();
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     6. 쇼다운 & 팟 정산
     ═══════════════════════════════════════════════════════════════════ */
  function _showdownAndPayout() {
    clearInterval(_turnCountdownTimer);
    _state.bettingStage = 3; // 쇼다운 모드

    const active = _state.players.filter(p => !p.folded);
    const result = resolveShowdown(active);

    if (result.isNagari) {
      // 구사 재경기: 팟 유지하고 다음 라운드로
      _state.isNagari = true;
      if (window.Sound) Sound.playSeotdaRematch();
      _syncAndRender();

      setTimeout(() => {
        if (_isHost) {
          _state.round++;
          _startNewRound();
        }
      }, 4000);
      return;
    }

    // 승자 상금 분배
    const winCount = result.winners.length;
    const winAmount = Math.floor(_state.pot / winCount);
    result.winners.forEach(w => {
      w.chips += winAmount;
    });
    _state.pot = 0;

    // 사운드 연출
    if (window.Sound) {
      const topWinner = result.winners[0];
      const winHand = evaluateHand(topWinner.cards[0], topWinner.cards[1]);
      if (winHand.rank >= HAND_RANK.GWANG_13_18) {
        Sound.playSeotdaGwang();
      } else if (winHand.rank >= 70) {
        Sound.playSeotdaDdaeng();
      } else {
        Sound.playWin();
      }
    }

    _syncAndRender();

    // 5초 후 다음 라운드 진행
    setTimeout(() => {
      if (_isHost && !_state.isGameOver) {
        _state.round++;
        _startNewRound();
      }
    }, 5000);
  }

  function _handleMatchOver(finalWinner) {
    _state.isGameOver = true;
    _syncAndRender();
    if (_onResult) {
      const iWon = finalWinner && String(finalWinner.id) === String(_myId);
      setTimeout(() => _onResult(iWon), 2000);
    }
  }


  /* ═══════════════════════════════════════════════════════════════════
     7. AI 봇 두뇌 (사람처럼 자연스러운 심리전 & 가변 생각 시간)
     ═══════════════════════════════════════════════════════════════════ */
  function _startTurnTimer() {
    clearInterval(_turnCountdownTimer);
    clearTimeout(_botTimer);

    _turnTimeLeft = 15;
    const curPlayer = _state.players[_state.currentTurnIdx];
    if (!curPlayer || curPlayer.folded) return;

    _updateTurnLabel();

    // 봇인 경우 사람처럼 상황별 고민 시간(Thinking Time) 후 행동
    if (curPlayer.isBot && _isHost) {
      const needed = _state.highestBet - curPlayer.currentBet;
      let thinkDelay = 1000 + Math.random() * 800; // 기본 1.0~1.8초

      // 큰 판돈(따당/하프/올인)을 맞닥뜨렸을 때 깊은 고민 (2.0~3.2초)
      if (needed >= curPlayer.chips * 0.4 || needed >= DEFAULT_ANTE * 4) {
        thinkDelay = 1800 + Math.random() * 1200;
      } else if (needed === 0) {
        // 평화로운 체크/선 턴일 때 빠른 판단 (0.8~1.4초)
        thinkDelay = 800 + Math.random() * 600;
      }

      _botTimer = setTimeout(() => {
        _executeBotDecision(curPlayer);
      }, thinkDelay);
      return;
    }

    // 타이머 인터벌
    _turnCountdownTimer = setInterval(() => {
      _turnTimeLeft--;
      _updateTurnLabel();
      if (_turnTimeLeft <= 0) {
        clearInterval(_turnCountdownTimer);
        const needed = _state.highestBet - curPlayer.currentBet;
        if (needed === 0) {
          handleBetAction('check', curPlayer.id);
        } else {
          handleBetAction('fold', curPlayer.id);
        }
      }
    }, 1000);
  }

  function _executeBotDecision(bot) {
    const needed = _state.highestBet - bot.currentBet;
    const cards = bot.cards;

    // 봇 성향 (라운드별 개성: aggressive, tight, bluffer, trapper)
    if (!bot.personality) {
      const personalities = ['aggressive', 'tight', 'bluffer', 'trapper', 'normal'];
      bot.personality = personalities[Math.floor(Math.random() * personalities.length)];
    }

    // 패 강도 평가
    let rank = 15;
    if (cards.length >= 2) {
      rank = evaluateHand(cards[0], cards[1]).rank;
    } else if (cards.length === 1) {
      if (cards[0].type === 'gwang') rank = 65;
      else if (cards[0].month === 10 || cards[0].month === 1) rank = 50;
      else if (cards[0].type === 'yul') rank = 35;
      else rank = 20;
    }

    // 1. 슬로우 플레이(트랩): 아주 강한 패(광땡, 장땡, 알리)를 쥐었을 때 1차전에서는 일부러 체크/콜로 유인
    if (bot.personality === 'trapper' && rank >= 65 && _state.bettingStage === 1) {
      if (needed === 0) {
        handleBetAction('check', bot.id);
      } else {
        handleBetAction('call', bot.id);
      }
      return;
    }

    // 2. 블러핑(허풍): 약한 패(rank < 30)임에도 판을 흔듦
    const canBluff = (bot.personality === 'bluffer' || Math.random() < 0.12) && _state.pot <= bot.chips * 0.4;
    if (canBluff && rank < 30) {
      if (needed === 0) {
        if (Math.random() < 0.6) handleBetAction('half', bot.id);
        else handleBetAction('ping', bot.id);
      } else if (needed <= bot.chips * 0.25) {
        if (Math.random() < 0.5) handleBetAction('dadang', bot.id);
        else handleBetAction('call', bot.id);
      } else {
        handleBetAction('fold', bot.id);
      }
      return;
    }

    // 3. 초강력 패 (광땡, 땡 70점 이상)
    if (rank >= 70) {
      if (bot.chips >= needed + Math.floor(_state.pot * 0.5) && Math.random() < 0.45) {
        handleBetAction('half', bot.id);
      } else if (bot.chips >= needed + _state.lastRaiseAmount * 2 && Math.random() < 0.7) {
        handleBetAction('dadang', bot.id);
      } else if (needed > 0) {
        handleBetAction('call', bot.id);
      } else {
        handleBetAction('ping', bot.id);
      }
      return;
    }

    // 4. 중상급 패 (알리, 독사, 구삥, 장삥, 7~9끗, rank 40~69)
    if (rank >= 40) {
      if (needed === 0) {
        if (Math.random() < 0.55) handleBetAction('ping', bot.id);
        else handleBetAction('check', bot.id);
      } else if (needed <= bot.chips * 0.35) {
        // 판돈 대비 콜 비용이 적당하면 콜
        if (Math.random() < 0.25 && bot.chips >= needed + _state.lastRaiseAmount * 2) {
          handleBetAction('dadang', bot.id);
        } else {
          handleBetAction('call', bot.id);
        }
      } else {
        // 비용이 너무 비싸면 tight 성향은 다이
        if (bot.personality === 'tight' || Math.random() < 0.5) {
          handleBetAction('fold', bot.id);
        } else {
          handleBetAction('call', bot.id);
        }
      }
      return;
    }

    // 5. 약한 패 (1~4끗, 망통, rank < 40)
    if (needed === 0) {
      handleBetAction('check', bot.id);
    } else if (needed <= DEFAULT_ANTE && Math.random() < 0.4) {
      // 앤티 정도의 적은 판돈은 가볍게 콜
      handleBetAction('call', bot.id);
    } else {
      // 그 외는 자연스럽게 다이
      handleBetAction('fold', bot.id);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     8. 템플릿 렌더링 & UI 뷰
     ═══════════════════════════════════════════════════════════════════ */
  function _renderTemplate() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="seotda-container">
        <!-- 1. 상단 정보 바 (단일 턴 인디케이터 & 족보 가이드 버튼) -->
        <div class="seotda-top-bar">
          <div class="turn-indicator" id="seotda-turn-indicator" style="margin:0;">
            <span class="turn-label" id="seotda-turn-label">
              <i class="fa-solid fa-scroll"></i>
              <span id="seotda-turn-text">섯다 시작 준비 중...</span>
            </span>
          </div>
          <div class="seotda-top-actions">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-seotda-rules">
              <i class="fa-solid fa-book-open"></i> <span>족보표</span>
            </button>
          </div>
        </div>

        <!-- 2. 중앙 카지노 그린 모포 테이블 (상단 상대 좌석, 중앙 팟, 하단 내 좌석으로 쾌적하게 3단 분리) -->
        <div class="seotda-table-mat custom-scroll">
          <!-- 타 플레이어 좌석 (상단 가로 전개) -->
          <div class="seotda-opponents-row" id="seotda-opponents-row"></div>

          <!-- 중앙 팟 (Pot) 영역 -->
          <div class="seotda-center-pot">
            <div class="seotda-round-pill" id="seotda-round-pill">ROUND 1</div>
            <div class="seotda-pot-box">
              <i class="fa-solid fa-coins pot-coin-icon"></i>
              <div class="pot-info">
                <span class="pot-label">현재 판돈</span>
                <strong class="pot-amount" id="seotda-pot-amount">0</strong>
              </div>
            </div>
            <div class="seotda-status-msg" id="seotda-status-msg"></div>
          </div>

          <!-- 내 좌석 (하단 중앙) -->
          <div class="seotda-my-seat" id="seotda-my-seat">
            <div class="seotda-my-cards-wrap" id="seotda-my-cards-wrap"></div>
            <div class="seotda-my-hand-badge" id="seotda-my-hand-badge"></div>
            <div class="seotda-my-info-bar" id="seotda-my-info-bar"></div>
          </div>
        </div>

        <!-- 3. 하단 베팅 컨트롤 패널 (실제 섯다 게임 스타일 액션 & 금액 서브텍스트) -->
        <div class="seotda-bet-controls" id="seotda-bet-controls">
          <button type="button" class="btn-bet-act btn-bet-fold" data-act="fold">
            <span class="btn-bet-main"><i class="fa-solid fa-flag"></i> 다이</span>
            <span class="btn-bet-sub" id="sub-fold">기권</span>
          </button>
          <button type="button" class="btn-bet-act btn-bet-check" data-act="check">
            <span class="btn-bet-main"><i class="fa-solid fa-check"></i> 체크</span>
            <span class="btn-bet-sub" id="sub-check">통과</span>
          </button>
          <button type="button" class="btn-bet-act btn-bet-call" data-act="call">
            <span class="btn-bet-main"><i class="fa-solid fa-hand-holding-dollar"></i> 콜</span>
            <span class="btn-bet-sub" id="sub-call">0</span>
          </button>
          <button type="button" class="btn-bet-act btn-bet-ping" data-act="ping">
            <span class="btn-bet-main"><i class="fa-solid fa-arrow-up"></i> 삥</span>
            <span class="btn-bet-sub" id="sub-ping">+100</span>
          </button>
          <button type="button" class="btn-bet-act btn-bet-dadang" data-act="dadang">
            <span class="btn-bet-main"><i class="fa-solid fa-angles-up"></i> 따당</span>
            <span class="btn-bet-sub" id="sub-dadang">+200</span>
          </button>
          <button type="button" class="btn-bet-act btn-bet-quarter" data-act="quarter">
            <span class="btn-bet-main"><i class="fa-solid fa-chart-pie"></i> 쿼터</span>
            <span class="btn-bet-sub" id="sub-quarter">+25%</span>
          </button>
          <button type="button" class="btn-bet-act btn-bet-half" data-act="half">
            <span class="btn-bet-main"><i class="fa-solid fa-circle-half-stroke"></i> 하프</span>
            <span class="btn-bet-sub" id="sub-half">+50%</span>
          </button>
          <button type="button" class="btn-bet-act btn-bet-allin" data-act="allin">
            <span class="btn-bet-main"><i class="fa-solid fa-fire"></i> 올인</span>
            <span class="btn-bet-sub" id="sub-allin">전액</span>
          </button>
        </div>

        <!-- 4. 족보 가이드 모달 팝업 -->
        <div class="seotda-rules-modal hidden" id="seotda-rules-modal">
          <div class="seotda-rules-content card">
            <div class="rules-header">
              <h3><i class="fa-solid fa-book-bookmark" style="color:#f59e0b;"></i> 섯다 족보표</h3>
              <button type="button" class="btn-icon sm" id="btn-close-seotda-rules"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="rules-body custom-scroll">
              <div class="rule-tier tier-gold">
                <strong>1. 광땡 (최고 족보)</strong>
                <p>38광땡 (천하무적) > 18광땡 / 13광땡</p>
              </div>
              <div class="rule-tier tier-purple">
                <strong>2. 땡 (월별 쌍)</strong>
                <p>장땡(10땡) > 9땡 > 8땡 > ... > 1땡(삥땡)</p>
              </div>
              <div class="rule-tier tier-blue">
                <strong>3. 알리 & 족보</strong>
                <p>알리(1+2) > 독사(1+4) > 구삥(1+9) > 장삥(1+10) > 장사(4+10) > 세륙(4+6)</p>
              </div>
              <div class="rule-tier tier-green">
                <strong>4. 갑오 & 끗</strong>
                <p>갑오(9끗) > 8끗 > 7끗 > ... > 1끗 > 망통(0끗)</p>
              </div>
              <div class="rule-tier tier-red">
                <strong>5. 특수 카운터 족보</strong>
                <p>• <strong>암행어사(4열+7열)</strong>: 13/18광땡을 사냥! (평소 1끗)</p>
                <p>• <strong>땡잡이(3광+7열)</strong>: 1땡~9땡을 사냥! (평소 망통)</p>
                <p>• <strong>멍텅구리 구사(4열+9열)</strong>: 장땡 이하 판을 엎고 재경기!</p>
                <p>• <strong>구사(4+9)</strong>: 알리 이하 판을 엎고 재경기!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 족보표 토글 리스너
    const rulesBtn = document.getElementById('btn-seotda-rules');
    const rulesModal = document.getElementById('seotda-rules-modal');
    const closeRulesBtn = document.getElementById('btn-close-seotda-rules');
    if (rulesBtn && rulesModal) {
      rulesBtn.addEventListener('click', () => rulesModal.classList.remove('hidden'));
    }
    if (closeRulesBtn && rulesModal) {
      closeRulesBtn.addEventListener('click', () => rulesModal.classList.add('hidden'));
    }

    // 베팅 버튼 리스너 연결
    _container.querySelectorAll('.btn-bet-act').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        handleBetAction(act, _myId);
        // P2P 전송
        _sendP2PAction(act);
      });
    });
  }

  function _sendP2PAction(action) {
    if (typeof P2P !== 'undefined' && typeof P2P.send === 'function') {
      P2P.send({
        type: 'seotda_action',
        action: action,
        playerId: _myId
      });
    }
  }

  function _syncAndRender() {
    if (!_container) return;

    // 1. 라운드 및 팟 갱신
    const roundPill = document.getElementById('seotda-round-pill');
    if (roundPill) roundPill.textContent = `ROUND ${_state.round}`;

    const potEl = document.getElementById('seotda-pot-amount');
    if (potEl) potEl.textContent = _state.pot.toLocaleString() + ' 칩';

    const statusMsgEl = document.getElementById('seotda-status-msg');
    if (statusMsgEl) {
      if (_state.isNagari) {
        statusMsgEl.innerHTML = '<span class="status-nagari"><i class="fa-solid fa-rotate-left"></i> 구사 재경기! 판돈 이월</span>';
      } else if (_state.bettingStage === 3) {
        statusMsgEl.innerHTML = '<span class="status-showdown">★ 쇼다운 & 결과 발표 ★</span>';
      } else {
        statusMsgEl.textContent = `베팅 ${_state.bettingStage}차전`;
      }
    }

    // 2. 상대방 좌석 렌더링
    const oppRow = document.getElementById('seotda-opponents-row');
    if (oppRow) {
      const opps = _state.players.filter(p => String(p.id) !== String(_myId));
      oppRow.innerHTML = opps.map(p => {
        const isCur = String(p.id) === String(_state.players[_state.currentTurnIdx]?.id);
        const cardHtml = p.cards.map((c, i) => {
          // 쇼다운이거나 내가 볼 수 있을 때 오픈
          const isShow = _state.bettingStage === 3 && !p.folded;
          const imgSrc = isShow ? c.img : CARD_BACK_IMG;
          return `<div class="seotda-card-mini ${isShow ? 'open' : ''}"><img src="${imgSrc}" alt="card" /></div>`;
        }).join('');

        let handBadge = '';
        if (_state.bettingStage === 3 && !p.folded && p.cards.length >= 2) {
          const evalR = evaluateHand(p.cards[0], p.cards[1]);
          handBadge = `<div class="opp-hand-badge">${evalR.name}</div>`;
        }

        return `
          <div class="seotda-opp-seat ${p.folded ? 'folded' : ''} ${isCur ? 'active-turn' : ''}">
            <div class="opp-avatar"><i class="${p.avatarIcon || 'fa-solid fa-user'}"></i></div>
            <div class="opp-name">${_escapeHtml(p.name)}</div>
            <div class="opp-cards">${cardHtml}</div>
            ${handBadge}
            <div class="opp-chips"><i class="fa-solid fa-coins"></i> ${p.chips.toLocaleString()}</div>
            <div class="opp-bet-pill">${p.folded ? '다이' : `베팅: ${p.currentBet.toLocaleString()}`}</div>
          </div>
        `;
      }).join('');
    }

    // 3. 내 좌석 렌더링
    const me = _state.players.find(p => String(p.id) === String(_myId)) || _state.players[0];
    if (me) {
      const myCardsWrap = document.getElementById('seotda-my-cards-wrap');
      if (myCardsWrap) {
        myCardsWrap.innerHTML = me.cards.map((c, idx) => {
          // 2번째 카드는 쪼기 인터랙션 지원
          const isPeek = idx === 1 && !_state.revealedCards && _state.bettingStage < 3;
          const imgSrc = isPeek ? CARD_BACK_IMG : c.img;
          return `
            <div class="seotda-hwatu-card ${isPeek ? 'card-peeking' : 'card-open'}" data-card-idx="${idx}">
              <img src="${imgSrc}" alt="${c.name}" />
              ${isPeek ? '<span class="peeking-hint">탭하여 쪼기</span>' : ''}
            </div>
          `;
        }).join('');

        // 카드 쪼기/오픈 클릭 이벤트
        myCardsWrap.querySelectorAll('.card-peeking').forEach(cardEl => {
          cardEl.addEventListener('click', () => {
            _state.revealedCards = true;
            if (window.Sound) Sound.playHwatuSnap();
            _syncAndRender();
          });
        });
      }

      // 내 족보 배지
      const handBadgeEl = document.getElementById('seotda-my-hand-badge');
      if (handBadgeEl) {
        if (me.cards.length >= 2) {
          const evalR = evaluateHand(me.cards[0], me.cards[1]);
          handBadgeEl.innerHTML = `<span class="my-rank-tag ${evalR.rank >= 70 ? 'tag-gold' : ''}">★ ${evalR.name} (${evalR.desc})</span>`;
        } else if (me.cards.length === 1) {
          handBadgeEl.innerHTML = `<span class="my-rank-tag">첫 번째 패: ${me.cards[0].name}</span>`;
        } else {
          handBadgeEl.innerHTML = '';
        }
      }

      // 내 정보 바
      const myInfoBar = document.getElementById('seotda-my-info-bar');
      if (myInfoBar) {
        myInfoBar.innerHTML = `
          <div class="my-meta-pill"><i class="fa-solid fa-coins"></i> 보유: <strong>${me.chips.toLocaleString()}</strong> 칩</div>
          <div class="my-meta-pill"><i class="fa-solid fa-circle-dollar-to-slot"></i> 이번 판 베팅: <strong>${me.totalBet.toLocaleString()}</strong> 칩</div>
        `;
      }
    }

    // 4. 베팅 버튼 활성화 상태 갱신
    _updateBetControls();
    _updateTurnLabel();

    // 5. 호스트면 전체 상태 브로드캐스트
    if (_isHost && typeof P2P !== 'undefined' && typeof P2P.send === 'function') {
      P2P.send({
        type: 'seotda_sync',
        state: _state
      });
    }
  }

  function _updateBetControls() {
    const curPlayer = _state.players[_state.currentTurnIdx];
    const isMyTurn = curPlayer && String(curPlayer.id) === String(_myId) && !curPlayer.folded && _state.bettingStage < 3;

    const controls = document.getElementById('seotda-bet-controls');
    if (!controls) return;

    if (!isMyTurn) {
      controls.classList.add('controls-disabled');
      return;
    }
    controls.classList.remove('controls-disabled');

    const me = curPlayer;
    const needed = _state.highestBet - me.currentBet;

    // 1. 각 베팅별 필요 금액 산출
    const dadangRaise = Math.max(DEFAULT_ANTE, _state.lastRaiseAmount * 2);
    const dadangPay = needed + dadangRaise;

    const quarterRaise = Math.max(DEFAULT_ANTE, Math.floor(_state.pot * 0.25));
    const quarterPay = needed + quarterRaise;

    const halfRaise = Math.max(DEFAULT_ANTE, Math.floor(_state.pot * 0.5));
    const halfPay = needed + halfRaise;

    // 2. 버튼 서브텍스트 실시간 갱신
    const subCheck = document.getElementById('sub-check');
    if (subCheck) subCheck.textContent = needed === 0 ? '통과' : '불가';

    const subCall = document.getElementById('sub-call');
    if (subCall) subCall.textContent = needed > 0 ? `+${needed.toLocaleString()}` : '0';

    const subPing = document.getElementById('sub-ping');
    if (subPing) subPing.textContent = `+${DEFAULT_ANTE.toLocaleString()}`;

    const subDadang = document.getElementById('sub-dadang');
    if (subDadang) subDadang.textContent = `+${dadangPay.toLocaleString()}`;

    const subQuarter = document.getElementById('sub-quarter');
    if (subQuarter) subQuarter.textContent = `+${quarterPay.toLocaleString()}`;

    const subHalf = document.getElementById('sub-half');
    if (subHalf) subHalf.textContent = `+${halfPay.toLocaleString()}`;

    const subAllin = document.getElementById('sub-allin');
    if (subAllin) subAllin.textContent = `${me.chips.toLocaleString()}`;

    // 3. 버튼 활성화 / 비활성화 처리
    const btnCheck = controls.querySelector('.btn-bet-check');
    if (btnCheck) btnCheck.disabled = needed > 0;

    const btnCall = controls.querySelector('.btn-bet-call');
    if (btnCall) btnCall.disabled = needed === 0 && _state.highestBet === 0;

    const btnPing = controls.querySelector('.btn-bet-ping');
    if (btnPing) btnPing.disabled = needed > 0 || me.chips < DEFAULT_ANTE;

    const btnDadang = controls.querySelector('.btn-bet-dadang');
    if (btnDadang) btnDadang.disabled = me.chips < dadangPay;

    const btnQuarter = controls.querySelector('.btn-bet-quarter');
    if (btnQuarter) btnQuarter.disabled = me.chips < quarterPay;

    const btnHalf = controls.querySelector('.btn-bet-half');
    if (btnHalf) btnHalf.disabled = me.chips < halfPay;

    const btnAllin = controls.querySelector('.btn-bet-allin');
    if (btnAllin) btnAllin.disabled = me.chips <= 0;
  }

  function _updateTurnLabel() {
    const turnLabelEl = document.getElementById('seotda-turn-label');
    const turnTextEl  = document.getElementById('seotda-turn-text');
    if (!turnTextEl) return;

    if (_state.bettingStage === 3) {
      if (turnLabelEl) turnLabelEl.className = 'turn-label';
      turnTextEl.textContent = '쇼다운 결과 확인 중';
      return;
    }

    const curPlayer = _state.players[_state.currentTurnIdx];
    if (!curPlayer) return;

    const isMyTurn = String(curPlayer.id) === String(_myId);
    if (turnLabelEl) {
      turnLabelEl.className = 'turn-label ' + (isMyTurn ? 'my-turn' : 'opp-turn');
    }
    turnTextEl.textContent = isMyTurn ? `내 턴 (${_turnTimeLeft}초)` : `${curPlayer.name} 님의 턴 (${_turnTimeLeft}초)`;
  }

  /* ═══════════════════════════════════════════════════════════════════
     9. P2P 수신 처리 & 스냅샷
     ═══════════════════════════════════════════════════════════════════ */
  function _onP2PMessage(data, senderId) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'seotda_action') {
      if (_isHost) {
        handleBetAction(data.action, data.playerId || senderId);
      }
    } else if (data.type === 'seotda_sync') {
      if (!_isHost && data.state) {
        _state = data.state;
        _syncAndRender();
      }
    }
  }

  function sendSnapshotTo(targetPeerId) {
    if (!_isHost) return;
    if (typeof P2P !== 'undefined' && typeof P2P.send === 'function') {
      P2P.send({
        type: 'seotda_sync',
        state: _state
      }, targetPeerId);
    }
  }

  function removePlayer(playerId) {
    if (_state.isGameOver) return;
    const p = _state.players.find(x => String(x.id) === String(playerId));
    if (p) {
      p.folded = true;
      p.chips = 0;
      _checkBettingStageComplete();
    }
  }

  function _escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  return {
    init,
    destroy,
    sendSnapshotTo,
    removePlayer
  };
})();
