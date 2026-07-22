/* Champions Pharmaceuticals — interactions (progressive enhancement) */
(function () {
  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  // Reveal on scroll
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
    // Safety net: never leave content hidden if something goes wrong
    setTimeout(function () { reveals.forEach(function (el) { el.classList.add('in'); }); }, 1600);
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Forms (contact enquiry + careers application with CV upload).
  // To receive submissions by email, create a free Web3Forms access key for
  // contact@championspharmaceuticals.com and paste it into each form's hidden
  // access_key field. Web3Forms handles file attachments (the CV) natively.
  // Until a real key is set, submissions show a local confirmation only.
  function wireForm(id) {
    var form = document.getElementById(id);
    if (!form) return;
    var note = form.querySelector('.form-note');
    var btn = form.querySelector('button[type="submit"]');
    function say(msg) { if (note) { note.textContent = msg; note.style.display = 'block'; } }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var keyEl = form.querySelector('input[name="access_key"]');
      var key = keyEl ? (keyEl.value || '').trim() : '';
      if (!key || key.indexOf('YOUR_') === 0) {
        say(note && note.getAttribute('data-local') || 'Thank you. Your submission has been recorded. Connect the email service to receive submissions.');
        form.reset();
        return;
      }
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      fetch('https://api.web3forms.com/submit', { method: 'POST', body: new FormData(form) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          say(res.success ? (note && note.getAttribute('data-success') || 'Thank you. Your message has been sent; our team will be in touch.') : 'Sorry, something went wrong. Please email us directly.');
          if (res.success) form.reset();
        })
        .catch(function () { say('Network error. Please email us directly at contact@championspharmaceuticals.com.'); })
        .finally(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
    });
  }
  wireForm('enquiry-form');
  wireForm('careers-form');

  // Close mobile nav on Escape or outside click (ease of use)
  if (toggle && links) {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (links.classList.contains('open') && !links.contains(e.target) && !toggle.contains(e.target)) {
        links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Header gains a subtle shadow once the page is scrolled (depth cue)
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Back-to-top button (appears on long pages)
  if (document.body.scrollHeight > 2200) {
    var top = document.createElement('button');
    top.className = 'to-top'; top.type = 'button';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
    document.body.appendChild(top);
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    var toggleTop = function () { top.classList.toggle('show', window.scrollY > 600); };
    toggleTop(); window.addEventListener('scroll', toggleTop, { passive: true });
  }

  // Reading-progress bar on long-form study pages (better viewing)
  var prose = document.querySelector('.prose');
  if (prose && document.body.scrollHeight > 3000) {
    var bar = document.createElement('div');
    bar.className = 'read-progress'; document.body.appendChild(bar);
    var updateBar = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(window.scrollY / h, 1) : 0) + ')';
    };
    updateBar(); window.addEventListener('scroll', updateBar, { passive: true });
    window.addEventListener('resize', updateBar);
  }

  // Product portfolio quick filter (ease of use on the long product list)
  var pfilter = document.getElementById('product-filter');
  if (pfilter) {
    var cats = [].slice.call(document.querySelectorAll('.pcat'));
    pfilter.addEventListener('input', function () {
      var q = pfilter.value.trim().toLowerCase();
      cats.forEach(function (cat) {
        var rows = [].slice.call(cat.querySelectorAll('tbody tr, tr'));
        var anyMatch = q === '';
        rows.forEach(function (r) {
          var hit = q === '' || r.textContent.toLowerCase().indexOf(q) !== -1;
          r.style.display = hit ? '' : 'none';
          if (hit && q) anyMatch = true;
        });
        var catHit = q === '' || cat.querySelector('summary').textContent.toLowerCase().indexOf(q) !== -1;
        cat.style.display = (anyMatch || catHit) ? '' : 'none';
        if (q && (anyMatch || catHit)) cat.open = true;
        if (!q) cat.open = false;
      });
    });
  }

  // Footer year
  var yr = document.getElementById('yr');
  if (yr) { yr.textContent = new Date().getFullYear(); }
})();
