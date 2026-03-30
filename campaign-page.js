// campaign-page.js — shared logic for all campaign pages
// Handles: unified nav injection, media carousel, dynamic file discovery

window.CampaignPage = {

  // ─── PUBLIC INIT ─────────────────────────────────────────────────────────
  // campaignKey : short key used for file probing context
  // folder      : '.' (always, since script runs from the campaign subfolder)
  // backLabel   : text for the ← back link (optional, defaults to '← Hub')
  // youtubeUrl  : playlist URL for the YouTube button (omit if not yet available)
  init({ campaignKey, folder, backLabel = '← Hub', youtubeUrl = null }) {
    this.folder = folder;
    this.items  = [];
    this.current = 0;

    this._injectNav(backLabel, youtubeUrl);
    this._discover().then(() => {
      this._buildCarousel();
      this._bindNav();
    });
  },

  // ─── UNIFIED NAV ─────────────────────────────────────────────────────────
  // Replaces whatever <nav> is on the page with a fully unified one.
  // Campaign pages keep their own logo filter/color via the CSS variable
  // --nav-logo-filter, which each page can set in its :root if desired.
  _injectNav(backLabel, youtubeUrl) {
    const existing = document.querySelector('nav');
    if (!existing) return;

    const ytButton = youtubeUrl
      ? `<a href="${youtubeUrl}" target="_blank" class="nav-link nav-yt" title="Watch on YouTube">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
             <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.75 15.5v-7l6.25 3.5-6.25 3.5z"/>
           </svg>
           <span>Playlist</span>
         </a>`
      : '';

    existing.innerHTML = `
      <div class="nav-left">
        <a href="../index.html" class="nav-logo-link">
          <img class="nav-logo" src="../creator_logo.png" alt="CloudheartTV">
        </a>
        <a href="../index.html" class="nav-back">${backLabel}</a>
      </div>
      <div class="nav-center">
        <span class="nav-system-tag" id="nav-system-tag"></span>
      </div>
      <div class="nav-right">
        ${ytButton}
        <a href="https://www.twitch.tv/CloudheartTV" target="_blank" class="nav-link nav-twitch" title="Watch on Twitch">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.6 1L2 10.6V22h5.4v3.4h3.4L14.2 22h4.6L24 16.6V1H11.6zm10.8 15l-3.4 3.4h-5l-3.4 3.4v-3.4H5.4V2.6H22.4v13.4zM18.8 7H17v5h1.8V7zm-4.6 0h-1.8v5h1.8V7z"/>
          </svg>
          <span>Twitch</span>
        </a>
        <a href="https://startplaying.games/gm/cloudhearttv" target="_blank" class="nav-link nav-spg" title="Start Playing Games">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>Join a Game</span>
        </a>
        <button class="nav-link nav-portal" id="nav-portal-btn" title="Player Portal">
          ⬡ <span>Portal</span>
        </button>
      </div>
    `;

    // Set system tag text from the page's existing data-system attribute or title
    const systemTag = document.getElementById('nav-system-tag');
    const dataSystem = document.body.dataset.system;
    if (systemTag && dataSystem) systemTag.textContent = dataSystem;

    // Portal button — redirect to hub with portal open
    const portalBtn = document.getElementById('nav-portal-btn');
    if (portalBtn) {
      portalBtn.addEventListener('click', () => {
        window.location.href = '../index.html#portal';
      });
    }
  },

  // ─── FILE DISCOVERY ───────────────────────────────────────────────────────
  async _discover() {
    const probe = async (url) => {
      try {
        const r = await fetch(url, { method: 'HEAD' });
        return r.ok;
      } catch { return false; }
    };

    for (let i = 1; ; i++) {
      const src = `${this.folder}/AdDemo${i}.mp4`;
      if (!(await probe(src))) break;
      this.items.push({ type: 'video', src });
    }
    for (let i = 1; ; i++) {
      const src = `${this.folder}/AdImage${i}.png`;
      if (!(await probe(src))) break;
      this.items.push({ type: 'image', src });
    }
  },

  // ─── CAROUSEL ─────────────────────────────────────────────────────────────
  _buildCarousel() {
    const track = document.getElementById('carousel-track');
    const dots  = document.getElementById('carousel-dots');
    if (!track) return;

    track.innerHTML = '';
    dots.innerHTML  = '';

    if (this.items.length === 0) {
      track.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;
        width:100%;height:100%;font-size:0.8rem;opacity:0.4;letter-spacing:0.1em;">
        NO MEDIA YET</div>`;
      const counter = document.getElementById('carousel-counter');
      if (counter) counter.textContent = '0 / 0';
      return;
    }

    this.items.forEach((item, i) => {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide' + (i === 0 ? ' active' : '');
      slide.dataset.index = i;

      if (item.type === 'video') {
        slide.innerHTML = `<video src="${item.src}" controls preload="metadata" loop
          style="width:100%;height:100%;object-fit:cover;">
          Your browser does not support video.</video>`;
      } else {
        slide.innerHTML = `<img src="${item.src}" alt="Campaign media ${i + 1}"
          style="width:100%;height:100%;object-fit:cover;">`;
      }
      track.appendChild(slide);

      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => this.goTo(i));
      dots.appendChild(dot);
    });

    this._updateCounter();
  },

  goTo(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots   = document.querySelectorAll('.carousel-dot');
    if (!slides.length) return;

    const curVid = slides[this.current]?.querySelector('video');
    if (curVid) curVid.pause();

    slides[this.current].classList.remove('active');
    dots[this.current].classList.remove('active');
    this.current = (index + this.items.length) % this.items.length;
    slides[this.current].classList.add('active');
    dots[this.current].classList.add('active');
    this._updateCounter();
  },

  prev() { this.goTo(this.current - 1); },
  next() { this.goTo(this.current + 1); },

  _updateCounter() {
    const el = document.getElementById('carousel-counter');
    if (el) el.textContent = this.items.length > 0
      ? `${this.current + 1} / ${this.items.length}`
      : '0 / 0';
  },

  _bindNav() {
    document.getElementById('carousel-prev')?.addEventListener('click', () => this.prev());
    document.getElementById('carousel-next')?.addEventListener('click', () => this.next());

    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  this.prev();
      if (e.key === 'ArrowRight') this.next();
    });

    const track = document.getElementById('carousel-track');
    if (track) {
      let startX = 0;
      track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
      track.addEventListener('touchend',   e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) dx < 0 ? this.next() : this.prev();
      });
    }
  }
};