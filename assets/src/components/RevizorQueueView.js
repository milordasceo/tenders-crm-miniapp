import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AlertTriangle, ArrowUpDown, Bell, CheckCircle2, ShieldCheck, Sparkles, Store, XCircle, } from "lucide-react";
import { useMemo, useState } from "react";
import { formatMarginPct, formatNskDateTime, formatRub, getDeadlineInfo, getProfitThresholdRub, isTenderAllPublicOffer, isTenderStorefrontReady, } from "../lib/format.js?v=mx0305v6";
import { resolvePipelineView } from "../lib/pipeline.js?v=mx0305v6";
import { haptic } from "../lib/telegram.js?v=mx0305v6";
export function RevizorQueueView({ tenders, updatesByTender, onOpenNumber, onOpenStorefront, }) {
    const [scope, setScope] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const crmTenders = useMemo(() => tenders
        .filter((t) => t.stage === "tenders" &&
        getDeadlineInfo(t.deadline_at).tone !== "expired")
        .sort((a, b) => {
        if (sortBy === "newest") {
            return new Date(b.synced_at).getTime() - new Date(a.synced_at).getTime();
        }
        if (sortBy === "oldest") {
            return new Date(a.synced_at).getTime() - new Date(b.synced_at).getTime();
        }
        if (sortBy === "profit") {
            return Number(b.profit ?? -1e12) - Number(a.profit ?? -1e12);
        }
        if (sortBy === "deadline") {
            const ta = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
            const tb = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
            return ta - tb;
        }
        const aReady = isTenderStorefrontReady(a) ? 1 : 0;
        const bReady = isTenderStorefrontReady(b) ? 1 : 0;
        if (aReady !== bReady)
            return aReady - bReady; // Сначала требующие доработки
        const ta = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
        const tb = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
        return ta - tb;
    }), [tenders, sortBy]);
    const approvedList = useMemo(() => crmTenders.filter((t) => isTenderStorefrontReady(t)), [crmTenders]);
    const blockedList = useMemo(() => crmTenders.filter((t) => !isTenderStorefrontReady(t)), [crmTenders]);
    const visibleList = scope === "approved" ? approvedList : scope === "blocked" ? blockedList : crmTenders;
    return (_jsxs("div", { className: "space-y-3 pb-6", children: [_jsxs("section", { className: "crm-surface rounded-2xl p-3.5 space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "text-sm font-bold flex items-center gap-1.5", children: [_jsx(ShieldCheck, { className: "w-4 h-4 text-emerald-500" }), "\u041E\u0422\u041A \u00AB\u0420\u0435\u0432\u0438\u0437\u043E\u0440\u00BB \u00B7 \u0414\u043E\u043F\u0443\u0441\u043A \u043D\u0430 \u0412\u0438\u0442\u0440\u0438\u043D\u0443"] }), _jsxs("button", { type: "button", onClick: () => {
                                    haptic("select");
                                    onOpenStorefront();
                                }, className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold", children: [_jsx(Store, { className: "w-3 h-3" }), "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0412\u0438\u0442\u0440\u0438\u043D\u0443"] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-center", children: [_jsxs("div", { className: "rounded-xl bg-emerald-500/12 p-2", children: [_jsx("div", { className: "text-base font-bold text-emerald-600 dark:text-emerald-400", children: approvedList.length }), _jsx("div", { className: "text-[10px] crm-muted", children: "\u041D\u0430 \u0412\u0438\u0442\u0440\u0438\u043D\u0435 \u2705" })] }), _jsxs("div", { className: "rounded-xl bg-amber-500/12 p-2", children: [_jsx("div", { className: "text-base font-bold text-amber-700 dark:text-amber-300", children: blockedList.length }), _jsx("div", { className: "text-[10px] crm-muted", children: "\u0417\u0430\u0434\u0435\u0440\u0436\u0430\u043D\u044B \u041E\u0422\u041A \u26D4" })] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { "aria-label": "\u0424\u0438\u043B\u044C\u0442\u0440 \u041E\u0422\u041A", value: scope, onChange: (e) => {
                            haptic("select");
                            setScope(e.target.value);
                        }, className: "flex-1 min-w-0 crm-surface text-[var(--crm-text)] rounded-xl border border-[var(--crm-border)] px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40", children: [_jsxs("option", { value: "all", children: ["\u0412\u0441\u0435 \u0432 CRM (", crmTenders.length, ")"] }), _jsxs("option", { value: "blocked", children: ["\u26D4 \u0417\u0430\u0434\u0435\u0440\u0436\u0430\u043D\u044B \u041E\u0422\u041A (", blockedList.length, ")"] }), _jsxs("option", { value: "approved", children: ["\u2705 \u041D\u0430 \u0412\u0438\u0442\u0440\u0438\u043D\u0435 (", approvedList.length, ")"] })] }), _jsxs("button", { type: "button", onClick: () => {
                            haptic("select");
                            setSortBy((prev) => prev === "ready"
                                ? "newest"
                                : prev === "newest"
                                    ? "oldest"
                                    : prev === "oldest"
                                        ? "deadline"
                                        : prev === "deadline"
                                            ? "profit"
                                            : "ready");
                        }, className: "crm-surface rounded-xl px-2.5 py-1.5 text-xs font-medium inline-flex items-center gap-1 shrink-0", children: [_jsx(ArrowUpDown, { className: "w-3.5 h-3.5" }), _jsx("span", { children: sortBy === "ready"
                                    ? "Очередь"
                                    : sortBy === "newest"
                                        ? "Новые"
                                        : sortBy === "oldest"
                                            ? "Старые"
                                            : sortBy === "deadline"
                                                ? "Срок"
                                                : "Прибыль" })] })] }), visibleList.length === 0 ? (_jsxs("div", { className: "crm-surface rounded-2xl p-8 text-center space-y-1.5", children: [_jsx("p", { className: "text-sm font-medium", children: "\u041A\u0430\u0440\u0442\u043E\u0447\u0435\u043A \u0432 \u044D\u0442\u043E\u043C \u0444\u0438\u043B\u044C\u0442\u0440\u0435 \u041E\u0422\u041A \u043D\u0435\u0442" }), _jsx("p", { className: "text-xs crm-muted", children: "\u041A\u043E\u0433\u0434\u0430 \u041E\u0447\u043A\u0430\u0440\u0438\u043A \u043F\u0435\u0440\u0435\u0432\u0435\u0434\u0451\u0442 \u0440\u0435\u043D\u0442\u0430\u0431\u0435\u043B\u044C\u043D\u044B\u0435 \u0442\u0435\u043D\u0434\u0435\u0440\u044B \u0432 CRM/, \u0420\u0435\u0432\u0438\u0437\u043E\u0440 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442 \u0438\u0445 \u043F\u0435\u0440\u0435\u0434 \u0432\u044B\u0445\u043E\u0434\u043E\u043C \u043D\u0430 \u0412\u0438\u0442\u0440\u0438\u043D\u0443." })] })) : (_jsx("div", { className: "space-y-2.5", children: visibleList.map((t) => {
                    const ready = isTenderStorefrontReady(t);
                    const qc = t.details?.qc;
                    const dl = getDeadlineInfo(t.deadline_at);
                    const margin = formatMarginPct(t);
                    const blockers = qc?.blockers || [];
                    const checks = qc?.checks;
                    const upd = updatesByTender?.[t.number];
                    const pv = resolvePipelineView(t);
                    const minProfit = getProfitThresholdRub(t.nmck);
                    const minProfitShort = minProfit === 6000 ? "6к" : "11к";
                    const checkList = [
                        ["Этап CRM", checks?.stage_ok ?? t.stage === "tenders"],
                        ["Срок > 4ч", checks?.deadline_ok ?? dl.tone !== "expired"],
                        ["Цены подтв.", checks?.prices_confirmed_ok ?? t.prices_confirmed],
                        ["Без отказов", checks?.no_refusals_ok ?? true],
                        [
                            `Прибыль ≥ ${minProfitShort}`,
                            checks?.profit_ok ?? (t.profit !== null && Number(t.profit) >= minProfit),
                        ],
                        ["ТЗ и цены", checks?.docs_ok ?? Boolean(t.details?.items?.length)],
                    ];
                    return (_jsxs("article", { onClick: () => {
                            haptic("light");
                            onOpenNumber(t.number);
                        }, className: `crm-surface rounded-2xl p-3.5 space-y-2.5 cursor-pointer active:scale-[0.99] transition border ${upd
                            ? "ring-1 ring-blue-500/55 border-blue-500/45"
                            : ready
                                ? "border-emerald-500/35"
                                : dl.tone === "expired"
                                    ? "border-rose-500/40"
                                    : "border-amber-500/35"}`, children: [upd && (_jsxs("div", { className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/25 text-[11px] font-semibold max-w-full", children: [upd.kind === "new" ? (_jsx(Sparkles, { className: "w-3 h-3 shrink-0" })) : (_jsx(Bell, { className: "w-3 h-3 shrink-0" })), _jsxs("span", { className: "truncate", children: [upd.kind === "new" ? "Новое: " : "Обновлено: ", upd.reason] })] })), _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [upd && (_jsx("span", { className: "w-2 h-2 rounded-full bg-blue-500 shrink-0", title: upd.reason })), _jsx("span", { className: "text-base leading-none", children: t.icon || "📦" }), _jsx("h3", { className: "font-semibold text-[14.5px] leading-snug truncate", children: t.product })] }), _jsxs("div", { className: "text-[11px] crm-muted mt-0.5 flex items-center gap-2 flex-wrap", children: [_jsx("span", { className: "font-mono", children: t.number }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: ["\u0434\u043E ", formatNskDateTime(t.deadline_at), " (", dl.label, ")"] })] })] }), _jsx("span", { className: `shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${ready
                                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                            : "bg-amber-500/15 text-amber-800 dark:text-amber-300"}`, children: ready ? (_jsxs(_Fragment, { children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "\u041D\u0430 \u0412\u0438\u0442\u0440\u0438\u043D\u0435"] })) : (_jsxs(_Fragment, { children: [_jsx(AlertTriangle, { className: "w-3 h-3" }), "\u0422\u043E\u043B\u044C\u043A\u043E CRM"] })) })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 text-xs rounded-xl bg-slate-500/6 px-3 py-2", children: [_jsxs("div", { children: [_jsx("span", { className: "crm-muted", children: "\u041F\u0440\u0438\u0431\u044B\u043B\u044C: " }), _jsx("b", { className: t.profit !== null && Number(t.profit) >= minProfit
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-rose-600 dark:text-rose-400", children: formatRub(t.profit) }), margin && _jsxs("span", { className: "crm-muted ml-1", children: ["(", margin, ")"] })] }), _jsxs("div", { className: "crm-muted", children: ["\u0412\u0430\u0440. ", _jsx("b", { children: t.best_variant || "—" }), isTenderAllPublicOffer(t) ? " · Публ. оферта" : ""] })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-1 text-[10.5px]", children: checkList.map(([label, ok]) => (_jsxs("div", { className: `rounded-lg px-2 py-1 flex items-center gap-1 font-medium ${ok
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`, children: [ok ? (_jsx(CheckCircle2, { className: "w-3 h-3 shrink-0" })) : (_jsx(XCircle, { className: "w-3 h-3 shrink-0" })), _jsx("span", { className: "truncate", children: label })] }, label))) }), blockers.length > 0 && (_jsxs("div", { className: "rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200 space-y-1", children: [_jsx("div", { className: "font-semibold", children: "\u041F\u043E\u0447\u0435\u043C\u0443 \u043D\u0435 \u043F\u0443\u0449\u0435\u043D \u043D\u0430 \u0412\u0438\u0442\u0440\u0438\u043D\u0443:" }), _jsx("ul", { className: "list-disc pl-4 space-y-0.5", children: blockers.map((b, i) => (_jsx("li", { children: b }, i))) })] })), _jsxs("div", { className: "rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] space-y-0.5", children: [_jsxs("div", { className: "text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300", children: ["\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0448\u0430\u0433 (", pv.botName, ")"] }), _jsx("div", { className: "font-medium text-slate-900 dark:text-slate-100", children: (() => {
                                            const sellers = t.details?.mail_state?.продавцы || [];
                                            const newCnt = sellers.filter((s) => s.статус === "новый").length;
                                            const noEmailCnt = sellers.filter((s) => s.статус === "нет_email").length;
                                            const waitCnt = sellers.filter((s) => s.статус === "отправлено" || s.статус === "напоминание").length;
                                            if (newCnt > 0) {
                                                return `Почтальон: отправить ${newCnt} первичн. запрос(а) КП в рабочее окно.`;
                                            }
                                            if (noEmailCnt > 0) {
                                                return `Почтальон: найти email для ${noEmailCnt} поставщ. и отправить запрос.`;
                                            }
                                            if (waitCnt > 0) {
                                                return `Почтальон: ждём ответа от ${waitCnt} поставщ. (напоминания по SLA, затем перепроверка ОТК).`;
                                            }
                                            return pv.nextStepHint;
                                        })() })] })] }, t.number));
                }) }))] }));
}
