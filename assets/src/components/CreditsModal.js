import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Check, KeyRound, RotateCcw, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { haptic } from "../lib/telegram.js?v=mx0305v6";
const PACKAGES = [
    {
        id: "pack_1",
        credits: 1,
        price: "500 ₽",
        subtitle: "Открыть 1 готовый тендер с поставщиком",
        badge: null,
    },
    {
        id: "pack_5",
        credits: 5,
        price: "2 000 ₽",
        subtitle: "400 ₽ за тендер · оптимально для старта",
        badge: "Хит",
    },
    {
        id: "pack_10",
        credits: 10,
        price: "3 500 ₽",
        subtitle: "350 ₽ за тендер · выгода 30%",
        badge: "Выгодно",
    },
];
export function CreditsModal({ openCredits, dailyCredits = 0, resetting, canResetDemo = false, onClose, onResetDemo, onToast, }) {
    const [selectedId, setSelectedId] = useState("pack_5");
    const selectedPkg = PACKAGES.find((p) => p.id === selectedId) || PACKAGES[1];
    const handleBuyClick = () => {
        haptic("success");
        onToast(`Тариф «${selectedPkg.credits} откр. за ${selectedPkg.price}»: онлайн-оплата СБП/картой подключается на следующем этапе запуска.`);
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4", onClick: onClose, children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "crm-surface w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("div", { children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center", children: _jsx(KeyRound, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-base font-bold leading-tight", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u0442\u0435\u043D\u0434\u0435\u0440\u043E\u0432" }), _jsxs("p", { className: "text-xs crm-muted", children: ["\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0431\u0430\u043B\u0430\u043D\u0441: ", _jsxs("b", { className: "text-[var(--crm-text)]", children: ["\uD83D\uDD11 ", openCredits] })] })] })] }) }), _jsx("button", { type: "button", onClick: onClose, "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", className: "p-1.5 rounded-full hover:bg-slate-500/10 crm-muted", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("p", { className: "text-xs crm-muted leading-relaxed", children: ["1 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0435 \u0434\u0430\u0451\u0442 \u043F\u043E\u043B\u043D\u044B\u0439 \u0434\u043E\u0441\u0442\u0443\u043F \u043A 1 \u0433\u043E\u0442\u043E\u0432\u043E\u043C\u0443 \u0442\u0435\u043D\u0434\u0435\u0440\u0443: \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B \u0438 \u0441\u0441\u044B\u043B\u043A\u0438 \u043D\u0430 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u043E\u0432, \u043D\u043E\u043C\u0435\u0440 \u0437\u0430\u043A\u0443\u043F\u043A\u0438 \u0432 \u0415\u0418\u0421, \u0440\u0430\u0441\u0447\u0451\u0442 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \u0438 \u0434\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u043A\u0430\u0437\u0447\u0438\u043A\u0430.", dailyCredits > 0 && (_jsxs(_Fragment, { children: [" ", "\u0412\u0430\u0448 \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u044B\u0439 \u043B\u0438\u043C\u0438\u0442: ", _jsxs("b", { className: "text-[var(--crm-text)]", children: ["\uD83D\uDD11 ", dailyCredits] }), " \u0432 \u0441\u0443\u0442\u043A\u0438 (\u043E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0432 00:00 \u041D\u0421\u041A)."] }))] }), _jsx("div", { className: "space-y-2", children: PACKAGES.map((pkg) => {
                        const active = pkg.id === selectedId;
                        return (_jsxs("button", { type: "button", onClick: () => {
                                haptic("select");
                                setSelectedId(pkg.id);
                            }, className: `w-full text-left rounded-2xl p-3 border transition flex items-center justify-between gap-3 ${active
                                ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/40"
                                : "border-[var(--crm-border)] bg-slate-500/5 hover:bg-slate-500/10"}`, children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-sm font-bold", children: ["\uD83D\uDD11 ", pkg.credits, " ", pkg.credits === 1 ? "открытие" : "открытий"] }), pkg.badge && (_jsxs("span", { className: "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/18 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold", children: [_jsx(Sparkles, { className: "w-2.5 h-2.5" }), pkg.badge] }))] }), _jsx("div", { className: "text-[11px] crm-muted mt-0.5", children: pkg.subtitle })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx("span", { className: "text-sm font-bold", children: pkg.price }), _jsx("div", { className: `w-5 h-5 rounded-full border flex items-center justify-center ${active
                                                ? "bg-blue-500 border-blue-500 text-white"
                                                : "border-[var(--crm-border)]"}`, children: active && _jsx(Check, { className: "w-3 h-3" }) })] })] }, pkg.id));
                    }) }), _jsxs("div", { className: "space-y-2 pt-1", children: [_jsxs("button", { type: "button", onClick: handleBuyClick, className: "w-full py-3 px-4 rounded-xl crm-accent-btn text-sm font-bold shadow-sm active:scale-[0.99] transition", children: ["\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u043E\u043F\u043B\u0430\u0442\u0435 \u00B7 ", selectedPkg.price] }), canResetDemo && (_jsxs("button", { type: "button", disabled: resetting, onClick: () => {
                                haptic("light");
                                void onResetDemo().then(onClose);
                            }, className: "w-full py-2.5 px-4 rounded-xl border border-[var(--crm-border)] bg-slate-500/6 hover:bg-slate-500/10 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60 transition", children: [_jsx(RotateCcw, { className: `w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}` }), resetting
                                    ? "Сбрасываем..."
                                    : "Сбросить демо-тест (вернуть открытия по лимиту)"] }))] })] }) }));
}
