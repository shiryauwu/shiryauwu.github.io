/* Только поведение интерфейса. Данные живут в памяти вкладки, запросов к API нет. */
(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const time = (seconds) => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00';
  const cover = 'assets/cover.svg';
  const { artists,tracks,reviews,posts } = window.SoundMarkDemo;
  const favorites = new Set(window.SoundMarkDemo.favorites);
  const following = new Set(window.SoundMarkDemo.following);
  const audio = $('#audio');
  audio.volume = 0.7;
  let current = tracks[0];
  let feedTab = 'music';
  let profileTab = 'music';
  let searchTab = 'all';
  let draft = '';
  let previewUrl = '';
  let toastTimer;
  let returningFocus;
  const objectUrls = new Set();
  const getArtist = (id) => artists.find((artist) => artist.id === id);
  const getTrack = (id) => tracks.find((track) => track.id === id);
  const route = () => (location.hash.slice(1) || 'feed').split('?')[0];
  const icon = (name) => `<img src="assets/icons/${name}.png" alt="">`;
  const avatar = (name, extra = '') => {
    const palette = [['#ffe8e0','#ae3b17'],['#e3e9fc','#4052a4'],['#e0eee8','#356854'],['#efe3f4','#7b438c'],['#f8ebcf','#8c6525'],['#e2eff4','#346c86']];
    const color = palette[Array.from(name).reduce((sum,char) => sum + char.codePointAt(0),0) % palette.length];
    return `<span class="avatar ${extra}" style="--avatar-bg:${color[0]};--avatar-color:${color[1]}" aria-hidden="true">${escape(Array.from(name)[0])}</span>`;
  };
  const trackLink = (track) => `#track/${encodeURIComponent(track.id)}`;
  const artistLink = (track) => `#artist/${encodeURIComponent(track.artistId)}`;
  const isPlaying = (track) => current.id === track.id && !audio.paused;

  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4000);
  }

  function favoriteButton(track) {
    const active = favorites.has(track.id);
    return `<button class="icon-button" data-action="favorite" data-id="${escape(track.id)}" aria-pressed="${active}" aria-label="${active ? 'Убрать из избранного' : 'Добавить в избранное'}">${icon(active ? 'fav_true' : 'fav_false')}</button>`;
  }

  function playButton(track) {
    return `<button class="icon-button" data-action="play" data-id="${escape(track.id)}" aria-label="${isPlaying(track) ? 'Пауза' : 'Слушать'}: ${escape(track.title)}">${icon(isPlaying(track) ? 'pause' : 'play')}</button>`;
  }

  function trackRow(track) {
    const artist = getArtist(track.artistId);
    return `<div class="post-track">
      <a href="${trackLink(track)}" aria-label="Открыть песню ${escape(track.title)}"><img class="track-cover" src="${escape(track.cover)}" alt="Обложка ${escape(track.title)}"></a>
      <div class="track-meta"><a class="track-title" href="${trackLink(track)}">${escape(track.title)}</a><a class="track-artist" href="${artistLink(track)}">${escape(artist.name)}</a></div>
      <span class="track-duration">${track.duration ? time(track.duration) : '—:—'}</span>${playButton(track)}<a class="icon-button track-more" href="${trackLink(track)}" aria-label="Открыть карточку песни ${escape(track.title)}">${icon('dots')}</a>
    </div>`;
  }

  function post(track) {
    const artist = getArtist(track.artistId);
    return `<article class="post-card"><div class="post-header"><a class="post-avatar-link" href="${artistLink(track)}" aria-label="Исполнитель ${escape(artist.name)}">${avatar(artist.name)}</a><div class="post-meta"><a class="post-author" href="${artistLink(track)}">${escape(artist.name)}</a><p class="post-time">${escape(track.date)}</p></div></div><p class="post-text">${escape(track.description)}</p>${trackRow(track)}<div class="post-actions"><a class="post-action" href="${trackLink(track)}" aria-label="Рецензии на ${escape(track.title)}">${icon('comment')}<span>${reviews.filter((review) => review.trackId === track.id).length}</span></a>${favoriteButton(track)}</div></article>`;
  }

  function reviewCard(review, link = false) {
    const track = getTrack(review.trackId);
    const author = artists.find((artist) => artist.name === review.author);
    const name = author ? `<a href="#artist/${author.id}"><strong>${escape(review.author)}</strong></a>` : `<strong>${escape(review.author)}</strong>`;
    return `<article class="review-card"><div class="review-header">${avatar(review.author)}<div>${name}<p class="subtle">Рецензия${link ? ` на <a href="${trackLink(track)}">«${escape(track.title)}»</a>` : ''}${review.date ? ` · ${escape(review.date)}` : ''}</p></div></div><div class="review-rating" aria-label="Оценка ${review.rating} из 5">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div><p class="review-text">${escape(review.text)}</p></article>`;
  }

  function journalPost(publication) {
    const artist = getArtist(publication.artistId);
    const href = `#artist/${artist.id}`;
    const track = getTrack(publication.trackId);
    return `<article class="post-card journal-post"><div class="post-header"><a class="post-avatar-link" href="${href}" aria-label="Исполнитель ${escape(artist.name)}">${avatar(artist.name)}</a><div class="post-meta"><a class="post-author" href="${href}">${escape(artist.name)}</a><p class="post-time">${escape(publication.date)}</p></div></div><p class="post-text">${escape(publication.text)}</p>${publication.image ? `<a class="post-image-link" href="${track ? trackLink(track) : href}"><img class="post-image" src="${escape(publication.image)}" alt="${escape(publication.imageAlt)}" loading="lazy"></a>` : ''}${track ? trackRow(track) : ''}</article>`;
  }

  function musicFeed() {
    let nextPost = 0;
    return tracks.map((track,index) => post(track) + (index % 3 === 1 && posts[nextPost] ? journalPost(posts[nextPost++]) : '')).join('') + posts.slice(nextPost).map(journalPost).join('');
  }

  function header() {
    return `<header class="feed-header"><form class="search-form" role="search"><input class="search-input" type="search" name="q" placeholder="Поиск" aria-label="Поиск песен и исполнителей" autocomplete="off"></form><a class="user-avatar" href="#artist/me" aria-label="Ваш профиль">В</a></header>`;
  }

  function empty(message, upload = false) {
    return `<div class="empty"><p>${escape(message)}</p>${upload ? '<button class="button primary" data-action="upload">Добавить трек</button>' : ''}</div>`;
  }

  function renderFeed() {
    const composer = `<section class="create-post" aria-label="Новая публикация">${avatar('Вы')}<div class="create-body"><textarea class="create-input" rows="2" maxlength="500" placeholder="Опишите трек..." aria-label="Описание нового трека">${escape(draft)}</textarea><div class="create-actions"><button class="icon-button" data-action="upload" aria-label="Добавить аудиофайл"><span class="music-note" aria-hidden="true">♫</span></button><button class="icon-button" data-action="upload" aria-label="Добавить обложку">${icon('image')}</button><button class="button primary" data-action="upload">Опубликовать</button></div></div></section>`;
    return `${header()}<div class="tabs" role="tablist" aria-label="Тип публикаций"><button id="music-tab" class="tab ${feedTab === 'music' ? 'active' : ''}" role="tab" aria-selected="${feedTab === 'music'}" aria-controls="feed-panel" data-action="tab" data-tab="music">Музыка</button><button id="reviews-tab" class="tab ${feedTab === 'reviews' ? 'active' : ''}" role="tab" aria-selected="${feedTab === 'reviews'}" aria-controls="feed-panel" data-action="tab" data-tab="reviews">Рецензии</button></div>${composer}<div id="feed-panel" role="tabpanel" aria-labelledby="${feedTab === 'music' ? 'music' : 'reviews'}-tab" class="posts-list">${feedTab === 'music' ? musicFeed() : reviews.map((review) => `<div class="review-post">${reviewCard(review, true)}</div>`).join('') || empty('Пока нет рецензий.')}</div>`;
  }

  function renderTrack(track) {
    const artist = getArtist(track.artistId);
    const items = reviews.filter((review) => review.trackId === track.id);
    const rating = items.length ? (items.reduce((sum, review) => sum + review.rating, 0) / items.length).toFixed(1) : 'Нет оценок';
    return `${header()}<section class="track-page"><header class="track-header"><a class="icon-button back-button" href="#feed" aria-label="В ленту">←</a><div><h1>${escape(track.title)}</h1><a class="subtle" href="${artistLink(track)}">${escape(artist.name)}</a></div></header>
      <div class="track-banner"><div class="track-banner-content"><div class="track-cover-framed"><img src="${escape(track.cover)}" alt="Обложка ${escape(track.title)}"></div><div><h2 class="banner-title">${escape(track.title)}</h2><a class="banner-artist" href="${artistLink(track)}">${escape(artist.name)}</a><div class="banner-stats"><span>★ ${rating}</span><span>${track.duration ? time(track.duration) : 'Аудиотрек'}</span></div><div class="banner-actions"><button class="button" data-action="review" data-id="${escape(track.id)}">Написать рецензию</button>${playButton(track)}${favoriteButton(track)}</div><p class="banner-release">${escape(track.date)}</p></div></div></div>
      <section class="track-description"><h2>О треке</h2><p>${escape(track.description || 'Исполнитель пока не добавил описание.')}</p></section><section class="reviews-section"><h2>Рецензии (${items.length})</h2>${items.map((review) => reviewCard(review)).join('') || '<p class="subtle">Поделитесь первым впечатлением об этом треке.</p>'}</section></section>`;
  }

  function renderArtist(artist) {
    const items = tracks.filter((track) => track.artistId === artist.id);
    const artistReviews = reviews.filter((review) => review.author === artist.name);
    const artistPosts = posts.filter((publication) => publication.artistId === artist.id);
    return `${header()}<section class="profile-page"><header class="track-header"><a class="icon-button back-button" href="#feed" aria-label="В ленту">←</a><h1>${escape(artist.name)}</h1></header><div class="profile-header"><div class="profile-cover"></div><div class="profile-header-content">${avatar(artist.name, 'profile-avatar')}<div class="profile-info"><h2>${escape(artist.name)}</h2><p>Треков: ${items.length} · Подписчиков: ${((artist.followers || 0) + (following.has(artist.id) ? 1 : 0)).toLocaleString('ru-RU')}</p>${artist.id !== 'me' ? `<button class="button primary follow-button" data-action="follow" data-id="${escape(artist.id)}" aria-pressed="${following.has(artist.id)}">${following.has(artist.id) ? 'Вы подписаны' : 'Подписаться'}</button>` : '<button class="button secondary follow-button" data-action="upload">Добавить трек</button>'}</div></div><p class="profile-bio">${escape(artist.bio)}</p></div><section class="profile-posts"><div class="tabs" role="tablist" aria-label="Публикации исполнителя"><button id="profile-music-tab" class="tab ${profileTab === 'music' ? 'active' : ''}" role="tab" aria-selected="${profileTab === 'music'}" aria-controls="profile-panel" data-action="profile-tab" data-tab="music">Музыка (${items.length})</button><button id="profile-reviews-tab" class="tab ${profileTab === 'reviews' ? 'active' : ''}" role="tab" aria-selected="${profileTab === 'reviews'}" aria-controls="profile-panel" data-action="profile-tab" data-tab="reviews">Рецензии (${artistReviews.length})</button></div><div id="profile-panel" role="tabpanel" aria-labelledby="profile-${profileTab}-tab" class="posts-list">${profileTab === 'music' ? items.map(post).join('') + artistPosts.map(journalPost).join('') || empty('Здесь появятся ваши треки.', artist.id === 'me') : artistReviews.map((review) => `<div class="review-post">${reviewCard(review, true)}</div>`).join('') || empty('Здесь появятся рецензии исполнителя.')}</div></section></section>`;
  }

  function searchResults(query) {
    const normalized = query.trim().toLocaleLowerCase('ru');
    const matches = tracks.filter((track) => `${track.title} ${getArtist(track.artistId).name}`.toLocaleLowerCase('ru').includes(normalized));
    const people = artists.filter((artist) => artist.name.toLocaleLowerCase('ru').includes(normalized));
    const foundReviews = reviews.filter((review) => `${review.text} ${getTrack(review.trackId).title} ${review.author}`.toLocaleLowerCase('ru').includes(normalized));
    const songs = matches.length ? `<section class="search-section"><h2>Треки</h2><div class="search-track-list">${matches.map(trackRow).join('')}</div></section>` : '';
    const performers = people.length ? `<section class="search-section"><h2>Исполнители</h2><div class="artists-grid">${people.map((artist) => `<a class="artist-card" href="#artist/${encodeURIComponent(artist.id)}">${avatar(artist.name)}<strong>${escape(artist.name)}</strong></a>`).join('')}</div></section>` : '';
    const texts = foundReviews.length ? `<section class="search-section"><h2>Рецензии</h2>${foundReviews.map((review) => reviewCard(review, true)).join('')}</section>` : '';
    const sections = searchTab === 'tracks' ? songs : searchTab === 'artists' ? performers : searchTab === 'reviews' ? texts : songs + performers + texts;
    $('#search-results').innerHTML = sections || empty('Ничего не найдено. Попробуйте другое название или имя.');
  }

  function render() {
    const path = route();
    const main = $('#main-content');
    const welcome = path === 'welcome';
    $('#app-shell').hidden = welcome;
    $('#welcome').hidden = !welcome;
    document.querySelectorAll('.menu-item').forEach((item) => {
      const active = item.hash === `#${path}`;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
    });
    if (welcome) { document.title = 'SoundMark — создавай то, что откликается в сердцах'; return; }
    let title = 'Лента';
    if (path.startsWith('track/')) {
      const track = getTrack(path.slice(6));
      title = track ? track.title : 'Трек не найден';
      main.innerHTML = track ? renderTrack(track) : empty('Трек не найден. Вернитесь в ленту.');
    } else if (path.startsWith('artist/')) {
      const artist = getArtist(path.slice(7));
      title = artist ? artist.name : 'Исполнитель не найден';
      main.innerHTML = artist ? renderArtist(artist) : empty('Исполнитель не найден. Вернитесь в ленту.');
    } else if (path === 'search') {
      title = 'Поиск';
      main.innerHTML = `${header()}<div class="tabs search-tabs" role="tablist" aria-label="Результаты поиска">${[['all','Все'],['tracks','Треки'],['artists','Исполнители'],['reviews','Рецензии']].map(([id,label]) => `<button class="tab ${searchTab === id ? 'active' : ''}" id="search-${id}-tab" role="tab" aria-selected="${searchTab === id}" aria-controls="search-results" data-action="search-tab" data-tab="${id}">${label}</button>`).join('')}</div><div id="search-results" role="tabpanel" aria-labelledby="search-${searchTab}-tab"></div>`;
      const query = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
      $('.search-input').value = query;
      searchResults(query);
    } else if (path === 'favorites') {
      title = 'Избранное';
      main.innerHTML = `${header()}<div class="page-heading"><h1>Избранное</h1></div><div class="posts-list">${tracks.filter((track) => favorites.has(track.id)).map(post).join('') || empty('Сохраняйте понравившиеся треки, нажимая на сердечко.')}</div>`;
    } else if (path === 'subscriptions') {
      title = 'Подписки';
      main.innerHTML = `${header()}<div class="page-heading"><h1>Подписки</h1></div><div class="posts-list">${artists.filter((artist) => following.has(artist.id)).map((artist) => `<a class="artist-result" href="#artist/${artist.id}">${avatar(artist.name)}<strong>${escape(artist.name)}</strong></a>`).join('') || empty('Подпишитесь на исполнителя в его профиле.')}</div>`;
    } else if (path === 'about') {
      title = 'О SoundMark';
      main.innerHTML = `${header()}<section class="about-page"><h1>SoundMark</h1><p>Музыка, исполнители и рецензии в одном месте.</p><p>Демонстрационная вёрстка: добавленные файлы, подписки и рецензии доступны до обновления вкладки.</p><a class="button secondary" href="#welcome">Стартовая страница</a></section>`;
    } else if (path === 'feed') main.innerHTML = renderFeed();
    else main.innerHTML = `${header()}${empty('Страница не найдена. Откройте ленту через меню.')}`;
    document.title = `${title} — SoundMark`;
    updatePlayer();
  }

  function updatePlayer() {
    const artist = getArtist(current.artistId);
    $('#player-info').innerHTML = `<a href="${trackLink(current)}"><img class="player-cover" src="${escape(current.cover)}" alt="Обложка"></a><div class="player-info"><a class="track-title" href="${trackLink(current)}">${escape(current.title)}</a><a class="track-artist" href="${artistLink(current)}">${escape(artist.name)}</a></div>${favoriteButton(current)}`;
    $('#player-play').innerHTML = icon(audio.paused ? 'play' : 'pause');
    $('#player-play').setAttribute('aria-label', audio.paused ? 'Воспроизвести' : 'Пауза');
    document.querySelectorAll('[data-action="play"]').forEach((button) => {
      const track = getTrack(button.dataset.id);
      button.innerHTML = icon(isPlaying(track) ? 'pause' : 'play');
      button.setAttribute('aria-label', `${isPlaying(track) ? 'Пауза' : 'Слушать'}: ${track.title}`);
    });
  }

  async function play(track, force = false) {
    if (current.id === track.id && !audio.paused && !force) { audio.pause(); return; }
    const changed = current.id !== track.id;
    current = track;
    if (changed || !audio.getAttribute('src')) {
      audio.src = track.src;
      $('#current-time').textContent = '0:00';
      $('#total-time').textContent = time(track.duration);
      $('#seek').max = track.duration;
      $('#seek').value = 0;
    }
    updatePlayer();
    try { await audio.play(); }
    catch { toast('Не удалось воспроизвести аудио. Попробуйте другой файл или формат MP3.'); }
    updatePlayer();
  }

  function step(direction) {
    const index = tracks.findIndex((track) => track.id === current.id);
    play(tracks[(index + direction + tracks.length) % tracks.length], true);
  }

  function openDialog(dialog) {
    returningFocus = document.activeElement;
    dialog.showModal();
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const track = getTrack(button.dataset.id);
    switch (button.dataset.action) {
      case 'upload':
        if (!$('#track-description').value) $('#track-description').value = draft;
        openDialog($('#upload-dialog')); break;
      case 'close-dialog': button.closest('dialog').close(); break;
      case 'review': {
        $('#review-track').innerHTML = tracks.map((item) => `<option value="${escape(item.id)}">${escape(item.title)} — ${escape(getArtist(item.artistId).name)}</option>`).join('');
        $('#review-track').value = track?.id || (route().startsWith('track/') ? route().slice(6) : current.id);
        openDialog($('#review-dialog')); break;
      }
      case 'favorite':
        if (favorites.has(track.id)) favorites.delete(track.id); else favorites.add(track.id);
        render(); break;
      case 'play': play(track); break;
      case 'player-toggle': play(current); break;
      case 'previous': step(-1); break;
      case 'next': step(1); break;
      case 'tab': feedTab = button.dataset.tab; render(); $(`#${feedTab}-tab`).focus(); break;
      case 'profile-tab': profileTab = button.dataset.tab; render(); $(`#profile-${profileTab}-tab`).focus(); break;
      case 'search-tab': {
        const query = $('.search-input').value;
        searchTab = button.dataset.tab;
        render();
        $('.search-input').value = query;
        searchResults(query);
        $(`#search-${searchTab}-tab`).focus(); break;
      }
      case 'follow':
        if (following.has(button.dataset.id)) following.delete(button.dataset.id); else following.add(button.dataset.id);
        render(); break;
    }
  });

  document.addEventListener('submit', (event) => {
    if (!event.target.matches('.search-form')) return;
    event.preventDefault();
    location.hash = `search?q=${encodeURIComponent(new FormData(event.target).get('q'))}`;
  });
  document.addEventListener('keydown', (event) => {
    if (!event.target.matches('[role="tab"]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.target.dataset.action === 'search-tab') {
      const ids = ['all', 'tracks', 'artists', 'reviews'];
      const index = ids.indexOf(searchTab);
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length;
      $(`#search-${ids[nextIndex]}-tab`).click();
      return;
    }
    const profile = event.target.dataset.action === 'profile-tab';
    const active = profile ? profileTab : feedTab;
    const next = event.key === 'Home' ? 'music' : event.key === 'End' ? 'reviews' : active === 'music' ? 'reviews' : 'music';
    if (profile) profileTab = next; else feedTab = next;
    render();
    $(`#${profile ? 'profile-' : ''}${next}-tab`).focus();
  });
  document.addEventListener('input', (event) => {
    if (event.target.matches('.create-input')) { draft = event.target.value; return; }
    if (!event.target.matches('.search-input')) return;
    const query = event.target.value;
    if (route() === 'search') searchResults(query);
    else {
      location.hash = `search?q=${encodeURIComponent(query)}`;
      window.addEventListener('hashchange', () => { const input = $('.search-input'); input.focus(); input.setSelectionRange(query.length, query.length); }, { once:true });
    }
  });

  audio.addEventListener('play', updatePlayer);
  audio.addEventListener('pause', updatePlayer);
  audio.addEventListener('ended', () => step(1));
  audio.addEventListener('error', () => toast('Не удалось прочитать аудиофайл. Попробуйте формат MP3.'));
  audio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(audio.duration)) current.duration = audio.duration;
    $('#total-time').textContent = time(audio.duration);
    $('#seek').max = Number.isFinite(audio.duration) ? audio.duration : 0;
  });
  audio.addEventListener('timeupdate', () => {
    $('#current-time').textContent = time(audio.currentTime);
    $('#seek').value = audio.currentTime;
  });
  $('#seek').addEventListener('input', (event) => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(event.target.value); });
  $('#volume').addEventListener('input', (event) => { audio.volume = Number(event.target.value); });

  const createUrl = (file) => { const url = URL.createObjectURL(file); objectUrls.add(url); return url; };
  function clearPreview() {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); objectUrls.delete(previewUrl); previewUrl = ''; }
    $('#cover-preview').innerHTML = '<span>＋<small>Добавить обложку</small></span>';
  }
  $('#cover-file').addEventListener('change', (event) => {
    clearPreview();
    const file = event.target.files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { event.target.value = ''; $('#upload-error').textContent = 'Для обложки выберите PNG, JPEG или WebP.'; return; }
    previewUrl = createUrl(file);
    $('#cover-preview').innerHTML = `<img src="${previewUrl}" alt="Предпросмотр обложки">`;
    $('#upload-error').textContent = '';
  });
  $('#audio-file').addEventListener('change', (event) => { $('#audio-filename').textContent = event.target.files[0]?.name || 'Добавить аудиофайл'; $('#upload-error').textContent = ''; });
  $('#upload-form').addEventListener('reset', () => {
    clearPreview();
    $('#audio-filename').textContent = 'Добавить аудиофайл';
    $('#upload-error').textContent = '';
  });
  $('#upload-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const file = $('#audio-file').files[0];
    const title = $('#track-title').value.trim();
    const name = $('#track-artist').value.trim();
    if (!title || !name) { $('#upload-error').textContent = 'Укажите название трека и исполнителя.'; return; }
    if (!file || (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name))) { $('#upload-error').textContent = 'Выберите аудиофайл MP3, WAV, OGG, M4A или FLAC.'; return; }
    let artist = artists.find((item) => item.name.toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru'));
    if (!artist) { artist = { id:`artist-${Date.now()}`, name, bio:'Новый исполнитель в SoundMark.' }; artists.push(artist); }
    const track = { id:`local-${Date.now()}`, title, artistId:artist.id, src:createUrl(file), cover:previewUrl || cover, duration:0, description:$('#track-description').value.trim(), date:'Добавлено только что · локальный файл' };
    previewUrl = ''; // Обложка теперь принадлежит треку, сброс формы не отзывает её URL.
    tracks.unshift(track);
    draft = '';
    $('#upload-dialog').close();
    $('#upload-form').reset();
    location.hash = trackLink(track);
    render();
    toast('Трек добавлен. Он доступен в этой вкладке.');
  });
  $('#review-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const text = $('#review-text').value.trim();
    if (!text) { $('#review-text').setCustomValidity('Напишите текст рецензии.'); $('#review-text').reportValidity(); return; }
    const trackId = $('#review-track').value;
    reviews.unshift({ trackId, author:'Вы', rating:Number($('#review-rating').value), text });
    $('#review-dialog').close();
    $('#review-form').reset();
    location.hash = `track/${trackId}`;
    render();
    toast('Рецензия добавлена.');
  });
  $('#review-text').addEventListener('input', (event) => event.target.setCustomValidity(''));
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => returningFocus?.isConnected && returningFocus.focus());
  });
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  window.addEventListener('beforeunload', () => objectUrls.forEach((url) => URL.revokeObjectURL(url)));
  render();
})();
