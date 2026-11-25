# Security review — WC-SEC

- **Date:** 2026-11-25
- **Branch / PR:** `task/wc-sec` → PR #5 (base `main` @ `65a836b`)
- **Auditor role:** white-box review with a red-team mindset, against the
  dummy bundle only (`tester` / `schnee123`). No real personal content was
  requested, read, or processed. No local `content/` folder exists in this
  clone (verified with `ls -d content`); nothing under `content/` was opened.
- **Result headline:** all 10 scope items **pass** or are documented accepted
  risks. No Critical/High finding in shipped code → no code changes on this
  branch (report-only, per the card's fix policy).

## Scope

The 10 audit items from task card WC-SEC: (1) crypto correctness,
(2) secret hygiene, (3) PII sweep over the full commit history, (4) build
output, (5) XSS / DOM injection, (6) bundle confidentiality, (7)
lockout/session honesty, (8) deploy workflow, (9) dependency audit,
(10) residual risks.

## Methodology per item (exact commands)

1. **Crypto correctness** — read `src/crypto.ts`, `scripts/encode.mjs`,
   `src/content.ts`; compared constants side by side; ran
   `grep -n 'trim().toLowerCase\|PBKDF2\|SHA-256\|600000\|256\|getRandomValues\|AES-GCM' src/crypto.ts scripts/encode.mjs`;
   swept for weak/custom primitives with
   `grep -rnE 'Math\.random|createHash|createCipher|RC4|MD5|SHA1\b|DES' src scripts`;
   inspected the committed bundle header with a Python JSON dump of
   `public/content.enc`; relied on the existing round-trip tests
   (`src/encode.test.ts`, `src/bundle.test.ts`, `src/crypto.test.ts`).
2. **Secret hygiene** — read `src/session.ts`, `src/login.ts`,
   `src/lockout.ts`, `src/doors.ts`, `scripts/encode.mjs`; ran
   `grep -rn 'console\.' src scripts` and
   `grep -rn 'localStorage\.\|STORAGE_KEY = ' src --include='*.ts'`;
   checked every `console.*` output string for secret material.
3. **PII sweep** — `git log --all --name-status --format='COMMIT %H %an %ae %s'`;
   `git log --all --name-only --format= | sort -u` (full path list);
   `git log --all --name-only --format= | grep -i '^content/'` (empty);
   `git rev-list --all --objects | awk 'NF{print $1}' | sort -u | git cat-file --batch-check='%(objecttype) %(objectsize)' | sort -k2 -nr | head`
   (blob sizes); magic-byte scan of all 180 objects (`git cat-file blob <sha> | head -c 8 | od -An -tx1`);
   email-pattern scan over every blob
   (`grep -aoE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'` → zero hits);
   secret-string scan over every blob (`schnee|password\s*[:=]|secret|api[_-]?key|token`);
   `git log --all --format='%an <%ae> | %cn <%ce>' | sort -u` (identities);
   image-path listing (`git rev-list --all --objects | grep -E 'icons|\.png|\.jpg|...'`).
4. **Build output** — `npm install --no-audit --no-fund`, `npm run build`;
   `find dist -type f`; `find dist -name '*.map' | wc -l`;
   `grep -rniE 'schnee' dist` (empty); `cmp dist/content.enc public/content.enc`.
5. **XSS / DOM injection** —
   `grep -rnE 'innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function|\.src\s*=|setAttribute' src scripts index.html`;
   manual review of every DOM write in `src/app.ts`, `src/calendar.ts`,
   `src/lightbox.ts`, `src/login.ts`, `src/main.ts`.
6. **Bundle confidentiality** — `node /tmp/verify-bundle.mjs` and
   `node /tmp/verify-wrong.mjs`: standalone Node `webcrypto` script that
   re-implements the derivation and attempts AES-256-GCM decrypt of the
   committed `public/content.enc` with the dummy pair and with 5 wrong pairs.
7. **Lockout/session honesty** — read `src/lockout.ts` (comment),
   `src/session.ts`, `src/main.ts` boot flow; checked tests
   `src/lockout.test.ts`, `src/session.test.ts`.
8. **Deploy workflow** — read `.github/workflows/deploy.yml`,
   `.github/workflows/ci.yml`; listed `uses:` lines and `permissions:` blocks.
9. **Dependency audit** — network was available, so `npm audit --json` ran
   (parsed for severity/name/range/fix); `npm ls --prod --all` for the
   shipped-surface check.
10. **Residual risks** — verified `?date` gating in the production bundle:
    `grep -oE '.{60}location\.search.{200}' dist/assets/*.js` and
    `grep -c 'import.meta.env' dist/assets/*.js`.

## Verdicts and findings

| # | Item | Verdict | Evidence | Severity / action |
|---|------|---------|----------|-------------------|
| 1 | Crypto correctness | PASS | `src/crypto.ts:11-50` and `scripts/encode.mjs:298-320` are formula-identical: material `name.trim().toLowerCase() + "\n" + password`, PBKDF2-SHA-256, `DEFAULT_ITERATIONS = 600000` both sides, 16-byte salt, 12-byte IV, 256-bit key, AES-256-GCM. Bundle header: `v:1`, `alg:"PBKDF2-SHA256-AES-GCM"`, `iter:600000`, salt = 16 bytes (24 b64 chars), iv = 12 bytes (16 b64 chars). All decrypt failures surface as `DecryptError` (`src/crypto.ts:38-51` catch-all). No custom/weak primitives (`Math.random`, MD5/SHA1/DES/RC4 grep empty; only WebCrypto `subtle` + `getRandomValues`). Drift between the two derivations is guarded by `src/encode.test.ts` (CLI output decrypts through `src/crypto.ts`) and `src/bundle.test.ts`. | None |
| 2 | Secret hygiene | PASS | No name/password/key material in any log, error, or storage beyond the specified keys. `src/login.ts` shows a constant error text ("Sorry, that did not match."); `src/session.ts` stores only `wc.key` (base64 derived key bits) and `wc.name`; lockout state in `wc.attempts`/`wc.until`; opened doors in `wc.opened`. `scripts/encode.mjs` prints only counts, sizes, and the relative output path (`report()`), refuses with a fixed message, and prompts with a muted stream; its only secret-like string is the documented dummy pair. `console.*` grep shows no secret interpolation (the one variable echo, `?date` raw value in `src/doors.ts:58`, is dev-only). | None |
| 3 | PII sweep, full history | **CLEAN** | 25 commits, 180 objects, all on `main` history. No path under `content/` ever existed (`git log --all --name-only | grep '^content/'` empty). Only image blobs are the 4 generated placeholder icons under `public/icons/` (PNG magic `89504e47`, added in `1b334d0`). Largest blobs: two `public/content.enc` versions (727727 / 727723 bytes, ciphertext JSON) and `package-lock.json` (123399 bytes) — no unexpected large binaries. Zero email-pattern hits in any blob. Secret-string scan hits only the documented dummy pair in code/tests/decisions. Commit messages are conventional `WC-*` + GitHub noreply co-author trailers. Info observation: the 4 merge commits (`c435bc8`, `cb027dc`, `912642b`, `65a836b`) carry the repo account's login address in the author *metadata* field, auto-attached by GitHub web merges — not committed content; no action taken because history rewriting is forbidden by the card. | Info, accepted (no action possible without forbidden history ops) |
| 4 | Build output | PASS | `npm run build` → `dist/` contains exactly `index.html`, `assets/index-*.js` + `assets/index-*.css`, `content.enc` (byte-identical to the committed `public/content.enc`, `cmp` clean), `icon.svg`, 4 icon PNGs, `manifest.webmanifest`. Zero `*.map` sourcemaps. `grep -rniE 'schnee' dist` empty; the only "password" string in the JS is the `autocomplete` attribute value. Only `content.enc` ciphertext ships as content. | None |
| 5 | XSS / DOM injection | PASS | No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, or `new Function` anywhere in `src/`, `scripts/`, `index.html`. All DOM writes are `textContent`, `className`, `dataset`, `setAttribute` with constant or number-derived values (`aria-label`, `role`), or `img.src = data:image/jpeg;base64,...` assigned as a property in `src/lightbox.ts:47` (property assignment, not HTML parsing; the base64 payload comes from the encrypted bundle). The selector in `src/app.ts` interpolates only a numeric door number. Decrypted strings (welcome line, door text, header) all go through `textContent`. | None |
| 6 | Bundle confidentiality | PASS | Round trip: committed `public/content.enc` decrypts with `tester`/`schnee123` → `v:1`, 24 doors, 24 placeholder photos, placeholder texts. Wrong pairs `tester/schnee124`, `tester2/schnee123`, `admin/admin`, `tester/""`, `""/schnee123` all throw `DecryptError`. Note (by design, covered by `src/crypto.test.ts`): name is normalized with `trim().toLowerCase()`, so case/whitespace variants of the same name derive the same key — that is the specified normalization, not a bypass. | None |
| 7 | Lockout/session honesty | PASS | `src/lockout.ts:1-2` comment states the ladder is a "cosmetic client-side fallback only … not a security boundary". `src/session.ts` stores derived key bits, never the password. `src/main.ts` boot: a stored session that fails the silent decrypt falls back to login (empty catch → `renderLogin`). | None |
| 8 | Deploy workflow | PASS | `.github/workflows/deploy.yml` has exactly `permissions: { contents: read, pages: write, id-token: write }`, no secrets referenced, and only official actions: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`. Triggers: push to `main` + `workflow_dispatch`. `ci.yml` uses only `actions/checkout@v4` + `actions/setup-node@v4`. | None |
| 9 | Dependency audit | PASS with documented limitation | Network was available; `npm audit --json` ran and reports 5 advisories — all in **dev-only** packages: vitest 0.0.95–4.1.10 (critical, via tinypool + @vitest/mocker), tinypool ≤2.1.1 (critical), @vitest/mocker ≤4.1.11 (moderate), happy-dom ≤21.0.3 (critical), sharp ≤0.35.5-rc.1 (high, libvips/libheif). `npm ls --prod --all` is **empty**: the project has zero runtime dependencies, so nothing from `node_modules` ships to the deployed static site; exposure is limited to CI runners and local dev machines running tests/build/encode. Fixes require major bumps (vitest 5, happy-dom 21, sharp 0.35.5) that conflict with the pinned set accepted in PR #1 → accepted risk this card, open question to the human. Shipped-surface check for CI: `npm audit --omit=dev` (currently 0 findings). | Medium, accepted risk (decision logged in decisions.md, Proposed in PR #5) |
| 10 | Residual risks | Documented | (a) Session key bits sit in `localStorage` (`wc.key`) on the device — anyone with access to the unlocked device can read content until data is cleared. (b) Client-side lockout is cosmetic (mitigated by PBKDF2-SHA256 @ 600000 iterations + strong passphrase; planner decision). (c) `?date` override verified inert in production: in `dist/assets/*.js` the compiled `resolveNow` is `function x(e=window.location.search, t=!1){ if(t){...} }` — `import.meta.env.DEV` was replaced by `!1` (0 occurrences of `import.meta.env` in dist), and the only call site passes no dev flag, so the `?date` branch is dead code in the build. | Accepted risks, no fix per card |

### Findings table (summary)

| Severity | Count | Items |
|----------|-------|-------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 1 | #9 dev-only npm audit advisories (accepted risk, decision logged, open question to human) |
| Low | 0 | — |
| Info | 1 | #3 merge-commit author metadata carries the account login address (no action; history rewrite forbidden) |

No Critical/High findings → no code changes on this branch, per the card's
fix policy.

## Residual risks (accepted, documented — not fixed)

1. **Session key bits in localStorage:** `wc.key` holds the base64 derived
   key bits. Anyone with access to the unlocked device/browser profile can
   decrypt `content.enc` until site data is cleared. Mitigation is the
   device lock + the slow KDF; clearing site data removes it.
2. **Cosmetic client-side lockout:** the delay ladder in `src/lockout.ts`
   is a fallback, not a boundary; real resistance comes from
   PBKDF2-SHA256 at 600000 iterations and a strong passphrase.
3. **`?date` override:** dev-only by construction (`import.meta.env.DEV`
   compiled to `false` in production, verified in `dist/`); inert in the
   deployed build.
4. **Dev-only dependency advisories:** see item 9; `npm audit --omit=dev`
   is clean, so the shipped site is unaffected.

## What to re-check after WC-05..WC-07

- **New DOM paths:** re-run the XSS sink grep
  (`innerHTML|outerHTML|insertAdjacentHTML|document.write|eval|new Function`)
  over `src/` after every new interaction (scratch-off, mini-game, scene).
  Any canvas usage (WC-05..WC-07 may draw on `<canvas>`) must not draw
  decrypted strings into a tainted/exported image without review, and any
  `toDataURL`/`toBlob` export path needs a fresh look.
- **New interactions:** every new event handler that renders decrypted
  content (door texts, photos, names) must keep using `textContent` /
  property-assigned `src`; re-audit `openLightbox` successors.
- **New storage:** any new `localStorage` key beyond `wc.key`, `wc.name`,
  `wc.attempts`, `wc.until`, `wc.opened` needs a decisions.md entry and a
  secret-hygiene check.
- **New network calls:** the only fetch today is
  `${import.meta.env.BASE_URL}content.enc`; any new remote call must be
  re-reviewed (the design is offline-first).
- **Crypto drift:** if `scripts/encode.mjs` or `src/crypto.ts` change, the
  round-trip tests (`src/encode.test.ts`, `src/bundle.test.ts`) must still
  pass; re-verify constants (600000 / 16-byte salt / 12-byte IV / AES-256-GCM).
- **Workflow changes:** keep `permissions` minimal and actions within the
  official `actions/*` set; re-run `npm audit --omit=dev` in CI and the
  history PII sweep (`git log --all --name-only | grep '^content/'`) after
  any new content pipeline.
