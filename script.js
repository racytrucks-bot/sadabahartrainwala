/* =========================================================
   SADABAHAR TRAINWALA — MUSIC PLAYER SCRIPT
   ========================================================= */

// ---- CONFIG: edit this to update the playlist later ----
const YOUTUBE_PLAYLIST_ID = "RDKsiaTD9zGAo"; // from the provided playlist link

// ---- STATE ----
let player;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let isMuted = false;
let playlistLoaded = false;
let seekBarInterval = null;
let isSeeking = false;

// ---- DOM ----
const trackTitle = document.getElementById('trackTitle');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const muteBtn = document.getElementById('muteBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volValue = document.getElementById('volValue');
const discIcon = document.getElementById('discIcon');
const discThumb = document.getElementById('discThumb');
const discEmoji = document.getElementById('discEmoji');

const seekSlider = document.getElementById('seekSlider');
const currentTimeEl = document.getElementById('currentTime');
const durationTimeEl = document.getElementById('durationTime');

const playlistToggleBtn = document.getElementById('playlistToggleBtn');
const closePlaylistBtn = document.getElementById('closePlaylistBtn');
const playlistPanel = document.getElementById('playlistPanel');
const playlistList = document.getElementById('playlistList');

/* =========================================================
   1. YOUTUBE IFRAME API SETUP
   ========================================================= */
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.getElementsByTagName('script')[0].parentNode.insertBefore(tag, document.getElementsByTagName('script')[0]);

function onYouTubeIframeAPIReady() {
  player = new YT.Player('yt-player', {
    height: '2',
    width: '2',
    playerVars: {
      listType: 'playlist',
      list: YOUTUBE_PLAYLIST_ID,
      autoplay: 0,
      controls: 0,
      playsinline: 1,
      rel: 0
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerReady(e) {
  e.target.setVolume(volumeSlider.value);
  trackTitle.textContent = "Play dabao aur suno";
  buildPlaylistPanel();
}

function onPlayerStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    updatePlayIcon();
    updateNowPlayingTitle();
    updateThumbnail();
    highlightActivePlaylistItem();
    startSeekTracking();
    if (!playlistLoaded) buildPlaylistPanel();
  } else if (e.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    updatePlayIcon();
    stopSeekTracking();
  } else if (e.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    updatePlayIcon();
    stopSeekTracking();
  }
}

function updateNowPlayingTitle() {
  try {
    const data = player.getVideoData();
    if (data && data.title) {
      trackTitle.textContent = data.title;
      trackTitle.title = data.title;
    }
  } catch (err) { /* not ready yet */ }
}

function updateThumbnail() {
  try {
    const data = player.getVideoData();
    if (data && data.video_id) {
      discThumb.src = `https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg`;
      discThumb.style.display = "block";
      discEmoji.style.display = "none";
    }
  } catch (err) { /* not ready yet */ }
}

function updatePlayIcon() {
  playPauseBtn.textContent = isPlaying ? "⏸" : "▶️";
  discIcon.classList.toggle('spinning', isPlaying);
}

/* =========================================================
   2. PLAYBACK CONTROLS
   ========================================================= */
playPauseBtn.addEventListener('click', () => {
  if (!player || !player.getPlayerState) return;
  if (isPlaying) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
});

nextBtn.addEventListener('click', () => {
  if (player && player.nextVideo) player.nextVideo();
});

prevBtn.addEventListener('click', () => {
  if (player && player.previousVideo) player.previousVideo();
});

shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active-state', isShuffle);
  if (player && player.setShuffle) player.setShuffle(isShuffle);
});

repeatBtn.addEventListener('click', () => {
  isRepeat = !isRepeat;
  repeatBtn.classList.toggle('active-state', isRepeat);
  if (player && player.setLoop) player.setLoop(isRepeat);
});

/* =========================================================
   3. VOLUME CONTROLS
   ========================================================= */
volumeSlider.addEventListener('input', () => {
  const val = volumeSlider.value;
  volValue.textContent = val + "%";
  if (player && player.setVolume) player.setVolume(val);
  if (val > 0 && isMuted) {
    isMuted = false;
    muteBtn.textContent = "🔊";
    if (player.unMute) player.unMute();
  }
});

muteBtn.addEventListener('click', () => {
  if (!player) return;
  isMuted = !isMuted;
  if (isMuted) {
    player.mute();
    muteBtn.textContent = "🔕";
  } else {
    player.unMute();
    muteBtn.textContent = "🔊";
  }
});

/* =========================================================
   4. SONG PROGRESS / SEEK BAR
   ========================================================= */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function startSeekTracking() {
  stopSeekTracking();
  seekBarInterval = setInterval(() => {
    if (!player || isSeeking) return;
    try {
      const current = player.getCurrentTime();
      const duration = player.getDuration();
      if (duration > 0) {
        seekSlider.value = (current / duration) * 100;
        currentTimeEl.textContent = formatTime(current);
        durationTimeEl.textContent = formatTime(duration);
      }
    } catch (err) { /* ignore */ }
  }, 1000);
}

function stopSeekTracking() {
  if (seekBarInterval) clearInterval(seekBarInterval);
}

seekSlider.addEventListener('input', () => {
  isSeeking = true;
  if (player && player.getDuration) {
    const duration = player.getDuration();
    currentTimeEl.textContent = formatTime((seekSlider.value / 100) * duration);
  }
});

seekSlider.addEventListener('change', () => {
  if (player && player.seekTo && player.getDuration) {
    const duration = player.getDuration();
    player.seekTo((seekSlider.value / 100) * duration, true);
  }
  isSeeking = false;
});

/* =========================================================
   5. PLAYLIST PANEL
   ========================================================= */
playlistToggleBtn.addEventListener('click', () => {
  playlistPanel.classList.add('open');
  if (!playlistLoaded) buildPlaylistPanel();
});

closePlaylistBtn.addEventListener('click', () => {
  playlistPanel.classList.remove('open');
});

async function buildPlaylistPanel() {
  if (!player || !player.getPlaylist) return;
  const ids = player.getPlaylist();
  if (!ids || ids.length === 0) return;

  playlistLoaded = true;
  playlistList.innerHTML = "";

  ids.forEach((videoId, index) => {
    const li = document.createElement('li');
    li.dataset.index = index;
    li.textContent = `${index + 1}. Song loading…`;
    li.addEventListener('click', () => {
      player.playVideoAt(index);
      playlistPanel.classList.remove('open');
    });
    playlistList.appendChild(li);

    // Fetch title via a public oEmbed endpoint (no API key required)
    fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      .then(res => res.json())
      .then(data => {
        if (data && data.title) {
          li.textContent = `${index + 1}. ${data.title}`;
        } else {
          li.textContent = `${index + 1}. Track ${index + 1}`;
        }
      })
      .catch(() => {
        li.textContent = `${index + 1}. Track ${index + 1}`;
      });
  });
}

function highlightActivePlaylistItem() {
  if (!player || !player.getPlaylistIndex) return;
  const activeIndex = player.getPlaylistIndex();
  document.querySelectorAll('.playlist-list li').forEach(li => {
    li.classList.toggle('playing', Number(li.dataset.index) === activeIndex);
  });
}

/* =========================================================
   6. LIVE CLOCK (right corner)
   ========================================================= */
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  document.getElementById('liveClock').textContent = timeStr;
}
updateClock();
setInterval(updateClock, 1000);
