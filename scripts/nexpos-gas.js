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
 *   - transactions
 *   - transaction_items
 *   - customers
 *   - products
 *   - inventory_logs
 *   - ingredients
 *   - ingredient_logs
 *   - ingredient_usage  ← analytics: one row per ingredient per sale
 */

// ── YOUR SPREADSHEET ID ────────────────────────────────────────────────────────
var SHEET_ID = '1KtU_95_No0LG5u5mLYEdUH7uoJ5PpAufKMBAU-Z_Ias';

// ── ENTRY POINT (POST) ─────────────────────────────────────────────────────────
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action || 'saveTransaction';
    var ss      = SpreadsheetApp.openById(SHEET_ID);

    switch (action) {
      case 'saveTransaction':    handleTransaction(ss, payload);       break;
      case 'saveCustomer':       handleCustomer(ss, payload);          break;
      case 'saveProduct':        handleProduct(ss, payload);           break;
      case 'updateProduct':      handleUpdateProduct(ss, payload);     break;
      case 'logInventory':       handleInventoryLog(ss, payload);      break;
      case 'clearStoreData':     handleClearStoreData(ss);             break;
      case 'uploadImage':        return handleUploadImage(payload);
      // ── Ingredient actions ──────────────────────────────────────────────
      case 'saveIngredient':     handleSaveIngredient(ss, payload);    break;
      case 'updateIngredient':   handleUpdateIngredient(ss, payload);  break;
      case 'logIngredientUsage': handleIngredientLog(ss, payload);     break;
      case 'saveIngredientUsage': handleSaveIngredientUsage(ss, payload); break;
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

// ── ENTRY POINT (GET) ──────────────────────────────────────────────────────────
function doGet(e) {
  var action = e.parameter.action;
  var ss     = SpreadsheetApp.openById(SHEET_ID);

  if (action === 'getProducts') {
    var sheet = ss.getSheetByName('products');
    if (!sheet || sheet.getLastRow() < 2)
      return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
    var data    = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows    = data.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getIngredients') {
    var sheet = ss.getSheetByName('ingredients');
    if (!sheet || sheet.getLastRow() < 2)
      return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
    var data    = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows    = data.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getIngredientUsage') {
    var sheet = ss.getSheetByName('ingredient_usage');
    if (!sheet || sheet.getLastRow() < 2)
      return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
    var data    = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows    = data.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'getTransactions') {
    var txSheet    = ss.getSheetByName('transactions');
    var itemsSheet = ss.getSheetByName('transaction_items');
    if (!txSheet || txSheet.getLastRow() < 2)
      return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);

    var txData     = txSheet.getDataRange().getValues();
    var txHeaders  = txData[0];
    var txRows     = txData.slice(1).map(function(row) {
      var obj = {};
      txHeaders.forEach(function(h, i) { obj[h] = row[i]; });
      return obj;
    });

    // Build items map: transaction_id → [items]
    var itemsMap = {};
    if (itemsSheet && itemsSheet.getLastRow() >= 2) {
      var itemsData    = itemsSheet.getDataRange().getValues();
      var itemsHeaders = itemsData[0];
      itemsData.slice(1).forEach(function(row) {
        var item = {};
        itemsHeaders.forEach(function(h, i) { item[h] = row[i]; });
        var txId = String(item.transaction_id);
        if (!itemsMap[txId]) itemsMap[txId] = [];
        itemsMap[txId].push({
          product_id:   String(item.product_id   || ''),
          product_name: String(item.product_name || ''),
          quantity:     Number(item.quantity)    || 0,
          unit_price:   Number(item.unit_price)  || 0,
          subtotal:     Number(item.subtotal)    || 0
        });
      });
    }

    var result = txRows.map(function(tx) {
      var txId = String(tx.transaction_id);
      return {
        id:             txId,
        orderNumber:    txId,
        subtotal:       Number(tx.subtotal)        || 0,
        discount:       Number(tx.discount_amount) || 0,
        discount_amount:Number(tx.discount_amount) || 0,
        tax:            Number(tx.tax_amount)      || 0,
        tax_amount:     Number(tx.tax_amount)      || 0,
        total:          Number(tx.total)           || 0,
        payment_method: String(tx.payment_method  || 'cash'),
        paymentMethod:  String(tx.payment_method  || 'cash'),
        status:         'completed',
        cashier:        String(tx.cashier || ''),
        cashierName:    String(tx.cashier || ''),
        date:           String(tx.date    || ''),
        createdAt:      String(tx.date    || ''),
        updatedAt:      String(tx.date    || ''),
        items:          itemsMap[txId] || []
      };
    });

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
}

// ── SHEET HELPERS ──────────────────────────────────────────────────────────────

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
  var now = new Date().toISOString();

  var txSheet = getOrCreateSheet(ss, 'transactions', [
    'transaction_id', 'date', 'timestamp',
    'subtotal', 'discount_pct', 'discount_amount',
    'tax_amount', 'total', 'payment_method', 'items_count', 'cashier'
  ]);
  appendRowObj(txSheet, {
    transaction_id:  p.transaction_id,
    date:            p.date,
    timestamp:       now,
    subtotal:        p.subtotal,
    discount_pct:    p.discount_pct,
    discount_amount: p.discount_amount,
    tax_amount:      p.tax_amount,
    total:           p.total,
    payment_method:  p.payment_method,
    items_count:     p.items_count,
    cashier:         p.cashier
  });

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
    email:           p.email           || '',
    phone:           p.phone           || '',
    notes:           p.notes           || '',
    total_purchases: p.total_purchases || 0,
    created_at:      p.created_at
  });
}

