/**
 * Blerp Export — Run this script in the browser console on https://blerp.com/my-stream
 * (while logged in). It extracts your My Stream soundboard and downloads a JSON file
 * you can import into the Sound Board App.
 *
 * Usage:
 * 1. Open https://blerp.com/my-stream and log in.
 * 2. Open Developer Tools (F12) → Console.
 * 3. Paste this entire script and press Enter.
 * 4. If extraction finds sounds, a JSON file will download.
 *
 * If no file downloads: run BlerpExport.debug() in the console and check the output.
 */

(function () {
  'use strict';

  function resolve(state, obj) {
    if (obj == null || typeof obj !== 'object') return obj;
    if (obj.__ref) {
      var next = state[obj.__ref];
      return next != null ? resolve(state, next) : obj;
    }
    return obj;
  }

  function getMp3Url(state, bite) {
    var audio = resolve(state, bite.audio);
    if (!audio) return null;
    var mp3 = resolve(state, audio.mp3);
    if (!mp3) return null;
    var url = mp3.url;
    return typeof url === 'string' && url.trim() ? url : null;
  }

  function getImageUrl(state, bite) {
    var img = resolve(state, bite.image);
    if (!img) return '';
    var original = resolve(state, img.original);
    return (original && original.url) ? original.url : '';
  }

  function getCategories(state, bite) {
    var cats = bite.categoryObjects;
    if (!Array.isArray(cats)) return { category: '', tags: [] };
    var titles = [];
    for (var i = 0; i < cats.length; i++) {
      var c = resolve(state, cats[i]);
      if (c && c.title) titles.push(c.title);
    }
    return {
      category: titles[0] || '',
      tags: titles
    };
  }

  function biteToSound(state, key, bite) {
    var fileUrl = getMp3Url(state, bite);
    if (!fileUrl || !bite.title) return null;
    var cats = getCategories(state, bite);
    return {
      id: (bite._id || bite.id || (key && key.replace(/^Bite:/, '')) || 'bite-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9)).toString(),
      title: bite.title || 'Untitled',
      fileUrl: fileUrl,
      imageUrl: getImageUrl(state, bite),
      category: cats.category,
      tags: cats.tags,
      volume: 1,
      startMs: null,
      endMs: bite.audioDuration != null ? bite.audioDuration * 1000 : null,
      hotkey: '',
      color: '#4a9eff',
      extra: { blerpDuration: bite.audioDuration }
    };
  }

  function tryApolloState(state) {
    if (!state || typeof state !== 'object') return [];
    var sounds = [];
    var seen = new Set();
    Object.keys(state).forEach(function (key) {
      if (key.indexOf('Bite') === -1) return;
      if (seen.has(key)) return;
      var val = state[key];
      if (!val || typeof val !== 'object' || !val.title) return;
      seen.add(key);
      var s = biteToSound(state, key, val);
      if (s) sounds.push(s);
    });
    if (sounds.length > 0) return sounds;
    return tryApolloDeepScan(state);
  }

  function tryApolloDeepScan(state) {
    if (!state || typeof state !== 'object') return [];
    var sounds = [];
    var seenIds = new Set();
    var seenRefs = new Set();
    function walk(obj, key, depth) {
      if (depth > 12) return;
      if (!obj || typeof obj !== 'object') return;
      if (obj.__ref) {
        if (seenRefs.has(obj.__ref)) return;
        seenRefs.add(obj.__ref);
        var ref = state[obj.__ref];
        if (ref) walk(ref, obj.__ref, depth + 1);
        return;
      }
      var hasTitle = typeof obj.title === 'string' && obj.title.trim();
      var audioUrl = getMp3Url(state, obj);
      if (hasTitle && audioUrl && !seenIds.has(obj._id || obj.id || audioUrl)) {
        var id = (obj._id || obj.id || 'scan-' + Date.now() + '-' + sounds.length).toString();
        if (seenIds.has(id)) return;
        seenIds.add(id);
        sounds.push({
          id: id,
          title: obj.title.trim(),
          fileUrl: audioUrl,
          imageUrl: getImageUrl(state, obj),
          category: '',
          tags: [],
          volume: 1,
          startMs: null,
          endMs: (obj.audioDuration != null ? obj.audioDuration * 1000 : null),
          hotkey: '',
          color: '#4a9eff',
          extra: { blerpDuration: obj.audioDuration }
        });
      }
      if (Array.isArray(obj)) {
        obj.forEach(function (item, i) { walk(item, key + '.' + i, depth + 1); });
        return;
      }
      Object.keys(obj).forEach(function (k) {
        if (k === '__ref' || k === '__typename') return;
        walk(obj[k], key + '.' + k, depth + 1);
      });
    }
    Object.keys(state).forEach(function (k) {
      walk(state[k], k, 0);
    });
    return sounds;
  }

  function tryNextData() {
    var el = document.getElementById('__NEXT_DATA__');
    if (!el || !el.textContent) return [];
    try {
      var data = JSON.parse(el.textContent);
      var sounds = [];
      function walk(o) {
        if (!o || typeof o !== 'object') return;
        if (Array.isArray(o)) {
          o.forEach(walk);
          return;
        }
        if (o.title && o.audio && o.audio.mp3 && typeof o.audio.mp3.url === 'string' && o.audio.mp3.url.trim()) {
          sounds.push({
            id: (o._id || o.id || 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9)).toString(),
            title: o.title || 'Untitled',
            fileUrl: o.audio.mp3.url.trim(),
            imageUrl: (o.image && o.image.original && o.image.original.url) ? o.image.original.url : '',
            category: '',
            tags: [],
            volume: 1,
            startMs: null,
            endMs: (o.audioDuration != null ? o.audioDuration * 1000 : null),
            hotkey: '',
            color: '#4a9eff',
            extra: { blerpDuration: o.audioDuration }
          });
        }
        Object.keys(o).forEach(function (k) { walk(o[k]); });
      }
      walk(data);
      return sounds;
    } catch (e) {
      return [];
    }
  }

  function tryDom() {
    var sounds = [];
    var seen = new Set();
    var sel = 'a[href*=".mp3"], a[href*="audio"], [data-audio-url], [data-src*=".mp3"], audio source[src*=".mp3"], [data-bite-id] button, [data-testid] button, [role="button"]';
    var nodes = document.querySelectorAll(sel);
    for (var i = 0; i < nodes.length && sounds.length < 80; i++) {
      var el = nodes[i];
      var url = el.getAttribute('href') || el.getAttribute('data-audio-url') || el.getAttribute('data-src') || (el.src && el.src.indexOf && el.src.indexOf('.mp3') !== -1 ? el.src : null) || (el.querySelector && (el.querySelector('source[src*=".mp3"]') || {}).src);
      if (url && typeof url === 'string' && (url.indexOf('.mp3') !== -1 || url.indexOf('audio') !== -1)) {
        if (seen.has(url)) continue;
        seen.add(url);
        var title = (el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('data-title') || (el.textContent || '').trim()).slice(0, 200) || ('Sound ' + (sounds.length + 1));
        sounds.push({
          id: 'dom-' + Date.now() + '-' + i,
          title: title,
          fileUrl: url,
          imageUrl: '',
          category: '',
          tags: [],
          volume: 1,
          startMs: null,
          endMs: null,
          hotkey: '',
          color: '#4a9eff',
          extra: {}
        });
      }
    }
    return sounds;
  }

  function getOrderedBiteIds(state) {
    var ids = [];
    var q = state['ROOT_QUERY'] || {};
    function findButtonContainers(o, depth) {
      if (!o || typeof o !== 'object' || depth > 10) return;
      if (Array.isArray(o)) {
        o.forEach(function (x) { findButtonContainers(x, depth + 1); });
        return;
      }
      if (o.biteId && typeof o.biteId === 'string') ids.push(o.biteId);
      Object.keys(o).forEach(function (k) { findButtonContainers(o[k], depth + 1); });
    }
    findButtonContainers(q, 0);
    return ids;
  }

  function getApolloState() {
    try {
      var client = window.__APOLLO_CLIENT__;
      if (client && client.cache && typeof client.cache.extract === 'function') {
        var live = client.cache.extract();
        if (live && typeof live === 'object' && Object.keys(live).length > 0) return live;
      }
    } catch (e) {}
    return window.__APOLLO_STATE__ || window.APOLLO_STATE || {};
  }

  var lastExportedSounds = [];

  function runExport(download) {
    var state = getApolloState();
    var fromApollo = tryApolloState(state || {});
    var fromNext = [];
    var fromDom = [];
    if (fromApollo.length === 0) fromNext = tryNextData();
    if (fromApollo.length === 0 && fromNext.length === 0) fromDom = tryDom();

    var orderedIds = state ? getOrderedBiteIds(state) : [];
    var sounds = fromApollo.length ? fromApollo : (fromNext.length ? fromNext : fromDom);
    if (orderedIds.length && sounds.length) {
      var byId = {};
      sounds.forEach(function (s) { byId[s.id] = s; });
      var ordered = [];
      orderedIds.forEach(function (id) {
        if (byId[id]) { ordered.push(byId[id]); delete byId[id]; }
      });
      Object.keys(byId).forEach(function (id) { ordered.push(byId[id]); });
      sounds = ordered;
    }
    lastExportedSounds = sounds;

    if (download !== false && sounds.length > 0) {
      var board = {
        schemaVersion: 1,
        id: 'from-blerp-' + Date.now(),
        name: 'From Blerp',
        description: 'Exported from Blerp My Stream',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sounds: sounds
      };
      var json = JSON.stringify(board, null, 2);
      var blob = new Blob([json], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'from-blerp-' + Date.now() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      console.log('Blerp Export: Downloaded board with ' + sounds.length + ' sound(s). Import it in the Sound Board App.');
    } else if (sounds.length === 0) {
      console.warn('Blerp Export: No sounds found. Run BlerpExport.debug() in the console and check the output.');
    }
    return { fromApollo: fromApollo.length, fromNext: fromNext.length, fromDom: fromDom.length, total: sounds.length };
  }

  function downloadSoundFiles() {
    if (!lastExportedSounds.length) runExport(false);
    var sounds = lastExportedSounds;
    if (!sounds.length) {
      console.warn('Blerp Export: No sounds to download. Run the export first (paste the script again) then BlerpExport.downloadSoundFiles().');
      return;
    }
    console.log('Blerp Export: Downloading ' + sounds.length + ' sound file(s)...');
    sounds.forEach(function (s, i) {
      var name = (s.title || s.id || 'sound-' + (i + 1)).replace(/[^a-z0-9-_\.]/gi, '-').slice(0, 80) + '.mp3';
      fetch(s.fileUrl, { mode: 'cors' })
        .then(function (r) { return r.ok ? r.blob() : Promise.reject(new Error(r.status)); })
        .then(function (blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = name;
          a.click();
          URL.revokeObjectURL(a.href);
        })
        .catch(function (err) { console.warn('Blerp Export: Failed to download ' + name + ':', err.message); });
    });
  }

  function debug() {
    var state = getApolloState();
    var nextEl = document.getElementById('__NEXT_DATA__');
    var nextData = window.__NEXT_DATA__;
    var hasClient = !!(window.__APOLLO_CLIENT__ && window.__APOLLO_CLIENT__.cache);
    console.log('BlerpExport.debug():');
    console.log('  __APOLLO_STATE__:', !!window.__APOLLO_STATE__);
    console.log('  APOLLO_STATE:', !!window.APOLLO_STATE);
    console.log('  __APOLLO_CLIENT__ (cache):', hasClient);
    if (hasClient) {
      try {
        var extracted = window.__APOLLO_CLIENT__.cache.extract();
        console.log('  cache.extract() keys:', extracted ? Object.keys(extracted).length : 0);
      } catch (e) { console.log('  cache.extract() error:', e.message); }
    }
    console.log('  __NEXT_DATA__ (element):', !!nextEl);
    console.log('  __NEXT_DATA__ (window):', !!nextData);
    if (state && typeof state === 'object') {
      var keys = Object.keys(state);
      var biteKeys = keys.filter(function (k) { return k.indexOf('Bite') !== -1; });
      var rootKeys = keys.filter(function (k) { return k.indexOf('ROOT') !== -1 || k.indexOf('Query') !== -1; });
      console.log('  Cache keys (total):', keys.length);
      console.log('  Cache keys (contain "Bite"):', biteKeys.length, biteKeys.slice(0, 25));
      console.log('  Cache keys (ROOT/Query):', rootKeys.slice(0, 15));
      if (biteKeys.length > 0) {
        var sample = state[biteKeys[0]];
        console.log('  Sample Bite key:', biteKeys[0], '| shape:', sample ? Object.keys(sample) : null);
      }
      var deep = tryApolloDeepScan(state);
      console.log('  Deep scan found:', deep.length, 'Bite-like objects');
    } else {
      console.log('  No Apollo state/cache available.');
    }
    var domCount = document.querySelectorAll('a[href*=".mp3"], audio source[src*=".mp3"], [data-audio-url]').length;
    console.log('  DOM audio links / sources:', domCount);
    var result = runExport(false);
    console.log('  Extracted — Apollo:', result.fromApollo, 'Next:', result.fromNext, 'DOM:', result.fromDom, 'Total:', result.total);
  }

  window.BlerpExport = { run: runExport, debug: debug, downloadSoundFiles: downloadSoundFiles };
  runExport(true);
})();
