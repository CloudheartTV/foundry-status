# CloudheartTV Campaign Hub — Setup Guide

## Thinkg up the File Structure to Implement

```
/ (root)
├── index.html              ← Main hub/landing page
├── campaign-page.js        ← Shared carousel logic (all campaign pages use this)
├── creator_logo.png
├── PNGTuberCloudheart.png
├── favicon.ico
├── discord_icon.png
├── twitch_icon.png
├── youtube_icon.png
├── steam_icon.png
├── online_fallout.png      ← Used in Player Portal live status
├── online_kingmaker.png
├── online_tabra.png
├── online_elder-scrolls.png
├── online_powderkids.png
├── AllServersOffline.png
│
├── FoG/
│   ├── index.html
│   ├── bannerimage.png
│   ├── AdDemo1.mp4
│   ├── AdDemo2.mp4
│   ├── AdDemo3.mp4         ← Add/remove as needed
│   ├── AdImage1.png
│   ├── AdImage2.png
│   └── AdImage3.png        
│
├── ESG/                    ← Same structure as FoG
├── SG/                     ← Same structure as FoG
├── KM/                     ← Same structure as FoG
└── TABRA/                  ← Same structure as FoG
```

---

## Rotating the Player Portal Password

Open `index.html` and find this line near the bottom of the `<script>` block:

```js
const PORTAL_PASSWORD = "streamcrew2025";
```

Change the string, commit, push. That's it. Share the new password in your crew Discord.

The lock uses `sessionStorage` — players need to re-enter it each browser session but not each page load.

---

## Setting Media Counts Per Campaign

Each campaign's `index.html` has one line at the bottom you need to update to match your actual files:

```js
CampaignPage.init({ campaignKey: 'fog', folder: '.', videoCount: 3, imageCount: 3 });
```

- **videoCount** = how many `AdDemo*.mp4` files are in that folder (AdDemo1, AdDemo2, ... AdDemoN)
- **imageCount** = how many `AdImage*.png` files are in that folder (AdImage1, AdImage2, ... AdImageN)

Set either to `0` if you have none of that type.

Files must be named exactly: `AdDemo1.mp4`, `AdDemo2.mp4`, `AdImage1.png`, `AdImage2.png`, etc.

---

## Campaign Identity Summary

| Campaign | Font | Primary | Accent | Feel |
|---|---|---|---|---|
| Fallout: Georgia | Oswald + Share Tech Mono | Red clay `#c45c2a` | Orange `#e8873a` | Wasteland scanlines |
| Elder Scrolls: GAOL | Cinzel Decorative | Imperial red `#8b1a1a` | Gold `#d4a017` | Parchment + stone |
| Starfield: Genesys | Exo 2 + JetBrains Mono | Deep space `#020408` | Electric blue `#4a9edd` | Sci-fi terminal |
| Kingmaker: Misfits | Playfair Display | Cream `#f5f0e0` | Denim `#4a7ab5` | Parchment map |
| TABRA | Nunito + Space Mono | White `#ffffff` | Pastel rainbow | Visual novel / JRPG |

---

## Player Portal Notes

- Password is stored in plain JS — it's visible in source to anyone who views it. This is a soft lock, not true security. It deters casual visitors and is fast to rotate.
- For stronger protection, consider GitHub Pages + a Cloudflare Worker with a real secret, or a simple Netlify password form.
- The portal section auto-checks your Foundry API at `cloudheartfoundry.duckdns.org/api/status` — same logic as your original page.
