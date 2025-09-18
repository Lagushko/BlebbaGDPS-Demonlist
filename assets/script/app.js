const routes = {
  '/': '/pages/home.html',
  '/main-list': '/pages/main-list.html',
  '/extended-list': '/pages/extended-list.html',
  '/full-list': '/pages/full-list.html',
  '/level': '/pages/level.html'
};

function stripOrigin(path) {
  try {
    const url = new URL(path);
    return url.pathname + url.search + url.hash;
  } catch (e) {
    return path;
  }
}

function splitPathAndQuery(rawPath) {
  const path = stripOrigin(rawPath);
  const idxQ = path.indexOf('?');
  const idxA = path.indexOf('&');
  const indices = [idxQ, idxA].filter(i => i !== -1);
  const sepIndex = indices.length ? Math.min(...indices) : -1;

  if (sepIndex === -1) return { pathname: path || '/', queryString: '' };
  return {
    pathname: path.slice(0, sepIndex) || '/',
    queryString: path.slice(sepIndex + 1)
  };
}

function resolveAgainstPage(pageUrl, resourceHref) {
  const base = new URL(pageUrl, window.location.origin);
  return new URL(resourceHref, base).href;
}

async function loadPage(rawPath) {
  try {
    const { pathname, queryString } = splitPathAndQuery(rawPath);
    const route = Object.keys(routes).find(r => r === pathname);
    if (!route) {
      document.getElementById('app').innerHTML = `<h1>404 — страница не найдена</h1>`;
      return;
    }

    const pageUrl = routes[route];
    const resp = await fetch(pageUrl, { cache: 'no-store' });
    if (!resp.ok) {
      document.getElementById('app').innerHTML = `<h1>Ошибка загрузки: ${resp.status}</h1>`;
      return;
    }

    const htmlText = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    const newTitle = doc.querySelector('title')?.textContent;
    if (newTitle) document.title = newTitle;

    doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const absHref = resolveAgainstPage(pageUrl, href);
      if (!document.head.querySelector(`link[rel="stylesheet"][href="${absHref}"]`)) {
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = absHref;
        document.head.appendChild(newLink);
      }
    });

    const app = document.getElementById('app');
    app.innerHTML = doc.body.innerHTML;

    window.__spaQueryString = queryString;
    window.__spaParams = new URLSearchParams(queryString);

    const scripts = Array.from(doc.querySelectorAll('script'));
    for (const oldScript of scripts) {
      const newScript = document.createElement('script');

      if (oldScript.type) newScript.type = oldScript.type;
      if (oldScript.noModule) newScript.noModule = true;
      if (oldScript.defer) newScript.defer = true;

      const srcAttr = oldScript.getAttribute('src');
      if (srcAttr) {
        const absSrc = resolveAgainstPage(pageUrl, srcAttr);
        await new Promise(resolve => {
          newScript.async = false;
          newScript.src = absSrc;
          newScript.onload = () => resolve();
          newScript.onerror = () => {
            console.warn('Не удалось загрузить скрипт', absSrc);
            resolve();
          };
          document.body.appendChild(newScript);
        });
      } else {
        newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
      }
    }

    if (typeof window.onSpaPageLoaded === 'function') {
      try { window.onSpaPageLoaded({ pathname, queryString, pageUrl }); } catch (e) { console.error(e); }
    }

  } catch (err) {
    console.error('Ошибка loadPage:', err);
    document.getElementById('app').innerHTML = `<h1>Ошибка</h1><pre>${err}</pre>`;
  }
}

function navigate(event) {
  const anchor = event.target.closest ? event.target.closest('a') : null;
  if (!anchor) return;
  if (anchor.origin !== location.origin) return;
  if (anchor.target && anchor.target !== '' && anchor.target !== '_self') return;

  const href = anchor.getAttribute('href');
  if (!href) return;

  event.preventDefault();
  window.history.pushState({}, '', href);
  loadPage(href);
}

window.addEventListener('popstate', () => loadPage(location.pathname + location.search));
document.addEventListener('click', navigate);

loadPage(location.pathname + location.search);
