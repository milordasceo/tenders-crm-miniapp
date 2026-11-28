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
                        model: info.model || undefined,
                        specsOk: info.specs_ok || undefined,
                        specsComparison: Array.isArray(info.specs_comparison)
                            ? info.specs_comparison
                                .filter((r) => r && (r.name || r.param || r.required))
                                .map((r) => ({
                                name: String(r.name || r.param || "Параметр"),
                                required: String(r.required ?? "—"),
                                found: String(r.found ?? "—"),
                                match: r.match ? String(r.match) : undefined,
                            }))
                            : undefined,
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
    // Вспомогательный поиск сохранённой поэлементной сверки ТЗ (specs_comparison.json → details.specs_comparison)
    const rawSpecBlocks = Array.isArray(tender.details?.specs_comparison)
        ? tender.details.specs_comparison
        : [];
    const findSpecFor = (itemIdx, email, url, seller, fallbackVariantIdx) => {
        const blk = rawSpecBlocks.find((b) => Number(b?.item_idx) === itemIdx);
        if (!blk || !blk.variants || typeof blk.variants !== "object")
            return {};
        const entries = Object.entries(blk.variants);
        const emLow = (email || "").trim().toLowerCase();
        const urlLow = (url || "").trim().toLowerCase();
        const selLow = (seller || "").trim().toLowerCase().slice(0, 28);
        let matched = entries.find(([, v]) => {
            if (!v)
                return false;
            const vEm = (v.email || "").trim().toLowerCase();
            if (emLow && vEm && emLow === vEm)
                return true;
            const vUrl = (v.url || v.link_url || "").trim().toLowerCase();
            if (urlLow && vUrl && urlLow === vUrl)
                return true;
            const vSel = (v.seller || v.supplier || "").trim().toLowerCase();
            if (selLow && vSel && (vSel.includes(selLow) || selLow.includes(vSel.slice(0, 20))))
                return true;
            return false;
        });
        if (!matched && typeof fallbackVariantIdx === "number" && entries[fallbackVariantIdx]) {
            matched = entries[fallbackVariantIdx];
        }
        if (!matched)
            return {};
        const info = matched[1];
        return {
            model: info.model || undefined,
            specsOk: info.specs_ok || undefined,
            specsComparison: Array.isArray(info.specs_comparison)
                ? info.specs_comparison
                    .filter((r) => r && (r.name || r.param || r.required))
                    .map((r) => ({
                    name: String(r.name || r.param || "Параметр"),
                    required: String(r.required ?? "—"),
                    found: String(r.found ?? "—"),
                    match: r.match ? String(r.match) : undefined,
                }))
                : undefined,
        };
    };
    // Fallback для старых табличных цены.md и Запрос цен/: собираем поставщиков из подтверждение.json (mail_state)
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
        const buildMailOffer = (r, rIdx, targetItemIdx) => {
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
                const firstPosIdx = (r.позиции && r.позиции[0]) || targetItemIdx || 1;
                const posQty = qtyByIdx.get(firstPosIdx) ||
                    toNumber(tender.details?.items?.[0]?.quantity) ||
                    null;
                if (purchase !== null && posQty && posQty > 0 && totalItemsCount === 1) {
                    ansPrice = Math.round((purchase / posQty) * 100) / 100;
                }
            }
            let prelimText;
            if (ansPrice === null) {
                const prelimVal = toNumber(r.preliminary_price ?? r.предварительная_цена);
                if (prelimVal !== null && prelimVal > 0) {
                    const est = calcPreliminaryEstimate(tender, prelimVal);
                    prelimText = `~${formatRub(prelimVal)}${est?.isPerUnit ? " / ед." : ""} (предв.)`;
                }
            }
            const itemHint = (r.позиции || [])
                .map((i) => posByIdx.get(i) || `Позиция ${i}`)
                .join(", ");
            const specInfo = findSpecFor(targetItemIdx, r.email, r.сайт, r.продавец, rIdx);
            return {
                variant: variantKey,
                seller: r.продавец || "Поставщик",
                unitPrice: ansPrice,
                priceText: prelimText,
                address: r.адрес || undefined,
                phone: r.телефон || undefined,
                email: r.email || undefined,
                url: r.сайт || undefined,
                gisUrl: r["2гис"] || undefined,
                status: r.статус || undefined,
                meta: itemHint || undefined,
                note: firstAns?.примечание || undefined,
                model: specInfo.model,
                specsOk: specInfo.specsOk,
                specsComparison: specInfo.specsComparison,
            };
        };
        if (rawSpecBlocks.length > 0 && totalItemsCount > 1) {
            const perPosGroups = [];
            for (let idx = 1; idx <= totalItemsCount; idx++) {
                const posOffers = ms.продавцы
                    .map((r, rIdx) => {
                    const covers = !Array.isArray(r.позиции) || r.позиции.length === 0 || r.позиции.includes(idx);
                    return covers ? buildMailOffer(r, rIdx, idx) : null;
                })
                    .filter((x) => x !== null);
                if (posOffers.length > 0) {
                    perPosGroups.push({
                        idx,
                        position: posByIdx.get(idx) || `Позиция ${idx}`,
                        offers: posOffers,
                    });
                }
            }
            if (perPosGroups.length > 0)
                return perPosGroups;
        }
        const offers = ms.продавцы.map((r, rIdx) => buildMailOffer(r, rIdx, 1));
        if (offers.length > 0) {
            return [{ idx: 1, position: "Поставщики по позициям", offers }];
        }
    }
    // Fallback для Запрос цен/ до первого прохода Почтальона: inquiry_suppliers из запрос_кп.json
    const inq = tender.details?.inquiry_suppliers;
    if (Array.isArray(inq) && inq.length > 0) {
        const offers = inq.map((s, sIdx) => {
            const prelimVal = toNumber(s.preliminary_price);
            const est = prelimVal !== null && prelimVal > 0 ? calcPreliminaryEstimate(tender, prelimVal) : null;
            const specInfo = findSpecFor(1, s.email, s.url, s.name, sIdx);
            return {
                variant: "А",
                seller: s.name || "Поставщик",
                unitPrice: null,
                priceText: prelimVal !== null && prelimVal > 0
                    ? `~${formatRub(prelimVal)}${est?.isPerUnit ? " / ед." : ""} (предв.)`
                    : undefined,
                address: s.city || undefined,
                phone: s.phone || undefined,
                email: s.email || undefined,
                url: s.url || undefined,
                model: specInfo.model,
                specsOk: specInfo.specsOk,
                specsComparison: specInfo.specsComparison,
            };
        });
        if (offers.length > 0) {
            return [{ idx: 1, position: "Поставщики (предварительные цены)", offers }];
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
const WAITING_NOTE_RE = /(ожидает|уточн|расч[её]т|позвон|проверя|в работе|запрошен)/i;
export function resolveSellerConfirmationState(isPublicOffer, matchedMail, tenderConfirmed) {
    if (isPublicOffer) {
        return { state: "public_offer", badge: "Цена по публичной оферте" };
    }
    if (matchedMail) {
        const modelVerdict = matchedMail.итог_модели;
        if (modelVerdict && (modelVerdict.плашка || modelVerdict.тип)) {
            const vType = String(modelVerdict.тип || "").trim().toLowerCase();
            const vBadge = String(modelVerdict.плашка || "").trim() || undefined;
            const vProof = String(modelVerdict.пруф || "").trim() || undefined;
            if (vType === "отказ") {
                return {
                    state: "rejected",
                    badge: vBadge || "Поставщик отказал",
                    proof: vProof,
                    refusalReason: vProof || vBadge || "Поставщик сообщил об отказе в поставке.",
                };
            }
            if (vType === "уточнение") {
                return {
                    state: "waiting",
                    badge: vBadge || "Идёт уточнение с поставщиком",
                    proof: vProof,
                };
            }
            if (vType === "ответил") {
                return {
                    state: "confirmed",
                    badge: vBadge || "Цена проверена",
                    proof: vProof,
                };
            }
        }
        const st = String(matchedMail.статус || "").trim().toLowerCase();
        if (st === "пропущен") {
            return {
                state: "waiting",
                badge: matchedMail.примечание || "Ошибка почты — ищем замену",
            };
        }
        if (st === "отказ") {
            const firstAns = Object.values(matchedMail.ответы || {}).find(Boolean);
            const lastInb = [...(matchedMail.сообщения || [])]
                .reverse()
                .find((m) => m?.направление === "inbound" && m?.текст?.trim());
            const proof = firstAns?.цитата ||
                lastInb?.текст?.trim().slice(0, 240) ||
                matchedMail.примечание ||
                firstAns?.примечание ||
                undefined;
            return {
                state: "rejected",
                badge: matchedMail.примечание || "Поставщик отказал",
                proof,
                refusalReason: proof || "Поставщик сообщил об отказе в поставке.",
            };
        }
        for (const ans of Object.values(matchedMail.ответы || {})) {
            if (!ans)
                continue;
            const txt = `${ans.цитата || ""} ${ans.примечание || ""}`.trim();
            if (txt && WAITING_NOTE_RE.test(txt) && !REFUSAL_TEXT_RE.test(txt)) {
                return {
                    state: "waiting",
                    badge: ans.примечание || "Идёт уточнение с поставщиком",
                    proof: ans.цитата || undefined,
                };
            }
            if (ans.в_наличии === false) {
                return {
                    state: "rejected",
                    badge: "Поставщик отказал",
                    proof: ans.цитата || ans.примечание || undefined,
                    refusalReason: ans.цитата || ans.примечание || "Поставщик сообщил об отказе в поставке.",
                };
            }
            if (txt && REFUSAL_TEXT_RE.test(txt)) {
                return {
                    state: "rejected",
                    badge: "Поставщик отказал",
                    proof: ans.цитата || ans.примечание || txt,
                    refusalReason: ans.цитата || ans.примечание || txt,
                };
            }
        }
        const hasPositiveAns = Object.values(matchedMail.ответы || {}).some((ans) => ans && ans.в_наличии === true);
        if (st === "подтверждено" || (st === "ответил" && hasPositiveAns)) {
            return { state: "confirmed", badge: "Цена проверена" };
        }
        return { state: "waiting", badge: matchedMail.примечание || undefined };
    }
    if (tenderConfirmed) {
        return { state: "confirmed", badge: "Цена проверена" };
    }
    return { state: "waiting" };
}
export function getProfitThresholdRub(nmck) {
    const n = nmck != null ? Number(nmck) : NaN;
    if (Number.isFinite(n) && n > 0 && n < 30000)
        return 6000;
    return 11000;
}
export function cleanContactPhone(raw) {
    const s = String(raw || "").trim();
    if (!s)
        return null;
    if (/нет\s+на\s+сайте|не\s+указан|отсутству|проверены\s+контакт/i.test(s))
        return null;
    const digits = s.replace(/\D/g, "");
    return digits.length >= 6 ? s : null;
}
export function cleanContactEmail(raw) {
    const s = String(raw || "").trim();
    if (!s)
        return null;
    if (/нет\s+на\s+сайте|не\s+указан|отсутству|проверены\s+контакт/i.test(s))
        return null;
    const m = s.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    return m ? m[0] : null;
}
export function cleanPickupAddress(raw) {
    let s = String(raw || "").trim();
    if (!s)
        return null;
    s = s
        .replace(/,?\s*тел\.?\s*:?\s*нет\s+на\s+сайте(?:\s*\([^)]*\))?/gi, "")
        .replace(/,?\s*e-?mail\s*:?\s*нет\s+на\s+сайте(?:\s*\([^)]*\))?/gi, "")
        .replace(/,?\s*(?:тел\.?|e-?mail)\s*:?\s*не\s+указан\w*/gi, "")
        .replace(/[,;\s]+$/g, "")
        .trim();
    return s.length >= 3 ? s : null;
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
    const passCls = "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/45";
    const riskCls = "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/35";
    const failCls = "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35";
    const unknownCls = "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-400/35";
    if (/не\s+проход|не\s+подход|наруша|запрещен/i.test(nrLow)) {
        return {
            status: nr.kind === "запрет" ? "fail" : "risk",
            label: nr.kind === "запрет" ? "🇷🇺 ❌ Не проходит нацрежим" : "🇷🇺 ⚠️ Нацрежим: риск (импорт)",
            cls: nr.kind === "запрет" ? failCls : riskCls,
            note: nrNote || undefined,
        };
    }
    if (nr.hasException || /исключен|уведомлен\w*\s+минпромторг|не\s+применя/i.test(nrLow)) {
        return {
            status: "pass",
            label: "🇷🇺 Проходит нацрежим (исключение)",
            cls: passCls,
            note: nrNote || nr.exceptionNote || undefined,
        };
    }
    if (/проход|соблюда|подтвержд|соответств/i.test(nrLow) || hasRegNum) {
        return {
            status: "pass",
            label: hasRegNum ? "🇷🇺 Проходит нацрежим (ГИСП)" : "🇷🇺 Проходит нацрежим",
            cls: passCls,
            note: nrNote || undefined,
        };
    }
    if (isRfEaeu) {
        if (nr.kind === "запрет") {
            return {
                status: "unknown",
                label: "🇷🇺 ⚠️ РФ — уточнить номер ГИСП",
                cls: riskCls,
                note: nrNote || undefined,
            };
        }
        return {
            status: "pass",
            label: "🇷🇺 Проходит нацрежим (РФ)",
            cls: passCls,
            note: nrNote || undefined,
        };
    }
    if (isImport) {
        if (nr.kind === "запрет") {
            return {
                status: "fail",
                label: "🇷🇺 ❌ Не проходит нацрежим (импорт)",
                cls: failCls,
                note: nrNote || undefined,
            };
        }
        return {
            status: "risk",
            label: "🇷🇺 ⚠️ Нацрежим: риск (импорт)",
            cls: riskCls,
            note: nrNote || undefined,
        };
    }
    if (nr.complianceStatus === "подтверждено" || nr.complianceStatus === "исключение") {
        return {
            status: "pass",
            label: "🇷🇺 Проходит нацрежим",
            cls: passCls,
            note: nrNote || undefined,
        };
    }
    if (nr.complianceStatus === "не_подходит") {
        return {
            status: "fail",
            label: "🇷🇺 ❌ Не проходит нацрежим",
            cls: failCls,
            note: nrNote || undefined,
        };
    }
    if (nr.complianceStatus === "риск_импорт") {
        return {
            status: "risk",
            label: "🇷🇺 ⚠️ Нацрежим: риск (импорт)",
            cls: riskCls,
            note: nrNote || undefined,
        };
    }
    return {
        status: "unknown",
        label: "🇷🇺 Нацрежим: уточнить РФ/ГИСП",
        cls: unknownCls,
        note: nrNote && !/^нет\s+данн/i.test(nrNote) ? nrNote : undefined,
    };
}
function buildComplianceBadge(kind, complianceStatus, hasException, qcApproved = false) {
    if (kind === "нет")
        return { label: null, shortSuffix: "", cls: "", isOk: true };
    if (complianceStatus === "подтверждено") {
        return {
            label: "🇷🇺 Товары проходят нацрежим",
            shortSuffix: " · Проходит",
            cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/45",
            isOk: true,
        };
    }
    if (complianceStatus === "исключение" || hasException) {
        return {
            label: "🇷🇺 Проходят (есть исключение)",
            shortSuffix: " · Исключение",
            cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/45",
            isOk: true,
        };
    }
    if (complianceStatus === "не_подходит") {
        return {
            label: "🇷🇺 ❌ Товары НЕ проходят нацрежим",
            shortSuffix: " · ❌ Не проходит",
            cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35",
            isOk: false,
        };
    }
    if (complianceStatus === "риск_импорт") {
        return {
            label: "🇷🇺 ⚠️ Импорт (риск отклонения)",
            shortSuffix: " · Риск",
            cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/35",
            isOk: false,
        };
    }
    if (complianceStatus === "не_требуется") {
        return {
            label: "🇷🇺 Проходят (ГИСП не нужен)",
            shortSuffix: " · Допуск",
            cls: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-400/40",
            isOk: true,
        };
    }
    if (qcApproved) {
        return {
            label: "🇷🇺 Нацрежим проверен ОТК",
            shortSuffix: "",
            cls: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-400/40",
            isOk: true,
        };
    }
    return {
        label: "⚠️ Проверить РФ/ГИСП",
        shortSuffix: " · Уточнить",
        cls: "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30",
        isOk: false,
    };
}
export function getNationalRegimeDisplay(t) {
    const cond = t.details?.conditions;
    const savedInfo = cond?.national_regime_info;
    const savedTags = cond?.restriction_tags;
    const nrText = String(cond?.national_regime_text || "").trim();
    const nrLow = nrText.toLowerCase();
    const qcApproved = Boolean(t.details?.qc?.approved === true);
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
    const excMatch = nrText.match(/(неприменен\w*[^;.\n]*|пп\.?\s*[«"]?и[»"]?\s*п\.?\s*5[^;.\n]*|отсутств\w*\s+(?:в\s+реестр\w*|факт\w*\s+производств\w*)[^;.\n]*|уведомлени\w*\s+минпромторг\w*[^;.\n]*|не\s+превышает\s+1\s*млн[^;.\n]{0,120}не\s+превышает\s+300\s*тыс[^;.\n]*)/i);
    const explicit1mExc = /не\s+превышает\s+1\s*млн/i.test(nrText) &&
        /не\s+превышает\s+300\s*тыс/i.test(nrText) &&
        !/возможн|уточн/i.test(nrText);
    const hasException = Boolean(savedInfo?.has_exception || excMatch || explicit1mExc);
    const exceptionNote = savedInfo?.exception_note ||
        (explicit1mExc ? "пп. «и» п. 5 ПП РФ № 1875 (до 1 млн ₽ и ед. ≤ 300 тыс. ₽)" : excMatch ? excMatch[1].trim() : null);
    const supplierCountry = savedInfo?.supplier_country || null;
    const complianceStatus = savedInfo?.compliance_status || null;
    const complianceText = savedInfo?.compliance_text || null;
    const basis = savedInfo?.basis || (kind !== "нет" ? "ПП РФ от 23.12.2024 № 1875" : null);
    const compBadge = buildComplianceBadge(kind, complianceStatus, hasException, qcApproved);
    const calmSkyCls = "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-400/35";
    const calmSkyBanner = "bg-sky-500/8 border-sky-400/30";
    if (kind === "запрет") {
        if (hasException) {
            return {
                kind,
                active: true,
                hasException: true,
                exceptionNote,
                badgeLabel: "🇷🇺 Нацрежим: исключение",
                shortLabel: "🇷🇺 Исключение",
                badgeCls: calmSkyCls,
                bannerCls: calmSkyBanner,
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
        const banOk = compBadge.isOk;
        return {
            kind,
            active: true,
            hasException: false,
            exceptionNote: null,
            badgeLabel: `🇷🇺 Только РФ/ЕАЭС${compBadge.shortSuffix}`,
            shortLabel: "🇷🇺 РФ/ЕАЭС",
            badgeCls: banOk ? calmSkyCls : "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30",
            bannerCls: banOk ? calmSkyBanner : "bg-rose-500/8 border-rose-500/30",
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
        const limitOk = compBadge.isOk;
        return {
            kind,
            active: true,
            hasException,
            exceptionNote,
            badgeLabel: `${hasException ? "🇷🇺 Ограничение" : "🇷🇺 2-й лишний"}${compBadge.shortSuffix}`,
            shortLabel: "🇷🇺 2-й лишний",
            badgeCls: limitOk ? calmSkyCls : "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30",
            bannerCls: limitOk ? calmSkyBanner : "bg-amber-500/8 border-amber-500/30",
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
export function calcPreliminaryEstimate(tender, prelimPrice) {
    const p = Number(prelimPrice);
    if (!Number.isFinite(p) || p <= 0)
        return null;
    const nmck = Number(tender.nmck || 0);
    const items = tender.details?.items || [];
    let isPerUnit = false;
    let tenderComparePrice = nmck > 0 ? nmck : null;
    let purchaseEst = p;
    if (items.length === 1) {
        const qty = Number(items[0]?.quantity || 1);
        const uPrice = Number(items[0]?.unit_price || (qty > 0 && nmck > 0 ? nmck / qty : 0));
        if (qty > 1 && ((uPrice > 0 && p <= uPrice * 3) || (nmck > 0 && p < nmck * 0.5 && p * qty <= nmck * 3))) {
            isPerUnit = true;
            tenderComparePrice = uPrice > 0 ? uPrice : nmck / qty;
            purchaseEst = p * qty;
        }
        else if (qty <= 1 && uPrice > 0) {
            isPerUnit = true;
            tenderComparePrice = uPrice;
            purchaseEst = p;
        }
    }
    else if (items.length > 1 && nmck > 0 && p < nmck * 0.15) {
        // Для многопозиционного тендера число < 15% от НМЦК — это цена за 1 шт или 1 позицию, а НЕ полная корзина.
        // Не рисуем невозможную прибыль (например +258 000 ₽ при НМЦК 276 000 ₽).
        return {
            prelimPrice: p,
            isPerUnit: true,
            tenderComparePrice: null,
            diffPct: null,
            prelimProfit: null,
        };
    }
    const diffPct = tenderComparePrice && tenderComparePrice > 0
        ? Math.round(((p - tenderComparePrice) / tenderComparePrice) * 100)
        : null;
    const prelimProfit = nmck > 0 ? Math.round(nmck - purchaseEst - nmck * 0.06 - 1500) : null;
    return {
        prelimPrice: p,
        isPerUnit,
        tenderComparePrice,
        diffPct,
        prelimProfit,
    };
}
const CALL_HINT_RE = /(позвон|связат|телефон|звон|набрат|перезвон)/i;
export function hasRealPhone(phone) {
    const raw = String(phone || "").trim();
    if (!raw)
        return false;
    if (/^(?:не\s*указан|нет|none|null|-|—)$/i.test(raw))
        return false;
    const digits = raw.replace(/\D/g, "");
    return digits.length >= 7;
}
export function normalizeTelHref(phone) {
    const cleaned = phone.trim();
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("8")) {
        return `tel:+7${digits.slice(1)}`;
    }
    if (digits.length === 11 && digits.startsWith("7")) {
        return `tel:+${digits}`;
    }
    if (digits.length === 10) {
        return `tel:+7${digits}`;
    }
    return `tel:${cleaned.replace(/[^\d+]/g, "")}`;
}
export function getCallConfirmSellers(tender) {
    const sellers = tender.details?.mail_state?.продавцы || [];
    const out = [];
    for (const s of sellers) {
        if (!s)
            continue;
        const status = String(s.статус || "").trim().toLowerCase();
        if (["отказ", "ответил", "публичная_оферта"].includes(status))
            continue;
        const phone = String(s.телефон || "").trim();
        if (!hasRealPhone(phone))
            continue;
        const msgs = Array.isArray(s.сообщения) ? s.сообщения : [];
        const remFromMsgs = msgs.filter((m) => m && m.направление === "reminder").length;
        const remCount = Math.max(remFromMsgs, Number(s.запросов_без_ответа || 0));
        const badgeText = String(s.итог_модели?.плашка || "").trim() || null;
        const callReason = String(s.причина_звонка || "").trim() || null;
        const asksCall = Boolean(s.нужен_срочный_звонок) ||
            Boolean(badgeText && CALL_HINT_RE.test(badgeText)) ||
            Boolean(callReason && CALL_HINT_RE.test(callReason));
        const longNoReply = remCount >= 2 || status === "не_ответил";
        if (!longNoReply && !asksCall)
            continue;
        let reasonLabel = "Долго нет ответа на письма";
        if (asksCall && badgeText) {
            reasonLabel = badgeText;
        }
        else if (asksCall && callReason) {
            reasonLabel = callReason;
        }
        else if (status === "не_ответил") {
            reasonLabel = `Не ответили после ${Math.max(remCount, 2)} напоминаний`;
        }
        else if (remCount >= 2) {
            reasonLabel = `Отправлено ${remCount} напоминания — нет ответа`;
        }
        const prelimPrice = toNumber(s.preliminary_price);
        out.push({
            seller: s,
            name: String(s.продавец || "Поставщик").trim(),
            phone,
            telHref: normalizeTelHref(phone),
            reminderCount: remCount,
            reasonLabel,
            badgeText,
            isUrgent: asksCall || status === "не_ответил",
            prelimPrice,
        });
    }
    return out;
}
export function isTenderNeedsCallConfirmation(tender) {
    if (!tender)
        return false;
    if (tender.stage !== "inquiry" && tender.stage !== "tenders")
        return false;
    if (getDeadlineInfo(tender.deadline_at).tone === "expired")
        return false;
    if (isTenderStorefrontReady(tender))
        return false;
    if (getCallConfirmSellers(tender).length > 0)
        return true;
    const preview = tender.details?.call_confirm_preview;
    if (preview && Number(preview.suppliers_count || 0) > 0)
        return true;
    return false;
}
export function buildCallQuestions(tender, callSellers) {
    const qs = [];
    // 1. Если поставщик уже прислал конкретную просьбу/вопрос — ставим на первое место
    const specificBadges = Array.from(new Set(callSellers
        .map((c) => c.badgeText)
        .filter((b) => Boolean(b && b.length >= 5))));
    if (specificBadges.length > 0) {
        qs.push(`По последнему ответу поставщика: «${specificBadges.join(" / ")}».`);
    }
    // 2. Позиции, количество и ориентир закупки
    const items = tender.details?.items || [];
    const nmck = toNumber(tender.nmck);
    const minProfit = nmck !== null && nmck > 0 && nmck < 30000 ? 6000 : 11000;
    const targetMaxBuy = nmck !== null && nmck > 0 ? Math.max(0, Math.floor(nmck * 0.94 - 1500 - minProfit)) : null;
    if (items.length === 1) {
        const it = items[0];
        const qtyStr = it?.quantity ? `${it.quantity} ${it.unit || "шт"}` : "";
        const targetPart = targetMaxBuy && targetMaxBuy > 0
            ? ` (целевой бюджет закупки до ${formatRub(targetMaxBuy)})`
            : "";
        qs.push(`Наличие и актуальная оптовая цена на «${it?.name || tender.product}»${qtyStr ? ` — ${qtyStr}` : ""}${targetPart}.`);
    }
    else if (items.length > 1) {
        const previewNames = items
            .slice(0, 2)
            .map((it) => `«${String(it?.name || "").slice(0, 50)}» (${it?.quantity || 1} ${it?.unit || "шт"})`)
            .join(", ");
        const rest = items.length > 2 ? ` и ещё ${items.length - 2} поз.` : "";
        const targetPart = targetMaxBuy && targetMaxBuy > 0
            ? ` Целевой потолок по всей корзине — до ${formatRub(targetMaxBuy)}.`
            : "";
        qs.push(`Наличие и оптовый счёт на весь комплект (${items.length} поз.): ${previewNames}${rest}.${targetPart}`);
    }
    else {
        qs.push(`Наличие и актуальная оптовая цена на «${tender.product}».`);
    }
    // 3. Особые требования ТЗ / ГОСТ / ТУ
    const specialNotes = tender.details?.conditions?.special_notes || [];
    if (specialNotes.length > 0) {
        const compactNotes = specialNotes
            .slice(0, 2)
            .map((n) => String(n).trim())
            .filter(Boolean)
            .join("; ");
        if (compactNotes) {
            qs.push(`Подтвердить точное соответствие требованиям ТЗ: ${compactNotes.slice(0, 180)}.`);
        }
    }
    else {
        qs.push("Подтвердить точное соответствие характеристикам и ГОСТ/ТУ из ТЗ (без ухудшения параметров).");
    }
    // 4. Нацрежим / ГИСП
    const nr = tender.details?.conditions?.national_regime_info;
    if (nr &&
        (nr.kind === "запрет" || nr.kind === "ограничение") &&
        nr.compliance_status !== "исключение" &&
        nr.compliance_status !== "подтверждено") {
        qs.push(`Уточнить страну происхождения (РФ/ЕАЭС) и действующий номер реестровой записи ГИСП (установлен нацрежим: ${nr.kind} по ПП РФ № 1875).`);
    }
    // 5. Сроки, город, безнал и КП на почту
    const city = tender.city || "городе поставки";
    const deliveryTerms = tender.details?.terms?.delivery_terms;
    const termHint = deliveryTerms ? ` (срок по контракту: ${deliveryTerms.slice(0, 80)})` : "";
    qs.push(`Срок отгрузки / самовывоза в ${city}${termHint}, безналичная оплата от ИП/ООО (с НДС или без) и отправка счёта/КП на почту.`);
    return qs;
}
