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
        <a href="https://discord.gg/PM93XNFh7W" target="_blank" class="nav-link nav-spg" title="Join our Discord">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          <span>Discord</span>
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
