// ══════════════════════════════════════════════════════
// PULPITO SHOW — Backend de Sincronización
// Google Apps Script Web App
// ══════════════════════════════════════════════════════
//
// INSTRUCCIONES DE INSTALACIÓN:
// 1. Ve a script.google.com
// 2. Crea un nuevo proyecto → pega este código
// 3. Guardar → Implementar → Nueva implementación
// 4. Tipo: Aplicación web
// 5. Ejecutar como: Yo (tu cuenta)
// 6. Quién tiene acceso: Cualquier persona
// 7. Implementar → Copia la URL que te da
// 8. Pega esa URL en la app Pulpito Show en "Sincronización"
//
// ══════════════════════════════════════════════════════

var SHEET_NAME = 'Contratos';

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['json_data', 'updated_at']);
    sheet.appendRow(['[]', new Date().toISOString()]);
  }
  return sheet;
}

// GET → pull data
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'pull') {
    try {
      var sheet = getSheet();
      var data = sheet.getRange(2, 1).getValue();
      var parsed = JSON.parse(data || '[]');
      // Remove voucher images from remote (too heavy, kept locally)
      var clean = parsed.map(function(c) {
        var copy = JSON.parse(JSON.stringify(c));
        delete copy.vou;
        return copy;
      });
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, data: clean }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, status: 'Pulpito Show API running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// POST → push data
function doPost(e) {
  try {
    var body = e.postData.contents;
    var payload = JSON.parse(body);
    
    if (payload.action === 'push' && payload.data) {
      var sheet = getSheet();
      // Get existing remote data
      var existing = [];
      try {
        existing = JSON.parse(sheet.getRange(2, 1).getValue() || '[]');
      } catch(ex) { existing = []; }
      
      // Merge: incoming wins
      var remoteMap = {};
      existing.forEach(function(c) { remoteMap[c.id] = c; });
      
      payload.data.forEach(function(c) {
        var clean = JSON.parse(JSON.stringify(c));
        delete clean.vou; // don't store images in sheet
        remoteMap[c.id] = clean;
      });
      
      var merged = Object.values(remoteMap);
      merged.sort(function(a, b) {
        return new Date(b.cre || 0) - new Date(a.cre || 0);
      });
      
      sheet.getRange(2, 1).setValue(JSON.stringify(merged));
      sheet.getRange(2, 2).setValue(new Date().toISOString());
      
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, count: merged.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
