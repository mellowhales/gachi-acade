/**
 * i18n.js — 가치아케이드 전역 국제화(i18n) 통합 엔진
 * - 네임스페이스 키 (점 표기법) 지원 (예: 'common.button.save')
 * - 템플릿 변수 보간 지원 (예: 'common.user.greeting', { name: 'Player' })
 * - 로케일별 숫자 및 날짜 포맷팅 (Intl.NumberFormat, Intl.DateTimeFormat)
 * - 브라우저 언어 자동 감지 및 LocalStorage 저장
 * - 7개 언어 지원: ko, en, es, tr, ru, zh, ja
 */

const I18N = (() => {
  const LANGUAGES = [
    { code: 'ko', label: '한국어',        flag: '🇰🇷' },
    { code: 'en', label: 'English',       flag: '🇺🇸' },
    { code: 'es', label: 'Español',       flag: '🇪🇸' },
    { code: 'tr', label: 'Türkçe',        flag: '🇹🇷' },
    { code: 'ru', label: 'Русский',       flag: '🇷🇺' },
    { code: 'zh', label: '中文 (简体)',    flag: '🇨🇳' },
    { code: 'ja', label: '日本語',        flag: '🇯🇵' },
  ];

  const STORAGE_KEY = 'arcade_lang';
  let _currentLang = 'ko';
  const _localeBundles = {};

  /* ─────────────────────────────────────────────────────────
     1. 빠른 매핑 및 기본 번들 사전
  ───────────────────────────────────────────────────────── */
  const DICT = {
    // 공통 버튼
    'common.button.save':     { ko:'저장', en:'Save', es:'Guardar', tr:'Kaydet', ru:'Сохранить', zh:'保存', ja:'保存' },
    'common.button.cancel':   { ko:'취소', en:'Cancel', es:'Cancelar', tr:'İptal', ru:'Отмена', zh:'取消', ja:'キャンセル' },
    'common.button.confirm':  { ko:'확인', en:'Confirm', es:'Confirmar', tr:'Onayla', ru:'ОК', zh:'确定', ja:'確認' },
    'common.button.close':    { ko:'닫기', en:'Close', es:'Cerrar', tr:'Kapat', ru:'Закрыть', zh:'关闭', ja:'閉じる' },
    'common.button.ready':    { ko:'준비', en:'Ready', es:'Listo', tr:'Hazır', ru:'Готов', zh:'准备', ja:'準備' },
    'common.button.start':    { ko:'게임 시작', en:'Start Game', es:'Iniciar Juego', tr:'Oyunu Başlat', ru:'Начать Игру', zh:'开始游戏', ja:'ゲームスタート' },
    'common.button.leave':    { ko:'방 나가기', en:'Leave Room', es:'Salir de la Sala', tr:'Odadan Çık', ru:'Покинуть', zh:'离开房间', ja:'部屋を出る' },
    'common.button.rematch':  { ko:'다시 하기', en:'Rematch', es:'Revancha', tr:'Tekrar Oyna', ru:'Реванш', zh:'再来一局', ja:'リマッチ' },
    'common.button.send':     { ko:'전송', en:'Send', es:'Enviar', tr:'Gönder', ru:'Отправить', zh:'发送', ja:'送信' },

    // 네비게이션 & 로비
    'nav.shop':               { ko:'상점 열기', en:'Open Shop', es:'Abrir Tienda', tr:'Dükkanı Aç', ru:'Открыть Магазин', zh:'打开商店', ja:'ショップを開く' },
    'nav.friends':            { ko:'친구 목록', en:'Friends List', es:'Lista de Amigos', tr:'Arkadaş Listesi', ru:'Список Друзей', zh:'好友列表', ja:'フレンドリスト' },
    'nav.settings':           { ko:'환경 설정', en:'Settings', es:'Configuración', tr:'Ayarlar', ru:'Настройки', zh:'设置', ja:'設定' },
    'nav.chat':               { ko:'채팅', en:'Chat', es:'Chat', tr:'Sohbet', ru:'Чат', zh:'聊天', ja:'チャット' },
    'nav.games':              { ko:'게임 목록', en:'Games', es:'Juegos', tr:'Oyunlar', ru:'Игры', zh:'游戏列表', ja:'ゲーム一覧' },

    // 설정 탭
    'settings.tab.env':       { ko:'화면', en:'Display', es:'Pantalla', tr:'Ekran', ru:'Экран', zh:'显示', ja:'画面' },
    'settings.tab.sound':     { ko:'음향', en:'Sound', es:'Sonido', tr:'Ses', ru:'Звук', zh:'音效', ja:'音声' },
    'settings.tab.game':      { ko:'게임', en:'Game', es:'Juego', tr:'Oyun', ru:'Игра', zh:'游戏', ja:'ゲーム' },
    'settings.tab.support':   { ko:'문의', en:'Support', es:'Soporte', tr:'Destek', ru:'Поддержка', zh:'客服', ja:'サポート' },
    'settings.tab.about':     { ko:'정보', en:'About', es:'Acerca de', tr:'Hakkında', ru:'О Программе', zh:'关于', ja:'情報' },
    'settings.tab.language':  { ko:'언어', en:'Language', es:'Idioma', tr:'Dil', ru:'Язык', zh:'语言', ja:'言語' },

    // 설정 옵션
    'settings.env.theme':     { ko:'화면 테마', en:'Theme', es:'Tema', tr:'Tema', ru:'Тема', zh:'主题', ja:'テーマ' },
    'settings.env.light':     { ko:'라이트', en:'Light', es:'Claro', tr:'Açık', ru:'Светлая', zh:'浅色', ja:'ライト' },
    'settings.env.dark':      { ko:'다크', en:'Dark', es:'Oscuro', tr:'Koyu', ru:'Тёмная', zh:'深色', ja:'ダーク' },
    'settings.env.anim':      { ko:'시각 효과 & 애니메이션', en:'Visual FX & Animations', es:'Efectos Visuales', tr:'Görsel Efektler', ru:'Визуальные Эффекты', zh:'视觉效果与动画', ja:'視覚エフェクト＆アニメ' },
    'settings.env.shake':     { ko:'화면 흔들림 효과', en:'Screen Shake', es:'Efecto de Sacudida', tr:'Ekran Sarsıntısı', ru:'Тряска Экрана', zh:'屏幕震动效果', ja:'画面揺れエフェクト' },
    'settings.env.font':      { ko:'글꼴 크기', en:'Font Size', es:'Tamaño de Fuente', tr:'Yazı Boyutu', ru:'Размер Шрифта', zh:'字体大小', ja:'フォントサイズ' },
    'settings.sound.master':  { ko:'전체 사운드', en:'Master Sound', es:'Sonido Principal', tr:'Ana Ses', ru:'Общий Звук', zh:'全部声音', ja:'全体サウンド' },
    'settings.sound.bgm':     { ko:'배경음악 (BGM)', en:'Background Music', es:'Música de Fondo', tr:'Arka Plan Müziği', ru:'Фоновая Музыка', zh:'背景音乐 (BGM)', ja:'BGM' },
    'settings.sound.sfx':     { ko:'효과음 (SFX)', en:'Sound Effects', es:'Efectos de Sonido', tr:'Ses Efektleri', ru:'Звуковые Эффекты', zh:'音效 (SFX)', ja:'効果音 (SFX)' },
    'settings.language.title':{ ko:'언어 선택', en:'Language Selection', es:'Seleccionar Idioma', tr:'Dil Seçin', ru:'Выберите Язык', zh:'选择语言', ja:'言語を選択' },
    'settings.language.desc': { ko:'앱 표시 언어를 선택하세요.', en:'Choose your display language.', es:'Elija el idioma de visualización.', tr:'Görüntüleme dilinizi seçin.', ru:'Выберите язык интерфейса.', zh:'请选择界面显示语言。', ja:'表示言語を選択してください。' },

    // 로비 방 관련
    'lobby.roomsTitle':       { ko:'방 목록', en:'Rooms', es:'Salas', tr:'Odalar', ru:'Комнаты', zh:'房间列表', ja:'部屋一覧' },
    'lobby.createRoom':       { ko:'방 만들기', en:'Create Room', es:'Crear Sala', tr:'Oda Oluştur', ru:'Создать Комнату', zh:'创建房间', ja:'部屋を作成' },
    'lobby.joinRoom':         { ko:'방 참가', en:'Join Room', es:'Entrar a Sala', tr:'Odaya Katıl', ru:'Войти в Комнату', zh:'加入房间', ja:'部屋に参加' },
    'lobby.onlinePlayers':    { ko:'접속 중인 플레이어', en:'Online Players', es:'Jugadores Conectados', tr:'Çevrimiçi Oyuncular', ru:'Игроки Онлайн', zh:'在线玩家', ja:'オンラインプレイヤー' },
    'lobby.noRooms':          { ko:'현재 열린 방이 없습니다', en:'No rooms available', es:'No hay salas disponibles', tr:'Mevcut oda yok', ru:'Нет доступных комнат', zh:'暂无房间', ja:'利用可能な部屋がありません' }
  };

  // 텍스트 기반 즉시 역방향 매핑 테이블
  const RAW_TEXT_MAP = {};
  Object.keys(DICT).forEach(k => {
    const koText = DICT[k].ko;
    if (koText) RAW_TEXT_MAP[koText] = DICT[k];
  });

  // 추가 단어 일대일 매핑
  const EXTRA_WORDS = {
    '화면': DICT['settings.tab.env'],
    '음향': DICT['settings.tab.sound'],
    '게임': DICT['settings.tab.game'],
    '문의': DICT['settings.tab.support'],
    '정보': DICT['settings.tab.about'],
    '언어': DICT['settings.tab.language'],
    '닫기': DICT['common.button.close'],
    '저장': DICT['common.button.save'],
    '취소': DICT['common.button.cancel'],
    '확인': DICT['common.button.confirm'],
    '방 만들기': DICT['lobby.createRoom'],
    '방 참가': DICT['lobby.joinRoom'],
    '방 목록': DICT['lobby.roomsTitle'],
    '환경 설정': DICT['nav.settings'],
    '상점 열기': DICT['nav.shop'],
    '친구 목록': DICT['nav.friends'],
    '채팅': DICT['nav.chat'],
    '게임 목록': DICT['nav.games'],
    '접속 중인 플레이어': DICT['lobby.onlinePlayers'],
    '현재 열린 방이 없습니다': DICT['lobby.noRooms'],
    '오목': { ko:'오목', en:'Gomoku', es:'Gomoku', tr:'Gomoku', ru:'Гомоку', zh:'五子棋', ja:'五目並べ' },
    '체스': { ko:'체스', en:'Chess', es:'Ajedrez', tr:'Satranç', ru:'Шахматы', zh:'国际象棋', ja:'チェス' },
    '체스 워페어': { ko:'체스 워페어', en:'Chess Warfare', es:'Guerra de Ajedrez', tr:'Satranç Savaşı', ru:'Шахматная Война', zh:'象棋战争', ja:'チェスウォーフェア' },
    '장기': { ko:'장기', en:'Janggi', es:'Janggi', tr:'Kore Satrancı', ru:'Чанги', zh:'韩国象棋', ja:'チャンギ' },
    '알까기': { ko:'알까기', en:'Alkkagi', es:'Alkkagi', tr:'Alkkagi', ru:'Алькаги', zh:'弹棋', ja:'アルカギ' },
    '쿼리도': { ko:'쿼리도', en:'Quoridor', es:'Quoridor', tr:'Quoridor', ru:'Квори́дор', zh:'围墙棋', ja:'クォリドー' },
    '베스킨라빈스 31': { ko:'베스킨라빈스 31', en:'Baskin 31', es:'Baskin 31', tr:'Baskin 31', ru:'31 (Игра)', zh:'31点游戏', ja:'バスキン31' },
    '러시안 룰렛': { ko:'러시안 룰렛', en:'Russian Roulette', es:'Ruleta Rusa', tr:'Rus Ruleti', ru:'Русская Рулетка', zh:'俄罗斯轮盘赌', ja:'ロシアンルーレット' },
    '끝말잇기': { ko:'끝말잇기', en:'Word Chain', es:'Cadena de Palabras', tr:'Kelime Zinciri', ru:'Цепочка Слов', zh:'接龙游戏', ja:'しりとり' },
    '사과게임': { ko:'사과게임', en:'Apple Game', es:'Juego de Manzanas', tr:'Elma Oyunu', ru:'Игра в Яблоки', zh:'苹果游戏', ja:'りんごゲーム' },
    '타이핑': { ko:'타이핑', en:'Typing', es:'Mecanografía', tr:'Yazma', ru:'Печатание', zh:'打字游戏', ja:'タイピング' },
    '캐치마인드': { ko:'캐치마인드', en:'Catch Mind', es:'Adivina el Dibujo', tr:'Çizim Tahmin', ru:'Угадай Рисунок', zh:'你画我猜', ja:'キャッチマインド' },
    '윷놀이': { ko:'윷놀이', en:'Yutnori', es:'Yutnori', tr:'Yutnori', ru:'Ютнори', zh:'跳棋游戏', ja:'ユンノリ' },
    '야추': { ko:'야추', en:'Yacht Dice', es:'Yate (Dados)', tr:'Yat Zarı', ru:'Яхта (Кости)', zh:'快艇骰子', ja:'ヤッツー' },
    '골인!': { ko:'골인!', en:'Goal!', es:'¡Meta!', tr:'Gol!', ru:'Финиш!', zh:'到达终点！', ja:'ゴール！' },
    '윷 던지기': { ko:'윷 던지기', en:'Cast Sticks', es:'Lanzar Varillas', tr:'Zar At', ru:'Бросить Палочки', zh:'掷木', ja:'ユッを投げる' }
  };

  Object.assign(RAW_TEXT_MAP, EXTRA_WORDS);

  /* ─────────────────────────────────────────────────────────
     2. 초기화 & 번들 로드
  ───────────────────────────────────────────────────────── */
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.find(l => l.code === saved)) {
      _currentLang = saved;
    } else {
      const bLang = (navigator.language || 'ko').toLowerCase().split('-')[0];
      const matched = LANGUAGES.find(l => l.code === bLang);
      _currentLang = matched ? bLang : 'ko';
    }

    _loadLocaleFile('ko');
    _loadLocaleFile('en');

    _applyToDocument();
    _setupObserver();
    _syncHeaderDropdown();
  }

  function _loadLocaleFile(langCode) {
    if (typeof fetch === 'undefined') return;
    fetch(`locales/${langCode}.json`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          _localeBundles[langCode] = data;
          if (_currentLang === langCode) _applyToDocument();
        }
      })
      .catch(() => {});
  }

  /* ─────────────────────────────────────────────────────────
     3. 번역 및 템플릿 보간 함수 t(keyOrText, params, lang)
  ───────────────────────────────────────────────────────── */
  function t(keyOrText, params, lang) {
    if (!keyOrText || typeof keyOrText !== 'string') return keyOrText;
    const l = lang || _currentLang;
    const trimmed = keyOrText.trim();

    let result = null;

    // 1) 점 표기법 키 검색 (예: common.button.save)
    if (DICT[trimmed] && DICT[trimmed][l]) {
      result = DICT[trimmed][l];
    } else if (_localeBundles[l]) {
      const keys = trimmed.split('.');
      let cur = _localeBundles[l];
      for (const k of keys) {
        if (cur && typeof cur === 'object' && k in cur) {
          cur = cur[k];
        } else {
          cur = null;
          break;
        }
      }
      if (typeof cur === 'string') result = cur;
    }

    // 2) 한국어 원문 직접 매칭 검색
    if (!result && RAW_TEXT_MAP[trimmed] && RAW_TEXT_MAP[trimmed][l]) {
      result = RAW_TEXT_MAP[trimmed][l];
    }

    // 3) 폴백 (기본값)
    if (!result) {
      if (l === 'ko') return keyOrText;
      result = trimmed;
    }

    // 4) 템플릿 변수 치환 ({name}, {count} 등)
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(pKey => {
        const regex = new RegExp(`\\{${pKey}\\}`, 'g');
        result = result.replace(regex, params[pKey]);
      });
    }

    // 앞뒤 공백 보존
    const leading = keyOrText.match(/^\s*/)[0];
    const trailing = keyOrText.match(/\s*$/)[0];
    return leading + result + trailing;
  }

  /* ─────────────────────────────────────────────────────────
     4. 숫자 및 날짜 다국어 포맷팅
  ───────────────────────────────────────────────────────── */
  function formatNumber(number, options) {
    try {
      return new Intl.NumberFormat(_currentLang, options).format(number);
    } catch (_) {
      return String(number);
    }
  }

  function formatDate(date, options) {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return new Intl.DateTimeFormat(_currentLang, options || { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    } catch (_) {
      return String(date);
    }
  }

  /* ─────────────────────────────────────────────────────────
     5. 언어 변경 및 DOM 일괄 반영
  ───────────────────────────────────────────────────────── */
  function setLanguage(code) {
    if (!LANGUAGES.find(l => l.code === code)) return;
    _currentLang = code;
    localStorage.setItem(STORAGE_KEY, code);

    _applyToDocument();
    _syncHeaderDropdown();

    // 설정 모달 내 언어 버튼 동기화
    document.querySelectorAll('.lang-choice-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === code);
    });

    document.documentElement.lang = code;
  }

  function _syncHeaderDropdown() {
    const sel = document.getElementById('select-global-language');
    if (sel && sel.value !== _currentLang) {
      sel.value = _currentLang;
    }
  }

  function _applyToDocument() {
    const lang = _currentLang;

    // 1) data-i18n 속성 번역
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key, null, lang);
    });

    // 2) DOM 텍스트 노드 자동 감지 및 변환
    if (document.body) {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toUpperCase();
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA'].includes(tag)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (node.nodeValue && node.nodeValue.trim().length > 0) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        },
        false
      );

      let node;
      while ((node = walker.nextNode())) {
        const val = node.nodeValue;
        const trimmed = val.trim();
        if (!trimmed) continue;

        if (!node._i18nOrig && RAW_TEXT_MAP[trimmed]) {
          node._i18nOrig = trimmed;
        }

        if (node._i18nOrig && RAW_TEXT_MAP[node._i18nOrig]) {
          const trans = lang === 'ko' ? node._i18nOrig : (RAW_TEXT_MAP[node._i18nOrig][lang] || node._i18nOrig);
          const leading = val.match(/^\s*/)[0];
          const trailing = val.match(/\s*$/)[0];
          node.nodeValue = leading + trans + trailing;
        }
      }
    }

    // 3) placeholder 및 title 번역
    document.querySelectorAll('[title]').forEach(el => {
      const tVal = el.getAttribute('title');
      if (!tVal) return;
      if (!el._i18nOrigTitle && RAW_TEXT_MAP[tVal.trim()]) {
        el._i18nOrigTitle = tVal.trim();
      }
      if (el._i18nOrigTitle && RAW_TEXT_MAP[el._i18nOrigTitle]) {
        el.setAttribute('title', lang === 'ko' ? el._i18nOrigTitle : (RAW_TEXT_MAP[el._i18nOrigTitle][lang] || el._i18nOrigTitle));
      }
    });

    document.querySelectorAll('input[placeholder]').forEach(el => {
      const pVal = el.getAttribute('placeholder');
      if (!pVal) return;
      if (!el._i18nOrigPlaceholder && RAW_TEXT_MAP[pVal.trim()]) {
        el._i18nOrigPlaceholder = pVal.trim();
      }
      if (el._i18nOrigPlaceholder && RAW_TEXT_MAP[el._i18nOrigPlaceholder]) {
        el.setAttribute('placeholder', lang === 'ko' ? el._i18nOrigPlaceholder : (RAW_TEXT_MAP[el._i18nOrigPlaceholder][lang] || el._i18nOrigPlaceholder));
      }
    });
  }

  let _observerTimer = null;
  function _setupObserver() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    const observer = new MutationObserver(() => {
      if (_currentLang === 'ko') return;
      if (_observerTimer) clearTimeout(_observerTimer);
      _observerTimer = setTimeout(() => {
        _applyToDocument();
      }, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return {
    init,
    setLanguage,
    t,
    formatNumber,
    formatDate,
    getCurrentLang: () => _currentLang,
    getLanguages: () => LANGUAGES,
    applyToDocument: _applyToDocument
  };
})();
