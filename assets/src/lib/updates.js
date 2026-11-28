import { getDeadlineInfo, isTenderStorefrontReady } from "./format.js?v=mx0305v6";
const STORAGE_PREFIX = "crm_seen_updates_v2_";
const LEGACY_STORAGE_KEY = "crm_seen_updates_v1";
const INITIAL_WINDOW_MS = 12 * 60 * 60 * 1000;
function storageKeyForUser(userId) {
    return `${STORAGE_PREFIX}${userId || "anon"}`;
}
export function stageWhen(t, events) {
    const mine = events
        .filter((ev) => ev.tender_number === t.number)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const moved = mine.find((ev) => ev.event_type === "stage_changed");
    if (moved)
        return { at: moved.created_at, label: "На этапе с" };
    const created = mine.find((ev) => ev.event_type === "created");
    if (created)
        return { at: created.created_at, label: "Добавлена" };
    if (t.created_at)
        return { at: t.created_at, label: "Добавлена" };
    return { at: t.synced_at, label: "В базе с" };
}
export function computeTenderSignature(t) {
    const sellers = (t.details?.mail_state?.продавцы || [])
        .map((s) => `${s.key || s.продавец || ""}:${s.статус || ""}:${s.ответ_в || ""}`)
        .join(",");
    const inqCount = t.details?.inquiry_suppliers?.length ?? 0;
    return [
        t.stage,
        t.price_request_status || "",
        t.prices_confirmed ? "1" : "0",
        t.profit ?? "",
        sellers,
        String(inqCount),
    ].join("|");
}
function isBotRelevantEvent(ev, isInitialWindow) {
    if (ev.actor === "owner")
        return false;
    if (isInitialWindow && ev.actor === "sync" && ev.event_type === "created") {
        return false;
    }
    return true;
}
function isMailRelatedEvent(ev) {
    if (!ev)
        return false;
    return (ev.event_type.startsWith("mail_") ||
        ev.event_type === "price_status_changed" ||
        ev.event_type === "prices_confirmed");
}
function latestIso(a, b) {
    const ta = a ? new Date(a).getTime() : 0;
    const tb = b ? new Date(b).getTime() : 0;
    if (!Number.isFinite(ta) && !Number.isFinite(tb))
        return new Date().toISOString();
    if (!Number.isFinite(tb) || ta >= tb)
        return a || new Date().toISOString();
    return b || new Date().toISOString();
}
function isValidStore(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return false;
    const obj = raw;
    return obj.version === 1 && Boolean(obj.items) && typeof obj.items === "object";
}
function mergeStores(a, b) {
    const mergedItems = { ...a.items };
    for (const [num, entry] of Object.entries(b.items)) {
        const prev = mergedItems[num];
        if (!prev) {
            mergedItems[num] = entry;
        }
        else {
            const ta = new Date(prev.ts).getTime();
            const tb = new Date(entry.ts).getTime();
            if (Number.isFinite(tb) && (!Number.isFinite(ta) || tb > ta)) {
                mergedItems[num] = entry;
            }
        }
    }
    return {
        version: 1,
        initializedAt: a.initializedAt || b.initializedAt,
        items: mergedItems,
    };
}
export function loadOrInitSeenStore(userId, serverSeenState, tenders, events) {
    const key = storageKeyForUser(userId);
    let localStore = null;
    try {
        const raw = window.localStorage.getItem(key) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (isValidStore(parsed))
                localStore = parsed;
        }
    }
    catch {
        // ignore storage read error
    }
    const remoteStore = isValidStore(serverSeenState) ? serverSeenState : null;
    if (remoteStore && localStore) {
        const merged = mergeStores(remoteStore, localStore);
        saveSeenStore(userId, merged);
        const needsServerSync = JSON.stringify(merged) !== JSON.stringify(remoteStore);
        return { store: merged, needsServerSync };
    }
    if (remoteStore) {
        saveSeenStore(userId, remoteStore);
        return { store: remoteStore, needsServerSync: false };
    }
    if (localStore) {
        saveSeenStore(userId, localStore);
        return { store: localStore, needsServerSync: true };
    }
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const cutoffMs = nowMs - INITIAL_WINDOW_MS;
    const items = {};
    for (const t of tenders) {
        const recentBotEvents = events.filter((ev) => ev.tender_number === t.number &&
            isBotRelevantEvent(ev, true) &&
            new Date(ev.created_at).getTime() >= cutoffMs);
        if (recentBotEvents.length > 0) {
            const earliestRecentMs = Math.min(...recentBotEvents.map((ev) => new Date(ev.created_at).getTime()));
            items[t.number] = {
                ts: new Date(Math.max(0, earliestRecentMs - 1000)).toISOString(),
                sig: computeTenderSignature(t),
            };
        }
        else {
            items[t.number] = {
                ts: nowIso,
                sig: computeTenderSignature(t),
            };
        }
    }
    const fresh = {
        version: 1,
        initializedAt: nowIso,
        items,
    };
    saveSeenStore(userId, fresh);
    return { store: fresh, needsServerSync: true };
}
export function saveSeenStore(userId, store) {
    try {
        window.localStorage.setItem(storageKeyForUser(userId), JSON.stringify(store));
    }
    catch {
        // ignore storage quota/privacy errors
    }
}
export function markTenderAsSeen(userId, store, tender, events) {
    const maxEvTs = events
        .filter((ev) => ev.tender_number === tender.number)
        .reduce((acc, ev) => latestIso(acc, ev.created_at), store.items[tender.number]?.ts || "");
    const ts = latestIso(new Date().toISOString(), latestIso(maxEvTs, latestIso(tender.updated_at, tender.synced_at)));
    const next = {
        ...store,
        items: {
            ...store.items,
            [tender.number]: {
                ts,
                sig: computeTenderSignature(tender),
            },
        },
    };
    saveSeenStore(userId, next);
    return next;
}
export function markAllAsSeen(userId, store, tenders, events) {
    const nowIso = new Date().toISOString();
    const nextItems = { ...store.items };
    for (const t of tenders) {
        const maxEvTs = events
            .filter((ev) => ev.tender_number === t.number)
            .reduce((acc, ev) => latestIso(acc, ev.created_at), nowIso);
        nextItems[t.number] = {
            ts: latestIso(nowIso, latestIso(maxEvTs, latestIso(t.updated_at, t.synced_at))),
            sig: computeTenderSignature(t),
        };
    }
    const next = {
        ...store,
        items: nextItems,
    };
    saveSeenStore(userId, next);
    return next;
}
function buildDiffReason(prevSig, t) {
    const [prevStage, prevReqStatus, prevConfirmed, prevProfit] = prevSig.split("|");
    if (prevStage !== t.stage) {
        if (t.stage === "blanks")
            return "Поступило в «Бланки» (Фатима)";
        if (t.stage === "prices")
            return "Передано Черипикеру на поиск цен";
        if (t.stage === "inquiry")
            return "Перенесено в «Запрос КП» (оптовики)";
        if (t.stage === "calc")
            return "Передано Очкарику на расчёт";
        if (t.stage === "review")
            return "Ожидает переноса в «CRM»";
        if (t.stage === "tenders")
            return "Заведено в CRM (доводка / ОТК)";
        if (t.stage === "unprofitable")
            return "Отсеяно в «Нерентабельно»";
        if (t.stage === "overdue")
            return "Перенесено в «Просрочено»";
        if (t.stage === "rejected")
            return "Отсеяно по правилам";
    }
    if (prevConfirmed !== (t.prices_confirmed ? "1" : "0") && t.prices_confirmed) {
        return "Цены подтверждены ✅";
    }
    if (prevReqStatus !== (t.price_request_status || "") && t.price_request_status) {
        return `Запрос цен: ${t.price_request_status}`;
    }
    if (prevProfit !== String(t.profit ?? "")) {
        return "Обновлена прибыль";
    }
    return "Обновлены данные по продавцам";
}
export function computeUpdates(tenders, events, store) {
    const byTender = {};
    const feed = [];
    const tabUnread = { pipeline: 0, mail: 0, qc: 0, archive: 0 };
    const eventsByTender = new Map();
    for (const ev of events) {
        if (!isBotRelevantEvent(ev, false))
            continue;
        const arr = eventsByTender.get(ev.tender_number) || [];
        arr.push(ev);
        eventsByTender.set(ev.tender_number, arr);
    }
    for (const t of tenders) {
        const saved = store.items[t.number];
        const sig = computeTenderSignature(t);
        const tEvents = eventsByTender.get(t.number) || [];
        const seenMs = saved ? new Date(saved.ts).getTime() : 0;
        const unseenEvents = saved
            ? tEvents.filter((ev) => new Date(ev.created_at).getTime() > seenMs)
            : tEvents;
        const latestEv = unseenEvents[0] || tEvents[0];
        let info = null;
        if (!saved) {
            info = {
                number: t.number,
                kind: "new",
                reason: latestEv?.title ||
                    (t.stage === "blanks"
                        ? "Новый бланк у Фатимы"
                        : t.stage === "prices"
                            ? "Передано Черипикеру"
                            : t.stage === "inquiry"
                                ? "Новый запрос КП оптовикам"
                                : t.stage === "calc"
                                    ? "Передано Очкарику на расчёт"
                                    : t.stage === "review"
                                        ? "Ожидает ввода Сисадмином"
                                        : t.stage === "unprofitable"
                                            ? "Нерентабельно (< 11 000 ₽)"
                                            : t.stage === "overdue"
                                                ? "Перенесено в «Просрочено»"
                                                : t.stage === "rejected"
                                                    ? "Отсеяно по правилам"
                                                    : "Новый тендер в CRM"),
                at: latestEv?.created_at || t.created_at || t.synced_at,
                isMailEvent: t.stage === "inquiry" || isMailRelatedEvent(latestEv),
            };
        }
        else if (unseenEvents.length > 0) {
            info = {
                number: t.number,
                kind: unseenEvents[0].event_type === "created" ? "new" : "updated",
                reason: unseenEvents[0].title,
                at: unseenEvents[0].created_at,
                isMailEvent: unseenEvents.some((ev) => isMailRelatedEvent(ev)),
            };
        }
        else if (sig !== saved.sig) {
            info = {
                number: t.number,
                kind: "updated",
                reason: buildDiffReason(saved.sig, t),
                at: latestIso(t.updated_at, t.synced_at),
                isMailEvent: t.stage === "inquiry" ||
                    sig.split("|")[1] !== saved.sig.split("|")[1] ||
                    sig.split("|")[4] !== saved.sig.split("|")[4],
            };
        }
        if (info) {
            byTender[t.number] = info;
            feed.push({ ...info, tender: t });
            if (["blanks", "prices", "inquiry", "calc", "review", "tenders"].includes(t.stage)) {
                tabUnread.pipeline += 1;
                if (info.isMailEvent || t.stage === "inquiry")
                    tabUnread.mail += 1;
                if (t.stage === "tenders" && !isTenderStorefrontReady(t))
                    tabUnread.qc += 1;
            }
            else {
                const dl = getDeadlineInfo(t.deadline_at);
                if (dl.tone === "expired" || info.kind === "updated" || unseenEvents.length > 0) {
                    tabUnread.archive += 1;
                }
            }
        }
    }
    feed.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return { byTender, feed, tabUnread };
}
