# Wedding invitation (static)

Point-and-click engine removed. This site is a **digital invitation**: **swipe sideways** between slides (touch / horizontal scroll). Bottom bar jumps to sections. Guest name stays on the hero slide (`?to=`). No cover screen.

## Personalize guest name (URL)

Append query string like the reference:

`index.html?to=Nama%20Tamu`

Example: `…/Wedding-next/index.html?to=Keluarga%20Elektro%2017`

## Edit content

- **`app.js`** — object `INVITE`: tanggal acara (`eventStartISO`), teks tanggal, link Maps.
- **`index.html`** — nama mempelai, alamat, cerita, rekening, gambar di `pages/`.

## Files

- `index.html` — struktur undangan
- `style.css` — tampilan
- `app.js` — countdown, nama tamu dari URL, buka undangan

Admin / `story.json` / hotspots telah dihapus dari salinan ini.
