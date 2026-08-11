/* =========================================================
   SADABAHAR TRAINWALA — PRO MUSIC PLAYER
   ========================================================= */

// ---- CONFIG ----
const YOUTUBE_API_KEY = "AIzaSyCZMB4rKYbNfvWkmWdryNmBxmd_05xZvXk";
const RADIO_PLAYLIST_ID = "RDKsiaTD9zGAo";

const HOME_SECTIONS = [
  { title: "🎬 Bollywood Hits",      playlistId: "PLQuhmPrDkg2mFasfx65sBLfW-XRi4_CXr" },
  { title: "🎧 Punjabi Hits",        playlistId: "PLNCA1T91UH31M7mN8iKSxMwwWB_mkzwT6" },
  { title: "🎭 Bhojpuri Hits",       playlistId: "PLGx8vKOKHzlFqT0-_w2tV2K5Nn7pLrXWq" },
  { title: "🙏 Bhakti Sangeet",      playlistId: "PLBO8vPt12vLfFlL0YFRUtbPb6TRpZlpeY" },
  { title: "📻 Old Hindi Classics",  playlistId: "PL0CaUqi81mPlQeSCgy5wvNHLRkHV0ZkLe" },
  { title: "🌍 English Hits",        playlistId: "PL6KcpeEiGPpxoALwGpDbaS26KhrKByQup" },
  { title: "🌙 Lofi / Chill",        playlistId: "PLinVjP-aRmlu2YrdZ7F1oJ0flKBqvH4V2" },
  { title: "🎶 Ghazals",             playlistId: "PLHROmcwqpPcoNgFDaTSF-mXutsECarAM5" },
  { title: "🕊️ Sufi",               playlistId: "PLUaG2Sj4QbOYxO4SEEQzvxVoHw4NNIc9m" }
];

/* =========================================================
   STATE
   ========================================================= */
let player;
let playerReady = false;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let isMuted = false;
let seekBarInterval = null;
let isSeeking = false;

let currentQueue = [];
let currentIndex = -1;
let usingRadioFallback = false;
let queueIsSearchBased = false; // true when current queue came from a search (used for auto-recommend)
let autoplayRecommend = localStorage.getItem('sbtw_autoplay') !== 'off'; // default ON

const MY_PLAYLIST_KEY = 'sbtw_my_playlist';

/* =========================================================
   DOM
   ========================================================= */
const trackTitle = document.getElementById('trackTitle');
const trackSub = document.getElementById('trackSub');
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
const autoplayToggle = document.getElementById('autoplayToggle');

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResultsSection = document.getElementById('searchResultsSection');
const searchResultsRow = document.getElementById('searchResultsRow');
const homeSections = document.getElementById('homeSections');
const apiNote = document.getElementById('apiNote');

const nowPlayingArea = document.getElementById('nowPlayingArea');
const nowPlayingOverlay = document.getElementById('nowPlayingOverlay');
const npCloseBtn = document.getElementById('npCloseBtn');
const npArt = document.getElementById('npArt');
const npTitle = document.getElementById('npTitle');
const npSub = document.getElementById('npSub');

/* =========================================================
   1. YOUTUBE IFRAME API
   ========================================================= */
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.getElementsByTagName('script')[0].parentNode.insertBefore(tag, document.getElementsByTagName('script')[0]);

function onYouTubeIframeAPIReady() {
  player = new YT.Player('yt-player', {
    height: '2',
    width: '2',
    playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0 },
    events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange }
  });
}

function onPlayerReady(e) {
  playerReady = true;
  e.target.setVolume(volumeSlider.value);
  buildHomeSections();
  renderMyPlaylistSection();
}

function onPlayerStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    updatePlayIcon();
    startSeekTracking();
  } else if (e.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    updatePlayIcon();
    stopSeekTracking();
  } else if (e.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    updatePlayIcon();
    stopSeekTracking();
    handleTrackEnded();
  }
}

function updatePlayIcon() {
  playPauseBtn.textContent = isPlaying ? "⏸" : "▶️";
  discIcon.classList.toggle('spinning', isPlaying);
}

/* =========================================================
   2. QUEUE-BASED PLAYBACK
   ========================================================= */
