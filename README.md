# Pradyun Krishnan, personal website

A personal site on white paper, in black ink or blue ink (the toggle in
the dock switches between them). It's plain HTML, CSS and JavaScript, so
there's no build step and nothing to install.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Home page: intro, experience, writing, film roll |
| `projects.html` | Projects ("Exhibit A") |
| `writing/index.html` | List of posts |
| `writing/hello-world.html` | Example post; copy it to write a new one |
| `styles.css` | All styles. Change `--ink` and `--sheet` at the top to re-color the site |
| `script.js` | Ink toggle, Contents menu, intro animations, film roll and the halftone portrait |
| `images/film/` | Film photos for the Film Roll (normal scans; the negatives are made automatically) |
| `images/portrait.jpg` | Your photo (add it; square, light background works best) |

Look for `EDIT:` comments in the HTML for the places to put your own content.

## Preview locally

From this folder, run:

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173.

## Put it on GitHub

1. Create an empty repository on github.com (no README).
2. From this folder:

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## Publish with GitHub Pages (free)

In the repository on GitHub: **Settings → Pages → Build and deployment →
Source: Deploy from a branch → Branch: `main` / `(root)` → Save**. After a
minute the site is live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

Name the repository `YOUR-USERNAME.github.io` to get the shorter
`https://YOUR-USERNAME.github.io/` address.

## Credits

Layout and parts of the code are adapted from
[cali.so](https://github.com/CaliCastle/cali.so) under the MIT License. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
