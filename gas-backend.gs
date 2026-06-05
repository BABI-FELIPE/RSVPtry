const SPREADSHEET_ID = '';
const SHEET_NAME = 'Guests';
const HEADER_ROW = 1;
const COLUMNS = {
  name: 1,
  numberOfGuests: 2,
  checkedIn: 3,
  checkInTime: 4,
};

function doGet(e) {
  const params = e.parameter || {};
  const nameQuery = params.name;
  const isAdmin = params.admin === 'true' || params.admin === '1';

  if (isAdmin) {
    return sendJson({
      success: true,
      guests: getAllGuests_(),
    });
  }

  if (!nameQuery) {
    return sendJson({
      success: false,
      message: 'Missing query parameter: name',
    });
  }

  const guest = searchGuest_(nameQuery);

  if (!guest) {
    return sendJson({
      success: true,
      found: false,
    });
  }

  return sendJson(Object.assign({
    success: true,
    found: true,
  }, guest));
}

function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents || '{}');
  } catch (error) {
    return sendJson({
      success: false,
      message: 'Malformed JSON body',
    });
  }

  if (!payload.name) {
    return sendJson({
      success: false,
      message: 'Guest name is required',
    });
  }

  const nameQuery = payload.name;
  const sheet = getGuestSheet_();
  const normalizedQuery = normalizeName_(nameQuery);
  const data = sheet.getDataRange().getValues();
  const header = data[HEADER_ROW - 1];
  const rows = data.slice(HEADER_ROW);

  for (var index = 0; index < rows.length; index += 1) {
    var row = rows[index];
    var rowName = normalizeName_(row[COLUMNS.name - 1]);
    if (rowName === normalizedQuery) {
      var isCheckedIn = String(row[COLUMNS.checkedIn - 1]).toLowerCase() === 'yes';
      if (isCheckedIn) {
        return sendJson({
          success: false,
          message: 'Guest already checked in',
        });
      }

      var rowNumber = HEADER_ROW + index + 1;
      sheet.getRange(rowNumber, COLUMNS.checkedIn).setValue('Yes');
      sheet.getRange(rowNumber, COLUMNS.checkInTime).setValue(getTimestamp_());
      return sendJson({
        success: true,
        message: 'Guest checked in successfully',
      });
    }
  }

  return sendJson({
    success: false,
    message: 'Guest not found',
  });
}

function searchGuest_(nameQuery) {
  const normalizedQuery = normalizeName_(nameQuery);
  const rows = getGuestSheet_().getDataRange().getValues().slice(HEADER_ROW);

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var rowName = normalizeName_(row[COLUMNS.name - 1]);
    if (rowName === normalizedQuery) {
      return {
        name: String(row[COLUMNS.name - 1]).trim(),
        numberOfGuests: Number(row[COLUMNS.numberOfGuests - 1]) || 0,
        checkedIn: String(row[COLUMNS.checkedIn - 1]).toLowerCase() === 'yes',
      };
    }
  }
  return null;
}

function getAllGuests_() {
  const rows = getGuestSheet_().getDataRange().getValues().slice(HEADER_ROW);
  return rows.map(function (row) {
    return {
      name: String(row[COLUMNS.name - 1]).trim(),
      numberOfGuests: Number(row[COLUMNS.numberOfGuests - 1]) || 0,
      checkedIn: String(row[COLUMNS.checkedIn - 1]).toLowerCase() === 'yes',
      checkInTime: String(row[COLUMNS.checkInTime - 1]).trim() || '',
    };
  });
}

function getGuestSheet_() {
  var spreadsheet;
  if (SPREADSHEET_ID) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet "' + SHEET_NAME + '" not found.');
  }
  return sheet;
}

function normalizeName_(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function getTimestamp_() {
  var timeZone = Session.getScriptTimeZone();
  return Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd HH:mm');
}

function sendJson(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