function playQueueAt(queue, index, isSearchBased) {
  if (!playerReady || !queue || !queue[index]) return;
  usingRadioFallback = false;
  currentQueue = queue;
  currentIndex = index;
  queueIsSearchBased = !!isSearchBased;
  const track = queue[index];
  player.loadVideoById(track.videoId);
  trackTitle.textContent = track.title;
  trackTitle.title = track.title;
  trackSub.textContent = "Sadabahar Trainwala";
  updateNowPlayingArt(track.thumbnail);
  renderQueuePanel();
  updateOverlay(track);
}

function updateNowPlayingArt(thumbnail) {
  if (thumbnail) {
    discThumb.src = thumbnail;
    discThumb.style.display = "block";
    discEmoji.style.display = "none";
  }
}

function updateOverlay(track) {
  npArt.src = track.thumbnail || "";
  npTitle.textContent = track.title || "";
  npSub.textContent = "Sadabahar Trainwala";
}

async function handleTrackEnded() {
  if (usingRadioFallback) return; // native YT radio playlist auto-advances itself
  if (isRepeat) { player.seekTo(0, true); player.playVideo(); return; }

  if (currentQueue.length === 0) return;

  let nextIdx;
  if (isShuffle) {
    nextIdx = Math.floor(Math.random() * currentQueue.length);
  } else {
    nextIdx = currentIndex + 1;
  }

  if (nextIdx < currentQueue.length && !isShuffle) {
    playQueueAt(currentQueue, nextIdx, queueIsSearchBased);
    player.playVideo();
    return;
  }
  if (isShuffle) {
    playQueueAt(currentQueue, nextIdx, queueIsSearchBased);
    player.playVideo();
    return;
  }

  // Queue exhausted — auto-recommend similar songs if enabled
  if (autoplayRecommend) {
    const lastTrack = currentQueue[currentQueue.length - 1];
    try {
      const more = await searchYouTube(lastTrack.title.split(' ').slice(0, 3).join(' '), 8);
      const filtered = more.filter(t => !currentQueue.some(q => q.videoId === t.videoId));
      if (filtered.length > 0) {
        currentQueue = currentQueue.concat(filtered);
        playQueueAt(currentQueue, currentIndex + 1, true);
        player.playVideo();
      }
    } catch (err) { /* silently stop if recommend fails */ }
  }
}

/* =========================================================
   3. PLAYBACK CONTROLS
   ========================================================= */
playPauseBtn.addEventListener('click', () => {
  if (!playerReady) return;
  if (usingRadioFallback) { isPlaying ? player.pauseVideo() : player.playVideo(); return; }
  if (currentIndex === -1) { startRadioFallback(); return; }
  isPlaying ? player.pauseVideo() : player.playVideo();
});

nextBtn.addEventListener('click', () => {
  if (usingRadioFallback) { player.nextVideo(); return; }
  if (currentQueue.length === 0) return;
  let nextIdx = isShuffle ? Math.floor(Math.random() * currentQueue.length) : currentIndex + 1;
  if (nextIdx >= currentQueue.length) nextIdx = 0;
  playQueueAt(currentQueue, nextIdx, queueIsSearchBased);
  player.playVideo();
});

prevBtn.addEventListener('click', () => {
  if (usingRadioFallback) { player.previousVideo(); return; }
  if (currentQueue.length === 0) return;
  let prevIdx = currentIndex - 1;
  if (prevIdx < 0) prevIdx = currentQueue.length - 1;
  playQueueAt(currentQueue, prevIdx, queueIsSearchBased);
  player.playVideo();
});

shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  shuffleBtn.classList.toggle('active-state', isShuffle);
  if (usingRadioFallback && player.setShuffle) player.setShuffle(isShuffle);
});

repeatBtn.addEventListener('click', () => {
  isRepeat = !isRepeat;
  repeatBtn.classList.toggle('active-state', isRepeat);
  if (usingRadioFallback && player.setLoop) player.setLoop(isRepeat);
});

function startRadioFallback() {
  usingRadioFallback = true;
  currentQueue = [];
  currentIndex = -1;
  player.loadPlaylist({ list: RADIO_PLAYLIST_ID, listType: 'playlist' });
  trackSub.textContent = "Sadabahar Trainwala Radio";
}

/* =========================================================
   4. VOLUME
   ========================================================= */
