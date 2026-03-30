// campaign-page.js — shared logic for all campaign pages
// Handles: media carousel (video + image), dynamic file discovery, nav

window.CampaignPage = {

  // Call this from each campaign page's inline script.
  // videoCount and imageCount are no longer needed — files are auto-discovered.
  init({ campaignKey, folder }) {
    this.folder = folder;
    this.items = [];
    this.current = 0;
    this._discover().then(() => {
      this._buildCarousel();
      this._bindNav();
    });
  },

  // Probe sequentially for AdDemo1.mp4, AdDemo2.mp4 … then AdImage1.png, AdImage2.png …
  // Stops at the first 404. Uses HEAD requests so no media data is downloaded.
  async _discover() {
    const probe = async (url) => {
      try {
        const r = await fetch(url, { method: 'HEAD' });
        return r.ok;
      } catch {
        return false;
      }
    };

    // Videos
    for (let i = 1; ; i++) {
      const src = `${this.folder}/AdDemo${i}.mp4`;
      if (!(await probe(src))) break;
      this.items.push({ type: 'video', src });
    }

    // Images
    for (let i = 1; ; i++) {
      const src = `${this.folder}/AdImage${i}.png`;
      if (!(await probe(src))) break;
      this.items.push({ type: 'image', src });
    }
  },

  _buildCarousel() {
    const track = document.getElementById('carousel-track');
    const dots = document.getElementById('carousel-dots');
    if (!track) return;

    track.innerHTML = '';
    dots.innerHTML = '';

    this.items.forEach((item, i) => {
      const slide = document.createElement('div');
      slide.className = 'carousel-slide' + (i === 0 ? ' active' : '');
      slide.dataset.index = i;

      if (item.type === 'video') {
        slide.innerHTML = `
          <video src="${item.src}" controls preload="metadata" loop
            style="width:100%;height:100%;object-fit:cover;">
            Your browser does not support video.
          </video>`;
      } else {
        slide.innerHTML = `<img src="${item.src}" alt="Campaign media ${i+1}"
          style="width:100%;height:100%;object-fit:cover;">`;
      }

      track.appendChild(slide);

      // Dot
      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.dataset.index = i;
      dot.addEventListener('click', () => this.goTo(i));
      dots.appendChild(dot);
    });

    this._updateCounter();
  },

  goTo(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    if (!slides.length) return;

    // Pause any playing video on current slide
    const curSlide = slides[this.current];
    const curVid = curSlide && curSlide.querySelector('video');
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
    if (el && this.items.length > 0) {
      el.textContent = `${this.current + 1} / ${this.items.length}`;
    }
  },

  _bindNav() {
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    if (prevBtn) prevBtn.addEventListener('click', () => this.prev());
    if (nextBtn) nextBtn.addEventListener('click', () => this.next());

    // Keyboard nav
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });

    // Touch/swipe
    let startX = 0;
    const track = document.getElementById('carousel-track');
    if (track) {
      track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
      track.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) dx < 0 ? this.next() : this.prev();
      });
    }
  }
};
