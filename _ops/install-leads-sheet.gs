/**
 * StructTech · /install/ lead form → Google Sheet
 *
 * Free. Runs in your own Google account. Not published on the website
 * (folders starting with "_" are skipped by GitHub Pages).
 *
 * Setup (about 5 minutes):
 *  1. Create a Google Sheet, e.g. "Install Leads".
 *  2. In the Sheet: Extensions → Apps Script. Delete the sample code, paste this whole file, Save.
 *  3. Optional: set NOTIFY_EMAIL below to get an email for each new lead (uses your Gmail quota, free).
 *  4. Deploy → New deployment → type "Web app".
 *       Execute as: Me
 *       Who has access: Anyone
 *     Click Deploy, approve the permissions, copy the Web app URL (ends in /exec).
 *  5. Paste that URL into install/index.html → INSTALL_CONFIG.sheet_endpoint.
 *
 * If you edit this script later: Deploy → Manage deployments → edit → Version: New version.
 * (A brand-new deployment gives a new URL; editing the existing one keeps the same URL.)
 */

var SHEET_NAME = 'Leads';
var NOTIFY_EMAIL = ''; // e.g. 'jacob@structtek.com'. Leave empty for no email.

var COLUMNS = [
  'received_at', 'submitted_at', 'first_name', 'phone', 'email', 'trade', 'crew_size', 'biggest_leak',
  'sms_consent', 'sms_consent_at', 'sms_consent_text',
  'tag', 'source', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'fbp', 'fbc', 'landing_url', 'referrer', 'event_id'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!data.email || !data.first_name) return out_({ ok: false, error: 'missing fields' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS);
      sheet.setFrozenRows(1);
    }

    data.received_at = new Date().toISOString();
    var row = COLUMNS.map(function (c) {
      var v = data[c] === undefined || data[c] === null ? '' : String(data[c]);
      // Stop spreadsheet formula injection from form text.
      return /^[=+\-@]/.test(v) ? "'" + v : v.slice(0, 2000);
    });
    sheet.appendRow(row);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL, 'New install lead: ' + data.first_name + ' (' + (data.trade || '') + ', ' + (data.crew_size || '') + ')',
        COLUMNS.map(function (c, i) { return c + ': ' + row[i]; }).join('\n'));
    }
    return out_({ ok: true });
  } catch (err) {
    console.error(err);
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
