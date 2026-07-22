/* ============================================================
   Champions Pharmaceuticals — static site generator
   Run: node build.mjs   → writes all .html pages from shared layout
   ============================================================ */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const YEAR = 2026;

/* ---------- shared bits ---------- */
const NAV = [
  ['Home', 'index.html'],
  ['About', 'about.html'],
  ['Research', 'research.html'],
  ['Products', 'products.html'],
  ['Partnerships', 'partnerships.html'],
  ['Contact', 'contact.html'],
];

// icons (inline, stroke-based — no icon library, per design rules)
const ic = {
  dist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7h18M3 12h18M3 17h13"/><circle cx="20" cy="17" r="2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l8 3v6c0 5-3.5 7.6-8 9-4.5-1.4-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  hands: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M17 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="3.2"/><path d="M22 20v-2a4 4 0 00-3-3.8M16 3.2a4 4 0 010 7.6"/></svg>',
  flask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 3v6l-5 8.5A2 2 0 006 20.5h12a2 2 0 001.7-3L14 9V3"/><path d="M8 3h8M7.5 14h9"/></svg>',
  dna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3c0 6 12 6 12 12M18 3c0 6-12 6-12 12M6 21c0-2 12-2 12 0M6 3c0-.7 12-.7 12 0M7.5 7h9M7.5 17h9"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
};

function header(active) {
  const links = NAV.map(([label, href]) =>
    `<li><a href="${href}"${href === active ? ' aria-current="page"' : ''}>${label}</a></li>`
  ).join('');
  return `<header class="site-header">
  <div class="wrap nav-bar">
    <a class="brand" href="index.html" aria-label="Champions Pharmaceuticals — home">
      <span class="brand-mark" aria-hidden="true">C</span>
      <span class="brand-word"><span class="bw1">Champions</span><span class="bw2">Pharmaceuticals</span></span>
    </a>
    <nav aria-label="Primary">
      <ul class="nav-links" id="nav-links">${links}</ul>
    </nav>
    <div class="nav-cta">
      <span class="nav-flag">Nigeria</span>
      <a href="contact.html" class="btn btn-primary" style="padding:.6rem 1.15rem;font-size:.9rem">Partner with us</a>
      <button class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="nav-links">${ic.menu}</button>
    </div>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">
        <a class="brand brand-foot" href="index.html" aria-label="Champions Pharmaceuticals — home">
          <span class="brand-mark" aria-hidden="true">C</span>
          <span class="brand-word"><span class="bw1">Champions</span><span class="bw2">Pharmaceuticals</span></span>
        </a>
        <p>Regulated pharmaceutical distribution, research and institutional partnership — advancing Nigeria's healthcare infrastructure since 1993.</p>
      </div>
      <div>
        <h5>Company</h5>
        <ul>
          <li><a href="about.html">About &amp; Heritage</a></li>
          <li><a href="partnerships.html">Partnerships</a></li>
          <li><a href="research.html">Research</a></li>
          <li><a href="products.html">Product Portfolio</a></li>
        </ul>
      </div>
      <div>
        <h5>Programmes</h5>
        <ul>
          <li><a href="programs/needleless-delivery.html">Needleless Delivery</a></li>
          <li><a href="programs/injectable-delivery.html">Injectable Delivery</a></li>
          <li><a href="research.html">Research Studies</a></li>
          <li><a href="compliance.html">Compliance</a></li>
        </ul>
      </div>
      <div>
        <h5>Contact</h5>
        <ul>
          <li><a href="mailto:contact@championspharmaceuticals.com">contact@championspharmaceuticals.com</a></li>
          <li><a href="tel:+2347070320052">+234 707 032 0052</a></li>
          <li>Lagos, Nigeria</li>
          <li><a href="contact.html">Enquiry form</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      <p class="disclaimer">This information — including product information — is intended only for residents of Nigeria. Products may have different labelling in other countries. Champions Pharmaceuticals operates in alignment with NAFDAC and Federal Ministry of Health standards.</p>
      <p>&copy; <span id="yr">${YEAR}</span> Champions Pharmaceuticals. All rights reserved.</p>
    </div>
  </div>
</footer>`;
}

