/**
 * app.js - P2P 아케이드 플랫폼 메인 컨트롤러
 * (2~5인 다중 플레이, 오목 반응형 & 2인 제한, 셔플, 실시간 퇴장 알림 및 참가자 목록 즉각 제거)
 */
(() => {
  'use strict';

  /* ── 게임 목록 정의 ── */
  const GAMES = {
    gomoku:       { module: GomokuGame,       title: '오목',          maxPlayers: 2, isTurnBased: true },
    chess:        { module: ChessGame,        title: '체스',          maxPlayers: 2, isTurnBased: true },
    chesswarfare: { module: ChessWarfareGame, title: '체스 워페어',    maxPlayers: 2, isTurnBased: true },
    janggi:       { module: JanggiGame,       title: '장기',          maxPlayers: 2, isTurnBased: true },
    alkkagi:   { module: AlkkagiGame,   title: '알까기',        maxPlayers: 2, isTurnBased: true },
    quoridor:  { module: QuoridorGame,  title: '쿼리도',        maxPlayers: 2, isTurnBased: true },
    baskin31:  { module: Baskin31Game,  title: '베스킨라빈스 31', maxPlayers: 8, isTurnBased: true },
    roulette:  { module: RussianRouletteGame, title: '러시안 룰렛', maxPlayers: 8, isTurnBased: true },
    wordchain: { module: WordchainGame, title: '끝말잇기',      maxPlayers: 8, isTurnBased: true },
    apple:     { module: AppleGame,     title: '사과게임',        maxPlayers: 8, isTurnBased: false },
    typing:    { module: TypingGame,    title: '타자연습 대결',    maxPlayers: 8, isTurnBased: false },
    catchmind: { module: CatchmindGame, title: '캐치마인드',      maxPlayers: 8, isTurnBased: true },
    yutnori:   { module: YutnoriGame,   title: '윷놀이',          maxPlayers: 4, isTurnBased: true },
    yacht:     { module: YachtGame,     title: '야추 다이스',      maxPlayers: 4, isTurnBased: true },
  };

  // 끝말잇기 첫 단어 랜덤 풀
  const START_WORDS = [
    '하늘', '바다', '비행기', '사과', '피아노', '고양이', '호랑이', '우주선', '초콜릿', '기차',
    '나무', '학교', '선생님', '가방', '모자', '시계', '자전거', '강아지', '바나나', '포도',
    '딸기', '수박', '오렌지', '자동차', '비행선', '우산', '선풍기', '도서관', '운동장', '음악',
    '미술', '과학', '수학', '한국', '서울', '부산', '제주도', '바람', '구름', '태양',
    '무지개', '꽃잎', '단풍', '눈사람', '선물', '편지', '사진', '카메라', '노트북', '게임기',
    '안경', '지갑', '열쇠', '의자', '책상', '침대', '거울', '창문', '신발', '양말',
    '장갑', '목도리', '패딩', '코트', '주스', '우유', '케이크', '과자', '사탕', '풍선'
  ];

  const MAX_ROOM_CAPACITY = 5;

  /* ── 🐾 동물 아바타 및 색상 팔레트 시스템 ── */
  const AVATAR_ICONS = [
    'fa-solid fa-dog',
    'fa-solid fa-cat',
    'fa-solid fa-frog',
    'fa-solid fa-paw',
    'fa-solid fa-fish',
    'fa-solid fa-dove',
    'fa-solid fa-crow',
    'fa-solid fa-otter',
    'fa-solid fa-dragon',
    'fa-solid fa-horse',
    'fa-solid fa-hippo',
    'fa-solid fa-kiwi-bird',
    'fa-solid fa-feather',
    'fa-solid fa-spider',
    'fa-solid fa-shield-cat',
    'fa-solid fa-bugs'
  ];

  const AVATAR_COLORS = [
    '#38a169', '#3182ce', '#e53e3e', '#805ad5',
    '#d69e2e', '#dd6b20', '#d53f8c', '#319795',
    '#4a5568', '#2b6cb0', '#6b46c1', '#2f855a'
  ];

  function _getRandomAvatarIcon() {
    return AVATAR_ICONS[Math.floor(Math.random() * AVATAR_ICONS.length)];
  }
  function _getRandomAvatarColor() {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  }

  /* ── 상태 변수 (기본 닉네임: 익명 + 랜덤 동물/색상 고유 부여) ── */
  let myNickname = localStorage.getItem('arcade_nick') || '익명';
  let myAvatarIcon = localStorage.getItem('arcade_avatar_icon') || '';
  let myAvatarColor = localStorage.getItem('arcade_avatar_color') || '';

  if (!myAvatarIcon) {
    myAvatarIcon = _getRandomAvatarIcon();
    localStorage.setItem('arcade_avatar_icon', myAvatarIcon);
  }
  if (!myAvatarColor) {
    myAvatarColor = _getRandomAvatarColor();
    localStorage.setItem('arcade_avatar_color', myAvatarColor);
  }
  if (!localStorage.getItem('arcade_nick')) {
    localStorage.setItem('arcade_nick', myNickname);
  }

  // 🎨 닉네임 색상 염색약 (상점 아이템)
  let myNicknameColor = localStorage.getItem('arcade_name_color') || '';
  let myPurchasedNameColors = [];
  try {
    const rawPurchased = localStorage.getItem('arcade_purchased_name_colors');
    myPurchasedNameColors = rawPurchased ? JSON.parse(rawPurchased) : [];
    if (!Array.isArray(myPurchasedNameColors)) myPurchasedNameColors = [];
  } catch (_) {
    myPurchasedNameColors = [];
  }

  const SHOP_NICKNAME_COLORS = [
    {
      id: 'color_gold',
      name: '골드',
      hex: '#f59e0b',
      price: 500,
      desc: '골드 색상',
      icon: 'fa-solid fa-crown'
    },
    {
      id: 'color_pink',
      name: '핑크',
      hex: '#ec4899',
      price: 500,
      desc: '핑크 색상',
      icon: 'fa-solid fa-heart'
    },
    {
      id: 'color_blue',
      name: '하늘색',
      hex: '#0284c7',
      price: 500,
      desc: '하늘색',
      icon: 'fa-solid fa-droplet'
    },
    {
      id: 'color_green',
      name: '초록',
      hex: '#10b981',
      price: 500,
      desc: '초록 색상',
      icon: 'fa-solid fa-gem'
    },
    {
      id: 'color_purple',
      name: '보라',
      hex: '#8b5cf6',
      price: 500,
      desc: '보라 색상',
      icon: 'fa-solid fa-wand-magic-sparkles'
    },
    {
      id: 'color_red',
      name: '빨강',
      hex: '#ef4444',
      price: 500,
      desc: '빨강 색상',
      icon: 'fa-solid fa-fire'
    },
    {
      id: 'color_cyan',
      name: '청록',
      hex: '#06b6d4',
      price: 600,
      desc: '청록 색상',
      icon: 'fa-solid fa-bolt'
    },
    {
      id: 'color_rose',
      name: '로즈',
      hex: '#f43f5e',
      price: 600,
      desc: '로즈 색상',
      icon: 'fa-solid fa-heart'
    },
    {
      id: 'color_silver',
      name: '실버',
      hex: '#94a3b8',
      price: 700,
      desc: '실버 색상',
      icon: 'fa-solid fa-shield'
    },
    {
      id: 'color_rainbow',
      name: '무지개',
      hex: 'rainbow',
      price: 1200,
      desc: '무지개 그라데이션',
      icon: 'fa-solid fa-rainbow'
    },
    {
      id: 'color_default',
      name: '기본',
      hex: '',
      price: 0,
      desc: '기본 색상',
      icon: 'fa-solid fa-rotate-left',
      isDefault: true
    }
  ];

  // 🎴 프로필 카드 테마 (상점 아이템 - 로비, 대기방, 인게임 전역 적용)
  let myProfileCard = localStorage.getItem('arcade_profile_card') || 'default';
  let myPurchasedProfileCards = ['default'];
  try {
    const rawCardPurchased = localStorage.getItem('arcade_purchased_profile_cards');
    myPurchasedProfileCards = rawCardPurchased ? JSON.parse(rawCardPurchased) : ['default'];
    if (!Array.isArray(myPurchasedProfileCards)) myPurchasedProfileCards = ['default'];
    if (!myPurchasedProfileCards.includes('default')) myPurchasedProfileCards.push('default');
  } catch (_) {
    myPurchasedProfileCards = ['default'];
  }

  const SHOP_PROFILE_CARDS = [
    {
      id: 'default',
      name: '기본',
      themeClass: 'default',
      price: 0,
      icon: 'fa-solid fa-id-badge',
      isDefault: true
    },
    {
      id: 'sunset',
      name: '선셋',
      themeClass: 'pcard-theme-sunset',
      price: 500,
      icon: 'fa-solid fa-sun'
    },
    {
      id: 'ocean',
      name: '오션',
      themeClass: 'pcard-theme-ocean',
      price: 500,
      icon: 'fa-solid fa-water'
    },
    {
      id: 'emerald',
      name: '민트',
      themeClass: 'pcard-theme-emerald',
      price: 500,
      icon: 'fa-solid fa-leaf'
    },
    {
      id: 'midnight',
      name: '퍼플',
      themeClass: 'pcard-theme-midnight',
      price: 500,
      icon: 'fa-solid fa-moon'
    },
    {
      id: 'sakura',
      name: '핑크',
      themeClass: 'pcard-theme-sakura',
      price: 500,
      icon: 'fa-solid fa-fan'
    },
    {
      id: 'carbon',
      name: '카본',
      themeClass: 'pcard-theme-carbon',
      price: 700,
      icon: 'fa-solid fa-chess-board'
    },
    {
      id: 'retro-pixel',
      name: '픽셀 도트',
      themeClass: 'pcard-theme-retro-pixel',
      price: 700,
      icon: 'fa-solid fa-gamepad'
    },
    {
      id: 'galaxy',
      name: '은하수',
      themeClass: 'pcard-theme-galaxy',
      price: 700,
      icon: 'fa-solid fa-meteor'
    },
    {
      id: 'hologram',
      name: '프리즘',
      themeClass: 'pcard-theme-hologram',
      price: 1000,
      icon: 'fa-solid fa-wand-magic-sparkles'
    },
    {
      id: 'royal-gold',
      name: '골드',
      themeClass: 'pcard-theme-royal-gold',
      price: 1000,
      icon: 'fa-solid fa-crown'
    },
    {
      id: 'matrix',
      name: '매트릭스',
      themeClass: 'pcard-theme-matrix',
      price: 1000,
      icon: 'fa-solid fa-terminal'
    },
    {
      id: 'aurora',
      name: '오로라',
      themeClass: 'pcard-theme-aurora',
      price: 1200,
      icon: 'fa-solid fa-wind'
    },
    {
      id: 'space',
      name: '스페이스',
      themeClass: 'pcard-theme-space',
      price: 1200,
      icon: 'fa-solid fa-globe'
    },
    {
      id: 'arcade-neon',
      name: '아케이드',
      themeClass: 'pcard-theme-arcade-neon',
      price: 1500,
      icon: 'fa-solid fa-gamepad'
    },
    {
      id: 'rainbow',
      name: '무지개',
      themeClass: 'pcard-theme-rainbow',
      price: 1500,
      icon: 'fa-solid fa-rainbow'
    }
  ];

  // 💬 말풍선 스킨 (상점 아이템)
  let myChatBubble = localStorage.getItem('arcade_user_chat_bubble') || 'default';
  let myPurchasedChatBubbles = ['default'];
  try {
    const rawBubbles = localStorage.getItem('arcade_purchased_chat_bubbles');
    myPurchasedChatBubbles = rawBubbles ? JSON.parse(rawBubbles) : ['default'];
    if (!Array.isArray(myPurchasedChatBubbles)) myPurchasedChatBubbles = ['default'];
    if (!myPurchasedChatBubbles.includes('default')) myPurchasedChatBubbles.push('default');
  } catch (_) {
    myPurchasedChatBubbles = ['default'];
  }

  const SHOP_CHAT_BUBBLES = [
    {
      id: 'default',
      name: '기본',
      bubbleClass: 'bubble-default',
      price: 0,
      icon: 'fa-solid fa-comment',
      desc: '기본 말풍선',
      isDefault: true
    },
    {
      id: 'bubble_retro_dot',
      name: '도트',
      bubbleClass: 'bubble-retro-dot',
      price: 600,
      icon: 'fa-solid fa-gamepad',
      desc: '도트 테두리 말풍선'
    },
    {
      id: 'bubble_cyber_neon',
      name: '다크',
      bubbleClass: 'bubble-cyber-neon',
      price: 800,
      icon: 'fa-solid fa-moon',
      desc: '다크 테마 말풍선'
    },
    {
      id: 'bubble_mint_soda',
      name: '민트',
      bubbleClass: 'bubble-mint-soda',
      price: 500,
      icon: 'fa-solid fa-glass-water',
      desc: '민트색 말풍선'
    },
    {
      id: 'bubble_cozy_peach',
      name: '피치',
      bubbleClass: 'bubble-cozy-peach',
      price: 500,
      icon: 'fa-solid fa-heart',
      desc: '피치색 말풍선'
    },
    {
      id: 'bubble_pop_comic',
      name: '코믹',
      bubbleClass: 'bubble-pop-comic',
      price: 700,
      icon: 'fa-solid fa-comment-dots',
      desc: '만화 스타일 말풍선'
    },
    {
      id: 'bubble_royal_velvet',
      name: '와인',
      bubbleClass: 'bubble-royal-velvet',
      price: 1000,
      icon: 'fa-solid fa-crown',
      desc: '와인색 말풍선'
    },
    {
      id: 'bubble_rainbow',
      name: '무지개',
      bubbleClass: 'bubble-rainbow',
      price: 1200,
      icon: 'fa-solid fa-rainbow',
      desc: '무지개 말풍선'
    }
  ];

  // 🖼️ 아바타 테두리 (상점 아이템)
  let myAvatarFrame = localStorage.getItem('arcade_user_avatar_frame') || 'default';
  let myPurchasedAvatarFrames = ['default'];
  try {
    const rawFrames = localStorage.getItem('arcade_purchased_avatar_frames');
    myPurchasedAvatarFrames = rawFrames ? JSON.parse(rawFrames) : ['default'];
    if (!Array.isArray(myPurchasedAvatarFrames)) myPurchasedAvatarFrames = ['default'];
    if (!myPurchasedAvatarFrames.includes('default')) myPurchasedAvatarFrames.push('default');
  } catch (_) {
    myPurchasedAvatarFrames = ['default'];
  }

  const SHOP_AVATAR_FRAMES = [
    {
      id: 'default',
      name: '기본',
      frameClass: 'frame-default',
      price: 0,
      icon: 'fa-regular fa-circle',
      desc: '기본 테두리',
      isDefault: true
    },
    // 🔲 네모난 레트로 픽셀 테두리 라인업
    {
      id: 'frame_retro_pixel',
      name: '픽셀 보라',
      frameClass: 'frame-retro-pixel',
      price: 600,
      icon: 'fa-solid fa-square',
      desc: '보라색 네모 픽셀'
    },
    {
      id: 'frame_pixel_black',
      name: '픽셀 블랙',
      frameClass: 'frame-pixel-black',
      price: 500,
      icon: 'fa-solid fa-square',
      desc: '검은색 네모 픽셀'
    },
    {
      id: 'frame_pixel_gold',
      name: '픽셀 골드',
      frameClass: 'frame-pixel-gold',
      price: 800,
      icon: 'fa-solid fa-square',
      desc: '황금색 네모 픽셀'
    },
    {
      id: 'frame_pixel_mint',
      name: '픽셀 민트',
      frameClass: 'frame-pixel-mint',
      price: 600,
      icon: 'fa-solid fa-square',
      desc: '민트색 네모 픽셀'
    },
    {
      id: 'frame_pixel_red',
      name: '픽셀 레드',
      frameClass: 'frame-pixel-red',
      price: 600,
      icon: 'fa-solid fa-square',
      desc: '빨간색 네모 픽셀'
    },
    {
      id: 'frame_pixel_blue',
      name: '픽셀 블루',
      frameClass: 'frame-pixel-blue',
      price: 600,
      icon: 'fa-solid fa-square',
      desc: '파란색 네모 픽셀'
    },
    {
      id: 'frame_pixel_gameboy',
      name: '게임보이',
      frameClass: 'frame-pixel-gameboy',
      price: 700,
      icon: 'fa-solid fa-gamepad',
      desc: '게임보이 네모 픽셀'
    },
    {
      id: 'frame_pixel_rainbow',
      name: '픽셀 무지개',
      frameClass: 'frame-pixel-rainbow',
      price: 1000,
      icon: 'fa-solid fa-rainbow',
      desc: '무지개 네모 픽셀'
    },
    // 🌟 프리미엄 원형 테두리 (이름 심플화)
    {
      id: 'frame_gold_wreath',
      name: '월계관',
      frameClass: 'frame-gold-wreath',
      price: 800,
      icon: 'fa-solid fa-award',
      desc: '황금 월계관'
    },
    {
      id: 'frame_cyber_pulse',
      name: '블루',
      frameClass: 'frame-cyber-pulse',
      price: 700,
      icon: 'fa-solid fa-vector-square',
      desc: '블루 사각 테두리'
    },
    {
      id: 'frame_ice_crystal',
      name: '크리스탈',
      frameClass: 'frame-ice-crystal',
      price: 900,
      icon: 'fa-solid fa-snowflake',
      desc: '얼음 크리스탈'
    },
    {
      id: 'frame_fire_flame',
      name: '불꽃',
      frameClass: 'frame-fire-flame',
      price: 1000,
      icon: 'fa-solid fa-fire',
      desc: '불꽃 테두리'
    },
    {
      id: 'frame_royal_crown',
      name: '왕관',
      frameClass: 'frame-royal-crown',
      price: 1500,
      icon: 'fa-solid fa-crown',
      desc: '황금 왕관'
    }
  ];

  // 🎆 승리 세레머니 연출 (상점 아이템)
  let myVictoryEffect = localStorage.getItem('arcade_user_victory_effect') || 'default';
  let myPurchasedVictoryEffects = ['default'];
  try {
    const rawEffects = localStorage.getItem('arcade_purchased_victory_effects');
    myPurchasedVictoryEffects = rawEffects ? JSON.parse(rawEffects) : ['default'];
    if (!Array.isArray(myPurchasedVictoryEffects)) myPurchasedVictoryEffects = ['default'];
    if (!myPurchasedVictoryEffects.includes('default')) myPurchasedVictoryEffects.push('default');
  } catch (_) {
    myPurchasedVictoryEffects = ['default'];
  }

  const SHOP_VICTORY_EFFECTS = [
    {
      id: 'default',
      name: '기본',
      effectKey: 'default',
      price: 0,
      icon: 'fa-solid fa-wand-magic-sparkles',
      desc: '기본 폭죽',
      isDefault: true
    },
    {
      id: 'fx_coin_shower',
      name: '코인',
      effectKey: 'coin_shower',
      price: 1000,
      icon: 'fa-solid fa-coins',
      desc: '코인 폭죽'
    },
    {
      id: 'fx_pixel_fireworks',
      name: '도트 폭죽',
      effectKey: 'pixel_fireworks',
      price: 800,
      icon: 'fa-solid fa-bomb',
      desc: '도트 사각 폭죽'
    },
    {
      id: 'fx_neon_sparks',
      name: '스파크',
      effectKey: 'neon_sparks',
      price: 1000,
      icon: 'fa-solid fa-bolt',
      desc: '빛나는 스파크'
    },
    {
      id: 'fx_heart_star',
      name: '하트',
      effectKey: 'heart_star',
      price: 700,
      icon: 'fa-solid fa-heart',
      desc: '하트와 별'
    },
    {
      id: 'fx_grand_festival',
      name: '불꽃축제',
      effectKey: 'grand_festival',
      price: 1800,
      icon: 'fa-solid fa-champagne-glasses',
      desc: '대형 불꽃'
    },
    {
      id: 'fx_rainbow_blast',
      name: '무지개',
      effectKey: 'rainbow_blast',
      price: 1500,
      icon: 'fa-solid fa-rainbow',
      desc: '무지개 폭죽'
    }
  ];

  // 🪙 코인 상태 변수 (로그인 계정 전용, 기본 승리 보상: 50코인)
  let myCoins = parseInt(localStorage.getItem('arcade_user_coins') || '0', 10);
  const WIN_REWARD_COINS = 50;

  // 🌟 1~300 레벨 및 경험치 시스템 (로컬 & 클라우드 연동)
  const MAX_LEVEL = 300;
  let myLevel = parseInt(localStorage.getItem('arcade_user_level') || '1', 10);
  let myExp = parseInt(localStorage.getItem('arcade_user_exp') || '0', 10);
  if (isNaN(myLevel) || myLevel < 1) myLevel = 1;
  if (myLevel > MAX_LEVEL) myLevel = MAX_LEVEL;
  if (isNaN(myExp) || myExp < 0) myExp = 0;

  let pendingAction = null;
  let pendingJoinCode = '';

  let currentRoomCode = '';
  let selectedGameKey = 'gomoku';
  let currentGameModule = null;

  // 방 설정 옵션 상태
  let createRoomCapacity = 5;
  let currentRoomMaxPlayers = 5;
  let currentRoomPassword = '';
  let pendingJoinRoomCode = '';

  // 🎮 게임별 세부 설정 (목표 라운드 1~8회, 오목/체스 진영 셔플/흑/백)
  let selectedGameRounds = 3;
  let selectedGameSideMode = 'shuffle'; // 'shuffle' | 'host_black' | 'host_white'

  // 룸 참가자 목록
  let roomPlayers = [];
  let isHostPlayer = false;
  let isMyReady = false;
  let isDevMode = false;
  let isRoomGameActive = false;
  let _isMigratingHost = false; // 방장 위임/인계 마이그레이션 진행 플래그

  // 현재 게임 중인 참가자 목록 (셔플된 순서)
  let activeGamePlayers = [];

  // 방장 관리 액션 대상 플레이어
  let selectedTargetPlayer = null;
  let lastKnownTurnPlayerIdOrIdx = null; // 🌟 현재 턴 인덱스/ID 영구 기억 변수
  // 활성화된 프로필 이모지 상태 저장 객체
 const activeProfileEmojis = {}; // { playerId: { emojiSrc, timeoutId } }

  /* ── DOM 헬퍼 ── */
  const $ = (id) => document.getElementById(id);

  const screens = {
    home:     $('screen-home'),
    room:     $('screen-room'),
    game:     $('screen-game'),
  };

  function _pushHistory(state, hash) {
    if (window.history && typeof window.history.pushState === 'function') {
      try {
        const url = hash ? hash : ((window.location && window.location.pathname) ? window.location.pathname : '');
        window.history.pushState(state, '', url);
      } catch (e) {}
    }
  }

  function _replaceHistory(state) {
    if (window.history && typeof window.history.replaceState === 'function') {
      try {
        const url = (window.location && window.location.pathname) ? window.location.pathname : '';
        window.history.replaceState(state, '', url);
      } catch (e) {}
    }
  }

  function _backHistoryIfModal(modalName) {
    if (window.history && window.history.state && window.history.state.modal === modalName) {
      if (typeof window.history.back === 'function') {
        try {
          window.history.back();
          return true;
        } catch (e) {}
      }
    }
    return false;
  }

  /* ── 💡 방 화면 하단 도움말/팁 10초 랜덤 순환 ── */
  const ROOM_TIPS = [
    'Tip - 로그인을 하면 전적과 레벨 등의 정보를 안전하게 저장할 수 있어요.',
    'Tip - 승리 시 지급되는 코인으로 상점에서 멋진 아이템을 살 수 있어요.',
    'Tip - 상점에서 프로필 카드와 닉네임 염색약을 구매해 나만의 개성을 뽐내보세요!',
    'Tip - 채팅창에 다양한 감정표현 이모지를 사용해 플레이어들과 소통해 보세요.',
    'Tip - 상단 방 코드를 클릭하면 클립보드에 바로 복사되어 친구를 쉽게 초대할 수 있어요.',
    'Tip - 오목과 체스는 방장이 진영(흑/백/셔플)을 자유롭게 설정할 수 있어요.',
    'Tip - 끝말잇기와 캐치마인드는 방장이 게임 라운드 수를 1~20라운드까지 조절할 수 있어요.',
    'Tip - 대기실과 인게임 좌측 패널에서 플레이어를 클릭하면 프로필과 전적 통계를 볼 수 있어요.',
    'Tip - 프로필 카드를 장착하면 대기실, 인게임, 접속자 목록에 멋진 테마가 표시돼요.',
    'Tip - 캐치마인드에서 그림을 그릴 때 투명도, 브러시 크기, 무지개 컬러 휠을 활용해 보세요!',
    'Tip - 러시안 룰렛에서는 돋보기, 맥주, 수갑 등 아이템을 적재적소에 사용하는 것이 승리의 열쇠예요.',
    'Tip - 야추 다이스는 주사위를 최대 3번까지 굴릴 수 있으며, 높은 족보를 전략적으로 선점하는 게 중요해요.',
    'Tip - 게임 도중 관전자로 참여해도 실시간으로 채팅과 이모지로 함께 응원할 수 있어요.',
    'Tip - 사이드바 상단의 프로필 설정 버튼을 눌러 언제든 귀여운 동물 아바타로 변경할 수 있어요.',
    'Tip - 다크 모드를 켜면 눈의 피로를 덜면서 더욱 몰입감 있게 게임을 즐길 수 있어요.',
    'Tip - 게임에서 아쉽게 패배하더라도 판수와 경험치가 누적되어 레벨을 올릴 수 있어요.',
    'Tip - 쓰레기 체스는 폰 대신 다양한 룰과 영토 확장으로 색다른 전략을 즐길 수 있어요.',
    'Tip - 쿼리도는 말 이동뿐만 아니라 상대의 경로를 벽으로 막아 턴을 낭비시키는 전략이 핵심이에요.',
    'Tip - 로비 실시간 채팅에서 접속 중인 모든 플레이어들과 자유롭게 대화를 나눠보세요.'
  ];

  let _roomTipTimer = null;
  let _lastTipIndex = -1;

  function _getNextRandomTip() {
    if (ROOM_TIPS.length <= 1) return ROOM_TIPS[0] || '';
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * ROOM_TIPS.length);
    } while (nextIdx === _lastTipIndex);
    _lastTipIndex = nextIdx;
    return ROOM_TIPS[nextIdx];
  }

  function _updateRoomTip(animate = true) {
    const tipEl = $('room-tip-text');
    if (!tipEl) return;
    const newTip = _getNextRandomTip();
    if (!animate) {
      tipEl.textContent = newTip;
      tipEl.classList.remove('fade-out');
      return;
    }
    tipEl.classList.add('fade-out');
    setTimeout(() => {
      tipEl.textContent = newTip;
      tipEl.classList.remove('fade-out');
    }, 350);
  }

  function _startRoomTipRotation() {
    _stopRoomTipRotation();
    _updateRoomTip(false);
    _roomTipTimer = setInterval(() => {
      _updateRoomTip(true);
    }, 10000);
  }

  function _stopRoomTipRotation() {
    if (_roomTipTimer) {
      clearInterval(_roomTipTimer);
      _roomTipTimer = null;
    }
  }

  function showScreen(name, pushState = true) {
    const t = screens[name];
    if (!t) return;
    if (t.classList.contains('active')) {
      if (name === 'home') _updateHomeUserBar();
      if (name === 'room') {
        _startRoomTipRotation();
        if (typeof _scrollRoomChatToBottom === 'function') _scrollRoomChatToBottom();
      }
      return;
    }

    if (pushState) {
      if (name === 'home') {
        _pushHistory({ screen: 'home' });
      } else {
        _pushHistory({ screen: name }, '#' + name);
      }
    }

    Object.values(screens).forEach(s => s && s.classList.remove('active'));
    t.classList.add('active');
    try { window.scrollTo(0, 0); } catch (e) {}

    if (name === 'home') {
      _updateHomeUserBar();
      _stopRoomTipRotation();
    } else if (name === 'room') {
      _startRoomTipRotation();
      if (typeof _scrollRoomChatToBottom === 'function') _scrollRoomChatToBottom();
    } else {
      _stopRoomTipRotation();
    }
  }

  /* ── 로딩 오버레이 & 토스트 ── */
  let _isJoinCancelled = false;

  function showLoading(text = '처리 중...') {
    $('loading-text').textContent = text;
    $('overlay-loading').classList.remove('hidden');
  }
  function hideLoading() {
    $('overlay-loading').classList.add('hidden');
  }

  // 방 접속 중 취소 버튼
  if ($('btn-cancel-loading')) {
    $('btn-cancel-loading').addEventListener('click', () => {
      _cancelPendingConnection();
    });
  }

  function _cancelPendingConnection() {
    _isJoinCancelled = true;
    try {
      P2P.destroy();
    } catch (_) {}
    hideLoading();
    if ($('btn-join-room')) $('btn-join-room').disabled = false;
    currentRoomCode = '';
    showToast('방 접속이 취소되었습니다.', 'info');
    showScreen('home');
  }

  let _toastTimer = null;
  function showToast(msg, type = '') {
    const el = $('toast');
    el.textContent = msg;
    el.className = 'toast ' + type;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
  }

  /* ── 인게임 좌측 미니 알림 ── */
  function _showInGameAlert(msg) {
    const container = $('gsp-alert-container');
    if (!container) return;
    const alertEl = document.createElement('div');
    alertEl.className = 'gsp-alert-item';
    alertEl.innerHTML = `<i class="fa-solid fa-arrow-right-from-bracket"></i> <span>${_escapeHtml(msg)}</span>`;
    container.appendChild(alertEl);

    setTimeout(() => {
      alertEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      alertEl.style.opacity = '0';
      alertEl.style.transform = 'translateY(-6px)';
      setTimeout(() => {
        if (alertEl.parentNode) alertEl.parentNode.removeChild(alertEl);
      }, 300);
    }, 3800);
  }

  /* ── 화면 테마 (다크/라이트 모드) 시스템 ── */
  let currentTheme = localStorage.getItem('kr_arcade_theme') || 'light';

  function _applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('kr_arcade_theme', theme);
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
    }

    const btnLight = $('btn-theme-light');
    const btnDark = $('btn-theme-dark');
    if (btnLight && btnDark) {
      if (theme === 'dark') {
        btnLight.classList.remove('active');
        btnDark.classList.add('active');
      } else {
        btnLight.classList.add('active');
        btnDark.classList.remove('active');
      }
    }
  }

  function _initTheme() {
    _applyTheme(currentTheme);
    const btnLight = $('btn-theme-light');
    const btnDark = $('btn-theme-dark');
    if (btnLight) {
      btnLight.addEventListener('click', () => {
        _applyTheme('light');
        if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();
      });
    }
    if (btnDark) {
      btnDark.addEventListener('click', () => {
        _applyTheme('dark');
        if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();
      });
    }
  }

  /* ── ⚙️ 환경 설정 대개편 시스템 (v1.0.0 — 5개 탭 & 버그 제보 DB) ── */
  function _applyGlobalSettings() {
    const fontScale = localStorage.getItem('arcade_font_scale') || 'normal';
    document.documentElement.classList.toggle('large-text-scale', fontScale === 'large');

    const animEnabled = localStorage.getItem('arcade_anim_enabled') !== 'false';
    document.documentElement.classList.toggle('reduce-motion', !animEnabled);
  }

  function _syncSettingsUI() {
    const isBgmMuted = Sound.isBgmMuted();
    const isSfxMuted = Sound.isSfxMuted();
    const bgmVol = Math.round(Sound.getBgmVolume() * 100);
    const sfxVol = Math.round(Sound.getSfxVolume() * 100);

    _applyTheme(currentTheme);

    if ($('slider-bgm-vol')) $('slider-bgm-vol').value = bgmVol;
    if ($('slider-sfx-vol')) $('slider-sfx-vol').value = sfxVol;
    if ($('text-bgm-vol')) $('text-bgm-vol').textContent = `${bgmVol}%`;
    if ($('text-sfx-vol')) $('text-sfx-vol').textContent = `${sfxVol}%`;

    // [화면 탭] 옵션 복원
    if ($('chk-anim-enabled')) {
      $('chk-anim-enabled').checked = (localStorage.getItem('arcade_anim_enabled') !== 'false');
    }
    if ($('chk-shake-enabled')) {
      $('chk-shake-enabled').checked = (localStorage.getItem('arcade_shake_enabled') !== 'false');
    }
    if ($('select-font-scale')) {
      $('select-font-scale').value = localStorage.getItem('arcade_font_scale') || 'normal';
    }

    // [게임 편의 탭] 옵션 복원
    if ($('chk-auto-ready')) {
      $('chk-auto-ready').checked = (localStorage.getItem('arcade_auto_ready') === 'true');
    }
    if ($('chk-dnd-mode')) {
      $('chk-dnd-mode').checked = (localStorage.getItem('arcade_dnd_mode') === 'true');
    }
    if ($('chk-show-emojis')) {
      $('chk-show-emojis').checked = (localStorage.getItem('arcade_show_emojis') !== 'false');
    }
    if ($('chk-chat-notify')) {
      $('chk-chat-notify').checked = (localStorage.getItem('arcade_chat_notify') !== 'false');
    }

    _updateSettingsMuteButtons(isBgmMuted, isSfxMuted);
  }

  function _openSettingsModal() {
    _pushHistory({ modal: 'settings' }, '#settings');
    _syncSettingsUI();

    if ($('overlay-settings')) $('overlay-settings').classList.remove('hidden');
  }

  function _closeSettingsModal() {
    // 설정값 로컬 저장
    if ($('chk-auto-ready')) {
      localStorage.setItem('arcade_auto_ready', $('chk-auto-ready').checked ? 'true' : 'false');
    }
    if ($('chk-anim-enabled')) {
      localStorage.setItem('arcade_anim_enabled', $('chk-anim-enabled').checked ? 'true' : 'false');
    }
    if ($('chk-shake-enabled')) {
      localStorage.setItem('arcade_shake_enabled', $('chk-shake-enabled').checked ? 'true' : 'false');
    }
    if ($('select-font-scale')) {
      localStorage.setItem('arcade_font_scale', $('select-font-scale').value);
    }
    if ($('chk-dnd-mode')) {
      localStorage.setItem('arcade_dnd_mode', $('chk-dnd-mode').checked ? 'true' : 'false');
    }
    if ($('chk-show-emojis')) {
      localStorage.setItem('arcade_show_emojis', $('chk-show-emojis').checked ? 'true' : 'false');
    }
    if ($('chk-chat-notify')) {
      localStorage.setItem('arcade_chat_notify', $('chk-chat-notify').checked ? 'true' : 'false');
    }

    _applyGlobalSettings();

    // 모달 즉시 닫기
    if ($('overlay-settings')) $('overlay-settings').classList.add('hidden');
    _backHistoryIfModal('settings');
  }

  function _updateSettingsMuteButtons(isBgmMuted, isSfxMuted) {
    const bgmBtn = $('btn-toggle-bgm-mute');
    const sfxBtn = $('btn-toggle-sfx-mute');
    if (bgmBtn) {
      bgmBtn.innerHTML = isBgmMuted
        ? '<i class="fa-solid fa-volume-xmark" style="color:var(--coral);"></i>'
        : '<i class="fa-solid fa-volume-high" style="color:var(--sky);"></i>';
    }
    if (sfxBtn) {
      sfxBtn.innerHTML = isSfxMuted
        ? '<i class="fa-solid fa-volume-xmark" style="color:var(--coral);"></i>'
        : '<i class="fa-solid fa-volume-high" style="color:var(--green);"></i>';
    }

    const masterMuteStatus = $('text-master-mute-status');
    const masterMuteBtn = $('btn-master-mute-toggle');
    const allMuted = (isBgmMuted && isSfxMuted);
    if (masterMuteStatus) {
      masterMuteStatus.textContent = allMuted ? '소리 꺼짐 (음소거)' : '소리 켜짐';
    }
    if (masterMuteBtn) {
      masterMuteBtn.innerHTML = allMuted
        ? '<i class="fa-solid fa-volume-xmark" style="color:var(--coral); margin-right:4px;"></i> <span>소리 켜기</span>'
        : '<i class="fa-solid fa-volume-high" style="color:var(--green); margin-right:4px;"></i> <span>전체 끄기</span>';
    }

    const mainSoundIcon = $('sound-icon');
    const soundStatusText = $('sound-status-text');
    if (mainSoundIcon) {
      mainSoundIcon.className = allMuted
        ? 'fa-solid fa-volume-xmark'
        : 'fa-solid fa-volume-high';
    }
    if (soundStatusText) {
      soundStatusText.textContent = allMuted ? '소리 꺼짐' : '소리 설정';
    }
  }

  // ── 환경 설정 탭 전환 핸들러 ──
  function _initSettingsTabs() {
    const tabBtns = document.querySelectorAll('.settings-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        if (!targetTab) return;

        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.settings-tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });

        const targetPane = $(`pane-settings-${targetTab}`);
        if (targetPane) targetPane.classList.add('active');

        if (typeof Sound !== 'undefined' && Sound.playClick) Sound.playClick();
      });
    });
  }

  // ── 버그 문의 폼 실시간 접수 핸들러 ──
  function _initBugReportForm() {
    const bugContent = $('bug-content');
    const charCount = $('bug-char-count');
    if (bugContent && charCount) {
      bugContent.addEventListener('input', () => {
        const len = bugContent.value.length;
        charCount.textContent = `${len} / 500자`;
      });
    }

    const submitBtn = $('btn-submit-bug');
    const form = $('form-bug-report');

    async function doSubmit() {
      const titleEl = $('bug-title');
      const contentEl = $('bug-content');
      const typeEl = $('bug-type');
      const gameEl = $('bug-game');

      if (!titleEl || !contentEl) return;
      const title = titleEl.value.trim();
      const content = contentEl.value.trim();

      if (title.length < 2) {
        showToast('문의 제목을 2자 이상 입력해주세요.', 'warn');
        titleEl.focus();
        return;
      }
      if (content.length < 5) {
        showToast('상세 내용을 5자 이상 작성해주세요.', 'warn');
        contentEl.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>접수 중...</span>';
      }

      try {
        const reportData = {
          userId: myPeerId || '',
          userNickname: myNickname || '익명',
          type: typeEl ? typeEl.value : 'bug',
          game: gameEl ? gameEl.value : 'all',
          title: title,
          content: content,
          deviceInfo: `${navigator.platform || ''} / ${navigator.userAgent || ''} (${window.innerWidth}x${window.innerHeight})`
        };

        let res = null;
        if (typeof FirebaseLobby !== 'undefined' && typeof FirebaseLobby.submitBugReport === 'function') {
          res = await FirebaseLobby.submitBugReport(reportData);
        } else {
          // Firebase가 준비되지 않은 경우 로컬 스토리지에 백업
          try {
            const raw = localStorage.getItem('arcade_saved_inquiries') || '[]';
            const list = JSON.parse(raw);
            list.push({ ...reportData, savedAt: Date.now() });
            localStorage.setItem('arcade_saved_inquiries', JSON.stringify(list));
          } catch (_) {}
          res = { success: true };
        }

        if (res && res.success) {
          showToast('문의가 정상적으로 접수되었습니다. 소중한 의견 감사합니다!', 'success');
          if (typeof Sound !== 'undefined' && Sound.playWordSubmit) Sound.playWordSubmit();
          titleEl.value = '';
          contentEl.value = '';
          if (charCount) charCount.textContent = '0 / 500자';
        } else {
          // 전송 실패 시에도 사용자 입력 내용이 유실되지 않도록 로컬 백업 후 안내
          try {
            const raw = localStorage.getItem('arcade_saved_inquiries') || '[]';
            const list = JSON.parse(raw);
            list.push({ ...reportData, savedAt: Date.now() });
            localStorage.setItem('arcade_saved_inquiries', JSON.stringify(list));
            showToast('문의가 안전하게 접수되었습니다. (네트워크 지연으로 임시 보관됨)', 'success');
            titleEl.value = '';
            contentEl.value = '';
            if (charCount) charCount.textContent = '0 / 500자';
          } catch (_) {
            showToast(res?.message || '접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'warn');
          }
        }
      } catch (err) {
        console.error('[Inquiry] 접수 처리 중 오류:', err);
        try {
          const raw = localStorage.getItem('arcade_saved_inquiries') || '[]';
          const list = JSON.parse(raw);
          list.push({
            userId: myPeerId || '',
            userNickname: myNickname || '익명',
            type: typeEl ? typeEl.value : 'bug',
            game: gameEl ? gameEl.value : 'all',
            title: title,
            content: content,
            savedAt: Date.now()
          });
          localStorage.setItem('arcade_saved_inquiries', JSON.stringify(list));
          showToast('문의가 안전하게 접수되었습니다. 감사합니다!', 'success');
          titleEl.value = '';
          contentEl.value = '';
          if (charCount) charCount.textContent = '0 / 500자';
        } catch (_) {
          showToast('일시적인 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'warn');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>문의 접수</span>';
        }
      }
    }

    if (submitBtn) submitBtn.addEventListener('click', doSubmit);
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); doSubmit(); });
  }

  // ── 환경 설정 초기화 핸들러 ──
  function _initSettingsReset() {
    const resetBtn = $('btn-reset-settings');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        showConfirmModal('환경 설정을 기본값으로 초기화하시겠습니까?', () => {
          localStorage.removeItem('arcade_auto_ready');
          localStorage.removeItem('arcade_anim_enabled');
          localStorage.removeItem('arcade_shake_enabled');
          localStorage.removeItem('arcade_font_scale');
          localStorage.removeItem('arcade_dnd_mode');
          localStorage.removeItem('arcade_show_emojis');
          localStorage.removeItem('arcade_chat_notify');

          Sound.setBgmVolume(0.35);
          Sound.setSfxVolume(0.70);
          if (Sound.isBgmMuted()) Sound.toggleBgmMute();
          if (Sound.isSfxMuted()) Sound.toggleSfxMute();

          _applyGlobalSettings();
          _syncSettingsUI();
          showToast('환경 설정이 기본값으로 초기화되었습니다.', 'success');
        });
      });
    }

    // 마스터 음소거 토글
    const masterBtn = $('btn-master-mute-toggle');
    if (masterBtn) {
      masterBtn.addEventListener('click', () => {
        const bothMuted = Sound.isBgmMuted() && Sound.isSfxMuted();
        if (bothMuted) {
          if (Sound.isBgmMuted()) Sound.toggleBgmMute();
          if (Sound.isSfxMuted()) Sound.toggleSfxMute();
          showToast('모든 사운드가 켜졌습니다.', 'info');
        } else {
          if (!Sound.isBgmMuted()) Sound.toggleBgmMute();
          if (!Sound.isSfxMuted()) Sound.toggleSfxMute();
          showToast('모든 사운드가 음소거되었습니다.', 'info');
        }
        _updateSettingsMuteButtons(Sound.isBgmMuted(), Sound.isSfxMuted());
      });
    }

    // 사운드 테스트 청취
    const testSoundBtn = $('btn-test-sound');
    if (testSoundBtn) {
      testSoundBtn.addEventListener('click', () => {
        if (Sound.isSfxMuted()) {
          showToast('효과음이 음소거되어 있습니다. 음소거를 해제해주세요.', 'warn');
        } else {
          Sound.playClick();
          showToast('효과음 테스트 재생 완료', 'info');
        }
      });
    }

    // 폰트 스케일 즉시 반영
    const fontScaleSelect = $('select-font-scale');
    if (fontScaleSelect) {
      fontScaleSelect.addEventListener('change', () => {
        localStorage.setItem('arcade_font_scale', fontScaleSelect.value);
        _applyGlobalSettings();
      });
    }

    // 애니메이션 토글 즉시 반영
    const animToggle = $('chk-anim-enabled');
    if (animToggle) {
      animToggle.addEventListener('change', () => {
        localStorage.setItem('arcade_anim_enabled', animToggle.checked ? 'true' : 'false');
        _applyGlobalSettings();
      });
    }
  }

  // 설정 열기 버튼들
  if ($('btn-open-settings')) $('btn-open-settings').addEventListener('click', _openSettingsModal);
  if ($('btn-marketplace')) {
    $('btn-marketplace').addEventListener('click', () => {
      _toggleLobbyShop();
    });
  }
  if ($('btn-close-shop')) {
    $('btn-close-shop').addEventListener('click', () => {
      _toggleLobbyShop(false);
    });
  }
  if ($('btn-toggle-sound')) $('btn-toggle-sound').addEventListener('click', _openSettingsModal);
  if ($('btn-room-settings')) $('btn-room-settings').addEventListener('click', _openSettingsModal);
  if ($('btn-game-settings')) $('btn-game-settings').addEventListener('click', _openSettingsModal);
  if ($('btn-close-settings')) $('btn-close-settings').addEventListener('click', _closeSettingsModal);
  if ($('btn-confirm-settings')) $('btn-confirm-settings').addEventListener('click', _closeSettingsModal);

  // 모달 바깥 배경 터치 닫기
  if ($('overlay-settings')) {
    $('overlay-settings').addEventListener('click', (e) => {
      if (e.target === $('overlay-settings')) _closeSettingsModal();
    });
  }

  // BGM 슬라이더 스와이프 조절
  if ($('slider-bgm-vol')) {
    $('slider-bgm-vol').addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if ($('text-bgm-vol')) $('text-bgm-vol').textContent = `${val}%`;
      Sound.setBgmVolume(val / 100);
      _updateSettingsMuteButtons(Sound.isBgmMuted(), Sound.isSfxMuted());
    });
  }

  // SFX 슬라이더 스와이프 조절
  if ($('slider-sfx-vol')) {
    let sfxDebounce = null;
    $('slider-sfx-vol').addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if ($('text-sfx-vol')) $('text-sfx-vol').textContent = `${val}%`;
      Sound.setSfxVolume(val / 100);
      _updateSettingsMuteButtons(Sound.isBgmMuted(), Sound.isSfxMuted());

      clearTimeout(sfxDebounce);
      sfxDebounce = setTimeout(() => Sound.playClick(), 80);
    });
  }

  // BGM 음소거 토글
  if ($('btn-toggle-bgm-mute')) {
    $('btn-toggle-bgm-mute').addEventListener('click', () => {
      const isMuted = Sound.toggleBgmMute();
      _updateSettingsMuteButtons(isMuted, Sound.isSfxMuted());
      showToast(isMuted ? '배경음악이 음소거되었습니다.' : '배경음악이 켜졌습니다.', 'info');
    });
  }

  // SFX 음소거 토글
  if ($('btn-toggle-sfx-mute')) {
    $('btn-toggle-sfx-mute').addEventListener('click', () => {
      const isMuted = Sound.toggleSfxMute();
      _updateSettingsMuteButtons(Sound.isBgmMuted(), isMuted);
      showToast(isMuted ? '효과음이 음소거되었습니다.' : '효과음이 켜졌습니다.', 'info');
      if (!isMuted) Sound.playClick();
    });
  }

  _initSettingsTabs();
  _initBugReportForm();
  _initSettingsReset();
  _applyGlobalSettings();

  // 전역 버튼 클릭 효과음 자동 연동
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, .btn, .sidebar-game-item, .room-game-btn, .baskin-pick-btn');
    if (btn && !btn.disabled && !btn.id?.includes('toggle') && !btn.id?.includes('ready') && !btn.id?.includes('settings')) {
      Sound.playClick();
    }
  }, true);

  /* =====================================================================
     1. 홈 화면: 유저 프로필, 사이드바 & 미리보기 연동
     ===================================================================== */
  function _updateCoinsUI() {
    const isLoggedIn = typeof AppSupabase !== 'undefined' && !!AppSupabase.getCurrentUser();
    const profileAmountEl = $('profile-coin-amount');
    if (profileAmountEl) {
      profileAmountEl.textContent = isLoggedIn ? myCoins.toLocaleString() : '0';
    }
  }

  // 🌟 레벨별 필요 경험치 계산 공식 (1 ~ 300 레벨)
  function _getRequiredExpForNextLevel(lvl) {
    const l = Number(lvl) || 1;
    if (l >= MAX_LEVEL) return 0; // 최고 레벨 도달 시 0
    return Math.floor(60 + (l - 1) * 20 + Math.pow(l - 1, 1.45) * 6);
  }

  // 🌟 레벨 구간별 티어 CSS 클래스 (브론즈, 실버, 골드, 플래티넘, 다이아몬드, 마스터, 300 만렙 무지개)
  function _getLevelTierClass(lvl) {
    const l = Number(lvl) || 1;
    if (l >= 300) return 'tier-rainbow'; // 🌟 300 만렙: 무지개
    if (l <= 30) return 'tier-bronze';
    if (l <= 70) return 'tier-silver';
    if (l <= 120) return 'tier-gold';
    if (l <= 180) return 'tier-platinum';
    if (l <= 240) return 'tier-diamond';
    return 'tier-master'; // 241 ~ 299: 마스터
  }

  // 🌟 로비 및 프로필 팝업 레벨 UI 동기화
  function _updateLevelUI() {
    const tierClass = _getLevelTierClass(myLevel);
    const reqExp = _getRequiredExpForNextLevel(myLevel);
    const isMax = myLevel >= MAX_LEVEL;
    const pct = isMax ? 100 : (reqExp > 0 ? Math.min(100, Math.max(0, Math.floor((myExp / reqExp) * 100))) : 0);

    // 1. 로비 상단바 레벨 뱃지 & 미니 게이지
    const homeLevelEl = $('home-user-level');
    if (homeLevelEl) {
      homeLevelEl.textContent = `${myLevel}`;
      homeLevelEl.className = `user-level-badge ${tierClass}`;
    }
    const homeExpFill = $('home-user-exp-fill');
    if (homeExpFill) {
      homeExpFill.style.width = `${pct}%`;
    }
    const homeExpTrack = $('home-user-exp-track');
    if (homeExpTrack) {
      homeExpTrack.title = isMax
        ? `최고 레벨 (Lv.${MAX_LEVEL} MAX)`
        : `Lv.${myLevel} 경험치: ${myExp.toLocaleString()} / ${reqExp.toLocaleString()} EXP (${pct}%)`;
    }

    // 2. 프로필 편집 말풍선 팝업 레벨 뱃지
    const profileTag = $('profile-level-tag');
    if (profileTag) {
      profileTag.textContent = `${myLevel}`;
      profileTag.className = `profile-mini-level ${tierClass}`;
    }
    const profileExpText = $('profile-exp-text');
    if (profileExpText) {
      profileExpText.textContent = isMax
        ? `MAX (${MAX_LEVEL})`
        : `${myExp.toLocaleString()} / ${reqExp.toLocaleString()} EXP`;
    }
    const profileExpFill = $('profile-exp-fill');
    if (profileExpFill) {
      profileExpFill.style.width = `${pct}%`;
    }
  }

  // 🌟 경험치 획득 및 레벨업 처리 (로컬스토리지, Supabase 및 대기방 P2P 동기화)
  function _addExperience(expGain) {
    const gain = Number(expGain) || 0;
    if (gain <= 0) {
      return {
        oldLevel: myLevel,
        newLevel: myLevel,
        gained: 0,
        leveledUp: false,
        currentExp: myExp,
        reqExp: _getRequiredExpForNextLevel(myLevel)
      };
    }

    const oldLevel = myLevel;
    if (myLevel < MAX_LEVEL) {
      myExp += gain;
      while (myLevel < MAX_LEVEL) {
        const req = _getRequiredExpForNextLevel(myLevel);
        if (myExp >= req) {
          myExp -= req;
          myLevel++;
        } else {
          break;
        }
      }
      if (myLevel >= MAX_LEVEL) {
        myExp = 0;
      }
    } else {
      myExp = 0;
    }

    const leveledUp = myLevel > oldLevel;

    localStorage.setItem('arcade_user_level', String(myLevel));
    localStorage.setItem('arcade_user_exp', String(myExp));
    _updateLevelUI();

    // Supabase 로그인 상태라면 클라우드 DB에 비동기 저장
    if (typeof AppSupabase !== 'undefined') {
      const user = AppSupabase.getCurrentUser();
      if (user && typeof AppSupabase.saveLevelAndExp === 'function') {
        AppSupabase.saveLevelAndExp(user.id, myLevel, myExp).catch(() => {});
      }
    }

    // P2P 룸 내 본인 객체 갱신 및 전파
    const myId = P2P.getMyId();
    const me = roomPlayers.find(p => p.id === myId || (p.isHost && isHostPlayer));
    if (me) {
      me.level = myLevel;
      me.exp = myExp;
      _updateRoomUI();
      if (isHostPlayer) {
        _broadcastRoomState();
      } else {
        P2P.send({
          type: 'guest_update_profile',
          name: myNickname,
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          exp: myExp,
          stats: _getMyStats()
        });
      }
    }

    return {
      oldLevel,
      newLevel: myLevel,
      gained: gain,
      leveledUp,
      currentExp: myExp,
      reqExp: _getRequiredExpForNextLevel(myLevel)
    };
  }

  // 🌟 게임별 진취도 및 승패에 따른 경험치 산출
  function _calcGameProgressionExp(gameKey, resultType, contextInfo = {}) {
    // 1. 기본 완주 경험치
    const baseExp = 30;

    // 2. 승패 보너스 (승리 50, 무승부 30, 패배 15)
    let outcomeExp = 15;
    if (resultType === 'win') {
      outcomeExp = 50;
    } else if (resultType === 'draw') {
      outcomeExp = 30;
    }

    // 3. 게임별 진취도 보너스 (5 ~ 35 EXP)
    let progressBonus = 15;
    if (gameKey === 'catchmind') {
      progressBonus = 25;
    } else if (gameKey === 'wordchain') {
      progressBonus = 20;
    } else if (gameKey === 'roulette') {
      progressBonus = 18;
    } else if (gameKey === 'gomoku' || gameKey === 'chess' || gameKey === 'janggi') {
      progressBonus = 22;
    } else if (gameKey === 'othello' || gameKey === 'connect4') {
      progressBonus = 18;
    } else if (gameKey === 'minesweeper' || gameKey === 'apple') {
      progressBonus = 20;
    }
    return baseExp + outcomeExp + progressBonus;
  }

  function _updateHomeUserBar() {
    const userBar = document.querySelector('.home-user-bar');
    if (userBar) _applyProfileCardTheme(userBar, myProfileCard);

    const avatarEl = $('home-user-avatar');
    if (avatarEl) {
      avatarEl.innerHTML = `<i class="${myAvatarIcon || 'fa-solid fa-paw'}"></i>`;
      avatarEl.style.background = myAvatarColor || '#38a169';
      if (typeof _applyAvatarFrame === 'function') _applyAvatarFrame(avatarEl, myAvatarFrame);
    }
    const nameEl = $('home-user-name');
    if (nameEl) {
      nameEl.textContent = myNickname || '익명';
      if (myNicknameColor === 'rainbow') {
        nameEl.classList.add('nickname-rainbow');
        nameEl.style.color = '';
        nameEl.style.fontWeight = '900';
      } else {
        nameEl.classList.remove('nickname-rainbow');
        nameEl.style.color = myNicknameColor || '';
        nameEl.style.fontWeight = myNicknameColor ? '800' : '';
      }
    }
    _updateCoinsUI();
    _updateLevelUI();
    if (typeof _syncOnlinePresence === 'function') _syncOnlinePresence();
  }

  /* ═══════════════════════════════════════════════════════════════
     🛒 상점 컨트롤러 (닉네임 색상 염색약 / 프로필 카드 탭 & 구매/장착)
  ═══════════════════════════════════════════════════════════════ */
  let _isShopActive = false;
  let _currentShopTab = 'nickname'; // 'nickname' | 'profile_card'

  function _toggleLobbyShop(forceState) {
    _isShopActive = (typeof forceState === 'boolean') ? forceState : !_isShopActive;
    const roomCard = $('lobby-room-card');
    const shopCard = $('lobby-shop-card');
    const btn = $('btn-marketplace') || $('btn-toggle-shop');

    if (_isShopActive) {
      if (roomCard) roomCard.classList.add('hidden');
      if (shopCard) shopCard.classList.remove('hidden');
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-layer-group"></i>';
        btn.title = '방 목록으로 돌아가기';
        btn.classList.add('active');
      }
      _initShopTabs();
      _renderShopUI();
    } else {
      if (roomCard) roomCard.classList.remove('hidden');
      if (shopCard) shopCard.classList.add('hidden');
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-store"></i>';
        btn.title = '상점 열기';
        btn.classList.remove('active');
      }
    }
  }

  let _shopTabsInitialized = false;
  let _isShopActionProcessing = false;

  function _handleShopActionClick(btn) {
    if (!btn || btn.disabled || btn.classList.contains('is-equipped')) return;
    if (_isShopActionProcessing) return;
    _isShopActionProcessing = true;
    setTimeout(() => { _isShopActionProcessing = false; }, 200);

    const type = btn.dataset.shopType;
    const itemId = btn.dataset.itemId;
    if (!type || !itemId) return;

    if (type === 'chat_bubble') {
      const item = SHOP_CHAT_BUBBLES.find(b => b.id === itemId);
      if (!item) return;
      if (item.isDefault || myPurchasedChatBubbles.includes(item.id)) {
        _handleEquipChatBubble(item);
      } else {
        _handleBuyChatBubble(item);
      }
    } else if (type === 'avatar_frame') {
      const item = SHOP_AVATAR_FRAMES.find(f => f.id === itemId);
      if (!item) return;
      if (item.isDefault || myPurchasedAvatarFrames.includes(item.id)) {
        _handleEquipAvatarFrame(item);
      } else {
        _handleBuyAvatarFrame(item);
      }
    } else if (type === 'victory_effect') {
      const item = SHOP_VICTORY_EFFECTS.find(f => f.id === itemId);
      if (!item) return;
      if (item.isDefault || myPurchasedVictoryEffects.includes(item.id)) {
        _handleEquipVictoryEffect(item);
      } else {
        _handleBuyVictoryEffect(item);
      }
    } else if (type === 'profile_card') {
      const item = SHOP_PROFILE_CARDS.find(c => c.id === itemId);
      if (!item) return;
      if (item.isDefault) {
        _handleResetProfileCard();
      } else if (myPurchasedProfileCards.includes(item.id)) {
        _handleEquipProfileCard(item);
      } else {
        _handleBuyProfileCard(item);
      }
    } else if (type === 'nickname') {
      const item = SHOP_NICKNAME_COLORS.find(c => c.id === itemId);
      if (!item) return;
      if (item.isDefault) {
        _handleResetNicknameColor();
      } else if (myPurchasedNameColors.includes(item.id)) {
        _handleEquipNicknameColor(item);
      } else {
        _handleBuyNicknameColor(item);
      }
    }
  }

  function _handleFxPreviewClick(pBtn) {
    if (!pBtn) return;
    const effectKey = pBtn.dataset.effect;
    if (typeof window._previewVictoryEffect === 'function') {
      window._previewVictoryEffect(effectKey);
      const card = pBtn.closest('.shop-item-card');
      const name = card ? card.querySelector('.shop-item-name').textContent.trim() : '';
      showToast(`[${name}] 연출 시연 중...`, 'info');
    }
  }

  function _initShopTabs() {
    if (_shopTabsInitialized) return;
    _shopTabsInitialized = true;

    const allTabDefs = [
      { id: 'tab-shop-nickname',       key: 'nickname' },
      { id: 'tab-shop-profile-card',   key: 'profile_card' },
      { id: 'tab-shop-chat-bubble',    key: 'chat_bubble' },
      { id: 'tab-shop-avatar-frame',   key: 'avatar_frame' },
      { id: 'tab-shop-victory-effect', key: 'victory_effect' }
    ];

    allTabDefs.forEach(({ id, key }) => {
      const el = $(id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          if (_currentShopTab !== key) {
            _currentShopTab = key;
            _renderShopUI();
          }
        });
      }
    });

    // 🌟 상점 그리드 단일 이벤트 위임 (Event Delegation)
    // 개별 버튼 리스너 바인딩 대신 그리드 전체에서 즉각 캐치하여 클릭 씹힘 및 누락 원천 해결
    const gridEl = $('shop-items-grid');
    if (gridEl && !gridEl._shopBound) {
      gridEl._shopBound = true;
      gridEl.addEventListener('click', (e) => {
        const fxBtn = e.target.closest('.btn-fx-preview-test');
        if (fxBtn) {
          e.preventDefault();
          e.stopPropagation();
          _handleFxPreviewClick(fxBtn);
          return;
        }

        const actionBtn = e.target.closest('.btn-shop-action');
        if (actionBtn) {
          e.preventDefault();
          e.stopPropagation();
          _handleShopActionClick(actionBtn);
          return;
        }
      });
    }
  }

  function _renderShopUI() {
    _initShopTabs();

    const balanceEl = $('shop-coin-balance');
    if (balanceEl) balanceEl.textContent = (myCoins || 0).toLocaleString();

    const allTabDefs = [
      { id: 'tab-shop-nickname',       key: 'nickname' },
      { id: 'tab-shop-profile-card',   key: 'profile_card' },
      { id: 'tab-shop-chat-bubble',    key: 'chat_bubble' },
      { id: 'tab-shop-avatar-frame',   key: 'avatar_frame' },
      { id: 'tab-shop-victory-effect', key: 'victory_effect' }
    ];
    allTabDefs.forEach(({ id, key }) => {
      const el = $(id);
      if (el) el.classList.toggle('active', _currentShopTab === key);
    });

    const gridEl = $('shop-items-grid');
    if (!gridEl) return;

    // ── 💬 말풍선 스킨 탭 ──
    if (_currentShopTab === 'chat_bubble') {
      gridEl.innerHTML = SHOP_CHAT_BUBBLES.map(item => {
        const isEquipped = item.isDefault ? (!myChatBubble || myChatBubble === 'default') : (myChatBubble === item.id);
        const isPurchased = item.isDefault || myPurchasedChatBubbles.includes(item.id);
        let actionBtnHtml = '';
        if (isEquipped) {
          actionBtnHtml = `<button type="button" class="btn-shop-action is-equipped" disabled><i class="fa-solid fa-check"></i> 착용 중</button>`;
        } else if (isPurchased) {
          actionBtnHtml = `<button type="button" class="btn-shop-action ${item.isDefault ? 'btn-default-reset' : 'btn-equip'}" data-shop-type="chat_bubble" data-item-id="${item.id}">${item.isDefault ? '기본 복원' : '착용하기'}</button>`;
        } else {
          const canBuy = myCoins >= item.price;
          actionBtnHtml = `<button type="button" class="btn-shop-action btn-buy ${canBuy ? '' : 'insufficient'}" data-shop-type="chat_bubble" data-item-id="${item.id}">구매</button>`;
        }
        return `
          <div class="shop-item-card ${isEquipped ? 'is-equipped' : ''}">
            <div class="shop-item-top">
              <span class="shop-item-name"><i class="${item.icon}"></i> ${_escapeHtml(item.name)}</span>
            </div>
            <div class="shop-bubble-preview">
              <div class="chat-bubble ${item.bubbleClass || ''}">안녕하세요!</div>
            </div>
            <div class="shop-item-desc">${_escapeHtml(item.desc || '')}</div>
            <div class="shop-item-bottom">
              <span class="shop-price-tag">
                ${item.isDefault ? '<span style="color:var(--t3);font-size:0.75rem;">기본 제공</span>' : `<i class="fa-solid fa-coins"></i> ${item.price} 코인`}
              </span>
              ${actionBtnHtml}
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    // ── 🖼️ 아바타 테두리 탭 ──
    if (_currentShopTab === 'avatar_frame') {
      gridEl.innerHTML = SHOP_AVATAR_FRAMES.map(item => {
        const isEquipped = item.isDefault ? (!myAvatarFrame || myAvatarFrame === 'default') : (myAvatarFrame === item.id);
        const isPurchased = item.isDefault || myPurchasedAvatarFrames.includes(item.id);
        let actionBtnHtml = '';
        if (isEquipped) {
          actionBtnHtml = `<button type="button" class="btn-shop-action is-equipped" disabled><i class="fa-solid fa-check"></i> 착용 중</button>`;
        } else if (isPurchased) {
          actionBtnHtml = `<button type="button" class="btn-shop-action ${item.isDefault ? 'btn-default-reset' : 'btn-equip'}" data-shop-type="avatar_frame" data-item-id="${item.id}">${item.isDefault ? '기본 복원' : '착용하기'}</button>`;
        } else {
          const canBuy = myCoins >= item.price;
          actionBtnHtml = `<button type="button" class="btn-shop-action btn-buy ${canBuy ? '' : 'insufficient'}" data-shop-type="avatar_frame" data-item-id="${item.id}">구매</button>`;
        }
        return `
          <div class="shop-item-card ${isEquipped ? 'is-equipped' : ''}">
            <div class="shop-item-top">
              <span class="shop-item-name"><i class="${item.icon}"></i> ${_escapeHtml(item.name)}</span>
            </div>
            <div class="shop-frame-preview">
              <div class="user-avatar ${item.frameClass || ''}" style="background:${myAvatarColor || '#38a169'};">
                <i class="${myAvatarIcon || 'fa-solid fa-paw'}"></i>
              </div>
            </div>
            <div class="shop-item-desc">${_escapeHtml(item.desc || '')}</div>
            <div class="shop-item-bottom">
              <span class="shop-price-tag">
                ${item.isDefault ? '<span style="color:var(--t3);font-size:0.75rem;">기본 제공</span>' : `<i class="fa-solid fa-coins"></i> ${item.price} 코인`}
              </span>
              ${actionBtnHtml}
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    // ── 🎆 승리 세레머니 탭 ──
    if (_currentShopTab === 'victory_effect') {
      gridEl.innerHTML = SHOP_VICTORY_EFFECTS.map(item => {
        const isEquipped = item.isDefault ? (!myVictoryEffect || myVictoryEffect === 'default') : (myVictoryEffect === item.id);
        const isPurchased = item.isDefault || myPurchasedVictoryEffects.includes(item.id);
        let actionBtnHtml = '';
        if (isEquipped) {
          actionBtnHtml = `<button type="button" class="btn-shop-action is-equipped" disabled><i class="fa-solid fa-check"></i> 착용 중</button>`;
        } else if (isPurchased) {
          actionBtnHtml = `<button type="button" class="btn-shop-action ${item.isDefault ? 'btn-default-reset' : 'btn-equip'}" data-shop-type="victory_effect" data-item-id="${item.id}">${item.isDefault ? '기본 복원' : '착용하기'}</button>`;
        } else {
          const canBuy = myCoins >= item.price;
          actionBtnHtml = `<button type="button" class="btn-shop-action btn-buy ${canBuy ? '' : 'insufficient'}" data-shop-type="victory_effect" data-item-id="${item.id}">구매</button>`;
        }
        return `
          <div class="shop-item-card ${isEquipped ? 'is-equipped' : ''}">
            <div class="shop-item-top">
              <span class="shop-item-name"><i class="${item.icon}"></i> ${_escapeHtml(item.name)}</span>
              <button type="button" class="btn-fx-preview-test" data-effect="${item.effectKey}" title="연출 미리보기">
                <i class="fa-solid fa-play"></i> 미리보기
              </button>
            </div>
            <div class="shop-fx-preview">
              <i class="${item.icon}" style="font-size:2.2rem;opacity:0.85;"></i>
            </div>
            <div class="shop-item-desc">${_escapeHtml(item.desc || '')}</div>
            <div class="shop-item-bottom">
              <span class="shop-price-tag">
                ${item.isDefault ? '<span style="color:var(--t3);font-size:0.75rem;">기본 제공</span>' : `<i class="fa-solid fa-coins"></i> ${item.price} 코인`}
              </span>
              ${actionBtnHtml}
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    // ── 🎴 프로필 카드 탭 렌더링 ──
    if (_currentShopTab === 'profile_card') {
      gridEl.innerHTML = SHOP_PROFILE_CARDS.map(item => {
        const isEquipped = item.isDefault
          ? (!myProfileCard || myProfileCard === 'default')
          : (myProfileCard === item.id);
        const isPurchased = item.isDefault || myPurchasedProfileCards.includes(item.id);

        let actionBtnHtml = '';
        if (isEquipped) {
          actionBtnHtml = `<button type="button" class="btn-shop-action is-equipped" disabled><i class="fa-solid fa-check"></i> 착용 중</button>`;
        } else if (isPurchased) {
          actionBtnHtml = `<button type="button" class="btn-shop-action ${item.isDefault ? 'btn-default-reset' : 'btn-equip'}" data-shop-type="profile_card" data-item-id="${item.id}">${item.isDefault ? '기본 복원' : '착용하기'}</button>`;
        } else {
          const canBuy = myCoins >= item.price;
          actionBtnHtml = `<button type="button" class="btn-shop-action btn-buy ${canBuy ? '' : 'insufficient'}" data-shop-type="profile_card" data-item-id="${item.id}">구매</button>`;
        }

        const themeClass = (item.themeClass && item.themeClass !== 'default') ? item.themeClass : '';

        return `
          <div class="shop-item-card ${isEquipped ? 'is-equipped' : ''}">
            <div class="shop-item-top">
              <span class="shop-item-name"><i class="${item.icon}"></i> ${item.name}</span>
            </div>
            <!-- 실시간 미니 프리뷰 -->
            <div class="shop-card-preview ${themeClass}">
              <div class="shop-card-preview-avatar" style="background:${myAvatarColor || '#38a169'};">
                <i class="${myAvatarIcon || 'fa-solid fa-paw'}"></i>
              </div>
              <span class="shop-card-preview-name ${myNicknameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${myNicknameColor && myNicknameColor !== 'rainbow' ? `color:${myNicknameColor}; font-weight:800;` : ''}">
                ${_escapeHtml(myNickname || '플레이어')}
              </span>
            </div>
            <div class="shop-item-bottom">
              <span class="shop-price-tag">
                ${item.isDefault ? '<span style="color:var(--t3);font-size:0.75rem;">기본 제공</span>' : `<i class="fa-solid fa-coins"></i> ${item.price} 코인`}
              </span>
              ${actionBtnHtml}
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    // ── 🎨 닉네임 염색약 탭 렌더링 ──
    gridEl.innerHTML = SHOP_NICKNAME_COLORS.map(item => {
      const isEquipped = item.isDefault
        ? (!myNicknameColor || myNicknameColor === '')
        : (myNicknameColor === item.hex);
      const isPurchased = item.isDefault || myPurchasedNameColors.includes(item.id);

      const isRainbow = item.hex === 'rainbow';
      const previewStyle = isRainbow
        ? 'background: linear-gradient(90deg, #ff0055, #ff7700, #ffdd00, #00cc66, #0099ff, #aa00ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 900;'
        : (item.hex ? `color:${item.hex}; font-weight:800;` : 'color:inherit;');
      const iconColor = isRainbow ? '#ec4899' : (item.hex || 'var(--t2)');

      let actionBtnHtml = '';
      if (isEquipped) {
        actionBtnHtml = `<button type="button" class="btn-shop-action is-equipped" disabled><i class="fa-solid fa-check"></i> 착용 중</button>`;
      } else if (isPurchased) {
        actionBtnHtml = `<button type="button" class="btn-shop-action ${item.isDefault ? 'btn-default-reset' : 'btn-equip'}" data-shop-type="nickname" data-item-id="${item.id}">${item.isDefault ? '기본 복원' : '착용하기'}</button>`;
      } else {
        const canBuy = myCoins >= item.price;
        actionBtnHtml = `<button type="button" class="btn-shop-action btn-buy ${canBuy ? '' : 'insufficient'}" data-shop-type="nickname" data-item-id="${item.id}">구매</button>`;
      }

      return `
        <div class="shop-item-card ${isEquipped ? 'is-equipped' : ''}">
          <div class="shop-item-top">
            <span class="shop-item-name"><i class="${item.icon}" style="color:${iconColor};"></i> ${item.name}</span>
            <span class="shop-color-preview-text" style="${previewStyle}">
              ${_escapeHtml(myNickname || '플레이어')}
            </span>
          </div>
          <div class="shop-item-bottom">
            <span class="shop-price-tag">
              ${item.isDefault ? '<span style="color:var(--t3);font-size:0.75rem;">무료</span>' : `<i class="fa-solid fa-coins"></i> ${item.price} 코인`}
            </span>
            ${actionBtnHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  function _handleBuyNicknameColor(item) {
    if (myCoins < item.price) {
      showToast(`코인이 부족합니다! (필요: ${item.price} 코인 / 보유: ${myCoins} 코인)`, 'warn');
      return;
    }

    myCoins -= item.price;
    localStorage.setItem('arcade_user_coins', String(myCoins));

    if (!myPurchasedNameColors.includes(item.id)) {
      myPurchasedNameColors.push(item.id);
    }
    localStorage.setItem('arcade_purchased_name_colors', JSON.stringify(myPurchasedNameColors));

    myNicknameColor = item.hex;
    localStorage.setItem('arcade_name_color', myNicknameColor);

    _applyColorToAllUI();

    // Supabase 저장
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      const user = AppSupabase.getCurrentUser();
      AppSupabase.saveProfile(user.id, {
        coins: myCoins,
        nameColor: myNicknameColor,
        purchasedNameColors: myPurchasedNameColors
      }).catch(() => {});
    }

    _renderShopUI();
    showToast(`🎉 [${item.name}] 닉네임 색상을 구매하여 착용했습니다!`, 'success');
  }

  function _handleEquipNicknameColor(item) {
    myNicknameColor = item.hex;
    localStorage.setItem('arcade_name_color', myNicknameColor);

    _applyColorToAllUI();

    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      const user = AppSupabase.getCurrentUser();
      AppSupabase.saveProfile(user.id, {
        nameColor: myNicknameColor
      }).catch(() => {});
    }

    _renderShopUI();
    showToast(`[${item.name}] 닉네임 색상으로 변경되었습니다.`, 'info');
  }

  function _handleResetNicknameColor() {
    myNicknameColor = '';
    localStorage.removeItem('arcade_name_color');

    _applyColorToAllUI();

    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      const user = AppSupabase.getCurrentUser();
      AppSupabase.saveProfile(user.id, {
        nameColor: ''
      }).catch(() => {});
    }

    _renderShopUI();
    showToast('기본 닉네임 색상으로 복원되었습니다.', 'info');
  }

  function _applyColorToAllUI() {
    _updateCoinsUI();
    _updateHomeUserBar();
    _updateProfileModalPreview();

    // 방 내부 참가자 정보 갱신
    if (currentRoomCode && roomPlayers.length > 0) {
      const myId = P2P.getMyId();
      const me = roomPlayers.find(p => p.id === myId || (p.isHost && isHostPlayer));
      if (me) {
        me.nameColor = myNicknameColor || null;
      }
      _updateRoomUI();
      if (isHostPlayer) {
        _broadcastRoomState();
      } else {
        P2P.send({
          type: 'guest_update_profile',
          name: myNickname,
          nameColor: myNicknameColor || null,
          profileCard: myProfileCard || 'default',
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          exp: myExp,
          stats: _getMyStats()
        });
      }
    }

    if (typeof isRoomGameActive !== 'undefined' && isRoomGameActive) {
      _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);
    }

    if (typeof _syncOnlinePresence === 'function') _syncOnlinePresence();
  }

  /* ── 🎴 프로필 카드 구매, 장착 및 테마 적용 ── */
  function _applyProfileCardTheme(element, cardThemeId) {
    if (!element) return;
    element.classList.forEach(cls => {
      if (cls.startsWith('pcard-theme-')) {
        element.classList.remove(cls);
      }
    });
    const themeId = cardThemeId || 'default';
    if (themeId && themeId !== 'default') {
      element.classList.add(`pcard-theme-${themeId}`);
    }
  }

  /* ── 🖼️ 아바타 테두리 클래스 변환 및 테마 적용 ── */
  function _getAvatarFrameClass(frameId) {
    if (!frameId || frameId === 'default' || frameId === 'frame_default') return '';
    const item = SHOP_AVATAR_FRAMES.find(f => f.id === frameId);
    if (item && item.frameClass && item.frameClass !== 'frame-default') {
      return item.frameClass;
    }
    // fallback: 언더스코어(_)를 하이픈(-)으로 변환
    const normalized = String(frameId).replace(/^frame[_-]/, '').replace(/_/g, '-');
    return `frame-${normalized}`;
  }

  function _applyAvatarFrame(element, frameId) {
    if (!element) return;
    Array.from(element.classList).forEach(cls => {
      if (cls.startsWith('frame-') || cls.startsWith('frame_')) {
        element.classList.remove(cls);
      }
    });
    const cls = _getAvatarFrameClass(frameId);
    if (cls) {
      element.classList.add(cls);
    }
  }

  function _applyCosmeticsToAllUI() {
    _updateCoinsUI();
    _updateHomeUserBar();
    _updateProfileModalPreview();
    if (typeof _renderOnlineUsersList === 'function') _renderOnlineUsersList();

    // 방 내부 참가자 정보 갱신
    if (currentRoomCode && roomPlayers.length > 0) {
      const myId = P2P.getMyId();
      const me = roomPlayers.find(p => p.id === myId || (p.isHost && isHostPlayer));
      if (me) {
        me.nameColor = myNicknameColor || null;
        me.profileCard = myProfileCard || 'default';
        me.chatBubble = myChatBubble || 'default';
        me.avatarFrame = myAvatarFrame || 'default';
        me.victoryEffect = myVictoryEffect || 'default';
      }
      _updateRoomUI();
      if (isHostPlayer) {
        _broadcastRoomState();
      } else {
        P2P.send({
          type: 'guest_update_profile',
          name: myNickname,
          nameColor: myNicknameColor || null,
          profileCard: myProfileCard || 'default',
          chatBubble: myChatBubble || 'default',
          avatarFrame: myAvatarFrame || 'default',
          victoryEffect: myVictoryEffect || 'default',
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          exp: myExp,
          stats: _getMyStats()
        });
      }
    }

    if (typeof isRoomGameActive !== 'undefined' && isRoomGameActive) {
      _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);
    }

    if (isHostPlayer && currentRoomCode && window.FirebaseLobby && typeof window.FirebaseLobby.updateRoomHostProfile === 'function') {
      window.FirebaseLobby.updateRoomHostProfile(currentRoomCode, {
        hostProfileCard: myProfileCard,
        hostLevel: myLevel,
        hostNameColor: myNicknameColor || null
      });
    }

    if (typeof _renderOnlineUsersList === 'function' && typeof _lastOnlineUsers !== 'undefined' && Array.isArray(_lastOnlineUsers)) {
      _renderOnlineUsersList(_lastOnlineUsers);
    }

    if (typeof _syncOnlinePresence === 'function') _syncOnlinePresence();
  }

  /* ═══════════════════════════════════════════════════════════════
     🎆 승리 세레머니 파티클 캔버스 엔진 (6종 이펙트)
  ═══════════════════════════════════════════════════════════════ */
  let _victoryAnimId = null;
  let _victoryPreviewTimer = null;

  function _triggerVictoryEffect(effectKey = 'default') {
    _stopVictoryEffect();

    const canvas = $('victory-effects-canvas');
    if (!canvas) return;

    canvas.style.display = 'block';
    canvas.classList.remove('hidden');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);
    canvas._onResize = onResize;

    const particles = [];
    const fxType = (effectKey || 'default').replace(/^fx_/, '');

    // ── 1. 황금 코인 샤워 ──
    if (fxType === 'coin_shower') {
      const COIN_COUNT = 55;
      for (let i = 0; i < COIN_COUNT; i++) {
        particles.push({
          x: Math.random() * width,
          y: -20 - Math.random() * 400,
          vx: (Math.random() - 0.5) * 2.5,
          vy: 3 + Math.random() * 4.5,
          radius: 12 + Math.random() * 8,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.15,
          bounceCount: 0,
          maxBounces: 2 + Math.floor(Math.random() * 2)
        });
      }

      function drawCoin(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        const scaleX = Math.cos(p.rot);
        ctx.scale(scaleX, 1);

        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        const grad = ctx.createLinearGradient(-p.radius, -p.radius, p.radius, p.radius);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.5, '#eab308');
        grad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#a16207';
        ctx.stroke();

        if (Math.abs(scaleX) > 0.3) {
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 0.75, 0, Math.PI * 2);
          ctx.strokeStyle = '#fef9c3';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#78350f';
          ctx.font = `bold ${Math.floor(p.radius * 0.85)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('★', 0, 1);
        }
        ctx.restore();
      }

      function stepCoin() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vrot;
          p.vy += 0.15;

          if (p.y > height - p.radius - 10) {
            if (p.bounceCount < p.maxBounces) {
              p.y = height - p.radius - 10;
              p.vy = -p.vy * 0.45;
              p.vx *= 0.8;
              p.bounceCount++;
            }
          }
          drawCoin(p);
        });
        _victoryAnimId = requestAnimationFrame(stepCoin);
      }
      _victoryAnimId = requestAnimationFrame(stepCoin);
      return;
    }

    // ── 2. 8-Bit 도트 폭죽 ──
    if (fxType === 'pixel_fireworks') {
      const colors = ['#ff0055', '#00ffff', '#ffff00', '#00ff66', '#ff7700', '#b5179e', '#4cc9f0'];
      const bursts = [
        { cx: width * 0.3, cy: height * 0.35, delay: 0 },
        { cx: width * 0.7, cy: height * 0.3, delay: 25 },
        { cx: width * 0.5, cy: height * 0.45, delay: 50 },
        { cx: width * 0.25, cy: height * 0.5, delay: 80 },
        { cx: width * 0.75, cy: height * 0.48, delay: 100 }
      ];

      bursts.forEach(b => {
        const count = 45;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
          const speed = 2.5 + Math.random() * 5.5;
          particles.push({
            cx: b.cx,
            cy: b.cy,
            x: b.cx,
            y: b.cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 6 + Math.floor(Math.random() * 5),
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1,
            delay: b.delay,
            born: 0
          });
        }
      });

      let frameCount = 0;
      function stepPixel() {
        ctx.clearRect(0, 0, width, height);
        frameCount++;
        particles.forEach(p => {
          if (frameCount < p.delay) return;
          p.born++;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08;
          p.vx *= 0.98;
          p.alpha = Math.max(0, 1 - p.born / 90);

          if (p.alpha > 0) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
          }
        });
        ctx.globalAlpha = 1;
        _victoryAnimId = requestAnimationFrame(stepPixel);
      }
      _victoryAnimId = requestAnimationFrame(stepPixel);
      return;
    }

    // ── 3. 네온 스파크 ──
    if (fxType === 'neon_sparks') {
      const neonColors = ['#00f5d4', '#7b2cbf', '#f72585', '#4361ee', '#fee440'];
      const cx = width / 2;
      const cy = height / 2;

      const rings = [
        { r: 10, vr: 4, alpha: 1, color: '#00f5d4' },
        { r: 5, vr: 3.2, alpha: 1, color: '#f72585' }
      ];

      const SPARK_COUNT = 70;
      for (let i = 0; i < SPARK_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 8;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: neonColors[Math.floor(Math.random() * neonColors.length)],
          alpha: 1,
          decay: 0.012 + Math.random() * 0.015
        });
      }

      function stepNeon() {
        ctx.clearRect(0, 0, width, height);

        rings.forEach(ring => {
          ring.r += ring.vr;
          ring.alpha = Math.max(0, 1 - ring.r / (Math.min(width, height) * 0.6));
          if (ring.alpha > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
            ctx.strokeStyle = ring.color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 18;
            ctx.shadowColor = ring.color;
            ctx.globalAlpha = ring.alpha;
            ctx.stroke();
            ctx.restore();
          }
        });

        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.97;
          p.vy *= 0.97;
          p.alpha = Math.max(0, p.alpha - p.decay);

          if (p.alpha > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 14;
            ctx.shadowColor = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.stroke();
            ctx.restore();
          }
        });

        _victoryAnimId = requestAnimationFrame(stepNeon);
      }
      _victoryAnimId = requestAnimationFrame(stepNeon);
      return;
    }

    // ── 4. 하트 & 별빛 블룸 ──
    if (fxType === 'heart_star') {
      const items = ['💖', '⭐', '✨', '🌸', '💫'];
      const COUNT = 45;
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * width,
          y: height + Math.random() * 200,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -(2.5 + Math.random() * 3.5),
          char: items[Math.floor(Math.random() * items.length)],
          size: 20 + Math.random() * 18,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.04 + Math.random() * 0.04,
          alpha: 1
        });
      }

      function stepHeartStar() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
          p.wobble += p.wobbleSpeed;
          p.x += Math.sin(p.wobble) * 1.8;
          p.y += p.vy;
          if (p.y < height * 0.4) {
            p.alpha = Math.max(0, p.alpha - 0.015);
          }

          if (p.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.font = `${Math.floor(p.size)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.char, p.x, p.y);
            ctx.restore();
          }
        });
        _victoryAnimId = requestAnimationFrame(stepHeartStar);
      }
      _victoryAnimId = requestAnimationFrame(stepHeartStar);
      return;
    }

    // ── 5. 그랜드 불꽃축제 ──
    if (fxType === 'grand_festival') {
      const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#facc15'];
      const rockets = [
        { x: width * 0.25, y: height, targetY: height * 0.25, vy: -9, color: '#f59e0b', exploded: false },
        { x: width * 0.5,  y: height, targetY: height * 0.2,  vy: -10, color: '#ec4899', exploded: false },
        { x: width * 0.75, y: height, targetY: height * 0.3,  vy: -8.5, color: '#3b82f6', exploded: false },
        { x: width * 0.38, y: height, targetY: height * 0.35, vy: -8, color: '#10b981', exploded: false },
        { x: width * 0.62, y: height, targetY: height * 0.28, vy: -9.2, color: '#8b5cf6', exploded: false }
      ];

      function explodeRocket(r) {
        const count = 60;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
          const speed = 2 + Math.random() * 5.5;
          particles.push({
            x: r.x,
            y: r.targetY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: colors[Math.floor(Math.random() * colors.length)],
            radius: 2.5 + Math.random() * 2,
            alpha: 1,
            decay: 0.01 + Math.random() * 0.015
          });
        }
      }

      function stepGrand() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, width, height);

        rockets.forEach(r => {
          if (!r.exploded) {
            r.y += r.vy;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = r.color;
            ctx.fill();

            if (r.y <= r.targetY) {
              r.exploded = true;
              explodeRocket(r);
            }
          }
        });

        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.06;
          p.vx *= 0.98;
          p.alpha = Math.max(0, p.alpha - p.decay);

          if (p.alpha > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
            ctx.restore();
          }
        });

        _victoryAnimId = requestAnimationFrame(stepGrand);
      }
      _victoryAnimId = requestAnimationFrame(stepGrand);
      return;
    }

    // ── 6. 기본 클래식 컨페티 ──
    const confettiColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#fbbf24'];
    const CONFETTI_COUNT = 80;
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: -10 - Math.random() * 250,
        vx: (Math.random() - 0.5) * 3,
        vy: 2.5 + Math.random() * 3.5,
        w: 8 + Math.random() * 6,
        h: 12 + Math.random() * 8,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.1,
        wobble: Math.random() * 10
      });
    }

    function stepConfetti() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.wobble += 0.05;
        p.x += Math.sin(p.wobble) * 0.8;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(Math.cos(p.rot * 1.5), 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      _victoryAnimId = requestAnimationFrame(stepConfetti);
    }
    // ── 7. 무지개 폭죽 ──
    if (fxType === 'rainbow_blast') {
      const rainbowColors = ['#ff0055', '#ff7700', '#ffdd00', '#00cc66', '#0099ff', '#aa00ff', '#ff3399'];
      const bursts = [
        { cx: width * 0.5,  cy: height * 0.35, delay: 0 },
        { cx: width * 0.25, cy: height * 0.45, delay: 20 },
        { cx: width * 0.75, cy: height * 0.4,  delay: 35 },
        { cx: width * 0.35, cy: height * 0.25, delay: 60 },
        { cx: width * 0.65, cy: height * 0.5,  delay: 80 }
      ];

      bursts.forEach(b => {
        const count = 48;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
          const speed = 3.0 + Math.random() * 6.5;
          particles.push({
            cx: b.cx,
            cy: b.cy,
            x: b.cx,
            y: b.cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 6 + Math.floor(Math.random() * 5),
            color: rainbowColors[i % rainbowColors.length],
            alpha: 1,
            delay: b.delay,
            born: 0
          });
        }
      });

      let frameCount = 0;
      function stepRainbow() {
        ctx.clearRect(0, 0, width, height);
        frameCount++;
        let activeCount = 0;

        particles.forEach(p => {
          if (frameCount < p.delay) return;
          p.born++;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.09;
          p.vx *= 0.98;
          p.alpha -= 0.013;

          if (p.alpha > 0.05) {
            activeCount++;
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            ctx.restore();
          }
        });

        if (activeCount > 0) {
          _victoryAnimId = requestAnimationFrame(stepRainbow);
        }
      }
      _victoryAnimId = requestAnimationFrame(stepRainbow);
      return;
    }

    _victoryAnimId = requestAnimationFrame(stepConfetti);
  }

  function _stopVictoryEffect() {
    if (_victoryAnimId) {
      cancelAnimationFrame(_victoryAnimId);
      _victoryAnimId = null;
    }
    if (_victoryPreviewTimer) {
      clearTimeout(_victoryPreviewTimer);
      _victoryPreviewTimer = null;
    }
    const canvas = $('victory-effects-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.classList.add('hidden');
      canvas.style.display = 'none';
      if (canvas._onResize) {
        window.removeEventListener('resize', canvas._onResize);
        canvas._onResize = null;
      }
    }
  }

  window._previewVictoryEffect = function(effectKey) {
    _triggerVictoryEffect(effectKey);
    if (_victoryPreviewTimer) clearTimeout(_victoryPreviewTimer);
    _victoryPreviewTimer = setTimeout(() => {
      _stopVictoryEffect();
    }, 3500);
  };

  function _handleBuyProfileCard(item) {
    if (myCoins < item.price) {
      showToast(`코인이 부족합니다! (필요: ${item.price} 코인 / 보유: ${myCoins} 코인)`, 'warn');
      return;
    }

    myCoins -= item.price;
    localStorage.setItem('arcade_user_coins', String(myCoins));

    if (!myPurchasedProfileCards.includes(item.id)) {
      myPurchasedProfileCards.push(item.id);
    }
    localStorage.setItem('arcade_purchased_profile_cards', JSON.stringify(myPurchasedProfileCards));

    myProfileCard = item.id;
    localStorage.setItem('arcade_profile_card', myProfileCard);

    _applyProfileCardToAllUI();

    // Supabase 저장
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      const user = AppSupabase.getCurrentUser();
      AppSupabase.saveProfile(user.id, {
        coins: myCoins,
        profileCard: myProfileCard,
        purchasedProfileCards: myPurchasedProfileCards
      }).catch(() => {});
    }

    _renderShopUI();
    showToast(`🎉 [${item.name}] 프로필 카드를 구매하여 착용했습니다!`, 'success');
  }

  function _handleEquipProfileCard(item) {
    myProfileCard = item.id;
    localStorage.setItem('arcade_profile_card', myProfileCard);

    _applyProfileCardToAllUI();

    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      const user = AppSupabase.getCurrentUser();
      AppSupabase.saveProfile(user.id, {
        profileCard: myProfileCard
      }).catch(() => {});
    }

    _renderShopUI();
    showToast(`[${item.name}] 프로필 카드로 변경되었습니다.`, 'info');
  }

  function _handleResetProfileCard() {
    myProfileCard = 'default';
    localStorage.removeItem('arcade_profile_card');

    _applyProfileCardToAllUI();

    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      const user = AppSupabase.getCurrentUser();
      AppSupabase.saveProfile(user.id, {
        profileCard: 'default'
      }).catch(() => {});
    }

    _renderShopUI();
    showToast('기본 프로필 카드로 복원되었습니다.', 'info');
  }

  function _applyProfileCardToAllUI() {
    _updateCoinsUI();
    _updateHomeUserBar();
    _updateProfileModalPreview();

    // 대기방 참가자 정보 갱신
    if (currentRoomCode && roomPlayers.length > 0) {
      const myId = P2P.getMyId();
      const me = roomPlayers.find(p => p.id === myId || (p.isHost && isHostPlayer));
      if (me) {
        me.profileCard = myProfileCard || 'default';
      }
      _updateRoomUI();
      if (isHostPlayer) {
        _broadcastRoomState();
      } else {
        P2P.send({
          type: 'guest_update_profile',
          name: myNickname,
          nameColor: myNicknameColor || null,
          profileCard: myProfileCard || 'default',
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          exp: myExp,
          stats: _getMyStats()
        });
      }
    }

    // 인게임 사이드바 갱신
    if (typeof isRoomGameActive !== 'undefined' && isRoomGameActive) {
      _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);
    }

    if (isHostPlayer && currentRoomCode && window.FirebaseLobby && typeof window.FirebaseLobby.updateRoomHostProfile === 'function') {
      window.FirebaseLobby.updateRoomHostProfile(currentRoomCode, {
        hostProfileCard: myProfileCard,
        hostLevel: myLevel,
        hostNameColor: myNicknameColor || null
      });
    }

    if (typeof _renderOnlineUsersList === 'function' && typeof _lastOnlineUsers !== 'undefined' && Array.isArray(_lastOnlineUsers)) {
      _renderOnlineUsersList(_lastOnlineUsers);
    }

    if (typeof _syncOnlinePresence === 'function') _syncOnlinePresence();
  }

  /* ── 💬 말풍선 스킨 구매 / 착용 ── */
  function _handleBuyChatBubble(item) {
    if (myCoins < item.price) {
      showToast(`코인이 부족합니다! (필요: ${item.price} 코인 / 보유: ${myCoins} 코인)`, 'warn');
      return;
    }
    myCoins -= item.price;
    localStorage.setItem('arcade_user_coins', String(myCoins));
    if (!myPurchasedChatBubbles.includes(item.id)) myPurchasedChatBubbles.push(item.id);
    localStorage.setItem('arcade_purchased_chat_bubbles', JSON.stringify(myPurchasedChatBubbles));
    myChatBubble = item.id;
    localStorage.setItem('arcade_user_chat_bubble', myChatBubble);
    _applyCosmeticsToAllUI();
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      AppSupabase.saveProfile(AppSupabase.getCurrentUser().id, { coins: myCoins, chatBubble: myChatBubble, purchasedChatBubbles: myPurchasedChatBubbles }).catch(() => {});
    }
    _updateCoinsUI();
    _renderShopUI();
    showToast(`🎉 [${item.name}] 말풍선을 구매하여 착용했습니다!`, 'success');
  }

  function _handleEquipChatBubble(item) {
    myChatBubble = (item.isDefault) ? 'default' : item.id;
    if (myChatBubble && myChatBubble !== 'default') { localStorage.setItem('arcade_user_chat_bubble', myChatBubble); } else { localStorage.removeItem('arcade_user_chat_bubble'); }
    _applyCosmeticsToAllUI();
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      AppSupabase.saveProfile(AppSupabase.getCurrentUser().id, { chatBubble: myChatBubble }).catch(() => {});
    }
    _renderShopUI();
    showToast(item.isDefault ? '기본 말풍선으로 복원되었습니다.' : `[${item.name}] 말풍선으로 변경되었습니다.`, 'info');
  }

  /* ── 🖼️ 아바타 테두리 구매 / 착용 ── */
  function _handleBuyAvatarFrame(item) {
    if (myCoins < item.price) {
      showToast(`코인이 부족합니다! (필요: ${item.price} 코인 / 보유: ${myCoins} 코인)`, 'warn');
      return;
    }
    myCoins -= item.price;
    localStorage.setItem('arcade_user_coins', String(myCoins));
    if (!myPurchasedAvatarFrames.includes(item.id)) myPurchasedAvatarFrames.push(item.id);
    localStorage.setItem('arcade_purchased_avatar_frames', JSON.stringify(myPurchasedAvatarFrames));
    myAvatarFrame = item.id;
    localStorage.setItem('arcade_user_avatar_frame', myAvatarFrame);
    _applyCosmeticsToAllUI();
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      AppSupabase.saveProfile(AppSupabase.getCurrentUser().id, { coins: myCoins, avatarFrame: myAvatarFrame, purchasedAvatarFrames: myPurchasedAvatarFrames }).catch(() => {});
    }
    _updateCoinsUI();
    _renderShopUI();
    showToast(`🎉 [${item.name}] 테두리를 구매하여 착용했습니다!`, 'success');
  }

  function _handleEquipAvatarFrame(item) {
    myAvatarFrame = (item.isDefault) ? 'default' : item.id;
    if (myAvatarFrame && myAvatarFrame !== 'default') { localStorage.setItem('arcade_user_avatar_frame', myAvatarFrame); } else { localStorage.removeItem('arcade_user_avatar_frame'); }
    _applyCosmeticsToAllUI();
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      AppSupabase.saveProfile(AppSupabase.getCurrentUser().id, { avatarFrame: myAvatarFrame }).catch(() => {});
    }
    _renderShopUI();
    showToast(item.isDefault ? '기본 테두리로 복원되었습니다.' : `[${item.name}] 테두리로 변경되었습니다.`, 'info');
  }

  /* ── 🎆 승리 세레머니 연출 구매 / 착용 ── */
  function _handleBuyVictoryEffect(item) {
    if (myCoins < item.price) {
      showToast(`코인이 부족합니다! (필요: ${item.price} 코인 / 보유: ${myCoins} 코인)`, 'warn');
      return;
    }
    myCoins -= item.price;
    localStorage.setItem('arcade_user_coins', String(myCoins));
    if (!myPurchasedVictoryEffects.includes(item.id)) myPurchasedVictoryEffects.push(item.id);
    localStorage.setItem('arcade_purchased_victory_effects', JSON.stringify(myPurchasedVictoryEffects));
    myVictoryEffect = item.id;
    localStorage.setItem('arcade_user_victory_effect', myVictoryEffect);
    _applyCosmeticsToAllUI();
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      AppSupabase.saveProfile(AppSupabase.getCurrentUser().id, { coins: myCoins, victoryEffect: myVictoryEffect, purchasedVictoryEffects: myPurchasedVictoryEffects }).catch(() => {});
    }
    _updateCoinsUI();
    _renderShopUI();
    showToast(`🎉 [${item.name}] 승리 연출을 구매하여 착용했습니다!`, 'success');
  }

  function _handleEquipVictoryEffect(item) {
    myVictoryEffect = (item.isDefault) ? 'default' : item.id;
    if (myVictoryEffect && myVictoryEffect !== 'default') { localStorage.setItem('arcade_user_victory_effect', myVictoryEffect); } else { localStorage.removeItem('arcade_user_victory_effect'); }
    _applyCosmeticsToAllUI();
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      AppSupabase.saveProfile(AppSupabase.getCurrentUser().id, { victoryEffect: myVictoryEffect }).catch(() => {});
    }
    _renderShopUI();
    showToast(item.isDefault ? '기본 승리 연출로 복원되었습니다.' : `[${item.name}] 승리 연출로 변경되었습니다.`, 'info');
  }

  /* ── 🌐 Firebase 실시간 글로벌 로비 목록 (전체 / 공개방 / 비밀방 탭 필터링 & 게임별 필터) ── */
  let _currentLobbyTab = 'all'; // 'all' | 'public' | 'private'
  let _selectedLobbyGameFilter = 'all'; // 'all' | gameKey
  let _latestLobbyRoomsData = null;
  let _refreshLobbyCooldown = false;

  function _initFirebaseLobby() {
    const tabAll = $('tab-lobby-all');
    const tabPublic = $('tab-lobby-public');
    const tabPrivate = $('tab-lobby-private');

    const tabs = [
      { el: tabAll, type: 'all' },
      { el: tabPublic, type: 'public' },
      { el: tabPrivate, type: 'private' }
    ];

    // 탭 클릭 이벤트 리스너 통합 등록
    tabs.forEach(({ el, type }) => {
      if (el) {
        el.addEventListener('click', () => {
          if (_currentLobbyTab === type) return;
          _currentLobbyTab = type;

          // 클릭한 탭만 active 추가, 나머지는 제거
          tabs.forEach(t => t.el && t.el.classList.toggle('active', t.type === type));

          _renderLobbyRooms(_latestLobbyRoomsData);
          if (typeof Sound !== 'undefined' && Sound.playClick) Sound.playClick();
        });
      }
    });

    // 게임별 필터 드롭다운 옵션 동적 채우기 & 이벤트
    const gameFilterEl = $('lobby-game-filter');
    if (gameFilterEl) {
      gameFilterEl.innerHTML = '<option value="all">모든 게임</option>';
      Object.keys(GAMES).forEach(gKey => {
        const opt = document.createElement('option');
        opt.value = gKey;
        opt.textContent = GAMES[gKey].title;
        gameFilterEl.appendChild(opt);
      });
      gameFilterEl.addEventListener('change', (e) => {
        _selectedLobbyGameFilter = e.target.value;
        _renderLobbyRooms(_latestLobbyRoomsData);
      });
    }

    if (window.FirebaseLobby && typeof window.FirebaseLobby.onLobbyUpdate === 'function') {
      window.FirebaseLobby.onLobbyUpdate(_renderLobbyRooms);
    } else {
      window.addEventListener('firebase-ready', () => {
        if (window.FirebaseLobby) {
          window.FirebaseLobby.onLobbyUpdate(_renderLobbyRooms);
        }
      }, { once: true });
    }
  }

  function _renderLobbyRooms(roomsData) {
    _latestLobbyRoomsData = roomsData;
    const listEl = $('lobby-room-list');
    if (!listEl) return;

    const isLockRoom = (room) => {
      return !!room.isPrivate || !!room.hasPassword || String(room.isPrivate) === 'true' || String(room.hasPassword) === 'true';
    };

    // 탭 종류별 안내 메시지 반환
    const getEmptyText = () => {
      if (_selectedLobbyGameFilter && _selectedLobbyGameFilter !== 'all') {
        const gDef = GAMES[_selectedLobbyGameFilter];
        const gTitle = gDef ? gDef.title : _selectedLobbyGameFilter;
        return `현재 열려있는 [${gTitle}] 방이 없습니다.<br>직접 방을 만들어 플레이어를 모집해 보세요!`;
      }
      if (_currentLobbyTab === 'public') return '현재 열려있는 공개방이 없습니다.<br>새로운 방을 직접 만들어 보세요!';
      if (_currentLobbyTab === 'private') return '현재 열려있는 비밀방이 없습니다.<br>비밀방을 직접 만들어 친구를 초대해 보세요!';
      return '현재 열려있는 방이 없습니다.<br>새로운 방을 직접 만들어 보세요!';
    };

    if (!roomsData || typeof roomsData !== 'object' || Object.keys(roomsData).length === 0) {
      listEl.classList.add('is-empty');
      listEl.innerHTML = `
        <div class="lobby-empty">
          <i class="fa-regular fa-compass"></i>
          <p>${getEmptyText()}</p>
        </div>
      `;
      return;
    }

    const now = Date.now();
    const allEntries = Object.entries(roomsData)
      .filter(([code, room]) => {
        if (!room || typeof room !== 'object') return false;
        // 1. 호스트 정보(Peer ID 또는 호스트 닉네임)가 전혀 없는 유령 방 제외
        if (!room.hostPeerId && !room.hostName) return false;
        // 2. 45초 이상 무응답 하트비트 또는 6시간 이상 경과한 방 제외
        if (room.lastSeen && (now - room.lastSeen > 45000)) return false;
        if (room.createdAt && (now - room.createdAt > 6 * 60 * 60 * 1000)) return false;
        return true;
      })
      .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

    // 🌟 탭에 따라 전체 / 공개방 / 비밀방 필터링 및 게임별 필터링
    const roomEntries = allEntries.filter(([code, room]) => {
      const lock = isLockRoom(room);
      if (_currentLobbyTab === 'public' && lock) return false;
      if (_currentLobbyTab === 'private' && !lock) return false;
      if (_selectedLobbyGameFilter && _selectedLobbyGameFilter !== 'all') {
        const rGame = (room.game || room.selectedGame || 'gomoku').toLowerCase();
        if (rGame !== _selectedLobbyGameFilter.toLowerCase()) return false;
      }
      return true;
    });

    if (roomEntries.length === 0) {
      listEl.classList.add('is-empty');
      listEl.innerHTML = `
        <div class="lobby-empty">
          <i class="fa-regular fa-compass"></i>
          <p>${getEmptyText()}</p>
        </div>
      `;
      return;
    }

    listEl.classList.remove('is-empty');
    listEl.innerHTML = '';
    roomEntries.forEach(([code, room]) => {
      const pCount = room.playerCount || 1;
      const maxP = room.maxPlayers || 5;
      const isFull = pCount >= maxP;
      const isPlaying = room.status === 'playing';
      const isLock = isLockRoom(room);

      const isMyHostedRoom = (room.hostPeerId && room.hostPeerId === P2P.getMyId()) || (room.hostName === myNickname);
      const hostLevel = isMyHostedRoom ? myLevel : (room.hostLevel || 1);
      const hostTierClass = _getLevelTierClass(hostLevel);
      const hostCardTheme = isMyHostedRoom ? myProfileCard : (room.hostProfileCard || 'default');
      const hostCardThemeClass = (hostCardTheme && hostCardTheme !== 'default') ? `pcard-theme-${hostCardTheme}` : '';
      const hostNameColor = isMyHostedRoom ? myNicknameColor : (room.hostNameColor || null);

      const roomGameKey = room.game || room.selectedGame || 'gomoku';
      const gameDef = GAMES[roomGameKey];
      const gameTitle = gameDef ? gameDef.title : '오목';

      const card = document.createElement('div');
      card.className = `lobby-room-card ${isPlaying ? 'is-playing' : (isFull ? 'is-full' : '')}`;
      card.innerHTML = `
        <div class="lrc-top">
          <div class="lrc-badge-group">
            <span class="lrc-code-badge"><i class="fa-solid fa-hashtag"></i> ${code}</span>
            <span class="lrc-game-badge" style="background:rgba(59,130,246,0.1);color:var(--primary);font-size:0.75rem;padding:3px 8px;border-radius:6px;font-weight:800;"><i class="fa-solid fa-gamepad"></i> ${gameTitle}</span>
            ${isLock ? '<span class="lrc-lock-badge"><i class="fa-solid fa-lock"></i> 비밀방</span>' : ''}
            <span class="lrc-status-badge ${isPlaying ? 'playing' : (isFull ? 'full' : 'waiting')}">
              ${isPlaying ? '<i class="fa-solid fa-gamepad"></i> 진행 중' : (isFull ? '<i class="fa-solid fa-user-lock"></i> 만원' : '<i class="fa-solid fa-door-open"></i> 대기 중')}
            </span>
          </div>
          <span class="lrc-count-badge"><i class="fa-solid fa-users"></i> ${pCount}/${maxP}명</span>
        </div>
        <div class="lrc-row-bottom">
          <div class="lrc-host-info ${hostCardThemeClass}">
            <div class="user-avatar-wrap">
              <div class="lrc-host-avatar" style="background:${room.hostAvatarColor || '#38a169'};"><i class="${room.hostAvatarIcon || 'fa-solid fa-paw'}"></i></div>
              <span class="user-level-badge sm ${hostTierClass}">${hostLevel}</span>
            </div>
            <div class="lrc-host-meta">
              <strong class="lrc-host-name" style="${hostNameColor ? `color:${hostNameColor} !important; font-weight:800;` : ''}">${_escapeHtml(room.hostName || '익명')} <i class="fa-solid fa-crown" style="color:var(--yellow);font-size:0.75rem;"></i></strong>
            </div>
          </div>
          <button type="button" class="btn ${isPlaying ? 'btn-danger is-playing-btn' : 'btn-primary'} btn-sm lrc-join-btn ${isFull ? 'disabled' : ''}">
            <span>${isPlaying ? '진행 중 | 관전' : (isFull ? '마감' : (isLock ? '비밀번호' : '입장'))}</span>
            <i class="fa-solid ${isLock ? 'fa-lock' : 'fa-arrow-right-to-bracket'}"></i>
          </button>
        </div>
      `;

      card.addEventListener('click', () => {
        if (currentRoomCode === code && (screens.room.classList.contains('active') || screens.game.classList.contains('active'))) {
          showToast('이미 참가 중인 방입니다.', 'info');
          return;
        }
        if (isFull) {
          showToast('해당 방은 정원이 가득 찼습니다.', 'warn');
          return;
        }
        if (isLock) {
          _openPasswordJoinModal(code);
        } else {
          _startJoinRoom(code);
        }
      });

      listEl.appendChild(card);
    });
  }

  // 로비 새로고침 버튼 애니메이션 & 쿨다운
  const refreshLobbyBtn = $('btn-refresh-lobby');
  if (refreshLobbyBtn) {
    refreshLobbyBtn.addEventListener('click', () => {
      if (_refreshLobbyCooldown) return;
      _refreshLobbyCooldown = true;

      refreshLobbyBtn.classList.add('spinning');
      setTimeout(() => {
        refreshLobbyBtn.classList.remove('spinning');
      }, 600);
      setTimeout(() => {
        _refreshLobbyCooldown = false;
      }, 1000);

      _renderLobbyRooms(_latestLobbyRoomsData);
      showToast('방 목록을 새로고침했습니다.', 'info');
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     🌟 Supabase Realtime 기반 사이트 접속 중인 사용자 (Online Users Presence)
  ═══════════════════════════════════════════════════════════════ */
  let _lastOnlineUsers = [];

  function _getMyPresencePayload() {
    const user = (typeof AppSupabase !== 'undefined') ? AppSupabase.getCurrentUser() : null;
    return {
      id: P2P.getMyId() || ('usr_' + Math.random().toString(36).substring(2, 9)),
      supabaseId: user ? user.id : null,
      name: myNickname || '플레이어',
      nameColor: myNicknameColor || null,
      profileCard: myProfileCard || 'default',
      avatarIcon: myAvatarIcon || 'fa-solid fa-dog',
      avatarColor: myAvatarColor || '#38a169',
      avatarFrame: myAvatarFrame || 'default',
      chatBubble: myChatBubble || 'default',
      victoryEffect: myVictoryEffect || 'default',
      level: myLevel || 1,
      exp: myExp || 0,
      stats: _getMyStats()
    };
  }

  function _syncOnlinePresence() {
    const payload = _getMyPresencePayload();
    if (window.FirebaseLobby && typeof window.FirebaseLobby.updateOnlineUser === 'function') {
      window.FirebaseLobby.updateOnlineUser(payload);
    }
    if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.updatePresence === 'function') {
      AppSupabase.updatePresence(payload);
    }
  }

  function _initOnlineUsersPresence() {
    const initialPayload = _getMyPresencePayload();
    _renderOnlineUsersList([initialPayload]);

    // 1. Firebase Realtime Database 실시간 연동 (방 목록과 동일한 WebSocket 푸시)
    const _setupFirebaseOnline = () => {
      if (window.FirebaseLobby && typeof window.FirebaseLobby.registerOnlineUser === 'function') {
        window.FirebaseLobby.registerOnlineUser(_getMyPresencePayload());
        window.FirebaseLobby.onOnlineUsersUpdate((users) => {
          if (Array.isArray(users) && users.length > 0) {
            _lastOnlineUsers = users;
            _renderOnlineUsersList(_lastOnlineUsers);
          } else if (users === null) {
            // Firebase 오류 시 fallback
          } else {
            _lastOnlineUsers = [_getMyPresencePayload()];
            _renderOnlineUsersList(_lastOnlineUsers);
          }
        });
      }
    };

    if (window.FirebaseLobby && typeof window.FirebaseLobby.registerOnlineUser === 'function') {
      _setupFirebaseOnline();
    } else {
      window.addEventListener('firebase-ready', () => {
        _setupFirebaseOnline();
      }, { once: true });
    }

    // 2. Supabase Realtime 보조 연동 (Firebase 미응답 시 fallback)
    if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.initPresence === 'function') {
      AppSupabase.initPresence(_getMyPresencePayload(), (users) => {
        if (!_lastOnlineUsers || _lastOnlineUsers.length <= 1) {
          if (Array.isArray(users) && users.length > 0) {
            _lastOnlineUsers = users;
            _renderOnlineUsersList(_lastOnlineUsers);
          }
        }
      });
    }

    // 3. 접속자 수동 새로고침 버튼 바인딩 (무한 회전 버그 방지: 타이머 즉시 보장)
    const btnRefresh = $('btn-refresh-online-users');
    if (btnRefresh && !btnRefresh.dataset.bound) {
      btnRefresh.dataset.bound = 'true';
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('rotating');
        setTimeout(() => {
          btnRefresh.classList.remove('rotating');
        }, 600);

        try {
          if (typeof _syncOnlinePresence === 'function') _syncOnlinePresence();
          if (window.FirebaseLobby && typeof window.FirebaseLobby.refreshOnlineUsers === 'function') {
            const fbUsers = await window.FirebaseLobby.refreshOnlineUsers();
            _lastOnlineUsers = Array.isArray(fbUsers) && fbUsers.length > 0 ? fbUsers : [_getMyPresencePayload()];
            _renderOnlineUsersList(_lastOnlineUsers);
          } else if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.refreshPresence === 'function') {
            await AppSupabase.refreshPresence();
          }
          showToast('접속자 목록을 새로고침했습니다.', 'info');
        } catch (err) {
          console.warn('[OnlineUsers] 새로고침 실패:', err);
        }
      });
    }
  }

  function _renderOnlineUsersList(users) {
    const listEl = $('online-users-list');
    const countEl = $('online-users-count');
    if (!listEl) return;

    let myPresenceKey = null;
    try { myPresenceKey = sessionStorage.getItem('gachi_presence_key'); } catch (_) {}
    const mySupabaseId = (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) ? AppSupabase.getCurrentUser().id : null;
    const myPayload = _getMyPresencePayload();

    // 1. 원본 목록에서 내 세션(presenceKey 또는 supabaseId)을 찾아 항상 최신의 로컬 상태(myPayload)로 강제 동기화
    let hasMe = false;
    const listWithMe = (Array.isArray(users) ? users : []).map(u => {
      const isMe = (myPresenceKey && u.presenceKey === myPresenceKey) ||
                   (mySupabaseId && u.supabaseId === mySupabaseId) ||
                   (!mySupabaseId && !u.supabaseId && myPresenceKey && u.presenceKey === myPresenceKey);
      if (isMe) {
        hasMe = true;
        return { ...myPayload, presenceKey: myPresenceKey || u.presenceKey };
      }
      return u;
    });

    if (!hasMe) {
      listWithMe.push({ ...myPayload, presenceKey: myPresenceKey });
    }

    // 2. 접속자 목록 중복 제거 (presenceKey 또는 supabaseId 또는 id 기준)
    const seen = new Set();
    const uniqueUsers = [];
    for (const u of listWithMe) {
      const key = u.presenceKey || (u.supabaseId ? 'sb_' + u.supabaseId : (u.id || u.name));
      if (!seen.has(key)) {
        seen.add(key);
        uniqueUsers.push(u);
      }
    }

    // 3. '내 프로필'을 항상 최상단에 고정하고, 나머지 플레이어는 레벨 내림차순 정렬
    const list = uniqueUsers.sort((a, b) => {
      const isMeA = (myPresenceKey && a.presenceKey === myPresenceKey) ||
                    (mySupabaseId && a.supabaseId === mySupabaseId) ||
                    (a.name === myNickname);
      const isMeB = (myPresenceKey && b.presenceKey === myPresenceKey) ||
                    (mySupabaseId && b.supabaseId === mySupabaseId) ||
                    (b.name === myNickname);
      if (isMeA && !isMeB) return -1;
      if (!isMeA && isMeB) return 1;

      const lvlA = typeof a.level === 'number' ? a.level : 1;
      const lvlB = typeof b.level === 'number' ? b.level : 1;
      return lvlB - lvlA;
    });

    if (countEl) countEl.textContent = `${list.length}명`;

    listEl.innerHTML = list.map((user, idx) => {
      const isMe = (myPresenceKey && user.presenceKey === myPresenceKey) ||
                   (mySupabaseId && user.supabaseId === mySupabaseId) ||
                   (user.name === myNickname);

      // 내 자신은 항상 실시간 로컬 최신 프로필로 렌더링 (새로고침 시 과거 잔여 데이터 노출 방지)
      const uname = isMe ? myNickname : (user.name || '플레이어');
      const unameColor = isMe ? myNicknameColor : (user.nameColor || '');
      const uicon = isMe ? myAvatarIcon : (user.avatarIcon || 'fa-solid fa-dog');
      const ucolor = isMe ? myAvatarColor : (user.avatarColor || '#38a169');
      const ulevel = isMe ? myLevel : (user.level || 1);
      const tierClass = _getLevelTierClass(ulevel);
      const statsObj = isMe ? _getMyStats() : user.stats;
      const ucard = isMe ? myProfileCard : (user.profileCard || 'default');
      const cardThemeClass = (ucard && ucard !== 'default') ? `pcard-theme-${ucard}` : '';
      const uframe = isMe ? myAvatarFrame : (user.avatarFrame || 'default');
      const frameClass = _getAvatarFrameClass(uframe);

      let winRateStr = '전적 없음';
      if (statsObj && statsObj.total && typeof statsObj.total.plays === 'number' && statsObj.total.plays > 0) {
        const plays = statsObj.total.plays;
        const wins = statsObj.total.wins || 0;
        const rate = Math.round((wins / plays) * 100);
        winRateStr = `${plays}전 ${wins}승 (${rate}%)`;
      }

      return `
        <div class="online-user-item ${cardThemeClass} ${isMe ? 'is-me' : ''}" data-idx="${idx}" title="${_escapeHtml(uname)}님의 전적 보기">
          <div class="user-avatar-wrap">
            <div class="user-avatar sm ${frameClass}" style="background: ${ucolor};">
              <i class="${uicon}"></i>
            </div>
            <span class="user-level-badge ${tierClass}">${ulevel}</span>
          </div>
          <div class="online-user-info">
            <span class="online-user-name ${unameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${unameColor && unameColor !== 'rainbow' ? `color:${unameColor} !important; font-weight:800;` : ''}">
              ${_escapeHtml(uname)}
              ${isMe ? '<span class="online-me-badge">나</span>' : ''}
            </span>
            <span class="online-user-sub">${winRateStr}</span>
          </div>
          <button type="button" class="btn-icon sm btn-view-stats" title="전적 보기">
            <i class="fa-solid fa-chart-simple"></i>
          </button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.online-user-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(item.dataset.idx, 10);
        const targetUser = list[idx];
        if (!targetUser) return;

        const isMe = (myPresenceKey && targetUser.presenceKey === myPresenceKey) ||
                     (mySupabaseId && targetUser.supabaseId === mySupabaseId) ||
                     (targetUser.name === myNickname && idx === 0);

        if (isMe) {
          _openPlayerStatsModal();
        } else {
          _openPlayerStatsModal(targetUser);
        }
      });
    });

    if (typeof _updateFriendsBadge === 'function') {
      _updateFriendsBadge();
    }
    const modalFriends = $('modal-friends');
    if (modalFriends && !modalFriends.classList.contains('hidden') && typeof _renderFriendsModalContent === 'function') {
      _renderFriendsModalContent();
    }
  }

  /* =====================================================================
     친구 시스템 및 실시간 방 초대 알림 (상호 승인제 & 고유 식별자 지원)
     ===================================================================== */
  let _friendsList = [];
  let _sentFriendRequests = [];
  let _receivedFriendRequests = [];
  let _currentInspectedPlayer = null;
  let _activeInviteTimeout = null;
  let _friendsSearchQuery = '';
  let _inviteCooldowns = {};

  function _loadFriendsFromStorage() {
    try {
      const raw = localStorage.getItem('arcade_friends');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) _friendsList = parsed;
      }
    } catch (_) {
      _friendsList = [];
    }
  }

  async function _saveFriendsToStorage() {
    try {
      localStorage.setItem('arcade_friends', JSON.stringify(_friendsList));
    } catch (_) {}

    _updateFriendsBadge();

    // Supabase 로그인 상태라면 클라우드 DB에도 동기화
    if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.getCurrentUser === 'function') {
      const u = AppSupabase.getCurrentUser();
      if (u && typeof AppSupabase.addFriend === 'function') {
        _friendsList.forEach(f => {
          AppSupabase.addFriend(u.id, f.name, f.friendId || null).catch(() => {});
        });
      }
    }
  }

  function _loadSentFriendRequests() {
    try {
      const raw = localStorage.getItem('arcade_sent_friend_requests');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) _sentFriendRequests = parsed;
      }
    } catch (_) {
      _sentFriendRequests = [];
    }
  }

  function _saveSentFriendRequests() {
    try {
      localStorage.setItem('arcade_sent_friend_requests', JSON.stringify(_sentFriendRequests));
    } catch (_) {}
  }

  function _getMyUserKey() {
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser && AppSupabase.getCurrentUser()) {
      return 'sb_' + AppSupabase.getCurrentUser().id;
    }
    let sessKey = null;
    try { sessKey = sessionStorage.getItem('gachi_presence_key'); } catch (_) {}
    if (sessKey) return 'pk_' + sessKey;
    const peerId = P2P.getMyId();
    if (peerId && peerId !== 'host' && peerId !== 'guest') return 'peer_' + peerId;
    let localUuid = null;
    try {
      localUuid = localStorage.getItem('gachi_client_uuid');
      if (!localUuid) {
        localUuid = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('gachi_client_uuid', localUuid);
      }
    } catch (_) {
      localUuid = 'usr_' + Math.random().toString(36).substring(2, 9);
    }
    return localUuid;
  }

  function _getUserUniqueKey(user) {
    if (!user) return null;
    if (user.supabaseId) return 'sb_' + user.supabaseId;
    if (user.presenceKey) return 'pk_' + user.presenceKey;
    if (user.id && user.id !== 'host' && user.id !== 'guest') return 'peer_' + user.id;
    if (user.userKey) return user.userKey;
    if (user.fromKey) return user.fromKey;
    return 'nm_' + encodeURIComponent(user.name || 'player').replace(/\./g, '%2E');
  }

  function _updateFriendsBadge() {
    const badge = $('friends-online-count-badge');
    const reqCount = _receivedFriendRequests.length;
    const onlineCount = _friendsList.filter(f => 
      _lastOnlineUsers.some(u => u.name === f.name)
    ).length;

    if (badge) {
      if (reqCount > 0) {
        badge.textContent = reqCount > 99 ? '99+' : reqCount;
        badge.style.background = 'var(--red, #ef4444)';
        badge.classList.remove('hidden');
      } else if (onlineCount > 0) {
        badge.textContent = onlineCount > 99 ? '99+' : onlineCount;
        badge.style.background = 'var(--green, #10b981)';
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    const tabBadge = $('friends-req-badge');
    if (tabBadge) {
      if (reqCount > 0) {
        tabBadge.textContent = reqCount > 99 ? '99+' : reqCount;
        tabBadge.classList.remove('hidden');
      } else {
        tabBadge.classList.add('hidden');
      }
    }
  }

  function _openFriendsModal(initialTab = 'list') {
    const modal = $('modal-friends');
    if (!modal) return;

    try {
      _switchFriendsTab(initialTab);
    } catch (err) {
      console.warn('[Friends] 친구 모달 렌더링 오류:', err);
    }
    modal.classList.remove('hidden');
  }

  function _closeFriendsModal() {
    const modal = $('modal-friends');
    if (modal) modal.classList.add('hidden');
  }

  function _switchFriendsTab(tabName) {
    document.querySelectorAll('.friends-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    const paneList = $('pane-friends-list');
    const paneReqs = $('pane-friends-requests');
    if (paneList) paneList.classList.toggle('active', tabName === 'list');
    if (paneReqs) paneReqs.classList.toggle('active', tabName === 'requests');
    _renderFriendsModalContent();
    if (typeof Sound !== 'undefined' && Sound.playClick) Sound.playClick();
  }

  function _renderFriendsModalContent() {
    const countText = $('friends-count-text');
    if (countText) countText.textContent = _friendsList.length;

    _updateFriendsBadge();

    // 1. 내 친구 목록 렌더링
    const listWrap = $('friends-items-list');
    if (listWrap) {
      let validFriends = (_friendsList || []).filter(f => f && f.name);

      // 🔍 실시간 검색어 필터링
      if (_friendsSearchQuery && _friendsSearchQuery.trim()) {
        const q = _friendsSearchQuery.trim().toLowerCase();
        validFriends = validFriends.filter(f => f.name.toLowerCase().includes(q));
      }

      // 🌟 온라인 친구 우선 정렬 (접속 중 -> 오프라인 순, 동일 상태 시 가나다순)
      validFriends.sort((a, b) => {
        const aOnline = (_lastOnlineUsers || []).some(u => u && u.name === a.name);
        const bOnline = (_lastOnlineUsers || []).some(u => u && u.name === b.name);
        if (aOnline !== bOnline) return aOnline ? -1 : 1;
        return a.name.localeCompare(b.name, 'ko');
      });

      if (validFriends.length === 0) {
        if (_friendsSearchQuery && _friendsSearchQuery.trim()) {
          listWrap.innerHTML = `
            <div class="friends-empty-state">
              <i class="fa-solid fa-magnifying-glass"></i>
              <p>'${_escapeHtml(_friendsSearchQuery)}' 검색 결과가 없습니다.</p>
            </div>
          `;
        } else {
          listWrap.innerHTML = `
            <div class="friends-empty-state">
              <i class="fa-solid fa-user-group"></i>
              <p>아직 등록된 친구가 없습니다.<br>플레이어의 <strong>프로필</strong>을 눌러 친구 신청을 보내보세요!</p>
            </div>
          `;
        }
      } else {
        const isInRoom = !!(currentRoomCode && screens.room && screens.room.classList.contains('active'));

        listWrap.innerHTML = validFriends.map((friend, idx) => {
          const onlineUser = (_lastOnlineUsers || []).find(u => u && u.name === friend.name);
          const isOnline = !!onlineUser;
          const statusText = isOnline ? '접속 중 (로비)' : '오프라인';
          const avatarIcon = (onlineUser && onlineUser.avatarIcon) || friend.avatarIcon || 'fa-solid fa-user';
          const avatarColor = (onlineUser && onlineUser.avatarColor) || friend.avatarColor || '#38a169';
          const level = (onlineUser && onlineUser.level) || friend.level || 1;
          const nameColor = (onlineUser && onlineUser.nameColor) || friend.nameColor || '';

          return `
            <div class="friends-item" data-idx="${idx}">
              <div class="friends-avatar-box">
                <div class="friends-avatar" style="background:${avatarColor};">
                  <i class="${avatarIcon}"></i>
                </div>
                <span class="friends-status-dot ${isOnline ? 'online' : ''}"></span>
              </div>
              <div class="friends-info-box">
                <div class="friends-name-row">
                  <span class="friends-name ${nameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${nameColor && nameColor !== 'rainbow' ? `color:${nameColor} !important;` : ''}">${_escapeHtml(friend.name)}</span>
                  <span class="friends-level-pill">Lv.${level}</span>
                </div>
                <div class="friends-status-text ${isOnline ? 'online' : ''}">
                  <i class="fa-solid ${isOnline ? 'fa-circle-check' : 'fa-circle'}"></i>
                  <span>${statusText}</span>
                </div>
              </div>
              <div class="friends-btn-actions">
                ${isInRoom && isOnline ? `
                  <button type="button" class="btn btn-primary btn-sm friends-action-btn btn-invite-friend" data-name="${_escapeHtml(friend.name)}">
                    <i class="fa-solid fa-paper-plane"></i> 초대
                  </button>
                ` : ''}
                <button type="button" class="friends-delete-btn btn-remove-friend" data-name="${_escapeHtml(friend.name)}" title="친구 삭제">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');

        // 초대 버튼 이벤트
        listWrap.querySelectorAll('.btn-invite-friend').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            _inviteFriendToRoom(btn.dataset.name);
          });
        });

        // 삭제 버튼 이벤트
        listWrap.querySelectorAll('.btn-remove-friend').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const targetName = btn.dataset.name;
            const ok = await showConfirmDialog({
              title: '친구 삭제',
              message: `'${targetName}'님을 친구 목록에서 삭제하시겠습니까?`,
              confirmText: '삭제',
              cancelText: '취소',
              icon: 'fa-solid fa-user-xmark',
              isDanger: true
            });
            if (ok) {
              _removeFriend(targetName);
            }
          });
        });
      }
    }

    // 2. 받은 신청 목록 렌더링
    const reqWrap = $('friends-requests-list');
    if (reqWrap) {
      const validReqs = (_receivedFriendRequests || []).filter(r => r && r.fromName);
      if (validReqs.length === 0) {
        reqWrap.innerHTML = `
          <div class="friends-empty-state">
            <i class="fa-solid fa-envelope-open"></i>
            <p>새로운 친구 신청이 없습니다.</p>
          </div>
        `;
      } else {
        reqWrap.innerHTML = validReqs.map(req => `
          <div class="friends-request-item" data-from-key="${req.fromKey}">
            <div class="friends-avatar-box">
              <div class="friends-avatar" style="background:${req.fromAvatarColor || '#38a169'};">
                <i class="${req.fromAvatarIcon || 'fa-solid fa-user'}"></i>
              </div>
            </div>
            <div class="friends-info-box">
              <div class="friends-name-row">
                <span class="friends-name" style="${req.fromNameColor ? `color:${req.fromNameColor} !important;` : ''}">${_escapeHtml(req.fromName)}</span>
                <span class="friends-level-pill">Lv.${req.fromLevel || 1}</span>
              </div>
              <div class="friends-status-text">
                <span>친구 신청이 도착했습니다</span>
              </div>
            </div>
            <div class="friends-request-actions">
              <button type="button" class="btn btn-success btn-sm btn-friend-accept" data-from-key="${req.fromKey}">
                <i class="fa-solid fa-check"></i> 수락
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-friend-reject" data-from-key="${req.fromKey}">
                <i class="fa-solid fa-xmark"></i> 거절
              </button>
            </div>
          </div>
        `).join('');

        reqWrap.querySelectorAll('.btn-friend-accept').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const fromKey = btn.dataset.fromKey;
            const req = _receivedFriendRequests.find(r => r.fromKey === fromKey);
            if (req) _acceptFriendRequest(req);
          });
        });

        reqWrap.querySelectorAll('.btn-friend-reject').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const fromKey = btn.dataset.fromKey;
            const req = _receivedFriendRequests.find(r => r.fromKey === fromKey);
            if (req) _rejectFriendRequest(req);
          });
        });
      }
    }
  }

  /**
   * 친구 신청 발송 (전적 모달 등에서 호출)
   */
  async function _sendFriendRequest(targetUser) {
    if (!targetUser || !targetUser.name) return;
    const cleanName = targetUser.name.trim();

    if (cleanName === myNickname) {
      showToast('자기 자신에게는 친구 신청을 보낼 수 없습니다.', 'warn');
      return;
    }

    const targetKey = _getUserUniqueKey(targetUser);

    if (_friendsList.some(f => f.name === cleanName || (f.friendKey && f.friendKey === targetKey))) {
      showToast(`'${cleanName}'님은 이미 친구입니다.`, 'info');
      return;
    }

    if (_sentFriendRequests.includes(targetKey) || _sentFriendRequests.includes(cleanName)) {
      showToast(`'${cleanName}'님에게 이미 친구 신청을 보냈습니다.`, 'info');
      return;
    }

    const myKey = _getMyUserKey();
    let mySupabaseId = null;
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser && AppSupabase.getCurrentUser()) {
      mySupabaseId = AppSupabase.getCurrentUser().id;
    }

    const reqPayload = {
      fromKey: myKey,
      fromName: myNickname || '플레이어',
      fromAvatarIcon: myAvatarIcon || 'fa-solid fa-user',
      fromAvatarColor: myAvatarColor || '#38a169',
      fromLevel: myLevel || 1,
      fromProfileCard: myProfileCard || 'default',
      fromNameColor: myNicknameColor || null,
      fromSupabaseId: mySupabaseId,
      targetKey: targetKey,
      targetName: cleanName,
      timestamp: Date.now()
    };

    if (window.FirebaseLobby && typeof window.FirebaseLobby.sendFriendRequest === 'function') {
      const ok = await window.FirebaseLobby.sendFriendRequest(targetKey, cleanName, reqPayload);
      if (ok) {
        if (!_sentFriendRequests.includes(targetKey)) _sentFriendRequests.push(targetKey);
        if (!_sentFriendRequests.includes(cleanName)) _sentFriendRequests.push(cleanName);
        _saveSentFriendRequests();

        showToast(`'${cleanName}'님에게 친구 신청을 보냈습니다.`, 'success');
        _updateStatsModalFriendBtn(targetUser);
      } else {
        showToast('친구 신청 전송에 실패했습니다. 네트워크 상태를 확인해주세요.', 'error');
      }
    } else {
      showToast('Firebase 연결 상태를 확인해주세요.', 'warn');
    }
  }

  /**
   * 친구 신청 수락
   */
  async function _acceptFriendRequest(req) {
    if (!req) return;

    // 내 친구 목록에 추가
    if (!_friendsList.some(f => f.name === req.fromName || (f.friendKey && f.friendKey === req.fromKey))) {
      _friendsList.unshift({
        name: req.fromName,
        avatarIcon: req.fromAvatarIcon || 'fa-solid fa-user',
        avatarColor: req.fromAvatarColor || '#38a169',
        level: req.fromLevel || 1,
        profileCard: req.fromProfileCard || 'default',
        nameColor: req.fromNameColor || '',
        friendId: req.fromSupabaseId || null,
        friendKey: req.fromKey || null,
        addedAt: Date.now()
      });
      _saveFriendsToStorage();
    }

    // 상대방에게 수락 알림 전송
    if (window.FirebaseLobby && typeof window.FirebaseLobby.sendFriendAccept === 'function') {
      let mySupabaseId = null;
      if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser && AppSupabase.getCurrentUser()) {
        mySupabaseId = AppSupabase.getCurrentUser().id;
      }
      await window.FirebaseLobby.sendFriendAccept(req.fromKey, req.fromName, {
        fromKey: _getMyUserKey(),
        fromName: myNickname || '플레이어',
        fromAvatarIcon: myAvatarIcon || 'fa-solid fa-user',
        fromAvatarColor: myAvatarColor || '#38a169',
        fromLevel: myLevel || 1,
        fromProfileCard: myProfileCard || 'default',
        fromNameColor: myNicknameColor || null,
        fromSupabaseId: mySupabaseId,
        timestamp: Date.now()
      });
    }

    // Firebase 및 로컬에서 신청 제거
    if (window.FirebaseLobby && typeof window.FirebaseLobby.removeFriendRequest === 'function') {
      await window.FirebaseLobby.removeFriendRequest(_getMyUserKey(), myNickname, req.fromKey);
    }
    _receivedFriendRequests = _receivedFriendRequests.filter(r => r.fromKey !== req.fromKey);

    showToast(`'${req.fromName}'님의 친구 신청을 수락했습니다. 이제 친구입니다.`, 'success');
    _renderFriendsModalContent();

    if (_currentInspectedPlayer && _currentInspectedPlayer.name === req.fromName) {
      _updateStatsModalFriendBtn(_currentInspectedPlayer);
    }
  }

  /**
   * 친구 신청 거절
   */
  async function _rejectFriendRequest(req) {
    if (!req) return;

    if (window.FirebaseLobby && typeof window.FirebaseLobby.removeFriendRequest === 'function') {
      await window.FirebaseLobby.removeFriendRequest(_getMyUserKey(), myNickname, req.fromKey);
    }
    _receivedFriendRequests = _receivedFriendRequests.filter(r => r.fromKey !== req.fromKey);

    showToast(`'${req.fromName}'님의 친구 신청을 거절했습니다.`, 'info');
    _renderFriendsModalContent();
  }

  function _removeFriend(name) {
    const targetFriend = _friendsList.find(f => f.name === name);
    const targetKey = targetFriend?.friendKey || _getUserUniqueKey({ name });

    _friendsList = _friendsList.filter(f => f.name !== name);
    _saveFriendsToStorage();

    // 🌐 상대방에게 양방향 삭제 알림 전송 (상대방도 자동 삭제 처리)
    if (window.FirebaseLobby && typeof window.FirebaseLobby.sendFriendRemoval === 'function') {
      window.FirebaseLobby.sendFriendRemoval(targetKey, name, {
        fromKey: _getMyUserKey(),
        fromName: myNickname || '플레이어',
        timestamp: Date.now()
      });
    }

    if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.getCurrentUser === 'function') {
      const u = AppSupabase.getCurrentUser();
      if (u && typeof AppSupabase.removeFriend === 'function') {
        AppSupabase.removeFriend(u.id, name).catch(() => {});
      }
    }

    showToast(`'${name}'님을 친구 목록에서 삭제했습니다.`, 'info');
    _renderFriendsModalContent();

    if (_currentInspectedPlayer && _currentInspectedPlayer.name === name) {
      _updateStatsModalFriendBtn(_currentInspectedPlayer);
    }
  }

  function _inviteFriendToRoom(friendName) {
    if (!currentRoomCode || !screens.room || !screens.room.classList.contains('active')) {
      showToast('대기실에 입장한 상태에서만 친구를 초대할 수 있습니다.', 'warn');
      return;
    }

    const now = Date.now();
    if (_inviteCooldowns[friendName] && (now - _inviteCooldowns[friendName] < 10000)) {
      const remain = Math.ceil((10000 - (now - _inviteCooldowns[friendName])) / 1000);
      showToast(`잠시 후 다시 초대해주세요. (${remain}초 남음)`, 'info');
      return;
    }

    const payload = {
      fromName: myNickname || '플레이어',
      fromAvatarIcon: myAvatarIcon || 'fa-solid fa-user',
      fromAvatarColor: myAvatarColor || '#38a169',
      fromLevel: myLevel || 1,
      fromProfileCard: myProfileCard || 'default',
      roomCode: currentRoomCode,
      gameName: (GAMES[selectedGameKey] ? GAMES[selectedGameKey].title : '게임')
    };

    if (window.FirebaseLobby && typeof window.FirebaseLobby.sendRoomInvite === 'function') {
      _inviteCooldowns[friendName] = now;
      window.FirebaseLobby.sendRoomInvite(friendName, payload).then(ok => {
        if (ok) {
          showToast(`'${friendName}'님에게 방 초대를 보냈습니다.`, 'success');
        } else {
          showToast('초대장 전송에 실패했습니다.', 'error');
        }
      });
    } else {
      showToast('Firebase 연결 상태를 확인해주세요.', 'warn');
    }
  }

  function _handleReceivedRoomInvite(invite) {
    if (localStorage.getItem('arcade_dnd_mode') === 'true') return; // 초대 방해금지 모드
    if (!invite || !invite.roomCode) return;
    if (invite.fromName === myNickname) return;
    if (currentRoomCode && currentRoomCode === invite.roomCode) return;

    const popup = $('room-invite-popup');
    if (!popup) return;

    // 팝업 내용 채우기
    const avEl = $('rip-avatar');
    if (avEl) {
      avEl.style.background = invite.fromAvatarColor || '#38a169';
      avEl.innerHTML = `<i class="${invite.fromAvatarIcon || 'fa-solid fa-user'}"></i>`;
    }
    const lvlEl = $('rip-level');
    if (lvlEl) lvlEl.textContent = invite.fromLevel || 1;
    const nameEl = $('rip-sender-name');
    if (nameEl) nameEl.textContent = invite.fromName || '친구';
    const gameEl = $('rip-game-name');
    if (gameEl) gameEl.textContent = invite.gameName || '게임';
    const codeEl = $('rip-room-code');
    if (codeEl) codeEl.textContent = invite.roomCode;

    // 효과음 재생
    if (typeof Sound !== 'undefined' && typeof Sound.playWordSubmit === 'function') {
      try { Sound.playWordSubmit(); } catch (_) {}
    }

    // 버튼 바인딩
    const acceptBtn = $('rip-btn-accept');
    if (acceptBtn) {
      acceptBtn.onclick = () => {
        _hideRoomInvitePopup();
        if (window.FirebaseLobby && typeof window.FirebaseLobby.removeRoomInvite === 'function') {
          window.FirebaseLobby.removeRoomInvite(myNickname);
        }
        showToast(`${invite.fromName}님의 방(${invite.roomCode})으로 입장합니다.`, 'info');
        _startJoinRoom(invite.roomCode);
      };
    }

    const declineBtn = $('rip-btn-decline');
    if (declineBtn) {
      declineBtn.onclick = () => {
        _hideRoomInvitePopup();
        if (window.FirebaseLobby && typeof window.FirebaseLobby.removeRoomInvite === 'function') {
          window.FirebaseLobby.removeRoomInvite(myNickname);
        }
        showToast('초대를 거절했습니다.', 'info');
      };
    }

    popup.classList.remove('hidden');

    if (_activeInviteTimeout) clearTimeout(_activeInviteTimeout);
    _activeInviteTimeout = setTimeout(() => {
      _hideRoomInvitePopup();
    }, 15000);
  }

  function _hideRoomInvitePopup() {
    const popup = $('room-invite-popup');
    if (popup) popup.classList.add('hidden');
    if (_activeInviteTimeout) {
      clearTimeout(_activeInviteTimeout);
      _activeInviteTimeout = null;
    }
  }

  function _initFriendsSystem() {
    _loadFriendsFromStorage();
    _loadSentFriendRequests();

    // Supabase 사용자라면 DB 친구 목록도 비동기 로드하여 병합
    if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.onAuthStateChange === 'function') {
      AppSupabase.onAuthStateChange(async (event, session, user) => {
        if (user && typeof AppSupabase.getFriends === 'function') {
          try {
            const dbFriends = await AppSupabase.getFriends(user.id);
            if (Array.isArray(dbFriends)) {
              dbFriends.forEach(df => {
                if (!_friendsList.some(f => f.name === df.friend_name)) {
                  _friendsList.push({
                    name: df.friend_name,
                    avatarIcon: 'fa-solid fa-user',
                    avatarColor: '#38a169',
                    level: 1,
                    friendId: df.friend_id || null,
                    addedAt: Date.now()
                  });
                }
              });
              _saveFriendsToStorage();
            }
          } catch (_) {}
        }
      });
    }

    // 로비 상단 친구 버튼 클릭
    const btnOpen = $('btn-open-friends');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => _openFriendsModal('list'));
    }

    // 모달 닫기 버튼
    const btnClose = $('btn-close-friends');
    if (btnClose) {
      btnClose.addEventListener('click', _closeFriendsModal);
    }
    const modalFriends = $('modal-friends');
    if (modalFriends) {
      modalFriends.addEventListener('click', (e) => {
        if (e.target === modalFriends) _closeFriendsModal();
      });
    }

    // 탭 전환
    const tabList = $('tab-friends-list');
    if (tabList) tabList.addEventListener('click', () => _switchFriendsTab('list'));
    const tabReqs = $('tab-friends-requests');
    if (tabReqs) tabReqs.addEventListener('click', () => _switchFriendsTab('requests'));

    // 친구 검색창 이벤트
    const searchInput = $('input-search-friends');
    const clearBtn = $('btn-clear-friend-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        _friendsSearchQuery = e.target.value;
        if (clearBtn) clearBtn.classList.toggle('hidden', !_friendsSearchQuery);
        _renderFriendsModalContent();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        _friendsSearchQuery = '';
        clearBtn.classList.add('hidden');
        _renderFriendsModalContent();
        if (searchInput) searchInput.focus();
      });
    }

    // Firebase 실시간 리스너 등록 (초대, 친구 신청, 친구 수락, 친구 삭제)
    const _setupFirebaseFriendListeners = () => {
      if (!window.FirebaseLobby) return;

      // 1) 방 초대 리스너
      if (typeof window.FirebaseLobby.onRoomInvite === 'function') {
        window.FirebaseLobby.onRoomInvite(myNickname, (inviteData) => {
          if (inviteData) {
            _handleReceivedRoomInvite(inviteData);
          }
        });
      }

      // 2) 친구 신청 수신 리스너
      if (typeof window.FirebaseLobby.onFriendRequests === 'function') {
        const myKey = _getMyUserKey();
        window.FirebaseLobby.onFriendRequests(myKey, myNickname, (requests) => {
          const prevCount = _receivedFriendRequests.length;
          _receivedFriendRequests = requests || [];
          _updateFriendsBadge();

          // 새 신청이 들어온 경우 알림
          if (_receivedFriendRequests.length > prevCount) {
            const latest = _receivedFriendRequests[_receivedFriendRequests.length - 1];
            if (latest && latest.fromName) {
              if (typeof Sound !== 'undefined' && typeof Sound.playWordSubmit === 'function') {
                try { Sound.playWordSubmit(); } catch (_) {}
              }
              showToast(`'${latest.fromName}'님으로부터 친구 신청이 도착했습니다.`, 'info');
            }
          }

          const paneReqs = $('pane-friends-requests');
          if (paneReqs && paneReqs.classList.contains('active')) {
            _renderFriendsModalContent();
          }
        });
      }

      // 3) 친구 수락 수신 리스너 (상대방이 내 신청을 수락했을 때)
      if (typeof window.FirebaseLobby.onFriendAccepts === 'function') {
        const myKey = _getMyUserKey();
        window.FirebaseLobby.onFriendAccepts(myKey, myNickname, (acceptData) => {
          if (!acceptData || !acceptData.fromName) return;
          const friendKey = acceptData.fromKey;
          const friendName = acceptData.fromName;

          // 보낸 신청 기록에서 제거
          _sentFriendRequests = _sentFriendRequests.filter(k => k !== friendKey && k !== friendName);
          _saveSentFriendRequests();

          // 내 친구 목록에 추가
          if (!_friendsList.some(f => f.name === friendName || (f.friendKey && f.friendKey === friendKey))) {
            _friendsList.unshift({
              name: friendName,
              avatarIcon: acceptData.fromAvatarIcon || 'fa-solid fa-user',
              avatarColor: acceptData.fromAvatarColor || '#38a169',
              level: acceptData.fromLevel || 1,
              profileCard: acceptData.fromProfileCard || 'default',
              nameColor: acceptData.fromNameColor || '',
              friendId: acceptData.fromSupabaseId || null,
              friendKey: friendKey,
              addedAt: Date.now()
            });
            _saveFriendsToStorage();

            if (typeof Sound !== 'undefined' && typeof Sound.playWinSound === 'function') {
              try { Sound.playWinSound(); } catch (_) {}
            }
            showToast(`'${friendName}'님이 친구 신청을 수락했습니다. 이제 친구입니다.`, 'success');
            _renderFriendsModalContent();

            if (_currentInspectedPlayer && _currentInspectedPlayer.name === friendName) {
              _updateStatsModalFriendBtn(_currentInspectedPlayer);
            }
          }

          // 통보 데이터 정리
          if (typeof window.FirebaseLobby.removeFriendAccept === 'function') {
            window.FirebaseLobby.removeFriendAccept(_getMyUserKey(), myNickname, friendKey);
          }
        });
      }

      // 4) 친구 삭제 수신 리스너 (상대방이 나를 친구에서 삭제했을 때 양방향 자동 삭제)
      if (typeof window.FirebaseLobby.onFriendRemovals === 'function') {
        const myKey = _getMyUserKey();
        window.FirebaseLobby.onFriendRemovals(myKey, myNickname, (removalData) => {
          if (!removalData || (!removalData.fromName && !removalData.fromKey)) return;
          const friendKey = removalData.fromKey;
          const friendName = removalData.fromName;

          const exists = _friendsList.some(f => 
            (friendName && f.name === friendName) || 
            (friendKey && f.friendKey === friendKey)
          );

          if (exists) {
            _friendsList = _friendsList.filter(f => 
              !(friendName && f.name === friendName) && 
              !(friendKey && f.friendKey === friendKey)
            );
            _saveFriendsToStorage();
            _renderFriendsModalContent();

            if (_currentInspectedPlayer && (_currentInspectedPlayer.name === friendName)) {
              _updateStatsModalFriendBtn(_currentInspectedPlayer);
            }
          }

          // 통보 데이터 정리
          if (typeof window.FirebaseLobby.removeFriendRemoval === 'function') {
            window.FirebaseLobby.removeFriendRemoval(_getMyUserKey(), myNickname, friendKey);
          }
        });
      }
    };

    if (window.FirebaseLobby && typeof window.FirebaseLobby.onRoomInvite === 'function') {
      _setupFirebaseFriendListeners();
    } else {
      window.addEventListener('firebase-ready', () => {
        _setupFirebaseFriendListeners();
      }, { once: true });
    }
  }

  /**
   * 보낸 친구 신청 취소
   */
  async function _cancelFriendRequest(targetUser) {
    if (!targetUser || !targetUser.name) return;
    const cleanName = targetUser.name.trim();
    const targetKey = _getUserUniqueKey(targetUser);
    const myKey = _getMyUserKey();

    if (window.FirebaseLobby && typeof window.FirebaseLobby.cancelFriendRequest === 'function') {
      await window.FirebaseLobby.cancelFriendRequest(targetKey, cleanName, myKey);
    }

    _sentFriendRequests = _sentFriendRequests.filter(k => k !== targetKey && k !== cleanName);
    _saveSentFriendRequests();

    showToast(`'${cleanName}'님에게 보낸 친구 신청을 취소했습니다.`, 'info');
    _updateStatsModalFriendBtn(targetUser);
  }

  /* ── 💬 로비 전체 실시간 채팅방 ── */
  function _initLobbyChat() {
    const form = $('lobby-chat-form');
    const input = $('lobby-chat-input');
    const messagesContainer = $('lobby-chat-messages');
    if (!form || !input || !messagesContainer) return;

    if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.initLobbyChat === 'function') {
      AppSupabase.initLobbyChat((msg) => {
        _appendLobbyChatMessage(msg, false);
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const rawText = input.value ? input.value.trim() : '';
      if (!rawText) return;

      const text = rawText.slice(0, 80);
      input.value = '';

      let myKey = null;
      try { myKey = sessionStorage.getItem('gachi_presence_key'); } catch (_) {}
      if (!myKey) myKey = 'usr_' + Math.random().toString(36).substring(2, 8);

      const msgPayload = {
        id: 'lchat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: myNickname || '플레이어',
        nameColor: myNicknameColor || null,
        avatarIcon: myAvatarIcon || 'fa-solid fa-dog',
        avatarColor: myAvatarColor || '#38a169',
        avatarFrame: myAvatarFrame || 'default',
        chatBubble: myChatBubble || 'default',
        level: myLevel || 1,
        text: text,
        senderKey: myKey,
        timestamp: Date.now()
      };

      // 보낸 즉시 로컬 화면에 표시
      _appendLobbyChatMessage(msgPayload, true);

      // 모바일 채팅 뱃지 해제
      const badge = $('lobby-mobile-chat-badge');
      if (badge) badge.classList.add('hidden');

      // Supabase Broadcast로 접속 중인 모든 사용자에게 전송
      if (typeof AppSupabase !== 'undefined' && typeof AppSupabase.sendLobbyChatMessage === 'function') {
        AppSupabase.sendLobbyChatMessage(msgPayload);
      }
    });

    // ── 📱 모바일 로비 채팅 팝업 바텀시트 제어 ──
    function _openLobbyMobileChat() {
      _pushHistory({ modal: 'lobby_chat' }, '#lobby_chat');
      const chatCard = $('lobby-chat-card');
      const backdrop = $('lobby-mobile-chat-backdrop');
      const badge = $('lobby-mobile-chat-badge');
      if (chatCard) chatCard.classList.add('mobile-open');
      if (backdrop) backdrop.classList.remove('hidden');
      if (badge) badge.classList.add('hidden');
      const input = $('lobby-chat-input');
      if (input) setTimeout(() => input.focus(), 150);
    }

    function _closeLobbyMobileChat() {
      if (_backHistoryIfModal('lobby_chat')) return;
      const chatCard = $('lobby-chat-card');
      const backdrop = $('lobby-mobile-chat-backdrop');
      if (chatCard) chatCard.classList.remove('mobile-open');
      if (backdrop) backdrop.classList.add('hidden');
    }

    if ($('btn-lobby-mobile-chat-toggle')) $('btn-lobby-mobile-chat-toggle').addEventListener('click', _openLobbyMobileChat);
    if ($('btn-close-lobby-mobile-chat')) $('btn-close-lobby-mobile-chat').addEventListener('click', _closeLobbyMobileChat);
    if ($('lobby-mobile-chat-backdrop')) $('lobby-mobile-chat-backdrop').addEventListener('click', _closeLobbyMobileChat);
  }

  function _appendLobbyChatMessage(msg, isLocal) {
    const box = $('lobby-chat-messages');
    if (!box || !msg || !msg.text) return;

    // 첫 메시지 전송 시 환영 메시지 안내 제거
    const welcomeEl = box.querySelector('.lobby-chat-welcome');
    if (welcomeEl) {
      welcomeEl.remove();
    }

    let myKey = null;
    try { myKey = sessionStorage.getItem('gachi_presence_key'); } catch (_) {}
    const isMe = isLocal || (myKey && msg.senderKey === myKey) || (msg.name === myNickname);

    // 모바일에서 채팅창이 닫혀 있을 때 새 메시지 뱃지 표시
    if (window.innerWidth <= 960 && !isMe) {
      const chatCard = $('lobby-chat-card');
      if (chatCard && !chatCard.classList.contains('mobile-open')) {
        const badge = $('lobby-mobile-chat-badge');
        if (badge) badge.classList.remove('hidden');
      }
    }

    const uname = msg.name || '플레이어';
    const unameColor = isMe ? myNicknameColor : (msg.nameColor || '');
    const uicon = isMe ? myAvatarIcon : (msg.avatarIcon || 'fa-solid fa-dog');
    const ucolor = isMe ? myAvatarColor : (msg.avatarColor || '#38a169');
    const ulevel = isMe ? myLevel : (typeof msg.level === 'number' ? msg.level : 1);
    const tierClass = _getLevelTierClass(ulevel);
    const textSafe = _escapeHtml(msg.text);

    const uframe = isMe ? myAvatarFrame : (msg.avatarFrame || 'default');
    const frameClass = _getAvatarFrameClass(uframe);

    const msgEl = document.createElement('div');
    msgEl.className = `lobby-chat-msg ${isMe ? 'is-me' : ''}`;
    msgEl.innerHTML = `
      <span class="lobby-chat-prefix">
        <span class="lobby-chat-bracket">[</span><span class="lobby-chat-avatar ${frameClass}" style="background: ${ucolor};"><i class="${uicon}"></i></span><span class="lobby-chat-lvl ${tierClass}">${ulevel}</span><span class="lobby-chat-name ${unameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${unameColor && unameColor !== 'rainbow' ? `color:${unameColor}; font-weight:800;` : ''}" title="${_escapeHtml(uname)}님의 전적 보기">${_escapeHtml(uname)}</span><span class="lobby-chat-bracket">]</span>
      </span>
      <span class="lobby-chat-colon">:</span>
      <span class="lobby-chat-text">${textSafe}</span>
    `;

    // 닉네임 클릭 시 해당 플레이어 전적 모달 열기
    const nameEl = msgEl.querySelector('.lobby-chat-name');
    if (nameEl) {
      nameEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isMe) {
          _openPlayerStatsModal();
        } else {
          _openPlayerStatsModal({
            name: uname,
            avatarIcon: uicon,
            avatarColor: ucolor,
            level: ulevel
          });
        }
      });
    }

    box.appendChild(msgEl);

    // 메시지 최대 150개 유지
    while (box.children.length > 150) {
      box.removeChild(box.firstChild);
    }

    // 새 메시지 시 하단으로 자동 스크롤
    box.scrollTop = box.scrollHeight;
  }

  /* ── 👑 참가자 프로필 & 방장 관리 드롭다운 (전적 보기 / 강퇴) ── */
  function _openPlayerActionMenu(e, targetPlayer) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!targetPlayer) return;

    const myId = P2P.getMyId();
    const amIHost = P2P.isHost() || isHostPlayer;
    const isMe = (targetPlayer.id === myId) || (targetPlayer.isHost && amIHost);

    // 만약 나 자신을 클릭한 경우 내 전적 모달 바로 오픈
    if (isMe) {
      _openPlayerStatsModal();
      return;
    }

    selectedTargetPlayer = targetPlayer;
    const dropdown = $('host-action-dropdown');
    const nameEl = $('host-action-target-name');
    const btnKick = $('btn-host-kick');
    const btnStats = $('btn-host-view-stats');
    if (!dropdown || !nameEl) return;

    nameEl.textContent = `${targetPlayer.name}님`;

    // 강퇴 및 방장 위임 버튼은 오직 방장이고, 대상이 방장이 아닐 때만 표시
    const canManageTarget = amIHost && !targetPlayer.isHost;
    if (btnKick) {
      btnKick.style.display = canManageTarget ? 'flex' : 'none';
    }
    const btnTransfer = $('btn-host-transfer');
    if (btnTransfer) {
      btnTransfer.style.display = canManageTarget ? 'flex' : 'none';
    }

    dropdown.classList.remove('hidden');

    // 마우스/클릭 타겟 위치 기반 최적 포지셔닝
    const targetEl = e.currentTarget || e.target;
    const rect = targetEl.getBoundingClientRect();
    const dropdownWidth = 160;
    const dropdownHeight = canManageTarget ? 145 : 75;

    let left = rect.right - dropdownWidth;
    let top = rect.bottom + 6;

    if (left < 10) left = 10;
    if (left + dropdownWidth > window.innerWidth - 10) left = window.innerWidth - dropdownWidth - 10;
    if (top + dropdownHeight > window.innerHeight - 10) top = rect.top - dropdownHeight - 6;

    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
  }

  // 기존 호환성 유지 alias
  const _openHostActionMenu = _openPlayerActionMenu;

  function _closeHostActionMenu() {
    const dropdown = $('host-action-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    selectedTargetPlayer = null;
  }

  // 드롭다운 바깥 클릭 또는 ESC 키 입력 시 닫기
  document.addEventListener('click', (e) => {
    const dropdown = $('host-action-dropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      if (!dropdown.contains(e.target)) {
        _closeHostActionMenu();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      _closeHostActionMenu();
    }
  });

  window.addEventListener('resize', _closeHostActionMenu);
  window.addEventListener('scroll', _closeHostActionMenu, true);

  // [전적 보기] 버튼 클릭
  if ($('btn-host-view-stats')) {
    $('btn-host-view-stats').addEventListener('click', () => {
      const target = selectedTargetPlayer;
      _closeHostActionMenu();
      if (target) {
        _openPlayerStatsModal(target);
      }
    });
  }

  // [강퇴하기] 버튼 클릭
  if ($('btn-host-kick')) {
    $('btn-host-kick').addEventListener('click', async () => {
      if (!P2P.isHost() || !selectedTargetPlayer) return;
      const target = selectedTargetPlayer;
      _closeHostActionMenu();

      const ok = await showConfirmDialog({
        title: '참가자 강퇴',
        message: `${target.name}님을 정말 강퇴하시겠습니까?`,
        confirmText: '강퇴',
        cancelText: '취소',
        icon: 'fa-solid fa-user-xmark',
        isDanger: true
      });
      if (ok) {
        // 대상 게스트에게 KICK 패킷 전송
        P2P.send({
          type: 'KICK',
          targetId: target.id,
          reason: '방장에 의해 강퇴되었습니다.'
        }, target.id);

        // P2P 연결 강제 종료
        if (typeof P2P.kickGuest === 'function') {
          P2P.kickGuest(target.id);
        }

        // 방장 측 로컬 퇴장 처리
        _onHostGuestLeave(target.id);
        showToast(`${target.name}님을 강퇴했습니다.`, 'warn');
      }
    });
  }

  // [방장 위임] 버튼 클릭
  if ($('btn-host-transfer')) {
    $('btn-host-transfer').addEventListener('click', async () => {
      const amIHost = P2P.isHost() || isHostPlayer;
      if (!amIHost || !selectedTargetPlayer) return;
      const target = selectedTargetPlayer;
      _closeHostActionMenu();

      const ok = await showConfirmDialog({
        title: '방장 위임',
        message: `${target.name}님에게 방장을 위임하시겠습니까?`,
        confirmText: '위임',
        cancelText: '취소',
        icon: 'fa-solid fa-crown',
        isDanger: false
      });
      if (ok) {
        _transferHostToPlayer(target);
      }
    });
  }

  /* =====================================================================
     방장 위임 및 자동 승격/인계 로직
     ===================================================================== */
  function _reorderRoomPlayersWithHostFirst() {
    roomPlayers.sort((a, b) => {
      if (a.isHost && !b.isHost) return -1;
      if (!a.isHost && b.isHost) return 1;
      return 0;
    });
  }

  async function _transferHostToPlayer(target) {
    if (!selectedTargetPlayer && !target) return;
    const targetPlayer = target || selectedTargetPlayer;
    const targetId = targetPlayer.id;
    const targetName = targetPlayer.name;
    const roomCode = currentRoomCode;

    if (!roomPlayers.some(p => p.id === targetId || p.name === targetName)) {
      showToast('해당 참가자가 이미 퇴장했습니다.', 'warn');
      return;
    }

    console.log('[Host] 방장 위임 절차 개시 ->', targetName, targetId, roomCode);
    _isMigratingHost = true;

    // 1. Firebase에서 구 방장의 onDisconnect 방 삭제 훅 해제
    if (window.FirebaseLobby && typeof window.FirebaseLobby.cancelRoomOnDisconnect === 'function') {
      try {
        await window.FirebaseLobby.cancelRoomOnDisconnect(roomCode);
      } catch (e) {
        console.warn('[Host] cancelRoomOnDisconnect 경고:', e);
      }
    }

    // 2. 인게임 중이었다면 게임 모듈 종료 및 대기실 상태로 초기화
    if (currentGameModule) {
      try { currentGameModule.destroy(); } catch (_) {}
      currentGameModule = null;
    }
    if ($('game-content')) $('game-content').innerHTML = '';
    const overlayCount = $('overlay-countdown');
    if (overlayCount) overlayCount.classList.add('hidden');
    const overlayRes = $('overlay-game-result');
    if (overlayRes) overlayRes.classList.add('hidden');
    isRoomGameActive = false;
    activeGamePlayers = [];

    // 3. 모든 참가자들에게 방장 위임 패킷 전송
    try {
      P2P.send({
        type: 'DELEGATE_HOST',
        targetHostId: targetId,
        targetHostName: targetName,
        roomCode: roomCode,
        oldHostLeft: false,
        oldHostId: P2P.getMyId(),
        oldHostName: myNickname
      });
    } catch (e) {
      console.error('[Host] DELEGATE_HOST 전송 실패:', e);
    }

    // 4. 구 방장: 호스트 연결 종료 후 일반 게스트로 재접속 준비
    showToast(`${targetName}님에게 방장을 위임했습니다. 게스트로 재접속 중...`, 'info');
    _appendChatMessage({ isSystem: true, text: `👑 ${myNickname}님이 ${targetName}님에게 방장을 위임했습니다.` });

    P2P.destroy();
    isHostPlayer = false;
    isMyReady = false;

    // roomPlayers 내 방장 권한 인계 반영
    roomPlayers.forEach(p => {
      if (p.id === targetId || p.name === targetName) {
        p.isHost = true;
        p.isReady = true;
      } else {
        p.isHost = false;
        p.isReady = false;
      }
    });
    _reorderRoomPlayersWithHostFirst();
    _enterRoomScreen(false);

    // 새 방장이 PeerJS 호스트를 선점할 시간 대기 후 게스트로 재접속
    setTimeout(() => {
      _reconnectAsGuest(roomCode, targetName);
    }, 1000);
  }

  async function _promoteToHost(roomCode, oldHostLeft = false, oldHostInfo = null) {
    showLoading('방장 권한을 인계받아 방을 설정하는 중입니다...');
    _isMigratingHost = true;
    isHostPlayer = true;
    isMyReady = true;

    try {
      // 1. 인게임 정리
      if (currentGameModule) {
        try { currentGameModule.destroy(); } catch (_) {}
        currentGameModule = null;
      }
      if ($('game-content')) $('game-content').innerHTML = '';
      const overlayCount = $('overlay-countdown');
      if (overlayCount) overlayCount.classList.add('hidden');
      const overlayRes = $('overlay-game-result');
      if (overlayRes) overlayRes.classList.add('hidden');
      isRoomGameActive = false;
      activeGamePlayers = [];

      // 2. roomPlayers 정리 (구 방장 퇴장 시 제거, 잔류 시 게스트로 변경)
      if (oldHostLeft) {
        roomPlayers = roomPlayers.filter(p => !p.isHost && (oldHostInfo ? (p.name !== oldHostInfo.name && p.id !== oldHostInfo.id) : true));
      } else {
        roomPlayers.forEach(p => {
          if (p.isHost) {
            p.isHost = false;
            p.isReady = false;
          }
        });
      }

      // 3. 기존 방 코드로 호스트 선점 (unavailable-id 재시도 백오프 내장)
      currentRoomCode = await P2P.host(
        _onHostGuestJoin,
        _onHostGuestLeave,
        roomCode
      );

      // 4. 내 플레이어 엔트리를 방장으로 설정
      const myPeerId = P2P.getMyId();
      let myEntry = roomPlayers.find(p => p.name === myNickname);
      if (myEntry) {
        myEntry.id = myPeerId;
        myEntry.isHost = true;
        myEntry.isReady = true;
      } else {
        myEntry = {
          id: myPeerId,
          name: myNickname || '익명',
          nameColor: myNicknameColor || null,
          profileCard: myProfileCard || 'default',
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          exp: myExp,
          isHost: true,
          isReady: true,
          stats: _getMyStats()
        };
        roomPlayers.unshift(myEntry);
      }

      _reorderRoomPlayersWithHostFirst();

      // 5. 호스트 리스너 재등록
      P2P.onMessage(_onHostReceiveMessage);
      P2P.onDisconnect(_onHostDisconnect);

      // 6. Firebase 방 소유권 등록
      if (window.FirebaseLobby && typeof window.FirebaseLobby.claimRoomHost === 'function') {
        await window.FirebaseLobby.claimRoomHost(currentRoomCode, {
          name: myNickname,
          peerId: myPeerId,
          nameColor: myNicknameColor,
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          profileCard: myProfileCard
        });
      }

      hideLoading();
      _isMigratingHost = false;

      _enterRoomScreen(false);
      _broadcastRoomState();
      _updateRoomUI();

      showToast(`👑 방장이 되었습니다! (방 코드: ${currentRoomCode})`, 'success');
      _appendChatMessage({ isSystem: true, text: `👑 ${myNickname}님이 새로운 방장이 되었습니다!` });

    } catch (err) {
      hideLoading();
      _isMigratingHost = false;
      console.error('[Host] 방장 승격 실패:', err);
      showToast('방장 권한 인계에 실패하여 방이 종료됩니다: ' + (err.message || '오류'), 'error');
      _leaveRoom(true);
    }
  }

  async function _reconnectAsGuest(roomCode, newHostName) {
    showLoading(`새 방장(${newHostName || '방장'})에게 연결하는 중...`);
    _isMigratingHost = true;

    try {
      P2P.onMessage(_onGuestReceiveMessage);
      P2P.onDisconnect(_onGuestDisconnect);

      await P2P.join(roomCode);

      hideLoading();
      _isMigratingHost = false;

      isHostPlayer = false;
      isMyReady = false;

      P2P.send({
        type: 'guest_hello',
        id: P2P.getMyId(),
        name: myNickname || '익명',
        nameColor: myNicknameColor || null,
        profileCard: myProfileCard || 'default',
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        avatarFrame: myAvatarFrame || 'default',
        chatBubble: myChatBubble || 'default',
        victoryEffect: myVictoryEffect || 'default',
        level: myLevel,
        exp: myExp,
        password: currentRoomPassword || '',
        stats: _getMyStats()
      });

      _enterRoomScreen(false);
      showToast(`새 방장(${newHostName || '방장'})의 방에 정상 연결되었습니다.`, 'success');

    } catch (err) {
      hideLoading();
      _isMigratingHost = false;
      console.error('[Guest] 새 방장 재연결 실패:', err);
      showToast('새 방장과의 연결에 실패하여 로비로 이동합니다.', 'error');
      _leaveRoom(true);
    }
  }


  document.querySelectorAll('.sidebar-game-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-game-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const gameKey = item.dataset.game;
      if (gameKey && GAMES[gameKey]) {
        selectedGameKey = gameKey;
      }
      if (gameKey === 'minecraft') {
        _openMinecraftGuide();
      }
    });
  });

  /* ── ⛏️ 마인크래프트 1.12.2 (Eaglercraft) 새 탭 실행 컨트롤러 ── */
  const EAGLERCRAFT_URL = './eaglercraft_1.12.2.html';

  function _launchMinecraft() {
    // 🌟 최상의 3D 캔버스 성능, 마우스 360도 포인터 락 및 키보드 조작을 위해 독립 새 탭에서 실행
    const newWindow = window.open(EAGLERCRAFT_URL, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // 팝업 차단 발생 시 대체 이동
      window.location.href = EAGLERCRAFT_URL;
    }
  }

  // P2P LAN 멀티플레이 가이드 모달
  function _openMinecraftGuide() {
    if ($('overlay-mc-guide')) $('overlay-mc-guide').classList.remove('hidden');
  }
  function _closeMinecraftGuide() {
    if ($('overlay-mc-guide')) $('overlay-mc-guide').classList.add('hidden');
  }

  // 마인크래프트 버튼 리스너들
  if ($('btn-launch-minecraft')) $('btn-launch-minecraft').addEventListener('click', _launchMinecraft);
  if ($('btn-preview-mc-guide')) $('btn-preview-mc-guide').addEventListener('click', _openMinecraftGuide);
  if ($('btn-open-mc-guide')) $('btn-open-mc-guide').addEventListener('click', _openMinecraftGuide);
  if ($('btn-close-mc-guide')) $('btn-close-mc-guide').addEventListener('click', _closeMinecraftGuide);
  if ($('btn-confirm-mc-guide')) $('btn-confirm-mc-guide').addEventListener('click', _closeMinecraftGuide);
  if ($('overlay-mc-guide')) {
    $('overlay-mc-guide').addEventListener('click', (e) => {
      if (e.target === $('overlay-mc-guide')) _closeMinecraftGuide();
    });
  }
  function _closeMinecraftGuide() {
    if ($('overlay-mc-guide')) $('overlay-mc-guide').classList.add('hidden');
  }

  if ($('btn-open-mc-guide')) $('btn-open-mc-guide').addEventListener('click', _openMinecraftGuide);
  if ($('btn-close-mc-guide')) $('btn-close-mc-guide').addEventListener('click', _closeMinecraftGuide);
  if ($('btn-confirm-mc-guide')) $('btn-confirm-mc-guide').addEventListener('click', _closeMinecraftGuide);
  if ($('overlay-mc-guide')) {
    $('overlay-mc-guide').addEventListener('click', (e) => {
      if (e.target === $('overlay-mc-guide')) _closeMinecraftGuide();
    });
  }

  // 홈 화면 탭 전환
  $('tab-create').addEventListener('click', () => {
    Sound.playClick();
    $('tab-create').classList.add('active');
    $('tab-join').classList.remove('active');
    $('panel-create').classList.add('active');
    $('panel-join').classList.remove('active');
  });

  $('tab-join').addEventListener('click', () => {
    Sound.playClick();
    $('tab-join').classList.add('active');
    $('tab-create').classList.remove('active');
    $('panel-join').classList.add('active');
    $('panel-create').classList.remove('active');
    setTimeout(() => $('input-room-code').focus(), 50);
  });

  // 4자리 숫자 전용 입력 (공백 및 특수문자 완전 제거 & trim)
  $('input-room-code').addEventListener('input', (e) => {
    e.target.value = (e.target.value || '').replace(/\s+/g, '').replace(/\D/g, '').slice(0, 4);
  });
  $('input-room-code').addEventListener('paste', (e) => {
    setTimeout(() => {
      if ($('input-room-code')) {
        $('input-room-code').value = ($('input-room-code').value || '').replace(/\s+/g, '').replace(/\D/g, '').slice(0, 4);
      }
    }, 0);
  });

  /* =====================================================================
     🐾 프로필 편집 말풍선 팝업 컨트롤러 (동물 아이콘 + 색상 + 닉네임)
     ===================================================================== */
  let _tempSelectedIcon = myAvatarIcon;
  let _tempSelectedColor = myAvatarColor;

  function _openProfileModal() {
    const popup = $('profile-bubble-popup');
    if (!popup) return;

    // 이미 열려있으면 히스토리 push 없이 바로 닫기 (두 번 클릭 문제 방지)
    if (popup.classList.contains('active')) {
      _closeProfileModal(true);
      return;
    }

    _pushHistory({ modal: 'profile' }, '#profile');

    _tempSelectedIcon = myAvatarIcon;
    _tempSelectedColor = myAvatarColor;

    if ($('profile-input-nick')) {
      $('profile-input-nick').value = myNickname || '익명';
    }

    _renderProfileModalGrids();
    _updateProfileModalPreview();
    _updateCoinsUI();
    _updateLevelUI();
    if (typeof _updateProfileAuthUI === 'function') {
      _updateProfileAuthUI(typeof AppSupabase !== 'undefined' ? AppSupabase.getCurrentUser() : null);
    }

    // 🌟 위치 계산 (프로필 편집 버튼 기준 스마트 말풍선 배치)
    const btn = $('btn-change-nickname') || $('home-user-avatar');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const isMobile = window.innerWidth <= 1024;
      if (isMobile) {
        popup.style.left = '50%';
        popup.style.top = Math.max(10, rect.bottom + 8) + 'px';
        popup.style.transform = 'translateX(-50%)';
      } else {
        popup.style.left = Math.min(window.innerWidth - 340, rect.right + 14) + 'px';
        popup.style.top = Math.max(16, rect.top - 30) + 'px';
        popup.style.transform = 'none';
      }
    }

    popup.classList.remove('hidden');
    popup.classList.add('active');

    setTimeout(() => {
      if ($('profile-input-nick')) $('profile-input-nick').focus();
    }, 50);
  }

  function _closeProfileModal(skipHistory = false) {
    if (!skipHistory && _backHistoryIfModal('profile')) return;
    const popup = $('profile-bubble-popup');
    if (popup) {
      popup.classList.add('hidden');
      popup.classList.remove('active');
    }
  }

  function _updateProfileModalPreview() {
    const previewArea = document.querySelector('.profile-preview-area');
    if (previewArea) _applyProfileCardTheme(previewArea, myProfileCard);

    const previewAvatar = $('profile-preview-avatar');
    const previewIcon = $('profile-preview-icon');
    const previewName = $('profile-preview-name');
    const nickVal = ($('profile-input-nick') ? $('profile-input-nick').value.trim() : '') || myNickname || '익명';

    if (previewAvatar) {
      previewAvatar.style.background = _tempSelectedColor;
      if (typeof _applyAvatarFrame === 'function') _applyAvatarFrame(previewAvatar, myAvatarFrame);
    }
    if (previewIcon) previewIcon.className = _tempSelectedIcon;
    if (previewName) {
      previewName.textContent = nickVal;
      if (myNicknameColor === 'rainbow') {
        previewName.classList.add('nickname-rainbow');
        previewName.style.color = '';
        previewName.style.fontWeight = '900';
      } else {
        previewName.classList.remove('nickname-rainbow');
        previewName.style.color = myNicknameColor || '';
        previewName.style.fontWeight = myNicknameColor ? '800' : '';
      }
    }
  }

  function _renderProfileModalGrids() {
    // 1. 동물 아이콘 그리드
    const iconGrid = $('avatar-icon-grid');
    if (iconGrid) {
      iconGrid.innerHTML = '';
      AVATAR_ICONS.forEach(iconClass => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'avatar-icon-btn' + (iconClass === _tempSelectedIcon ? ' active' : '');
        btn.innerHTML = `<i class="${iconClass}"></i>`;
        btn.addEventListener('click', () => {
          _tempSelectedIcon = iconClass;
          iconGrid.querySelectorAll('.avatar-icon-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          _updateProfileModalPreview();
        });
        iconGrid.appendChild(btn);
      });
    }

    // 2. 배경 색상 그리드
    const colorGrid = $('avatar-color-grid');
    if (colorGrid) {
      colorGrid.innerHTML = '';
      AVATAR_COLORS.forEach(c => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'avatar-color-btn' + (c === _tempSelectedColor ? ' active' : '');
        btn.style.background = c;
        btn.addEventListener('click', () => {
          _tempSelectedColor = c;
          colorGrid.querySelectorAll('.avatar-color-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          _updateProfileModalPreview();
        });
        colorGrid.appendChild(btn);
      });
    }
  }

  function _handleSaveProfile() {
    let val = $('profile-input-nick') ? $('profile-input-nick').value.trim() : '';
    if (!val) val = '익명';
    myNickname = val.slice(0, 6);
    myAvatarIcon = _tempSelectedIcon || 'fa-solid fa-dog';
    myAvatarColor = _tempSelectedColor || '#38a169';

    localStorage.setItem('arcade_nick', myNickname);
    localStorage.setItem('arcade_avatar_icon', myAvatarIcon);
    localStorage.setItem('arcade_avatar_color', myAvatarColor);

    _updateHomeUserBar();

    // 🌟 Supabase 로그인 상태라면 클라우드에도 저장
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      const user = AppSupabase.getCurrentUser();
      AppSupabase.saveProfile(user.id, {
        nickname: myNickname,
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor
      }).catch(() => {});
    }

    // 현재 방에 참여 중이라면 방 참가자 정보도 즉시 동기화
    if (currentRoomCode && roomPlayers.length > 0) {
      const myId = P2P.getMyId();
      const me = roomPlayers.find(p => p.id === myId || (p.isHost && isHostPlayer));
      if (me) {
        me.name = myNickname;
        me.nameColor = myNicknameColor || null;
        me.profileCard = myProfileCard || 'default';
        me.avatarIcon = myAvatarIcon;
        me.avatarColor = myAvatarColor;
        me.level = myLevel;
        me.exp = myExp;
        me.stats = _getMyStats();
      }
      _updateRoomUI();
      if (isHostPlayer) {
        _broadcastRoomState();
      } else {
        P2P.send({
          type: 'guest_update_profile',
          name: myNickname,
          nameColor: myNicknameColor || null,
          profileCard: myProfileCard || 'default',
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          exp: myExp,
          stats: _getMyStats()
        });
      }
    }

    _closeProfileModal();
    showToast('프로필이 저장되었습니다.', 'success');
  }

  function _handleRandomizeProfile() {
    _tempSelectedIcon = _getRandomAvatarIcon();
    _tempSelectedColor = _getRandomAvatarColor();
    _renderProfileModalGrids();
    _updateProfileModalPreview();
  }

  // 프로필 모달 이벤트 연결
  if ($('btn-change-nickname')) $('btn-change-nickname').addEventListener('click', (e) => {
    e.stopPropagation();
    _openProfileModal();
  });
  if ($('btn-close-profile')) $('btn-close-profile').addEventListener('click', _closeProfileModal);
  if ($('btn-cancel-profile')) $('btn-cancel-profile').addEventListener('click', _closeProfileModal);
  if ($('btn-save-profile')) $('btn-save-profile').addEventListener('click', _handleSaveProfile);
  if ($('btn-random-profile')) $('btn-random-profile').addEventListener('click', _handleRandomizeProfile);
  if ($('profile-input-nick')) {
    $('profile-input-nick').addEventListener('input', _updateProfileModalPreview);
    $('profile-input-nick').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') _handleSaveProfile();
    });
  }

  // 🌟 바깥 화면 클릭 시 말풍선 닫기
  document.addEventListener('click', (e) => {
    const popup = $('profile-bubble-popup');
    if (popup && popup.classList.contains('active')) {
      if (!popup.contains(e.target) && !e.target.closest('#btn-change-nickname')) {
        _closeProfileModal();
      }
    }
  });

  /* =====================================================================
     🔐 Supabase 인증 & 클라우드 프로필 연동
     ===================================================================== */
  let _authCurrentTab = 'signin'; // 'signin' | 'signup'

  function _updateProfileAuthUI(user) {
    const statusEl = $('profile-auth-status');
    const subEl = $('profile-auth-sub');
    const iconEl = $('profile-auth-icon');
    const actionWrap = $('profile-auth-action');

    if (!statusEl || !subEl || !actionWrap) return;

    if (user && user.email) {
      if (iconEl) iconEl.className = 'fa-solid fa-cloud-check profile-auth-icon logged-in';
      statusEl.textContent = '구글 로그인 중';
      statusEl.removeAttribute('title');
      subEl.textContent = '클라우드 프로필 동기화 중';
      actionWrap.innerHTML = `
        <button type="button" class="btn btn-outline btn-sm profile-auth-btn" id="btn-supabase-logout">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span>로그아웃</span>
        </button>
      `;
      const btnLogout = $('btn-supabase-logout');
      if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
          if (typeof AppSupabase !== 'undefined') {
            await AppSupabase.signOut();
            await _handleLogoutProfileReset(true);
            showToast('로그아웃되었습니다. 기본 프로필로 전환되었습니다.', 'info');
          }
        });
      }
    } else {
      if (iconEl) iconEl.className = 'fa-solid fa-cloud profile-auth-icon';
      statusEl.textContent = '게스트 모드';
      statusEl.removeAttribute('title');
      subEl.textContent = '로그인하면 프로필이 클라우드에 보관됩니다.';
      actionWrap.innerHTML = `
        <button type="button" class="btn btn-primary btn-sm profile-auth-btn" id="btn-open-auth-modal">
          <i class="fa-solid fa-cloud"></i>
          <span>클라우드 로그인</span>
        </button>
      `;
      const btnOpen = $('btn-open-auth-modal');
      if (btnOpen) {
        btnOpen.addEventListener('click', () => {
          _closeProfileModal(true);
          _openAuthModal();
        });
      }
    }
  }

  function _openAuthModal() {
    const modal = $('auth-modal');
    if (!modal) return;

    _clearAuthFeedback();

    // Supabase 설정 완료 여부 체크
    const notice = $('auth-config-notice');
    if (notice) {
      const isOk = typeof AppSupabase !== 'undefined' && AppSupabase.isConfigured();
      notice.classList.toggle('hidden', isOk);
    }

    modal.classList.remove('hidden');
  }

  function _closeAuthModal() {
    const modal = $('auth-modal');
    if (modal) modal.classList.add('hidden');
    _clearAuthFeedback();
  }

  function _showAuthFeedback(msg, type = 'error') {
    const el = $('auth-feedback-msg');
    if (!el) return;
    el.textContent = msg;
    el.className = `auth-feedback-banner ${type}`;
    el.classList.remove('hidden');
  }

  function _clearAuthFeedback() {
    const el = $('auth-feedback-msg');
    if (el) {
      el.textContent = '';
      el.className = 'auth-feedback-banner hidden';
    }
  }

  function _initSupabaseAuthUI() {
    // 1. 모달 열기/닫기 이벤트 바인딩
    const btnOpen = $('btn-open-auth-modal');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        _closeProfileModal(true);
        _openAuthModal();
      });
    }

    const btnClose = $('btn-close-auth-modal');
    if (btnClose) btnClose.addEventListener('click', _closeAuthModal);

    // 🌟 소셜 간편 로그인 (Google & Naver 전용) 이벤트 바인딩
    const btnGoogle = $('btn-oauth-google');
    if (btnGoogle) {
      btnGoogle.addEventListener('click', async () => {
        _showAuthFeedback('Google 로그인 페이지로 이동 중...', 'info');
        const res = await AppSupabase.signInWithOAuth('google');
        if (!res.success) {
          _showAuthFeedback(res.error || 'Google 로그인에 실패했습니다.', 'error');
        }
      });
    }

    const btnKakao = $('btn-oauth-kakao');
    if (btnKakao) {
      btnKakao.addEventListener('click', async () => {
        _showAuthFeedback('카카오 로그인 페이지로 이동 중...', 'info');
        const res = await AppSupabase.signInWithOAuth('kakao');
        if (!res.success) {
          _showAuthFeedback(res.error || '카카오 로그인에 실패했습니다.', 'error');
        }
      });
    }

    const modal = $('auth-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) _closeAuthModal();
      });
    }

    // 🌟 OAuth 리다이렉트 콜백 후 URL의 에러 및 상태 파싱
    _checkOAuthUrlFeedback();

    // 2. Supabase 모듈 초기화 및 리스너 연결
    if (typeof AppSupabase !== 'undefined') {
      AppSupabase.onAuthStateChange(async (event, session, user) => {
        _updateProfileAuthUI(user);

        if (user) {
          // 로그인 시 클라우드 프로필 로드 및 복원
          const profile = await AppSupabase.loadProfile(user.id);
          if (profile) {
            _applyLoadedProfile(profile, user.id);
          } else {
            // 소셜 로그인 첫 접속 등의 경우 로컬 프로필로 DB 최초 등록
            AppSupabase.saveProfile(user.id, {
              nickname: myNickname,
              avatarIcon: myAvatarIcon,
              avatarColor: myAvatarColor,
              coins: myCoins || 0,
              level: myLevel || 1,
              exp: myExp || 0,
              stats: _getMyStats()
            }).catch(() => {});
          }
          _updateHomeUserBar();
        } else if (event === 'SIGNED_OUT') {
          // 명시적 로그아웃 이벤트 수신 시에만 게스트 기본 프로필로 전환
          await _handleLogoutProfileReset(false);
        }
      });

      // 초기 세션 확인
      AppSupabase.init().then(async user => {
        _updateProfileAuthUI(user);
        if (user) {
          const profile = await AppSupabase.loadProfile(user.id);
          if (profile) {
            _applyLoadedProfile(profile, user.id);
          }
          _updateHomeUserBar();
        }
      }).catch(() => {
        _updateProfileAuthUI(null);
      });
    } else {
      _updateProfileAuthUI(null);
    }
  }

  // 🌟 로그아웃 시 게스트 기본 프로필(익명, 기본 아바타, 1레벨, 0코인, 0전적)로 리셋
  async function _handleLogoutProfileReset(forceReload = false) {
    // 1. Firebase 및 Supabase의 기존 로그인 접속자 정보 즉시 삭제 및 세션 키 초기화
    if (window.FirebaseLobby && typeof window.FirebaseLobby.removeOnlineUser === 'function') {
      try { await window.FirebaseLobby.removeOnlineUser(); } catch (_) {}
    }
    try { sessionStorage.removeItem('gachi_presence_key'); } catch (_) {}

    // 2. 로컬 프로필 게스트 기본값으로 초기화
    myNickname = '익명';
    myAvatarIcon = _getRandomAvatarIcon();
    myAvatarColor = _getRandomAvatarColor();
    myCoins = 0;
    myLevel = 1;
    myExp = 0;
    _tempSelectedIcon = myAvatarIcon;
    _tempSelectedColor = myAvatarColor;

    localStorage.setItem('arcade_nick', myNickname);
    localStorage.setItem('arcade_avatar_icon', myAvatarIcon);
    localStorage.setItem('arcade_avatar_color', myAvatarColor);
    localStorage.setItem('arcade_user_coins', '0');
    localStorage.setItem('arcade_user_level', '1');
    localStorage.setItem('arcade_user_exp', '0');
    localStorage.removeItem(GAME_STATS_KEY);
    myNicknameColor = '';
    myPurchasedNameColors = [];
    localStorage.removeItem('arcade_name_color');
    localStorage.removeItem('arcade_purchased_name_colors');
    myProfileCard = 'default';
    myPurchasedProfileCards = ['default'];
    localStorage.removeItem('arcade_profile_card');
    localStorage.removeItem('arcade_purchased_profile_cards');
    myChatBubble = 'default';
    myPurchasedChatBubbles = ['default'];
    localStorage.removeItem('arcade_user_chat_bubble');
    localStorage.removeItem('arcade_purchased_chat_bubbles');
    myAvatarFrame = 'default';
    myPurchasedAvatarFrames = ['default'];
    localStorage.removeItem('arcade_user_avatar_frame');
    localStorage.removeItem('arcade_purchased_avatar_frames');
    myVictoryEffect = 'default';
    myPurchasedVictoryEffects = ['default'];
    localStorage.removeItem('arcade_user_victory_effect');
    localStorage.removeItem('arcade_purchased_victory_effects');

    if ($('profile-input-nick')) $('profile-input-nick').value = myNickname;
    _updateHomeUserBar();
    _updateLevelUI();
    _updateCoinsUI();
    _updateProfileModalPreview();
    _renderProfileModalGrids();
    _updateProfileAuthUI(null);

    // 3. 새 게스트 접속자로 Firebase 및 Supabase에 즉각 등록
    try {
      const guestPayload = _getMyPresencePayload();
      if (window.FirebaseLobby && typeof window.FirebaseLobby.registerOnlineUser === 'function') {
        await window.FirebaseLobby.registerOnlineUser(guestPayload);
      }
    } catch (_) {}

    // 사용자가 명시적으로 로그아웃 버튼을 눌렀을 때만 새로고침 실행
    if (forceReload) {
      window.location.reload();
    }
  }

  // 🌟 OAuth 리다이렉트 콜백 후 URL의 에러 및 상태 파싱
  function _checkOAuthUrlFeedback() {
    const hash = window.location.hash || '';
    const search = window.location.search || '';

    let params = new URLSearchParams(search);
    if (hash && hash.includes('=')) {
      const raw = hash.startsWith('#') ? hash.slice(1) : hash;
      const hashParams = new URLSearchParams(raw);
      if (hashParams.has('error') || hashParams.has('error_description')) {
        params = hashParams;
      }
    }

    if (params.has('error') || params.has('error_description')) {
      const err = params.get('error') || '';
      const desc = params.get('error_description') || '';
      const fullMsg = decodeURIComponent(desc.replace(/\+/g, ' '));
      console.warn('[OAuth Callback Error]', err, fullMsg);

      let alertMsg = `소셜 로그인에 실패했습니다.\n사유: ${fullMsg || err}`;
      if (fullMsg.includes('external provider') || fullMsg.includes('Error getting user profile') || fullMsg.includes('id_token')) {
        alertMsg = `[네이버 로그인 실패 안내]\n\n네이버는 OpenID Connect(id_token) 표준을 제공하지 않아 Supabase Custom OIDC에서 직접 인증 세션을 맺지 못하고 거절되었습니다.\n\n(Supabase 서버 오류: ${fullMsg})\n\n💡 해결 방법:\n1. Supabase 공식 내장 프로바이더인 'Google' 또는 'Kakao(카카오)'를 사용하시거나,\n2. 네이버 로그인을 위해선 Supabase Edge Function을 통한 OAuth 토큰 중계 브릿지가 필요합니다.`;
      }

      setTimeout(() => {
        alert(alertMsg);
      }, 250);

      // 주소창의 지저분한 hash/query 정리
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }

  /* =====================================================================
     🌟 커스텀 확인 / 나가기 다이얼로그 (브라우저 기본 confirm 대체)
     ===================================================================== */
  function showConfirmDialog({
    title = '확인',
    message = '정말 진행하시겠습니까?',
    confirmText = '나가기',
    cancelText = '취소',
    icon = 'fa-solid fa-door-open',
    isDanger = true
  } = {}) {
    return new Promise((resolve) => {
      const modal = $('confirm-modal');
      if (!modal) {
        resolve(window.confirm(message));
        return;
      }

      const titleEl = $('confirm-modal-title');
      const msgEl = $('confirm-modal-message');
      const okBtn = $('confirm-modal-ok');
      const cancelBtn = $('confirm-modal-cancel');
      const iconEl = $('confirm-modal-icon');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (okBtn) {
        okBtn.textContent = confirmText;
        okBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
      }
      if (cancelBtn) cancelBtn.textContent = cancelText;
      if (iconEl) {
        iconEl.innerHTML = `<i class="${icon}"></i>`;
        iconEl.className = `confirm-modal-icon-wrap ${isDanger ? 'danger' : 'primary'}`;
      }

      function cleanup(result) {
        modal.classList.add('hidden');
        modal.removeEventListener('click', onBackdrop);
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }

      function onOk(e) {
        if (e) e.preventDefault();
        cleanup(true);
      }
      function onCancel(e) {
        if (e) e.preventDefault();
        cleanup(false);
      }
      function onBackdrop(e) {
        if (e.target === modal) cleanup(false);
      }
      function onKey(e) {
        if (e.key === 'Escape') cleanup(false);
        if (e.key === 'Enter') cleanup(true);
      }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);

      modal.classList.remove('hidden');
    });
  }
  window.showConfirmDialog = showConfirmDialog;

  /* =====================================================================
     📊 게임 전적 시스템 (게임별/전체 전적 로컬 & Supabase 동기화 & 모달)
     ===================================================================== */
  const GAME_STATS_KEY = 'arcade_user_stats';

  const GAME_STATS_META = {
    gomoku: { title: '오목', icon: 'fa-solid fa-chess-board' },
    chess: { title: '체스', icon: 'fa-solid fa-chess' },
    janggi: { title: '장기', icon: 'fa-solid fa-gem' },
    alkkagi: { title: '알까기', icon: 'fa-solid fa-circle-dot' },
    quoridor: { title: '쿼리도', icon: 'fa-solid fa-border-all' },
    baskin31: { title: '배스킨라빈스 31', icon: 'fa-solid fa-ice-cream' },
    roulette: { title: '러시안 룰렛', icon: 'fa-solid fa-skull-crossbones' },
    wordchain: { title: '끝말잇기', icon: 'fa-solid fa-spell-check' },
    apple: { title: '사과게임', icon: 'fa-solid fa-apple-whole' },
    typing: { title: '타자연습', icon: 'fa-solid fa-keyboard' },
    catchmind: { title: '캐치마인드', icon: 'fa-solid fa-palette' },
    yutnori: { title: '윷놀이', icon: 'fa-solid fa-dice' },
    yacht: { title: '요트 다이스', icon: 'fa-solid fa-dice-five' },
    chesswarfare: { title: '체스 워페어', icon: 'fa-solid fa-chess-knight' }
  };

  function _createEmptyStats() {
    const stats = {
      total: { plays: 0, wins: 0, losses: 0, draws: 0 },
      games: {}
    };
    Object.keys(GAME_STATS_META).forEach(key => {
      stats.games[key] = { plays: 0, wins: 0, losses: 0, draws: 0 };
    });
    return stats;
  }

  function _getMyStats() {
    try {
      const raw = localStorage.getItem(GAME_STATS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.total) parsed.total = { plays: 0, wins: 0, losses: 0, draws: 0 };
          if (!parsed.games) parsed.games = {};
          Object.keys(GAME_STATS_META).forEach(k => {
            if (!parsed.games[k]) parsed.games[k] = { plays: 0, wins: 0, losses: 0, draws: 0 };
          });
          return parsed;
        }
      }
    } catch (_) {}
    return _createEmptyStats();
  }

  // 🌟 클라우드 전적과 로컬 전적의 안전한 병합 (쿠키 삭제 후 로그인 시 전적 초기화 방지)
  function _mergeStats(cloudStats, localStats) {
    if (!cloudStats && !localStats) return _createEmptyStats();
    if (!cloudStats) return localStats;
    if (!localStats) return cloudStats;

    const cloudPlays = (cloudStats.total && cloudStats.total.plays) || 0;
    const localPlays = (localStats.total && localStats.total.plays) || 0;

    // 만약 한쪽에만 플레이 기록이 있다면 그 쪽을 우선 적용
    if (cloudPlays === 0 && localPlays > 0) return localStats;
    if (localPlays === 0) return cloudStats;

    // 둘 다 기록이 있으면 큰 값을 유지하도록 안전 병합
    const merged = _createEmptyStats();
    merged.total.plays = Math.max(cloudPlays, localPlays);
    merged.total.wins = Math.max(cloudStats.total?.wins || 0, localStats.total?.wins || 0);
    merged.total.losses = Math.max(cloudStats.total?.losses || 0, localStats.total?.losses || 0);
    merged.total.draws = Math.max(cloudStats.total?.draws || 0, localStats.total?.draws || 0);

    Object.keys(GAME_STATS_META).forEach(k => {
      const cg = cloudStats.games?.[k] || { plays: 0, wins: 0, losses: 0, draws: 0 };
      const lg = localStats.games?.[k] || { plays: 0, wins: 0, losses: 0, draws: 0 };
      merged.games[k] = {
        plays: Math.max(cg.plays, lg.plays),
        wins: Math.max(cg.wins, lg.wins),
        losses: Math.max(cg.losses, lg.losses),
        draws: Math.max(cg.draws, lg.draws)
      };
    });
    return merged;
  }

  // 🌟 로그인 시 Supabase에서 불러온 계정 프로필 및 전적을 로컬과 UI에 완벽 복원
  function _applyLoadedProfile(profile, userId = null) {
    if (!profile) return;

    // 1. 닉네임 복원
    if (profile.nickname) {
      myNickname = profile.nickname;
      localStorage.setItem('arcade_nick', myNickname);
      if ($('profile-input-nick')) $('profile-input-nick').value = myNickname;
      if ($('home-user-name')) $('home-user-name').textContent = myNickname;
    }

    // 2. 아바타 아이콘 복원
    if (profile.avatarIcon) {
      myAvatarIcon = profile.avatarIcon;
      localStorage.setItem('arcade_avatar_icon', myAvatarIcon);
      _tempSelectedIcon = myAvatarIcon;
    }

    // 3. 아바타 배경 색상 복원
    if (profile.avatarColor) {
      myAvatarColor = profile.avatarColor;
      localStorage.setItem('arcade_avatar_color', myAvatarColor);
      _tempSelectedColor = myAvatarColor;
    }

    // 4. 보유 코인 복원
    if (typeof profile.coins === 'number') {
      myCoins = profile.coins;
      localStorage.setItem('arcade_user_coins', String(myCoins));
    }

    // 5. 레벨 & 경험치 복원
    if (typeof profile.level === 'number' && profile.level >= 1) {
      myLevel = Math.min(MAX_LEVEL, profile.level);
      localStorage.setItem('arcade_user_level', String(myLevel));
    }
    if (typeof profile.exp === 'number' && profile.exp >= 0) {
      myExp = profile.exp;
      localStorage.setItem('arcade_user_exp', String(myExp));
    }

    // 6. 🌟 게임 전적(stats) 복원 & 병합 (쿠키/스토리지 삭제 후 로그인 시 완벽 복원!)
    const localStats = _getMyStats();
    const mergedStats = _mergeStats(profile.stats, localStats);
    localStorage.setItem(GAME_STATS_KEY, JSON.stringify(mergedStats));

    // 7. 닉네임 색상 & 구매한 색상 목록 복원
    if (profile.nameColor !== undefined) {
      myNicknameColor = profile.nameColor || '';
      if (myNicknameColor) {
        localStorage.setItem('arcade_name_color', myNicknameColor);
      } else {
        localStorage.removeItem('arcade_name_color');
      }
    }
    if (Array.isArray(profile.purchasedNameColors)) {
      myPurchasedNameColors = [...profile.purchasedNameColors];
      localStorage.setItem('arcade_purchased_name_colors', JSON.stringify(myPurchasedNameColors));
    }

    // 8. 🎴 프로필 카드 & 구매한 카드 목록 복원
    if (profile.profileCard !== undefined) {
      myProfileCard = profile.profileCard || 'default';
      if (myProfileCard && myProfileCard !== 'default') {
        localStorage.setItem('arcade_profile_card', myProfileCard);
      } else {
        localStorage.removeItem('arcade_profile_card');
      }
    }
    if (Array.isArray(profile.purchasedProfileCards)) {
      myPurchasedProfileCards = [...profile.purchasedProfileCards];
      if (!myPurchasedProfileCards.includes('default')) myPurchasedProfileCards.push('default');
      localStorage.setItem('arcade_purchased_profile_cards', JSON.stringify(myPurchasedProfileCards));
    }

    // 9. 💬 말풍선 스킨 & 구매 목록 복원
    if (profile.chatBubble !== undefined) {
      myChatBubble = profile.chatBubble || 'default';
      if (myChatBubble && myChatBubble !== 'default') {
        localStorage.setItem('arcade_user_chat_bubble', myChatBubble);
      } else {
        localStorage.removeItem('arcade_user_chat_bubble');
      }
    }
    if (Array.isArray(profile.purchasedChatBubbles)) {
      myPurchasedChatBubbles = [...profile.purchasedChatBubbles];
      if (!myPurchasedChatBubbles.includes('default')) myPurchasedChatBubbles.push('default');
      localStorage.setItem('arcade_purchased_chat_bubbles', JSON.stringify(myPurchasedChatBubbles));
    }

    // 10. 🖼️ 아바타 테두리 & 구매 목록 복원
    if (profile.avatarFrame !== undefined) {
      myAvatarFrame = profile.avatarFrame || 'default';
      if (myAvatarFrame && myAvatarFrame !== 'default') {
        localStorage.setItem('arcade_user_avatar_frame', myAvatarFrame);
      } else {
        localStorage.removeItem('arcade_user_avatar_frame');
      }
    }
    if (Array.isArray(profile.purchasedAvatarFrames)) {
      myPurchasedAvatarFrames = [...profile.purchasedAvatarFrames];
      if (!myPurchasedAvatarFrames.includes('default')) myPurchasedAvatarFrames.push('default');
      localStorage.setItem('arcade_purchased_avatar_frames', JSON.stringify(myPurchasedAvatarFrames));
    }

    // 11. 🎆 승리 세레머니 연출 & 구매 목록 복원
    if (profile.victoryEffect !== undefined) {
      myVictoryEffect = profile.victoryEffect || 'default';
      if (myVictoryEffect && myVictoryEffect !== 'default') {
        localStorage.setItem('arcade_user_victory_effect', myVictoryEffect);
      } else {
        localStorage.removeItem('arcade_user_victory_effect');
      }
    }
    if (Array.isArray(profile.purchasedVictoryEffects)) {
      myPurchasedVictoryEffects = [...profile.purchasedVictoryEffects];
      if (!myPurchasedVictoryEffects.includes('default')) myPurchasedVictoryEffects.push('default');
      localStorage.setItem('arcade_purchased_victory_effects', JSON.stringify(myPurchasedVictoryEffects));
    }

    // 클라우드와 로컬에 차이가 있다면 클라우드에도 즉시 동기화
    if (userId && typeof AppSupabase !== 'undefined') {
      AppSupabase.saveProfile(userId, {
        nickname: myNickname,
        nameColor: myNicknameColor,
        purchasedNameColors: myPurchasedNameColors,
        profileCard: myProfileCard,
        purchasedProfileCards: myPurchasedProfileCards,
        chatBubble: myChatBubble,
        purchasedChatBubbles: myPurchasedChatBubbles,
        avatarFrame: myAvatarFrame,
        purchasedAvatarFrames: myPurchasedAvatarFrames,
        victoryEffect: myVictoryEffect,
        purchasedVictoryEffects: myPurchasedVictoryEffects,
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        coins: myCoins,
        level: myLevel,
        exp: myExp,
        stats: mergedStats
      }).catch(() => {});
    }

    _updateHomeUserBar();
    _updateCoinsUI();
    _updateLevelUI();
    if (_isShopActive) _renderShopUI();
  }

  function _saveMyStats(stats) {
    if (!stats || typeof stats !== 'object') return;
    try {
      localStorage.setItem(GAME_STATS_KEY, JSON.stringify(stats));
    } catch (_) {}

    // Supabase 로그인 상태라면 클라우드에도 저장 (모든 정보 동봉하여 덮어쓰기 방지)
    if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
      const user = AppSupabase.getCurrentUser();
      AppSupabase.saveProfile(user.id, {
        nickname: myNickname,
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        coins: myCoins,
        level: myLevel,
        exp: myExp,
        stats: stats
      }).catch(() => {});
    }

    // 대기방에 있다면 P2P 방 참가자들에게 최신 stats 공유
    if (currentRoomCode && roomPlayers.length > 0) {
      const myId = P2P.getMyId();
      const me = roomPlayers.find(p => p.id === myId || (p.isHost && isHostPlayer));
      if (me) me.stats = stats;
      if (isHostPlayer) {
        _broadcastRoomState();
      } else {
        P2P.send({
          type: 'guest_update_profile',
          name: myNickname,
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor,
          level: myLevel,
          exp: myExp,
          stats: stats
        });
      }
    }
  }

  function _recordGameStats(gameKey, resultType) { // 'win' | 'lose' | 'draw'
    if (!gameKey) gameKey = selectedGameKey;
    const stats = _getMyStats();

    // 1. 전체 전적
    stats.total.plays = (stats.total.plays || 0) + 1;
    if (resultType === 'win') {
      stats.total.wins = (stats.total.wins || 0) + 1;
    } else if (resultType === 'lose') {
      stats.total.losses = (stats.total.losses || 0) + 1;
    } else if (resultType === 'draw') {
      stats.total.draws = (stats.total.draws || 0) + 1;
    }

    // 2. 게임별 전적
    if (!stats.games[gameKey]) {
      stats.games[gameKey] = { plays: 0, wins: 0, losses: 0, draws: 0 };
    }
    const gStat = stats.games[gameKey];
    gStat.plays = (gStat.plays || 0) + 1;
    if (resultType === 'win') {
      gStat.wins = (gStat.wins || 0) + 1;
    } else if (resultType === 'lose') {
      gStat.losses = (gStat.losses || 0) + 1;
    } else if (resultType === 'draw') {
      gStat.draws = (gStat.draws || 0) + 1;
    }

    _saveMyStats(stats);
  }

  function _renderStatsModal(name, avatarIcon, avatarColor, stats, isMe = false, level = 1, profileCard = 'default', nameColor = null, avatarFrame = 'default') {
    const profileCardEl = document.querySelector('.stats-user-profile');
    if (profileCardEl) _applyProfileCardTheme(profileCardEl, profileCard);

    const s = stats || _createEmptyStats();
    const tot = s.total || { plays: 0, wins: 0, losses: 0, draws: 0 };
    const plays = tot.plays || 0;
    const wins = tot.wins || 0;
    const losses = tot.losses || 0;
    const draws = tot.draws || 0;
    const winRate = plays > 0 ? Math.round((wins / plays) * 100) : 0;

    const avEl = $('stats-user-avatar');
    const nameEl = $('stats-user-name');
    const tagEl = $('stats-user-tag');
    if (avEl) {
      avEl.style.background = avatarColor || '#38a169';
      avEl.innerHTML = `<i class="${avatarIcon || 'fa-solid fa-dog'}"></i>`;
      if (typeof _applyAvatarFrame === 'function') {
        _applyAvatarFrame(avEl, avatarFrame || (isMe ? myAvatarFrame : 'default'));
      }
    }
    if (nameEl) {
      nameEl.textContent = name || '플레이어';
      const actualNameColor = isMe ? myNicknameColor : (nameColor || '');
      if (actualNameColor === 'rainbow') {
        nameEl.classList.add('nickname-rainbow');
        nameEl.style.removeProperty('color');
        nameEl.style.fontWeight = '900';
      } else if (actualNameColor) {
        nameEl.classList.remove('nickname-rainbow');
        nameEl.style.setProperty('color', actualNameColor, 'important');
        nameEl.style.fontWeight = '800';
      } else {
        nameEl.classList.remove('nickname-rainbow');
        nameEl.style.removeProperty('color');
        nameEl.style.fontWeight = '';
      }
    }
    const levelEl = $('stats-user-level');
    if (levelEl) {
      const lvl = level || 1;
      levelEl.textContent = lvl;
      levelEl.className = `player-level-badge ${_getLevelTierClass(lvl)}`;
      levelEl.style.display = 'inline-flex';
    }
    if (tagEl) {
      tagEl.textContent = '';
      tagEl.style.display = 'none';
    }

    if ($('stats-total-plays')) $('stats-total-plays').textContent = plays;
    if ($('stats-total-wins')) $('stats-total-wins').textContent = wins;
    if ($('stats-total-losses')) $('stats-total-losses').textContent = losses;
    if ($('stats-total-draws')) $('stats-total-draws').textContent = draws;
    if ($('stats-win-rate')) $('stats-win-rate').textContent = `${winRate}%`;

    const gaugeFill = $('stats-gauge-fill');
    if (gaugeFill) gaugeFill.style.width = `${winRate}%`;

    const listEl = $('stats-games-list');
    if (listEl) {
      listEl.innerHTML = Object.entries(GAME_STATS_META).map(([key, meta]) => {
        const g = (s.games && s.games[key]) || { plays: 0, wins: 0, losses: 0, draws: 0 };
        const gPlays = g.plays || 0;
        const gWins = g.wins || 0;
        const gLosses = g.losses || 0;
        const gDraws = g.draws || 0;
        const gRate = gPlays > 0 ? Math.round((gWins / gPlays) * 100) : 0;

        let countDesc = `${gPlays}전 ${gWins}승`;
        if (gDraws > 0) countDesc += ` ${gDraws}무`;
        countDesc += ` ${gLosses}패`;

        const badgeClass = gPlays > 0 ? 'stats-game-rate-badge' : 'stats-game-rate-badge empty';
        const badgeText = gPlays > 0 ? `승률 ${gRate}%` : '기록 없음';

        return `
          <div class="stats-game-row">
            <div class="stats-game-left">
              <div class="stats-game-icon"><i class="${meta.icon}"></i></div>
              <div class="stats-game-info">
                <span class="stats-game-name">${meta.title}</span>
                <span class="stats-game-counts">${countDesc}</span>
              </div>
            </div>
            <div class="stats-game-right">
              <span class="${badgeClass}">${badgeText}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function _updateStatsModalFriendBtn(targetUser) {
    const btn = $('btn-stats-add-friend');
    if (!btn || !targetUser || !targetUser.name) {
      if (btn) btn.classList.add('hidden');
      return;
    }

    const cleanName = targetUser.name.trim();
    if (cleanName === myNickname) {
      btn.classList.add('hidden');
      return;
    }

    btn.classList.remove('hidden');
    const targetKey = _getUserUniqueKey(targetUser);
    const isFriend = _friendsList.some(f => f.name === cleanName || (f.friendKey && f.friendKey === targetKey));
    const hasSent = _sentFriendRequests.includes(targetKey) || _sentFriendRequests.includes(cleanName);

    if (isFriend) {
      btn.className = 'btn btn-sm btn-stats-friend already-friend';
      btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>친구</span>';
      btn.onclick = (e) => {
        e.stopPropagation();
        showToast(`'${cleanName}'님과는 이미 친구입니다.`, 'info');
      };
    } else if (hasSent) {
      btn.className = 'btn btn-sm btn-stats-friend pending';
      btn.innerHTML = '<i class="fa-solid fa-clock"></i> <span>신청 취소</span>';
      btn.onclick = async (e) => {
        e.stopPropagation();
        const ok = await showConfirmDialog({
          title: '친구 신청 취소',
          message: `'${cleanName}'님에게 보낸 친구 신청을 취소하시겠습니까?`,
          confirmText: '신청 취소',
          cancelText: '닫기',
          icon: 'fa-solid fa-user-xmark',
          isDanger: true
        });
        if (ok) {
          _cancelFriendRequest(targetUser);
        }
      };
    } else {
      btn.className = 'btn btn-primary btn-sm btn-stats-friend';
      btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> <span>친구 신청</span>';
      btn.onclick = (e) => {
        e.stopPropagation();
        _sendFriendRequest(targetUser);
      };
    }
  }

  async function _openPlayerStatsModal(playerData = null) {
    const modal = $('stats-modal');
    if (!modal) return;

    const myId = P2P.getMyId();
    const isMe = !playerData || (playerData.id === myId) || (playerData.isHost && P2P.isHost());
    _currentInspectedPlayer = isMe ? null : playerData;

    const btnFriend = $('btn-stats-add-friend');

    if (isMe) {
      if (btnFriend) btnFriend.classList.add('hidden');

      if (typeof AppSupabase !== 'undefined' && AppSupabase.getCurrentUser()) {
        const user = AppSupabase.getCurrentUser();
        try {
          const profile = await AppSupabase.loadProfile(user.id);
          if (profile) {
            _applyLoadedProfile(profile, user.id);
          }
        } catch (_) {}
      }
      const myStats = _getMyStats();
      _renderStatsModal(myNickname, myAvatarIcon, myAvatarColor, myStats, true, myLevel, myProfileCard, myNicknameColor, myAvatarFrame);
      modal.classList.remove('hidden');
    } else {
      // 상대방
      _updateStatsModalFriendBtn(playerData);

      const targetName = playerData.name || '상대방';
      const targetIcon = playerData.avatarIcon || 'fa-solid fa-paw';
      const targetColor = playerData.avatarColor || '#718096';
      const targetLevel = playerData.level || 1;
      const targetCard = playerData.profileCard || 'default';
      const targetNameColor = playerData.nameColor || null;
      const targetFrame = playerData.avatarFrame || 'default';

      // 1) playerData에 stats가 이미 있는 경우
      if (playerData.stats) {
        _renderStatsModal(targetName, targetIcon, targetColor, playerData.stats, false, targetLevel, targetCard, targetNameColor, targetFrame);
      } else {
        // 2) 임시 렌더링 후 Supabase 조회 시도
        _renderStatsModal(targetName, targetIcon, targetColor, _createEmptyStats(), false, targetLevel, targetCard, targetNameColor, targetFrame);
        if (typeof AppSupabase !== 'undefined' && playerData.supabaseId) {
          const userRecord = await AppSupabase.fetchUserStats(playerData.supabaseId);
          if (userRecord && userRecord.stats) {
            playerData.stats = userRecord.stats;
            _renderStatsModal(targetName, targetIcon, targetColor, userRecord.stats, false, userRecord.level || targetLevel, userRecord.profileCard || targetCard, userRecord.nameColor || targetNameColor, userRecord.avatarFrame || targetFrame);
          }
        }
      }
      modal.classList.remove('hidden');
    }
  }

  function _closeStatsModal() {
    _currentInspectedPlayer = null;
    const modal = $('stats-modal');
    if (modal) modal.classList.add('hidden');
  }

  function _initStatsUI() {
    const btnMyStats = $('btn-open-my-stats');
    if (btnMyStats) {
      btnMyStats.addEventListener('click', (e) => {
        e.stopPropagation();
        _closeProfileModal(true);
        _openPlayerStatsModal();
      });
    }

    const btnClose = $('btn-close-stats-modal');
    if (btnClose) btnClose.addEventListener('click', _closeStatsModal);

    const modal = $('stats-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) _closeStatsModal();
      });
    }
  }

  /* =====================================================================
     ⚙️ 방 만들기 옵션 (공개/비밀방, 비밀번호, 2~8인 스피너) & 비밀번호 모달
     ===================================================================== */
  function _initCreateRoomOptions() {
    const optPublic = $('opt-room-public');
    const optPrivate = $('opt-room-private');
    const pwdWrap = $('create-password-wrap');
    const btnMinus = $('btn-cap-minus');
    const btnPlus = $('btn-cap-plus');
    const capVal = $('capacity-val');

    if (optPublic && optPrivate && pwdWrap) {
      optPublic.addEventListener('change', () => {
        if (optPublic.checked) pwdWrap.classList.add('hidden');
      });
      optPrivate.addEventListener('change', () => {
        if (optPrivate.checked) {
          pwdWrap.classList.remove('hidden');
          setTimeout(() => {
            if ($('input-create-room-password')) $('input-create-room-password').focus();
          }, 50);
        }
      });
    }

    if (btnMinus && btnPlus && capVal) {
      btnMinus.addEventListener('click', () => {
        Sound.playClick();
        createRoomCapacity = Math.max(2, createRoomCapacity - 1);
        capVal.textContent = `${createRoomCapacity}인`;
      });
      btnPlus.addEventListener('click', () => {
        Sound.playClick();
        createRoomCapacity = Math.min(8, createRoomCapacity + 1);
        capVal.textContent = `${createRoomCapacity}인`;
      });
    }

    // 비밀번호 입력 팝업 이벤트
    const overlayPwd = $('overlay-room-password');
    const btnCancelPwd = $('btn-cancel-pwd');
    const btnConfirmPwd = $('btn-confirm-pwd');
    const inputJoinPwd = $('input-join-password');

    if (btnCancelPwd) {
      btnCancelPwd.addEventListener('click', () => {
        if (overlayPwd) overlayPwd.classList.add('hidden');
        pendingJoinRoomCode = '';
      });
    }

    if (btnConfirmPwd && inputJoinPwd) {
      const doConfirm = () => {
        const pwd = inputJoinPwd.value.trim();
        if (!pwd) {
          showToast('비밀번호를 입력해 주세요.', 'warn');
          return;
        }
        if (overlayPwd) overlayPwd.classList.add('hidden');
        const code = pendingJoinRoomCode;
        pendingJoinRoomCode = '';
        _startJoinRoom(code, pwd);
      };
      btnConfirmPwd.addEventListener('click', doConfirm);
      inputJoinPwd.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doConfirm();
      });
    }
  }

  function _openPasswordJoinModal(roomCode) {
    _pushHistory({ modal: 'password' }, '#password');
    pendingJoinRoomCode = roomCode;
    const overlayPwd = $('overlay-room-password');
    const inputJoinPwd = $('input-join-password');
    if (overlayPwd) {
      overlayPwd.classList.remove('hidden');
      if (inputJoinPwd) {
        inputJoinPwd.value = '';
        setTimeout(() => inputJoinPwd.focus(), 80);
      }
    }
  }

  /* =====================================================================
     🎮 게임별 세부 설정 (라운드 1~8회 스피너 / 오목·체스 진영 셔플·흑·백 선택)
     ===================================================================== */
  function _initGameExtraSettings() {
    const btnRoundMinus = $('btn-round-minus');
    const btnRoundPlus = $('btn-round-plus');
    const sideButtons = document.querySelectorAll('.side-btn');

    if (btnRoundMinus && btnRoundPlus) {
      btnRoundMinus.addEventListener('click', () => {
        if (!P2P.isHost() && !isHostPlayer) {
          showToast('방장만 라운드 수를 변경할 수 있습니다.', 'info');
          return;
        }
        selectedGameRounds = Math.max(1, selectedGameRounds - 1);
        _updateGameExtraSettingsUI();
        _broadcastRoomState();
      });

      btnRoundPlus.addEventListener('click', () => {
        if (!P2P.isHost() && !isHostPlayer) {
          showToast('방장만 라운드 수를 변경할 수 있습니다.', 'info');
          return;
        }
        selectedGameRounds = Math.min(20, selectedGameRounds + 1);
        _updateGameExtraSettingsUI();
        _broadcastRoomState();
      });
    }

    sideButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!P2P.isHost() && !isHostPlayer) {
          showToast('방장만 진영을 변경할 수 있습니다.', 'info');
          return;
        }
        const side = btn.dataset.side;
        if (side) {
          selectedGameSideMode = side;
          _updateGameExtraSettingsUI();
          _broadcastRoomState();
        }
      });
    });
  }

  function _updateGameExtraSettingsUI() {
    const bar = $('game-extra-settings-bar');
    const roundsItem = $('game-rounds-setting');
    const sideItem = $('game-side-setting');
    const roundVal = $('game-round-val');
    const isHost = P2P.isHost() || isHostPlayer;

    if (!bar || !roundsItem || !sideItem) return;

    // 라운드 지원 게임: 끝말잇기, 캐치마인드, 타자연습 대결
    const isRoundGame = ['wordchain', 'catchmind', 'typing'].includes(selectedGameKey);
    // 진영 지원 게임: 오목, 체스, 체스워페어, 장기, 알까기
    const isSideGame = ['gomoku', 'chess', 'chesswarfare', 'janggi', 'alkkagi'].includes(selectedGameKey);

    const selectPanel = document.querySelector('.game-select-panel');
    if (selectPanel) {
      selectPanel.classList.toggle('has-extra-settings', isRoundGame || isSideGame);
    }

    if (isRoundGame) {
      bar.classList.remove('hidden');
      roundsItem.classList.remove('hidden');
      sideItem.classList.add('hidden');
      if (roundVal) roundVal.textContent = `${selectedGameRounds} 라운드`;
    } else if (isSideGame) {
      bar.classList.remove('hidden');
      roundsItem.classList.add('hidden');
      sideItem.classList.remove('hidden');

      // 체스/오목/장기/알까기 라벨 구분
      const lblBlack = $('side-label-black');
      const lblWhite = $('side-label-white');
      if (selectedGameKey === 'janggi' || selectedGameKey === 'alkkagi') {
        if (lblBlack) lblBlack.textContent = '방장 초';
        if (lblWhite) lblWhite.textContent = '방장 한';
      } else {
        if (lblBlack) lblBlack.textContent = '방장 흑';
        if (lblWhite) lblWhite.textContent = '방장 백';
      }

      document.querySelectorAll('.side-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.side === selectedGameSideMode);
      });
    } else {
      bar.classList.add('hidden');
      roundsItem.classList.add('hidden');
      sideItem.classList.add('hidden');
    }
  }

  /* =====================================================================
     3. 방 생성 및 참가
     ===================================================================== */
  $('btn-create-room').addEventListener('click', () => {
    Sound.playClick();
    _startHostRoom();
  });

  $('btn-join-room').addEventListener('click', () => {
    Sound.playClick();
    const rawVal = $('input-room-code').value;
    const code = String(rawVal || '').replace(/\s+/g, '').trim();
    if (code.length !== 4) {
      showToast('4자리 방 코드를 입력해 주세요.', 'warn');
      return;
    }
    _startJoinRoom(code);
  });

  $('input-room-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-join-room').click();
  });

  /* ── 방 만들기 실행 (호스트) ── */
  async function _startHostRoom() {
    const isPrivate = $('opt-room-private') && $('opt-room-private').checked;
    let roomPwd = '';
    if (isPrivate) {
      roomPwd = $('input-create-room-password') ? $('input-create-room-password').value.trim() : '';
      if (!roomPwd) {
        showToast('비밀방의 비밀번호를 입력해 주세요.', 'warn');
        if ($('input-create-room-password')) $('input-create-room-password').focus();
        return;
      }
    }

    currentRoomMaxPlayers = createRoomCapacity || 5;
    currentRoomPassword = isPrivate ? roomPwd : '';

    showLoading('방을 생성하고 있습니다...');
    isDevMode = false;

    try {
      currentRoomCode = await P2P.host(
        _onHostGuestJoin,
        _onHostGuestLeave
      );

      hideLoading();

      isHostPlayer = true;
      roomPlayers = [{
        id: P2P.getMyId(),
        name: myNickname || '익명',
        nameColor: myNicknameColor || null,
        profileCard: myProfileCard || 'default',
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        avatarFrame: myAvatarFrame || 'default',
        chatBubble: myChatBubble || 'default',
        victoryEffect: myVictoryEffect || 'default',
        level: myLevel,
        exp: myExp,
        isHost: true,
        isReady: true,
        stats: _getMyStats()
      }];
      selectedGameKey = 'gomoku';

      P2P.onMessage(_onHostReceiveMessage);
      P2P.onDisconnect(_onHostDisconnect);

      // 🌐 Firebase Realtime DB에 방 정보 등록 + onDisconnect 자동 삭제 훅
      if (window.FirebaseLobby && typeof window.FirebaseLobby.registerRoom === 'function') {
        window.FirebaseLobby.registerRoom(
          currentRoomCode,
          myNickname,
          P2P.getMyId(),
          currentRoomMaxPlayers,
          myAvatarIcon,
          myAvatarColor,
          isPrivate,
          !!currentRoomPassword,
          myNicknameColor,
          myLevel,
          myProfileCard,
          selectedGameKey || 'gomoku'
        );
      }

      _resetChatLogs();
      _enterRoomScreen();
      showToast(`방(${currentRoomCode})이 생성되었습니다! (최대 ${currentRoomMaxPlayers}인${isPrivate ? ', 비밀방' : ''})`, 'success');

    } catch (err) {
      hideLoading();
      showToast('방 생성 실패: ' + (err.message || '오류 발생'), 'error');
    }
  }

  /* ── 방 참가 실행 (게스트) ── */
  async function _startJoinRoom(code, inputPassword = '') {
    const cleanCode = String(code || '').replace(/\s+/g, '').trim();

    // 🛠️ 개발자 테스트 모드 (0000 입력 시 1인 게임 테스트 활성화)
    if (cleanCode === '0000') {
      isDevMode = true;
      currentRoomCode = '0000';
      currentRoomMaxPlayers = 5;
      roomPlayers = [{
        id: 'dev-player',
        name: myNickname || '개발자',
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        level: myLevel,
        exp: myExp,
        isHost: true,
        isReady: true
      }];
      selectedGameKey = 'apple';
      isMyReady = true;

      _resetChatLogs();
      _enterRoomScreen();
      showToast('개발자 모드가 활성화되었습니다. (1인 플레이 가능)', 'success');
      return;
    }

    isDevMode = false;
    _isJoinCancelled = false;
    showLoading(`방(${cleanCode})에 접속하는 중...`);
    $('btn-join-room').disabled = true;

    try {
      // 메시지 리스너를 join 이전에 미리 등록하여 초기 room_state 유실 방지
      P2P.onMessage(_onGuestReceiveMessage);
      P2P.onDisconnect(_onGuestDisconnect);

      await P2P.join(cleanCode);

      if (_isJoinCancelled) {
        P2P.destroy();
        return;
      }

      currentRoomCode = cleanCode;
      currentRoomPassword = inputPassword || '';
      isHostPlayer = false;
      isMyReady = false;

      _resetChatLogs();

      // 🌟 방 화면으로 즉시 전환하여 홈 화면에 멈추는 현상 방지
      _enterRoomScreen();

      P2P.send({
        type: 'guest_hello',
        id: P2P.getMyId(),
        name: myNickname || '익명',
        nameColor: myNicknameColor || null,
        profileCard: myProfileCard || 'default',
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        avatarFrame: myAvatarFrame || 'default',
        chatBubble: myChatBubble || 'default',
        victoryEffect: myVictoryEffect || 'default',
        level: myLevel,
        exp: myExp,
        password: inputPassword || '',
        stats: _getMyStats()
      });

      hideLoading();
      $('btn-join-room').disabled = false;

    } catch (err) {
      currentRoomCode = '';
      if (_isJoinCancelled) return;
      hideLoading();
      $('btn-join-room').disabled = false;
      const msg = err.message || '호스트를 찾을 수 없거나 응답하지 않습니다';
      showToast(msg, 'error');
    }
  }

  /* =====================================================================
     4. 호스트측 P2P 이벤트 및 시스템 메시지 처리
     ===================================================================== */
  function _onHostGuestJoin(peerId) {
    console.log('[Host] 새 게스트 접속:', peerId);
  }

  function _onHostGuestLeave(peerId, explicitName) {
    const leftPlayer = roomPlayers.find(p => p.id === peerId);
    if (!leftPlayer && !explicitName) {
      // 이미 나갔거나 존재하지 않는 게스트 (중복 실행 방지)
      return;
    }

    const leftName = explicitName || (leftPlayer ? leftPlayer.name : '플레이어');
    console.log('[Host] 게스트 퇴장 처리:', leftName, peerId);

    // 참가자 배열에서 즉시 제거
    roomPlayers = roomPlayers.filter(p => p.id !== peerId);
    activeGamePlayers = activeGamePlayers.filter(p => p.id !== peerId);

    // 다른 게스트들에게 퇴장 브로드캐스트
    P2P.send({
      type: 'player_left_room_broadcast',
      playerId: peerId,
      name: leftName
    });

    _appendChatMessage({ isSystem: true, text: `${leftName}님이 퇴장하셨습니다.` });
    _showInGameAlert(`${leftName}님이 방을 나갔습니다.`);
    _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);

    _checkGomokuPlayerCount();
    _broadcastRoomState();
    _updateRoomUI();

    // 🌐 Firebase 인원 수 업데이트
    if (window.FirebaseLobby && typeof window.FirebaseLobby.updatePlayerCount === 'function') {
      window.FirebaseLobby.updatePlayerCount(currentRoomCode, roomPlayers.length);
    }

    showToast(`${leftName}님이 방을 나갔습니다.`, 'warn');
  }

  function _onHostReceiveMessage(data, senderPeerId) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'guest_hello') {
      // 🔒 비밀번호 검증
      if (currentRoomPassword) {
        if (!data.password) {
          // 비밀번호를 입력하지 않고 입장 시도 -> 비밀번호 입력 팝업 띄우도록 요청
          P2P.send({ type: 'password_required', roomCode: currentRoomCode }, senderPeerId);
          return;
        } else if (data.password !== currentRoomPassword) {
          // 비밀번호 불일치
          P2P.send({ type: 'wrong_password', message: '비밀번호가 일치하지 않습니다.' }, senderPeerId);
          return;
        }
      }

      const isJoiningMidGame = isRoomGameActive && activeGamePlayers.length > 0;
      const existingIdx = roomPlayers.findIndex(p => String(p.id) === String(senderPeerId) || (!p.isHost && p.name === data.name));

      // 👥 최대 정원 검증 (신규 입장 시에만 검사, 재연결 유저는 기존 자리 유지)
      if (existingIdx === -1 && roomPlayers.length >= currentRoomMaxPlayers) {
        P2P.send({ type: 'room_full', message: `방 인원이 가득 찼습니다 (최대 ${currentRoomMaxPlayers}명).` }, senderPeerId);
        return;
      }

      const newPlayerObj = {
        id: senderPeerId,
        name: data.name || '익명',
        nameColor: data.nameColor || null,
        profileCard: data.profileCard || 'default',
        avatarIcon: data.avatarIcon || _getRandomAvatarIcon(),
        avatarColor: data.avatarColor || _getRandomAvatarColor(),
        avatarFrame: data.avatarFrame || 'default',
        chatBubble: data.chatBubble || 'default',
        victoryEffect: data.victoryEffect || 'default',
        level: typeof data.level === 'number' ? data.level : 1,
        exp: typeof data.exp === 'number' ? data.exp : 0,
        isHost: false,
        isReady: false,
        isSpectator: isJoiningMidGame,
        stats: data.stats || null
      };

      if (existingIdx !== -1) {
        roomPlayers[existingIdx] = newPlayerObj;
      } else {
        roomPlayers.push(newPlayerObj);
      }
      _reorderRoomPlayersWithHostFirst();

      // 🌟 게임 진행 중 중간 입장한 게스트에게 즉시 관전 시작 패킷 전송
      if (isJoiningMidGame) {
        console.log('[Host] 게임 진행 중 새 게스트 관전 모드 진입:', data.name, senderPeerId);
        P2P.send({
          type: 'start_spectate',
          game: selectedGameKey,
          players: activeGamePlayers,
          targetRounds: selectedGameRounds,
          sideMode: selectedGameSideMode,
          isSpectator: true
        }, senderPeerId);

        // 🌟 방장 자신의 화면에서도 인게임 사이드바 관전자 목록 즉시 갱신!
        if (screens.game.classList.contains('active')) {
          _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);
          _showInGameAlert(`${data.name || '새 관전자'}님이 관전을 시작했습니다.`);
        }

        // 현재 게임 모듈이 스냅샷 동기화를 지원하는 경우 새 관전자에게 상태 스냅샷 전송 요청
        setTimeout(() => {
          if (currentGameModule && typeof currentGameModule.sendSnapshotTo === 'function') {
            currentGameModule.sendSnapshotTo(senderPeerId);
          }
        }, 150);
      }

      _checkGomokuPlayerCount();
      _broadcastRoomState();
      _updateRoomUI();

      // 🌐 Firebase 인원 수 업데이트
      if (window.FirebaseLobby && typeof window.FirebaseLobby.updatePlayerCount === 'function') {
        window.FirebaseLobby.updatePlayerCount(currentRoomCode, roomPlayers.length);
      }

      showToast(`${data.name || '새 플레이어'}님이 참가했습니다!`, 'success');

    } else if (data.type === 'guest_update_profile') {
      const player = roomPlayers.find(p => p.id === senderPeerId);
      if (player) {
        if (data.name) player.name = data.name;
        if (data.nameColor !== undefined) player.nameColor = data.nameColor;
        if (data.profileCard !== undefined) player.profileCard = data.profileCard;
        if (data.avatarIcon) player.avatarIcon = data.avatarIcon;
        if (data.avatarColor) player.avatarColor = data.avatarColor;
        if (data.avatarFrame !== undefined) player.avatarFrame = data.avatarFrame;
        if (data.chatBubble !== undefined) player.chatBubble = data.chatBubble;
        if (data.victoryEffect !== undefined) player.victoryEffect = data.victoryEffect;
        if (typeof data.level === 'number') player.level = data.level;
        if (typeof data.exp === 'number') player.exp = data.exp;
        if (data.stats) player.stats = data.stats;

        // 인게임 진행 중이면 활성 플레이어 정보도 갱신
        const ap = activeGamePlayers.find(p => p.id === senderPeerId);
        if (ap) {
          if (data.name) ap.name = data.name;
          if (data.nameColor !== undefined) ap.nameColor = data.nameColor;
          if (data.profileCard !== undefined) ap.profileCard = data.profileCard;
          if (data.avatarIcon) ap.avatarIcon = data.avatarIcon;
          if (data.avatarColor) ap.avatarColor = data.avatarColor;
          if (data.avatarFrame !== undefined) ap.avatarFrame = data.avatarFrame;
          if (data.chatBubble !== undefined) ap.chatBubble = data.chatBubble;
          if (data.victoryEffect !== undefined) ap.victoryEffect = data.victoryEffect;
        }

        _broadcastRoomState();
        _updateRoomUI();
      }

    } else if (data.type === 'guest_leave_room') {
      _onHostGuestLeave(senderPeerId);

    } else if (data.type === 'toggle_ready') {
      const player = roomPlayers.find(p => p.id === senderPeerId);
      if (player) {
        if (typeof data.isReady === 'boolean') {
          player.isReady = data.isReady;
        } else {
          player.isReady = !player.isReady;
        }
        _broadcastRoomState();
        _updateRoomUI();
      }

    } else if (data.type === 'guest_leave_game') {
      // 게스트가 게임 도중 [방으로 돌아가기]를 누름
      const leaverName = data.name || '플레이어';
      console.log('[Host] 게스트가 게임에서 나감:', leaverName, senderPeerId);

      activeGamePlayers = activeGamePlayers.filter(p => p.id !== senderPeerId);

      const rPlayer = roomPlayers.find(p => p.id === senderPeerId);
      if (rPlayer) { rPlayer.isReady = false; rPlayer.isSpectating = false; }

      // 🌟 게임 모듈에 탈주자 제거 알림 → 남은 인원끼리 게임 계속
      if (currentGameModule && typeof currentGameModule.removePlayer === 'function') {
        currentGameModule.removePlayer(senderPeerId);
      }

      // 남아있는 다른 모든 게스트들에게 브로드캐스트
      P2P.send({
        type: 'player_left_game_broadcast',
        playerId: senderPeerId,
        name: leaverName
      });

      _showInGameAlert(`${leaverName}님이 게임을 나갔습니다.`);
      _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);

      _broadcastRoomState();

    } else if (data.type === 'chat_msg') {
      // 호스트가 게스트로부터 채팅 수신 -> 호스트 화면에 표시
      _appendChatMessage(data, false);
      // 메시지를 보낸 게스트를 제외한 다른 게스트들에게만 릴레이 브로드캐스트
      P2P.send(data, null, senderPeerId);
    }else if (data.type === 'profile_emoji') {
      // 🌟 호스트 화면에 이모지 표시
      _showProfileEmoji(data.senderId, data.emojiSrc);
      // 🌟 메시지를 보낸 게스트를 제외한 다른 게스트들에게 릴레이 전송!
      P2P.send(data, null, senderPeerId);
    }
  }

  function _checkGomokuPlayerCount() {
    if (roomPlayers.length >= 3 && selectedGameKey === 'gomoku') {
      selectedGameKey = 'baskin31';
      showToast('참가자가 3명 이상이 되어 오목 대신 베스킨라빈스 31로 변경되었습니다.', 'warn');
    }
  }

  function _broadcastRoomState() {
    P2P.send({
      type: 'room_state',
      roomCode: currentRoomCode,
      players: roomPlayers,
      maxPlayers: currentRoomMaxPlayers,
      selectedGame: selectedGameKey,
      isGameActive: isRoomGameActive,
      activePlayerIds: activeGamePlayers.map(p => p.id)
    });
    // 👥 전체 참가자 목록 브로드캐스트
    P2P.send({
      type: 'UPDATE_PARTICIPANTS',
      list: roomPlayers,
      isGameActive: isRoomGameActive,
      activePlayerIds: activeGamePlayers.map(p => p.id)
    });

    // 🌟 방장 화면에서도 게임 중일 때 사이드바 즉시 리렌더링
    if (screens.game.classList.contains('active')) {
      _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);
    }
  }

  /* =====================================================================
     5. 게스트측 P2P 시스템 메시지 처리
     ===================================================================== */
  function _onGuestReceiveMessage(data) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'password_required') {
      hideLoading();
      const targetCode = data.roomCode || currentRoomCode;
      currentRoomCode = '';
      P2P.destroy();
      _openPasswordJoinModal(targetCode);
      return;

    } else if (data.type === 'wrong_password') {
      hideLoading();
      currentRoomCode = '';
      P2P.destroy();
      showToast(data.message || '비밀번호가 일치하지 않습니다.', 'error');
      showScreen('home');
      return;

    } else if (data.type === 'room_state') {
      const prevGameKey = selectedGameKey;
      currentRoomCode = data.roomCode;
      roomPlayers = data.players || [];
      if (data.maxPlayers) currentRoomMaxPlayers = data.maxPlayers;
      selectedGameKey = data.selectedGame || 'gomoku';
      if (prevGameKey && selectedGameKey && prevGameKey !== selectedGameKey && screens.room && screens.room.classList.contains('active')) {
        const gameName = GAMES[selectedGameKey] ? GAMES[selectedGameKey].title : selectedGameKey;
        showToast(`방장이 게임을 [${gameName}](으)로 변경했습니다.`, 'info');
      }
      if (typeof data.gameRounds === 'number') selectedGameRounds = data.gameRounds;
      if (data.gameSideMode) selectedGameSideMode = data.gameSideMode;
      _updateGameExtraSettingsUI();
      isRoomGameActive = !!data.isGameActive;
      if (Array.isArray(data.activePlayerIds) && data.activePlayerIds.length > 0) {
        const mapped = data.activePlayerIds.map(id => roomPlayers.find(p => String(p.id) === String(id))).filter(Boolean);
        if (mapped.length > 0) activeGamePlayers = mapped;
      } else if (!isRoomGameActive) {
        activeGamePlayers = [];
      }

      const myId = P2P.getMyId();
      const me = roomPlayers.find(p => !p.isHost && (p.id === myId || (p.name === myNickname && !myId)));
      isMyReady = me ? !!me.isReady : false;

      if ($('room-code-display')) $('room-code-display').textContent = currentRoomCode;

      // 🎮 현재 게임 화면(screen-game)에 있을 때는 사이드바 갱신, 아니면 방 UI 갱신
      if (screens.game.classList.contains('active')) {
        _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);
      } else if (!screens.room.classList.contains('active')) {
        _enterRoomScreen();
      } else {
        _updateRoomUI();
      }

    } else if (data.type === 'UPDATE_PARTICIPANTS') {
      // 👥 실시간 참가자 목록 동기화 수신
      if (Array.isArray(data.list)) {
        roomPlayers = data.list;
        if (typeof data.isGameActive === 'boolean') {
          isRoomGameActive = data.isGameActive;
        }
        if (Array.isArray(data.activePlayerIds) && data.activePlayerIds.length > 0) {
          const mapped = data.activePlayerIds.map(id => roomPlayers.find(p => String(p.id) === String(id))).filter(Boolean);
          if (mapped.length > 0) activeGamePlayers = mapped;
        } else if (!isRoomGameActive) {
          activeGamePlayers = [];
        }

        const myId = P2P.getMyId();
        const me = roomPlayers.find(p => !p.isHost && (p.id === myId || (p.name === myNickname && !myId)));
        if (me) {
          isMyReady = !!me.isReady;
        }
        
        if (screens.game.classList.contains('active')) {
          _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);
        } else {
          _updateRoomUI();
        }
      }

    } else if (data.type === 'room_full') {
      showToast(data.message || '방이 가득 찼습니다.', 'error');
      P2P.destroy();
      showScreen('home');

    } else if (data.type === 'start_spectate') {
      console.log('[Guest] start_spectate 수신 -> 관전 모드로 게임 진입:', data.game);
      selectedGameKey = data.game;
      activeGamePlayers = data.players || [];
      isRoomGameActive = true; roomPlayers.forEach(p => p.isSpectating = undefined);
      if (typeof data.targetRounds === 'number') selectedGameRounds = data.targetRounds;
      if (data.sideMode) selectedGameSideMode = data.sideMode;
      _launchGame(data.game, activeGamePlayers, data.startWord, selectedGameRounds, selectedGameSideMode, true /* isSpectator */);
      showToast('[관전 모드] 진행 중인 게임의 실시간 관전을 시작합니다.', 'info');

    } else if (data.type === 'start_game') {
      console.log('[Guest] start_game 수신 -> 게임 실행:', data.game);
      selectedGameKey = data.game;
      activeGamePlayers = data.players || [...roomPlayers];
      isRoomGameActive = true;
      if (typeof data.targetRounds === 'number') selectedGameRounds = data.targetRounds;
      if (data.sideMode) selectedGameSideMode = data.sideMode;
      _launchGame(data.game, activeGamePlayers, data.startWord, selectedGameRounds, selectedGameSideMode);

    } else if (data.type === 'return_to_room') {
      _exitGameToRoom();

    } else if (data.type === 'player_left_game_broadcast') {
      // 다른 플레이어가 게임에서 나감
      console.log('[Guest] player_left_game_broadcast 수신:', data.name);
      activeGamePlayers = activeGamePlayers.filter(p => p.id !== data.playerId);
      // 🌟 게임 모듈에 탈주자 제거 알림 → 남은 인원끼리 게임 계속
      if (currentGameModule && typeof currentGameModule.removePlayer === 'function') {
        currentGameModule.removePlayer(data.playerId);
      }
      _showInGameAlert(`${data.name}님이 게임을 나갔습니다.`);
      _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);

    } else if (data.type === 'player_left_room_broadcast') {
      // 다른 플레이어가 방 자체를 나감
      const exists = roomPlayers.some(p => p.id === data.playerId) || activeGamePlayers.some(p => p.id === data.playerId);
      if (!exists) return; // 이미 처리된 퇴장이면 무시

      console.log('[Guest] player_left_room_broadcast 수신:', data.name);
      roomPlayers = roomPlayers.filter(p => p.id !== data.playerId);
      activeGamePlayers = activeGamePlayers.filter(p => p.id !== data.playerId);
      _appendChatMessage({ isSystem: true, text: `${data.name}님이 퇴장하셨습니다.` });
      _showInGameAlert(`${data.name}님이 방을 나갔습니다.`);
      showToast(`${data.name}님이 방을 나갔습니다.`, 'warn');
      _updateRoomUI();
      _renderInGamePlayerSidebar(activeGamePlayers, selectedGameKey);

    } else if (data.type === 'KICK') {
      // 🚫 방장에 의해 강퇴 처리
      if (!data.targetId || data.targetId === P2P.getMyId()) {
        showToast(data.reason || '방장에 의해 강퇴되었습니다.', 'error');
        _leaveRoom();
      }

    } else if (data.type === 'DELEGATE_HOST') {
      console.log('[Guest] DELEGATE_HOST 패킷 수신:', data);
      _isMigratingHost = true;

      const myId = String(P2P.getMyId() || '');
      const targetHostId = data.targetHostId ? String(data.targetHostId) : '';
      const targetHostName = data.targetHostName;
      const roomCode = data.roomCode || currentRoomCode;
      const oldHostLeft = !!data.oldHostLeft;
      const guests = roomPlayers.filter(p => !p.isHost && (oldHostLeft ? (p.name !== data.oldHostName && p.id !== data.oldHostId) : true));
      const myIdxInGuests = guests.findIndex(p => (p.id && String(p.id) === myId) || p.name === myNickname);
      const amINewHost = (targetHostId && targetHostId === myId) || 
                         (targetHostName && targetHostName === myNickname) ||
                         (myIdxInGuests === 0);

      // 인게임 중인 경우 안전하게 대기실로 복귀
      if (currentGameModule) {
        try { currentGameModule.destroy(); } catch (_) {}
        currentGameModule = null;
      }
      if ($('game-content')) $('game-content').innerHTML = '';
      const overlayCount = $('overlay-countdown');
      if (overlayCount) overlayCount.classList.add('hidden');
      const overlayRes = $('overlay-game-result');
      if (overlayRes) overlayRes.classList.add('hidden');
      isRoomGameActive = false;
      activeGamePlayers = [];

      if (amINewHost) {
        // 🌟 내가 새로운 방장으로 승격!
        showToast('👑 방장으로 위임되었습니다!', 'success');
        _appendChatMessage({ isSystem: true, text: `👑 ${myNickname}님이 새로운 방장이 되었습니다!` });

        P2P.destroy();
        _promoteToHost(roomCode, oldHostLeft, { id: data.oldHostId, name: data.oldHostName });

      } else {
        // 👥 다른 게스트: 새 방장에게 재연결
        showToast(`👑 ${targetHostName}님이 새 방장이 되었습니다. 재연결 중...`, 'info');
        _appendChatMessage({ isSystem: true, text: `👑 ${targetHostName}님이 새로운 방장이 되었습니다.` });

        P2P.destroy();
        setTimeout(() => {
          _reconnectAsGuest(roomCode, targetHostName);
        }, 1200);
      }

    } else if (data.type === 'host_left_room') {
      // 🚪 방장이 방을 나감 -> 모든 참가자 로비/홈으로 자동 퇴장
      showToast(data.message || '방장이 퇴장하여 방이 종료되었습니다.', 'error');
      _leaveRoom();

    } else if (data.type === 'chat_msg') {
      // 내가 보낸 메시지의 에코 반사인 경우 무시
      if (data.senderId && data.senderId === P2P.getMyId()) return;
      // 상대방이 보낸 채팅 메시지 수신 및 렌더링
      _appendChatMessage(data, false);
    } else if (data.type === 'profile_emoji') {
      // 🌟 게스트 수신부: 내가 보낸 이모지의 에코 반사는 무시하고 화면에 표시
      if (data.senderId && data.senderId === P2P.getMyId()) return;
      _showProfileEmoji(data.senderId, data.emojiSrc);
    }
  }

  

  /* =====================================================================
     실시간 채팅 기능 (방 & 인게임 양방향 동기화)
     ===================================================================== */
/* =====================================================================
     실시간 채팅 기능 (방 & 인게임 양방향 동기화)
     ===================================================================== */
  const BAD_WORDS = ['시발', '씨발', '병신', '개새끼', '존나', '지랄', '엠창', '느금']; // 필요에 따라 단어 추가
  let _lastChatTime = 0;
  const CHAT_COOLDOWN = 1000; // 1초 쿨타임

  function _sendChatMessage(inputElId) {
    const inputEl = $(inputElId);
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) return;

    // 1. 도배 제한 (1초 쿨타임 검사)
    const nowTs = Date.now();
    if (nowTs - _lastChatTime < CHAT_COOLDOWN) {
      if (typeof showToast === 'function') {
        showToast('메시지를 너무 빠르게 보낼 수 없습니다.', 'warn');
      }
      return;
    }

    // 2. 욕설 검열 (*로 치환)
    let cleanText = text;
    BAD_WORDS.forEach(word => {
      const regex = new RegExp(word, 'gi');
      cleanText = cleanText.replace(regex, '***');
    });

    _lastChatTime = nowTs;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const myBubbleItemForSend = SHOP_CHAT_BUBBLES.find(b => b.id === myChatBubble);
    const myBubbleClassForSend = (myBubbleItemForSend && myBubbleItemForSend.bubbleClass && myBubbleItemForSend.bubbleClass !== 'bubble-default') ? myBubbleItemForSend.bubbleClass : '';

    const msgObj = {
      type: 'chat_msg',
      senderId: P2P.getMyId(),
      senderName: myNickname,
      senderNameColor: myNicknameColor || null,
      isHost: P2P.isHost(),
      text: cleanText, // 검열된 텍스트 적용
      time: timeStr,
      chatBubbleClass: myBubbleClassForSend
    };

    // 내 화면에 메시지 렌더링
    _appendChatMessage(msgObj, true);

    // P2P 전송
    P2P.send(msgObj);

    // 입력창 비우기 및 포커스 유지
    inputEl.value = '';
    inputEl.focus();
  }

  function _appendChatMessage(data, isMe) {
    if (!data || !data.text) return;

    const targetContainers = [
      $('room-chat-messages'),
      $('game-chat-messages')
    ];

    if (data.isSystem) {
      targetContainers.forEach(container => {
        if (!container) return;
        const sysEl = document.createElement('div');
        sysEl.className = 'chat-system-msg';
        sysEl.textContent = data.text;
        container.appendChild(sysEl);
        container.scrollTop = container.scrollHeight;
      });
      return;
    }

    const isHost = data.isHost;
    const senderName = data.senderName || '플레이어';
    const senderColor = isMe ? myNicknameColor : data.senderNameColor;
    const time = data.time || '';

    // 말풍선 스킨 클래스 - 내 메시지면 내 설정, 상대 메시지면 상대가 보낸 bubbleClass 사용
    const myBubbleItem = SHOP_CHAT_BUBBLES.find(b => b.id === myChatBubble);
    const myBubbleClass = (myBubbleItem && myBubbleItem.bubbleClass && myBubbleItem.bubbleClass !== 'bubble-default') ? myBubbleItem.bubbleClass : '';
    const senderBubbleClass = data.chatBubbleClass || '';

    targetContainers.forEach(container => {
      if (!container) return;

      const msgEl = document.createElement('div');
      msgEl.className = 'chat-msg ' + (isMe ? 'me' : 'other');

      if (isMe) {
        msgEl.innerHTML = `
          <div class="chat-bubble ${myBubbleClass}">${_escapeHtml(data.text)}</div>
          <div class="chat-time">${_escapeHtml(time)}</div>
        `;
      } else {
        msgEl.innerHTML = `
          <div class="chat-sender-info">
            <span class="${senderColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${senderColor && senderColor !== 'rainbow' ? `color:${senderColor}; font-weight:800;` : ''}">${_escapeHtml(senderName)}</span>
            ${isHost ? '<i class="fa-solid fa-crown" style="color:var(--yellow);font-size:0.65rem;"></i>' : ''}
          </div>
          <div class="chat-bubble ${senderBubbleClass}">${_escapeHtml(data.text)}</div>
          <div class="chat-time">${_escapeHtml(time)}</div>
        `;
      }

      container.appendChild(msgEl);
      container.scrollTop = container.scrollHeight;
    });

    // 모바일에서 채팅창이 닫혀있는 동안 상대방 메시지 도착 시 뱃지 표시
    if (!isMe) {
      const gameChatPanel = $('game-chat-panel');
      const gameBadge = $('mobile-chat-badge');
      if (gameChatPanel && !gameChatPanel.classList.contains('mobile-open') && gameBadge) {
        gameBadge.classList.remove('hidden');
      }

      const roomChatPanel = $('room-chat-panel');
      const roomBadge = $('room-mobile-chat-badge');
      if (roomChatPanel && !roomChatPanel.classList.contains('mobile-open') && roomBadge) {
        roomBadge.classList.remove('hidden');
      }
    }

    Sound.playChat();
  }

  // ── 📱 모바일 인게임 채팅 팝업 제어 ──
  function _openMobileChat() {
    _pushHistory({ modal: 'chat' }, '#chat');
    const chatPanel = $('game-chat-panel');
    const backdrop = $('mobile-chat-backdrop');
    const badge = $('mobile-chat-badge');
    if (chatPanel) chatPanel.classList.add('mobile-open');
    if (backdrop) backdrop.classList.remove('hidden');
    if (badge) badge.classList.add('hidden');
    const input = $('game-chat-input');
    if (input) setTimeout(() => input.focus(), 150);
  }

  function _closeMobileChat() {
    if (_backHistoryIfModal('chat')) return;
    const chatPanel = $('game-chat-panel');
    const backdrop = $('mobile-chat-backdrop');
    if (chatPanel) chatPanel.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.add('hidden');
  }

  if ($('btn-mobile-chat-toggle')) $('btn-mobile-chat-toggle').addEventListener('click', _openMobileChat);
  if ($('btn-close-mobile-chat')) $('btn-close-mobile-chat').addEventListener('click', _closeMobileChat);
  if ($('mobile-chat-backdrop')) $('mobile-chat-backdrop').addEventListener('click', _closeMobileChat);

  // ── 방 채팅 최신 메시지(맨 아래) 자동 스크롤 ──
  function _scrollRoomChatToBottom() {
    const el = $('room-chat-messages');
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
    setTimeout(() => {
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
    setTimeout(() => {
      if (el) el.scrollTop = el.scrollHeight;
    }, 200);
  }

  // ── 📱 모바일 방(대기실) 채팅 팝업 제어 ──
  function _openRoomMobileChat() {
    _pushHistory({ modal: 'room_chat' }, '#room_chat');
    const chatPanel = $('room-chat-panel');
    const backdrop = $('room-mobile-chat-backdrop');
    const badge = $('room-mobile-chat-badge');
    if (chatPanel) chatPanel.classList.add('mobile-open');
    if (backdrop) backdrop.classList.remove('hidden');
    if (badge) badge.classList.add('hidden');
    _scrollRoomChatToBottom();
    const input = $('room-chat-input');
    if (input) setTimeout(() => input.focus(), 150);
  }

  function _closeRoomMobileChat() {
    if (_backHistoryIfModal('room_chat')) return;
    const chatPanel = $('room-chat-panel');
    const backdrop = $('room-mobile-chat-backdrop');
    if (chatPanel) chatPanel.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.add('hidden');
  }

  if ($('btn-room-mobile-chat-toggle')) $('btn-room-mobile-chat-toggle').addEventListener('click', _openRoomMobileChat);
  if ($('btn-close-room-mobile-chat')) $('btn-close-room-mobile-chat').addEventListener('click', _closeRoomMobileChat);
  if ($('room-mobile-chat-backdrop')) $('room-mobile-chat-backdrop').addEventListener('click', _closeRoomMobileChat);

  // 채팅 이벤트 바인딩
  $('btn-room-chat-send').addEventListener('click', () => _sendChatMessage('room-chat-input'));
  $('room-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      _sendChatMessage('room-chat-input');
    }
  });

  $('btn-game-chat-send').addEventListener('click', () => _sendChatMessage('game-chat-input'));
  $('game-chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      _sendChatMessage('game-chat-input');
    }
  });

  function _onHostDisconnect() {
    console.log('[Host] 방 연결 종료');
  }

  function _onGuestDisconnect() {
    console.log('[Guest] 호스트와의 연결 끊김 감지. _isMigratingHost:', _isMigratingHost);
    // 방장 위임 마이그레이션 진행 중 발생하는 구 호스트와의 일시적 연결 종료는 무시
    if (_isMigratingHost) return;

    // 방장의 예기치 않은 연결 종료(브라우저 강제 종료, 네트워크 오류 등) 시:
    // 참가자 목록 중 최상단(첫 번째 게스트)에게 방장 권한 자동 위임!
    const myId = String(P2P.getMyId() || '');
    const remainingGuests = roomPlayers.filter(p => !p.isHost);
    if (remainingGuests.length > 0) {
      const nextHost = remainingGuests[0];
      const myIdxInGuests = remainingGuests.findIndex(p => (p.id && String(p.id) === myId) || p.name === myNickname);
      const amINextHost = (nextHost.id && String(nextHost.id) === myId) || 
                         (nextHost.name === myNickname) || 
                         (myIdxInGuests === 0);

      // 인게임 정리
      if (currentGameModule) {
        try { currentGameModule.destroy(); } catch (_) {}
        currentGameModule = null;
      }
      if ($('game-content')) $('game-content').innerHTML = '';
      const overlayCount = $('overlay-countdown');
      if (overlayCount) overlayCount.classList.add('hidden');
      const overlayRes = $('overlay-game-result');
      if (overlayRes) overlayRes.classList.add('hidden');
      isRoomGameActive = false;
      activeGamePlayers = [];

      _isMigratingHost = true;
      const roomCode = currentRoomCode;

      if (amINextHost) {
        showToast('방장의 연결이 끊어졌습니다. 방장 권한을 자동으로 이어받습니다...', 'warn');
        _appendChatMessage({ isSystem: true, text: `⚠️ 방장의 연결이 끊겨 ${myNickname}님이 새로운 방장이 되었습니다.` });
        P2P.destroy();
        _promoteToHost(roomCode, true, { name: '이전 방장' });
      } else {
        showToast(`방장의 연결이 끊어졌습니다. ${nextHost.name}님에게 방장이 위임됩니다. 재연결 중...`, 'warn');
        _appendChatMessage({ isSystem: true, text: `⚠️ 방장의 연결이 끊겨 ${nextHost.name}님이 새로운 방장이 되었습니다.` });
        P2P.destroy();
        setTimeout(() => {
          _reconnectAsGuest(roomCode, nextHost.name);
        }, 1500);
      }
      return;
    }

    showToast('방장이 퇴장하여 방이 해체되었습니다.', 'error');
    _leaveRoom(true);
  }

  /* =====================================================================
     6. 방 화면 (`screen-room`) UI 렌더링 및 제어
     ===================================================================== */
  function _enterRoomScreen(pushState = true) {
    showScreen('room', pushState);
    $('room-code-display').textContent = currentRoomCode;
    _updateRoomUI();
    _scrollRoomChatToBottom();
  }

  function _updateRoomUI() {
    const amIHost = P2P.isHost() || isHostPlayer;
    const playerCount = roomPlayers.length;

    if ($('room-capacity-text')) {
      $('room-capacity-text').textContent = `${playerCount} / ${currentRoomMaxPlayers}`;
    }
    if ($('player-count-badge')) {
      $('player-count-badge').textContent = `${playerCount} / ${currentRoomMaxPlayers}명`;
    }

    // 🎮 게임 진행 중 알림 배너 토글
    const alertEl = $('room-playing-alert');
    if (alertEl) {
      if (isRoomGameActive) {
        alertEl.classList.remove('hidden');
      } else {
        alertEl.classList.add('hidden');
      }
    }

    const listEl = $('player-list');
    listEl.innerHTML = '';

    roomPlayers.forEach(p => {
      const isThisHost = !!p.isHost;
      const isMe = (p.id === P2P.getMyId() || (isThisHost && amIHost));
      const isInActiveGame = isRoomGameActive && activeGamePlayers.some(ap => ap.id === p.id);
      const isReadyGuest = !isThisHost && !!p.isReady;
      const canManage = amIHost && !isThisHost && !isMe;

      const li = document.createElement('li');

      li.setAttribute('data-player-id', p.id);
      li.setAttribute('data-id', p.id);
      const cardTheme = p.profileCard || (isMe ? myProfileCard : 'default');
      const pFrame = p.avatarFrame || (isMe ? myAvatarFrame : 'default');
      const frameClass = _getAvatarFrameClass(pFrame);
      li.className = 'player-item' + 
        (isMe ? ' is-me' : '') +
        (isInActiveGame ? ' is-in-game' : (isReadyGuest ? ' ready' : (isThisHost ? ' host-item' : ''))) + 
        (canManage ? ' can-manage' : '');
      _applyProfileCardTheme(li, cardTheme);

      let readyBadgeHtml = '';
      if (isInActiveGame) {
        readyBadgeHtml = '<div class="ready-badge is-playing">게임 진행 중</div>';
      } else if (!isThisHost) {
        readyBadgeHtml = `<div class="ready-badge ${isReadyGuest ? 'is-ready' : ''}">${isReadyGuest ? '준비 완료' : '대기 중'}</div>`;
      }

      li.innerHTML = `
        <div class="player-avatar-wrap">
          <div class="player-avatar ${frameClass}" style="background:${p.avatarColor || '#38a169'};"><i class="${p.avatarIcon || 'fa-solid fa-paw'}"></i></div>
          <span class="player-level-badge ${_getLevelTierClass(p.level || 1)}">${p.level || 1}</span>
        </div>
        <div class="player-meta">
          <div class="player-name ${p.nameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${p.nameColor && p.nameColor !== 'rainbow' ? `color:${p.nameColor}; font-weight:800;` : ''}">
            ${_escapeHtml(p.name)}
            ${isThisHost ? '<i class="fa-solid fa-crown crown-icon"></i>' : ''}
            ${canManage ? '<button type="button" class="btn-manage-trigger" title="참가자 관리"><i class="fa-solid fa-ellipsis-vertical"></i></button>' : ''}
          </div>
          <div class="player-role"></div>
        </div>
        ${readyBadgeHtml}
      `;

      // 🌟 참가자 클릭 이벤트 (전적 보기 & 방장 관리 메뉴)
      const triggerBtn = li.querySelector('.btn-manage-trigger');
      if (triggerBtn) {
        triggerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          _openPlayerActionMenu(e, p);
        });
      }
      li.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-manage-trigger')) {
          _openPlayerActionMenu(e, p);
        }
      });

      listEl.appendChild(li);
    });

    const slotsEl = $('player-slots');
    slotsEl.innerHTML = '';
    const emptyCount = Math.max(0, currentRoomMaxPlayers - playerCount);
    for (let i = 0; i < emptyCount; i++) {
      const slot = document.createElement('div');
      slot.className = 'player-slot-empty can-invite';
      slot.title = '클릭하여 친구 초대하기';
      slot.innerHTML = `
        <div class="slot-avatar"><i class="fa-solid fa-user-plus"></i></div>
        <div class="slot-text">참가자 대기 중...</div>
      `;
      slot.addEventListener('click', () => {
        _openFriendsModal('list');
      });
      slotsEl.appendChild(slot);
    }

    document.querySelectorAll('.room-game-btn').forEach(btn => {
      const gKey = btn.dataset.game;
      btn.classList.toggle('selected', gKey === selectedGameKey);

      const gDef = GAMES[gKey];
      const isOverCap = gDef && gDef.maxPlayers && playerCount > gDef.maxPlayers;

      if (isOverCap) {
        btn.classList.add('disabled-3p');
        btn.title = `${gDef.title}은(는) ${gDef.maxPlayers}인 전용 게임입니다 (현재 ${playerCount}명 접속 중)`;
      } else {
        btn.classList.remove('disabled-3p');
        btn.title = '';
      }

      if (amIHost && !isOverCap) {
        btn.classList.remove('disabled-game');
      } else {
        btn.classList.add('disabled-game');
      }
    });

    const selGameObj = GAMES[selectedGameKey];
    if ($('selected-game-name')) {
      $('selected-game-name').textContent = selGameObj ? `${selGameObj.title} 선택됨` : '게임을 선택해 주세요';
    }

    // 🌟 현재 선택된 게임 프리뷰 요약 바 갱신
    const bannerEl = $('room-selected-game-banner');
    if (bannerEl && selGameObj) {
      try {
        const iconEl = $('rsgb-icon');
        const titleEl = $('rsgb-title');
        const tagEl = $('rsgb-tag');
        const descEl = $('rsgb-desc');

        const is2P = (selGameObj.maxPlayers === 2);
        const tooltipMeta = (typeof GAME_TOOLTIP_DATA !== 'undefined' && GAME_TOOLTIP_DATA[selectedGameKey]) ? GAME_TOOLTIP_DATA[selectedGameKey] : null;
        if (iconEl) iconEl.className = (tooltipMeta && tooltipMeta.icon) || selGameObj.icon || 'fa-solid fa-gamepad';
        if (titleEl) titleEl.textContent = selGameObj.title;
        if (tagEl) {
          tagEl.textContent = is2P ? '2인 전용' : (selGameObj.maxPlayers ? `2~${selGameObj.maxPlayers}인` : '다인원');
          tagEl.className = `rsgb-tag ${is2P ? 'tag-2p' : 'tag-multi'}`;
        }
        if (descEl) descEl.textContent = (tooltipMeta && tooltipMeta.desc) || selGameObj.desc || '';
      } catch (e) {
        console.warn('Banner update error:', e);
      }
    }

    if ($('game-select-role-hint')) {
      if (playerCount >= 3) {
        $('game-select-role-hint').textContent = amIHost ? '3인 이상은 2~5인 게임만 선택 가능' : '방장만 변경 가능';
      } else {
        $('game-select-role-hint').textContent = amIHost ? '클릭하여 게임 변경' : '방장만 변경 가능';
      }
    }

    const btnReady = $('btn-ready');
    const btnStart = $('btn-start-game');
    const readyHint = $('ready-hint');
    const guestWaitHint = $('guest-wait-hint');

    if (amIHost || isDevMode) {
      btnReady.classList.add('hidden');
      btnStart.classList.remove('hidden');
      guestWaitHint.classList.add('hidden');

      if (isDevMode) {
        btnStart.disabled = false;
        btnStart.classList.add('ready-pulse');
        readyHint.textContent = '개발자 모드: 1인 테스트 시작 가능';
      } else {
        const guests = roomPlayers.filter(p => !p.isHost);
        const allGuestsReady = guests.length >= 1 && guests.every(p => !!p.isReady);
        const isSelectedOverCapacity = selGameObj && selGameObj.maxPlayers && playerCount > selGameObj.maxPlayers;

        btnStart.disabled = !allGuestsReady || isSelectedOverCapacity;
        if (allGuestsReady && !isSelectedOverCapacity) {
          btnStart.classList.add('ready-pulse');
        } else {
          btnStart.classList.remove('ready-pulse');
        }

        if (guests.length === 0) {
          readyHint.textContent = '게임을 시작하려면 최소 1명의 참가자가 필요합니다.';
        } else if (isSelectedOverCapacity) {
          readyHint.textContent = `${selGameObj.title}은(는) ${selGameObj.maxPlayers}인 전용 게임입니다. 다른 게임을 선택해 주세요.`;
        } else if (!allGuestsReady) {
          const notReadyCount = guests.filter(p => !p.isReady).length;
          readyHint.textContent = `모든 참가자가 준비 완료되어야 시작할 수 있습니다. (${notReadyCount}명 준비 중)`;
        } else {
          readyHint.textContent = `모든 참가자(${playerCount}명) 준비 완료! 게임을 시작하세요.`;
        }
      }

    } else {
      btnReady.classList.remove('hidden');
      btnStart.classList.add('hidden');
      guestWaitHint.classList.remove('hidden');

      btnReady.className = 'btn btn-ready' + (isMyReady ? ' is-ready' : '');
      btnReady.querySelector('span').textContent = isMyReady ? '준비 완료' : '준비하기';
      btnReady.querySelector('i').className = isMyReady ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';

      readyHint.textContent = isMyReady
        ? '준비 완료! 방장이 게임을 시작할 때까지 기다려 주세요.'
        : '준비하기 버튼을 눌러 게임에 참여하세요.';
    }

    _updateGameExtraSettingsUI();
  }

  // 게임 선택 클릭 이벤트 (방장 및 개발자 모드)
  document.querySelectorAll('.room-game-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const amIHost = P2P.isHost() || isHostPlayer;
      if (!amIHost && !isDevMode) {
        showToast('게임 선택은 방장만 가능합니다.', 'warn');
        return;
      }
      const gKey = btn.dataset.game;
      const gDef = GAMES[gKey];
      if (gDef && gDef.maxPlayers && roomPlayers.length > gDef.maxPlayers) {
        showToast(`${gDef.title}은(는) ${gDef.maxPlayers}인 전용 게임입니다 (현재 ${roomPlayers.length}명).`, 'warn');
        return;
      }

      if (gKey && GAMES[gKey]) {
        Sound.playClick();
        selectedGameKey = gKey;
        _broadcastRoomState();
        _updateRoomUI();
        if (amIHost && currentRoomCode && window.FirebaseLobby && typeof window.FirebaseLobby.updateRoomGame === 'function') {
          window.FirebaseLobby.updateRoomGame(currentRoomCode, selectedGameKey);
        }
      }
    });
  });

  // 게스트 준비 버튼 토글
  $('btn-ready').addEventListener('click', () => {
    const amIHost = P2P.isHost() || isHostPlayer;
    if (amIHost) return;
    isMyReady = !isMyReady;
    Sound.playReady();
    P2P.send({ type: 'toggle_ready', isReady: isMyReady });
    _updateRoomUI();
  });

  // 방장 게임 시작 (개발자 모드 포함)
  $('btn-start-game').addEventListener('click', () => {
    const amIHost = P2P.isHost() || isHostPlayer;
    if (!amIHost && !isDevMode) return;
    Sound.playStart();
    const curGameDef = GAMES[selectedGameKey];
    if (curGameDef && curGameDef.maxPlayers && roomPlayers.length > curGameDef.maxPlayers) {
      showToast(`${curGameDef.title}은(는) ${curGameDef.maxPlayers}인 전용 게임입니다.`, 'warn');
      return;
    }

    // 🎯 진영 및 턴 순서 결정
    let finalPlayers = [...roomPlayers];
    if (finalPlayers.length >= 2) {
      const hostP = finalPlayers.find(p => p.isHost) || finalPlayers[0];
      const guestP = finalPlayers.find(p => !p.isHost) || finalPlayers[1];

      if (selectedGameKey === 'gomoku') {
        // 오목: 0번=흑(선공), 1번=백(후공)
        if (selectedGameSideMode === 'host_black') {
          finalPlayers = [hostP, guestP];
        } else if (selectedGameSideMode === 'host_white') {
          finalPlayers = [guestP, hostP];
        } else if (selectedGameSideMode === 'shuffle') {
          finalPlayers = (Math.random() < 0.5) ? [hostP, guestP] : [guestP, hostP];
        } else {
          finalPlayers = [hostP, guestP];
        }
      } else if (selectedGameKey === 'chess' || selectedGameKey === 'chesswarfare') {
        // 체스 / 체스 워페어: 0번=백(선공), 1번=흑(후공)
        if (selectedGameSideMode === 'host_white') {
          finalPlayers = [hostP, guestP];
        } else if (selectedGameSideMode === 'host_black') {
          finalPlayers = [guestP, hostP];
        } else if (selectedGameSideMode === 'shuffle') {
          finalPlayers = (Math.random() < 0.5) ? [hostP, guestP] : [guestP, hostP];
        } else {
          finalPlayers = [hostP, guestP];
        }
      } else if (selectedGameKey === 'janggi' || selectedGameKey === 'alkkagi') {
        // 장기/알까기: 0번=초(선공), 1번=한(후공)
        if (selectedGameSideMode === 'host_black') { // 방장 초
          finalPlayers = [hostP, guestP];
        } else if (selectedGameSideMode === 'host_white') { // 방장 한
          finalPlayers = [guestP, hostP];
        } else if (selectedGameSideMode === 'shuffle') {
          finalPlayers = (Math.random() < 0.5) ? [hostP, guestP] : [guestP, hostP];
        } else {
          finalPlayers = [hostP, guestP];
        }
      } else if (curGameDef && curGameDef.isTurnBased) {
        finalPlayers = _shuffleArray([...roomPlayers]);
      }
    }

    activeGamePlayers = finalPlayers;

    let startWord = null;
    if (selectedGameKey === 'wordchain') {
      startWord = START_WORDS[Math.floor(Math.random() * START_WORDS.length)];
    }

    const currentRounds = selectedGameRounds || 3;
    const currentSide = selectedGameSideMode || 'shuffle';

    if (P2P.isHost()) {
      isRoomGameActive = true;
      P2P.send({
        type: 'start_game',
        game: selectedGameKey,
        players: finalPlayers,
        targetRounds: currentRounds,
        sideMode: currentSide,
        startWord: startWord
      });
      setTimeout(() => {
        _broadcastRoomState();
      }, 50);
      // 🌐 Firebase에 게임 진행 상태 기록
      if (window.FirebaseLobby && typeof window.FirebaseLobby.updateRoomStatus === 'function') {
        window.FirebaseLobby.updateRoomStatus(currentRoomCode, 'playing');
      }
    }

    _launchGame(selectedGameKey, finalPlayers, startWord, currentRounds, currentSide);
  });

  function _shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 방 나가기
  $('btn-leave-room').addEventListener('click', async () => {
    const amIHost = P2P.isHost() || isHostPlayer;
    const myPeerId = String(P2P.getMyId() || '');
    const remainingGuests = roomPlayers.filter(p => !p.isHost && (!p.id || String(p.id) !== myPeerId));
    const willDelegate = amIHost && remainingGuests.length > 0;

    const ok = await showConfirmDialog({
      title: '방 나가기',
      message: willDelegate
        ? `방을 나가시겠습니까? ${remainingGuests[0].name}님에게 방장이 자동 위임됩니다.`
        : '방을 나가시겠습니까? 로비 화면으로 돌아갑니다.',
      confirmText: '나가기',
      cancelText: '취소',
      icon: 'fa-solid fa-door-open',
      isDanger: true
    });
    if (ok) {
      if (!amIHost) {
        try {
          P2P.send({ type: 'guest_leave_room', name: myNickname });
        } catch (_) {}
      }
      await _leaveRoom();
    }
  });

  function _resetChatLogs() {
    const roomChatEl = $('room-chat-messages');
    const gameChatEl = $('game-chat-messages');
    if (roomChatEl) {
      roomChatEl.innerHTML = '<div class="chat-system-msg">방 채팅에 입장했습니다. 매너 있는 대화를 나눠보세요!</div>';
    }
    if (gameChatEl) {
      gameChatEl.innerHTML = '<div class="chat-system-msg">게임 중 실시간 응원과 대화를 나눠보세요!</div>';
    }
    _scrollRoomChatToBottom();
  }

  async function _leaveRoom(pushState = true) {
    const amIHost = P2P.isHost() || isHostPlayer;
    const myPeerId = String(P2P.getMyId() || '');

    if (amIHost) {
      // 🌐 방장이 퇴장할 때: 남아있는 다른 게스트가 있는지 확인 (ID 기반 검증으로 동명/테스트 계정 지원)
      const remainingGuests = roomPlayers.filter(p => !p.isHost && (!p.id || String(p.id) !== myPeerId));

      if (remainingGuests.length > 0) {
        // 남은 인원 중 최상단(첫 번째) 게스트에게 방장 자동 위임!
        const nextHost = remainingGuests[0];
        console.log('[Host] 방장 퇴장 -> 최상단 게스트에게 자동 위임:', nextHost.name, nextHost.id);

        if (window.FirebaseLobby && typeof window.FirebaseLobby.cancelRoomOnDisconnect === 'function') {
          try {
            await window.FirebaseLobby.cancelRoomOnDisconnect(currentRoomCode);
          } catch (_) {}
        }

        try {
          P2P.send({
            type: 'DELEGATE_HOST',
            targetHostId: nextHost.id,
            targetHostName: nextHost.name,
            roomCode: currentRoomCode,
            oldHostLeft: true,
            oldHostId: P2P.getMyId(),
            oldHostName: myNickname
          });
        } catch (_) {}

        showToast(`${nextHost.name}님에게 방장을 위임하고 퇴장합니다.`, 'info');

        // 🌟 WebRTC 패킷이 네트워크 데이터 채널을 통해 게스트에게 완전히 도달할 수 있도록 300ms 대기
        await new Promise(r => setTimeout(r, 300));

      } else {
        // 남은 게스트가 없으면 방 정상 종료 및 삭제
        try {
          P2P.send({
            type: 'host_left_room',
            message: '방장이 퇴장하여 방이 종료되었습니다.'
          });
        } catch (_) {}

        if (currentRoomCode && window.FirebaseLobby && typeof window.FirebaseLobby.removeRoom === 'function') {
          window.FirebaseLobby.removeRoom(currentRoomCode);
        }
      }
    }

    if (currentGameModule) {
      try { currentGameModule.destroy(); } catch (_) {}
      currentGameModule = null;
    }
    if ($('game-content')) $('game-content').innerHTML = '';
    const overlayCount = $('overlay-countdown');
    if (overlayCount) overlayCount.classList.add('hidden');
    const overlayRes = $('overlay-game-result');
    if (overlayRes) overlayRes.classList.add('hidden');

    P2P.destroy();
    roomPlayers = [];
    activeGamePlayers = [];
    isHostPlayer = false;
    isMyReady = false;
    isDevMode = false;
    currentRoomCode = '';
    _isMigratingHost = false;
    _resetChatLogs();
    showScreen('home');
  }

  // 🌟 방 코드 복사 (아이콘 시각 피드백 연동 및 룸 코드 클릭 복사)
  const btnCopyRoom = $('btn-copy-room-code');
  if (btnCopyRoom) {
    btnCopyRoom.addEventListener('click', () => {
      _copyToClipboard(currentRoomCode, btnCopyRoom);
    });
  }
  const roomCodeDisplay = $('room-code-display');
  if (roomCodeDisplay) {
    roomCodeDisplay.addEventListener('click', () => {
      _copyToClipboard(currentRoomCode, roomCodeDisplay);
    });
  }
  const btnCopyCode2 = $('btn-copy-code');
  if (btnCopyCode2) {
    btnCopyCode2.addEventListener('click', () => {
      _copyToClipboard(currentRoomCode, btnCopyCode2);
    });
  }

  // 🌟 대기실 친구 초대 버튼 리스너
  const btnRoomInvite = $('btn-room-invite');
  if (btnRoomInvite) {
    btnRoomInvite.addEventListener('click', () => {
      if (typeof Sound !== 'undefined' && Sound.playClick) Sound.playClick();
      _openFriendsModal('list');
    });
  }

  function _copyToClipboard(text, btnEl) {
    if (!text || text === '——') return;
    const onSuccess = () => {
      showToast('방 코드가 복사되었습니다: ' + text, 'success');
      if (btnEl) {
        const icon = btnEl.querySelector('i');
        if (icon) {
          const origClass = icon.className;
          icon.className = 'fa-solid fa-check';
          icon.style.color = 'var(--green)';
          setTimeout(() => {
            icon.className = origClass;
            icon.style.color = '';
          }, 1500);
        }
      }
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(onSuccess)
        .catch(() => _fallbackCopy(text, onSuccess));
    } else {
      _fallbackCopy(text, onSuccess);
    }
  }
  function _fallbackCopy(text, onSuccess) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (onSuccess) onSuccess();
      else showToast('방 코드가 복사되었습니다: ' + text, 'success');
    } catch (_) {
      showToast('복사 실패. 코드를 직접 입력하세요.', 'error');
    }
    document.body.removeChild(ta);
  }

  /* =====================================================================
     7. 게임 실행 및 게임 화면 (`screen-game`)
     ===================================================================== */
  function _runCountdown(onFinished) {
    const overlay = $('overlay-countdown');
    const numEl = $('countdown-number');
    const subEl = $('countdown-sub');

    overlay.classList.remove('hidden');
    let count = 3;
    numEl.textContent = count;
    subEl.textContent = '잠시 후 게임이 시작됩니다!';
    Sound.playCountdown(3);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        numEl.textContent = count;
        Sound.playCountdown(count);
      } else if (count === 0) {
        numEl.textContent = 'START!';
        subEl.textContent = '게임 시작!';
        Sound.playCountdown(0);
        Sound.playStart();
      } else {
        clearInterval(interval);
        overlay.classList.add('hidden');
        if (typeof onFinished === 'function') onFinished();
      }
    }, 900);
  }

  function _launchGame(gameKey, playersList, startWord, targetRounds, sideMode, isSpectator = false) {
    const gameObj = GAMES[gameKey];
    if (!gameObj) return;

    if (currentGameModule) {
      try { currentGameModule.destroy(); } catch (_) {}
      currentGameModule = null;
    }

    let currentActivePlayers = playersList || activeGamePlayers || [...roomPlayers];
    if (isDevMode && currentActivePlayers.length === 1) {
      currentActivePlayers = [
        currentActivePlayers[0],
        { id: 'dev-player-2', name: '플레이어2(개발용)', avatarIcon: 'fa-solid fa-robot', avatarColor: '#3182ce', isHost: false, isReady: true }
      ];
    }
    activeGamePlayers = currentActivePlayers;

    const rounds = (typeof targetRounds === 'number') ? targetRounds : (selectedGameRounds || 3);
    const side = sideMode || selectedGameSideMode || 'shuffle';

    currentGameModule = gameObj.module;
    $('current-game-title').textContent = gameObj.title;
    $('game-room-code').textContent = currentRoomCode;
    $('game-content').innerHTML = '';

    // 인게임 사이드바 알림 영역 초기화
    if ($('gsp-alert-container')) $('gsp-alert-container').innerHTML = '';

    // 인게임 좌측 참가자 목록 사이드바 렌더링
    _renderInGamePlayerSidebar(currentActivePlayers, gameKey);

    showScreen('game');
    _hideResultOverlay();

    const amISpectator = isSpectator || !currentActivePlayers.some(p => String(p.id) === String(P2P.getMyId()));
    const context = {
      players: currentActivePlayers, // 🌟 오직 게임에 참여 중인 플레이어들만 포함 (관전자는 제외되어 턴 넘김 버그 원천 차단)
      myId: P2P.getMyId() || (isDevMode ? 'dev-player' : ''),
      myNickname: myNickname || '익명',
      isHost: P2P.isHost() || isDevMode,
      isDevMode: isDevMode, // 🌟 개발자 1인 연속 턴 모드 플래그
      startWord: startWord,
      targetRounds: rounds,
      sideMode: side,
      isSpectator: amISpectator // 🌟 관전자 여부 플래그
    };

    // 상단 인게임 헤더 관전 모드 뱃지 표시
    const gameRoomCodeEl = $('game-room-code');
    if (gameRoomCodeEl) {
      gameRoomCodeEl.innerHTML = amISpectator
        ? `${currentRoomCode} <span class="spectator-mode-badge"><i class="fa-solid fa-eye"></i> 관전 중</span>`
        : currentRoomCode;
    }

    console.log('[App] 게임 런치 context:', gameKey, 'targetRounds:', rounds, 'sideMode:', side, 'players:', currentActivePlayers.map(p=>p.name));

    const needCountdown = ['apple', 'wordchain', 'typing'].includes(gameKey);
    if (needCountdown) {
      _runCountdown(() => {
        currentGameModule.init($('game-content'), _handleGameResult, context);
      });
    } else {
      currentGameModule.init($('game-content'), _handleGameResult, context);
    }
  }

  // ── 인게임 참가자 사이드바 렌더링 ──
  function _renderInGamePlayerSidebar(currentActivePlayers, gameKey, currentTurnPlayerIdOrIdx) {
    // 🌟 턴 인덱스/ID 영구 기억 및 유지
    if (currentTurnPlayerIdOrIdx !== undefined && currentTurnPlayerIdOrIdx !== null) {
      lastKnownTurnPlayerIdOrIdx = currentTurnPlayerIdOrIdx;
    } else {
      currentTurnPlayerIdOrIdx = lastKnownTurnPlayerIdOrIdx;
    }

    // 🌟 1. 활성 플레이어 목록 확보 (절대 빈 배열이 되지 않도록 3단계 fallback)
    let list = (Array.isArray(currentActivePlayers) && currentActivePlayers.length > 0)
      ? currentActivePlayers
      : (Array.isArray(activeGamePlayers) && activeGamePlayers.length > 0)
        ? activeGamePlayers
        : roomPlayers.filter(p => !p.isSpectator);

    if (!list || list.length === 0) {
      list = roomPlayers;
    }

    const myId = String(P2P.getMyId() || (isDevMode ? 'dev-player' : ''));
    // 🌟 2. 관전자 목록은 list에 포함되지 않은 나머지 유저들로만 정확하게 필터링
    const spectators = roomPlayers.filter(rp => !list.some(ap => String(ap.id) === String(rp.id)) && rp.isSpectating !== false);

    if ($('gsp-count')) $('gsp-count').textContent = list.length + (spectators.length > 0 ? ` (관전 ${spectators.length})` : '');
    const listEl = $('gsp-player-list');
    if (!listEl) return;
    listEl.innerHTML = '';

// 1. 게임 플레이어 목록 렌더링
    list.forEach((p, idx) => {
      const isMe = (String(p.id) === myId);
      const isTurn = _checkIsPlayerTurn(p, idx, currentTurnPlayerIdOrIdx, gameKey);

      let orderTag = _getPlayerOrderTag(gameKey, idx, isTurn);

      const amIHost = P2P.isHost() || isHostPlayer;
      const canManage = amIHost && !p.isHost && !isMe;
      const li = document.createElement('li');
      li.id = `gsp-item-${idx}`;

      // 🌟 [추가 1] 인게임 플레이어 ID 속성 부여
      li.setAttribute('data-player-id', p.id);
      const cardTheme = p.profileCard || (isMe ? myProfileCard : 'default');
      const pFrame = p.avatarFrame || (isMe ? myAvatarFrame : 'default');
      const frameClass = _getAvatarFrameClass(pFrame);
      li.className = 'gsp-item' + (isMe ? ' is-me' : '') + (isTurn ? ' is-current-turn' : '') + (canManage ? ' can-manage' : '');
      _applyProfileCardTheme(li, cardTheme);

      li.innerHTML = `
        <div class="gsp-avatar ${frameClass}" style="background:${p.avatarColor || '#38a169'};"><i class="${p.avatarIcon || 'fa-solid fa-paw'}"></i></div>
        <div class="gsp-meta">
          <div class="gsp-name ${p.nameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${p.nameColor && p.nameColor !== 'rainbow' ? `color:${p.nameColor}; font-weight:800;` : ''}">
            ${_escapeHtml(p.name)}
            ${p.isHost ? '<i class="fa-solid fa-crown" style="color:var(--yellow);font-size:0.75rem;"></i>' : ''}
            ${canManage ? '<button type="button" class="btn-manage-trigger" title="참가자 관리"><i class="fa-solid fa-ellipsis-vertical"></i></button>' : ''}
          </div>
          <div class="gsp-tag" style="font-weight:700;">${orderTag}</div>
        </div>
      `;

      const triggerBtn = li.querySelector('.btn-manage-trigger');
      if (triggerBtn) {
        triggerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          _openPlayerActionMenu(e, p);
        });
      }
      li.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-manage-trigger')) {
          _openPlayerActionMenu(e, p);
        }
      });

      listEl.appendChild(li);
    });

    // 2. 🌟 관전자 목록 섹션 렌더링
    if (spectators.length > 0) {
      const specHeader = document.createElement('li');
      specHeader.className = 'gsp-spectator-header';
      specHeader.innerHTML = `<i class="fa-solid fa-eye"></i> 관전자 (${spectators.length}명)`;
      listEl.appendChild(specHeader);

      spectators.forEach(sp => {
        const isMe = (String(sp.id) === myId);
        const amIHost = P2P.isHost() || isHostPlayer;
        const canManage = amIHost && !sp.isHost && !isMe;
        const li = document.createElement('li');

        // 🌟 [추가 2] 관전자 ID 속성 부여
        li.setAttribute('data-player-id', sp.id);
        const cardTheme = sp.profileCard || (isMe ? myProfileCard : 'default');
        const spFrame = sp.avatarFrame || (isMe ? myAvatarFrame : 'default');
        const spFrameClass = _getAvatarFrameClass(spFrame);
        li.className = 'gsp-item gsp-spectator-item' + (isMe ? ' is-me' : '') + (canManage ? ' can-manage' : '');
        _applyProfileCardTheme(li, cardTheme);

        li.innerHTML = `
          <div class="gsp-avatar ${spFrameClass}" style="background:${sp.avatarColor || '#718096'}; opacity:0.85;"><i class="${sp.avatarIcon || 'fa-solid fa-user'}"></i></div>
          <div class="gsp-meta">
            <div class="gsp-name ${sp.nameColor === 'rainbow' ? 'nickname-rainbow' : ''}" style="${sp.nameColor && sp.nameColor !== 'rainbow' ? `color:${sp.nameColor}; font-weight:800;` : ''}">
              ${_escapeHtml(sp.name)}
              ${canManage ? '<button type="button" class="btn-manage-trigger" title="참가자 관리"><i class="fa-solid fa-ellipsis-vertical"></i></button>' : ''}
            </div>
            <div class="gsp-tag" style="color:var(--t3);font-size:0.7rem;"><i class="fa-regular fa-eye"></i> 실시간 관전 중</div>
          </div>
        `;

        const triggerBtn = li.querySelector('.btn-manage-trigger');
        if (triggerBtn) {
          triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            _openPlayerActionMenu(e, sp);
          });
        }
        li.addEventListener('click', (e) => {
          if (!e.target.closest('.btn-manage-trigger')) {
            _openPlayerActionMenu(e, sp);
          }
        });

        listEl.appendChild(li);
      });
    }
    // 🌟 사이드바 재렌더링 후 현재 활성화된 이모지가 있다면 즉시 복원
    if (typeof activeProfileEmojis !== 'undefined') {
      Object.keys(activeProfileEmojis).forEach(pId => {
        if (activeProfileEmojis[pId]) {
          _renderProfileEmojiDOM(pId, activeProfileEmojis[pId].emojiSrc);
        }
      });
    }

    if (typeof currentGameModule !== 'undefined' && currentGameModule && typeof currentGameModule.onSidebarRedrawn === 'function') {
      currentGameModule.onSidebarRedrawn();
    }
    if (typeof currentGameModule !== 'undefined' && currentGameModule && typeof currentGameModule.onSidebarRedrawn === 'function') {
      currentGameModule.onSidebarRedrawn();
    }
  }

  function _checkIsPlayerTurn(playerObj, playerIdx, currentTurnPlayerIdOrIdx, gameKey) {
    if (currentTurnPlayerIdOrIdx === undefined || currentTurnPlayerIdOrIdx === null) return false;
    const gKey = gameKey || selectedGameKey;

    if (gKey === 'gomoku') {
      if (currentTurnPlayerIdOrIdx === 'black' || currentTurnPlayerIdOrIdx === 1 || currentTurnPlayerIdOrIdx === 0) {
        return (playerIdx === (currentTurnPlayerIdOrIdx === 1 ? 0 : (currentTurnPlayerIdOrIdx === 0 ? 0 : (currentTurnPlayerIdOrIdx === 'black' ? 0 : 1))));
      }
      return (playerIdx === 1);
    } else if (gKey === 'chess') {
      if (currentTurnPlayerIdOrIdx === 'w' || currentTurnPlayerIdOrIdx === 'white') return (playerIdx === 0);
      if (currentTurnPlayerIdOrIdx === 'b' || currentTurnPlayerIdOrIdx === 'black') return (playerIdx === 1);
      return (playerIdx === Number(currentTurnPlayerIdOrIdx));
    } else {
      // 3인 이상 게임 (야추, 윷놀이, 캐치마인드, 베스킨31, 끝말잇기, 쿼리도 등)
      return (
        String(playerObj.id) === String(currentTurnPlayerIdOrIdx) ||
        playerIdx === Number(currentTurnPlayerIdOrIdx)
      );
    }
  }

  function _getPlayerOrderTag(gameKey, idx, isTurn) {
    const gKey = gameKey || selectedGameKey;

    if (gKey === 'gomoku') {
      return idx === 0
        ? (isTurn ? '<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> 1번 (흑 차례)</span>' : '<i class="fa-solid fa-circle" style="color:#1a1a1a;"></i> 1번 (흑)')
        : (isTurn ? '<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> 2번 (백 차례)</span>' : '<i class="fa-regular fa-circle" style="color:#718096;"></i> 2번 (백)');
    } else if (gKey === 'chess') {
      return idx === 0
        ? (isTurn ? '<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> 1번 (백 차례)</span>' : '<i class="fa-regular fa-circle" style="color:#718096;"></i> 1번 (백)')
        : (isTurn ? '<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> 2번 (흑 차례)</span>' : '<i class="fa-solid fa-circle" style="color:#1a1a1a;"></i> 2번 (흑)');
    } else if (gKey === 'chesswarfare') {
      return idx === 0
        ? (isTurn ? '<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> 1번 (White 선공)</span>' : '<i class="fa-solid fa-circle" style="color:#3182ce;"></i> 1번 (White)')
        : (isTurn ? '<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> 2번 (Black 후공)</span>' : '<i class="fa-solid fa-circle" style="color:#e53e3e;"></i> 2번 (Black)');
    } else if (gKey === 'quoridor') {
      return idx === 0
        ? (isTurn ? '<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> 1번 (하단 차례)</span>' : '<i class="fa-solid fa-circle" style="color:#3182ce;"></i> 1번 (하단)')
        : (isTurn ? '<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> 2번 (상단 차례)</span>' : '<i class="fa-solid fa-circle" style="color:#e53e3e;"></i> 2번 (상단)');
    } else if (gKey === 'janggi' || gKey === 'alkkagi') {
      return idx === 0
        ? (isTurn ? '<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> 1번 (초 턴)</span>' : '<i class="fa-solid fa-circle" style="color:#0b388f;"></i> 1번 (초)')
        : (isTurn ? '<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> 2번 (한 턴)</span>' : '<i class="fa-solid fa-circle" style="color:#cc1f1a;"></i> 2번 (한)');
    } else if (gKey === 'catchmind') {
      return isTurn
        ? '<span style="font-size:0.75rem;font-weight:800;color:var(--t2);margin-right:5px;">0점</span><span style="color:#ea580c;font-weight:900;"><i class="fa-solid fa-paintbrush"></i> 출제자</span>'
        : '<span style="font-size:0.75rem;font-weight:800;color:var(--t2);margin-right:5px;">0점</span><span style="color:var(--t3);font-weight:700;"><i class="fa-solid fa-magnifying-glass"></i> 맞히는 중</span>';
    } else if (gKey === 'yutnori') {
      const icons = ['빨강', '파랑', '초록', '노랑'];
      const myColorName = icons[idx % icons.length] || `${idx + 1}번`;
      let finCount = 0;
      if (window.Yutnori && typeof window.Yutnori.getPlayerFinishedCount === 'function') {
        finCount = window.Yutnori.getPlayerFinishedCount(idx);
      }
      return `<span class="yut-gsp-finished-badge"><i class="fa-solid fa-flag-checkered"></i> ${finCount}/4</span>` +
        (isTurn
          ? `<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> ${myColorName}</span>`
          : `<span style="color:var(--t2);font-weight:700;">${myColorName}</span>`);
    } else {
      // 야추, 베스킨31, 끝말잇기 등
      return isTurn
        ? `<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> ${idx + 1}번째 순서 (현재 차례)</span>`
        : `<span style="color:var(--t3);font-weight:700;">${idx + 1}번째 순서</span>`;
    }
  }

  function updateInGameTurn(currentTurnPlayerIdOrIdx) {
    if (currentTurnPlayerIdOrIdx !== undefined && currentTurnPlayerIdOrIdx !== null) {
      lastKnownTurnPlayerIdOrIdx = currentTurnPlayerIdOrIdx;
    }

    const list = activeGamePlayers.length > 0 ? activeGamePlayers : roomPlayers;
    list.forEach((p, idx) => {
      const el = document.getElementById(`gsp-item-${idx}`);
      if (!el) return;

      const isTurn = _checkIsPlayerTurn(p, idx, currentTurnPlayerIdOrIdx, selectedGameKey);

      el.classList.toggle('is-current-turn', !!isTurn);

      const tagEl = el.querySelector('.gsp-tag');
      if (tagEl && !el.classList.contains('is-solved')) {
        tagEl.innerHTML = _getPlayerOrderTag(selectedGameKey, idx, isTurn);
      }
    });
  }

  // 게임 결과 콜백
  function _handleGameResult(win, drawInfo, customLeaderboard) {
    let resultType = 'lose';
    let iAmWinner = false;

    if (customLeaderboard && customLeaderboard.length > 0) {
      const winner = customLeaderboard[0];
      iAmWinner = (winner.name === myNickname) || (winner.id && String(winner.id) === String(P2P.getMyId()));
      resultType = iAmWinner ? 'win' : 'lose';
    } else if (drawInfo && typeof drawInfo === 'object') {
      resultType = 'draw';
    } else if (win === true) {
      resultType = 'win';
      iAmWinner = true;
    } else {
      resultType = 'lose';
    }

    // 🌟 전적 집계 자동 기록
    try {
      _recordGameStats(selectedGameKey, resultType);
    } catch (e) {
      console.warn('[Stats] 전적 기록 오류:', e);
    }

    // 🪙 승리 코인 지급 처리 (오직 로그인된 계정에만 지급)
    let coinRewardInfo = null;
    if (resultType === 'win') {
      const isLoggedIn = typeof AppSupabase !== 'undefined' && !!AppSupabase.getCurrentUser();
      if (isLoggedIn) {
        myCoins += WIN_REWARD_COINS;
        localStorage.setItem('arcade_user_coins', String(myCoins));
        _updateCoinsUI();
        const user = AppSupabase.getCurrentUser();
        if (user && typeof AppSupabase.addCoins === 'function') {
          AppSupabase.addCoins(user.id, WIN_REWARD_COINS).catch(() => {});
        }
        coinRewardInfo = { granted: true, amount: WIN_REWARD_COINS, total: myCoins };
      } else {
        coinRewardInfo = { granted: false, reason: 'guest' };
      }
    }

    // 🌟 경험치 지급 및 레벨업 산출 (완주 기본 + 승패 + 게임별 진취도)
    let expRewardInfo = null;
    try {
      const expGain = _calcGameProgressionExp(selectedGameKey, resultType, { win, drawInfo, customLeaderboard });
      expRewardInfo = _addExperience(expGain);
    } catch (e) {
      console.warn('[EXP] 경험치 지급 오류:', e);
    }

    _showResultOverlay(win, drawInfo, customLeaderboard, coinRewardInfo, expRewardInfo);
  }

  function _showResultOverlay(win, drawInfo, customLeaderboard, coinRewardInfo = null, expRewardInfo = null) {
    const iconEl = $('result-icon');
    const titleEl = $('result-title');
    const msgEl = $('result-message');
    const scoreRowEl = $('result-score-row');

    scoreRowEl.innerHTML = '';

    const reasonMsg = (typeof drawInfo === 'string') ? drawInfo : null;
    const isDrawObject = (drawInfo && typeof drawInfo === 'object');

    if (customLeaderboard && customLeaderboard.length > 0) {
      const winner = customLeaderboard[0];
      const iAmWinner = winner.name === myNickname;

      iconEl.innerHTML = iAmWinner ? '<i class="fa-solid fa-trophy"></i>' : '<i class="fa-solid fa-medal"></i>';
      iconEl.style.color = iAmWinner ? 'var(--green)' : 'var(--yellow)';
      iconEl.style.background = iAmWinner ? 'var(--green-tint)' : 'var(--yellow-tint)';
      iconEl.style.borderColor = iAmWinner ? 'var(--green-border)' : 'var(--yellow-border)';

      titleEl.textContent = iAmWinner ? '1위 달성! 우승!' : `${winner.name}님 우승!`;
      titleEl.style.color = iAmWinner ? 'var(--green-deep)' : 'var(--t1)';
      msgEl.textContent = reasonMsg || '게임이 종료되었습니다. 최종 순위표를 확인하세요.';

      let rowsHtml = '';
      customLeaderboard.forEach((item, idx) => {
        const medal = idx === 0 ? '<i class="fa-solid fa-trophy" style="color:#ecc94b;"></i> 1위' : (idx === 1 ? '<i class="fa-solid fa-medal" style="color:#a0aec0;"></i> 2위' : (idx === 2 ? '<i class="fa-solid fa-medal" style="color:#ed8936;"></i> 3위' : `${idx + 1}위`));
        const valDisplay = item.scoreText ? item.scoreText : `${item.score || 0}점`;
        rowsHtml += `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-sub);">
            <span><b>${medal}</b> ${_escapeHtml(item.name)}</span>
            <span style="color:var(--green-deep);font-weight:800;">${valDisplay}</span>
          </div>
        `;
      });
      scoreRowEl.innerHTML = rowsHtml;
      scoreRowEl.classList.remove('hidden');

      if (iAmWinner) {
        Sound.playWin();
        _triggerVictoryEffect(myVictoryEffect);
      } else {
        Sound.playLose();
        _stopVictoryEffect();
      }

    } else if (isDrawObject) {
      iconEl.innerHTML = '<i class="fa-solid fa-handshake"></i>';
      iconEl.style.color = 'var(--sky)';
      iconEl.style.background = 'var(--sky-tint)';
      iconEl.style.borderColor = 'var(--sky-border)';

      titleEl.textContent = '무승부!';
      titleEl.style.color = 'var(--sky)';
      msgEl.textContent = '치열한 접전 끝에 무승부로 끝났습니다!';
      scoreRowEl.innerHTML = `<span>나: <b>${drawInfo.myScore || 0}점</b></span> &nbsp;|&nbsp; <span>상대: <b>${drawInfo.oppScore || 0}점</b></span>`;
      scoreRowEl.classList.remove('hidden');
      Sound.playClick();
      _stopVictoryEffect();

    } else if (win) {
      iconEl.innerHTML = '<i class="fa-solid fa-trophy"></i>';
      iconEl.style.color = 'var(--green)';
      iconEl.style.background = 'var(--green-tint)';
      iconEl.style.borderColor = 'var(--green-border)';

      titleEl.textContent = '승리!';
      titleEl.style.color = 'var(--green-deep)';
      msgEl.textContent = reasonMsg || '멋진 승리입니다! 축하합니다!';
      scoreRowEl.classList.add('hidden');
      Sound.playWin();
      _triggerVictoryEffect(myVictoryEffect);

    } else {
      iconEl.innerHTML = '<i class="fa-regular fa-face-frown"></i>';
      iconEl.style.color = 'var(--coral)';
      iconEl.style.background = 'var(--coral-tint)';
      iconEl.style.borderColor = 'var(--coral-border)';

      titleEl.textContent = '패배';
      titleEl.style.color = 'var(--coral)';
      msgEl.textContent = reasonMsg || '아쉽게 패배했습니다. 다시 도전해 보세요!';
      scoreRowEl.classList.add('hidden');
      Sound.playLose();
      _stopVictoryEffect();
    }

    // 🌟 경험치 및 레벨업 보상 배너 렌더링
    const expBoxEl = $('result-exp-box');
    if (expBoxEl) {
      if (expRewardInfo && expRewardInfo.gained > 0) {
        const isMax = expRewardInfo.newLevel >= MAX_LEVEL;
        const pct = isMax ? 100 : (expRewardInfo.reqExp > 0
          ? Math.min(100, Math.max(0, Math.floor((expRewardInfo.currentExp / expRewardInfo.reqExp) * 100)))
          : 0);

        const levelUpBadge = expRewardInfo.leveledUp
          ? `<div class="result-level-up-badge"><i class="fa-solid fa-arrow-trend-up"></i> 레벨업! Lv.${expRewardInfo.oldLevel} → Lv.${expRewardInfo.newLevel}</div>`
          : '';

        expBoxEl.className = 'result-exp-box';
        expBoxEl.innerHTML = `
          ${levelUpBadge}
          <div class="result-exp-main">
            <i class="fa-solid fa-bolt"></i>
            <span>+${expRewardInfo.gained} EXP 획득! (현재: Lv.${expRewardInfo.newLevel}${isMax ? ' MAX' : ` - ${pct}%`})</span>
          </div>
          <div class="result-exp-bar-wrap">
            <div class="result-exp-bar-fill" style="width: ${pct}%;"></div>
          </div>
        `;
        expBoxEl.classList.remove('hidden');
      } else {
        expBoxEl.className = 'result-exp-box hidden';
        expBoxEl.innerHTML = '';
      }
    }

    // 🪙 코인 보상 배너 렌더링
    const coinBoxEl = $('result-coin-box');
    if (coinBoxEl) {
      if (coinRewardInfo && coinRewardInfo.granted) {
        coinBoxEl.className = 'result-coin-box reward-won';
        coinBoxEl.innerHTML = `<i class="fa-solid fa-coins"></i> <span>+${coinRewardInfo.amount} 코인 획득! (현재: ${coinRewardInfo.total.toLocaleString()} 코인)</span>`;
        coinBoxEl.classList.remove('hidden');
      } else if (coinRewardInfo && !coinRewardInfo.granted) {
        coinBoxEl.className = 'result-coin-box reward-guest';
        coinBoxEl.innerHTML = `<i class="fa-solid fa-lock"></i> <span>로그인하시면 승리 시 코인을 모을 수 있습니다!</span>`;
        coinBoxEl.classList.remove('hidden');
      } else {
        coinBoxEl.className = 'result-coin-box hidden';
        coinBoxEl.innerHTML = '';
      }
    }

    $('overlay-result').classList.remove('hidden');
  }

  function _hideResultOverlay() {
    _stopVictoryEffect();
    if (_backHistoryIfModal('result')) return;
    if ($('overlay-result')) $('overlay-result').classList.add('hidden');
  }

  // 결과 화면: 방으로 돌아가기
  $('btn-result-back-room').addEventListener('click', () => {
    _hideResultOverlay();
    _handleBackToRoomClick();
  });

  // 게임 화면 헤더: 방으로 돌아가기 버튼
  $('btn-back-to-room').addEventListener('click', async () => {
    const ok = await showConfirmDialog({
      title: '게임 나가기',
      message: '게임을 종료하고 방으로 돌아가시겠습니까?',
      confirmText: '나가기',
      cancelText: '취소',
      icon: 'fa-solid fa-right-from-bracket',
      isDanger: true
    });
    if (ok) {
      _hideResultOverlay();
      _handleBackToRoomClick();
    }
  });

  function _handleBackToRoomClick() {
    if (P2P.isHost()) {
      // 방장은 모두 함께 방 로비로 복귀
      P2P.send({ type: 'return_to_room' });
      _exitGameToRoom();
    } else {
      // 게스트는 방장 및 다른 참가자들에게 퇴장 알림 전송 후 본인만 방으로 복귀
      P2P.send({
        type: 'guest_leave_game',
        playerId: P2P.getMyId(),
        name: myNickname
      });
      _exitGameToRoom();
    }
  }

  function _exitGameToRoom(pushState = true) {
    if (currentGameModule) {
      try { currentGameModule.destroy(); } catch (_) {}
      currentGameModule = null;
    }
    if ($('game-content')) $('game-content').innerHTML = '';

    isRoomGameActive = false;
    activeGamePlayers = [];

    if (P2P.isHost()) {
      roomPlayers.forEach(p => {
        if (!p.isHost) p.isReady = false;
      });
      _broadcastRoomState();
      // 🌐 Firebase에 대기 상태 복귀 기록
      if (window.FirebaseLobby && typeof window.FirebaseLobby.updateRoomStatus === 'function') {
        window.FirebaseLobby.updateRoomStatus(currentRoomCode, 'waiting');
      }
    } else {
      // 🌟 자동 준비: 설정이 켜진 경우 방으로 돌아오자마자 자동 준비 전환
      const autoReady = localStorage.getItem('arcade_auto_ready') === 'true';
      if (autoReady) {
        isMyReady = true;
        setTimeout(() => {
          P2P.send({ type: 'toggle_ready', isReady: true });
          Sound.playReady();
          _updateRoomUI();
        }, 300);
      } else {
        isMyReady = false;
      }
    }

    _enterRoomScreen(pushState);
    _scrollRoomChatToBottom();
  }

  /* ── XSS 방지 이스케이프 ── */
  function _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* =====================================================================
     8. 사이드바 게임 설명 말풍선 팝업 기능
     ===================================================================== */
  const GAME_TOOLTIP_DATA = {
    gomoku: {
      title: '오목',
      icon: 'fa-solid fa-chess-board',
      tag: '2인 전용 • 턴제 전략',
      tagClass: 'tag-2p',
      desc: '15×15 정통 바둑판에서 흑과 백이 번갈아 돌을 놓아 가로, 세로, 대각선으로 먼저 5목을 완성하면 승리하는 2인 두뇌 전략 게임입니다.'
    },
    chess: {
      title: '체스',
      icon: 'fa-solid fa-chess-knight',
      tag: '2인 전용 • 클래식 전략',
      tagClass: 'tag-2p',
      desc: '폰, 나이트, 비숍, 룩, 퀸, 킹의 고유한 이동 규칙을 활용하여 상대방 킹을 궁지에 몰아 체크메이트하는 전 세계 클래식 보드게임입니다.'
    },
    quoridor: {
      title: '쿼리도',
      icon: 'fa-solid fa-border-all',
      tag: '2인 전용 • 미로 탈출',
      tagClass: 'tag-2p',
      desc: '자신의 말을 상대 진영 끝까지 먼저 전진시키거나, 벽을 설치해 상대방의 진로를 차단하는 전략적 미로 탈출 보드게임입니다.'
    },
    baskin31: {
      title: '베스킨라빈스 31',
      icon: 'fa-solid fa-ice-cream',
      tag: '2~5인 • 심리 턴제',
      tagClass: 'tag-multi',
      desc: '자신의 턴마다 1개에서 3개까지 연속된 숫자를 부를 수 있습니다. 마지막 31을 부르게 되는 플레이어가 패배하는 스릴 넘치는 심리 게임입니다.'
    },
    roulette: {
      title: '러시안 룰렛',
      icon: 'fa-solid fa-skull-crossbones',
      tag: '2~8인 • 심리 서바이벌',
      tagClass: 'tag-multi',
      desc: '실탄과 공포탄이 장전된 리볼버 권총으로 벌이는 극한의 심리전! 자신을 쏘아 생존하면 연속 턴을 얻고, 돋보기·수갑·톱날 등 다양한 아이템을 활용하여 최후의 1인이 되세요!'
    },
    wordchain: {
      title: '끝말잇기',
      icon: 'fa-solid fa-link',
      tag: '2~5인 • 실시간 어휘',
      tagClass: 'tag-multi',
      desc: '제시된 단어의 마지막 글자로 시작하는 올바른 한국어 표준 단어를 제한 시간 내에 입력해야 하는 실시간 어휘 순발력 배틀입니다.'
    },
    apple: {
      title: '사과게임',
      icon: 'fa-solid fa-apple-whole',
      tag: '2~5인 • 숫자 퍼즐',
      tagClass: 'tag-multi',
      desc: '드래그하여 선택한 사과 속 숫자들의 합이 정확히 10이 되면 사과가 제거됩니다. 60초 동안 더 많은 사과를 없애 높은 점수를 기록하세요!'
    },
    typing: {
      title: '타자연습 대결',
      icon: 'fa-solid fa-keyboard',
      tag: '2~5인 • 실시간 속타',
      tagClass: 'tag-multi',
      desc: '실시간으로 주어지는 명문과 문장을 상대방보다 빠르고 정확하게 타이핑하여 승리하는 본격 타자 속도 대결 배틀입니다.'
    },
    catchmind: {
      title: '캐치마인드',
      icon: 'fa-solid fa-paintbrush',
      tag: '2~5인 • 그림 퀴즈',
      tagClass: 'tag-multi',
      desc: '출제자가 캔버스에 실시간으로 그리는 기발한 그림을 보고, 채팅창에 정답을 가장 먼저 맞히는 유쾌한 실시간 드로잉 퀴즈 배틀입니다.'
    },
    yutnori: {
      title: '윷놀이',
      icon: 'fa-solid fa-circle-nodes',
      tag: '2~4인 • 전통 보드게임',
      tagClass: 'tag-multi',
      desc: '도, 개, 걸, 윷, 모! 윷가락을 던져 나온 결과로 4개의 말을 이동시키고 상대 말을 잡으며 먼저 모두 골인시키는 전통 말판 게임입니다.'
    },
    janggi: {
      title: '장기',
      icon: 'fa-solid fa-chess-rook',
      tag: '2인 전용 • 전통 전략',
      tagClass: 'tag-2p',
      desc: '9×10 원목 장기판에서 초(楚)와 한(漢)의 16개 기물(차, 포, 마, 상, 사, 졸/병, 궁)을 운용하여 상대방 궁을 제압하는 정통 2인 한국 장기입니다.'
    },
    alkkagi: {
      title: '알까기',
      icon: 'fa-solid fa-burst',
      tag: '2인 전용 • 물리 대결',
      tagClass: 'tag-2p',
      desc: '장기판 위에서 장기알을 슬링샷처럼 당겨 발사하여 상대방의 모든 기물을 판 밖으로 밀어내는 짜릿한 2인 물리 알까기 배틀입니다.'
    },
    yacht: {
      title: '야추 다이스',
      icon: 'fa-solid fa-dice',
      tag: '2~4인 • 주사위 보드게임',
      tagClass: 'tag-multi',
      desc: '5개의 3D 주사위를 최대 3번 굴려 12가지 족보(초이스, 풀하우스, 스트레이트, 야추 등)를 완성하고 최고 점수를 획득하는 보드게임입니다.'
    }
  };

  let activeSidebarTooltip = null;

  function _initSidebarGameTooltips() {
    document.querySelectorAll('.sidebar-game-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const gameKey = item.dataset.game;
        if (!gameKey) return;

        // active 클래스 갱신
        document.querySelectorAll('.sidebar-game-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // 말풍선 팝업 생성
        if (activeSidebarTooltip) {
          activeSidebarTooltip.remove();
          activeSidebarTooltip = null;
        }

        const data = GAME_TOOLTIP_DATA[gameKey];
        if (!data) return;

        const rect = item.getBoundingClientRect();
        const tooltip = document.createElement('div');
        tooltip.className = 'sidebar-game-bubble';
        tooltip.innerHTML = `
          <button type="button" class="sgb-close" title="닫기"><i class="fa-solid fa-xmark"></i></button>
          <div class="sgb-header">
            <div class="sgb-icon"><i class="${data.icon}"></i></div>
            <div class="sgb-meta">
              <strong class="sgb-title">${_escapeHtml(data.title)}</strong>
              <span class="sg-tag ${data.tagClass}">${_escapeHtml(data.tag)}</span>
            </div>
          </div>
          <p class="sgb-desc">${_escapeHtml(data.desc)}</p>
        `;

        document.body.appendChild(tooltip);
        activeSidebarTooltip = tooltip;

        // 위치 계산
        const isMobile = window.innerWidth <= 1024;
        if (isMobile) {
          tooltip.style.left = '50%';
          tooltip.style.top = Math.max(20, rect.top - 10) + 'px';
          tooltip.style.transform = 'translateX(-50%)';
        } else {
          tooltip.style.left = (rect.right + 14) + 'px';
          tooltip.style.top = Math.max(16, rect.top - 10) + 'px';
        }

        tooltip.querySelector('.sgb-close').addEventListener('click', (ev) => {
          ev.stopPropagation();
          tooltip.remove();
          activeSidebarTooltip = null;
        });
      });
    });

    document.addEventListener('click', (e) => {
      if (activeSidebarTooltip && !activeSidebarTooltip.contains(e.target) && !e.target.closest('.sidebar-game-item')) {
        activeSidebarTooltip.remove();
        activeSidebarTooltip = null;
      }
    });
  }

  /* =====================================================================
     프로필 이모지 감정표현 (내 화면 렌더링 + P2P 동기화)
     ===================================================================== */

  // 1. 이모지 버튼 클릭 이벤트 (위임 방식)
// 이모지 버튼 클릭 이벤트 (대기실 + 인게임 통합 감지)
  document.addEventListener('click', (e) => {
    
    // 🚨 원인: 기존에는 e.target.closest('.room-emoji-panel .btn-emoji') 였음
    // 🌟 픽스: 대기실과 인게임 패널 모두 감지하도록 쉼표(,)로 두 클래스를 모두 넣어줍니다.
    const btn = e.target.closest('.room-emoji-panel .btn-emoji, .game-emoji-panel .btn-emoji');
    
    if (!btn) return;

    const img = btn.querySelector('img');
    if (!img || !img.src) return;

    const myId = String(P2P.getMyId()); // 확실한 문자열 비교를 위해 String 감싸기
    const emojiSrc = img.src;

    // 내 화면에 띄우기
    if (typeof _showProfileEmoji === 'function') {
      _showProfileEmoji(myId, emojiSrc);
    }

    // 다른 사람들에게 전송
    try {
      P2P.send({
        type: 'profile_emoji',
        senderId: myId,
        emojiSrc: emojiSrc
      });
    } catch (_) {}
  });

// 1. 프로필 이모지 실행 및 상태 관리 함수
  function _showProfileEmoji(playerId, emojiSrc) {
    if (!playerId || !emojiSrc) return;

    // 기존 타이머가 존재하면 취소
    if (activeProfileEmojis[playerId]) {
      clearTimeout(activeProfileEmojis[playerId].timeoutId);
    }

    // 1.8초 동안 상태 유지 후 자동 삭제
    const timeoutId = setTimeout(() => {
      delete activeProfileEmojis[playerId];
      _removeProfileEmojiDOM(playerId);
    }, 1800);

    activeProfileEmojis[playerId] = { emojiSrc, timeoutId };

    // DOM에 이모지 출력
    _renderProfileEmojiDOM(playerId, emojiSrc);
  }

  // 2. DOM 요소에 실제 이모지 버블 생성하는 보조 함수
  function _renderProfileEmojiDOM(playerId, emojiSrc) {
    if (localStorage.getItem('arcade_show_emojis') === 'false') return;
    const targets = document.querySelectorAll(`[data-player-id="${playerId}"], [data-id="${playerId}"]`);
    
    targets.forEach(playerEl => {
      const avatarEl = playerEl.querySelector('.player-avatar') || 
                       playerEl.querySelector('.gsp-avatar') || 
                       playerEl.querySelector('div') || 
                       playerEl;

      if (!avatarEl) return;

      const oldBubble = avatarEl.querySelector('.profile-emoji-bubble');
      if (oldBubble) oldBubble.remove();

      const bubble = document.createElement('div');
      bubble.className = 'profile-emoji-bubble';
      bubble.innerHTML = `<img src="${_escapeHtml(emojiSrc)}" alt="emoji">`;

      avatarEl.appendChild(bubble);
    });
  }

  // 3. 이모지 버블 제거 보조 함수
  function _removeProfileEmojiDOM(playerId) {
    const targets = document.querySelectorAll(`[data-player-id="${playerId}"], [data-id="${playerId}"]`);
    targets.forEach(playerEl => {
      const bubble = playerEl.querySelector('.profile-emoji-bubble');
      if (bubble) bubble.remove();
    });
  }
  /* ── 🖱️ PC 인게임 화면 잘림 시 마우스 상하 드래그 스크롤 지원 ── */
  function _initInGameDragScroll() {
    const gameScreen = $('screen-game');
    if (!gameScreen) return;

    let isDown = false;
    let startY = 0;
    let startScrollTop = 0;

    gameScreen.addEventListener('mousedown', (e) => {
      if (gameScreen.scrollHeight <= gameScreen.clientHeight + 4) return;
      if (e.target.closest('button, input, textarea, a, canvas, #ak-canvas, .alkkagi-wrap, .janggi-card, .janggi-wrap, .janggi-piece, .yut-board-node, .yut-board-piece, .yut-waiting-token, .yut-power-btn, .yut-mat-arena, .chess-piece, .board-cell, .apple-box, .q-cell, .q-wall-slot, .palette-color, .btn-manage-trigger, .sidebar-game-bubble')) {
        return;
      }

      isDown = true;
      startY = e.pageY;
      startScrollTop = gameScreen.scrollTop;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const deltaY = e.pageY - startY;
      gameScreen.scrollTop = startScrollTop - deltaY;
    });

    window.addEventListener('mouseup', () => {
      isDown = false;
    });
  }

  /* =====================================================================
     9. 앱 시작 시 초기화
     ===================================================================== */
  _initTheme();
  showScreen('home');
  _updateHomeUserBar();
  _applyCosmeticsToAllUI();
  _initCreateRoomOptions();
  _initGameExtraSettings();
  _initFirebaseLobby();
  _initSidebarGameTooltips();
  _initInGameDragScroll();
  _initSupabaseAuthUI();
  _initStatsUI();
  _initOnlineUsersPresence();
  _initLobbyChat();
  _initFriendsSystem();
  console.log('[App] P2P 아케이드 플랫폼 시작 완료 (PC 인게임 드래그 스크롤 & Firebase 로비 연동 & Supabase 인증 & 전적 시스템 & 실시간 접속자 & 로비 채팅 & 친구 시스템)');



/* =====================================================================
     Virtual Routing / History popstate
     ===================================================================== */
  window.addEventListener('popstate', (e) => {
    // 1. Close modals if they are open
    if ($('modal-friends') && !$('modal-friends').classList.contains('hidden')) {
      $('modal-friends').classList.add('hidden');
      return;
    }
    if ($('stats-modal') && !$('stats-modal').classList.contains('hidden')) {
      $('stats-modal').classList.add('hidden');
      return;
    }
    if ($('auth-modal') && !$('auth-modal').classList.contains('hidden')) {
      $('auth-modal').classList.add('hidden');
      return;
    }
    if ($('overlay-settings') && !$('overlay-settings').classList.contains('hidden')) {
      $('overlay-settings').classList.add('hidden');
      return;
    }
    if ($('overlay-room-password') && !$('overlay-room-password').classList.contains('hidden')) {
      $('overlay-room-password').classList.add('hidden');
      return;
    }
    if ($('lobby-chat-card') && $('lobby-chat-card').classList.contains('mobile-open')) {
      $('lobby-chat-card').classList.remove('mobile-open');
      if ($('lobby-mobile-chat-backdrop')) $('lobby-mobile-chat-backdrop').classList.add('hidden');
      return;
    }
    if ($('room-chat-panel') && $('room-chat-panel').classList.contains('mobile-open')) {
      $('room-chat-panel').classList.remove('mobile-open');
      if ($('room-mobile-chat-backdrop')) $('room-mobile-chat-backdrop').classList.add('hidden');
      return;
    }
    if ($('game-chat-panel') && $('game-chat-panel').classList.contains('mobile-open')) {
      $('game-chat-panel').classList.remove('mobile-open');
      if ($('mobile-chat-backdrop')) $('mobile-chat-backdrop').classList.add('hidden');
      return;
    }
    if ($('overlay-result') && !$('overlay-result').classList.contains('hidden')) {
      $('overlay-result').classList.add('hidden');
      return;
    }

    const state = e.state;
    const targetScreen = state && state.screen ? state.screen : 'home';

    // Prevent going Forward into room/game without a session
    if ((targetScreen === 'room' || targetScreen === 'game') && !currentRoomCode) {
      _replaceHistory({ screen: 'home' });
      showScreen('home', false);
      return;
    }

    // 2. Handle leaving game (Currently in 'game' screen)
    if (screens['game'] && screens['game'].classList.contains('active')) {
      if (targetScreen === 'room' || targetScreen === 'home') {
        _hideResultOverlay();
        if (P2P.isHost()) {
          try { P2P.send({ type: 'return_to_room' }); } catch (_) {}
        } else {
          try {
            P2P.send({
              type: 'guest_leave_game',
              playerId: P2P.getMyId(),
              name: myNickname
            });
          } catch (_) {}
        }

        // 제스처 등으로 인게임에서 곧바로 홈(로비)까지 뒤로가기 된 경우 예외 처리
        if (targetScreen === 'home') {
          if (!P2P.isHost()) {
            try { P2P.send({ type: 'guest_leave_room', name: myNickname }); } catch (_) {}
          }
          _leaveRoom(false);
        } else {
          _exitGameToRoom(false);
        }
        return;
      }
    }

    // 3. Handle leaving room to home (Currently in 'room' screen)
    if (screens['room'] && screens['room'].classList.contains('active')) {
      if (targetScreen === 'home') {
        if (!P2P.isHost()) {
          try { P2P.send({ type: 'guest_leave_room', name: myNickname }); } catch (_) {}
        }
        _leaveRoom(false);
        return;
      }
      if (targetScreen === 'game') {
        showScreen('game', false);
        return;
      }
    }

    showScreen(targetScreen, false);
  });

  // Push initial state
  _replaceHistory({ screen: 'home' });

  // 🌐 URL 초대 링크(?room=CODE) 자동 입장 처리
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && roomParam.trim().length === 4) {
      const cleanCode = roomParam.trim().toUpperCase();
      // URL 파라미터는 history.replaceState로 주소창에서 정리 (새로고침 시 루프 방지)
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({ screen: 'home' }, document.title, cleanUrl);

      setTimeout(() => {
        showToast(`초대받은 방(${cleanCode})으로 입장을 시도합니다...`, 'info');
        _startJoinRoom(cleanCode);
      }, 500);
    }
  } catch (err) {
    console.warn('[AutoJoin] URL 파라미터 처리 오류:', err);
  }


  window.App = {
    updateInGameTurn,
    openPlayerStatsModal: _openPlayerStatsModal
  };
})();