import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Building2, Check, CheckCircle2, ChevronDown, Copy, Edit3, KeyRound, Plus, RotateCcw, ShieldCheck, Star, Unlock, } from "lucide-react";
import { useState } from "react";
import { haptic } from "../lib/telegram.js?v=mx0305v6";
import { TenderCard } from "./TenderCard.js?v=mx0305v6";
export function CabinetView({ user, unlockedTenders, favoriteTenders, resettingDemo, canResetDemo = false, onOpenTender, onToggleFavorite, onOpenCreditsModal, onOpenCompanyProfile, onResetDemo, onActivateAccessCode, }) {
    const [section, setSection] = useState("unlocked");
    const [copiedId, setCopiedId] = useState(false);
    const [codeOpen, setCodeOpen] = useState(false);
    const [accessCode, setAccessCode] = useState("");
    const [activatingCode, setActivatingCode] = useState(false);
    const [codeError, setCodeError] = useState(null);
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
        user.username ||
        `Пользователь #${user.telegram_id}`;
    const avatarInitial = (fullName[0] || "Т").toUpperCase();
    const copyTelegramId = () => {
        haptic("light");
        navigator.clipboard?.writeText(String(user.telegram_id));
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 1500);
    };
    const list = section === "unlocked" ? unlockedTenders : favoriteTenders;
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shrink-0", children: avatarInitial }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h2", { className: "text-base font-bold truncate", children: fullName }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 mt-0.5 text-xs crm-muted", children: [user.username && _jsxs("span", { className: "truncate", children: ["@", user.username] }), _jsxs("button", { type: "button", onClick: copyTelegramId, className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/12 font-mono text-[11px] hover:text-[var(--crm-text)]", children: [copiedId ? (_jsx(Check, { className: "w-3 h-3 text-emerald-500" })) : (_jsx(Copy, { className: "w-3 h-3" })), "ID: ", user.telegram_id] })] })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2 pt-2 border-t border-[var(--crm-border)] text-center", children: [_jsxs("div", { className: "rounded-xl bg-slate-500/6 py-2 px-1", children: [_jsxs("div", { className: "text-base font-bold text-blue-600 dark:text-blue-400", children: ["\uD83D\uDD11 ", user.open_credits] }), _jsx("div", { className: "text-[10.5px] crm-muted mt-0.5", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u0438\u0439" })] }), _jsxs("div", { className: "rounded-xl bg-slate-500/6 py-2 px-1", children: [_jsx("div", { className: "text-base font-bold text-emerald-600 dark:text-emerald-400", children: unlockedTenders.length }), _jsx("div", { className: "text-[10.5px] crm-muted mt-0.5", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u043E" })] }), _jsxs("div", { className: "rounded-xl bg-slate-500/6 py-2 px-1", children: [_jsx("div", { className: "text-base font-bold text-amber-500", children: favoriteTenders.length }), _jsx("div", { className: "text-[10.5px] crm-muted mt-0.5", children: "\u0412 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u043C" })] })] })] }), _jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-3 border border-blue-500/30 bg-gradient-to-br from-blue-500/8 via-transparent to-emerald-500/8", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-medium crm-muted", children: "\u0412\u0430\u0448 \u0431\u0430\u043B\u0430\u043D\u0441" }), _jsxs("div", { className: "text-xl font-bold mt-0.5 flex items-center gap-1.5", children: [_jsx(KeyRound, { className: "w-5 h-5 text-blue-500" }), "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0439: ", user.open_credits] })] }), _jsxs("button", { type: "button", onClick: () => {
                                    haptic("light");
                                    onOpenCreditsModal();
                                }, className: "inline-flex items-center gap-1 px-3 py-2 rounded-xl crm-accent-btn text-xs font-bold shrink-0 shadow-xs active:scale-95 transition", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), "\u041A\u0443\u043F\u0438\u0442\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F"] })] }), _jsxs("p", { className: "text-xs crm-muted leading-relaxed", children: ["1 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0435 = \u043F\u043E\u043B\u043D\u044B\u0439 \u0434\u043E\u0441\u0442\u0443\u043F \u043A 1 \u0433\u043E\u0442\u043E\u0432\u043E\u043C\u0443 \u0442\u0435\u043D\u0434\u0435\u0440\u0443 (\u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A \u0441 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D\u043D\u043E\u0439 \u0446\u0435\u043D\u043E\u0439, \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B, \u0440\u0430\u0441\u0447\u0451\u0442 \u043B\u043E\u0433\u0438\u0441\u0442\u0438\u043A\u0438 \u0438 \u043F\u0440\u044F\u043C\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0415\u0418\u0421).", (user.effective_daily_credits ?? 0) > 0 && (_jsxs(_Fragment, { children: [" ", "\u0415\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E\u0435 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435: \u0434\u043E", " ", _jsxs("b", { className: "text-[var(--crm-text)]", children: ["\uD83D\uDD11 ", user.effective_daily_credits] }), " \u043A\u0430\u0436\u0434\u044B\u0435 \u0441\u0443\u0442\u043A\u0438 (\u0432 00:00 \u041D\u0421\u041A)."] }))] }), canResetDemo && (_jsxs("button", { type: "button", disabled: resettingDemo, onClick: () => {
                            haptic("light");
                            void onResetDemo();
                        }, className: "w-full py-2 px-3 rounded-xl border border-[var(--crm-border)] bg-slate-500/6 hover:bg-slate-500/12 text-xs font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-60 transition", children: [_jsx(RotateCcw, { className: `w-3.5 h-3.5 ${resettingDemo ? "animate-spin" : ""}` }), resettingDemo
                                ? "Сбрасываем..."
                                : "🔄 Сбросить тест (вернуть открытия по лимиту)"] }))] }), _jsx("section", { className: "crm-surface rounded-2xl p-4 space-y-2.5", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [_jsx("div", { className: "w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0", children: _jsx(Building2, { className: "w-4.5 h-4.5" }) }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "text-sm font-bold flex items-center gap-1.5 flex-wrap", children: [_jsx("span", { children: "\u041C\u043E\u0438 \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B \u0434\u043B\u044F \u043F\u043E\u0434\u0430\u0447\u0438" }), user.company_profile?.full_name && user.company_profile?.inn ? (_jsxs("span", { className: "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "\u0417\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u044B"] })) : (_jsx("span", { className: "inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400", children: "\u041D\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u044B" }))] }), _jsx("div", { className: "text-xs crm-muted truncate mt-0.5", children: user.company_profile?.full_name
                                                ? `${user.company_profile.full_name}${user.company_profile.inn ? ` · ИНН ${user.company_profile.inn}` : ""}`
                                                : "ИП или ООО, ИНН, банк и адрес — подставятся в 4 файла .docx" })] })] }), _jsxs("button", { type: "button", onClick: () => {
                                haptic("light");
                                onOpenCompanyProfile();
                            }, className: "inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[var(--crm-border)] bg-sky-500/12 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-semibold shrink-0 transition", children: [_jsx(Edit3, { className: "w-3.5 h-3.5" }), user.company_profile?.full_name ? "Изменить" : "Заполнить"] })] }) }), user.role === "viewer" && onActivateAccessCode && (_jsxs("section", { className: "crm-surface rounded-2xl border border-[var(--crm-border)] overflow-hidden", children: [_jsxs("button", { type: "button", onClick: () => {
                            haptic("select");
                            setCodeOpen((v) => !v);
                            setCodeError(null);
                        }, className: "w-full px-4 py-3 flex items-center justify-between gap-2 text-left", children: [_jsxs("span", { className: "inline-flex items-center gap-2 text-xs font-semibold", children: [_jsx(ShieldCheck, { className: "w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" }), "\u0410\u043A\u0442\u0438\u0432\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u043E\u0434 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 (\u043F\u0430\u0440\u0442\u043D\u0451\u0440 / \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440)"] }), _jsx(ChevronDown, { className: `w-4 h-4 crm-muted transition-transform ${codeOpen ? "rotate-180" : ""}` })] }), codeOpen && (_jsxs("form", { onSubmit: async (e) => {
                            e.preventDefault();
                            const trimmed = accessCode.trim();
                            if (!trimmed) {
                                setCodeError("Введите код доступа");
                                return;
                            }
                            setActivatingCode(true);
                            setCodeError(null);
                            try {
                                await onActivateAccessCode(trimmed);
                                haptic("success");
                                setAccessCode("");
                                setCodeOpen(false);
                            }
                            catch (err) {
                                haptic("error");
                                setCodeError(err instanceof Error ? err.message : "Не удалось активировать код");
                            }
                            finally {
                                setActivatingCode(false);
                            }
                        }, className: "px-4 pb-3.5 pt-1 border-t border-[var(--crm-border)] space-y-2", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: accessCode, onChange: (e) => setAccessCode(e.target.value), placeholder: "\u041A\u043E\u0434 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, vit-...)", className: "flex-1 min-w-0 rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40" }), _jsx("button", { type: "submit", disabled: activatingCode, className: "px-3.5 py-2 rounded-xl crm-accent-btn text-xs font-semibold shrink-0 disabled:opacity-60", children: activatingCode ? "Проверка..." : "Активировать" })] }), codeError && (_jsx("div", { className: "text-[11px] text-rose-600 dark:text-rose-400 font-medium", children: codeError }))] }))] })), _jsxs("div", { className: "grid grid-cols-2 gap-1.5 p-1 crm-surface rounded-2xl", children: [_jsxs("button", { type: "button", onClick: () => {
                            haptic("select");
                            setSection("unlocked");
                        }, className: `py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition ${section === "unlocked"
                            ? "crm-accent-btn shadow-xs"
                            : "crm-muted hover:text-[var(--crm-text)]"}`, children: [_jsx(Unlock, { className: "w-3.5 h-3.5" }), "\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 (", unlockedTenders.length, ")"] }), _jsxs("button", { type: "button", onClick: () => {
                            haptic("select");
                            setSection("favorites");
                        }, className: `py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition ${section === "favorites"
                            ? "crm-accent-btn shadow-xs"
                            : "crm-muted hover:text-[var(--crm-text)]"}`, children: [_jsx(Star, { className: "w-3.5 h-3.5" }), "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435 (", favoriteTenders.length, ")"] })] }), list.length === 0 ? (_jsxs("div", { className: "crm-surface rounded-2xl p-6 text-center space-y-1.5", children: [_jsx("p", { className: "text-sm font-medium", children: section === "unlocked"
                            ? "У вас пока нет открытых тендеров"
                            : "В избранном пока пусто" }), _jsx("p", { className: "text-xs crm-muted", children: section === "unlocked"
                            ? "Выберите интересный лот на Витрине и нажмите «Открыть тендер» — у вас есть бесплатные открытия."
                            : "Нажмите ⭐ на карточке любого тендера на Витрине, чтобы сохранить его здесь." })] })) : (_jsx("div", { className: "space-y-2.5", children: list.map((t) => (_jsx(TenderCard, { tender: t, storefrontMode: true, onOpen: (item) => onOpenTender(item.number), onToggleFavorite: onToggleFavorite }, t.number))) }))] }));
}
