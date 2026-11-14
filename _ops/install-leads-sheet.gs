/**
 * StructTech · /install/ lead form → Google Sheet
 *
 * Free. Runs in your own Google account. Not published on the website
 * (folders starting with "_" are skipped by GitHub Pages).
 *
 * Tabs it builds (run setupSheet once):
 *   Leads    – one row per form submit. Status + Notes columns are yours to fill in.
 *   Summary  – live counts: total, by status, trade, crew size, source, SMS opt-ins.
 *   Read Me  – what each column means and how to change the script.
 *
 * Setup:
 *  1. Open the Sheet → Extensions → Apps Script. Paste this whole file, Save.
 *  2. Pick "setupSheet" in the function menu → Run → approve the Google permission screen.
 *  3. Deploy → New deployment → type "Web app".
 *       Execute as: Me          Who has access: Anyone
 *     Deploy → copy the Web app URL (ends in /exec).
 *  4. Paste that URL into install/index.html → INSTALL_CONFIG.sheet_endpoint.
 *
 * If you edit this script later: Deploy → Manage deployments → edit (pencil) →
 * Version: New version → Deploy. That keeps the same URL.
 */

var LEADS = 'Leads';
var SUMMARY = 'Summary';
var README = 'Read Me';
var NOTIFY_EMAIL = 'jacob@structtek.com'; // email per new lead. Set to '' to turn off.

// Columns the website fills, in order. Status and Notes come after and are never overwritten.
var COLUMNS = [
  'received_at', 'first_name', 'phone', 'email', 'trade', 'crew_size', 'biggest_leak',
  'sms_consent', 'sms_consent_at', 'sms_consent_text',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'fbp', 'fbc', 'landing_url', 'referrer', 'submitted_at', 'event_id', 'tag', 'source'
];
var MANUAL = ['status', 'notes'];
var STATUSES = ['New', 'Contacted', 'Call booked', 'Call done', 'Won', 'Lost', 'Not a fit'];

