/**
 * NexPOS — Google Apps Script Web App
 *
 * HOW TO USE:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Replace ALL existing code with this file
 * 3. Click Save (Ctrl+S)
 * 4. Click Deploy → Manage deployments → Edit (pencil icon)
 * 5. Change version to "New version" → Deploy
 * 6. Make sure "Who has access" is set to "Anyone"
 *
 * Sheets created automatically:
 *   - transactions       (includes timestamp column)
 *   - transaction_items  (includes timestamp column)
 *   - customers
 *   - products
 *   - inventory_logs     (includes timestamp column)
 *
 * Backward compatible:
 *   - If a sheet already exists, any missing columns are appended automatically.
 *   - All rows are written by column name, so column order never matters.
 */

// ── YOUR SPREADSHEET ID ────────────────────────────────────────────────────────
// Found in your Google Sheet URL:
// https://docs.google.com/spreadsheets/d/  <--- THIS PART --->  /edit
var SHEET_ID = '1KtU_95_No0LG5u5mLYEdUH7uoJ5PpAufKMBAU-Z_Ias';

// ── ENTRY POINT ────────────────────────────────────────────────────────────────
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action || 'saveTransaction';
    var ss      = SpreadsheetApp.openById(SHEET_ID);

    switch (action) {
      case 'saveTransaction': handleTransaction(ss, payload);   break;
      case 'saveCustomer':    handleCustomer(ss, payload);      break;
      case 'saveProduct':     handleProduct(ss, payload);       break;
      case 'updateProduct':   handleUpdateProduct(ss, payload); break;
      case 'logInventory':    handleInventoryLog(ss, payload);  break;
      case 'clearStoreData':  handleClearStoreData(ss);         break;
      case 'uploadImage':     return handleUploadImage(payload); // returns its own response
      default:
        throw new Error('Unknown action: ' + action);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// ── SHEET HELPERS ──────────────────────────────────────────────────────────────

/**
 * Gets a sheet by name.
 * - If it doesn't exist: creates it with the given headers (bold, frozen row 1).
 * - If it already exists: calls ensureColumns() to add any missing headers
 *   at the end of row 1 without touching existing data.
 */
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold').setBackground('#f3f4f6');
    sheet.setFrozenRows(1);
  } else {
    ensureColumns(sheet, headers);
  }
  return sheet;
}

/**
 * Appends any header column names that are not yet present in row 1.
 * New columns are added to the right of the last existing column.
 * Existing data is never moved or modified.
 */
function ensureColumns(sheet, headers) {
  var lastCol  = sheet.getLastColumn();
  var existing = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String)
    : [];

  for (var i = 0; i < headers.length; i++) {
    if (existing.indexOf(headers[i]) === -1) {
      var newCol = existing.length + 1;
      sheet.getRange(1, newCol)
           .setValue(headers[i])
           .setFontWeight('bold')
           .setBackground('#f3f4f6');
      existing.push(headers[i]);
    }
  }
}

/**
 * Appends a data row by matching object keys to header names in row 1.
 * Values are placed in the correct column regardless of column order.
 * Any column not present in dataObj gets an empty string.
 */
function appendRowObj(sheet, dataObj) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var row = headers.map(function(h) {
    var v = dataObj[String(h)];
    return (v !== undefined && v !== null) ? v : '';
  });
  sheet.appendRow(row);
}

// ── TRANSACTION HANDLERS ───────────────────────────────────────────────────────

function handleTransaction(ss, p) {
  // Server-side timestamp — recorded at the moment the sheet is written
  var now = new Date().toISOString();

  // ── transactions ──────────────────────────────────────────────────────────
  var txSheet = getOrCreateSheet(ss, 'transactions', [
    'transaction_id', 'date', 'timestamp',
    'subtotal', 'discount_pct', 'discount_amount',
    'tax_amount', 'total', 'payment_method', 'items_count', 'cashier'
  ]);
  appendRowObj(txSheet, {
    transaction_id:  p.transaction_id,
    date:            p.date,            // client ISO string (time of sale)
    timestamp:       now,               // server ISO string (time of sheet write)
    subtotal:        p.subtotal,
    discount_pct:    p.discount_pct,
    discount_amount: p.discount_amount,
    tax_amount:      p.tax_amount,
    total:           p.total,
    payment_method:  p.payment_method,
    items_count:     p.items_count,
    cashier:         p.cashier
  });

  // ── transaction_items ─────────────────────────────────────────────────────
  // Each item row carries the same timestamp as the parent transaction
  var itemsSheet = getOrCreateSheet(ss, 'transaction_items', [
    'transaction_id', 'timestamp',
    'product_id', 'product_name', 'sku',
    'quantity', 'unit_price', 'subtotal'
  ]);
  var items = p.items || [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    appendRowObj(itemsSheet, {
      transaction_id: p.transaction_id,
      timestamp:      now,
      product_id:     item.product_id,
      product_name:   item.product_name,
      sku:            item.sku,
      quantity:       item.quantity,
      unit_price:     item.unit_price,
      subtotal:       item.subtotal
    });
  }
}

// ── CUSTOMER HANDLER ───────────────────────────────────────────────────────────

