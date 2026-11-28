import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, Coins, Copy, KeyRound, Pause, Play, Plus, RefreshCw, RotateCcw, Save, Shield, SlidersHorizontal, Trash2, Users, X, } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createAccessPassword, deleteAccessPassword, deleteCrmUser, fetchAccessOverview, toggleAccessPassword, updateCrmSettings, updateCrmUserCredits, updateCrmUserRole, } from "../lib/api.js?v=mx0305v6";
import { formatNskDateTime } from "../lib/format.js?v=mx0305v6";
import { haptic } from "../lib/telegram.js?v=mx0305v6";
function generateReadablePassword() {
    const num = Math.floor(1000 + Math.random() * 9000);
    const chars = "abcdefghjkmnpqrstuvwxyz";
    let tail = "";
    for (let i = 0; i < 4; i++) {
        tail += chars[Math.floor(Math.random() * chars.length)];
    }
    return `vit-${num}-${tail}`;
}
export function AdminAccessModal({ ownerTelegramId, onClose, onToast, onOwnerCreditsChanged, }) {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [passwords, setPasswords] = useState([]);
    const [defaultDaily, setDefaultDaily] = useState("2");
    const [savingSettings, setSavingSettings] = useState(false);
    // Локальные черновики полей для каждого пользователя по telegram_id
    const [dailyInputs, setDailyInputs] = useState({});
    const [manualInputs, setManualInputs] = useState({});
    const [busyUserId, setBusyUserId] = useState(null);
    const [label, setLabel] = useState("Доступ на Витрину");
    const [pwd, setPwd] = useState(() => generateReadablePassword());
    const [role, setRole] = useState("viewer");
    const [maxUses, setMaxUses] = useState("");
    const [creating, setCreating] = useState(false);
    const [lastCreated, setLastCreated] = useState(null);
    const [copiedCreated, setCopiedCreated] = useState(false);
    const syncUserInputs = useCallback((rows) => {
        const nextDaily = {};
        for (const u of rows) {
            nextDaily[u.telegram_id] = u.daily_credits !== null ? String(u.daily_credits) : "";
        }
        setDailyInputs(nextDaily);
    }, []);
    const loadOverview = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchAccessOverview();
            setUsers(res.users);
            setPasswords(res.passwords);
            setDefaultDaily(String(res.settings?.default_daily_credits ?? 2));
            syncUserInputs(res.users);
        }
        catch (err) {
            onToast(err instanceof Error ? err.message : "Ошибка загрузки настроек");
        }
        finally {
            setLoading(false);
        }
    }, [onToast, syncUserInputs]);
    useEffect(() => {
        void loadOverview();
    }, [loadOverview]);
    const applyUpdatedUser = (updated) => {
        setUsers((prev) => prev.map((x) => (x.telegram_id === updated.telegram_id ? updated : x)));
        setDailyInputs((prev) => ({
            ...prev,
            [updated.telegram_id]: updated.daily_credits !== null ? String(updated.daily_credits) : "",
        }));
        if (updated.telegram_id === ownerTelegramId) {
            onOwnerCreditsChanged?.(updated.open_credits, updated.effective_daily_credits);
        }
    };
    const handleSaveDefaultSettings = async (e) => {
        e.preventDefault();
        const parsed = Number(defaultDaily.trim());
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000) {
            onToast("Укажите число от 0 до 1000");
            return;
        }
        setSavingSettings(true);
        try {
            const res = await updateCrmSettings(Math.floor(parsed), true);
            haptic("success");
            setDefaultDaily(String(res.settings.default_daily_credits));
            onToast(`Лимит по умолчанию: ${res.settings.default_daily_credits} в сутки`);
            await loadOverview();
        }
        catch (err) {
            haptic("error");
            onToast(err instanceof Error ? err.message : "Ошибка сохранения настроек");
        }
        finally {
            setSavingSettings(false);
        }
    };
    const handleSaveUserDaily = async (u, rawValue) => {
        setBusyUserId(u.telegram_id);
        try {
            let nextDaily = null;
            if (rawValue !== null && rawValue.trim() !== "") {
                const parsed = Number(rawValue.trim());
                if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000) {
                    onToast("Суточный лимит должен быть от 0 до 1000");
                    return;
                }
                nextDaily = Math.floor(parsed);
            }
            const res = await updateCrmUserCredits({
                target_telegram_id: u.telegram_id,
                daily_credits: nextDaily,
            });
            haptic("success");
            applyUpdatedUser(res.user);
            onToast(nextDaily === null
                ? `Включён лимит по умолчанию (${res.user.effective_daily_credits}/сут.)`
                : `Суточный лимит: ${nextDaily} · сейчас 🔑 ${res.user.open_credits}`);
        }
        catch (err) {
            haptic("error");
            onToast(err instanceof Error ? err.message : "Не удалось обновить лимит");
        }
        finally {
            setBusyUserId(null);
        }
    };
    const handleAdjustCredits = async (u, mode, amount) => {
        if (!Number.isFinite(amount))
            return;
        setBusyUserId(u.telegram_id);
        try {
            const res = await updateCrmUserCredits(mode === "set"
                ? { target_telegram_id: u.telegram_id, set_credits: Math.floor(amount) }
                : { target_telegram_id: u.telegram_id, add_credits: Math.trunc(amount) });
            haptic("success");
            applyUpdatedUser(res.user);
            if (mode === "add") {
                setManualInputs((prev) => ({ ...prev, [u.telegram_id]: "" }));
            }
            onToast(`Баланс обновлён: 🔑 ${res.user.open_credits}`);
        }
        catch (err) {
            haptic("error");
            onToast(err instanceof Error ? err.message : "Ошибка изменения баланса");
        }
        finally {
            setBusyUserId(null);
        }
    };
    const handleCreate = async (e) => {
        e.preventDefault();
        if (pwd.trim().length < 4) {
            onToast("Пароль должен быть не короче 4 символов");
            return;
        }
        setCreating(true);
        try {
            const plain = pwd.trim();
            const res = await createAccessPassword({
                label: label.trim() || "Доступ на Витрину",
                password: plain,
                role,
                max_uses: maxUses.trim() ? Number(maxUses.trim()) : null,
            });
            haptic("success");
            setPasswords((prev) => [res.password_row, ...prev]);
            setLastCreated({ label: res.password_row.label, password: plain });
            setPwd(generateReadablePassword());
            setMaxUses("");
            onToast("Пароль создан");
        }
        catch (err) {
            haptic("error");
            onToast(err instanceof Error ? err.message : "Не удалось создать пароль");
        }
        finally {
            setCreating(false);
        }
    };
    const copyCreated = () => {
        if (!lastCreated)
            return;
        haptic("light");
        navigator.clipboard?.writeText(lastCreated.password);
        setCopiedCreated(true);
        setTimeout(() => setCopiedCreated(false), 1600);
    };
    const handleTogglePwd = async (item) => {
        try {
            await toggleAccessPassword(item.id, !item.is_active);
            haptic("select");
            setPasswords((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_active: !item.is_active } : p)));
        }
        catch (err) {
            onToast(err instanceof Error ? err.message : "Ошибка обновления пароля");
        }
    };
    const handleDeletePwd = async (id) => {
        try {
            await deleteAccessPassword(id);
            haptic("light");
            setPasswords((prev) => prev.filter((p) => p.id !== id));
            onToast("Пароль удалён");
        }
        catch (err) {
            onToast(err instanceof Error ? err.message : "Ошибка удаления");
        }
    };
    const handleRoleToggle = async (u) => {
        const nextRole = u.role === "viewer" ? "manager" : "viewer";
        try {
            await updateCrmUserRole(u.telegram_id, nextRole);
            haptic("select");
            setUsers((prev) => prev.map((x) => (x.telegram_id === u.telegram_id ? { ...x, role: nextRole } : x)));
            onToast(nextRole === "viewer"
                ? "Доступ: только Витрина (без CRM)"
                : "Доступ: CRM + Витрина (Менеджер)");
        }
        catch (err) {
            onToast(err instanceof Error ? err.message : "Ошибка смены доступа");
        }
    };
    const handleRemoveUser = async (targetId) => {
        try {
            await deleteCrmUser(targetId);
            haptic("light");
            setUsers((prev) => prev.filter((u) => u.telegram_id !== targetId));
            onToast("Пользователь удалён");
        }
        catch (err) {
            onToast(err instanceof Error ? err.message : "Ошибка удаления пользователя");
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4", onClick: onClose, children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "crm-surface w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3.5 border-b border-[var(--crm-border)] shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2 font-bold text-base", children: [_jsx(Shield, { className: "w-4 h-4 text-blue-500" }), "\u0414\u043E\u0441\u0442\u0443\u043F \u0438 \u043A\u0440\u0435\u0434\u0438\u0442\u044B \u0412\u0438\u0442\u0440\u0438\u043D\u044B"] }), _jsx("button", { type: "button", onClick: onClose, className: "p-1.5 rounded-full hover:bg-slate-500/12 crm-muted", "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "overflow-y-auto p-4 space-y-4", children: [_jsxs("form", { onSubmit: handleSaveDefaultSettings, className: "rounded-2xl bg-blue-500/8 border border-blue-500/20 p-3.5 space-y-2", children: [_jsxs("div", { className: "text-xs font-semibold flex items-center gap-1.5", children: [_jsx(SlidersHorizontal, { className: "w-3.5 h-3.5 text-blue-500" }), "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E (\u0432 \u0441\u0443\u0442\u043A\u0438)"] }), _jsx("p", { className: "text-[11px] crm-muted leading-snug", children: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0439 \u043F\u043E\u043B\u0443\u0447\u0430\u044E\u0442 \u043D\u043E\u0432\u044B\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438 \u0412\u0438\u0442\u0440\u0438\u043D\u044B (\u0438 \u0442\u0435, \u0443 \u043A\u043E\u0433\u043E \u043D\u0435 \u0437\u0430\u0434\u0430\u043D \u043B\u0438\u0447\u043D\u044B\u0439 \u043B\u0438\u043C\u0438\u0442). \u041E\u0431\u043D\u043E\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E \u0432 00:00 \u043F\u043E \u041D\u043E\u0432\u043E\u0441\u0438\u0431\u0438\u0440\u0441\u043A\u0443." }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", min: 0, max: 1000, value: defaultDaily, onChange: (e) => setDefaultDaily(e.target.value), className: "w-24 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40" }), _jsx("span", { className: "text-xs crm-muted flex-1", children: "\u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432 \u0432 \u0441\u0443\u0442\u043A\u0438" }), _jsxs("button", { type: "submit", disabled: savingSettings, className: "crm-accent-btn rounded-xl px-3 py-2 text-xs font-semibold inline-flex items-center gap-1 shrink-0 disabled:opacity-60", children: [_jsx(Save, { className: "w-3.5 h-3.5" }), savingSettings ? "..." : "Сохранить"] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "text-xs font-semibold crm-muted flex items-center gap-1.5", children: [_jsx(Users, { className: "w-3.5 h-3.5" }), "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438 (", users.length, ")"] }), loading ? (_jsx("p", { className: "text-xs crm-muted", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })) : (_jsx("div", { className: "space-y-2.5", children: users.map((u) => {
                                        const displayName = [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                                            (u.username ? `@${u.username}` : `ID ${u.telegram_id}`);
                                        const isSelfOwner = u.telegram_id === ownerTelegramId || u.role === "owner";
                                        const isBusy = busyUserId === u.telegram_id;
                                        const draftDaily = dailyInputs[u.telegram_id] ?? "";
                                        const draftManual = manualInputs[u.telegram_id] ?? "";
                                        const parsedManual = Number(draftManual.trim());
                                        return (_jsxs("div", { className: "rounded-2xl bg-slate-500/6 border border-[var(--crm-border)] p-3 text-xs space-y-2.5", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "font-semibold text-sm truncate", children: [displayName, " ", u.username && (_jsxs("span", { className: "crm-muted font-normal text-xs", children: ["@", u.username] }))] }), _jsxs("div", { className: "text-[11px] crm-muted font-mono", children: ["ID: ", u.telegram_id, u.last_seen_at
                                                                            ? ` · ${formatNskDateTime(u.last_seen_at, true)}`
                                                                            : ""] })] }), isSelfOwner ? (_jsx("span", { className: "px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 text-[10px] font-semibold shrink-0", children: "\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446 (CRM + \u0412\u0438\u0442\u0440\u0438\u043D\u0430)" })) : (_jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [_jsx("button", { type: "button", onClick: () => void handleRoleToggle(u), className: `px-2 py-1 rounded-lg text-[11px] font-semibold ${u.role === "manager"
                                                                        ? "bg-amber-500/18 text-amber-700 dark:text-amber-300"
                                                                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`, title: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F: \u0412\u0438\u0442\u0440\u0438\u043D\u0430 / CRM", children: u.role === "manager" ? "CRM + Витрина" : "Только Витрина" }), _jsx("button", { type: "button", onClick: () => void handleRemoveUser(u.telegram_id), className: "p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) })] }))] }), _jsxs("div", { className: "rounded-xl bg-[var(--crm-surface)] border border-[var(--crm-border)] p-2.5 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [_jsxs("span", { className: "inline-flex items-center gap-1 font-semibold", children: [_jsx(Coins, { className: "w-3.5 h-3.5 text-emerald-500" }), "\u0411\u0430\u043B\u0430\u043D\u0441 \u0441\u0435\u0439\u0447\u0430\u0441:", " ", _jsxs("span", { className: "text-emerald-600 dark:text-emerald-400", children: ["\uD83D\uDD11 ", u.open_credits] })] }), _jsxs("span", { className: "text-[11px] crm-muted", children: ["\u0412 \u0441\u0443\u0442\u043A\u0438:", " ", _jsx("b", { className: "text-[var(--crm-text)]", children: u.effective_daily_credits }), u.daily_credits === null ? " (по умолч.)" : " (личный)"] })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[11px] crm-muted shrink-0", children: "\u0412 \u0441\u0443\u0442\u043A\u0438:" }), _jsx("input", { type: "number", min: 0, max: 1000, value: draftDaily, onChange: (e) => setDailyInputs((prev) => ({
                                                                        ...prev,
                                                                        [u.telegram_id]: e.target.value,
                                                                    })), placeholder: String(defaultDaily || 2), className: "w-20 rounded-lg border border-[var(--crm-border)] bg-slate-500/5 px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/40" }), _jsx("button", { type: "button", disabled: isBusy, onClick: () => void handleSaveUserDaily(u, draftDaily), className: "px-2.5 py-1 rounded-lg crm-accent-btn text-[11px] font-semibold disabled:opacity-50", children: "\u0417\u0430\u0434\u0430\u0442\u044C" }), u.daily_credits !== null && (_jsx("button", { type: "button", disabled: isBusy, onClick: () => void handleSaveUserDaily(u, null), className: "p-1 rounded-lg bg-slate-500/12 crm-muted hover:text-[var(--crm-text)] disabled:opacity-50", title: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043D\u0430 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E", children: _jsx(RotateCcw, { className: "w-3.5 h-3.5" }) }))] }), _jsxs("div", { className: "flex items-center gap-1.5 flex-wrap", children: [_jsx("span", { className: "text-[11px] crm-muted shrink-0", children: "\u0412\u0440\u0443\u0447\u043D\u0443\u044E:" }), _jsx("button", { type: "button", disabled: isBusy, onClick: () => void handleAdjustCredits(u, "add", 1), className: "px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold disabled:opacity-50", children: "+1" }), _jsx("button", { type: "button", disabled: isBusy, onClick: () => void handleAdjustCredits(u, "add", 5), className: "px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold disabled:opacity-50", children: "+5" }), _jsx("button", { type: "button", disabled: isBusy || u.open_credits <= 0, onClick: () => void handleAdjustCredits(u, "add", -1), className: "px-2 py-1 rounded-lg bg-slate-500/12 font-semibold disabled:opacity-40", children: "-1" }), _jsx("input", { type: "number", min: 0, max: 10000, value: draftManual, onChange: (e) => setManualInputs((prev) => ({
                                                                        ...prev,
                                                                        [u.telegram_id]: e.target.value,
                                                                    })), placeholder: "\u043A\u043E\u043B-\u0432\u043E", className: "w-16 rounded-lg border border-[var(--crm-border)] bg-slate-500/5 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40" }), _jsx("button", { type: "button", disabled: isBusy || !draftManual.trim() || !Number.isFinite(parsedManual), onClick: () => void handleAdjustCredits(u, "add", parsedManual), className: "px-2 py-1 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold disabled:opacity-40", title: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043A \u0442\u0435\u043A\u0443\u0449\u0435\u043C\u0443 \u0431\u0430\u043B\u0430\u043D\u0441\u0443", children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C" }), _jsx("button", { type: "button", disabled: isBusy || !draftManual.trim() || !Number.isFinite(parsedManual), onClick: () => void handleAdjustCredits(u, "set", parsedManual), className: "px-2 py-1 rounded-lg bg-slate-500/12 font-medium disabled:opacity-40", title: "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0442\u043E\u0447\u043D\u044B\u0439 \u0431\u0430\u043B\u0430\u043D\u0441 \u043F\u0440\u044F\u043C\u043E \u0441\u0435\u0439\u0447\u0430\u0441", children: "= \u0417\u0430\u0434\u0430\u0442\u044C" })] })] })] }, u.telegram_id));
                                    }) }))] }), _jsxs("form", { onSubmit: handleCreate, className: "rounded-2xl bg-slate-500/6 p-3.5 space-y-2.5", children: [_jsxs("div", { className: "text-xs font-semibold flex items-center gap-1.5", children: [_jsx(KeyRound, { className: "w-3.5 h-3.5 text-blue-500" }), "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C \u0434\u043B\u044F \u0432\u0445\u043E\u0434\u0430"] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", children: [_jsx("input", { type: "text", value: label, onChange: (e) => setLabel(e.target.value), placeholder: "\u041A\u043E\u043C\u0443 (\u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u041F\u0430\u0440\u0442\u043D\u0451\u0440)", className: "rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40" }), _jsxs("select", { value: role, onChange: (e) => setRole(e.target.value === "manager" ? "manager" : "viewer"), className: "rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40", children: [_jsx("option", { value: "viewer", children: "\u0422\u043E\u043B\u044C\u043A\u043E \u0412\u0438\u0442\u0440\u0438\u043D\u0430 (\u0431\u0435\u0437 CRM)" }), _jsx("option", { value: "manager", children: "\u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 (CRM + \u0412\u0438\u0442\u0440\u0438\u043D\u0430)" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: pwd, onChange: (e) => setPwd(e.target.value), placeholder: "\u041F\u0430\u0440\u043E\u043B\u044C", className: "flex-1 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40" }), _jsx("button", { type: "button", onClick: () => setPwd(generateReadablePassword()), className: "px-2.5 py-2 rounded-xl bg-slate-500/12 text-xs font-medium shrink-0", title: "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043D\u043E\u0432\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C", children: _jsx(RefreshCw, { className: "w-3.5 h-3.5" }) }), _jsx("input", { type: "number", min: 1, value: maxUses, onChange: (e) => setMaxUses(e.target.value), placeholder: "\u041B\u0438\u043C\u0438\u0442", title: "\u041D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E: \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u043A \u043C\u043E\u0433\u0443\u0442 \u0432\u043E\u0439\u0442\u0438 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u043F\u0430\u0440\u043E\u043B\u044E", className: "w-20 rounded-xl border border-[var(--crm-border)] bg-[var(--crm-surface)] px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40" })] }), _jsxs("button", { type: "submit", disabled: creating, className: "w-full crm-accent-btn rounded-xl py-2 px-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), creating ? "Создание..." : "Создать пароль"] }), lastCreated && (_jsxs("div", { className: "rounded-xl bg-emerald-500/12 border border-emerald-500/30 p-2.5 text-xs space-y-1", children: [_jsxs("div", { className: "text-emerald-700 dark:text-emerald-300 font-semibold", children: ["\u041F\u0430\u0440\u043E\u043B\u044C \u0441\u043E\u0437\u0434\u0430\u043D (\u00AB", lastCreated.label, "\u00BB) \u2014 \u043F\u0435\u0440\u0435\u0434\u0430\u0439\u0442\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044E:"] }), _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("code", { className: "font-mono text-sm font-bold", children: lastCreated.password }), _jsxs("button", { type: "button", onClick: copyCreated, className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium", children: [copiedCreated ? _jsx(Check, { className: "w-3 h-3" }) : _jsx(Copy, { className: "w-3 h-3" }), copiedCreated ? "Скопировано" : "Копировать"] })] })] }))] }), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-xs font-semibold crm-muted flex items-center justify-between", children: _jsxs("span", { children: ["\u0412\u044B\u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0430\u0440\u043E\u043B\u0438 (", passwords.length, ")"] }) }), passwords.length === 0 ? (_jsx("p", { className: "text-xs crm-muted", children: "\u041F\u043E\u043A\u0430 \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u043E \u043D\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u043F\u0430\u0440\u043E\u043B\u044F." })) : (_jsx("div", { className: "space-y-1.5", children: passwords.map((p) => (_jsxs("div", { className: "rounded-xl bg-slate-500/6 px-3 py-2 text-xs flex items-center justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-1.5 font-medium", children: [_jsx("span", { className: "truncate", children: p.label }), _jsx("span", { className: `px-1.5 py-0.2 rounded text-[10px] ${p.is_active
                                                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                                                    : "bg-slate-500/15 crm-muted"}`, children: p.is_active ? "Активен" : "Пауза" })] }), _jsxs("div", { className: "text-[11px] crm-muted", children: ["\u0414\u043E\u0441\u0442\u0443\u043F: ", p.role === "manager" ? "CRM + Витрина" : "Только Витрина", " \u00B7 \u0412\u0445\u043E\u0434\u043E\u0432:", " ", p.used_count, p.max_uses ? ` / ${p.max_uses}` : ""] })] }), _jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [_jsx("button", { type: "button", onClick: () => void handleTogglePwd(p), className: "p-1.5 rounded-lg bg-slate-500/10 hover:bg-slate-500/20", title: p.is_active ? "Приостановить" : "Активировать", children: p.is_active ? (_jsx(Pause, { className: "w-3.5 h-3.5" })) : (_jsx(Play, { className: "w-3.5 h-3.5" })) }), _jsx("button", { type: "button", onClick: () => void handleDeletePwd(p.id), className: "p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400", title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) })] })] }, p.id))) }))] })] })] }) }));
}
