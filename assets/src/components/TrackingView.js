import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
function money(value) {
    if (value === null || value === undefined)
        return "—";
    return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}
function statusMeta(row) {
    const st = row.status ||
        (row.bids === 0
            ? "zero_bids"
            : row.winner
                ? "contract"
                : row.bids != null
                    ? "protocol"
                    : "waiting_protocol");
    if (st === "zero_bids") {
        return {
            label: "🚫 0 участников",
            cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
        };
    }
    if (st === "contract") {
        return {
            label: "✅ Контракт заключён",
            cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        };
    }
    if (st === "protocol") {
        return {
            label: "📋 Протокол · ждём контракт",
            cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        };
    }
    return {
        label: "⏳ Ждём протокол",
        cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    };
}
function sortByDate(rows) {
    return [...rows].sort((a, b) => {
        const ta = a.published_at || a.deadline_at ? new Date((a.published_at || a.deadline_at).replace(" ", "T")).getTime() : 0;
        const tb = b.published_at || b.deadline_at ? new Date((b.published_at || b.deadline_at).replace(" ", "T")).getTime() : 0;
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
}
export function TrackingView({ snapshot }) {
    const [tab, setTab] = useState("one_bid");
    const [expandedCards, setExpandedCards] = useState({});
    const niches = (snapshot?.engine_info?.market_niches || {});
    const zeroRows = sortByDate((niches.zero_bids || []));
    const oneRows = sortByDate((niches.one_bid || []));
    const lowDropRows = sortByDate((niches.low_drop || []));
    const oursRows = sortByDate((snapshot?.engine_info?.tracking || []));
    const tabs = [
        {
            id: "zero_bids",
            label: "🚫 Без участников",
            count: zeroRows.length,
            desc: "Завершённые поставки без заявок (0 участников) — заказчик часто переобъявляет закупку.",
        },
        {
            id: "one_bid",
            label: "👤 1 участник",
            count: oneRows.length,
            desc: "Завершённые контракты с единственным участником (без демпинга, часто по полной НМЦК).",
        },
        {
            id: "low_drop",
            label: "📉 До 15%",
            count: lowDropRows.length,
            desc: "Завершённые контракты (2+ участников) со снижением не более 15% от НМЦК.",
        },
        {
            id: "ours",
            label: "⭐ Наши",
            count: oursRows.length,
            desc: "Наши лоты с Витрины после окончания срока подачи (протокол и победитель).",
        },
    ];
    const activeTabMeta = tabs.find((t) => t.id === tab) || tabs[0];
    const rows = tab === "zero_bids"
        ? zeroRows
        : tab === "one_bid"
            ? oneRows
            : tab === "low_drop"
                ? lowDropRows
                : oursRows;
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "crm-surface rounded-2xl p-3 space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("div", { className: "text-sm font-bold", children: "\uD83D\uDCCA \u0420\u044B\u043D\u043E\u043A \u00B7 \u0430\u043D\u0430\u043B\u0438\u0437 \u043D\u0438\u0448" }), _jsx("div", { className: "text-[10.5px] crm-muted", children: "\u041D\u0421\u041E \u00B7 \u0434\u043E 150\u043A \u00B7 \u0431\u0435\u0437 \u043C\u0435\u0434." })] }), _jsx("div", { className: "grid grid-cols-2 gap-1.5", children: tabs.map((item) => {
                            const active = item.id === tab;
                            return (_jsxs("button", { type: "button", onClick: () => setTab(item.id), className: `flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-[11.5px] font-medium border transition ${active
                                    ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                                    : "crm-surface border-black/10 dark:border-white/10"}`, children: [_jsx("span", { className: "truncate", children: item.label }), _jsx("span", { className: `px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10 crm-muted"}`, children: item.count })] }, item.id));
                        }) }), _jsx("p", { className: "text-[11px] crm-muted leading-snug", children: activeTabMeta.desc })] }), rows.length === 0 ? (_jsx("div", { className: "crm-surface rounded-xl p-6 text-center text-[12px] crm-muted", children: "\u0412 \u044D\u0442\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \u043F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E." })) : (rows.map((row) => {
                const badge = statusMeta(row);
                const drop = row.drop_pct !== null && row.drop_pct !== undefined
                    ? Math.round(row.drop_pct)
                    : row.nmck && row.win_price
                        ? Math.round((1 - row.win_price / row.nmck) * 100)
                        : null;
                const eis = row.eis_url ||
                    (row.purchase_number
                        ? row.law?.includes("223")
                            ? `https://zakupki.gov.ru/epz/order/notice/notice223/common-info.html?regNumber=${row.purchase_number}`
                            : `https://zakupki.gov.ru/epz/order/notice/view/common-info.html?regNumber=${row.purchase_number}`
                        : "");
                return (_jsxs("article", { className: "crm-surface rounded-2xl p-3 space-y-2", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium border ${badge.cls}`, children: badge.label }), _jsx("span", { className: "text-[10.5px] crm-muted shrink-0", children: row.law })] }), _jsx("h3", { className: "text-[13.5px] font-semibold leading-snug", children: row.subject }), _jsxs("div", { className: "flex items-center justify-between gap-2 text-[11px] crm-muted", children: [_jsx("span", { children: row.published_at || row.deadline_at || "—" }), eis ? (_jsxs("a", { href: eis, target: "_blank", rel: "noreferrer", className: "text-sky-600 dark:text-sky-400 underline underline-offset-2", children: ["\u2116 ", row.purchase_number || row.reg_num] })) : (_jsxs("span", { children: ["\u2116 ", row.purchase_number || row.reg_num] }))] }), _jsxs("div", { className: "grid grid-cols-3 gap-2 text-[11px] pt-1", children: [_jsxs("div", { children: [_jsx("div", { className: "crm-muted", children: "\u041D\u041C\u0426\u041A" }), _jsx("div", { className: "font-semibold", children: money(row.nmck) })] }), _jsxs("div", { children: [_jsx("div", { className: "crm-muted", children: row.status === "zero_bids" ? "Итог" : "Цена победы" }), _jsxs("div", { className: "font-semibold", children: [row.status === "zero_bids" ? "Нет заявок" : money(row.win_price), drop !== null && row.status !== "zero_bids" ? (_jsxs("span", { className: "text-[10px] crm-muted ml-1", children: ["(-", drop, "%)"] })) : null] })] }), _jsxs("div", { children: [_jsx("div", { className: "crm-muted", children: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A\u043E\u0432" }), _jsx("div", { className: "font-semibold", children: row.bids ?? "—" })] })] }), row.bid_prices && row.bid_prices.length > 1 && (_jsxs("p", { className: "text-[11px] crm-muted", children: ["\u0426\u0435\u043D\u044B \u0437\u0430\u044F\u0432\u043E\u043A: ", row.bid_prices.map((p) => money(p)).join(" · ")] })), row.items && row.items.length > 0 && (() => {
                            const cardKey = `${tab}-${row.purchase_number || row.reg_num}`;
                            const isExp = Boolean(expandedCards[cardKey]);
                            const totalItems = row.items_count || row.items.length;
                            const shown = isExp ? row.items : row.items.slice(0, 4);
                            return (_jsxs("div", { className: "pt-1.5 border-t border-black/5 dark:border-white/10 space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px]", children: [_jsxs("span", { className: "font-semibold", children: ["\uD83D\uDCE6 \u041D\u0430\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0439: ", totalItems] }), row.items.length > 4 && (_jsx("button", { type: "button", onClick: () => setExpandedCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] })), className: "text-sky-600 dark:text-sky-400 underline underline-offset-2 text-[10.5px]", children: isExp ? "Свернуть" : `Показать все ${row.items.length}` }))] }), _jsx("ul", { className: "space-y-0.5 text-[11px] crm-muted", children: shown.map((it, idx) => (_jsxs("li", { className: "flex items-baseline justify-between gap-2", children: [_jsxs("span", { className: "truncate", children: [idx + 1, ". ", it.name] }), _jsx("span", { className: "shrink-0 font-medium text-black/80 dark:text-white/80", children: it.qty != null ? `${it.qty}${it.unit ? ` ${it.unit}` : ""}` : "—" })] }, idx))) })] }));
                        })(), _jsxs("div", { className: "pt-1 border-t border-black/5 dark:border-white/10 space-y-0.5 text-[11.5px]", children: [row.status === "zero_bids" ? (_jsxs("div", { className: "text-[11px] crm-muted", children: ["\u041F\u0440\u0438\u0447\u0438\u043D\u0430: ", _jsx("span", { className: "font-medium", children: row.winner || "Не подано ни одной заявки" })] })) : (_jsxs("div", { children: [_jsx("span", { className: "crm-muted", children: "\u041F\u043E\u0431\u0435\u0434\u0438\u0442\u0435\u043B\u044C: " }), _jsx("span", { className: "font-medium", children: row.winner || "ждём публикацию контракта" })] })), row.our_profit != null && (_jsxs("div", { className: "text-[11px] crm-muted", children: ["\u041D\u0430\u0448\u0430 \u0440\u0430\u0441\u0447\u0451\u0442\u043D\u0430\u044F \u043F\u0440\u0438\u0431\u044B\u043B\u044C:", " ", _jsx("span", { className: "font-semibold text-emerald-600 dark:text-emerald-400", children: money(row.our_profit) })] }))] })] }, `${tab}-${row.purchase_number || row.reg_num}`));
            }))] }));
}
