/**
 * supabase.js - Supabase 클라이언트 & 인증/프로필 관리 모듈
 */
const AppSupabase = (() => {
  'use strict';

  let _client = null;
  let _currentUser = null;
  let _authListeners = [];

  /**
   * Supabase 설정이 완료되었는지 확인
   */
  function isConfigured() {
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg) return false;
    const hasUrl = typeof cfg.url === 'string' && cfg.url.trim().startsWith('https://');
    const hasKey = typeof cfg.anonKey === 'string' && cfg.anonKey.trim().length > 20;
    return hasUrl && hasKey;
  }

  /**
   * Supabase 클라이언트 초기화 및 반환
   */
  function getClient() {
    if (_client) return _client;
    if (!isConfigured()) return null;

    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
      console.warn('[Supabase] Supabase JS SDK가 로드되지 않았습니다.');
      return null;
    }

    try {
      _client = window.supabase.createClient(
        window.SUPABASE_CONFIG.url.trim(),
        window.SUPABASE_CONFIG.anonKey.trim()
      );
      return _client;
    } catch (err) {
      console.error('[Supabase] 클라이언트 초기화 실패:', err);
      return null;
    }
  }

  /**
   * 앱 시작 시 세션 자동 복원 및 리스너 등록
   */
  async function init() {
    const client = getClient();
    if (!client) return null;

    try {
      const { data: { session } } = await client.auth.getSession();
      _currentUser = session ? session.user : null;

      client.auth.onAuthStateChange((event, session) => {
        _currentUser = session ? session.user : null;
        _authListeners.forEach(fn => {
          try { fn(event, session, _currentUser); } catch (e) { console.error(e); }
        });
      });

      return _currentUser;
    } catch (err) {
      console.error('[Supabase] 세션 확인 에러:', err);
      return null;
    }
  }

  /**
   * 인증 상태 변경 리스너 등록
   */
  function onAuthStateChange(callback) {
    if (typeof callback === 'function') {
      _authListeners.push(callback);
    }
  }

  /**
   * 현재 로그인된 사용자 정보 반환
   */
  function getCurrentUser() {
    return _currentUser;
  }

  /**
   * 회원가입
   */
  async function signUp(email, password, nickname = '플레이어', avatarIcon = 'fa-solid fa-dog', avatarColor = '#38a169') {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'Supabase 설정(URL/키)이 완료되지 않았습니다. js/supabase-config.js를 확인해주세요.' };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            nickname: nickname.trim().slice(0, 8),
            avatar_icon: avatarIcon,
            avatar_color: avatarColor
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const user = data.user;
      if (user) {
        // profiles 테이블에 동기화 저장 시도 (실패해도 무방)
        await saveProfile(user.id, {
          email: user.email,
          nickname: nickname.trim().slice(0, 8),
          avatar_icon: avatarIcon,
          avatar_color: avatarColor
        }).catch(() => {});
      }

      return {
        success: true,
        user: user,
        session: data.session,
        needsEmailConfirmation: !data.session && !!user
      };
    } catch (err) {
      return { success: false, error: err.message || '회원가입 처리 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 로그인
   */
  async function signIn(email, password) {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'Supabase 설정(URL/키)이 완료되지 않았습니다. js/supabase-config.js를 확인해주세요.' };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      _currentUser = data.user;
      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (err) {
      return { success: false, error: err.message || '로그인 처리 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 로그아웃
   */
  async function signOut() {
    const client = getClient();
    if (!client) return { success: true };

    try {
      const { error } = await client.auth.signOut();
      if (error) return { success: false, error: error.message };
      _currentUser = null;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 클라우드 프로필 로드 (DB profiles 테이블 -> user_metadata 순서)
   */
  async function loadProfile(userId) {
    const client = getClient();
    if (!client || !userId) return null;

    try {
      // 1. profiles 테이블 조회 시도
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          nickname: data.nickname || '플레이어',
          avatarIcon: data.avatar_icon || 'fa-solid fa-dog',
          avatarColor: data.avatar_color || '#38a169'
        };
      }

      // 2. fallback: user_metadata
      if (_currentUser && _currentUser.id === userId && _currentUser.user_metadata) {
        const meta = _currentUser.user_metadata;
        return {
          nickname: meta.nickname || '플레이어',
          avatarIcon: meta.avatar_icon || 'fa-solid fa-dog',
          avatarColor: meta.avatar_color || '#38a169'
        };
      }

      return null;
    } catch (err) {
      console.warn('[Supabase] 프로필 로드 경고:', err);
      return null;
    }
  }

  /**
   * 클라우드 프로필 저장 (DB profiles 테이블 + user_metadata)
   */
  async function saveProfile(userId, profileData) {
    const client = getClient();
    if (!client || !userId) return false;

    const payload = {
      id: userId,
      nickname: profileData.nickname || '플레이어',
      avatar_icon: profileData.avatarIcon || profileData.avatar_icon || 'fa-solid fa-dog',
      avatar_color: profileData.avatarColor || profileData.avatar_color || '#38a169',
      updated_at: new Date().toISOString()
    };
    if (profileData.email) payload.email = profileData.email;

    try {
      // 1. user_metadata 업데이트
      client.auth.updateUser({
        data: {
          nickname: payload.nickname,
          avatar_icon: payload.avatar_icon,
          avatar_color: payload.avatar_color
        }
      }).catch(() => {});

      // 2. profiles 테이블 upsert
      const { error } = await client
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('[Supabase] profiles 테이블 저장 실패 (테이블 미생성 가능성):', error.message);
      }
      return true;
    } catch (err) {
      console.warn('[Supabase] 프로필 저장 에러:', err);
      return false;
    }
  }

  return {
    isConfigured,
    getClient,
    init,
    onAuthStateChange,
    getCurrentUser,
    signUp,
    signIn,
    signOut,
    loadProfile,
    saveProfile
  };
})();

if (typeof window !== 'undefined') {
  window.AppSupabase = AppSupabase;
}
