// PULPITO SHOW — Backend Sync v2
// Acepta GET para push y pull (evita CORS)
// ══════════════════════════════════════════
// ACTUALIZAR: Implementar → Nueva implementación

var SHEET_NAME = 'Contratos';

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['json_data','updated_at']);
    sh.appendRow(['[]', new Date().toISOString()]);
  }
  if (sh.getLastRow() < 2) sh.appendRow(['[]', new Date().toISOString()]);
  return sh;
}

function resp(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};
  var action = p.action || 'status';
  try {
    var sh = getSheet();
    if (action === 'push' && p.data) {
      var incoming = JSON.parse(decodeURIComponent(p.data));
      var existing = [];
      try { existing = JSON.parse(sh.getRange(2,1).getValue() || '[]'); } catch(x){}
      var map = {};
      existing.forEach(function(c){ map[c.id]=c; });
      incoming.forEach(function(c){
        var clean={};
        Object.keys(c).forEach(function(k){ if(k!=='vou') clean[k]=c[k]; });
        map[c.id]=clean;
      });
      var merged = Object.values(map).sort(function(a,b){ return new Date(b.cre||0)-new Date(a.cre||0); });
      sh.getRange(2,1).setValue(JSON.stringify(merged));
      sh.getRange(2,2).setValue(new Date().toISOString());
      return resp({ok:true,action:'push',count:merged.length});
    }
    if (action === 'pull') {
      var raw = sh.getRange(2,1).getValue();
      return resp({ok:true,action:'pull',data:JSON.parse(raw||'[]')});
    }
    return resp({ok:true,status:'Pulpito Show API v2',time:new Date().toISOString()});
  } catch(err) {
    return resp({ok:false,error:err.toString()});
  }
}

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    if (b.action==='push' && b.data) {
      return doGet({parameter:{action:'push',data:encodeURIComponent(JSON.stringify(b.data))}});
    }
    return resp({ok:false,error:'Unknown'});
  } catch(err){ return resp({ok:false,error:err.toString()}); }
}
