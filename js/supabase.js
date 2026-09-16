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
   * OAuth 간편 로그인 (Google, Kakao, Naver 등)
   */
  async function signInWithOAuth(provider) {
    const client = getClient();
    if (!client) {
      return { success: false, error: 'Supabase가 설정되지 않았습니다.' };
    }
    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { data, error } = await client.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.warn(`[Supabase] ${provider} OAuth 로그인 오류:`, err);
      return { success: false, error: err.message || `${provider} 로그인 중 오류가 발생했습니다.` };
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
          nickname: data.nickname || null,
          avatarIcon: data.avatar_icon || null,
          avatarColor: data.avatar_color || null,
          stats: data.stats || null,
          coins: typeof data.coins === 'number' ? data.coins : (parseInt(data.coins, 10) || 0)
        };
      }

      // 2. fallback: user_metadata
      if (_currentUser && _currentUser.id === userId && _currentUser.user_metadata) {
        const meta = _currentUser.user_metadata;
        const oAuthName = meta.full_name || meta.name || meta.nickname || null;
        return {
          nickname: oAuthName ? oAuthName.slice(0, 8) : null,
          avatarIcon: meta.avatar_icon || null,
          avatarColor: meta.avatar_color || null,
          stats: meta.stats || null,
          coins: typeof meta.coins === 'number' ? meta.coins : 0
        };
      }

      return null;
    } catch (err) {
      console.warn('[Supabase] 프로필 로드 경고:', err);
      return null;
    }
  }

  /**
   * 클라우드 프로필 부분 저장 (전달된 필드만 안전하게 업데이트하여 프로필 초기화 방지)
   */
  async function saveProfile(userId, profileData) {
    const client = getClient();
    if (!client || !userId || !profileData || typeof profileData !== 'object') return false;

    const payload = {
      id: userId,
      updated_at: new Date().toISOString()
    };
    if (profileData.nickname) payload.nickname = profileData.nickname;
    if (profileData.avatarIcon || profileData.avatar_icon) {
      payload.avatar_icon = profileData.avatarIcon || profileData.avatar_icon;
    }
    if (profileData.avatarColor || profileData.avatar_color) {
      payload.avatar_color = profileData.avatarColor || profileData.avatar_color;
    }
    if (profileData.email) payload.email = profileData.email;
    if (profileData.stats !== undefined) payload.stats = profileData.stats;
    if (profileData.coins !== undefined) payload.coins = profileData.coins;

    try {
      // 1. user_metadata 부분 업데이트 (전달된 필드만 반영)
      const metaData = {};
      if (payload.nickname) metaData.nickname = payload.nickname;
      if (payload.avatar_icon) metaData.avatar_icon = payload.avatar_icon;
      if (payload.avatar_color) metaData.avatar_color = payload.avatar_color;
      if (payload.stats !== undefined) metaData.stats = payload.stats;
      if (payload.coins !== undefined) metaData.coins = payload.coins;

      if (Object.keys(metaData).length > 0) {
        client.auth.updateUser({ data: metaData }).catch(() => {});
      }

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

  /**
   * 유저 코인 증차 및 클라우드 저장
   */
  async function addCoins(userId, amount) {
    const client = getClient();
    if (!client || !userId || !amount) return null;

    try {
      const profile = await loadProfile(userId);
      const currentCoins = (profile && typeof profile.coins === 'number') ? profile.coins : 0;
      const newCoins = Math.max(0, currentCoins + amount);

      await saveProfile(userId, { coins: newCoins });
      return newCoins;
    } catch (err) {
      console.warn('[Supabase] 코인 지급 에러:', err);
      return null;
    }
  }

  /**
   * 특정 유저의 전적 및 프로필 조회 (상대방 전적 확인용)
   */
  async function fetchUserStats(userId) {
    const client = getClient();
    if (!client || !userId) return null;

    try {
      const { data, error } = await client
        .from('profiles')
        .select('id, nickname, avatar_icon, avatar_color, stats, coins')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          nickname: data.nickname || '플레이어',
          avatarIcon: data.avatar_icon || 'fa-solid fa-dog',
          avatarColor: data.avatar_color || '#38a169',
          stats: data.stats || null,
          coins: typeof data.coins === 'number' ? data.coins : 0
        };
      }
      return null;
    } catch (err) {
      console.warn('[Supabase] 상대 전적 조회 에러:', err);
      return null;
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
    signInWithOAuth,
    signOut,
    loadProfile,
    saveProfile,
    addCoins,
    fetchUserStats
  };
})();

if (typeof window !== 'undefined') {
  window.AppSupabase = AppSupabase;
}
