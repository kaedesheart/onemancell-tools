// ワンマンセル ツールズ共通のアクセス計測（GA4）
// 測定IDはここだけを差し替える。空、または G-XXXX のようなプレースホルダーの間は
// タグを読み込まず、ページビューもイベントも送らない。
(function () {
  var MEASUREMENT_ID = 'G-TZ9JMLVKTL';

  function readyId(id) {
    if (typeof id !== 'string') return '';
    var s = id.trim();
    if (!/^G-[A-Z0-9]+$/i.test(s)) return '';
    var body = s.slice(2);
    if (/^x+$/i.test(body)) return '';
    if (/placeholder/i.test(body)) return '';
    return s;
  }

  var id = readyId(MEASUREMENT_ID);

  window.omcTrack = function (name, params) {
    try {
      if (!id) return;
      if (typeof name !== 'string' || !name) return;
      if (typeof window.gtag !== 'function') return;
      if (params && typeof params === 'object') window.gtag('event', name, params);
      else window.gtag('event', name);
    } catch (e) {}
  };

  try {
    if (!id) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    var head = document.head || document.getElementsByTagName('head')[0];
    if (head) head.appendChild(script);
  } catch (e) {}
})();
