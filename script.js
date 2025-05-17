let currentSong = new Audio();
let songs = [];
let currFolder = '';
// Set the base URL for song paths
const baseUrl = 'http://127.0.0.1:3000/'; // Points to your songs folder

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
    songUL.innerHTML = songs.length
      ? songs.map(song => `
          <li>
            <img class="invert" width="34" src="svgs/music.svg" alt="Music icon">
            <div class="info">
              <div>${song.replaceAll('%20', ' ')}</div>
              <div>Harry</div>
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
    document.querySelector('.songList ul').innerHTML = '<li>Error loading songs</li>';
    return [];
  }
  // Fallback static song list (uncomment if directory listing fails)
  /*
  currFolder = folder;
  songs = ['song1.m4a', 'song2.m4a']; // List your M4A files
  const songUL = document.querySelector('.songList ul');
  songUL.innerHTML = songs.length
    ? songs.map(song => `
        <li>
          <img class="invert" width="34" src="img/music.svg" alt="Music icon">
          <div class="info">
            <div>${song.replaceAll('%20', ' ')}</div>
            <div>Harry</div>
          </div>
          <div class="playnow">
            <span></span>
            <img class="invert" src="img/play.svg" alt="Play icon">
          </div>
        </li>
      `).join('')
    : '<li>No songs available</li>';
  return songs;
  */
}

function playMusic(track, pause = false) {
  if (!track) return;
  currentSong.src = `${baseUrl}${currFolder}/${encodeURIComponent(track)}`;
  document.querySelector('.songinfo').textContent = decodeURIComponent(track);
  document.querySelector('.songtime').textContent = '00:00 / 00:00';
  if (!pause && currentSong.src) {
    currentSong.play().catch(error => console.error('Playback error:', error));
    document.querySelector('#play').src = 'svgs/pause.svg';
  }
}

async function displayAlbums() {
  try {
    const response = await fetch(`http://127.0.0.1:3000/songs/`);
    if (!response.ok) throw new Error('Failed to fetch albums');
    const text = await response.text();
    const div = document.createElement('div');
    div.innerHTML = text;
    const anchors = Array.from(div.getElementsByTagName('a'))
      .filter(a => a.href.includes('/songs/') && !a.href.includes('.htaccess') && a.href.endsWith('/'));

    const cardContainer = document.querySelector('.cardContainer');
    cardContainer.innerHTML = '';
    for (const anchor of anchors) {
      const folder = anchor.href.split('/songs/')[1]?.replace(/\/$/, '');
      if (!folder || folder === 'songs') continue; // Skip invalid or parent folder
      try {
        const metadataResponse = await fetch(`http://127.0.0.1:3000/songs/${folder}/info.json`);
        if (!metadataResponse.ok) throw new Error('Metadata not found');
        const metadata = await metadataResponse.json();
        cardContainer.innerHTML += `
          <div data-folder="${folder}" class="card">
            <div class="play">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
              </svg>
            </div>
            <img src="http://127.0.0.1:3000/songs/${folder}/cover.jpg" alt="${metadata.title} cover">
            <h2>${metadata.title || 'Unknown Album'}</h2>
            <p>${metadata.description || 'No description'}</p>
          </div>`;
      } catch (error) {
        console.warn(`Failed to load metadata for ${folder}:`, error);
      }
    }
    if (!cardContainer.innerHTML) {
      cardContainer.innerHTML = '<p>No albums found</p>';
    }
  } catch (error) {
    console.error('Error fetching albums:', error);
    document.querySelector('.cardContainer').innerHTML = '<p>Error loading albums</p>';
  }
}

function setupEventListeners() {
  const playButton = document.querySelector('#play');
  const previousButton = document.querySelector('#previous');
  const nextButton = document.querySelector('#next');
  const seekbar = document.querySelector('.seekbar');
  const volumeImg = document.querySelector('.volume > img');
  const volumeRange = document.querySelector('.range input');
  const hamburgerButton = document.querySelector('.hamburger');
  const closeButton = document.querySelector('.close');
  let lastVolume = 0.5;

  hamburgerButton.addEventListener('click', () => {
    document.querySelector('.left').classList.add('show');
  });

  closeButton.addEventListener('click', () => {
    document.querySelector('.left').classList.remove('show');
  });

  playButton.addEventListener('click', () => {
    if (currentSong.paused && currentSong.src) {
      currentSong.play().catch(error => console.error('Playback error:', error));
      playButton.src = 'svgs/pause.svg';
    } else {
      currentSong.pause();
      playButton.src = 'svgs/play.svg';
    }
  });

  currentSong.addEventListener('timeupdate', () => {
    if (!isNaN(currentSong.duration)) {
      document.querySelector('.songtime').textContent = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
      document.querySelector('.circle').style.left = `${(currentSong.currentTime / currentSong.duration) * 100}%`;
    }
  });

  currentSong.addEventListener('ended', () => {
    const index = songs.indexOf(decodeURIComponent(currentSong.src.split('/').slice(-1)[0]));
    if (index + 1 < songs.length) {
      playMusic(songs[index + 1]);
    } else {
      currentSong.pause();
      playButton.src = 'svgs/play.svg';
    }
  });

  seekbar.addEventListener('click', e => {
    if (!isNaN(currentSong.duration)) {
      const percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
      document.querySelector('.circle').style.left = `${percent}%`;
      currentSong.currentTime = (currentSong.duration * percent) / 100;
    }
  });

  previousButton.addEventListener('click', () => {
    const index = songs.indexOf(decodeURIComponent(currentSong.src.split('/').slice(-1)[0]));
    if (index - 1 >= 0) {
      playMusic(songs[index - 1]);
    }
  });

  nextButton.addEventListener('click', () => {
    const index = songs.indexOf(decodeURIComponent(currentSong.src.split('/').slice(-1)[0]));
    if (index + 1 < songs.length) {
      playMusic(songs[index + 1]);
    }
  });

  volumeRange.addEventListener('input', e => {
    const volume = parseInt(e.target.value) / 100;
    currentSong.volume = volume;
    if (volume > 0) {
      volumeImg.src = 'svgs/volume.svg';
      lastVolume = volume;
    } else {
      volumeImg.src = 'svgs/mute.svg';
    }
  });

  volumeImg.addEventListener('click', () => {
    if (currentSong.volume > 0) {
      volumeImg.src = 'svgs/mute.svg';
      currentSong.volume = 0;
      volumeRange.value = 0;
    } else {
      volumeImg.src = 'svgs/volume.svg';
      currentSong.volume = lastVolume;
      volumeRange.value = lastVolume * 100;
    }
  });

  document.querySelector('.songList ul').addEventListener('click', e => {
    const li = e.target.closest('li');
    if (li) {
      const track = li.querySelector('.info').firstElementChild.textContent.trim();
      playMusic(track);
    }
  });

  document.querySelector('.cardContainer').addEventListener('click', async e => {
    const card = e.target.closest('.card');
    if (card) {
      const folder = card.dataset.folder;
      songs = await getSongs(`songs/${folder}`);
      if (songs.length) playMusic(songs[0]);
    }
  });
}

async function main() {
  // Set the initial song folder here
  await getSongs('songs'); // Use 'songs/ncs' if M4A files are in a subfolder
  if (songs.length) playMusic(songs[0], true);
  await displayAlbums();
  setupEventListeners();
}

main().catch(error => console.error('Initialization error:', error));