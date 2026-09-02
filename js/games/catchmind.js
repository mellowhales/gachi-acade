/**
 * catchmind.js - 캐치마인드 (고성능 Stroke 벡터 기반 그림판 & 실시간 P2P 퀴즈 배틀)
 * - Stroke (선 획) 벡터 데이터 구조로 Undo (Ctrl+Z) / Redo (Ctrl+Y) 완벽 지원
 * - 쓰레기통(전체 지우기) 클릭 시 모든 참가자 100% 실시간 하얀 도화지 동기화
 * - 3분(180초) 타이머 & 1분(맨뒤)/30초(맨앞) 순수 언더바 초성 힌트
 * - 약간 어렵고 센스 있는 300+ 단어장 수록
 * - 마지막 라운드 종료 시 카운트다운 없이 즉시 점수 집계
 */
const CatchmindGame = (() => {
  'use strict';

  /* ─── 제시어 풀 (동물, 사물, 음식, 직업, 영화, 명작 합성어 등 760+ 대규모 단어장) ─── */
  const WORD_POOL = [
  "호랑이",
  "사자",
  "코끼리",
  "기린",
  "얼룩말",
  "하마",
  "코뿔소",
  "표범",
  "치타",
  "늑대",
  "여우",
  "북극곰",
  "판다",
  "원숭이",
  "고릴라",
  "침팬지",
  "토끼",
  "다람쥐",
  "햄스터",
  "고슴도치",
  "두더지",
  "고양이",
  "강아지",
  "송아지",
  "소",
  "말",
  "돼지",
  "양",
  "염소",
  "닭",
  "병아리",
  "오리",
  "거위",
  "칠면조",
  "독수리",
  "올빼미",
  "부엉이",
  "참새",
  "비둘기",
  "까마귀",
  "까치",
  "제비",
  "타조",
  "펭귄",
  "갈매기",
  "앵무새",
  "학",
  "두루미",
  "악어",
  "거북이",
  "자라",
  "개구리",
  "두꺼비",
  "맹꽁이",
  "올챙이",
  "뱀",
  "아나콘다",
  "도마뱀",
  "카멜레온",
  "이구아나",
  "고래",
  "상어",
  "돌고래",
  "범고래",
  "물개",
  "바다표범",
  "해달",
  "수달",
  "비버",
  "오징어",
  "문어",
  "낙지",
  "주꾸미",
  "꼴뚜기",
  "꽃게",
  "새우",
  "바닷가재",
  "해파리",
  "조개",
  "굴",
  "전복",
  "소라",
  "불가사리",
  "해삼",
  "멍게",
  "금붕어",
  "가오리",
  "해마",
  "메기",
  "미꾸라지",
  "연어",
  "참치",
  "장어",
  "고등어",
  "갈치",
  "멸치",
  "달팽이",
  "지렁이",
  "거미",
  "전갈",
  "잠자리",
  "매미",
  "나비",
  "나방",
  "꿀벌",
  "말벌",
  "개미",
  "무당벌레",
  "귀뚜라미",
  "메뚜기",
  "사마귀",
  "장수풍뎅이",
  "사슴벌레",
  "나무늘보",
  "알파카",
  "카피바라",
  "사막여우",
  "플라밍고",
  "귀상어",
  "투구게",
  "반딧불이",
  "하늘다람쥐",
  "오리너구리",
  "아르마딜로",
  "코알라",
  "캥거루",
  "사과",
  "바나나",
  "수박",
  "딸기",
  "포도",
  "복숭아",
  "파인애플",
  "오렌지",
  "귤",
  "레몬",
  "감",
  "배",
  "자두",
  "체리",
  "망고",
  "키위",
  "토마토",
  "당근",
  "오이",
  "호박",
  "옥수수",
  "감자",
  "고구마",
  "양파",
  "마늘",
  "버섯",
  "고추",
  "파",
  "배추",
  "무",
  "피자",
  "햄버거",
  "샌드위치",
  "핫도그",
  "치킨",
  "통닭",
  "감자튀김",
  "자장면",
  "짬뽕",
  "탕수육",
  "군만두",
  "물만두",
  "김밥",
  "떡볶이",
  "순대",
  "어묵",
  "라면",
  "비빔밥",
  "불고기",
  "갈비",
  "삼겹살",
  "된장찌개",
  "김치찌개",
  "순두부찌개",
  "청국장",
  "미역국",
  "갈비탕",
  "설렁탕",
  "삼계탕",
  "냉면",
  "비빔냉면",
  "칼국수",
  "수제비",
  "초밥",
  "돈가스",
  "카레",
  "오므라이스",
  "스테이크",
  "스파게티",
  "파스타",
  "케이크",
  "아이스크림",
  "도넛",
  "와플",
  "팬케이크",
  "마카롱",
  "쿠키",
  "초콜릿",
  "사탕",
  "젤리",
  "팝콘",
  "붕어빵",
  "호떡",
  "군고구마",
  "호빵",
  "찐빵",
  "계란빵",
  "솜사탕",
  "빙수",
  "팥빙수",
  "약과",
  "식혜",
  "수정과",
  "두바이초콜릿",
  "요아정",
  "마라탕",
  "탕후루",
  "크로플",
  "소금빵",
  "베이글",
  "오마카세",
  "회오리감자",
  "타코야키",
  "까르보나라",
  "부리토",
  "수플레팬케이크",
  "퐁듀",
  "팟타이",
  "월남쌈",
  "샤브샤브",
  "감바스",
  "라따뚜이",
  "똠얌꿍",
  "딤섬",
  "탄탄멘",
  "스마트폰",
  "노트북",
  "컴퓨터",
  "모니터",
  "키보드",
  "마우스",
  "이어폰",
  "헤드폰",
  "스피커",
  "텔레비전",
  "냉장고",
  "세탁기",
  "전자레인지",
  "에어컨",
  "선풍기",
  "청소기",
  "로봇청소기",
  "헤어드라이어",
  "다리미",
  "토스터기",
  "전기밥솥",
  "정수기",
  "공기청정기",
  "가습기",
  "카메라",
  "시계",
  "손목시계",
  "벽시계",
  "알람시계",
  "모래시계",
  "손전등",
  "램프",
  "양초",
  "성냥",
  "라이터",
  "우산",
  "양산",
  "비옷",
  "장화",
  "운동화",
  "구두",
  "슬리퍼",
  "양말",
  "장갑",
  "목도리",
  "모자",
  "선글라스",
  "안경",
  "돋보기",
  "망원경",
  "현미경",
  "거울",
  "빗",
  "칫솔",
  "치약",
  "비누",
  "샴푸",
  "수건",
  "휴지",
  "물티슈",
  "가위",
  "칼",
  "커터칼",
  "풀",
  "테이프",
  "자",
  "지우개",
  "연필",
  "볼펜",
  "만년필",
  "형광펜",
  "크레파스",
  "물감",
  "붓",
  "도화지",
  "공책",
  "책",
  "사전",
  "신문",
  "잡지",
  "편지",
  "우표",
  "봉투",
  "가방",
  "배낭",
  "지갑",
  "열쇠",
  "자물쇠",
  "액자",
  "달력",
  "우체통",
  "쓰레기통",
  "소화기",
  "의자",
  "책상",
  "침대",
  "소파",
  "옷장",
  "서랍장",
  "신발장",
  "식탁",
  "싱크대",
  "가스레인지",
  "냄비",
  "후라이팬",
  "주전자",
  "컵",
  "머그컵",
  "유리잔",
  "텀블러",
  "접시",
  "그릇",
  "숟가락",
  "젓가락",
  "포크",
  "나이프",
  "도마",
  "국자",
  "뒤집개",
  "집게",
  "병따개",
  "와인오프너",
  "체온계",
  "반창고",
  "붕대",
  "주사기",
  "마스크",
  "휠체어",
  "목발",
  "애플워치",
  "에어팟",
  "닌텐도스위치",
  "플레이스테이션",
  "드론",
  "전동킥보드",
  "자전거",
  "오토바이",
  "스쿠터",
  "킥보드",
  "스케이트보드",
  "인라인스케이트",
  "자동차",
  "전기차",
  "택시",
  "버스",
  "트럭",
  "경찰차",
  "구급차",
  "소방차",
  "포크레인",
  "불도저",
  "레미콘",
  "트랙터",
  "기차",
  "지하철",
  "KTX",
  "비행기",
  "헬리콥터",
  "열기구",
  "패러글라이딩",
  "우주선",
  "로켓",
  "인공위성",
  "우주정거장",
  "요트",
  "보트",
  "카누",
  "잠수함",
  "유람선",
  "항공모함",
  "케이블카",
  "마차",
  "인력거",
  "모노레일",
  "짚라인",
  "축구",
  "야구",
  "농구",
  "배구",
  "테니스",
  "탁구",
  "배드민턴",
  "골프",
  "볼링",
  "당구",
  "수영",
  "달리기",
  "마라톤",
  "양궁",
  "사격",
  "태권도",
  "유도",
  "복싱",
  "레슬링",
  "씨름",
  "펜싱",
  "승마",
  "피겨스케이팅",
  "스피드스케이팅",
  "쇼트트랙",
  "봅슬레이",
  "컬링",
  "암벽등반",
  "스케이트",
  "스키",
  "스노보드",
  "썰매",
  "줄넘기",
  "피아노",
  "바이올린",
  "첼로",
  "기타",
  "일렉기타",
  "베이스",
  "드럼",
  "플루트",
  "클라리넷",
  "트럼펫",
  "색소폰",
  "하모니카",
  "탬버린",
  "실로폰",
  "하프",
  "아코디언",
  "장구",
  "북",
  "꽹과리",
  "오케스트라",
  "디제잉",
  "비보잉",
  "판토마임",
  "마술쇼",
  "서커스",
  "번지점프",
  "스카이다이빙",
  "스노클링",
  "서핑",
  "의사",
  "간호사",
  "경찰관",
  "소방관",
  "선생님",
  "요리사",
  "제빵사",
  "화가",
  "가수",
  "배우",
  "댄서",
  "판사",
  "변호사",
  "검사",
  "군인",
  "선장",
  "조종사",
  "승무원",
  "우주비행사",
  "농부",
  "어부",
  "목수",
  "미용사",
  "마술사",
  "철학자",
  "소크라테스",
  "대통령",
  "국회의원",
  "독재자",
  "인어공주",
  "병원",
  "약국",
  "은행",
  "우체국",
  "도서관",
  "박물관",
  "미술관",
  "놀이공원",
  "동물원",
  "식물원",
  "수족관",
  "영화관",
  "공항",
  "기차역",
  "지하철역",
  "놀이터",
  "수영장",
  "사우나",
  "미용실",
  "주유소",
  "소방서",
  "경찰서",
  "방탈출카페",
  "보드게임카페",
  "코인노래방",
  "인생네컷",
  "팝업스토어",
  "캠핑장",
  "루프탑",
  "편의점",
  "산",
  "바다",
  "강",
  "호수",
  "폭포",
  "계곡",
  "동굴",
  "사막",
  "섬",
  "화산",
  "무지개",
  "번개",
  "천둥",
  "태풍",
  "토네이도",
  "용오름",
  "간헐천",
  "신기루",
  "눈사람",
  "보름달",
  "초승달",
  "태양계",
  "은하수",
  "북극성",
  "오로라",
  "별똥별",
  "블랙홀",
  "웜홀",
  "지구",
  "달",
  "화성",
  "목성",
  "토성",
  "에펠탑",
  "피사의사탑",
  "자유의여신상",
  "피라미드",
  "스핑크스",
  "콜로세움",
  "만리장성",
  "남산서울타워",
  "나이아가라폭포",
  "그랜드캐니언",
  "베르사유궁전",
  "타지마할",
  "거북선",
  "측우기",
  "총각김치",
  "고추장",
  "바다코끼리",
  "물귀신",
  "도둑고양이",
  "도토리묵",
  "고추잠자리",
  "쥐구멍",
  "달걀귀신",
  "바람둥이",
  "거짓말탐지기",
  "전기뱀장어",
  "파리지옥",
  "해바라기",
  "오리발",
  "개나리",
  "식인종",
  "구두쇠",
  "새우잠",
  "주마등",
  "도깨비방망이",
  "배꼽시계",
  "달팽이관",
  "가시방석",
  "눈칫밥",
  "눈물바다",
  "모나리자",
  "오리무중",
  "독수리타법",
  "돌잔치",
  "카레이서",
  "인사돌",
  "세차장",
  "우거지",
  "핵가족",
  "배낭여행",
  "갑오징어",
  "싸움닭",
  "김밥천국",
  "카카오나무",
  "공중전화",
  "연장전",
  "소설가",
  "골목식당",
  "피시방",
  "가로수",
  "신사숙녀",
  "백지장",
  "식은죽먹기",
  "소나무",
  "말꼬리",
  "사자성어",
  "비행청소년",
  "눈치코치",
  "하룻강아지",
  "우물안개구리",
  "가자미눈",
  "오지랖",
  "도토리키재기",
  "발등에불",
  "삼국시대",
  "바이오리듬",
  "유인원",
  "도마뱀꼬리자르기",
  "배째라",
  "새발의피",
  "시치미떼기",
  "안절부절",
  "폭풍전야",
  "나비효과",
  "머피의법칙",
  "마음의소리",
  "가위바위보",
  "도미노현상",
  "다이어트실패",
  "유체이탈",
  "몽유병",
  "가위눌림",
  "불면증",
  "첫사랑",
  "짝사랑",
  "데자뷔",
  "멘탈붕괴",
  "동공지진",
  "새벽감성",
  "이불킥",
  "작심삼일",
  "배터리일프로",
  "오픈런",
  "수강신청",
  "피켓팅",
  "정전",
  "보이스피싱",
  "층간소음",
  "지옥철",
  "칼퇴근",
  "야근",
  "월요병",
  "스파이더맨",
  "인터스텔라",
  "아바타",
  "해리포터",
  "반지의제왕",
  "스타워즈",
  "타이타닉",
  "어벤져스",
  "아이언맨",
  "토르",
  "헐크",
  "캡틴아메리카",
  "인셉션",
  "매트릭스",
  "기생충",
  "오징어게임",
  "쥬라기공원",
  "탑건",
  "라라랜드",
  "위대한쇼맨",
  "겨울왕국",
  "토이스토리",
  "센과치히로",
  "하울의움직이는성",
  "너의이름은",
  "슬램덩크",
  "귀멸의칼날",
  "원피스",
  "포켓몬스터",
  "짱구는못말려",
  "명탐정코난",
  "주토피아",
  "인사이드아웃",
  "슈퍼마리오",
  "듄",
  "미션임파서블",
  "글래디에이터",
  "캐리비안의해적",
  "트랜스포머",
  "킹스맨",
  "닥터스트레인지",
  "타노스",
  "데드풀",
  "울버린",
  "조커",
  "배트맨",
  "슈퍼맨",
  "쇼생크탈출",
  "레옹",
  "샤이닝",
  "올드보이",
  "캐스트어웨이",
  "신과함께",
  "명량",
  "괴물",
  "라이온킹",
  "알라딘",
  "오디세이",
  "매드맥스",
  "슈렉",
  "마다가스카",
  "쿵푸팬더",
  "월E",
  "코코",
  "오버워치",
  "카트라이더",
  "마인크래프트",
  "리그오브레전드",
  "배틀그라운드",
  "포트나이트",
  "스타크래프트",
  "던전앤파이터",
  "리니지",
  "메이플스토리",
  "월드오브워크래프트",
  "하스스톤",
  "디아블로",
  "사이버펑크"
];

  const PALETTE_COLORS = [
    // 1행: 무채색 & 스킨톤 & 핑크/레드 계열 (10색)
    '#000000', '#4a5568', '#718096', '#cbd5e1', '#ffffff',
    '#fed7aa', '#fbcfe8', '#ed64a6', '#e53e3e', '#991b1b',

    // 2행: 주황/노랑/초록/파랑/보라/갈색 계열 (10색)
    '#ed8936', '#ecc94b', '#84cc16', '#48bb78', '#15803d',
    '#38bdf8', '#4299e1', '#1e3a8a', '#9f7aea', '#795548'
  ];

  /* ─── 🎲 제시어 덱 & 중복 방지 시스템 (모든 단어가 고르게 출제되고 최근 단어 중복 배제) ─── */
  const RECENT_HISTORY_KEY = 'cm_recent_words_v2';
  let _wordDeck = [];
  let _usedWordsHistory = new Set();

  try {
    const saved = sessionStorage.getItem(RECENT_HISTORY_KEY);
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) {
        _usedWordsHistory = new Set(arr);
      }
    }
  } catch (_) {}

  function _saveUsedHistory() {
    try {
      const arr = Array.from(_usedWordsHistory).slice(-250);
      sessionStorage.setItem(RECENT_HISTORY_KEY, JSON.stringify(arr));
    } catch (_) {}
  }

  function _shuffleDeck(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  function _pickNextWord() {
    // 덱에 단어가 남아있지 않으면 최근 기록을 제외하고 덱 새로 생성
    if (!_wordDeck || _wordDeck.length === 0) {
      let candidates = WORD_POOL.filter(w => !_usedWordsHistory.has(w));
      if (candidates.length < Math.max(20, Math.floor(WORD_POOL.length * 0.15))) {
        _usedWordsHistory.clear();
        candidates = [...WORD_POOL];
      }
      _wordDeck = _shuffleDeck(candidates);
    }

    const word = _wordDeck.pop() || WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
    _usedWordsHistory.add(word);
    _saveUsedHistory();
    return word;
  }

  // ⏱️ 그리는 시간: 3분 (180초)
  const ROUND_TIME = 180;

  // 🔤 한글 초성 추출 목록
  const CHOSUNG_LIST = [
    'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
  ];

  function _getChosung(char) {
    if (!char) return '＿';
    const code = char.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return char;
    const choIdx = Math.floor(code / 588);
    return CHOSUNG_LIST[choIdx] || char;
  }

  function _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  let _container = null;
  let _onResult  = null;
  let _context   = null;

  let isHost     = false;
  let myId       = '';
  let players    = [];

  let round      = 1;
  let totalRounds= 3;
  let drawerIdx  = 0;
  let currentWord= '';
  let wordLength = 0;
  let timeLeft   = ROUND_TIME;
  let scores     = {};
  let solvedPlayers = new Set();
  let isGameOver = false;

  let canvas = null;
  let ctx    = null;
  let isDrawing = false;
  let currentColor = '#000000';
  let currentBrushSize = 6;
  let isEraser = false;
  let isBucket = false;

  // 🌟 고성능 Stroke 벡터 데이터 구조 (Undo / Redo / Clear 완벽 지원)
  let strokes = [];    // 현재 캔버스에 그려진 모든 선 배열
  let redoStack = [];  // 되돌리기로 취소된 선 스택
  let activeStroke = null; // 현재 실시간으로 그리고 있는 선

  let hostTimerInterval    = null;
  let countdownInterval    = null;
  let nextRoundTimeout     = null;
  let isDrawingLocked      = false;
  let isTransitioningRound = false;
  let lastCursorSendTime   = 0;

  /* ═══════════════════════════════════════════════════════════════
     초기화 & DOM 빌드
     ═══════════════════════════════════════════════════════════════ */
  function init(container, onResult, context) {
    _container = container;
    _onResult  = onResult;
    _context   = context || {};

    isHost  = P2P.isHost();
    myId    = String(P2P.getMyId() || '');
    players = (_context.players && _context.players.length > 0)
      ? _context.players
      : [{ id: myId, name: _context.myNickname || '호스트', isHost: true }];

    round       = 1;
    totalRounds = (_context && typeof _context.targetRounds === 'number') ? Math.max(1, Math.min(8, _context.targetRounds)) : 3;
    drawerIdx   = 0;
    scores      = {};
    players.forEach(p => { scores[p.id] = 0; });
    solvedPlayers.clear();
    isGameOver  = false;
    isDrawingLocked = false;
    isTransitioningRound = false;

    strokes = [];
    redoStack = [];
    activeStroke = null;

    _buildLayout();
    P2P.onMessage(_onMessage);

    window.addEventListener('keydown', _handleGlobalKeyDown);
    _updateSidebarRoles();

    if (isHost) {
      setTimeout(() => { _hostStartRound(); }, 300);
    }
  }

  function _buildLayout() {
    _container.innerHTML = `
      <div class="catchmind-wrap" style="position:relative;">
        <!-- 최상위 3 2 1 카운트다운 오버레이 -->
        <div id="cm-countdown-overlay" style="
          display:none; position:absolute; inset:0;
          background:rgba(15, 23, 42, 0.75); border-radius:16px;
          align-items:center; justify-content:center; flex-direction:column; gap:16px;
          z-index:99999 !important; backdrop-filter:blur(4px); pointer-events:auto;
        ">
          <div id="cm-countdown-number" style="
            font-size:8rem; font-weight:900; color:#ffffff;
            text-shadow:0 6px 30px rgba(0,0,0,0.8);
            font-variant-numeric:tabular-nums; line-height:1;
            animation: cmPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          ">3</div>
          <div id="cm-countdown-label" style="
            font-size:1.3rem; font-weight:800; color:#cbd5e1;
            letter-spacing:1px;
          ">다음 라운드 준비 중...</div>
        </div>

        <div class="cm-header-card card">
          <div class="cm-meta-row">
            <span class="cm-round-badge" id="cm-round-badge">Round ${round}/${totalRounds}</span>
            <div class="cm-drawer-badge">
              <i class="fa-solid fa-palette"></i>
              <span id="cm-drawer-name">출제자 준비 중...</span>
            </div>
            <div class="cm-timer-badge" id="cm-timer-badge">
              <i class="fa-solid fa-stopwatch"></i>
              <span id="cm-timer-text">180</span>초
            </div>
          </div>

          <!-- 🌟 직관적인 실시간 타이머 게이지 바 -->
          <div class="cm-timer-gauge-wrap">
            <div class="cm-timer-gauge-track">
              <div class="cm-timer-gauge-fill" id="cm-timer-gauge-fill" style="width: 100%;"></div>
            </div>
          </div>

          <div class="cm-word-banner">
            <div class="cm-word-title" id="cm-word-title">게임 준비 중...</div>
            <div class="cm-word-desc"  id="cm-word-desc">잠시만 기다려 주세요.</div>
          </div>
        </div>

        <div class="cm-canvas-card card">
          <div class="cm-toolbar" id="cm-toolbar">
            <div class="cm-palette-group">
              ${PALETTE_COLORS.map((c,i)=>`
                <button type="button" class="cm-color-chip ${i===0?'active':''}" style="background:${c};" data-color="${c}"></button>
              `).join('')}
            </div>
            <div class="cm-tool-divider"></div>
            <div class="cm-size-group">
              <button type="button" class="cm-size-btn" data-size="3" title="얇게"><span class="dot-sm"></span></button>
              <button type="button" class="cm-size-btn active" data-size="6" title="보통"><span class="dot-md"></span></button>
              <button type="button" class="cm-size-btn" data-size="14" title="굵게"><span class="dot-lg"></span></button>
            </div>
            <div class="cm-tool-divider"></div>
            <div class="cm-action-group">
              <button type="button" class="cm-tool-btn" id="cm-btn-bucket" title="페인트 붓기 (영역 채우기)">
                <i class="fa-solid fa-fill-drip"></i>
              </button>
              <button type="button" class="cm-tool-btn" id="cm-btn-eraser" title="지우개">
                <i class="fa-solid fa-eraser"></i>
              </button>
              <button type="button" class="cm-tool-btn" id="cm-btn-undo" title="되돌리기 (Ctrl+Z)">
                <i class="fa-solid fa-rotate-left"></i>
              </button>
              <button type="button" class="cm-tool-btn" id="cm-btn-redo" title="다시 실행 (Ctrl+Y)">
                <i class="fa-solid fa-rotate-right"></i>
              </button>
              <button type="button" class="cm-tool-btn" id="cm-btn-clear" title="전체 지우기 (새 도화지)">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>

          <div class="cm-canvas-container" id="cm-canvas-container">
            <canvas id="cm-canvas" width="800" height="500"></canvas>

            <!-- 🖌️ 출제자 & 참가자 공용 실시간 붓 커서 레이어 -->
            <div id="cm-brush-cursor" class="cm-brush-cursor hidden">
              <svg viewBox="0 0 36 36" width="34" height="34" class="cm-brush-svg">
                <defs>
                  <filter id="cm-brush-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.4)" />
                  </filter>
                </defs>
                <g filter="url(#cm-brush-shadow)">
                  <!-- Wooden Brush Handle -->
                  <path d="M32 4 C33 3, 35 5, 34 6 L21 19 L17 15 Z" fill="#8d6e63" stroke="#4e342e" stroke-width="1" />
                  <path d="M29 7 L19 17" stroke="#a1887f" stroke-width="0.8" />
                  <!-- Metal Ferrule -->
                  <path d="M21 19 L17 15 L13 19 L17 23 Z" fill="#cfd8dc" stroke="#78909c" stroke-width="0.9" />
                  <!-- Brush Bristle Tip (Dynamic Paint Color) -->
                  <path id="cm-brush-tip" class="cm-brush-tip" d="M13 19 L17 23 C14 27, 5 33, 2 33 C2 30, 7 22, 13 19 Z" fill="#000000" stroke="#37474f" stroke-width="0.9" />
                  <path d="M12 22 C9 26, 5 30, 3 32" stroke="rgba(255,255,255,0.45)" stroke-width="0.8" fill="none" />
                </g>
              </svg>
              <div id="cm-brush-tag" class="cm-brush-tag" style="display:none;">
                <i class="fa-solid fa-paintbrush" style="font-size:0.65rem;"></i>
                <span id="cm-brush-tag-text">출제자</span>
              </div>
            </div>
          </div>
        </div>

        <div class="cm-guess-bar card" id="cm-guess-bar">
          <input type="text" id="cm-guess-input" class="cm-guess-input"
            placeholder="정답을 입력하세요! (Enter)" maxlength="20" autocomplete="off" />
          <button type="button" class="btn btn-primary" id="cm-btn-submit">
            <i class="fa-solid fa-paper-plane"></i>
            <span>제출</span>
          </button>
          <div class="cm-guess-solved-msg hidden" id="cm-guess-solved-msg">
            <i class="fa-solid fa-circle-check"></i>
            <span><i class="fa-solid fa-circle-check" style="color:var(--green);"></i> 정답을 맞혔습니다! 다른 플레이어를 기다리는 중...</span>
          </div>
        </div>
      </div>
    `;

    _initCanvas();
    _bindToolbarEvents();
    _bindGuessEvents();
  }

  /* ═══════════════════════════════════════════════════════════════
     고성능 Stroke 벡터 캔버스 렌더링 & Undo/Redo 엔진
     ═══════════════════════════════════════════════════════════════ */
  function _initCanvas() {
    canvas = document.getElementById('cm-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    _redrawCanvas();

    canvas.addEventListener('mousedown', _onPointerDown);
    window.addEventListener('mousemove', _onPointerMove);
    window.addEventListener('mouseup', _onPointerUp);
    
    // 🖌️ 출제자 마우스 호버 위치 실시간 감지 & 붓 커서 연동
    canvas.addEventListener('mousemove', _onCanvasHoverMove);
    canvas.addEventListener('mouseenter', _onCanvasMouseEnter);
    canvas.addEventListener('mouseleave', _onCanvasMouseLeave);

    canvas.addEventListener('touchstart', _onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  _onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   _onTouchEnd);
    canvas.addEventListener('touchcancel', _onCanvasMouseLeave);
  }

  /* ── 🖌️ 실시간 붓 커서 제어 (로컬 출제자 & 원격 참가자) ── */
  function _updateLocalBrushCursor(pos) {
    const container = document.getElementById('cm-canvas-container');
    const cursorEl  = document.getElementById('cm-brush-cursor');
    const tipEl     = document.getElementById('cm-brush-tip');
    const tagEl     = document.getElementById('cm-brush-tag');
    if (!container || !cursorEl) return;

    const rect = container.getBoundingClientRect();
    const px = pos.x * rect.width;
    const py = pos.y * rect.height;

    // 붓 끝(SVG (2, 33))이 마우스 좌표에 정확히 일치하도록 translate
    cursorEl.style.transform = `translate(${px - 2}px, ${py - 33}px)`;
    cursorEl.classList.remove('hidden');

    if (tipEl) tipEl.setAttribute('fill', isEraser ? '#e2e8f0' : currentColor);
    if (tagEl) tagEl.style.display = 'none'; // 출제자 본인은 태그 없이 깔끔한 붓만 표시
  }

  function _handleRemoteDrawerCursor(data) {
    const container = document.getElementById('cm-canvas-container');
    const cursorEl  = document.getElementById('cm-brush-cursor');
    const tipEl     = document.getElementById('cm-brush-tip');
    const tagEl     = document.getElementById('cm-brush-tag');
    const tagText   = document.getElementById('cm-brush-tag-text');
    if (!container || !cursorEl) return;

    if (!data || !data.isHovering) {
      cursorEl.classList.add('hidden');
      return;
    }

    const rect = container.getBoundingClientRect();
    const px = data.x * rect.width;
    const py = data.y * rect.height;

    cursorEl.style.transform = `translate(${px - 2}px, ${py - 33}px)`;
    cursorEl.classList.remove('hidden');

    if (tipEl) tipEl.setAttribute('fill', data.color || '#000000');
    if (tagEl) {
      tagEl.style.display = 'flex';
      if (tagText) tagText.textContent = data.drawerName || '출제자';
    }
  }

  function _onCanvasHoverMove(e) {
    if (!_isDrawer() || isGameOver || isDrawingLocked) return;
    const pos = _getCanvasPos(e);
    _updateLocalBrushCursor(pos);

    const now = performance.now();
    if (now - lastCursorSendTime > 35) {
      lastCursorSendTime = now;
      const me = _getMyPlayer();
      P2P.send({
        type: 'DRAWER_CURSOR',
        x: pos.x,
        y: pos.y,
        color: isEraser ? '#e2e8f0' : currentColor,
        isHovering: true,
        drawerName: me.name || '출제자'
      });
    }
  }

  function _onCanvasMouseEnter(e) {
    if (!_isDrawer() || isGameOver || isDrawingLocked) return;
    const pos = _getCanvasPos(e);
    _updateLocalBrushCursor(pos);
  }

  function _onCanvasMouseLeave() {
    if (!_isDrawer()) return;
    const cursorEl = document.getElementById('cm-brush-cursor');
    if (cursorEl) cursorEl.classList.add('hidden');
    P2P.send({
      type: 'DRAWER_CURSOR',
      isHovering: false
    });
  }

  /**
   * 캔버스 전체를 완전히 지우고 흰색으로 채운 뒤 모든 Stroke를 처음부터 재렌더링
   */
  function _redrawCanvas() {
    if (!canvas) canvas = document.getElementById('cm-canvas');
    if (!canvas) return;
    if (!ctx) ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 저장된 모든 Stroke들을 순서대로 렌더링
    strokes.forEach(stroke => {
      _renderSingleStroke(stroke);
    });

    // 현재 실시간으로 그리고 있는 활성 Stroke가 있으면 렌더링
    if (activeStroke && activeStroke.points && activeStroke.points.length > 0) {
      _renderSingleStroke(activeStroke);
    }
  }

  function _hexToRgba(hex) {
    let c = String(hex || '#000000').replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
  }

  /* ── 🌟 초고속 Scanline Flood Fill (0-Overhead 픽셀 영역 채우기) ── */
  function _floodFill(targetX, targetY, fillColorHex) {
    if (!canvas) canvas = document.getElementById('cm-canvas');
    if (!canvas) return;
    if (!ctx) ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const startX = Math.floor(targetX * w);
    const startY = Math.floor(targetY * h);

    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

    const fillRgba = _hexToRgba(fillColorHex);
    const startIdx = (startY * w + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    const fillR = fillRgba[0];
    const fillG = fillRgba[1];
    const fillB = fillRgba[2];
    const fillA = fillRgba[3];

    // 시작 색상과 채울 색상이 거의 같으면 무시
    if (Math.abs(startR - fillR) <= 8 &&
        Math.abs(startG - fillG) <= 8 &&
        Math.abs(startB - fillB) <= 8 &&
        Math.abs(startA - fillA) <= 8) {
      return;
    }

    const TOLERANCE = 48;
    const TOL_SQ = TOLERANCE * TOLERANCE;

    function matchPixel(idx) {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const dr = r - startR;
      const dg = g - startG;
      const db = b - startB;
      const da = a - startA;
      return (dr*dr + dg*dg + db*db + da*da) <= TOL_SQ;
    }

    function setPixel(idx) {
      data[idx]     = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = fillA;
    }

    const stack = [{ x: startX, y: startY }];
    const visited = new Uint8Array(w * h);

    while (stack.length > 0) {
      const pt = stack.pop();
      const currentX = pt.x;
      const currentY = pt.y;
      const currentPos = currentY * w + currentX;
      const idx = currentPos * 4;

      if (visited[currentPos] || !matchPixel(idx)) continue;

      // Scan left
      let leftX = currentX;
      while (leftX >= 0) {
        const pIdx = (currentY * w + leftX) * 4;
        if (!matchPixel(pIdx) || visited[currentY * w + leftX]) break;
        leftX--;
      }
      leftX++;

      // Scan right
      let rightX = currentX;
      while (rightX < w) {
        const pIdx = (currentY * w + rightX) * 4;
        if (!matchPixel(pIdx) || visited[currentY * w + rightX]) break;
        rightX++;
      }
      rightX--;

      // Fill span and find new scanlines
      let spanAbove = false;
      let spanBelow = false;

      for (let cx = leftX; cx <= rightX; cx++) {
        const pIdx = (currentY * w + cx) * 4;
        setPixel(pIdx);
        visited[currentY * w + cx] = 1;

        // Check above
        if (currentY > 0) {
          const abovePos = (currentY - 1) * w + cx;
          const aboveIdx = abovePos * 4;
          if (!visited[abovePos] && matchPixel(aboveIdx)) {
            if (!spanAbove) {
              stack.push({ x: cx, y: currentY - 1 });
              spanAbove = true;
            }
          } else {
            spanAbove = false;
          }
        }

        // Check below
        if (currentY < h - 1) {
          const belowPos = (currentY + 1) * w + cx;
          const belowIdx = belowPos * 4;
          if (!visited[belowPos] && matchPixel(belowIdx)) {
            if (!spanBelow) {
              stack.push({ x: cx, y: currentY + 1 });
              spanBelow = true;
            }
          } else {
            spanBelow = false;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  function _renderSingleStroke(stroke) {
    if (!ctx || !stroke) return;
    if (stroke.type === 'fill' && stroke.point) {
      _floodFill(stroke.point.x, stroke.point.y, stroke.color);
      return;
    }
    if (!stroke.points || stroke.points.length === 0) return;

    const w = canvas.width;
    const h = canvas.height;
    const pts = stroke.points;

    ctx.save();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.isEraser ? (stroke.size * 3) : stroke.size;
    ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color;
    ctx.fillStyle   = stroke.isEraser ? '#ffffff' : stroke.color;

    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x * w, pts[0].y * h, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0].x * w, pts[0].y * h);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * w, pts[i].y * h);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function _getCanvasPos(e) {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.max(0, Math.min(1, ((e.clientX - rect.left) * scaleX) / canvas.width)),
      y: Math.max(0, Math.min(1, ((e.clientY - rect.top)  * scaleY) / canvas.height))
    };
  }

  function _onPointerDown(e) {
    if (!_isDrawer() || isGameOver || isDrawingLocked) return;
    const pos = _getCanvasPos(e);

    // 🎨 페인트통 모드 (영역 채우기)
    if (isBucket) {
      const strokeId = 'st_fill_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const fillStroke = {
        id: strokeId,
        type: 'fill',
        color: currentColor,
        point: { x: pos.x, y: pos.y }
      };
      strokes.push(fillStroke);
      redoStack = []; // 새 작업 시 redo 스택 초기화
      _renderSingleStroke(fillStroke);
      if (typeof Sound !== 'undefined' && Sound.playWater) Sound.playWater();
      else if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();

      P2P.send({
        type: 'DRAW_FILL',
        strokeId: fillStroke.id,
        color: fillStroke.color,
        point: fillStroke.point
      });
      return;
    }

    // ✏️ 일반 브러시 / 지우개 모드
    isDrawing = true;
    _updateLocalBrushCursor(pos);
    const strokeId = 'st_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    activeStroke = {
      id: strokeId,
      color: isEraser ? '#ffffff' : currentColor,
      size: currentBrushSize,
      isEraser: isEraser,
      points: [{ x: pos.x, y: pos.y }]
    };

    _redrawCanvas();

    const pkt = {
      type: 'DRAW_START',
      strokeId: activeStroke.id,
      color: activeStroke.color,
      size: activeStroke.size,
      isEraser: activeStroke.isEraser,
      point: { x: pos.x, y: pos.y }
    };
    P2P.send(pkt);
  }

  function _onPointerMove(e) {
    if (!_isDrawer() || isGameOver || isDrawingLocked) return;
    const pos = _getCanvasPos(e);
    _updateLocalBrushCursor(pos);

    if (!isDrawing || !activeStroke) return;
    activeStroke.points.push({ x: pos.x, y: pos.y });

    _redrawCanvas();

    const pkt = {
      type: 'DRAW_MOVE',
      strokeId: activeStroke.id,
      point: { x: pos.x, y: pos.y }
    };
    P2P.send(pkt);
  }

  function _onPointerUp() {
    if (!isDrawing || !_isDrawer()) return;
    isDrawing = false;
    if (activeStroke) {
      strokes.push(activeStroke);
      redoStack = []; // 새 선을 그리면 redo 초기화
      const strokeId = activeStroke.id;
      activeStroke = null;
      _redrawCanvas();

      P2P.send({ type: 'DRAW_END', strokeId });
    }
  }

  function _onTouchStart(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      _onPointerDown(e.touches[0]);
    }
  }
  function _onTouchMove(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      _onPointerMove(e.touches[0]);
    }
  }
  function _onTouchEnd() {
    _onPointerUp();
  }

  /* ─── Undo (되돌리기 / Ctrl+Z) ─── */
  function _performUndo() {
    if (!_isDrawer() || isGameOver || isDrawingLocked) return;
    if (strokes.length === 0) return;
    const popped = strokes.pop();
    redoStack.push(popped);
    _redrawCanvas();
    if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();

    P2P.send({ type: 'DRAW_UNDO' });
  }

  /* ─── Redo (다시 실행 / Ctrl+Y) ─── */
  function _performRedo() {
    if (!_isDrawer() || isGameOver || isDrawingLocked) return;
    if (redoStack.length === 0) return;
    const restored = redoStack.pop();
    strokes.push(restored);
    _redrawCanvas();
    if (typeof Sound !== 'undefined' && Sound.playPop) Sound.playPop();

    P2P.send({ type: 'DRAW_REDO' });
  }

  /* ─── Clear (쓰레기통 / 전체 지우기) ─── */
  function _performClear() {
    if (!_isDrawer() || isGameOver || isDrawingLocked) return;
    strokes = [];
    redoStack = [];
    activeStroke = null;
    _redrawCanvas();
    if (typeof Sound !== 'undefined' && Sound.playTrash) Sound.playTrash();

    P2P.send({ type: 'CLEAR_CANVAS' });
  }

  /* ─── 키보드 단축키 (Ctrl+Z / Ctrl+Y) ─── */
  function _handleGlobalKeyDown(e) {
    if (!_isDrawer() || isGameOver || isDrawingLocked) return;
    // 텍스트 인풋에 포커스가 있으면 무시
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          _performRedo();
        } else {
          _performUndo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        _performRedo();
      }
    }
  }

  /* ─── 툴바 이벤트 ─── */
  function _bindToolbarEvents() {
    const eb = document.getElementById('cm-btn-eraser');
    const bb = document.getElementById('cm-btn-bucket');

    _container.querySelectorAll('.cm-color-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        _container.querySelectorAll('.cm-color-chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        currentColor = chip.dataset.color;
        isEraser = false;
        if (eb) eb.classList.remove('active');
      });
    });

    _container.querySelectorAll('.cm-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _container.querySelectorAll('.cm-size-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        currentBrushSize = parseInt(btn.dataset.size, 10);
        // 브러시 크기 변경 시 페인트통 모드 해제
        isBucket = false;
        if (bb) bb.classList.remove('active');
      });
    });

    const ub = document.getElementById('cm-btn-undo');
    if (ub) ub.addEventListener('click', _performUndo);

    const rb = document.getElementById('cm-btn-redo');
    if (rb) rb.addEventListener('click', _performRedo);

    if (bb) {
      bb.addEventListener('click', () => {
        isBucket = !isBucket;
        isEraser = false;
        bb.classList.toggle('active', isBucket);
        if (eb) eb.classList.remove('active');
      });
    }

    if (eb) {
      eb.addEventListener('click', () => {
        isEraser = !isEraser;
        isBucket = false;
        eb.classList.toggle('active', isEraser);
        if (bb) bb.classList.remove('active');
      });
    }

    const cb = document.getElementById('cm-btn-clear');
    if (cb) cb.addEventListener('click', _performClear);
  }

  function _bindGuessEvents() {
    const input     = document.getElementById('cm-guess-input');
    const submitBtn = document.getElementById('cm-btn-submit');

    const doSubmit = () => {
      if (!input || isGameOver || isDrawingLocked || _isDrawer()) return;
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      _clientSubmitGuess(text);
    };

    if (submitBtn) submitBtn.addEventListener('click', doSubmit);
    if (input) input.addEventListener('keydown', e => { if (e.key==='Enter') doSubmit(); });
  }

  /* ═══════════════════════════════════════════════════════════════
     방장(Host) 전용 상태 제어 루틴
     ═══════════════════════════════════════════════════════════════ */
  function _hostStartRound() {
    isTransitioningRound = false;
    if (!isHost || isGameOver) return;

    if (round > totalRounds) {
      _hostEndGame();
      return;
    }

    if (!players || players.length === 0)
      players = (_context && _context.players) || [];

    const safeIdx = ((drawerIdx % players.length) + players.length) % players.length;
    drawerIdx = safeIdx;
    const curDrawer = players[safeIdx] || { id: myId, name: '출제자' };

    const randWord = _pickNextWord();
    currentWord = randWord;
    wordLength  = randWord.length;
    solvedPlayers.clear();
    timeLeft        = ROUND_TIME;
    isDrawingLocked = false;

    // 새 라운드 시작 시 도화지 깨끗이 초기화
    strokes = [];
    redoStack = [];
    activeStroke = null;
    _redrawCanvas();

    clearInterval(hostTimerInterval);
    hostTimerInterval = setInterval(() => {
      if (isGameOver) {
        clearInterval(hostTimerInterval);
        return;
      }

      timeLeft = Math.max(0, timeLeft - 1);
      P2P.send({ type:'TIMER_TICK', timeLeft });
      _updateTimerDisplay(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(hostTimerInterval);
        hostTimerInterval = null;
        _hostTimeOver();
      }
    }, 1000);

    const startPacket = {
      type: 'START_ROUND',
      round, totalRounds, drawerIdx,
      drawerId:   curDrawer.id,
      drawerName: curDrawer.name,
      word:       currentWord,
      wordLength
    };

    P2P.send(startPacket);
    _handleStartRound(startPacket);
  }

  function _hostTimeOver() {
    if (!isHost || isGameOver || isTransitioningRound) return;
    isTransitioningRound = true;
    isDrawingLocked = true;
    if (hostTimerInterval) {
      clearInterval(hostTimerInterval);
      hostTimerInterval = null;
    }

    const pkt = { type:'ROUND_TIMEOUT', word: currentWord };
    P2P.send(pkt);
    _handleRoundTimeout(pkt);
  }

  function _hostProcessGuess(guesserId, guesserName, guessText) {
    if (!isHost || isGameOver || isDrawingLocked) return;
    if (solvedPlayers.has(guesserId)) return;

    const cleanGuess  = (guessText  || '').replace(/\s+/g, '').toLowerCase();
    const cleanTarget = (currentWord || '').replace(/\s+/g, '').toLowerCase();

    if (cleanGuess === cleanTarget) {
      // ✅ 1명 정답 맞힘!
      solvedPlayers.add(guesserId);
      const solveRank = solvedPlayers.size; // 1등: 1, 2등: 2, 3등: 3...
      let scoreGain = 0;
      if (solveRank === 1) {
        scoreGain = 3; // 🌟 1등 정답: 3점
      } else if (solveRank === 2) {
        scoreGain = 2; // 🌟 2등 정답: 2점
      } else if (solveRank === 3) {
        scoreGain = 1; // 🌟 3등 정답: 1점
      } else {
        scoreGain = 1; // 🌟 4등 이후: 1점
      }

      scores[guesserId] = (scores[guesserId] || 0) + scoreGain;

      // 출제자 보너스 (적어도 1명이 맞히면 출제자도 성공 보너스 1점 획득)
      const si = ((drawerIdx % players.length) + players.length) % players.length;
      const dr = players[si];
      if (dr && dr.id && solveRank === 1) {
        scores[dr.id] = (scores[dr.id] || 0) + 1;
      }

      // 출제자 제외 맞혀야 할 사람 수
      const totalGuessers = Math.max(1, players.length - 1);
      const isAllSolved   = solvedPlayers.size >= totalGuessers;

      // 1) 개별 정답자 패킷 브로드캐스트
      const correctPkt = {
        type: 'PLAYER_CORRECT',
        guesserId,
        guesserName,
        scoreGain,
        solveRank,
        scores,
        solvedCount: solvedPlayers.size,
        totalGuessers
      };
      P2P.send(correctPkt);
      _handlePlayerCorrect(correctPkt);

      // 2) 만약 출제자 이외 전원이 정답을 맞혔다면 라운드 종료!
      if (isAllSolved) {
        if (isTransitioningRound) return;
        isTransitioningRound = true;
        isDrawingLocked = true;
        if (hostTimerInterval) {
          clearInterval(hostTimerInterval);
          hostTimerInterval = null;
        }

        const roundOverPkt = {
          type: 'ROUND_OVER',
          word: currentWord,
          scores
        };

        P2P.send(roundOverPkt);
        _handleRoundOver(roundOverPkt);
      }

    } else {
      // ❌ 오답 제출 (전원에게 브로드캐스트하여 말풍선 및 사운드 발생)
      const pkt = {
        type: 'WRONG_GUESS',
        senderId: guesserId,
        senderName: guesserName,
        text: guessText
      };
      P2P.send(pkt);
      _handleWrongGuess(pkt);
    }
  }

  function _hostAdvanceToNextRound() {
    if (!isHost || isGameOver) return;
    if (!players || players.length === 0)
      players = (_context && _context.players) || [];

    const pLen = Math.max(1, players.length);
    drawerIdx = (drawerIdx + 1) % pLen;
    round++;

    if (round > totalRounds) {
      _hostEndGame();
      return;
    }

    _hostStartRound();
  }

  function _hostEndGame() {
    if (!isHost || isGameOver) return;
    isGameOver = true;
    _clearAllTimers();

    let maxScore = -1, winnerId = null;
    players.forEach(p => {
      const s = scores[p.id] || 0;
      if (s > maxScore) { maxScore = s; winnerId = p.id; }
    });

    const pkt = { type:'GAME_OVER', winnerId, scores };
    P2P.send(pkt);
    _handleGameOver(pkt);
  }

  function _clearAllSpeechBubbles() {
    document.querySelectorAll('.gsp-speech-bubble').forEach(el => el.remove());
  }

  /* ─── 3 2 1 카운트다운 오버레이 ─── */
  function _startCountdownOverlay(onDone) {
    _clearAllSpeechBubbles(); // 🌟 카운트다운 시작 전 모든 정답/오답 말풍선 즉시 제거
    const overlay = document.getElementById('cm-countdown-overlay');
    const numEl   = document.getElementById('cm-countdown-number');
    const lblEl   = document.getElementById('cm-countdown-label');

    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (nextRoundTimeout) {
      clearTimeout(nextRoundTimeout);
      nextRoundTimeout = null;
    }

    if (!overlay || !numEl) {
      nextRoundTimeout = setTimeout(() => {
        if (typeof onDone === 'function') onDone();
      }, 3000);
      return;
    }

    overlay.style.display = 'flex';
    let count = 3;
    numEl.textContent = count;
    if (lblEl) lblEl.textContent = '다음 라운드 준비 중...';
    if (typeof Sound !== 'undefined' && Sound.playCountdown) Sound.playCountdown(3);

    countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        numEl.textContent = count;
        numEl.style.animation = 'none';
        void numEl.offsetWidth;
        numEl.style.animation = 'cmPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        if (typeof Sound !== 'undefined' && Sound.playCountdown) Sound.playCountdown(count);
      } else {
        clearInterval(countdownInterval);
        countdownInterval = null;
        overlay.style.display = 'none';
        if (typeof onDone === 'function') onDone();
      }
    }, 900);
  }

  function _hideCountdownOverlay() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (nextRoundTimeout) {
      clearTimeout(nextRoundTimeout);
      nextRoundTimeout = null;
    }
    const overlay = document.getElementById('cm-countdown-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  /* ═══════════════════════════════════════════════════════════════
     클라이언트 수신 핸들러 (UI 갱신 & 드로잉)
     ═══════════════════════════════════════════════════════════════ */
  function _getHintDisplayHtml(sec) {
    if (!currentWord) return '';
    const len = currentWord.length;
    if (len <= 0) return '';

    // 🌟 15초 이하 남았을 때: 전체 모든 글자 초성 전면 공개!
    const showAllChosung = (sec <= 15);
    // 30초 이하 남았을 때: 맨 앞글자 + 맨 뒷글자 초성 공개
    const showFirstAndLast = (sec <= 30);
    // 60초 이하 남았을 때: 맨 뒷글자 초성 공개
    const showLastOnly = (sec <= 60);

    const chars = [];
    for (let i = 0; i < len; i++) {
      const chosung = _getChosung(currentWord[i]);
      if (showAllChosung) {
        chars.push(`<span class="cm-hint-char chosung-all" style="color:var(--coral); font-size:1.75rem; font-weight:900;">${chosung}</span>`);
      } else if (showFirstAndLast && (i === 0 || i === len - 1)) {
        const color = (i === 0) ? 'var(--green-deep)' : '#f97316';
        chars.push(`<span class="cm-hint-char chosung-partial" style="color:${color}; font-size:1.75rem; font-weight:900;">${chosung}</span>`);
      } else if (showLastOnly && i === len - 1) {
        chars.push(`<span class="cm-hint-char chosung-last" style="color:#f97316; font-size:1.75rem; font-weight:900;">${chosung}</span>`);
      } else {
        chars.push('<span class="cm-hint-char blank" style="color:var(--t3); font-size:1.75rem; font-weight:900;">＿</span>');
      }
    }

    return `<div style="display:flex; align-items:center; justify-content:center; gap:12px; line-height:1.2;">${chars.join('')}</div>`;
  }

  function _handleStartRound(data) {
    round       = data.round;
    totalRounds = data.totalRounds || totalRounds;
    drawerIdx   = data.drawerIdx;
    currentWord = data.word;
    wordLength  = data.wordLength || data.word.length;

    solvedPlayers.clear();
    isDrawingLocked = false;
    isTransitioningRound = false;

    // 캔버스 초기화
    strokes = [];
    redoStack = [];
    activeStroke = null;
    _redrawCanvas();
    _resetSidebarSolvedBadges();
    _hideCountdownOverlay();

    const safeIdx    = ((drawerIdx % players.length) + players.length) % players.length;
    const curDrawer  = players[safeIdx] || { id: data.drawerId, name: data.drawerName };
    const isMeDrawer = String(curDrawer.id) === String(myId);

    const roundBadge   = document.getElementById('cm-round-badge');
    const drawerName   = document.getElementById('cm-drawer-name');
    const wordTitle    = document.getElementById('cm-word-title');
    const wordDesc     = document.getElementById('cm-word-desc');
    const toolbar      = document.getElementById('cm-toolbar');
    const guessBar     = document.getElementById('cm-guess-bar');
    const guessInput   = document.getElementById('cm-guess-input');
    const submitBtn    = document.getElementById('cm-btn-submit');
    const solvedMsg    = document.getElementById('cm-guess-solved-msg');

    if (roundBadge) roundBadge.textContent = `Round ${round}/${totalRounds}`;
    if (drawerName) drawerName.textContent = isMeDrawer
      ? '내가 그릴 차례입니다!'
      : `${curDrawer.name}님이 그리는 중`;

    _updateTimerDisplay(ROUND_TIME);

    // 입력 필드 상태 리셋
    if (solvedMsg)  solvedMsg.classList.add('hidden');
    if (guessInput) {
      guessInput.style.display = '';
      guessInput.disabled = false;
      guessInput.value    = '';
    }
    if (submitBtn) {
      submitBtn.style.display = '';
      submitBtn.disabled = false;
    }

    const canvasContainer = document.getElementById('cm-canvas-container');
    const brushCursor = document.getElementById('cm-brush-cursor');
    if (brushCursor) brushCursor.classList.add('hidden');

    if (isMeDrawer) {
      if (canvasContainer) canvasContainer.classList.add('is-drawer');
      if (wordTitle) wordTitle.innerHTML =
        `<span style="color:var(--green-deep);font-size:1.5rem;font-weight:900;">제시어: <b>${currentWord}</b></span>`;
      if (wordDesc)  wordDesc.textContent = '그림을 그려 다른 플레이어들이 맞히도록 도와주세요!';
      if (toolbar)   toolbar.style.display = 'flex';
      if (guessBar)  guessBar.style.display = 'none';
      if (typeof Sound !== 'undefined' && Sound.playDing) Sound.playDing();
    } else {
      if (canvasContainer) canvasContainer.classList.remove('is-drawer');
      if (wordTitle) wordTitle.innerHTML = _getHintDisplayHtml(ROUND_TIME);
      if (wordDesc)  wordDesc.textContent = '그림을 보고 정답 단어를 아래에 입력하세요!';
      if (toolbar)   toolbar.style.display = 'none';
      if (guessBar)  guessBar.style.display = 'flex';
      if (guessInput) setTimeout(() => guessInput.focus(), 100);
    }

    _updateSidebarRoles();
  }

  function _updateTimerDisplay(sec) {
    const el = document.getElementById('cm-timer-text');
    if (el) el.textContent = Math.max(0, sec);

    const fill = document.getElementById('cm-timer-gauge-fill');
    const badge = document.getElementById('cm-timer-badge');
    const pct = Math.max(0, Math.min(100, (sec / ROUND_TIME) * 100));

    if (fill) {
      fill.style.width = `${pct}%`;
      fill.className = 'cm-timer-gauge-fill';

      if (sec <= 15) {
        fill.classList.add('gauge-critical');
        if (badge) badge.className = 'cm-timer-badge gauge-critical-badge';
      } else if (sec <= 30) {
        fill.classList.add('gauge-urgent');
        if (badge) badge.className = 'cm-timer-badge gauge-urgent-badge';
      } else if (sec <= 60) {
        fill.classList.add('gauge-warning');
        if (badge) badge.className = 'cm-timer-badge gauge-warning-badge';
      } else {
        if (badge) badge.className = 'cm-timer-badge';
      }
    }

    if (sec <= 10 && sec > 0 && typeof Sound !== 'undefined' && Sound.playTick) {
      Sound.playTick();
    }

    // 힌트 실시간 갱신 (출제자가 아닐 때)
    if (!_isDrawer() && !isGameOver && !isDrawingLocked) {
      const wordTitle = document.getElementById('cm-word-title');
      if (wordTitle) {
        wordTitle.innerHTML = _getHintDisplayHtml(sec);
      }
    }
  }

  function _handlePlayerCorrect(data) {
    scores = data.scores || scores;
    solvedPlayers.add(data.guesserId);

    const rankText = data.solveRank ? `${data.solveRank}등 ` : '';
    const gainText = (typeof data.scoreGain === 'number') ? ` (+${data.scoreGain}점)` : '';
    _showSpeechBubble(data.guesserId, `${rankText}정답!${gainText}`, true);
    _markPlayerSolved(data.guesserId);
    _updateSidebarRoles();

    const me = _getMyPlayer();
    const isMe = String(data.guesserId) === String(me.id);

    if (isMe) {
      if (typeof Sound !== 'undefined' && Sound.playWordSubmit) Sound.playWordSubmit();
      const guessInput = document.getElementById('cm-guess-input');
      const submitBtn  = document.getElementById('cm-btn-submit');
      const solvedMsg  = document.getElementById('cm-guess-solved-msg');
      if (guessInput) { guessInput.disabled = true; guessInput.style.display = 'none'; }
      if (submitBtn)  { submitBtn.disabled  = true; submitBtn.style.display  = 'none'; }
      if (solvedMsg)  solvedMsg.classList.remove('hidden');
    } else {
      if (typeof Sound !== 'undefined' && Sound.playDing) Sound.playDing();
    }
  }

  function _handleRoundOver(data) {
    isDrawingLocked = true;
    scores = data.scores || scores;

    if (typeof Sound !== 'undefined' && Sound.playWin) Sound.playWin();

    const isFinalRound = (round >= totalRounds);

    const wordTitle = document.getElementById('cm-word-title');
    const wordDesc  = document.getElementById('cm-word-desc');
    if (wordTitle) {
      wordTitle.innerHTML =
        `<span style="color:var(--green-deep);font-size:1.6rem;font-weight:900;"><i class="fa-solid fa-circle-check"></i> 정답: [ <b>${data.word}</b> ]</span>`;
    }
    
    if (wordDesc) {
      wordDesc.innerHTML = `<span style="color:var(--green-deep);font-weight:900;font-size:1.15rem;"><i class="fa-solid fa-crown" style="color:var(--yellow);margin-right:4px;"></i> 모두 정답!</span>`;
    }

    const guessInput = document.getElementById('cm-guess-input');
    const submitBtn  = document.getElementById('cm-btn-submit');
    const solvedMsg  = document.getElementById('cm-guess-solved-msg');
    if (guessInput) { guessInput.disabled = true; guessInput.style.display = 'none'; }
    if (submitBtn)  { submitBtn.disabled = true;  submitBtn.style.display = 'none'; }
    if (solvedMsg)  solvedMsg.classList.remove('hidden');

    if (isFinalRound) {
      setTimeout(() => {
        if (isHost) {
          _hostEndGame();
        }
      }, 2000);
    } else {
      // 🌟 2초 정도 정답 및 '모두 정답!' 문구를 확인한 뒤 다음 라운드 카운트다운 시작
      setTimeout(() => {
        _startCountdownOverlay(() => {
          if (isHost) {
            _hostAdvanceToNextRound();
          }
        });
      }, 2000);
    }
  }

  function _handleRoundTimeout(data) {
    isDrawingLocked = true;
    if (typeof Sound !== 'undefined' && Sound.playDing) Sound.playDing();

    const isFinalRound = (round >= totalRounds);

    const wordTitle = document.getElementById('cm-word-title');
    const wordDesc  = document.getElementById('cm-word-desc');
    if (wordTitle) {
      wordTitle.innerHTML =
        `<span style="color:var(--coral);font-size:1.6rem;font-weight:900;"><i class="fa-solid fa-clock"></i> 시간 초과! 정답은 [ <b style="color:var(--green-deep);">${data.word}</b> ] 였습니다!</span>`;
    }
    
    if (wordDesc) {
      wordDesc.innerHTML = isFinalRound
        ? '<span style="font-weight:800;color:var(--t2);">마지막 라운드 종료! 잠시 후 최종 순위를 발표합니다...</span>'
        : '<span style="font-weight:800;color:var(--t2);">3초간 정답 확인 후 다음 라운드가 시작됩니다...</span>';
    }

    const guessInput = document.getElementById('cm-guess-input');
    const submitBtn  = document.getElementById('cm-btn-submit');
    if (guessInput) {
      guessInput.disabled = true;
      guessInput.value = `정답: ${data.word}`;
    }
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    // 🌟 3초간 정답 화면을 그대로 유지하고 멈춰있다가 카운트다운 시작!
    if (isFinalRound) {
      setTimeout(() => {
        if (isHost) {
          _hostEndGame();
        }
      }, 3000);
    } else {
      setTimeout(() => {
        _startCountdownOverlay(() => {
          if (isHost) {
            _hostAdvanceToNextRound();
          }
        });
      }, 3000);
    }
  }

  function _handleWrongGuess(data) {
    const me = _getMyPlayer();
    const isMe = String(data.senderId) === String(me.id);

    if (typeof Sound !== 'undefined') {
      if (isMe) {
        if (Sound.playError) Sound.playError();
      } else {
        if (Sound.playPop) Sound.playPop();
      }
    }
    _showSpeechBubble(data.senderId, data.text, false);
  }

  function _handleGameOver(data) {
    isGameOver      = true;
    isDrawingLocked = true;
    _clearAllTimers();
    _hideCountdownOverlay();
    _clearAllSpeechBubbles();

    const me   = _getMyPlayer();
    const iWon = (String(data.winnerId) === String(me.id));
    if (typeof Sound !== 'undefined') {
      if (iWon && Sound.playWin) Sound.playWin();
      else if (Sound.playLose) Sound.playLose();
    }

    const leaderboard = players.map(p => ({
      id: p.id,
      name: p.name,
      score: (data.scores && data.scores[p.id]) || (scores && scores[p.id]) || 0
    })).sort((a, b) => b.score - a.score);

    setTimeout(() => {
      if (_onResult) _onResult(iWon, null, leaderboard);
    }, 1500);
  }

  function _clientSubmitGuess(guessText) {
    const me = _getMyPlayer();
    if (!guessText || isDrawingLocked || isGameOver) return;
    if (isHost) {
      _hostProcessGuess(me.id, me.name, guessText);
    } else {
      P2P.send({ type:'SUBMIT_GUESS', guesserId:me.id, guesserName:me.name, guessText });
    }
  }

  /* ─── 말풍선 / 정답 뱃지 / 역할 표시 ─── */
  function _showSpeechBubble(playerId, text, isCorrect) {
    const idx  = players.findIndex(p => String(p.id) === String(playerId));
    if (idx === -1) return;
    const item = document.getElementById(`gsp-item-${idx}`);
    if (!item) return;
    const old = item.querySelector('.gsp-speech-bubble');
    if (old) old.remove();
    const bub = document.createElement('div');
    bub.className   = `gsp-speech-bubble ${isCorrect ? 'correct' : 'wrong'}`;
    bub.innerHTML = isCorrect ? `<i class="fa-solid fa-circle-check" style="color:var(--green);"></i> ${text}` : ('<i class="fa-solid fa-circle-xmark" style="color:var(--coral);"></i> ' + text);
    item.appendChild(bub);
    setTimeout(() => { if (bub.parentNode) bub.remove(); }, 3000);
  }

  function _markPlayerSolved(playerId) {
    const idx  = players.findIndex(p => String(p.id) === String(playerId));
    if (idx === -1) return;
    const item = document.getElementById(`gsp-item-${idx}`);
    if (!item) return;
    item.classList.add('is-solved');
    const meta = item.querySelector('.gsp-meta');
    if (meta && !meta.querySelector('.gsp-solved-badge')) {
      const badge = document.createElement('span');
      badge.className = 'gsp-solved-badge';
      badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> 정답';
      meta.appendChild(badge);
    }
  }

  function _updateSidebarRoles() {
    const safeIdx = ((drawerIdx % players.length) + players.length) % players.length;
    players.forEach((p, idx) => {
      const item = document.getElementById(`gsp-item-${idx}`);
      if (!item) return;
      const tagEl = item.querySelector('.gsp-tag');
      if (!tagEl) return;

      const pScore = (scores && typeof scores[p.id] === 'number') ? scores[p.id] : 0;
      const scorePrefix = `<span style="font-size:0.75rem; font-weight:800; color:var(--t2); margin-right:5px;">${pScore}점</span>`;

      let roleHtml = '';
      if (idx === safeIdx) {
        roleHtml = '<span style="color:#ea580c;font-weight:900;"><i class="fa-solid fa-paintbrush"></i> 출제자</span>';
        item.classList.add('is-current-turn');
      } else if (solvedPlayers.has(p.id)) {
        roleHtml = '<span style="color:#2563eb;font-weight:900;"><i class="fa-solid fa-circle-check"></i> 정답!</span>';
        item.classList.remove('is-current-turn');
      } else {
        roleHtml = '<span style="color:var(--t3);font-weight:700;"><i class="fa-solid fa-magnifying-glass"></i> 맞히는 중</span>';
        item.classList.remove('is-current-turn');
      }

      tagEl.innerHTML = `<span style="display:inline-flex; align-items:center;">${scorePrefix}${roleHtml}</span>`;
    });

    if (window.App && typeof window.App.updateInGameTurn === 'function') {
      window.App.updateInGameTurn(drawerIdx);
    }
  }

  function _resetSidebarSolvedBadges() {
    players.forEach((_,idx) => {
      const item = document.getElementById(`gsp-item-${idx}`);
      if (!item) return;
      item.classList.remove('is-solved');
      const b = item.querySelector('.gsp-solved-badge');
      if (b) b.remove();
      const bub = item.querySelector('.gsp-speech-bubble');
      if (bub) bub.remove();
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     P2P 메시지 라우터 & 호스트 릴레이 완벽 보장
     ═══════════════════════════════════════════════════════════════ */
  function _onMessage(data, senderId) {
    if (!data || typeof data !== 'object') return;

    // 🌟 호스트가 게스트로부터 드로잉 / 퀴즈 패킷 수신 시 다른 모든 게스트에게 100% 릴레이!
    if (isHost && senderId && senderId !== 'host') {
      if (['DRAW_START', 'DRAW_MOVE', 'DRAW_END', 'DRAW_UNDO', 'DRAW_REDO', 'DRAW_FILL', 'CLEAR_CANVAS', 'SUBMIT_GUESS', 'DRAWER_CURSOR'].includes(data.type)) {
        P2P.send(data, null, senderId);
      }
    }

    switch (data.type) {
      case 'START_ROUND':
        _handleStartRound(data);
        break;

      case 'TIMER_TICK':
        if (!isHost) _updateTimerDisplay(data.timeLeft);
        break;

      // ── 드로잉 패킷 수신 ──
      case 'DRAW_START':
        if (_isDrawer()) break;
        activeStroke = {
          id: data.strokeId,
          color: data.color,
          size: data.size,
          isEraser: data.isEraser,
          points: [data.point]
        };
        _redrawCanvas();
        break;

      case 'DRAW_MOVE':
        if (_isDrawer() || !activeStroke) break;
        activeStroke.points.push(data.point);
        _redrawCanvas();
        break;

      case 'DRAW_END':
        if (_isDrawer()) break;
        if (activeStroke) {
          strokes.push(activeStroke);
          activeStroke = null;
          _redrawCanvas();
        }
        break;

      case 'DRAW_UNDO':
        if (_isDrawer()) break;
        if (strokes.length > 0) {
          const popped = strokes.pop();
          redoStack.push(popped);
          _redrawCanvas();
        }
        break;

      case 'DRAW_REDO':
        if (_isDrawer()) break;
        if (redoStack.length > 0) {
          const restored = redoStack.pop();
          strokes.push(restored);
          _redrawCanvas();
        }
        break;

      case 'DRAW_FILL':
        if (_isDrawer()) break;
        strokes.push({
          id: data.strokeId,
          type: 'fill',
          color: data.color,
          point: data.point
        });
        _redrawCanvas();
        break;

      case 'CLEAR_CANVAS':
        strokes = [];
        redoStack = [];
        activeStroke = null;
        _redrawCanvas();
        break;

      case 'DRAWER_CURSOR':
        if (_isDrawer()) break;
        _handleRemoteDrawerCursor(data);
        break;

      case 'SUBMIT_GUESS':
        if (isHost) _hostProcessGuess(data.guesserId, data.guesserName, data.guessText);
        break;

      case 'PLAYER_CORRECT':
        _handlePlayerCorrect(data);
        break;

      case 'ROUND_OVER':
        _handleRoundOver(data);
        break;

      case 'ROUND_TIMEOUT':
        _handleRoundTimeout(data);
        break;

      case 'WRONG_GUESS':
        _handleWrongGuess(data);
        break;

      case 'GAME_OVER':
        _handleGameOver(data);
        break;

      case 'CATCHMIND_SYNC_STATE':
        drawerIdx = (typeof data.drawerIdx === 'number') ? data.drawerIdx : drawerIdx;
        round = (typeof data.round === 'number') ? data.round : round;
        if (data.scores) scores = data.scores;
        if (data.strokes) strokes = data.strokes;
        if (Array.isArray(data.solvedPlayers)) {
          solvedPlayers = new Set(data.solvedPlayers);
        }
        _redrawCanvas();
        _updateUI();
        onSidebarRedrawn();
        break;
    }
  }

  /* ─── 헬퍼 ─── */
  function _isDrawer() {
    if (_context && _context.isDevMode) return true;
    if (_context && _context.isSpectator) return false;
    if (!players || players.length === 0) return false;
    const safeIdx = ((drawerIdx % players.length) + players.length) % players.length;
    const cur = players[safeIdx];
    if (!cur) return false;
    return String(cur.id) === String(myId);
  }

  function _getMyPlayer() {
    return players.find(p => String(p.id) === String(myId)) || { id: myId, name: _context.myNickname || '나' };
  }

  function _clearAllTimers() {
    clearInterval(hostTimerInterval); hostTimerInterval = null;
    clearInterval(countdownInterval); countdownInterval = null;
    clearTimeout(nextRoundTimeout);    nextRoundTimeout = null;
  }

  function onSidebarRedrawn() {
    _updateSidebarRoles();
    if (solvedPlayers && solvedPlayers.size > 0) {
      solvedPlayers.forEach(id => {
        _markPlayerSolved(id);
      });
    }
  }

  function isPlayerSolved(playerId) {
    return !!(solvedPlayers && solvedPlayers.has(playerId));
  }

  /* ─── 정리 ─── */
  function destroy() {
    P2P.offMessage(_onMessage);
    window.removeEventListener('keydown', _handleGlobalKeyDown);
    if (canvas) {
      canvas.removeEventListener('mousemove', _onCanvasHoverMove);
      canvas.removeEventListener('mouseenter', _onCanvasMouseEnter);
      canvas.removeEventListener('mouseleave', _onCanvasMouseLeave);
      canvas.removeEventListener('touchcancel', _onCanvasMouseLeave);
    }
    const cursorEl = document.getElementById('cm-brush-cursor');
    if (cursorEl) cursorEl.classList.add('hidden');
    _clearAllTimers();
    _clearAllSpeechBubbles();
    isGameOver      = true;
    isDrawingLocked = false;
    _resetSidebarSolvedBadges();
  }

  function sendSnapshotTo(targetPeerId) {
    P2P.send({
      type: 'CATCHMIND_SYNC_STATE',
      drawerIdx: drawerIdx,
      round: round,
      scores: scores,
      strokes: strokes,
      solvedPlayers: Array.from(solvedPlayers)
    }, targetPeerId);
  }

  return { init, destroy, sendSnapshotTo, onSidebarRedrawn, isPlayerSolved };
})();
