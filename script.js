let currentSong = new Audio();
let songs = [];
let currFolder = '';
const baseUrl = 'http://127.0.0.1:3002/'; // ✅ Port changed to 3002

function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

async function getSongs(folder) {
  try {
    currFolder = folder;
    const response = await fetch(`${baseUrl}${folder}/`);
    if (!response.ok) throw new Error('Failed to fetch songs');
    const text = await response.text();
    const div = document.createElement('div');
    div.innerHTML = text;
    const as = div.getElementsByTagName('a');
    songs = Array.from(as)
      .filter(a => a.href.endsWith('.m4a'))
      .map(a => decodeURIComponent(a.href.split(`/${folder}/`)[1] || a.href.split('/').pop()));

    const songUL = document.querySelector('.songList ul');
    if (!songUL) return [];
    songUL.innerHTML = songs.length
      ? songs.map(song => `
          <li>
            <img class="invert" width="34" src="svgs/music.svg" alt="Music icon">
            <div class="info">
              <div>${song.replaceAll('%20', ' ')}</div>
              <div></div>
            </div>
            <div class="playnow">
              <span>Play Now</span>
              <img class="invert" src="svgs/play.svg" alt="Play icon">
            </div>
          </li>
        `).join('')
      : '<li>No songs available</li>';

    return songs;
  } catch (error) {
    console.error('Error fetching songs:', error);
    const songUL = document.querySelector('.songList ul');
    if (songUL) songUL.innerHTML = '<li>Error loading songs</li>';
    return [];
  }
}

function playMusic(track, pause = false) {
  if (!track) return;
  currentSong.src = `${baseUrl}${currFolder}/${encodeURIComponent(track)}`;
  const infoElem = document.querySelector('.songinfo');
  if (infoElem) infoElem.textContent = decodeURIComponent(track);

  const timeElem = document.querySelector('.songtime');
  if (timeElem) timeElem.textContent = '00:00 / 00:00';

  if (!pause && currentSong.src) {
    currentSong.play().catch(error => console.error('Playback error:', error));
    const playBtn = document.querySelector('#play');
    if (playBtn) playBtn.src = 'svgs/pause.svg';
  }
}

async function displayAlbums() {
  const cardContainer = document.querySelector('.cardContainer');
  if (!cardContainer) return;

  cardContainer.innerHTML = '<p>Loading albums...</p>';

  try {
    const response = await fetch(`${baseUrl}songs/`);
    if (!response.ok) throw new Error('Failed to fetch albums');
    const text = await response.text();
    const div = document.createElement('div');
    div.innerHTML = text;
    const anchors = Array.from(div.getElementsByTagName('a'))
      .filter(a => a.href.includes('/songs/') && !a.href.includes('.htaccess') && a.href.endsWith('/'));

    cardContainer.innerHTML = '';
    for (const anchor of anchors) {
      const folder = anchor.href.split('/songs/')[1]?.replace(/\/$/, '');
      if (!folder || folder === 'songs') continue;

      try {
        const encodedFolder = encodeURIComponent(folder);
        const metadataResponse = await fetch(`${baseUrl}songs/${encodedFolder}/info.json`);
        if (!metadataResponse.ok) throw new Error('Metadata not found');
        const metadata = await metadataResponse.json();

        cardContainer.innerHTML += `
          <div data-folder="${folder}" class="card">
            <div class="play">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
              </svg>
            </div>
            <img src="${baseUrl}songs/${encodedFolder}/cover.jpg" alt="${metadata.title} cover">
            <h2>${metadata.title || 'Unknown Album'}</h2>
            <p>${metadata.description || 'No description'}</p>
          </div>`;
      } catch (error) {
        console.warn(`Failed to load metadata for ${folder}:`, error);
      }
    }

    if (!cardContainer.innerHTML.trim()) {
      cardContainer.innerHTML = '<p>No albums found</p>';
    }
  } catch (error) {
    console.error('Error fetching albums:', error);
    cardContainer.innerHTML = '<p>Error loading albums</p>';
  }
}

