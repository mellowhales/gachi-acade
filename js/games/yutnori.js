/**
 * yutnori.js - 전통 민속 윷놀이 (2~4인 완벽 다인원 실시간 동기화)
 * - 말 모양에 각 플레이어의 고유 프로필 동물 아바타 아이콘 적용 (팀 색상 유지)
 * - 모든 참가자 화면에서 윷 던지는 3D 회전 애니메이션 및 던지는 효과음(Sound.playYutThrow) 100% 동기화
 * - 보드판 노드와 말의 z-index 완벽 정리로 보드 위 말이 선명하고 또렷하게 표시
 * - 4대 루트(OUTER, DIAG_5, DIAG_10, CENTER) 상태 머신 기반 경로 엔진
 */
const YutnoriGame = (() => {
  'use strict';

  /* =====================================================================
     0. 윷놀이 29개 노드 & 윷패 정의
     ===================================================================== */
  const BOARD_NODES = {
    0:  { x: 88, y: 88, isCorner: true, isStart: true },
    1:  { x: 88, y: 72.8 },
    2:  { x: 88, y: 57.6 },
    3:  { x: 88, y: 42.4 },
    4:  { x: 88, y: 27.2 },
    5:  { x: 88, y: 12, isCorner: true },
    6:  { x: 72.8, y: 12 },
    7:  { x: 57.6, y: 12 },
    8:  { x: 42.4, y: 12 },
    9:  { x: 27.2, y: 12 },
    10: { x: 12, y: 12, isCorner: true },
    11: { x: 12, y: 27.2 },
    12: { x: 12, y: 42.4 },
    13: { x: 12, y: 57.6 },
    14: { x: 12, y: 72.8 },
    15: { x: 12, y: 88, isCorner: true },
    16: { x: 27.2, y: 88 },
    17: { x: 42.4, y: 88 },
    18: { x: 57.6, y: 88 },
    19: { x: 72.8, y: 88 },
    20: { x: 72.8, y: 27.2 },
    21: { x: 57.6, y: 42.4 },
    22: { x: 50, y: 50, isCenter: true },
    23: { x: 42.4, y: 57.6 },
    24: { x: 27.2, y: 72.8 },
    25: { x: 27.2, y: 27.2 },
    26: { x: 42.4, y: 42.4 },
    27: { x: 57.6, y: 57.6 },
    28: { x: 72.8, y: 72.8 }
  };

  const YUT_DEFINITIONS = {
    backdo: { name: '빽도', steps: -1, color: '#e53e3e', bg: '#fff5f5', isBonus: false },
    do:     { name: '도',   steps: 1,  color: '#38a169', bg: '#f0fff4', isBonus: false },
    gae:    { name: '개',   steps: 2,  color: '#3182ce', bg: '#ebf8ff', isBonus: false },
    geol:   { name: '걸',   steps: 3,  color: '#805ad5', bg: '#faf5ff', isBonus: false },
    yut:    { name: '윷',   steps: 4,  color: '#dd6b20', bg: '#fffaf0', isBonus: true  },
    mo:     { name: '모',   steps: 5,  color: '#d69e2e', bg: '#fffff0', isBonus: true  }
  };

  const PLAYER_THEMES = [
    { color: '#e53e3e', bg: '#fff5f5', border: '#feb2b2', name: '빨강', marker: '🔴' },
    { color: '#3182ce', bg: '#ebf8ff', border: '#bee3f8', name: '파랑', marker: '🔵' },
    { color: '#38a169', bg: '#f0fff4', border: '#9ae6b4', name: '초록', marker: '🟢' },
    { color: '#d69e2e', bg: '#fffff0', border: '#faf089', name: '노랑', marker: '🟡' }
  ];

  const DEFAULT_ANIMAL_ICONS = [
    'fa-solid fa-dog',
    'fa-solid fa-cat',
    'fa-solid fa-frog',
    'fa-solid fa-otter'
  ];

  const NUM_PIECES = 4;

  let _container = null;
  let _onResult = null;
  let _context = null;

  let _myId = '';
  let _myNickname = '';
  let _isHost = false;
  let _localPlayers = [];

  let _clientState = null;
  let _selectedPieceId = null;
  let _validDestinations = [];

  let _isChargingGauge = false;
  let _gaugeValue = 0;
  let _gaugeDirection = 1;
  let _gaugeAnimFrame = null;
  let _isRollingAnim = false;
  let _lastPlayedMoveTime = 0;
  let _lastHandledRollId = 0;

  let _hostState = null;

  /* =====================================================================
     1. 초기화 & 종료
     ===================================================================== */
  function _createInitialState(pList) {
    return {
      status: 'PLAYING',
      currentTurnIdx: 0,
      rollCountLeft: 1,
      yutQueue: [],
      bannerMessage: '윷놀이 시작! 윷을 던져주세요.',
      lastRoll: null,
      lastMoveEvent: null,
      winner: null,
      leaderboard: null,
      players: pList.map((p, idx) => {
        const theme = PLAYER_THEMES[idx % PLAYER_THEMES.length];
        const avatarIcon = p.avatarIcon || (p.avatar && p.avatar.icon) || DEFAULT_ANIMAL_ICONS[idx % DEFAULT_ANIMAL_ICONS.length];
        const pieces = [];
        for (let i = 0; i < NUM_PIECES; i++) {
          pieces.push({
            id: i,
            node: null,
            stacked: 1,
            isFinished: false,
            route: 'OUTER',
            hasMoved: false
          });
        }
        return {
          id: String(p.id),
          name: p.name || ('플레이어 ' + (idx + 1)),
          isHost: !!p.isHost,
          theme: theme,
          avatarIcon: avatarIcon,
          finishedCount: 0,
          pieces: pieces
        };
      })
    };
  }

  function init(containerEl, onGameResult, context) {
    _container = containerEl;
    _onResult  = onGameResult;
    _context   = context || {};

    const pList = (_context && Array.isArray(_context.players) && _context.players.length > 0)
      ? _context.players
      : [{ id: 'p0', name: '나', isHost: true }];
    _localPlayers = pList;
    _myId = String((_context && _context.myId) || (typeof P2P !== 'undefined' ? P2P.getMyId() : '') || '');
    _myNickname = String((_context && _context.myNickname) || '');
    _isHost = typeof P2P !== 'undefined' ? P2P.isHost() : true;

    _lastPlayedMoveTime = 0;
    _lastHandledRollId = 0;

    // 모든 클라이언트(호스트, 게스트, 관전자)가 즉시 로컬 초기 상태를 생성하여 0ms에 렌더링
    _clientState = _createInitialState(pList);
    _selectedPieceId = null;
    _validDestinations = [];
    _isRollingAnim = false;
    _stopGaugeCharge();

    if (_isHost) {
      _hostState = _createInitialState(pList);
    }

    _renderInitialLayout();
    _renderGameUI();

    if (typeof P2P !== 'undefined') {
      P2P.onMessage(onMessage);
    }

    if (_isHost) {
      _hostBroadcastState();
      setTimeout(() => {
        if (_hostState) _hostBroadcastState();
      }, 150);
    } else {
      _sendAction('REQUEST_SNAPSHOT');
    }
  }

  function destroy() {
    _stopGaugeCharge();
    if (typeof P2P !== 'undefined') {
      P2P.offMessage(onMessage);
    }
    _container = null;
    _onResult  = null;
    _context   = null;
    _clientState = null;
    _hostState = null;
  }

  function rematch() {
    init(_container, _onResult, _context);
  }

  /* =====================================================================
     2. 4대 표준 경로 상태 머신 연산 엔진
     ===================================================================== */
  function _calcDestination(currentNode, steps, currentRoute, hasMoved) {
    if (steps === -1) {
      if (currentNode === null || currentNode === 'FINISH') return 'INVALID';
      if (currentNode === 0 && !hasMoved) return 'INVALID';
      if (currentNode === 0) return 19;

      const PREV_MAP = {
        1: 0, 2: 1, 3: 2, 4: 3, 5: 4,
        6: 5, 7: 6, 8: 7, 9: 8, 10: 9,
        11: 10, 12: 11, 13: 12, 14: 13, 15: 14,
        16: 15, 17: 16, 18: 17, 19: 18,
        20: 5, 21: 20, 22: 21, 23: 22, 24: 23,
        25: 10, 26: 25, 27: 22, 28: 27
      };

      if (currentNode === 22) {
        if (currentRoute === 'DIAG_10') return 26;
        return 21;
      }
      if (currentNode === 15 && currentRoute === 'DIAG_5') {
        return 24;
      }

      const prev = PREV_MAP[currentNode];
      return prev !== undefined ? prev : 'INVALID';
    }

    if (currentNode === null) {
      if (steps === 5) return 5;
      return steps;
    }

    if (currentNode === 0) {
      return 'FINISH';
    }

    let node = currentNode;
    let route = currentRoute || 'OUTER';

    if (currentNode === 5) route = 'DIAG_5';
    else if (currentNode === 10) route = 'DIAG_10';
    else if (currentNode === 22) route = 'CENTER';

    for (let s = 0; s < steps; s++) {
      if (node === 'FINISH') return 'FINISH';

      if (route === 'OUTER') {
        if (node === 19) node = (s === steps - 1) ? 0 : 'FINISH';
        else if (node === 0) return 'FINISH';
        else node = node + 1;
      } else if (route === 'DIAG_5') {
        if (node === 5) node = 20;
        else if (node === 20) node = 21;
        else if (node === 21) node = 22;
        else if (node === 22) node = 23;
        else if (node === 23) node = 24;
        else if (node === 24) node = 15;
        else if (node === 15) { node = 16; route = 'OUTER'; }
        else if (node === 19) node = (s === steps - 1) ? 0 : 'FINISH';
        else if (node === 0) return 'FINISH';
        else node = node + 1;
      } else if (route === 'DIAG_10') {
        if (node === 10) node = 25;
        else if (node === 25) node = 26;
        else if (node === 26) node = 22;
        else if (node === 22) node = 27;
        else if (node === 27) node = 28;
        else if (node === 28) node = (s === steps - 1) ? 0 : 'FINISH';
        else if (node === 0) return 'FINISH';
      } else if (route === 'CENTER') {
        if (node === 22) node = 27;
        else if (node === 27) node = 28;
        else if (node === 28) node = (s === steps - 1) ? 0 : 'FINISH';
        else if (node === 0) return 'FINISH';
      }
    }

    return node;
  }

  function _calcRouteAfterMove(currentNode, steps, currentRoute) {
    if (steps === -1) return currentRoute || 'OUTER';

    if (currentNode === null) {
      if (steps === 5) return 'DIAG_5';
      return 'OUTER';
    }

    if (currentNode === 5) return 'DIAG_5';
    if (currentNode === 10) return 'DIAG_10';
    if (currentNode === 22) return 'CENTER';

    let r = currentRoute || 'OUTER';
    if (r === 'DIAG_5') {
      let node = currentNode;
      for (let s = 0; s < steps; s++) {
        if (node === 5) node = 20;
        else if (node === 20) node = 21;
        else if (node === 21) node = 22;
        else if (node === 22) node = 23;
        else if (node === 23) node = 24;
        else if (node === 24) node = 15;
        else if (node === 15) { node = 16; r = 'OUTER'; }
        else if (node === 19) node = 0;
        else node = node + 1;
      }
    }
    return r;
  }

  /* =====================================================================
     3. 호스트 상태 머신 & 릴레이
     ===================================================================== */
  function _hostBroadcastState() {
    if (!_hostState) return;
    const packet = {
      type: 'SYNC_YUT_STATE',
      state: _hostState
    };
    if (typeof P2P !== 'undefined') {
      P2P.send(packet);
    }
    _applySyncedState(_hostState);
  }

  function _hostHandleAction(actionType, payload, senderId) {
    if (!_isHost || !_hostState || _hostState.status !== 'PLAYING') return;

    if (actionType === 'REQUEST_SNAPSHOT') {
      _hostBroadcastState();
      return;
    }

    const curPlayer = _hostState.players[_hostState.currentTurnIdx];
    if (!curPlayer) return;

    const sId = String(senderId || payload.senderId || '');
    const sName = String(payload.senderName || '');

    const isDev = !!(_context && _context.isDevMode);
    const isMatch = isDev ||
                    (sId && String(curPlayer.id) === sId) ||
                    (curPlayer.isHost && _isHost) ||
                    (sName && curPlayer.name === sName) ||
                    (_hostState.players.length <= 1);

    if (!isMatch) {
      console.warn('[Host Yut] 턴 불일치 무시. Sender:', sId, sName, '현재 턴:', curPlayer.id, curPlayer.name);
      return;
    }

    if (actionType === 'ROLL_YUT') {
      _hostExecRoll(curPlayer, payload.power || 50);
    } else if (actionType === 'MOVE_PIECE') {
      _hostExecMovePiece(curPlayer, payload.pieceId, payload.yutIndex, payload.targetDestNode);
    }
  }

  function _hostExecRoll(curPlayer, power) {
    if (_hostState.rollCountLeft <= 0) return;

    const PROB_FLAT = 0.40;
    const sticks = [
      Math.random() < PROB_FLAT ? 0 : 1,
      Math.random() < PROB_FLAT ? 0 : 1,
      Math.random() < PROB_FLAT ? 0 : 1,
      Math.random() < PROB_FLAT ? 0 : 1
    ];

    const flatCount = sticks.filter(s => s === 0).length;
    let yutKey = 'do';

    if (flatCount === 1) {
      yutKey = (sticks[0] === 0) ? 'backdo' : 'do';
    } else if (flatCount === 2) {
      yutKey = 'gae';
    } else if (flatCount === 3) {
      yutKey = 'geol';
    } else if (flatCount === 4) {
      yutKey = 'yut';
    } else if (flatCount === 0) {
      yutKey = 'mo';
    }

    const yutDef = YUT_DEFINITIONS[yutKey];

    _hostState.yutQueue.push(yutKey);

    if (yutDef.isBonus) {
      _hostState.rollCountLeft = 1;
      _hostState.bannerMessage = curPlayer.name + ': ' + yutDef.name + ' (한 번 더 던지세요!)';
    } else {
      _hostState.rollCountLeft = 0;
      _hostState.bannerMessage = curPlayer.name + ': ' + yutDef.name + ' (말을 선택하세요)';
    }

    _hostState.lastRoll = {
      key: yutKey,
      name: yutDef.name,
      sticks: sticks,
      power: power,
      rollId: Date.now()
    };

    _hostCheckAutoPassOrContinue(curPlayer);
    _hostBroadcastState();
  }

  function _hostExecMovePiece(curPlayer, pieceId, yutIndex, targetDestNode) {
    if (yutIndex < 0 || yutIndex >= _hostState.yutQueue.length) return;

    const yutKey = _hostState.yutQueue[yutIndex];
    const yutDef = YUT_DEFINITIONS[yutKey];
    if (!yutDef) return;

    const piece = curPlayer.pieces.find(p => p.id === pieceId && !p.isFinished);
    if (!piece) return;

    const dest = _calcDestination(piece.node, yutDef.steps, piece.route, piece.hasMoved);
    if (dest === 'INVALID' || String(dest) !== String(targetDestNode)) {
      return;
    }

    _hostState.yutQueue.splice(yutIndex, 1);

    let moveEventType = 'MOVE';

    if (dest === 'FINISH') {
      moveEventType = 'GOAL';
      const oldNode = piece.node;
      const finishedStack = piece.stacked;
      piece.isFinished = true;
      piece.node = 'FINISH';
      
      curPlayer.pieces.forEach(otherP => {
        if (otherP.id !== piece.id && !otherP.isFinished && otherP.node === oldNode && otherP.stacked === 0) {
          otherP.isFinished = true;
          otherP.node = 'FINISH';
        }
      });

      curPlayer.finishedCount += finishedStack;
      _hostState.bannerMessage = curPlayer.name + ' 말 골인 (' + curPlayer.finishedCount + '/' + NUM_PIECES + ')';

      if (curPlayer.finishedCount >= NUM_PIECES) {
        _hostState.lastMoveEvent = { type: 'GOAL', time: Date.now() };
        _hostState.status = 'GAME_OVER';
        _hostState.winner = curPlayer;
        
        const rankingList = [..._hostState.players].sort((a, b) => {
          if (String(a.id) === String(curPlayer.id)) return -1;
          if (String(b.id) === String(curPlayer.id)) return 1;
          return (b.finishedCount || 0) - (a.finishedCount || 0);
        });

        _hostState.leaderboard = rankingList.map((p, idx) => ({
          id: p.id,
          name: p.name,
          finishedCount: p.finishedCount || 0,
          rank: idx + 1,
          scoreText: (idx === 0) ? `${NUM_PIECES}마리 완주 (우승)` : `${p.finishedCount || 0}/${NUM_PIECES}마리 완주`
        }));

        _hostState.bannerMessage = curPlayer.name + ' 승리!';
        _hostBroadcastState();
        return;
      }
    } else {
      const oldNode = piece.node;
      const newRoute = _calcRouteAfterMove(oldNode, yutDef.steps, piece.route);
      piece.node = dest;
      piece.route = newRoute;
      piece.hasMoved = true;

      curPlayer.pieces.forEach(otherP => {
        if (otherP.id !== piece.id && !otherP.isFinished && otherP.node === oldNode && otherP.stacked === 0) {
          otherP.node = dest;
          otherP.route = newRoute;
          otherP.hasMoved = true;
        }
      });

      // 1. 잡기 검사
      let caughtEnemy = false;
      _hostState.players.forEach(otherPlayer => {
        if (String(otherPlayer.id) === String(curPlayer.id)) return;
        
        const enemyPiecesAtDest = otherPlayer.pieces.filter(ep => !ep.isFinished && ep.node === dest);
        if (enemyPiecesAtDest.length > 0) {
          caughtEnemy = true;
          enemyPiecesAtDest.forEach(ep => {
            ep.node = null;
            ep.stacked = 1;
            ep.isFinished = false;
            ep.route = 'OUTER';
            ep.hasMoved = false;
          });
          _hostState.bannerMessage = curPlayer.name + '님이 말을 잡았습니다! (윷 1회 추가)';
        }
      });

      if (caughtEnemy) {
        _hostState.rollCountLeft = 1;
        moveEventType = 'CATCH';
      }

      // 2. 업기 검사
      let hasStacked = false;
      curPlayer.pieces.forEach(myOtherPiece => {
        if (myOtherPiece.id !== piece.id && !myOtherPiece.isFinished && myOtherPiece.node === dest) {
          hasStacked = true;
          piece.stacked += myOtherPiece.stacked;
          myOtherPiece.stacked = 0;
          myOtherPiece.node = dest;
          _hostState.bannerMessage = curPlayer.name + ' 말 업기 (' + piece.stacked + '단)';
        }
      });
      if (hasStacked && !caughtEnemy) {
        moveEventType = 'STACK';
      }
    }

    _hostState.lastMoveEvent = { type: moveEventType, time: Date.now() };

    if (_hostState.yutQueue.length === 0 && _hostState.rollCountLeft === 0) {
      _hostNextTurn();
    } else {
      _hostCheckAutoPassOrContinue(curPlayer);
    }

    _hostBroadcastState();
  }

  function _hostNextTurn(reasonLog) {
    if (_hostState.status !== 'PLAYING') return;

    _hostState.yutQueue = [];
    _hostState.rollCountLeft = 1;
    _hostState.currentTurnIdx = (_hostState.currentTurnIdx + 1) % _hostState.players.length;

    const nextPlayer = _hostState.players[_hostState.currentTurnIdx];
    _hostState.bannerMessage = reasonLog || (nextPlayer.name + ' 턴');
  }

  function _hostCheckAutoPassOrContinue(curPlayer) {
    if (_hostState.rollCountLeft > 0) return;

    if (_hostState.yutQueue.length === 0) {
      _hostNextTurn();
      return;
    }

    let hasAnyValidMove = false;
    for (let yIdx = 0; yIdx < _hostState.yutQueue.length; yIdx++) {
      const yKey = _hostState.yutQueue[yIdx];
      const steps = YUT_DEFINITIONS[yKey].steps;

      for (let p of curPlayer.pieces) {
        if (!p.isFinished) {
          const dest = _calcDestination(p.node, steps, p.route, p.hasMoved);
          if (dest !== 'INVALID') {
            hasAnyValidMove = true;
            break;
          }
        }
      }
      if (hasAnyValidMove) break;
    }

    if (!hasAnyValidMove) {
      _hostNextTurn('이동 가능한 말이 없습니다.');
    }
  }

  /* =====================================================================
     4. 클라이언트 동기화 & 메시지 수신
     ===================================================================== */
  function onMessage(data, senderId) {
    if (!data || typeof data !== 'object') return;

    if (_isHost && senderId && senderId !== 'host') {
      if (['YUT_ACTION'].includes(data.type)) {
        // 호스트에서 액션 처리
      } else {
        P2P.send(data, null, senderId);
      }
    }

    if (data.type === 'SYNC_YUT_STATE') {
      _applySyncedState(data.state);
    } else if (data.type === 'YUT_ACTION') {
      if (_isHost) {
        _hostHandleAction(data.action, data, senderId || data.senderId);
      }
    }
  }

  function _applySyncedState(state) {
    if (!state) return;
    _clientState = state;

    // 🌟 다른 참가자가 윷을 던졌을 때(새로운 rollId 도착), 모든 사람의 화면에서 3D 롤링 애니메이션과 던지는 효과음(Sound.playYutThrow) 100% 동시 재생!
    if (state.lastRoll && state.lastRoll.rollId && state.lastRoll.rollId !== _lastHandledRollId) {
      _lastHandledRollId = state.lastRoll.rollId;
      if (!_isRollingAnim) {
        _trigger3DRollAnimation(state.lastRoll.power || 50);
      }
    }

    if (typeof Sound !== 'undefined') {
      if (state.lastMoveEvent && state.lastMoveEvent.time && state.lastMoveEvent.time !== _lastPlayedMoveTime) {
        _lastPlayedMoveTime = state.lastMoveEvent.time;
        if (state.lastMoveEvent.type === 'CATCH') {
          if (Sound.playPieceCatch) Sound.playPieceCatch();
        } else if (state.lastMoveEvent.type === 'STACK') {
          if (Sound.playPieceStack) Sound.playPieceStack();
        } else if (state.lastMoveEvent.type === 'GOAL') {
          if (Sound.playPieceGoal) Sound.playPieceGoal();
        } else {
          if (Sound.playPieceMove) Sound.playPieceMove();
        }
      }
    }

    _renderGameUI();
    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      window.App.updateInGameTurn(state.currentTurnIdx);
    }

    if (state.status === 'GAME_OVER' && state.winner) {
      const me = _getMyPlayerData();
      const iAmWinner = me && (String(me.id) === String(state.winner.id));
      if (typeof Sound !== 'undefined') {
        if (iAmWinner) Sound.playWin();
        else Sound.playLose();
      }
      if (typeof _onResult === 'function') {
        _onResult(iAmWinner, null, state.leaderboard || null);
      }
    }
  }

  function _isMe(playerObj) {
    if (!playerObj) return false;
    if (_context && _context.isSpectator) return false;

    // 1. 단독/로컬 테스트 환경 fallback
    if (!_localPlayers || _localPlayers.length <= 1) return true;

    const myId = String(_myId || (typeof P2P !== 'undefined' ? P2P.getMyId() : '') || '');
    const myNick = String(_myNickname || (_context && _context.myNickname) || '');

    // 2. ID 일치 검사
    if (myId && String(playerObj.id) === myId) return true;

    // 3. 호스트 여부 검사
    if (_isHost && playerObj.isHost) return true;

    // 4. 게스트 닉네임 일치 검사
    if (!_isHost && !playerObj.isHost) {
      if (myId && String(playerObj.id) === myId) return true;
      if (myNick && playerObj.name === myNick) return true;
    }

    return false;
  }

  function _isCurrentTurnPlayer(playerObj) {
    if (_context && _context.isDevMode) return true;
    return _isMe(playerObj);
  }

  function _getMyPlayerData() {
    if (!_clientState || !_clientState.players) return null;
    if (_context && _context.isDevMode) {
      return _clientState.players[_clientState.currentTurnIdx] || _clientState.players[0];
    }
    return _clientState.players.find(p => _isMe(p)) || null;
  }

  function _sendAction(action, extraPayload) {
    const payload = Object.assign({
      type: 'YUT_ACTION',
      action: action,
      senderId: _myId,
      senderName: _myNickname
    }, extraPayload || {});

    if (_isHost) {
      _hostHandleAction(action, payload, _myId);
    } else {
      if (typeof P2P !== 'undefined') {
        P2P.send(payload);
      }
    }
  }

  /* =====================================================================
     5. 캐릭터 선선택 -> 이동 위치 클릭
     ===================================================================== */
  function _onPieceSelect(pieceId) {
    if (typeof Sound !== 'undefined' && Sound.playPieceSelect) Sound.playPieceSelect();
    if (!_clientState) return;
    const curPlayer = _clientState.players[_clientState.currentTurnIdx];
    const isMyTurn = _isCurrentTurnPlayer(curPlayer);
    if (!isMyTurn || _clientState.rollCountLeft > 0 || _clientState.yutQueue.length === 0) return;

    if (_selectedPieceId === pieceId) {
      _selectedPieceId = null;
      _validDestinations = [];
    } else {
      _selectedPieceId = pieceId;
      _computeValidDestinations();
    }

    _renderGameUI();
  }

  function _computeValidDestinations() {
    _validDestinations = [];
    if (!_clientState || _selectedPieceId === null) return;

    const myPlayerData = _getMyPlayerData() || _clientState.players[_clientState.currentTurnIdx];
    if (!myPlayerData) return;

    const piece = myPlayerData.pieces.find(p => p.id === _selectedPieceId && !p.isFinished);
    if (!piece) return;

    _clientState.yutQueue.forEach((yKey, qIdx) => {
      const yDef = YUT_DEFINITIONS[yKey];
      if (!yDef) return;

      const dest = _calcDestination(piece.node, yDef.steps, piece.route, piece.hasMoved);
      if (dest !== 'INVALID') {
        _validDestinations.push({
          destNode: dest,
          yutIndex: qIdx,
          yutName: yDef.name
        });
      }
    });
  }

  function _onDestinationNodeClick(destItem) {
    if (typeof Sound !== 'undefined' && Sound.playPieceMove) Sound.playPieceMove();
    if (!_clientState || _selectedPieceId === null || !destItem) return;

    _sendAction('MOVE_PIECE', {
      pieceId: _selectedPieceId,
      yutIndex: destItem.yutIndex,
      targetDestNode: destItem.destNode
    });

    _selectedPieceId = null;
    _validDestinations = [];
    _renderGameUI();
  }

  /* =====================================================================
     6. UI 렌더링
     ===================================================================== */
  function _renderInitialLayout() {
    if (!_container) return;

    _container.innerHTML = [
      '<div class="yut-game-container">',
      '  <div class="yut-header-bar">',
      '    <div class="yut-turn-badge" id="yut-turn-badge">',
      '      <span class="yut-pulse-dot"></span>',
      '      <strong id="yut-turn-text">로딩 중...</strong>',
      '    </div>',
      '    <div class="yut-banner-msg" id="yut-banner-msg">윷놀이</div>',
      '    <div class="yut-score-pills" id="yut-score-pills"></div>',
      '  </div>',
      '',
      '  <div class="yut-main-layout">',
      '    <!-- 1. 전통 윷판 & 대기 말 바 -->',
      '    <div class="yut-board-wrapper">',
      '      <div class="yut-board-surface" id="yut-board-surface">',
      '        <svg class="yut-board-svg" viewBox="0 0 100 100">',
      '          <line x1="88" y1="88" x2="88" y2="12" stroke="#b08968" stroke-width="2.2" stroke-dasharray="3 1.5"/>',
      '          <line x1="88" y1="12" x2="12" y2="12" stroke="#b08968" stroke-width="2.2" stroke-dasharray="3 1.5"/>',
      '          <line x1="12" y1="12" x2="12" y2="88" stroke="#b08968" stroke-width="2.2" stroke-dasharray="3 1.5"/>',
      '          <line x1="12" y1="88" x2="88" y2="88" stroke="#b08968" stroke-width="2.2" stroke-dasharray="3 1.5"/>',
      '          <line x1="88" y1="12" x2="12" y2="88" stroke="#c08552" stroke-width="2" stroke-dasharray="3 1.5"/>',
      '          <line x1="12" y1="12" x2="88" y2="88" stroke="#c08552" stroke-width="2" stroke-dasharray="3 1.5"/>',
      '        </svg>',
      '        <div class="yut-nodes-layer" id="yut-nodes-layer"></div>',
      '        <div class="yut-pieces-layer" id="yut-pieces-layer"></div>',
      '        <div class="yut-finish-target" id="yut-finish-target" style="display:none;">',
      '          <button type="button" class="btn btn-primary yut-finish-btn" id="btn-finish-goal"><i class="fa-solid fa-flag-checkered"></i> <span>완주 골인!</span></button>',
      '        </div>',
      '      </div>',
      '      ',
      '      <!-- 대기 말 바 -->',
      '      <div class="yut-waiting-section" id="yut-waiting-section">',
      '        <div class="yut-waiting-header">대기 말</div>',
      '        <div class="yut-waiting-list" id="yut-waiting-list"></div>',
      '      </div>',
      '    </div>',
      '',
      '    <!-- 2. 컨트롤 패널 -->',
      '    <div class="yut-control-panel card">',
      '      <div class="yut-mat-arena" id="yut-mat-arena">',
      '        <div class="yut-stick-item" id="stick-0"><div class="stick-wood-body"><span class="stick-x-pattern"></span><span class="stick-x-pattern"></span><span class="stick-x-pattern"></span></div></div>',
      '        <div class="yut-stick-item" id="stick-1"><div class="stick-wood-body"><span class="stick-x-pattern"></span><span class="stick-x-pattern"></span><span class="stick-x-pattern"></span></div></div>',
      '        <div class="yut-stick-item" id="stick-2"><div class="stick-wood-body"><span class="stick-x-pattern"></span><span class="stick-x-pattern"></span><span class="stick-x-pattern"></span></div></div>',
      '        <div class="yut-stick-item" id="stick-3"><div class="stick-wood-body"><span class="stick-x-pattern"></span><span class="stick-x-pattern"></span><span class="stick-x-pattern"></span></div></div>',
      '      </div>',
      '',
      '      <div class="yut-throw-control-area">',
      '        <div class="yut-gauge-track">',
      '          <div class="yut-gauge-fill" id="yut-gauge-fill"></div>',
      '        </div>',
      '        <button type="button" class="btn btn-primary btn-lg yut-power-btn disabled" id="btn-yut-power" disabled>',
      '          <i class="fa-solid fa-dice"></i>',
      '          <span id="yut-btn-main-text">윷 던지기</span>',
      '        </button>',
      '      </div>',
      '',
      '      <!-- 동그란 원형 윷패 토큰 바 -->',
      '      <div class="yut-queue-tokens-container">',
      '        <div class="yut-queue-tokens-bar" id="yut-queue-tokens-bar"></div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');

    const nodesLayer = document.getElementById('yut-nodes-layer');
    if (nodesLayer) {
      nodesLayer.innerHTML = '';
      Object.keys(BOARD_NODES).forEach(nodeKey => {
        const n = BOARD_NODES[nodeKey];
        const nodeEl = document.createElement('div');
        nodeEl.className = 'yut-board-node' + 
          (n.isCorner ? ' corner-node' : '') + 
          (n.isCenter ? ' center-node' : '') + 
          (n.isStart ? ' start-node' : '');
        nodeEl.id = 'yut-node-' + nodeKey;
        nodeEl.style.left = n.x + '%';
        nodeEl.style.top = n.y + '%';
        nodesLayer.appendChild(nodeEl);
      });
    }

    _bindGaugeButtonEvents();
  }

  function _bindGaugeButtonEvents() {
    const btn = document.getElementById('btn-yut-power');
    if (!btn) return;

    const startCharge = (e) => {
      if (_isRollingAnim || !_clientState) return;

      const curPlayer = _clientState.players[_clientState.currentTurnIdx];
      const isMyTurn = _isCurrentTurnPlayer(curPlayer);
      const canRoll = isMyTurn && _clientState.rollCountLeft > 0 && _clientState.status === 'PLAYING';
      if (!canRoll) return;

      _startGaugeCharge();
    };

    const releaseCharge = (e) => {
      if (!_isChargingGauge) return;

      const finalPower = _stopGaugeCharge();
      _trigger3DRollAnimation(finalPower);
      _sendAction('ROLL_YUT', { power: finalPower });
    };

    btn.addEventListener('pointerdown', startCharge);
    window.addEventListener('pointerup', releaseCharge);
    window.addEventListener('pointercancel', releaseCharge);

    btn.addEventListener('mousedown', startCharge);
    window.addEventListener('mouseup', releaseCharge);

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startCharge(e);
    }, { passive: false });
    window.addEventListener('touchend', releaseCharge);

    btn.addEventListener('click', (e) => {
      if (_isRollingAnim || !_clientState) return;
      const curPlayer = _clientState.players[_clientState.currentTurnIdx];
      const isMyTurn = _isCurrentTurnPlayer(curPlayer);
      const canRoll = isMyTurn && _clientState.rollCountLeft > 0 && _clientState.status === 'PLAYING';
      if (!canRoll) return;

      if (!_isChargingGauge) {
        _trigger3DRollAnimation(50);
        _sendAction('ROLL_YUT', { power: 50 });
      }
    });
  }

  function _startGaugeCharge() {
    _isChargingGauge = true;
    _gaugeValue = 10;
    _gaugeDirection = 1;

    const fillEl = document.getElementById('yut-gauge-fill');

    const stepGauge = () => {
      if (!_isChargingGauge) return;

      _gaugeValue += _gaugeDirection * 1.1;
      if (_gaugeValue >= 100) {
        _gaugeValue = 100;
        _gaugeDirection = -1;
      } else if (_gaugeValue <= 5) {
        _gaugeValue = 5;
        _gaugeDirection = 1;
      }

      if (fillEl) {
        fillEl.style.width = _gaugeValue + '%';
        if (_gaugeValue > 80) {
          fillEl.style.backgroundColor = '#e53e3e';
        } else if (_gaugeValue > 40) {
          fillEl.style.backgroundColor = '#dd6b20';
        } else {
          fillEl.style.backgroundColor = '#38a169';
        }
      }

      _gaugeAnimFrame = requestAnimationFrame(stepGauge);
    };

    _gaugeAnimFrame = requestAnimationFrame(stepGauge);
  }

  function _stopGaugeCharge() {
    _isChargingGauge = false;
    if (_gaugeAnimFrame) {
      cancelAnimationFrame(_gaugeAnimFrame);
      _gaugeAnimFrame = null;
    }
    const finalPower = Math.round(_gaugeValue) || 50;
    const fillEl = document.getElementById('yut-gauge-fill');
    if (fillEl) fillEl.style.width = '0%';
    return finalPower;
  }

  function _trigger3DRollAnimation(power) {
    _isRollingAnim = true;
    for (let i = 0; i < 4; i++) {
      const stick = document.getElementById('stick-' + i);
      if (stick) {
        stick.className = 'yut-stick-item rolling-3d stick-anim-' + i;
      }
    }
    if (typeof Sound !== 'undefined' && Sound.playYutThrow) {
      Sound.playYutThrow();
    }
    setTimeout(() => {
      _isRollingAnim = false;
      if (_clientState) {
        if (_clientState.lastRoll && typeof Sound !== 'undefined' && Sound.playYutResult) {
          Sound.playYutResult(_clientState.lastRoll.key);
        }
        _renderGameUI();
      }
    }, 750);
  }

  function _renderGameUI() {
    if (!_clientState || !_container) return;

    const state = _clientState;
    const curPlayer = state.players[state.currentTurnIdx];
    if (!curPlayer) return;
    const isMyTurn = _isCurrentTurnPlayer(curPlayer);
    const myPlayerData = _getMyPlayerData() || curPlayer;

    // 1. 턴 텍스트
    const turnTextEl = document.getElementById('yut-turn-text');
    if (turnTextEl) {
      turnTextEl.textContent = isMyTurn ? '내 차례' : (curPlayer.name + ' 차례');
      turnTextEl.style.color = curPlayer.theme ? curPlayer.theme.color : '#3182ce';
    }

    // 2. 알림 텍스트
    const bannerMsgEl = document.getElementById('yut-banner-msg');
    if (bannerMsgEl) {
      bannerMsgEl.textContent = state.bannerMessage || '윷놀이';
    }

    // 3. 점수 알약
    const scorePillsEl = document.getElementById('yut-score-pills');
    if (scorePillsEl) {
      scorePillsEl.innerHTML = state.players.map((p, idx) => 
        '<div class="yut-score-pill ' + (idx === state.currentTurnIdx ? 'active-turn' : '') + '" style="border-color:' + (p.theme ? p.theme.color : '#3182ce') + '">' +
        '  <span class="yut-sp-marker"><i class="' + (p.avatarIcon || 'fa-solid fa-dog') + '"></i></span>' +
        '  <span class="yut-sp-name">' + _escapeHtml(p.name) + '</span>' +
        '  <strong class="yut-sp-score">' + p.finishedCount + '/' + NUM_PIECES + '</strong>' +
        '</div>'
      ).join('');
    }

    // 4. 던지기 버튼 제어
    const powerBtn = document.getElementById('btn-yut-power');
    const btnMainText = document.getElementById('yut-btn-main-text');
    if (powerBtn && btnMainText) {
      const canRoll = isMyTurn && state.rollCountLeft > 0 && state.status === 'PLAYING';
      powerBtn.disabled = !canRoll;
      powerBtn.className = 'btn btn-primary btn-lg yut-power-btn ' + (canRoll ? '' : 'disabled');
      if (canRoll) {
        btnMainText.textContent = '윷 던지기';
      } else if (isMyTurn && state.yutQueue.length > 0) {
        btnMainText.textContent = '말을 선택하세요';
      } else {
        btnMainText.textContent = isMyTurn ? '윷 던지기' : (curPlayer.name + ' 차례');
      }
    }

    // 5. 윷가락 4개 상태 반영
    if (state.lastRoll && Array.isArray(state.lastRoll.sticks) && !_isRollingAnim) {
      state.lastRoll.sticks.forEach((isRound, i) => {
        const stick = document.getElementById('stick-' + i);
        if (stick) {
          const isFlat = (isRound === 0);
          const isBackDo = (i === 0 && state.lastRoll.key === 'backdo' && isFlat);
          stick.className = 'yut-stick-item ' + (isFlat ? 'is-flat' : 'is-round') + (isBackDo ? ' is-backdo' : '');
        }
      });
    }

    // 6. 원형 윷패 토큰 렌더링
    const tokensBarEl = document.getElementById('yut-queue-tokens-bar');
    if (tokensBarEl) {
      tokensBarEl.innerHTML = '';
      if (state.yutQueue.length > 0) {
        state.yutQueue.forEach((yKey) => {
          const yDef = YUT_DEFINITIONS[yKey];
          if (!yDef) return;

          const coinEl = document.createElement('div');
          coinEl.className = 'yut-token-coin' + (yDef.isBonus ? ' is-bonus' : '');
          coinEl.style.borderColor = yDef.color;
          coinEl.style.backgroundColor = yDef.bg;
          coinEl.style.color = yDef.color;
          coinEl.textContent = yDef.name;
          coinEl.title = yDef.name + (yDef.isBonus ? ' (보너스)' : '');
          tokensBarEl.appendChild(coinEl);
        });
      }
    }

    // 7. 대기실 말 (🌟 숫자가 아닌 플레이어 프로필 동물 아이콘 렌더링)
    const waitingListEl = document.getElementById('yut-waiting-list');
    if (waitingListEl) {
      waitingListEl.innerHTML = '';
      if (myPlayerData && Array.isArray(myPlayerData.pieces)) {
        const unplacedPieces = myPlayerData.pieces.filter(p => p.node === null && !p.isFinished);

        if (unplacedPieces.length === 0) {
          waitingListEl.innerHTML = '<span class="yut-waiting-empty">모두 출발함</span>';
        } else {
          const avatarIcon = myPlayerData.avatarIcon || 'fa-solid fa-dog';
          unplacedPieces.forEach(p => {
            const pEl = document.createElement('div');
            const isSelected = (_selectedPieceId === p.id);
            const canSelect = isMyTurn && state.rollCountLeft === 0 && state.yutQueue.length > 0;

            pEl.className = 'yut-waiting-token' + 
              (isSelected ? ' selected' : '') + 
              (canSelect ? ' selectable' : '');
            pEl.style.backgroundColor = (myPlayerData.theme && myPlayerData.theme.color) ? myPlayerData.theme.color : '#3182ce';
            pEl.innerHTML = '<i class="' + avatarIcon + '"></i>';

            if (canSelect) {
              const handleTouchOrClick = (e) => {
                e.stopPropagation();
                _onPieceSelect(p.id);
              };
              pEl.addEventListener('pointerdown', handleTouchOrClick);
              pEl.addEventListener('click', handleTouchOrClick);
            }
            waitingListEl.appendChild(pEl);
          });
        }
      }
    }

    // 8. 보드판 렌더링
    _renderBoard(state, isMyTurn);
  }

  function _renderBoard(state, isMyTurn) {
    const piecesLayer = document.getElementById('yut-pieces-layer');
    const finishTarget = document.getElementById('yut-finish-target');
    if (!piecesLayer) return;
    piecesLayer.innerHTML = '';

    // 모든 노드 하이라이트 초기화
    Object.keys(BOARD_NODES).forEach(nk => {
      const nodeEl = document.getElementById('yut-node-' + nk);
      if (nodeEl) {
        nodeEl.className = nodeEl.className.replace(/ dest-highlight/g, '');
        nodeEl.onpointerdown = null;
        nodeEl.onclick = null;
        nodeEl.removeAttribute('data-yut-label');
      }
    });

    if (finishTarget) finishTarget.style.display = 'none';

    // 선택된 말의 목적지 노드 하이라이트 & 터치 바인딩
    if (_selectedPieceId !== null && _validDestinations.length > 0) {
      let hasFinish = false;
      let finishItem = null;

      _validDestinations.forEach(destItem => {
        if (destItem.destNode === 'FINISH') {
          hasFinish = true;
          finishItem = destItem;
        } else {
          const nodeEl = document.getElementById('yut-node-' + destItem.destNode);
          if (nodeEl) {
            if (!nodeEl.className.includes('dest-highlight')) {
              nodeEl.className += ' dest-highlight';
            }
            nodeEl.setAttribute('data-yut-label', destItem.yutName);

            const handleMoveTrigger = (e) => {
              e.preventDefault();
              e.stopPropagation();
              _onDestinationNodeClick(destItem);
            };
            nodeEl.onpointerdown = handleMoveTrigger;
            nodeEl.onclick = handleMoveTrigger;
          }
        }
      });

      if (hasFinish && finishTarget) {
        finishTarget.style.display = 'flex';
        const finishBtn = document.getElementById('btn-finish-goal');
        if (finishBtn) {
          const handleFinishTrigger = (e) => {
            e.preventDefault();
            e.stopPropagation();
            _onDestinationNodeClick(finishItem);
          };
          finishBtn.onpointerdown = handleFinishTrigger;
          finishBtn.onclick = handleFinishTrigger;
        }
      }
    }

    // 🌟 보드 위 말 렌더링 (숫자가 아닌 플레이어 프로필 동물 아이콘 렌더링)
    state.players.forEach(p => {
      const avatarIcon = p.avatarIcon || 'fa-solid fa-dog';
      p.pieces.forEach(piece => {
        if (piece.node !== null && piece.node !== 'FINISH' && piece.stacked > 0) {
          const coords = BOARD_NODES[piece.node];
          if (!coords) return;

          const isMine = (_context && _context.isDevMode) ? (state.players[state.currentTurnIdx] === p) : _isMe(p);
          const isSelected = isMine && (_selectedPieceId === piece.id);
          const canSelect = isMine && isMyTurn && state.rollCountLeft === 0 && state.yutQueue.length > 0;

          const pEl = document.createElement('div');
          pEl.className = 'yut-board-piece' + 
            (isSelected ? ' selected' : '') + 
            (canSelect ? ' selectable' : '');
          pEl.style.left = coords.x + '%';
          pEl.style.top = coords.y + '%';
          pEl.style.backgroundColor = p.theme ? p.theme.color : '#3182ce';

          pEl.innerHTML = 
            '<i class="' + avatarIcon + ' ybp-animal-icon"></i>' +
            (piece.stacked > 1 ? ('<span class="ybp-stack-badge">' + piece.stacked + '</span>') : '');

          if (canSelect) {
            const handlePieceTouch = (e) => {
              e.stopPropagation();
              _onPieceSelect(piece.id);
            };
            pEl.addEventListener('pointerdown', handlePieceTouch);
            pEl.addEventListener('click', handlePieceTouch);
          }

          piecesLayer.appendChild(pEl);
        }
      });
    });
  }

  function sendSnapshotTo(targetPeerId) {
    if (!_isHost || !_hostState) return;
    if (typeof P2P !== 'undefined' && P2P.send) {
      P2P.send({
        type: 'SYNC_YUT_STATE',
        state: _hostState
      }, targetPeerId);
    }
  }

  function _escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    init,
    destroy,
    rematch,
    onMessage,
    sendSnapshotTo
  };
})();
