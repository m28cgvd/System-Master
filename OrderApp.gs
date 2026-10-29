var OA_LOGO_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALoAAAC8CAYAAADPV7TsAAAP60lEQVR42u2dfWwU95nHnx9LzIuzE9i17pAT03pXxCfhdoWWGQ7RQMVu24g/QuJe2kvdSChtnTMvcYpoeVEd94qETUVJTWI2dtqUilJdVcmNcyerar2WoLEIs7Ys90AK57NpQVic5BfYjQletMz9wYyztnft3+zOrGeG7+cf2GF3Wf/242ee3+tDBMAjADPyzWqCtP7ZZ9jlwZtuGhqOK2heoBe/T2DrnkzQH/+iVLb10RVLiF4TpGXPPsPuXRlaQjdGUhAbmCL+0HD8tbY+eqvgore/zhTIDRZJ+pwivS7Ra4K0z+MVTo2PIS0Bi8c2ibHqiMIMF70mSOv9PuEy8m5+9jc1MiKik4cOy0QkokWMxeMV2PgYf0rDOCQ/RUR70bT6aO7sZUUlG4iIqFZyQfZFju5L5vvH4y8KCiTPjb//9c/Tf4/IKSkgVjK0ivGclxVF9TQ30Y+/KChIVXLn/V+1zXgc+no1GsUkhobjC8qeUfTWV9yQPE+Gr15TkqP9048/98WvoFFMlr31FbfCLXr760zpG0hAcgOYnLg+/XctXwfm0TeQUGqCtG9B0dtfZ8of/6JAcmDrcYCaID2XVfSaIK2H5MYirKmc8djjFdAhLVAXqSZIyzKK7vcJl9E+xuH3Cczl9qMhFq/9780RvSZI+9D5NLxz1DX7GmaUC9s5TU9hlqi31FNoGmM5dq49nP44lRhCoxQYj1fomBa9Jkj7EGmMT1tWr9s541r8FjLDQjM+Fp8ehVlSVupCNDf+tinPvnakuoo7mATEShaRU6y5sxed1/yDzikioiVYams8zZ29UiZ5eV9/Y/jh+HtRyQaKyCmmLRADueXq0zk6MI4toc0s0+TQQOwyd0AZH4vPmFVdt/2HaNg8qAnSKYhuMNurXp5zbSTWqvt90heF6b0jgJmUlbr2QXRje/msVHx1zvWje3bLet/r5KHDSCkN4sZISoHoxvby5Sy/AJLe96pvOT0jgifik2jgPIDoJndCk6P9OU0UlZTPfKvhq9cQ4SH64hMQKzN2Qmfn2rm8V3rHFED0RSXbqIq6Z1QXz+3anfcvC4DoZqUtGUdF/D59+Xkw4J7ToT156HAXWhiiW4JsGyv0LpbbUXM80+UQWhiiWyI/z3Rdb27t980dnvxbTzMaGKJbJj/PmIffn4rrep9/2ffjOdc+/K/fo4EhurVJ3r2t6/mf31I351pP9CKGFSG6tSlevTav9GdisAONCNEtlaNLejqoWdIfRG6IbvkcXdHbUZ1Nw7tnWD53BADRC5OPZxlh+ebrP+F6/bKVQl53BADRC0Ldjo0Zo7q6pS660Os/vX0r2z/F0LoQ3RZE5FR4Idk72w5me63k9+E8GIhuIWolV9ZcvbmzNzzfa/sGEso7ewJ0a+DsnDSo9mfvo3HzhNUE6QGaASCiAwDRAYDoAEB0AArJ0kf5h/f7BLamfD31RC/KBr/1vIW51IpqXQffPBle/riHlq0UqGjlKsN/vtmLyrSx+mTyHt2fmtJOGohuCW0O37p2xdHVvh+ZUZctoc1se9XLVFIuFWTGcSTWqh1zMVv6WEROSVZtp4nBDjpSXSUHxErJSetvHC36ltBm1hO9qKSXQiw0tZKri9QdQpu2imzXiY9s0361kktR7z62F96ROfqmrSI7dq6dfbvxQ4rIKbaYa0bUWdEYEdGXX3jJVu0YkVOs4Ww3EccSBuToBcTjFdiuHxy24lmFIhFRacVW27WpetBpeGKwg3738zdsu5zYSRE91nC225IHch471840aezK6nU76XtN7UQ2XWTmGNEjckqyukh2P4jI5faT2pGOQvQC890jP2YROWXp1X1aEYD0uqM2Dyphu0V224sefL7eDh8zqgovk0Ow8hCp00R/2+qRXCMgVmpLdEUnbXhW298WaYwtx9EDYiX7t5YBy3/O5Gg/1e3YOD2OnkGSnNGq3KUWODvG7H5LcrSf/v3l7ZYvLWk70T1egR35xftU/OQ2Q76kkasX6Pj392spRZyIBPVPUv+uIe5vamSPLVtGRUXLacWqNZ/JlDZ9n7x7mz69fYuO7tm94GSLxyuwMt9aWr5iBS19bCl9Ek/QJ2PXaeKO8TVJtf/rccFNPdGLXerPJh471z6ngp5e1FlgiG4k9S2nM1aV0Cu2xytIKDv5GdoSiVzbNn0GGKIvUsqSHO2n3zbV0qULMYi9AJu2imznq4dJb5S3egpjq87os996Rfdr/nbpLNXt2KhAcj4uXYgpR6qrFL2HmxaVbMha2gYRXQd+n8AO/MeE3ttpptWDgB9dKy0nb56nAy9sR0TPB71rpWsl11uQPG9EtR25KH5ym2XLRNpG9BN/6GY6JFeIaC88NYS96p2Ri9DXqwmi54jHKzDe4UQUtjInsvNOdH3ui1+B6Lmip5OjTtAAgzlSXcXVrkUlGyyZvthC9INvnuTqEKlRB/V+zCHEe7fMVgEEoi8A74YFJy2asiIjVy9wpzoQPQd412v4Ksol6GgeaUsl5kXbaALRdcB7kmxytB9lxM0fFOAKJFYsYGB50YeG+TqiqK5ckEEBrkBixZ1ejtlKl0spcqAf3g6px2utM90tL/r+pkau22W2glnAWHi3A65bX4GIrodi9xNcz7sxfB0WFoB5StDM4NKFmAzR9XzAopWG5o8gz4ieuMP71DhE10Gmam0AfaFHsjOK9S0FhTdSCxBdBzzHKd+fikO/wmHLWywKAQCzIjpEBwCiA6cgQnSAHB2iAwDRAVISiA4ARAeFJgbRAYDoAEB0ACA6ANlYiiZYHPw+gaXthxWzdODS15VknKjxVZRLFt0UHofojzC+inL23Td+pp0/Pnv7X07bAVOJIbY39DRODkbqYh1+cPZ/Kd9SKrPR6n9a9SRbiP6IUd9y2lQR7Vq+HKI7jBKTDxJrePcMIjpEX3zMPtjHXWKpE7KwlQ4AiA4ARAfzceCF7SiCANGdTXK0nzxeIWyhj4QDjICxTAx20HsNu3Ba2TxgZtRiqLU65bSoKKT9STRzuYB23YozogJEBwshGvQcgNQFQHQAIDoAhqVfEB3Ym/1NjSjtAgBEB46AtyQPRAcAogOrs2LVGogOAEQHAKIDANGBheApsgbRAYDoAEB0ACA6gOgAQHQAIDoAEB0AiA4cTPLubYgOAEQHjmDqbhyiG81jywSYZTEeJO9CdKNxQfSCwbvpOZm8B9ENF93th4EFoqSsgut596emIDqwL7zLb08eOqxAdBPweAXU7ykAy4WneJ8ahegmUOZbCwstlCYGxMowRNcB78TDQOyyDA2tc9e0WilIy4t+pLqKS+D6ltMSVMRd0/Gpyz/+UxgmmsxA7DJXjaTJm+cheg63S65I7XL7aUtoMzqkJnLsXDtXNLkz8jFE18v4WFxJjvZzPbcnehE1fEzMz1ev28n13KN7dssQPQdGr/G1W3NnL8Mwo2kBR9bxSyFB9BzgjRBFJRtoz0+aYKUJ0by5s5dL3rH//rUlq+PZpTMqphJDXE8sFV8lsthkhQOiuVJUsoHruT/6ziuWLOprm1GX//uYv/2aO3vDSGEMIxaRU3wLuR72pUIQvQDpi5bCHDh1BssC8mTTVpFF5BR3vv33v/7Zsj+LncbRxZFYK/eTV6/bSQ1nu2nTVhGy50b0W4ciul7Q09kO0Y2g5Y1DxDvUqEX2XSc+Qs6us+NZ33KaReRUmDcvJyIaibXSpQsxBaIb1Cmq27FRd2cnIqfCzZ29jIgoIFYiwmcgIFay/U2NrOFst9ah18WffvcrS/98diyRHhqJter+MopKNpDWqZq8eZ7dGfmYju7ZrRBRzFdRLg1fvaZki3CrnyB63LuWHhfc1BO9KBNRnD6rda/V04ylXc+rxuaW0Gb2STxBRESJ+CTdT1ynyaliXcN2Hq/AVpV4yS0UZ/rc4v6mRlZSVkHFq9eSnsidicHun1o6mhMRsZogPbDj7bXhbHfeX5BZpBJDtDf0tOz3CdLQ8Gdyvh39H+a03VATgx10pLrK8jPStlzUNT4WV95r2GXZz+dy+ykip6Tvv9urRfqHvwBTcUdJnhztp1/W77LFZ7Xt6sWB2GWlVnJZeg26y+0n3hlFO/LbplpKv2NBdPMQrS67ml45btTnzIF/tnxe7iTRNdm7LP4ZQ06S/DeHv2QryZ0iOhFR6BffW6VrjL2QNLx75uFoz8R1Wzfy5M3zdOJfV9tyObRjdhj1DSSUuh0bFT2zp4Vi2cqHI5F2GJ3IxkislQ68sF2xS04+G1sOL3IQbe7sDVtl+FFNrUJEFI3IKVvt+VOHD2XKc24AEd2kVKZux0alVnLJvMt7zSI52k8erxAmIvJ4hbBV06tMEbxWcnWpdyHR7kI4NaJP4/EKbHwsLte3nJZKyqWCTjKNxFq12ddptn7ty+ylo9YbhJm8eZ7U2eI5E11OwPGiZyFGRHTwzZPSE//weRLWVHIdzJNKDE1P+tyfik+fOfPp7VsPZUnc0Y5im3dZgfYZ9jc1SsXuJ2jFqjVUtHJVxjNstPdOJu9Nn2dowHFvMSKKB8TKsNXOX4HoAOTB0hyjAQCLjWi26CLv1ioAzKBWculOt3BsNHgkgOgAomcB29LAYhMzXXS/T8BpnmBRCYiVkumiDw3HlYnBDrQ2WBRSiaGczl7PKUfnPbMcAKPZG3o6pwmunET3eAXJLms2gHNQ1w2xgomuHjuBqA4KSt2OjV25HmCaz/Ci5bexAeegupbzTq18x9HF3xz+Er4FYGrnU5U8r6XCeU8Y9UQvKu/sCRBGYoDR+Xit5FLe+MZGIgPWwxu9ejFa33I6XOh136DwUVZbrmzk95y2Jr6LDN5QbuoyXb9PYCVPVdClC7Eu4juqLX3GK05EwpbQZumTeIIS8Uli98do4g5pR7PF9BxpDPJjYrCDOlobs+7+T/uuZx/Zt1BEjvoqysMLrN23tuhmc+IP3az4yW2wsHCdQVtuqSsrdTFbL+rirSoNHm18Tz2w9+rFE6/tIkxcFSSa23qDdHVEYUv8PvuWPxkfiyun9m6nWsmlWLFasRMY7P6prT+/5jerCdJzRPS+U76Y9PPMl69YoXWOgE4CYqV0Y/i6JUsp6uT5tj76gBERHX9RUJx2vAEAZaUuVv+fD7d9LiEiGhqOV6JZgNO4MZKa9noJEVFbH13ZJjFseAaOIRhws7Y+uqI9niH3oa8KigNyMgCorW/miOKMB+Nj8Z1oIuAAnp99YU66cq6WKedlBVEd2JW32/rotQVFJ8IoDLAnzz7DWNXPlYxOZ5wZPfj7OAsG3OicAltF8mySZxWdiOjV9xKMiOrQfsAOOXmmdGXB1CUdp82cAkdK/sFCT1pwUZf6JivsvCYGOA/Vxy/wSM4V0WdHd49X6MBYO1gs1Aomr7X10Vt6XpdTlK4J0qmyUte+GyMpCA8KQlmpi633P6D5Opzz8f8fcttN3h47gwAAAABJRU5ErkJggg==";
var OA_BRAND_PRIMARY = "#6B3F1C";
var OA_BRAND_ACCENT = "#F8AF03";
var OA_BRAND_CREAM = "#F4C97E";
var OA_BRAND_GREEN = "#32AC5C";
var OA_APP_NAME = "Chai Govindam";

var OA_ITEM_MASTER_SHEET = "ItemMaster";

var OA_ORDERABLE_STATUS = "ACTIVE";

var OA_SHEET_ERROR_TOKENS = ["#REF", "#N/A", "#ERROR", "#VALUE", "#NAME", "#NUM", "#DIV/0", "#NULL"];

var OA_BLOCK_ORDER_IF_INACTIVE = true;

function oaNormText_(v) {
  if (v === null || v === undefined) return "";
  return v.toString().replace(/\s+/g, " ").trim();
}
function oaNormKey_(v) { return oaNormText_(v).toUpperCase(); }
function oaSquashKey_(v) { return oaNormKey_(v).replace(/[^A-Z0-9]/g, ""); }
function oaNormStatus_(v) { return oaNormKey_(v).replace(/[^A-Z ]/g, "").replace(/\s+/g, " ").trim(); }
function oaIsOrderableStatus_(v) { return oaNormStatus_(v) === OA_ORDERABLE_STATUS; }

function oaLooksLikeSheetError_(v) {
  var s = oaNormText_(v);
  if (!s) return false;
  var u = s.toUpperCase();
  if (u === "LOADING" || u === "LOADING...") return true;
  if (s.charAt(0) !== "#") return false;
  for (var i = 0; i < OA_SHEET_ERROR_TOKENS.length; i++) {
    if (u.indexOf(OA_SHEET_ERROR_TOKENS[i]) === 0) return true;
  }
  return false;
}

function oaHashString_(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return (h >>> 0).toString(36);
}

function oaResolveItemMasterHeaders_(headers) {
  var idx = { code: -1, name: -1, cat: -1, sub: -1, unit: -1, status: -1 };
  for (var i = 0; i < (headers || []).length; i++) {
    var h = (headers[i] === null || headers[i] === undefined ? "" : headers[i].toString())
              .toUpperCase().replace(/[^A-Z]/g, "");
    if (!h) continue;
    if (idx.status < 0 && h.indexOf("STATUS") >= 0) { idx.status = i; continue; }
    if (idx.sub    < 0 && (h.indexOf("SUBCATEGORY") >= 0 || h.indexOf("SUBCAT") >= 0)) { idx.sub = i; continue; }
    if (idx.code   < 0 && (h.indexOf("ITEMCODE") >= 0 || h.indexOf("SKU") >= 0 || h.indexOf("CODE") >= 0)) { idx.code = i; continue; }
    if (idx.name   < 0 && (h.indexOf("ITEMNAME") >= 0 || h.indexOf("NAME") >= 0)) { idx.name = i; continue; }
    if (idx.cat    < 0 && h.indexOf("CATEGORY") >= 0) { idx.cat = i; continue; }
    if (idx.unit   < 0 && (h.indexOf("UNIT") >= 0 || h.indexOf("UOM") >= 0)) { idx.unit = i; continue; }
  }
  return idx;
}

var oaItemMasterCache_ = null;
function oaResetItemMasterCache_() { oaItemMasterCache_ = null; }

function oaLoadItemMaster_(forceReload) {
  if (!forceReload && oaItemMasterCache_) return oaItemMasterCache_;

  var res = {
    ok: false, error: "", all: [], byName: {}, byCode: {}, bySquash: {},
    count: 0, blocked: 0, errorCells: 0, strayRows: 0, duplicates: 0,
    hasStatusCol: false, sig: "", rowsRead: 0
  };

  try {
    var sheet = oaSS_().getSheetByName(OA_ITEM_MASTER_SHEET);
    if (!sheet) {
      res.error = 'The "' + OA_ITEM_MASTER_SHEET + '" tab was not found in this workbook.';
      oaItemMasterCache_ = res; return res;
    }

    var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 2) {
      res.error = 'The "' + OA_ITEM_MASTER_SHEET + '" tab has no data - check the IMPORTRANGE formula in cell A2.';
      oaItemMasterCache_ = res; return res;
    }

    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var idx = oaResolveItemMasterHeaders_(data[0]);

    var firstRow = 1;
    if (idx.name < 0 && idx.code < 0) {
      idx = { code: 0, name: 1, cat: 2, sub: 3, unit: 4, status: -1 };
      firstRow = 0;
    }
    if (idx.name < 0) {
      res.error = 'Could not find an "Item Name" column on the "' + OA_ITEM_MASTER_SHEET + '" tab.';
      oaItemMasterCache_ = res; return res;
    }
    res.hasStatusCol = idx.status >= 0;

    var sigParts = [], started = false, stoppedAt = data.length;

    for (var r = firstRow; r < data.length; r++) {
      var row = data[r];
      var rawName = idx.name >= 0 ? row[idx.name] : "";
      var rawCode = idx.code >= 0 ? row[idx.code] : "";

      if (oaLooksLikeSheetError_(rawName) || oaLooksLikeSheetError_(rawCode)) { res.errorCells++; continue; }

      var name = oaNormText_(rawName);
      if (!name) {
        if (started) { stoppedAt = r; break; }
        continue;
      }
      started = true;
      res.rowsRead++;

      if (idx.status >= 0 && !oaIsOrderableStatus_(row[idx.status])) { res.blocked++; continue; }

      var rec = {
        code:     oaNormText_(rawCode),
        name:     name,
        category: idx.cat    >= 0 ? oaNormText_(row[idx.cat])    : "",
        sub:      idx.sub    >= 0 ? oaNormText_(row[idx.sub])    : "",
        unit:     idx.unit   >= 0 ? oaNormText_(row[idx.unit])   : "",
        status:   idx.status >= 0 ? oaNormText_(row[idx.status]) : "Active"
      };

      var nk = oaNormKey_(rec.name);
      if (res.byName[nk]) { res.duplicates++; continue; }

      res.all.push(rec);
      res.byName[nk] = rec;
      res.bySquash[oaSquashKey_(rec.name)] = rec;
      if (rec.code) res.byCode[oaNormKey_(rec.code)] = rec;
      sigParts.push(rec.code ? oaNormKey_(rec.code) : nk);
    }

    for (var s = stoppedAt; s < data.length; s++) {
      if (oaNormText_(data[s][idx.name])) res.strayRows++;
    }

    res.count = res.all.length;
    res.sig = res.count + ":" + oaHashString_(sigParts.join("|"));

    if (!res.count) {
      res.error = res.errorCells
        ? 'The "' + OA_ITEM_MASTER_SHEET + '" tab is showing an IMPORTRANGE error - open the sheet and re-authorise the connection to the Item Master.'
        : 'No Active items were found on the "' + OA_ITEM_MASTER_SHEET + '" tab.';
      oaItemMasterCache_ = res; return res;
    }

    res.ok = true;
  } catch (e) {
    res.ok = false;
    res.error = "Could not read the item list: " + e.message;
  }

  oaItemMasterCache_ = res;
  return res;
}