function setupEventListeners() {
  const playButton = document.querySelector('#play');
  const previousButton = document.querySelector('#previous');
  const nextButton = document.querySelector('#next');
  const seekbar = document.querySelector('.seekbar');
  const circle = document.querySelector('.circle');
  const volumeImg = document.querySelector('.volume > img');
  const volumeRange = document.querySelector('.range input');
  const hamburgerButton = document.querySelector('.hamburger');
  const closeButton = document.querySelector('.close');
  let lastVolume = 0.5;

  hamburgerButton?.addEventListener('click', () => {
    document.querySelector('.left')?.classList.add('show');
  });

  closeButton?.addEventListener('click', () => {
    document.querySelector('.left')?.classList.remove('show');
  });

  playButton?.addEventListener('click', () => {
    if (currentSong.paused && currentSong.src) {
      currentSong.play().catch(error => console.error('Playback error:', error));
      playButton.src = 'svgs/pause.svg';
    } else {
      currentSong.pause();
      playButton.src = 'svgs/play.svg';
    }
  });

  currentSong.addEventListener('timeupdate', () => {
    const timeElem = document.querySelector('.songtime');
    if (!isNaN(currentSong.duration) && timeElem && circle) {
      timeElem.textContent = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
      circle.style.left = `${(currentSong.currentTime / currentSong.duration) * 100}%`;
    }
  });

  currentSong.addEventListener('ended', () => {
    const index = songs.indexOf(decodeURIComponent(currentSong.src.split('/').slice(-1)[0]));
    if (index + 1 < songs.length) {
      playMusic(songs[index + 1]);
    } else {
      currentSong.pause();
      if (playButton) playButton.src = 'svgs/play.svg';
    }
  });

  seekbar?.addEventListener('click', e => {
    if (!isNaN(currentSong.duration)) {
      const percent = (e.offsetX / seekbar.getBoundingClientRect().width) * 100;
      if (circle) circle.style.left = `${percent}%`;
      currentSong.currentTime = (currentSong.duration * percent) / 100;
    }
  });

  previousButton?.addEventListener('click', () => {
    const index = songs.indexOf(decodeURIComponent(currentSong.src.split('/').slice(-1)[0]));
    if (index - 1 >= 0) playMusic(songs[index - 1]);
  });

  nextButton?.addEventListener('click', () => {
    const index = songs.indexOf(decodeURIComponent(currentSong.src.split('/').slice(-1)[0]));
    if (index + 1 < songs.length) playMusic(songs[index + 1]);
  });

  volumeRange?.addEventListener('input', e => {
    const volume = parseInt(e.target.value) / 100;
    currentSong.volume = volume;
    if (volume > 0) {
      volumeImg.src = 'svgs/volume.svg';
      lastVolume = volume;
    } else {
      volumeImg.src = 'svgs/mute.svg';
    }
  });

  volumeImg?.addEventListener('click', () => {
    if (currentSong.volume > 0) {
      currentSong.volume = 0;
      volumeImg.src = 'svgs/mute.svg';
      volumeRange.value = 0;
    } else {
      currentSong.volume = lastVolume;
      volumeImg.src = 'svgs/volume.svg';
      volumeRange.value = lastVolume * 100;
    }
  });

  document.querySelector('.songList ul')?.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (li) {
      const track = li.querySelector('.info')?.firstElementChild?.textContent.trim();
      if (track) playMusic(track);
    }
  });

  document.querySelector('.cardContainer')?.addEventListener('click', async e => {
    const card = e.target.closest('.card');
    if (card) {
      const folder = card.dataset.folder;
      songs = await getSongs(`songs/${folder}`);
      if (songs.length) playMusic(songs[0]);
    }
  });
}

async function main() {
  await getSongs('songs');
  if (songs.length) playMusic(songs[0], true);
  await displayAlbums();
  setupEventListeners();
}

main().catch(error => console.error('Initialization error:', error));
