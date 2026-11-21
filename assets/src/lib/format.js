export function toNumber(val) {
    if (val === null || val === undefined || val === "")
        return null;
    if (typeof val === "number")
        return Number.isFinite(val) ? val : null;
    const cleaned = String(val)
        .replace(/\s|\u00a0|₽/g, "")
        .replace(",", ".");
    const match = cleaned.match(/-?\d+(?:\.\d+)?/);
    if (!match)
        return null;
    const num = Number(match[0]);
    return Number.isFinite(num) ? num : null;
}
export function formatRub(value) {
    const num = toNumber(value);
    if (num === null)
        return "—";
    const hasCents = Math.abs(num - Math.round(num)) >= 0.01;
    return (num.toLocaleString("ru-RU", {
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: hasCents ? 2 : 0,
    }) + " ₽");
}
export function formatMarginPct(tender) {
    const profit = toNumber(tender.profit);
    const nmck = toNumber(tender.nmck);
    if (profit === null || nmck === null || nmck <= 0)
        return null;
    const pct = (profit / nmck) * 100;
    return `${pct.toFixed(1)}%`;
}
const TRUSTED_RETAIL_DOMAINS = [
    "ozon.ru",
    "wildberries.ru",
    "market.yandex.ru",
    "megamarket.ru",
    "sbermegamarket.ru",
    "lenta.com",
    "metro-cc.ru",
    "auchan.ru",
    "dns-shop.ru",
    "citilink.ru",
    "mvideo.ru",
    "eldorado.ru",
    "e2e4online.ru",
    "onlinetrade.ru",
    "regard.ru",
    "nix.ru",
    "kns.ru",
    "knssibir.ru",
    "technopark.ru",
    "holodilnik.ru",
    "rbt.ru",
    "xcom-shop.ru",
    "vseinstrumenti.ru",
    "lemanapro.ru",
    "leroymerlin.ru",
    "petrovich.ru",
    "obi.ru",
    "maxidom.ru",
    "baucenter.ru",
    "kuvalda.ru",
    "220-volt.ru",
    "etm.ru",
    "chipdip.ru",
    "bigam.ru",
    "komus.ru",
    "officemag.ru",
    "vostok.ru",
    "technoavia.ru",
    "exist.ru",
    "autodoc.ru",
    "emex.ru",
    "apteka.ru",
    "eapteka.ru",
    "express-shina.ru",
    "reaktor24.ru",
];
export function isTrustedPublicOffer(url, priceOrMeta) {
    if (!url)
        return false;
    const lowMeta = String(priceOrMeta ?? "").toLowerCase();
    if (lowMeta.includes("по запросу") ||
        lowMeta.includes("ориентир") ||
        lowMeta.includes("не подтверждена") ||
        lowMeta.includes("цена не публичная") ||
        lowMeta.includes("оферта: нет")) {
        return false;
    }
    try {
        const raw = String(url).trim();
        const withProto = raw.includes("://") ? raw : `https://${raw}`;
        let host = new URL(withProto).hostname.toLowerCase();
        if (host.startsWith("www."))
            host = host.slice(4);
        return TRUSTED_RETAIL_DOMAINS.some((dom) => host === dom || host.endsWith(`.${dom}`));
    }
    catch {
        return false;
    }
}
export function isTenderAllPublicOffer(tender) {
    if (tender.price_request_status === "Публичная оферта")
        return true;
    const mailSellers = tender.details?.mail_state?.продавцы || [];
    if (mailSellers.length > 0 && mailSellers.every((s) => s.статус === "публичная_оферта")) {
        return true;
    }
    const chosenVar = tender.best_variant || tender.details?.calculation?.best_variant;
    const groups = extractSupplierGroups(tender);
    if (groups.length === 0)
        return false;
    return groups.every((g) => {
        const matching = chosenVar
            ? g.offers.filter((o) => o.variant.toUpperCase() === chosenVar.toUpperCase())
            : g.offers;
        const checkList = matching.length > 0 ? matching : g.offers;
        return checkList.some((o) => isTrustedPublicOffer(o.url, o.priceText || o.unitPrice));
    });
}
export function formatNskDateTime(iso, withYear = false) {
    if (!iso)
        return "—";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime()))
        return iso;
    const nsk = new Date(dt.getTime() + 7 * 3600 * 1000);
    const d = String(nsk.getUTCDate()).padStart(2, "0");
    const m = String(nsk.getUTCMonth() + 1).padStart(2, "0");
    const y = nsk.getUTCFullYear();
    const hh = String(nsk.getUTCHours()).padStart(2, "0");
    const mm = String(nsk.getUTCMinutes()).padStart(2, "0");
    return withYear ? `${d}.${m}.${y} ${hh}:${mm}` : `${d}.${m} ${hh}:${mm}`;
}
export function getDeadlineInfo(iso) {
    if (!iso) {
        return {
            label: "Срок не указан",
            nskFormatted: "—",
            hoursLeft: null,
            tone: "unknown",
        };
    }
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) {
        return {
            label: iso,
            nskFormatted: iso,
            hoursLeft: null,
            tone: "unknown",
        };
    }
    const hoursLeft = (dt.getTime() - Date.now()) / 3600000;
    const nskFormatted = formatNskDateTime(iso);
    if (hoursLeft <= 0) {
        return {
            label: "Срок истёк",
            nskFormatted,
            hoursLeft,
            tone: "expired",
        };
    }
    const totalHours = Math.round(hoursLeft);
    const label = totalHours < 48
        ? `ост. ${totalHours} ч`
        : `ост. ${Math.floor(totalHours / 24)} д ${totalHours % 24} ч`;
    const tone = hoursLeft < 48 ? "critical" : hoursLeft < 72 ? "warn" : "ok";
    return { label, nskFormatted, hoursLeft, tone };
}
export function extractSupplierGroups(tender) {
    const blocks = tender.details?.suppliers_prices;
    const groups = [];
    if (Array.isArray(blocks) && blocks.length > 0) {
        for (let idx = 0; idx < blocks.length; idx++) {
            const b = blocks[idx];
            const offers = [];
            if (b.variants && typeof b.variants === "object") {
                for (const [vKey, info] of Object.entries(b.variants)) {
                    if (!info)
                        continue;
                    const metaParts = [info.pack, info.country, info.registry ? `реестр: ${info.registry}` : null]
                        .filter(Boolean)
                        .join(" · ");
                    const parsedPrice = toNumber(info.price);
                    offers.push({
                        variant: vKey,
                        seller: info.supplier || "Поставщик",
                        unitPrice: parsedPrice,
                        priceText: parsedPrice === null && info.price ? String(info.price) : undefined,
                        phone: info.phone || undefined,
                        email: info.email || undefined,
                        url: info.link_url || undefined,
                        gisUrl: info.gis_url || undefined,
                        meta: metaParts || undefined,
                        country: info.country || undefined,
                        registry: info.registry || undefined,
                        nr: info.nr || undefined,
                    });
                }
            }
            else if (Array.isArray(b.offers)) {
                for (const o of b.offers) {
                    offers.push({
                        variant: o.variant || "—",
                        seller: o.seller || "Поставщик",
                        unitPrice: toNumber(o.unit_price),
                        address: o.address,
                        phone: o.phone,
                        email: o.email,
                        url: o.url,
                        note: o.availability,
                    });
                }
            }
            if (offers.length === 0)
                continue;
            groups.push({
                idx: idx + 1,
                position: b.title || b.position || `Позиция ${idx + 1}`,
                offers,
            });
        }
    }
    if (groups.length > 0)
        return groups;
    // Fallback для старых табличных цены.md: собираем поставщиков из подтверждение.json (mail_state)
    const ms = tender.details?.mail_state;
    if (ms && Array.isArray(ms.продавцы) && ms.продавцы.length > 0) {
        const posByIdx = new Map();
        const qtyByIdx = new Map();
        for (const p of ms.позиции || []) {
            if (p.idx) {
                posByIdx.set(p.idx, `${p.idx}. ${p.название || "Позиция"}${p.кол_во ? ` (${p.кол_во} ${p.единица || ""})` : ""}`);
                const q = toNumber(p.кол_во);
                if (q && q > 0)
                    qtyByIdx.set(p.idx, q);
            }
        }
        for (const it of tender.details?.items || []) {
            const idxNum = Number(it.idx ?? 0);
            const q = toNumber(it.quantity);
            if (idxNum > 0 && q && q > 0 && !qtyByIdx.has(idxNum)) {
                qtyByIdx.set(idxNum, q);
            }
        }
        const calcVars = tender.details?.calculation?.variants || {};
        const totalItemsCount = (tender.details?.items || []).length || (ms.позиции || []).length || 1;
        const offers = ms.продавцы.map((r) => {
            const firstAns = r.ответы ? Object.values(r.ответы)[0] : undefined;
            let ansPrice = toNumber(firstAns?.цена);
            const rawVar = r.вариант ||
                (Array.isArray(r.варианты)
                    ? r.варианты[0]
                    : null);
            const variantKey = typeof rawVar === "string" && rawVar.trim()
                ? rawVar.trim().toUpperCase()
                : r.роль === "основной"
                    ? "А"
                    : "Б";
            if (ansPrice === null) {
                const varCalc = calcVars[variantKey];
                const purchase = toNumber(varCalc?.purchase);
                const firstPosIdx = (r.позиции && r.позиции[0]) || 1;
                const posQty = qtyByIdx.get(firstPosIdx) ||
                    toNumber(tender.details?.items?.[0]?.quantity) ||
                    null;
                if (purchase !== null && posQty && posQty > 0 && totalItemsCount === 1) {
                    ansPrice = Math.round((purchase / posQty) * 100) / 100;
                }
            }
            const itemHint = (r.позиции || [])
                .map((i) => posByIdx.get(i) || `Позиция ${i}`)
                .join(", ");
            return {
                variant: variantKey,
                seller: r.продавец || "Поставщик",
                unitPrice: ansPrice,
                address: r.адрес || undefined,
                phone: r.телефон || undefined,
                email: r.email || undefined,
                url: r.сайт || undefined,
                gisUrl: r["2гис"] || undefined,
                status: r.статус || undefined,
                meta: itemHint || undefined,
                note: firstAns?.примечание || undefined,
            };
        });
        if (offers.length > 0) {
            return [{ idx: 1, position: "Поставщики по позициям", offers }];
        }
    }
    return [];
}
export function sanitizeTel(raw) {
    return raw.replace(/[^\d+]/g, "");
}
const REFUSAL_TEXT_RE = /(не\s+сможем\s+поставить|не\s+поставляем|нет\s+в\s+наличии|отсутствует\s+в\s+продаже|снят[оа]?\s+с\s+производства|отказ\s+в\s+поставке|не\s+занимаемся\s+поставк)/i;
/**
 * Единый шлагбаум клиентской Витрины ТендерМэн:
 * На Витрину допускаются ТОЛЬКО 100% готовые лоты:
 * - этап tenders и неистёкший срок подачи;
 * - prices_confirmed === true;
 * - вердикт Почтальона 'подтверждено' или 'публичная_оферта';
 * - подтверждённая прибыль >= 11 000 ₽;
 * - отсутствие отказов поставщиков (в_наличии === false);
 * - допуск ОТК Ревизора (details.qc.approved === true).
 */
