# 🎮 같이아케이드 (Gachi Arcade)

<p align="center">
  <img src="https://img.shields.io/badge/Version-v1.1.0-brightgreen?style=for-the-badge" alt="Version" />
  <img src="https://img.shields.io/badge/Status-Live%20Service-blue?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Made%20With-Vibe%20Coding-ff69b4?style=for-the-badge" alt="Vibe Coding" />
  <img src="https://img.shields.io/badge/License-MIT-orange?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <strong>웹 브라우저에서 별도 설치 없이 친구들과 링크 하나로 즉시 즐기는 실시간 멀티플레이 아케이드 플랫폼!</strong><br />
  클래식 보드게임부터 전략 심리전, 캐주얼 파티 게임까지 13종의 미니게임을 한곳에서 즐겨보세요.
</p>

<p align="center">
  🌐 <strong>공식 서비스 바로가기</strong>: <a href="https://gachiarcade.kro.kr" target="_blank"><strong>https://gachiarcade.kro.kr</strong></a>
</p>

---

## 💡 About Project & Vibe Coding

> 🪄 **100% Vibe Coding으로 완성된 웹 아케이드 플랫폼**  
> 본 프로젝트는 복잡한 번들러나 무거운 프레임워크 없이, 아이디어를 실시간으로 프로토타이핑하고 확장해 나가는 **바이브 코딩(Vibe Coding)** 철학으로 개발되었습니다.  
> 인공지능과의 끊임없는 대화형 페어 프로그래밍을 통해 순수 **Vanilla JavaScript**, **HTML5**, **CSS3** 및 클라우드 BaaS(Supabase, Firebase)의 장점을 극대화하여 안정적이고 빠른 실시간 P2P 네트워크 아케이드 환경을 완성했습니다.

---

## ✨ 주요 기능 (Key Features)

- ⚡ **무설치 P2P 초저지연 멀티플레이**
  - WebRTC(PeerJS) 기반 직접 연결 및 호스트 릴레이 구조로 서버 비용 없이 반응속도가 빠른 실시간 대전을 지원합니다.
  - 핑 보정, 충돌 물리학(알까기), 턴 타이머 동기화가 완벽하게 내장되어 있습니다.
- 🌐 **실시간 로비 & 글로벌 방 탐색**
  - Firebase Realtime Database를 통해 현재 개설된 방 목록, 참가자 현황, 비밀방/공개방 상태가 실시간으로 동기화됩니다.
- 👤 **클라우드 계정 & 커스터마이징 상점**
  - Supabase DB 연동: 회원가입, 로그인, 게스트 플레이 모두 지원.
  - 승패 전적, 레벨 및 경험치 시스템, 출석 및 플레이 보상 코인 지급.
  - 상점 아이템: 개성 넘치는 **프로필 카드 테마**, **아바타 프레임 테두리**, **말풍선 스킨**, **닉네임 색상**.
- 💬 **실시간 인게임 & 대기실 채팅**
  - 대기실 및 게임 진행 중 실시간 채팅 지원 (방 입장/복귀 시 최신 메시지 자동 스크롤).
  - 모바일 환경에서도 편안하게 즐길 수 있는 슬라이드 인/아웃 모바일 채팅 팝업 및 알림 뱃지.
- 📱 **완벽한 반응형 모바일 최적화**
  - PC 마우스 드래그 & 모바일 터치 제스처 완벽 지원 (사과게임 슬라이스, 알까기 당기기 조준 등).
- 🎵 **자체 내장 Web Audio API 사운드**
  - 외부 음원 파일 다운로드 지연 없이 브라우저 내장 오디오 신디사이저로 즉각적인 타격음, 효과음, BGM 출력.

---

## 🎯 수록 게임 목록 (13 Mini Games)

| 게임명 | 설명 | 지원 인원 |
| :--- | :--- | :---: |
| **쓰레기 체스 (Chess Warfare)** | 매 턴 무작위 기물이 소환되고 특수 능력이 난무하는 예측불허 배틀 체스 | 2인 |
| **장기 (Janggi)** | 전통 민속 장기의 묘미를 온라인에서 실시간 대전으로 구현 | 2인 |
| **알까기 (Alkkagi)** | 2D 물리 엔진 기반 당기기(Fling) 샷으로 상대 바둑알을 장외로 날려버리는 게임 | 2인 |
| **쿼리도 (Quoridor)** | 미로를 만들며 상대의 전진을 가로막고 내 말을 먼저 반대편에 도착시키는 멘사 전략 게임 | 2인 |
| **오목 (Gomoku)** | 직관적인 클릭으로 5목을 먼저 완성하는 국민 클래식 보드게임 | 2인 |
| **베스킨라빈스 31** | 1~3개의 숫자를 번갈아 외치며 마지막 31을 피하는 치열한 두뇌 심리전 | 2~6인 |
| **러시안 룰렛 (Russian Roulette)** | 아이템(돋보기, 톱, 맥주 등)을 전략적으로 활용해 생존하는 긴장감 넘치는 턴제 룰렛 | 2인 |
| **끝말잇기 (Wordchain)** | 표준국어대사전 기반 단어 검증 및 실시간 타이머 압박 끝말잇기 | 2~6인 |
| **사과게임 (Apple Game)** | 숫자의 합이 10이 되도록 드래그하여 제한시간 내 최고 점수를 겨루는 실시간 대결 | 2~4인 |
| **타자연습 대결 (Typing)** | 명언과 문장을 빠르게 입력하여 순위를 가리는 실시간 타이핑 배틀 | 2~6인 |
| **캐치마인드 (Catchmind)** | 출제자의 그림을 보고 실시간 채팅으로 정답을 맞히는 파티 드로잉 퀴즈 | 2~8인 |
| **윷놀이 (Yutnori)** | 도·개·걸·윷·모와 빽도, 말 업기, 잡기 룰이 살아있는 실시간 전통 윷놀이 | 2~4인 |
| **야추 다이스 (Yacht Dice)** | 5개의 주사위를 굴려 최고의 족보 조합과 점수를 만들어내는 전략 다이스 게임 | 2~4인 |

