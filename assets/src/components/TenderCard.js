import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, Bell, Check, CheckCircle2, Clock, Copy, KeyRound, Lock, Sparkles, Star, Unlock, } from "lucide-react";
import { useState } from "react";
import { formatMarginPct, formatRub, getDeadlineInfo, getTenderLawAndType, getTenderRestrictionInfo, isTenderAllPublicOffer, } from "../lib/format.js?v=mwq061ef";
import { resolvePipelineView } from "../lib/pipeline.js?v=mwq061ef";
import { haptic } from "../lib/telegram.js?v=mwq061ef";
const OWNER_BADGE_COLORS = {
    Кандидат: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25",
    "В работе": "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
    "Подана заявка": "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30",
    Выигран: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    Отклонён: "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25",
};
export function TenderCard({ tender, updateInfo, stageNote, readOnly, storefrontMode = false, onOpen, onToggleFavorite, }) {
    const [copied, setCopied] = useState(false);
    const dl = getDeadlineInfo(tender.deadline_at);
    const marginPct = formatMarginPct(tender);
    const allPublicOffer = isTenderAllPublicOffer(tender);
    const customerShort = tender.details?.customer?.short_name || tender.details?.customer?.name;
    const variants = tender.details?.calculation?.variants || {};
    const bestCalc = (tender.best_variant && variants[tender.best_variant]) ||
        Object.values(variants)[0] ||
        null;
    const purchaseAndDelivery = bestCalc && (bestCalc.purchase != null || bestCalc.delivery != null)
        ? Number(bestCalc.purchase || 0) + Number(bestCalc.delivery || 0)
        : null;
    const isExpiredInActive = ["blanks", "prices", "inquiry", "calc", "review", "tenders"].includes(tender.stage) &&
        dl.tone === "expired";
    const pv = !storefrontMode ? resolvePipelineView(tender) : null;
    const itemsCount = tender.details?.items?.length || 0;
    const dlBadgeClass = dl.tone === "expired"
        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
        : dl.tone === "critical"
            ? "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30"
            : dl.tone === "warn"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                : "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20";
    const copyNumber = (e) => {
        e.stopPropagation();
        haptic("light");
        navigator.clipboard?.writeText(tender.number);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
    };
    const toggleFav = (e) => {
        e.stopPropagation();
        haptic("select");
        onToggleFavorite(tender);
    };
    const isUnlocked = Boolean(tender.is_unlocked);
    const { law: lawLabel, is223, procedureType, isQuoteRequest } = getTenderLawAndType(tender);
    const cityLabel = tender.city || "Новосибирск";
    const restr = getTenderRestrictionInfo(tender);
    const lawBadgeCls = is223
        ? "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/25"
        : "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25";
    const procBadgeCls = isQuoteRequest
        ? "bg-teal-500/12 text-teal-700 dark:text-teal-300 border-teal-500/25"
        : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20";
    if (!storefrontMode && pv) {
        const progressPct = Math.max(6, Math.min(100, Math.round((pv.progress.done / Math.max(1, pv.progress.total)) * 100)));
        const barColor = pv.laneId === "storefront"
            ? "bg-emerald-500"
            : pv.needsAttention
                ? "bg-amber-500"
                : "bg-blue-500";
        return (_jsxs("article", { onClick: () => {
                haptic("light");
                onOpen(tender);
            }, className: `crm-surface rounded-xl p-3 space-y-2 transition active:scale-[0.99] cursor-pointer overflow-hidden ${isExpiredInActive ? "border-rose-500/45" : ""}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-2 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-1.5 min-w-0 flex-1", children: [updateInfo && (_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0", title: updateInfo.reason })), _jsx("span", { className: "text-sm leading-none shrink-0", children: tender.icon || "📦" }), _jsx("h3", { className: "font-semibold text-[13.5px] leading-tight truncate", children: tender.product })] }), _jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [_jsx("span", { className: `px-2 py-0.5 rounded-full border text-[10px] font-semibold ${pv.badgeCls}`, children: pv.shortTag }), !readOnly && (_jsx("button", { type: "button", onClick: toggleFav, "aria-label": "\u0412 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435", className: "p-1 -mr-1 rounded-full hover:bg-slate-500/10 shrink-0", children: _jsx(Star, { className: `w-3.5 h-3.5 ${tender.is_favorite ? "fill-amber-400 text-amber-400" : "crm-muted"}` }) }))] })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 text-[10.5px] min-w-0", children: [_jsxs("div", { className: "flex items-center gap-1 min-w-0 flex-wrap", children: [_jsx("span", { className: `px-1.5 py-0.5 rounded-md border font-semibold leading-none ${lawBadgeCls}`, children: lawLabel }), procedureType && (_jsx("span", { className: `px-1.5 py-0.5 rounded-md border font-medium leading-none ${procBadgeCls}`, children: procedureType })), _jsxs("button", { type: "button", onClick: copyNumber, className: "inline-flex items-center gap-1 font-mono crm-muted hover:text-[var(--crm-text)] shrink-0 ml-0.5", children: [copied ? (_jsx(Check, { className: "w-2.5 h-2.5 text-emerald-500" })) : (_jsx(Copy, { className: "w-2.5 h-2.5" })), tender.number.slice(-7)] })] }), restr.badges.length > 0 && (_jsx("div", { className: "flex items-center gap-1 shrink-0", children: restr.badges.slice(0, 2).map((b) => (_jsx("span", { className: "text-[10.5px] font-medium crm-muted", title: b.label, children: b.shortLabel }, b.id))) }))] }), _jsxs("div", { className: "flex items-center gap-1.5 text-[11px] crm-muted min-w-0", children: [_jsx(Clock, { className: "w-3 h-3 shrink-0" }), _jsxs("span", { className: `truncate ${isExpiredInActive ? "text-rose-600 dark:text-rose-400 font-medium" : ""}`, children: [dl.nskFormatted, " \u00B7 ", dl.label] })] }), pv.isTerminalReject ? (_jsxs("div", { className: "pt-1.5 border-t border-[var(--crm-border)] flex items-center justify-between gap-2 text-[11.5px] min-w-0", children: [_jsx("span", { className: "text-[var(--crm-text)]/85 truncate", children: pv.rejectReason }), _jsx("span", { className: "crm-muted shrink-0 font-medium", children: tender.profit !== null ? formatRub(tender.profit) : formatRub(tender.nmck) })] })) : pv.laneId === "storefront" ? (_jsxs("div", { className: "pt-1.5 border-t border-[var(--crm-border)] flex items-center justify-between gap-2 text-[11.5px] min-w-0", children: [_jsxs("span", { className: "text-emerald-700 dark:text-emerald-300 font-medium truncate", children: [allPublicOffer ? "Публ. оферта · Вар. " : "Подтверждено · Вар. ", tender.best_variant || "А"] }), _jsx("span", { className: "font-semibold text-emerald-600 dark:text-emerald-400 shrink-0", children: formatRub(tender.profit) })] })) : (_jsxs("div", { className: "pt-1.5 border-t border-[var(--crm-border)] space-y-1.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 text-[11px] min-w-0", children: [_jsx("span", { className: "font-medium text-[var(--crm-text)]/90 truncate", children: pv.progress.label }), _jsx("span", { className: "crm-muted shrink-0", children: tender.profit !== null
                                        ? `Прибыль ${formatRub(tender.profit)}`
                                        : tender.nmck !== null
                                            ? `НМЦК ${formatRub(tender.nmck)}`
                                            : itemsCount > 0
                                                ? `${itemsCount} поз.`
                                                : "" })] }), _jsx("div", { className: "h-1 rounded-full bg-slate-500/15 overflow-hidden", children: _jsx("div", { className: `h-full rounded-full transition-all ${barColor}`, style: { width: `${progressPct}%` } }) }), _jsx("div", { className: "text-[11px] crm-muted truncate", children: pv.nextStepHint })] }))] }));
    }
    return (_jsxs("article", { onClick: () => {
            haptic("light");
            onOpen(tender);
        }, className: `crm-surface rounded-2xl p-3.5 transition active:scale-[0.99] cursor-pointer ${!storefrontMode && isExpiredInActive
            ? "ring-1 ring-rose-500/50"
            : storefrontMode && isUnlocked
                ? "ring-1 ring-emerald-500/40"
                : !storefrontMode && updateInfo
                    ? "ring-1 ring-blue-500/50"
                    : ""}`, children: [!storefrontMode && updateInfo && (_jsxs("div", { className: "mb-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/25 text-[11px] font-semibold max-w-full", children: [updateInfo.kind === "new" ? (_jsx(Sparkles, { className: "w-3 h-3 shrink-0" })) : (_jsx(Bell, { className: "w-3 h-3 shrink-0" })), _jsxs("span", { className: "truncate", children: [updateInfo.kind === "new" ? "Новое: " : "Обновлено: ", updateInfo.reason] })] })), !storefrontMode && pv && (_jsxs("div", { className: "mb-2.5 space-y-1.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold truncate max-w-[72%] ${pv.badgeCls}`, children: pv.stageBadge }), _jsx("div", { className: "flex items-center gap-0.5 shrink-0", title: "\u041F\u0443\u0442\u044C: \u0424\u0430\u0442\u0438\u043C\u0430 \u2192 \u0427\u0435\u0440\u0438\u043F\u0438\u043A\u0435\u0440 \u2192 \u041E\u0447\u043A\u0430\u0440\u0438\u043A \u2192 \u041F\u043E\u0447\u0442\u0430\u043B\u044C\u043E\u043D/\u041E\u0422\u041A \u2192 \u0412\u0438\u0442\u0440\u0438\u043D\u0430", children: pv.steps.map((st) => (_jsx("span", { className: `h-1.5 w-3.5 rounded-full transition-colors ${st.state === "done"
                                        ? "bg-emerald-500"
                                        : st.state === "active"
                                            ? "bg-blue-500"
                                            : st.state === "blocked"
                                                ? "bg-amber-500"
                                                : st.state === "rejected"
                                                    ? "bg-rose-500"
                                                    : "bg-slate-500/20"}` }, st.id))) })] }), _jsxs("div", { className: "text-[11.5px] leading-snug text-[var(--crm-text)]/85 flex items-start gap-1.5", children: [pv.needsAttention && (_jsx(AlertTriangle, { className: "w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" })), _jsx("span", { className: "line-clamp-2", children: pv.substage })] })] })), _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1.5 min-w-0", children: [_jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded-md border text-[10.5px] font-semibold leading-none ${lawBadgeCls}`, children: lawLabel }), procedureType && (_jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded-md border text-[10.5px] font-medium leading-none ${procBadgeCls}`, children: procedureType }))] }), storefrontMode || !readOnly ? (_jsx("button", { type: "button", onClick: toggleFav, "aria-label": "\u0412 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435", className: "p-1.5 -m-1 rounded-full hover:bg-slate-500/10 shrink-0", children: _jsx(Star, { className: `w-4 h-4 ${tender.is_favorite ? "fill-amber-400 text-amber-400" : "crm-muted"}` }) })) : (tender.is_favorite && (_jsx(Star, { className: "w-4 h-4 fill-amber-400 text-amber-400 shrink-0" })))] }), _jsxs("div", { className: "mt-2 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-lg leading-none shrink-0", children: tender.icon || "📦" }), _jsx("h3", { className: "font-semibold text-[15px] leading-snug truncate", children: tender.product }), !storefrontMode && stageNote && (_jsx("p", { className: "mt-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300", children: stageNote }))] }), storefrontMode ? (_jsx("p", { className: "mt-0.5 text-xs crm-muted truncate", children: isUnlocked && customerShort ? `📍 ${cityLabel} · ${customerShort}` : `📍 ${cityLabel}` })) : (_jsx("p", { className: "mt-0.5 text-xs crm-muted truncate", children: customerShort ? `📍 ${cityLabel} · ${customerShort}` : `📍 ${cityLabel}` }))] }), storefrontMode || tender.profit !== null ? (_jsxs("div", { className: "mt-2.5 rounded-xl bg-slate-500/6 border border-[var(--crm-border)] px-3 py-2 flex items-center justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("span", { className: "text-[10.5px] uppercase tracking-wide crm-muted block", children: "\u041F\u0440\u0438\u0431\u044B\u043B\u044C" }), _jsxs("div", { className: "flex items-baseline gap-1.5", children: [_jsx("span", { className: `text-[17px] font-bold leading-tight ${tender.profit !== null && Number(tender.profit) >= 11000
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : tender.profit !== null && Number(tender.profit) < 11000
                                                ? "text-rose-600 dark:text-rose-400"
                                                : ""}`, children: formatRub(tender.profit) }), marginPct && _jsxs("span", { className: "text-xs font-medium crm-muted", children: ["(", marginPct, ")"] })] })] }), _jsxs("div", { className: "text-right shrink-0", children: [_jsx("span", { className: "text-[10.5px] uppercase tracking-wide crm-muted block", children: storefrontMode ? "Расходы" : "НМЦК / Закупка" }), _jsx("span", { className: "text-sm font-semibold leading-tight", children: storefrontMode
                                    ? formatRub(tender.expenses ?? purchaseAndDelivery)
                                    : `${formatRub(tender.nmck)}${purchaseAndDelivery !== null ? ` · ${formatRub(purchaseAndDelivery)}` : ""}` })] })] })) : (_jsxs("div", { className: "mt-2.5 rounded-xl bg-slate-500/6 border border-[var(--crm-border)] px-3 py-2 flex items-center justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("span", { className: "text-[10.5px] uppercase tracking-wide crm-muted block", children: "\u041D\u041C\u0426\u041A" }), _jsx("span", { className: "text-[16px] font-bold leading-tight", children: formatRub(tender.nmck) })] }), _jsxs("div", { className: "text-right shrink-0", children: [_jsx("span", { className: "text-[10.5px] uppercase tracking-wide crm-muted block", children: "\u0421\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F" }), _jsxs("span", { className: "text-xs font-medium crm-muted", children: [itemsCount > 0 ? `${itemsCount} поз.` : "Разбор ТЗ", tender.category ? ` · ${tender.category}` : ""] })] })] })), _jsxs("div", { className: "mt-2.5 space-y-1.5 text-[11px]", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsxs("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium ${dlBadgeClass}`, children: [_jsx(Clock, { className: "w-3 h-3" }), !storefrontMode && isExpiredInActive
                                        ? `Срок истёк (${dl.nskFormatted}) — почистить CRM`
                                        : `${dl.nskFormatted} · ${dl.label}`] }), storefrontMode ? (allPublicOffer ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-medium", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "\u0426\u0435\u043D\u0430 \u043F\u043E \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u043E\u0439 \u043E\u0444\u0435\u0440\u0442\u0435"] })) : (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-medium", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "\u0426\u0435\u043D\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430"] }))) : allPublicOffer ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-medium", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "\u0426\u0435\u043D\u0430 \u043F\u043E \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u043E\u0439 \u043E\u0444\u0435\u0440\u0442\u0435"] })) : tender.prices_confirmed ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-medium", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "\u0426\u0435\u043D\u044B \u043F\u043E\u0434\u0442\u0432."] })) : (tender.price_request_status &&
                                tender.price_request_status !== "Не начат" && (_jsx("span", { className: "inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-medium", children: tender.price_request_status }))), !storefrontMode && tender.owner_status && (_jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full border font-medium ${OWNER_BADGE_COLORS[tender.owner_status] ||
                                    "bg-slate-500/10 text-slate-600 border-slate-500/20"}`, children: tender.owner_status })), !storefrontMode &&
                                tender.stage !== "overdue" &&
                                (tender.details?.mail_state?.продавцы || []).some((s) => s.статус === "не_ответил") && (_jsx("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-semibold", children: "\u041D\u0435\u0442 \u043E\u0442\u0432\u0435\u0442\u0430 (24 \u0440\u0430\u0431. \u0447)" }))] }), restr.badges.length > 0 && (_jsx("div", { className: "flex flex-wrap items-center gap-1.5 pt-0.5", children: restr.badges.map((b) => (_jsx("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${b.cls}`, children: b.label }, b.id))) }))] }), storefrontMode ? (isUnlocked ? (_jsxs("div", { className: "mt-2.5 pt-2 border-t border-[var(--crm-border)] flex items-center justify-between text-[11px]", children: [_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold", children: [_jsx(Unlock, { className: "w-3 h-3" }), "\u041E\u0442\u043A\u0440\u044B\u0442\u043E"] }), _jsxs("button", { type: "button", onClick: copyNumber, className: "inline-flex items-center gap-1 font-mono crm-muted hover:text-[var(--crm-text)]", children: [copied ? _jsx(Check, { className: "w-3 h-3 text-emerald-500" }) : _jsx(Copy, { className: "w-3 h-3" }), tender.number] })] })) : (_jsxs("div", { className: "mt-2.5 pt-2 border-t border-[var(--crm-border)] flex items-center justify-between gap-2 text-[11px]", children: [_jsxs("span", { className: "inline-flex items-center gap-1 crm-muted truncate", children: [_jsx(Lock, { className: "w-3 h-3 shrink-0" }), _jsx("span", { className: "truncate", children: "\u041F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A \u0438 \u2116 \u0437\u0430\u043A\u0443\u043F\u043A\u0438 \u0441\u043A\u0440\u044B\u0442\u044B" })] }), _jsxs("span", { className: "inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 shrink-0", children: ["\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430 1", _jsx(KeyRound, { className: "w-3 h-3" }), "\u2192"] })] }))) : (_jsxs("div", { className: "mt-2.5 pt-2 border-t border-[var(--crm-border)] flex items-center justify-between text-[11px] crm-muted", children: [_jsxs("button", { type: "button", onClick: copyNumber, className: "inline-flex items-center gap-1 font-mono hover:text-[var(--crm-text)]", children: [copied ? _jsx(Check, { className: "w-3 h-3 text-emerald-500" }) : _jsx(Copy, { className: "w-3 h-3" }), tender.number] }), _jsxs("span", { className: "truncate max-w-[52%]", children: [tender.details?.pipeline?.folder || lawLabel, tender.best_variant ? ` · Вар. ${tender.best_variant}` : ""] })] }))] }));
}
