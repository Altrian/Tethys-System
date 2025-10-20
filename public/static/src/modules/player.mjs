// --- Global shared audio cache ---
const audioCache = new Map();

/**
 * Create a custom audio player inside a container
 * @param {HTMLElement} container
 * @param {Object} options
 */
export function createAudioPlayer(container, options = {}) {
  const {
    showProgress = true,
    showTime = true,
    showVolume = true,
    src,
    playerId = `player-${Math.random().toString(36).slice(2)}`
  } = options;

  // --- Clear container ---
  container.replaceChildren();

  // --- Create elements ---
  const audio = document.createElement('audio');
  audio.id = playerId;
  audio.dataset.player = playerId;
  audio.preload = 'metadata';
  container.append(audio);

  const playPauseBtn = document.createElement('button');
  playPauseBtn.id = 'play-pause';
  playPauseBtn.setAttribute('aria-label', 'Play');
  playPauseBtn.setAttribute('aria-controls', playerId);
  playPauseBtn.textContent = '▶️';
  container.append(playPauseBtn);

  let progressContainer = null;
  let progressSlider = null;
  let timeDisplay = null;

  if (showProgress || showTime) {
    progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';

    if (showProgress) {
      progressSlider = document.createElement('input');
      progressSlider.type = 'range';
      progressSlider.id = 'progress-slider';
      progressSlider.min = '0';
      progressSlider.max = '100';
      progressSlider.step = '0.01';
      progressSlider.value = '0';
      progressSlider.setAttribute('aria-label', 'Seek through audio');
      progressSlider.setAttribute('aria-controls', playerId);
      progressContainer.append(progressSlider);
    }

    if (showTime) {
      timeDisplay = document.createElement('span');
      timeDisplay.id = 'time-display';
      timeDisplay.setAttribute('aria-live', 'off');
      timeDisplay.textContent = '00:00 / 00:00';
      progressContainer.append(timeDisplay);
    }

    container.append(progressContainer);
  }

  let volumeContainer = null;
  let muteBtn = null;
  let volumeSlider = null;

  if (showVolume) {
    volumeContainer = document.createElement('div');
    volumeContainer.className = 'volume-container';

    muteBtn = document.createElement('button');
    muteBtn.id = 'mute-toggle';
    muteBtn.setAttribute('aria-label', 'Mute');
    muteBtn.setAttribute('aria-controls', playerId);
    muteBtn.textContent = '🔊';

    volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.id = 'volume-slider';
    volumeSlider.min = '0';
    volumeSlider.max = '1';
    volumeSlider.step = '0.01';
    volumeSlider.value = '1';
    volumeSlider.setAttribute('aria-label', 'Volume control');
    volumeSlider.setAttribute('aria-controls', playerId);

    volumeContainer.append(muteBtn);
    volumeContainer.append(volumeSlider);
    container.append(volumeContainer);
  }

  // --- State ---
  let lastVolume = 1;
  let rafId = null;

  // --- Helpers ---
  const getStorageKey = () => `playerVolume::${audio.dataset.player}`;

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const updateMuteIcon = (v) => {
    if (!muteBtn) return;
    if (v === 0) muteBtn.textContent = '🔇';
    else if (v < 0.5) muteBtn.textContent = '🔉';
    else muteBtn.textContent = '🔊';
  };

  const updateTimeDisplay = () => {
    if (!timeDisplay) return;
    const current = formatTime(audio.currentTime);
    const total = formatTime(audio.duration);
    timeDisplay.textContent = `${current} / ${total}`;
  };

  const updateProgressSmooth = () => {
    if (showProgress && audio.duration > 0) {
      const progress = (audio.currentTime / audio.duration) * 100;
      progressSlider.value = progress || 0;
      updateTimeDisplay();
      rafId = requestAnimationFrame(updateProgressSmooth);
    }
  };

  const togglePlay = () => {
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const onPlay = () => {
    playPauseBtn.textContent = '⏸️';
    playPauseBtn.setAttribute('aria-label', 'Pause');
    updateProgressSmooth();
  };

  const onPause = () => {
    playPauseBtn.textContent = '▶️';
    playPauseBtn.setAttribute('aria-label', 'Play');
    cancelAnimationFrame(rafId);
  };

  const onEnd = () => {
    if (showProgress) progressSlider.value = 0;
    playPauseBtn.textContent = '▶️';
    const total = formatTime(audio.duration);
    if (timeDisplay) timeDisplay.textContent = `00:00 / ${total}`;
    cancelAnimationFrame(rafId);
  };

  const setVolume = () => {
    if (!volumeSlider) return;
    const v = parseFloat(volumeSlider.value);
    audio.volume = v;
    localStorage.setItem(getStorageKey(), v);
    updateMuteIcon(v);
  };

  const toggleMute = () => {
    if (!volumeSlider) return;
    if (audio.volume > 0) {
      lastVolume = audio.volume;
      audio.volume = 0;
      volumeSlider.value = 0;
    } else {
      audio.volume = lastVolume || 1;
      volumeSlider.value = audio.volume;
    }
    localStorage.setItem(getStorageKey(), audio.volume);
    updateMuteIcon(audio.volume);
  };

  const seek = () => {
    if (!progressSlider || !audio.duration) return;
    const seekTime = (progressSlider.value / 100) * audio.duration;
    audio.currentTime = seekTime;
  };

  // --- New Feature: Cached Audio Source ---
  async function setSource(url) {
    if (!url) return;

    // Reuse cached blob URL if available
    if (audioCache.has(url)) {
      audio.src = audioCache.get(url);
      return;
    }

    // Otherwise fetch and cache
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load audio: ${url}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    audioCache.set(url, blobUrl);
    audio.src = blobUrl;
  }

  // --- Initialization ---
  const init = async () => {
    const savedVolume = localStorage.getItem(getStorageKey());
    if (savedVolume !== null && showVolume) {
      audio.volume = parseFloat(savedVolume);
      volumeSlider.value = savedVolume;
      updateMuteIcon(audio.volume);
    }

    playPauseBtn.addEventListener('click', togglePlay);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('loadedmetadata', updateTimeDisplay);
    audio.addEventListener('durationchange', updateTimeDisplay);

    if (showVolume) {
      volumeSlider.addEventListener('input', setVolume);
      muteBtn.addEventListener('click', toggleMute);
    }

    if (showProgress) {
      progressSlider.addEventListener('input', seek);
    }

    if (src) await setSource(src);
  };

  init();

  return {
    play: () => audio.play(),
    pause: () => audio.pause(),
    togglePlay,
    toggleMute,
    setVolume,
    seek,
    setSource, // 👈 new method to switch track efficiently
    updateTimeDisplay,
    destroy: () => {
      playPauseBtn.removeEventListener('click', togglePlay);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('loadedmetadata', updateTimeDisplay);
      audio.removeEventListener('durationchange', updateTimeDisplay);
      if (showVolume) {
        volumeSlider.removeEventListener('input', setVolume);
        muteBtn.removeEventListener('click', toggleMute);
      }
      if (showProgress) {
        progressSlider.removeEventListener('input', seek);
      }
      cancelAnimationFrame(rafId);
    },
  };
}
