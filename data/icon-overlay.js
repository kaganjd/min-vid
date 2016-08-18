const host = window.location.host;

// YOUTUBE HOME PAGE
// TODO: listen for infinite scrollesque updates and apply this again
// if necessary
const ytHomeContainers = Array.from(document.querySelectorAll('#feed .yt-lockup-thumbnail'));
if ((host.indexOf('youtube.com') > -1) && ytHomeContainers.length) {
  ytHomeContainers.forEach(el => {
    el.classList.add('minvid__overlay__wrapper');
    const tmp = getTemplate();
    tmp.addEventListener('click', function(ev) {
      evNoop(ev);
      const urlEl = el.querySelector('.yt-uix-sessionlink');
      if (urlEl && urlEl.getAttribute('href')) {
        self.port.emit('launch', {
          url: 'https://youtube.com' + urlEl.getAttribute('href'),
          domain: host
        });
      } else console.error('Error parsing url from YT home page', el); // eslint-disable-line no-console
    });
    el.appendChild(tmp);
  });
}

// YOUTUBE WATCH PAGE
const ytWatchContainer = document.querySelector('.html5-video-player');
if ((host.indexOf('youtube.com') > -1) && ytWatchContainer) {
  ytWatchContainer.classList.add('minvid__overlay__wrapper');
  const tmp = getTemplate();
  tmp.addEventListener('click', function(ev) {
    evNoop(ev);
    self.port.emit('launch', {
      url: window.location.href,
      domain: host
    });
  });
  ytWatchContainer.appendChild(tmp);
}

// VIMEO HOME PAGE
const vimeoHomeContainers = Array.from(document.querySelectorAll('.player_wrapper'));
if ((host.indexOf('vimeo.com') > -1)  && vimeoHomeContainers.length) {
  vimeoHomeContainers.forEach(el => {
    el.classList.add('minvid__overlay__wrapper');
    const tmp = getTemplate();
    tmp.addEventListener('click', function(ev) {
      evNoop(ev);
      const fauxEl = el.querySelector('.faux_player');
      if (fauxEl) {
        self.port.emit('launch', {
          url: 'https://vimeo.com/' + fauxEl.getAttribute('data-clip-id'),
          domain: host
        });
      } else console.error('Error: failed to locate vimeo url'); // eslint-disable-line no-console
    });
    el.appendChild(tmp);
  });
}

// VIMEO DETAIL PAGE
const vimeoDetailContainer = document.querySelector('.video-wrapper');
if ((host.indexOf('vimeo.com') > -1)  && vimeoDetailContainer) {
  vimeoDetailContainer.classList.add('minvid__overlay__wrapper');
  const tmp = getTemplate();
  tmp.addEventListener('mouseup', evNoop);
  tmp.addEventListener('click', function(ev) {
    evNoop(ev);
    self.port.emit('launch', {
      url: window.location.href,
      domain: host
    });
  }, true);
  vimeoDetailContainer.appendChild(tmp);
}

// VINE HOMEPAGE
// Vine homepage renders after window.onload, so wait 2 seconds before looking 
// for playable videos in the page.
setTimeout(() => {
  const vineHomeContainers = Array.from(document.querySelectorAll('.vine-video-container'));
  console.log(vineHomeContainers);
  if ((host.indexOf('vine.co') > -1)  && vineHomeContainers.length) {
    console.log('vine check passed');
    vineHomeContainers.forEach(el => {
      el.classList.add('minvid__overlay__wrapper');
      const tmp = getTemplate();
      tmp.addEventListener('click', function(ev) {
        evNoop(ev);
        const posterEl = el.querySelector('video').getAttribute('poster');
        const src = posterEl.replace(/thumbs/, 'videos').split('.jpg')[0];
        if (src) {
          console.log("src is: " + src);
          self.port.emit('launch', {
            url: window.location.href,
            domain: host,
            src: src
          });
        } else console.error('Error parsing url from Vine homepage', el); // eslint-disable-line no-console
      });
      el.appendChild(tmp);
    });
  }
}, 2000);

function getTemplate() {
  const containerEl = document.createElement('div');
  const iconEl = document.createElement('div');

  containerEl.className = 'minvid__overlay__container';
  iconEl.className = 'minvid__overlay__icon';

  containerEl.appendChild(iconEl);
  return containerEl;
}

function evNoop(ev) {
  ev.preventDefault();
  ev.stopImmediatePropagation();
}
