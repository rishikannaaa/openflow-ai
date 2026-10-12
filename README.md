# OpenFlow AI landing-page demo

This repository is a static HTML/CSS landing-page concept for a possible AI developer-tool project. It does not currently include an AI product, backend, workflow engine, or the features described as examples on the page. Update the copy to match real functionality before presenting it as a live product.

## Preview locally

Open `index.html` in a browser, or run a local server from this directory:

```powershell
npx --yes serve .
```

## Publish to GitHub

Create a **public** repository named `openflow-ai` under [rishikannaaa](https://github.com/rishikannaaa), without initializing it with a README, license, or `.gitignore`. Then, from this project directory, run:

```powershell
git init -b main
git add .
git commit -m "Create OpenFlow AI landing page demo"
git remote add origin https://github.com/rishikannaaa/openflow-ai.git
git push -u origin main
```

Git may ask you to sign in through your configured credential manager.

## Deploy with GitHub Pages

The workflow in `.github/workflows/deploy.yml` publishes the static site after each push to `main`.

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set the source to **GitHub Actions**.
3. Open **Actions** and wait for the `Deploy to GitHub Pages` workflow to finish.
4. The site URL will be `https://rishikannaaa.github.io/openflow-ai/`.

## Custom domain (optional)

First make sure the GitHub Pages URL works. Then configure a domain you own in **Settings → Pages → Custom domain**, and follow GitHub's current DNS instructions for your registrar. Do not publish an email address or claim domain ownership until it is actually configured and working.

## Before sharing

- Replace example text with accurate project details.
- Remove or qualify claims that are not supported by working code.
- Replace the GitHub username placeholders.
- Add a license only after choosing the terms under which you want others to use the code. This repository currently has no license.
- Do not imply that this demo qualifies for a grant, startup program, or API credits; eligibility and benefits are determined by the relevant provider.

## Repository contents

- `index.html` — landing page markup
- `styles.css` — responsive visual styling
- `.github/workflows/deploy.yml` — GitHub Pages deployment workflow