/* ───────────── Web app: receives the form ───────────── */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!data.email || !data.first_name) return out_({ ok: false, error: 'missing fields' });

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LEADS) || setupSheet().leads;
    data.received_at = new Date();
    var row = COLUMNS.map(function (c) {
      var v = data[c];
      if (v === undefined || v === null) return '';
      if (v instanceof Date) return v;
      v = String(v);
      // Stop spreadsheet formula injection from form text.
      return /^[=+\-@]/.test(v) ? "'" + v.slice(0, 2000) : v.slice(0, 2000);
    });
    row.push('New', '');
    sheet.appendRow(row);

    if (NOTIFY_EMAIL) {
      var lines = COLUMNS.map(function (c, i) { return c + ': ' + row[i]; }).join('\n');
      MailApp.sendEmail(NOTIFY_EMAIL,
        'New install lead: ' + data.first_name + ' (' + (data.trade || '') + ', ' + (data.crew_size || '') + ')',
        lines + '\n\nSheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
    }
    return out_({ ok: true });
  } catch (err) {
    console.error(err);
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return out_({ ok: true, service: 'structtech-install-leads' });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ───────────── One-time setup: builds the tabs ───────────── */

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var headers = COLUMNS.concat(MANUAL);

  // Leads
  var leads = ss.getSheetByName(LEADS);
  if (!leads) {
    var first = ss.getSheets()[0];
    leads = (first.getLastRow() === 0 && first.getName() !== SUMMARY && first.getName() !== README)
      ? first.setName(LEADS) : ss.insertSheet(LEADS, 0);
  }
  if (leads.getLastRow() === 0) leads.appendRow(headers);
  leads.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground('#0A0A0A').setFontColor('#FFFFFF');
  leads.getRange(1, COLUMNS.length + 1, 1, MANUAL.length).setBackground('#E8A33A').setFontColor('#0A0A0A');
  leads.setFrozenRows(1);
  leads.setFrozenColumns(2);
  leads.getRange('A:A').setNumberFormat('yyyy-mm-dd h:mm am/pm');
  leads.getRange('C:C').setNumberFormat('@');
  var statusCol = COLUMNS.length + 1;
  leads.getRange(2, statusCol, leads.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build());
  leads.setColumnWidth(1, 160);
  leads.setColumnWidths(2, 6, 140);
  leads.setColumnWidth(7, 240);
  leads.setColumnWidth(COLUMNS.length + 2, 300);
  if (!leads.getFilter()) leads.getRange(1, 1, leads.getMaxRows(), headers.length).createFilter();

  // Summary
  var sum = ss.getSheetByName(SUMMARY) || ss.insertSheet(SUMMARY, 1);
  sum.clear();
  var L = "'" + LEADS + "'!";
  var col = function (name) { var i = headers.indexOf(name) + 1; var a = colLetter_(i); return L + a + '2:' + a; };
  var rows = [
    ['Install leads summary', ''],
    ['Total leads', '=COUNTA(' + col('email') + ')'],
    ['Last 7 days', '=COUNTIFS(' + col('received_at') + ',">="&(TODAY()-7))'],
    ['Last 30 days', '=COUNTIFS(' + col('received_at') + ',">="&(TODAY()-30))'],
    ['SMS opt-ins', '=COUNTIF(' + col('sms_consent') + ',TRUE)+COUNTIF(' + col('sms_consent') + ',"true")'],
    ['', ''],
    ['By status', '']
  ];
  STATUSES.forEach(function (s) { rows.push([s, '=COUNTIF(' + col('status') + ',"' + s + '")']); });
  sum.getRange(1, 1, rows.length, 2).setValues(rows);
  var r = rows.length + 2;
  var blocks = [['By trade', 'trade'], ['By crew size', 'crew_size'], ['By source (utm_source)', 'utm_source'], ['By campaign (utm_campaign)', 'utm_campaign']];
  blocks.forEach(function (b) {
    sum.getRange(r, 1).setValue(b[0]).setFontWeight('bold');
    sum.getRange(r + 1, 1).setFormula('=IFERROR(QUERY({' + col(b[1]) + '},"select Col1, count(Col1) where Col1 is not null group by Col1 order by count(Col1) desc label count(Col1) \'\'",0),"No leads yet")');
    r += 12;
  });
  sum.getRange('A1').setFontSize(16).setFontWeight('bold');
  sum.getRange('A7').setFontWeight('bold');
  sum.getRange('A2:A5').setFontWeight('bold');
  sum.setColumnWidth(1, 240);
  sum.setColumnWidth(2, 120);

  // Read Me
  var rm = ss.getSheetByName(README) || ss.insertSheet(README);
  rm.clear();
  var notes = [
    ['How this Sheet works', ''],
    ['Where leads come from', 'The booking form on structtek.com/install/. Each submit adds one row to the Leads tab.'],
    ['Status / Notes', 'The two amber columns on Leads are yours. Pick a Status from the dropdown; the script never overwrites them.'],
    ['Email alerts', 'Each new lead emails ' + (NOTIFY_EMAIL || '(off)') + '. Change NOTIFY_EMAIL in Extensions → Apps Script to turn this off or change it.'],
    ['Do not', 'Rename the Leads tab, or move or delete its columns A–' + colLetter_(COLUMNS.length) + '. The website writes to them in that order.'],
    ['sms_consent', 'TRUE only if the visitor ticked the SMS box. Only text people with TRUE. The exact consent text and time are in the next two columns.'],
    ['event_id', 'Matches the Meta Pixel "Lead" event for the same submit.'],
    ['After editing the script', 'Deploy → Manage deployments → pencil → Version: New version → Deploy. That keeps the same web address.']
  ];
  rm.getRange(1, 1, notes.length, 2).setValues(notes).setWrap(true).setVerticalAlignment('top');
  rm.getRange('A1').setFontSize(16).setFontWeight('bold');
  rm.getRange(2, 1, notes.length - 1, 1).setFontWeight('bold');
  rm.setColumnWidth(1, 200);
  rm.setColumnWidth(2, 620);

  ss.setActiveSheet(leads);
  return { leads: leads };
}

function colLetter_(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
