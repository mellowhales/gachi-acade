/**
 * roulette.js - 러시안 룰렛 (Russian Roulette)
 * 2~8인 실시간 P2P 서바이벌 심리전
 *
 * 주요 룰:
 * - 2~8인 플레이어, 각자 체력 2 (❤️❤️)
 * - 6연발 리볼버 실린더에 실탄(🔴)과 공포탄(⚪) 무작위 장전
 * - 자신 쏘기: 공포탄이면 생존 + 턴 1회 추가 유지! 실탄이면 체력 피해 후 턴 종료.
 * - 상대 쏘기: 대상 지목 발사. 실탄이면 대미지, 공포탄이면 빗나감.
 * - 실린더 회전: 턴당 1회 남은 탄환 무작위 셔플
 * - 6대 전술 아이템: 돋보기(현재 탄 비공개 확인), 캔맥주(탄 배출), 수갑(상대 턴 스킵), 톱날(2배 대미지), 구급약(체력+1), 역주행(턴 반전)
 * - 최후의 1인이 승리!
 */
const RussianRouletteGame = (() => {
  'use strict';

  /* ── 효과음 신디사이저 엔진 (Web Audio API) ── */
  const RRSound = (() => {
    let _audioCtx = null;

    function getCtx() {
      if (!_audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) _audioCtx = new AudioCtx();
      }
      if (_audioCtx && _audioCtx.state === 'suspended') {
        _audioCtx.resume().catch(() => {});
      }
      return _audioCtx;
    }

    function isMuted() {
      return localStorage.getItem('arcade_sfx_muted') === 'true';
    }

    // 실탄 폭발음 (중저음 서브베이스 + 노이즈 버스트)
    function playGunshot() {
      if (isMuted()) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;

      // 1. 노이즈 폭발 (화약 폭음)
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.9, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.38);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 0.35);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);

      // 2. 깊은 서브 킥 (묵직한 충격)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 0.45);
      oscGain.gain.setValueAtTime(0.8, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    }

    // 공포탄 기계음 (철컥 - 공이 격발음)
    function playClick() {
      if (isMuted()) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2400, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.06);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    }

    // 실린더 회전음 (다다닥 래칫 클릭)
    function playSpin() {
      if (isMuted()) return;
      const ctx = getCtx();
      if (!ctx) return;
      for (let i = 0; i < 7; i++) {
        setTimeout(() => {
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1400 + i * 40, t);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.025);
        }, i * 70);
      }
    }

    // 심장 박동음 (쿵-쿵)
    function playHeartbeat() {
      if (isMuted()) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      [0, 0.14].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(75, t + delay);
        osc.frequency.exponentialRampToValueAtTime(35, t + delay + 0.12);
        gain.gain.setValueAtTime(0.35, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, t + delay + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + delay);
        osc.stop(t + delay + 0.14);
      });
    }

    // 장전 / 배출음
    function playReload() {
      if (isMuted()) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.linearRampToValueAtTime(850, t + 0.12);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    }

    // 톱날 절단음
    function playSaw() {
      if (isMuted()) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(750, t + 0.25);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    }

    // 수갑 체결음
    function playCuffs() {
      if (isMuted()) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      [0, 0.09].forEach(d => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1600, t + d);
        osc.frequency.exponentialRampToValueAtTime(900, t + d + 0.08);
        gain.gain.setValueAtTime(0.25, t + d);
        gain.gain.exponentialRampToValueAtTime(0.01, t + d + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + d);
        osc.stop(t + d + 0.09);
      });
    }

    // 맥주 캔 땋음
    function playBeer() {
      if (isMuted()) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    }

    // 구급약 회복음
    function playHeal() {
      if (isMuted()) return;
      const ctx = getCtx();
      if (!ctx) return;
      [440, 554.37, 659.25].forEach((f, idx) => {
        setTimeout(() => {
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.22);
        }, idx * 70);
      });
    }

    // 돋보기 엿보기음
    function playPeek() {
      if (isMuted()) return;
      const ctx = getCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, t);
      osc.frequency.linearRampToValueAtTime(1400, t + 0.2);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    }

    return {
      playGunshot,
      playClick,
      playSpin,
      playHeartbeat,
      playReload,
      playSaw,
      playCuffs,
      playBeer,
      playHeal,
      playPeek
    };
  })();

  /* ── 게임 상수 ── */
  const MAX_HP = 2;
  const TURN_TIME_LIMIT = 15; // 턴 제한시간 15초
  const ITEM_DEFS = {
    glass:   { name: '돋보기', icon: 'fa-solid fa-magnifying-glass', desc: '현재 탄창의 탄환(실탄/공포탄)을 비밀리에 확인합니다.' },
    beer:    { name: '캔맥주', icon: 'fa-solid fa-beer-mug-empty',   desc: '현재 탄창의 탄환을 발사하지 않고 밖으로 배출합니다.' },
    cuffs:   { name: '수갑',   icon: 'fa-solid fa-link',             desc: '지목한 플레이어의 다음 턴을 강제로 1회 스킵시킵니다.' },
    saw:     { name: '톱날',   icon: 'fa-solid fa-screwdriver-wrench', desc: '총열을 잘라 다음 실탄의 대미지를 2배(즉사)로 올립니다.' },
    medkit:  { name: '구급약', icon: 'fa-solid fa-kit-medical',      desc: '자신의 체력을 1 회복합니다. (최대 2)' },
    reverse: { name: '역주행', icon: 'fa-solid fa-rotate-left',      desc: '턴 순서를 시계 / 반시계 반대 방향으로 뒤집습니다.' }
  };
  const ALL_ITEM_KEYS = Object.keys(ITEM_DEFS);

  /* ── 게임 상태 변수 ── */
  let _container = null;
  let _onResult = null;
  let _context = null;

  let playersList = [];     // [{ id, name, avatarIcon, avatarColor, isHost, hp, isDead, handcuffed, items: [] }]
  let currentTurnIndex = 0;
  let turnDirection = 1;     // 1: 순방향, -1: 역방향
  let roundNumber = 1;
  let gameOver = false;
  let cylinder = [];         // ['live', 'blank', ...] (호스트만 정답 소유, 클라이언트는 총수량만 파악)
  let liveCount = 0;         // 남은 실탄 수
  let blankCount = 0;        // 남은 공포탄 수
  let chamberIndex = 0;      // 현재 발사할 탄환 위치
  let totalChambers = 6;
  let sawActive = false;     // 톱날 대미지 2배 활성화 여부
  let spunThisTurn = false;  // 이번 턴 실린더 회전 사용 여부
  let turnTimeLeft = TURN_TIME_LIMIT;
  let turnTimerInterval = null;
  let logs = [];             // 최근 액션 로그 (최대 10개)
  let eliminationOrder = []; // 탈락자 순서 기록 (1위, 2위 순위 계산용)

  /* ════════════════════════════════════════════════════════════════════
     1. 초기화 (init)
     ════════════════════════════════════════════════════════════════════ */
  function init(container, onResult, context) {
    _container = container;
    _onResult = onResult;
    _context = context || {};

    gameOver = false;
    roundNumber = 1;
    turnDirection = 1;
    sawActive = false;
    spunThisTurn = false;
    logs = [];
    eliminationOrder = [];
    _stopTurnTimer();

    // 플레이어 목록 파싱
    const rawPlayers = (_context.players && _context.players.length > 0)
      ? _context.players
      : [{ id: 'host', name: '나', isHost: true }];

    playersList = rawPlayers.map(p => ({
      id: String(p.id),
      name: p.name || '플레이어',
      avatarIcon: p.avatarIcon || 'fa-solid fa-user',
      avatarColor: p.avatarColor || '#e53e3e',
      isHost: !!p.isHost,
      hp: MAX_HP,
      isDead: false,
      handcuffed: false,
      items: []
    }));

    currentTurnIndex = 0;

    _renderDOM();
    _bindEvents();

    P2P.offMessage(_onMessage);
    P2P.onMessage(_onMessage);

    // 호스트 권한으로 첫 라운드 총알 생성 및 게임 시작
    if (P2P.isHost() || (_context && _context.isDevMode)) {
      _startNewRound(true);
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     2. 라운드 세팅 (호스트 전용 권한)
     ════════════════════════════════════════════════════════════════════ */
  function _startNewRound(isFirst) {
    if (!P2P.isHost() && !(_context && _context.isDevMode)) return;

    if (!isFirst) roundNumber++;
    sawActive = false;
    spunThisTurn = false;

    // 인원 및 라운드에 따른 실탄/공포탄 밸런스 설계
    // 총 6발 실린더: 실탄 1~3발, 공포탄 3~5발
    totalChambers = 6;
    let numLive = Math.floor(Math.random() * 3) + 1; // 1~3발 실탄
    let numBlank = totalChambers - numLive;          // 나머지 공포탄

    // 탄환 배열 생성 및 셔플
    cylinder = [];
    for (let i = 0; i < numLive; i++) cylinder.push('live');
    for (let i = 0; i < numBlank; i++) cylinder.push('blank');
    _shuffleArray(cylinder);

    chamberIndex = 0;
    liveCount = numLive;
    blankCount = numBlank;

    // 각 생존 플레이어에게 아이템 1~2개 보급 (최대 4개)
    playersList.forEach(p => {
      if (!p.isDead) {
        const grantCount = Math.random() < 0.6 ? 2 : 1;
        for (let k = 0; k < grantCount; k++) {
          if (p.items.length < 4) {
            const randomItem = ALL_ITEM_KEYS[Math.floor(Math.random() * ALL_ITEM_KEYS.length)];
            p.items.push(randomItem);
          }
        }
      }
    });

    // 현재 턴이 살아있는 플레이어인지 검증
    _ensureValidTurn();

    const roundMsg = `[라운드 ${roundNumber}] 리볼버 재장전! 실탄 ${liveCount}발, 공포탄 ${blankCount}발이 장전되었습니다.`;
    _addLog(roundMsg, 'important');
    RRSound.playReload();

    // 모든 참가자에게 라운드 시작 브로드캐스트
    const statePayload = {
      type: 'rr_round_start',
      roundNumber: roundNumber,
      liveCount: liveCount,
      blankCount: blankCount,
      totalChambers: totalChambers,
      chamberIndex: chamberIndex,
      sawActive: sawActive,
      playersList: playersList,
      currentTurnIndex: currentTurnIndex,
      turnDirection: turnDirection,
      logMsg: roundMsg
    };
    P2P.send(statePayload);

    _updateUI();
    _startTurnTimer();
  }

  function _shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     3. 턴 관리 & 타이머
     ════════════════════════════════════════════════════════════════════ */
  function _isMyTurn() {
    if (gameOver) return false;
    if (_context && _context.isDevMode) return true;
    if (_context && _context.isSpectator) return false;
    const cur = playersList[currentTurnIndex];
    if (!cur || cur.isDead) return false;
    const myId = String(_context.myId || '');
    return (String(cur.id) === myId) || (cur.isHost && P2P.isHost());
  }

  function _ensureValidTurn() {
    let count = 0;
    while (playersList[currentTurnIndex] && playersList[currentTurnIndex].isDead && count < playersList.length) {
      currentTurnIndex = (currentTurnIndex + turnDirection + playersList.length) % playersList.length;
      count++;
    }
  }

  function _startTurnTimer() {
    _stopTurnTimer();
    turnTimeLeft = TURN_TIME_LIMIT;
    _updateTimerDisplay();

    const cur = playersList[currentTurnIndex];
    if (_isMyTurn() && cur && !cur.isDead) {
      RRSound.playHeartbeat();
    }

    turnTimerInterval = setInterval(() => {
      turnTimeLeft--;
      _updateTimerDisplay();
      if (turnTimeLeft <= 3 && _isMyTurn()) {
        RRSound.playHeartbeat();
      }

      if (turnTimeLeft <= 0) {
        _stopTurnTimer();
        // 시간 초과 시: 호스트가 강제로 자신 쏘기 집행
        if (P2P.isHost() || (_context && _context.isDevMode)) {
          _addLog(`[시간 초과] 망설이던 ${cur ? cur.name : '플레이어'}님이 어쩔 수 없이 방아쇠를 당깁니다!`, 'important');
          _processShoot(currentTurnIndex, currentTurnIndex);
        }
      }
    }, 1000);
  }

  function _stopTurnTimer() {
    if (turnTimerInterval) {
      clearInterval(turnTimerInterval);
      turnTimerInterval = null;
    }
  }

  function _advanceTurn(keepSamePlayer) {
    spunThisTurn = false;
    _stopTurnTimer();

    if (keepSamePlayer) {
      // 보너스 턴: 동일 플레이어가 계속 턴 진행
      _updateUI();
      _startTurnTimer();
      return;
    }

    // 다음 생존 플레이어로 순환
    let nextIdx = (currentTurnIndex + turnDirection + playersList.length) % playersList.length;
    let loopLimit = 0;
    while (playersList[nextIdx] && playersList[nextIdx].isDead && loopLimit < playersList.length) {
      nextIdx = (nextIdx + turnDirection + playersList.length) % playersList.length;
      loopLimit++;
    }

    // 버그7 수정: 생존자가 없으면 게임 종료
    if (loopLimit >= playersList.length || !playersList[nextIdx] || playersList[nextIdx].isDead) {
      _checkGameOver();
      return;
    }

    // 수갑 체크
    const nextPlayer = playersList[nextIdx];
    if (nextPlayer.handcuffed) {
      nextPlayer.handcuffed = false;
      _addLog(`⛓️ [${nextPlayer.name}]님은 수갑에 묶여 이번 턴을 통과합니다!`, 'important');
      // 다음 사람으로 재순환
      let skip = (nextIdx + turnDirection + playersList.length) % playersList.length;
      let skipLimit = 0;
      while (playersList[skip] && playersList[skip].isDead && skipLimit < playersList.length) {
        skip = (skip + turnDirection + playersList.length) % playersList.length;
        skipLimit++;
      }
      if (skipLimit < playersList.length && playersList[skip] && !playersList[skip].isDead) {
        nextIdx = skip;
      }
    }

    currentTurnIndex = nextIdx;
    _updateUI();
    _startTurnTimer();
  }

  /* ════════════════════════════════════════════════════════════════════
     4. 발사 및 액션 처리 (호스트 권한)
     ════════════════════════════════════════════════════════════════════ */
  // 액션 요청 (로컬 -> 호스트)
  function _requestAction(actionData) {
    if (gameOver) return;
    if (!_isMyTurn()) return;

    if (P2P.isHost() || (_context && _context.isDevMode)) {
      _executeAction(actionData);
    } else {
      P2P.send({
        type: 'rr_req_action',
        actionData: actionData
      });
    }
  }

  function _executeAction(actionData) {
    if (gameOver) return;
    const actorIdx = currentTurnIndex;
    const actor = playersList[actorIdx];
    if (!actor || actor.isDead) return;

    if (actionData.action === 'shoot_self') {
      _processShoot(actorIdx, actorIdx);
    } else if (actionData.action === 'shoot_opp') {
      const targetIdx = actionData.targetIdx;
      _processShoot(actorIdx, targetIdx);
    } else if (actionData.action === 'spin') {
      if (spunThisTurn) return;
      spunThisTurn = true;
      _processSpin(actorIdx);
    } else if (actionData.action === 'use_item') {
      _processItem(actorIdx, actionData.itemKey, actionData.targetIdx);
    }
  }

  // 실탄/공포탄 발사 로직
  function _processShoot(shooterIdx, targetIdx) {
    _stopTurnTimer(); // 버그1 수정: 격발 즉시 타이머 중단
    const shooter = playersList[shooterIdx];
    const target = playersList[targetIdx];
    if (!shooter || !target) return;

    const isSelf = (shooterIdx === targetIdx);
    const bullet = cylinder[chamberIndex];
    const damage = sawActive ? 2 : 1;
    const hadSaw = sawActive;
    sawActive = false; // 톱날 소모

    chamberIndex++;

    if (bullet === 'live') {
      liveCount = Math.max(0, liveCount - 1);
      target.hp = Math.max(0, target.hp - damage);

      let logMsg = '';
      if (isSelf) {
        logMsg = `💥 탕!! [${shooter.name}]님이 자신을 쐈습니다! 실탄 격발! (-${damage} HP)`;
      } else {
        logMsg = `💥 탕!! [${shooter.name}]님이 [${target.name}]님을 조준 격발! 실탄 명중! (-${damage} HP)`;
      }
      _addLog(logMsg, 'important');

      // 탈락 체크
      if (target.hp <= 0) {
        target.isDead = true;
        eliminationOrder.push(target);
        _addLog(`💀 [${target.name}]님이 사망하여 탈락하셨습니다...`, 'important');
      }

      // 결과 브로드캐스트
      const actionResult = {
        type: 'rr_action_result',
        action: isSelf ? 'shoot_self' : 'shoot_opp',
        shooterIdx: shooterIdx,
        targetIdx: targetIdx,
        bullet: 'live',
        damage: damage,
        hadSaw: hadSaw,
        liveCount: liveCount,
        blankCount: blankCount,
        chamberIndex: chamberIndex,
        sawActive: sawActive,
        playersList: playersList,
        logMsg: logMsg
      };
      _broadcastAndApply(actionResult);

      // 생존자 체크
      if (_checkGameOver()) return;

      // 탄창 소진 시 재장전 or 턴 넘기기
      setTimeout(() => {
        if (gameOver) return;
        if (liveCount <= 0 || chamberIndex >= totalChambers) {
          _startNewRound(false);
        } else {
          _advanceTurn(false);
        }
      }, 1200);

    } else {
      // 공포탄 (blank)
      blankCount = Math.max(0, blankCount - 1);

      let logMsg = '';
      if (isSelf) {
        logMsg = `🕊️ 철컥... [${shooter.name}]님이 자신을 쐈습니다. 공포탄! 생존하여 [보너스 턴]을 획득합니다!`;
      } else {
        logMsg = `💨 철컥... [${shooter.name}]님이 [${target.name}]님을 쐈지만 공포탄이었습니다. 불발!`;
      }
      _addLog(logMsg, 'success');

      const actionResult = {
        type: 'rr_action_result',
        action: isSelf ? 'shoot_self' : 'shoot_opp',
        shooterIdx: shooterIdx,
        targetIdx: targetIdx,
        bullet: 'blank',
        damage: 0,
        hadSaw: hadSaw,
        liveCount: liveCount,
        blankCount: blankCount,
        chamberIndex: chamberIndex,
        sawActive: sawActive,
        playersList: playersList,
        logMsg: logMsg
      };
      _broadcastAndApply(actionResult);

      setTimeout(() => {
        if (gameOver) return;
        if (liveCount <= 0 || chamberIndex >= totalChambers) {
          _startNewRound(false);
        } else {
          // 자신을 쐈고 공포탄이면 턴 유지! 상대 쐈으면 턴 넘어감
          _advanceTurn(isSelf);
        }
      }, 1000);
    }
  }

  // 실린더 회전 로직
  function _processSpin(actorIdx) {
    const actor = playersList[actorIdx];
    // 남은 탄환들만 무작위 셔플
    const remaining = cylinder.slice(chamberIndex);
    _shuffleArray(remaining);
    for (let i = 0; i < remaining.length; i++) {
      cylinder[chamberIndex + i] = remaining[i];
    }

    const logMsg = `🎲 [${actor.name}]님이 리볼버 실린더를 힘차게 돌렸습니다! (남은 탄 무작위 재배치)`;
    _addLog(logMsg, 'normal');

    const actionResult = {
      type: 'rr_action_result',
      action: 'spin',
      actorIdx: actorIdx,
      chamberIndex: chamberIndex,
      liveCount: liveCount,
      blankCount: blankCount,
      sawActive: sawActive,
      playersList: playersList,
      logMsg: logMsg
    };
    _broadcastAndApply(actionResult);
  }

  // 아이템 사용 로직
  function _processItem(actorIdx, itemKey, targetIdx) {
    const actor = playersList[actorIdx];
    const itemPos = actor.items.indexOf(itemKey);
    if (itemPos === -1) return;
    actor.items.splice(itemPos, 1); // 소모

    let logMsg = '';
    let secretPeek = null;

    switch (itemKey) {
      case 'glass': {
        // 현재 탄창 탄환 확인 (사용자에게만 비밀 전송)
        const currentBullet = cylinder[chamberIndex];
        secretPeek = currentBullet;
        logMsg = `🔍 [${actor.name}]님이 돋보기로 현재 탄창을 은밀하게 들여다보았습니다.`;
        // 개선3 수정: 호스트인 경우도 포함하여 비밀 peek 처리
        const myId = String(_context.myId || '');
        const isActorMe = (String(actor.id) === myId) || (actor.isHost && P2P.isHost());
        if (isActorMe) {
          _showPeekModal(currentBullet);
        } else {
          P2P.send({ type: 'rr_peek_secret', bullet: currentBullet }, actor.id);
        }
        break;
      }
      case 'beer': {
        // 현재 탄환 배출
        const ejected = cylinder[chamberIndex];
        chamberIndex++;
        if (ejected === 'live') liveCount = Math.max(0, liveCount - 1);
        else blankCount = Math.max(0, blankCount - 1);
        logMsg = `🍺 [${actor.name}]님이 시원한 캔맥주를 마시며 탄환을 배출했습니다! (배출된 탄: ${ejected === 'live' ? '🔴 실탄' : '⚪ 공포탄'})`;
        break;
      }
      case 'cuffs': {
        // 버그5 수정: targetIdx undefined 방어 로직
        const target = (targetIdx !== undefined && targetIdx !== null) ? playersList[targetIdx] : null;
        if (target && !target.isDead) {
          target.handcuffed = true;
          logMsg = `⛓️ [${actor.name}]님이 [${target.name}]님에게 수갑을 채웠습니다! (다음 턴 강제 스킵)`;
        } else {
          // 버그4 수정: target 없거나 죽어있을 때 빈 로그 방지
          logMsg = `⛓️ [${actor.name}]님이 수갑을 사용했으나 유효한 대상이 없었습니다.`;
        }
        break;
      }
      case 'saw': {
        sawActive = true;
        logMsg = `🪚 [${actor.name}]님이 총열을 톱으로 잘랐습니다! (다음 격발 시 대미지 2배 폭발!)`;
        break;
      }
      case 'medkit': {
        actor.hp = Math.min(MAX_HP, actor.hp + 1);
        logMsg = `💉 [${actor.name}]님이 구급약을 사용하여 체력을 회복했습니다. (HP: ${actor.hp}/${MAX_HP})`;
        break;
      }
      case 'reverse': {
        turnDirection *= -1;
        logMsg = `🔄 [${actor.name}]님이 역주행을 발동하여 턴 진행 방향을 반대로 뒤집었습니다!`;
        break;
      }
    }

    _addLog(logMsg, 'normal');

    const actionResult = {
      type: 'rr_action_result',
      action: 'use_item',
      itemKey: itemKey,
      actorIdx: actorIdx,
      targetIdx: targetIdx,
      chamberIndex: chamberIndex,
      liveCount: liveCount,
      blankCount: blankCount,
      sawActive: sawActive,
      turnDirection: turnDirection,
      playersList: playersList,
      logMsg: logMsg
    };
    _broadcastAndApply(actionResult);

    // 맥주로 인해 탄창이 비었을 경우 재장전 체크
    if (itemKey === 'beer' && (liveCount <= 0 || chamberIndex >= totalChambers)) {
      setTimeout(() => {
        if (!gameOver) _startNewRound(false);
      }, 1000);
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     5. 게임 종료 및 승패 판정
     ════════════════════════════════════════════════════════════════════ */
  function _checkGameOver() {
    const living = playersList.filter(p => !p.isDead);
    if (living.length <= 1) {
      gameOver = true;
      _stopTurnTimer();

      const winner = living.length === 1 ? living[0] : playersList[0];

      // 순위표 생성 (1위는 최후 생존자, 이후는 탈락 역순)
      const leaderboard = [];
      leaderboard.push({
        name: winner.name,
        scoreText: '👑 최후의 생존자 (우승)'
      });

      // 탈락 역순 추가
      for (let i = eliminationOrder.length - 1; i >= 0; i--) {
        const deadP = eliminationOrder[i];
        if (deadP.id !== winner.id) {
          const rank = leaderboard.length + 1;
          leaderboard.push({
            name: deadP.name,
            scoreText: `${rank}위 탈락`
          });
        }
      }

      _addLog(`🏆 [${winner.name}]님이 최후의 생존자로 승리하셨습니다!`, 'important');

      const myId = String((_context && _context.myId) || '');
      const iAmWinner = (String(winner.id) === myId) || (winner.isHost && P2P.isHost());

      const endPayload = {
        type: 'rr_game_over',
        winnerId: winner.id,
        leaderboard: leaderboard
      };
      P2P.send(endPayload);

      setTimeout(() => {
        _onResult && _onResult(iAmWinner, `${winner.name}님이 러시안 룰렛에서 최후의 생존자로 승리하셨습니다!`, leaderboard);
      }, 1500);

      return true;
    }
    return false;
  }

  /* ════════════════════════════════════════════════════════════════════
     6. UI 렌더링 & 바인딩
     ════════════════════════════════════════════════════════════════════ */
  function _renderDOM() {
    _container.innerHTML = `
      <div class="rr-wrapper" id="rr-wrapper">
        <!-- 상단 헤더 -->
        <div class="rr-header">
          <div class="rr-round-badge">
            <i class="fa-solid fa-skull-crossbones"></i>
            <span id="rr-round-title">ROUND 1</span>
          </div>

          <div class="rr-bullet-counter">
            <div class="rr-bullet-tag live" title="장전된 실탄 수">
              <i class="fa-solid fa-fire"></i>
              <span>실탄: <strong id="rr-live-count">0</strong>발</span>
            </div>
            <div class="rr-bullet-tag blank" title="장전된 공포탄 수">
              <i class="fa-regular fa-circle"></i>
              <span>공포탄: <strong id="rr-blank-count">0</strong>발</span>
            </div>
          </div>

          <div class="rr-turn-timer-wrap">
            <i class="fa-solid fa-stopwatch"></i>
            <div class="rr-timer-pill" id="rr-timer-pill">15</div>
          </div>
        </div>

        <!-- 플레이어 그리드 (최대 8인) -->
        <div class="rr-players-grid" id="rr-players-grid"></div>

        <!-- 중앙 무대 (리볼버 실린더 & 톱날 인디케이터) -->
        <div class="rr-center-stage">
          <div class="rr-saw-indicator hidden" id="rr-saw-indicator">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>톱날 활성! 다음 실탄 2배 대미지 (즉사)</span>
          </div>

          <div class="rr-cylinder-wrap">
            <div class="rr-cylinder" id="rr-cylinder">
              <!-- 6개 탄창 홀 -->
              <div class="rr-chamber-hole" style="transform: rotate(0deg) translate(52px) rotate(0deg);" id="ch-0">1</div>
              <div class="rr-chamber-hole" style="transform: rotate(60deg) translate(52px) rotate(-60deg);" id="ch-1">2</div>
              <div class="rr-chamber-hole" style="transform: rotate(120deg) translate(52px) rotate(-120deg);" id="ch-2">3</div>
              <div class="rr-chamber-hole" style="transform: rotate(180deg) translate(52px) rotate(-180deg);" id="ch-3">4</div>
              <div class="rr-chamber-hole" style="transform: rotate(240deg) translate(52px) rotate(-240deg);" id="ch-4">5</div>
              <div class="rr-chamber-hole" style="transform: rotate(300deg) translate(52px) rotate(-300deg);" id="ch-5">6</div>
            </div>
            <div class="rr-cylinder-hub">
              <i class="fa-solid fa-crosshairs"></i>
            </div>
          </div>

          <div class="rr-action-banner" id="rr-action-banner">
            당신의 운명을 선택하세요...
          </div>
        </div>

        <!-- 하단 컨트롤 패널 -->
        <div class="rr-controls-panel">
          <div class="rr-btn-group">
            <button type="button" class="rr-btn rr-btn-self" id="btn-rr-self" title="자신을 쏩니다. 공포탄이면 생존하고 턴을 1회 더 진행합니다!">
              <i class="fa-solid fa-person-rifle"></i>
              <span>자신 쏘기 (안전 시 턴 유지)</span>
            </button>
            <button type="button" class="rr-btn rr-btn-shoot" id="btn-rr-opp" title="상대방을 지목하여 쏩니다. 실탄이면 대미지를 입힙니다.">
              <i class="fa-solid fa-gun"></i>
              <span>상대 쏘기 (대상 선택)</span>
            </button>
            <button type="button" class="rr-btn rr-btn-spin" id="btn-rr-spin" title="리볼버 실린더를 돌려 남은 탄환을 무작위로 섞습니다.">
              <i class="fa-solid fa-arrows-rotate"></i>
              <span>실린더 회전</span>
            </button>
          </div>

          <!-- 아이템 인벤토리 -->
          <div class="rr-items-tray" id="rr-items-tray">
            <span class="rr-items-title"><i class="fa-solid fa-briefcase"></i> 내 소지품:</span>
            <!-- 아이템 슬롯: JS로 동적 생성 -->
          </div>

          <!-- 액션 실시간 로그 -->
          <div class="rr-log-wrap" id="rr-log-wrap"></div>
        </div>

        <!-- 타겟 선택 모달 (상대 쏘기 / 수갑 사용 시) -->
        <div class="rr-modal-backdrop hidden" id="rr-target-modal">
          <div class="rr-modal-content">
            <div class="rr-modal-title" id="rr-modal-title">
              <i class="fa-solid fa-crosshairs"></i>
              <span>조준할 대상을 선택하세요</span>
            </div>
            <div class="rr-target-grid" id="rr-target-grid"></div>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-close-modal">취소</button>
          </div>
        </div>

        <!-- 돋보기 비밀 확인 모달 -->
        <div class="rr-modal-backdrop hidden" id="rr-peek-modal">
          <div class="rr-modal-content">
            <div class="rr-modal-title">
              <i class="fa-solid fa-magnifying-glass"></i>
              <span>돋보기 탄창 확인 결과 (비밀)</span>
            </div>
            <div class="rr-peek-card" id="rr-peek-card">확인 중...</div>
            <p style="font-size:0.85rem;color:#a0aec0;">이 정보는 오직 당신에게만 표시됩니다.</p>
            <button type="button" class="btn btn-primary btn-sm" id="btn-close-peek">확인</button>
          </div>
        </div>
      </div>
    `;
  }

  function _bindEvents() {
    const btnSelf = document.getElementById('btn-rr-self');
    const btnOpp = document.getElementById('btn-rr-opp');
    const btnSpin = document.getElementById('btn-rr-spin');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnClosePeek = document.getElementById('btn-close-peek');

    if (btnSelf) {
      btnSelf.addEventListener('click', () => {
        if (!_isMyTurn() || gameOver) return;
        _requestAction({ action: 'shoot_self' });
      });
    }

    if (btnOpp) {
      btnOpp.addEventListener('click', () => {
        if (!_isMyTurn() || gameOver) return;
        _openTargetModal('shoot');
      });
    }

    if (btnSpin) {
      btnSpin.addEventListener('click', () => {
        if (!_isMyTurn() || gameOver || spunThisTurn) return;
        _requestAction({ action: 'spin' });
      });
    }

    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => {
        const modal = document.getElementById('rr-target-modal');
        if (modal) modal.classList.add('hidden');
      });
    }

    if (btnClosePeek) {
      btnClosePeek.addEventListener('click', () => {
        const modal = document.getElementById('rr-peek-modal');
        if (modal) modal.classList.add('hidden');
      });
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     7. UI 갱신 (플레이어 목록, 실린더, 버튼 활성화)
     ════════════════════════════════════════════════════════════════════ */
  function _updateUI() {
    const isMine = _isMyTurn();
    const curPlayer = playersList[currentTurnIndex];

    // 헤더 상태
    const roundTitle = document.getElementById('rr-round-title');
    const liveEl = document.getElementById('rr-live-count');
    const blankEl = document.getElementById('rr-blank-count');
    const sawEl = document.getElementById('rr-saw-indicator');

    if (roundTitle) roundTitle.textContent = `ROUND ${roundNumber}`;
    if (liveEl) liveEl.textContent = liveCount;
    if (blankEl) blankEl.textContent = blankCount;
    if (sawEl) {
      if (sawActive) sawEl.classList.remove('hidden');
      else sawEl.classList.add('hidden');
    }

    // 플레이어 카드 렌더링
    const grid = document.getElementById('rr-players-grid');
    if (grid) {
      const myId = String((_context && _context.myId) || '');
      grid.innerHTML = playersList.map((p, idx) => {
        const isActive = (idx === currentTurnIndex);
        const isMe = (String(p.id) === myId) || (p.isHost && P2P.isHost());
        const isDead = p.isDead;

        let heartsHtml = '';
        for (let h = 0; h < MAX_HP; h++) {
          const filled = h < p.hp;
          heartsHtml += `<i class="fa-solid fa-heart rr-heart ${filled ? '' : 'lost'}"></i>`;
        }

        let badgesHtml = '';
        if (p.handcuffed) {
          badgesHtml += `<span class="rr-status-pill cuffed"><i class="fa-solid fa-link"></i> 수갑</span>`;
        }
        if (isDead) {
          badgesHtml += `<span class="rr-status-pill dead"><i class="fa-solid fa-skull"></i> 탈락</span>`;
        }

        return `
          <div class="rr-player-card ${isActive ? 'is-active-turn' : ''} ${isMe ? 'is-me' : ''} ${isDead ? 'is-dead' : ''}" id="pcard-${idx}">
            <div class="rr-avatar-box" style="background-color: ${p.avatarColor};">
              <i class="${p.avatarIcon}"></i>
              ${isActive ? '<i class="fa-solid fa-crown rr-active-crown"></i>' : ''}
            </div>
            <div class="rr-player-name" title="${p.name}">${p.name} ${isMe ? '(나)' : ''}</div>
            <div class="rr-player-hp">${heartsHtml}</div>
            <div class="rr-status-icons">${badgesHtml}</div>
          </div>
        `;
      }).join('');
    }

    // 실린더 챔버 구멍 시각화
    for (let c = 0; c < 6; c++) {
      const chEl = document.getElementById(`ch-${c}`);
      if (chEl) {
        chEl.className = 'rr-chamber-hole';
        if (c < chamberIndex) {
          chEl.classList.add('fired');
          chEl.textContent = '●';
        } else if (c === chamberIndex) {
          chEl.classList.add('current');
          chEl.textContent = `${c + 1}`;
        } else {
          chEl.classList.add('loaded');
          chEl.textContent = `${c + 1}`;
        }
      }
    }

    // 버튼 활성화 여부
    const btnSelf = document.getElementById('btn-rr-self');
    const btnOpp = document.getElementById('btn-rr-opp');
    const btnSpin = document.getElementById('btn-rr-spin');

    if (btnSelf) btnSelf.disabled = !(isMine && !gameOver);
    // 버그6 수정: 살아있는 상대가 없으면 상대 쏘기 버튼 비활성화
    const hasLivingOpponents = playersList.some((p, idx) => !p.isDead && idx !== currentTurnIndex);
    if (btnOpp) btnOpp.disabled = !(isMine && !gameOver && hasLivingOpponents);
    if (btnSpin) btnSpin.disabled = !(isMine && !gameOver && !spunThisTurn);

    // 안내 배너
    const banner = document.getElementById('rr-action-banner');
    if (banner) {
      if (gameOver) {
        banner.textContent = '게임이 종료되었습니다.';
      } else if (isMine) {
        banner.className = 'rr-action-banner highlight-win';
        banner.innerHTML = `<i class="fa-solid fa-hand-point-right"></i> 당신의 차례입니다! 결단을 내리세요.`;
      } else {
        banner.className = 'rr-action-banner';
        banner.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> ${curPlayer ? curPlayer.name : '상대방'}님이 행동을 고민하고 있습니다...`;
      }
    }

    // 내 아이템 슬롯 렌더링
    _renderItemSlots();

    // 상단 인게임 턴 표시 연동
    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      window.App.updateInGameTurn(currentTurnIndex);
    }
  }

  function _updateTimerDisplay() {
    const pill = document.getElementById('rr-timer-pill');
    if (pill) {
      pill.textContent = turnTimeLeft;
      if (turnTimeLeft <= 4) pill.classList.add('urgent');
      else pill.classList.remove('urgent');
    }
  }

function _renderItemSlots() {
  const myId = String((_context && _context.myId) || '');
  const me = playersList.find(p => (String(p.id) === myId) || (p.isHost && P2P.isHost()));
  const myItems = me ? me.items : [];
  const tray = document.getElementById('rr-items-tray');
  if (!tray) return;

  // 기존 slot 요소만 제거 (타이틀 유지)
  tray.querySelectorAll('.rr-item-slot').forEach(el => el.remove());

  const maxSlots = 4;
  for (let s = 0; s < maxSlots; s++) {
    const slotEl = document.createElement('div');
    if (s < myItems.length) {
      const itemKey = myItems[s];
      const def = ITEM_DEFS[itemKey] || { name: itemKey, icon: 'fa-solid fa-cube', desc: '' };
      slotEl.className = 'rr-item-slot';
      slotEl.title = `[${def.name}] ${def.desc}`;
      slotEl.innerHTML = `<i class="${def.icon}"></i><span class="rr-item-badge">${s + 1}</span>`;
      const capturedKey = itemKey;
      // 버그3 수정: isMine 클로저 캡처 대신 _isMyTurn() 직접 호출
      slotEl.onclick = () => {
        if (!_isMyTurn() || gameOver) return;
        _handleUseItemClick(capturedKey);
      };
    } else {
      slotEl.className = 'rr-item-slot empty';
      slotEl.title = '빈 슬롯';
    }
    tray.appendChild(slotEl);
  }
}

  // 아이템 클릭 핸들러
  function _handleUseItemClick(itemKey) {
    if (itemKey === 'cuffs') {
      // 수갑은 타겟 지목 필요
      _openTargetModal('cuffs');
    } else {
      _requestAction({ action: 'use_item', itemKey: itemKey });
    }
  }

  // 타겟 모달 열기 (상대 쏘기 / 수갑 대상)
  function _openTargetModal(purpose) {
    const modal = document.getElementById('rr-target-modal');
    const grid = document.getElementById('rr-target-grid');
    const title = document.getElementById('rr-modal-title');
    if (!modal || !grid) return;

    const myId = String((_context && _context.myId) || '');
    const livingTargets = playersList
      .map((p, idx) => ({ player: p, index: idx }))
      .filter(item => !item.player.isDead && !((String(item.player.id) === myId) || (item.player.isHost && P2P.isHost())));

    if (livingTargets.length === 0) return;

    if (purpose === 'shoot') {
      title.innerHTML = '<i class="fa-solid fa-gun"></i> 조준하여 격발할 상대방을 선택하세요';
    } else {
      title.innerHTML = '<i class="fa-solid fa-link"></i> 수갑을 채워 턴을 뺏을 상대를 선택하세요';
    }

    grid.innerHTML = livingTargets.map(item => {
      const p = item.player;
      return `
        <button type="button" class="rr-target-btn" data-idx="${item.index}">
          <div class="rr-avatar-box" style="background-color: ${p.avatarColor}; width:36px; height:36px; font-size:1.1rem;">
            <i class="${p.avatarIcon}"></i>
          </div>
          <span style="font-weight:700; font-size:0.85rem;">${p.name}</span>
          <span style="font-size:0.75rem; color:#fc8181;">HP ${p.hp}/${MAX_HP}</span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.rr-target-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetIdx = parseInt(btn.dataset.idx);
        modal.classList.add('hidden');
        if (purpose === 'shoot') {
          _requestAction({ action: 'shoot_opp', targetIdx: targetIdx });
        } else {
          _requestAction({ action: 'use_item', itemKey: 'cuffs', targetIdx: targetIdx });
        }
      });
    });

    modal.classList.remove('hidden');
  }

  // 돋보기 모달 열기
  function _showPeekModal(bullet) {
    const modal = document.getElementById('rr-peek-modal');
    const card = document.getElementById('rr-peek-card');
    if (!modal || !card) return;

    RRSound.playPeek();
    if (bullet === 'live') {
      card.className = 'rr-peek-card live';
      card.innerHTML = `<i class="fa-solid fa-fire"></i> 현재 챔버 탄환: [ 🔴 실탄 ]`;
    } else {
      card.className = 'rr-peek-card blank';
      card.innerHTML = `<i class="fa-regular fa-circle"></i> 현재 챔버 탄환: [ ⚪ 공포탄 ]`;
    }
    modal.classList.remove('hidden');
  }

  // 개선5: XSS 방지를 위한 HTML 이스케이프 함수
  function _escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _addLog(msg, type = 'normal') {
    logs.push({ msg, type });
    if (logs.length > 20) logs.shift();

    const logWrap = document.getElementById('rr-log-wrap');
    if (logWrap) {
      logWrap.innerHTML = logs.map(l => `<div class="rr-log-entry ${l.type}">${_escHtml(l.msg)}</div>`).join('');
      logWrap.scrollTop = logWrap.scrollHeight;
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     8. 애니메이션 & 효과 연출
     ════════════════════════════════════════════════════════════════════ */
  function _triggerActionFX(data) {
    const wrapper = document.getElementById('rr-wrapper');
    const cylinderEl = document.getElementById('rr-cylinder');

    if (data.action === 'shoot_self' || data.action === 'shoot_opp') {
      if (data.bullet === 'live') {
        RRSound.playGunshot();
        if (wrapper) {
          wrapper.classList.remove('shake', 'flash-red');
          void wrapper.offsetWidth;
          wrapper.classList.add('shake', 'flash-red');
        }
      } else {
        RRSound.playClick();
      }
    } else if (data.action === 'spin') {
      RRSound.playSpin();
      if (cylinderEl) {
        cylinderEl.classList.remove('spinning');
        void cylinderEl.offsetWidth; // reflow
        cylinderEl.classList.add('spinning');
        // 개선4 수정: 애니메이션 종료 후 spinning 클래스 제거 (재사용 가능하도록)
        setTimeout(() => {
          if (cylinderEl) cylinderEl.classList.remove('spinning');
        }, 900);
      }
    } else if (data.action === 'use_item') {
      if (data.itemKey === 'saw') RRSound.playSaw();
      else if (data.itemKey === 'cuffs') RRSound.playCuffs();
      else if (data.itemKey === 'beer') RRSound.playBeer();
      else if (data.itemKey === 'medkit') RRSound.playHeal();
      else if (data.itemKey === 'glass') RRSound.playPeek();
      else if (data.itemKey === 'reverse') RRSound.playSpin();
    }
  }

  function _broadcastAndApply(actionResult) {
    P2P.send(actionResult);
    _applyActionResult(actionResult);
  }

  function _applyActionResult(data) {
    liveCount = data.liveCount;
    blankCount = data.blankCount;
    chamberIndex = data.chamberIndex;
    sawActive = !!data.sawActive;
    if (typeof data.turnDirection === 'number') turnDirection = data.turnDirection;
    if (data.playersList) playersList = data.playersList;

    _triggerActionFX(data);
    _updateUI();
  }

  /* ════════════════════════════════════════════════════════════════════
     9. P2P 네트워크 메시지 수신 및 릴레이
     ════════════════════════════════════════════════════════════════════ */
  function _onMessage(data, senderId) {
    if (!data || typeof data !== 'object') return;

    // 3인 이상: 호스트는 게스트 요청을 수신하여 실행 및 릴레이
    if (P2P.isHost()) {
      if (data.type === 'rr_req_action') {
        _executeAction(data.actionData);
        return;
      }
    }

    // 클라이언트 수신 처리
    switch (data.type) {
      case 'rr_round_start': {
        roundNumber = data.roundNumber;
        liveCount = data.liveCount;
        blankCount = data.blankCount;
        totalChambers = data.totalChambers;
        chamberIndex = data.chamberIndex;
        sawActive = data.sawActive;
        playersList = data.playersList;
        currentTurnIndex = data.currentTurnIndex;
        turnDirection = data.turnDirection;
        _addLog(data.logMsg, 'important');
        RRSound.playReload();
        _updateUI();
        _startTurnTimer();
        break;
      }
      case 'rr_action_result': {
        _applyActionResult(data);
        // 버그2 수정: 클라이언트 측 shoot/spin 후 UI 멈춤 방지 - 타이머 리셋
        if (!gameOver && !P2P.isHost()) {
          if (data.action === 'shoot_self' || data.action === 'shoot_opp' || data.action === 'spin') {
            // 호스트가 advanceTurn 처리 후 새 상태 보낼 것을 기다리지 않고 타이머만 리셋
            // 실제 턴 전환은 호스트가 send하는 다음 패킷에 의해 처리됨
            _stopTurnTimer();
          }
        }
        break;
      }
      case 'rr_peek_secret': {
        _showPeekModal(data.bullet);
        break;
      }
      case 'rr_game_over': {
        gameOver = true;
        _stopTurnTimer();
        const myId = String((_context && _context.myId) || '');
        const iAmWinner = (String(data.winnerId) === myId);
        setTimeout(() => {
          _onResult && _onResult(iAmWinner, '게임이 종료되었습니다.', data.leaderboard);
        }, 1500);
        break;
      }
      case 'rr_snapshot': {
        roundNumber = data.roundNumber || 1;
        liveCount = data.liveCount || 0;
        blankCount = data.blankCount || 0;
        totalChambers = data.totalChambers || 6;
        chamberIndex = data.chamberIndex || 0;
        sawActive = !!data.sawActive;
        playersList = data.playersList || [];
        currentTurnIndex = data.currentTurnIndex || 0;
        turnDirection = data.turnDirection || 1;
        gameOver = !!data.gameOver;
        _updateUI();
        if (!gameOver) _startTurnTimer();
        break;
      }
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     10. 관전자 스냅샷 전송 & 인게임 탈주 처리
     ════════════════════════════════════════════════════════════════════ */
  function sendSnapshotTo(targetPeerId) {
    if (!P2P.isHost()) return;
    P2P.send({
      type: 'rr_snapshot',
      roundNumber: roundNumber,
      liveCount: liveCount,
      blankCount: blankCount,
      totalChambers: totalChambers,
      chamberIndex: chamberIndex,
      sawActive: sawActive,
      playersList: playersList,
      currentTurnIndex: currentTurnIndex,
      turnDirection: turnDirection,
      gameOver: gameOver
    }, targetPeerId);
  }

  function removePlayer(playerId) {
    const idx = playersList.findIndex(p => String(p.id) === String(playerId));
    if (idx === -1) return;

    const leaver = playersList[idx];
    _addLog(`🚪 [${leaver.name}]님이 게임을 떠났습니다.`, 'important');
    leaver.isDead = true;

    _updateUI();
    if (P2P.isHost() || (_context && _context.isDevMode)) {
      _checkGameOver();
      if (!gameOver && idx === currentTurnIndex) {
        _advanceTurn(false);
      }
    }
  }

  function rematch() {
    const c = document.getElementById('game-content');
    if (c) init(c, _onResult, _context);
  }

  function destroy() {
    _stopTurnTimer();
    P2P.offMessage(_onMessage);
  }

  return {
    init,
    rematch,
    destroy,
    sendSnapshotTo,
    removePlayer
  };
})();

if (typeof window !== 'undefined') {
  window.RussianRouletteGame = RussianRouletteGame;
}
