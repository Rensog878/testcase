/* Language pill for pages without the storefront script (checkout and order
 * status): the same "EN / த" pill and menu as the storefront header, using its
 * styles (css/responsive.css, section 7h). The choice is saved under the
 * storefront's key, so the storefront and React pages switch language. */
(() => {
  const KEY = 'sathya_bio_lang';
  const LANGS = [
    { code: 'en', pill: 'EN', native: 'English', english: 'English', ready: true },
    { code: 'ta', pill: 'த', native: 'தமிழ்', english: 'Tamil', ready: true },
    { code: 'kn', pill: 'ಕ', native: 'ಕನ್ನಡ', english: 'Kannada', ready: true },
    { code: 'te', pill: 'తె', native: 'తెలుగు', english: 'Telugu', ready: true },
    { code: 'hi', pill: 'हि', native: 'हिन्दी', english: 'Hindi', ready: true },
    { code: 'ml', pill: 'മ', native: 'മലയാളം', english: 'Malayalam', ready: false },
  ];

  const button = document.getElementById('langQuickBtn');
  if (!button) return;
  const codeEl = document.getElementById('langQuickCode');
  let menu = null;
  let backdrop = null;

  const currentCode = () => {
    try { return localStorage.getItem(KEY) || 'en'; } catch { return 'en'; }
  };
  const currentLang = () => LANGS.find(lang => lang.code === currentCode()) || LANGS[0];

  function sync() {
    const lang = currentLang();
    if (codeEl) codeEl.textContent = lang.pill;
    button.setAttribute('aria-label', `Language: ${lang.english}`);
  }

  const onKey = event => { if (event.key === 'Escape') close(); };

  function close() {
    if (!menu) return;
    menu.remove();
    backdrop.remove();
    menu = backdrop = null;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', close);
  }

  function open() {
    backdrop = document.createElement('div');
    backdrop.className = 'lang-quick-backdrop';
    backdrop.addEventListener('click', close);

    menu = document.createElement('div');
    menu.className = 'lang-quick-menu notranslate';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Choose language');

    const title = document.createElement('div');
    title.className = 'lang-quick-title';
    title.textContent = 'Language';
    menu.append(title);

    const active = currentLang().code;
    LANGS.forEach(lang => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'lang-quick-option';
      option.disabled = !lang.ready;
      option.setAttribute('role', 'menuitemradio');
      option.setAttribute('aria-checked', String(lang.code === active));

      const glyph = document.createElement('span');
      glyph.className = 'lang-quick-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = lang.pill;

      const names = document.createElement('span');
      names.className = 'lang-quick-names';
      const native = document.createElement('strong');
      native.textContent = lang.native;
      const english = document.createElement('small');
      english.textContent = lang.english;
      names.append(native, english);

      let end;
      if (lang.ready) {
        end = document.createElement('i');
        end.className = 'fa-solid fa-check lang-quick-check';
        end.setAttribute('aria-hidden', 'true');
      } else {
        end = document.createElement('span');
        end.className = 'lang-quick-soon';
        end.textContent = 'Coming soon';
      }

      option.append(glyph, names, end);
      option.addEventListener('click', () => {
        try { localStorage.setItem(KEY, lang.code); } catch {}
        close();
        sync();
      });
      menu.append(option);
    });

    menu.style.top = `${Math.round(button.getBoundingClientRect().bottom + 8)}px`;
    document.body.append(backdrop, menu);
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
  }

  button.addEventListener('click', () => (menu ? close() : open()));
  window.addEventListener('storage', event => { if (event.key === KEY) sync(); });
  sync();
})();
