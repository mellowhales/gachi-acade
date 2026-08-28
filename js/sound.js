/**
 * sound.js - Web Audio API 기반 무설치 초경량 사운드 & BGM 엔진
 * (외부 mp3 파일 다운로드 없이 0ms 즉각 반응하는 고품질 합성 효과음 및 감성 BGM)
 */
const Sound = (() => {
  'use strict';

  let _ctx = null;
  let _sfxMuted = localStorage.getItem('arcade_sfx_muted') === 'true';
  let _bgmMuted = localStorage.getItem('arcade_bgm_muted') === 'true';

  let _sfxVolume = parseFloat(localStorage.getItem('arcade_sfx_vol') || '0.7');
  let _bgmVolume = parseFloat(localStorage.getItem('arcade_bgm_vol') || '0.35');

  let _bgmPlaying = false;
  let _bgmTimer = null;
  let _bgmMasterGain = null;
  let _bgmStep = 0;

  function _getCtx() {
    if (!_ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        _ctx = new AudioCtx();
      }
    }
    if (_ctx && _ctx.state === 'suspended') {
      _ctx.resume().catch(() => {});
    }
    return _ctx;
  }

  function _unlock() {
    const ctx = _getCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        if (!_bgmMuted && !_bgmPlaying) {
          startBgm();
        }
      }).catch(() => {});
    } else {
      if (!_bgmMuted && !_bgmPlaying) {
        startBgm();
      }
    }
  }
  window.addEventListener('click', _unlock, { once: true, passive: true });
  window.addEventListener('keydown', _unlock, { once: true, passive: true });
  window.addEventListener('touchstart', _unlock, { once: true, passive: true });

  /* ═══════════════════════════════════════════════════════════════════
     BGM 신디사이저 엔진 (로비 트랙 / 끝말잇기 전용 긴박 가속 트랙)
     ═══════════════════════════════════════════════════════════════════ */
  let _currentTrack = 'lobby';
  let _baseInterval = 240;
  let _currentInterval = 240;

  // 1. 로비 기본 감성 트랙 (C -> G -> Am -> F)
  const LOBBY_NOTES = [
    261.63, 329.63, 392.00, 523.25, 392.00, 329.63,
    196.00, 246.94, 293.66, 392.00, 293.66, 246.94,
    220.00, 261.63, 329.63, 440.00, 329.63, 261.63,
    174.61, 220.00, 261.63, 349.23, 261.63, 220.00
  ];
  const LOBBY_BASS = [130.81, 130.81, 98.00, 98.00, 110.00, 110.00, 87.31, 87.31];

  // 2. 끝말잇기 전용 스피디 긴박 트랙 (Am -> F -> Dm -> E7 댄스 배틀 스타일)
  const WORDCHAIN_NOTES = [
    // Am
    440.00, 523.25, 659.25, 523.25, 440.00, 523.25, 659.25, 880.00,
    // F
    349.23, 440.00, 523.25, 440.00, 349.23, 440.00, 523.25, 698.46,
    // Dm
    293.66, 349.23, 440.00, 349.23, 293.66, 349.23, 440.00, 587.33,
    // E7
    329.63, 415.30, 493.88, 415.30, 329.63, 415.30, 493.88, 659.25
  ];
  const WORDCHAIN_BASS = [
    110.00, 110.00, 110.00, 110.00, // A2
    87.31, 87.31, 87.31, 87.31,     // F2
    73.42, 73.42, 73.42, 73.42,     // D2
    82.41, 82.41, 82.41, 82.41      // E2
  ];

  function startBgm(track = 'lobby') {
    if (_bgmMuted) {
      _currentTrack = track;
      return;
    }
    const ctx = _getCtx();
    if (!ctx) return;

    if (_bgmPlaying && _currentTrack === track) return;

    stopBgm();
    _currentTrack = track;
    _bgmPlaying = true;
    _bgmStep = 0;

    _baseInterval = (track === 'wordchain') ? 165 : 240;
    _currentInterval = _baseInterval;

    if (!_bgmMasterGain) {
      _bgmMasterGain = ctx.createGain();
      _bgmMasterGain.connect(ctx.destination);
    }
    _bgmMasterGain.gain.setValueAtTime(_bgmVolume * 0.22, ctx.currentTime);

    _playBgmNote();
    _startBgmLoop();
  }

  function _startBgmLoop() {
    if (_bgmTimer) clearInterval(_bgmTimer);
    _bgmTimer = setInterval(_playBgmNote, _currentInterval);
  }

  // ── 시간에 비례한 실시간 BGM 가속 (배속) ──
  function setBgmSpeed(ratio = 1.0) {
    if (!_bgmPlaying || _currentTrack !== 'wordchain') return;
    // ratio: 1.0 (최대 남은 시간) -> 0.0 (시간 다 됨)
    // 165ms (1.0x) -> 75ms (2.2x 초긴박 가속)
    const clamped = Math.max(0, Math.min(1, ratio));
    const targetInterval = Math.round(75 + clamped * (165 - 75));

    if (Math.abs(_currentInterval - targetInterval) >= 6) {
      _currentInterval = targetInterval;
      _startBgmLoop();
    }
  }

  function _playBgmNote() {
    if (!_bgmPlaying || _bgmMuted) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const isWordchain = (_currentTrack === 'wordchain');
      const notes = isWordchain ? WORDCHAIN_NOTES : LOBBY_NOTES;
      const bassNotes = isWordchain ? WORDCHAIN_BASS : LOBBY_BASS;

      // 1. 아르페지오 멜로디
      const noteFreq = notes[_bgmStep % notes.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isWordchain ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(noteFreq, now);

      const noteDuration = (_currentInterval / 1000) * 0.95;
      gain.gain.setValueAtTime(_bgmVolume * (isWordchain ? 0.12 : 0.18), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + noteDuration);

      osc.connect(gain);
      gain.connect(_bgmMasterGain);

      osc.start(now);
      osc.stop(now + noteDuration + 0.01);

      // 2. 묵직하고 신나는 베이스 비트
      const bassStepInterval = isWordchain ? 2 : 3;
      if (_bgmStep % bassStepInterval === 0) {
        const bassIdx = Math.floor((_bgmStep % notes.length) / bassStepInterval) % bassNotes.length;
        const bassFreq = bassNotes[bassIdx];

        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();

        bassOsc.type = isWordchain ? 'triangle' : 'sine';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        const bassDuration = noteDuration * bassStepInterval;
        bassGain.gain.setValueAtTime(_bgmVolume * (isWordchain ? 0.28 : 0.24), now);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, now + bassDuration);

        bassOsc.connect(bassGain);
        bassGain.connect(_bgmMasterGain);

        bassOsc.start(now);
        bassOsc.stop(now + bassDuration + 0.02);
      }

      _bgmStep++;
    } catch (_) {}
  }

  function stopBgm() {
    _bgmPlaying = false;
    if (_bgmTimer) {
      clearInterval(_bgmTimer);
      _bgmTimer = null;
    }
  }

  function setBgmVolume(val) {
    _bgmVolume = Math.max(0, Math.min(1, parseFloat(val)));
    localStorage.setItem('arcade_bgm_vol', _bgmVolume);
    if (_bgmMasterGain && _ctx) {
      _bgmMasterGain.gain.setValueAtTime(_bgmMuted ? 0 : _bgmVolume * 0.22, _ctx.currentTime);
    }
    if (_bgmVolume > 0 && !_bgmMuted && !_bgmPlaying) {
      startBgm();
    }
  }

  function setSfxVolume(val) {
    _sfxVolume = Math.max(0, Math.min(1, parseFloat(val)));
    localStorage.setItem('arcade_sfx_vol', _sfxVolume);
  }

  function toggleBgmMute() {
    _bgmMuted = !_bgmMuted;
    localStorage.setItem('arcade_bgm_muted', _bgmMuted);
    if (_bgmMuted) {
      stopBgm();
    } else {
      startBgm();
    }
    return _bgmMuted;
  }

  function toggleSfxMute() {
    _sfxMuted = !_sfxMuted;
    localStorage.setItem('arcade_sfx_muted', _sfxMuted);
    return _sfxMuted;
  }

  /* ═══════════════════════════════════════════════════════════════════
     효과음 (SFX)
     ═══════════════════════════════════════════════════════════════════ */
  function playClick() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);

      gain.gain.setValueAtTime(0.12 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch (_) {}
  }

  function playReady() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);

      gain.gain.setValueAtTime(0.18 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch (_) {}
  }

  function playStart() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const start = ctx.currentTime + idx * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.15 * _sfxVolume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.13);
      });
    } catch (_) {}
  }

  function playCountdown(num) {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = num === 1 ? 880 : (num === 2 ? 660 : 440);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.15 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.095);
    } catch (_) {}
  }

  function playChat() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      gain.gain.setValueAtTime(0.1 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.075);
    } catch (_) {}
  }

  function playStone() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);

      gain.gain.setValueAtTime(0.25 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }

  function playApplePop() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.08);

      gain.gain.setValueAtTime(0.2 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.095);
    } catch (_) {}
  }

  function playTypeKey() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = 1200 + Math.random() * 300;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);

      gain.gain.setValueAtTime(0.08 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch (_) {}
  }

  function playWordSubmit() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const start = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2 * _sfxVolume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.18);
      });
    } catch (_) {}
  }

  function playBaskinPick() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.06);

      gain.gain.setValueAtTime(0.18 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (_) {}
  }

  function playWin() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const start = ctx.currentTime + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2 * _sfxVolume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.17);
      });
    } catch (_) {}
  }

  function playLose() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const notes = [440, 415.30, 392, 349.23];
      notes.forEach((freq, idx) => {
        const start = ctx.currentTime + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.15 * _sfxVolume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch (_) {}
  }

  function playError() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [150, 110].forEach((freq, idx) => {
        const start = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.18 * _sfxVolume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.13);
      });
    } catch (_) {}
  }

  /* ═══════════════════════════════════════════════════════════════════
     윷놀이 & 캐치마인드 전용 Web Audio 신디사이저 사운드
     ═══════════════════════════════════════════════════════════════════ */
  // 1. 윷 던지기 (나무 윷가락 4개가 부딪히며 공중에 튀어 착지하는 소리)
  function playYutThrow() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 4개의 윷가락이 짤깍거리며 바닥에 튀는 노이즈 + 목재 타격음
      [0, 0.04, 0.08, 0.13, 0.22].forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(320 + i * 90, now + t);
        osc.frequency.exponentialRampToValueAtTime(120, now + t + 0.05);

        gain.gain.setValueAtTime(0.22 * _sfxVolume, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + t);
        osc.stop(now + t + 0.06);
      });
    } catch (_) {}
  }

  // 2. 윷패 결과 발표음
  function playYutResult(key) {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      if (key === 'yut' || key === 'mo') {
        // 🌟 윷/모 대박 팡파레! (경쾌한 상승 브라스 팡파레)
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
          const start = now + idx * 0.06;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.25 * _sfxVolume, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.24);
        });
      } else if (key === 'backdo') {
        // 빽도 (익살스러운 하강 슬라이드)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

        gain.gain.setValueAtTime(0.18 * _sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.26);
      } else {
        // 도 / 개 / 걸 (밝고 경쾌한 목탁/실로폰 차임)
        const stepsMap = { do: [523.25], gae: [523.25, 659.25], geol: [523.25, 659.25, 783.99] };
        const notes = stepsMap[key] || [523.25, 659.25];
        notes.forEach((freq, idx) => {
          const start = now + idx * 0.07;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.22 * _sfxVolume, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.2);
        });
      }
    } catch (_) {}
  }

  // 3. 말 선택 (톡 터치음)
  function playPieceSelect() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.05);

      gain.gain.setValueAtTime(0.15 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (_) {}
  }

  // 4. 말 이동 및 착지 (윷판 위에 탁 놓이는 묵직한 착지음)
  function playPieceMove() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

      gain.gain.setValueAtTime(0.24 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (_) {}
  }

  // 5. 상대 말 잡기 (호쾌한 타격음 + 승리 쾌감)
  function playPieceCatch() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 1) 묵직한 펀치 타격음
      const hitOsc = ctx.createOscillator();
      const hitGain = ctx.createGain();
      hitOsc.type = 'sawtooth';
      hitOsc.frequency.setValueAtTime(320, now);
      hitOsc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

      hitGain.gain.setValueAtTime(0.3 * _sfxVolume, now);
      hitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      hitOsc.connect(hitGain);
      hitGain.connect(ctx.destination);
      hitOsc.start(now);
      hitOsc.stop(now + 0.13);

      // 2) 신나는 쾌감 챠임
      [659.25, 880, 1046.5].forEach((freq, idx) => {
        const start = now + 0.08 + idx * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.22 * _sfxVolume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.17);
      });
    } catch (_) {}
  }

  // 6. 말 업기 (파워업 상승 화음)
  function playPieceStack() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const start = now + idx * 0.05;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2 * _sfxVolume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.16);
      });
    } catch (_) {}
  }

  // 7. 완주 골인 (환호 팡파레)
  function playPieceGoal() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      notes.forEach((freq, idx) => {
        const start = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25 * _sfxVolume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.28);
      });
    } catch (_) {}
  }

  // 8. 딩동 (캐치마인드 제시어 알림)
  function playDing() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [880, 1174.66].forEach((freq, idx) => {
        const start = now + idx * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.22 * _sfxVolume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.28);
      });
    } catch (_) {}
  }

  // 9. 째깍 (카운트다운)
  function playTick() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.12 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }

  // 10. 주사위 순차 정렬 안착 톤 (도 레 미 파 솔 올라가는 영롱한 목탁/유리 톤)
  function playDiceAlign(step = 0) {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freqs = [440, 523.25, 587.33, 659.25, 783.99]; // A4, C5, D5, E5, G5
      const f = freqs[step % freqs.length] || 523.25;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.08, now + 0.08);

      gain.gain.setValueAtTime(0.18 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch (_) {}
  }

  // 11. 야추 족보(4 of a Kind, 풀하우스, 스트레이트, 야추) 달성 시 알림 팡파르
  function playComboAnnouncement(isYacht = false) {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = isYacht ? [523.25, 659.25, 783.99, 1046.50] : [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = isYacht ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);

        gain.gain.setValueAtTime(0.22 * _sfxVolume, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.32);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.34);
      });
    } catch (_) {}
  }

  // 12. 알까기 장기알 튕기기 (Flick) 효과음
  function playAlkkagiFlick(powerRatio = 0.5) {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const p = Math.max(0.1, Math.min(1.0, powerRatio));
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220 + p * 350, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      gain.gain.setValueAtTime(0.3 * p * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (_) {}
  }

  // 13. 알까기 장기알 충돌 (Hit/Clack) 효과음 - 묵직하고 맑은 나무알 부딪힘
  function playAlkkagiHit(impactSpeed = 1.0) {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const spd = Math.max(0.15, Math.min(2.0, impactSpeed));
      
      // 고주파 타격음 (딱!)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(680 + Math.random() * 80, now);
      osc1.frequency.exponentialRampToValueAtTime(160, now + 0.045);

      gain1.gain.setValueAtTime(0.35 * Math.min(1.0, spd) * _sfxVolume, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.055);

      // 저주파 원목 울림 (탁!)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(260 + Math.random() * 40, now);
      osc2.frequency.exponentialRampToValueAtTime(90, now + 0.06);

      gain2.gain.setValueAtTime(0.28 * Math.min(1.0, spd) * _sfxVolume, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.07);
    } catch (_) {}
  }

  // 14. 알까기 장기알 낙하 (Fall / Drop out) 효과음 - 호루라기/휘익 퐁!
  function playAlkkagiFall() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.28);

      gain.gain.setValueAtTime(0.32 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch (_) {}
  }

  // 15. 알까기 기물 선택 (Select / Drag touch) 효과음 - 묵직하고 둔탁한 목각 터치음 (툭!)
  function playAlkkagiSelect() {
    if (_sfxMuted || _sfxVolume <= 0) return;
    const ctx = _getCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);

      gain.gain.setValueAtTime(0.32 * _sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (_) {}
  }

  return {
    startBgm,
    stopBgm,
    setBgmSpeed,
    setBgmVolume,
    setSfxVolume,
    toggleBgmMute,
    toggleSfxMute,
    isBgmMuted: () => _bgmMuted,
    isSfxMuted: () => _sfxMuted,
    getBgmVolume: () => _bgmVolume,
    getSfxVolume: () => _sfxVolume,
    playClick,
    playReady,
    playStart,
    playCountdown,
    playChat,
    playStone,
    playApplePop,
    playTypeKey,
    playWordSubmit,
    playBaskinPick,
    playWin,
    playLose,
    playError,
    playYutThrow,
    playYutResult,
    playPieceSelect,
    playPieceMove,
    playPieceCatch,
    playPieceStack,
    playPieceGoal,
    playDing,
    playTick,
    playDiceAlign,
    playComboAnnouncement,
    playAlkkagiFlick,
    playAlkkagiHit,
    playAlkkagiFall,
    playAlkkagiSelect
  };
})();
