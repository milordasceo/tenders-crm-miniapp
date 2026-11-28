import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Building2, CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { haptic } from "../lib/telegram.js?v=mx0305v6";
const DEFAULT_PROFILE = {
    entity_type: "ip",
    full_name: "",
    short_name: "",
    director_name: "",
    director_position: "",
    basis: "Лист записи ЕГРИП",
    inn: "",
    kpp: "",
    ogrn: "",
    legal_address: "",
    postal_address: "",
    bank_name: "",
    bik: "",
    raschet_account: "",
    korr_account: "",
    phone: "",
    email: "",
    is_smp: true,
};
export function CompanyProfileModal({ open, initialProfile, saving = false, autoContinueDocGen = false, onClose, onSave, }) {
    const [form, setForm] = useState(DEFAULT_PROFILE);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!open)
            return;
        const entity = initialProfile?.entity_type === "ooo" ? "ooo" : "ip";
        setForm({
            ...DEFAULT_PROFILE,
            ...initialProfile,
            entity_type: entity,
            basis: initialProfile?.basis ||
                (entity === "ooo" ? "Устав" : "Лист записи ЕГРИП"),
            director_position: initialProfile?.director_position ||
                (entity === "ooo" ? "Генеральный директор" : "Индивидуальный предприниматель"),
            is_smp: initialProfile?.is_smp ?? true,
        });
        setError(null);
    }, [open, initialProfile]);
    if (!open)
        return null;
    const isOoo = form.entity_type === "ooo";
    const setField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };
    const switchEntityType = (nextType) => {
        haptic("light");
        setForm((prev) => ({
            ...prev,
            entity_type: nextType,
            basis: !prev.basis ||
                prev.basis === "Устав" ||
                prev.basis === "Лист записи ЕГРИП"
                ? nextType === "ooo"
                    ? "Устав"
                    : "Лист записи ЕГРИП"
                : prev.basis,
            director_position: !prev.director_position ||
                prev.director_position === "Генеральный директор" ||
                prev.director_position === "Индивидуальный предприниматель"
                ? nextType === "ooo"
                    ? "Генеральный директор"
                    : "Индивидуальный предприниматель"
                : prev.director_position,
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleanFullName = (form.full_name || "").trim();
        const cleanInn = (form.inn || "").trim();
        if (!cleanFullName) {
            setError("Укажите полное наименование компании или ФИО ИП.");
            return;
        }
        if (!cleanInn || !/^\d{10,12}$/.test(cleanInn)) {
            setError("Укажите корректный ИНН (10 цифр для ООО или 12 цифр для ИП).");
            return;
        }
        setError(null);
        haptic("light");
        try {
            await onSave({
                ...form,
                full_name: cleanFullName,
                short_name: (form.short_name || "").trim() || cleanFullName,
                inn: cleanInn,
                kpp: isOoo ? (form.kpp || "").trim() : "",
                ogrn: (form.ogrn || "").trim(),
                director_name: (form.director_name || "").trim(),
                director_position: (form.director_position || "").trim(),
                basis: (form.basis || "").trim(),
                legal_address: (form.legal_address || "").trim(),
                postal_address: (form.postal_address || "").trim(),
                bank_name: (form.bank_name || "").trim(),
                bik: (form.bik || "").trim(),
                raschet_account: (form.raschet_account || "").trim(),
                korr_account: (form.korr_account || "").trim(),
                phone: (form.phone || "").trim(),
                email: (form.email || "").trim(),
            });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось сохранить реквизиты.");
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs", onClick: onClose, children: _jsxs("div", { className: "w-full max-w-lg max-h-[90vh] flex flex-col crm-surface rounded-t-3xl sm:rounded-3xl border border-[var(--crm-border)] shadow-2xl overflow-hidden", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "px-4 py-3.5 border-b border-[var(--crm-border)] flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [_jsx("div", { className: "w-9 h-9 rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0", children: _jsx(Building2, { className: "w-4.5 h-4.5" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-sm font-bold truncate", children: "\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B \u0434\u043B\u044F \u043F\u043E\u0434\u0430\u0447\u0438 \u0437\u0430\u044F\u0432\u043E\u043A" }), _jsx("div", { className: "text-[11px] crm-muted truncate", children: "\u0421\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u043E\u0434\u0438\u043D \u0440\u0430\u0437 \u0434\u043B\u044F \u0432\u0441\u0435\u0445 4 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432 .docx" })] })] }), _jsx("button", { type: "button", onClick: onClose, className: "w-8 h-8 rounded-full bg-slate-500/10 hover:bg-slate-500/20 flex items-center justify-center crm-muted shrink-0", "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5", children: [autoContinueDocGen && (_jsx("div", { className: "rounded-xl bg-sky-500/12 border border-sky-500/25 px-3 py-2 text-xs text-sky-800 dark:text-sky-200 leading-relaxed", children: "\u0427\u0442\u043E\u0431\u044B \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0437\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u044C 4 \u0444\u0430\u0439\u043B\u0430 .docx \u0434\u043B\u044F \u043F\u043E\u0434\u0430\u0447\u0438 \u0437\u0430\u044F\u0432\u043A\u0438, \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B \u043E\u0434\u0438\u043D \u0440\u0430\u0437. \u041F\u043E\u0441\u043B\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u043F\u0430\u043A\u0435\u0442 \u0441\u0444\u043E\u0440\u043C\u0438\u0440\u0443\u0435\u0442\u0441\u044F \u0441\u0430\u043C." })), _jsxs("div", { className: "grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-500/10 border border-[var(--crm-border)]", children: [_jsx("button", { type: "button", onClick: () => switchEntityType("ip"), className: `py-2 rounded-lg text-xs font-semibold transition ${!isOoo
                                        ? "bg-sky-500 text-white shadow"
                                        : "crm-muted hover:text-[var(--crm-text)]"}`, children: "\u0418\u041F" }), _jsx("button", { type: "button", onClick: () => switchEntityType("ooo"), className: `py-2 rounded-lg text-xs font-semibold transition ${isOoo
                                        ? "bg-sky-500 text-white shadow"
                                        : "crm-muted hover:text-[var(--crm-text)]"}`, children: "\u041E\u041E\u041E / \u042E\u0440\u043B\u0438\u0446\u043E" })] }), _jsxs("div", { className: "space-y-2.5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: isOoo ? "Полное наименование ООО *" : "Полное наименование ИП *" }), _jsx("input", { type: "text", value: form.full_name || "", onChange: (e) => setField("full_name", e.target.value), placeholder: isOoo
                                                ? "ООО «СибирьПоставка»"
                                                : "ИП Иванов Иван Иванович", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm focus:outline-none focus:border-sky-400", required: true })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2.5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u0418\u041D\u041D *" }), _jsx("input", { type: "text", inputMode: "numeric", value: form.inn || "", onChange: (e) => setField("inn", e.target.value.replace(/[^\d]/g, "")), placeholder: isOoo ? "5401234567" : "540123456789", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-sky-400", required: true })] }), isOoo ? (_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u041A\u041F\u041F" }), _jsx("input", { type: "text", inputMode: "numeric", value: form.kpp || "", onChange: (e) => setField("kpp", e.target.value.replace(/[^\d]/g, "")), placeholder: "540101001", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-sky-400" })] })) : (_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u041E\u0413\u0420\u041D\u0418\u041F" }), _jsx("input", { type: "text", inputMode: "numeric", value: form.ogrn || "", onChange: (e) => setField("ogrn", e.target.value.replace(/[^\d]/g, "")), placeholder: "321547600012345", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-sky-400" })] }))] }), isOoo && (_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u041E\u0413\u0420\u041D" }), _jsx("input", { type: "text", inputMode: "numeric", value: form.ogrn || "", onChange: (e) => setField("ogrn", e.target.value.replace(/[^\d]/g, "")), placeholder: "1215400012345", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-sky-400" })] })), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: isOoo ? "ФИО руководителя" : "ФИО подписанта" }), _jsx("input", { type: "text", value: form.director_name || "", onChange: (e) => setField("director_name", e.target.value), placeholder: "\u0418\u0432\u0430\u043D\u043E\u0432 \u0418\u0432\u0430\u043D \u0418\u0432\u0430\u043D\u043E\u0432\u0438\u0447", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm focus:outline-none focus:border-sky-400" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u0414\u043E\u043B\u0436\u043D\u043E\u0441\u0442\u044C / \u0441\u0442\u0430\u0442\u0443\u0441" }), _jsx("input", { type: "text", value: form.director_position || "", onChange: (e) => setField("director_position", e.target.value), placeholder: isOoo
                                                        ? "Генеральный директор"
                                                        : "Индивидуальный предприниматель", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm focus:outline-none focus:border-sky-400" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0438" }), _jsx("input", { type: "text", value: form.basis || "", onChange: (e) => setField("basis", e.target.value), placeholder: isOoo ? "Устав" : "Лист записи ЕГРИП", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm focus:outline-none focus:border-sky-400" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u042E\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043A\u0438\u0439 / \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441" }), _jsx("input", { type: "text", value: form.legal_address || "", onChange: (e) => setField("legal_address", e.target.value), placeholder: "630000, \u0433. \u041D\u043E\u0432\u043E\u0441\u0438\u0431\u0438\u0440\u0441\u043A, \u0443\u043B. ...", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm focus:outline-none focus:border-sky-400" })] }), _jsxs("div", { className: "pt-1 border-t border-[var(--crm-border)]", children: [_jsx("div", { className: "text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300 mb-2", children: "\u0411\u0430\u043D\u043A\u043E\u0432\u0441\u043A\u0438\u0435 \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B \u0438 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B" }), _jsxs("div", { className: "space-y-2.5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u041D\u0430\u0438\u043C\u0435\u043D\u043E\u0432\u0430\u043D\u0438\u0435 \u0431\u0430\u043D\u043A\u0430" }), _jsx("input", { type: "text", value: form.bank_name || "", onChange: (e) => setField("bank_name", e.target.value), placeholder: "\u0410\u041E \u00AB\u0422\u0438\u043D\u044C\u043A\u043E\u0444\u0444 \u0411\u0430\u043D\u043A\u00BB / \u041F\u0410\u041E \u0421\u0431\u0435\u0440\u0431\u0430\u043D\u043A", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm focus:outline-none focus:border-sky-400" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2.5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u0411\u0418\u041A" }), _jsx("input", { type: "text", inputMode: "numeric", value: form.bik || "", onChange: (e) => setField("bik", e.target.value.replace(/[^\d]/g, "")), placeholder: "044525974", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-sky-400" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D" }), _jsx("input", { type: "tel", value: form.phone || "", onChange: (e) => setField("phone", e.target.value), placeholder: "+7 913 000-00-00", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm focus:outline-none focus:border-sky-400" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u0420\u0430\u0441\u0447\u0451\u0442\u043D\u044B\u0439 \u0441\u0447\u0451\u0442 (\u0440/\u0441)" }), _jsx("input", { type: "text", inputMode: "numeric", value: form.raschet_account || "", onChange: (e) => setField("raschet_account", e.target.value.replace(/[^\d]/g, "")), placeholder: "40802810000000000000", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-sky-400" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "\u041A\u043E\u0440\u0440. \u0441\u0447\u0451\u0442 (\u043A/\u0441)" }), _jsx("input", { type: "text", inputMode: "numeric", value: form.korr_account || "", onChange: (e) => setField("korr_account", e.target.value.replace(/[^\d]/g, "")), placeholder: "30101810145250000974", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-sky-400" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-[11px] crm-muted mb-1", children: "Email \u0434\u043B\u044F \u043A\u043E\u043D\u0442\u0440\u0430\u043A\u0442\u043E\u0432" }), _jsx("input", { type: "email", value: form.email || "", onChange: (e) => setField("email", e.target.value), placeholder: "tender@company.ru", className: "w-full rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-sm focus:outline-none focus:border-sky-400" })] })] })] })] }), _jsxs("label", { className: "flex items-start gap-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/25 p-2.5 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: form.is_smp ?? true, onChange: (e) => setField("is_smp", e.target.checked), className: "mt-0.5 rounded border-[var(--crm-border)] accent-emerald-500" }), _jsxs("span", { className: "text-xs leading-snug", children: [_jsx("span", { className: "font-semibold text-emerald-700 dark:text-emerald-300", children: "\u0421\u0443\u0431\u044A\u0435\u043A\u0442 \u043C\u0430\u043B\u043E\u0433\u043E \u043F\u0440\u0435\u0434\u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430 (\u0421\u041C\u041F)" }), _jsx("span", { className: "block text-[11px] crm-muted", children: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u0421\u041C\u041F \u0432 \u0414\u0435\u043A\u043B\u0430\u0440\u0430\u0446\u0438\u044E (\u0441\u0442. 30, 31 44-\u0424\u0417)" })] })] })] }), _jsxs("div", { className: "flex items-start gap-2 text-[11px] crm-muted bg-slate-500/8 rounded-xl p-2.5", children: [_jsx(ShieldCheck, { className: "w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" }), _jsx("span", { children: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u0432\u0430\u0448\u0435\u043C \u043F\u0440\u043E\u0444\u0438\u043B\u0435 CRM \u0438 \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0432 \u0437\u0430\u044F\u0432\u043A\u0438 \u043F\u043E \u043D\u0430\u0436\u0430\u0442\u0438\u044E \u043A\u043D\u043E\u043F\u043A\u0438." })] }), error && (_jsx("div", { className: "rounded-xl bg-rose-500/15 border border-rose-500/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-200", children: error })), _jsx("div", { className: "pt-1 pb-1", children: _jsx("button", { type: "submit", disabled: saving, className: "w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20", children: saving ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), _jsx("span", { children: "\u0421\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u043C..." })] })) : (_jsxs(_Fragment, { children: [_jsx(CheckCircle2, { className: "w-4 h-4" }), _jsx("span", { children: autoContinueDocGen
                                                ? "Сохранить и сформировать документы"
                                                : "Сохранить реквизиты" })] })) }) })] })] }) }));
}
