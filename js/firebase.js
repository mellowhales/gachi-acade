/**
 * firebase.js — Firebase v10 (ES Module CDN) 초기화 및 글로벌 로비 관리
 * window.FirebaseLobby 전역 객체를 통해 app.js와 통신합니다.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getDatabase, ref, set, get, remove, update,
  onValue, off, serverTimestamp, onDisconnect as dbOnDisconnect
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyBbDh0IsekvQ-HWtMq5gNYTWbg2vCfKlk4",
  authDomain: "acadeio.firebaseapp.com",
  projectId: "acadeio",
  storageBucket: "acadeio.firebasestorage.app",
  messagingSenderId: "842308981983",
  appId: "1:842308981983:web:707349072dac2d8324056a",
  measurementId: "G-7530Z1BKLJ",
  databaseURL: "https://acadeio-default-rtdb.firebaseio.com"
};

let _app, _db;
let _myRoomCode = null;
let _myRoomRef  = null;
let _lobbyListenerRef = null;

try {
  _app = initializeApp(firebaseConfig);
  _db  = getDatabase(_app);
  console.log('[Firebase] 초기화 완료');
} catch (e) {
  console.error('[Firebase] 초기화 실패:', e);
}

const FirebaseLobby = {
  /**
   * 방 생성 — Firebase /rooms/{code} 에 방 정보 등록 + onDisconnect 자동 삭제 훅
   */
  async registerRoom(roomCode, hostName, peerId, maxPlayers, hostAvatarIcon, hostAvatarColor, isPrivate, hasPassword) {
    if (!_db) return;
    _myRoomCode = roomCode;
    _myRoomRef  = ref(_db, `rooms/${roomCode}`);

    const roomData = {
      hostPeerId:      peerId,
      hostName:        hostName,
      hostAvatarIcon:  hostAvatarIcon || 'fa-solid fa-paw',
      hostAvatarColor: hostAvatarColor || '#38a169',
      playerCount:     1,
      maxPlayers:      maxPlayers || 5,
      isPrivate:       !!isPrivate,
      hasPassword:     !!hasPassword,
      status:          'waiting',
      createdAt:       Date.now()
    };

    try {
      await set(_myRoomRef, roomData);
      // 방장 브라우저가 꺼지거나 연결이 끊기면 자동으로 방 데이터 삭제
      dbOnDisconnect(_myRoomRef).remove();
      console.log('[Firebase] 방 등록 완료:', roomCode);
    } catch (err) {
      console.error('[Firebase] 방 등록 실패:', err);
    }
  },

  /**
   * 현재 인원 수 업데이트
   */
  async updatePlayerCount(roomCode, count) {
    if (!_db) return;
    const code = roomCode || _myRoomCode;
    if (!code) return;
    try {
      await update(ref(_db, `rooms/${code}`), { playerCount: count });
    } catch (err) {
      console.error('[Firebase] 인원 수 업데이트 실패:', err);
    }
  },

  /**
   * 방 수동 삭제 (방장이 방 나가기 클릭 시)
   */
  async removeRoom(roomCode) {
    if (!_db) return;
    const code = roomCode || _myRoomCode;
    if (!code) return;
    try {
      await remove(ref(_db, `rooms/${code}`));
      _myRoomCode = null;
      _myRoomRef  = null;
      console.log('[Firebase] 방 삭제 완료:', code);
    } catch (err) {
      console.error('[Firebase] 방 삭제 실패:', err);
    }
  },

  /**
   * 방장 위임 후 Firebase 방 정보 업데이트
   */
  async updateRoomHost(roomCode, newHostName, newHostPeerId) {
    if (!_db) return;
    const code = roomCode || _myRoomCode;
    if (!code) return;
    try {
      await update(ref(_db, `rooms/${code}`), {
        hostName:   newHostName,
        hostPeerId: newHostPeerId
      });
      console.log('[Firebase] 방장 정보 업데이트 완료');
    } catch (err) {
      console.error('[Firebase] 방장 정보 업데이트 실패:', err);
    }
  },

  /**
   * 게임 시작/종료 시 status 업데이트
   */
  async updateRoomStatus(roomCode, status) {
    if (!_db) return;
    const code = roomCode || _myRoomCode;
    if (!code) return;
    try {
      await update(ref(_db, `rooms/${code}`), { status });
    } catch (err) {
      console.error('[Firebase] status 업데이트 실패:', err);
    }
  },

  /**
   * 로비 실시간 수신 시작 (onValue)
   */
  onLobbyUpdate(callback) {
    if (!_db) return;
    _lobbyListenerRef = ref(_db, 'rooms');
    onValue(_lobbyListenerRef, (snapshot) => {
      callback(snapshot.val());
    }, (err) => {
      console.error('[Firebase] 로비 수신 오류:', err);
      callback(null);
    });
  },

  /**
   * 로비 수신 해제
   */
  offLobbyUpdate() {
    if (!_db || !_lobbyListenerRef) return;
    off(_lobbyListenerRef);
    _lobbyListenerRef = null;
  },

  /**
   * 🌟 실시간 사이트 접속자 등록 (방 목록과 100% 동일한 onDisconnect 자동 삭제)
   */
  async registerOnlineUser(userPayload) {
    if (!_db) return;
    let sessionKey = null;
    try {
      sessionKey = sessionStorage.getItem('gachi_presence_key');
      if (!sessionKey) {
        sessionKey = 'usr_' + Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem('gachi_presence_key', sessionKey);
      }
    } catch (_) {
      sessionKey = 'usr_' + Math.random().toString(36).substring(2, 10);
    }

    _myUserPresenceKey = sessionKey;
    _myUserPresenceRef = ref(_db, `online_users/${sessionKey}`);

    const payload = {
      ...userPayload,
      presenceKey: sessionKey,
      lastSeen: Date.now()
    };

    try {
      await set(_myUserPresenceRef, payload);
      // 브라우저 닫힘 / 강제 종료 시 Firebase 서버에서 즉시 자동 삭제
      dbOnDisconnect(_myUserPresenceRef).remove();

      // 15초 주기 하트비트로 생존 신호 최신화
      if (!_presenceHeartbeatInterval) {
        _presenceHeartbeatInterval = setInterval(() => {
          if (_myUserPresenceRef) {
            update(_myUserPresenceRef, { lastSeen: Date.now() }).catch(() => {});
          }
        }, 15000);
      }
    } catch (err) {
      console.warn('[Firebase] 접속자 등록 실패:', err);
    }
  },

  /**
   * 실시간 사이트 접속자 정보 업데이트 (닉네임/아바타/레벨 변경 시)
   */
  async updateOnlineUser(newPayload) {
    if (!_db || !_myUserPresenceRef) return;
    try {
      await update(_myUserPresenceRef, { ...newPayload, lastSeen: Date.now() });
    } catch (err) {
      console.warn('[Firebase] 접속자 정보 갱신 실패:', err);
    }
  },

  /**
   * 실시간 사이트 접속자 목록 수신 (방 목록과 동일한 onValue 실시간 푸시)
   */
  onOnlineUsersUpdate(callback) {
    if (!_db) return;
    _onlineUsersListenerRef = ref(_db, 'online_users');
    onValue(_onlineUsersListenerRef, (snapshot) => {
      const val = snapshot.val();
      const users = [];
      if (val && typeof val === 'object') {
        const now = Date.now();
        Object.keys(val).forEach(key => {
          const u = val[key];
          if (u && typeof u === 'object') {
            // 90초 이상 응답 없는 유령 세션 필터링
            if (!u.lastSeen || (now - u.lastSeen < 90000)) {
              users.push({ ...u, presenceKey: u.presenceKey || key });
            }
          }
        });
      }
      callback(users);
    }, (err) => {
      console.warn('[Firebase] 접속자 목록 수신 오류:', err);
      callback(null);
    });
  },

  /**
   * 접속자 목록 수동 즉시 새로고침
   */
  async refreshOnlineUsers() {
    if (!_db) return null;
    try {
      if (_myUserPresenceRef) {
        await update(_myUserPresenceRef, { lastSeen: Date.now() });
      }
      const snapshot = await get(ref(_db, 'online_users'));
      const val = snapshot.val();
      const users = [];
      if (val && typeof val === 'object') {
        const now = Date.now();
        Object.keys(val).forEach(key => {
          const u = val[key];
          if (u && typeof u === 'object') {
            if (!u.lastSeen || (now - u.lastSeen < 90000)) {
              users.push({ ...u, presenceKey: u.presenceKey || key });
            }
          }
        });
      }
      return users;
    } catch (err) {
      console.warn('[Firebase] 접속자 수동 갱신 오류:', err);
      return null;
    }
  },

  isReady() {
    return !!_db;
  }
};

let _myUserPresenceRef = null;
let _myUserPresenceKey = null;
let _onlineUsersListenerRef = null;
let _presenceHeartbeatInterval = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (_db && _myUserPresenceRef) {
      remove(_myUserPresenceRef).catch(() => {});
    }
  });
}

window.FirebaseLobby = FirebaseLobby;

// app.js가 준비를 기다릴 수 있도록 커스텀 이벤트 발행
window.dispatchEvent(new CustomEvent('firebase-ready'));