function oaResolveMasterItem_(im, code, name) {
  if (!im || !im.ok) return null;
  var c = oaNormKey_(code);
  if (c && im.byCode[c]) return im.byCode[c];
  var n = oaNormKey_(name);
  if (n && im.byName[n]) return im.byName[n];
  var s = oaSquashKey_(name);
  if (s && im.bySquash[s]) return im.bySquash[s];
  return null;
}

function oaIsActiveItem_(im, code, name) { return !!oaResolveMasterItem_(im, code, name); }

function oaValidateOrderItems_(items) {
  var out = { ok: false, fatal: false, message: "", items: [], rejected: [],
              badMultiples: [], dropped: [] };
  var im = oaLoadItemMaster_();
  if (!im.ok) { out.fatal = true; out.message = im.error; return out; }

  var disp = oaDisplayCatalog_(im);
  var exp = oaExpandRuleLines_(items, im, disp);
  out.rejected = exp.rejected;
  out.badMultiples = exp.badMultiples;
  out.dropped = exp.dropped;

  exp.lines.forEach(function (l) {
    out.items.push({
      code: l.rec.code,
      name: l.rec.name,
      unit: l.rec.unit || "",
      qty: l.qty
    });
  });

  out.ok = (out.rejected.length === 0 && out.badMultiples.length === 0);
  return out;
}

function oaRejectedItemsMessage_(rejected) {
  var names = (rejected || []).map(function (r) {
    return (r.name || r.code) + (r.code && r.name ? " (" + r.code + ")" : "");
  });
  var shown = names.slice(0, 8).join(", ");
  if (names.length > 8) shown += " and " + (names.length - 8) + " more";
  return "Not saved - these items are no longer Active in the Item Master: " + shown +
         ". Remove them from the cart, then tap 🔄 Refresh to reload the current list.";
}

function oaFilterUsageToActive_(usage) {
  var im = oaLoadItemMaster_();
  var clean = {};
  if (!im.ok) return clean;
  Object.keys(usage || {}).forEach(function (k) {
    var u = usage[k];
    if (!u || !u.name) return;
    var m = oaResolveMasterItem_(im, u.code, u.name);
    if (!m) return;
    if (!u.code && m.code) u.code = m.code;
    if (!u.unit && m.unit) u.unit = m.unit;
    clean[k] = u;
  });
  return clean;
}

function oaGetCatalog_() {
  var im = oaLoadItemMaster_(true);
  var rules = oaLoadItemRules_(true);
  var disp = oaDisplayCatalog_(im);
  return {
    ok: im.ok,
    error: im.error,
    sig: oaCatalogSig_(im),
    count: im.count,
    hasStatusCol: im.hasStatusCol,
    rulesOk: rules.ok,
    rulesError: rules.error,

    items: disp.items.map(function (r) {
      return { code: r.code, name: r.name, category: r.category, sub: r.sub, unit: r.unit,
               isGroup: !!r.isGroup, groupId: r.groupId || "", members: r.members || null,
               codeLabel: r.codeLabel || r.code, multiple: r.multiple || 0 };
    })
  };
}

function oaGetCatalogSignature_() {
  var im = oaLoadItemMaster_(true);
  oaLoadItemRules_(true);
  return { ok: im.ok, sig: oaCatalogSig_(im), count: im.count, error: im.error };
}

var OA_CONFIG_SHEET = "AppConfig";

var OA_CONFIG_DEFAULTS = {
  SHOW_ORDER_BY_CLOSING_STOCK: false,
  SHOW_CLOSING_STOCK_TAB: false
};

var OA_CONFIG_NOTES = {
  SHOW_ORDER_BY_CLOSING_STOCK: "TRUE shows the closing-stock based ordering form inside New Order.",
  SHOW_CLOSING_STOCK_TAB: "TRUE shows the separate Closing Stock tab."
};

function oaEnsureAppConfigSheet_() {
  var ss = oaSS_();
  var sh = ss.getSheetByName(OA_CONFIG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(OA_CONFIG_SHEET);
    sh.appendRow(["Setting", "Value", "Notes"]);
    sh.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#F4C97E");
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 250);
    sh.setColumnWidth(2, 90);
    sh.setColumnWidth(3, 520);
  }

  var have = {};
  if (sh.getLastRow() > 1) {
    var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      have[oaNormKey_(vals[i][0]).replace(/[^A-Z0-9]/g, "_")] = true;
    }
  }
  var add = [];
  Object.keys(OA_CONFIG_DEFAULTS).forEach(function (k) {
    if (!have[k]) add.push([k, OA_CONFIG_DEFAULTS[k] ? "TRUE" : "FALSE", OA_CONFIG_NOTES[k] || ""]);
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 3).setValues(add);
  return sh;
}

function oaTruthy_(v) {
  if (v === true) return true;
  if (v === false || v === null || v === undefined) return false;
  var s = v.toString().trim().toUpperCase();
  return s === "TRUE" || s === "YES" || s === "Y" || s === "1" || s === "ON" || s === "SHOW";
}

function oaGetAppConfig_() {
  var out = {};
  Object.keys(OA_CONFIG_DEFAULTS).forEach(function (k) { out[k] = OA_CONFIG_DEFAULTS[k]; });
  try {
    var sh = oaEnsureAppConfigSheet_();
    if (!sh || sh.getLastRow() < 2) return out;
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < rows.length; i++) {
      var key = oaNormKey_(rows[i][0]).replace(/[^A-Z0-9]/g, "_");
      if (!key) continue;
      if (out.hasOwnProperty(key)) out[key] = oaTruthy_(rows[i][1]);
    }
  } catch (e) {  }
  return out;
}

var OA_RULES_SHEET   = "ItemRules";
var OA_RULES_HEADERS = ["Rule Type", "Group ID", "Display Name", "Item Code",
                     "Item Name (reference)", "Multiple Qty", "Active", "Notes"];
var OA_RULE_LINK     = "LINK";
var OA_RULE_MULTIPLE = "MULTIPLE";

var OA_RC_TYPE = 0, OA_RC_GROUP = 1, OA_RC_DISPLAY = 2, OA_RC_CODE = 3,
    OA_RC_NAME = 4, OA_RC_MULT = 5, OA_RC_ACTIVE = 6, OA_RC_NOTES = 7;

function oaEnsureItemRulesSheet_() {
  var ss = oaSS_();
  var sh = ss.getSheetByName(OA_RULES_SHEET);
  if (sh) return sh;

  sh = ss.insertSheet(OA_RULES_SHEET);
  sh.getRange(1, 1, 1, OA_RULES_HEADERS.length).setValues([OA_RULES_HEADERS])
    .setFontWeight("bold").setBackground(OA_BRAND_CREAM);
  sh.setFrozenRows(1);
  var widths = [110, 130, 300, 120, 260, 110, 80, 320];
  for (var i = 0; i < widths.length; i++) sh.setColumnWidth(i + 1, widths[i]);

  var maxRows = Math.max(sh.getMaxRows() - 1, 1);
  sh.getRange(2, OA_RC_TYPE + 1, maxRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList([OA_RULE_LINK, OA_RULE_MULTIPLE], true)
      .setAllowInvalid(false).build());
  sh.getRange(2, OA_RC_ACTIVE + 1, maxRows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(["TRUE", "FALSE"], true)
      .setAllowInvalid(false).build());
  sh.getRange(2, OA_RC_CODE + 1, maxRows, 1).setNumberFormat("@");
  sh.getRange(2, OA_RC_GROUP + 1, maxRows, 1).setNumberFormat("@");

  sh.getRange(2, 1, 3, OA_RULES_HEADERS.length).setValues([
    [OA_RULE_LINK, "TEABOX250", "CG Printed Tea Box With Silver Pouch 250 ML", "CODE-1", "", "", "FALSE",
     "EXAMPLE - one row per item, same Group ID. Put the real Item Codes in, then set Active to TRUE."],
    [OA_RULE_LINK, "TEABOX250", "", "CODE-2", "", "", "FALSE",
     "EXAMPLE - Display Name only has to be filled on the first row of the group."],
    [OA_RULE_MULTIPLE, "", "", "GFPPC0131", "", 100, "FALSE",
     "EXAMPLE - Pizza Box 7' X 7' X 1.5 can only be ordered as 100, 200, 300 ... Set Active to TRUE to switch it on."]
  ]);
  sh.getRange(2, 1, 3, OA_RULES_HEADERS.length).setFontColor("#9AA0A6");
  return sh;
}

function oaReadItemRulesRows_() {
  var sh = oaEnsureItemRulesSheet_();
  var last = sh.getLastRow();
  if (last < 2) return { sheet: sh, rows: [] };
  var width = Math.max(sh.getLastColumn(), OA_RULES_HEADERS.length);
  return { sheet: sh, rows: sh.getRange(2, 1, last - 1, width).getValues() };
}

var oaItemRulesCache_ = null;
function oaResetItemRulesCache_() { oaItemRulesCache_ = null; }

function oaLoadItemRules_(forceReload) {
  if (!forceReload && oaItemRulesCache_) return oaItemRulesCache_;

  var res = { ok: false, error: "", groups: [], groupById: {}, groupIdByCode: {},
              multipleByCode: {}, problems: [], rowsRead: 0, sig: "0" };
  try {
    var read = oaReadItemRulesRows_();
    var rows = read.rows;
    var order = [], byId = {}, sigParts = [];

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var lineNo = r + 2;
      var type = oaNormKey_(row[OA_RC_TYPE]).replace(/[^A-Z]/g, "");
      if (!type) continue;
      res.rowsRead++;

      var activeCell = row[OA_RC_ACTIVE];
      var isActive = (activeCell === "" || activeCell === null || activeCell === undefined)
                       ? true : oaTruthy_(activeCell);
      if (!isActive) continue;

      var code = oaNormKey_(row[OA_RC_CODE]);
      if (!code) { res.problems.push("Row " + lineNo + ": no Item Code."); continue; }

      if (type === OA_RULE_MULTIPLE) {
        var n = Number(row[OA_RC_MULT]);
        if (!isFinite(n) || n <= 0) {
          res.problems.push("Row " + lineNo + " (" + code + "): Multiple Qty must be a number bigger than 0.");
          continue;
        }
        n = oaRound2_(n);
        if (res.multipleByCode[code] && res.multipleByCode[code] !== n) {
          res.problems.push("Row " + lineNo + " (" + code + "): a different Multiple Qty is already set for this item - the larger one is used.");
          n = Math.max(n, res.multipleByCode[code]);
        }
        res.multipleByCode[code] = n;
        sigParts.push("M" + code + "=" + n);
        continue;
      }

      if (type === OA_RULE_LINK) {
        var gid = oaNormKey_(row[OA_RC_GROUP]).replace(/[^A-Z0-9]/g, "");
        if (!gid) { res.problems.push("Row " + lineNo + " (" + code + "): a LINK row needs a Group ID."); continue; }
        if (!byId[gid]) {
          byId[gid] = { id: gid, name: "", codes: [], multiple: 0, rows: [] };
          order.push(gid);
        }
        var g = byId[gid];
        var disp = oaNormText_(row[OA_RC_DISPLAY]);
        if (disp && !g.name) g.name = disp;
        if (g.codes.indexOf(code) === -1) g.codes.push(code);
        else res.problems.push("Row " + lineNo + " (" + code + "): listed twice in group " + gid + ".");
        g.rows.push(lineNo);
        continue;
      }

      res.problems.push('Row ' + lineNo + ': Rule Type "' + oaNormText_(row[OA_RC_TYPE]) +
                        '" is not understood - use ' + OA_RULE_LINK + " or " + OA_RULE_MULTIPLE + ".");
    }

    order.forEach(function (gid) {
      var g = byId[gid];
      if (g.codes.length < 2) {
        res.problems.push("Group " + gid + ": only one item in it - a combined product needs at least 2.");
        return;
      }
      if (!g.name) {
        res.problems.push("Group " + gid + ": no Display Name - fill it on the first row of the group.");
        return;
      }

      g.codes.forEach(function (c) {
        var m = res.multipleByCode[c] || 0;
        if (m > g.multiple) g.multiple = m;
      });

      var clash = false;
      g.codes.forEach(function (c) {
        if (res.groupIdByCode[c]) {
          res.problems.push("Item " + c + " is in group " + res.groupIdByCode[c] + " already - group " + gid + " is ignored for it.");
          clash = true;
        }
      });
      if (clash) return;
      g.codes.forEach(function (c) { res.groupIdByCode[c] = gid; });
      res.groups.push(g);
      res.groupById[gid] = g;
      sigParts.push("L" + gid + ":" + g.codes.join(",") + ":" + g.multiple + ":" + oaNormKey_(g.name));
    });

    res.ok = true;
    res.sig = sigParts.length ? (sigParts.length + ":" + oaHashString_(sigParts.join("|"))) : "0";
  } catch (e) {
    res.ok = false;
    res.error = "Could not read the " + OA_RULES_SHEET + " tab: " + e.message;
  }

  oaItemRulesCache_ = res;
  return res;
}

function oaCatalogSig_(im) {
  var rules = oaLoadItemRules_();
  return (im && im.sig ? im.sig : "0") + "|R" + rules.sig;
}

var OA_GROUP_CODE_PREFIX = "GRP-";
function oaGroupDisplayCode_(gid) { return OA_GROUP_CODE_PREFIX + gid; }
function oaIsGroupCode_(code) { return oaNormKey_(code).indexOf(OA_GROUP_CODE_PREFIX) === 0; }
function oaGroupIdFromCode_(code) { return oaNormKey_(code).substring(OA_GROUP_CODE_PREFIX.length); }

function oaIsMultipleOf_(qty, mult) {
  var q = Number(qty), m = Number(mult);
  if (!isFinite(q) || !isFinite(m) || m <= 0) return true;
  if (q === 0) return true;
  if (q < 0) return false;
  var k = q / m;
  return Math.abs(k - Math.round(k)) < 1e-9 && Math.round(k) >= 1;
}

function oaCeilToMultiple_(qty, mult) {
  var q = Number(qty), m = Number(mult);
  if (!isFinite(m) || m <= 0) return q;
  if (!isFinite(q) || q <= 0) return 0;
  return oaRound2_(Math.ceil((q / m) - 1e-9) * m);
}

function oaDisplayCatalog_(im) {
  var out = { items: [], groupById: {}, groupByCode: {}, multipleByCode: {},
              byCode: {}, byName: {}, bySquash: {}, groupsLive: 0, groupsSkipped: [] };
  if (!im || !im.ok) return out;

  var rules = oaLoadItemRules_();
  out.multipleByCode = rules.multipleByCode;

  var memberOf = {};
  var live = {};
  rules.groups.forEach(function (g) {
    var members = [];
    for (var i = 0; i < g.codes.length; i++) {
      var m = im.byCode[g.codes[i]];
      if (!m) { members = null; break; }
      members.push(m);
    }
    if (!members) { out.groupsSkipped.push(g.id); return; }
    live[g.id] = {
      id: g.id, name: g.name, multiple: g.multiple,
      code: oaGroupDisplayCode_(g.id),
      members: members.map(function (m) { return { code: m.code, name: m.name, unit: m.unit || "" }; }),
      unit: members[0].unit || "",
      category: members[0].category || "",
      sub: members[0].sub || ""
    };
    g.codes.forEach(function (c) { memberOf[c] = g.id; });
    out.groupsLive++;
  });

  var emitted = {};
  im.all.forEach(function (rec) {
    var gid = memberOf[oaNormKey_(rec.code)];
    if (gid && live[gid]) {
      if (emitted[gid]) return;
      emitted[gid] = true;
      var g = live[gid];
      out.items.push({
        code: g.code, name: g.name, category: g.category, sub: g.sub, unit: g.unit,
        isGroup: true, groupId: g.id, members: g.members,
        codeLabel: g.members.map(function (m) { return m.code; }).join(" + "),
        multiple: g.multiple || 0
      });
      return;
    }
    out.items.push({
      code: rec.code, name: rec.name, category: rec.category, sub: rec.sub, unit: rec.unit,
      isGroup: false, groupId: "", members: null, codeLabel: rec.code,
      multiple: rules.multipleByCode[oaNormKey_(rec.code)] || 0
    });
  });

  Object.keys(live).forEach(function (gid) {
    out.groupById[gid] = live[gid];
    live[gid].members.forEach(function (m) { out.groupByCode[oaNormKey_(m.code)] = live[gid]; });
  });
  out.items.forEach(function (it) {
    if (it.code) out.byCode[oaNormKey_(it.code)] = it;
    out.byName[oaNormKey_(it.name)] = it;
    out.bySquash[oaSquashKey_(it.name)] = it;
  });
  return out;
}

function oaResolveDisplayGroup_(disp, code, name) {
  if (!disp) return null;
  var c = oaNormKey_(code);
  if (c) {
    if (oaIsGroupCode_(c) && disp.groupById[oaGroupIdFromCode_(c)]) return disp.groupById[oaGroupIdFromCode_(c)];
    if (disp.groupByCode[c]) return disp.groupByCode[c];
  }
  var n = oaNormKey_(name);
  if (n) {
    var hit = disp.byName[n] || disp.bySquash[oaSquashKey_(name)];
    if (hit && hit.isGroup && disp.groupById[hit.groupId]) return disp.groupById[hit.groupId];
  }
  return null;
}

function oaMultipleForCode_(disp, code) {
  if (!disp) return 0;
  var c = oaNormKey_(code);
  var g = disp.groupByCode[c];
  if (g && g.multiple) return g.multiple;
  return disp.multipleByCode[c] || 0;
}

function oaRuleTagsForItem_(disp, code, name) {
  var tags = { groupId: "", groupName: "", groupCode: "", multiple: 0 };
  if (!disp) return tags;
  var g = oaResolveDisplayGroup_(disp, code, name);
  if (g) {
    tags.groupId = g.id; tags.groupName = g.name; tags.groupCode = g.code;
    tags.multiple = g.multiple || 0;
    return tags;
  }
  var c = oaNormKey_(code);
  if (!c && name) {
    var m = disp.byName[oaNormKey_(name)] || disp.bySquash[oaSquashKey_(name)];
    if (m && !m.isGroup) c = oaNormKey_(m.code);
  }
  tags.multiple = c ? (disp.multipleByCode[c] || 0) : 0;
  return tags;
}

