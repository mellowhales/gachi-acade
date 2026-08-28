/**
 * app.js - P2P 아케이드 플랫폼 메인 컨트롤러
 * (2~5인 다중 플레이, 오목 반응형 & 2인 제한, 셔플, 실시간 퇴장 알림 및 참가자 목록 즉각 제거)
 */
(() => {
  'use strict';

  /* ── 게임 목록 정의 ── */
  const GAMES = {
    gomoku:    { module: GomokuGame,    title: '오목',          maxPlayers: 2, isTurnBased: true },
    chess:     { module: ChessGame,     title: '체스',          maxPlayers: 2, isTurnBased: true },
    janggi:    { module: JanggiGame,    title: '장기',          maxPlayers: 2, isTurnBased: true },
    alkkagi:   { module: AlkkagiGame,   title: '알까기',        maxPlayers: 2, isTurnBased: true },
    quoridor:  { module: QuoridorGame,  title: '쿼리도',        maxPlayers: 2, isTurnBased: true },
    baskin31:  { module: Baskin31Game,  title: '베스킨라빈스 31', maxPlayers: 8, isTurnBased: true },
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

  // 현재 게임 중인 참가자 목록 (셔플된 순서)
  let activeGamePlayers = [];

  // 방장 관리 액션 대상 플레이어
  let selectedTargetPlayer = null;
  let lastKnownTurnPlayerIdOrIdx = null; // 🌟 현재 턴 인덱스/ID 영구 기억 변수

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

  function showScreen(name, pushState = true) {
    const t = screens[name];
    if (!t) return;
    if (t.classList.contains('active')) {
      if (name === 'home') _updateHomeUserBar();
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

  /* ── 사운드 & 환경 설정 모달 시스템 ── */
  function _openSettingsModal() {
    _pushHistory({ modal: 'settings' }, '#settings');
    const isBgmMuted = Sound.isBgmMuted();
    const isSfxMuted = Sound.isSfxMuted();
    const bgmVol = Math.round(Sound.getBgmVolume() * 100);
    const sfxVol = Math.round(Sound.getSfxVolume() * 100);

    _applyTheme(currentTheme);

    if ($('slider-bgm-vol')) $('slider-bgm-vol').value = bgmVol;
    if ($('slider-sfx-vol')) $('slider-sfx-vol').value = sfxVol;
    if ($('text-bgm-vol')) $('text-bgm-vol').textContent = `${bgmVol}%`;
    if ($('text-sfx-vol')) $('text-sfx-vol').textContent = `${sfxVol}%`;

    _updateSettingsMuteButtons(isBgmMuted, isSfxMuted);

    if ($('overlay-settings')) $('overlay-settings').classList.remove('hidden');
  }

  function _closeSettingsModal() {
    if (_backHistoryIfModal('settings')) return;
    if ($('overlay-settings')) $('overlay-settings').classList.add('hidden');
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

    const mainSoundIcon = $('sound-icon');
    const soundStatusText = $('sound-status-text');
    if (mainSoundIcon) {
      mainSoundIcon.className = (isBgmMuted && isSfxMuted)
        ? 'fa-solid fa-volume-xmark'
        : 'fa-solid fa-volume-high';
    }
    if (soundStatusText) {
      soundStatusText.textContent = (isBgmMuted && isSfxMuted) ? '소리 꺼짐' : '소리 설정';
    }
  }

  // 설정 열기 버튼들
  if ($('btn-open-settings')) $('btn-open-settings').addEventListener('click', _openSettingsModal);
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
  function _updateHomeUserBar() {
    const avatarEl = $('home-user-avatar');
    if (avatarEl) {
      avatarEl.innerHTML = `<i class="${myAvatarIcon || 'fa-solid fa-paw'}"></i>`;
      avatarEl.style.background = myAvatarColor || '#38a169';
    }
    if ($('home-user-name')) $('home-user-name').textContent = myNickname || '익명';
  }

  /* ── 🌐 Firebase 실시간 글로벌 로비 목록 (공개방 / 비밀방 탭 필터링) ── */
  let _currentLobbyTab = 'public'; // 'public' | 'private'
  let _latestLobbyRoomsData = null;

  function _initFirebaseLobby() {
    const tabPublic = $('tab-lobby-public');
    const tabPrivate = $('tab-lobby-private');

    if (tabPublic) {
      tabPublic.addEventListener('click', () => {
        if (_currentLobbyTab === 'public') return;
        _currentLobbyTab = 'public';
        tabPublic.classList.add('active');
        if (tabPrivate) tabPrivate.classList.remove('active');
        _renderLobbyRooms(_latestLobbyRoomsData);
      });
    }

    if (tabPrivate) {
      tabPrivate.addEventListener('click', () => {
        if (_currentLobbyTab === 'private') return;
        _currentLobbyTab = 'private';
        tabPrivate.classList.add('active');
        if (tabPublic) tabPublic.classList.remove('active');
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

    if (!roomsData || typeof roomsData !== 'object' || Object.keys(roomsData).length === 0) {
      listEl.classList.add('is-empty');
      listEl.innerHTML = `
        <div class="lobby-empty">
          <i class="fa-regular fa-compass"></i>
          <p>${_currentLobbyTab === 'public' ? '현재 열려있는 공개방이 없습니다.<br>새로운 방을 직접 만들어 보세요!' : '현재 열려있는 비밀방이 없습니다.<br>비밀방을 직접 만들어 친구를 초대해 보세요!'}</p>
        </div>
      `;
      return;
    }

    const allEntries = Object.entries(roomsData).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

    // 🌟 탭에 따라 공개방 / 비밀방 필터링
    const roomEntries = allEntries.filter(([code, room]) => {
      const lock = isLockRoom(room);
      return _currentLobbyTab === 'public' ? !lock : lock;
    });

    if (roomEntries.length === 0) {
      listEl.classList.add('is-empty');
      listEl.innerHTML = `
        <div class="lobby-empty">
          <i class="fa-regular fa-compass"></i>
          <p>${_currentLobbyTab === 'public' ? '현재 열려있는 공개방이 없습니다.<br>새로운 방을 직접 만들어 보세요!' : '현재 열려있는 비밀방이 없습니다.<br>비밀방을 직접 만들어 친구를 초대해 보세요!'}</p>
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

      const card = document.createElement('div');
      card.className = `lobby-room-card ${isPlaying ? 'is-playing' : (isFull ? 'is-full' : '')}`;
      card.innerHTML = `
        <div class="lrc-top">
          <div class="lrc-badge-group">
            <span class="lrc-code-badge"><i class="fa-solid fa-hashtag"></i> ${code}</span>
            ${isLock ? '<span class="lrc-lock-badge"><i class="fa-solid fa-lock"></i> 비밀방</span>' : ''}
            <span class="lrc-status-badge ${isPlaying ? 'playing' : (isFull ? 'full' : 'waiting')}">
              ${isPlaying ? '<i class="fa-solid fa-gamepad"></i> 진행 중' : (isFull ? '<i class="fa-solid fa-user-lock"></i> 만원' : '<i class="fa-solid fa-door-open"></i> 대기 중')}
            </span>
          </div>
          <span class="lrc-count-badge"><i class="fa-solid fa-users"></i> ${pCount}/${maxP}명</span>
        </div>
        <div class="lrc-row-bottom">
          <div class="lrc-host-info">
            <div class="lrc-host-avatar" style="background:${room.hostAvatarColor || '#38a169'};"><i class="${room.hostAvatarIcon || 'fa-solid fa-paw'}"></i></div>
            <div class="lrc-host-meta">
              <strong class="lrc-host-name">${_escapeHtml(room.hostName || '익명')} <i class="fa-solid fa-crown" style="color:var(--yellow);font-size:0.75rem;"></i></strong>
            </div>
          </div>
          <button type="button" class="btn ${isPlaying ? 'btn-danger is-playing-btn' : 'btn-primary'} btn-sm lrc-join-btn ${isFull ? 'disabled' : ''}">
            <span>${isPlaying ? '진행 중 입장' : (isFull ? '마감' : (isLock ? '비밀번호' : '입장'))}</span>
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

  // 로비 새로고침 버튼 애니메이션
  if ($('btn-refresh-lobby')) {
    $('btn-refresh-lobby').addEventListener('click', () => {
      const icon = $('btn-refresh-lobby').querySelector('i');
      if (icon) {
        icon.style.transition = 'transform 0.5s ease';
        icon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
          icon.style.transition = 'none';
          icon.style.transform = 'none';
        }, 500);
      }
      showToast('방 목록을 새로고침했습니다.', 'info');
    });
  }

  /* ── 👑 방장 관리 드롭다운 (강퇴 & 위임) ── */
  function _openHostActionMenu(e, targetPlayer) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const amIHost = P2P.isHost() || isHostPlayer;
    if (!amIHost || !targetPlayer || targetPlayer.isHost || targetPlayer.id === P2P.getMyId()) return;

    selectedTargetPlayer = targetPlayer;
    const dropdown = $('host-action-dropdown');
    const nameEl = $('host-action-target-name');
    if (!dropdown || !nameEl) return;

    nameEl.textContent = `${targetPlayer.name}님 관리`;
    dropdown.classList.remove('hidden');

    // 마우스/클릭 타겟 위치 기반 최적 포지셔닝
    const targetEl = e.currentTarget || e.target;
    const rect = targetEl.getBoundingClientRect();
    const dropdownWidth = 175;
    const dropdownHeight = 115;

    let left = rect.right - dropdownWidth;
    let top = rect.bottom + 6;

    if (left < 10) left = 10;
    if (left + dropdownWidth > window.innerWidth - 10) left = window.innerWidth - dropdownWidth - 10;
    if (top + dropdownHeight > window.innerHeight - 10) top = rect.top - dropdownHeight - 6;

    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
  }

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

  // [강퇴하기] 버튼 클릭
  if ($('btn-host-kick')) {
    $('btn-host-kick').addEventListener('click', () => {
      if (!P2P.isHost() || !selectedTargetPlayer) return;
      const target = selectedTargetPlayer;
      _closeHostActionMenu();

      if (confirm(`${target.name}님을 정말 강퇴하시겠습니까?`)) {
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
    $('tab-create').classList.add('active');
    $('tab-join').classList.remove('active');
    $('panel-create').classList.add('active');
    $('panel-join').classList.remove('active');
  });

  $('tab-join').addEventListener('click', () => {
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
    _pushHistory({ modal: 'profile' }, '#profile');
    const popup = $('profile-bubble-popup');
    if (!popup) return;

    if (popup.classList.contains('active')) {
      _closeProfileModal();
      return;
    }

    _tempSelectedIcon = myAvatarIcon;
    _tempSelectedColor = myAvatarColor;

    if ($('profile-input-nick')) {
      $('profile-input-nick').value = myNickname || '익명';
    }

    _renderProfileModalGrids();
    _updateProfileModalPreview();

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

  function _closeProfileModal() {
    if (_backHistoryIfModal('profile')) return;
    const popup = $('profile-bubble-popup');
    if (popup) {
      popup.classList.add('hidden');
      popup.classList.remove('active');
    }
  }

  function _updateProfileModalPreview() {
    const previewAvatar = $('profile-preview-avatar');
    const previewIcon = $('profile-preview-icon');
    const previewName = $('profile-preview-name');
    const nickVal = ($('profile-input-nick') ? $('profile-input-nick').value.trim() : '') || myNickname || '익명';

    if (previewAvatar) previewAvatar.style.background = _tempSelectedColor;
    if (previewIcon) previewIcon.className = _tempSelectedIcon;
    if (previewName) previewName.textContent = nickVal;
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
    myNickname = val.slice(0, 8);
    myAvatarIcon = _tempSelectedIcon || 'fa-solid fa-dog';
    myAvatarColor = _tempSelectedColor || '#38a169';

    localStorage.setItem('arcade_nick', myNickname);
    localStorage.setItem('arcade_avatar_icon', myAvatarIcon);
    localStorage.setItem('arcade_avatar_color', myAvatarColor);

    _updateHomeUserBar();

    // 현재 방에 참여 중이라면 방 참가자 정보도 즉시 동기화
    if (currentRoomCode && roomPlayers.length > 0) {
      const myId = P2P.getMyId();
      const me = roomPlayers.find(p => p.id === myId);
      if (me) {
        me.name = myNickname;
        me.avatarIcon = myAvatarIcon;
        me.avatarColor = myAvatarColor;
      }
      _renderRoomPlayers();
      if (isHostPlayer) {
        _hostBroadcastRoomState();
      } else {
        P2P.send({
          type: 'guest_update_profile',
          name: myNickname,
          avatarIcon: myAvatarIcon,
          avatarColor: myAvatarColor
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
        createRoomCapacity = Math.max(2, createRoomCapacity - 1);
        capVal.textContent = `${createRoomCapacity}인`;
      });
      btnPlus.addEventListener('click', () => {
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
        selectedGameRounds = Math.min(8, selectedGameRounds + 1);
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
    // 진영 지원 게임: 오목, 체스, 장기, 알까기
    const isSideGame = ['gomoku', 'chess', 'janggi', 'alkkagi'].includes(selectedGameKey);

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
    _startHostRoom();
  });

  $('btn-join-room').addEventListener('click', () => {
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
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        isHost: true,
        isReady: true
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
          !!currentRoomPassword
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
      isHostPlayer = false;
      isMyReady = false;

      _resetChatLogs();

      // 🌟 방 화면으로 즉시 전환하여 홈 화면에 멈추는 현상 방지
      _enterRoomScreen();

      P2P.send({
        type: 'guest_hello',
        id: P2P.getMyId(),
        name: myNickname || '익명',
        avatarIcon: myAvatarIcon,
        avatarColor: myAvatarColor,
        password: inputPassword || ''
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

      // 👥 최대 정원 검증 (호스트가 설정한 2~8인)
      if (roomPlayers.length >= currentRoomMaxPlayers) {
        P2P.send({ type: 'room_full', message: `방 인원이 가득 찼습니다 (최대 ${currentRoomMaxPlayers}명).` }, senderPeerId);
        return;
      }
      const isJoiningMidGame = isRoomGameActive && activeGamePlayers.length > 0;
      const existingIdx = roomPlayers.findIndex(p => String(p.id) === String(senderPeerId));
      const newPlayerObj = {
        id: senderPeerId,
        name: data.name || '익명',
        avatarIcon: data.avatarIcon || _getRandomAvatarIcon(),
        avatarColor: data.avatarColor || _getRandomAvatarColor(),
        isHost: false,
        isReady: false,
        isSpectator: isJoiningMidGame
      };

      if (existingIdx !== -1) {
        roomPlayers[existingIdx] = newPlayerObj;
      } else {
        roomPlayers.push(newPlayerObj);
      }

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
        if (data.avatarIcon) player.avatarIcon = data.avatarIcon;
        if (data.avatarColor) player.avatarColor = data.avatarColor;
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
      currentRoomCode = data.roomCode;
      roomPlayers = data.players || [];
      if (data.maxPlayers) currentRoomMaxPlayers = data.maxPlayers;
      selectedGameKey = data.selectedGame || 'gomoku';
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

      // 🎮 현재 게임 화면(screen-game)에 있을 때는 대기실로 튕기지 않음
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
      _launchGame(data.game, activeGamePlayers, data.startWord);

    } else if (data.type === 'return_to_room') {
      _exitGameToRoom();

    } else if (data.type === 'player_left_game_broadcast') {
      // 다른 플레이어가 게임에서 나감
      console.log('[Guest] player_left_game_broadcast 수신:', data.name);
      activeGamePlayers = activeGamePlayers.filter(p => p.id !== data.playerId);
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

    } else if (data.type === 'host_left_room') {
      // 🚪 방장이 방을 나감 -> 모든 참가자 로비/홈으로 자동 퇴장
      showToast(data.message || '방장이 퇴장하여 방이 종료되었습니다.', 'error');
      _leaveRoom();

    } else if (data.type === 'chat_msg') {
      // 내가 보낸 메시지의 에코 반사인 경우 무시
      if (data.senderId && data.senderId === P2P.getMyId()) return;
      // 상대방이 보낸 채팅 메시지 수신 및 렌더링
      _appendChatMessage(data, false);
    }
  }

  /* =====================================================================
     실시간 채팅 기능 (방 & 인게임 양방향 동기화)
     ===================================================================== */
  function _sendChatMessage(inputElId) {
    const inputEl = $(inputElId);
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const msgObj = {
      type: 'chat_msg',
      senderId: P2P.getMyId(),
      senderName: myNickname,
      isHost: P2P.isHost(),
      text: text,
      time: timeStr
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
    const initial = senderName.charAt(0);
    const time = data.time || '';

    targetContainers.forEach(container => {
      if (!container) return;

      const msgEl = document.createElement('div');
      msgEl.className = 'chat-msg ' + (isMe ? 'me' : 'other');

      if (isMe) {
        msgEl.innerHTML = `
          <div class="chat-bubble">${_escapeHtml(data.text)}</div>
          <div class="chat-time">${_escapeHtml(time)}</div>
        `;
      } else {
        msgEl.innerHTML = `
          <div class="chat-sender-info">
            <span>${_escapeHtml(senderName)}</span>
            ${isHost ? '<i class="fa-solid fa-crown" style="color:var(--yellow);font-size:0.65rem;"></i>' : ''}
          </div>
          <div class="chat-bubble">${_escapeHtml(data.text)}</div>
          <div class="chat-time">${_escapeHtml(time)}</div>
        `;
      }

      container.appendChild(msgEl);
      container.scrollTop = container.scrollHeight;
    });

    // 모바일에서 채팅창이 닫혀있는 동안 상대방 메시지 도착 시 뱃지 표시
    if (!isMe) {
      const chatPanel = $('game-chat-panel');
      const badge = $('mobile-chat-badge');
      if (chatPanel && !chatPanel.classList.contains('mobile-open') && badge) {
        badge.classList.remove('hidden');
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
      li.className = 'player-item' + 
        (isMe ? ' is-me' : '') +
        (isInActiveGame ? ' is-in-game' : (isReadyGuest ? ' ready' : (isThisHost ? ' host-item' : ''))) + 
        (canManage ? ' can-manage' : '');

      let readyBadgeHtml = '';
      if (isInActiveGame) {
        readyBadgeHtml = '<div class="ready-badge is-playing">게임 진행 중</div>';
      } else if (!isThisHost) {
        readyBadgeHtml = `<div class="ready-badge ${isReadyGuest ? 'is-ready' : ''}">${isReadyGuest ? '준비 완료' : '대기 중'}</div>`;
      }

      li.innerHTML = `
        <div class="player-avatar" style="background:${p.avatarColor || '#38a169'};"><i class="${p.avatarIcon || 'fa-solid fa-paw'}"></i></div>
        <div class="player-meta">
          <div class="player-name">
            ${_escapeHtml(p.name)}
            ${isThisHost ? '<i class="fa-solid fa-crown crown-icon"></i>' : ''}
            ${canManage ? '<button type="button" class="btn-manage-trigger" title="참가자 관리"><i class="fa-solid fa-ellipsis-vertical"></i></button>' : ''}
          </div>
          <div class="player-role">${isThisHost ? '' : '참가자'}</div>
        </div>
        ${readyBadgeHtml}
      `;

      if (canManage) {
        const triggerBtn = li.querySelector('.btn-manage-trigger');
        if (triggerBtn) {
          triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            _openHostActionMenu(e, p);
          });
        }
        li.addEventListener('click', (e) => {
          if (!e.target.closest('.btn-manage-trigger')) {
            _openHostActionMenu(e, p);
          }
        });
      }

      listEl.appendChild(li);
    });

    const slotsEl = $('player-slots');
    slotsEl.innerHTML = '';
    const emptyCount = Math.max(0, currentRoomMaxPlayers - playerCount);
    for (let i = 0; i < emptyCount; i++) {
      const slot = document.createElement('div');
      slot.className = 'player-slot-empty';
      slot.innerHTML = `
        <div class="slot-avatar"><i class="fa-regular fa-user"></i></div>
        <div class="slot-text">참가자 대기 중...</div>
      `;
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
        readyHint.textContent = '개발자 모드: 1인 테스트 시작 가능';
      } else {
        const guests = roomPlayers.filter(p => !p.isHost);
        const allGuestsReady = guests.length >= 1 && guests.every(p => !!p.isReady);
        const isSelectedOverCapacity = selGameObj && selGameObj.maxPlayers && playerCount > selGameObj.maxPlayers;

        btnStart.disabled = !allGuestsReady || isSelectedOverCapacity;

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
        selectedGameKey = gKey;
        _broadcastRoomState();
        _updateRoomUI();
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
      } else if (selectedGameKey === 'chess') {
        // 체스: 0번=백(선공), 1번=흑(후공)
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
  $('btn-leave-room').addEventListener('click', () => {
    if (confirm('방을 나가시겠습니까?')) {
      if (!P2P.isHost()) {
        try {
          P2P.send({ type: 'guest_leave_room', name: myNickname });
        } catch (_) {}
      }
      _leaveRoom();
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
  }

  function _leaveRoom(pushState = true) {
    // 🌐 방장이 방을 나갈 때 모든 참가자에게 퇴장 패킷 브로드캐스트 전송 및 Firebase 삭제
    if (P2P.isHost()) {
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

    if (currentGameModule) {
      try { currentGameModule.destroy(); } catch (_) {}
      currentGameModule = null;
    }
    if ($('game-content')) $('game-content').innerHTML = '';
    P2P.destroy();
    roomPlayers = [];
    activeGamePlayers = [];
    isHostPlayer = false;
    isMyReady = false;
    isDevMode = false;
    currentRoomCode = '';
    _resetChatLogs();
    showScreen('home');
  }

  // 방 코드 복사
  $('btn-copy-room-code').addEventListener('click', () => {
    _copyToClipboard(currentRoomCode);
  });
  $('btn-copy-code').addEventListener('click', () => {
    _copyToClipboard(currentRoomCode);
  });

  function _copyToClipboard(text) {
    if (!text || text === '——') return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => showToast('방 코드가 복사되었습니다: ' + text, 'success'))
        .catch(() => _fallbackCopy(text));
    } else {
      _fallbackCopy(text);
    }
  }
  function _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('방 코드가 복사되었습니다: ' + text, 'success');
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
      li.className = 'gsp-item' + (isMe ? ' is-me' : '') + (isTurn ? ' is-current-turn' : '') + (canManage ? ' can-manage' : '');

      li.innerHTML = `
        <div class="gsp-avatar" style="background:${p.avatarColor || '#38a169'};"><i class="${p.avatarIcon || 'fa-solid fa-paw'}"></i></div>
        <div class="gsp-meta">
          <div class="gsp-name">
            ${_escapeHtml(p.name)}
            ${p.isHost ? '<i class="fa-solid fa-crown" style="color:var(--yellow);font-size:0.75rem;"></i>' : ''}
            ${canManage ? '<button type="button" class="btn-manage-trigger" title="참가자 관리"><i class="fa-solid fa-ellipsis-vertical"></i></button>' : ''}
          </div>
          <div class="gsp-tag" style="font-weight:700;">${orderTag}</div>
        </div>
      `;

      if (canManage) {
        const triggerBtn = li.querySelector('.btn-manage-trigger');
        if (triggerBtn) {
          triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            _openHostActionMenu(e, p);
          });
        }
      }

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
        li.className = 'gsp-item gsp-spectator-item' + (isMe ? ' is-me' : '') + (canManage ? ' can-manage' : '');

        li.innerHTML = `
          <div class="gsp-avatar" style="background:${sp.avatarColor || '#718096'}; opacity:0.85;"><i class="${sp.avatarIcon || 'fa-solid fa-user'}"></i></div>
          <div class="gsp-meta">
            <div class="gsp-name">
              ${_escapeHtml(sp.name)}
              ${canManage ? '<button type="button" class="btn-manage-trigger" title="참가자 관리"><i class="fa-solid fa-ellipsis-vertical"></i></button>' : ''}
            </div>
            <div class="gsp-tag" style="color:var(--t3);font-size:0.7rem;"><i class="fa-regular fa-eye"></i> 실시간 관전 중</div>
          </div>
        `;

        if (canManage) {
          const triggerBtn = li.querySelector('.btn-manage-trigger');
          if (triggerBtn) {
            triggerBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              e.preventDefault();
              _openHostActionMenu(e, sp);
            });
          }
        }

        listEl.appendChild(li);
      });
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
      const icons = ['빨강 말', '파랑 말', '초록 말', '노랑 말'];
      const myColorName = icons[idx % icons.length] || `${idx + 1}번 플레이어`;
      return isTurn
        ? `<span style="color:var(--green-deep);font-weight:900;"><i class="fa-solid fa-play"></i> ${myColorName} (현재 턴)</span>`
        : `<span style="color:var(--t2);font-weight:700;">${myColorName}</span>`;
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
    _showResultOverlay(win, drawInfo, customLeaderboard);
  }

  function _showResultOverlay(win, drawInfo, customLeaderboard) {
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

      if (iAmWinner) Sound.playWin(); else Sound.playLose();

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
    }

    $('overlay-result').classList.remove('hidden');
  }

  function _hideResultOverlay() {
    if (_backHistoryIfModal('result')) return;
    if ($('overlay-result')) $('overlay-result').classList.add('hidden');
  }

  // 결과 화면: 방으로 돌아가기
  $('btn-result-back-room').addEventListener('click', () => {
    _hideResultOverlay();
    _handleBackToRoomClick();
  });

  // 게임 화면 헤더: 방으로 돌아가기 버튼
  $('btn-back-to-room').addEventListener('click', () => {
    if (confirm('게임을 종료하고 방으로 돌아가시겠습니까?')) {
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
      isMyReady = false;
    }

    _enterRoomScreen(pushState);
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
  _initCreateRoomOptions();
  _initGameExtraSettings();
  _initFirebaseLobby();
  _initSidebarGameTooltips();
  _initInGameDragScroll();
  console.log('[App] P2P 아케이드 플랫폼 시작 완료 (PC 인게임 드래그 스크롤 & Firebase 로비 연동)');



  /* =====================================================================
     Virtual Routing / History popstate
     ===================================================================== */
  window.addEventListener('popstate', (e) => {
    // 1. Close modals if they are open
    if ($('overlay-room-password') && !$('overlay-room-password').classList.contains('hidden')) {
      $('overlay-room-password').classList.add('hidden');
      return;
    }
    if ($('profile-bubble-popup') && !$('profile-bubble-popup').classList.contains('hidden')) {
      $('profile-bubble-popup').classList.add('hidden');
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

    // 2. Handle leaving game to room
    if (screens['game'] && screens['game'].classList.contains('active')) {
      if (targetScreen === 'room') {
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
        _exitGameToRoom(false);
        return;
      } else if (targetScreen === 'home') {
        if (!P2P.isHost()) {
          try { P2P.send({ type: 'guest_leave_room', name: myNickname }); } catch (_) {}
        }
        _leaveRoom(false);
        return;
      }
    }

    // 3. Handle leaving room to home
    if (screens['room'] && screens['room'].classList.contains('active')) {
      if (targetScreen === 'home') {
        if (!P2P.isHost()) {
          try { P2P.send({ type: 'guest_leave_room', name: myNickname }); } catch (_) {}
        }
        _leaveRoom(false);
        return;
      }
    }

    showScreen(targetScreen, false);
  });

  // Push initial state
  _replaceHistory({ screen: 'home' });


  window.App = {
    updateInGameTurn
  };
})();
