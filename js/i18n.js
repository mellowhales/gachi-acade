/**
 * i18n.js — 가치아케이드 전역 국제화(i18n) 통합 엔진
 * - 사이트 내 모든 텍스트(로비, 상점, 친구, 방, 게임, 전적, 프로필, 모달 등) 완전 번역 지원
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
     전체 UI 종합 다국어 번역 사전
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
    'common.button.accept':   { ko:'수락', en:'Accept', es:'Aceptar', tr:'Kabul Et', ru:'Принять', zh:'接受', ja:'承認' },
    'common.button.decline':  { ko:'거절', en:'Decline', es:'Rechazar', tr:'Reddet', ru:'Отклонить', zh:'拒绝', ja:'拒否' },
    'common.button.enter':    { ko:'입장', en:'Enter', es:'Entrar', tr:'Giriş', ru:'Войти', zh:'进入', ja:'入場' },
    'common.button.kick':     { ko:'강퇴하기', en:'Kick', es:'Expulsar', tr:'At', ru:'Выгнать', zh:'踢出', ja:'追放' },
    'common.button.transfer': { ko:'방장 위임', en:'Pass Host', es:'Ceder Anfitrión', tr:'Devret', ru:'Передать хоста', zh:'移交房主', ja:'ホスト委任' },
    'common.button.stats':    { ko:'전적 보기', en:'View Stats', es:'Ver Récord', tr:'İstatistikler', ru:'Статистика', zh:'查看战绩', ja:'戦績を見る' },
  };

  /* ─────────────────────────────────────────────────────────
     한국어 원문 텍스트 일대일 역방향 전역 매핑 테이블
  ───────────────────────────────────────────────────────── */
  const RAW_TEXT_MAP = {
    // 탑바 & 메인 네비게이션
    '가치아케이드': { en:'GachiArcade', es:'GachiArcade', tr:'GachiArcade', ru:'GachiArcade', zh:'Gachi街机', ja:'ガチアーケード' },
    '상점 열기': { en:'Open Shop', es:'Abrir Tienda', tr:'Dükkanı Aç', ru:'Открыть Магазин', zh:'打开商店', ja:'ショップを開く' },
    '친구 목록': { en:'Friends List', es:'Lista de Amigos', tr:'Arkadaş Listesi', ru:'Список Друзей', zh:'好友列表', ja:'フレンドリスト' },
    '환경 설정': { en:'Settings', es:'Configuración', tr:'Ayarlar', ru:'Настройки', zh:'设置', ja:'設定' },
    '채팅': { en:'Chat', es:'Chat', tr:'Sohbet', ru:'Чат', zh:'聊天', ja:'チャット' },
    '채팅창 열기': { en:'Open Chat', es:'Abrir Chat', tr:'Sohbeti Aç', ru:'Открыть Чат', zh:'打开聊天', ja:'チャットを開く' },
    '채팅창 닫기': { en:'Close Chat', es:'Cerrar Chat', tr:'Sohbeti Kapat', ru:'Закрыть Чат', zh:'关闭聊天', ja:'チャットを閉じる' },
    '게임 목록': { en:'Games', es:'Juegos', tr:'Oyunlar', ru:'Игры', zh:'游戏列表', ja:'ゲーム一覧' },
    '2인 전용': { en:'2 Players', es:'2 Jugadores', tr:'2 Oyuncu', ru:'2 Игрока', zh:'2人专用', ja:'2人専用' },
    '2~8인': { en:'2~8 Players', es:'2~8 Jugadores', tr:'2~8 Oyuncu', ru:'2~8 Игроков', zh:'2~8人', ja:'2〜8人' },
    '2~4인': { en:'2~4 Players', es:'2~4 Jugadores', tr:'2~4 Oyuncu', ru:'2~4 Игроков', zh:'2~4人', ja:'2〜4人' },
    '멀티': { en:'Multi', es:'Multi', tr:'Çok Oyunculu', ru:'Мульти', zh:'多人', ja:'マルチ' },

    // 게임 이름 & 설명
    '오목': { en:'Gomoku', es:'Gomoku', tr:'Gomoku', ru:'Гомоку', zh:'五子棋', ja:'五目並べ' },
    '15×15 턴제 전략': { en:'15×15 Turn-Based Strategy', es:'Estrategia 15×15', tr:'15×15 Strateji', ru:'15×15 Стратегия', zh:'15×15回合制策略', ja:'15×15ターン制戦略' },
    '15×15 턴제 바둑판': { en:'15×15 Board Battle', es:'Tablero 15×15', tr:'15×15 Tahta', ru:'15×15 Доска', zh:'15×15棋盘', ja:'15×15盤' },
    '체스': { en:'Chess', es:'Ajedrez', tr:'Satranç', ru:'Шахматы', zh:'国际象棋', ja:'チェス' },
    '실시간 2인 클래식 체스': { en:'Classic Chess 2P', es:'Ajedrez Clásico 2J', tr:'Klasik Satranç 2K', ru:'Шахматы 2И', zh:'2人经典国象', ja:'2人クラシックチェス' },
    '정통 클래식 2인 체스': { en:'Classic 2-Player Chess', es:'Ajedrez Clásico 2J', tr:'Klasik 2K Satranç', ru:'Шахматы 2И', zh:'2人国际象棋', ja:'2人クラシックチェス' },
    '체스 워페어': { en:'Chess Warfare', es:'Guerra de Ajedrez', tr:'Satranç Savaşı', ru:'Шахматная Война', zh:'象棋战争', ja:'チェスウォーフェア' },
    '16×16 영토 점령전': { en:'16×16 Territory Battle', es:'Batalla 16×16', tr:'16×16 Bölge Savaşı', ru:'16×16 Битва за Территорию', zh:'16×16领土争夺战', ja:'16×16領土占領戦' },
    '장기': { en:'Janggi', es:'Janggi', tr:'Kore Satrancı', ru:'Чанги', zh:'韩国象棋', ja:'チャンギ' },
    '정통 2인 한국 장기': { en:'Korean Chess 2P', es:'Ajedrez Coreano 2J', tr:'Kore Satrancı 2K', ru:'Корейские Шахматы 2И', zh:'2人韩国象棋', ja:'2人用韓国将棋' },
    '알까기': { en:'Alkkagi', es:'Alkkagi', tr:'Alkkagi', ru:'Алькаги', zh:'弹棋', ja:'アルカギ' },
    '실시간 물리 알까기 대결': { en:'Physics Flick Battle', es:'Duelo de Física', tr:'Fizik Kapışması', ru:'Физическая Битва', zh:'物理弹棋对决', ja:'物理アルカギ対決' },
    '쿼리도': { en:'Quoridor', es:'Quoridor', tr:'Quoridor', ru:'Квори́дор', zh:'围墙棋', ja:'クォリドー' },
    '미로 탈출 & 벽 세우기': { en:'Maze Escape & Walls', es:'Laberinto y Muros', tr:'Labirent & Duvar', ru:'Лабиринт и Стены', zh:'迷宫逃脱与建墙', ja:'迷路脱出＆壁建て' },
    '베스킨라빈스 31': { en:'Baskin 31', es:'Baskin 31', tr:'Baskin 31', ru:'31 (Игра)', zh:'31点游戏', ja:'バスキン31' },
    '1~3 숫자 심리전': { en:'1-3 Number Mind Game', es:'Juego Mental 1-3', tr:'1-3 Sayı Oyunu', ru:'Игра 1-3 Числа', zh:'1~3数字心理战', ja:'1~3心理戦' },
    '러시안 룰렛': { en:'Russian Roulette', es:'Ruleta Rusa', tr:'Rus Ruleti', ru:'Русская Рулетка', zh:'俄罗斯轮盘赌', ja:'ロシアンルーレット' },
    '실탄&공포탄 서바이벌': { en:'Live & Blank Survival', es:'Supervivencia con Balas', tr:'Hayatta Kalma', ru:'Выживание с Патронами', zh:'实弹生存对决', ja:'実弾サバイバル' },
    '끝말잇기': { en:'Word Chain', es:'Cadena de Palabras', tr:'Kelime Zinciri', ru:'Цепочка Слов', zh:'接龙游戏', ja:'しりとり' },
    '15초 스피드 대결': { en:'15s Speed Battle', es:'Duelo de 15 Segundos', tr:'15sn Hız Savaşı', ru:'15-сек Битва', zh:'15秒速度对决', ja:'15秒スピード対決' },
    '사과게임': { en:'Apple Game', es:'Juego de Manzanas', tr:'Elma Oyunu', ru:'Игра в Яблоки', zh:'苹果游戏', ja:'りんごゲーム' },
    '60초 숫자 퍼즐': { en:'60s Number Puzzle', es:'Puzzle de 60s', tr:'60sn Sayı Bulmacası', ru:'60-сек Головоломка', zh:'60秒数字谜题', ja:'60秒数字パズル' },
    '타이핑': { en:'Typing', es:'Mecanografía', tr:'Yazma', ru:'Печатание', zh:'打字游戏', ja:'タイピング' },
    '타자연습 대결': { en:'Typing Battle', es:'Duelo de Mecanografía', tr:'Hızlı Yazma', ru:'Печатание', zh:'打字对决', ja:'タイピング対決' },
    '실시간 속타 배틀': { en:'Real-time Typing Duel', es:'Duelo de Velocidad', tr:'Hız Kapışması', ru:'Скоростной Набор', zh:'实时速打对决', ja:'リアルタイム打鍵バトル' },
    '캐치마인드': { en:'Catch Mind', es:'Adivina el Dibujo', tr:'Çizim Tahmin', ru:'Угадай Рисунок', zh:'你画我猜', ja:'キャッチマインド' },
    '실시간 그림 퀴즈 배틀': { en:'Draw & Guess Party', es:'Dibuja y Adivina', tr:'Çiz & Tahmin Et', ru:'Рисуй и Угадывай', zh:'你画我猜趣味赛', ja:'お絵かきクイズバトル' },
    '윷놀이': { en:'Yutnori', es:'Yutnori', tr:'Yutnori', ru:'Ютнори', zh:'跳棋游戏', ja:'ユンノリ' },
    '전통 윷놀이 말판 배틀': { en:'Traditional Korean Board Game', es:'Juego de Mesa Tradicional', tr:'Geleneksel Masa Oyunu', ru:'Корейская Настольная Игра', zh:'传统韩国棋盘对决', ja:'伝統韓国ボードゲーム' },
    '야추': { en:'Yacht Dice', es:'Yate (Dados)', tr:'Yat Zarı', ru:'Яхта (Кости)', zh:'快艇骰子', ja:'ヤッツー' },
    '야추 다이스': { en:'Yacht Dice', es:'Yate (Dados)', tr:'Yat Zarı', ru:'Яхта (Кости)', zh:'快艇骰子', ja:'ヤッツー' },
    '3D 주사위 족보 배틀': { en:'3D Dice High Score Duel', es:'Duelo de Dados 3D', tr:'3D Zar Oyunu', ru:'3D Кости Битва', zh:'3D骰子组合战', ja:'3Dサイコロ役バトル' },

    // 설정 모달
    '화면': { en:'Display', es:'Pantalla', tr:'Ekran', ru:'Экран', zh:'显示', ja:'画面' },
    '음향': { en:'Sound', es:'Sonido', tr:'Ses', ru:'Звук', zh:'音效', ja:'音声' },
    '게임': { en:'Game', es:'Juego', tr:'Oyun', ru:'Игра', zh:'游戏', ja:'ゲーム' },
    '문의': { en:'Support', es:'Soporte', tr:'Destek', ru:'Поддержка', zh:'客服', ja:'サポート' },
    '정보': { en:'About', es:'Acerca de', tr:'Hakkında', ru:'О Программе', zh:'关于', ja:'情報' },
    '언어': { en:'Language', es:'Idioma', tr:'Dil', ru:'Язык', zh:'语言', ja:'言語' },
    '언어 선택': { en:'Language Selection', es:'Seleccionar Idioma', tr:'Dil Seçin', ru:'Выберите Язык', zh:'选择语言', ja:'言語を選択' },
    '앱 표시 언어를 선택하세요.': { en:'Choose your display language.', es:'Elija el idioma de visualización.', tr:'Görüntüleme dilinizi seçin.', ru:'Выберите язык интерфейса.', zh:'请选择界面显示语言。', ja:'表示言語を選択してください。' },
    '화면 테마': { en:'Theme', es:'Tema', tr:'Tema', ru:'Тема', zh:'主题', ja:'テーマ' },
    '라이트': { en:'Light', es:'Claro', tr:'Açık', ru:'Светлая', zh:'浅色', ja:'ライト' },
    '다크': { en:'Dark', es:'Oscuro', tr:'Koyu', ru:'Тёмная', zh:'深色', ja:'ダーク' },
    '시각 효과 & 애니메이션': { en:'Visual FX & Animations', es:'Efectos Visuales', tr:'Görsel Efektler', ru:'Визуальные Эффекты', zh:'视觉效果与动画', ja:'視覚エフェクト＆アニメ' },
    '화면 흔들림 효과': { en:'Screen Shake', es:'Efecto de Sacudida', tr:'Ekran Sarsıntısı', ru:'Тряска Экрана', zh:'屏幕震动效果', ja:'画面揺れエフェクト' },
    '글꼴 크기': { en:'Font Size', es:'Tamaño de Fuente', tr:'Yazı Boyutu', ru:'Размер Шрифта', zh:'字体大小', ja:'フォントサイズ' },
    '보통': { en:'Normal', es:'Normal', tr:'Normal', ru:'Обычный', zh:'正常', ja:'普通' },
    '크게': { en:'Large', es:'Grande', tr:'Büyük', ru:'Крупный', zh:'大', ja:'大きい' },
    '전체 사운드': { en:'Master Sound', es:'Sonido Principal', tr:'Ana Ses', ru:'Общий Звук', zh:'全部声音', ja:'全体サウンド' },
    '소리 켜짐': { en:'Sound On', es:'Sonido Activado', tr:'Ses Açık', ru:'Звук Вкл', zh:'声音开启', ja:'サウンドオン' },
    '소리 꺼짐': { en:'Sound Off', es:'Sonido Silenciado', tr:'Ses Kapalı', ru:'Звук Выкл', zh:'声音关闭', ja:'サウンドオフ' },
    '배경음악 (BGM)': { en:'Background Music', es:'Música de Fondo', tr:'Arka Plan Müziği', ru:'Фоновая Музыка', zh:'背景音乐 (BGM)', ja:'BGM' },
    '효과음 (SFX)': { en:'Sound Effects', es:'Efectos de Sonido', tr:'Ses Efektleri', ru:'Звуковые Эффекты', zh:'音效 (SFX)', ja:'効果音 (SFX)' },
    '사운드 테스트': { en:'Sound Test', es:'Prueba de Sonido', tr:'Ses Testi', ru:'Тест Звука', zh:'声音测试', ja:'サウンドテスト' },
    '대기실 자동 준비': { en:'Auto Ready in Room', es:'Preparación Automática', tr:'Otomatik Hazır', ru:'Авто Готовность', zh:'房间自动准备', ja:'自動レディ' },
    '초대 방해금지': { en:'Do Not Disturb', es:'No Molestar', tr:'Rahatsız Etme', ru:'Не Беспокоить', zh:'免打扰', ja:'招待拒否' },
    '이모지 표시': { en:'Show Emojis', es:'Mostrar Emojis', tr:'Emojileri Göster', ru:'Показывать Эмодзи', zh:'显示表情', ja:'絵文字表示' },
    '채팅 알림': { en:'Chat Notifications', es:'Notificaciones de Chat', tr:'Sohbet Bildirimleri', ru:'Уведомления Чата', zh:'聊天通知', ja:'チャット通知' },
    '버그 제보 및 건의사항': { en:'Bug Report & Feedback', es:'Reporte de Errores', tr:'Hata Bildirimi', ru:'Отчет об Ошибках', zh:'反馈与建议', ja:'不具合報告・ご意見' },
    '업데이트 내역': { en:'Changelog', es:'Historial de Cambios', tr:'Değişiklik Günlüğü', ru:'История Обновлений', zh:'更新日志', ja:'更新履歴' },
    '닫기': { en:'Close', es:'Cerrar', tr:'Kapat', ru:'Закрыть', zh:'关闭', ja:'閉じる' },

    // 로비 방 목록 & 만들기
    '방 목록': { en:'Rooms', es:'Salas', tr:'Odalar', ru:'Комнаты', zh:'房间列表', ja:'部屋一覧' },
    '방 만들기': { en:'Create Room', es:'Crear Sala', tr:'Oda Oluştur', ru:'Создать Комнату', zh:'创建房间', ja:'部屋を作成' },
    '방 참가': { en:'Join Room', es:'Entrar a Sala', tr:'Odaya Katıl', ru:'Войти в Комнату', zh:'加入房间', ja:'部屋に参加' },
    '전체': { en:'All', es:'Todos', tr:'Tümü', ru:'Все', zh:'全部', ja:'すべて' },
    '공개방': { en:'Public', es:'Pública', tr:'Açık', ru:'Открытые', zh:'公开', ja:'公開' },
    '비밀방': { en:'Private', es:'Privada', tr:'Gizli', ru:'Приватные', zh:'私密', ja:'非公開' },
    '모든 게임': { en:'All Games', es:'Todos los Juegos', tr:'Tüm Oyunlar', ru:'Все Игры', zh:'所有游戏', ja:'すべてのゲーム' },
    '목록 새로고침': { en:'Refresh List', es:'Actualizar', tr:'Yenile', ru:'Обновить', zh:'刷新列表', ja:'更新' },
    '접속자 새로고침': { en:'Refresh Players', es:'Actualizar', tr:'Yenile', ru:'Обновить', zh:'刷新玩家', ja:'更新' },
    '접속 중인 플레이어': { en:'Online Players', es:'Jugadores Conectados', tr:'Çevrimiçi Oyuncular', ru:'Игроки Онлайн', zh:'在线玩家', ja:'オンラインプレイヤー' },
    '현재 열려있는 공개방이 없습니다.': { en:'No rooms available right now.', es:'No hay salas disponibles.', tr:'Mevcut oda yok.', ru:'Нет доступных комнат.', zh:'暂无开放房间。', ja:'現在公開中の部屋はありません。' },
    '새로운 방을 직접 만들어 보세요!': { en:'Create a new room yourself!', es:'¡Crea una nueva sala!', tr:'Yeni bir oda oluşturun!', ru:'Создайте новую комнату!', zh:'自己创建一个新房间吧！', ja:'新しい部屋を作成してみましょう！' },
    '공개 설정': { en:'Visibility', es:'Visibilidad', tr:'Görünürlük', ru:'Доступность', zh:'公开设置', ja:'公開設定' },
    '비밀번호': { en:'Password', es:'Contraseña', tr:'Şifre', ru:'Пароль', zh:'密码', ja:'パスワード' },
    '최대 인원': { en:'Max Players', es:'Máx Jugadores', tr:'Maks Oyuncu', ru:'Макс Игроков', zh:'最大人数', ja:'最大人数' },
    '방 코드로 참가': { en:'Join with Code', es:'Unirse con Código', tr:'Kod ile Katıl', ru:'Войти по Коду', zh:'使用房间号加入', ja:'コードで参加' },
    '방 코드 4자리 입력': { en:'Enter 4-letter code', es:'Ingresa código de 4 letras', tr:'4 haneli kod girin', ru:'Введите 4-значный код', zh:'输入4位房间代码', ja:'4桁のコードを入力' },

    // 상점
    '상점': { en:'Shop', es:'Tienda', tr:'Dükkan', ru:'Магазин', zh:'商店', ja:'ショップ' },
    '닉네임': { en:'Nickname', es:'Apodo', tr:'Takma Ad', ru:'Никнейм', zh:'昵称', ja:'ニックネーム' },
    '프로필 카드': { en:'Profile Cards', es:'Tarjetas de Perfil', tr:'Profil Kartları', ru:'Карточки', zh:'个人卡片', ja:'プロフィールカード' },
    '말풍선': { en:'Chat Bubbles', es:'Burbujas de Chat', tr:'Sohbet Balonları', ru:'Пузыри Чата', zh:'聊天气泡', ja:'吹き出し' },
    '테두리': { en:'Avatar Frames', es:'Marcos de Avatar', tr:'Çerçeveler', ru:'Рамки', zh:'头像框', ja:'フレーム' },
    '세레머니': { en:'Victory FX', es:'Efectos de Victoria', tr:'Zafer Efektleri', ru:'Эффекты Победы', zh:'胜利特效', ja:'セレモニー' },
    '구매': { en:'Buy', es:'Comprar', tr:'Satın Al', ru:'Купить', zh:'购买', ja:'購入' },
    '장착': { en:'Equip', es:'Equipar', tr:'Kuşan', ru:'Надеть', zh:'装备', ja:'装着' },
    '장착 중': { en:'Equipped', es:'Equipado', tr:'Kuşanıldı', ru:'Надето', zh:'已装备', ja:'装着中' },
    '방 목록으로 돌아가기': { en:'Back to Rooms', es:'Volver a Salas', tr:'Odalara Dön', ru:'Назад к комнатам', zh:'返回房间列表', ja:'部屋一覧に戻る' },

    // 프로필 & 계정 모달
    '프로필 편집': { en:'Edit Profile', es:'Editar Perfil', tr:'Profili Düzenle', ru:'Изменить Профиль', zh:'编辑个人资料', ja:'プロフィール編集' },
    '게스트 모드': { en:'Guest Mode', es:'Modo Invitado', tr:'Misafir Modu', ru:'Гостевой Режим', zh:'访客模式', ja:'ゲストモード' },
    '클라우드 로그인': { en:'Cloud Login', es:'Iniciar Sesión', tr:'Giriş Yap', ru:'Войти в Облако', zh:'云端登录', ja:'クラウドログイン' },
    '동물 아이콘': { en:'Avatar Icon', es:'Icono de Avatar', tr:'Profil İkonu', ru:'Иконка', zh:'动物图标', ja:'動物アイコン' },
    '배경 색상': { en:'Background Color', es:'Color de Fondo', tr:'Arka Plan Rengi', ru:'Цвет Фона', zh:'背景颜色', ja:'背景色' },
    '가치아케이드 로그인': { en:'GachiArcade Login', es:'Inicio de Sesión', tr:'GachiArcade Giriş', ru:'Вход в GachiArcade', zh:'Gachi街机登录', ja:'ガチアーケードログイン' },
    'Google 계정으로 계속': { en:'Continue with Google', es:'Continuar con Google', tr:'Google ile Devam Et', ru:'Продолжить с Google', zh:'使用Google继续', ja:'Googleでログイン' },

    // 전적 모달
    '게임별 상세 전적': { en:'Detailed Game Stats', es:'Estadísticas por Juego', tr:'Oyun İstatistikleri', ru:'Статистика по Играм', zh:'按游戏统计', ja:'ゲーム別戦績' },
    '총 판수': { en:'Total Plays', es:'Partidas Totales', tr:'Toplam Oyun', ru:'Всего Игр', zh:'总局数', ja:'総試合数' },
    '승리': { en:'Wins', es:'Victorias', tr:'Galibiyet', ru:'Победы', zh:'胜利', ja:'勝利' },
    '패배': { en:'Losses', es:'Derrotas', tr:'Mağlubiyet', ru:'Поражения', zh:'失败', ja:'敗北' },
    '무승부': { en:'Draws', es:'Empates', tr:'Beraberlik', ru:'Ничьи', zh:'平局', ja:'引き分け' },
    '승률': { en:'Win Rate', es:'Tasa de Victorias', tr:'Kazanma Oranı', ru:'Винрейт', zh:'胜率', ja:'勝率' },
    '친구 신청': { en:'Add Friend', es:'Agregar Amigo', tr:'Arkadaş Ekle', ru:'В Друзья', zh:'添加好友', ja:'フレンド申請' },

    // 친구 관리 모달
    '친구 관리': { en:'Friends Management', es:'Gestión de Amigos', tr:'Arkadaş Yönetimi', ru:'Управление Друзьями', zh:'好友管理', ja:'フレンド管理' },
    '내 친구': { en:'My Friends', es:'Mis Amigos', tr:'Arkadaşlarım', ru:'Мои Друзья', zh:'我的好友', ja:'マイフレンド' },
    '받은 신청': { en:'Requests', es:'Solicitudes', tr:'İstekler', ru:'Заявки', zh:'收到的申请', ja:'届いた申請' },
    '친구 닉네임 검색...': { en:'Search nickname...', es:'Buscar apodo...', tr:'Takma ad ara...', ru:'Поиск по никнейму...', zh:'搜索好友昵称...', ja:'フレンド検索...' },
    '검색어 지우기': { en:'Clear', es:'Limpiar', tr:'Temizle', ru:'Очистить', zh:'清空', ja:'クリア' },

    // 방 내부 (Screen Room)
    '로비로 나가기': { en:'Exit to Lobby', es:'Salir al Lobby', tr:'Lobiye Dön', ru:'В Лобби', zh:'返回大厅', ja:'ロビーに戻る' },
    '방 코드 복사': { en:'Copy Code', es:'Copiar Código', tr:'Kodu Kopyala', ru:'Скопировать Код', zh:'复制房间号', ja:'コードをコピー' },
    '클릭하여 방 코드 복사': { en:'Click to copy room code', es:'Haz clic para copiar código', tr:'Kopyalamak için tıkla', ru:'Нажмите, чтобы скопировать', zh:'点击复制房间号', ja:'クリックしてコピー' },
    '친구 초대하기': { en:'Invite Friends', es:'Invitar Amigos', tr:'Arkadaş Davet Et', ru:'Пригласить Друзей', zh:'邀请好友', ja:'フレンドを招待' },
    '참가자 목록': { en:'Players List', es:'Lista de Jugadores', tr:'Oyuncu Listesi', ru:'Список Игроков', zh:'玩家列表', ja:'参加者一覧' },
    '게임 선택': { en:'Select Game', es:'Elegir Juego', tr:'Oyun Seç', ru:'Выбор Игры', zh:'选择游戏', ja:'ゲーム選択' },
    '방장만 변경 가능': { en:'Host only', es:'Solo Anfitrión', tr:'Sadece Kurucu', ru:'Только Хост', zh:'仅房主可更改', ja:'ホストのみ変更可能' },
    '진영:': { en:'Side:', es:'Bando:', tr:'Taraf:', ru:'Сторона:', zh:'阵营:', ja:'陣営:' },
    '셔플': { en:'Shuffle', es:'Aleatorio', tr:'Karıştır', ru:'Случайно', zh:'随机', ja:'シャッフル' },
    '방장 흑': { en:'Host Black', es:'Anfitrión Negras', tr:'Kurucu Siyah', ru:'Хост Чёрные', zh:'房主执黑', ja:'ホスト先手(黒)' },
    '방장 백': { en:'Host White', es:'Anfitrión Blancas', tr:'Kurucu Beyaz', ru:'Хост Белые', zh:'房主执白', ja:'ホスト後手(白)' },
    '라운드:': { en:'Rounds:', es:'Rondas:', tr:'Raund:', ru:'Раунды:', zh:'局数:', ja:'ラウンド:' },

    // 일반 액션 & 팝업
    '취소': { en:'Cancel', es:'Cancelar', tr:'İptal', ru:'Отмена', zh:'取消', ja:'キャンセル' },
    '저장': { en:'Save', es:'Guardar', tr:'Kaydet', ru:'Сохранить', zh:'保存', ja:'保存' },
    '확인': { en:'Confirm', es:'Confirmar', tr:'Onayla', ru:'ОК', zh:'确定', ja:'確認' },
    '수락': { en:'Accept', es:'Aceptar', tr:'Kabul Et', ru:'Принять', zh:'接受', ja:'承認' },
    '거절': { en:'Decline', es:'Rechazar', tr:'Reddet', ru:'Отклонить', zh:'拒绝', ja:'拒否' },
    '입장': { en:'Join', es:'Entrar', tr:'Giriş', ru:'Войти', zh:'进入', ja:'入場' },
    '강퇴하기': { en:'Kick', es:'Expulsar', tr:'At', ru:'Выгнать', zh:'踢出', ja:'追放' },
    '방장 위임': { en:'Pass Host', es:'Ceder Anfitrión', tr:'Devret', ru:'Передать хоста', zh:'移交房主', ja:'ホスト委任' },
    '전적 보기': { en:'View Stats', es:'Ver Récord', tr:'İstatistikler', ru:'Статистика', zh:'查看战绩', ja:'戦績を見る' },
    '연결 중...': { en:'Connecting...', es:'Conectando...', tr:'Bağlanıyor...', ru:'Подключение...', zh:'连接中...', ja:'接続中...' },
    '연결 취소': { en:'Cancel Connection', es:'Cancelar Conexión', tr:'İptal Et', ru:'Отменить', zh:'取消连接', ja:'接続キャンセル' },
    '잠시 후 게임이 시작됩니다!': { en:'Game starting soon!', es:'¡El juego comenzará pronto!', tr:'Oyun birazdan başlıyor!', ru:'Игра скоро начнется!', zh:'游戏即将开始！', ja:'まもなくゲームが始まります！' },
    '골인!': { en:'Goal!', es:'¡Meta!', tr:'Gol!', ru:'Финиш!', zh:'到达终点！', ja:'ゴール！' },
    '윷 던지기': { en:'Cast Sticks', es:'Lanzar Varillas', tr:'Zar At', ru:'Бросить Палочки', zh:'掷木', ja:'ユッを投げる' }
  };

  /* ─────────────────────────────────────────────────────────
     엔진 초기화 & 이벤트 동기화
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

  function t(keyOrText, params, lang) {
    if (!keyOrText || typeof keyOrText !== 'string') return keyOrText;
    const l = lang || _currentLang;
    const trimmed = keyOrText.trim();

    let result = null;

    if (DICT[trimmed] && DICT[trimmed][l]) {
      result = DICT[trimmed][l];
    } else if (RAW_TEXT_MAP[trimmed] && RAW_TEXT_MAP[trimmed][l]) {
      result = RAW_TEXT_MAP[trimmed][l];
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

    if (!result) {
      if (l === 'ko') return keyOrText;
      result = trimmed;
    }

    if (params && typeof params === 'object') {
      Object.keys(params).forEach(pKey => {
        const regex = new RegExp(`\\{${pKey}\\}`, 'g');
        result = result.replace(regex, params[pKey]);
      });
    }

    const leading = keyOrText.match(/^\s*/)[0];
    const trailing = keyOrText.match(/\s*$/)[0];
    return leading + result + trailing;
  }

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

  function setLanguage(code) {
    if (!LANGUAGES.find(l => l.code === code)) return;
    _currentLang = code;
    localStorage.setItem(STORAGE_KEY, code);

    _applyToDocument();
    _syncHeaderDropdown();

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

    // 1. data-i18n 속성 번역
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key, null, lang);
    });

    // 2. 전체 DOM TextNode 자동 탐색 및 변환
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

    // 3. title, placeholder 속성 번역
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
