import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Check, Copy, Eye, EyeOff, KeyRound, LockKeyhole, LogIn, RefreshCw, ShieldAlert, Sparkles, } from "lucide-react";
import { useState } from "react";
import { CrmApiError, registerWithPassword } from "../lib/api.js?v=mwq061ef";
import { haptic } from "../lib/telegram.js?v=mwq061ef";
export function AuthGateScreen({ error, onRetry }) {
    const [copied, setCopied] = useState(false);
    const [telegramIdInput, setTelegramIdInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const isRegistrationGate = Boolean(error.telegram_id) &&
        (error.status === 403 || error.code === "REGISTRATION_REQUIRED");
    const copyId = () => {
        if (!error.telegram_id)
            return;
        haptic("light");
        navigator.clipboard?.writeText(String(error.telegram_id));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    const fillMyId = () => {
        if (!error.telegram_id)
            return;
        haptic("select");
        setTelegramIdInput(String(error.telegram_id));
        setSubmitError(null);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!telegramIdInput.trim()) {
            setSubmitError("Укажите ваш Telegram ID (можно нажать «Вставить мой ID»).");
            return;
        }
        if (!passwordInput.trim()) {
            setSubmitError("Введите пароль доступа.");
            return;
        }
        setSubmitting(true);
        setSubmitError(null);
        try {
            await registerWithPassword(telegramIdInput, passwordInput);
            haptic("success");
            onRetry();
        }
        catch (err) {
            haptic("error");
            if (err instanceof CrmApiError) {
                setSubmitError(err.info.error);
            }
            else {
                setSubmitError(err instanceof Error ? err.message : "Не удалось выполнить вход.");
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-4", children: _jsxs("div", { className: "crm-surface rounded-3xl p-6 max-w-md w-full space-y-4 shadow-sm", children: [_jsxs("div", { className: "text-center space-y-2", children: [_jsx("div", { className: "w-12 h-12 rounded-2xl bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto", children: isRegistrationGate ? (_jsx(KeyRound, { className: "w-6 h-6" })) : error.status === 403 ? (_jsx(ShieldAlert, { className: "w-6 h-6" })) : (_jsx(LockKeyhole, { className: "w-6 h-6" })) }), _jsx("h1", { className: "text-lg font-bold", children: isRegistrationGate ? "Вход на Витрину ТендерМэн" : "Витрина ТендерМэн" }), _jsx("p", { className: "text-xs crm-muted leading-relaxed", children: isRegistrationGate
                                ? "При первом входе укажите ваш Telegram ID и пароль от администратора. После входа откроется доступ к Витрине готовых тендеров."
                                : error.error })] }), isRegistrationGate && error.telegram_id ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "rounded-2xl bg-slate-500/8 p-3 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 text-xs", children: [_jsx("span", { className: "crm-muted", children: "\u0412\u0430\u0448 Telegram ID:" }), _jsxs("button", { type: "button", onClick: copyId, className: "inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium", children: [copied ? _jsx(Check, { className: "w-3.5 h-3.5" }) : _jsx(Copy, { className: "w-3.5 h-3.5" }), copied ? "Скопировано" : "Копировать"] })] }), _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("code", { className: "text-base font-bold font-mono", children: error.telegram_id }), _jsxs("button", { type: "button", onClick: fillMyId, className: "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl crm-accent-btn text-xs font-semibold shrink-0", children: [_jsx(Sparkles, { className: "w-3.5 h-3.5" }), "\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043C\u043E\u0439 ID"] })] })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-3", children: [_jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-medium crm-muted block", children: "Telegram ID" }), _jsx("input", { type: "text", inputMode: "numeric", value: telegramIdInput, onChange: (e) => {
                                                setTelegramIdInput(e.target.value);
                                                setSubmitError(null);
                                            }, placeholder: String(error.telegram_id), className: "w-full rounded-xl border border-[var(--crm-border)] bg-slate-500/5 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("label", { className: "text-xs font-medium crm-muted block", children: "\u041F\u0430\u0440\u043E\u043B\u044C \u0434\u043E\u0441\u0442\u0443\u043F\u0430" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPassword ? "text" : "password", value: passwordInput, onChange: (e) => {
                                                        setPasswordInput(e.target.value);
                                                        setSubmitError(null);
                                                    }, placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u0430\u0440\u043E\u043B\u044C...", autoComplete: "current-password", className: "w-full rounded-xl border border-[var(--crm-border)] bg-slate-500/5 pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" }), _jsx("button", { type: "button", onClick: () => setShowPassword((v) => !v), "aria-label": showPassword ? "Скрыть пароль" : "Показать пароль", className: "absolute right-2.5 top-1/2 -translate-y-1/2 crm-muted p-1", children: showPassword ? _jsx(EyeOff, { className: "w-4 h-4" }) : _jsx(Eye, { className: "w-4 h-4" }) })] })] }), submitError && (_jsx("div", { className: "rounded-xl bg-rose-500/12 border border-rose-500/25 px-3 py-2 text-xs text-rose-700 dark:text-rose-300", children: submitError })), _jsxs("button", { type: "submit", disabled: submitting, className: "w-full crm-accent-btn rounded-xl py-2.5 px-4 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60", children: [_jsx(LogIn, { className: "w-4 h-4" }), submitting ? "Проверка..." : "Войти на Витрину"] })] })] })) : (_jsxs(_Fragment, { children: [error.status === 401 && (_jsxs("div", { className: "rounded-2xl bg-slate-500/8 p-3.5 text-left text-xs crm-muted space-y-1", children: [_jsx("div", { className: "font-semibold text-[var(--crm-text)]", children: "\u041A\u0430\u043A \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0412\u0438\u0442\u0440\u0438\u043D\u0443:" }), _jsxs("p", { children: ["\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0431\u043E\u0442\u0430 ", _jsx("b", { children: "@tenderman_ru_bot" }), " \u0432 Telegram \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443", " ", _jsx("b", { children: "\u00AB\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432\u0438\u0442\u0440\u0438\u043D\u0443 \u0442\u0435\u043D\u0434\u0435\u0440\u043E\u0432\u00BB" }), " (\u0438\u043B\u0438 \u043C\u0435\u043D\u044E \u0441\u043B\u0435\u0432\u0430 \u043E\u0442 \u043F\u043E\u043B\u044F \u0432\u0432\u043E\u0434\u0430). \u0412 \u043E\u0431\u044B\u0447\u043D\u043E\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 Telegram \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u044E\u0442\u0441\u044F."] })] })), _jsxs("button", { type: "button", onClick: onRetry, className: "w-full crm-accent-btn rounded-xl py-2.5 px-4 text-sm font-semibold inline-flex items-center justify-center gap-2", children: [_jsx(RefreshCw, { className: "w-4 h-4" }), "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C \u0432\u0445\u043E\u0434"] })] }))] }) }));
}