function oaExpandRuleLines_(items, im, disp, opts) {
  opts = opts || {};
  var out = { lines: [], rejected: [], badMultiples: [], dropped: [] };
  var picked = {}, order = [];

  (items || []).forEach(function (it) {
    if (!it) return;
    var name = oaNormText_(it.name), code = oaNormText_(it.code);
    var qty = Number(it.qty);
    if (!name && !code) return;
    if (!isFinite(qty)) return;
    if (qty <= 0 && !opts.keepZero) return;

    var g = oaResolveDisplayGroup_(disp, code, name);
    if (g) {
      if (g.multiple > 0 && !oaIsMultipleOf_(qty, g.multiple)) {
        out.badMultiples.push({ name: g.name, qty: qty, multiple: g.multiple });
        return;
      }
      g.members.forEach(function (m) { add_(m, qty, g.name); });
      return;
    }

    var rec = oaResolveMasterItem_(im, code, name);
    if (!rec) { out.rejected.push({ code: code, name: name || code }); return; }
    var mult = oaMultipleForCode_(disp, rec.code);
    if (mult > 0 && !oaIsMultipleOf_(qty, mult)) {
      out.badMultiples.push({ name: rec.name, qty: qty, multiple: mult });
      return;
    }
    add_(rec, qty, "");
  });

  function add_(rec, qty, viaGroup) {
    var k = oaNormKey_(rec.code) || ("N:" + oaNormKey_(rec.name));
    if (!picked[k]) { picked[k] = { rec: rec, qty: qty, viaGroup: viaGroup }; order.push(k); return; }
    var cur = picked[k];
    out.dropped.push(rec.name);
    if (qty > cur.qty) { cur.qty = qty; cur.viaGroup = cur.viaGroup || viaGroup; }
  }

  order.forEach(function (k) { out.lines.push(picked[k]); });
  return out;
}

function oaNormaliseEditLines_(updatedItems, im, disp) {
  var out = { items: [], badMultiples: [], synced: [] };
  var lines = [], byGroup = {};

  (updatedItems || []).forEach(function (it) {
    if (!it) return;
    var name = oaNormText_(it.name), code = oaNormText_(it.code);
    if (!name && !code) return;
    var qty = Number(it.qty);
    if (!isFinite(qty) || qty < 0) qty = 0;

    var g = oaResolveDisplayGroup_(disp, code, name);
    if (g) {
      var single = !oaIsGroupCode_(code) && !!oaResolveMasterItem_(im, code, name) &&
                   !(disp.byName[oaNormKey_(name)] || {}).isGroup;
      var members = single ? [oaResolveMasterItem_(im, code, name)] : g.members;
      members.forEach(function (m) {
        var line = { code: m.code, name: m.name, unit: m.unit || "", qty: qty, groupId: g.id };
        lines.push(line);
        (byGroup[g.id] = byGroup[g.id] || { group: g, lines: [] }).lines.push(line);
      });
      return;
    }
    lines.push({ code: code, name: name, unit: oaNormText_(it.unit), qty: qty, groupId: "" });
  });

  Object.keys(byGroup).forEach(function (gid) {
    var g = byGroup[gid];
    var vals = g.lines.map(function (l) { return l.qty; });
    var hi = Math.max.apply(null, vals);
    var differ = vals.some(function (v) { return v !== hi; });
    if (differ) out.synced.push(g.group.name);
    g.lines.forEach(function (l) { l.qty = hi; });
  });

  var seen = {};
  lines.forEach(function (l) {
    var k = oaNormKey_(l.code) || ("N:" + oaSquashKey_(l.name));
    if (seen[k]) { if (l.qty > seen[k].qty) seen[k].qty = l.qty; return; }
    seen[k] = l;
    out.items.push(l);
  });
  out.items.forEach(function (l) {
    var mult = oaMultipleForCode_(disp, l.code) ||
               (l.groupId && disp.groupById[l.groupId] ? disp.groupById[l.groupId].multiple : 0);
    if (mult > 0 && !oaIsMultipleOf_(l.qty, mult)) {
      out.badMultiples.push({ name: l.name, qty: l.qty, multiple: mult });
    }
  });
  return out;
}

function oaBadMultiplesMessage_(bad) {
  var parts = (bad || []).slice(0, 6).map(function (b) {
    return b.name + " (" + oaFmtNum_(b.qty) + " typed, must be in " + oaFmtNum_(b.multiple) + "s)";
  });
  var extra = (bad || []).length > 6 ? " and " + (bad.length - 6) + " more" : "";
  return "Not saved - these items can only be ordered in fixed multiples: " +
         parts.join(", ") + extra + ". Fix the quantity and save again.";
}

function oaFmtNum_(n) {
  var v = Number(n);
  if (!isFinite(v)) return "0";
  return (Math.round(v * 100) / 100).toString();
}

function oaExpandRuleRows_(rows, disp, valueField) {
  var out = [];
  (rows || []).forEach(function (r) {
    if (!r) return;
    var g = oaResolveDisplayGroup_(disp, r.code, r.name);
    if (!g) { out.push(r); return; }
    g.members.forEach(function (m) {
      var copy = { code: m.code, name: m.name, unit: m.unit || r.unit || "" };
      copy[valueField] = r[valueField];
      out.push(copy);
    });
  });
  return out;
}

var OA_DISPATCH_OUTLET_ID  = "DISPATCH";
var OA_DISPATCH_QTY_COL    = "Dispatch Qty";
var OA_DISPATCHED_BY_COL   = "Dispatched By";
var OA_DISPATCH_TIME_COL   = "Dispatch Time";

function oaIsDispatchByOutlet_(outletId) {
  return oaNormKey_(outletId) === OA_DISPATCH_OUTLET_ID;
}

function oaSheetHeaders_(sheet) {
  var width = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, width).getValues()[0];
}

function oaEnsureSheetColumn_(sheet, headerName) {
  var headers = oaSheetHeaders_(sheet);
  for (var i = 0; i < headers.length; i++) {
    if (oaNormKey_(headers[i]) === oaNormKey_(headerName)) return i;
  }
  var at = headers.length + 1;
  var maxCols = sheet.getMaxColumns();
  if (at > maxCols) sheet.insertColumnsAfter(maxCols, at - maxCols);
  sheet.getRange(1, at).setValue(headerName).setFontWeight("bold");
  return at - 1;
}

function oaAppendRowSafe_(sheet, values) {
  var at = sheet.getLastRow() + 1;
  var maxRows = sheet.getMaxRows();
  if (at > maxRows) sheet.insertRowsAfter(maxRows, at - maxRows);
  var maxCols = sheet.getMaxColumns();
  if (values.length > maxCols) sheet.insertColumnsAfter(maxCols, values.length - maxCols);
  sheet.getRange(at, 1, 1, values.length).setValues([values]);
  return at;
}

function oaIsDispatchUser_(userId) {
  var vu = oaVu_(userId); if (vu) return !!vu.canDispatch;
  try {
    var want = oaNormKey_(userId);
    if (!want) return false;
    var sheet = oaSS_().getSheetByName("Users");
    if (!sheet || sheet.getLastRow() < 2) return false;
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf("User ID");
    var outletCol = headers.indexOf("Outlet id");
    var statusCol = headers.indexOf("Status");
    if (idCol < 0 || outletCol < 0) return false;
    for (var r = 1; r < data.length; r++) {
      if (oaNormKey_(data[r][idCol]) !== want) continue;
      if (statusCol >= 0 && data[r][statusCol] &&
          oaNormKey_(data[r][statusCol]) !== "ACTIVE") return false;
      return oaIsDispatchByOutlet_(data[r][outletCol]);
    }
    return false;
  } catch (e) { return false; }
}

function oaIsAdminUser_(userId) {
  var outletId = oaGetOutletIdForUser_(userId);
  return oaIsAdminByOutlet_(outletId);
}

function oaIsAdminByOutlet_(outletId) {
  return outletId && outletId.toString().trim().toUpperCase().indexOf("HQ") === 0;
}

function oaGetOutletIdForUser_(userId) {
  var vu = oaVu_(userId); if (vu) return vu.outletId;
  try {
    var sheet = oaSS_().getSheetByName("Users");
    if (!sheet) return "";
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var userIdCol = headers.indexOf("User ID");
    var outletIdCol = headers.indexOf("Outlet id");
    if (userIdCol < 0 || outletIdCol < 0) return "";
    for (var i = 1; i < data.length; i++) {
      if (data[i][userIdCol] && data[i][userIdCol].toString().trim() === userId.toString().trim()) {
        return data[i][outletIdCol] ? data[i][outletIdCol].toString().trim() : "";
      }
    }
    return "";
  } catch(e) { return ""; }
}

var OA_OUTLET_MAP = {
  "GFP": "GFP",
  "PN": "CG Pandri",
  "PP": "CG Pachpedi Naka",
  "GC": "CG Gol Chowk",
  "SN": "CG Shankar Nagar",
  "FF": "CG Fafadih",
  "CD": "CG Chanderi"
};

function oaResolveOutletFullName_(outletShortName) {
  if (!outletShortName) return "";
  var shortName = outletShortName.toString().trim().toUpperCase();

  if (OA_OUTLET_MAP[shortName]) {
    return OA_OUTLET_MAP[shortName];
  }

  return outletShortName;
}

function oaOutletDisplayName_(outletShortName) {
  var n = oaResolveOutletFullName_(outletShortName) || (outletShortName || "").toString().trim();
  if (!n) return "";
  if (/^CG\s/i.test(n) || /^GFP\b/i.test(n)) return n;
  return "CG " + n;
}

function oaFormatDateDDMMYYYY_(dateVal) {
  if (!dateVal) return "";
  var d;
  if (dateVal instanceof Date) {
    d = dateVal;
  } else {
    d = new Date(dateVal);
  }
  if (isNaN(d.getTime())) return dateVal.toString();
  var dd = ("0" + d.getDate()).slice(-2);
  var mm = ("0" + (d.getMonth() + 1)).slice(-2);
  var yyyy = d.getFullYear();
  var hh = ("0" + d.getHours()).slice(-2);
  var min = ("0" + d.getMinutes()).slice(-2);
  var ss = ("0" + d.getSeconds()).slice(-2);
  return dd + "-" + mm + "-" + yyyy + " " + hh + ":" + min + ":" + ss;
}

function oaParseDDMMYYYY_(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  var str = dateStr.toString().replace(/-/g, '/');
  if (str.charAt(0) === "'") str = str.substring(1);
  var parts = str.split(' ');
  var dateParts = parts[0].split('/');
  if (dateParts.length >= 3) {
    var dd = parseInt(dateParts[0], 10);
    var mm = parseInt(dateParts[1], 10) - 1;
    var yyyy = parseInt(dateParts[2], 10);
    var d = new Date(yyyy, mm, dd);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(dateStr);
}

function oaEnsureOrderMetaSheet_() {
  var ss = oaSS_();
  var sheet = ss.getSheetByName("OrderMeta");
  if (!sheet) {
    sheet = ss.insertSheet("OrderMeta");
    sheet.appendRow(["Order No", "User ID", "Revision"]);
  }
  return sheet;
}

function oaGetOrderMeta_(orderNo) {
  try {
    var sheet = oaSS_().getSheetByName("OrderMeta");
    if (!sheet || sheet.getLastRow() < 2) return { userId: "", revision: "0" };
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var orderNoCol = headers.indexOf("Order No");
    var userIdCol = headers.indexOf("User ID");
    var revisionCol = headers.indexOf("Revision");
    if (orderNoCol < 0) return { userId: "", revision: "0" };

    for (var i = 1; i < data.length; i++) {
      if (data[i][orderNoCol] && data[i][orderNoCol].toString() === orderNo) {
        return {
          userId: userIdCol >= 0 ? (data[i][userIdCol] ? data[i][userIdCol].toString() : "") : "",
          revision: revisionCol >= 0 ? (data[i][revisionCol] ? data[i][revisionCol].toString() : "0") : "0"
        };
      }
    }
    return { userId: "", revision: "0" };
  } catch(e) { return { userId: "", revision: "0" }; }
}

function oaSaveOrderMeta_(orderNo, userId, revision) {
  try {
    var sheet = oaEnsureOrderMetaSheet_();
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var orderNoCol = headers.indexOf("Order No");
    var userIdCol = headers.indexOf("User ID");
    var revisionCol = headers.indexOf("Revision");

    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][orderNoCol] && data[i][orderNoCol].toString() === orderNo) {
        if (userIdCol >= 0) sheet.getRange(i + 1, userIdCol + 1).setValue(userId);
        if (revisionCol >= 0) sheet.getRange(i + 1, revisionCol + 1).setValue(revision.toString());
        found = true;
        break;
      }
    }

    if (!found) {
      sheet.appendRow([orderNo, userId, revision.toString()]);
    }
    SpreadsheetApp.flush();
  } catch(e) {}
}

function oaUpdateOrderMetaRevision_(orderNo) {
  try {
    var meta = oaGetOrderMeta_(orderNo);
    var newRevision = (parseInt(meta.revision) || 0) + 1;
    oaSaveOrderMeta_(orderNo, meta.userId, newRevision);
    return newRevision;
  } catch(e) { return 1; }
}

function oaGetAllOrderMeta_() {
  var allMeta = {};
  try {
    var metaSheet = oaSS_().getSheetByName("OrderMeta");
    if (metaSheet && metaSheet.getLastRow() >= 2) {
      var metaData = metaSheet.getDataRange().getValues();
      var mHeaders = metaData[0];
      var mOrderCol = mHeaders.indexOf("Order No");
      var mUserCol = mHeaders.indexOf("User ID");
      var mRevCol = mHeaders.indexOf("Revision");
      for (var i = 1; i < metaData.length; i++) {
        var mOrderNo = metaData[i][mOrderCol] ? metaData[i][mOrderCol].toString() : "";
        if (mOrderNo) {
          allMeta[mOrderNo] = {
            userId: mUserCol >= 0 ? (metaData[i][mUserCol] ? metaData[i][mUserCol].toString() : "") : "",
            revision: mRevCol >= 0 ? (metaData[i][mRevCol] ? metaData[i][mRevCol].toString() : "0") : "0"
          };
        }
      }
    }
  } catch(e) {}
  return allMeta;
}

function oaBuildItemCodeMap_() {
  var map = {};
  var im = oaLoadItemMaster_();
  if (!im.ok) return map;
  im.all.forEach(function (r) {
    if (!r.code) return;
    map[r.name] = r.code;
    map[oaNormKey_(r.name)] = r.code;
  });
  return map;
}

function oaGetOrderHistory_(userId, isAdminFlag) {
  try {
    var adminVerified = oaIsAdminUser_(userId.toString().trim());

    var sheet = oaSS_().getSheetByName("Orders");
    if (!sheet || sheet.getLastRow() < 2) return [];

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var colIdx = {};
    headers.forEach(function(h, i) { colIdx[h] = i; });

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var yesterday = new Date(today.getTime() - 86400000);

    var itemCodeMap = oaBuildItemCodeMap_();
    var allMeta = oaGetAllOrderMeta_();

    var dispHist = oaDisplayCatalog_(oaLoadItemMaster_());
    var ordersMap = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var orderNo = row[colIdx["Order No"]] ? row[colIdx["Order No"]].toString() : "";
      if (!orderNo) continue;

      var timestamp = row[colIdx["Timestamp"]];
      var tsDate = timestamp ? oaParseDDMMYYYY_(timestamp) : null;
      var tsDay = (tsDate && !isNaN(tsDate))
        ? new Date(tsDate.getFullYear(), tsDate.getMonth(), tsDate.getDate())
        : null;

      if (tsDay && tsDay < yesterday) continue;
      if (!tsDay && !adminVerified) continue;

      var meta = allMeta[orderNo] || { userId: "", revision: "0" };
      var storedUserId = meta.userId;

      if (!adminVerified) {
        var orderedBy = row[colIdx["Ordered By"]] ? row[colIdx["Ordered By"]].toString() : "";
        var matchesId = (storedUserId !== "" && storedUserId === userId.toString().trim());
        var matchesOrderedBy = (orderedBy.indexOf(userId.toString().trim()) !== -1);
        if (!matchesId && !matchesOrderedBy) continue;
      }

      var status = colIdx["Status"] !== undefined
        ? (row[colIdx["Status"]] ? row[colIdx["Status"]].toString() : "Confirmed")
        : "Confirmed";

      var tsDisplay = timestamp
        ? oaFormatDateDDMMYYYY_(timestamp)
        : "";

      var outletColRaw = colIdx["Outlet Name"] !== undefined ? row[colIdx["Outlet Name"]] : row[colIdx["Outlet Short Name"]];
      var outletShort = outletColRaw ? outletColRaw.toString() : "";

      if (!ordersMap[orderNo]) {
        ordersMap[orderNo] = {
          orderNo: orderNo,
          outletShortName: outletShort,
          outletFullName: oaOutletDisplayName_(outletShort),
          customerName: row[colIdx["Customer Name"]] ? row[colIdx["Customer Name"]].toString() : "",
          orderedBy: row[colIdx["Ordered By"]] ? row[colIdx["Ordered By"]].toString() : "",
          timestamp: tsDisplay,
          status: status,
          revision: meta.revision,
          userId: storedUserId,
          items: []
        };
      }

      var itemName = row[colIdx["Item Name"]] ? row[colIdx["Item Name"]].toString() : "";
      var itemCodeCell = (colIdx["Item Code"] !== undefined && row[colIdx["Item Code"]])
        ? row[colIdx["Item Code"]].toString() : "";
      var itemCode = itemCodeCell || itemCodeMap[itemName] || "";
      var dqH = colIdx[OA_DISPATCH_QTY_COL] !== undefined ? row[colIdx[OA_DISPATCH_QTY_COL]] : "";
      var tags = oaRuleTagsForItem_(dispHist, itemCode, itemName);
      ordersMap[orderNo].items.push({
        code: itemCode,
        name: itemName,
        unit: row[colIdx["Unit"]] ? row[colIdx["Unit"]].toString() : "",
        qty: row[colIdx["Quantity"]] ? Number(row[colIdx["Quantity"]]) : 0,
        dispatchQty: (dqH === "" || dqH === null || dqH === undefined) ? "" : Number(dqH),

        groupId: tags.groupId,
        groupName: tags.groupName,
        multiple: tags.multiple
      });
    }

    var orders = Object.keys(ordersMap).map(function(k) { return ordersMap[k]; });
    orders.sort(function(a, b) {
      var da = a.timestamp ? new Date(a.timestamp) : new Date(0);
      var db = b.timestamp ? new Date(b.timestamp) : new Date(0);
      return db - da;
    });
    return orders;
  } catch(e) {
    Logger.log("getOrderHistory error: " + e.message);
    return [];
  }
}

