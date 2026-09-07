/**
 * chesswarfare.js - 체스 워페어 (Chess Warfare) 16x16 전장 영토 점령전 게임 모듈
 * [2단계: 기물 이동, 영토 점령 및 AP 시스템 통합]
 */
const ChessWarfareGame = (() => {
  'use strict';

  let _container = null;
  let _onResult = null;
  let _context = null;

  // 16x16 전장 규격
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];
  const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'];

  // 거점(Fortress) 지정 좌표 (6개)
  const FORTRESS_COORDS = new Set(['c3', 'n3', 'k6', 'f11', 'c14', 'n14']);

  // 시작 영토 (2x4) 좌표
  const WHITE_START_TERRITORY = new Set(['g1', 'h1', 'i1', 'j1', 'g2', 'h2', 'i2', 'j2']);
  const BLACK_START_TERRITORY = new Set(['g15', 'h15', 'i15', 'j15', 'g16', 'h16', 'i16', 'j16']);

  // 초기 기물 배치 (소수 정예)
  const INITIAL_PIECES = {
    'w': {
      'i1': 'k',
      'h1': 'n',
      'g1': 'r',
      'j1': 'r',
      'g2': 'p',
      'h2': 'p',
      'i2': 'p',
      'j2': 'p'
    },
    'b': {
      'h16': 'k',
      'i16': 'n',
      'g16': 'r',
      'j16': 'r',
      'g15': 'p',
      'h15': 'p',
      'i15': 'p',
      'j15': 'p'
    }
  };

  // 🌟 고화질 정밀 벡터 체스 기물 SVG 세트
  const PIECE_SVGS = {
    'w': {
      'k': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z" fill="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>`,
      'q': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm17 0a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25L7 14l2 12z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none"/><path d="M11 29a35 35 1 0 1 23 0M12.5 31.5h20M11.5 34.5a35 35 1 0 0 22 0M10.5 37.5a35 35 1 0 0 24 0" fill="none"/></g></svg>`,
      'r': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2.5-4.5l1.5-13.5h13l1.5 13.5h-16zM11 14h23l-2-6H13l-2 6z" stroke-linecap="butt"/><path d="M12 18h21M14 29.5h17M14 14v-4m4.5 4v-4m4.5 4v-4m4.5 4v-4m4.5 4v-4" fill="none"/></g></svg>`,
      'b': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter"/></g></svg>`,
      'n': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.5-10.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#000"/></g></svg>`,
      'p': `<svg viewBox="0 0 45 45" class="svg-piece"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    'b': {
      'k': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#1a1a1a" stroke-linecap="butt"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7z" fill="#1a1a1a"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#fff"/></g></svg>`,
      'q': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="#1a1a1a" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zm17 0a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25L7 14l2 12z" stroke-linecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke="#fff"/><path d="M11 29a35 35 1 0 1 23 0M12.5 31.5h20M11.5 34.5a35 35 1 0 0 22 0M10.5 37.5a35 35 1 0 0 24 0" fill="none" stroke="#fff"/></g></svg>`,
      'r': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="#1a1a1a" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2.5-4.5l1.5-13.5h13l1.5 13.5h-16zM11 14h23l-2-6H13l-2 6z" stroke-linecap="butt"/><path d="M12 18h21M14 29.5h17M14 14v-4m4.5 4v-4m4.5 4v-4m4.5 4v-4m4.5 4v-4" fill="none" stroke="#fff"/></g></svg>`,
      'b': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#1a1a1a" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#fff" stroke-linejoin="miter"/></g></svg>`,
      'n': `<svg viewBox="0 0 45 45" class="svg-piece"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#1a1a1a"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#1a1a1a"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.5-10.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#fff"/></g></svg>`,
      'p': `<svg viewBox="0 0 45 45" class="svg-piece"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#1a1a1a" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`
    }
  };

  // 16x16 전장 상태 맵 및 DOM 캐시
  let boardState = {};
  let _tileElements = {};

  // ⚡ 턴, 라운드 및 AP(Action Point) 상태
  const MAX_AP = 3;
  const MAX_ROUNDS = 40; // 40턴 제한
  let currentAP = MAX_AP;
  let currentTurn = 'White'; // 'White' or 'Black'
  let currentRound = 1; // 1 ~ 40턴
  let gameOver = false;
  let viewState = 'room'; // 'room' (가상 방 대기실) | 'game' (16x16 전장 인게임)

  // 💰 골드(Gold) 자원 및 기물 소환 상태
  const SPAWN_COSTS = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 8 };
  const SPAWN_NAMES = { 'p': '폰', 'n': '나이트', 'b': '비숍', 'r': '룩', 'q': '퀸' };
  let whiteGold = 0; // 시작 시 0에서 1턴 시작 골드(+2G) 수급으로 정상 시작
  let blackGold = 0;
  let selectedSpawnPiece = null; // 'p' | 'n' | 'b' | 'r' | 'q' | null
  let validSpawnCoords = []; // 소환 가능 타일 좌표 목록

  // 기물 선택 및 하이라이트 상태
  let selectedCoord = null;
  let validMoves = []; // ['g3', 'g4', ...]

  /**
   * 🌟 설정(Settings)에서 효과음(SFX)이 활성화되어 있는지 확인
   * (Sound.isSfxMuted(), localStorage 'arcade_sfx_muted', 볼륨 0 검사)
   */
  function _isSfxEnabled() {
    if (typeof Sound !== 'undefined') {
      if (typeof Sound.isSfxMuted === 'function' && Sound.isSfxMuted()) return false;
      if (typeof Sound.getSfxVolume === 'function' && Sound.getSfxVolume() <= 0) return false;
    }
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem('arcade_sfx_muted') === 'true') return false;
      const vol = parseFloat(localStorage.getItem('arcade_sfx_vol') || '0.7');
      if (vol <= 0) return false;
    }
    return true;
  }

  /**
   * 🌟 4단계: 모든 동작에 둔탁한 타격 효과음(Web Audio API) 신디사이저 🌟
   */
  const CWHeavySound = (() => {
    let ctx = null;
    function getCtx() {
      if (!ctx && typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) ctx = new AudioContext();
      }
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return ctx;
    }

    function play(type) {
      try {
        // 설정에서 효과음이 꺼져있으면 즉시 중단
        if (!_isSfxEnabled()) return;

        const ac = getCtx();
        if (!ac) return;
        const now = ac.currentTime;

        // 환경설정의 효과음 볼륨 배율 적용
        let volRatio = 1.0;
        if (typeof Sound !== 'undefined' && typeof Sound.getSfxVolume === 'function') {
          volRatio = Sound.getSfxVolume();
        } else if (typeof localStorage !== 'undefined') {
          volRatio = parseFloat(localStorage.getItem('arcade_sfx_vol') || '0.7');
        }
        if (volRatio <= 0) return;

        if (type === 'move') {
          // 둔탁한 체스 기물 착지음 (Low thud: 110Hz -> 30Hz drop)
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(110, now);
          osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);
          gain.gain.setValueAtTime(0.14 * volRatio, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (type === 'conquest') {
          // 영토 덮어쓰기 묵직한 베이스 쿵 (Sub-bass resonance 75Hz)
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(75, now);
          osc.frequency.exponentialRampToValueAtTime(26, now + 0.2);
          gain.gain.setValueAtTime(0.16 * volRatio, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.start(now);
          osc.stop(now + 0.23);
        } else if (type === 'shieldBreak') {
          // 폰 방패 파괴 둔탁한 파쇄음 (Heavy metallic crunch)
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(38, now + 0.26);
          gain.gain.setValueAtTime(0.18 * volRatio, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === 'capture') {
          // 기물 처치 묵직한 타격음 (Impact punch 140Hz -> 25Hz)
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(28, now + 0.25);
          gain.gain.setValueAtTime(0.16 * volRatio, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.start(now);
          osc.stop(now + 0.27);
        } else if (type === 'spawn') {
          // 기물 소환 둔탁한 쿵
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(65, now);
          osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.3);
          gain.gain.setValueAtTime(0.15 * volRatio, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.start(now);
          osc.stop(now + 0.33);
        } else if (type === 'turn') {
          // 턴 전환 묵직한 징/종 (Deep gong 95Hz)
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(95, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.4);
          gain.gain.setValueAtTime(0.14 * volRatio, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.start(now);
          osc.stop(now + 0.46);
        } else if (type === 'coin') {
          // 코인 유입 짤랑 & 둔탁한 착 (Dual metallic chime with base)
          const osc1 = ac.createOscillator();
          const osc2 = ac.createOscillator();
          const gain = ac.createGain();
          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(440, now);
          osc2.frequency.setValueAtTime(880, now);
          gain.gain.setValueAtTime(0.12 * volRatio, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ac.destination);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.22);
          osc2.stop(now + 0.22);
        } else if (type === 'start') {
          // 게임 시작 둥-둥 북소리 (War drum beats)
          [0, 0.18].forEach(delay => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(90, now + delay);
            osc.frequency.exponentialRampToValueAtTime(30, now + delay + 0.16);
            gain.gain.setValueAtTime(0.18 * volRatio, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.start(now + delay);
            osc.stop(now + delay + 0.2);
          });
        } else if (type === 'highway') {
          // 고속도로 기동력 슉 & 쿵
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(190, now);
          osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
          gain.gain.setValueAtTime(0.14 * volRatio, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.start(now);
          osc.stop(now + 0.22);
        } else if (type === 'win') {
          [0, 0.12, 0.26].forEach((delay, i) => {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = 'triangle';
            const freqs = [330, 440, 660];
            osc.frequency.setValueAtTime(freqs[i], now + delay);
            gain.gain.setValueAtTime(0.16 * volRatio, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.start(now + delay);
            osc.stop(now + delay + 0.28);
          });
        }
      } catch (_) {}
    }
    return { play };
  })();

  /**
   * 1인 플레이 / 테스트 모드 여부 확인
   */
  function _isSinglePlayer() {
    const players = (_context && _context.players) || [];
    const isDev = !!(_context && _context.isDevMode);
    return players.length <= 1 || isDev;
  }

  /**
   * 내 진영 (White / Black) 계산
   */
  function _getMySide() {
    const players = (_context && _context.players) || [];
    const myId = (_context && _context.myId) || '';
    const myIdx = players.findIndex(p => String(p.id) === String(myId));
    return (myIdx === 1) ? 'Black' : 'White';
  }

  /**
   * 현재 내 턴인지 확인 (1인 테스트 모드 시 현재 턴 기물 항상 조작 가능)
   */
  function _isMyTurn() {
    if (gameOver) return false;
    if (_isSinglePlayer()) return true;
    return currentTurn === _getMySide();
  }

  /**
   * 사운드 안전 호출 헬퍼 (설정 검사 후 둔탁한 타격음 신디사이저 + 플랫폼 기본 Sound 연동)
   */
  function _playSound(name) {
    // 🌟 설정에서 효과음이 켜져있을 때만 재생!
    if (!_isSfxEnabled()) return;

    // CWHeavySound가 전담하는 사운드는 단독 재생하여 중복/과대 볼륨 방지
    const heavySounds = ['move', 'conquest', 'shieldBreak', 'capture', 'spawn', 'turn', 'coin', 'start', 'highway', 'win'];
    if (typeof CWHeavySound !== 'undefined' && heavySounds.includes(name)) {
      CWHeavySound.play(name);
      return;
    }

    if (typeof Sound === 'undefined') return;
    try {
      if (name === 'select') {
        if (typeof Sound.playPieceSelect === 'function') Sound.playPieceSelect();
        else if (typeof Sound.playClick === 'function') Sound.playClick();
      } else if (name === 'lose') {
        if (typeof Sound.playLose === 'function') Sound.playLose();
      }
    } catch (_) {}
  }

  /**
   * 전장 초기 상태 설정
   */
  function _initState() {
    boardState = {};
    currentAP = MAX_AP;
    currentTurn = 'White';
    currentRound = 1;
    gameOver = false;
    selectedCoord = null;
    validMoves = [];
    selectedSpawnPiece = null;
    validSpawnCoords = [];
    whiteGold = 0;
    blackGold = 0;

    // 1. 모든 16x16 타일 생성 및 중립 설정
    for (let r = 0; r < 16; r++) {
      const rank = RANKS[r];
      for (let f = 0; f < 16; f++) {
        const file = FILES[f];
        const coord = `${file}${rank}`;

        let owner = 'Neutral';
        if (WHITE_START_TERRITORY.has(coord)) {
          owner = 'White';
        } else if (BLACK_START_TERRITORY.has(coord)) {
          owner = 'Black';
        }

        const isFortress = FORTRESS_COORDS.has(coord);

        boardState[coord] = {
          coord,
          file,
          rank,
          fileIdx: f,
          rankIdx: r,
          owner,
          isFortress,
          isSupplied: false,
          whiteSupplied: false,
          blackSupplied: false,
          isFortified: false, // 🛡️ 폰 요새화 방어막 상태
          piece: null
        };
      }
    }

    // 2. 초기 기물 배치 (소수 정예) 및 폰 요새화
    Object.entries(INITIAL_PIECES['w']).forEach(([coord, type]) => {
      if (boardState[coord]) {
        boardState[coord].piece = { type, color: 'w', isStunned: false };
        boardState[coord].owner = 'White';
        if (type === 'p') {
          boardState[coord].isFortified = true; // 폰이 서 있는 타일은 방어 상태
        }
      }
    });

    Object.entries(INITIAL_PIECES['b']).forEach(([coord, type]) => {
      if (boardState[coord]) {
        boardState[coord].piece = { type, color: 'b', isStunned: false };
        boardState[coord].owner = 'Black';
        if (type === 'p') {
          boardState[coord].isFortified = true; // 폰이 서 있는 타일은 방어 상태
        }
      }
    });

    // 3. 초기 보급선 계산
    _calculateSupplyLines();
  }

  /**
   * 🌟 3단계 핵심: BFS 기반 보급선(Supply Line) 계산 알고리즘 🌟
   * '내 킹'을 시작점으로 상하좌우(4방향)로 연속해서 이어져 있는 내 영토(owner)만 보급 구역으로 인정.
   * 기물의 존재 여부와 무관하게 오직 tile.owner === 내 진영인 타일만 연결합니다.
   */
  function _calculateSupplyLines() {
    // 모든 타일의 보급 상태 초기화
    Object.values(boardState).forEach(t => {
      t.whiteSupplied = false;
      t.blackSupplied = false;
      t.isSupplied = false;
    });

    let whiteKingCoord = null;
    let blackKingCoord = null;

    Object.values(boardState).forEach(t => {
      if (t.piece && t.piece.type === 'k') {
        if (t.piece.color === 'w') whiteKingCoord = t.coord;
        else if (t.piece.color === 'b') blackKingCoord = t.coord;
      }
    });

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    // 1. White 보급선 BFS (오직 tile.owner === 'White' 타일만 연결)
    if (whiteKingCoord && boardState[whiteKingCoord]) {
      const wkTile = boardState[whiteKingCoord];
      if (wkTile.owner === 'White') {
        wkTile.whiteSupplied = true;
        const q = [whiteKingCoord];
        let head = 0;
        while (head < q.length) {
          const cCoord = q[head++];
          const curTile = boardState[cCoord];
          const fIdx = curTile.fileIdx;
          const rIdx = curTile.rankIdx;

          for (let i = 0; i < 4; i++) {
            const [dx, dy] = dirs[i];
            const nx = fIdx + dx;
            const ny = rIdx + dy;
            if (_isValidCoord(nx, ny)) {
              const nCoord = _getCoord(nx, ny);
              const nTile = boardState[nCoord];
              // 🌟 엄격 검사: 기물 존재 여부와 무관하게 오직 tile.owner === 'White'만 전파
              if (nTile.owner === 'White' && !nTile.whiteSupplied) {
                nTile.whiteSupplied = true;
                q.push(nCoord);
              }
            }
          }
        }
      }
    }

    // 2. Black 보급선 BFS (오직 tile.owner === 'Black' 타일만 연결)
    if (blackKingCoord && boardState[blackKingCoord]) {
      const bkTile = boardState[blackKingCoord];
      if (bkTile.owner === 'Black') {
        bkTile.blackSupplied = true;
        const q = [blackKingCoord];
        let head = 0;
        while (head < q.length) {
          const cCoord = q[head++];
          const curTile = boardState[cCoord];
          const fIdx = curTile.fileIdx;
          const rIdx = curTile.rankIdx;

          for (let i = 0; i < 4; i++) {
            const [dx, dy] = dirs[i];
            const nx = fIdx + dx;
            const ny = rIdx + dy;
            if (_isValidCoord(nx, ny)) {
              const nCoord = _getCoord(nx, ny);
              const nTile = boardState[nCoord];
              // 🌟 엄격 검사: 기물 존재 여부와 무관하게 오직 tile.owner === 'Black'만 전파
              if (nTile.owner === 'Black' && !nTile.blackSupplied) {
                nTile.blackSupplied = true;
                q.push(nCoord);
              }
            }
          }
        }
      }
    }

    // 3. 영토 소유자 기준 보급 상태(isSupplied) 동기화
    Object.values(boardState).forEach(t => {
      if (t.owner === 'White') {
        t.isSupplied = !!t.whiteSupplied;
      } else if (t.owner === 'Black') {
        t.isSupplied = !!t.blackSupplied;
      } else {
        t.isSupplied = false;
      }
    });
  }

  /**
   * 🌟 기물의 보급선 연결 여부 검사
   * 규칙: 기물이 서 있는 타일의 소유권(tile.owner)이 해당 기물 진영과 일치해야 하고,
   *       해당 타일이 내 킹으로부터 보급선(BFS)으로 연결되어 있어야 함(isSupplied === true).
   *       상대방 영토나 중립 타일에 서 있는 기물은 무조건 false(고립).
   */
  function _isPieceSupplied(tile) {
    if (!tile || !tile.piece) return false;
    const pieceSide = (tile.piece.color === 'w') ? 'White' : 'Black';
    if (tile.owner !== pieceSide) return false;
    return !!(tile.isSupplied || (pieceSide === 'White' ? tile.whiteSupplied : tile.blackSupplied));
  }

  /**
   * 🌟 기물의 고립 상태(Isolated) 여부 검사
   */
  function _isPieceIsolated(tile) {
    if (!tile || !tile.piece) return false;
    return !_isPieceSupplied(tile);
  }

  /**
   * 🌟 3단계 & 4단계: 턴 시작 시 골드 수급 로직 및 코인 유입 시각화 🌟
   * 보급이 연결된 내 킹(+2 Gold), 보급이 연결된 내 점령 거점(+1 Gold 씩)
   */
  function _awardTurnStartGold(side, showAnimation = true) {
    let goldGained = 0;
    const myColor = (side === 'White') ? 'w' : 'b';
    const coinSources = [];

    // 1. 보급이 연결된 킹 (+2 Gold)
    Object.values(boardState).forEach(t => {
      if (t.piece && t.piece.type === 'k' && t.piece.color === myColor && _isPieceSupplied(t)) {
        goldGained += 2;
        coinSources.push({ coord: t.coord, amount: 2 });
      }
    });

    // 2. 보급이 연결된 점령 거점 (+1 Gold 씩)
    FORTRESS_COORDS.forEach(coord => {
      const t = boardState[coord];
      if (t && t.owner === side && t.isSupplied) {
        goldGained += 1;
        coinSources.push({ coord: t.coord, amount: 1 });
      }
    });

    if (side === 'White') {
      whiteGold += goldGained;
    } else {
      blackGold += goldGained;
    }

    // 🌟 코인이 보급을 통해 들어오는 걸 시각화 🌟
    if (showAnimation && coinSources.length > 0 && typeof document !== 'undefined') {
      const isSingle = _isSinglePlayer();
      const mySide = _getMySide();
      if (isSingle || side === mySide) {
        _playCoinInflowAnimation(coinSources, 'cw-gold-badge');
      } else {
        const oppBadgeId = (side === 'White') ? 'cw-white-badge' : 'cw-black-badge';
        _playCoinInflowAnimation(coinSources, oppBadgeId);
      }
    }

    return goldGained;
  }

  /**
   * 코인이 보급선을 통해 상단 골드 뱃지로 날아가는 시각화 연출
   */
  function _playCoinInflowAnimation(sources, targetBadgeId = 'cw-gold-badge') {
    const badgeEl = document.getElementById(targetBadgeId);
    if (!badgeEl || !_container) return;

    const badgeRect = badgeEl.getBoundingClientRect();
    const targetX = badgeRect.left + badgeRect.width / 2;
    const targetY = badgeRect.top + badgeRect.height / 2;

    sources.forEach((src, idx) => {
      setTimeout(() => {
        const tileEl = _tileElements[src.coord];
        if (!tileEl) return;
        const tileRect = tileEl.getBoundingClientRect();
        const startX = tileRect.left + tileRect.width / 2;
        const startY = tileRect.top + tileRect.height / 2;

        const coinEl = document.createElement('div');
        coinEl.className = 'cw-flying-coin';
        coinEl.innerHTML = `<i class="fa-solid fa-coins"></i> +${src.amount}G`;
        coinEl.style.left = `${startX}px`;
        coinEl.style.top = `${startY}px`;
        coinEl.style.transform = 'translate(-50%, -50%) scale(0.6)';
        coinEl.style.opacity = '0';
        if (document.body) {
          document.body.appendChild(coinEl);
        } else if (_container) {
          _container.appendChild(coinEl);
        }

        // 부드러운 비행 포물선 애니메이션
        const doAnimate = (typeof requestAnimationFrame === 'function') ? requestAnimationFrame : setTimeout;
        doAnimate(() => {
          coinEl.style.opacity = '1';
          coinEl.style.transform = `translate(${targetX - startX}px, ${targetY - startY}px) scale(1.15)`;
        }, 16);

        setTimeout(() => {
          if (coinEl.parentNode) coinEl.parentNode.removeChild(coinEl);
          _playSound('coin');
          badgeEl.classList.add('pulse-gold');
          setTimeout(() => badgeEl.classList.remove('pulse-gold'), 400);
        }, 850);
      }, idx * 160);
    });
  }

  /**
   * 🌟 3단계: 소환 가능한 타일 좌표 목록 계산 🌟
   * 규칙: '보급이 연결된 내 킹이나 점령 거점'의 상하좌우(4방향) 빈칸
   */
  function _getValidSpawnCoords(side) {
    const myColor = (side === 'White') ? 'w' : 'b';
    const spawnSet = new Set();
    const supplyBases = [];

    Object.values(boardState).forEach(t => {
      // 보급이 연결된 내 킹
      if (t.piece && t.piece.type === 'k' && t.piece.color === myColor && _isPieceSupplied(t)) {
        supplyBases.push(t);
      }
      // 보급이 연결된 내 점령 거점
      if (t.isFortress && t.owner === side && t.isSupplied) {
        supplyBases.push(t);
      }
    });

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    supplyBases.forEach(base => {
      dirs.forEach(([dx, dy]) => {
        const nx = base.fileIdx + dx;
        const ny = base.rankIdx + dy;
        if (_isValidCoord(nx, ny)) {
          const adjCoord = _getCoord(nx, ny);
          const adjTile = boardState[adjCoord];
          // 기물이 없는 빈칸이어야 소환 가능
          if (adjTile && !adjTile.piece) {
            spawnSet.add(adjCoord);
          }
        }
      });
    });

    return Array.from(spawnSet);
  }

  /**
   * 좌표 유효성 검사 헬퍼
   */
  function _isValidCoord(fIdx, rIdx) {
    return fIdx >= 0 && fIdx < 16 && rIdx >= 0 && rIdx < 16;
  }
  function _getCoord(fIdx, rIdx) {
    if (!_isValidCoord(fIdx, rIdx)) return null;
    return `${FILES[fIdx]}${RANKS[rIdx]}`;
  }

  /**
   * 기물별 유효 이동 경로 계산 (16x16 전장 체스 규칙 + 고립 기물 1칸 제약)
   */
  function _getValidMoves(coord) {
    const tile = boardState[coord];
    if (!tile || !tile.piece) return [];

    const piece = tile.piece;

    // 💫 기절(Stun) 상태 제약: 폰을 처치한 기물은 이번 턴 동안 어떤 행동도 할 수 없음
    if (piece.isStunned) {
      return [];
    }

    const myColor = piece.color;
    const oppColor = (myColor === 'w') ? 'b' : 'w';
    const moves = [];

    const fIdx = tile.fileIdx;
    const rIdx = tile.rankIdx;

    // 🌟 고립(Isolated) 기물 제약:
    // 보급선이 끊겼거나 아군 영토가 아닌 타일에 서 있는 기물은 상하좌우 4방향 '최대 1칸'만 이동 가능!
    if (_isPieceIsolated(tile)) {
      const dirs4 = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
      ];
      dirs4.forEach(([dx, dy]) => {
        const nx = fIdx + dx;
        const ny = rIdx + dy;
        if (_isValidCoord(nx, ny)) {
          const targetCoord = _getCoord(nx, ny);
          const targetTile = boardState[targetCoord];
          if (!targetTile.piece || targetTile.piece.color === oppColor) {
            moves.push(targetCoord);
          }
        }
      });
      return moves;
    }

    // 직선 탐색 헬퍼 (Rook, Queen, Bishop)
    function checkRay(dx, dy) {
      let step = 1;
      while (true) {
        const nx = fIdx + dx * step;
        const ny = rIdx + dy * step;
        if (!_isValidCoord(nx, ny)) break;

        const targetCoord = _getCoord(nx, ny);
        const targetTile = boardState[targetCoord];

        if (!targetTile.piece) {
          // 빈 칸이면 이동 가능
          moves.push(targetCoord);
        } else {
          // 적 기물이면 캡처 가능 후 정지
          if (targetTile.piece.color === oppColor) {
            moves.push(targetCoord);
          }
          break; // 아군이든 적군이든 더 이상 직진 불가
        }
        step++;
      }
    }

    // 1. King (k): 8방향 1칸 (체크 제약 없음) + 고속도로 2칸 보너스
    if (piece.type === 'k') {
      const mySide = (myColor === 'w') ? 'White' : 'Black';
      const dirs = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      dirs.forEach(([dx, dy]) => {
        const nx = fIdx + dx;
        const ny = rIdx + dy;
        if (_isValidCoord(nx, ny)) {
          const targetCoord = _getCoord(nx, ny);
          const targetTile = boardState[targetCoord];
          if (!targetTile.piece || targetTile.piece.color === oppColor) {
            moves.push(targetCoord);
          }
        }

        // 🌟 2. 아군 영토 기동력 보너스 (고속도로 룰)
        // 출발, 중간 경로, 도착 칸이 모두 '내 보급 구역(isPieceSupplied)'일 때 최대 2칸 이동
        if (tile.owner === mySide && _isPieceSupplied(tile)) {
          const midX = fIdx + dx;
          const midY = rIdx + dy;
          const destX = fIdx + dx * 2;
          const destY = rIdx + dy * 2;
          if (_isValidCoord(midX, midY) && _isValidCoord(destX, destY)) {
            const midCoord = _getCoord(midX, midY);
            const destCoord = _getCoord(destX, destY);
            const midTile = boardState[midCoord];
            const destTile = boardState[destCoord];
            const isMidSupplied = midTile.owner === mySide && (midTile.isSupplied || (mySide === 'White' ? midTile.whiteSupplied : midTile.blackSupplied));
            const isDestSupplied = destTile.owner === mySide && (destTile.isSupplied || (mySide === 'White' ? destTile.whiteSupplied : destTile.blackSupplied));
            // 중간 경로: 아군 보급 영토 + 기물 없음 (통과 가능)
            if (isMidSupplied && !midTile.piece) {
              if (isDestSupplied) {
                if (!destTile.piece || destTile.piece.color === oppColor) {
                  if (!moves.includes(destCoord)) {
                    moves.push(destCoord);
                  }
                }
              }
            }
          }
        }
      });
    }

    // 2. Rook (r): 4방향 직선
    else if (piece.type === 'r') {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => checkRay(dx, dy));
    }

    // 3. Pawn (p): 상하좌우 4방향 이동/공격 + 전진 대각선 공격 + 4방향 고속도로 2칸 보너스
    else if (piece.type === 'p') {
      const mySide = (myColor === 'w') ? 'White' : 'Black';
      const forwardDir = (myColor === 'w') ? 1 : -1; // White는 1->16(+), Black은 16->1(-)
      const startRankIdx = (myColor === 'w') ? 1 : 14; // White: rank '2'(idx 1), Black: rank '15'(idx 14)
      const dirs4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

      // ① 상하좌우 4방향 1칸 이동 및 공격 (빈 칸 이동 또는 적 기물 캡처)
      dirs4.forEach(([dx, dy]) => {
        const nx = fIdx + dx;
        const ny = rIdx + dy;
        if (_isValidCoord(nx, ny)) {
          const targetCoord = _getCoord(nx, ny);
          const targetTile = boardState[targetCoord];
          if (!targetTile.piece || targetTile.piece.color === oppColor) {
            if (!moves.includes(targetCoord)) {
              moves.push(targetCoord);
            }
          }
        }

        // 🌟 아군 영토 기동력 보너스 (고속도로 룰): 상하좌우 4방향 2칸 이동
        // 출발, 중간, 도착이 모두 아군 보급 영토일 때 2칸 이동 허용
        if (tile.owner === mySide && _isPieceSupplied(tile)) {
          const midX = fIdx + dx;
          const midY = rIdx + dy;
          const destX = fIdx + dx * 2;
          const destY = rIdx + dy * 2;
          if (_isValidCoord(midX, midY) && _isValidCoord(destX, destY)) {
            const midCoord = _getCoord(midX, midY);
            const destCoord = _getCoord(destX, destY);
            const midTile = boardState[midCoord];
            const destTile = boardState[destCoord];
            const isMidSupplied = midTile.owner === mySide && (midTile.isSupplied || (mySide === 'White' ? midTile.whiteSupplied : midTile.blackSupplied));
            const isDestSupplied = destTile.owner === mySide && (destTile.isSupplied || (mySide === 'White' ? destTile.whiteSupplied : destTile.blackSupplied));
            if (isMidSupplied && !midTile.piece) {
              if (isDestSupplied && (!destTile.piece || destTile.piece.color === oppColor)) {
                if (!moves.includes(destCoord)) {
                  moves.push(destCoord);
                }
              }
            }
          }
        }
      });

      // ② 시작 위치 2칸 전진 (기존 체스 룰: 전방 1칸 및 2칸 모두 빈칸일 때)
      if (rIdx === startRankIdx) {
        const f1Y = rIdx + forwardDir;
        const f2Y = rIdx + forwardDir * 2;
        if (_isValidCoord(fIdx, f1Y) && _isValidCoord(fIdx, f2Y)) {
          const f1Coord = _getCoord(fIdx, f1Y);
          const f2Coord = _getCoord(fIdx, f2Y);
          if (!boardState[f1Coord].piece && !boardState[f2Coord].piece) {
            if (!moves.includes(f2Coord)) {
              moves.push(f2Coord);
            }
          }
        }
      }

      // ③ 대각선 공격 (좌/우 앞 대각선 적 기물 캡처 호환)
      [-1, 1].forEach(dx => {
        const nx = fIdx + dx;
        const ny = rIdx + forwardDir;
        if (_isValidCoord(nx, ny)) {
          const diagCoord = _getCoord(nx, ny);
          const diagTile = boardState[diagCoord];
          if (diagTile.piece && diagTile.piece.color === oppColor) {
            if (!moves.includes(diagCoord)) {
              moves.push(diagCoord);
            }
          }
        }
      });
    }

    // 4. Knight (n): L자 8방향 (도약)
    else if (piece.type === 'n') {
      const knightOffsets = [
        [-1, -2], [-2, -1], [-2, 1], [-1, 2],
        [1, -2],  [2, -1],  [2, 1],  [1, 2]
      ];
      knightOffsets.forEach(([dx, dy]) => {
        const nx = fIdx + dx;
        const ny = rIdx + dy;
        if (_isValidCoord(nx, ny)) {
          const targetCoord = _getCoord(nx, ny);
          const targetTile = boardState[targetCoord];
          if (!targetTile.piece || targetTile.piece.color === oppColor) {
            moves.push(targetCoord);
          }
        }
      });
    }

    // 5. Queen (q): 8방향 직선
    else if (piece.type === 'q') {
      [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
      ].forEach(([dx, dy]) => checkRay(dx, dy));
    }

    // 6. Bishop (b): 4방향 대각선
    else if (piece.type === 'b') {
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dx, dy]) => checkRay(dx, dy));
    }

    return moves;
  }

  /**
   * 🌟 기물 이동 및 영토 점령 메카닉 실행 🌟
   */
  function _executeMove(from, to, isLocal) {
    if (gameOver) return;

    const fromTile = boardState[from];
    const toTile = boardState[to];
    if (!fromTile || !toTile || !fromTile.piece) return;
    if (fromTile.piece.isStunned) return; // 💫 기절(Stun) 상태 기물은 이동 불가

    const movingPiece = fromTile.piece;
    const targetPiece = toTile.piece;
    const movingSide = (movingPiece.color === 'w') ? 'White' : 'Black';
    const oppColor = (movingPiece.color === 'w') ? 'b' : 'w';

    // 킹 처치 여부 확인
    const isKingCapture = (targetPiece && targetPiece.type === 'k');

    // 🌟 1. 폰(Pawn) 요새화 및 영토 점령 로직 🌟
    function captureOrBreakShield(coord) {
      const tile = boardState[coord];
      if (!tile) return;
      if (tile.owner !== movingSide) {
        if (tile.isFortified) {
          // 폰 요새화: 첫 번째 통과 시 방어막만 파괴되고 영토는 유지됨!
          tile.isFortified = false;
          _triggerShieldBreak(coord);
        } else {
          // 방어막이 없거나 이미 파괴된 타일은 정상 점령
          tile.owner = movingSide;
          _playSound('conquest');
        }
      }
    }

    // 고속도로 2칸 이동 사운드 판정
    const isHighwayDash = (Math.abs(toTile.fileIdx - fromTile.fileIdx) === 2 || Math.abs(toTile.rankIdx - fromTile.rankIdx) === 2);

    if (movingPiece.type === 'n') {
      // 나이트: 착지한 칸과 상하좌우 4칸 영토 점령 (방패 파괴 규칙 적용)
      captureOrBreakShield(to);
      const crossOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      crossOffsets.forEach(([dx, dy]) => {
        const nx = toTile.fileIdx + dx;
        const ny = toTile.rankIdx + dy;
        if (_isValidCoord(nx, ny)) {
          captureOrBreakShield(_getCoord(nx, ny));
        }
      });
    } else {
      // 일반 기물: 출발~도착 거쳐간 모든 칸 점령 (방패 파괴 규칙 적용)
      const stepX = Math.sign(toTile.fileIdx - fromTile.fileIdx);
      const stepY = Math.sign(toTile.rankIdx - fromTile.rankIdx);

      let cx = fromTile.fileIdx;
      let cy = fromTile.rankIdx;

      while (true) {
        const pathCoord = _getCoord(cx, cy);
        if (pathCoord !== from) {
          captureOrBreakShield(pathCoord);
        }
        if (cx === toTile.fileIdx && cy === toTile.rankIdx) break;
        cx += stepX;
        cy += stepY;
      }
    }

    // 기물 이동 적용
    toTile.piece = movingPiece;
    fromTile.piece = null;

    // 💫 폰을 처치한 경우: 그 턴 동안 폰을 처치한 기물 기절(Stun) 적용!
    const isPawnCapture = (targetPiece && targetPiece.type === 'p');
    if (isPawnCapture) {
      movingPiece.isStunned = true;
      if (typeof showToast === 'function' && isLocal) {
        showToast('💫 폰 처치 후유증! 기물이 이번 턴 동안 기절(스턴)되었습니다.', 'warn');
      }
    }

    // 폰이 서 있는 타일은 내부적으로 '방어 상태(Fortified)'가 됨
    if (movingPiece.type === 'p') {
      toTile.isFortified = true;
    }

    // 폰 끝선 도달 시 퀸 프로모션
    if (movingPiece.type === 'p') {
      if ((movingPiece.color === 'w' && toTile.rankIdx === 15) ||
          (movingPiece.color === 'b' && toTile.rankIdx === 0)) {
        movingPiece.type = 'q';
      }
    }

    // 사운드 효과
    if (isKingCapture) _playSound('win');
    else if (targetPiece) _playSound('capture');
    else if (isHighwayDash) _playSound('highway');
    else _playSound('move');

    // 선택 및 힌트 해제
    selectedCoord = null;
    validMoves = [];
    selectedSpawnPiece = null;
    validSpawnCoords = [];

    // ⚡ AP 차감
    currentAP = Math.max(0, currentAP - 1);

    // 🌟 이동 후 보급선 즉시 재계산 🌟
    _calculateSupplyLines();

    // 1차 승리 판정: 상대방 킹 처치 시 즉시 게임 종료
    if (isKingCapture) {
      gameOver = true;
      _updateBoardTiles();
      _updateHighlights();
      _updateUI();
      _showGameOverBanner(movingSide, 'king');

      if (isLocal && typeof P2P !== 'undefined') {
        P2P.send({
          type: 'cw_move',
          from,
          to,
          currentAP,
          nextTurn: currentTurn,
          currentRound,
          whiteGold,
          blackGold,
          isKingCapture: true,
          isAnnihilation: false
        });
      }
      return;
    }

    // 🌟 2차 승리 판정: 전면 점멸 승리 (상대 기물 전멸 + 6개 거점 모두 점령) 🌟
    const isAnnihilation = _checkAnnihilationVictory(movingSide);
    if (isAnnihilation) {
      _updateBoardTiles();
      _updateHighlights();
      _updateUI();
      if (isLocal && typeof P2P !== 'undefined') {
        P2P.send({
          type: 'cw_move',
          from,
          to,
          currentAP,
          nextTurn: currentTurn,
          currentRound,
          whiteGold,
          blackGold,
          isKingCapture: false,
          isAnnihilation: true
        });
      }
      return;
    }

    // AP가 0이 되면 턴 자동 전환
    let turnSwitched = false;
    if (currentAP <= 0) {
      turnSwitched = true;
      _switchTurn(isLocal);
    }

    // P2P 동기화 전송 (로컬 이동 시)
    if (isLocal && typeof P2P !== 'undefined') {
      P2P.send({
        type: 'cw_move',
        from,
        to,
        currentAP,
        nextTurn: currentTurn,
        currentRound,
        turnSwitched,
        whiteGold,
        blackGold,
        isKingCapture: false,
        isAnnihilation: false,
        isStunned: !!movingPiece.isStunned
      });
    }

    _updateBoardTiles();
    _updateHighlights();
    _updateUI();
  }

  /**
   * 턴 전환 및 라운드(40턴) 카운트 통합 처리
   * @param {boolean} [awardGold=true] - 턴 시작 골드 지급 여부 (P2P 수신 시 중복 지급 방지 위해 false)
   */
  function _switchTurn(awardGold = true) {
    let endedByRounds = false;
    if (currentTurn === 'White') {
      currentTurn = 'Black';
    } else {
      currentTurn = 'White';
      currentRound++;
      if (currentRound > MAX_ROUNDS) {
        gameOver = true;
        endedByRounds = true;
        _handleScoreVictory();
      }
    }
    currentAP = MAX_AP;
    selectedCoord = null;
    validMoves = [];
    selectedSpawnPiece = null;
    validSpawnCoords = [];

    // 💫 턴 전환 시 모든 기물의 기절(Stun) 상태 해제 (그 턴 동안만 지속)
    Object.values(boardState).forEach(t => {
      if (t.piece && t.piece.isStunned) {
        t.piece.isStunned = false;
      }
    });

    if (!endedByRounds && !gameOver) {
      _calculateSupplyLines();
      if (awardGold) {
        _awardTurnStartGold(currentTurn);
      }
      _playSound('turn');
    }
    return endedByRounds;
  }

  /**
   * 턴 수동 종료 ('턴 종료' 버튼 클릭)
   */
  function _endTurn(isLocal) {
    if (gameOver) return;

    // 내 턴이 아니면 턴 종료 불가
    if (isLocal && !_isMyTurn()) return;

    _switchTurn(isLocal);

    if (isLocal && typeof P2P !== 'undefined') {
      P2P.send({
        type: 'cw_end_turn',
        nextTurn: currentTurn,
        currentRound,
        whiteGold,
        blackGold
      });
    }

    _updateBoardTiles();
    _updateHighlights();
    _updateUI();
  }

  /**
   * 🌟 3단계 & 4단계: 기물 소환(생산) 실행 🌟
   */
  function _executeSpawn(pieceType, coord, isLocal) {
    if (gameOver) return;
    const targetTile = boardState[coord];
    if (!targetTile || targetTile.piece) return;

    const cost = SPAWN_COSTS[pieceType] || 1;
    const currentSide = currentTurn;
    const myPieceColor = (currentSide === 'White') ? 'w' : 'b';

    // 골드 차감 (로컬 행동일 때만 직접 차감, P2P 수신 시에는 data.whiteGold/blackGold로 이미 동기화됨)
    if (isLocal) {
      if (currentSide === 'White') {
        whiteGold = Math.max(0, whiteGold - cost);
      } else {
        blackGold = Math.max(0, blackGold - cost);
      }
    }

    // 기물 배치 & 해당 타일 영토 점령
    targetTile.piece = { type: pieceType, color: myPieceColor };
    targetTile.owner = currentSide;

    // 폰 소환 시 요새화 방어막 적용
    if (pieceType === 'p') {
      targetTile.isFortified = true;
    }

    // 1 AP 소모
    currentAP = Math.max(0, currentAP - 1);

    // 소환 모드 해제
    selectedSpawnPiece = null;
    validSpawnCoords = [];

    _playSound('spawn');

    // 보급선 재계산
    _calculateSupplyLines();

    // 전면 점멸 승리 검사
    const isAnnihilation = _checkAnnihilationVictory(currentSide);
    if (isAnnihilation) {
      _updateBoardTiles();
      _updateHighlights();
      _updateUI();
      return;
    }

    // AP가 0이 되면 턴 전환
    let turnSwitched = false;
    if (currentAP <= 0) {
      turnSwitched = true;
      _switchTurn(isLocal);
    }

    // P2P 동기화 전송
    if (isLocal && typeof P2P !== 'undefined') {
      P2P.send({
        type: 'cw_spawn',
        pieceType,
        coord,
        whiteGold,
        blackGold,
        currentAP,
        nextTurn: currentTurn,
        currentRound,
        turnSwitched
      });
    }

    _updateBoardTiles();
    _updateHighlights();
    _updateUI();
  }

  /**
   * 🛡️ 폰 방패 파괴 시각 이펙트 및 알림
   */
  function _triggerShieldBreak(coord) {
    _playSound('shieldBreak');
    const tileEl = _tileElements[coord];
    if (tileEl) {
      const fxEl = document.createElement('div');
      fxEl.className = 'cw-shield-break-fx';
      fxEl.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
      tileEl.appendChild(fxEl);
      setTimeout(() => {
        if (fxEl.parentNode) fxEl.parentNode.removeChild(fxEl);
      }, 700);
    }
    if (typeof showToast === 'function') {
      showToast(`🛡️ ${coord} 타일의 폰 방어막이 파괴되었습니다!`, 'warn');
    }
  }

  /**
   * 🌟 3. 전면 점멸 승리 판정 (적 기물 0개 + 6개 거점 모두 점령) 🌟
   */
  function _checkAnnihilationVictory(movingSide) {
    if (gameOver) return false;
    const oppColor = (movingSide === 'White') ? 'b' : 'w';

    let oppPieces = 0;
    Object.values(boardState).forEach(t => {
      if (t.piece && t.piece.color === oppColor) {
        oppPieces++;
      }
    });

    let fortressesCaptured = 0;
    FORTRESS_COORDS.forEach(c => {
      const t = boardState[c];
      if (t && t.owner === movingSide) {
        fortressesCaptured++;
      }
    });

    if (oppPieces === 0 && fortressesCaptured === FORTRESS_COORDS.size) {
      gameOver = true;
      _showGameOverBanner(movingSide, 'annihilation');
      return true;
    }
    return false;
  }

  /**
   * 상점 기물 소환 버튼 클릭 핸들러
   */
  function _onShopPieceClick(pieceType) {
    if (gameOver || !_isMyTurn()) return;

    const currentSide = currentTurn;
    const curGold = (currentSide === 'White') ? whiteGold : blackGold;
    const cost = SPAWN_COSTS[pieceType] || 1;

    // 1. AP 검사
    if (currentAP <= 0) {
      if (typeof showToast === 'function') showToast('남은 AP(행동력)가 부족합니다.', 'warn');
      return;
    }

    // 2. 골드 검사
    if (curGold < cost) {
      if (typeof showToast === 'function') showToast(`골드가 부족합니다! (필요: ${cost}G, 보유: ${curGold}G)`, 'warn');
      return;
    }

    // 3. 토글: 이미 선택된 기물이면 취소
    if (selectedSpawnPiece === pieceType) {
      selectedSpawnPiece = null;
      validSpawnCoords = [];
    } else {
      // 일반 기물 선택 해제
      selectedCoord = null;
      validMoves = [];

      selectedSpawnPiece = pieceType;
      validSpawnCoords = _getValidSpawnCoords(currentSide);

      if (validSpawnCoords.length === 0) {
        if (typeof showToast === 'function') {
          showToast('보급이 연결된 킹 또는 점령 거점 주변에 소환 가능한 빈 칸이 없습니다.', 'warn');
        }
      } else {
        _playSound('select');
      }
    }

    _updateHighlights();
    _updateUI();
  }

  /**
   * 승리/패배 안내 처리 (킹 처치, 전면 점멸, 점수 판정 등)
   */
  function _showGameOverBanner(winnerSide, reason = 'king') {
    const mySide = _getMySide();
    const isWin = (winnerSide === mySide);
    let msg = '';
    if (reason === 'annihilation') {
      msg = isWin ? '👑 전면 점멸 승리! 상대 기물 전멸 및 6개 거점 모두 점령!' : '💀 패배! 아군 기물 전멸 및 전 거점 함락!';
    } else {
      msg = isWin ? '👑 상대 킹을 처치하여 승리했습니다!' : '💀 아군 킹이 처치되어 패배했습니다.';
    }
    _playSound(isWin ? 'win' : 'lose');
    if (typeof showToast === 'function') {
      showToast(msg, isWin ? 'success' : 'error');
    }
    if (_onResult) {
      setTimeout(() => {
        _onResult(isWin);
      }, 1400);
    }
  }

  /**
   * 🌟 3. 점수 승리 판정 (40턴 종료 시 정산) 🌟
   * 점수 공식: [내 영토 타일 수 × 1점] + [점령한 거점 수 × 10점] + [내 잔여 기물 생산 비용의 총합]
   */
  function _handleScoreVictory() {
    const mySide = _getMySide();
    let wTerritory = 0;
    let bTerritory = 0;
    Object.values(boardState).forEach(t => {
      if (t.owner === 'White') wTerritory++;
      else if (t.owner === 'Black') bTerritory++;
    });

    let wFortress = 0;
    let bFortress = 0;
    FORTRESS_COORDS.forEach(c => {
      const t = boardState[c];
      if (t) {
        if (t.owner === 'White') wFortress++;
        else if (t.owner === 'Black') bFortress++;
      }
    });

    let wPieces = 0;
    let bPieces = 0;
    Object.values(boardState).forEach(t => {
      if (t.piece) {
        const val = SPAWN_COSTS[t.piece.type] || 0;
        if (t.piece.color === 'w') wPieces += val;
        else if (t.piece.color === 'b') bPieces += val;
      }
    });

    const wTotal = wTerritory * 1 + wFortress * 10 + wPieces;
    const bTotal = bTerritory * 1 + bFortress * 10 + bPieces;

    let winnerSide = 'Draw';
    if (wTotal > bTotal) winnerSide = 'White';
    else if (bTotal > wTotal) winnerSide = 'Black';

    const isWin = (winnerSide === mySide);
    const isDraw = (winnerSide === 'Draw');

    _playSound(isWin ? 'win' : 'lose');

    _showScoreVictoryModal({
      winnerSide,
      wTerritory, bTerritory,
      wFortress, bFortress,
      wPieces, bPieces,
      wTotal, bTotal,
      isWin, isDraw
    });

    if (_onResult) {
      setTimeout(() => {
        _onResult(isWin);
      }, 1500);
    }
  }

  /**
   * 40턴 종료 시 최종 점수 판정 결과 모달 렌더링
   */
  function _showScoreVictoryModal(data) {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('cw-result-modal');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    const overlay = document.createElement('div');
    overlay.className = 'cw-result-modal-overlay';
    overlay.id = 'cw-result-modal';

    const titleColor = data.isWin ? '#38a169' : (data.isDraw ? '#d69e2e' : '#e53e3e');
    const titleText = data.isDraw
      ? '⚔️ 무승부 (점수 동점)!'
      : (data.isWin ? '👑 40턴 종료: 점수 승리!' : '💀 40턴 종료: 점수 패배');

    overlay.innerHTML = `
      <div class="cw-result-modal">
        <div class="cw-result-title" style="color: ${titleColor};">
          ${titleText}
        </div>
        <p style="font-size:0.85rem;color:var(--t2,#718096);margin-bottom:12px;">
          40턴이 모두 종료되어 최종 전장 점수를 정산합니다.
        </p>

        <table class="cw-score-table">
          <thead>
            <tr>
              <th>점수 항목</th>
              <th style="color:#2b6cb0;">White</th>
              <th style="color:#c53030;">Black</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>영토 점유 (칸당 1점)</td>
              <td>${data.wTerritory}점</td>
              <td>${data.bTerritory}점</td>
            </tr>
            <tr>
              <td>거점 점령 (거점당 10점)</td>
              <td>${data.wFortress * 10}점 (${data.wFortress}개)</td>
              <td>${data.bFortress * 10}점 (${data.bFortress}개)</td>
            </tr>
            <tr>
              <td>기물 생산가치 합산</td>
              <td>${data.wPieces}점</td>
              <td>${data.bPieces}점</td>
            </tr>
            <tr class="total-row">
              <td><strong>최종 합계 점수</strong></td>
              <td style="color:#2b6cb0;"><strong>${data.wTotal}점</strong></td>
              <td style="color:#c53030;"><strong>${data.bTotal}점</strong></td>
            </tr>
          </tbody>
        </table>

        <button type="button" class="btn-cw-modal-close" id="btn-cw-modal-close">
          확인
        </button>
      </div>
    `;

    if (document.body) {
      document.body.appendChild(overlay);
    } else if (_container) {
      _container.appendChild(overlay);
    }
    const closeBtn = overlay.querySelector('#btn-cw-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      });
    }
  }

  /**
   * 상단 인게임 플레이어 턴 하이라이트 동기화
   */
  function _updateInGameTurnSync() {
    if (typeof updateInGameTurn === 'function') {
      const turnIdx = (currentTurn === 'White') ? 0 : 1;
      updateInGameTurn(turnIdx);
    }
  }

  /**
   * 🌟 4단계: 가상 로비 및 방 화면 / 인게임 뷰 상태 분기 렌더링 🌟
   */
  function _renderMain() {
    if (!_container) return;
    _container.innerHTML = '';
    if (viewState === 'room') {
      _renderVirtualRoomLayout();
    } else {
      _renderGameLayout();
    }
  }

  /**
   * 🌟 4단계: 가상의 '로비 사이드바'와 '방 화면' UI 프레임 렌더링 🌟
   */
  function _renderVirtualRoomLayout() {
    if (!_container) return;
    const players = (_context && _context.players) || [];
    const hostPlayer = players[0] || { name: _context?.myNickname || '플레이어 1 (방장)' };
    const guestPlayer = players[1] || { name: '플레이어 2 (도전자)' };

    _container.innerHTML = `
      <div class="cw-virtual-wrapper">
        <!-- 🌟 좌측: 가상 로비 사이드바 🌟 -->
        <div class="cw-virtual-sidebar">
          <div class="cw-vsidebar-header">
            <i class="fa-solid fa-gamepad cw-vsidebar-title"></i>
            <span>가치 아케이드</span>
          </div>
          <ul class="cw-vsidebar-menu">
            <li class="cw-vsidebar-item active">
              <i class="fa-solid fa-shield-halved" style="color:#d69e2e;"></i>
              <span>체스 워페어</span>
              <span class="cw-vsidebar-badge">2인</span>
            </li>
            <li class="cw-vsidebar-item disabled">
              <i class="fa-solid fa-circle-dot"></i>
              <span>오목</span>
            </li>
            <li class="cw-vsidebar-item disabled">
              <i class="fa-solid fa-chess"></i>
              <span>클래식 체스</span>
            </li>
            <li class="cw-vsidebar-item disabled">
              <i class="fa-solid fa-chess-rook"></i>
              <span>장기</span>
            </li>
            <li class="cw-vsidebar-item disabled">
              <i class="fa-solid fa-circle"></i>
              <span>알까기</span>
            </li>
            <li class="cw-vsidebar-item disabled">
              <i class="fa-solid fa-cubes"></i>
              <span>쿼리도</span>
            </li>
            <li class="cw-vsidebar-item disabled">
              <i class="fa-solid fa-apple-whole"></i>
              <span>사과게임</span>
            </li>
            <li class="cw-vsidebar-item disabled">
              <i class="fa-solid fa-palette"></i>
              <span>캐치마인드</span>
            </li>
          </ul>
        </div>

        <!-- 🌟 중앙: 가상 방 화면 🌟 -->
        <div class="cw-virtual-room">
          <div>
            <div class="cw-vroom-header">
              <span class="cw-vroom-code"><i class="fa-solid fa-hashtag"></i> CW-1616</span>
              <span class="cw-vsidebar-badge" style="font-size:0.75rem;padding:3px 8px;">2인 실시간 전장</span>
            </div>
            <h2 class="cw-vroom-title">
              <i class="fa-solid fa-shield-halved" style="color:#d69e2e;"></i>
              체스 워페어 (Chess Warfare)
            </h2>

            <!-- 2인 참가자 프로필 카드 -->
            <div class="cw-vroom-players">
              <div class="cw-vroom-card host-card">
                <div class="cw-vroom-avatar"><i class="fa-solid fa-crown"></i></div>
                <div class="cw-vroom-name">${hostPlayer.name}</div>
                <span class="cw-vroom-role">1P White (방장)</span>
                <span class="cw-vroom-ready-tag"><i class="fa-solid fa-circle-check"></i> 준비 완료</span>
              </div>
              <div class="cw-vroom-card guest-card">
                <div class="cw-vroom-avatar"><i class="fa-solid fa-user-ninja"></i></div>
                <div class="cw-vroom-name">${guestPlayer.name}</div>
                <span class="cw-vroom-role">2P Black (도전자)</span>
                <span class="cw-vroom-ready-tag"><i class="fa-solid fa-circle-check"></i> 준비 완료</span>
              </div>
            </div>

            <!-- 게임 규칙 요약 브리핑 카드 -->
            <div class="cw-vroom-rules">
              <strong><i class="fa-solid fa-book-bookmark"></i> 체스 워페어 작전 브리핑</strong>
              <ul>
                <li><strong>16×16 전장 & 40턴 제한</strong>: 40턴 종료 시 [영토×1점 + 점령 거점×10점 + 기물 가치]로 승패 판정</li>
                <li><strong>보급선(BFS)</strong>: 킹과 끊어진 기물/영토는 고립(이동 1칸 제한), 보급된 킹(+2G) 및 거점(+1G)에서 골드 수급</li>
                <li><strong>폰 요새화(Fortified)</strong>: 폰이 서 있는 타일은 방어 상태가 되어 적의 1회 통과 공격을 방어</li>
                <li><strong>고속도로 룰</strong>: 아군 보급 구역 내에서 킹과 폰은 최대 2칸까지 기동력 보너스 부여</li>
                <li><strong>승리 조건</strong>: 상대 킹 처치, 전면 점멸(적 기물 전멸 & 6개 거점 점령), 또는 40턴 점수 승리</li>
              </ul>
            </div>
          </div>

          <!-- 게임 시작 버튼 -->
          <button type="button" class="btn-cw-start-game" id="btn-cw-start-game">
            <i class="fa-solid fa-play"></i>
            <span>전장 출격 (게임 시작)</span>
          </button>
        </div>
      </div>
    `;

    const startBtn = document.getElementById('btn-cw-start-game');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        _startActualGame(true);
      });
    }
  }

  /**
   * 방 화면에서 '게임 시작' 버튼 클릭 시 16x16 전장으로 전환
   */
  function _startActualGame(isLocal) {
    _playSound('start');
    viewState = 'game';
    _initState();
    _renderGameLayout();

    // 🌟 1라운드 1턴 시작: White 플레이어에게 턴 시작 골드 수급 실행 (+2G)
    _awardTurnStartGold('White');
    _updateUI();

    if (isLocal && typeof P2P !== 'undefined') {
      P2P.send({
        type: 'cw_room_start',
        whiteGold,
        blackGold
      });
    }
  }

  /**
   * 전장 인게임 16x16 보드 레이아웃 생성
   */
  function _renderGameLayout() {
    if (!_container) return;

    const filesLabelsHtml = FILES.map(f => `<span>${f}</span>`).join('');
    const ranksLabelsHtml = [...RANKS].reverse().map(r => `<span>${r}</span>`).join('');

    _container.innerHTML = `
      <div class="cw-container">
        <!-- 상단 헤더: 영토 점유 현황 및 라운드 표시 -->
        <div class="cw-header-bar">
          <div class="cw-score-badge white" id="cw-white-badge">
            <i class="fa-solid fa-flag"></i>
            <span>White: <strong id="cw-white-score">8칸</strong> · <strong id="cw-white-gold" class="cw-header-gold"><i class="fa-solid fa-coins"></i> 2G</strong></span>
          </div>

          <div class="cw-round-badge" id="cw-round-badge" title="40턴 제한 시스템">
            <i class="fa-solid fa-hourglass-half"></i>
            <span>턴</span>
            <strong id="cw-round-text">1 / ${MAX_ROUNDS}</strong>
          </div>

          <div class="cw-score-badge black" id="cw-black-badge">
            <i class="fa-solid fa-flag"></i>
            <span>Black: <strong id="cw-black-score">8칸</strong> · <strong id="cw-black-gold" class="cw-header-gold"><i class="fa-solid fa-coins"></i> 0G</strong></span>
          </div>
        </div>

        <!-- 🌟 상단 2행: 현재 턴, 골드 & AP 시스템 컨트롤 바 🌟 -->
        <div class="cw-action-bar">
          <!-- 턴 표시 -->
          <div class="cw-turn-badge my-turn" id="cw-turn-badge">
            <i class="fa-solid fa-play"></i>
            <span>White 턴 (내 턴)</span>
          </div>

          <!-- 보유 골드(Gold) 뱃지 -->
          <div class="cw-gold-badge" id="cw-gold-badge" title="현재 보유 골드 (매 턴 킹/거점 보급으로 수급)">
            <i class="fa-solid fa-coins"></i>
            <span id="cw-gold-label">내 골드</span>
            <strong id="cw-gold-count">2</strong>
          </div>

          <!-- 남은 AP (Action Point) 표시 -->
          <div class="cw-ap-panel" title="이동 또는 소환 1회당 1 AP 소모">
            <div class="cw-ap-label">
              <i class="fa-solid fa-bolt" style="color:#d69e2e;"></i>
              <span>남은 AP</span>
              <strong id="cw-ap-text">3/3</strong>
            </div>
            <div class="cw-ap-dots" id="cw-ap-dots">
              <div class="cw-ap-dot active" id="cw-ap-dot-1"><i class="fa-solid fa-bolt"></i></div>
              <div class="cw-ap-dot active" id="cw-ap-dot-2"><i class="fa-solid fa-bolt"></i></div>
              <div class="cw-ap-dot active" id="cw-ap-dot-3"><i class="fa-solid fa-bolt"></i></div>
            </div>
          </div>

          <!-- 턴 종료 버튼 -->
          <button type="button" class="btn-cw-end-turn active" id="btn-cw-end-turn">
            <i class="fa-solid fa-forward-step"></i>
            <span>턴 종료</span>
          </button>
        </div>

        <!-- 전장 보드 프레임 (좌표 라벨 + #board) -->
        <div class="cw-board-frame">
          <div class="cw-board-with-coords">
            <div class="cw-coords-top">${filesLabelsHtml}</div>
            <div class="cw-coords-left">${ranksLabelsHtml}</div>

            <!-- 16x16 사각형 그리드 (id: 'board') -->
            <div id="board" class="cw-board"></div>

            <div class="cw-coords-right">${ranksLabelsHtml}</div>
            <div class="cw-coords-bottom">${filesLabelsHtml}</div>
          </div>
        </div>

        <!-- 🛒 3단계: 기물 생산 상점 바 (하단 콤팩트 UI) -->
        <div class="cw-shop-bar">
          <div class="cw-shop-title">
            <i class="fa-solid fa-store" style="color:#d69e2e;"></i>
            <span>기물 소환</span>
          </div>
          <div class="cw-shop-items">
            <button type="button" class="btn-cw-spawn" data-piece="p" title="폰 소환 (1골드, 1AP)">
              <div class="spawn-icon">${PIECE_SVGS['w']['p']}</div>
              <span class="spawn-cost">1G</span>
            </button>
            <button type="button" class="btn-cw-spawn" data-piece="n" title="나이트 소환 (3골드, 1AP)">
              <div class="spawn-icon">${PIECE_SVGS['w']['n']}</div>
              <span class="spawn-cost">3G</span>
            </button>
            <button type="button" class="btn-cw-spawn" data-piece="b" title="비숍 소환 (3골드, 1AP)">
              <div class="spawn-icon">${PIECE_SVGS['w']['b']}</div>
              <span class="spawn-cost">3G</span>
            </button>
            <button type="button" class="btn-cw-spawn" data-piece="r" title="룩 소환 (5골드, 1AP)">
              <div class="spawn-icon">${PIECE_SVGS['w']['r']}</div>
              <span class="spawn-cost">5G</span>
            </button>
            <button type="button" class="btn-cw-spawn" data-piece="q" title="퀸 소환 (8골드, 1AP)">
              <div class="spawn-icon">${PIECE_SVGS['w']['q']}</div>
              <span class="spawn-cost">8G</span>
            </button>
          </div>
        </div>
      </div>
    `;


    // 턴 종료 버튼 이벤트 바인딩
    const endTurnBtn = document.getElementById('btn-cw-end-turn');
    if (endTurnBtn) {
      endTurnBtn.addEventListener('click', () => {
        _endTurn(true);
      });
    }

    // 상점 기물 소환 버튼 이벤트 바인딩
    const shopButtons = _container.querySelectorAll('.btn-cw-spawn');
    shopButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pType = btn.getAttribute('data-piece');
        _onShopPieceClick(pType);
      });
    });

    // 16x16 타일 엘리먼트 1회 생성 및 이벤트 바인딩
    const boardEl = document.getElementById('board');
    if (!boardEl) return;

    _tileElements = {};

    for (let r = 15; r >= 0; r--) {
      const rank = RANKS[r];
      for (let f = 0; f < 16; f++) {
        const file = FILES[f];
        const coord = `${file}${rank}`;
        const isLight = (f + r) % 2 === 1;

        const tileEl = document.createElement('div');
        tileEl.className = `cw-tile ${isLight ? 'tile-light' : 'tile-dark'}`;
        tileEl.id = `tile-${coord}`;
        tileEl.setAttribute('data-coord', coord);
        tileEl.setAttribute('data-col', file);
        tileEl.setAttribute('data-row', rank);
        tileEl.setAttribute('data-owner', 'Neutral');

        // 거점(Fortress) 렌더링
        if (FORTRESS_COORDS.has(coord)) {
          const fortressEl = document.createElement('div');
          fortressEl.className = 'cw-fortress-marker';
          fortressEl.innerHTML = `
            <div class="cw-fortress-icon" title="거점 (${coord})">
              <i class="fa-solid fa-flag"></i>
            </div>
          `;
          tileEl.appendChild(fortressEl);
        }

        // 🌟 타일 클릭 이벤트 바인딩 🌟
        tileEl.addEventListener('click', (e) => {
          e.stopPropagation();
          _onTileClick(coord);
        });

        boardEl.appendChild(tileEl);
        _tileElements[coord] = tileEl;
      }
    }

    _updateBoardTiles();
    _updateHighlights();
    _updateUI();
  }

  /**
   * 보드 타일의 기물 및 영토 상태 업데이트 (보급선 고립 시각화 포함)
   */
  function _updateBoardTiles() {
    const isTurn = _isMyTurn();
    const activeColor = _isSinglePlayer()
      ? (currentTurn === 'White' ? 'w' : 'b')
      : (_getMySide() === 'White' ? 'w' : 'b');

    Object.entries(boardState).forEach(([coord, tileData]) => {
      const tileEl = _tileElements[coord];
      if (!tileEl) return;

      // 1. 영토 속성 동기화
      tileEl.setAttribute('data-owner', tileData.owner);

      // 2. 🌟 보급선 고립(Isolated) 영토 시각화: 내 영토인데 보급선이 끊김
      if (tileData.owner !== 'Neutral' && !tileData.isSupplied) {
        tileEl.classList.add('isolated-territory');
      } else {
        tileEl.classList.remove('isolated-territory');
      }

      // 3. 🛡️ 폰 요새화(Fortified) 방패 뱃지 동기화
      let shieldEl = tileEl.querySelector('.cw-tile-shield');
      if (tileData.isFortified) {
        tileEl.classList.add('fortified');
        if (!shieldEl) {
          shieldEl = document.createElement('div');
          shieldEl.className = 'cw-tile-shield';
          shieldEl.setAttribute('title', '폰 요새화: 1회 공격/통과 방어막');
          shieldEl.innerHTML = '<i class="fa-solid fa-shield"></i>';
          tileEl.appendChild(shieldEl);
        }
      } else {
        tileEl.classList.remove('fortified');
        if (shieldEl) tileEl.removeChild(shieldEl);
      }

      // 4. 기물 엘리먼트 동기화
      let pieceEl = tileEl.querySelector('.cw-piece');
      if (tileData.piece) {
        if (!pieceEl) {
          pieceEl = document.createElement('div');
          tileEl.appendChild(pieceEl);
        }
        pieceEl.className = `cw-piece piece-${tileData.piece.color}-${tileData.piece.type}`;
        pieceEl.innerHTML = PIECE_SVGS[tileData.piece.color]?.[tileData.piece.type] || '';
        tileEl.classList.add('has-piece');

        // 🌟 고립 기물(Isolated Piece) 배지 표시 (머리 위 경고 마크)
        let badgeEl = tileEl.querySelector('.cw-isolated-badge');
        const isIsolatedPiece = _isPieceIsolated(tileData);
        if (isIsolatedPiece) {
          if (!badgeEl) {
            badgeEl = document.createElement('div');
            badgeEl.className = 'cw-isolated-badge';
            badgeEl.setAttribute('title', '⚠️ 고립 상태 (보급선 단절 / 적지): 이동 범위 1칸 제한');
            badgeEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
            tileEl.appendChild(badgeEl);
          }
          tileEl.classList.add('isolated-piece-tile');
        } else {
          if (badgeEl) tileEl.removeChild(badgeEl);
          tileEl.classList.remove('isolated-piece-tile');
        }

        // 💫 폰 처치 후 기절(Stunned Piece) 배지 표시 (머리 위 스턴 아이콘)
        let stunBadgeEl = tileEl.querySelector('.cw-stunned-badge');
        if (tileData.piece.isStunned) {
          if (!stunBadgeEl) {
            stunBadgeEl = document.createElement('div');
            stunBadgeEl.className = 'cw-stunned-badge';
            stunBadgeEl.setAttribute('title', '💫 기절 상태: 폰을 처치하여 이번 턴 동안 행동 불가');
            stunBadgeEl.innerHTML = '<i class="fa-solid fa-bolt"></i>';
            tileEl.appendChild(stunBadgeEl);
          }
          tileEl.classList.add('stunned-piece-tile');
        } else {
          if (stunBadgeEl) tileEl.removeChild(stunBadgeEl);
          tileEl.classList.remove('stunned-piece-tile');
        }

        // 조작 가능한 내 기물 표시 (기절 기물은 조작 불가이므로 제외)
        if (isTurn && tileData.piece.color === activeColor && !tileData.piece.isStunned) {
          tileEl.classList.add('my-piece-tile');
        } else {
          tileEl.classList.remove('my-piece-tile');
        }
      } else {
        if (pieceEl) {
          tileEl.removeChild(pieceEl);
        }
        const badgeEl = tileEl.querySelector('.cw-isolated-badge');
        if (badgeEl) tileEl.removeChild(badgeEl);
        const stunBadgeEl = tileEl.querySelector('.cw-stunned-badge');
        if (stunBadgeEl) tileEl.removeChild(stunBadgeEl);

        tileEl.classList.remove('has-piece');
        tileEl.classList.remove('my-piece-tile');
        tileEl.classList.remove('isolated-piece-tile');
        tileEl.classList.remove('stunned-piece-tile');
      }
    });
  }

  /**
   * 🌟 기물 선택 및 이동/소환 하이라이트 즉각 업데이트 🌟
   */
  function _updateHighlights() {
    const activeColor = _isSinglePlayer()
      ? (currentTurn === 'White' ? 'w' : 'b')
      : (_getMySide() === 'White' ? 'w' : 'b');

    Object.entries(_tileElements).forEach(([coord, tileEl]) => {
      const isSelected = (selectedCoord === coord);
      const isValid = validMoves.includes(coord);
      const isSpawnValid = selectedSpawnPiece && validSpawnCoords.includes(coord);
      const tileData = boardState[coord];
      const isCapture = isValid && tileData && tileData.piece && (tileData.piece.color !== activeColor);

      if (isSelected) {
        tileEl.classList.add('selected');
      } else {
        tileEl.classList.remove('selected');
      }

      if (isValid) {
        tileEl.classList.add('valid-move');
        if (isCapture) {
          tileEl.classList.add('can-capture');
        } else {
          tileEl.classList.remove('can-capture');
        }

        // 🌟 고속도로 2칸 이동 하이라이트
        if (selectedCoord) {
          const selTile = boardState[selectedCoord];
          if (selTile && selTile.piece && (selTile.piece.type === 'k' || selTile.piece.type === 'p')) {
            const dist = Math.max(Math.abs(tileData.fileIdx - selTile.fileIdx), Math.abs(tileData.rankIdx - selTile.rankIdx));
            if (dist === 2) {
              tileEl.classList.add('valid-highway');
            } else {
              tileEl.classList.remove('valid-highway');
            }
          } else {
            tileEl.classList.remove('valid-highway');
          }
        }
      } else {
        tileEl.classList.remove('valid-move');
        tileEl.classList.remove('can-capture');
        tileEl.classList.remove('valid-highway');
      }

      // 소환 가능 타일 하이라이트
      if (isSpawnValid) {
        tileEl.classList.add('spawn-valid');
      } else {
        tileEl.classList.remove('spawn-valid');
      }
    });
  }

  /**
   * 상단 상황판 및 AP 게이지, 골드, 상점 버튼 UI 업데이트
   */
  function _updateUI() {
    // 0. 라운드(턴) 표시 업데이트
    const roundTextEl = document.getElementById('cw-round-text');
    if (roundTextEl) {
      roundTextEl.textContent = `${currentRound} / ${MAX_ROUNDS}`;
    }
    // 1. 영토 통계 계산 및 업데이트
    let whiteCount = 0;
    let blackCount = 0;
    Object.values(boardState).forEach(t => {
      if (t.owner === 'White') whiteCount++;
      else if (t.owner === 'Black') blackCount++;
    });

    const whiteScoreEl = document.getElementById('cw-white-score');
    if (whiteScoreEl) whiteScoreEl.textContent = `${whiteCount}칸`;
    const blackScoreEl = document.getElementById('cw-black-score');
    if (blackScoreEl) blackScoreEl.textContent = `${blackCount}칸`;

    // 1-1. 상단 헤더 골드 동시 투명 표시
    const whiteGoldEl = document.getElementById('cw-white-gold');
    if (whiteGoldEl) whiteGoldEl.innerHTML = `<i class="fa-solid fa-coins"></i> ${whiteGold}G`;
    const blackGoldEl = document.getElementById('cw-black-gold');
    if (blackGoldEl) blackGoldEl.innerHTML = `<i class="fa-solid fa-coins"></i> ${blackGold}G`;

    // 2. 턴 뱃지 업데이트
    const isTurn = _isMyTurn();
    const mySide = _getMySide();
    const isSingle = _isSinglePlayer();
    const turnBadgeEl = document.getElementById('cw-turn-badge');
    if (turnBadgeEl) {
      turnBadgeEl.className = `cw-turn-badge ${isTurn ? 'my-turn' : 'opp-turn'}`;
      let turnDesc;
      if (isSingle) {
        turnDesc = `${currentTurn} 턴 (자유 조작)`;
      } else {
        turnDesc = isTurn
          ? `내 턴 (${mySide})`
          : `상대 턴 (${currentTurn})`;
      }
      turnBadgeEl.innerHTML = `
        <i class="fa-solid ${isTurn ? 'fa-play' : 'fa-hourglass-half'}"></i>
        <span>${turnDesc}</span>
      `;
    }

    // 3. AP 게이지 업데이트
    const apTextEl = document.getElementById('cw-ap-text');
    if (apTextEl) apTextEl.textContent = `${currentAP}/${MAX_AP}`;

    for (let i = 1; i <= MAX_AP; i++) {
      const dotEl = document.getElementById(`cw-ap-dot-${i}`);
      if (dotEl) {
        if (i <= currentAP) dotEl.classList.add('active');
        else dotEl.classList.remove('active');
      }
    }

    // 4. 골드 보유량 텍스트 업데이트 (2인 멀티 시 '내 골드' 고정, 1인 모드 시 현재 턴 골드)
    const myGold = (mySide === 'White') ? whiteGold : blackGold;
    const currentTurnGold = (currentTurn === 'White') ? whiteGold : blackGold;
    const playerGold = isSingle ? currentTurnGold : myGold;

    const goldLabelEl = document.getElementById('cw-gold-label');
    const goldCountEl = document.getElementById('cw-gold-count');
    if (goldLabelEl) {
      goldLabelEl.textContent = isSingle ? `${currentTurn} 골드` : '내 골드';
    }
    if (goldCountEl) {
      goldCountEl.textContent = playerGold;
    }

    // 5. 상점 기물 소환 버튼 상태 업데이트
    const activeColor = isSingle
      ? (currentTurn === 'White' ? 'w' : 'b')
      : (mySide === 'White' ? 'w' : 'b');

    if (_container) {
      const shopButtons = _container.querySelectorAll('.btn-cw-spawn');
      shopButtons.forEach(btn => {
        const pType = btn.getAttribute('data-piece');
        const cost = SPAWN_COSTS[pType] || 1;
        const canAfford = isTurn && !gameOver && (currentAP > 0) && (playerGold >= cost);

        btn.disabled = !canAfford;
        btn.classList.toggle('selected', selectedSpawnPiece === pType);

        // 현재 턴 플레이어의 기물 SVG로 상점 아이콘 갱신
        const iconEl = btn.querySelector('.spawn-icon');
        if (iconEl) {
          iconEl.innerHTML = PIECE_SVGS[activeColor]?.[pType] || '';
        }
      });
    }

    // 6. 턴 종료 버튼 상태 업데이트
    const endTurnBtn = document.getElementById('btn-cw-end-turn');
    if (endTurnBtn) {
      if (isTurn && !gameOver) {
        endTurnBtn.classList.remove('disabled');
        endTurnBtn.classList.add('active');
        endTurnBtn.disabled = false;
      } else {
        endTurnBtn.classList.remove('active');
        endTurnBtn.classList.add('disabled');
        endTurnBtn.disabled = true;
      }
    }

    // 7. 상단 인게임 플레이어 턴 하이라이트 동기화
    _updateInGameTurnSync();
  }

  /**
   * 🌟 타일 클릭 인터랙션 핸들러 🌟
   */
  function _onTileClick(coord) {
    if (gameOver) return;

    // 내 턴이 아니면 클릭 인터랙션 차단 및 알림
    if (!_isMyTurn()) {
      if (typeof showToast === 'function') {
        const mySide = _getMySide();
        showToast(`상대방(${currentTurn})의 차례입니다. 내 진영: ${mySide}`, 'info');
      }
      return;
    }

    const activeColor = _isSinglePlayer()
      ? (currentTurn === 'White' ? 'w' : 'b')
      : (_getMySide() === 'White' ? 'w' : 'b');

    const tile = boardState[coord];

    // 💫 기절(Stun) 상태 기물 클릭 시 즉각 차단 및 선택 무효화 (이번 턴 동안 아예 선택도 불가)
    if (tile && tile.piece && tile.piece.isStunned) {
      selectedCoord = null;
      validMoves = [];
      _updateHighlights();
      _updateUI();
      _playSound('warn');
      if (typeof showToast === 'function') {
        showToast('💫 기절(Stun) 상태! 폰을 처치한 기물은 이번 턴 동안 선택 및 조작이 불가능합니다.', 'warn');
      }
      return;
    }

    // 🌟 1. 기물 소환(Spawn) 모드 활성화 시 -> 소환 가능한 타일 클릭 시 소환 실행!
    if (selectedSpawnPiece) {
      if (validSpawnCoords.includes(coord)) {
        _executeSpawn(selectedSpawnPiece, coord, true);
        return;
      } else {
        // 소환 불가 칸 클릭 시 소환 모드 해제 후 기물 선택 여부 계속 확인
        selectedSpawnPiece = null;
        validSpawnCoords = [];
        _updateHighlights();
        _updateUI();
      }
    }

    // 2. 이미 기물이 선택되어 있고, 유효 이동 칸을 클릭한 경우 -> 이동 실행!
    if (selectedCoord && validMoves.includes(coord)) {
      _executeMove(selectedCoord, coord, true);
      return;
    }

    // 3. 내가 조작 가능한 기물이 있는 타일을 클릭한 경우 -> 기물 선택 & 이동 가능 경로 계산
    if (tile && tile.piece && tile.piece.color === activeColor) {
      // 상점 소환 모드 해제
      selectedSpawnPiece = null;
      validSpawnCoords = [];

      // 💫 기절(Stun) 상태 기물 클릭 시 조작 차단 및 안내
      if (tile.piece.isStunned) {
        selectedCoord = null;
        validMoves = [];
        _updateHighlights();
        _updateUI();
        _playSound('warn');
        if (typeof showToast === 'function') {
          showToast('💫 기절(Stun) 상태! 폰을 처치한 기물은 이번 턴 동안 행동할 수 없습니다.', 'warn');
        }
        return;
      }

      if (selectedCoord === coord) {
        // 이미 선택된 기물을 다시 누르면 선택 해제
        selectedCoord = null;
        validMoves = [];
      } else {
        selectedCoord = coord;
        validMoves = _getValidMoves(coord);
        _playSound('select');
      }
      _updateHighlights();
      _updateUI();
      return;
    }

    // 4. 그 외 빈 타일 또는 이동 불가능한 적 타일 클릭 -> 선택 해제
    if (selectedCoord || selectedSpawnPiece) {
      selectedCoord = null;
      validMoves = [];
      selectedSpawnPiece = null;
      validSpawnCoords = [];
      _updateHighlights();
      _updateUI();
    }
  }

  /**
   * 내 턴이 시작되었을 때 코인 유입 비행 애니메이션 연출 헬퍼
   */
  function _triggerTurnStartCoinAnimation(side) {
    if (typeof document === 'undefined') return;
    const myColor = (side === 'White') ? 'w' : 'b';
    const coinSources = [];
    Object.values(boardState).forEach(t => {
      if (t.piece && t.piece.type === 'k' && t.piece.color === myColor && _isPieceSupplied(t)) {
        coinSources.push({ coord: t.coord, amount: 2 });
      }
    });
    FORTRESS_COORDS.forEach(coord => {
      const t = boardState[coord];
      if (t && t.owner === side && t.isSupplied) {
        coinSources.push({ coord: t.coord, amount: 1 });
      }
    });
    if (coinSources.length > 0) {
      _playCoinInflowAnimation(coinSources, 'cw-gold-badge');
    }
  }

  /**
   * P2P 메시지 수신 처리 핸들러
   */
  function onMessage(data, senderId) {
    if (!data) return;

    if (data.type === 'cw_room_start') {
      _startActualGame(false);
      if (typeof data.whiteGold === 'number') whiteGold = data.whiteGold;
      if (typeof data.blackGold === 'number') blackGold = data.blackGold;
      _updateUI();
    } else if (data.type === 'cw_move') {
      if (typeof data.whiteGold === 'number') whiteGold = data.whiteGold;
      if (typeof data.blackGold === 'number') blackGold = data.blackGold;
      if (typeof data.currentRound === 'number') currentRound = data.currentRound;
      _executeMove(data.from, data.to, false);
      if (data.isStunned && boardState[data.to] && boardState[data.to].piece) {
        boardState[data.to].piece.isStunned = true;
        _updateBoardTiles();
      }
      if (data.isKingCapture) {
        gameOver = true;
        _showGameOverBanner(data.nextTurn === 'White' ? 'Black' : 'White', 'king');
      } else if (data.isAnnihilation) {
        gameOver = true;
        _showGameOverBanner(data.nextTurn === 'White' ? 'Black' : 'White', 'annihilation');
      } else if (data.turnSwitched && currentTurn === _getMySide()) {
        _triggerTurnStartCoinAnimation(currentTurn);
      }
    } else if (data.type === 'cw_end_turn') {
      if (typeof data.whiteGold === 'number') whiteGold = data.whiteGold;
      if (typeof data.blackGold === 'number') blackGold = data.blackGold;
      if (typeof data.currentRound === 'number') currentRound = data.currentRound;
      _endTurn(false);
      if (currentTurn === _getMySide()) {
        _triggerTurnStartCoinAnimation(currentTurn);
      }
    } else if (data.type === 'cw_spawn') {
      if (typeof data.whiteGold === 'number') whiteGold = data.whiteGold;
      if (typeof data.blackGold === 'number') blackGold = data.blackGold;
      if (typeof data.currentRound === 'number') currentRound = data.currentRound;
      _executeSpawn(data.pieceType, data.coord, false);
      if (data.turnSwitched && currentTurn === _getMySide()) {
        _triggerTurnStartCoinAnimation(currentTurn);
      }
    }
  }

  /**
   * 모듈 초기화
   */
  function init(container, onResult, context) {
    _container = container;
    _onResult = onResult;
    _context = context;

    // autoStart 옵션이 있거나 테스트 모드인 경우 바로 게임 시작, 아니면 가상 방 화면 표시
    if (_context && _context.autoStart) {
      viewState = 'game';
      _initState();
      _renderGameLayout();
      _awardTurnStartGold('White');
      _updateUI();
    } else {
      viewState = 'room';
      _renderMain();
    }

    // 🌟 P2P 동기화 리스너 등록
    if (typeof P2P !== 'undefined') {
      P2P.offMessage(onMessage);
      P2P.onMessage(onMessage);
    }
  }

  /**
   * 재대결
   */
  function rematch() {
    _startActualGame(true);
  }

  /**
   * 모듈 정리
   */
  function destroy() {
    if (typeof P2P !== 'undefined') {
      P2P.offMessage(onMessage);
    }
    const modalEl = document.getElementById('cw-result-modal');
    if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);

    if (_container) {
      _container.innerHTML = '';
    }
    _container = null;
    _onResult = null;
    _context = null;
    boardState = {};
    _tileElements = {};
    selectedCoord = null;
    validMoves = [];
    viewState = 'room';
  }

  /**
   * 타일 상태 및 테스트 헬퍼
   */
  function getTile(coord) {
    return boardState[coord] || null;
  }

  function getBoardState() {
    return boardState;
  }

  function getCurrentAP() {
    return currentAP;
  }

  function getCurrentTurn() {
    return currentTurn;
  }

  function getRound() {
    return currentRound;
  }

  function getViewState() {
    return viewState;
  }

  function isGameOver() {
    return gameOver;
  }

  function startGame(isLocal = true) {
    _startActualGame(isLocal);
  }

  function testMove(from, to) {
    _executeMove(from, to, true);
  }

  function testEndTurn() {
    _endTurn(true);
  }

  function getGold(side) {
    return (side === 'White') ? whiteGold : blackGold;
  }

  function testSpawn(pieceType, coord) {
    _executeSpawn(pieceType, coord, true);
  }

  function getValidMoves(coord) {
    return _getValidMoves(coord);
  }

  return {
    init,
    destroy,
    rematch,
    onMessage,
    getTile,
    getBoardState,
    getCurrentAP,
    getCurrentTurn,
    getRound,
    getViewState,
    getGold,
    isGameOver,
    startGame,
    getValidMoves,
    isPieceIsolated: (coord) => _isPieceIsolated(boardState[coord]),
    isPieceSupplied: (coord) => _isPieceSupplied(boardState[coord]),
    isPieceStunned: (coord) => !!(boardState[coord] && boardState[coord].piece && boardState[coord].piece.isStunned),
    testMove,
    testEndTurn,
    testSpawn
  };
})();