volumeSlider.addEventListener('input', () => {
  const val = volumeSlider.value;
  volValue.textContent = val + "%";
  if (playerReady) player.setVolume(val);
  if (val > 0 && isMuted) { isMuted = false; muteBtn.textContent = "🔊"; player.unMute(); }
});

muteBtn.addEventListener('click', () => {
  if (!playerReady) return;
  isMuted = !isMuted;
  if (isMuted) { player.mute(); muteBtn.textContent = "🔕"; }
  else { player.unMute(); muteBtn.textContent = "🔊"; }
});

/* =========================================================
   5. SEEK / PROGRESS
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
    if (!playerReady || isSeeking) return;
    try {
      const current = player.getCurrentTime();
      const duration = player.getDuration();
      if (duration > 0) {
        seekSlider.value = (current / duration) * 100;
        currentTimeEl.textContent = formatTime(current);
        durationTimeEl.textContent = formatTime(duration);
      }
      if (usingRadioFallback) updateRadioNowPlaying();
    } catch (err) {}
  }, 1000);
}
function stopSeekTracking() { if (seekBarInterval) clearInterval(seekBarInterval); }

function updateRadioNowPlaying() {
  try {
    const data = player.getVideoData();
    if (data && data.title && trackTitle.textContent !== data.title) {
      trackTitle.textContent = data.title;
      trackTitle.title = data.title;
      if (data.video_id) {
        const thumb = `https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg`;
        updateNowPlayingArt(thumb);
        updateOverlay({ title: data.title, thumbnail: thumb });
      }
    }
  } catch (err) {}
}

seekSlider.addEventListener('input', () => {
  isSeeking = true;
  if (playerReady) {
    const duration = player.getDuration();
    currentTimeEl.textContent = formatTime((seekSlider.value / 100) * duration);
  }
});
seekSlider.addEventListener('change', () => {
  if (playerReady) {
    const duration = player.getDuration();
    player.seekTo((seekSlider.value / 100) * duration, true);
  }
  isSeeking = false;
});

/* =========================================================
   6. QUEUE PANEL + AUTOPLAY TOGGLE
   ========================================================= */
playlistToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  playlistPanel.classList.add('open');
});
closePlaylistBtn.addEventListener('click', () => playlistPanel.classList.remove('open'));

if (autoplayToggle) {
  autoplayToggle.textContent = autoplayRecommend ? "ON" : "OFF";
  autoplayToggle.classList.toggle('on', autoplayRecommend);
  autoplayToggle.addEventListener('click', () => {
    autoplayRecommend = !autoplayRecommend;
    localStorage.setItem('sbtw_autoplay', autoplayRecommend ? 'on' : 'off');
    autoplayToggle.textContent = autoplayRecommend ? "ON" : "OFF";
    autoplayToggle.classList.toggle('on', autoplayRecommend);
  });
}

function renderQueuePanel() {
  if (currentQueue.length === 0) {
    playlistList.innerHTML = `<li class="playlist-loading">Kuch bhi play karke shuru karein…</li>`;
    return;
  }
  playlistList.innerHTML = "";
  currentQueue.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = index === currentIndex ? "playing" : "";
    li.innerHTML = `<img src="${track.thumbnail}" alt=""><span>${index + 1}. ${track.title}</span>`;
    li.addEventListener('click', () => { playQueueAt(currentQueue, index, queueIsSearchBased); player.playVideo(); playlistPanel.classList.remove('open'); });
    playlistList.appendChild(li);
  });
}

/* =========================================================
   7. NOW PLAYING FULLSCREEN OVERLAY
   ========================================================= */
nowPlayingArea.addEventListener('click', (e) => {
  if (e.target.closest('#playlistToggleBtn')) return;
  nowPlayingOverlay.classList.add('open');
});
npCloseBtn.addEventListener('click', () => nowPlayingOverlay.classList.remove('open'));

/* =========================================================
   8. MY PLAYLIST (user-created, saved in this browser)
   ========================================================= */
function getMyPlaylist() {
  try { return JSON.parse(localStorage.getItem(MY_PLAYLIST_KEY)) || []; }
  catch (err) { return []; }
}
function saveMyPlaylist(list) {
  localStorage.setItem(MY_PLAYLIST_KEY, JSON.stringify(list));
}
function isInMyPlaylist(videoId) {
  return getMyPlaylist().some(t => t.videoId === videoId);
}
function toggleMyPlaylist(track) {
  let list = getMyPlaylist();
  if (list.some(t => t.videoId === track.videoId)) {
    list = list.filter(t => t.videoId !== track.videoId);
  } else {
    list.push(track);
  }
  saveMyPlaylist(list);
  renderMyPlaylistSection();
}

