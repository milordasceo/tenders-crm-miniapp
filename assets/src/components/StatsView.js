import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { BarChart3, Calendar, Coins, Database, Filter, Mail, ShieldCheck, TrendingUp, } from "lucide-react";
import { useMemo, useState } from "react";
import { haptic } from "../lib/telegram.js?v=mx0305v6";
import { resolvePipelineView } from "../lib/pipeline.js?v=mx0305v6";
const EMPTY_FUNNEL = {
    fatima_total: 0,
    fatima_accepted: 0,
    fatima_rejected: 0,
    fatima_overdue: 0,
    fatima_not_supply: 0,
    fatima_long_supply: 0,
    fatima_forbidden: 0,
    cherry_total: 0,
    cherry_to_calc: 0,
    cherry_to_inquiry: 0,
    cherry_error: 0,
    pochtalyon_sent: 0,
    pochtalyon_answered: 0,
    pochtalyon_refused: 0,
    pochtalyon_no_reply: 0,
    ochkarik_total: 0,
    ochkarik_profitable: 0,
    ochkarik_unprofitable: 0,
    revizor_approved: 0,
    revizor_rejected: 0,
};
function fmtRub(n) {
    const v = Number(n || 0);
    return `${v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}
function fmtUsd(n) {
    const v = Number(n || 0);
    if (v === 0)
        return "$0.00";
    if (v < 0.01)
        return `$${v.toFixed(4)}`;
    return `$${v.toFixed(2)}`;
}
function fmtTokens(n) {
    const v = Number(n || 0);
    if (v >= 1_000_000)
        return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000)
        return `${(v / 1_000).toFixed(1)}k`;
    return String(v);
}
function meterTone(part, total) {
    if (!total)
        return "border-[var(--crm-border)] bg-slate-500/10";
    const pct = part / total;
    if (pct >= 0.9)
        return "border-rose-500/40 bg-rose-500/15";
    if (pct >= 0.7)
        return "border-amber-500/40 bg-amber-500/15";
    return "border-emerald-500/35 bg-emerald-500/15";
}
function SupabaseCard({ meter }) {
    const counts = meter?.counts || {};
    const dbMb = Number(meter?.db_estimate_mb || 0);
    const dbLimit = Number(meter?.db_limit_mb || 500);
    const users = Number(counts.crm_users || 0);
    const mauLimit = Number(meter?.mau_limit || 50_000);
    return (_jsxs("div", { className: "crm-surface rounded-2xl p-3 space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("span", { className: "text-[12.5px] font-bold flex items-center gap-1.5", children: [_jsx(Database, { className: "w-3.5 h-3.5 text-emerald-500 shrink-0" }), _jsx("span", { children: "\u0417\u0430\u043F\u0430\u0441 Supabase" })] }), _jsx("span", { className: "text-[10.5px] crm-muted shrink-0", children: "\u0431\u0435\u0441\u043F\u043B\u0430\u0442\u043D\u044B\u0439 \u043F\u043B\u0430\u043D" })] }), !meter ? (_jsx("div", { className: "text-[12px] crm-muted", children: "\u0421\u043D\u0438\u043C\u043E\u043A \u0435\u0449\u0451 \u0431\u0435\u0437 \u0446\u0438\u0444\u0440 \u0431\u0430\u0437\u044B. \u041F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043D\u0430 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C \u0442\u0430\u043A\u0442\u0435 \u0434\u0438\u0441\u043F\u0435\u0442\u0447\u0435\u0440\u0430." })) : meter.error ? (_jsx("div", { className: "text-[12px] text-rose-700 dark:text-rose-300", children: meter.error })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { className: `rounded-xl border p-2.5 ${meterTone(dbMb, dbLimit)}`, children: [_jsx("div", { className: "text-[10px] crm-muted", children: "\u0411\u0430\u0437\u0430, \u043E\u0446\u0435\u043D\u043A\u0430" }), _jsxs("div", { className: "text-[16px] font-bold mt-0.5", children: [dbMb.toLocaleString("ru-RU"), " / ", dbLimit, " \u041C\u0411"] }), _jsxs("div", { className: "text-[10.5px] crm-muted mt-0.5", children: [fmtPct(dbMb, dbLimit), " \u043B\u0438\u043C\u0438\u0442\u0430"] })] }), _jsxs("div", { className: `rounded-xl border p-2.5 ${meterTone(users, mauLimit)}`, children: [_jsx("div", { className: "text-[10px] crm-muted", children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438 CRM" }), _jsxs("div", { className: "text-[16px] font-bold mt-0.5", children: [users.toLocaleString("ru-RU"), " / ", mauLimit.toLocaleString("ru-RU")] }), _jsx("div", { className: "text-[10.5px] crm-muted mt-0.5", children: "\u0437\u0430\u043F\u0440\u043E\u0441\u044B \u043A API \u0431\u0435\u0437\u043B\u0438\u043C\u0438\u0442\u043D\u044B\u0435" })] })] }), _jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] divide-y divide-[var(--crm-border)] text-[11.5px]", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 px-3 py-2", children: [_jsx("span", { className: "crm-muted", children: "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u0442\u0435\u043D\u0434\u0435\u0440\u043E\u0432" }), _jsx("span", { className: "font-semibold", children: counts.tenders ?? "—" })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 px-3 py-2", children: [_jsx("span", { className: "crm-muted", children: "\u0421\u043E\u0431\u044B\u0442\u0438\u044F \u043B\u0435\u043D\u0442\u044B" }), _jsx("span", { className: "font-semibold", children: counts.tender_events ?? "—" })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 px-3 py-2", children: [_jsx("span", { className: "crm-muted", children: "\u041F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0438 \u0438 \u041A\u041F \u0432 \u0431\u0430\u0437\u0435" }), _jsxs("span", { className: "font-semibold", children: [counts.suppliers ?? "—", " / ", counts.supplier_quotes ?? "—"] })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 px-3 py-2", children: [_jsx("span", { className: "crm-muted", children: "\u0418\u0441\u0445\u043E\u0434\u044F\u0449\u0438\u0439 \u0442\u0440\u0430\u0444\u0438\u043A / Edge" }), _jsxs("span", { className: "font-semibold whitespace-nowrap", children: ["\u043B\u0438\u043C\u0438\u0442 ", meter.egress_limit_gb || 5, " \u0413\u0411 \u0438 ", ((meter.edge_limit || 500000) / 1000).toFixed(0), " \u0442\u044B\u0441."] })] })] }), _jsx("p", { className: "text-[10.5px] crm-muted leading-snug", children: meter.note })] }))] }));
}
function fmtPct(part, total) {
    if (!total || total <= 0)
        return "0%";
    return `${Math.round((part / total) * 100)}%`;
}
function fmtDateRu(isoDate) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
    if (!m)
        return isoDate;
    return `${m[3]}.${m[2]}.${m[1]}`;
}
export function StatsView({ snapshot, tenders = [] }) {
    const stats = snapshot?.engine_info?.stats;
    const daysList = stats?.by_day || [];
    const [selectedDay, setSelectedDay] = useState("all");
    const activeDayObj = useMemo(() => (selectedDay === "all" ? null : daysList.find((d) => d.date === selectedDay) || null), [daysList, selectedDay]);
    const funnel = activeDayObj
        ? activeDayObj.funnel
        : stats?.all_time_funnel || EMPTY_FUNNEL;
    const apiBlock = activeDayObj
        ? activeDayObj.api || undefined
        : snapshot?.api_usage?.total
            ? { ...snapshot.api_usage.total, by_bot: snapshot.api_usage.by_bot_total }
            : undefined;
    const live = stats?.live || snapshot?.queues || {};
    const lanes = useMemo(() => {
        const counts = { blanks: 0, prices: 0, inquiry: 0, calc: 0, crm: 0, showcase: 0 };
        for (const t of tenders) {
            const lane = resolvePipelineView(t).laneId;
            if (lane === "blanks")
                counts.blanks += 1;
            else if (lane === "prices")
                counts.prices += 1;
            else if (lane === "inquiry")
                counts.inquiry += 1;
            else if (lane === "calc")
                counts.calc += 1;
            else if (lane === "review" || lane === "crm_work")
                counts.crm += 1;
            else if (lane === "storefront")
                counts.showcase += 1;
        }
        return counts;
    }, [tenders]);
    const queueNow = tenders.length
        ? {
            Бланки: lanes.blanks,
            "Поиск цен": lanes.prices,
            "Запрос цен": lanes.inquiry,
            "К расчёту": lanes.calc,
            CRM: lanes.crm,
            "На Витрине": lanes.showcase,
        }
        : {
            Бланки: live["Бланки"] ?? 0,
            "Поиск цен": live["Поиск цен"] ?? 0,
            "Запрос цен": live["Запрос цен"] ?? 0,
            "К расчёту": live["К расчёту"] ?? 0,
            CRM: live["CRM"] ?? 0,
            "На Витрине": live["На Витрине"] ?? 0,
        };
    const mailLive = stats?.mail_live || {};
    const ue = stats?.unit_economics;
    const threshold = Number(snapshot?.profit_threshold ?? 11000);
    if (!snapshot) {
        return (_jsx("div", { className: "crm-surface rounded-2xl p-6 text-center text-sm crm-muted", children: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0438 \u0435\u0449\u0451 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B." }));
    }
    return (_jsxs("div", { className: "space-y-3 pb-4", children: [_jsxs("div", { className: "crm-surface rounded-2xl p-3 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(BarChart3, { className: "w-4 h-4 text-[var(--crm-accent)]" }), _jsx("span", { className: "text-[13px] font-bold", children: "\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 \u0438 \u044D\u043A\u043E\u043D\u043E\u043C\u0438\u043A\u0430" })] }), _jsx("span", { className: "text-[11px] crm-muted", children: selectedDay === "all" ? "За всё время" : fmtDateRu(selectedDay) })] }), _jsxs("div", { className: "flex items-center gap-1.5 overflow-x-auto pb-0.5", children: [_jsxs("button", { type: "button", onClick: () => {
                                    haptic("select");
                                    setSelectedDay("all");
                                }, className: `shrink-0 inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${selectedDay === "all"
                                    ? "crm-accent-btn"
                                    : "bg-slate-500/15 hover:bg-slate-500/20"}`, children: [_jsx(Calendar, { className: "w-3 h-3" }), "\u0412\u0441\u0451 \u0432\u0440\u0435\u043C\u044F"] }), daysList.map((d) => (_jsx("button", { type: "button", onClick: () => {
                                    haptic("select");
                                    setSelectedDay(d.date);
                                }, className: `shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition ${selectedDay === d.date
                                    ? "crm-accent-btn font-semibold"
                                    : "bg-slate-500/15 hover:bg-slate-500/20"}`, children: fmtDateRu(d.date) }, d.date)))] })] }), _jsxs("div", { className: "crm-surface rounded-2xl p-3 space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("span", { className: "text-[12.5px] font-bold flex items-center gap-1.5", children: [_jsx(Mail, { className: "w-3.5 h-3.5 text-sky-500 shrink-0" }), _jsx("span", { children: "\u041E\u0447\u0435\u0440\u0435\u0434\u0438 \u0438 \u041F\u043E\u0447\u0442\u0430\u043B\u044C\u043E\u043D \u0441\u0435\u0439\u0447\u0430\u0441" })] }), _jsxs("span", { className: "text-[10.5px] crm-muted shrink-0", children: ["\u0412 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0435: ", (mailLive.lots_inquiry || 0) + (mailLive.lots_crm || 0)] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-1.5 text-[11px]", children: [_jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/10 p-2", children: [_jsx("div", { className: "text-[10px] crm-muted", children: "\u041F\u043E\u0438\u0441\u043A \u0446\u0435\u043D" }), _jsx("div", { className: "text-[15px] font-bold mt-0.5", children: queueNow["Поиск цен"] + queueNow["Бланки"] })] }), _jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/10 p-2", children: [_jsx("div", { className: "text-[10px] crm-muted", children: "\u0417\u0430\u043F\u0440\u043E\u0441 \u041A\u041F" }), _jsx("div", { className: "text-[15px] font-bold mt-0.5", children: queueNow["Запрос цен"] })] }), _jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/10 p-2", children: [_jsx("div", { className: "text-[10px] crm-muted", children: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u041E\u0422\u041A" }), _jsx("div", { className: "text-[15px] font-bold mt-0.5", children: queueNow.CRM + queueNow["К расчёту"] })] }), _jsxs("div", { className: "rounded-xl border border-emerald-500/35 bg-emerald-500/15 p-2", children: [_jsx("div", { className: "text-[10px] font-medium text-emerald-700 dark:text-emerald-300", children: "\u0412\u0438\u0442\u0440\u0438\u043D\u0430" }), _jsx("div", { className: "text-[15px] font-bold text-emerald-800 dark:text-emerald-200 mt-0.5", children: queueNow["На Витрине"] })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-1.5 text-[11px] pt-1", children: [_jsxs("div", { className: "rounded-xl border border-amber-500/35 bg-amber-500/15 px-2.5 py-2", children: [_jsx("div", { className: "text-[10px] font-medium text-amber-800 dark:text-amber-300", children: "\u0416\u0434\u0451\u043C \u043E\u0442\u0432\u0435\u0442\u0430" }), _jsx("div", { className: "font-bold text-[14px] text-amber-900 dark:text-amber-100 mt-0.5", children: (mailLive.waiting || 0) + (mailLive.reminded || 0) }), _jsxs("div", { className: "text-[9.5px] text-amber-800/80 dark:text-amber-200/80", children: ["\u043D\u0430\u043F\u043E\u043C.: ", mailLive.reminded || 0] })] }), _jsxs("div", { className: "rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-2", children: [_jsx("div", { className: "text-[10px] font-medium text-emerald-800 dark:text-emerald-300", children: "\u041E\u0442\u0432\u0435\u0442\u0438\u043B\u0438 / \u041E\u0444\u0435\u0440\u0442\u0430" }), _jsxs("div", { className: "font-bold text-[14px] text-emerald-900 dark:text-emerald-100 mt-0.5", children: [mailLive.answered || 0, " / ", mailLive.public_offer || 0] }), _jsx("div", { className: "text-[9.5px] text-emerald-800/80 dark:text-emerald-200/80", children: "\u041A\u041F \u0438 \u0441\u0430\u0439\u0442\u044B" })] }), _jsxs("div", { className: "rounded-xl border border-rose-500/35 bg-rose-500/15 px-2.5 py-2", children: [_jsx("div", { className: "text-[10px] font-medium text-rose-800 dark:text-rose-300", children: "\u041E\u0442\u043A\u0430\u0437 / \u041C\u043E\u043B\u0447\u0430\u0442" }), _jsxs("div", { className: "font-bold text-[14px] text-rose-900 dark:text-rose-100 mt-0.5", children: [mailLive.refused || 0, " / ", mailLive.no_reply || 0] }), _jsx("div", { className: "text-[9.5px] text-rose-800/80 dark:text-rose-200/80", children: "\u0437\u0430\u043A\u0440\u044B\u0442\u043E SLA" })] })] })] }), _jsxs("div", { className: "crm-surface rounded-2xl p-3 space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("span", { className: "text-[12.5px] font-bold flex items-center gap-1.5", children: [_jsx(Coins, { className: "w-3.5 h-3.5 text-amber-500 shrink-0" }), _jsx("span", { children: "\u042D\u043A\u043E\u043D\u043E\u043C\u0438\u043A\u0430 Gemini API" })] }), _jsx("span", { className: "text-[10.5px] crm-muted shrink-0", children: "gemini-3.8-flash" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/10 p-2.5", children: [_jsx("div", { className: "text-[10px] crm-muted", children: "\u0417\u0430\u0442\u0440\u0430\u0447\u0435\u043D\u043E \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434" }), _jsx("div", { className: "text-[16px] font-bold mt-0.5", children: fmtRub(apiBlock?.cost_rub) }), _jsxs("div", { className: "text-[10.5px] crm-muted mt-0.5", children: [fmtUsd(apiBlock?.cost_usd), " \u00B7 ", fmtTokens(apiBlock?.total_tokens), " \u0442\u043E\u043A. \u00B7", " ", apiBlock?.calls || 0, " \u0432\u044B\u0437\u043E\u0432."] })] }), _jsxs("div", { className: "rounded-xl border border-emerald-500/35 bg-emerald-500/15 p-2.5", children: [_jsx("div", { className: "text-[10px] font-medium text-emerald-800 dark:text-emerald-300", children: "1 \u0433\u043E\u0442\u043E\u0432\u044B\u0439 \u043B\u043E\u0442 (CRM+\u0412\u0438\u0442\u0440\u0438\u043D\u0430)" }), _jsx("div", { className: "text-[16px] font-bold text-emerald-900 dark:text-emerald-100 mt-0.5", children: ue && ue.cost_per_final_crm_rub > 0
                                            ? fmtRub(ue.cost_per_final_crm_rub)
                                            : "накапливается" }), _jsxs("div", { className: "text-[10.5px] text-emerald-800/85 dark:text-emerald-200/85 mt-0.5", children: ["\u041F\u043E\u0440\u043E\u0433 \u043F\u0440\u0438\u0431\u044B\u043B\u0438: ", threshold.toLocaleString("ru-RU"), " \u20BD"] })] })] }), _jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] divide-y divide-[var(--crm-border)] text-[11.5px]", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 px-3 py-2", children: [_jsx("span", { className: "crm-muted", children: "\u0421\u0440\u0435\u0434\u043D\u044F\u044F \u0446\u0435\u043D\u0430 1 \u0431\u043B\u0430\u043D\u043A\u0430 (\u0424\u0430\u0442\u0438\u043C\u0430)" }), _jsx("span", { className: "font-semibold whitespace-nowrap", children: fmtRub(ue?.avg_fatima_call_rub) })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 px-3 py-2", children: [_jsx("span", { className: "crm-muted", children: "\u0421\u0440\u0435\u0434\u043D\u044F\u044F \u0446\u0435\u043D\u0430 1 \u043F\u043E\u0438\u0441\u043A\u0430 (\u0427\u0435\u0440\u0438\u043F\u0438\u043A\u0435\u0440)" }), _jsx("span", { className: "font-semibold whitespace-nowrap", children: fmtRub(ue?.avg_cherry_call_rub) })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 px-3 py-2", children: [_jsx("span", { className: "crm-muted", children: "\u0421\u0440\u0435\u0434\u043D\u044F\u044F \u0446\u0435\u043D\u0430 1 \u0440\u0430\u0437\u0431\u043E\u0440\u0430 (\u041F\u043E\u0447\u0442\u0430\u043B\u044C\u043E\u043D)" }), _jsx("span", { className: "font-semibold whitespace-nowrap", children: fmtRub(ue?.avg_pochtalyon_call_rub) })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 px-3 py-2", children: [_jsx("span", { className: "crm-muted", children: "\u0421\u0440\u0435\u0434\u043D\u044F\u044F \u0446\u0435\u043D\u0430 1 \u0430\u0443\u0434\u0438\u0442\u0430 (\u0420\u0435\u0432\u0438\u0437\u043E\u0440 \u041E\u0422\u041A)" }), _jsx("span", { className: "font-semibold whitespace-nowrap", children: fmtRub(ue?.avg_revizor_call_rub) })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 px-3 py-2 bg-sky-500/10", children: [_jsx("span", { className: "font-medium text-sky-900 dark:text-sky-200", children: "\u0414\u043E\u0432\u0435\u0441\u0442\u0438 \u0434\u043E \u00AB\u041F\u043E\u0438\u0441\u043A \u0446\u0435\u043D\u00BB (\u0441 \u043E\u0442\u0441\u0435\u0432\u043E\u043C)" }), _jsx("span", { className: "font-bold text-sky-900 dark:text-sky-100 whitespace-nowrap", children: fmtRub(ue?.cost_per_accepted_blank_rub) })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 px-3 py-2 bg-sky-500/10", children: [_jsx("span", { className: "font-medium text-sky-900 dark:text-sky-200", children: "\u0414\u043E\u0432\u0435\u0441\u0442\u0438 \u0434\u043E \u00AB\u0426\u0435\u043D\u044B / \u0417\u0430\u043F\u0440\u043E\u0441 \u041A\u041F\u00BB" }), _jsx("span", { className: "font-bold text-sky-900 dark:text-sky-100 whitespace-nowrap", children: fmtRub(ue?.cost_per_priced_lot_rub) })] })] })] }), _jsx(SupabaseCard, { meter: snapshot.engine_info?.supabase }), _jsxs("div", { className: "crm-surface rounded-2xl p-3 space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("span", { className: "text-[12.5px] font-bold flex items-center gap-1.5", children: [_jsx(Filter, { className: "w-3.5 h-3.5 text-violet-500 shrink-0" }), _jsx("span", { children: "\u0412\u043E\u0440\u043E\u043D\u043A\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0442\u0435\u043D\u0434\u0435\u0440\u043E\u0432" })] }), _jsx("span", { className: "text-[10.5px] crm-muted", children: selectedDay === "all" ? "По логам" : fmtDateRu(selectedDay) })] }), _jsxs("div", { className: "space-y-2 text-[11.5px]", children: [_jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/10 p-2.5 space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 font-semibold", children: [_jsx("span", { children: "\uD83C\uDF05 \u0424\u0430\u0442\u0438\u043C\u0430 (\u0440\u0430\u0437\u0431\u043E\u0440 \u0411\u043B\u0430\u043D\u043A\u043E\u0432)" }), _jsxs("span", { className: "whitespace-nowrap", children: [funnel.fatima_total, " \u2192 \u043F\u0440\u0438\u043D\u044F\u0442\u043E ", funnel.fatima_accepted, " (", fmtPct(funnel.fatima_accepted, funnel.fatima_total), ")"] })] }), _jsxs("div", { className: "text-[10.5px] crm-muted flex flex-wrap gap-x-3 gap-y-0.5", children: [_jsxs("span", { children: ["\u041E\u0442\u0441\u0435\u0432: ", funnel.fatima_rejected] }), _jsxs("span", { children: ["\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043E: ", funnel.fatima_overdue] }), _jsxs("span", { children: ["\u041D\u0435 \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0438: ", funnel.fatima_not_supply] }), _jsxs("span", { children: ["\u0414\u043E\u043B\u0433\u0430\u044F: ", funnel.fatima_long_supply] }), _jsxs("span", { children: ["\u0417\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E: ", funnel.fatima_forbidden] })] })] }), _jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/10 p-2.5 space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 font-semibold", children: [_jsx("span", { children: "\u2600\uFE0F \u0427\u0435\u0440\u0438\u043F\u0438\u043A\u0435\u0440 (\u043F\u043E\u0438\u0441\u043A \u0446\u0435\u043D)" }), _jsxs("span", { className: "whitespace-nowrap", children: [funnel.cherry_total, " \u0448\u0442."] })] }), _jsxs("div", { className: "text-[10.5px] crm-muted flex flex-wrap gap-x-3 gap-y-0.5", children: [_jsxs("span", { children: ["\u0421\u0440\u0430\u0437\u0443 \u0441 \u0446\u0435\u043D\u0430\u043C\u0438 \u2192 \u041A \u0440\u0430\u0441\u0447\u0451\u0442\u0443: ", funnel.cherry_to_calc] }), _jsxs("span", { children: ["\u0412 \u0417\u0430\u043F\u0440\u043E\u0441 \u041A\u041F: ", funnel.cherry_to_inquiry] }), _jsxs("span", { children: ["\u041E\u0448\u0438\u0431\u043A\u0430/\u043F\u0440\u043E\u0441\u0440\u043E\u0447.: ", funnel.cherry_error] })] })] }), _jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/10 p-2.5 space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 font-semibold", children: [_jsx("span", { children: "\u2709\uFE0F \u041F\u043E\u0447\u0442\u0430\u043B\u044C\u043E\u043D (\u043F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0430)" }), _jsxs("span", { className: "whitespace-nowrap", children: ["\u041F\u0438\u0441\u0435\u043C: ", funnel.pochtalyon_sent] })] }), _jsxs("div", { className: "text-[10.5px] crm-muted flex flex-wrap gap-x-3 gap-y-0.5", children: [_jsxs("span", { children: ["\u041E\u0442\u0432\u0435\u0442\u0438\u043B\u0438 \u0441 \u041A\u041F: ", funnel.pochtalyon_answered] }), _jsxs("span", { children: ["\u041E\u0442\u043A\u0430\u0437: ", funnel.pochtalyon_refused] }), _jsxs("span", { children: ["\u041C\u043E\u043B\u0447\u0430\u0442: ", funnel.pochtalyon_no_reply] })] })] }), _jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/10 p-2.5 space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 font-semibold", children: [_jsx("span", { children: "\uD83C\uDF19 \u041E\u0447\u043A\u0430\u0440\u0438\u043A \u0438 \uD83D\uDD0E \u0420\u0435\u0432\u0438\u0437\u043E\u0440 \u041E\u0422\u041A" }), _jsxs("span", { className: "whitespace-nowrap", children: [funnel.ochkarik_total, " \u2192 CRM ", funnel.ochkarik_profitable] })] }), _jsxs("div", { className: "text-[10.5px] crm-muted flex flex-wrap gap-x-3 gap-y-0.5", children: [_jsxs("span", { children: ["\u041D\u0435\u0440\u0435\u043D\u0442\u0430\u0431\u0435\u043B\u044C\u043D\u043E: ", funnel.ochkarik_unprofitable] }), _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(ShieldCheck, { className: "w-3 h-3 text-emerald-500" }), " \u0414\u043E\u043F\u0443\u0449\u0435\u043D\u043E \u041E\u0422\u041A:", " ", funnel.revizor_approved] }), _jsxs("span", { children: ["\u041D\u0430 \u0434\u043E\u0432\u043E\u0434\u043A\u0435: ", funnel.revizor_rejected] })] })] })] })] }), daysList.length > 0 && (_jsxs("div", { className: "crm-surface rounded-2xl p-3 space-y-2", children: [_jsxs("div", { className: "flex items-center gap-1.5 text-[12.5px] font-bold", children: [_jsx(TrendingUp, { className: "w-3.5 h-3.5 text-emerald-500" }), "\u0420\u0430\u0437\u0431\u0438\u0432\u043A\u0430 \u043F\u043E \u0434\u043D\u044F\u043C"] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-[11px] text-left border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-[var(--crm-border)] crm-muted", children: [_jsx("th", { className: "py-1.5 pr-2 font-semibold", children: "\u0414\u0430\u0442\u0430" }), _jsx("th", { className: "py-1.5 px-1.5 font-semibold", children: "\u0424\u0430\u0442\u0438\u043C\u0430" }), _jsx("th", { className: "py-1.5 px-1.5 font-semibold", children: "\u0426\u0435\u043D\u044B/\u041A\u041F" }), _jsx("th", { className: "py-1.5 px-1.5 font-semibold", children: "CRM/\u041E\u0422\u041A" }), _jsx("th", { className: "py-1.5 pl-1.5 text-right font-semibold", children: "API (\u20BD)" })] }) }), _jsx("tbody", { className: "divide-y divide-[var(--crm-border)]", children: daysList.map((d) => (_jsxs("tr", { onClick: () => {
                                            haptic("select");
                                            setSelectedDay(d.date);
                                        }, className: `cursor-pointer transition ${selectedDay === d.date ? "bg-sky-500/15" : "hover:bg-slate-500/10"}`, children: [_jsx("td", { className: "py-2 pr-2 font-medium whitespace-nowrap", children: fmtDateRu(d.date) }), _jsxs("td", { className: "py-2 px-1.5 whitespace-nowrap", children: [d.funnel.fatima_accepted, "/", d.funnel.fatima_total] }), _jsx("td", { className: "py-2 px-1.5 whitespace-nowrap", children: d.funnel.cherry_to_calc + d.funnel.cherry_to_inquiry }), _jsxs("td", { className: "py-2 px-1.5 whitespace-nowrap", children: [d.funnel.ochkarik_profitable, "/", d.funnel.revizor_approved] }), _jsx("td", { className: "py-2 pl-1.5 text-right font-semibold whitespace-nowrap", children: fmtRub(d.api?.cost_rub) })] }, d.date))) })] }) })] }))] }));
}
