import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, Archive, ArrowUpDown, ChevronLeft, ChevronRight, FolderOpen, Layers, Search, X, } from "lucide-react";
import { useMemo, useState } from "react";
import { getDeadlineInfo } from "../lib/format.js?v=mwq061ef";
import { ACTIVE_PIPELINE_LANES, resolvePipelineView, } from "../lib/pipeline.js?v=mwq061ef";
import { formatNskDateTime } from "../lib/format.js?v=mwq061ef";
import { haptic } from "../lib/telegram.js?v=mwq061ef";
import { stageWhen } from "../lib/updates.js?v=mwq061ef";
import { PipelineControlPanel } from "./PipelineControlPanel.js?v=mwq061ef";
import { TenderCard } from "./TenderCard.js?v=mwq061ef";
function stageNote(t, events) {
    const when = stageWhen(t, events);
    return `${when.label} ${formatNskDateTime(when.at, true)}`;
}
function getLaneMetrics(laneId, cnt, snapshot) {
    const funnel = snapshot?.engine_info?.stats?.all_time_funnel;
    const mailLive = snapshot?.engine_info?.stats?.mail_live;
    if (laneId === "blanks") {
        const passed = funnel?.fatima_accepted ?? 0;
        const rejected = funnel?.fatima_rejected ?? 0;
        return {
            currentLabel: "разобрать",
            doneValue: passed,
            doneLabel: "прошли",
            summaryLine: `В очереди: ${cnt} · Прошли: ${passed} · Отсев: ${rejected}`,
        };
    }
    if (laneId === "prices") {
        const toCalc = funnel?.cherry_to_calc ?? 0;
        const toInq = funnel?.cherry_to_inquiry ?? 0;
        const err = funnel?.cherry_error ?? 0;
        const done = toCalc + toInq;
        return {
            currentLabel: "искать",
            doneValue: done,
            doneLabel: "с ценами",
            summaryLine: `В очереди: ${cnt} · С ценами: ${done} (в расчёт: ${toCalc} · в КП: ${toInq})${err ? ` · Ошибки ТЗ: ${err}` : ""}`,
        };
    }
    if (laneId === "inquiry") {
        const answered = mailLive?.answered ?? funnel?.pochtalyon_answered ?? 0;
        const waiting = mailLive?.waiting ?? 0;
        const refused = mailLive?.refused ?? funnel?.pochtalyon_refused ?? 0;
        return {
            currentLabel: "лотов",
            doneValue: answered,
            doneLabel: "ответов",
            summaryLine: `Лотов: ${cnt} · Ждём писем: ${waiting} · Ответили: ${answered}${refused ? ` · Отказ: ${refused}` : ""}`,
        };
    }
    if (laneId === "calc") {
        const total = funnel?.ochkarik_total ?? 0;
        const prof = funnel?.ochkarik_profitable ?? 0;
        const unprof = funnel?.ochkarik_unprofitable ?? 0;
        return {
            currentLabel: "считать",
            doneValue: prof,
            doneLabel: "в CRM",
            summaryLine: `В очереди: ${cnt} · Просчитано: ${total} · Рентабельны: ${prof} · Нерентаб.: ${unprof}`,
        };
    }
    if (laneId === "crm_work") {
        const approved = funnel?.revizor_approved ?? 0;
        const rejected = funnel?.revizor_rejected ?? 0;
        return {
            currentLabel: "доводка",
            doneValue: approved,
            doneLabel: "прошли ОТК",
            summaryLine: `На доводке: ${cnt} · Одобрено ОТК: ${approved} · Отклонено ОТК: ${rejected}`,
        };
    }
    const approvedAll = Math.max(cnt, funnel?.revizor_approved ?? 0);
    return {
        currentLabel: "активно",
        doneValue: approvedAll,
        doneLabel: "за всё время",
        donePrefix: "всего ",
        summaryLine: `Активных сейчас: ${cnt} · Всего вышло на Витрину: ${approvedAll}`,
    };
}
function sortTenders(list, sortBy, events = []) {
    const sorted = [...list];
    const at = (t) => new Date(stageWhen(t, events).at).getTime();
    sorted.sort((a, b) => {
        if (sortBy === "profit") {
            return Number(b.profit ?? -1e12) - Number(a.profit ?? -1e12);
        }
        if (sortBy === "nmck") {
            return Number(b.nmck ?? -1e12) - Number(a.nmck ?? -1e12);
        }
        if (sortBy === "newest") {
            return at(b) - at(a);
        }
        if (sortBy === "oldest") {
            return at(a) - at(b);
        }
        const ta = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
        const tb = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
        return ta - tb;
    });
    return sorted;
}
export function PipelineBoardView({ tenders, snapshot, updatesByTender, events = [], readOnly, isOwner, onSnapshotUpdated, onOpenTender, onToggleFavorite, onOpenArchive, }) {
    const [selectedLane, setSelectedLane] = useState("all");
    const [onlyAttention, setOnlyAttention] = useState(false);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const activeTenders = useMemo(() => tenders.filter((t) => ["blanks", "prices", "inquiry", "calc", "review", "tenders"].includes(t.stage) &&
        getDeadlineInfo(t.deadline_at).tone !== "expired"), [tenders]);
    const archiveCount = useMemo(() => tenders.filter((t) => ["unprofitable", "overdue", "rejected"].includes(t.stage) ||
        getDeadlineInfo(t.deadline_at).tone === "expired").length, [tenders]);
    const laneGroups = useMemo(() => {
        const groups = {
            blanks: [],
            prices: [],
            inquiry: [],
            calc: [],
            review: [],
            crm_work: [],
            storefront: [],
            unprofitable: [],
            overdue: [],
            rejected: [],
        };
        for (const t of activeTenders) {
            const pv = resolvePipelineView(t);
            groups[pv.laneId].push(t);
        }
        return groups;
    }, [activeTenders]);
    const attentionCount = useMemo(() => activeTenders.filter((t) => resolvePipelineView(t).needsAttention).length, [activeTenders]);
    const matchesFilter = (t) => {
        const pv = resolvePipelineView(t);
        if (onlyAttention && !pv.needsAttention)
            return false;
        const q = search.trim().toLowerCase();
        if (!q)
            return true;
        const hay = [
            t.number,
            t.product,
            t.subject || "",
            t.owner_notes || "",
            t.details?.customer?.short_name || "",
            t.details?.customer?.name || "",
            t.city || "",
            pv.folderPath,
            pv.botName,
            pv.nextStepHint,
        ]
            .join(" ")
            .toLowerCase();
        return hay.includes(q);
    };
    const filtered = useMemo(() => {
        const list = activeTenders.filter((t) => {
            const pv = resolvePipelineView(t);
            if (selectedLane !== "all" && pv.laneId !== selectedLane)
                return false;
            return matchesFilter(t);
        });
        return sortTenders(list, sortBy, events);
    }, [activeTenders, events, onlyAttention, search, selectedLane, sortBy]);
    const activeLaneIdx = ACTIVE_PIPELINE_LANES.findIndex((l) => l.id === selectedLane);
    const activeLaneDef = activeLaneIdx >= 0 ? ACTIVE_PIPELINE_LANES[activeLaneIdx] : null;
    const prevLane = activeLaneIdx > 0 ? ACTIVE_PIPELINE_LANES[activeLaneIdx - 1] : null;
    const nextLane = activeLaneIdx >= 0 && activeLaneIdx < ACTIVE_PIPELINE_LANES.length - 1
        ? ACTIVE_PIPELINE_LANES[activeLaneIdx + 1]
        : null;
    const storefrontReadyCount = laneGroups.storefront.length;
    const inWorkCount = Math.max(0, activeTenders.length - storefrontReadyCount);
    return (_jsxs("div", { className: "space-y-2.5", children: [_jsx(PipelineControlPanel, { snapshot: snapshot, isOwner: Boolean(isOwner), onSnapshotUpdated: onSnapshotUpdated }), _jsxs("div", { className: "crm-surface rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-[11.5px] min-w-0", children: [_jsxs("span", { className: "font-semibold truncate", children: ["\u041D\u0430 \u0412\u0438\u0442\u0440\u0438\u043D\u0435: ", storefrontReadyCount, " \u00B7 \u0412 \u0440\u0430\u0431\u043E\u0442\u0435: ", inWorkCount] }), _jsxs("span", { className: "crm-muted shrink-0", children: ["\u041F\u043E\u0440\u043E\u0433 ", ((snapshot?.profit_threshold ?? 11000) / 1000).toFixed(0), "\u043A \u20BD"] })] }), _jsxs("div", { className: "crm-surface rounded-xl p-2 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 text-[11px] px-0.5", children: [_jsxs("button", { type: "button", onClick: () => {
                                    haptic("select");
                                    setSelectedLane("all");
                                }, className: `inline-flex items-center gap-1 px-2 py-1 rounded-lg font-medium transition ${selectedLane === "all"
                                    ? "crm-accent-btn"
                                    : "bg-slate-500/10 hover:bg-slate-500/15"}`, children: [_jsx(Layers, { className: "w-3 h-3" }), _jsxs("span", { children: ["\u0412\u0441\u0435 \u044D\u0442\u0430\u043F\u044B (", activeTenders.length, ")"] })] }), onOpenArchive && (_jsxs("button", { type: "button", onClick: () => {
                                    haptic("light");
                                    onOpenArchive();
                                }, className: "inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-500/10 hover:bg-slate-500/15 crm-muted font-medium transition", title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u0442\u0441\u0435\u044F\u043D\u043D\u044B\u0435 \u043F\u0430\u043F\u043A\u0438 \u0432 \u0410\u0440\u0445\u0438\u0432/", children: [_jsx(Archive, { className: "w-3 h-3" }), _jsxs("span", { children: ["\u0410\u0440\u0445\u0438\u0432/ (", archiveCount, ")"] })] }))] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2", children: ACTIVE_PIPELINE_LANES.map((lane) => {
                            const cnt = laneGroups[lane.id]?.length || 0;
                            const metrics = getLaneMetrics(lane.id, cnt, snapshot);
                            const isSelected = selectedLane === lane.id;
                            const isStorefront = lane.id === "storefront";
                            return (_jsxs("button", { type: "button", onClick: () => {
                                    haptic("select");
                                    setSelectedLane(isSelected ? "all" : lane.id);
                                }, className: `rounded-xl px-2.5 py-2 text-left border transition min-w-0 flex flex-col justify-between gap-1.5 ${isSelected
                                    ? isStorefront
                                        ? "bg-emerald-600 text-white border-transparent shadow-xs"
                                        : "crm-accent-btn border-transparent shadow-xs"
                                    : cnt > 0 || metrics.doneValue > 0
                                        ? "bg-slate-500/6 border-[var(--crm-border)] hover:border-blue-500/40"
                                        : "bg-slate-500/3 border-[var(--crm-border)] opacity-60"}`, children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "flex items-center justify-between gap-1", children: _jsxs("span", { className: "text-[11px] font-bold truncate", children: [lane.stepNumber, ". ", lane.emoji, " ", lane.shortLabel] }) }), _jsx("div", { className: "text-[9.5px] truncate opacity-75", children: lane.bot })] }), _jsxs("div", { className: "flex items-end justify-between gap-1.5 pt-1 border-t border-current/10", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-[15px] font-bold leading-none", children: cnt }), _jsx("div", { className: "text-[9.5px] opacity-75 truncate mt-0.5", children: metrics.currentLabel })] }), _jsxs("div", { className: "text-right min-w-0", children: [_jsxs("div", { className: `text-[11.5px] font-bold leading-none ${isSelected
                                                            ? "text-white"
                                                            : "text-emerald-600 dark:text-emerald-400"}`, children: [metrics.donePrefix ?? "✓ ", metrics.doneValue] }), _jsx("div", { className: "text-[9.5px] opacity-75 truncate mt-0.5", children: metrics.doneLabel })] })] })] }, lane.id));
                        }) }), activeLaneDef && (_jsxs("div", { className: "rounded-xl bg-slate-500/6 border border-[var(--crm-border)] p-2.5 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-1.5 text-xs font-bold truncate", children: [_jsx(FolderOpen, { className: "w-3.5 h-3.5 text-blue-500 shrink-0" }), _jsx("span", { className: "truncate", children: activeLaneDef.title })] }), _jsx("p", { className: "text-[11px] font-medium mt-0.5", children: getLaneMetrics(activeLaneDef.id, laneGroups[activeLaneDef.id]?.length || 0, snapshot).summaryLine }), _jsx("p", { className: "text-[10.5px] crm-muted mt-0.5", children: activeLaneDef.goalText })] }), _jsxs("span", { className: "text-xs font-bold px-2 py-0.5 rounded-full bg-slate-500/12 shrink-0", children: [filtered.length, " \u0448\u0442."] })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 pt-1 border-t border-[var(--crm-border)] text-[11px]", children: [_jsxs("button", { type: "button", disabled: !prevLane, onClick: () => {
                                            if (prevLane) {
                                                haptic("select");
                                                setSelectedLane(prevLane.id);
                                            }
                                        }, className: "inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-500/10 disabled:opacity-35 font-medium", children: [_jsx(ChevronLeft, { className: "w-3.5 h-3.5" }), _jsx("span", { children: prevLane ? prevLane.folderPath : "Начало" })] }), _jsxs("button", { type: "button", disabled: !nextLane, onClick: () => {
                                            if (nextLane) {
                                                haptic("select");
                                                setSelectedLane(nextLane.id);
                                            }
                                        }, className: "inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-500/10 disabled:opacity-35 font-medium", children: [_jsx("span", { children: nextLane ? nextLane.folderPath : "Финал" }), _jsx(ChevronRight, { className: "w-3.5 h-3.5" })] })] })] }))] }), _jsxs("div", { className: "flex items-center gap-1.5 min-w-0", children: [_jsxs("div", { className: "relative flex-1 min-w-0", children: [_jsx(Search, { className: "w-3.5 h-3.5 crm-muted absolute left-2.5 top-1/2 -translate-y-1/2" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A: \u0442\u043E\u0432\u0430\u0440, \u2116, \u0437\u0430\u043A\u0430\u0437\u0447\u0438\u043A, \u043F\u0430\u043F\u043A\u0430...", className: "w-full crm-surface rounded-xl pl-8 pr-7 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40" }), search && (_jsx("button", { type: "button", onClick: () => setSearch(""), className: "absolute right-2 top-1/2 -translate-y-1/2 crm-muted", children: _jsx(X, { className: "w-3.5 h-3.5" }) }))] }), attentionCount > 0 && (_jsxs("button", { type: "button", onClick: () => {
                            haptic("select");
                            setOnlyAttention((v) => !v);
                        }, className: `rounded-xl px-2 py-1.5 text-[11px] font-medium inline-flex items-center gap-1 shrink-0 border transition ${onlyAttention
                            ? "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40"
                            : "crm-surface border-[var(--crm-border)] crm-muted"}`, title: "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u0440\u0435\u0431\u0443\u044E\u0449\u0438\u0435 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F", children: [_jsx(AlertTriangle, { className: "w-3.5 h-3.5 text-amber-500" }), _jsx("span", { children: attentionCount })] })), _jsxs("button", { type: "button", onClick: () => {
                            haptic("select");
                            setSortBy((prev) => prev === "deadline"
                                ? "newest"
                                : prev === "newest"
                                    ? "oldest"
                                    : prev === "oldest"
                                        ? "profit"
                                        : prev === "profit"
                                            ? "nmck"
                                            : "deadline");
                        }, className: "crm-surface rounded-xl px-2.5 py-1.5 text-[11px] font-medium inline-flex items-center gap-1 shrink-0", children: [_jsx(ArrowUpDown, { className: "w-3 h-3" }), _jsx("span", { children: sortBy === "deadline"
                                    ? "Срок"
                                    : sortBy === "newest"
                                        ? "Новые"
                                        : sortBy === "oldest"
                                            ? "Старые"
                                            : sortBy === "profit"
                                                ? "Прибыль"
                                                : "НМЦК" })] })] }), selectedLane === "all" ? (_jsxs("div", { className: "space-y-3", children: [onlyAttention && (_jsx("p", { className: "text-[11px] crm-muted px-1", children: "\u0422\u043E\u043B\u044C\u043A\u043E \u043B\u043E\u0442\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0442\u0440\u0435\u0431\u0443\u044E\u0442 \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u044F. \u041E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u044D\u0442\u0430\u043F\u044B \u0441\u043A\u0440\u044B\u0442\u044B." })), ACTIVE_PIPELINE_LANES.map((lane) => {
                        const laneList = sortTenders((laneGroups[lane.id] || []).filter(matchesFilter), sortBy, events);
                        if (laneList.length === 0)
                            return null;
                        const isStorefront = lane.id === "storefront";
                        return (_jsxs("section", { className: "space-y-1.5", children: [_jsxs("div", { className: `flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${isStorefront
                                        ? "bg-emerald-500/8 border-emerald-500/25"
                                        : "crm-surface border-[var(--crm-border)]"}`, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("span", { className: "text-sm leading-none shrink-0", children: lane.emoji }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-xs font-bold truncate", children: lane.title }), _jsx("div", { className: "text-[10.5px] crm-muted truncate", children: lane.goalText })] })] }), _jsx("span", { className: `px-2 py-0.5 rounded-full text-[11px] font-bold ${isStorefront
                                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                                : "bg-blue-500/15 text-blue-700 dark:text-blue-300"}`, children: laneList.length })] }), _jsx("div", { className: "space-y-2 pl-1", children: laneList.map((t) => (_jsx(TenderCard, { tender: t, updateInfo: updatesByTender[t.number], stageNote: stageNote(t, events), readOnly: readOnly, onOpen: (item) => onOpenTender(item.number), onToggleFavorite: (item) => onToggleFavorite(item) }, t.number))) })] }, lane.id));
                    }), filtered.length === 0 && (_jsxs("div", { className: "crm-surface rounded-xl p-6 text-center space-y-1", children: [_jsx("p", { className: "text-xs font-medium", children: "\u0422\u0430\u043A\u0438\u0445 \u043B\u043E\u0442\u043E\u0432 \u043D\u0435\u0442" }), _jsx("p", { className: "text-[11px] crm-muted", children: onlyAttention
                                    ? "Снимите значок внимания, чтобы снова увидеть все этапы."
                                    : "Очередь по этапам свободна." })] }))] })) : filtered.length === 0 ? (_jsxs("div", { className: "crm-surface rounded-xl p-6 text-center space-y-1", children: [_jsx("p", { className: "text-xs font-medium", children: onlyAttention
                            ? "На этом этапе нет лотов, которые требуют внимания"
                            : activeLaneDef
                                ? `В папке «${activeLaneDef.folderPath}» сейчас пусто`
                                : "Подходящих тендеров нет" }), _jsx("p", { className: "text-[11px] crm-muted", children: onlyAttention
                            ? "Снимите фильтр внимания или перейдите на другой этап."
                            : "Папки уже перешли на следующий этап или очередь свободна." })] })) : (_jsx("div", { className: "space-y-2", children: filtered.map((t) => (_jsx(TenderCard, { tender: t, updateInfo: updatesByTender[t.number], stageNote: stageNote(t, events), readOnly: readOnly, onOpen: (item) => onOpenTender(item.number), onToggleFavorite: (item) => onToggleFavorite(item) }, t.number))) }))] }));
}
