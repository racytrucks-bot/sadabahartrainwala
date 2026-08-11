/* =========================================================
   SADABAHAR TRAINWALA — PRO MUSIC PLAYER
   ========================================================= */

// ---- CONFIG ----
// 1) Apni free YouTube Data API key yahan daalein (Google Cloud Console se milti hai)
const YOUTUBE_API_KEY = "AIzaSyCZMB4rKYbNfvWkmWdryNmBxmd_05xZvXk"; // e.g. "AIzaSy...................."

// 2) Original radio playlist (jo pehle se chal rahi thi — bina API key ke bhi kaam karti hai)
const RADIO_PLAYLIST_ID = "RDKsiaTD9zGAo";

// 3) Genre/mood sections — har ek ek public YouTube playlist se aati hai.
//    Chahen to yahan apni pasand ki playlists ke ID daal kar badal sakte hain.
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

let currentQueue = [];   // [{videoId, title, thumbnail}]
let currentIndex = -1;
let usingRadioFallback = false; // true if playing the original YT-native playlist (no API key case)

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

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResultsSection = document.getElementById('searchResultsSection');
const searchResultsRow = document.getElementById('searchResultsRow');
const homeSections = document.getElementById('homeSections');
const apiNote = document.getElementById('apiNote');

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
   2. QUEUE-BASED PLAYBACK (works for search results + carousels)
   ========================================================= */
function playQueueAt(queue, index) {
  if (!playerReady || !queue || !queue[index]) return;
  usingRadioFallback = false;
  currentQueue = queue;
  currentIndex = index;
  const track = queue[index];
  player.loadVideoById(track.videoId);
  trackTitle.textContent = track.title;
  trackTitle.title = track.title;
  trackSub.textContent = "Sadabahar Trainwala";
  if (track.thumbnail) {
    discThumb.src = track.thumbnail;
    discThumb.style.display = "block";
    discEmoji.style.display = "none";
  }
  renderQueuePanel();
}

function handleTrackEnded() {
  if (usingRadioFallback) return; // YT playlist handles its own advance via nextVideo etc.
  if (isRepeat) {
    player.seekTo(0, true);
    player.playVideo();
    return;
  }
  if (currentQueue.length === 0) return;
  let nextIdx;
  if (isShuffle) {
    nextIdx = Math.floor(Math.random() * currentQueue.length);
  } else {
    nextIdx = currentIndex + 1;
    if (nextIdx >= currentQueue.length) return; // end of queue
  }
  playQueueAt(currentQueue, nextIdx);
  player.playVideo();
}

/* =========================================================
   3. PLAYBACK CONTROLS
   ========================================================= */
playPauseBtn.addEventListener('click', () => {
  if (!playerReady) return;
  if (usingRadioFallback) {
    isPlaying ? player.pauseVideo() : player.playVideo();
    return;
  }
  if (currentIndex === -1) {
    // nothing loaded yet — start the radio fallback playlist by default
    startRadioFallback();
    return;
  }
  isPlaying ? player.pauseVideo() : player.playVideo();
});

nextBtn.addEventListener('click', () => {
  if (usingRadioFallback) { player.nextVideo(); return; }
  if (currentQueue.length === 0) return;
  let nextIdx = isShuffle ? Math.floor(Math.random() * currentQueue.length) : currentIndex + 1;
  if (nextIdx >= currentQueue.length) nextIdx = 0;
  playQueueAt(currentQueue, nextIdx);
  player.playVideo();
});

prevBtn.addEventListener('click', () => {
  if (usingRadioFallback) { player.previousVideo(); return; }
  if (currentQueue.length === 0) return;
  let prevIdx = currentIndex - 1;
  if (prevIdx < 0) prevIdx = currentQueue.length - 1;
  playQueueAt(currentQueue, prevIdx);
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
        discThumb.src = `https://img.youtube.com/vi/${data.video_id}/hqdefault.jpg`;
        discThumb.style.display = "block";
        discEmoji.style.display = "none";
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
   6. QUEUE PANEL
   ========================================================= */
playlistToggleBtn.addEventListener('click', () => playlistPanel.classList.add('open'));
closePlaylistBtn.addEventListener('click', () => playlistPanel.classList.remove('open'));

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
    li.addEventListener('click', () => { playQueueAt(currentQueue, index); player.playVideo(); playlistPanel.classList.remove('open'); });
    playlistList.appendChild(li);
  });
}

/* =========================================================
   7. YOUTUBE DATA API — SEARCH + HOME SECTIONS
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

function renderRow(container, items) {
  container.innerHTML = "";
  if (items.length === 0) {
    container.innerHTML = `<div class="row-empty">Kuch nahi mila.</div>`;
    return;
  }
  items.forEach((track, index) => {
    const card = document.createElement('div');
    card.className = "song-card";
    card.innerHTML = `<img src="${track.thumbnail}" alt=""><div class="song-title">${track.title}</div>`;
    card.addEventListener('click', () => { playQueueAt(items, index); player.playVideo(); });
    container.appendChild(card);
  });
}

async function buildHomeSections() {
  if (apiKeyMissing()) {
    apiNote.style.display = "block";
    homeSections.innerHTML = `<p class="row-empty" style="padding:0 20px;">Filhal sirf "Sadabahar Trainwala Radio" available hai — neeche ▶️ Play button dabayein.</p>`;
    return;
  }
  for (const section of HOME_SECTIONS) {
    const sectionEl = document.createElement('section');
    sectionEl.className = "row-section";
    sectionEl.innerHTML = `<h2 class="row-title">${section.title}</h2><div class="row-scroll" id="row-${section.playlistId}"><div class="row-loading">Loading…</div></div>`;
    homeSections.appendChild(sectionEl);

    try {
      const items = await fetchPlaylistItems(section.playlistId);
      renderRow(document.getElementById(`row-${section.playlistId}`), items);
    } catch (err) {
      document.getElementById(`row-${section.playlistId}`).innerHTML = `<div class="row-empty">Load nahi ho paya.</div>`;
    }
  }
}

async function runSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  if (apiKeyMissing()) {
    apiNote.style.display = "block";
    return;
  }
  searchResultsSection.style.display = "block";
  searchResultsRow.innerHTML = `<div class="row-loading">Search ho raha hai…</div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  try {
    const items = await searchYouTube(query);
    renderRow(searchResultsRow, items);
  } catch (err) {
    searchResultsRow.innerHTML = `<div class="row-empty">Search fail ho gayi. Dobara try karein.</div>`;
  }
}

searchBtn.addEventListener('click', runSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });

/* =========================================================
   8. LIVE CLOCK
   ========================================================= */
function updateClock() {
  const now = new Date();
  document.getElementById('liveClock').textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}
updateClock();
setInterval(updateClock, 1000);
