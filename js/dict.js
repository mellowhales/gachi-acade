/**
 * dict.js - 끄투코리아 429,580개 한국어 단어 사전 로더 & 고속 O(1) 검증 엔진
 * - 브라우저 IndexedDB 로컬 캐싱을 통해 1회 로드 후 0ms 즉시 기동
 * - 메모리 Set<string> 자료구조로 단어 유효성 검사 시간 0.001ms 달성
 */
const KkutuDict = (() => {
  'use strict';

  const DB_NAME = 'KkutuDictDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'dictionary';
  const DICT_KEY = 'dict_ko_data';
  const DICT_URL = 'data/dict_ko.txt';

  let _wordSet = new Set();
  let _isLoaded = false;
  let _loadPromise = null;

  /**
   * IndexedDB 열기
   */
  function _openDB() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    });
  }

  /**
   * IndexedDB에서 캐시된 단어 목록 불러오기
   */
  async function _loadFromIDB() {
    try {
      const db = await _openDB();
      if (!db) return null;

      return new Promise((resolve) => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(DICT_KEY);
        req.onsuccess = (e) => {
          if (e.target.result && typeof e.target.result === 'string') {
            resolve(e.target.result);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  }

  /**
   * IndexedDB에 단어 목록 저장
   */
  async function _saveToIDB(text) {
    try {
      const db = await _openDB();
      if (!db) return;

      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(text, DICT_KEY);
    } catch (_) {}
  }

  /**
   * 텍스트 데이터를 Set으로 변환
   */
  function _populateSet(rawText) {
    _wordSet.clear();
    const lines = rawText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const w = lines[i].trim();
      if (w.length >= 2) {
        _wordSet.add(w);
      }
    }
    _isLoaded = true;
    console.log(`[KkutuDict] 끄투코리아 단어 사전 ${_wordSet.size.toLocaleString()}개 로드 완료`);
  }

  /**
   * 사전 로드 메인 함수 (비동기)
   */
  async function init() {
    if (_isLoaded) return _wordSet;
    if (_loadPromise) return _loadPromise;

    _loadPromise = (async () => {
      // 1. IndexedDB 캐시 확인
      const cached = await _loadFromIDB();
      if (cached && cached.length > 1000) {
        _populateSet(cached);
        return _wordSet;
      }

      // 2. 캐시 없으면 fetch로 가져오기
      try {
        const res = await fetch(DICT_URL);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const text = await res.text();
        _populateSet(text);
        // 백그라운드에서 IDB에 저장
        _saveToIDB(text);
      } catch (err) {
        console.error('[KkutuDict] 단어 사전 파일 로드 실패:', err);
      }

      return _wordSet;
    })();

    return _loadPromise;
  }

  /**
   * 단어 존재 여부 동기 확인 (O(1))
   * @param {string} word - 검사할 단어
   * @returns {boolean}
   */
  function has(word) {
    if (!_wordSet || _wordSet.size === 0) return false;
    return _wordSet.has(word.trim());
  }

  /**
   * 사전 로드 준비 여부
   */
  function isReady() {
    return _isLoaded && _wordSet.size > 0;
  }

  /**
   * 로드 보장
   */
  async function ensureLoaded() {
    if (isReady()) return true;
    await init();
    return isReady();
  }

  /**
   * 전체 단어 수
   */
  function getWordCount() {
    return _wordSet.size;
  }

  // 브라우저 로딩 시 즉시 백그라운드 로드 시작
  if (typeof window !== 'undefined') {
    setTimeout(init, 50);
  }

  return {
    init,
    has,
    isReady,
    ensureLoaded,
    getWordCount
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = KkutuDict;
}
