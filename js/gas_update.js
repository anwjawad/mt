/**
 * AJ+ Backend (Code.gs)
 * Handles JSONP requests for financial data.
 * Features: Transactions, Bills, Shopping, Goals, Subscriptions, Challenges.
 */

const SHEET_ID = ''; // User fills this if standalone

function getSpreadsheet() {
    if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
    return SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
    const params = e.parameter;
    const callback = params.callback;
    const action = params.action;

    let result = {};

    try {
        const ss = getSpreadsheet();

        switch (action) {
            // --- TRANSACTIONS ---
            case 'getTransactions':
                result = { ok: true, data: getData(ss, 'Transactions') };
                break;
            case 'addTransaction':
                const tx = {
                    id: Utilities.getUuid(),
                    date: new Date().toISOString(),
                    type: params.type,
                    amount: Number(params.amount),
                    category: params.category,
                    note: params.note,
                    source: params.source,
                    timestamp: new Date().toISOString()
                };
                appendRow(ss, 'Transactions', tx);
                result = { ok: true, item: tx };
                break;

            // --- BILLS ---
            case 'getBills':
                result = { ok: true, data: getData(ss, 'Bills') };
                break;
            case 'addBill':
                const bill = {
                    id: Utilities.getUuid(),
                    name: params.name,
                    amount: Number(params.amount),
                    dueDate: params.dueDate,
                    isPaid: false
                };
                appendRow(ss, 'Bills', bill);
                result = { ok: true, item: bill };
                break;
            case 'payBill':
                updateCell(ss, 'Bills', 'id', params.id, 'isPaid', true);
                result = { ok: true };
                break;

            // --- SHOPPING ---
            case 'getShoppingList':
                result = { ok: true, data: getData(ss, 'Shopping') };
                break;
            case 'addShoppingItem':
                const item = {
                    id: Utilities.getUuid(),
                    name: params.name,
                    status: 'pending',
                    date: new Date().toISOString()
                };
                appendRow(ss, 'Shopping', item);
                result = { ok: true, item: item };
                break;
            case 'buyShoppingItem':
                updateCell(ss, 'Shopping', 'id', params.id, 'status', 'purchased');
                result = { ok: true };
                break;

            // --- GOALS ---
            case 'getGoals':
                result = { ok: true, data: getData(ss, 'Goals') };
                break;
            case 'addGoal':
                const goal = {
                    id: Utilities.getUuid(),
                    name: params.name,
                    target: Number(params.target),
                    saved: 0
                };
                appendRow(ss, 'Goals', goal);
                result = { ok: true, item: goal };
                break;
            case 'depositGoal':
                const goalRow = findRow(ss, 'Goals', 'id', params.id);
                if (goalRow) {
                    const newSaved = Number(goalRow.saved || 0) + Number(params.amount);
                    updateCell(ss, 'Goals', 'id', params.id, 'saved', newSaved);
                    result = { ok: true, newSaved: newSaved };
                } else {
                    result = { ok: false, error: 'Goal Not Found' };
                }
                break;

            // --- PREMIUM FEATURES (NEW) ---
            case 'getPremiumData':
                result = getPremiumData(ss);
                break;
            case 'syncPremiumData':
                result = syncPremiumData(ss, params);
                break;

            default:
                result = { ok: false, error: 'Unknown Action: ' + action };
        }
    } catch (err) {
        result = { ok: false, error: err.toString() };
    }

    return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// --- Helpers ---

function getData(ss, sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const rows = sheet.getDataRange().getValues();
    if (rows.length < 2) return [];
    const headers = rows.shift();
    return rows.map(r => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = r[i]);
        return obj;
    });
}

function appendRow(ss, sheetName, obj) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(Object.keys(obj));
    }

    // Headers
    if (sheet.getLastRow() === 0) sheet.appendRow(Object.keys(obj));

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(h => obj[h] === undefined ? '' : obj[h]);
    sheet.appendRow(row);
}

function updateCell(ss, sheetName, idColName, idVal, targetColName, newVal) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf(idColName);
    const targetIdx = headers.indexOf(targetColName);

    if (idIdx === -1 || targetIdx === -1) return;

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]) === String(idVal)) {
            sheet.getRange(i + 1, targetIdx + 1).setValue(newVal);
            return;
        }
    }
}

function findRow(ss, sheetName, idColName, idVal) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return null;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIdx = headers.indexOf(idColName);

    if (idIdx === -1) return null;

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIdx]) === String(idVal)) {
            let obj = {};
            headers.forEach((h, idx) => obj[h] = data[i][idx]);
            return obj;
        }
    }
}

// --- NEW FEATURES LOGIC ---

function getPremiumData(ss) {
    // Subscriptions (Cell A1)
    let subData = [];
    try {
        let subSheet = ss.getSheetByName("Subscriptions");
        if (!subSheet) {
            subSheet = ss.insertSheet("Subscriptions");
            subSheet.getRange("A1").setValue("[]");
        }
        const val = subSheet.getRange("A1").getValue();
        subData = val ? JSON.parse(val) : [];
    } catch (e) { subData = []; }

    // Challenges (Cell A1)
    let chalData = [];
    try {
        let chalSheet = ss.getSheetByName("Challenges");
        if (!chalSheet) {
            chalSheet = ss.insertSheet("Challenges");
            chalSheet.getRange("A1").setValue("[]");
        }
        const val = chalSheet.getRange("A1").getValue();
        chalData = val ? JSON.parse(val) : [];
    } catch (e) { chalData = []; }

    return { ok: true, subscriptions: subData, challenges: chalData };
}

function syncPremiumData(ss, params) {
    const subs = params.subscriptions;
    const chals = params.challenges;

    // Save Subscriptions
    let subSheet = ss.getSheetByName("Subscriptions");
    if (!subSheet) subSheet = ss.insertSheet("Subscriptions");
    subSheet.getRange("A1").setValue(subs);

    // Save Challenges
    let chalSheet = ss.getSheetByName("Challenges");
    if (!chalSheet) chalSheet = ss.insertSheet("Challenges");
    chalSheet.getRange("A1").setValue(chals);

    return { ok: true };
}