function oaEnsureDispatchColumns_() {
  var sheet = oaSS_().getSheetByName("Orders");
  if (!sheet) return null;
  [OA_DISPATCH_QTY_COL, OA_DISPATCHED_BY_COL, OA_DISPATCH_TIME_COL].forEach(function (name) {
    oaEnsureSheetColumn_(sheet, name);
  });
  SpreadsheetApp.flush();

  var headers = oaSheetHeaders_(sheet);
  var colIdx = {};
  headers.forEach(function (h, i) { colIdx[h] = i; });
  return { sheet: sheet, headers: headers, colIdx: colIdx };
}

function oaGetDispatchOrders_(userId) {
  try {
    if (!oaIsDispatchUser_(userId)) {
      return { success: false, orders: [],
               message: "This login does not have dispatch rights. Put DISPATCH in its \"Outlet id\" cell on the Users sheet." };
    }
    var ctx = oaEnsureDispatchColumns_();
    if (!ctx || ctx.sheet.getLastRow() < 2) return { success: true, orders: [] };

    var sheet = ctx.sheet, colIdx = ctx.colIdx;
    var data = sheet.getDataRange().getValues();

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var yesterday = new Date(today.getTime() - 86400000);

    var itemCodeMap = oaBuildItemCodeMap_();
    var allMeta = oaGetAllOrderMeta_();
    var ordersMap = {};

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var orderNo = row[colIdx["Order No"]] ? row[colIdx["Order No"]].toString() : "";
      if (!orderNo) continue;

      var timestamp = row[colIdx["Timestamp"]];
      var tsDate = timestamp ? oaParseDDMMYYYY_(timestamp) : null;
      var tsDay = (tsDate && !isNaN(tsDate))
        ? new Date(tsDate.getFullYear(), tsDate.getMonth(), tsDate.getDate())
        : null;
      if (tsDay && tsDay < yesterday) continue;

      var meta = allMeta[orderNo] || { userId: "", revision: "0" };
      var status = colIdx["Status"] !== undefined
        ? (row[colIdx["Status"]] ? row[colIdx["Status"]].toString() : "Confirmed")
        : "Confirmed";

      var outletColRaw = colIdx["Outlet Name"] !== undefined ? row[colIdx["Outlet Name"]] : row[colIdx["Outlet Short Name"]];
      var outletShort = outletColRaw ? outletColRaw.toString() : "";

      if (!ordersMap[orderNo]) {
        ordersMap[orderNo] = {
          orderNo: orderNo,
          outletShortName: outletShort,
          outletFullName: oaOutletDisplayName_(outletShort),
          customerName: row[colIdx["Customer Name"]] ? row[colIdx["Customer Name"]].toString() : "",
          orderedBy: row[colIdx["Ordered By"]] ? row[colIdx["Ordered By"]].toString() : "",
          timestamp: timestamp ? oaFormatDateDDMMYYYY_(timestamp) : "",
          status: status,
          revision: meta.revision,
          userId: meta.userId,
          dispatchedBy: colIdx[OA_DISPATCHED_BY_COL] !== undefined && row[colIdx[OA_DISPATCHED_BY_COL]]
            ? row[colIdx[OA_DISPATCHED_BY_COL]].toString() : "",
          dispatchTime: colIdx[OA_DISPATCH_TIME_COL] !== undefined && row[colIdx[OA_DISPATCH_TIME_COL]]
            ? oaFormatDateDDMMYYYY_(row[colIdx[OA_DISPATCH_TIME_COL]]) : "",
          items: []
        };
      }

      var itemName = row[colIdx["Item Name"]] ? row[colIdx["Item Name"]].toString() : "";
      var dq = colIdx[OA_DISPATCH_QTY_COL] !== undefined ? row[colIdx[OA_DISPATCH_QTY_COL]] : "";
      ordersMap[orderNo].items.push({
        code: (colIdx["Item Code"] !== undefined && row[colIdx["Item Code"]])
          ? row[colIdx["Item Code"]].toString() : (itemCodeMap[itemName] || ""),
        name: itemName,
        unit: row[colIdx["Unit"]] ? row[colIdx["Unit"]].toString() : "",
        qty: row[colIdx["Quantity"]] ? Number(row[colIdx["Quantity"]]) : 0,
        dispatchQty: (dq === "" || dq === null || dq === undefined) ? "" : Number(dq)
      });
    }

    var orders = Object.keys(ordersMap).map(function (k) { return ordersMap[k]; });

    orders.sort(function (a, b) {
      var ap = a.items.some(function (i) { return i.dispatchQty === ""; }) ? 0 : 1;
      var bp = b.items.some(function (i) { return i.dispatchQty === ""; }) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      var an = (a.outletFullName || "").toLowerCase(), bn = (b.outletFullName || "").toLowerCase();
      if (an !== bn) return an < bn ? -1 : 1;
      return a.orderNo < b.orderNo ? 1 : -1;
    });
    return { success: true, orders: orders };
  } catch (e) {
    return { success: false, message: "Error: " + e.message, orders: [] };
  }
}

function oaSaveDispatchQty_(payload) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); }
  catch (e) { return { success: false, message: "System busy, please try again." }; }
  try {
    payload = payload || {};
    var userId = (payload.userId || "").toString();
    if (!oaIsDispatchUser_(userId)) {
      return { success: false,
               message: "This login does not have dispatch rights. Put DISPATCH in its \"Outlet id\" cell on the Users sheet." };
    }
    var orderNo = (payload.orderNo || "").toString().trim();
    if (!orderNo) return { success: false, message: "No order selected." };

    var rows = payload.rows || [];
    if (!rows.length) return { success: false, message: "Nothing to save." };

    var ctx = oaEnsureDispatchColumns_();
    if (!ctx || ctx.sheet.getLastRow() < 2) return { success: false, message: "No orders found." };
    var sheet = ctx.sheet, colIdx = ctx.colIdx;

    var byItem = {};
    rows.forEach(function (r) {
      var raw = (r.dispatchQty === null || r.dispatchQty === undefined) ? "" : r.dispatchQty.toString().trim();
      var val = "";
      if (raw !== "") {
        var n = Number(raw);
        if (!isFinite(n) || n < 0) return;
        val = n;
      }
      if (r.name) byItem["N:" + oaSquashKey_(r.name)] = val;
      if (r.code) byItem["C:" + oaNormKey_(r.code)] = val;
    });

    var data = sheet.getDataRange().getValues();
    var who = (payload.userName || "") + (userId ? " (" + userId + ")" : "");
    var stamp = new Date();
    var qCol = colIdx[OA_DISPATCH_QTY_COL] + 1;
    var bCol = colIdx[OA_DISPATCHED_BY_COL] + 1;
    var tCol = colIdx[OA_DISPATCH_TIME_COL] + 1;

    var saved = 0;
    for (var i = 1; i < data.length; i++) {
      if (!data[i][colIdx["Order No"]] || data[i][colIdx["Order No"]].toString() !== orderNo) continue;
      var nm = data[i][colIdx["Item Name"]] ? data[i][colIdx["Item Name"]].toString() : "";
      var cd = (colIdx["Item Code"] !== undefined && data[i][colIdx["Item Code"]])
        ? data[i][colIdx["Item Code"]].toString() : "";
      var key = "N:" + oaSquashKey_(nm);
      var val = byItem.hasOwnProperty(key) ? byItem[key]
              : (cd && byItem.hasOwnProperty("C:" + oaNormKey_(cd)) ? byItem["C:" + oaNormKey_(cd)] : undefined);
      if (val === undefined) continue;
      sheet.getRange(i + 1, qCol).setValue(val);
      sheet.getRange(i + 1, bCol).setValue(val === "" ? "" : who);
      sheet.getRange(i + 1, tCol).setValue(val === "" ? "" : stamp);
      saved++;
    }
    if (saved) {
      sheet.getRange(2, tCol, Math.max(1, sheet.getLastRow() - 1), 1).setNumberFormat("dd-MM-yyyy HH:mm:ss");
      SpreadsheetApp.flush();
    }
    return { success: true, saved: saved, message: "Dispatch quantity saved for " + orderNo + "." };
  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function oaUpdateOrderQuantity_(orderNo, updatedItems, userId) {
  try {
    if (oaIsAdminUser_(userId.toString().trim())) {
      return { success: false, message: "HQ Admins cannot edit orders." };
    }

    var sheet = oaSS_().getSheetByName("Orders");
    if (!sheet || sheet.getLastRow() < 2) return { success: false, message: "No orders found" };

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var colIdx = {};
    headers.forEach(function(h, i) { colIdx[h] = i; });

    var meta = oaGetOrderMeta_(orderNo);
    if (meta.userId && meta.userId !== userId.toString().trim()) {
      return { success: false, message: "You can only edit your own orders." };
    }

    var status = "Confirmed";
    var baseRowData = null;
    for (var i = 1; i < data.length; i++) {
      if (data[i][colIdx["Order No"]] && data[i][colIdx["Order No"]].toString() === orderNo) {
        if (!baseRowData) baseRowData = data[i];
        status = colIdx["Status"] !== undefined
          ? (data[i][colIdx["Status"]] ? data[i][colIdx["Status"]].toString() : "Confirmed")
          : "Confirmed";
      }
    }

    if (status === "Approved") {
      return { success: false, message: "Order already approved. Cannot edit." };
    }
    if (status === "Rejected") {
      return { success: false, message: "Order already rejected. Cannot edit." };
    }

    var imRules = oaLoadItemMaster_();
    if (!imRules.ok) {
      return { success: false, message: "Item list could not be read - " + imRules.error };
    }
    var dispEdit = oaDisplayCatalog_(imRules);
    var norm = oaNormaliseEditLines_(updatedItems, imRules, dispEdit);
    if (norm.badMultiples.length) {
      return { success: false, badMultiples: norm.badMultiples,
               message: oaBadMultiplesMessage_(norm.badMultiples) };
    }
    updatedItems = norm.items;
    var syncNote = norm.synced.length
      ? " Linked quantities were matched up for: " + norm.synced.join(", ") + "."
      : "";

    var onOrder = {};
    for (var i = 1; i < data.length; i++) {
      if (!data[i][colIdx["Order No"]] || data[i][colIdx["Order No"]].toString() !== orderNo) continue;
      var exName = data[i][colIdx["Item Name"]] ? data[i][colIdx["Item Name"]].toString() : "";
      var exCode = (colIdx["Item Code"] !== undefined && data[i][colIdx["Item Code"]])
        ? data[i][colIdx["Item Code"]].toString() : "";
      if (exName) onOrder["N:" + oaSquashKey_(exName)] = exName;
      if (exCode) onOrder["C:" + oaNormKey_(exCode)] = exName || exCode;
    }

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[colIdx["Order No"]] && row[colIdx["Order No"]].toString() === orderNo) {
        var itemName = row[colIdx["Item Name"]] ? row[colIdx["Item Name"]].toString() : "";
        for (var j = 0; j < updatedItems.length; j++) {
          if (updatedItems[j].processed) continue;
          var sameName = oaSquashKey_(updatedItems[j].name) === oaSquashKey_(itemName);
          if (sameName) {
            sheet.getRange(i + 1, colIdx["Quantity"] + 1).setValue(updatedItems[j].qty);
            updatedItems[j].processed = true;
            break;
          }
        }
      }
    }

    var dupAdds = [];
    var seenAdds = {};
    for (var j = 0; j < updatedItems.length; j++) {
      var cand = updatedItems[j];
      if (cand.processed || !(Number(cand.qty) > 0)) continue;
      var kName = "N:" + oaSquashKey_(cand.name || "");
      var kCode = cand.code ? "C:" + oaNormKey_(cand.code) : "";
      var already = onOrder[kName] || (kCode ? onOrder[kCode] : "");
      if (already) { dupAdds.push(already); continue; }

      if (seenAdds[kName] || (kCode && seenAdds[kCode])) { dupAdds.push(cand.name); continue; }
      seenAdds[kName] = true;
      if (kCode) seenAdds[kCode] = true;
    }
    if (dupAdds.length) {
      var uniqDup = dupAdds.filter(function (v, i, a) { return a.indexOf(v) === i; });
      return {
        success: false,
        duplicates: uniqDup,
        message: "This order already has " + uniqDup.slice(0, 4).join(", ") +
                 (uniqDup.length > 4 ? " and " + (uniqDup.length - 4) + " more" : "") +
                 ". Change the quantity on the existing line instead of adding it again."
      };
    }

    var newRows = [];
    var imEdit = oaLoadItemMaster_();
    if (!imEdit.ok) {
      return { success: false, message: "Item list could not be read - " + imEdit.error };
    }
    var addRejected = [];
    for (var j = 0; j < updatedItems.length; j++) {
      if (updatedItems[j].processed || !(updatedItems[j].qty > 0)) continue;
      if (!oaResolveMasterItem_(imEdit, updatedItems[j].code, updatedItems[j].name)) {
        addRejected.push({ code: updatedItems[j].code || "", name: updatedItems[j].name || "" });
      }
    }
    if (addRejected.length) {
      return { success: false, rejected: addRejected, message: oaRejectedItemsMessage_(addRejected) };
    }

    for (var j = 0; j < updatedItems.length; j++) {
      if (!updatedItems[j].processed && updatedItems[j].qty > 0 && baseRowData) {
        var masterAdd = oaResolveMasterItem_(imEdit, updatedItems[j].code, updatedItems[j].name);
        var newRow = new Array(headers.length);
        newRow[colIdx["Order No"]] = orderNo;

        var outCol = colIdx["Outlet Name"] !== undefined ? colIdx["Outlet Name"] : colIdx["Outlet Short Name"];
        if (outCol !== undefined) newRow[outCol] = baseRowData[outCol];

        if (colIdx["Customer Name"] !== undefined) newRow[colIdx["Customer Name"]] = baseRowData[colIdx["Customer Name"]];

        if (colIdx["Item Code"] !== undefined) newRow[colIdx["Item Code"]] = masterAdd.code || "";

        newRow[colIdx["Item Name"]] = masterAdd.name;
        newRow[colIdx["Unit"]] = masterAdd.unit || updatedItems[j].unit || "";
        newRow[colIdx["Quantity"]] = updatedItems[j].qty;
        newRow[colIdx["Ordered By"]] = baseRowData[colIdx["Ordered By"]];
        newRow[colIdx["Timestamp"]] = baseRowData[colIdx["Timestamp"]];
        if (colIdx["Status"] !== undefined) newRow[colIdx["Status"]] = "Confirmed";
        newRows.push(newRow);
      }
    }

    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
    }

    SpreadsheetApp.flush();

    var newRevision = oaUpdateOrderMetaRevision_(orderNo);

    var updatedOrderSummary = oaBuildOrderSummaryFromSheet_(orderNo, newRevision);
    if (updatedOrderSummary) {
      oaSendUpdatedOrderEmails_(updatedOrderSummary, userId, newRevision);
    }

    return { success: true, message: "Order updated successfully" + syncNote, revision: newRevision };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function oaBuildOrderSummaryFromSheet_(orderNo, revision) {
  try {
    var sheet = oaSS_().getSheetByName("Orders");
    if (!sheet) return null;
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var colIdx = {};
    headers.forEach(function(h, i) { colIdx[h] = i; });

    var itemCodeMap = oaBuildItemCodeMap_();
    var meta = oaGetOrderMeta_(orderNo);

    var summary = null;
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[colIdx["Order No"]] && row[colIdx["Order No"]].toString() === orderNo) {
        var outletColRaw = colIdx["Outlet Name"] !== undefined ? row[colIdx["Outlet Name"]] : row[colIdx["Outlet Short Name"]];
        var outletShort = outletColRaw ? outletColRaw.toString() : "";
        if (!summary) {
          summary = {
            orderNo: orderNo,
            outletShortName: outletShort,
            outletFullName: oaOutletDisplayName_(outletShort),
            customerName: row[colIdx["Customer Name"]] ? row[colIdx["Customer Name"]].toString() : "",
            orderedBy: row[colIdx["Ordered By"]] ? row[colIdx["Ordered By"]].toString() : "",
            timestamp: row[colIdx["Timestamp"]] ? row[colIdx["Timestamp"]].toString() : "",
            userId: meta.userId,
            revision: revision,
            items: [],
            totalItems: 0,
            totalQuantity: 0
          };
        }
        var itemName = row[colIdx["Item Name"]] ? row[colIdx["Item Name"]].toString() : "";
        summary.items.push({
          code: itemCodeMap[itemName] || "",
          name: itemName,
          unit: row[colIdx["Unit"]] ? row[colIdx["Unit"]].toString() : "",
          qty: row[colIdx["Quantity"]] ? Number(row[colIdx["Quantity"]]) : 0
        });
      }
    }
    if (summary) {
      summary.totalItems = summary.items.length;
      summary.totalQuantity = summary.items.reduce(function(s, it) { return s + it.qty; }, 0);
    }
    return summary;
  } catch(e) {
    return null;
  }
}

function oaGetUserById_(userId) {
  var vu = oaVu_(userId); if (vu) return { userId: vu.userId, name: vu.name, email: vu.email };
  try {
    var sheet = oaSS_().getSheetByName("Users");
    if (!sheet) return null;
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var colIdx = {};
    headers.forEach(function(h, i) { colIdx[h] = i; });
    for (var i = 1; i < data.length; i++) {
      if (data[i][colIdx["User ID"]] && data[i][colIdx["User ID"]].toString() === userId) {
        return {
          userId: userId,
          name: data[i][colIdx["Name"]] ? data[i][colIdx["Name"]].toString() : "",
          email: colIdx["Email"] !== undefined ? (data[i][colIdx["Email"]] ? data[i][colIdx["Email"]].toString() : "") : ""
        };
      }
    }
    return null;
  } catch(e) { return null; }
}

function oaGenerateOrderIdWithOutlet_(outletShortName) {
  var date = new Date();
  var year = date.getFullYear().toString().slice(-2);
  var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  var month = months[date.getMonth()];
  var lastSerial = oaGetLastInvoiceNumberForOutlet_(outletShortName, year, month);
  var serial = (lastSerial + 1).toString().padStart(3, '0');
  return "PO" + outletShortName + year + "/" + month + "/" + serial;
}

function oaGetLastInvoiceNumberForOutlet_(outletShortName, year, month) {
  var sheet = oaSS_().getSheetByName("Orders");
  if (!sheet || sheet.getLastRow() < 2) return 0;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  var maxSerial = 0;
  var pattern = new RegExp("PO" + outletShortName + year + "/" + month + "/(\\d+)");
  for (var i = 0; i < data.length; i++) {
    var match = data[i][0].toString().match(pattern);
    if (match && match[1]) maxSerial = Math.max(maxSerial, parseInt(match[1], 10));
  }
  return maxSerial;
}

function oaGetEmailList_() {
  try {
    var sheet = oaSS_().getSheetByName("EmailList");
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    data.shift();
    return data.map(function(row) {
      return { email: row[0] ? row[0].toString().trim() : "" };
    }).filter(function(e) { return e.email; });
  } catch(e) { return []; }
}