// ── PRODUCT HANDLERS ───────────────────────────────────────────────────────────

var PRODUCT_HEADERS = [
  'id', 'name', 'sku', 'category', 'price', 'cost', 'stock',
  'min_stock', 'description', 'emoji', 'barcode', 'unit',
  'tax_rate', 'is_active', 'image_url', 'recipe', 'created_at', 'updated_at'
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
    recipe:      p.recipe      || '',
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

  function buildRow(headers) {
    return headers.map(function(h) {
      var v = obj[String(h)];
      return (v !== undefined && v !== null) ? v : '';
    });
  }

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === p.id) {
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([buildRow(headers)]);
      return;
    }
  }
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

// ── INGREDIENT HANDLERS ────────────────────────────────────────────────────────

var INGREDIENT_HEADERS = [
  'id', 'name', 'unit', 'stock', 'min_stock', 'cost_per_unit', 'created_at', 'updated_at'
];

function ingredientObj(p) {
  return {
    id:           p.id,
    name:         p.name,
    unit:         p.unit          || '',
    stock:        p.stock,
    min_stock:    p.min_stock     || 0,
    cost_per_unit: p.cost_per_unit || 0,
    created_at:   p.created_at,
    updated_at:   p.updated_at
  };
}

function handleSaveIngredient(ss, p) {
  var sheet = getOrCreateSheet(ss, 'ingredients', INGREDIENT_HEADERS);
  appendRowObj(sheet, ingredientObj(p));
}

function handleUpdateIngredient(ss, p) {
  var sheet   = getOrCreateSheet(ss, 'ingredients', INGREDIENT_HEADERS);
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var obj     = ingredientObj(p);

  function buildRow(headers) {
    return headers.map(function(h) {
      var v = obj[String(h)];
      return (v !== undefined && v !== null) ? v : '';
    });
  }

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === p.id) {
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([buildRow(headers)]);
      return;
    }
  }
  appendRowObj(sheet, obj);
}

function handleIngredientLog(ss, p) {
  var sheet = getOrCreateSheet(ss, 'ingredient_logs', [
    'id', 'timestamp', 'ingredient_id', 'ingredient_name',
    'change_type', 'quantity_before', 'quantity_after', 'quantity_change', 'note'
  ]);
  appendRowObj(sheet, {
    id:               p.id,
    timestamp:        p.timestamp || new Date().toISOString(),
    ingredient_id:    p.ingredient_id,
    ingredient_name:  p.ingredient_name,
    change_type:      p.change_type,
    quantity_before:  p.quantity_before,
    quantity_after:   p.quantity_after,
    quantity_change:  p.quantity_change,
    note:             p.note || ''
  });
}

// One row per ingredient per sold item — feeds the Reports "Ingredient Usage" charts
function handleSaveIngredientUsage(ss, p) {
  var sheet = getOrCreateSheet(ss, 'ingredient_usage', [
    'id', 'timestamp', 'transaction_id',
    'product_id', 'product_name',
    'ingredient_id', 'ingredient_name',
    'quantity_used', 'unit'
  ]);
  appendRowObj(sheet, {
    id:              p.id,
    timestamp:       p.timestamp || new Date().toISOString(),
    transaction_id:  p.transaction_id || '',
    product_id:      p.product_id     || '',
    product_name:    p.product_name   || '',
    ingredient_id:   p.ingredient_id,
    ingredient_name: p.ingredient_name,
    quantity_used:   p.quantity_used,
    unit:            p.unit           || ''
  });
}

// ── STORE RESET HANDLER ────────────────────────────────────────────────────────

function handleClearStoreData(ss) {
  var sheetNames = [
    'products', 'transactions', 'transaction_items',
    'inventory_logs', 'customers', 'ingredients', 'ingredient_logs', 'ingredient_usage'
  ];
  for (var i = 0; i < sheetNames.length; i++) {
    var sheet = ss.getSheetByName(sheetNames[i]);
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
  }
}

// ── IMAGE UPLOAD HANDLER ───────────────────────────────────────────────────────

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
    var url = 'https://drive.google.com/file/d/' + fileId + '/view';

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

// ── MANUAL TESTS ──────────────────────────────────────────────────────────────

function testWrite() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = getOrCreateSheet(ss, 'test', ['status', 'timestamp']);
  appendRowObj(sheet, { status: 'ok', timestamp: new Date().toISOString() });
  Logger.log('testWrite: row appended to test sheet');
}

function testUploadImage() {
  var testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  var result = handleUploadImage({
    filename:   'nexpos-test.png',
    mimeType:   'image/png',
    base64Data: testBase64,
  });
  Logger.log('testUploadImage result: ' + result.getContent());
}
