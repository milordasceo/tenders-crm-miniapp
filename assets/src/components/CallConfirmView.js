import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Check, ChevronRight, Clock, Copy, Edit3, Lock, MessageSquareText, Phone, PhoneCall, Save, Search, Star, X, } from "lucide-react";
import { useMemo, useState } from "react";
import { buildCallQuestions, formatRub, getCallConfirmSellers, getDeadlineInfo, toNumber, } from "../lib/format.js?v=mx0305v6";
import { haptic } from "../lib/telegram.js?v=mx0305v6";
const DEFAULT_FORM = {
    outcome: "confirmed",
    price: "",
    priceMode: "unit",
    leadTime: "",
    gisp: "",
    comment: "",
};
export function CallConfirmView({ tenders, canSeeContactsDirectly, onOpenTender, onToggleFavorite, onRecordCallResult, onToast, }) {
    const [search, setSearch] = useState("");
    const [sortMode, setSortMode] = useState("urgent");
    const [copiedKey, setCopiedKey] = useState(null);
    const [openFormKey, setOpenFormKey] = useState(null);
    const [formState, setFormState] = useState(DEFAULT_FORM);
    const [submittingKey, setSubmittingKey] = useState(null);
    const enriched = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = tenders
            .map((t) => {
            const sellers = getCallConfirmSellers(t);
            const preview = t.details?.call_confirm_preview;
            const maxReminders = Math.max(...sellers.map((s) => s.reminderCount), Number(preview?.max_reminders || 0), 0);
            const hasUrgent = sellers.some((s) => s.isUrgent) || Boolean(preview?.has_urgent_call);
            const deadlineMs = t.deadline_at ? Date.parse(t.deadline_at) : Number.MAX_SAFE_INTEGER;
            const questions = buildCallQuestions(t, sellers);
            return {
                tender: t,
                sellers,
                preview,
                maxReminders,
                hasUrgent,
                deadlineMs,
                questions,
            };
        })
            .filter(({ tender }) => {
            if (!q)
                return true;
            const hay = [
                tender.product,
                tender.subject || "",
                tender.city || "",
                canSeeContactsDirectly || tender.is_unlocked ? tender.number : "",
            ]
                .join(" ")
                .toLowerCase();
            return hay.includes(q);
        });
        list.sort((a, b) => {
            if (sortMode === "nmck") {
                return Number(toNumber(b.tender.nmck) ?? 0) - Number(toNumber(a.tender.nmck) ?? 0);
            }
            if (sortMode === "reminders") {
                if (b.maxReminders !== a.maxReminders)
                    return b.maxReminders - a.maxReminders;
                return a.deadlineMs - b.deadlineMs;
            }
            if (a.hasUrgent !== b.hasUrgent)
                return a.hasUrgent ? -1 : 1;
            return a.deadlineMs - b.deadlineMs;
        });
        return list;
    }, [canSeeContactsDirectly, search, sortMode, tenders]);
    const handleCopyPhone = async (key, phone) => {
        haptic("light");
        try {
            await navigator.clipboard.writeText(phone);
            setCopiedKey(key);
            onToast(`Номер скопирован: ${phone}`);
            setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
        }
        catch {
            onToast(phone);
        }
    };
    const toggleForm = (key, prelimPrice, itemsCount) => {
        haptic("select");
        if (openFormKey === key) {
            setOpenFormKey(null);
            return;
        }
        setOpenFormKey(key);
        setFormState({
            outcome: "confirmed",
            price: prelimPrice ? String(prelimPrice) : "",
            priceMode: itemsCount > 1 ? "total" : "unit",
            leadTime: "",
            gisp: "",
            comment: "",
        });
    };
    const handleSubmitForm = async (cKey, tender, sellerKey, sellerName, phone) => {
        if (!onRecordCallResult)
            return;
        const rawPrice = formState.price.replace(/\s+/g, "").replace(",", ".");
        const parsedPrice = rawPrice ? Number(rawPrice) : null;
        if (formState.outcome === "confirmed" &&
            (parsedPrice === null || !Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
            onToast("Укажите подтверждённую цену в рублях");
            return;
        }
        setSubmittingKey(cKey);
        try {
            await onRecordCallResult({
                number: tender.number,
                seller_key: sellerKey,
                seller_name: sellerName,
                phone,
                outcome: formState.outcome,
                price: formState.outcome === "confirmed" ? parsedPrice : null,
                price_mode: formState.priceMode,
                lead_time: formState.leadTime.trim(),
                gisp: formState.gisp.trim(),
                comment: formState.comment.trim(),
            });
            setOpenFormKey(null);
        }
        finally {
            setSubmittingKey(null);
        }
    };
    return (_jsxs("div", { className: "space-y-2.5", children: [_jsxs("section", { className: "crm-surface rounded-2xl p-3 border border-amber-500/30 bg-amber-500/8 space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "inline-flex items-center gap-1.5 text-sm font-bold text-amber-800 dark:text-amber-200", children: [_jsx(PhoneCall, { className: "w-4 h-4 shrink-0" }), _jsx("span", { children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0437\u0432\u043E\u043D\u043A\u043E\u043C" })] }), _jsx("span", { className: "px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200", children: enriched.length })] }), _jsx("p", { className: "text-[11.5px] leading-snug crm-muted", children: "\u041F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0430\u043C \u0443\u0436\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u044B \u043F\u0438\u0441\u044C\u043C\u0430 \u0438 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u044F, \u043D\u043E \u043E\u043D\u0438 \u0434\u043E\u043B\u0433\u043E \u043D\u0435 \u043E\u0442\u0432\u0435\u0447\u0430\u044E\u0442 \u043D\u0430 \u043F\u043E\u0447\u0442\u0443. \u041F\u043E\u0437\u0432\u043E\u043D\u0438\u0442\u0435 \u043D\u0430\u043F\u0440\u044F\u043C\u0443\u044E \u0438 \u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u0443\u0439\u0442\u0435 \u0438\u0442\u043E\u0433 \u2014 \u043A\u043E\u043D\u0432\u0435\u0439\u0435\u0440 \u0441\u0430\u043C \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0435\u0442 \u043B\u043E\u0442 \u0438 \u0434\u043E\u0432\u0435\u0434\u0451\u0442 \u0434\u043E \u0412\u0438\u0442\u0440\u0438\u043D\u044B." })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "w-4 h-4 crm-muted absolute left-3 top-1/2 -translate-y-1/2" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0442\u043E\u0432\u0430\u0440\u0443, \u0433\u043E\u0440\u043E\u0434\u0443...", className: "w-full crm-surface rounded-xl pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" }), search && (_jsx("button", { type: "button", onClick: () => setSearch(""), className: "absolute right-2.5 top-1/2 -translate-y-1/2 crm-muted", children: _jsx(X, { className: "w-4 h-4" }) }))] }), _jsx("button", { type: "button", onClick: () => {
                            haptic("select");
                            setSortMode((prev) => prev === "urgent" ? "nmck" : prev === "nmck" ? "reminders" : "urgent");
                        }, className: "crm-surface rounded-xl px-2.5 py-2 text-xs font-medium shrink-0", children: sortMode === "urgent"
                            ? "🔥 Срочные"
                            : sortMode === "nmck"
                                ? "💰 НМЦК"
                                : "📬 Напом." })] }), enriched.length === 0 ? (_jsxs("div", { className: "crm-surface rounded-2xl p-8 text-center space-y-1.5", children: [_jsx("p", { className: "text-sm font-medium", children: "\u0421\u0435\u0439\u0447\u0430\u0441 \u043D\u0435\u0442 \u0442\u0435\u043D\u0434\u0435\u0440\u043E\u0432, \u043E\u0436\u0438\u0434\u0430\u044E\u0449\u0438\u0445 \u0437\u0432\u043E\u043D\u043A\u0430" }), _jsx("p", { className: "text-xs crm-muted", children: "\u041A\u0430\u043A \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0438 \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043D\u0443\u0442 \u043E\u0442\u0432\u0435\u0447\u0430\u0442\u044C \u043D\u0430 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u044B\u0435 \u043F\u0438\u0441\u044C\u043C\u0430 \u043F\u043E \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u043C \u043B\u043E\u0442\u0430\u043C, \u043E\u043D\u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C \u0441 \u043D\u043E\u043C\u0435\u0440\u0430\u043C\u0438 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u043E\u0432 \u0438 \u0447\u0435\u043A-\u043B\u0438\u0441\u0442\u043E\u043C \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432." })] })) : (_jsx("div", { className: "space-y-3", children: enriched.map(({ tender, sellers, preview, maxReminders, questions }) => {
                    const dl = getDeadlineInfo(tender.deadline_at);
                    const isUnlocked = canSeeContactsDirectly || Boolean(tender.is_unlocked);
                    const profitNum = toNumber(tender.profit);
                    const nmckNum = toNumber(tender.nmck);
                    const previewCount = preview?.suppliers_count ?? sellers.length;
                    const itemsCount = (tender.details?.items || []).length;
                    return (_jsxs("article", { className: "crm-surface rounded-2xl p-3.5 border border-[var(--crm-border)] space-y-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("button", { type: "button", onClick: () => {
                                            haptic("light");
                                            onOpenTender(tender.number);
                                        }, className: "text-left min-w-0 flex-1 space-y-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25", children: [_jsx(PhoneCall, { className: "w-3 h-3" }), maxReminders >= 2
                                                                ? `Нет ответа (${maxReminders} нап.)`
                                                                : "Нужен звонок"] }), _jsxs("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${dl.tone === "critical"
                                                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                                            : dl.tone === "warn"
                                                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                                                : "bg-slate-500/12 crm-muted"}`, children: [_jsx(Clock, { className: "w-3 h-3" }), dl.shortLabel] })] }), _jsx("h3", { className: "text-[14px] font-bold leading-snug line-clamp-2", children: tender.product }), _jsxs("div", { className: "flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] crm-muted", children: [tender.city && _jsxs("span", { children: ["\uD83D\uDCCD ", tender.city] }), nmckNum !== null && _jsxs("span", { children: ["\u041D\u041C\u0426\u041A: ", formatRub(nmckNum)] }), profitNum !== null && profitNum > 0 && (_jsxs("span", { className: "font-semibold text-emerald-700 dark:text-emerald-300", children: ["\u0420\u0430\u0441\u0447\u0451\u0442: +", formatRub(profitNum)] }))] })] }), _jsx("button", { type: "button", onClick: () => {
                                            haptic("select");
                                            onToggleFavorite(tender);
                                        }, className: "p-1.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 shrink-0", title: tender.is_favorite ? "Убрать из избранного" : "В избранное", children: _jsx(Star, { className: `w-4 h-4 ${tender.is_favorite
                                                ? "fill-amber-400 text-amber-400"
                                                : "crm-muted"}` }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "text-[11px] font-semibold uppercase tracking-wide crm-muted", children: ["\u041A\u043E\u043C\u0443 \u0437\u0432\u043E\u043D\u0438\u0442\u044C (", isUnlocked ? sellers.length : previewCount, ")"] }), isUnlocked ? (_jsx("div", { className: "space-y-2", children: sellers.map((s, idx) => {
                                            const cKey = `${tender.number}_${s.seller.key || idx}`;
                                            const formOpen = openFormKey === cKey;
                                            const isSavingThis = submittingKey === cKey;
                                            return (_jsxs("div", { className: "rounded-xl p-2.5 bg-slate-500/8 border border-[var(--crm-border)] space-y-2", children: [_jsx("div", { className: "flex items-start justify-between gap-2", children: _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-xs font-semibold leading-snug truncate", children: s.name }), _jsxs("div", { className: "text-[11px] text-amber-700 dark:text-amber-300 leading-snug", children: [s.reasonLabel, s.prelimPrice ? ` · ориентир ${formatRub(s.prelimPrice)}` : ""] })] }) }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsxs("a", { href: s.telHref, onClick: () => haptic("medium"), className: "flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold active:scale-[0.98] transition", children: [_jsx(Phone, { className: "w-3.5 h-3.5 shrink-0" }), _jsx("span", { children: s.phone })] }), _jsx("button", { type: "button", onClick: () => void handleCopyPhone(cKey, s.phone), className: "px-2.5 py-2 rounded-xl bg-slate-500/15 hover:bg-slate-500/25 text-xs font-medium inline-flex items-center gap-1 shrink-0", title: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043D\u043E\u043C\u0435\u0440", children: copiedKey === cKey ? (_jsx(Check, { className: "w-3.5 h-3.5 text-emerald-500" })) : (_jsx(Copy, { className: "w-3.5 h-3.5" })) }), canSeeContactsDirectly && onRecordCallResult && (_jsxs("button", { type: "button", onClick: () => toggleForm(cKey, s.prelimPrice, itemsCount), className: `px-2.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1 shrink-0 transition ${formOpen
                                                                    ? "bg-blue-600 text-white"
                                                                    : "bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25"}`, title: "\u0417\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0437\u0432\u043E\u043D\u043A\u0430", children: [_jsx(Edit3, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "\u0418\u0442\u043E\u0433" })] }))] }), formOpen && canSeeContactsDirectly && onRecordCallResult && (_jsxs("div", { className: "pt-2 border-t border-[var(--crm-border)] space-y-2", children: [_jsx("div", { className: "grid grid-cols-3 gap-1", children: [
                                                                    { id: "confirmed", label: "✅ Цена есть" },
                                                                    { id: "callback", label: "📞 Перезвонят" },
                                                                    { id: "declined", label: "❌ Отказ" },
                                                                ].map((opt) => (_jsx("button", { type: "button", onClick: () => setFormState((prev) => ({ ...prev, outcome: opt.id })), className: `py-1.5 px-1.5 rounded-lg text-[11px] font-semibold border transition ${formState.outcome === opt.id
                                                                        ? opt.id === "confirmed"
                                                                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                                                                            : opt.id === "declined"
                                                                                ? "bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-rose-300"
                                                                                : "bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300"
                                                                        : "bg-slate-500/10 border-transparent crm-muted"}`, children: opt.label }, opt.id))) }), formState.outcome === "confirmed" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("input", { type: "text", inputMode: "decimal", value: formState.price, onChange: (e) => setFormState((prev) => ({
                                                                                    ...prev,
                                                                                    price: e.target.value,
                                                                                })), placeholder: "\u0426\u0435\u043D\u0430 \u0432 \u20BD (\u043D\u0430\u043F\u0440. 12500)", className: "flex-1 min-w-0 crm-surface rounded-lg px-2.5 py-1.5 text-xs border border-[var(--crm-border)] focus:outline-none focus:ring-2 focus:ring-emerald-500/40" }), _jsxs("select", { value: formState.priceMode, onChange: (e) => setFormState((prev) => ({
                                                                                    ...prev,
                                                                                    priceMode: e.target.value,
                                                                                })), className: "crm-surface rounded-lg px-2 py-1.5 text-[11px] border border-[var(--crm-border)]", children: [_jsx("option", { value: "unit", children: "\u0437\u0430 1 \u0435\u0434." }), _jsx("option", { value: "total", children: "\u0437\u0430 \u0432\u0441\u0451" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-1.5", children: [_jsx("input", { type: "text", value: formState.leadTime, onChange: (e) => setFormState((prev) => ({
                                                                                    ...prev,
                                                                                    leadTime: e.target.value,
                                                                                })), placeholder: "\u0421\u0440\u043E\u043A / \u043D\u0430\u043B\u0438\u0447\u0438\u0435 (\u043D\u0430\u043F\u0440. 2 \u0434\u043D\u044F)", className: "crm-surface rounded-lg px-2.5 py-1.5 text-xs border border-[var(--crm-border)] focus:outline-none" }), _jsx("input", { type: "text", value: formState.gisp, onChange: (e) => setFormState((prev) => ({
                                                                                    ...prev,
                                                                                    gisp: e.target.value,
                                                                                })), placeholder: "\u0421\u0442\u0440\u0430\u043D\u0430 / \u0413\u0418\u0421\u041F (\u043D\u0435\u043E\u0431\u044F\u0437.)", className: "crm-surface rounded-lg px-2.5 py-1.5 text-xs border border-[var(--crm-border)] focus:outline-none" })] })] })), _jsx("input", { type: "text", value: formState.comment, onChange: (e) => setFormState((prev) => ({ ...prev, comment: e.target.value })), placeholder: formState.outcome === "confirmed"
                                                                    ? "Комментарий (с НДС/без, контакт, детали)..."
                                                                    : formState.outcome === "callback"
                                                                        ? "Когда обещали перезвонить / прислать КП..."
                                                                        : "Причина отказа (нет в наличии, чужой товар)...", className: "w-full crm-surface rounded-lg px-2.5 py-1.5 text-xs border border-[var(--crm-border)] focus:outline-none" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsxs("button", { type: "button", disabled: isSavingThis, onClick: () => void handleSubmitForm(cKey, tender, s.seller.key, s.name, s.phone), className: "flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5", children: [_jsx(Save, { className: "w-3.5 h-3.5" }), _jsx("span", { children: isSavingThis
                                                                                    ? "Сохраняю..."
                                                                                    : formState.outcome === "confirmed"
                                                                                        ? "Сохранить и отправить в расчёт"
                                                                                        : "Сохранить итог звонка" })] }), _jsx("button", { type: "button", onClick: () => setOpenFormKey(null), className: "px-2.5 py-2 rounded-xl bg-slate-500/15 text-xs font-medium", children: "\u041E\u0442\u043C\u0435\u043D\u0430" })] })] }))] }, cKey));
                                        }) })) : (_jsxs("button", { type: "button", onClick: () => {
                                            haptic("light");
                                            onOpenTender(tender.number);
                                        }, className: "w-full rounded-xl p-2.5 bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2 text-left active:scale-[0.99]", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx(Lock, { className: "w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0" }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "text-xs font-semibold text-amber-800 dark:text-amber-200", children: [previewCount, " \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A(\u0430) \u0441 \u0442\u0435\u043B\u0435\u0444\u043E\u043D\u043E\u043C \u0433\u043E\u0442\u043E\u0432\u044B \u043A \u0437\u0432\u043E\u043D\u043A\u0443"] }), _jsx("div", { className: "text-[11px] crm-muted", children: "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443, \u0447\u0442\u043E\u0431\u044B \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043D\u043E\u043C\u0435\u0440\u0430 \u0438 \u0441\u0441\u044B\u043B\u043A\u0443 \u043D\u0430 \u0415\u0418\u0421" })] })] }), _jsx(ChevronRight, { className: "w-4 h-4 crm-muted shrink-0" })] }))] }), _jsxs("div", { className: "rounded-xl p-2.5 bg-blue-500/8 border border-blue-500/20 space-y-1.5", children: [_jsxs("div", { className: "inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-300", children: [_jsx(MessageSquareText, { className: "w-3.5 h-3.5 shrink-0" }), _jsx("span", { children: "\u0427\u0442\u043E \u0441\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0432 \u0437\u0432\u043E\u043D\u043A\u0435" })] }), _jsx("ol", { className: "space-y-1 text-[11.5px] leading-snug list-decimal list-inside text-[var(--crm-text)]/90", children: questions.map((qText, qIdx) => (_jsx("li", { className: "break-words", children: qText }, qIdx))) })] }), _jsxs("button", { type: "button", onClick: () => {
                                    haptic("light");
                                    onOpenTender(tender.number);
                                }, className: "w-full py-2 px-3 rounded-xl bg-slate-500/10 hover:bg-slate-500/15 text-xs font-semibold inline-flex items-center justify-center gap-1", children: [_jsx("span", { children: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u0442\u0435\u043D\u0434\u0435\u0440\u0430 \u0438 \u0422\u0417" }), _jsx(ChevronRight, { className: "w-3.5 h-3.5" })] })] }, tender.number));
                }) }))] }));
}
