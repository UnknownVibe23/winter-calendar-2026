# Content guide — filling the calendar

How to put real content into the calendar and encode it into the encrypted
bundle the app loads (`public/content.enc`).

## Folder layout

All plaintext content lives in `content/` at the repository root. This folder
is git-ignored and must never be committed — the encoder refuses to run if it
is not ignored.

```
content/
  content.json
  photos/
    01.jpg        (or 01.png — zero-padded door number, jpg or png)
    ...
    24.jpg
```

`content.json` is the encoder's input:

```json
{
  "v": 1,
  "doors": [
    { "n": 1, "text": "the message of the door", "photo": "photos/01.jpg" }
  ]
}
```

Rules:

- Exactly 24 doors, numbered 1..24, each number exactly once.
- `photo` is optional per door (a door may be text-only); at most one photo
  per door; the file must exist under `content/` and be `.jpg`, `.jpeg` or
  `.png`.
- `text` must be a non-empty string of at most 4000 characters.

## Photos

- Name photos after the door: `photos/01.jpg` … `photos/24.png`.
- Any orientation works. The encoder normalizes the size, not the aspect
  ratio: each photo is scaled to fit inside a 1600 px long edge with its
  original aspect ratio preserved, then re-encoded as JPEG (quality 82).
  Photos already smaller than 1600 px are kept as they are. This full-size
  image is used only by the lightbox.
- Additionally the encoder derives a square 320x320 center-crop JPEG
  thumbnail (quality 70) per photo. The grid shows only this thumbnail for
  opened doors, so full-size images are never decoded in the grid.
- Recommended source resolution: at least 1200 px on the long edge, so the
  downscaled result stays crisp.
- The JPEG re-encode drops most EXIF metadata (camera info, GPS, …) — that is
  intended.

## Running the encoder

From the repository root:

```
node scripts/encode.mjs
```

You are prompted for the name and the password (the password input is
hidden). Alternatively pass them as flags:

```
node scripts/encode.mjs --name NAME --password PASSWORD
```

The name and password are never logged, echoed or written anywhere; they only
enter the key derivation. The same pair is what unlocks the app later.

On success the encoder prints the door count, how many photos were embedded,
and the bundle path with its size, e.g.:

```
Doors encoded: 24 (photos embedded: 18)
Average photo payload: 412.3 KB base64 per photo
Average thumbnail payload: 12.4 KB base64 per photo (320x320 JPEG q70)
Bundle written to public/content.enc (7.91 MB)
```

If the bundle exceeds 8 MB the encoder prints a warning but still writes it.
If `content/content.json` is invalid, the encoder lists all problems (each one
naming the offending door) and exits with code 1 without writing a bundle.

Commit the resulting `public/content.enc` — it is ciphertext only.

## Placeholder mode (development)

```
npm run bundle
```

regenerates `public/content.enc` from 24 generated placeholder doors (no
`content/` folder needed) that decrypt with the dummy pair `tester` /
`schnee123`. Use this for development and tests; never commit a bundle built
from real content anywhere except as the encrypted `public/content.enc`.

`--iterations N` is a test-only flag that lowers the PBKDF2 iteration count;
production always uses 600000.

## Safety rules

- `content/` never leaves this machine in plaintext and is never committed;
  only the encrypted `public/content.enc` is committed.
- The encoder checks `git check-ignore content/content.json` before reading
  anything and refuses to run if `content/` is not ignored.
- Keep a backup of `content/` outside the repository — the encrypted bundle
  cannot be recovered without the name + password pair.
