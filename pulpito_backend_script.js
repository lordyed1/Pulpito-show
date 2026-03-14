// PULPITO SHOW — Backend Sync v3 (JSONP)
// Soporta JSONP para evitar CORS en Android Chrome
// ══════════════════════════════════════════════════
// ACTUALIZAR EN SCRIPT.GOOGLE.COM:
// 1. Reemplaza el código anterior con este
// 2. Implementar → Nueva implementación
// 3. Tipo: App web | Ejecutar: Yo | Acceso: Cualquier persona
// 4. Copia la nueva URL y ponla en la app si cambia

var SHEET_NAME = 'Contratos';

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['json_data', 'updated_at']);
    sh.appendRow(['[]', new Date().toISOString()]);
  }
  if (sh.getLastRow() < 2) sh.appendRow(['[]', new Date().toISOString()]);
  return sh;
}

function makeResponse(data, callback) {
  var json = JSON.stringify(data);
  // Si hay callback → JSONP (para Android/móvil)
  // Si no → JSON normal (para desktop/fetch)
  var output = callback ? callback + '(' + json + ')' : json;
  var mime = callback
    ? ContentService.MimeType.JAVASCRIPT
    : ContentService.MimeType.JSON;
  return ContentService.createTextOutput(output).setMimeType(mime);
}

function doGet(e) {
  var p        = (e && e.parameter) ? e.parameter : {};
  var action   = p.action   || 'status';
  var callback = p.callback || null;   // JSONP callback name

  try {
    var sh = getSheet();

    // ── PUSH ─────────────────────────────────────────
    if (action === 'push' && p.data) {
      var incoming = JSON.parse(decodeURIComponent(p.data));
      var existing = [];
      try { existing = JSON.parse(sh.getRange(2,1).getValue() || '[]'); } catch(x){}

      var map = {};
      existing.forEach(function(c) { map[c.id] = c; });
      incoming.forEach(function(c) {
        var clean = {};
        Object.keys(c).forEach(function(k) { if (k !== 'vou') clean[k] = c[k]; });
        map[c.id] = clean;
      });

      var merged = Object.values(map).sort(function(a,b) {
        return new Date(b.cre||0) - new Date(a.cre||0);
      });

      sh.getRange(2,1).setValue(JSON.stringify(merged));
      sh.getRange(2,2).setValue(new Date().toISOString());
      return makeResponse({ok:true, action:'push', count:merged.length}, callback);
    }

    // ── PULL ─────────────────────────────────────────
    if (action === 'pull') {
      var raw = sh.getRange(2,1).getValue();
      var data = JSON.parse(raw || '[]');
      return makeResponse({ok:true, action:'pull', data:data}, callback);
    }

    // ── STATUS ────────────────────────────────────────
    return makeResponse({ok:true, status:'Pulpito Show API v3', time:new Date().toISOString()}, callback);

  } catch(err) {
    return makeResponse({ok:false, error:err.toString()}, callback);
  }
}

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    var p = { action:'push', data: encodeURIComponent(JSON.stringify(b.data||[])) };
    return doGet({ parameter: p });
  } catch(err) {
    return makeResponse({ok:false, error:err.toString()}, null);
  }
}
