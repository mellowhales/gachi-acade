# 가치아케이드 (GachiArcade)

[![Version](https://img.shields.io/badge/version-1.1.2-blue.svg)](https://github.com/mellowhales/gachi-acade)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

웹 브라우저에서 별도 설치 없이 링크를 통해 즐길 수 있는 실시간 멀티플레이 웹 아케이드 플랫폼입니다.

- 서비스 URL: https://gachiarcade.kro.kr
- 라이선스: MIT

---

## 주요 기능

- 무설치 P2P 실시간 멀티플레이: WebRTC(PeerJS) 기반 데이터 채널을 통한 초저지연 동기화 대전 지원
- 실시간 로비 및 방 관리: Firebase Realtime Database를 통한 실시간 방 생성, 목록 조회 및 참가
- 계정 및 상점 시스템: Supabase 기반 유저 계정, 승패 전적, 코인 및 커스터마이징 아이템(테두리, 프로필 카드, 말풍선, 닉네임)
- 실시간 인게임/로비 채팅 및 모바일 터치 제스처를 지원하는 반응형 웹 환경
- Web Audio API 기반 오디오 신디사이저 내장으로 별도 음원 로딩 지연 없는 사운드 출력

---

## 기술 스택

### Client
- Vanilla JavaScript (ES6+), HTML5 Canvas 2D, CSS3
- Web Audio API

### Networking & Realtime
- WebRTC (PeerJS)
- Firebase Realtime Database

### Backend & Cloud
- Supabase (PostgreSQL, Authentication)

---

## 프로젝트 구조

```text
├── index.html               # SPA 메인 페이지 및 템플릿
├── AGRULES.md               # 에이전트 작업 지침 및 버전 관리 규칙
├── README.md                # 프로젝트 문서
├── css/
│   ├── style.css            # 공통 스타일, 테마, 반응형 레이아웃
│   └── games/               # 게임별 개별 스타일
└── js/
    ├── app.js               # 메인 앱 컨트롤러
    ├── p2p.js               # PeerJS P2P 통신 모듈
    ├── firebase.js          # Firebase 실시간 로비 및 접속자 관리
    ├── supabase.js          # Supabase 인증 및 데이터 관리
    ├── sound.js             # Web Audio API 사운드 합성기
    ├── games/               # 미니게임 모듈
    └── words.js             # 끝말잇기 사전 데이터
```

---

## 로컬 실행 방법

정적 웹 서버 환경에서 바로 구동할 수 있습니다.

1. 저장소 복제
   ```bash
   git clone https://github.com/mellowhales/gachi-acade.git
   cd gachi-acade
   ```

2. 로컬 서버 실행
   ```bash
   # Python 3
   python -m http.server 8080

   # Node.js
   npx serve .
   ```

3. 브라우저 접속
   ```text
   http://localhost:8080
   ```

---

## 변경 이력 (Changelog)

- v1.1.2 (2026-09)
  - 모바일 접속 중인 플레이어 세로 크기 축소 및 2열 다행 스크롤 그리드 전환
  - 모바일 방 목록 카드 필터 탭(전체/공개방/비밀방) 좌측 끝 밀착 정렬
  - PC 버전 상점 헤더 원상 롤백 및 아이템 카드/그리드 여백 대폭 확대
  - 모바일 전용 상점 헤더 개편 (1행: 상점-코인, 2행: 중앙 정렬 카테고리 탭)
- v1.1.1 (2026-09)
  - 로비 전체 채팅 상점 말풍선 미적용 (기본 텍스트 유지)
  - 로비 프로필 카드 상점 테두리 색상 미적용 버그 수정
  - 상점 아이템 명칭 및 설명 단순화
  - 모바일 로비 라이트 모드 프로필 그림자 제거 및 다크모드 배경 색상 불일치 수정
  - 모바일 방 목록/상점 카드 높이 축소 및 접속 중인 플레이어 목록 높이/스크롤 최적화
  - 상점 코인 표시 우측 반대편 배치 및 방 목록 돌아가기 버튼 제거
- v1.1.0 (2026-09)
  - 환경설정 초기화 버튼 제거 및 업데이트 내역 스크롤 UI 개선
  - 승리 세레머니 미리보기 버그 수정
  - 네모난 레트로 픽셀 아바타 테두리 8종 추가
  - 무지개색 아이템 도입 및 상점 아이템 명칭 단순화
- v1.0.2 (2026-09)
  - 설정 정보 탭 내 사이트 설명 제거 및 스크롤 가능한 버전 변경 이력 박스(Changelog) UI 개편
  - AGRULES.md 내 매 패치 시 한 줄 요약 자동 기록 규칙 반영
- v1.0.1 (2026-09)
  - 방 입장 및 게임 복귀 시 방 채팅창 최하단 자동 스크롤 기능 추가
  - 환경 설정 내 고객지원/버그 문의 접수 무한 로딩 버그 수정
  - 상점 구매 반응성 개선 및 알까기 핑 지연 보정
  - README.md 및 AGRULES.md 작업 표준 체계 도입
- v1.0.0 (2026-09)
  - 웹 아케이드 미니게임 정식 라인업 구축
  - Supabase 유저 계정 및 상점 런칭
  - Firebase 실시간 로비 및 PeerJS P2P 통신 최적화

---

## License

This project is licensed under the [MIT License](LICENSE).