function oaProcessOrder_(orderSummary, emailSettings) {
  try {
    var outletShortName = orderSummary.outletShortName || "";
    if (!outletShortName) throw new Error("Missing outlet short name");

    var check = oaValidateOrderItems_(orderSummary.items || []);
    if (check.fatal) {
      return { success: false, orderNo: "",
               message: "Not saved - the item list could not be read. " + check.message };
    }

    if (check.badMultiples.length) {
      return { success: false, orderNo: "", badMultiples: check.badMultiples,
               message: oaBadMultiplesMessage_(check.badMultiples) };
    }
    if (!check.ok && OA_BLOCK_ORDER_IF_INACTIVE) {
      return { success: false, orderNo: "", rejected: check.rejected,
               message: oaRejectedItemsMessage_(check.rejected) };
    }
    if (!check.items.length) {
      return { success: false, orderNo: "", rejected: check.rejected,
               message: "Not saved - no orderable items in this order." };
    }

    orderSummary.items = check.items;
    orderSummary.totalItems = check.items.length;
    orderSummary.totalQuantity = Math.round(check.items.reduce(function (s, it) {
      return s + (Number(it.qty) || 0);
    }, 0) * 100) / 100;
    var droppedNote = (!check.ok && !OA_BLOCK_ORDER_IF_INACTIVE)
      ? " \u26A0\uFE0F " + check.rejected.length + " inactive item(s) were removed."
      : "";

    var customOrderId = oaGenerateOrderIdWithOutlet_(outletShortName);
    orderSummary.orderNo = customOrderId;
    orderSummary.revision = 0;

    orderSummary.outletFullName = oaOutletDisplayName_(outletShortName);

    oaSaveOrderToSheet_(orderSummary);
    oaSaveOrderMeta_(customOrderId, orderSummary.userId || "", "0");

    var stockSaved = 0;
    try {
      var stockRows = orderSummary.closingStock || [];
      if (stockRows.length) {
        var sres = oaSaveClosingStock_({
          outletKey: outletShortName,
          dateStr: oaStockDateStr_(new Date()),
          userId: orderSummary.userId || "",
          userName: orderSummary.customerName || orderSummary.orderedBy || "",
          rows: stockRows
        });
        if (sres && sres.success) stockSaved = sres.saved || 0;
      }
    } catch (e) {  }

    var result = { success: true, message: "✅ Order " + customOrderId + " saved." + droppedNote + " ",
                   orderNo: customOrderId, stockSaved: stockSaved };

    var userEmail = orderSummary.userEmail || "";
    var userPdfBlob = oaGeneratePDF_(orderSummary, false);

    if (userEmail) {
      try {
        MailApp.sendEmail(userEmail, "Order Confirmation: " + customOrderId, "", {
          htmlBody: oaBuildEmailHtml_(orderSummary, false),
          attachments: [userPdfBlob],
          name: OA_APP_NAME
        });
      } catch(e) {}
    }

    var emailList = oaGetEmailList_();
    var adminPdfBlob = oaGeneratePDF_(orderSummary, true);
    var appUrl = oaAppUrl_();

    if (emailList && emailList.length) {
      var sentCount = 0;
      emailList.forEach(function(item) {
        if (item.email) {
          try {
            MailApp.sendEmail(item.email, "New Order: " + customOrderId, "", {
              htmlBody: oaBuildAdminEmailHtml_(orderSummary, appUrl),
              attachments: [adminPdfBlob],
              name: OA_APP_NAME
            });
            sentCount++;
          } catch(e) {}
        }
      });
      result.message += "📧 Email sent to " + sentCount + " admin(s).";
    }

    return result;
  } catch(e) {
    throw new Error(e.message);
  }
}

function oaSendUpdatedOrderEmails_(orderSummary, userId, revision) {
  try {
    var userData = oaGetUserById_(userId);
    var label = "UPDATED - " + orderSummary.orderNo + " (Rev." + revision + ")";

    var userPdfBlob = oaGeneratePDF_(orderSummary, false, label);
    var adminPdfBlob = oaGeneratePDF_(orderSummary, true, label);
    var appUrl = oaAppUrl_();

    if (userData && userData.email) {
      try {
        MailApp.sendEmail(userData.email, "Order Updated: " + label, "", {
          htmlBody: oaBuildEmailHtml_(orderSummary, false, label),
          attachments: [userPdfBlob],
          name: OA_APP_NAME
        });
      } catch(e) {}
    }

    var emailList = oaGetEmailList_();
    if (emailList && emailList.length) {
      emailList.forEach(function(item) {
        if (item.email) {
          try {
            MailApp.sendEmail(item.email, "Order Updated: " + label, "", {
              htmlBody: oaBuildAdminEmailHtml_(orderSummary, appUrl, label),
              attachments: [adminPdfBlob],
              name: OA_APP_NAME
            });
          } catch(e) {}
        }
      });
    }
  } catch(e) {}
}

function oaSaveOrderToSheet_(orderSummary) {
  var sheet = oaSS_().getSheetByName("Orders");

  var headers = ["Order No", "Outlet Name", "Customer Name", "Item Code", "Item Name", "Unit", "Quantity", "Ordered By", "Timestamp", "Status"];

  if (!sheet) {
    sheet = oaSS_().insertSheet("Orders");
    sheet.appendRow(headers);
  }

  var now = new Date();
  var rows = orderSummary.items.map(function(item) {
    return [
      orderSummary.orderNo,
      orderSummary.outletFullName,
      orderSummary.customerName || "",
      item.code || "",
      item.name,
      item.unit,
      item.qty,
      orderSummary.orderedBy,
      now,
      "Confirmed"
    ];
  });

  if (rows.length) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, 10).setValues(rows);

    sheet.getRange(startRow, 9, rows.length, 1).setNumberFormat("dd-MM-yyyy HH:mm:ss");
  }
}

function oaOrderedByName_(orderSummary) {
  var n = oaNormText_(orderSummary && orderSummary.orderedBy) || oaNormText_(orderSummary && orderSummary.customerName);
  return n || "N/A";
}

function oaGeneratePDF_(orderSummary, isAdmin, displayLabel) {
  var label = displayLabel || orderSummary.orderNo;
  var outletDisplay = orderSummary.outletFullName || orderSummary.outletShortName || "";

  var itemsHtml = "";
  for (var i = 0; i < orderSummary.items.length; i++) {
    var it = orderSummary.items[i];
    itemsHtml += "<tr>" +
      "<td style='border:1px solid #E8D5C0;padding:8px;text-align:center;color:#64748b'>" + (i+1) + "</td>" +
      "<td style='border:1px solid #E8D5C0;padding:8px;text-align:center;font-family:monospace;font-size:11px;color:" + OA_BRAND_PRIMARY + "'>" + (it.code || "—") + "</td>" +
      "<td style='border:1px solid #E8D5C0;padding:8px'>" + it.name + "</td>" +
      "<td style='border:1px solid #E8D5C0;padding:8px;text-align:center'>" + it.unit + "</td>" +
      "<td style='border:1px solid #E8D5C0;padding:8px;text-align:center;font-weight:bold'>" + it.qty + "</td></tr>";
  }

  var approveSection = "";
  if (isAdmin) {
    var appUrl = "";
    try { appUrl = oaAppUrl_(); } catch(e) {}
    var approveUrl = appUrl + "?page=approve&orderNo=" + encodeURIComponent(orderSummary.orderNo) + "&action=approve&token=cg2024";
    var rejectUrl = appUrl + "?page=approve&orderNo=" + encodeURIComponent(orderSummary.orderNo) + "&action=reject&token=cg2024";
    approveSection = "<div style='text-align:center;margin:30px 0;padding:20px;background:#FFF8E7;border-radius:8px;border:1px solid " + OA_BRAND_CREAM + "'>" +
      "<p style='font-size:16px;color:" + OA_BRAND_PRIMARY + ";margin-bottom:15px;font-weight:bold'>Action Required: Review this order</p>" +
      "<a href='" + approveUrl + "' style='background:" + OA_BRAND_GREEN + ";color:white;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;margin:5px;display:inline-block'>APPROVE ORDER</a>" +
      "&nbsp;&nbsp;" +
      "<a href='" + rejectUrl + "' style='background:#ef4444;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;margin:5px;display:inline-block'>REJECT ORDER</a>" +
      "</div>";
  }

  var html = "<html><head><style>" +
    "body{font-family:Arial;padding:30px;}" +
    "h1{color:" + OA_BRAND_PRIMARY + ";text-align:center;margin-top:10px;}" +
    ".info{background:#FFF8E7;padding:20px;border-radius:8px;margin:20px 0;border:1px solid " + OA_BRAND_CREAM + ";}" +
    ".info p{margin:5px 0;}" +
    "table{width:100%;border-collapse:collapse;margin:20px 0;}" +
    "th{background:" + OA_BRAND_PRIMARY + ";color:white;padding:12px;text-align:left;}" +
    "td{border:1px solid #E8D5C0;padding:10px;}" +
    ".total{font-size:18px;font-weight:bold;margin-top:20px;color:" + OA_BRAND_PRIMARY + ";text-align:right;}" +
    ".label{background:#FFF8E7;padding:8px 15px;border-radius:20px;display:inline-block;font-size:14px;color:" + OA_BRAND_PRIMARY + ";margin-bottom:10px;border:1px solid " + OA_BRAND_CREAM + ";}" +
    "</style></head><body>" +
    "<div style='text-align:center'><img src='" + OA_LOGO_URL + "' style='height:105px;margin-bottom:6px;' alt='Chai Govindam'></div>" +
    "<h1>Chai Govindam — Order Confirmation</h1>" +
    "<div style='text-align:center'><span class='label'>" + label + "</span></div>" +
    "<div class='info'>" +
    "<p><strong>Order No:</strong> " + orderSummary.orderNo + "</p>" +
    "<p><strong>Outlet:</strong> " + outletDisplay + "</p>" +
    "<p><strong>Ordered By:</strong> " + oaOrderedByName_(orderSummary) + "</p>" +
    "<p><strong>Timestamp:</strong> " + orderSummary.timestamp + "</p>" +
    "</div>" +
    "<table>" +
    "<tr><th>#</th><th>Item Code</th><th>Item Name</th><th>Unit</th><th>Quantity</th></tr>" +
    itemsHtml +
    "</table>" +
    "<div class='total'>Total Items: " + orderSummary.totalItems + " | Total Quantity: " + orderSummary.totalQuantity + "</div>" +
    approveSection +
    "</body></html>";

  var blob = Utilities.newBlob(html, 'text/html', 'order.html');
  return blob.getAs('application/pdf').setName('Order_' + label.replace(/\//g, '-').replace(/ /g, '_') + '.pdf');
}

function oaBuildEmailHtml_(orderSummary, isAdmin, displayLabel) {
  var label = displayLabel || orderSummary.orderNo;
  var outletDisplay = orderSummary.outletFullName || orderSummary.outletShortName || "";

  return '<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">' +
    '<div style="background:' + OA_BRAND_PRIMARY + ';padding:20px;text-align:center;border-radius:12px 12px 0 0;">' +
      '<img src="' + OA_LOGO_URL + '" style="height:90px;" alt="Chai Govindam">' +
      '<h2 style="color:white;margin:10px 0 0;">Order Confirmation</h2>' +
    '</div>' +
    '<div style="padding:25px;background:white;border:1px solid ' + OA_BRAND_CREAM + ';">' +
      '<p><strong>Order No:</strong> ' + label + '</p>' +
      '<p><strong>Outlet:</strong> ' + outletDisplay + '</p>' +
      '<p><strong>Ordered By:</strong> ' + oaOrderedByName_(orderSummary) + '</p>' +
      '<p><strong>Total Items:</strong> ' + orderSummary.totalItems + '</p>' +
      '<p><strong>Total Quantity:</strong> ' + orderSummary.totalQuantity + '</p>' +
      '<p style="margin-top:15px;color:#64748b;">Please see the attached PDF for your order details.</p>' +
    '</div>' +
    '<div style="background:#FFF8E7;padding:12px;text-align:center;border-radius:0 0 12px 12px;border:1px solid ' + OA_BRAND_CREAM + ';border-top:none;">' +
      '<p style="color:' + OA_BRAND_PRIMARY + ';font-size:12px;margin:0;">' + OA_APP_NAME + '</p>' +
    '</div>' +
  '</div>';
}

function oaBuildAdminEmailHtml_(orderSummary, appUrl, displayLabel) {
  var label = displayLabel || orderSummary.orderNo;
  var outletDisplay = orderSummary.outletFullName || orderSummary.outletShortName || "";
  var approveUrl = appUrl + "?page=approve&orderNo=" + encodeURIComponent(orderSummary.orderNo) + "&action=approve&token=cg2024";
  var rejectUrl = appUrl + "?page=approve&orderNo=" + encodeURIComponent(orderSummary.orderNo) + "&action=reject&token=cg2024";

  return '<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">' +
    '<div style="background:' + OA_BRAND_PRIMARY + ';padding:20px;text-align:center;border-radius:12px 12px 0 0;">' +
      '<img src="' + OA_LOGO_URL + '" style="height:90px;" alt="Chai Govindam">' +
      '<h2 style="color:white;margin:10px 0 0;">New Order Received</h2>' +
    '</div>' +
    '<div style="padding:25px;background:white;border:1px solid ' + OA_BRAND_CREAM + ';">' +
      '<p style="font-size:18px;font-weight:bold;color:' + OA_BRAND_PRIMARY + ';margin-bottom:15px;">' + label + '</p>' +
      '<p><strong>Outlet:</strong> ' + outletDisplay + '</p>' +
      '<p><strong>Ordered By:</strong> ' + oaOrderedByName_(orderSummary) + '</p>' +
      '<p><strong>Total Items:</strong> ' + orderSummary.totalItems + '</p>' +
      '<p><strong>Total Quantity:</strong> ' + orderSummary.totalQuantity + '</p>' +
    '</div>' +
    '<div style="text-align:center;padding:20px;background:#FFF8E7;border:1px solid ' + OA_BRAND_CREAM + ';border-top:none;">' +
      '<p style="font-weight:bold;color:' + OA_BRAND_PRIMARY + ';margin-bottom:15px;">Action Required: Approve or Reject this order</p>' +
      '<a href="' + approveUrl + '" style="background:' + OA_BRAND_GREEN + ';color:white;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;margin:5px;display:inline-block">APPROVE ORDER</a>' +
      '&nbsp;&nbsp;' +
      '<a href="' + rejectUrl + '" style="background:#ef4444;color:white;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold;margin:5px;display:inline-block">REJECT ORDER</a>' +
    '</div>' +
    '<div style="background:' + OA_BRAND_PRIMARY + ';padding:12px;text-align:center;border-radius:0 0 12px 12px;">' +
      '<p style="color:' + OA_BRAND_CREAM + ';font-size:12px;margin:0;">PDF with full order details is attached. | ' + OA_APP_NAME + '</p>' +
    '</div>' +
  '</div>';
}

var OA_CS_SHEET   = "ClosingStock";
var OA_SQ_SHEET   = "StandardQty";
var OA_CS_HEADERS = ["Date", "Outlet", "Item Code", "Item Name", "Unit", "Closing Stock", "Filled By", "User ID", "Timestamp"];
var OA_SQ_HEADERS = ["Outlet", "Item Code", "Item Name", "Unit", "Per Day Qty", "Days", "Std Qty", "Updated By", "Updated At"];

var OA_STD_LOOKBACK_DAYS  = 60;
var OA_DEFAULT_COVER_DAYS = 2;
var OA_STOCK_BASIS_MAX_BACK = 7;

var OA_SUGGEST_MIN_SHORTFALL = 0.5;
var OA_SUGGEST_MIN_RATIO     = 0.25;

var OA_OUTLET_ALIAS = {
  "PN": "PN", "CG PANDRI": "PN", "PANDRI": "PN", "CG001": "PN",
  "PP": "PP", "PACHPEDI NAKA": "PP", "PACHPEDI": "PP", "CG002": "PP",
  "GC": "GC", "GOL CHOWK": "GC", "GOLCHOWK": "GC", "CG003": "GC",
  "SN": "SN", "SHANKAR NAGAR": "SN", "SHANKARNAGAR": "SN", "CG004": "SN",
  "FF": "FF", "FAFADIH": "FF", "CG005": "FF",
  "CD": "CD", "CHANDERI": "CD", "CG006": "CD"
};

var OA_OUTLET_KEY_NAME = {
  "PN": "CG Pandri",
  "PP": "CG Pachpedi Naka",
  "GC": "CG Gol Chowk",
  "SN": "CG Shankar Nagar",
  "FF": "CG Fafadih",
  "CD": "CG Chanderi"
};

function oaOutletKey_(v) {
  if (v === null || v === undefined) return "";
  var s = v.toString().trim().toUpperCase().replace(/\s+/g, " ");
  if (!s) return "";
  if (OA_OUTLET_ALIAS[s]) return OA_OUTLET_ALIAS[s];
  if (s.indexOf("HQ") === 0) return "HQ";
  return s;
}

function oaOutletNameFromKey_(key) {
  var k = oaOutletKey_(key);
  return OA_OUTLET_KEY_NAME[k] || key || "";
}

function oaIsHqKey_(outletId, outletShortName) {
  if (oaOutletKey_(outletShortName) === "HQ") return true;
  if (outletId && outletId.toString().trim().toUpperCase().indexOf("HQ") === 0) return true;
  return false;
}

function oaGetStockOutlets_(outletId, outletShortName) {
  try {
    var list = [];
    if (oaIsHqKey_(outletId, outletShortName)) {
      var seen = {};
      var sheet = oaSS_().getSheetByName("Users");
      if (sheet && sheet.getLastRow() > 1) {
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        var sCol = headers.indexOf("Outlet Short Name");
        var iCol = headers.indexOf("Outlet id");
        for (var i = 1; i < data.length; i++) {
          var k = oaOutletKey_(sCol >= 0 ? data[i][sCol] : "") || oaOutletKey_(iCol >= 0 ? data[i][iCol] : "");

          if (!k || k === "HQ" || k === OA_DISPATCH_OUTLET_ID || seen[k]) continue;
          if (iCol >= 0 && oaIsDispatchByOutlet_(data[i][iCol])) continue;
          seen[k] = true;
          list.push({ key: k, name: oaOutletNameFromKey_(k) });
        }
      }
      if (!list.length) {
        ["PN", "PP", "GC", "SN", "FF", "CD"].forEach(function(k) {
          list.push({ key: k, name: oaOutletNameFromKey_(k) });
        });
      }
      list.sort(function(a, b) { return a.name < b.name ? -1 : 1; });
      return { isHq: true, outlets: list };
    }
    var own = oaOutletKey_(outletShortName) || oaOutletKey_(outletId);
    return { isHq: false, outlets: own ? [{ key: own, name: oaOutletNameFromKey_(own) }] : [] };
  } catch (e) {
    return { isHq: false, outlets: [] };
  }
}

function oaStockDateStr_(d) {
  if (!d) return "";
  var dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt.getTime())) return d.toString();
  return ("0" + dt.getDate()).slice(-2) + "-" + ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + dt.getFullYear();
}

