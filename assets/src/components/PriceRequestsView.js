import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowUpDown, Bell, CheckCircle2, Clock, Mail, MessageSquare, Send, Sparkles, XCircle, } from "lucide-react";
import { useMemo, useState } from "react";
import { calcPreliminaryEstimate, formatNskDateTime, formatRub, getDeadlineInfo, isTenderAllPublicOffer, } from "../lib/format.js?v=mx0305v6";
import { haptic } from "../lib/telegram.js?v=mx0305v6";
const SENT_STATUSES = new Set(["отправлено", "напоминание", "ответил", "не_ответил", "отказ"]);
const WAITING_SELLER_STATUSES = new Set(["отправлено", "напоминание", "новый", "черновик"]);
function journalEntryText(entry) {
    if (typeof entry === "string")
        return entry;
    if (entry && typeof entry === "object") {
        const o = entry;
        return [o.в, o.событие, o.текст].filter((v) => typeof v === "string" && v).join(" ");
    }
    return entry == null ? "" : String(entry);
}
function sellerReminderCount(s) {
    if (Array.isArray(s.сообщения) && s.сообщения.length > 0) {
        return s.сообщения.filter((m) => m && m.направление === "reminder").length;
    }
    return (Array.isArray(s.журнал) ? s.журнал : []).filter((j) => journalEntryText(j).toLowerCase().includes("напоминание")).length;
}
function sellerOutboundEmailsCount(s) {
    if (Array.isArray(s.сообщения) && s.сообщения.length > 0) {
        return s.сообщения.filter((m) => m && (m.направление === "outbound" || m.направление === "reminder")).length;
    }
    const j = Array.isArray(s.журнал) ? s.журнал : [];
    const base = s.отправлено_в || SENT_STATUSES.has(s.статус || "") ? 1 : 0;
    const rem = sellerReminderCount(s);
    const clar = j.filter((line) => /отправлено уточнение|продублировано уточнение/i.test(journalEntryText(line))).length;
    return base + rem + clar;
}
function sellerHasClarificationSent(s) {
    if (Array.isArray(s.сообщения) && s.сообщения.length > 0) {
        const msgs = s.сообщения;
        const inboundIdx = msgs.findIndex((m) => m && m.направление === "inbound");
        if (inboundIdx >= 0) {
            return msgs.slice(inboundIdx + 1).some((m) => m && m.направление === "outbound");
        }
        return false;
    }
    return (Array.isArray(s.журнал) ? s.журнал : []).some((line) => /отправлено уточнение|продублировано уточнение/i.test(journalEntryText(line)));
}
function sellerStatusBadge(s) {
    const status = s.статус;
    const remCnt = sellerReminderCount(s);
    const modelBadge = s.итог_модели?.плашка?.trim();
    const modelType = (s.итог_модели?.тип || "").trim().toLowerCase();
    if (modelBadge) {
        if (modelType === "отказ") {
            return {
                label: modelBadge,
                cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                Icon: XCircle,
            };
        }
        if (modelType === "уточнение") {
            return {
                label: modelBadge,
                cls: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
                Icon: MessageSquare,
            };
        }
        if (modelType === "ответил") {
            return {
                label: modelBadge,
                cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                Icon: CheckCircle2,
            };
        }
    }
    switch (status) {
        case "публичная_оферта":
            return {
                label: "Публ. оферта",
                cls: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
                Icon: CheckCircle2,
            };
        case "ответил":
            if (sellerHasClarificationSent(s) && Object.keys(s.ответы || {}).length === 0) {
                return {
                    label: "Уточнение отправлено",
                    cls: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
                    Icon: MessageSquare,
                };
            }
            return {
                label: "Ответил",
                cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                Icon: CheckCircle2,
            };
        case "отправлено":
            return {
                label: "Отправлен запрос",
                cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
                Icon: Send,
            };
        case "напоминание":
            return {
                label: remCnt > 0 ? `Напоминание #${remCnt}` : "Отправлено напоминание",
                cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                Icon: Bell,
            };
        case "не_ответил":
            return {
                label: "Нет ответа (SLA)",
                cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                Icon: Clock,
            };
        case "отказ":
            return {
                label: s.итог_модели?.плашка || "Отказ",
                cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                Icon: XCircle,
            };
        case "пропущен":
            return {
                label: s.примечание || "Ошибка почты",
                cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                Icon: Clock,
            };
        case "черновик":
            return {
                label: "Черновик",
                cls: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
                Icon: Mail,
            };
        default:
            return {
                label: status || "Не отправлено",
                cls: "bg-slate-500/12 crm-muted",
                Icon: Clock,
            };
    }
}
function getTenderCommStage(t, sellers) {
    if (t.prices_confirmed) {
        return {
            label: "✅ Цены подтверждены",
            cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
        };
    }
    const activeSellers = sellers.filter((s) => s.статус !== "публичная_оферта");
    const hasNoReply = activeSellers.some((s) => s.статус === "не_ответил");
    const waitingReminder = activeSellers.filter((s) => s.статус === "напоминание");
    const hasClarification = activeSellers.some((s) => s.статус === "ответил" && sellerHasClarificationSent(s));
    const answeredCount = activeSellers.filter((s) => s.статус === "ответил").length;
    const sentCount = activeSellers.filter(isSentSeller).length;
    if (t.stage === "inquiry") {
        if (answeredCount > 0) {
            return {
                label: `📩 Получены КП от оптовиков (${answeredCount})`,
                cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
            };
        }
        if (hasNoReply && answeredCount === 0) {
            return {
                label: "⏳ Не дописались за 24 раб. ч — без ответа",
                cls: "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25",
            };
        }
        if (waitingReminder.length > 0) {
            return {
                label: "🔔 Отправлено напоминание оптовикам — ждём КП",
                cls: "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25",
            };
        }
        if (sentCount > 0) {
            return {
                label: "✉️ Запросы оптовикам отправлены — ждём КП",
                cls: "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/25",
            };
        }
        return {
            label: "⏳ Сбор КП (оптовики) — готовится рассылка",
            cls: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
        };
    }
    if (hasClarification) {
        return {
            label: "🔄 Отправлено уточнение — ждём цену",
            cls: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
        };
    }
    if (waitingReminder.length > 0) {
        const maxRem = Math.max(1, ...waitingReminder.map(sellerReminderCount));
        return {
            label: `🔔 Отправлено напоминание #${maxRem} — ждём ответ`,
            cls: "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25",
        };
    }
    if (hasNoReply && answeredCount === 0) {
        return {
            label: "⏳ Нет ответа за 24 раб. ч — недоступен для Витрины",
            cls: "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25",
        };
    }
    if (hasNoReply && answeredCount > 0) {
        return {
            label: "⚠️ Есть ответ, по части позиций нет ответа за 24 раб. ч",
            cls: "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25",
        };
    }
    if (answeredCount > 0) {
        return {
            label: "💬 Ответ получен — проверяем цену и наличие",
            cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
        };
    }
    if (sentCount > 0) {
        return {
            label: "✉️ Отправлен первичный запрос — ждём ответ",
            cls: "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/25",
        };
    }
    return {
        label: "⏳ Запросы ещё не отправлены",
        cls: "bg-slate-500/10 crm-muted border-[var(--crm-border)]",
    };
}
function getTenderExpenses(t) {
    const variants = t.details?.calculation?.variants || {};
    const bestCalc = (t.best_variant && variants[t.best_variant]) || Object.values(variants)[0] || null;
    if (bestCalc && (bestCalc.purchase != null || bestCalc.delivery != null)) {
        return Number(bestCalc.purchase || 0) + Number(bestCalc.delivery || 0);
    }
    return t.expenses;
}
function getTenderSellers(t) {
    const fromMail = t.details?.mail_state?.продавцы;
    if (Array.isArray(fromMail) && fromMail.length > 0)
        return fromMail;
    const fromInq = t.details?.inquiry_suppliers;
    if (Array.isArray(fromInq) && fromInq.length > 0) {
        return fromInq.map((c, i) => ({
            key: `inq-${i + 1}`,
            продавец: c.seller || c.name || "Оптовик",
            роль: "оптовик (КП)",
            email: c.email || null,
            телефон: c.phone || null,
            статус: c.status || "новый",
        }));
    }
    return [];
}
function isSentSeller(s) {
    return Boolean(s.отправлено_в) || SENT_STATUSES.has(s.статус || "");
}
function isWaitingTender(t) {
    if (t.stage === "inquiry")
        return true;
    if (t.prices_confirmed || isTenderAllPublicOffer(t))
        return false;
    const st = (t.price_request_status || "").toLowerCase();
    const verdict = (t.details?.mail_state?.итог?.вердикт || "").toLowerCase();
    return (verdict === "в_работе" ||
        st.includes("ждём") ||
        st.includes("ждем") ||
        st.includes("отправлен") ||
        st.includes("частично") ||
        st.includes("ожидаем кп") ||
        st.includes("ожидание кп"));
}
function classifyTenderMailState(t) {
    const activeSellers = getTenderSellers(t).filter((s) => s.статус !== "публичная_оферта");
    let answered = 0;
    let waiting = 0;
    let noReply = 0;
    let declined = 0;
    for (const s of activeSellers) {
        if (s.статус === "ответил")
            answered += 1;
        else if (WAITING_SELLER_STATUSES.has(s.статус || ""))
            waiting += 1;
        else if (s.статус === "не_ответил")
            noReply += 1;
        else if (s.статус === "отказ")
            declined += 1;
    }
    let bucket;
    if (t.prices_confirmed) {
        bucket = "confirmed";
    }
    else if (answered > 0) {
        bucket = "has_answers";
    }
    else if (waiting > 0 || isWaitingTender(t)) {
        bucket = "waiting";
    }
    else if (declined > 0 && noReply === 0) {
        bucket = "declined";
    }
    else if (noReply > 0 && noReply >= declined) {
        bucket = "no_reply";
    }
    else if (declined > 0) {
        bucket = "declined";
    }
    else {
        bucket = "waiting";
    }
    return { bucket, answered, waiting, noReply, declined };
}
export function PriceRequestsView({ tenders, updatesByTender, onOpenNumber }) {
    const [scope, setScope] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const relevantTenders = useMemo(() => {
        return tenders
            .filter((t) => {
            if (getDeadlineInfo(t.deadline_at).tone === "expired")
                return false;
            if (t.stage !== "inquiry" && t.stage !== "tenders")
                return false;
            const sellers = getTenderSellers(t);
            if (t.stage === "inquiry")
                return true;
            if (isTenderAllPublicOffer(t))
                return false;
            if (sellers.length === 0)
                return false;
            const onlyPublicOffers = sellers.every((s) => s.статус === "публичная_оферта");
            return !onlyPublicOffers;
        })
            .sort((a, b) => {
            if (sortBy === "newest") {
                return new Date(b.synced_at).getTime() - new Date(a.synced_at).getTime();
            }
            if (sortBy === "oldest") {
                return new Date(a.synced_at).getTime() - new Date(b.synced_at).getTime();
            }
            if (sortBy === "deadline") {
                const ta = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
                const tb = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
                return ta - tb;
            }
            const score = (t) => t.stage === "inquiry" ? 0 : isWaitingTender(t) ? 1 : 2;
            const diff = score(a) - score(b);
            if (diff !== 0)
                return diff;
            const ta = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
            const tb = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
            return ta - tb;
        });
    }, [tenders, sortBy]);
    const { stats, tenderStates } = useMemo(() => {
        let sentEmails = 0;
        let answered = 0;
        let waitingReplies = 0;
        let noReplyEmails = 0;
        let declinedEmails = 0;
        let inquiryCount = 0;
        let confirmedCount = 0;
        let hasAnswersCount = 0;
        let waitingCount = 0;
        let noReplyCount = 0;
        let declinedCount = 0;
        const states = new Map();
        for (const t of relevantTenders) {
            if (t.stage === "inquiry")
                inquiryCount += 1;
            for (const s of getTenderSellers(t)) {
                if (s.статус === "публичная_оферта")
                    continue;
                if (isSentSeller(s))
                    sentEmails += 1;
                if (s.статус === "ответил")
                    answered += 1;
                else if (WAITING_SELLER_STATUSES.has(s.статус || ""))
                    waitingReplies += 1;
                else if (s.статус === "не_ответил")
                    noReplyEmails += 1;
                else if (s.статус === "отказ")
                    declinedEmails += 1;
            }
            const st = classifyTenderMailState(t);
            states.set(t.number, st);
            if (st.bucket === "confirmed")
                confirmedCount += 1;
            else if (st.bucket === "has_answers")
                hasAnswersCount += 1;
            else if (st.bucket === "waiting")
                waitingCount += 1;
            else if (st.bucket === "no_reply")
                noReplyCount += 1;
            else if (st.bucket === "declined")
                declinedCount += 1;
        }
        return {
            stats: {
                sentEmails,
                answered,
                waitingReplies,
                noReplyEmails,
                declinedEmails,
                inquiryCount,
                confirmedCount,
                hasAnswersCount,
                waitingCount,
                noReplyCount,
                declinedCount,
            },
            tenderStates: states,
        };
    }, [relevantTenders]);
    const visibleTenders = useMemo(() => {
        if (scope === "no_reply") {
            return relevantTenders.filter((t) => tenderStates.get(t.number)?.bucket === "no_reply");
        }
        if (scope === "inquiry_only") {
            return relevantTenders.filter((t) => t.stage === "inquiry");
        }
        if (scope === "waiting") {
            return relevantTenders.filter((t) => tenderStates.get(t.number)?.bucket === "waiting");
        }
        if (scope === "has_answers") {
            return relevantTenders.filter((t) => tenderStates.get(t.number)?.bucket === "has_answers");
        }
        if (scope === "declined") {
            return relevantTenders.filter((t) => tenderStates.get(t.number)?.bucket === "declined");
        }
        if (scope === "confirmed") {
            return relevantTenders.filter((t) => tenderStates.get(t.number)?.bucket === "confirmed");
        }
        return relevantTenders;
    }, [relevantTenders, scope, tenderStates]);
    return (_jsxs("div", { className: "space-y-3 pb-6", children: [_jsxs("section", { className: "crm-surface rounded-2xl p-3.5 space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "text-sm font-semibold flex items-center gap-1.5", children: [_jsx(Send, { className: "w-4 h-4 text-blue-500" }), "\u0417\u0430\u043F\u0440\u043E\u0441\u044B \u0446\u0435\u043D \u0438 \u041A\u041F \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0430\u043C"] }), _jsxs("span", { className: "text-[11px] crm-muted whitespace-nowrap", children: ["\u0442\u0435\u043D\u0434\u0435\u0440\u043E\u0432: ", relevantTenders.length, " \u00B7 \u043F\u0438\u0441\u0435\u043C: ", stats.sentEmails] })] }), _jsxs("div", { className: "grid grid-cols-4 gap-1.5 text-center", children: [_jsxs("div", { className: "rounded-xl bg-emerald-500/10 p-2", children: [_jsx("div", { className: "text-base font-bold text-emerald-600 dark:text-emerald-400", children: stats.confirmedCount + stats.hasAnswersCount }), _jsx("div", { className: "text-[10px] font-medium leading-tight", children: "\u0415\u0441\u0442\u044C \u041A\u041F" }), _jsxs("div", { className: "text-[9px] crm-muted mt-0.5", children: ["\u043E\u0442\u0432\u0435\u0442\u043E\u0432: ", stats.answered] })] }), _jsxs("div", { className: "rounded-xl bg-amber-500/10 p-2", children: [_jsx("div", { className: "text-base font-bold text-amber-600 dark:text-amber-400", children: stats.waitingCount }), _jsx("div", { className: "text-[10px] font-medium leading-tight", children: "\u0416\u0434\u0451\u043C \u043E\u0442\u0432\u0435\u0442" }), _jsxs("div", { className: "text-[9px] crm-muted mt-0.5", children: ["\u043F\u0438\u0441\u0435\u043C: ", stats.waitingReplies] })] }), _jsxs("div", { className: "rounded-xl bg-orange-500/10 p-2", children: [_jsx("div", { className: "text-base font-bold text-orange-600 dark:text-orange-400", children: stats.noReplyCount }), _jsx("div", { className: "text-[10px] font-medium leading-tight", children: "\u041C\u043E\u043B\u0447\u0430\u0442 (SLA)" }), _jsxs("div", { className: "text-[9px] crm-muted mt-0.5", children: ["\u043F\u0438\u0441\u0435\u043C: ", stats.noReplyEmails] })] }), _jsxs("div", { className: "rounded-xl bg-rose-500/10 p-2", children: [_jsx("div", { className: "text-base font-bold text-rose-600 dark:text-rose-400", children: stats.declinedCount }), _jsx("div", { className: "text-[10px] font-medium leading-tight", children: "\u041F\u043E\u043B\u043D\u044B\u0439 \u043E\u0442\u043A\u0430\u0437" }), _jsxs("div", { className: "text-[9px] crm-muted mt-0.5", children: ["\u043E\u0442\u043A\u0430\u0437\u043E\u0432: ", stats.declinedEmails] })] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { "aria-label": "\u0424\u0438\u043B\u044C\u0442\u0440 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u0446\u0435\u043D", value: scope, onChange: (e) => {
                            haptic("select");
                            setScope(e.target.value);
                        }, className: "flex-1 min-w-0 crm-surface text-[var(--crm-text)] rounded-xl border border-[var(--crm-border)] px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40", children: [_jsxs("option", { value: "all", children: ["\u0412\u0441\u0435 (", relevantTenders.length, ")"] }), stats.hasAnswersCount > 0 && (_jsxs("option", { value: "has_answers", children: ["\uD83D\uDCE9 \u0415\u0441\u0442\u044C \u041A\u041F (", stats.hasAnswersCount, ")"] })), _jsxs("option", { value: "waiting", children: ["\u23F3 \u0416\u0434\u0451\u043C \u043E\u0442\u0432\u0435\u0442 (", stats.waitingCount, ")"] }), _jsxs("option", { value: "inquiry_only", children: ["\uD83C\uDFED \u041E\u043F\u0442\u043E\u0432\u0438\u043A\u0438 \u041A\u041F (", stats.inquiryCount, ")"] }), stats.noReplyCount > 0 && (_jsxs("option", { value: "no_reply", children: ["\u23F3 \u041C\u043E\u043B\u0447\u0430\u0442 \u043F\u043E SLA (", stats.noReplyCount, ")"] })), stats.declinedCount > 0 && (_jsxs("option", { value: "declined", children: ["\u274C \u041F\u043E\u043B\u043D\u044B\u0439 \u043E\u0442\u043A\u0430\u0437 (", stats.declinedCount, ")"] })), _jsxs("option", { value: "confirmed", children: ["\u2705 \u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u044B (", stats.confirmedCount, ")"] })] }), _jsxs("button", { type: "button", onClick: () => {
                            haptic("select");
                            setSortBy((prev) => prev === "default"
                                ? "newest"
                                : prev === "newest"
                                    ? "oldest"
                                    : prev === "oldest"
                                        ? "deadline"
                                        : "default");
                        }, className: "crm-surface rounded-xl px-2.5 py-1.5 text-xs font-medium inline-flex items-center gap-1 shrink-0", children: [_jsx(ArrowUpDown, { className: "w-3.5 h-3.5" }), _jsx("span", { children: sortBy === "default"
                                    ? "Очередь"
                                    : sortBy === "newest"
                                        ? "Новые"
                                        : sortBy === "oldest"
                                            ? "Старые"
                                            : "Срок" })] })] }), visibleTenders.length === 0 ? (_jsxs("div", { className: "crm-surface rounded-2xl p-8 text-center space-y-1.5", children: [_jsx("p", { className: "text-sm font-medium", children: scope === "inquiry_only"
                            ? "На этапе «Запрос цен» (сбор КП у оптовиков до расчёта) сейчас 0 папок"
                            : "Подходящих запросов цен нет" }), _jsx("p", { className: "text-xs crm-muted", children: "\u041A\u043E\u0433\u0434\u0430 \u0427\u0435\u0440\u0440\u0438 \u041F\u0438\u043A\u0435\u0440 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442 \u043D\u043E\u0432\u044B\u0439 \u0442\u0435\u043D\u0434\u0435\u0440 \u0432 \u043F\u0430\u043F\u043A\u0443 \u00AB\u0417\u0430\u043F\u0440\u043E\u0441 \u0446\u0435\u043D\u00BB \u0438\u043B\u0438 \u041F\u043E\u0447\u0442\u0430\u043B\u044C\u043E\u043D \u043D\u0430\u0447\u043D\u0451\u0442 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0443, \u043E\u043D\u0438 \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u0441\u043E \u0441\u043F\u0438\u0441\u043A\u043E\u043C \u0432\u0441\u0435\u0445 \u0430\u0434\u0440\u0435\u0441\u0430\u0442\u043E\u0432." })] })) : (_jsx("div", { className: "space-y-2.5", children: visibleTenders.map((t) => {
                    const sellers = getTenderSellers(t);
                    const emailSellers = sellers.filter((s) => s.статус !== "публичная_оферта");
                    const sentSellers = emailSellers.filter(isSentSeller).length;
                    const totalLettersSent = emailSellers.reduce((acc, s) => acc + sellerOutboundEmailsCount(s), 0);
                    const upd = updatesByTender?.[t.number];
                    const directExpenses = getTenderExpenses(t);
                    const commStage = getTenderCommStage(t, sellers);
                    return (_jsxs("article", { onClick: () => {
                            haptic("light");
                            onOpenNumber(t.number);
                        }, className: `crm-surface rounded-2xl p-3.5 space-y-2.5 cursor-pointer active:scale-[0.99] transition ${upd ? "ring-1 ring-blue-500/50" : ""}`, children: [upd && (_jsxs("div", { className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/25 text-[11px] font-semibold max-w-full", children: [upd.kind === "new" ? (_jsx(Sparkles, { className: "w-3 h-3 shrink-0" })) : (_jsx(Bell, { className: "w-3 h-3 shrink-0" })), _jsxs("span", { className: "truncate", children: [upd.kind === "new" ? "Новое: " : "Обновлено: ", upd.reason] })] })), _jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-start gap-1.5", children: [upd && (_jsx("span", { className: "w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5", title: upd.reason })), _jsx("span", { className: "text-base leading-snug shrink-0", children: t.icon || "📩" }), _jsx("h3", { className: "font-semibold text-[15px] leading-snug", children: t.product })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs", children: [_jsxs("span", { className: "crm-muted whitespace-nowrap", children: ["\u0420\u0430\u0441\u0445\u043E\u0434\u044B:", " ", _jsx("b", { className: "text-[var(--crm-text)]", children: formatRub(directExpenses) })] }), _jsx("span", { className: "crm-muted", children: "\u00B7" }), _jsxs("span", { className: "crm-muted whitespace-nowrap", children: ["\u041F\u0440\u0438\u0431\u044B\u043B\u044C:", " ", _jsx("b", { className: "text-emerald-600 dark:text-emerald-400", children: t.profit !== null && Number(t.profit) > 0
                                                            ? `+${formatRub(t.profit)}`
                                                            : formatRub(t.profit) })] })] })] }), _jsxs("div", { className: "rounded-xl bg-slate-500/6 border border-[var(--crm-border)] p-2.5 space-y-2", children: [_jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[10.5px] crm-muted block", children: "\u0412\u0441\u0435\u0433\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432" }), _jsx("span", { className: "font-bold", children: emailSellers.length })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[10.5px] crm-muted block", children: "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E" }), _jsxs("span", { className: "font-bold", children: [sentSellers, " \u0438\u0437 ", emailSellers.length] }), totalLettersSent > sentSellers && (_jsxs("span", { className: "text-[10.5px] crm-muted ml-1", children: ["(", totalLettersSent, " \u043F\u0438\u0441.)"] }))] })] }), _jsxs("div", { className: `rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${commStage.cls}`, children: ["\u042D\u0442\u0430\u043F: ", commStage.label] })] }), _jsx("div", { className: "space-y-1.5", children: sellers.map((s, idx) => {
                                    const badge = sellerStatusBadge(s);
                                    const StatusIcon = badge.Icon;
                                    const whenText = s.ответ_в
                                        ? `ответ ${formatNskDateTime(s.ответ_в)}`
                                        : s.отправлено_в
                                            ? `отпр. ${formatNskDateTime(s.отправлено_в)}`
                                            : null;
                                    const isNoReply = s.статус === "не_ответил";
                                    return (_jsxs("div", { className: `rounded-xl px-2.5 py-2 text-xs space-y-1.5 ${isNoReply
                                            ? "bg-amber-500/8 border border-amber-500/30"
                                            : "bg-slate-500/5"}`, children: [_jsx("div", { className: "flex items-start justify-between gap-2", children: _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "font-medium leading-snug", children: [s.продавец || "Поставщик", s.роль === "запасной" && (_jsx("span", { className: "ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-slate-500/15 crm-muted align-middle", children: "\u0437\u0430\u043F\u0430\u0441\u043D\u043E\u0439" })), s.роль === "архив_а" && (_jsx("span", { className: "ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 align-middle", children: "\u0430\u0440\u0445\u0438\u0432 \u0412\u0430\u0440. \u0410" }))] }), _jsx("div", { className: "text-[11px] crm-muted truncate mt-0.5", children: [s.email || "нет email", whenText].filter(Boolean).join(" · ") })] }) }), _jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [_jsxs("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium ${badge.cls}`, children: [_jsx(StatusIcon, { className: "w-3 h-3" }), badge.label] }), (() => {
                                                        if (s.статус === "ответил")
                                                            return null;
                                                        const est = calcPreliminaryEstimate(t, s.preliminary_price);
                                                        if (!est)
                                                            return null;
                                                        const diffStr = est.diffPct !== null ? ` (${est.diffPct > 0 ? `+${est.diffPct}` : est.diffPct}%)` : "";
                                                        const profStr = est.prelimProfit !== null ? ` · ≈ ${est.prelimProfit >= 0 ? "+" : ""}${formatRub(est.prelimProfit)}` : "";
                                                        const cls = (est.prelimProfit ?? 0) < 0
                                                            ? "bg-rose-500/12 text-rose-700 dark:text-rose-300"
                                                            : (est.prelimProfit ?? 0) >= 11000
                                                                ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                                                                : "bg-sky-500/12 text-sky-700 dark:text-sky-300";
                                                        return (_jsxs("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium ${cls}`, children: ["\u041F\u0440\u0435\u0434\u0432. ~", formatRub(est.prelimPrice), est.isPerUnit ? "/ед." : "", diffStr, profStr, " \u00B7 \u0436\u0434\u0451\u043C \u041A\u041F"] }));
                                                    })()] })] }, `${s.key || idx}`));
                                }) })] }, t.number));
                }) }))] }));
}
