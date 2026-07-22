# Champions Pharmaceuticals — Website

Static marketing/corporate website for Champions Pharmaceuticals Group (Nigeria), rebuilt off the previous Shopify (Liquid) store into a fast, dependency-free static site.

## Stack
- Plain **HTML + CSS + vanilla JS** — no build step required to *view* (open `index.html`), no framework, no server needed.
- Pages are generated from one shared layout via **`build.mjs`** (Node, zero dependencies) so the header, footer and nav stay consistent.

## Editing content
1. Edit the relevant page block inside **`build.mjs`**.
2. Run `node build.mjs` to regenerate all `.html` files.
3. Commit the regenerated HTML.

Design tokens (colours, fonts, spacing) live in **`assets/css/style.css`** under `:root`. Brand accent is `--green: #00875A`.

## Structure
```
index.html            Home
about.html            Heritage & timeline
research.html         Research hub
research/*.html       6 research study pages
programs/*.html       Needleless & injectable delivery initiatives
products.html         NAFDAC-registered portfolio
partnerships.html     All institutional partners
contact.html          Enquiry form (wire to an email service before go-live)
compliance.html       Governance & regulatory
assets/               css · js · img
build.mjs             Static site generator
CNAME                 Custom domain for Cloudflare/GitHub Pages
```

## Deploy (Cloudflare Pages)
Connect this repo in Cloudflare Pages → Framework preset **None**, build command **(none)**, output directory **/** (root). The `CNAME` file targets `www.championspharmaceuticals.com`.

## To do before go-live
- **Contact form** currently shows a confirmation only; connect it to an email service (e.g. Cloudflare Pages Functions, Formspree, or Web3Forms) to receive submissions.
- **Logo:** the header/footer use a typographic wordmark lockup. Drop in a transparent-background emblem PNG/SVG when available (the original source logos had baked-in dark backgrounds).