---

## 🛠️ 기술 스택 (Tech Stack)

### Client
- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Graphics & UI**: HTML5 Canvas 2D Context, CSS Grid & Flexbox, FontAwesome Icons, Pretendard Webfont
- **Audio Engine**: Web Audio API (Synthesizer Oscillators & Gain Nodes)

### Realtime & Networking
- **P2P Multiplay**: [PeerJS](https://peerjs.com/) (WebRTC DataChannel / Mesh & Host Relay)
- **Lobby & Room Sync**: [Firebase Realtime Database](https://firebase.google.com/products/realtime-database) v10 (ES Module CDN)

### Backend & Cloud Services
- **Authentication & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Profiles & Inventory)
- **Hosting & Domain**: Custom Domain (`https://gachiarcade.kro.kr`), Cloudflare SSL / Edge CDN

---

## 📁 프로젝트 구조 (Project Structure)

```text
├── index.html               # 메인 진입점 및 SPA 화면 템플릿, 모달, 상점 UI
├── AGRULES.md               # AntiGravity 에이전트 작업 하네스 및 버전 관리 규칙
├── README.md                # 프로젝트 소개 및 문서
├── css/
│   ├── style.css            # 전역 디자인 시스템, 테마, 반응형 레이아웃
│   └── games/               # 각 게임별 전용 스타일시트
├── js/
│   ├── app.js               # 메인 컨트롤러 (화면 전환, 채팅, 방 생성/입장, 상점)
│   ├── p2p.js               # WebRTC PeerJS 연결 및 패킷 송수신 브로드캐스트 모듈
│   ├── firebase.js          # Firebase RTDB 전역 로비, 방 목록, 실시간 접속자, 문의 관리
│   ├── supabase.js          # Supabase 사용자 인증, 전적, 상점 인벤토리 관리
│   ├── sound.js             # Web Audio API 기반 효과음 및 BGM 합성기
│   ├── games/               # 13종 미니게임 독립 모듈
│   │   ├── chesswarfare.js
│   │   ├── janggi.js
│   │   ├── alkkagi.js
│   │   ├── quoridor.js
│   │   ├── gomoku.js
│   │   ├── baskin31.js
│   │   ├── roulette.js
│   │   ├── wordchain.js
│   │   ├── apple.js
│   │   ├── typing.js
│   │   ├── catchmind.js
│   │   ├── yutnori.js
│   │   └── yacht.js
│   └── words.js             # 끝말잇기 단어 사전 데이터
```

---

## 🚀 로컬 실행 방법 (Getting Started)

별도의 `npm install`이나 복잡한 빌드 과정 없이, 정적 웹 서버만으로 즉시 실행할 수 있습니다.

1. **저장소 클론**
   ```bash
   git clone https://github.com/mellowhales/gachi-acade.git
   cd gachi-acade
   ```

2. **로컬 서버 실행 (예: Live Server, Python, Node.js http-server 등)**
   ```bash
   # Python 3 이용 시
   python -m http.server 8080

   # Node.js npx 이용 시
   npx serve .
   ```

3. **브라우저 접속**
   ```text
   http://localhost:8080
   ```

---

## 📜 버전 관리 (Changelog)

- **v1.1.0** (2026-09)
  - 환경설정 초기화 버튼 제거 및 업데이트 내역 스크롤 UI 개선
  - 승리 세레머니 미리보기 버그 수정 (캔버스 최상위 레이어 이동 및 재생 제어)
  - 네모난 레트로 픽셀 아바타 테두리 8종 추가
  - 무지개색 아이템(닉네임, 프로필 카드, 말풍선, 테두리, 승리 세레머니) 도입 및 상점 아이템 명칭 단순화
- **v1.0.2** (2026-09)
  - 설정 정보 탭 내 사이트 설명 제거 및 스크롤 가능한 버전 변경 이력 박스(Changelog) UI 개편
  - `AGRULES.md` 내 매 패치 시 한 줄 요약 자동 기록 규칙 반영
- **v1.0.1** (2026-09)
  - 방 입장 및 게임 복귀 시 방 채팅창 최하단 자동 스크롤 기능 추가
  - 환경 설정 내 고객지원/버그 문의 접수 무한 로딩 버그 수정 (타임아웃 방어 및 로컬 안전 백업)
  - 상점 구매 반응성 개선 및 알까기 핑 지연 보정
  - `README.md` 및 `AGRULES.md` 작업 표준 체계 도입
- **v1.0.0** (2026-09)
  - 13종 아케이드 게임 정식 라인업 구축
  - Supabase 유저 계정 및 상점(테두리, 프로필 카드, 말풍선 스킨) 런칭
  - Firebase 실시간 로비 및 PeerJS P2P 통신 최적화

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
