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

  isReady() {
    return !!_db;
  }
};

window.FirebaseLobby = FirebaseLobby;

// app.js가 준비를 기다릴 수 있도록 커스텀 이벤트 발행
window.dispatchEvent(new CustomEvent('firebase-ready'));