function oaNormStockDate_(v) {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) return oaStockDateStr_(v);
  var s = v.toString().trim();
  if (s.charAt(0) === "'") s = s.substring(1);
  var m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (m) return ("0" + m[1]).slice(-2) + "-" + ("0" + m[2]).slice(-2) + "-" + m[3];
  var m2 = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (m2) return ("0" + m2[3]).slice(-2) + "-" + ("0" + m2[2]).slice(-2) + "-" + m2[1];
  var d = new Date(s);
  return isNaN(d.getTime()) ? s : oaStockDateStr_(d);
}

function oaStockDateToObj_(s) {
  var n = oaNormStockDate_(s);
  var p = n.split("-");
  if (p.length !== 3) return null;
  var d = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
  return isNaN(d.getTime()) ? null : d;
}

function oaShiftStockDate_(dateStr, deltaDays) {
  var d = oaStockDateToObj_(dateStr);
  if (!d) return "";
  d.setDate(d.getDate() + deltaDays);
  return oaStockDateStr_(d);
}

function oaItemKey_(code, name) {
  var c = code ? code.toString().trim().toUpperCase() : "";
  if (c) return "C:" + c;
  return "N:" + (name ? name.toString().trim().toUpperCase() : "");
}

function oaRoundSuggest_(qty, unit) {
  if (!isFinite(qty) || qty <= 0) return 0;
  var u = (unit || "").toString().trim().toUpperCase();
  if (u === "KG" || u === "LTR") return Math.round(qty * 10) / 10;
  return Math.ceil(qty - 1e-9);
}

function oaSuggestOrderQty_(stdQty, closing, unit) {
  var std = Number(stdQty) || 0;
  var have = (closing === null || closing === undefined) ? 0 : (Number(closing) || 0);
  var shortfall = std - have;
  if (shortfall <= 0) return { qty: 0, shortfall: 0, stocked: true };

  var u = (unit || "").toString().trim().toUpperCase();
  var minUnits = (u === "KG" || u === "LTR") ? OA_SUGGEST_MIN_SHORTFALL / 2 : OA_SUGGEST_MIN_SHORTFALL;
  var tooSmall = shortfall < minUnits;
  var tooClose = std > 0 && (shortfall / std) < OA_SUGGEST_MIN_RATIO;

  if (tooSmall || tooClose) {
    return { qty: 0, shortfall: oaRound2_(shortfall), stocked: true };
  }
  return { qty: oaRoundSuggest_(shortfall, unit), shortfall: oaRound2_(shortfall), stocked: false };
}

function oaRound2_(n) {
  if (!isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function oaEnsureStockSheet_(name, headers, textCols) {
  var ss = oaSS_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#F4C97E");
    (textCols || []).forEach(function(c) { sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat("@"); });
    sh.autoResizeColumns(1, headers.length);
  } else if (sh.getLastRow() < 1) {
    sh.appendRow(headers);
  }
  return sh;
}

function oaEnsureClosingStockSheet_() { return oaEnsureStockSheet_(OA_CS_SHEET, OA_CS_HEADERS, [1]); }
function oaEnsureStandardQtySheet_()  { return oaEnsureStockSheet_(OA_SQ_SHEET, OA_SQ_HEADERS, []); }

function oaBuildItemMasterIndex_() {
  return oaLoadItemMaster_();
}

function oaGetOutletUsage_(oKey) {
  var cache = null, cacheKey = "cgUsage_" + oKey + "_" + oaStockDateStr_(new Date());
  try {
    cache = CacheService.getScriptCache();
    var hit = cache.get(cacheKey);

    if (hit) return oaFilterUsageToActive_(JSON.parse(hit));
  } catch (e) {}

  var usage = {};
  try {
    var sheet = oaSS_().getSheetByName("Orders");
    if (!sheet || sheet.getLastRow() < 2) return usage;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var col = {};
    headers.forEach(function(h, i) { col[h ? h.toString().trim() : ""] = i; });

    var outletCol = (col["Outlet Name"] !== undefined) ? col["Outlet Name"] : col["Outlet Short Name"];
    var codeCol = col["Item Code"], nameCol = col["Item Name"], unitCol = col["Unit"];
    var qtyCol = col["Quantity"], tsCol = col["Timestamp"], statusCol = col["Status"];
    if (nameCol === undefined || qtyCol === undefined) return usage;

    var today = new Date();
    var cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - OA_STD_LOOKBACK_DAYS);
    var im = oaBuildItemMasterIndex_();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (outletCol !== undefined && oaOutletKey_(row[outletCol]) !== oKey) continue;

      if (statusCol !== undefined && row[statusCol]) {
        var st = row[statusCol].toString().trim().toLowerCase();
        if (st === "rejected" || st === "cancelled" || st === "canceled") continue;
      }

      var ts = tsCol !== undefined ? row[tsCol] : null;
      var d = ts ? (ts instanceof Date ? ts : oaParseDDMMYYYY_(ts)) : null;
      if (!d || isNaN(d.getTime()) || d < cutoff) continue;

      var nm = row[nameCol] ? row[nameCol].toString().trim() : "";
      if (!nm) continue;
      var qty = Number(row[qtyCol]) || 0;
      if (qty <= 0) continue;

      var code = (codeCol !== undefined && row[codeCol]) ? row[codeCol].toString().trim() : "";
      var master = oaResolveMasterItem_(im, code, nm);
      if (!code && master) code = master.code;
      var unit = (unitCol !== undefined && row[unitCol]) ? row[unitCol].toString().trim() : (master ? master.unit : "");

      var k = oaItemKey_(code, nm);
      if (!usage[k]) {
        usage[k] = { code: code, name: nm, unit: unit, total: 0, times: 0, perDay: 0,
                     typicalQty: 0, lastQty: 0, _days: {}, _lastTs: 0, _qtys: [] };
      }
      var u = usage[k];
      u.total += qty;
      u.times += 1;
      u._days[oaStockDateStr_(d)] = true;
      u._qtys.push(qty);
      var tms = d.getTime();
      if (tms >= u._lastTs) { u._lastTs = tms; u.lastQty = qty; }
      if (!u.unit && unit) u.unit = unit;
    }

    Object.keys(usage).forEach(function(k) {
      var u = usage[k];
      u.orderDays = Object.keys(u._days).length;
      u.perDay = oaRound2_(u.total / OA_STD_LOOKBACK_DAYS);
      u._qtys.sort(function(a, b) { return a - b; });
      u.typicalQty = u._qtys.length ? u._qtys[Math.floor(u._qtys.length / 2)] : 0;
      delete u._days; delete u._lastTs; delete u._qtys;
    });

    try { if (cache) cache.put(cacheKey, JSON.stringify(usage), 21600); } catch (e) {}
  } catch (e) {
    Logger.log("getOutletUsage_ error: " + e.message);
  }

  return oaFilterUsageToActive_(usage);
}

function oaReadStandardQtyRows_() {
  var sh = oaEnsureStandardQtySheet_();
  var last = sh.getLastRow();
  if (last < 2) return { sheet: sh, rows: [] };
  return { sheet: sh, rows: sh.getRange(2, 1, last - 1, OA_SQ_HEADERS.length).getValues() };
}

function oaGetStandardQtyMap_(oKey) {
  var map = {};
  try {
    var res = oaReadStandardQtyRows_();
    for (var i = 0; i < res.rows.length; i++) {
      var r = res.rows[i];
      if (oaOutletKey_(r[0]) !== oKey) continue;
      var k = oaItemKey_(r[1], r[2]);
      var perDay = Number(r[4]) || 0;
      map[k] = {
        perDay: perDay,
        days: Number(r[5]) || OA_DEFAULT_COVER_DAYS,
        stdQty: Number(r[6]) || 0,
        manual: perDay > 0,
        row: i + 2
      };
    }
  } catch (e) {}
  return map;
}

function oaReadClosingStockTail_(scanLimit) {
  var sh = oaEnsureClosingStockSheet_();
  var last = sh.getLastRow();
  if (last < 2) return { sheet: sh, startRow: 2, rows: [] };
  var n = Math.min(last - 1, scanLimit || 15000);
  var startRow = last - n + 1;
  return { sheet: sh, startRow: startRow, rows: sh.getRange(startRow, 1, n, OA_CS_HEADERS.length).getValues() };
}

function oaGetClosingStockMap_(oKey, dateStr) {
  var map = {};
  var target = oaNormStockDate_(dateStr);
  if (!target) return map;
  try {
    var t = oaReadClosingStockTail_();
    for (var i = 0; i < t.rows.length; i++) {
      var r = t.rows[i];
      if (oaNormStockDate_(r[0]) !== target) continue;
      if (oaOutletKey_(r[1]) !== oKey) continue;
      map[oaItemKey_(r[2], r[3])] = Number(r[5]) || 0;
    }
  } catch (e) {}
  return map;
}

function oaGetLatestClosingStock_(oKey, beforeDateStr) {
  var result = { dateStr: "", map: {}, found: false };
  try {
    var t = oaReadClosingStockTail_();
    var anchor = oaStockDateToObj_(beforeDateStr);
    if (!anchor) return result;
    var oldest = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - OA_STOCK_BASIS_MAX_BACK);
    var bestTime = 0, bestStr = "";
    var byDate = {};

    for (var i = 0; i < t.rows.length; i++) {
      var r = t.rows[i];
      if (oaOutletKey_(r[1]) !== oKey) continue;
      var ds = oaNormStockDate_(r[0]);
      var d = oaStockDateToObj_(ds);
      if (!d || d > anchor || d < oldest) continue;
      if (!byDate[ds]) byDate[ds] = {};
      byDate[ds][oaItemKey_(r[2], r[3])] = Number(r[5]) || 0;
      if (d.getTime() >= bestTime) { bestTime = d.getTime(); bestStr = ds; }
    }
    if (bestStr) { result.dateStr = bestStr; result.map = byDate[bestStr]; result.found = true; }
  } catch (e) {}
  return result;
}

function oaGetStockBoard_(params) {
  try {
    params = params || {};
    var oKey = oaOutletKey_(params.outletKey);
    if (!oKey || oKey === "HQ") return { success: false, message: "Select an outlet first." };

    var coverDays = parseInt(params.coverDays, 10);
    if (!coverDays || coverDays < 2 || coverDays > 7) coverDays = OA_DEFAULT_COVER_DAYS;

    var todayStr = oaNormStockDate_(params.dateStr) || oaStockDateStr_(new Date());
    var prevStr  = oaShiftStockDate_(todayStr, -1);

    var usage   = oaGetOutletUsage_(oKey);
    var stdMap  = oaGetStandardQtyMap_(oKey);
    var todayCs = oaGetClosingStockMap_(oKey, todayStr);
    var basis   = oaGetLatestClosingStock_(oKey, prevStr);

    var im = oaLoadItemMaster_();
    if (!im.ok) {
      return { success: false, message: "Item list unavailable - " + im.error, items: [] };
    }

    var keys = {}, k;
    for (k in usage) keys[k] = true;
    for (k in stdMap) keys[k] = true;
    for (k in todayCs) keys[k] = true;

    var dispStock = oaDisplayCatalog_(im);
    var items = [], skippedInactive = 0;
    Object.keys(keys).forEach(function(key) {
      var u = usage[key] || {};
      var s = stdMap[key] || {};
      var name = u.name || "";
      var code = u.code || "";
      if (!name && !code) {
        name = key.indexOf("N:") === 0 ? key.substring(2) : "";
        code = key.indexOf("C:") === 0 ? key.substring(2) : "";
      }

      var master = oaResolveMasterItem_(im, code, name);
      if (!master) { skippedInactive++; return; }
      name = master.name;
      code = master.code || code;

      var unit = u.unit || master.unit || "";
      var autoPerDay = u.perDay || 0;
      var perDay = s.manual ? s.perDay : autoPerDay;
      var stdQty = oaRound2_(perDay * coverDays);

      var closing = basis.found && basis.map[key] !== undefined ? Number(basis.map[key]) : null;
      var sg = oaSuggestOrderQty_(stdQty, closing, unit);

      var stockMult = oaMultipleForCode_(dispStock, code);
      if (stockMult > 0 && sg.qty > 0) sg.qty = oaCeilToMultiple_(sg.qty, stockMult);

      items.push({
        key: key,
        code: code,
        name: name,
        unit: unit,
        multiple: stockMult,
        category: master.category,
        sub: master.sub,
        perDay: perDay,
        autoPerDay: autoPerDay,
        isManual: !!s.manual,
        stdQty: stdQty,
        closing: closing,
        todayClosing: todayCs[key] !== undefined ? Number(todayCs[key]) : null,
        suggested: sg.qty,
        shortfall: sg.shortfall,
        stocked: sg.stocked,
        typicalQty: u.typicalQty || 0,
        times: u.times || 0,
        totalQty: oaRound2_(u.total || 0)
      });
    });

    items.sort(function(a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });

    return {
      success: true,
      outletKey: oKey,
      outletName: oaOutletNameFromKey_(oKey),
      coverDays: coverDays,
      dateStr: todayStr,
      prevDateStr: prevStr,
      basisDateStr: basis.dateStr,
      basisFound: basis.found,
      lookbackDays: OA_STD_LOOKBACK_DAYS,
      minShortfall: OA_SUGGEST_MIN_SHORTFALL,
      minRatio: OA_SUGGEST_MIN_RATIO,
      masterOk: true,
      catalogSig: oaCatalogSig_(im),
      catalogCount: im.count,
      skippedInactive: skippedInactive,
      items: items
    };
  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  }
}

