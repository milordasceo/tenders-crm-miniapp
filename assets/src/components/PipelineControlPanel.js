import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Activity, ChevronDown, ChevronUp, Coins, Cpu, Pause, Play, Square, } from "lucide-react";
import { useState } from "react";
import { setPipelineControl } from "../lib/api.js?v=mx0305v6";
import { haptic } from "../lib/telegram.js?v=mx0305v6";
const BOT_LABELS = {
    fatima: "🌅 Фатима",
    cherry: "☀️ Черипикер",
    pochtalyon: "✉️ Почтальон",
    revizor: "🔎 Ревизор ОТК",
};
function fmtTokens(n) {
    const v = Number(n || 0);
    if (v >= 1_000_000)
        return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000)
        return `${(v / 1_000).toFixed(1)}k`;
    return String(v);
}
function fmtUsd(n) {
    const v = Number(n || 0);
    if (v === 0)
        return "$0.00";
    if (v < 0.01)
        return `$${v.toFixed(4)}`;
    return `$${v.toFixed(2)}`;
}
function fmtRub(n) {
    const v = Number(n || 0);
    return `${v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}
function fmtTimeShort(isoStr) {
    if (!isoStr)
        return "—";
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime()))
        return isoStr;
    return d.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
export function PipelineControlPanel({ snapshot, isOwner, onSnapshotUpdated }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    if (!snapshot)
        return null;
    const rawStatus = String(snapshot.goal_status || "стоп").toLowerCase();
    const desired = String(snapshot.control?.desired_status || "").toLowerCase();
    const effectiveStatus = desired || rawStatus;
    const isRunning = effectiveStatus === "идёт" || effectiveStatus === "работает";
    const isPaused = effectiveStatus === "пауза";
    const statusBadge = isRunning
        ? {
            label: "Работает",
            cls: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border-emerald-500/40",
        }
        : isPaused
            ? {
                label: "На паузе",
                cls: "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40",
            }
            : {
                label: "Остановлен",
                cls: "bg-rose-500/20 text-rose-700 dark:text-rose-200 border-rose-500/40",
            };
    const usage = snapshot.api_usage;
    const today = usage?.today || {
        calls: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        cached_tokens: 0,
        total_tokens: 0,
        cost_usd: 0,
        cost_rub: 0,
        elapsed_sec: 0,
    };
    const total = usage?.total || {
        calls: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        cached_tokens: 0,
        total_tokens: 0,
        cost_usd: 0,
        cost_rub: 0,
        elapsed_sec: 0,
    };
    const byBotToday = usage?.by_bot_today || {};
    const byBotTotal = usage?.by_bot_total || {};
    const recent = usage?.recent || [];
    const engine = snapshot.engine_info;
    const handleControl = async (target) => {
        if (!isOwner || busy)
            return;
        haptic("medium");
        setBusy(true);
        setError(null);
        try {
            const res = await setPipelineControl(target);
            if (res.snapshot && onSnapshotUpdated) {
                onSnapshotUpdated(res.snapshot);
            }
            haptic("success");
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось изменить статус конвейера");
            haptic("error");
        }
        finally {
            setBusy(false);
        }
    };
    const botKeys = Array.from(new Set([...Object.keys(BOT_LABELS), ...Object.keys(byBotTotal), ...Object.keys(byBotToday)]));
    return (_jsxs("div", { className: "crm-surface rounded-2xl p-3.5 space-y-3", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("div", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--crm-accent)] text-white", children: _jsx(Cpu, { className: "h-4 w-4" }) }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-1.5 flex-wrap", children: [_jsx("span", { className: "text-[13px] font-bold", children: "\u041F\u0443\u043B\u044C\u0442 Gemini API" }), _jsx("span", { className: `inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.cls}`, children: statusBadge.label })] }), _jsxs("div", { className: "text-[11px] crm-muted truncate", children: [engine?.model || "gemini-3.8-flash", " \u00B7 ", engine?.scope || "Новосибирск + 100 км", " \u00B7", " ", fmtTimeShort(engine?.last_run_at || snapshot.updated_at)] })] })] }), isOwner && (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsxs("button", { type: "button", disabled: busy || isRunning, onClick: () => void handleControl("работает"), className: "inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-45", children: [_jsx(Play, { className: "h-3 w-3" }), "\u0417\u0430\u043F\u0443\u0441\u043A"] }), _jsxs("button", { type: "button", disabled: busy || isPaused, onClick: () => void handleControl("пауза"), className: "inline-flex items-center gap-1 rounded-xl bg-amber-500 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-amber-600 disabled:opacity-45", children: [_jsx(Pause, { className: "h-3 w-3" }), "\u041F\u0430\u0443\u0437\u0430"] }), _jsxs("button", { type: "button", disabled: busy || (!isRunning && !isPaused), onClick: () => void handleControl("стоп"), className: "inline-flex items-center gap-1 rounded-xl bg-rose-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-rose-700 disabled:opacity-45", children: [_jsx(Square, { className: "h-3 w-3" }), "\u0421\u0442\u043E\u043F"] })] }))] }), error && (_jsx("div", { className: "rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-[11px] text-rose-700 dark:text-rose-200", children: error })), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/10 p-2.5", children: [_jsxs("div", { className: "flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide crm-muted", children: [_jsx("span", { children: "\u0420\u0430\u0441\u0445\u043E\u0434 \u0441\u0435\u0433\u043E\u0434\u043D\u044F" }), _jsx(Coins, { className: "h-3.5 w-3.5 text-amber-500" })] }), _jsxs("div", { className: "mt-1 flex items-baseline gap-1.5", children: [_jsx("span", { className: "text-[15px] font-bold", children: fmtRub(today.cost_rub) }), _jsxs("span", { className: "text-[11px] crm-muted", children: ["(", fmtUsd(today.cost_usd), ")"] })] }), _jsxs("div", { className: "mt-0.5 text-[10px] crm-muted", children: [fmtTokens(today.total_tokens), " \u0442\u043E\u043A. \u00B7 ", today.calls, " \u0432\u044B\u0437\u043E\u0432."] })] }), _jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/10 p-2.5", children: [_jsxs("div", { className: "flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide crm-muted", children: [_jsx("span", { children: "\u0420\u0430\u0441\u0445\u043E\u0434 \u0432\u0441\u0435\u0433\u043E" }), _jsx(Activity, { className: "h-3.5 w-3.5 text-sky-500" })] }), _jsxs("div", { className: "mt-1 flex items-baseline gap-1.5", children: [_jsx("span", { className: "text-[15px] font-bold", children: fmtRub(total.cost_rub) }), _jsxs("span", { className: "text-[11px] crm-muted", children: ["(", fmtUsd(total.cost_usd), ")"] })] }), _jsxs("div", { className: "mt-0.5 text-[10px] crm-muted", children: [fmtTokens(total.total_tokens), " \u0442\u043E\u043A. \u00B7 ", total.calls, " \u0432\u044B\u0437\u043E\u0432."] })] })] }), _jsxs("div", { children: [_jsxs("button", { type: "button", onClick: () => setShowDetails((v) => !v), className: "flex w-full items-center justify-between rounded-xl border border-[var(--crm-border)] bg-slate-500/10 px-3 py-1.5 text-[11px] font-semibold hover:bg-slate-500/15", children: [_jsxs("span", { children: ["\u0414\u0435\u0442\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F \u043F\u043E \u0431\u043E\u0442\u0430\u043C \u0438 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u044F\u043C (", recent.length, ")"] }), showDetails ? _jsx(ChevronUp, { className: "h-3.5 w-3.5" }) : _jsx(ChevronDown, { className: "h-3.5 w-3.5" })] }), showDetails && (_jsxs("div", { className: "mt-2 space-y-2.5", children: [_jsx("div", { className: "grid grid-cols-2 gap-1.5", children: botKeys.map((k) => {
                                    const bTot = byBotTotal[k];
                                    const bTod = byBotToday[k];
                                    return (_jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/5 px-2.5 py-2 text-[11px]", children: [_jsx("div", { className: "font-semibold", children: BOT_LABELS[k] || k }), _jsxs("div", { className: "mt-0.5 crm-muted", children: ["\u0421\u0435\u0433\u043E\u0434\u043D\u044F: ", fmtRub(bTod?.cost_rub), " (", fmtTokens(bTod?.total_tokens), ")"] }), _jsxs("div", { className: "text-[10px] crm-muted opacity-80", children: ["\u0412\u0441\u0435\u0433\u043E: ", bTot?.calls || 0, " \u0432\u044B\u0437\u043E\u0432. \u00B7 ", fmtUsd(bTot?.cost_usd)] })] }, k));
                                }) }), recent.length > 0 ? (_jsx("div", { className: "max-h-52 overflow-y-auto rounded-xl border border-[var(--crm-border)] divide-y divide-[var(--crm-border)]", children: recent.map((r, i) => (_jsxs("div", { className: "flex items-center justify-between gap-2 px-2.5 py-1.5 text-[10.5px]", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "font-semibold truncate", children: [BOT_LABELS[r.bot] || r.bot, " \u00B7 ", r.tender, r.dry_run ? " (dry)" : ""] }), _jsxs("div", { className: "crm-muted truncate", children: [fmtTimeShort(r.ts), " \u00B7 ", r.outcome || "ok", " \u00B7 ", r.elapsed_sec, "\u0441"] })] }), _jsxs("div", { className: "shrink-0 text-right", children: [_jsx("div", { className: "font-semibold", children: fmtUsd(r.cost_usd) }), _jsxs("div", { className: "crm-muted", children: [fmtTokens(r.total_tokens), " \u0442\u043E\u043A."] })] })] }, `${r.ts}-${r.tender}-${i}`))) })) : (_jsx("div", { className: "rounded-xl border border-dashed border-[var(--crm-border)] px-3 py-2 text-center text-[11px] crm-muted", children: "\u041E\u043F\u0435\u0440\u0430\u0446\u0438\u0439 \u0447\u0435\u0440\u0435\u0437 Gemini API \u043F\u043E\u043A\u0430 \u043D\u0435 \u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E \u2014 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0442\u0430\u043A\u0442\u0430." }))] }))] })] }));
}