function layout({ title, desc, active, body, prefix = '' }) {
  // prefix handles subfolder pages (research/, programs/) that need ../ on assets & nav
  const h = prefix ? header(active).replace(/(href|src)="(?!http|mailto|tel|#)/g, `$1="${prefix}`) : header(active);
  const f = prefix ? footer().replace(/(href|src)="(?!http|mailto|tel|#)/g, `$1="${prefix}`) : footer();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<script>document.documentElement.className+=' js';</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="icon" href="${prefix}assets/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${prefix}assets/css/style.css">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
</head>
<body>
${h}
<main>
${body}
</main>
${f}
<script src="${prefix}assets/js/main.js"></script>
</body>
</html>`;
}

function write(rel, html) {
  const full = join(ROOT, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html);
  console.log('wrote', rel, `(${(html.length / 1024).toFixed(1)}kb)`);
}

/* ============================================================
   PAGE: HOME
   ============================================================ */
const home = `
<section class="hero">
  <img class="hero-bg" src="assets/img/hero-scientists.jpg" alt="">
  <div class="wrap hero-inner">
    <span class="eyebrow" style="color:#8fe3c2">Institutional Pharmaceutical Partner · Est. 1993</span>
    <h1>Advancing pharmaceutical excellence through research &amp; partnership</h1>
    <p>Champions Pharmaceuticals supports Nigeria's healthcare system through regulated distribution, evidence-based research, and long-standing partnerships with government, military-medical and international health institutions.</p>
    <div class="hero-cta">
      <a href="research.html" class="btn btn-primary btn-lg">Explore our research</a>
      <a href="partnerships.html" class="btn btn-ghost btn-lg">View partnerships</a>
    </div>
    <div class="hero-meta">
      <div class="stat"><div class="n">30+</div><div class="l">Years of service</div></div>
      <div class="stat"><div class="n">6</div><div class="l">Active research studies</div></div>
      <div class="stat"><div class="n">10+</div><div class="l">Institutional partners</div></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="split">
      <div class="split-media reveal"><img src="assets/img/research-tablet.jpg" alt="Champions Pharmaceuticals researcher reviewing clinical data"></div>
      <div class="reveal">
        <span class="eyebrow">About Champions</span>
        <h2>A Nigerian pharmaceutical institution built on heritage and evidence</h2>
        <p class="lead">Officially registered on 4 June 1993, Champions Pharmaceuticals emerged from a multi-generational pharmaceutical heritage to serve Nigeria's healthcare needs through regulated, documented, quality-assured medicine.</p>
        <p>Today our work spans three connected mandates — regulated distribution, structured research and development, and public-health partnership — all held to NAFDAC and Federal Ministry of Health standards.</p>
        <p style="margin-top:1.4rem"><a href="about.html" class="btn btn-ghost">Read our heritage ${ic.arrow}</a></p>
      </div>
    </div>
  </div>
</section>

<section class="section-tint">
  <div class="wrap">
    <div class="section-head center reveal">
      <span class="eyebrow">What we do</span>
      <h2>Four connected focus areas</h2>
      <p class="lead">Structured R&amp;D methodology applied across therapeutic and scientific domains — each grounded in reproducible evidence.</p>
    </div>
    <div class="grid g4">
      <div class="card reveal"><div class="icon">${ic.dist}</div><h3>Pharmaceutical Distribution</h3><p>Regulated distribution networks ensuring safe, effective, NAFDAC-registered medicines reach healthcare institutions nationwide.</p></div>
      <div class="card reveal"><div class="icon">${ic.shield}</div><h3>Regulatory Compliance</h3><p>Strict adherence to NAFDAC standards and international pharmaceutical regulation for verifiable quality assurance.</p></div>
      <div class="card reveal"><div class="icon">${ic.hands}</div><h3>Public-Health Partnership</h3><p>Collaboration with government agencies, the military-medical corps and international bodies supporting national health goals.</p></div>
      <div class="card reveal"><div class="icon">${ic.flask}</div><h3>Research &amp; Development</h3><p>Structured investigation in oncology, regenerative medicine, haematology and global-health policy.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head center reveal">
      <span class="eyebrow">Featured research</span>
      <h2>Evidence-based research initiatives</h2>
      <p class="lead">Advancing pharmaceutical science through systematic literature review, translational research and international collaboration.</p>
    </div>
    <div class="grid g3">
      <a class="mcard reveal" href="research/stem-cell.html"><div class="thumb"><img src="assets/img/stem-cell.png" alt=""></div><div class="body"><span class="tag">Oncology · Regenerative</span><h3>Advanced Stem Cell Research &amp; Treatment Pathways</h3><p>Mesenchymal and haematopoietic stem-cell applications in oncology and regenerative medicine.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard reveal" href="research/scorpion-venom.html"><div class="thumb"><img src="assets/img/scorpion-venom.webp" alt=""></div><div class="body"><span class="tag">Oncology · Venom Pharmacology</span><h3>Pharma-Grade Scorpion Venom — Oncology Compound</h3><p>Bioactive peptides and Chlorotoxin (Tumor Paint) in cancer-selective therapeutics.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard reveal" href="research/sickle-cell.html"><div class="thumb"><img src="assets/img/doctors-1.webp" alt=""></div><div class="body"><span class="tag">Haematology</span><h3>Sickle Cell Disease: From Management to Functional Cure</h3><p>Gene editing, stem-cell transplantation and disease-modifying pharmacotherapy.</p><span class="more">Read study ${ic.arrow}</span></div></a>
    </div>
    <p style="text-align:center;margin-top:2.4rem"><a href="research.html" class="btn btn-ghost btn-lg">All research programmes ${ic.arrow}</a></p>
  </div>
</section>

<section class="section-green">
  <div class="wrap">
    <div class="split">
      <div>
        <span class="eyebrow" style="color:#8fe3c2">Flagship initiative</span>
        <h2>Advancing needleless drug delivery in Nigeria</h2>
        <p class="lead" style="color:#cfe3da">A strategic initiative with the Federal Ministry of Health, NPHCDA and international partners to pioneer needleless delivery systems, support national vaccination campaigns and improve access to safer therapies nationwide.</p>
        <div class="hero-cta" style="margin-top:1.6rem">
          <a href="programs/needleless-delivery.html" class="btn btn-primary">Needleless delivery</a>
          <a href="programs/injectable-delivery.html" class="btn btn-ghost">Injectable delivery</a>
        </div>
      </div>
      <div class="split-media"><img src="assets/img/medical-tech.webp" alt="Advanced medical delivery technology" style="opacity:.96"></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="section-head center reveal">
      <span class="eyebrow">Trust &amp; alignment</span>
      <h2>Strategic partnerships &amp; affiliations</h2>
      <p class="lead">Building bridges across healthcare sectors through long-standing partnerships with government agencies, the military-medical corps, international organisations and regulatory bodies.</p>
    </div>
    <div class="logo-wall reveal">
      <div class="lw"><img src="assets/img/partner-fmoh.png" alt="Federal Ministry of Health"></div>
      <div class="lw"><img src="assets/img/partner-nafdac.png" alt="NAFDAC"></div>
      <div class="lw"><img src="assets/img/partner-who.png" alt="World Health Organization"></div>
      <div class="lw"><img src="assets/img/partner-army.png" alt="Nigerian Army Medical Corps"></div>
      <div class="lw"><img src="assets/img/partner-govuk.png" alt="British Government"></div>
      <div class="lw"><img src="assets/img/partner-uacn.webp" alt="UAC of Nigeria"></div>
      <div class="lw"><img src="assets/img/partner-phillips.jpg" alt="Phillips Consulting"></div>
      <div class="lw"><img src="assets/img/partner-aston.png" alt="Aston Rothbury"></div>
      <div class="lw"><img src="assets/img/partner-unilever.png" alt="Unilever heritage"></div>
      <div class="lw" style="font-family:var(--serif);color:var(--green);font-size:.95rem;text-align:center;line-height:1.2">MPSN<br><span style="font-size:.62rem;color:var(--muted);font-family:var(--sans)">Pharm. Society of Nigeria</span></div>
    </div>
    <p style="text-align:center;margin-top:2.4rem"><a href="partnerships.html" class="btn btn-ghost btn-lg">Explore all partnerships ${ic.arrow}</a></p>
  </div>
</section>

<section class="section-tint">
  <div class="wrap narrow" style="text-align:center">
    <span class="eyebrow">Get in touch</span>
    <h2>Partner with Champions Pharmaceuticals</h2>
    <p class="lead">We welcome strategic dialogue with healthcare stakeholders, government agencies and international partners advancing pharmaceutical excellence and healthcare access across Nigeria.</p>
    <p style="margin-top:1.8rem"><a href="contact.html" class="btn btn-primary btn-lg">Contact our partnership team ${ic.arrow}</a></p>
  </div>
</section>
`;

write('index.html', layout({
  title: 'Champions Pharmaceuticals — Regulated Pharmaceutical Solutions for Nigeria',
  desc: 'Champions Pharmaceuticals supports Nigeria\'s healthcare infrastructure through regulated distribution, evidence-based research, and institutional partnerships since 1993.',
  active: 'index.html', body: home,
}));

/* helper for interior page banners */
function pbanner({ crumbs, h1, p, bg, prefix = '' }) {
  return `<section class="pbanner">
  <img class="pbanner-bg" src="${prefix}${bg}" alt="">
  <div class="wrap pbanner-inner">
    <div class="crumbs">${crumbs}</div>
    <h1>${h1}</h1>
    <p>${p}</p>
  </div>
</section>`;
}

/* ============================================================
   PAGE: ABOUT
   ============================================================ */
const about = pbanner({
  crumbs: '<a href="index.html">Home</a> / About',
  h1: 'A legacy forged through dedication &amp; service',
  p: 'From a documented founding vision in Nigeria’s military era to a modern institution advancing pharmaceutical excellence — our journey spans generations of service to Nigerian healthcare.',
  bg: 'assets/img/doctors-2.webp',
}) + `
<section>
  <div class="wrap narrow">
    <span class="eyebrow">The founding vision</span>
    <h2>A bold move in uncertain times</h2>
    <p class="lead">Champions Pharmaceuticals was founded in 1992 and officially registered on 4 June 1993 — born during Nigeria’s military era from a vision to address critical pharmaceutical supply gaps through documented, regulated medicine importation from the United Kingdom.</p>
    <p>Leveraging deep family roots in pharmaceutical heritage, the company pioneered the introduction of a comprehensive, documented medication list to supply the Nigerian Army Medical Corps — facilitated through the late Honourable Lt. Colonel S.J. Bala, former Deputy Director of MPSN at the Nigerian Army Medical Corps, Bonny Camp, Victoria Island. The company was ordered into creation by senior military-medical leadership, establishing a founding commitment to serving Nigeria’s armed forces and national health infrastructure.</p>
  </div>
</section>

<section class="section-tint">
  <div class="wrap">
    <div class="section-head center"><span class="eyebrow">A multi-generational heritage</span><h2>Principles passed through generations</h2></div>
    <div class="timeline">
      <div class="tl-item"><div class="yr">1879–1886</div><h4>United African Company &amp; Royal Niger Company</h4><p>The family’s commercial and pharmaceutical heritage traces through the United African Company (1879), National African Company (1882) and the Royal Niger Company, founded 1886 by George Taubman Goldie — enterprises that shaped Nigeria’s commercial and healthcare-supply foundations.</p></div>
      <div class="tl-item"><div class="yr">1927</div><h4>Pharmaceutical Society of Nigeria established</h4><p>The MPSN was founded to regulate professional pharmacy practice and maintain ethical standards — the professional framework Champions Pharmaceuticals proudly upholds today.</p></div>
      <div class="tl-item"><div class="yr">Mid-century</div><h4>The UAC legacy — Olayinka Mosunmola Kuti</h4><p>The founder’s late mother managed the Hospital Department at UAC of Nigeria as an A.J. Seward / Kingsway Chemist, devoting her professional life to ensuring Nigerians received the highest pharmaceutical services — the direct heritage behind Champions’ commitment to patient care.</p></div>
      <div class="tl-item"><div class="yr">1992–1993</div><h4>Champions Pharmaceuticals founded</h4><p>Founded in 1992 and officially registered on 4 June 1993 — the same year NAFDAC was established — to supply documented medications to the Nigerian Army during the military era.</p></div>
      <div class="tl-item"><div class="yr">1993</div><h4>Regulatory transformation &amp; NAFDAC</h4><p>The documented UK medication list and importation framework contributed to the wider discussions that informed pharmaceutical regulation in Nigeria as NAFDAC — the National Agency for Food &amp; Drug Administration &amp; Control — was established.</p></div>
      <div class="tl-item"><div class="yr">1999 – today</div><h4>Enduring national service</h4><p>Following Nigeria’s return to democracy, Champions has maintained partnerships with the Nigerian Army Medical Corps, the Federal Ministry of Health and international organisations — continuing a legacy of regulated distribution, research and healthcare advancement across three decades.</p></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="split">
      <div class="split-media"><img src="assets/img/microscope-study.jpg" alt="Scientific research at Champions Pharmaceuticals"></div>
      <div>
        <span class="eyebrow">Proud heritage</span>
        <h2>A creation of the Pharmaceutical Society of Nigeria</h2>
        <p>Champions Pharmaceuticals stands as a proud creation born from MPSN heritage — a professional designation used by licensed pharmacists registered with the Pharmaceutical Society of Nigeria, established in 1927 to maintain the highest professional ethics. This designation embodies a century-long tradition of pharmaceutical excellence, professional integrity and commitment to public health that remains central to our mission.</p>
        <p>Our enduring commitment extends beyond commercial success to national healthcare advancement, regulatory-compliance excellence, and the preservation of a pharmaceutical heritage that has served Nigeria for over three decades.</p>
        <p style="margin-top:1.3rem"><a href="partnerships.html" class="btn btn-ghost">Our partnerships &amp; affiliations ${ic.arrow}</a></p>
      </div>
    </div>
  </div>
</section>

<section class="section-green">
  <div class="wrap narrow" style="text-align:center">
    <h2>Our enduring commitment to the Federal Republic of Nigeria</h2>
    <p class="lead" style="color:#cfe3da">Champions Pharmaceuticals continues the multi-generational legacy of service, innovation and dedication that has defined our history — delivering on our founding promise through regulated distribution, research initiatives and unwavering dedication to the health and wellbeing of all Nigerians.</p>
  </div>
</section>`;

write('about.html', layout({
  title: 'About &amp; Heritage — Champions Pharmaceuticals',
  desc: 'The heritage of Champions Pharmaceuticals — founded 1992, registered 1993 — spanning MPSN professional roots, the UAC legacy and three decades of Nigerian healthcare service.',
  active: 'about.html', body: about,
}));

/* ============================================================
   PAGE: RESEARCH HUB
   ============================================================ */
const research = pbanner({
  crumbs: '<a href="index.html">Home</a> / Research',
  h1: 'Next-generation therapeutic development',
  p: 'Advancing pharmaceutical science through structured research and development — from systematic literature review and translational research to international collaboration and regulatory science.',
  bg: 'assets/img/cell-culture-hood.jpg',
}) + `
<section>
  <div class="wrap">
    <div class="section-head"><span class="eyebrow">R&amp;D methodology</span><h2>Structured research across four scientific domains</h2><p class="lead">A Research &amp; Development programme is a structured, systematic initiative to acquire new knowledge and develop innovative therapies. Champions applies this methodology across oncology, regenerative medicine, haematology and global-health policy — each involving genuine technical uncertainty and reproducible investigation.</p></div>
    <div class="grid g4">
      <div class="card"><div class="icon">${ic.flask}</div><h3>Oncology &amp; Cancer Therapeutics</h3><p>Our primary R&amp;D domain — tumour microenvironment dynamics, next-generation treatment strategies, and novel pharmacotherapy across haematological and solid malignancies.</p></div>
      <div class="card"><div class="icon">${ic.dna}</div><h3>Regenerative Medicine</h3><p>Translational research into mesenchymal and haematopoietic stem-cell applications, tissue repair and cellular engineering platforms.</p></div>
      <div class="card"><div class="icon">${ic.shield}</div><h3>Haematology</h3><p>Sickle cell disease management, gene-editing strategies and disease-modifying pharmacotherapy bridging symptom management and functional cure.</p></div>
      <div class="card"><div class="icon">${ic.globe}</div><h3>Global Health &amp; Policy</h3><p>Regulatory science, healthcare-infrastructure analysis and evidence-based policy frameworks addressing therapeutic access in Nigeria and emerging markets.</p></div>
    </div>
  </div>
</section>

<section class="section-tint">
  <div class="wrap">
    <div class="section-head center"><span class="eyebrow">Research studies</span><h2>Active research programmes</h2><p class="lead">Peer-reviewed evidence syntheses and translational reviews — for research and informational purposes, grounded in reproducible scientific evidence.</p></div>
    <div class="grid g3">
      <a class="mcard" href="research/stem-cell.html"><div class="thumb"><img src="assets/img/stem-cell.png" alt=""></div><div class="body"><span class="tag">Oncology · Regenerative</span><h3>Advanced Stem Cell Research &amp; Treatment Pathways</h3><p>Mesenchymal and haematopoietic stem-cell applications in oncology and regenerative medicine.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard" href="research/scorpion-venom.html"><div class="thumb"><img src="assets/img/scorpion-venom.webp" alt=""></div><div class="body"><span class="tag">Oncology · Venom Pharmacology</span><h3>Scorpion Venom — Oncology Research Compound</h3><p>Bioactive peptides and Chlorotoxin (Tumor Paint) in cancer-selective therapeutics.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard" href="research/sickle-cell.html"><div class="thumb"><img src="assets/img/doctors-1.webp" alt=""></div><div class="body"><span class="tag">Haematology</span><h3>Sickle Cell: From Management to Functional Cure</h3><p>Gene editing, stem-cell transplantation and disease-modifying pharmacotherapy.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard" href="research/peptide.html"><div class="thumb"><img src="assets/img/peptide.jpg" alt=""></div><div class="body"><span class="tag">Peptide Therapeutics</span><h3>Bioactive Peptide Therapeutics Research Initiative</h3><p>Clinical potential, safety and translational applications of bioactive peptide compounds.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard" href="research/phytocannabinoid.html"><div class="thumb"><img src="assets/img/traditional-plants.jpg" alt=""></div><div class="body"><span class="tag">Phytotherapeutics</span><h3>Phytocannabinoids in Traditional Nigerian Medicine</h3><p>Scientific validation of phytocannabinoids and indigenous medicine within regulatory frameworks.</p><span class="more">Read study ${ic.arrow}</span></div></a>
      <a class="mcard" href="research/border-securitization.html"><div class="thumb"><img src="assets/img/border-security.webp" alt=""></div><div class="body"><span class="tag">Policy &amp; Security Studies</span><h3>Border Securitization &amp; Social Construction</h3><p>Interdisciplinary analysis of contemporary border fortification and territorial governance.</p><span class="more">Read study ${ic.arrow}</span></div></a>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="statband">
      <div><div class="n">4</div><div class="l">Active research domains</div></div>
      <div><div class="n">6</div><div class="l">Documented studies</div></div>
      <div><div class="n">NAFDAC</div><div class="l">&amp; ISO-aligned standards</div></div>
      <div><div class="n">Global</div><div class="l">Collaboration network</div></div>
    </div>
  </div>
</section>

<section class="section-green">
  <div class="wrap narrow" style="text-align:center">
    <span class="eyebrow" style="color:#8fe3c2">From discovery to patient impact</span>
    <h2>Why structured R&amp;D matters</h2>
    <p class="lead" style="color:#cfe3da">For Champions Pharmaceuticals, structured R&amp;D is the engine that drives our mission — advancing innovative therapies in oncology, regenerative medicine and haematologic disease, with a specific commitment to closing treatment gaps for underserved populations in Nigeria and across Africa.</p>
    <p style="margin-top:1.6rem"><a href="contact.html" class="btn btn-primary btn-lg">Discuss research collaboration ${ic.arrow}</a></p>
  </div>
</section>`;

write('research.html', layout({
  title: 'Research — Champions Pharmaceuticals',
  desc: 'Champions Pharmaceuticals research programmes across oncology, regenerative medicine, haematology and global-health policy — evidence-based studies grounded in reproducible science.',
  active: 'research.html', body: research,
}));

/* ============================================================
   PAGE: PARTNERSHIPS  (preserve ALL partners + capabilities)
   ============================================================ */
function partner({ logo, name, since, intro, rel, caps }) {
  return `<div class="partner">
    <div class="plogo">${logo ? `<img src="assets/img/${logo}" alt="${name}">` : `<span style="font-family:var(--serif);color:var(--green);font-size:1.4rem;text-align:center">${name.split('(')[0]}</span>`}</div>
    <div>
      <h3>${name}</h3>
      <span class="since">${since}</span>
      <p>${intro}</p>
      <p>${rel}</p>
      <ul class="cap">${caps.map(c => `<li>${c}</li>`).join('')}</ul>
    </div>
  </div>`;
}

const partners = [
  partner({ logo:'partner-army.png', name:'Nigerian Army Medical Corps (NAMC)', since:'Founding partnership · 1992',
    intro:'The Nigerian Army Medical Corps, established in 1956, provides comprehensive healthcare to Nigerian military personnel and has been instrumental in peacekeeping missions across Africa.',
    rel:'Champions Pharmaceuticals was specifically ordered for creation by senior NAMC leadership to supply documented medications from the United Kingdom during Nigeria’s military era — a founding relationship established through the late Honourable Lt. Colonel S.J. Bala, Deputy Director of MPSN at the Nigerian Army Medical Corps, Bonny Camp, Victoria Island.',
    caps:['Military pharmaceutical supply chains &amp; logistics','Emergency medical supplies for peacekeeping operations','Specialised medication procurement &amp; distribution','Healthcare-facility support across installations'] }),
  partner({ logo:'partner-nafdac.png', name:'NAFDAC — Food &amp; Drug Administration &amp; Control', since:'Registered 1993 · 30+ years of compliance',
    intro:'NAFDAC, established in January 1993, regulates the manufacturing, importation, exportation, distribution and sale of drugs, food, cosmetics, medical devices and chemicals in Nigeria.',
    rel:'Champions Pharmaceuticals was officially registered on 4 June 1993 — the same year NAFDAC was established. The documented UK medication list is understood to have contributed to the discussions that informed NAFDAC’s regulatory approach to pharmaceutical importation and quality standards.',
    caps:['Regulatory compliance &amp; standards adherence','Quality control &amp; product verification','Import documentation &amp; licensing','Pharmacovigilance &amp; adverse-event reporting'] }),
  partner({ logo:'partner-fmoh.png', name:'Federal Ministry of Health &amp; Social Welfare', since:'30+ years supporting national healthcare',
    intro:'The Federal Ministry of Health and Social Welfare leads Nigeria’s health-sector transformation — strengthening health systems, improving primary healthcare and advancing Universal Health Coverage.',
    rel:'Following Nigeria’s return to democracy in 1999, Champions has maintained continuous collaboration with the Ministry — supporting national health initiatives, public-health programmes and emergency-response efforts across successive administrations.',
    caps:['National primary-healthcare programmes &amp; supply','Emergency response &amp; disaster-relief supplies','Public-health campaign support','Healthcare-infrastructure strengthening'] }),
  partner({ logo:'partner-who.png', name:'World Health Organization (WHO) Nigeria', since:'Aligned with global health objectives',
    intro:'WHO Nigeria provides technical support for health-system strengthening, disease prevention and emergency response, advancing Universal Health Coverage and Sustainable Development Goal 3.',
    rel:'Champions Pharmaceuticals aligns its work with WHO Nigeria’s initiatives through pharmaceutical supply-chain contributions, emergency-response capabilities and participation in public–private partnerships advancing primary-healthcare revitalisation, ensuring adherence to WHO global standards.',
    caps:['Support for WHO health-facility programmes','Outbreak-response pharmaceutical supplies','Immunisation-programme logistics','Health-system capacity building'] }),
  partner({ logo:'partner-govuk.png', name:'British Government — Trade &amp; Standards', since:'UK–Nigeria pharmaceutical trade',
    intro:'A strategic relationship supporting international pharmaceutical trade, quality standards and regulatory alignment between the United Kingdom and Nigerian pharmaceutical sectors.',
    rel:'This relationship facilitated Champions’ founding mission to bring a documented list of high-quality, regulated medications from the United Kingdom to supply the Nigerian Army — demonstrating a commitment to quality standards and proper documentation.',
    caps:['UK pharmaceutical sourcing &amp; quality assurance','International regulatory-standards alignment','Cross-border trade documentation','International best-practice &amp; quality control'] }),
  partner({ logo:'partner-nafdac.png', name:'Pharmaceutical Society of Nigeria (MPSN)', since:'Member since founding · Est. 1927',
    intro:'The Pharmaceutical Society of Nigeria, established in 1927, is Nigeria’s premier professional body for pharmacists, maintaining the highest standards of professional ethics and pharmaceutical education.',
    rel:'Champions Pharmaceuticals is a proud creation under MPSN’s professional framework. Our founder’s mother, Olayinka Mosunmola Kuti, served as an A.J. Seward / Kingsway Chemist at the UAC Hospital Department, exemplifying the family’s deep MPSN heritage; our founding was facilitated through the late Lt. Colonel S.J. Bala, former Deputy Director of MPSN.',
    caps:['Professional certification &amp; continuing education','Pharmaceutical ethics standards','Industry advocacy &amp; policy development','Quality-assurance best practices'] }),
  partner({ logo:'partner-uacn.webp', name:'United Africa Company of Nigeria (UACN)', since:'Historical heritage · 1879–present',
    intro:'The United Africa Company of Nigeria — historically a subsidiary of Unilever Plc — represents a foundational connection to Champions Pharmaceuticals’ pharmaceutical heritage.',
    rel:'Olayinka Mosunmola Kuti, the founder’s late mother, played a significant role managing the Hospital Department at UACN as an A.J. Seward / Kingsway Chemist. Our family’s pharmaceutical legacy traces through the Royal Niger Company (1886), United African Company (1879) and UACN — establishing the professional foundation that led to Champions Pharmaceuticals’ creation.',
    caps:['Historical pharmaceutical supply-chain expertise','Professional standards from the UACN Hospital Dept.','A.J. Seward / Kingsway Chemist heritage','Importation &amp; quality-control legacy'] }),
  partner({ logo:'partner-unilever.png', name:'Unilever — Heritage Connection', since:'Heritage lineage via UAC',
    intro:'A global consumer-goods leader operating across health and personal-care sectors in over 190 countries, and — through UAC of Nigeria — part of Champions Pharmaceuticals’ pharmaceutical heritage.',
    rel:'UACN historically operated as part of the United African Company, itself connected to Unilever Plc. Following Unilever’s divestment of its stake in 1994, UACN transformed into an independent, publicly quoted Nigerian company — a milestone in the heritage lineage that Champions carries forward.',
    caps:['Heritage lineage &amp; professional standards','Health &amp; personal-care sector connection','International quality benchmarks','Historical distribution expertise'] }),
  partner({ logo:'partner-phillips.jpg', name:'Phillips Consulting &amp; Focus Consultancy', since:'Strategic advisory partnership',
    intro:'Strategic consultancy partnerships providing specialised expertise in pharmaceutical operations, regulatory compliance, business development and healthcare-sector advisory.',
    rel:'These partnerships enhance Champions’ operational excellence and strategic positioning in Nigeria’s pharmaceutical landscape — from market development and NAFDAC liaison to supply-chain optimisation and public–private partnership development.',
    caps:['Pharmaceutical business strategy &amp; market development','Regulatory-compliance consulting &amp; NAFDAC liaison','Operational efficiency &amp; supply-chain optimisation','Public–private partnership development'] }),
  partner({ logo:'partner-aston.png', name:'Aston Rothbury', since:'International pharmaceutical partnership',
    intro:'An international pharmaceutical and healthcare partnership providing access to global pharmaceutical markets, advanced healthcare solutions and international quality standards.',
    rel:'This partnership strengthens Champions’ capabilities in specialised pharmaceutical products and international pharmaceutical trade — expanding the product portfolio and enabling global supply-chain access.',
    caps:['International product-portfolio expansion','Global supply-chain access &amp; logistics','Advanced pharmaceutical technologies','International quality-standards implementation'] }),
];

const partnerships = pbanner({
  crumbs:'<a href="index.html">Home</a> / Partnerships',
  h1:'Strategic partnerships &amp; affiliations',
  p:'Building bridges across healthcare sectors through long-standing partnerships with government agencies, the military-medical corps, international organisations and regulatory bodies to advance pharmaceutical excellence in Nigeria.',
  bg:'assets/img/doctors-1.webp',
}) + `
<section>
  <div class="wrap">
    <div class="grid" style="gap:1.4rem">${partners.join('')}</div>
  </div>
</section>
<section class="section-tint">
  <div class="wrap narrow" style="text-align:center">
    <span class="eyebrow">Work with us</span>
    <h2>Interested in partnership opportunities?</h2>
    <p class="lead">Champions Pharmaceuticals welcomes strategic partnerships that advance pharmaceutical excellence and improve healthcare access across Nigeria.</p>
    <p style="margin-top:1.6rem"><a href="contact.html" class="btn btn-primary btn-lg">Contact our partnership team ${ic.arrow}</a></p>
  </div>
</section>`;

write('partnerships.html', layout({
  title: 'Partnerships &amp; Affiliations — Champions Pharmaceuticals',
  desc: 'Champions Pharmaceuticals’ partnerships: Nigerian Army Medical Corps, NAFDAC, Federal Ministry of Health, WHO, British Government, MPSN, UACN, Phillips Consulting and Aston Rothbury.',
  active: 'partnerships.html', body: partnerships,
}));

/* ============================================================
   PAGE: PRODUCTS
   ============================================================ */
const cats = [
  ['Antibiotics &amp; Anti-infectives','Comprehensive range for treating bacterial infections',[['Amoxicillin','500mg','Capsules'],['Ampicillin','250mg / 1g','Capsules / Injection'],['Chloramphenicol','250mg','Capsules / Eye Drops'],['Tetracycline','250mg','Capsules'],['Ciprofloxacin','500mg','Tablets'],['Metronidazole','200mg','Tablets'],['Erythromycin','250mg','Tablets'],['Gentamycin','80mg','Injection'],['Co-trimoxazole','480mg','Tablets']]],
  ['Analgesics &amp; Anti-inflammatories','Pain management and anti-inflammatory medication',[['Paracetamol','500mg / 120mg/5ml','Tablets / Syrup'],['Aspirin','300mg','Tablets'],['Ibuprofen','200mg / 100mg/5ml','Tablets / Syrup'],['Diclofenac','50mg','Tablets'],['Piroxicam','20mg','Capsules']]],
  ['Vitamins &amp; Supplements','Essential vitamins and nutritional supplements',[['Vitamin C / Ascorbic Acid','100mg','Tablets'],['Vitamin B Complex / B1 / B6 / B12','—','Tablets / Injection'],['Folic Acid','5mg','Tablets'],['Calcium Lactate','300mg','Tablets'],['Ferrous Sulphate / Iron Dextran','200mg','Tablets / Injection'],['Multivitamin','—','Syrup']]],
  ['Gastrointestinal','Treatments for digestive-system disorders',[['Omeprazole','20mg','Capsules'],['Ranitidine','150mg','Tablets'],['Magnesium Trisilicate','—','Tablets'],['Metoclopramide','10mg','Tablets'],['Loperamide','2mg','Capsules'],['ORS Sachets','—','Powder']]],
  ['Cardiovascular &amp; Antihypertensives','Medications for heart and blood-pressure management',[['Amlodipine','5mg','Tablets'],['Nifedipine','20mg','Tablets'],['Atenolol','50mg','Tablets'],['Methyldopa','250mg','Tablets'],['Furosemide','40mg','Tablets'],['Digoxin','0.25mg','Tablets']]],
  ['Antimalarial &amp; Antiparasitic','Treatments for malaria and parasitic infections',[['Artemether / Lumefantrine','20/120mg','Tablets'],['Artesunate','50mg','Tablets'],['Chloroquine','250mg','Tablets'],['Quinine','300mg','Tablets'],['Albendazole','400mg','Tablets'],['Ivermectin','3mg','Tablets']]],
  ['Endocrine &amp; Hormonal','Hormonal medications and endocrine treatments',[['Insulin (Soluble / Lente)','—','Injection'],['Glibenclamide','5mg','Tablets'],['Metformin','500mg','Tablets'],['Prednisolone','5mg','Tablets'],['Hydrocortisone','100mg','Injection'],['Levothyroxine','100mcg','Tablets']]],
  ['Respiratory','Treatments for respiratory conditions',[['Salbutamol','2mg / 100mcg','Tablets / Inhaler'],['Aminophylline','100mg','Tablets'],['Beclomethasone','—','Inhaler'],['Cetirizine','10mg','Tablets'],['Chlorpheniramine','4mg','Tablets']]],
  ['Vaccines &amp; Immunologicals','Vaccines and immunological products',[['Tetanus Toxoid','0.5ml','Injection'],['BCG Vaccine','—','Injection'],['Hepatitis B Vaccine','—','Injection'],['Polio Vaccine','—','Oral'],['DPT Vaccine','—','Injection'],['Measles / Yellow Fever','—','Injection']]],
  ['Dermatologicals','Creams, ointments and skin treatments',[['Betamethasone','0.1%','Cream'],['Hydrocortisone','1%','Cream'],['Clotrimazole / Miconazole','1% / 2%','Cream'],['Silver Sulfadiazine','1%','Cream'],['Benzoyl Peroxide','5%','Gel'],['Calamine','—','Lotion']]],
];
const portfolio = cats.map(([name,desc,rows]) => `<details class="pcat"><summary>${name}<span class="caret">${ic.arrow.replace('M5 12h14M13 6l6 6-6 6','M6 9l6 6 6-6')}</span></summary><div class="plist"><p class="muted" style="font-size:.9rem;margin:.4rem 0 1rem">${desc}</p><table>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted">${r[2]}</td></tr>`).join('')}</table></div></details>`).join('');

const products = pbanner({
  crumbs:'<a href="index.html">Home</a> / Products',
  h1:'Our pharmaceutical portfolio',
  p:'A comprehensive range of NAFDAC-registered pharmaceutical products serving Nigeria’s healthcare needs — spanning anti-infectives, analgesics, cardiovascular, antimalarials, vaccines and more.',
  bg:'assets/img/ampoule-line.webp',
}) + `
<section>
  <div class="wrap">
    <div class="section-head"><span class="eyebrow">Product categories</span><h2>Ten therapeutic categories</h2><p class="lead">All products listed are registered with NAFDAC and comply with Nigerian pharmaceutical regulations. This information is intended for healthcare professionals and institutional partners.</p></div>
    <div class="portfolio">${portfolio}</div>
    <div class="prose" style="max-width:100%;margin-top:2rem"><div class="callout"><p><strong>For healthcare professionals &amp; institutions.</strong> Product availability, pack sizes and specifications are provided on enquiry. All items are NAFDAC-registered and distributed in compliance with Nigerian pharmaceutical regulation.</p></div></div>
    <p style="margin-top:1.6rem"><a href="contact.html" class="btn btn-primary">Request product information ${ic.arrow}</a></p>
  </div>
</section>`;

write('products.html', layout({
  title:'Product Portfolio — Champions Pharmaceuticals',
  desc:'NAFDAC-registered pharmaceutical portfolio from Champions Pharmaceuticals across ten therapeutic categories — for healthcare professionals and institutional partners.',
  active:'products.html', body:products,
}));

/* ============================================================
   PAGE: CONTACT
   ============================================================ */
const contact = pbanner({
  crumbs:'<a href="index.html">Home</a> / Contact',
  h1:'Contact Champions Pharmaceuticals',
  p:'For institutional, regulatory, research and partnership enquiries. We welcome strategic dialogue with healthcare stakeholders, government agencies and international partners.',
  bg:'assets/img/research-tablet.jpg',
}) + `
<section>
  <div class="wrap">
    <div class="split">
      <div>
        <span class="eyebrow">Get in touch</span>
        <h2>Partnership &amp; institutional enquiries</h2>
        <p class="lead">Whether you represent a government agency, healthcare institution, research partner or international organisation, our team welcomes the conversation.</p>
        <ul class="flist" style="margin-top:1.6rem">
          <li><strong>Email</strong> — <a href="mailto:contact@championspharmaceuticals.com">contact@championspharmaceuticals.com</a></li>
          <li><strong>Phone</strong> — <a href="tel:+2347070320052">+234 707 032 0052</a></li>
          <li><strong>Registered office</strong> — Lagos, Nigeria</li>
          <li><strong>Enquiries</strong> — Partnerships · Research · Products · Distribution</li>
        </ul>
      </div>
      <div class="card" style="padding:2rem">
        <form id="enquiry-form" class="form-grid" novalidate>
          <div class="field"><label for="f-name">Full name</label><input id="f-name" name="name" required></div>
          <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" required></div>
          <div class="field"><label for="f-org">Organisation</label><input id="f-org" name="org"></div>
          <div class="field"><label for="f-type">Enquiry type</label><select id="f-type" name="type"><option>Partnership</option><option>Research collaboration</option><option>Product information</option><option>Distribution</option><option>General</option></select></div>
          <div class="field"><label for="f-msg">Message</label><textarea id="f-msg" name="message" rows="4" required></textarea></div>
          <button class="btn btn-primary btn-lg" type="submit">Send enquiry ${ic.arrow}</button>
          <p class="form-note">Thank you — your enquiry has been recorded. Connect this form to your email service before go-live to receive submissions.</p>
        </form>
      </div>
    </div>
  </div>
</section>`;

write('contact.html', layout({
  title:'Contact — Champions Pharmaceuticals',
  desc:'Contact Champions Pharmaceuticals for institutional, regulatory, research and partnership enquiries. Lagos, Nigeria.',
  active:'contact.html', body:contact,
}));

/* ============================================================
   PAGE: COMPLIANCE
   ============================================================ */
const compliance = pbanner({
  crumbs:'<a href="index.html">Home</a> / Compliance',
  h1:'Governance, compliance &amp; regulatory standards',
  p:'Our commitment to regulatory responsibility, safety protocols and structured oversight ensures every aspect of our operations meets the highest institutional standards.',
  bg:'assets/img/cell-culture-hood.jpg',
}) + `
<section>
  <div class="wrap narrow prose">
    <span class="eyebrow">Our commitment</span>
    <h2>Regulatory responsibility at every level</h2>
    <p>Champions Pharmaceuticals maintains strict adherence to regulatory standards established since our registration in 1993. We work closely with regulatory bodies to maintain compliance and support public-health objectives across Nigeria.</p>
    <div class="callout"><p>All pharmaceutical products distributed by Champions Pharmaceuticals are registered with NAFDAC and comply with Nigerian pharmaceutical regulation. Product information is intended for healthcare professionals and institutional partners.</p></div>
    <h3>Quality assurance</h3>
    <ul>
      <li>NAFDAC-aligned quality assurance across the distribution chain</li>
      <li>Documented safety protocols and standard operating procedures</li>
      <li>Import documentation, licensing and product-verification systems</li>
      <li>Pharmacovigilance and adverse-event reporting</li>
    </ul>
    <h3>Research integrity</h3>
    <ul>
      <li>Research materials are provided for scientific and informational purposes and reflect evidence-based literature review</li>
      <li>Champions Pharmaceuticals maintains strict evidence-based standards in all patient guidance and does not endorse unregulated products</li>
      <li>All R&amp;D activities are conducted in alignment with NAFDAC, ISO and applicable international regulatory standards</li>
    </ul>
    <h3>Nationwide scope</h3>
    <p>This information — including product information — is intended only for residents of Nigeria. Products may have different labelling in other countries.</p>
  </div>
</section>
<section class="section-green">
  <div class="wrap narrow" style="text-align:center">
    <h2>Questions about our compliance framework?</h2>
    <p class="lead" style="color:#cfe3da">Our team is available to discuss regulatory alignment, quality assurance and institutional standards.</p>
    <p style="margin-top:1.5rem"><a href="contact.html" class="btn btn-primary btn-lg">Contact us ${ic.arrow}</a></p>
  </div>
</section>`;

write('compliance.html', layout({
  title:'Compliance &amp; Regulatory — Champions Pharmaceuticals',
  desc:'Champions Pharmaceuticals’ governance, compliance and regulatory framework — NAFDAC-aligned quality assurance, pharmacovigilance and research integrity.',
  active:'', body:compliance,
}));

/* ============================================================
   SUBPAGES (research/ + programs/) — prefix '../'
   ============================================================ */
function subBanner({ crumbs, h1, p, bg, chips }) {
  return `<section class="pbanner">
  <img class="pbanner-bg" src="../${bg}" alt="">
  <div class="wrap pbanner-inner">
    <div class="crumbs">${crumbs}</div>
    <h1>${h1}</h1>
    <p>${p}</p>
    ${chips ? `<div class="chips">${chips.map(c => `<span class="chip">${c}</span>`).join('')}</div>` : ''}
  </div>
</section>`;
}
function studyPage({ file, title, desc, crumbs, h1, intro, bg, chips, prose }) {
  const body = subBanner({ crumbs, h1, p: intro, bg, chips }) +
`<section><div class="wrap prose narrow">${prose}
  <div class="callout" style="margin-top:2.4rem"><p><strong>Research &amp; informational use.</strong> This material is a scientific literature review provided for research and informational purposes. It does not constitute medical advice or an offer of treatment. Champions Pharmaceuticals maintains strict evidence-based standards in all guidance.</p></div>
  <p style="margin-top:2rem"><a href="../research.html" class="btn btn-ghost">${ic.arrow.replace('M5 12h14M13 6l6 6-6 6','M19 12H5M11 6l-6 6 6 6')} All research</a> &nbsp; <a href="../contact.html" class="btn btn-primary">Discuss this research ${ic.arrow}</a></p>
</div></section>`;
  write('research/' + file, layout({ title, desc, active: 'research.html', body, prefix: '../' }));
}

/* ---- Study: Scorpion Venom ---- */
studyPage({
  file:'scorpion-venom.html',
  title:'Scorpion Venom — Oncology Research Compound · Champions Pharmaceuticals',
  desc:'A clinical and scientific review of scorpion venom-derived peptides in oncology — Chlorotoxin (Tumor Paint), ion-channel pharmacology and cancer-selective mechanisms.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Scorpion Venom',
  h1:'Scorpion venom-derived peptides: emerging therapeutic potential in oncology',
  intro:'A comprehensive review of scorpion-venom bioactive compounds, their anticancer mechanisms, and clinical-translation pathways including Chlorotoxin (Tumor Paint) — with implications for evidence-based oncology access.',
  bg:'assets/img/scorpion-venom.webp',
  chips:['Timeline: 2019 – Ongoing','Study Type: Clinical &amp; Literature Review','Locations: UK · Lithuania · Nigeria','Oncology &amp; Venom Pharmacology','Active Research'],
  prose:`<h2>Research overview</h2>
<p>Scorpion venom represents one of nature’s most pharmacologically complex mixtures — a rich reservoir of bioactive peptides, proteins and enzymes refined over hundreds of millions of years of evolution. While historically studied for toxicology and antivenom development, a rapidly expanding body of evidence now demonstrates that specific venom-derived compounds exhibit remarkable selective cytotoxicity against cancer cells, with substantially reduced impact on healthy tissue.</p>
<p>This initiative documents the current state of scorpion-venom science in oncology, with emphasis on apoptosis induction, ion-channel modulation in tumour biology, anti-metastatic activity, and the translational milestone of Chlorotoxin (CTX) — a 36-amino-acid peptide from the Deathstalker scorpion (<em>Leiurus quinquestriatus</em>) — which has progressed through multiple Phase 1 human clinical trials as the fluorescence-guided surgery agent Tozuleristide (BLZ-100, Tumor Paint®).</p>
<h3>Key takeaways</h3>
<ul>
<li><strong>Chlorotoxin &amp; Tumor Paint:</strong> a scorpion-venom-derived peptide conjugated with a near-infrared fluorescent dye has completed four Phase 1 trials in glioma, breast and skin cancer with no dose-limiting toxicity identified and successful tumour visualisation confirmed.</li>
<li><strong>Selective targeting:</strong> peer-reviewed studies confirm venom peptides preferentially target cancer cells by exploiting differences in membrane charge, overexpressed ion channels and tumour-specific surface receptors.</li>
<li><strong>Multi-mechanism action:</strong> venom compounds impair cancer through apoptosis induction, cell-cycle arrest, inhibition of invasion/metastasis (MMP suppression) and disruption of oncogenic ion channels.</li>
<li><strong>Regulatory progress:</strong> BLZ-100 (Tozuleristide) received FDA Fast Track Designation for paediatric CNS tumours and has a pivotal Phase 2/3 study underway across US cancer-surgery centres.</li>
<li><strong>Evidentiary standards:</strong> unregulated commercial products marketed as scorpion-venom cancer treatments lack human clinical-trial evidence; Champions maintains strict evidence-based standards in all patient guidance.</li>
</ul>
<h3>Chlorotoxin: the translational breakthrough</h3>
<p>Among all scorpion-venom compounds studied, Chlorotoxin represents the most clinically advanced milestone. CTX selectively binds tumour cells through interaction with matrix metalloproteinase-2 (MMP-2), Annexin A2 and chloride channels overexpressed in glioma and tumours of neuroectodermal origin. When conjugated with fluorescent dyes it becomes Tumor Paint® — enabling intraoperative, real-time visualisation of tumour margins so surgeons can achieve more complete resections while preserving healthy tissue.</p>
<h3>Ion channels as cancer targets</h3>
<p>Tumour cells exploit ion channels to support proliferation, adhesion, invasion and metastasis. Potassium channels (Kv1.3, KV10.1, KCa), chloride channels (ClC-3) and sodium channels are frequently overexpressed in cancer cells versus healthy tissue — creating a molecular basis for selective targeting by venom peptides evolved to interact with these channels.</p>
<h3>Nigerian context</h3>
<p>Nigeria faces a substantial cancer burden, with over 100,000 new cases diagnosed annually and many patients presenting at advanced stages due to limited early detection. Understanding the evidence base and access pathways for next-generation venom-derived therapies holds direct strategic relevance for Nigerian healthcare-infrastructure planning and future therapeutic access within appropriate regulatory frameworks.</p>`,
});

/* ---- Study: Stem Cell ---- */
studyPage({
  file:'stem-cell.html',
  title:'Advanced Stem Cell Research &amp; Treatment Pathways · Champions Pharmaceuticals',
  desc:'A review of mesenchymal and haematopoietic stem-cell applications in oncology and regenerative medicine — therapeutic mechanisms, treatment pathways and translational potential.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Stem Cell',
  h1:'Advanced stem cell research &amp; treatment pathways',
  intro:'A comprehensive investigation into mesenchymal and haematopoietic stem-cell applications in oncology and regenerative medicine — examining therapeutic mechanisms, treatment pathways and translational potential in cancer care.',
  bg:'assets/img/stem-cell.png',
  chips:['Oncology &amp; Regenerative Medicine','Study Type: Clinical &amp; Literature Review','Active Research','Translational Research'],
  prose:`<h2>Research overview</h2>
<p>Stem-cell therapy sits at the frontier of regenerative medicine — using specialised cellular therapies to support tissue regeneration and recovery. This study examines the two principal populations relevant to oncology and regenerative applications: mesenchymal stem cells (MSCs), with their immunomodulatory and tissue-repair properties, and haematopoietic stem cells (HSCs), foundational to blood and immune-system reconstitution.</p>
<h3>Therapeutic mechanisms</h3>
<ul>
<li><strong>Mesenchymal stem cells:</strong> multipotent cells capable of differentiating into bone, cartilage and other tissue types, with paracrine signalling that modulates inflammation and supports repair.</li>
<li><strong>Haematopoietic stem cells:</strong> the basis of bone-marrow and cord-blood transplantation used in the management of haematologic malignancies and marrow-failure syndromes.</li>
<li><strong>Tumour microenvironment:</strong> research into how cellular therapeutics interact with the tumour microenvironment informs next-generation oncology strategies.</li>
</ul>
<h3>Translational pathways</h3>
<p>Champions Pharmaceuticals’ work explores how the body’s own repair systems can be harnessed to address treatment-resistant conditions. Where clinically appropriate, patients may be referred to licensed international clinics operating under established regulatory frameworks — always within evidence-based standards and appropriate medical oversight.</p>
<h3>Nigerian relevance</h3>
<p>For Nigeria and the wider region, structured evidence review of stem-cell applications supports healthcare-infrastructure planning and physician education, contributing to informed policy discussion on the safe, regulated integration of advanced cellular therapies into future frameworks.</p>`,
});

/* ---- Study: Sickle Cell ---- */
studyPage({
  file:'sickle-cell.html',
  title:'Sickle Cell Disease: From Management to Functional Cure · Champions Pharmaceuticals',
  desc:'A review of the evolving therapeutic landscape of sickle cell disease — disease-modifying pharmacotherapy, stem-cell transplantation and CRISPR-based gene editing, with focus on global equity.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Sickle Cell',
  h1:'Sickle cell disease: from symptom management to functional cure',
  intro:'A detailed investigation into gene editing, stem-cell transplantation, disease-modifying pharmacotherapy and the evolving evidence base reshaping sickle cell disease management worldwide — with critical focus on the disproportionate burden in sub-Saharan Africa.',
  bg:'assets/img/doctors-1.webp',
  chips:['Haematology','Study Type: Clinical &amp; Literature Review','Global · sub-Saharan Africa focus','Active Research'],
  prose:`<h2>Research overview</h2>
<p>Sickle cell disease (SCD) is among the most common serious inherited disorders worldwide, with the greatest burden concentrated in sub-Saharan Africa. This study maps the therapeutic landscape from conventional disease-modifying treatment through to emerging curative strategies — with critical attention to the global equity gap between where curative therapies are developed and where the disease burden actually falls.</p>
<h3>The therapeutic spectrum</h3>
<ul>
<li><strong>Disease-modifying pharmacotherapy:</strong> hydroxyurea and newer agents that reduce painful crises and complications remain the accessible foundation of care.</li>
<li><strong>Stem-cell transplantation:</strong> haematopoietic stem-cell transplantation offers a potential cure for eligible patients, constrained by donor availability and infrastructure.</li>
<li><strong>Gene editing:</strong> CRISPR-based and gene-addition therapies have moved from concept to approved therapy in some jurisdictions, representing a functional-cure pathway — though cost and access remain formidable barriers.</li>
</ul>
<h3>The equity challenge</h3>
<p>The central tension this research examines is that the populations bearing the heaviest SCD burden — particularly in Nigeria and across sub-Saharan Africa — have the least access to the most advanced curative therapies. Bridging this gap requires evidence frameworks, infrastructure planning and policy engagement, not treatment alone.</p>
<h3>Champions’ contribution</h3>
<p>Champions Pharmaceuticals develops evidence frameworks that connect symptom management and functional-cure pathways, supporting informed policy discussion and physician education on the safe, regulated integration of emerging therapies into Nigerian healthcare frameworks.</p>`,
});

/* ---- Study: Peptide ---- */
studyPage({
  file:'peptide.html',
  title:'Bioactive Peptide Therapeutics Research Initiative · Champions Pharmaceuticals',
  desc:'Investigating the clinical potential, safety and translational applications of bioactive peptide compounds in oncology, regenerative medicine and metabolic health.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Bioactive Peptides',
  h1:'Bioactive peptide therapeutics research initiative',
  intro:'Investigating the clinical potential, safety and translational applications of bioactive peptide compounds in oncology, regenerative medicine and metabolic health — from FDA-approved peptide-drug conjugates to next-generation anticancer peptide vaccines and tissue-repair biologics.',
  bg:'assets/img/peptide.jpg',
  chips:['Oncology · Regenerative · Metabolic','Locations: UK · USA · Europe · Emerging Markets','Clinical Evidence Synthesis','Active Research'],
  prose:`<h2>Research overview</h2>
<p>Bioactive peptides represent one of the most rapidly expanding frontiers in modern therapeutics. These short chains of amino acids — typically two to fifty residues — occupy a unique molecular space between small-molecule drugs and large biological proteins, combining the precision targeting of biologics with the manufacturing versatility and tissue penetration of small molecules. Their receptor specificity, low systemic toxicity and biodegradability have propelled them from niche endocrinology tools into a dominant force across oncology, regenerative medicine, immunology and neurology. The global peptide-therapeutics market was valued at approximately USD 46 billion in 2024 and is projected to reach USD 100 billion by 2034.</p>
<h3>In oncology</h3>
<p>Bioactive peptides have evolved from purely hormonal interventions into a sophisticated arsenal of precision tools: peptide-receptor radionuclide therapy (PRRT) delivering targeted radiation into tumour cells; peptide-drug conjugates (PDCs) combining tumour-homing sequences with cytotoxic payloads; anticancer peptides (ACPs) that disrupt tumour-cell membranes; and peptide-based cancer vaccines. FDA approvals of radionuclide agents for neuroendocrine and prostate cancers represent landmark validations of the peptide-guided precision-medicine paradigm.</p>
<h3>Beyond cancer</h3>
<p>Peptides such as BPC-157, TB-500 and copper-peptide GHK-Cu have shown compelling preclinical and early clinical evidence for accelerating wound healing, stimulating angiogenesis and driving tissue repair. Meanwhile GLP-1 receptor agonists have fundamentally redefined the treatment of obesity, type-2 diabetes and cardiovascular risk — with emerging evidence of benefits extending to heart failure and neurodegenerative disease.</p>
<h3>What this initiative provides</h3>
<p>This initiative offers a comprehensive synthesis of the evolving bioactive-peptide landscape — cataloguing approved agents, active pipelines, mechanistic advances, safety profiles and access considerations — while addressing the regulatory pathways and manufacturing challenges that shape clinical practice, patient access and the future of precision oncology and regenerative medicine.</p>`,
});

/* ---- Study: Phytocannabinoid (NEVER the word cannabis) ---- */
studyPage({
  file:'phytocannabinoid.html',
  title:'Phytocannabinoids in Traditional Nigerian Medicine · Champions Pharmaceuticals',
  desc:'Scientific validation of phytocannabinoids, terpenes and indigenous medicine within international regulatory frameworks — a research programme by Champions Pharmaceuticals.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Phytocannabinoids',
  h1:'Phytocannabinoids &amp; terpenes in traditional Nigerian medicine',
  intro:'Champions Pharmaceuticals’ research programme into phytocannabinoids and terpenes within traditional Nigerian medicine — scientific validation of indigenous medicine and regenerative therapies within international regulatory frameworks.',
  bg:'assets/img/traditional-plants.jpg',
  chips:['Phytotherapeutics','Study Type: Literature &amp; Regulatory Review','Regulatory Science','Active Research'],
  prose:`<h2>Research overview</h2>
<p>This programme investigates the scientific basis of phytocannabinoids and terpenes — plant-derived compounds — and their long-standing role within traditional Nigerian medicine. The objective is scientific validation: applying systematic literature review, regulatory science and evidence synthesis to indigenous therapeutic practices, situating them accurately within international regulatory frameworks.</p>
<h3>Scientific scope</h3>
<ul>
<li><strong>Phytochemistry:</strong> characterising the bioactive phytocannabinoid and terpene profiles of relevant botanical sources and their documented pharmacological activity.</li>
<li><strong>Indigenous medicine:</strong> reviewing the historical and ethnopharmacological use of these compounds within Nigerian traditional medicine.</li>
<li><strong>Regulatory science:</strong> mapping the international regulatory pathways governing phytotherapeutic research, ensuring all work proceeds within appropriate legal and ethical frameworks.</li>
</ul>
<h3>Regulatory-first approach</h3>
<p>Champions Pharmaceuticals conducts this research strictly within international regulatory frameworks and appropriate approvals. The programme is a scientific and evidence-based initiative — validation, documentation and regulatory-science analysis — not a commercial or clinical offering.</p>
<h3>Nigerian relevance</h3>
<p>Scientific validation of indigenous phytotherapeutics contributes to the evidence base for regulatory science and healthcare-policy discussion in Nigeria, supporting the responsible, documented study of the nation’s botanical medical heritage within modern standards.</p>`,
});

/* ---- Study: Border Securitization ---- */
studyPage({
  file:'border-securitization.html',
  title:'Border Securitization &amp; Social Construction · Champions Pharmaceuticals',
  desc:'An interdisciplinary investigation into contemporary border fortification — securitization theory, social construction and the human dimensions of borderland communities.',
  crumbs:'<a href="../index.html">Home</a> / <a href="../research.html">Research</a> / Border Studies',
  h1:'Border securitization &amp; the social construction of territory',
  intro:'A multi-disciplinary investigation into the forces shaping contemporary border fortification — examining securitization theory, social construction, cross-border cooperation and the human dimensions of borderland communities within evolving geopolitical frameworks.',
  bg:'assets/img/border-security.webp',
  chips:['Political Science &amp; Security Studies','Scope: Global','Timeline: 2024 – Ongoing','Multi-Disciplinary Review'],
  prose:`<h2>Research overview</h2>
<p>Border securitization — the political, institutional and physical process by which borders are constructed as security zones requiring fortification, surveillance and enforcement — represents one of the defining geopolitical phenomena of the early twenty-first century. As of 2024, approximately 12% of all international borders and 40% of all countries feature some form of physical fortification, a dramatic increase from fewer than a dozen border walls at the end of the Cold War.</p>
<h3>An interdisciplinary lens</h3>
<p>Border studies spans political science, sociology, human geography, legal theory and cultural studies. Contemporary research has moved well beyond treating borders as fixed, objective lines on a map; scholars now understand borders as dynamic, socially constructed institutions that shape — and are shaped by — identity, authority and mobility.</p>
<h3>Areas of analysis</h3>
<ul>
<li><strong>Securitization theory:</strong> how borders become framed as security objects requiring exceptional measures.</li>
<li><strong>Social construction:</strong> how territorial boundaries acquire meaning and shape identity formation in borderland communities.</li>
<li><strong>Cross-border cooperation:</strong> the countervailing dynamics of regional integration and cooperation.</li>
<li><strong>Human dimensions:</strong> the lived experience of communities within evolving geopolitical frameworks.</li>
</ul>
<h3>Relevance</h3>
<p>This research contributes evidence-based analysis to policy discussion on sovereignty, mobility and regional integration — an area of growing significance for governance and public policy globally.</p>`,
});

/* ---- Program pages ---- */
function programPage({ file, title, desc, crumbs, h1, intro, bg, chips, prose }) {
  const body = subBanner({ crumbs, h1, p: intro, bg, chips }) +
`<section><div class="wrap prose narrow">${prose}
  <div class="callout" style="margin-top:2.4rem"><p><strong>Proposed partnership initiative.</strong> The programmes described are proposed initiatives supporting national healthcare objectives, subject to relevant regulatory approvals. Champions Pharmaceuticals welcomes strategic dialogue with healthcare stakeholders and government agencies.</p></div>
  <p style="margin-top:2rem"><a href="../partnerships.html" class="btn btn-ghost">Our partnerships</a> &nbsp; <a href="../contact.html" class="btn btn-primary">Contact our partnership team ${ic.arrow}</a></p>
</div></section>`;
  write('programs/' + file, layout({ title, desc, active: '', body, prefix: '../' }));
}

programPage({
  file:'needleless-delivery.html',
  title:'Advancing Needleless Drug Delivery in Nigeria · Champions Pharmaceuticals',
  desc:'A strategic partnership initiative with the Federal Ministry of Health, NPHCDA and international partners to pioneer needleless drug delivery systems across Nigeria.',
  crumbs:'<a href="../index.html">Home</a> / Programmes / Needleless Delivery',
  h1:'Advancing needleless drug delivery in Nigeria',
  intro:'A strategic opportunity for partnership — pioneering needleless drug-delivery systems, supporting national vaccination campaigns and improving access to safer, more efficient therapies nationwide.',
  bg:'assets/img/medical-tech.webp',
  chips:['NPHCDA &amp; Federal Ministry of Health','WHO-aligned','International Partners','Proposed Initiative'],
  prose:`<h2>The next evolution in drug delivery</h2>
<p>Needleless drug delivery represents the next evolution in modern medicine — a safe, efficient and patient-friendly alternative to traditional injections. These technologies deliver medication through jet injectors, transdermal systems, inhalation and microneedle patches, eliminating conventional needles while still providing rapid, precise delivery. They reduce risks associated with needle use — infections, needle-stick injuries and improper disposal — and improve patient compliance, particularly among populations with needle aversion.</p>
<h3>Why it matters for Nigeria</h3>
<p>With an estimated 80,000 people who inject drugs (PWID) in Nigeria, needleless systems present an opportunity to reduce needle-related harm and disease transmission, support harm-reduction strategies, and improve public-health safety through reduced needle circulation. Needleless insulin delivery can improve adherence for patients requiring daily treatment; needleless vaccine delivery can enhance immunisation coverage by simplifying administration and improving safety during mass campaigns.</p>
<h3>Alignment with national health programmes</h3>
<p>Champions Pharmaceuticals proposes to support Nigeria’s healthcare modernisation by aligning with initiatives led by the National Primary Health Care Development Agency (NPHCDA) — including national immunisation programmes, vaccine-preventable disease control and expanding access to primary healthcare.</p>
<h3>Proposed initiatives</h3>
<ul>
<li>Initiate a pilot programme with the Ministry of Health through international partners, following required regulatory approvals including FDA authorisation for applicable needleless technologies.</li>
<li>Provide needleless drug-delivery equipment and infrastructure, programme logistics and supply-chain coordination, and technical support in collaboration with NPHCDA.</li>
<li>Expand access to innovative needleless therapies through integration with international health programmes.</li>
<li>Deliver cost-effective, scalable solutions that make needleless therapies accessible to facilities nationwide.</li>
</ul>
<h3>A transformational opportunity</h3>
<p>By reducing risks, improving patient compliance and enhancing the scalability of treatment and vaccination programmes, needleless delivery complements and strengthens existing healthcare infrastructure. Through collaboration with the Federal Ministry of Health, the NPHCDA and global partners, Champions Pharmaceuticals is positioned to support Nigeria in adopting safer, more efficient drug-delivery systems. This initiative aligns with global public-health priorities supported by the World Health Organization.</p>`,
});

programPage({
  file:'injectable-delivery.html',
  title:'Advancing Injectable Drug Delivery in Nigeria · Champions Pharmaceuticals',
  desc:'A strategic partnership initiative to strengthen injectable medicine delivery across Nigeria — aligned with the Federal Ministry of Health, NPHCDA and international health partners.',
  crumbs:'<a href="../index.html">Home</a> / Programmes / Injectable Delivery',
  h1:'Advancing injectable drug delivery in Nigeria',
  intro:'A strategic opportunity for partnership — strengthening injectable medicine delivery, supporting national immunisation and improving access to critical injectable therapies nationwide.',
  bg:'assets/img/ampoule-line.webp',
  chips:['NPHCDA &amp; Federal Ministry of Health','WHO &amp; Global Health Partners','Aligned with National Programmes','Proposed Initiative'],
  prose:`<h2>The role of injectable delivery in modern medicine</h2>
<p>Needle-based injection remains one of the most reliable and widely used methods of drug delivery. Injectable administration provides a direct, rapid and precise route — bypassing the digestive system where many drugs are degraded or poorly absorbed — ensuring the full therapeutic dose reaches the bloodstream or target tissue. Because injections can deliver almost any molecule, including large-molecule biologics, vaccines, hormones and emergency medications, they remain a cornerstone of global public-health programmes.</p>
<h3>Importance of injectable therapies</h3>
<ul>
<li>Many diabetes patients require daily insulin injections to regulate blood glucose; reliable injectable delivery is essential for chronic-disease care.</li>
<li>Injectable medications such as pentazocine, tramadol, codeine and morphine are essential in hospital and emergency settings for effective pain relief.</li>
<li>Critical vaccines including polio, measles and rubella are administered by injection and remain essential for disease prevention and eradication.</li>
</ul>
<h3>Alignment with national health programmes</h3>
<p>Champions Pharmaceuticals proposes to support Nigeria’s healthcare objectives by aligning with national vaccination and public-health initiatives coordinated by the NPHCDA — national immunisation programmes, vaccine-preventable disease control and expanding access to primary healthcare. Nigeria’s estimated 80,000 PWID highlight the importance of structured, safe and regulated injection practices within healthcare and harm-reduction programmes.</p>
<h3>Proposed initiatives</h3>
<ul>
<li>Initiate a pilot programme with the Ministry of Health through its international partner Cannopharma (Germany) once relevant regulatory approvals, including FDA authorisation for applicable products, are obtained.</li>
<li>Provide operational and programme-management support, including medical equipment and injection-delivery infrastructure, logistics and supply-chain coordination with NPHCDA.</li>
<li>Expand access to life-saving injectable medicines through integration with international pharmaceutical supply networks and aid programmes.</li>
<li>Deliver cost-effective pharmaceutical supply solutions that make essential injectable medicines more accessible to healthcare facilities nationwide.</li>
</ul>
<h3>Strengthening Nigeria’s healthcare future</h3>
<p>Through collaboration with the Federal Ministry of Health, the NPHCDA and international health partners, Champions Pharmaceuticals aims to strengthen injectable-medicine delivery programmes and improve access to critical therapies nationwide. Champions’ efforts align with the public-health objectives supported by the World Health Organization and other international health partners.</p>`,
});

console.log('\n— all subpages built —');
console.log('\n=== BUILD COMPLETE ===');