function oaSaveClosingStock_(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { success: false, message: "System busy, please try again." };
  }
  try {
    payload = payload || {};
    var oKey = oaOutletKey_(payload.outletKey);
    if (!oKey || oKey === "HQ") return { success: false, message: "Select an outlet first." };

    var dateStr = oaNormStockDate_(payload.dateStr) || oaStockDateStr_(new Date());
    var rows = payload.rows || [];
    if (!rows.length) return { success: false, message: "Nothing to save." };

    var filledBy = (payload.userName || "") + (payload.userId ? " (" + payload.userId + ")" : "");
    var stamp = oaFormatDateDDMMYYYY_(new Date());

    var t = oaReadClosingStockTail_();
    var rowByKey = {};
    for (var i = 0; i < t.rows.length; i++) {
      var r = t.rows[i];
      if (oaNormStockDate_(r[0]) !== dateStr) continue;
      if (oaOutletKey_(r[1]) !== oKey) continue;
      rowByKey[oaItemKey_(r[2], r[3])] = t.startRow + i;
    }

    var imStock = oaLoadItemMaster_();

    if (imStock.ok) rows = oaExpandRuleRows_(rows, oaDisplayCatalog_(imStock), "qty");
    var skippedStock = 0;

    var updates = [], appends = [];
    rows.forEach(function(it) {
      var name = (it.name || "").toString().trim();
      if (!name) return;
      var qty = Number(it.qty);
      if (!isFinite(qty) || qty < 0) return;
      if (imStock.ok) {
        var mStock = oaResolveMasterItem_(imStock, it.code, name);
        if (!mStock) { skippedStock++; return; }
        name = mStock.name;
        it = { code: mStock.code || it.code, name: name, unit: mStock.unit || it.unit, qty: qty };
      }
      var rec = [dateStr, oKey, (it.code || "").toString().trim(), name,
                 (it.unit || "").toString().trim(), qty, filledBy,
                 (payload.userId || "").toString(), stamp];
      var k = oaItemKey_(it.code, name);
      if (rowByKey[k]) updates.push({ row: rowByKey[k], values: rec });
      else appends.push(rec);
    });

    if (!updates.length && !appends.length) {
      return { success: false, message: "No valid quantities to save — check the values entered." };
    }

    updates.sort(function(a, b) { return a.row - b.row; });
    var run = [];
    for (var j = 0; j < updates.length; j++) {
      if (run.length && updates[j].row !== run[run.length - 1].row + 1) {
        t.sheet.getRange(run[0].row, 1, run.length, OA_CS_HEADERS.length)
               .setValues(run.map(function(x) { return x.values; }));
        run = [];
      }
      run.push(updates[j]);
    }
    if (run.length) {
      t.sheet.getRange(run[0].row, 1, run.length, OA_CS_HEADERS.length)
             .setValues(run.map(function(x) { return x.values; }));
    }

    if (appends.length) {
      var start = t.sheet.getLastRow() + 1;
      t.sheet.getRange(start, 1, appends.length, OA_CS_HEADERS.length).setValues(appends);
      t.sheet.getRange(start, 1, appends.length, 1).setNumberFormat("@");
    }

    SpreadsheetApp.flush();
    return {
      success: true,
      message: "Closing stock saved for " + oaOutletNameFromKey_(oKey) + " — " + dateStr +
               (skippedStock ? " (" + skippedStock + " inactive item(s) skipped)" : ""),
      saved: updates.length + appends.length,
      updated: updates.length,
      added: appends.length,
      skippedInactive: skippedStock,
      dateStr: dateStr
    };
  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function oaSaveStandardQty_(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { success: false, message: "System busy, please try again." };
  }
  try {
    payload = payload || {};
    var oKey = oaOutletKey_(payload.outletKey);
    if (!oKey || oKey === "HQ") return { success: false, message: "Select an outlet first." };

    var coverDays = parseInt(payload.coverDays, 10);
    if (!coverDays || coverDays < 2 || coverDays > 7) coverDays = OA_DEFAULT_COVER_DAYS;

    var rows = payload.rows || [];
    if (!rows.length) return { success: false, message: "Nothing to save." };

    var updatedBy = (payload.userName || "") + (payload.userId ? " (" + payload.userId + ")" : "");
    var stamp = oaFormatDateDDMMYYYY_(new Date());

    var res = oaReadStandardQtyRows_();
    var rowByKey = {};
    for (var i = 0; i < res.rows.length; i++) {
      if (oaOutletKey_(res.rows[i][0]) !== oKey) continue;
      rowByKey[oaItemKey_(res.rows[i][1], res.rows[i][2])] = i + 2;
    }

    var imStd = oaLoadItemMaster_();
    var skippedStd = 0;

    var updates = [], appends = [], cleared = 0;
    rows.forEach(function(it) {
      var name = (it.name || "").toString().trim();
      if (!name) return;
      var std = Number(it.stdQty);
      if (!isFinite(std) || std < 0) return;
      if (imStd.ok) {
        var mStd = oaResolveMasterItem_(imStd, it.code, name);
        if (!mStd) { skippedStd++; return; }
        name = mStd.name;
        it = { code: mStd.code || it.code, name: name, unit: mStd.unit || it.unit, stdQty: std };
      }
      var perDay = oaRound2_(std / coverDays);
      var rec = [oKey, (it.code || "").toString().trim(), name, (it.unit || "").toString().trim(),
                 perDay, coverDays, oaRound2_(std), updatedBy, stamp];
      if (std === 0) cleared++;
      var k = oaItemKey_(it.code, name);
      if (rowByKey[k]) updates.push({ row: rowByKey[k], values: rec });
      else appends.push(rec);
    });

    if (!updates.length && !appends.length) {
      return { success: false, message: "No valid quantities to save — check the values entered." };
    }

    updates.sort(function(a, b) { return a.row - b.row; });
    var run = [];
    for (var j = 0; j < updates.length; j++) {
      if (run.length && updates[j].row !== run[run.length - 1].row + 1) {
        res.sheet.getRange(run[0].row, 1, run.length, OA_SQ_HEADERS.length)
                 .setValues(run.map(function(x) { return x.values; }));
        run = [];
      }
      run.push(updates[j]);
    }
    if (run.length) {
      res.sheet.getRange(run[0].row, 1, run.length, OA_SQ_HEADERS.length)
               .setValues(run.map(function(x) { return x.values; }));
    }

    if (appends.length) {
      res.sheet.getRange(res.sheet.getLastRow() + 1, 1, appends.length, OA_SQ_HEADERS.length).setValues(appends);
    }

    SpreadsheetApp.flush();
    return {
      success: true,
      message: "Standard quantity saved for " + oaOutletNameFromKey_(oKey) + " (" + coverDays + "-day basis)" +
               (skippedStd ? " — " + skippedStd + " inactive item(s) skipped" : ""),
      saved: updates.length + appends.length,
      skippedInactive: skippedStd,
      coverDays: coverDays
    };
  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function oaGetOrderModeData_(outletKeyRaw) {
  try {
    var oKey = oaOutletKey_(outletKeyRaw);

    var im = oaLoadItemMaster_();
    if (!im.ok) {
      return { success: false, masterOk: false, message: im.error,
               items: [], categories: [], subs: [], units: [] };
    }
    var usage = (oKey && oKey !== "HQ") ? oaGetOutletUsage_(oKey) : {};
    var mlMap = (oKey && oKey !== "HQ") ? oaGetMaxLevelMap_(oKey) : {};

    var byName = {};
    Object.keys(usage).forEach(function(k) {
      var u = usage[k];
      if (u && u.name) byName[oaNormKey_(u.name)] = u;
    });

    var disp = oaDisplayCatalog_(im);

    var subs = {}, units = {}, maxLevelCount = 0;
    var items = disp.items.map(function(rec) {
      var parts = rec.isGroup ? rec.members : [rec];
      var u = { times: 0, typicalQty: 0, lastQty: 0, perDay: 0 };
      var ml = null;
      parts.forEach(function (p) {
        var pu = byName[oaNormKey_(p.name)] || {};
        ["times", "typicalQty", "lastQty", "perDay"].forEach(function (f) {
          var v = Number(pu[f]) || 0;
          if (v > u[f]) u[f] = v;
        });
        var pm = oaMaxLevelFor_(mlMap, p);
        if (pm && (ml === null || pm.maxLevel > ml)) ml = pm.maxLevel;
      });
      if (ml !== null) maxLevelCount++;
      if (rec.sub) subs[rec.sub] = true;
      if (rec.unit) units[rec.unit] = true;
      return {
        code: rec.code,
        name: rec.name,
        category: rec.category,
        sub: rec.sub,
        unit: rec.unit,
        isGroup: !!rec.isGroup,
        groupId: rec.groupId || "",
        members: rec.members || null,
        codeLabel: rec.codeLabel || rec.code,
        multiple: rec.multiple || 0,
        times: u.times,
        typicalQty: u.typicalQty,
        lastQty: u.lastQty,
        perDay: u.perDay,
        maxLevel: ml
      };
    });

    var catOrder = oaSortCatalogForDisplay_(items);

    var sortKeys = function(o) { return Object.keys(o).sort(function(a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : 1; }); };
    return {
      success: true,
      masterOk: true,
      catalogSig: oaCatalogSig_(im),
      catalogCount: im.count,
      outletKey: oKey,
      outletName: (oKey && oKey !== "HQ") ? oaOutletNameFromKey_(oKey) : "",
      maxLevelCount: maxLevelCount,
      items: items,
      categories: catOrder,
      subs: sortKeys(subs),
      units: sortKeys(units),
      lookbackDays: OA_STD_LOOKBACK_DAYS
    };
  } catch (e) {
    return { success: false, masterOk: false, message: "Error: " + e.message,
             items: [], categories: [], subs: [], units: [] };
  }
}

function oaSortCatalogForDisplay_(items) {
  var cats = {};
  (items || []).forEach(function (it) { if (it && it.category) cats[it.category] = true; });
  var catOrder = Object.keys(cats).sort(function (a, b) {
    var x = a.toLowerCase(), y = b.toLowerCase();
    return x < y ? -1 : (x > y ? 1 : 0);
  });
  var catRank = {};
  catOrder.forEach(function (c, i) { catRank[c] = i; });
  items.forEach(function (it) {
    it.catRank = (it.category && catRank[it.category] !== undefined) ? catRank[it.category] : 999999;
  });
  items.sort(function (a, b) {
    if (a.catRank !== b.catRank) return a.catRank - b.catRank;
    var an = (a.name || "").toLowerCase(), bn = (b.name || "").toLowerCase();
    return an < bn ? -1 : (an > bn ? 1 : 0);
  });
  return catOrder;
}

function oaAppendRowsSafe_(sheet, rows) {
  if (!rows || !rows.length) return 0;
  var at = sheet.getLastRow() + 1;
  var need = at + rows.length - 1;
  var maxRows = sheet.getMaxRows();
  if (need > maxRows) sheet.insertRowsAfter(maxRows, need - maxRows);
  var width = rows[0].length;
  var maxCols = sheet.getMaxColumns();
  if (width > maxCols) sheet.insertColumnsAfter(maxCols, width - maxCols);
  sheet.getRange(at, 1, rows.length, width).setValues(rows);
  return at;
}

function oaFindUserRow_(userId) {
  var vu = oaVu_(userId); if (vu) return { userId: vu.userId, name: vu.name, outletId: vu.outletId, shortName: vu.shortName, email: vu.email, active: true, isHq: !!vu.isHq, isDispatch: false, key: vu.key };
  try {
    var want = oaNormKey_(userId);
    if (!want) return null;
    var sheet = oaSS_().getSheetByName("Users");
    if (!sheet || sheet.getLastRow() < 2) return null;
    var data = sheet.getDataRange().getValues();
    var h = data[0];
    var c = {
      id: h.indexOf("User ID"), name: h.indexOf("Name"), outletId: h.indexOf("Outlet id"),
      shortName: h.indexOf("Outlet Short Name"), status: h.indexOf("Status"), email: h.indexOf("Email")
    };
    if (c.id < 0) return null;
    var cell = function (row, col) { return col >= 0 ? oaNormText_(row[col]) : ""; };
    for (var r = 1; r < data.length; r++) {
      if (oaNormKey_(data[r][c.id]) !== want) continue;
      var outletId = cell(data[r], c.outletId);
      var shortName = cell(data[r], c.shortName);
      var status = cell(data[r], c.status);
      return {
        userId: cell(data[r], c.id),
        name: cell(data[r], c.name),
        outletId: outletId,
        shortName: shortName,
        email: cell(data[r], c.email),
        active: !status || oaNormKey_(status) === "ACTIVE",
        isHq: oaIsHqKey_(outletId, shortName),
        isDispatch: oaIsDispatchByOutlet_(outletId),
        key: oaOutletKey_(shortName) || oaOutletKey_(outletId)
      };
    }
    return null;
  } catch (e) { return null; }
}

function oaResolveOutletAccess_(userId, requestedKey) {
  var u = oaFindUserRow_(userId);
  if (!u) return { ok: false, message: "Your login was not found - please log out and log in again." };
  if (!u.active) return { ok: false, message: "Account inactive. Contact admin." };
  if (u.isDispatch) return { ok: false, message: "The dispatch login cannot set Max Level." };
  if (u.isHq) {
    var k = oaOutletKey_(requestedKey);
    if (!k || k === "HQ") return { ok: false, message: "Select an outlet first." };
    return { ok: true, key: k, user: u };
  }
  if (!u.key || u.key === "HQ") return { ok: false, message: "No outlet is assigned to this login." };
  return { ok: true, key: u.key, user: u };
}

var OA_ML_SHEET     = "MaxLevel";
var OA_ML_HEADERS   = ["Outlet", "Item Code", "Item Name", "Unit", "Max Level", "Updated By", "Updated At"];
var OA_ML_MAX_VALUE = 100000;

function oaEnsureMaxLevelSheet_() { return oaEnsureStockSheet_(OA_ML_SHEET, OA_ML_HEADERS, []); }

function oaReadMaxLevelRows_() {
  var sh = oaEnsureMaxLevelSheet_();
  var last = sh.getLastRow();
  if (last < 2) return { sheet: sh, rows: [] };
  return { sheet: sh, rows: sh.getRange(2, 1, last - 1, OA_ML_HEADERS.length).getValues() };
}

function oaGetMaxLevelMap_(oKey) {
  var map = {};
  if (!oKey || oKey === "HQ") return map;
  try {
    var res = oaReadMaxLevelRows_();
    for (var i = 0; i < res.rows.length; i++) {
      var r = res.rows[i];
      if (oaOutletKey_(r[0]) !== oKey) continue;
      if (r[4] === "" || r[4] === null) continue;
      var v = Number(r[4]);
      if (!isFinite(v) || v < 0) continue;
      var rec = { maxLevel: oaRound2_(v), updatedBy: oaNormText_(r[5]), updatedAt: oaNormText_(r[6]) };
      map[oaItemKey_(r[1], r[2])] = rec;
      if (oaNormText_(r[2])) map[oaItemKey_("", r[2])] = rec;
    }
  } catch (e) { Logger.log("getMaxLevelMap_ error: " + e.message); }
  return map;
}

function oaMaxLevelFor_(map, rec) {
  if (!map || !rec) return null;
  return map[oaItemKey_(rec.code, rec.name)] || map[oaItemKey_("", rec.name)] || null;
}

function oaGetMaxLevelBoard_(params) {
  try {
    params = params || {};
    var access = oaResolveOutletAccess_(params.userId, params.outletKey);
    if (!access.ok) return { success: false, message: access.message };
    var oKey = access.key;

    var im = oaLoadItemMaster_();
    if (!im.ok) return { success: false, message: "Item list unavailable - " + im.error };

    var mlMap = oaGetMaxLevelMap_(oKey);
    var disp = oaDisplayCatalog_(im);
    var setCount = 0;
    var items = disp.items.map(function (rec) {
      var parts = rec.isGroup ? rec.members : [rec];
      var ml = null, updatedAt = "";
      parts.forEach(function (p) {
        var pm = oaMaxLevelFor_(mlMap, p);
        if (pm && (ml === null || pm.maxLevel > ml)) { ml = pm.maxLevel; updatedAt = pm.updatedAt; }
      });
      if (ml !== null) setCount++;
      return {
        code: rec.code, name: rec.name, category: rec.category, sub: rec.sub, unit: rec.unit,
        isGroup: !!rec.isGroup, groupId: rec.groupId || "", members: rec.members || null,
        codeLabel: rec.codeLabel || rec.code, multiple: rec.multiple || 0,
        maxLevel: ml,
        updatedAt: updatedAt
      };
    });
    var catOrder = oaSortCatalogForDisplay_(items);

    return {
      success: true,
      outletKey: oKey,
      outletName: oaOutletNameFromKey_(oKey),
      isHq: !!access.user.isHq,
      setCount: setCount,
      catalogSig: oaCatalogSig_(im),
      categories: catOrder,
      items: items
    };
  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  }
}

function oaSaveMaxLevel_(payload) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); }
  catch (e) { return { success: false, message: "System busy, please try again." }; }
  try {
    payload = payload || {};
    var access = oaResolveOutletAccess_(payload.userId, payload.outletKey);
    if (!access.ok) return { success: false, message: access.message };
    var oKey = access.key;

    var rows = payload.rows || [];
    if (!rows.length) return { success: false, message: "Nothing to save." };

    var im = oaLoadItemMaster_();
    if (!im.ok) return { success: false, message: "Item list could not be read - " + im.error };

    rows = oaExpandRuleRows_(rows, oaDisplayCatalog_(im), "maxLevel");

    var res = oaReadMaxLevelRows_();
    var rowByKey = {};
    for (var i = 0; i < res.rows.length; i++) {
      var r = res.rows[i];
      if (oaOutletKey_(r[0]) !== oKey) continue;
      rowByKey[oaItemKey_(r[1], r[2])] = i + 2;
      if (oaNormText_(r[2]) && !rowByKey[oaItemKey_("", r[2])]) rowByKey[oaItemKey_("", r[2])] = i + 2;
    }

    var who = (payload.userName || access.user.name || "") + " (" + access.user.userId + ")";
    var stamp = oaFormatDateDDMMYYYY_(new Date());
    var updates = [], appends = [], seen = {}, skipped = 0, bad = 0, cleared = 0, setN = 0;

    rows.forEach(function (it) {
      if (!it) return;
      var m = oaResolveMasterItem_(im, it.code, it.name);
      if (!m) { skipped++; return; }
      var k = oaItemKey_(m.code, m.name);
      if (seen[k]) return;
      seen[k] = true;

      var raw = (it.maxLevel === null || it.maxLevel === undefined) ? "" : it.maxLevel.toString().trim();
      var val = "";
      if (raw !== "") {
        var n = Number(raw);
        if (!isFinite(n) || n < 0 || n > OA_ML_MAX_VALUE) { bad++; return; }
        val = oaRound2_(n);
        setN++;
      } else {
        cleared++;
      }
      var rec = [oKey, m.code || "", m.name, m.unit || "", val, who, stamp];
      var at = rowByKey[k] || rowByKey[oaItemKey_("", m.name)];
      if (at) updates.push({ row: at, values: rec });
      else if (val !== "") appends.push(rec);
    });

    if (!updates.length && !appends.length) {
      if (bad) return { success: false, message: "Check the values - Max Level must be a number from 0 to " + OA_ML_MAX_VALUE + "." };
      if (skipped) return { success: false, message: "These items are no longer Active in the Item Master. Tap Refresh." };
      return { success: true, saved: 0, message: "Nothing changed." };
    }

    updates.sort(function (a, b) { return a.row - b.row; });
    var run = [];
    var flush = function () {
      if (!run.length) return;
      res.sheet.getRange(run[0].row, 1, run.length, OA_ML_HEADERS.length)
               .setValues(run.map(function (x) { return x.values; }));
      run = [];
    };
    for (var j = 0; j < updates.length; j++) {
      if (run.length && updates[j].row !== run[run.length - 1].row + 1) flush();
      run.push(updates[j]);
    }
    flush();
    oaAppendRowsSafe_(res.sheet, appends);
    SpreadsheetApp.flush();

    var parts = [];
    if (setN) parts.push(setN + " set");
    if (cleared) parts.push(cleared + " cleared");
    var msg = "Max Level saved for " + oaOutletNameFromKey_(oKey) + (parts.length ? " - " + parts.join(", ") : "");
    if (skipped) msg += " (" + skipped + " inactive item(s) skipped)";
    if (bad) msg += " (" + bad + " invalid value(s) ignored)";
    return {
      success: true, message: msg, outletKey: oKey,
      saved: updates.length + appends.length, set: setN, cleared: cleared,
      skippedInactive: skipped, invalid: bad
    };
  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

var OA_ITEM_MASTER_SOURCE_ID  = "";
var OA_ITEM_MASTER_SOURCE_TAB = "Master Item List";
var OA_ITEM_REQUEST_EXTRA_EMAILS = [];
var OA_ITEM_REQUEST_REPEAT_MINUTES = 30;

function oaItemMasterSource_() {
  var out = { id: OA_ITEM_MASTER_SOURCE_ID, tab: OA_ITEM_MASTER_SOURCE_TAB, from: OA_ITEM_MASTER_SOURCE_ID ? "setting" : "" };
  if (out.id) return out;
  try {
    var sh = oaSS_().getSheetByName(OA_ITEM_MASTER_SHEET);
    if (!sh) return out;
    var rows = Math.min(3, Math.max(1, sh.getLastRow()));
    var cols = Math.min(6, Math.max(1, sh.getLastColumn()));
    var f = sh.getRange(1, 1, rows, cols).getFormulas();
    for (var r = 0; r < f.length; r++) {
      for (var c = 0; c < f[r].length; c++) {
        var m = /IMPORTRANGE\(\s*"([^"]+)"\s*[,;]\s*"([^"]+)"/i.exec(f[r][c] || "");
        if (!m) continue;
        var idm = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(m[1]);
        out.id = idm ? idm[1] : (/^[a-zA-Z0-9_-]{20,}$/.test(m[1]) ? m[1] : "");
        var tab = m[2].split("!")[0].trim();
        if (tab.charAt(0) === "'" && tab.charAt(tab.length - 1) === "'") tab = tab.slice(1, -1).replace(/''/g, "'");
        if (tab && m[2].indexOf("!") > -1) out.tab = tab;
        out.from = "formula";
        return out;
      }
    }
  } catch (e) {}
  return out;
}

function oaReadFullItemMaster_() {
  var cache = null, key = "cgFullIM_v1";
  try {
    cache = CacheService.getScriptCache();
    var hit = cache.get(key);
    if (hit) return JSON.parse(hit);
  } catch (e) {}

  var res = { ok: false, error: "", items: [] };
  try {
    var src = oaItemMasterSource_();
    if (!src.id) {
      res.error = "The Item Master file could not be found from the ItemMaster tab formula.";
      return res;
    }
    var ss = SpreadsheetApp.openById(src.id);
    fastOpen_(src.id);
    var sh = ss.getSheetByName(src.tab) || ss.getSheets()[0];
    var data = sh.getDataRange().getValues();
    if (data.length < 2) { res.error = "The Item Master is empty."; return res; }

    var idx = oaResolveItemMasterHeaders_(data[0]);
    if (idx.name < 0 || idx.status < 0) {
      idx = { status: 0, code: 1, name: 2, unit: 3, cat: 10, sub: 11 };
    }
    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var name = oaNormText_(row[idx.name]);
      if (!name || oaLooksLikeSheetError_(name)) continue;
      res.items.push({
        code: idx.code >= 0 ? oaNormText_(row[idx.code]) : "",
        name: name,
        unit: idx.unit >= 0 ? oaNormText_(row[idx.unit]) : "",
        category: idx.cat >= 0 ? oaNormText_(row[idx.cat]) : "",
        sub: idx.sub >= 0 ? oaNormText_(row[idx.sub]) : "",
        status: oaNormText_(row[idx.status]) || "(blank)"
      });
    }
    res.ok = true;
  } catch (e) {
    res.ok = false;
    res.error = "The Item Master file could not be opened (" + e.message + ").";
    return res;
  }
  try {
    var json = JSON.stringify(res);
    if (cache && json.length < 95000) cache.put(key, json, 600);
  } catch (e) {}
  return res;
}

function oaFindInFullMaster_(full, code, name) {
  if (!full || !full.ok) return null;
  var c = oaNormKey_(code), n = oaNormKey_(name), s = oaSquashKey_(name);
  var i, it;
  if (c) for (i = 0; i < full.items.length; i++) { it = full.items[i]; if (it.code && oaNormKey_(it.code) === c) return it; }
  if (n) for (i = 0; i < full.items.length; i++) { it = full.items[i]; if (oaNormKey_(it.name) === n) return it; }
  if (s) for (i = 0; i < full.items.length; i++) { it = full.items[i]; if (oaSquashKey_(it.name) === s) return it; }
  return null;
}

function oaGetItemRequestData_() {
  var full = oaReadFullItemMaster_();
  var im = oaLoadItemMaster_();
  var inactive = [];
  if (full.ok) {
    full.items.forEach(function (it) {
      if (oaIsOrderableStatus_(it.status)) return;
      if (im.ok && oaResolveMasterItem_(im, it.code, it.name)) return;
      inactive.push({ code: it.code, name: it.name, unit: it.unit, category: it.category, status: it.status });
    });
  }
  return { success: true, sourceOk: full.ok, error: full.error || "", inactive: inactive };
}

function oaItemRequestRecipients_() {
  var seen = {}, out = [];
  var add = function (e) {
    e = oaNormText_(e);
    if (!e || e.indexOf("@") < 1) return;
    var k = e.toLowerCase();
    if (seen[k]) return;
    seen[k] = true; out.push(e);
  };
  oaGetEmailList_().forEach(function (x) { add(x.email); });
  (OA_ITEM_REQUEST_EXTRA_EMAILS || []).forEach(add);
  return out;
}

function oaHtmlEsc_(s) {
  return oaNormText_(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function oaSubmitItemRequest_(payload) {
  try {
    payload = payload || {};
    var typed = oaNormText_(payload.name).substring(0, 120);
    if (typed.length < 2) return { success: false, message: "Type the item name first." };

    var user = oaFindUserRow_(payload.userId);
    if (!user) return { success: false, message: "Your login was not found - please log out and log in again." };
    if (!user.active) return { success: false, message: "Account inactive. Contact admin." };

    var im = oaLoadItemMaster_(true);
    var act = im.ok ? oaResolveMasterItem_(im, payload.code, typed) : null;
    if (act) {
      return { success: false, active: true,
               message: '"' + act.name + '" is already Active - add it from the item list.' };
    }

    var full = oaReadFullItemMaster_();
    var match = oaFindInFullMaster_(full, payload.code, typed);
    var type = match ? "activate" : "new";

    var outletName = user.isDispatch ? "Dispatch" : oaOutletDisplayName_(user.shortName || user.outletId);
    var cacheKey = "cgItemReq_" + oaSquashKey_(user.key || user.outletId) + "_" +
                   oaSquashKey_(match ? (match.code || match.name) : typed).substring(0, 80);
    var cache = null;
    try { cache = CacheService.getScriptCache(); if (cache.get(cacheKey)) {
      return { success: false, duplicate: true,
               message: "Already requested from " + outletName + " a few minutes ago - no need to send it again." };
    } } catch (e) {}

    var to = oaItemRequestRecipients_();
    if (!to.length) return { success: false, message: "No one to send it to - add an e-mail address to the EmailList sheet." };

    var who = (oaNormText_(payload.userName) || user.name || "") + " (" + user.userId + ")";
    var when = oaFormatDateDDMMYYYY_(new Date());
    var subject = (type === "activate" ? "Item Activation Request: " + match.name : "New Item Request: " + typed) +
                  " - " + outletName;

    var row = function (k, v) {
      return '<tr><td style="padding:7px 10px;border:1px solid #E8D5C0;background:#FFF8E7;color:' + OA_BRAND_PRIMARY +
             ';font-weight:bold;white-space:nowrap">' + k + '</td><td style="padding:7px 10px;border:1px solid #E8D5C0">' + v + '</td></tr>';
    };
    var rows = row("Request", type === "activate" ? "Make this item Active" : "Add this new item to the Item Master") +
               row("Typed by outlet", oaHtmlEsc_(typed));
    if (match) {
      rows += row("Item in Item Master", oaHtmlEsc_(match.name)) +
              row("Item Code", oaHtmlEsc_(match.code || "-")) +
              row("Current Status", '<b style="color:#b91c1c">' + oaHtmlEsc_(match.status) + '</b>') +
              row("Category", oaHtmlEsc_([match.category, match.sub].filter(String).join(" / ") || "-")) +
              row("Unit", oaHtmlEsc_(match.unit || "-"));
    } else if (!full.ok) {
      rows += row("Item Master check", "Could not be checked - " + oaHtmlEsc_(full.error));
    } else {
      rows += row("Item Master check", "Not found under any status");
    }
    rows += row("Outlet", oaHtmlEsc_(outletName)) + row("Requested by", oaHtmlEsc_(who)) + row("Time", oaHtmlEsc_(when));

    var html = '<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">' +
      '<div style="background:' + OA_BRAND_PRIMARY + ';padding:18px;text-align:center;border-radius:12px 12px 0 0;">' +
        '<h2 style="color:white;margin:0;">' + (type === "activate" ? "Item Activation Request" : "New Item Request") + '</h2>' +
      '</div>' +
      '<div style="padding:20px;background:white;border:1px solid ' + OA_BRAND_CREAM + ';">' +
        '<table style="border-collapse:collapse;width:100%;font-size:14px">' + rows + '</table>' +
        '<p style="color:#64748b;font-size:12px;margin-top:14px">Sent from the ' + OA_APP_NAME + ' order app (Item Suggestion). ' +
        'Nothing was added to any order.</p>' +
      '</div>' +
      '<div style="background:#FFF8E7;padding:10px;text-align:center;border-radius:0 0 12px 12px;border:1px solid ' + OA_BRAND_CREAM + ';border-top:none;">' +
        '<p style="color:' + OA_BRAND_PRIMARY + ';font-size:12px;margin:0;">' + OA_APP_NAME + '</p>' +
      '</div></div>';
    var plain = subject + "\nTyped: " + typed + "\nOutlet: " + outletName + "\nBy: " + who + "\nTime: " + when;

    var opts = { htmlBody: html, name: OA_APP_NAME };
    if (user.email && user.email.indexOf("@") > 0) opts.replyTo = user.email;

    var sent = 0;
    to.forEach(function (addr) {
      try { MailApp.sendEmail(addr, subject, plain, opts); sent++; } catch (e) { Logger.log("item request mail failed: " + e.message); }
    });
    if (!sent) return { success: false, message: "The e-mail could not be sent. Please try again." };

    try { if (cache) cache.put(cacheKey, "1", OA_ITEM_REQUEST_REPEAT_MINUTES * 60); } catch (e) {}

    return {
      success: true,
      type: type,
      itemName: match ? match.name : typed,
      status: match ? match.status : "",
      message: type === "activate"
        ? "Activation request sent for " + match.name
        : 'Request sent for new item "' + typed + '"'
    };
  } catch (e) {
    return { success: false, message: "Error: " + e.message };
  }
}

var oaUser_ = null;

function oaSS_() { return extSS_(set_('Outlet Orders Sheet ID')); }
function oaAppUrl_() { return set_('Outlet Order App URL', ''); }
function oaVu_(id) {
  if (!oaUser_ || id === null || id === undefined) return null;
  return oaNormKey_(id) === oaNormKey_(oaUser_.userId) ? oaUser_ : null;
}

function oaHq_(ctx) { return !!(ctx.super || /^(director|misadmin)$/.test(norm_(ctx.role))); }
function oaCanDispatch_(ctx) { return !!(ctx.super || can_(ctx, 'order_dispatch')); }

function oaKeyOf_(o) {
  var tries = [o.short, o.code, o.orderName, o.name];
  for (var i = 0; i < tries.length; i++) {
    var k = oaOutletKey_(tries[i]);
    if (k && OA_OUTLET_KEY_NAME[k]) return k;
  }
  return oaOutletKey_(o.short || o.code || o.name);
}

function oaOutlets_(ctx) {
  return ctx.outlets.map(outletById_).filter(function (o) { return o && o.type === 'Outlet'; }).map(function (o) {
    var key = oaKeyOf_(o);
    return { id: o.id, key: key, code: o.code || key, name: OA_OUTLET_KEY_NAME[key] || o.orderName || ('CG ' + o.name) };
  }).filter(function (o) { return o.key && o.key !== 'HQ'; });
}

function oaUse_(ctx, pick) {
  var list = oaOutlets_(ctx), hq = oaHq_(ctx), want = str_(pick), o = null;
  if (want && want !== 'HQ') {
    o = list.filter(function (x) { return x.id === want || x.key === want; })[0];
    if (!o) throw new Error('That outlet is not linked to your login.');
  }
  if (!o && !(hq && want === 'HQ')) o = list.filter(function (x) { return x.id === ctx.home; })[0] || list[0] || null;
  var id = str_(ctx.mobile) || ctx.uid, disp = oaCanDispatch_(ctx);
  if (!o && !hq && !disp) throw new Error('No outlet is linked to your login. Please contact MIS.');
  var u = { userId: id, name: ctx.name, email: ctx.email || '', canDispatch: disp, outlets: list, hq: hq };
  if (o) Object.assign(u, { outletId: o.code, shortName: o.key, key: o.key, outletFullName: o.name, isHq: false, pick: o.id });
  else if (hq) Object.assign(u, { outletId: 'HQ-001', shortName: 'HQ', key: 'HQ', outletFullName: 'All outlets (HQ)', isHq: true, pick: 'HQ' });
  else Object.assign(u, { outletId: OA_DISPATCH_OUTLET_ID, shortName: OA_DISPATCH_OUTLET_ID, key: '', outletFullName: 'Dispatch', isHq: false, dispatchOnly: true, pick: '' });
  oaUser_ = u;
  return u;
}

function oaClient_(u) {
  return { userId: u.userId, name: u.name, email: u.email, outletId: u.outletId, outletShortName: u.shortName, outletFullName: u.outletFullName,
    isAdmin: !!u.isHq, isDispatch: !!u.dispatchOnly, canDispatch: !!u.canDispatch };
}

function oaBoot_(ctx, d) {
  var u = oaUse_(ctx, d.outlet);
  var picks = u.outlets.map(function (o) { return { id: o.id, name: o.name }; });
  if (u.hq) picks.unshift({ id: 'HQ', name: 'All outlets (HQ view)' });
  return { user: oaClient_(u), picks: picks, pick: u.pick, hq: u.hq, canDispatch: u.canDispatch, dispatchOnly: !!u.dispatchOnly,
    orderUrl: oaAppUrl_() };
}

function oaBootData_(u) {
  try { oaEnsureItemRulesSheet_(); } catch (e) {}
  return {
    catalog: oaGetCatalog_(),
    config: oaGetAppConfig_(),
    stockOutlets: u.isHq ? oaGetStockOutlets_(u.outletId, u.shortName) : { isHq: false, outlets: u.key ? [{ key: u.key, name: oaOutletNameFromKey_(u.key) }] : [] },
    orderModeData: u.dispatchOnly ? null : oaGetOrderModeData_(u.shortName)
  };
}

function oaKeyFor_(u, asked) {
  if (u.isHq) {
    var k = oaOutletKey_(asked);
    if (!k || k === 'HQ') throw new Error('Select an outlet first.');
    return k;
  }
  if (!u.key) throw new Error('No outlet is linked to your login.');
  return u.key;
}

function oaMine_(u, orderNo, outletCell) {
  if (u.isHq || !u.key) return false;
  var m = str_(orderNo).toUpperCase().match(/^PO([A-Z]+)\d{2}\//);
  if (m) return m[1] === u.key;
  return oaOutletKey_(outletCell) === u.key;
}

function oaHistory_(u) {
  var keep = oaUser_;
  oaUser_ = Object.assign({}, u, { outletId: 'HQ-001' });
  var list;
  try { list = oaGetOrderHistory_(u.userId, true); } finally { oaUser_ = keep; }
  if (u.isHq) return list;
  return list.filter(function (o) { return oaMine_(u, o.orderNo, o.outletShortName); }).map(function (o) { o.mine = true; return o; });
}

function oaNeedDispatch_(u) { if (!u.canDispatch) throw new Error('Dispatch is for the GFP store. Ask MIS for "Orders — Dispatch" access.'); }

function oaArgs_(d) { return Array.isArray(d.args) ? d.args : []; }

function oaRead_(ctx, d) {
  var u = oaUse_(ctx, d.outlet), a = oaArgs_(d), p = a[0] && typeof a[0] === 'object' ? a[0] : {};
  switch (str_(d.fn)) {
    case 'getCatalog': return oaGetCatalog_();
    case 'getCatalogSignature': return oaGetCatalogSignature_();
    case 'getAppBootstrap': return oaBootData_(u);
    case 'getOrderModeData': return oaGetOrderModeData_(u.isHq ? str_(a[0]) || 'HQ' : u.shortName);
    case 'getStockBoard': return oaGetStockBoard_(Object.assign({}, p, { outletKey: oaKeyFor_(u, p.outletKey) }));
    case 'getMaxLevelBoard': return oaGetMaxLevelBoard_({ userId: u.userId, outletKey: u.isHq ? p.outletKey : u.key });
    case 'getItemRequestData': return oaGetItemRequestData_();
    case 'getOrderHistory': return oaHistory_(u);
    case 'getDispatchOrders': oaNeedDispatch_(u); return oaDispatchWithNd_(oaGetDispatchOrders_(u.userId));
  }
  throw new Error('Unknown order request.');
}

function oaWrite_(ctx, d) {
  var u = oaUse_(ctx, d.outlet), a = oaArgs_(d), p = a[0] && typeof a[0] === 'object' ? a[0] : {}, fn = str_(d.fn), r;
  var who = { userId: u.userId, userName: u.name };
  switch (fn) {
    case 'saveStandardQty': r = oaSaveStandardQty_(Object.assign({}, p, who, { outletKey: oaKeyFor_(u, p.outletKey) })); break;
    case 'saveClosingStock': r = oaSaveClosingStock_(Object.assign({}, p, who, { outletKey: oaKeyFor_(u, p.outletKey) })); break;
    case 'saveMaxLevel':
      r = oaSaveMaxLevel_(Object.assign({}, p, who, { outletKey: u.isHq ? p.outletKey : u.key }));
      if (r && r.success) log_(ctx, 'Max Level saved', (u.isHq ? str_(p.outletKey) : u.key) + ' · ' + (r.saved || 0) + ' items');
      break;
    case 'submitItemRequest': r = oaSubmitItemRequest_(Object.assign({}, p, who)); break;
    case 'saveDispatchQty':
      oaNeedDispatch_(u);
      var nd = oaNdRows_(u, p);
      if (nd.rows.length) ndCheck_(nd.rows);
      r = oaSaveDispatchQty_(Object.assign({}, p, who));
      if (r && r.success) {
        dropOrderCache_(); log_(ctx, 'Dispatch qty saved', str_(p.orderNo));
        if (nd.order) {
          try {
            var s0 = ndSync_(ctx, nd.order, nd.rows), n0 = s0.added + s0.changed;
            if (n0 || s0.removed) r.message += ' Item Not Dispatch: ' + [n0 ? n0 + ' item' + (n0 === 1 ? '' : 's') + ' recorded' : '', s0.removed ? s0.removed + ' removed (dispatched in full)' : ''].filter(String).join(', ') + '.';
          } catch (e) { r.message += ' Item Not Dispatch was not written: ' + e.message; }
        }
      }
      break;
    case 'updateOrderQuantity': r = oaUpdate_(ctx, u, str_(a[0]), a[1] || []); break;
    case 'processOrder': r = oaPlace_(ctx, u, a[0] || {}); break;
    default: throw new Error('Unknown order request.');
  }
  return r;
}

function oaDispatchWithNd_(res) {
  if (!res || res.success === false) return res;
  var orders = res.orders || [], idx = ndIndex_(orders.map(function (o) { return o.orderNo; }));
  orders.forEach(function (o) {
    o.items.forEach(function (it) {
      var x = idx[ndKey_(o.orderNo, it.code, '')] || idx[ndKey_(o.orderNo, '', it.name)];
      it.ndReason = x ? x.reason : ''; it.ndRemark = x ? x.remark : '';
    });
  });
  res.reasons = ndReasons_();
  return res;
}
function oaNdRows_(u, p) {
  var no = str_(p.orderNo), list = oaGetDispatchOrders_(u.userId), order = ((list && list.orders) || []).filter(function (o) { return o.orderNo === no; })[0];
  if (!order) return { order: null, rows: [] };
  var by = {};
  order.items.forEach(function (it) { if (it.code) by['C' + norm_(it.code)] = it; by['N' + norm_(it.name)] = it; });
  var rows = (p.rows || []).map(function (r) {
    var it = (r.code && by['C' + norm_(r.code)]) || by['N' + norm_(r.name)]; if (!it) return null;
    var raw = str_(r.dispatchQty), dq = raw === '' ? '' : Number(raw);
    return { code: it.code, name: it.name, unit: it.unit, ordered: Number(it.qty) || 0, dispatch: dq, short: dq !== '' && dq < (Number(it.qty) || 0),
      reason: str_(r.reason), remark: str_(r.remark) };
  }).filter(Boolean);
  return { order: order, rows: rows };
}

function oaUpdate_(ctx, u, orderNo, items) {
  if (u.isHq || u.dispatchOnly) return { success: false, message: 'HQ Admins cannot edit orders.' };
  if (!oaMine_(u, orderNo, '')) return { success: false, message: 'You can only edit the orders of your own outlet.' };
  var meta = oaGetOrderMeta_(orderNo), keep = oaUser_;
  oaUser_ = Object.assign({}, u, { userId: meta.userId || u.userId });
  var r;
  try { r = oaUpdateOrderQuantity_(orderNo, items, oaUser_.userId); } finally { oaUser_ = keep; }
  if (r && r.success) { dropOrderCache_(); log_(ctx, 'GFP order updated', orderNo + ' · Rev.' + r.revision); }
  return r;
}

function oaPlace_(ctx, u, s) {
  if (u.dispatchOnly) return { success: false, message: 'The dispatch login cannot place orders.' };
  var sum = Object.assign({}, s, {
    outletShortName: u.shortName, outletFullName: u.outletFullName, userId: u.userId, userEmail: u.email,
    orderedBy: str_(s.orderedBy) || ctx.name, customerName: str_(s.customerName) || str_(s.orderedBy) || ctx.name
  });
  var r = lock_(function () { return oaProcessOrder_(sum, { saveToSheet: true }); });
  if (r && r.success) {
    dropOrderCache_();
    var lines = (sum.items || []).length;
    try {
      appendObj_(SH.ORDER_LOG, { 'Order No': r.orderNo, 'Outlet ID': u.pick || '', 'Outlet': u.outletFullName, 'Lines': lines, 'Total Qty': sum.totalQuantity || 0,
        'Placed By': ctx.uid, 'Placed By Name': ctx.name, 'Timestamp': new Date(), 'Email Status': str_(r.message).replace(/^\W+/, ''), 'Note': '' });
    } catch (e) {}
    log_(ctx, 'GFP order placed', r.orderNo + ' · ' + lines + ' lines');
  }
  return r;
}