export function isTenderStorefrontReady(t) {
    if (t.stage !== "tenders")
        return false;
    if (!t.deadline_at || getDeadlineInfo(t.deadline_at).tone === "expired")
        return false;
    if (!t.prices_confirmed)
        return false;
    const ms = t.details?.mail_state;
    const itog = ms?.итог;
    const effProfitRaw = itog?.прибыль_новая ?? t.profit;
    const effProfit = toNumber(effProfitRaw);
    if (effProfit === null || effProfit < 11000)
        return false;
    if (ms) {
        const verdict = String(itog?.вердикт || ms.статус || "").trim().toLowerCase();
        if (verdict &&
            !["подтверждено", "подтверждено_с_изменением", "публичная_оферта", "кп_собраны"].includes(verdict)) {
            return false;
        }
        const posList = itog?.позиции || [];
        for (const p of posList) {
            const pst = String(p?.статус || "").trim().toLowerCase();
            if (pst && !["подтверждено", "цена_изменилась", "публичная_оферта", "кп_получено"].includes(pst)) {
                return false;
            }
        }
        const chosenKeys = new Set(posList.map((p) => String(p?.key || "")).filter(Boolean));
        for (const s of ms.продавцы || []) {
            const sKey = String(s.key || "");
            if (chosenKeys.size > 0 && !chosenKeys.has(sKey))
                continue;
            if (chosenKeys.size === 0 && s.роль && s.роль !== "основной")
                continue;
            for (const ans of Object.values(s.ответы || {})) {
                if (!ans)
                    continue;
                if (ans.в_наличии === false)
                    return false;
                const txt = `${ans.цитата || ""} ${ans.примечание || ""}`.trim();
                if (txt && REFUSAL_TEXT_RE.test(txt))
                    return false;
            }
        }
    }
    const qc = t.details?.qc;
    if (!qc || qc.approved !== true)
        return false;
    return true;
}
export function resolveSellerConfirmationState(isPublicOffer, matchedMail, tenderConfirmed) {
    if (isPublicOffer) {
        return { state: "public_offer" };
    }
    if (matchedMail) {
        for (const ans of Object.values(matchedMail.ответы || {})) {
            if (!ans)
                continue;
            if (ans.в_наличии === false) {
                return {
                    state: "rejected",
                    refusalReason: ans.цитата || ans.примечание || "Поставщик сообщил об отказе в поставке.",
                };
            }
            const txt = `${ans.цитата || ""} ${ans.примечание || ""}`.trim();
            if (txt && REFUSAL_TEXT_RE.test(txt)) {
                return { state: "rejected", refusalReason: ans.цитата || ans.примечание || txt };
            }
        }
        const st = String(matchedMail.статус || "").trim().toLowerCase();
        const hasPositiveAns = Object.values(matchedMail.ответы || {}).some((ans) => ans && ans.в_наличии === true);
        if (st === "подтверждено" || (st === "ответил" && hasPositiveAns)) {
            return { state: "confirmed" };
        }
        return { state: "waiting" };
    }
    if (tenderConfirmed) {
        return { state: "confirmed" };
    }
    return { state: "waiting" };
}
export function getTenderLawAndType(t) {
    const rawLaw = String(t.details?.customer?.law || "").trim();
    const is223 = rawLaw.includes("223");
    const law = is223 ? "223-ФЗ" : rawLaw.includes("44") ? "44-ФЗ" : rawLaw || "44-ФЗ";
    const rawMethod = String(t.details?.customer?.method || "").trim();
    const lowMethod = rawMethod.toLowerCase();
    let procedureType = null;
    let procedureShort = null;
    let isQuoteRequest = false;
    if (lowMethod.includes("котиров")) {
        procedureType = "Запрос котировок";
        procedureShort = "Котировки";
        isQuoteRequest = true;
    }
    else if (lowMethod.includes("аукцион")) {
        procedureType = "Аукцион";
        procedureShort = "Аукцион";
    }
    else if (lowMethod.includes("конкурс")) {
        procedureType = "Конкурс";
        procedureShort = "Конкурс";
    }
    else if (lowMethod.includes("предложен")) {
        procedureType = "Запрос предложений";
        procedureShort = "Предложения";
    }
    else if (rawMethod) {
        const cap = rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1);
        procedureType = cap;
        procedureShort = cap;
    }
    return { law, is223, procedureType, procedureShort, isQuoteRequest };
}
export function getOfferNationalRegimeBadge(offer, nr) {
    if (!nr.active)
        return null;
    const nrNote = (offer.nr || "").trim();
    const nrLow = nrNote.toLowerCase();
    const country = (offer.country || "").trim();
    const reg = (offer.registry || "").trim();
    const combined = `${nrNote} ${country} ${reg}`.toLowerCase();
    const isRfEaeu = /(росси|\bрф\b|еаэс|беларус|казахстан|армени|киргиз|кыргыз)/i.test(combined);
    const isImport = /(китай|\bкнр\b|тайван|герман|япон|коре|сша|турц|инди|вьетнам|импорт)/i.test(combined) && !isRfEaeu;
    const hasRegNum = /\d{4,}/.test(reg) && !/(отсутств|нет\s+данн|нет\s+в\s+реестр)/i.test(reg);
    const passCls = "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    const riskCls = "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
    const failCls = "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    const unknownCls = "bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-500/25";
    if (/не\s+проход|не\s+подход|наруша|запрещен/i.test(nrLow)) {
        return {
            status: nr.kind === "запрет" ? "fail" : "risk",
            label: nr.kind === "запрет" ? "❌ Не проходит нацрежим" : "⚠️ Нацрежим: риск (импорт)",
            cls: nr.kind === "запрет" ? failCls : riskCls,
            note: nrNote || undefined,
        };
    }
    if (nr.hasException || /исключен|уведомлен\w*\s+минпромторг|не\s+применя/i.test(nrLow)) {
        return {
            status: "pass",
            label: "✅ Проходит нацрежим (исключение)",
            cls: passCls,
            note: nrNote || nr.exceptionNote || undefined,
        };
    }
    if (/проход|соблюда|подтвержд|соответств/i.test(nrLow) || hasRegNum) {
        return {
            status: "pass",
            label: hasRegNum ? "✅ Проходит нацрежим (ГИСП)" : "✅ Проходит нацрежим",
            cls: passCls,
            note: nrNote || undefined,
        };
    }
    if (isRfEaeu) {
        if (nr.kind === "запрет") {
            return {
                status: "unknown",
                label: "⚠️ РФ — уточнить номер ГИСП",
                cls: riskCls,
                note: nrNote || undefined,
            };
        }
        return {
            status: "pass",
            label: "✅ Проходит нацрежим (РФ)",
            cls: passCls,
            note: nrNote || undefined,
        };
    }
    if (isImport) {
        if (nr.kind === "запрет") {
            return {
                status: "fail",
                label: "❌ Не проходит нацрежим (импорт)",
                cls: failCls,
                note: nrNote || undefined,
            };
        }
        return {
            status: "risk",
            label: "⚠️ Нацрежим: риск (импорт)",
            cls: riskCls,
            note: nrNote || undefined,
        };
    }
    if (nr.complianceStatus === "подтверждено" || nr.complianceStatus === "исключение") {
        return {
            status: "pass",
            label: "✅ Проходит нацрежим",
            cls: passCls,
            note: nrNote || undefined,
        };
    }
    if (nr.complianceStatus === "не_подходит") {
        return {
            status: "fail",
            label: "❌ Не проходит нацрежим",
            cls: failCls,
            note: nrNote || undefined,
        };
    }
    if (nr.complianceStatus === "риск_импорт") {
        return {
            status: "risk",
            label: "⚠️ Нацрежим: риск (импорт)",
            cls: riskCls,
            note: nrNote || undefined,
        };
    }
    return {
        status: "unknown",
        label: "⚠️ Нацрежим: уточнить РФ/ГИСП",
        cls: unknownCls,
        note: nrNote && !/^нет\s+данн/i.test(nrNote) ? nrNote : undefined,
    };
}
function buildComplianceBadge(kind, complianceStatus, hasException) {
    if (kind === "нет")
        return { label: null, shortSuffix: "", cls: "" };
    if (complianceStatus === "подтверждено") {
        return {
            label: "✅ Товары проходят нацрежим",
            shortSuffix: " · ✅ Проходит",
            cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        };
    }
    if (complianceStatus === "исключение" || hasException) {
        return {
            label: "✅ Проходят (есть исключение)",
            shortSuffix: " · ✅ Исключение",
            cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        };
    }
    if (complianceStatus === "не_подходит") {
        return {
            label: "❌ Товары НЕ проходят нацрежим",
            shortSuffix: " · ❌ Не проходит",
            cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
        };
    }
    if (complianceStatus === "риск_импорт") {
        return {
            label: "⚠️ Импорт (риск отклонения)",
            shortSuffix: " · ⚠️ Риск",
            cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
        };
    }
    if (complianceStatus === "не_требуется") {
        return {
            label: "✅ Проходят (ГИСП не нужен)",
            shortSuffix: " · ✅ Допуск",
            cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
        };
    }
    return {
        label: "⚠️ Проверить РФ/ГИСП",
        shortSuffix: " · ⚠️ Уточнить",
        cls: "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30",
    };
}
export function getNationalRegimeDisplay(t) {
    const cond = t.details?.conditions;
    const savedInfo = cond?.national_regime_info;
    const savedTags = cond?.restriction_tags;
    const nrText = String(cond?.national_regime_text || "").trim();
    const nrLow = nrText.toLowerCase();
    let kind = "нет";
    const rawKind = savedInfo?.kind || savedTags?.national_regime_kind || null;
    if (rawKind === "запрет" || rawKind === "ограничение" || rawKind === "преимущество") {
        kind = rawKind;
    }
    else if (/запрет(?!,?\s*не\s+применя)/i.test(nrLow)) {
        kind = "запрет";
    }
    else if (nrLow.includes("ограничен")) {
        kind = "ограничение";
    }
    else if (nrLow.includes("преимуществ")) {
        kind = "преимущество";
    }
    else if (t.national_regime === "Да") {
        kind = "ограничение";
    }
    const excMatch = nrText.match(/(неприменен\w*[^;.\n]*|пп\.?\s*[«"]?и[»"]?\s*п\.?\s*5[^;.\n]*|отсутств\w*\s+(?:в\s+реестр\w*|факт\w*\s+производств\w*)[^;.\n]*|уведомлени\w*\s+минпромторг\w*[^;.\n]*)/i);
    const hasException = Boolean(savedInfo?.has_exception ?? excMatch);
    const exceptionNote = savedInfo?.exception_note || (excMatch ? excMatch[1].trim() : null);
    const supplierCountry = savedInfo?.supplier_country || null;
    const complianceStatus = savedInfo?.compliance_status || null;
    const complianceText = savedInfo?.compliance_text || null;
    const basis = savedInfo?.basis || (kind !== "нет" ? "ПП РФ от 23.12.2024 № 1875" : null);
    const compBadge = buildComplianceBadge(kind, complianceStatus, hasException);
    if (kind === "запрет") {
        if (hasException) {
            return {
                kind,
                active: true,
                hasException: true,
                exceptionNote,
                badgeLabel: `🇷🇺 Запрет РФ${compBadge.shortSuffix}`,
                shortLabel: "🇷🇺 Запрет*",
                badgeCls: "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30",
                bannerCls: "bg-amber-500/8 border-amber-500/30",
                title: "Запрет на импорт (действует исключение)",
                plainExplanation: "По коду товара установлен запрет, но по условиям извещения действует исключение — иностранный товар может быть допущен без реестра ГИСП.",
                whatNeeded: "Указать страну происхождения; если есть товар РФ с ГИСП — лучше подавать его.",
                supplierCountry,
                complianceStatus,
                complianceText,
                complianceBadgeLabel: compBadge.label,
                complianceBadgeCls: compBadge.cls,
                basis,
            };
        }
        return {
            kind,
            active: true,
            hasException: false,
            exceptionNote: null,
            badgeLabel: `🇷🇺 Только РФ/ЕАЭС${compBadge.shortSuffix}`,
            shortLabel: "🇷🇺 Запрет",
            badgeCls: "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30",
            bannerCls: "bg-rose-500/8 border-rose-500/30",
            title: "Запрет на иностранный товар",
            plainExplanation: "Иностранный товар подавать нельзя — допускается только продукция производства РФ или ЕАЭС.",
            whatNeeded: "В заявке обязателен номер реестровой записи ГИСП (РРП/ЕАЭС) или сертификат СТ-1.",
            supplierCountry,
            complianceStatus,
            complianceText,
            complianceBadgeLabel: compBadge.label,
            complianceBadgeCls: compBadge.cls,
            basis,
        };
    }
    if (kind === "ограничение") {
        return {
            kind,
            active: true,
            hasException,
            exceptionNote,
            badgeLabel: `${hasException ? "🇷🇺 Ограничение" : "🇷🇺 2-й лишний"}${compBadge.shortSuffix}`,
            shortLabel: "🇷🇺 2-й лишний",
            badgeCls: "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30",
            bannerCls: "bg-amber-500/8 border-amber-500/30",
            title: hasException
                ? "Ограничение («второй лишний») — есть исключение"
                : "Ограничение — правило «второй лишний»",
            plainExplanation: hasException
                ? "Формально действует ограничение, но заказчик приложил уведомление об отсутствии товара в реестре РФ — иностранный товар допускается."
                : "Иностранный товар подать можно, но если на торги выйдет хотя бы 1 участник с товаром РФ/ЕАЭС (с номером ГИСП) — все иностранные заявки отклонят.",
            whatNeeded: hasException
                ? "Достаточно указать страну происхождения в заявке."
                : "Для защиты от отклонения нужен товар РФ/ЕАЭС и номер реестровой записи ГИСП.",
            supplierCountry,
            complianceStatus,
            complianceText,
            complianceBadgeLabel: compBadge.label,
            complianceBadgeCls: compBadge.cls,
            basis,
        };
    }
    if (kind === "преимущество") {
        return {
            kind,
            active: true,
            hasException,
            exceptionNote,
            badgeLabel: `🇷🇺 РФ −15%${compBadge.shortSuffix}`,
            shortLabel: "🇷🇺 РФ −15%",
            badgeCls: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30",
            bannerCls: "bg-sky-500/8 border-sky-500/25",
            title: "Преимущество для товаров РФ (−15%)",
            plainExplanation: "Иностранный товар разрешён — заявку НЕ отклонят и номер ГИСП не нужен. Но при оценке заявок цена конкурентов с товаром РФ/ЕАЭС условно снижается на 15% (контракт по их реальной цене).",
            whatNeeded: "Просто указать страну происхождения в заявке (номер ГИСП не требуется).",
            supplierCountry,
            complianceStatus,
            complianceText,
            complianceBadgeLabel: compBadge.label,
            complianceBadgeCls: compBadge.cls,
            basis,
        };
    }
    return {
        kind: "нет",
        active: false,
        hasException: false,
        exceptionNote: null,
        badgeLabel: "",
        shortLabel: "",
        badgeCls: "",
        bannerCls: "",
        title: "Нацрежим не установлен",
        plainExplanation: "Ограничений по стране происхождения нет — можно поставлять товар любой страны.",
        whatNeeded: "Достаточно указать страну происхождения товара в заявке.",
        supplierCountry,
        complianceStatus,
        complianceText,
        complianceBadgeLabel: null,
        complianceBadgeCls: "",
        basis: null,
    };
}
const MED_RE = /(медицин|медиздел|лекарств|фармацевт|реагент|реактив|шприц|перевязоч|диагностическ|лабораторн|стоматолог|ортопед|хирург|катетер|дезинфиц|стерил|глюкометр|тест-полос|ру\s+на\s+ми|регистрационн\w*\s+удостоверен|бактерицид|рециркулятор|эндоскоп|протез|инфузион|анализатор)/i;
const LIC_RE = /(лицензи|спец\w*\s*разрешен|регистрационн\w*\s+удостоверен|\bру\b|допуск\s+сро)/i;
export function getTenderRestrictionInfo(t) {
    const cond = t.details?.conditions;
    const saved = cond?.restriction_tags;
    const itemsText = (t.details?.items || [])
        .map((i) => `${i.name || ""} ${i.okpd2 || ""} ${i.ktru || ""}`)
        .join(" ");
    const licStr = String(cond?.licenses || "").trim();
    const reqStr = String(cond?.requirements || "").trim();
    const smpStr = String(cond?.smp_sono || "").trim();
    const extraStr = [
        t.product,
        t.subject || "",
        licStr,
        reqStr,
        cond?.other || "",
        ...(cond?.special_notes || []),
        ...(cond?.special_requirements || []),
        itemsText,
    ].join(" ");
    const isMedical = saved?.is_medical ??
        (MED_RE.test(extraStr) || /(?:^|\s)(?:21\.|32\.50\.)/.test(itemsText));
    const hasExplicitLicense = Boolean(licStr && !/^(?:не\s+требу[ею]тся|нет|отсутств|—|-|none)$/i.test(licStr));
    const needsLicense = saved?.needs_license ??
        (hasExplicitLicense || LIC_RE.test(`${licStr} ${reqStr} ${(cond?.special_requirements || []).join(" ")}`));
    const nationalRegime = getNationalRegimeDisplay(t);
    const nationalRegimeKind = nationalRegime.active ? nationalRegime.kind : null;
    const hasNationalRegime = nationalRegime.active;
    const isSmpOnly = saved?.smp_only ??
        (/(только|среди\s+смп|участник\w*\s*смп|^да\b)/i.test(`${smpStr} ${reqStr}`) &&
            !/не\s+(?:установлен|огранич|требу)|для\s+всех/i.test(smpStr));
    const badges = [];
    if (isMedical) {
        badges.push({
            id: "medical",
            label: "🏥 Медтовары / разрешения",
            shortLabel: "🏥 Мед",
            cls: "bg-fuchsia-500/12 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/25",
        });
    }
    if (needsLicense) {
        badges.push({
            id: "license",
            label: "📜 Лицензия / допуск",
            shortLabel: "📜 Лиц.",
            cls: "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25",
        });
    }
    if (hasNationalRegime) {
        badges.push({
            id: "nr",
            label: nationalRegime.badgeLabel,
            shortLabel: nationalRegime.shortLabel,
            cls: nationalRegime.badgeCls,
        });
    }
    if (isSmpOnly) {
        badges.push({
            id: "smp",
            label: "🏢 Только СМП",
            shortLabel: "🏢 СМП",
            cls: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
        });
    }
    return {
        isMedical,
        needsLicense,
        hasNationalRegime,
        nationalRegimeKind,
        nationalRegime,
        isSmpOnly,
        hasAnyRestriction: badges.length > 0,
        badges,
    };
}
