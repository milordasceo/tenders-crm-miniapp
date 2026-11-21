import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Archive, ArrowUpDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getDeadlineInfo } from "../lib/format.js?v=mwq061ef";
import { getRejectFolderCategory, } from "../lib/pipeline.js?v=mwq061ef";
import { haptic } from "../lib/telegram.js?v=mwq061ef";
import { TenderCard } from "./TenderCard.js?v=mwq061ef";
export function RejectedArchiveView({ tenders, snapshot, updatesByTender, readOnly, onOpenTender, onToggleFavorite, }) {
    const [cat, setCat] = useState("all");
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const rejectedTenders = useMemo(() => tenders.filter((t) => ["unprofitable", "rejected"].includes(t.stage) &&
        getDeadlineInfo(t.deadline_at).tone !== "expired"), [tenders]);
    const counts = useMemo(() => {
        const map = {
            all: rejectedTenders.length,
            unprofitable: 0,
            "Не поставки": 0,
            "Долгая поставка": 0,
            "Запрещено": 0,
            Отсев: 0,
        };
        for (const t of rejectedTenders) {
            if (t.stage === "unprofitable")
                map.unprofitable += 1;
            else {
                const folderCat = getRejectFolderCategory(t);
                if (folderCat === "Не поставки" ||
                    folderCat === "Долгая поставка" ||
                    folderCat === "Запрещено") {
                    map[folderCat] = (map[folderCat] || 0) + 1;
                }
                else {
                    map["Отсев"] = (map["Отсев"] || 0) + 1;
                }
            }
        }
        return map;
    }, [rejectedTenders]);
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = rejectedTenders.filter((t) => {
            if (cat === "unprofitable" && t.stage !== "unprofitable")
                return false;
            if (cat !== "all" &&
                cat !== "unprofitable" &&
                getRejectFolderCategory(t) !== cat) {
                return false;
            }
            if (q) {
                const hay = [
                    t.number,
                    t.product,
                    t.subject || "",
                    t.pipeline_status || "",
                    t.details?.pipeline?.reject_reason || "",
                    t.details?.customer?.short_name || "",
                ]
                    .join(" ")
                    .toLowerCase();
                if (!hay.includes(q))
                    return false;
            }
            return true;
        });
        return [...list].sort((a, b) => {
            if (sortBy === "oldest") {
                return new Date(a.synced_at).getTime() - new Date(b.synced_at).getTime();
            }
            if (sortBy === "deadline") {
                const ta = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
                const tb = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
                return ta - tb;
            }
            if (sortBy === "nmck") {
                return Number(b.nmck ?? -1e12) - Number(a.nmck ?? -1e12);
            }
            return new Date(b.synced_at).getTime() - new Date(a.synced_at).getTime();
        });
    }, [cat, rejectedTenders, search, sortBy]);
    const qMap = snapshot?.queues || {};
    return (_jsxs("div", { className: "space-y-3 pb-6", children: [_jsxs("section", { className: "crm-surface rounded-2xl p-3.5 space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "text-sm font-bold flex items-center gap-1.5", children: [_jsx(Archive, { className: "w-4 h-4 text-slate-500" }), "\u041E\u0442\u0441\u0435\u0432 \u043A\u043E\u043D\u0432\u0435\u0439\u0435\u0440\u0430"] }), _jsxs("span", { className: "text-[11px] crm-muted", children: ["\u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0445: ", rejectedTenders.length] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-center text-xs", children: [_jsxs("div", { className: "rounded-xl bg-orange-500/10 p-2", children: [_jsx("div", { className: "text-base font-bold text-orange-600 dark:text-orange-400", children: counts.unprofitable }), _jsxs("div", { className: "text-[10px] crm-muted", children: ["\u041D\u0435\u0440\u0435\u043D\u0442\u0430\u0431\u0435\u043B\u044C\u043D\u043E", qMap["Нерентабельно"] ? ` (всего в папке: ${qMap["Нерентабельно"]})` : ""] })] }), _jsxs("div", { className: "rounded-xl bg-slate-500/10 p-2", children: [_jsx("div", { className: "text-base font-bold", children: counts["Не поставки"] + counts["Долгая поставка"] + counts["Отсев"] }), _jsx("div", { className: "text-[10px] crm-muted", children: "\u041E\u0442\u0441\u0435\u0432 \u043F\u0440\u0430\u0432\u0438\u043B" })] })] })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-4 h-4 crm-muted absolute left-3 top-1/2 -translate-y-1/2" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043F\u0440\u0438\u0447\u0438\u043D\u0435, \u0442\u043E\u0432\u0430\u0440\u0443, \u2116...", className: "w-full crm-surface rounded-xl pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" }), search && (_jsx("button", { type: "button", onClick: () => setSearch(""), className: "absolute right-2.5 top-1/2 -translate-y-1/2 crm-muted", children: _jsx(X, { className: "w-4 h-4" }) }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { "aria-label": "\u0424\u0438\u043B\u044C\u0442\u0440 \u0430\u0440\u0445\u0438\u0432\u0430", value: cat, onChange: (e) => {
                            haptic("select");
                            setCat(e.target.value);
                        }, className: "flex-1 min-w-0 crm-surface text-[var(--crm-text)] rounded-xl border border-[var(--crm-border)] px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40", children: [_jsxs("option", { value: "all", children: ["\u0412\u0441\u0435 (", counts.all, ")"] }), _jsxs("option", { value: "unprofitable", children: ["\uD83D\uDCC9 \u041D\u0435\u0440\u0435\u043D\u0442\u0430\u0431\u0435\u043B\u044C\u043D\u043E (", counts.unprofitable, ")"] }), _jsxs("option", { value: "\u041D\u0435 \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0438", children: ["\uD83D\uDEAB \u041D\u0435 \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0438 (", counts["Не поставки"], ")"] }), _jsxs("option", { value: "\u0414\u043E\u043B\u0433\u0430\u044F \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0430", children: ["\uD83D\uDDD3\uFE0F \u0414\u043E\u043B\u0433\u0430\u044F \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0430 (", counts["Долгая поставка"], ")"] }), counts["Запрещено"] > 0 && (_jsxs("option", { value: "\u0417\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E", children: ["\u26D4 \u0417\u0430\u043F\u0440\u0435\u0449\u0435\u043D\u043E (", counts["Запрещено"], ")"] }))] }), _jsxs("button", { type: "button", onClick: () => {
                            haptic("select");
                            setSortBy((prev) => prev === "newest"
                                ? "oldest"
                                : prev === "oldest"
                                    ? "deadline"
                                    : prev === "deadline"
                                        ? "nmck"
                                        : "newest");
                        }, className: "crm-surface rounded-xl px-2.5 py-1.5 text-xs font-medium inline-flex items-center gap-1 shrink-0", children: [_jsx(ArrowUpDown, { className: "w-3.5 h-3.5" }), _jsx("span", { children: sortBy === "newest"
                                    ? "Новые"
                                    : sortBy === "oldest"
                                        ? "Старые"
                                        : sortBy === "deadline"
                                            ? "Срок"
                                            : "НМЦК" })] })] }), visible.length === 0 ? (_jsxs("div", { className: "crm-surface rounded-2xl p-8 text-center space-y-1", children: [_jsx("p", { className: "text-sm font-medium", children: "\u0412 \u044D\u0442\u043E\u0439 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438 \u043E\u0442\u0441\u0435\u0432\u0430 \u0437\u0430\u043F\u0438\u0441\u0435\u0439 \u043D\u0435\u0442" }), _jsx("p", { className: "text-xs crm-muted", children: "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0434\u0440\u0443\u0433\u0443\u044E \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u0438\u043B\u0438 \u0441\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043F\u043E\u0438\u0441\u043A." })] })) : (_jsx("div", { className: "space-y-2.5", children: visible.map((t) => (_jsx(TenderCard, { tender: t, updateInfo: updatesByTender[t.number], readOnly: readOnly, onOpen: (item) => onOpenTender(item.number), onToggleFavorite: (item) => onToggleFavorite(item) }, t.number))) }))] }));
}