function handleCustomer(ss, p) {
  var sheet = getOrCreateSheet(ss, 'customers', [
    'id', 'name', 'email', 'phone', 'notes', 'total_purchases', 'created_at'
  ]);
  appendRowObj(sheet, {
    id:              p.id,
    name:            p.name,
    email:           p.email            || '',
    phone:           p.phone            || '',
    notes:           p.notes            || '',
    total_purchases: p.total_purchases  || 0,
    created_at:      p.created_at
  });
}

// ── PRODUCT HANDLERS ───────────────────────────────────────────────────────────

var PRODUCT_HEADERS = [
  'id', 'name', 'sku', 'category', 'price', 'cost', 'stock',
  'min_stock', 'description', 'emoji', 'barcode', 'unit',
  'tax_rate', 'is_active', 'image_url', 'created_at', 'updated_at'
];

function productObj(p) {
  return {
    id:          p.id,
    name:        p.name,
    sku:         p.sku,
    category:    p.category,
    price:       p.price,
    cost:        p.cost        || '',
    stock:       p.stock,
    min_stock:   p.min_stock   || 5,
    description: p.description || '',
    emoji:       p.emoji       || '📦',
    barcode:     p.barcode     || '',
    unit:        p.unit        || 'pcs',
    tax_rate:    p.tax_rate    || 0,
    is_active:   p.is_active === false ? 'FALSE' : 'TRUE',
    image_url:   p.image_url   || '',
    created_at:  p.created_at,
    updated_at:  p.updated_at
  };
}

function handleProduct(ss, p) {
  var sheet = getOrCreateSheet(ss, 'products', PRODUCT_HEADERS);
  appendRowObj(sheet, productObj(p));
}

function handleUpdateProduct(ss, p) {
  var sheet   = getOrCreateSheet(ss, 'products', PRODUCT_HEADERS);
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var obj     = productObj(p);

  // Build row array aligned to the actual header order in the sheet
  function buildRow(headers) {
    return headers.map(function(h) {
      var v = obj[String(h)];
      return (v !== undefined && v !== null) ? v : '';
    });
  }

  // Find existing row by id (column A = index 0) and overwrite it
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === p.id) {
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([buildRow(headers)]);
      return;
    }
  }

  // Not found — insert as new row
  appendRowObj(sheet, obj);
}

// ── INVENTORY LOG HANDLER ──────────────────────────────────────────────────────

function handleInventoryLog(ss, p) {
  var sheet = getOrCreateSheet(ss, 'inventory_logs', [
    'id', 'timestamp', 'product_id', 'product_name',
    'change_type', 'quantity_before', 'quantity_after', 'quantity_change', 'note'
  ]);
  appendRowObj(sheet, {
    id:              p.id,
    // Use client-sent timestamp (time of the actual event); fall back to now
    timestamp:       p.timestamp || new Date().toISOString(),
    product_id:      p.product_id,
    product_name:    p.product_name,
    change_type:     p.change_type,
    quantity_before: p.quantity_before,
    quantity_after:  p.quantity_after,
    quantity_change: p.quantity_change,
    note:            p.note || ''
  });
}

// ── STORE RESET HANDLER ────────────────────────────────────────────────────────

/**
 * Clears all data rows (row 2 onwards) from the five store sheets,
 * preserving header row 1. Sheets that don't exist yet are silently skipped.
 */
function handleClearStoreData(ss) {
  var sheetNames = ['products', 'transactions', 'transaction_items', 'inventory_logs', 'customers'];
  for (var i = 0; i < sheetNames.length; i++) {
    var sheet = ss.getSheetByName(sheetNames[i]);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  }
}

// ── IMAGE UPLOAD HANDLER ───────────────────────────────────────────────────────

/**
 * Saves a base64-encoded image to Google Drive and returns its public URL.
 * The file is stored in a "NexPOS Images" folder created at root if it doesn't exist.
 * Sharing is set to "Anyone with the link can view" so the URL is publicly accessible.
 */
function handleUploadImage(p) {
  try {
    var folderName = 'NexPOS Images';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    var imageBytes = Utilities.base64Decode(p.base64Data);
    var blob = Utilities.newBlob(imageBytes, p.mimeType, p.filename);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileId = file.getId();
    var url = 'https://drive.google.com/uc?export=view&id=' + fileId;

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, url: url }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('handleUploadImage error: ' + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── MANUAL TESTS (run these in the editor to verify access) ───────────────────

function testWrite() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrCreateSheet(ss, 'test', ['status', 'timestamp']);
  appendRowObj(sheet, { status: 'ok', timestamp: new Date().toISOString() });
  Logger.log('testWrite: row appended to test sheet');
}

/**
 * Run this in the GAS editor to test Drive access + image upload.
 * Select "testUploadImage" in the function dropdown, then click Run.
 * Check the Logs panel for SUCCESS or the error message.
 */
function testUploadImage() {
  // 1×1 transparent PNG (smallest valid image)
  var testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  var result = handleUploadImage({
    filename:   'nexpos-test.png',
    mimeType:   'image/png',
    base64Data: testBase64,
  });
  Logger.log('testUploadImage result: ' + result.getContent());
}