function renderMyPlaylistSection() {
  let section = document.getElementById('myPlaylistSection');
  const list = getMyPlaylist();
  if (!section) {
    section = document.createElement('section');
    section.className = "row-section";
    section.id = "myPlaylistSection";
    homeSections.parentNode.insertBefore(section, homeSections);
  }
  if (list.length === 0) {
    section.innerHTML = "";
    return;
  }
  section.innerHTML = `<h2 class="row-title">💜 Meri Playlist</h2><div class="row-scroll" id="myPlaylistRow"></div>`;
  renderRow(document.getElementById('myPlaylistRow'), list, true);
}

/* =========================================================
   9. YOUTUBE DATA API — SEARCH + HOME SECTIONS
   ========================================================= */
function apiKeyMissing() {
  return !YOUTUBE_API_KEY || YOUTUBE_API_KEY.trim() === "";
}

async function fetchPlaylistItems(playlistId, maxResults = 12) {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.items) return [];
  return data.items
    .filter(item => item.snippet && item.snippet.resourceId)
    .map(item => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || ""
    }));
}

async function searchYouTube(query, maxResults = 12) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.items) return [];
  return data.items.map(item => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || ""
  }));
}

function renderRow(container, items, isSearchBased) {
  container.innerHTML = "";
  if (items.length === 0) {
    container.innerHTML = `<div class="row-empty">Kuch nahi mila.</div>`;
    return;
  }
  items.forEach((track, index) => {
    const card = document.createElement('div');
    card.className = "song-card";
    const added = isInMyPlaylist(track.videoId);
    card.innerHTML = `
      <div class="thumb-wrap">
        <img src="${track.thumbnail}" alt="">
        <button class="add-btn ${added ? 'added' : ''}" title="Meri Playlist me add karein">${added ? '✓' : '+'}</button>
      </div>
      <div class="song-title">${track.title}</div>`;
    card.querySelector('.add-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMyPlaylist(track);
      renderRow(container, items, isSearchBased); // refresh add-button states in this row
    });
    card.addEventListener('click', () => { playQueueAt(items, index, isSearchBased); player.playVideo(); });
    container.appendChild(card);
  });
}

async function buildHomeSections() {
  if (apiKeyMissing()) {
    apiNote.style.display = "block";
    homeSections.innerHTML = `<p class="row-empty" style="padding:0 20px;">Filhal sirf "Sadabahar Trainwala Radio" available hai — neeche ▶️ Play button dabayein.</p>`;
    return;
  }
  homeSections.innerHTML = "";
  for (const section of HOME_SECTIONS) {
    const sectionEl = document.createElement('section');
    sectionEl.className = "row-section";
    sectionEl.innerHTML = `<h2 class="row-title">${section.title}</h2><div class="row-scroll" id="row-${section.playlistId}"><div class="row-loading">Loading…</div></div>`;
    homeSections.appendChild(sectionEl);

    try {
      const items = await fetchPlaylistItems(section.playlistId);
      renderRow(document.getElementById(`row-${section.playlistId}`), items, false);
    } catch (err) {
      document.getElementById(`row-${section.playlistId}`).innerHTML = `<div class="row-empty">Load nahi ho paya.</div>`;
    }
  }
}

async function runSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  if (apiKeyMissing()) { apiNote.style.display = "block"; return; }
  searchResultsSection.style.display = "block";
  searchResultsRow.innerHTML = `<div class="row-loading">Search ho raha hai…</div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  try {
    const items = await searchYouTube(query);
    renderRow(searchResultsRow, items, true);
  } catch (err) {
    searchResultsRow.innerHTML = `<div class="row-empty">Search fail ho gayi. Dobara try karein.</div>`;
  }
}

searchBtn.addEventListener('click', runSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });

/* =========================================================
   10. LIVE CLOCK
   ========================================================= */
function updateClock() {
  const now = new Date();
  document.getElementById('liveClock').textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}
updateClock();
setInterval(updateClock, 1000);
