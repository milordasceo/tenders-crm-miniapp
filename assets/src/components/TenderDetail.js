import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AlertTriangle, ArrowLeft, Bell, Building2, Check, CheckCircle2, ChevronDown, ChevronUp, Clock, Copy, Download, Edit3, ExternalLink, FileText, FolderOpen, History, KeyRound, Loader2, Lock, Mail, MapPin, Package, Phone, Save, Share2, Shield, ShoppingCart, Sparkles, Star, Unlock, } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { calcPreliminaryEstimate, cleanContactEmail, cleanContactPhone, cleanPickupAddress, extractSupplierGroups, formatMarginPct, formatNskDateTime, formatRub, getDeadlineInfo, getOfferNationalRegimeBadge, getProfitThresholdRub, getTenderLawAndType, getTenderRestrictionInfo, isTenderAllPublicOffer, isTrustedPublicOffer, resolveSellerConfirmationState, sanitizeTel, } from "../lib/format.js?v=mx0305v6";
import { resolvePipelineView, stageProof } from "../lib/pipeline.js?v=mx0305v6";
import { bindBackButton, getWebApp, haptic, openExternal, openTelegramLink } from "../lib/telegram.js?v=mx0305v6";
function cleanLegacyText(txt) {
    return txt
        .replace(/\s*через\s+gmail\s*cli\b/gi, "")
        .replace(/\s*в\s+gmail\s*\([^)]+\)/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}
function downloadBase64Docx(filename, base64) {
    const binStr = atob(base64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function buildSellerConversation(r) {
    if (Array.isArray(r.сообщения) && r.сообщения.length > 0) {
        return r.сообщения.filter((m) => Boolean(m?.текст?.trim()));
    }
    const journal = Array.isArray(r.журнал) ? r.журнал : [];
    const items = [];
    let remNum = 0;
    for (const rawEntry of journal) {
        const entry = (typeof rawEntry === "string"
            ? rawEntry
            : rawEntry && typeof rawEntry === "object"
                ? [
                    rawEntry.в,
                    rawEntry.событие,
                    rawEntry.текст,
                ]
                    .filter((v) => typeof v === "string" && v)
                    .join(" ")
                : String(rawEntry || "")).trim();
        if (!entry)
            continue;
        if (/^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+(?:email\s+\S+@|публичная оферта|график работы)/i.test(entry)) {
            continue;
        }
        const mDt = entry.match(/^(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})\s+(.*)$/);
        const dtLabel = mDt ? mDt[1] : null;
        const body = mDt ? mDt[2].trim() : entry;
        const low = body.toLowerCase();
        if (low.startsWith("напоминание")) {
            remNum += 1;
            items.push({
                направление: "reminder",
                дата: dtLabel,
                текст: "Повторное напоминание по нашему запросу",
                номер_напоминания: remNum,
            });
            continue;
        }
        if (/^отправлено(?:\s*[—–-]\s*)?$/i.test(body)) {
            items.push({
                направление: "outbound",
                дата: dtLabel,
                текст: "Отправлен запрос наличия, актуальной цены и условий поставки.",
            });
            continue;
        }
        if (low.startsWith("ответил")) {
            const cleaned = cleanLegacyText(body.replace(/^ответил\s*(?:[—–-]\s*)?/i, ""));
            const isOurClarification = /^(отправлено уточнение|продублировано уточнение|отправлен ответ)/i.test(cleaned);
            items.push({
                направление: isOurClarification ? "outbound" : "inbound",
                дата: dtLabel,
                текст: cleaned || "Получен ответ от продавца.",
            });
            continue;
        }
        if (low.startsWith("отправлено")) {
            const cleaned = cleanLegacyText(body.replace(/^отправлено\s*(?:[—–-]\s*)?/i, ""));
            items.push({
                направление: "outbound",
                дата: dtLabel,
                текст: cleaned || "Отправлено письмо продавцу.",
            });
        }
    }
    return items;
}
export function TenderDetail({ tender, events, saving, readOnly, storefrontMode = false, openCredits = 2, unlocking = false, onUnlockTender, onOpenTopUpModal, onToggleFavorite, onSaveUserNotes, onToast, companyProfile, generatingDocs = false, generatedDocsResult, onOpenCompanyProfile, onGenerateDocs, onBack, onSaveOwner, }) {
    const [userNotes, setUserNotes] = useState(tender.user_notes || "");
    const [copiedKey, setCopiedKey] = useState(null);
    const [openThreads, setOpenThreads] = useState({});
    const [specsCheatOpen, setSpecsCheatOpen] = useState(false);
    const [openSpecCmpKey, setOpenSpecCmpKey] = useState(null);
    const [openOfferChatKey, setOpenOfferChatKey] = useState(null);
    const calc = tender.details?.calculation;
    const calcVariants = calc?.variants || {};
    const supplierGroups = useMemo(() => extractSupplierGroups(tender), [tender]);
    const availableVariants = useMemo(() => {
        const keys = new Set();
        for (const k of Object.keys(calcVariants)) {
            if (k.trim())
                keys.add(k.trim().toUpperCase());
        }
        for (const g of supplierGroups) {
            for (const o of g.offers) {
                const v = (o.variant || "").trim().toUpperCase();
                if (v && v !== "—")
                    keys.add(v);
            }
        }
        if (keys.size === 0)
            keys.add("А");
        const order = ["А", "Б", "В", "Г", "A", "B"];
        const sorted = Array.from(keys).sort((a, b) => {
            const ia = order.indexOf(a);
            const ib = order.indexOf(b);
            if (ia !== -1 && ib !== -1)
                return ia - ib;
            if (ia !== -1)
                return -1;
            if (ib !== -1)
                return 1;
            return a.localeCompare(b, "ru");
        });
        // На клиентской Витрине не показываем отказной/архивный Вариант А, если лот переключён на Вариант Б
        if (storefrontMode) {
            const msSellers = tender.details?.mail_state?.продавцы || [];
            const hasArchivedA = msSellers.some((s) => String(s.роль || "") === "архив_а");
            const best = (tender.best_variant || "").trim().toUpperCase();
            if (hasArchivedA && best && sorted.includes(best)) {
                return [best];
            }
        }
        return sorted;
    }, [calcVariants, supplierGroups, storefrontMode, tender.details?.mail_state, tender.best_variant]);
    const defaultVariant = useMemo(() => {
        const best = (tender.best_variant || "").trim().toUpperCase();
        if (best && availableVariants.includes(best))
            return best;
        return availableVariants[0] || "А";
    }, [availableVariants, tender.best_variant]);
    const [selectedVariant, setSelectedVariant] = useState(defaultVariant);
    useEffect(() => {
        setUserNotes(tender.user_notes || "");
        setOpenThreads({});
        setSelectedVariant(defaultVariant);
    }, [tender.number, tender.user_notes, defaultVariant]);
    useEffect(() => bindBackButton(true, onBack), [onBack]);
    const copyValue = (key, val, toastMsg) => {
        haptic("light");
        navigator.clipboard?.writeText(val);
        setCopiedKey(key);
        if (toastMsg)
            onToast?.(toastMsg);
        setTimeout(() => setCopiedKey(null), 1600);
    };
    const dl = getDeadlineInfo(tender.deadline_at);
    const isExpiredInActive = ["blanks", "prices", "inquiry", "calc", "review", "tenders"].includes(tender.stage) &&
        dl.tone === "expired";
    const pv = !storefrontMode ? resolvePipelineView(tender) : null;
    const marginPct = formatMarginPct(tender);
    const customer = tender.details?.customer;
    const terms = tender.details?.terms;
    const conditions = tender.details?.conditions;
    const restr = getTenderRestrictionInfo(tender);
    const items = tender.details?.items || [];
    const bestCalc = (tender.best_variant && calcVariants[tender.best_variant]) ||
        Object.values(calcVariants)[0] ||
        null;
    const activeCalc = calcVariants[selectedVariant] || bestCalc || null;
    const mailState = tender.details?.mail_state;
    const inquirySuppliers = tender.details?.inquiry_suppliers || [];
    const submissionPack = tender.details?.submission_pack || null;
    const submissionItems = useMemo(() => {
        if (!submissionPack?.variants)
            return [];
        const exact = submissionPack.variants[selectedVariant];
        return Array.isArray(exact) ? exact : [];
    }, [submissionPack, selectedVariant]);
    const hasCompanyProfile = Boolean(companyProfile?.full_name?.trim() && companyProfile?.inn?.trim());
    const userNotesDirty = userNotes !== (tender.user_notes || "");
    const isUnlocked = !storefrontMode || Boolean(tender.is_unlocked);
    const allPublicOffer = isTenderAllPublicOffer(tender);
    const profitThreshold = getProfitThresholdRub(tender.nmck);
    const cityLabel = tender.city || "Новосибирск";
    const { law: lawLabel, is223, procedureType, isQuoteRequest } = getTenderLawAndType(tender);
    const checkOfferPublicOffer = (offer) => isTrustedPublicOffer(offer.url, offer.priceText || offer.unitPrice) ||
        Boolean(mailState?.продавцы?.some((s) => s.статус === "публичная_оферта" &&
            ((offer.url && s.сайт === offer.url) ||
                (s.продавец &&
                    offer.seller
                        .toLowerCase()
                        .includes(s.продавец.replace(/[«»"]/g, "").toLowerCase())))));
    // Фильтрация поставщиков строго под выбранный вариант А / Б
    const variantSupplierGroups = useMemo(() => {
        const targetVar = selectedVariant.toUpperCase();
        return supplierGroups
            .map((group) => {
            const exact = group.offers.filter((o) => (o.variant || "").trim().toUpperCase() === targetVar);
            const offers = exact.length > 0 ? exact : group.offers;
            return {
                position: group.position,
                offers,
                isFallback: exact.length === 0,
            };
        })
            .filter((g) => g.offers.length > 0);
    }, [selectedVariant, supplierGroups]);
    const findMatchedMailSeller = (seller, email, url) => {
        const sellers = mailState?.продавцы || [];
        if (sellers.length === 0)
            return undefined;
        const cleanName = seller.replace(/[«»"']/g, "").toLowerCase().trim();
        const cleanEmail = (email || "").toLowerCase().trim();
        let offerHost = "";
        if (url) {
            try {
                const withProto = url.includes("://") ? url : `https://${url}`;
                offerHost = new URL(withProto).hostname.replace(/^www\./, "").toLowerCase();
            }
            catch {
                offerHost = "";
            }
        }
        return sellers.find((s) => {
            if (cleanEmail && s.email && s.email.toLowerCase().trim() === cleanEmail) {
                return true;
            }
            if (offerHost && s.сайт) {
                try {
                    const sWithProto = s.сайт.includes("://") ? s.сайт : `https://${s.сайт}`;
                    const sHost = new URL(sWithProto).hostname.replace(/^www\./, "").toLowerCase();
                    if (sHost === offerHost)
                        return true;
                }
                catch {
                    // ignore
                }
            }
            if (s.продавец) {
                const sClean = s.продавец.replace(/[«»"']/g, "").toLowerCase().trim();
                if (sClean && cleanName && (cleanName.includes(sClean) || sClean.includes(cleanName))) {
                    return true;
                }
            }
            return false;
        });
    };
    // Сборка получателей и готовых шаблонов писем под выбранный вариант
    const variantRecipients = useMemo(() => {
        const bySeller = new Map();
        const targetVar = selectedVariant.toUpperCase();
        for (const grp of supplierGroups) {
            const exact = grp.offers.filter((o) => (o.variant || "").trim().toUpperCase() === targetVar);
            const chosen = exact.length > 0 ? exact : grp.offers;
            for (const offer of chosen) {
                const cleanSeller = (offer.seller || "Поставщик").trim();
                const sellerKey = `${cleanSeller.toLowerCase()}|${(offer.email || "").toLowerCase()}`;
                const pricePart = offer.unitPrice !== null
                    ? formatRub(offer.unitPrice)
                    : offer.priceText || "по запросу";
                const isPub = checkOfferPublicOffer(offer);
                const line = isPub
                    ? `• ${grp.position} — ${pricePart}`
                    : `• ${grp.position} — проверенная цена: ${pricePart}`;
                const matchedMail = findMatchedMailSeller(cleanSeller, offer.email, offer.url);
                const conf = resolveSellerConfirmationState(isPub, matchedMail, Boolean(tender.prices_confirmed));
                const rawDt = matchedMail?.ответ_в || matchedMail?.отправлено_в || null;
                const requestDateLabel = rawDt ? formatNskDateTime(rawDt, true) : null;
                const requestSubject = matchedMail?.сообщения?.[0]?.тема || matchedMail?.тема || null;
                const quoteText = matchedMail?.ответы
                    ? Object.values(matchedMail.ответы).find((a) => Boolean(a?.цитата))?.цитата || null
                    : null;
                const existing = bySeller.get(sellerKey);
                if (existing) {
                    if (!existing.lines.includes(line))
                        existing.lines.push(line);
                    if (!existing.email && offer.email)
                        existing.email = offer.email;
                    if (!existing.phone && offer.phone)
                        existing.phone = offer.phone;
                    if (!existing.url && offer.url)
                        existing.url = offer.url;
                    if (!existing.requestSubject && requestSubject)
                        existing.requestSubject = requestSubject;
                    if (!existing.requestDateLabel && requestDateLabel)
                        existing.requestDateLabel = requestDateLabel;
                    if (!existing.quoteText && quoteText)
                        existing.quoteText = quoteText;
                    if (conf.state === "rejected") {
                        existing.confirmationState = "rejected";
                        existing.refusalReason = conf.refusalReason || existing.refusalReason;
                        existing.verdictBadge = conf.badge || existing.verdictBadge;
                        existing.verdictProof = conf.proof || existing.verdictProof;
                    }
                    else if (conf.state === "waiting" && existing.confirmationState === "confirmed") {
                        existing.confirmationState = "waiting";
                        existing.verdictBadge = conf.badge || existing.verdictBadge;
                        existing.verdictProof = conf.proof || existing.verdictProof;
                    }
                    else {
                        if (!existing.verdictBadge && conf.badge)
                            existing.verdictBadge = conf.badge;
                        if (!existing.verdictProof && conf.proof)
                            existing.verdictProof = conf.proof;
                    }
                }
                else {
                    bySeller.set(sellerKey, {
                        key: sellerKey,
                        seller: cleanSeller,
                        email: cleanContactEmail(offer.email) || cleanContactEmail(matchedMail?.email) || undefined,
                        phone: cleanContactPhone(offer.phone) || cleanContactPhone(matchedMail?.телефон) || undefined,
                        url: offer.url || matchedMail?.сайт || undefined,
                        isPublicOffer: isPub,
                        confirmationState: conf.state,
                        refusalReason: conf.refusalReason,
                        verdictBadge: conf.badge,
                        verdictProof: conf.proof,
                        lines: [line],
                        requestSubject,
                        requestDateLabel,
                        quoteText,
                    });
                }
            }
        }
        return Array.from(bySeller.values());
    }, [selectedVariant, supplierGroups, mailState]);
    const buildEmailSubject = () => `Выставление счёта по ранее направленному запросу: ${tender.product}`;
    const buildEmailBody = (rec) => {
        const topicStr = rec.requestSubject || `Запрос наличия и цены: ${tender.product}`;
        const datePart = rec.requestDateLabel ? ` от ${rec.requestDateLabel}` : "";
        const itemsText = rec.lines.length > 0
            ? rec.lines.join("\n")
            : `• ${tender.product} (см. спецификацию закупки)`;
        const requisitesLines = companyProfile?.full_name?.trim()
            ? [
                companyProfile.full_name.trim(),
                companyProfile.inn ? `ИНН: ${companyProfile.inn}${companyProfile.kpp ? ` / КПП: ${companyProfile.kpp}` : ""}` : null,
                companyProfile.ogrn ? `ОГРН${companyProfile.entity_type === "ip" ? "ИП" : ""}: ${companyProfile.ogrn}` : null,
                companyProfile.legal_address ? `Адрес: ${companyProfile.legal_address}` : null,
                companyProfile.bank_name ? `Банк: ${companyProfile.bank_name}${companyProfile.bik ? `, БИК ${companyProfile.bik}` : ""}` : null,
                companyProfile.raschet_account ? `Р/с: ${companyProfile.raschet_account}${companyProfile.korr_account ? `, К/с: ${companyProfile.korr_account}` : ""}` : null,
            ].filter(Boolean)
            : ["[Вставьте ИНН / реквизиты вашего ИП или ООО]"];
        const signLines = [
            companyProfile?.director_name?.trim() || "[Ваше Имя]",
            companyProfile?.phone?.trim() || "[Ваш телефон]",
            companyProfile?.email?.trim() || null,
        ].filter(Boolean);
        return [
            "Здравствуйте!",
            "",
            `Ранее вам отправляли запрос с адреса anton.stepanov.tender@gmail.com (тема запроса: «${topicStr}»${datePart}):`,
            itemsText,
            "",
            "Хотим уточнить, актуально ли наличие на сегодняшний день, и просим выставить счёт на покупку этого объёма по указанной цене на наши реквизиты:",
            ...requisitesLines,
            "",
            "С уважением,",
            ...signLines,
        ].join("\n");
    };
    return (_jsxs("div", { className: "space-y-3 pb-10", children: [_jsxs("header", { className: "sticky top-0 z-20 -mx-3 px-3 py-2.5 backdrop-blur-md bg-[var(--crm-bg)]/90 border-b border-[var(--crm-border)] flex items-center justify-between gap-2", children: [_jsxs("button", { type: "button", onClick: () => {
                            haptic("light");
                            onBack();
                        }, className: "inline-flex items-center gap-1.5 text-sm font-medium px-2 py-1 -ml-2 rounded-lg hover:bg-slate-500/10 shrink-0", children: [_jsx(ArrowLeft, { className: "w-4 h-4" }), "\u041D\u0430\u0437\u0430\u0434"] }), storefrontMode ? (isUnlocked ? (_jsxs("button", { type: "button", onClick: () => copyValue("number", tender.number, "Номер закупки скопирован"), className: "inline-flex items-center gap-1 text-xs font-mono crm-muted truncate", children: [copiedKey === "number" ? (_jsx(Check, { className: "w-3.5 h-3.5 text-emerald-500 shrink-0" })) : (_jsx(Copy, { className: "w-3.5 h-3.5 shrink-0" })), _jsx("span", { className: "truncate", children: tender.number })] })) : (_jsxs("div", { className: "flex items-center gap-1.5 min-w-0", children: [_jsxs("span", { className: "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-500/12 crm-muted font-medium truncate", children: [_jsx(Lock, { className: "w-3 h-3 shrink-0" }), _jsx("span", { className: "truncate", children: "\u2116 \u0415\u0418\u0421 \u0441\u043A\u0440\u044B\u0442 \u0434\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F" })] }), _jsxs("button", { type: "button", onClick: () => {
                                    haptic("light");
                                    onOpenTopUpModal?.();
                                }, className: "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-500/12 text-blue-700 dark:text-blue-300 font-semibold shrink-0", children: [_jsx(KeyRound, { className: "w-3 h-3" }), openCredits] })] }))) : (_jsxs("button", { type: "button", onClick: () => copyValue("number", tender.number, "Номер закупки скопирован"), className: "inline-flex items-center gap-1 text-xs font-mono crm-muted", children: [copiedKey === "number" ? (_jsx(Check, { className: "w-3.5 h-3.5 text-emerald-500" })) : (_jsx(Copy, { className: "w-3.5 h-3.5" })), tender.number] })), _jsxs("div", { className: "flex items-center gap-0.5 shrink-0", children: [_jsx("button", { type: "button", onClick: () => {
                                    const shareCode = tender.share_id || tender.number;
                                    const shareUrl = `https://t.me/tenderman_ru_bot?start=lot_${shareCode}`;
                                    const profitVal = bestCalc?.profit ?? tender.profit;
                                    const shareText = `${tender.icon || "📦"} ${tender.product}\nНМЦК: ${formatRub(tender.nmck)} · Прибыль: ${formatRub(profitVal)}`;
                                    const inTelegram = Boolean(getWebApp()?.initData);
                                    if (inTelegram) {
                                        haptic("light");
                                        void navigator.clipboard?.writeText?.(shareUrl).catch(() => { });
                                        openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
                                        return;
                                    }
                                    if (typeof navigator.share === "function") {
                                        haptic("light");
                                        void navigator
                                            .share({ title: `${tender.icon || "📦"} ${tender.product}`, text: shareText, url: shareUrl })
                                            .catch(() => { });
                                        return;
                                    }
                                    if (navigator.clipboard?.writeText) {
                                        navigator.clipboard
                                            .writeText(shareUrl)
                                            .then(() => {
                                            haptic("success");
                                            setCopiedKey("share");
                                            setTimeout(() => setCopiedKey(null), 1800);
                                            onToast?.("Ссылка на карточку скопирована!");
                                        })
                                            .catch(() => {
                                            haptic("light");
                                            openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
                                        });
                                    }
                                    else {
                                        haptic("light");
                                        openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
                                    }
                                }, className: "p-1.5 rounded-full hover:bg-slate-500/10 shrink-0", "aria-label": "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u043E\u0439", title: "\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u043E\u0439 \u0432 Telegram", children: copiedKey === "share" ? (_jsx(Check, { className: "w-5 h-5 text-emerald-500" })) : (_jsx(Share2, { className: "w-5 h-5 crm-muted" })) }), storefrontMode ? (_jsx("button", { type: "button", disabled: saving, onClick: () => {
                                    haptic("select");
                                    if (onToggleFavorite) {
                                        void onToggleFavorite();
                                    }
                                    else {
                                        void onSaveOwner({ is_favorite: !tender.is_favorite });
                                    }
                                }, className: "p-1.5 rounded-full hover:bg-slate-500/10 shrink-0", "aria-label": "\u0412 \u0438\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435", children: _jsx(Star, { className: `w-5 h-5 ${tender.is_favorite ? "fill-amber-400 text-amber-400" : "crm-muted"}` }) })) : !readOnly ? (_jsx("button", { type: "button", disabled: saving, onClick: () => {
                                    haptic("select");
                                    void onSaveOwner({ is_favorite: !tender.is_favorite });
                                }, className: "p-1.5 rounded-full hover:bg-slate-500/10", "aria-label": "\u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435", children: _jsx(Star, { className: `w-5 h-5 ${tender.is_favorite ? "fill-amber-400 text-amber-400" : "crm-muted"}` }) })) : (_jsx("span", { className: "text-[11px] px-2 py-0.5 rounded-full bg-slate-500/12 crm-muted font-medium", children: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440" }))] })] }), !storefrontMode && pv && (_jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-3", children: [_jsx("div", { className: "flex items-start justify-between gap-2 flex-wrap", children: _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-xs font-bold uppercase tracking-wide crm-muted", children: "\u042D\u0442\u0430\u043F \u043A\u043E\u043D\u0432\u0435\u0439\u0435\u0440\u0430" }), _jsxs("div", { className: "mt-1 flex items-center gap-1.5 flex-wrap", children: [_jsx("span", { className: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${pv.badgeCls}`, children: pv.stageBadge }), tender.details?.pipeline?.folder && (_jsxs("span", { className: "text-[11px] font-mono crm-muted px-2 py-0.5 rounded-full bg-slate-500/10", children: ["\uD83D\uDCC1 ", tender.details.pipeline.folder] }))] }), _jsx("p", { className: "mt-1.5 text-xs text-[var(--crm-text)]/90", children: pv.substage }), !pv.isStorefrontReady && (_jsxs("p", { className: "mt-1 text-[11px] crm-muted leading-snug", children: ["\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435: ", stageProof(tender)] }))] }) }), _jsx("div", { className: "grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1", children: pv.steps.map((st) => {
                            const boxCls = st.state === "done"
                                ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300"
                                : st.state === "active"
                                    ? "bg-blue-500/15 border-blue-500/45 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30"
                                    : st.state === "blocked"
                                        ? "bg-amber-500/15 border-amber-500/45 text-amber-800 dark:text-amber-300"
                                        : st.state === "rejected"
                                            ? "bg-rose-500/15 border-rose-500/45 text-rose-700 dark:text-rose-300"
                                            : "bg-slate-500/6 border-[var(--crm-border)] crm-muted opacity-65";
                            return (_jsxs("div", { className: `rounded-xl border p-1.5 text-center flex flex-col items-center justify-center gap-0.5 ${boxCls}`, children: [_jsx("span", { className: "text-xs leading-none", children: st.emoji }), _jsx("span", { className: "text-[9.5px] font-semibold leading-tight truncate w-full", children: st.bot })] }, st.id));
                        }) }), tender.stage !== "rejected" && tender.stage !== "unprofitable" && tender.details?.qc && (_jsxs("div", { className: `rounded-xl border p-3 text-xs space-y-2 ${tender.details.qc.approved
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-amber-500/10 border-amber-500/35"}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-2 font-semibold", children: [_jsx("span", { children: tender.details.qc.approved
                                            ? "✅ ОТК «Ревизор»: допущен на Витрину"
                                            : "⛔ ОТК «Ревизор»: пока скрыт с Витрины" }), tender.details.qc.checked_at && (_jsx("span", { className: "text-[10.5px] crm-muted font-normal", children: formatNskDateTime(tender.details.qc.checked_at) }))] }), (tender.details.qc.blockers || []).length > 0 && (_jsx("ul", { className: "list-disc pl-4 space-y-0.5 text-[11.5px] text-amber-900 dark:text-amber-200", children: (tender.details.qc.blockers || []).map((b, idx) => (_jsx("li", { children: b }, idx))) }))] })), (tender.stage === "rejected" || tender.stage === "unprofitable") && (() => {
                        const reason = (tender.reject_reason || pv?.reject_reason || pv?.substage || "Архив").trim();
                        const shownProof = stageProof(tender);
                        const notes = tender.details?.special_notes || [];
                        return (_jsxs("div", { className: "rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-xs space-y-1.5", children: [_jsxs("div", { className: "font-semibold text-rose-800 dark:text-rose-200", children: ["\uD83D\uDEAB \u041F\u0440\u0438\u0447\u0438\u043D\u0430 \u043E\u0442\u0441\u0435\u0432\u0430: ", reason.replace(/\s*Цитата:[\s\S]*$/, "").trim()] }), shownProof ? (_jsxs("p", { className: "text-[11.5px] text-rose-900/90 dark:text-rose-200/90 leading-relaxed", children: ["\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435: ", shownProof] })) : (_jsx("p", { className: "text-[11.5px] text-rose-900/90 dark:text-rose-200/90 leading-relaxed", children: "\u0426\u0438\u0442\u0430\u0442\u044B \u0438\u0437 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430 \u043D\u0435\u0442. \u042D\u0442\u043E \u0441\u0442\u0430\u0440\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0431\u0435\u0437 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0444\u0440\u0430\u0437\u044B \u0432 \u0444\u0430\u0439\u043B\u0435." })), notes.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 pt-0.5", children: notes.map((n, i) => (_jsx("span", { className: "px-2 py-0.5 rounded-full text-[10.5px] bg-rose-500/15 text-rose-800 dark:text-rose-200", children: n }, i))) }))] }));
                    })(), pv && (_jsxs("div", { className: "rounded-xl border border-sky-500/30 bg-sky-500/10 p-2.5 text-[11.5px] space-y-1", children: [_jsxs("div", { className: "text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300", children: ["\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0448\u0430\u0433 (", pv.botName, ")"] }), _jsx("div", { className: "font-medium text-slate-900 dark:text-slate-100", children: (() => {
                                    const sellers = tender.details?.mail_state?.продавцы || [];
                                    const newCnt = sellers.filter((s) => s.статус === "новый").length;
                                    const noEmailCnt = sellers.filter((s) => s.статус === "нет_email").length;
                                    const waitCnt = sellers.filter((s) => s.статус === "отправлено" || s.статус === "напоминание").length;
                                    if (newCnt > 0) {
                                        return `Задача Почтальону: отправить ${newCnt} первичн. запрос(а) КП в рабочее окно поставщика.`;
                                    }
                                    if (noEmailCnt > 0) {
                                        return `Задача Почтальону: найти email для ${noEmailCnt} поставщ. и отправить запрос.`;
                                    }
                                    if (waitCnt > 0) {
                                        return `В работе у Почтальона: ждём ответа от ${waitCnt} поставщ. (напоминания по SLA, затем перепроверка ОТК).`;
                                    }
                                    return pv.nextStepHint;
                                })() })] }))] })), !storefrontMode && isExpiredInActive && (_jsxs("div", { className: "rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300", children: [_jsx(AlertTriangle, { className: "w-4 h-4 shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsxs("div", { className: "font-semibold", children: ["\u0421\u0440\u043E\u043A \u043F\u043E\u0434\u0430\u0447\u0438 \u0437\u0430\u044F\u0432\u043E\u043A \u0438\u0441\u0442\u0451\u043A (", dl.nskFormatted, ")"] }), _jsx("p", { className: "mt-0.5 opacity-90", children: "\u0421\u0440\u043E\u043A \u043F\u043E\u0434\u0430\u0447\u0438 \u043F\u0440\u043E\u0448\u0451\u043B, \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0443\u0434\u0430\u043B\u0435\u043D\u0430 \u0438\u0437 CRM \u043F\u0440\u0438 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0439 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0438\u0437\u0430\u0446\u0438\u0438." })] })] })), _jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-1.5 mb-2", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [_jsx("span", { className: `px-2 py-0.5 rounded-md border text-[11px] font-semibold leading-none ${is223
                                                    ? "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/25"
                                                    : "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25"}`, children: lawLabel }), procedureType && (_jsx("span", { className: `px-2 py-0.5 rounded-md border text-[11px] font-medium leading-none ${isQuoteRequest
                                                    ? "bg-teal-500/12 text-teal-700 dark:text-teal-300 border-teal-500/25"
                                                    : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"}`, children: procedureType }))] }), allPublicOffer ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 text-[10.5px] font-semibold", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "\u041F\u0443\u0431\u043B. \u043E\u0444\u0435\u0440\u0442\u0430"] })) : storefrontMode || tender.prices_confirmed ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-semibold", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "\u0426\u0435\u043D\u0430 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0430"] })) : tender.price_request_status && tender.price_request_status !== "Не начат" ? (_jsx("span", { className: "px-2 py-0.5 rounded-full bg-blue-500/12 text-blue-700 dark:text-blue-300 text-[10.5px] font-medium", children: tender.price_request_status })) : null] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-2xl leading-none", children: tender.icon || "📦" }), _jsx("h1", { className: "text-lg font-bold leading-snug", children: tender.product })] }), isUnlocked && tender.subject && (_jsx("p", { className: "mt-1.5 text-xs crm-muted", children: tender.subject }))] }), (() => {
                        const isShowcaseReady = Boolean(storefrontMode || tender.details?.qc?.approved === true);
                        const displayProfit = bestCalc?.profit ?? tender.profit;
                        const hasProfit = displayProfit !== null && displayProfit !== undefined;
                        const rawProfitLabel = tender.details?.pipeline?.profit_label;
                        const profitHeading = isShowcaseReady
                            ? `Чистая прибыль (вариант ${tender.best_variant || "А"})`
                            : rawProfitLabel || "Предв. чистая прибыль";
                        return (_jsxs("div", { className: `rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 border ${!hasProfit
                                ? "bg-slate-500/8 border-[var(--crm-border)]"
                                : Number(displayProfit) < 0
                                    ? "bg-rose-500/10 border-rose-500/25"
                                    : isShowcaseReady
                                        ? "bg-emerald-500/12 border-emerald-500/25"
                                        : "bg-sky-500/10 border-sky-500/25"}`, children: [_jsxs("div", { children: [_jsx("div", { className: `text-[11px] uppercase tracking-wide font-medium ${!hasProfit
                                                ? "crm-muted"
                                                : Number(displayProfit) < 0
                                                    ? "text-rose-700 dark:text-rose-300"
                                                    : isShowcaseReady
                                                        ? "text-emerald-700 dark:text-emerald-300"
                                                        : "text-sky-700 dark:text-sky-300"}`, children: profitHeading }), _jsx("div", { className: `text-xl font-bold tracking-tight mt-0.5 ${!hasProfit
                                                ? "text-sm font-medium crm-muted"
                                                : Number(displayProfit) < 0
                                                    ? "text-rose-600 dark:text-rose-400"
                                                    : isShowcaseReady || Number(displayProfit) >= profitThreshold
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-amber-600 dark:text-amber-400"}`, children: hasProfit ? formatRub(displayProfit) : "Ожидает поиска цен" })] }), hasProfit && marginPct && (_jsxs("div", { className: "text-right shrink-0", children: [_jsx("div", { className: "text-[10px] uppercase crm-muted", children: "\u041C\u0430\u0440\u0436\u0430" }), _jsx("div", { className: "text-sm font-bold", children: marginPct })] }))] }));
                    })(), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "rounded-xl bg-slate-500/8 px-3.5 py-2.5 flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-xs font-medium crm-muted", children: "\u041D\u041C\u0426\u041A (\u0446\u0435\u043D\u0430 \u043A\u043E\u043D\u0442\u0440\u0430\u043A\u0442\u0430)" }), _jsx("span", { className: "text-sm font-bold", children: formatRub(tender.nmck) })] }), _jsxs("div", { className: "rounded-xl bg-slate-500/8 px-3.5 py-2.5 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-xs font-medium crm-muted", children: "\u0420\u0430\u0441\u0445\u043E\u0434\u044B (\u0438\u0442\u043E\u0433\u043E)" }), _jsx("span", { className: "text-sm font-bold", children: formatRub(tender.expenses) })] }), bestCalc && (_jsxs("div", { className: "grid grid-cols-3 gap-2 pt-1.5 border-t border-[var(--crm-border)] text-[11px]", children: [_jsxs("div", { children: [_jsx("div", { className: "crm-muted", children: "\u041F\u043E\u043A\u0443\u043F\u043A\u0430" }), _jsx("div", { className: "font-semibold mt-0.5", children: formatRub(bestCalc.purchase) })] }), _jsxs("div", { children: [_jsx("div", { className: "crm-muted", children: "\u041D\u0430\u043B\u043E\u0433\u0438" }), _jsx("div", { className: "font-semibold mt-0.5", children: formatRub(bestCalc.tax) })] }), _jsxs("div", { children: [_jsx("div", { className: "crm-muted", children: "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430" }), _jsx("div", { className: "font-semibold mt-0.5", children: formatRub(bestCalc.delivery) })] })] }))] }), _jsxs("div", { className: "rounded-xl bg-slate-500/8 px-3.5 py-2.5 flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-xs font-medium crm-muted", children: "\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u0434\u043E \u043F\u043E\u0434\u0430\u0447\u0438" }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-sm font-bold", children: dl.label }), _jsxs("div", { className: "text-[11px] crm-muted", children: ["\u0434\u043E ", dl.nskFormatted, " (\u041D\u0421\u041A)"] })] })] })] }), storefrontMode && !isUnlocked && (_jsxs("div", { className: "rounded-xl bg-slate-500/6 border border-[var(--crm-border)] p-3 space-y-1.5 text-xs", children: [_jsxs("div", { className: "font-medium", children: ["\uD83D\uDCCD \u0413\u043E\u0440\u043E\u0434 \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0438: \u0433. ", cityLabel, " \u00B7 ", lawLabel, procedureType ? ` · ${procedureType}` : ""] }), _jsx("div", { className: "crm-muted", children: "\uD83D\uDD12 \u0422\u043E\u0447\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438, \u0437\u0430\u043A\u0430\u0437\u0447\u0438\u043A \u0438 \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0415\u0418\u0421 \u043E\u0442\u043A\u0440\u043E\u044E\u0442\u0441\u044F \u043F\u043E\u0441\u043B\u0435 \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438" })] })), restr.nationalRegime.active && (_jsxs("div", { className: `rounded-xl border p-3 space-y-1.5 text-xs ${restr.nationalRegime.bannerCls}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [_jsxs("div", { className: "font-semibold text-[12px] flex items-center gap-1.5", children: [_jsx("span", { children: "\uD83C\uDDF7\uD83C\uDDFA" }), _jsxs("span", { children: ["\u041D\u0430\u0446\u0440\u0435\u0436\u0438\u043C: ", restr.nationalRegime.title] })] }), restr.nationalRegime.complianceBadgeLabel && (_jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full border text-[10.5px] font-semibold ${restr.nationalRegime.complianceBadgeCls}`, children: restr.nationalRegime.complianceBadgeLabel })), restr.nationalRegime.basis && (_jsx("span", { className: "text-[10px] crm-muted font-medium", children: restr.nationalRegime.basis }))] }), _jsx("div", { className: "text-[11.5px] leading-snug text-[var(--crm-text)]/90", children: restr.nationalRegime.plainExplanation }), _jsxs("div", { className: "text-[11px] leading-snug crm-muted", children: [_jsx("b", { className: "text-[var(--crm-text)]", children: "\u0427\u0442\u043E \u043D\u0443\u0436\u043D\u043E \u0434\u043B\u044F \u0437\u0430\u044F\u0432\u043A\u0438:" }), " ", restr.nationalRegime.whatNeeded] }), restr.nationalRegime.complianceText && (_jsxs("div", { className: "pt-1 border-t border-[var(--crm-border)]/60 text-[11px] leading-snug", children: [_jsx("b", { className: "text-[var(--crm-text)]", children: "\u041F\u043E \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0443:" }), " ", _jsx("span", { className: restr.nationalRegime.complianceStatus === "подтверждено" ||
                                            restr.nationalRegime.complianceStatus === "исключение"
                                            ? "text-emerald-700 dark:text-emerald-300 font-medium"
                                            : restr.nationalRegime.complianceStatus === "не_подходит"
                                                ? "text-rose-700 dark:text-rose-300 font-medium"
                                                : restr.nationalRegime.complianceStatus === "риск_импорт"
                                                    ? "text-amber-800 dark:text-amber-300 font-medium"
                                                    : "crm-muted", children: restr.nationalRegime.complianceText })] })), (!storefrontMode || isUnlocked) && tender.registry_numbers && (_jsxs("div", { className: "text-[11px] text-emerald-700 dark:text-emerald-300 font-medium", children: ["\uD83D\uDCCB \u0420\u0435\u0435\u0441\u0442\u0440 \u0413\u0418\u0421\u041F / \u0415\u0410\u042D\u0421: ", tender.registry_numbers] })), restr.nationalRegime.exceptionNote && (_jsxs("div", { className: "text-[10.5px] crm-muted", children: ["\u2139\uFE0F \u0418\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u0438\u0437 \u0438\u0437\u0432\u0435\u0449\u0435\u043D\u0438\u044F: ", restr.nationalRegime.exceptionNote] }))] })), (restr.isMedical || restr.needsLicense || restr.isSmpOnly) && (_jsxs("div", { className: "rounded-xl bg-amber-500/8 border border-amber-500/25 p-3 space-y-1.5 text-xs", children: [_jsxs("div", { className: "font-semibold text-[11.5px] flex items-center gap-1.5", children: [_jsx(Shield, { className: "w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" }), _jsx("span", { children: "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F \u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F" })] }), _jsx("div", { className: "flex flex-wrap gap-1.5 text-[11px]", children: restr.badges
                                    .filter((b) => b.id !== "nr")
                                    .map((b) => (_jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full border font-medium ${b.cls}`, children: b.label }, b.id))) }), restr.isMedical && (_jsx("div", { className: "text-[11px] text-[var(--crm-text)]/85", children: "\uD83C\uDFE5 \u041F\u043E\u0441\u0442\u0430\u0432\u043A\u0430 \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u0445 \u0442\u043E\u0432\u0430\u0440\u043E\u0432 \u2014 \u043C\u043E\u0433\u0443\u0442 \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u043E\u0435 \u0443\u0434\u043E\u0441\u0442\u043E\u0432\u0435\u0440\u0435\u043D\u0438\u0435 (\u0420\u0423), \u0444\u0430\u0440\u043C\u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044F \u0438\u043B\u0438 \u043C\u0435\u0434. \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F." })), conditions?.licenses && !/^(?:не\s+требу[ею]тся|нет|отсутств|—|-)$/i.test(conditions.licenses.trim()) && (_jsxs("div", { className: "text-[11px] crm-muted", children: ["\uD83D\uDCDC ", _jsx("b", { className: "text-[var(--crm-text)]", children: "\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 / \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F:" }), " ", conditions.licenses] })), conditions?.smp_sono && restr.isSmpOnly && (_jsxs("div", { className: "text-[11px] crm-muted", children: ["\uD83C\uDFE2 ", _jsx("b", { className: "text-[var(--crm-text)]", children: "\u0423\u0447\u0430\u0441\u0442\u0438\u0435:" }), " ", conditions.smp_sono] }))] }))] }), storefrontMode && !isUnlocked && (_jsxs("section", { className: "crm-surface rounded-2xl p-4 border-2 border-blue-500/35 bg-gradient-to-br from-blue-500/8 via-transparent to-emerald-500/8 space-y-3", children: [_jsxs("div", { className: "flex items-start gap-2.5", children: [_jsx("div", { className: "w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0", children: _jsx(Lock, { className: "w-4 h-4" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-sm font-bold leading-snug", children: "\u041F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A, \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u044B \u0437\u0430\u043A\u0443\u043F\u043A\u0438 \u0438 \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0415\u0418\u0421 \u0441\u043A\u0440\u044B\u0442\u044B" }), _jsx("p", { className: "text-xs crm-muted mt-0.5", children: "\u0420\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u0443\u0439\u0442\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E \u0433\u043E\u0442\u043E\u0432\u044B\u0439 \u043A \u043F\u043E\u0434\u0430\u0447\u0435 \u0440\u0430\u0441\u0447\u0451\u0442:" })] })] }), _jsxs("ul", { className: "space-y-1.5 text-xs", children: [_jsxs("li", { className: "flex items-start gap-2", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-500 shrink-0 mt-0.5" }), _jsx("span", { children: "\u041F\u0440\u044F\u043C\u044B\u0435 \u0441\u0441\u044B\u043B\u043A\u0438 \u0438 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u044B \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0445 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u043E\u0432 \u043F\u043E \u0412\u0430\u0440\u0438\u0430\u043D\u0442\u0443 \u0410 \u0438 \u0412\u0430\u0440\u0438\u0430\u043D\u0442\u0443 \u0411" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-500 shrink-0 mt-0.5" }), _jsx("span", { children: "\u041D\u043E\u043C\u0435\u0440 \u0438\u0437\u0432\u0435\u0449\u0435\u043D\u0438\u044F, \u0434\u0430\u043D\u043D\u044B\u0435 \u0437\u0430\u043A\u0430\u0437\u0447\u0438\u043A\u0430 \u0438 \u043F\u0440\u044F\u043C\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0437\u0430\u043A\u0443\u043F\u043A\u0443 \u0432 \u0415\u0418\u0421" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-500 shrink-0 mt-0.5" }), _jsx("span", { children: "\u0413\u043E\u0442\u043E\u0432\u044B\u0439 \u0448\u0430\u0431\u043B\u043E\u043D \u043F\u0438\u0441\u044C\u043C\u0430 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0443, \u0430\u0434\u0440\u0435\u0441\u0430 \u0441\u043A\u043B\u0430\u0434\u043E\u0432 \u0438 \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u044B 2\u0413\u0418\u0421" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-500 shrink-0 mt-0.5" }), _jsx("span", { children: "\u041F\u043E\u043B\u043D\u0430\u044F \u0441\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F \u043F\u043E \u0422\u0417, \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u043F\u043E\u0437\u0438\u0446\u0438\u0439 \u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u043A\u043E\u043D\u0442\u0440\u0430\u043A\u0442\u0430" })] })] }), openCredits > 0 ? (_jsxs("div", { className: "space-y-2 pt-1", children: [_jsxs("button", { type: "button", disabled: unlocking, onClick: () => {
                                    haptic("success");
                                    void onUnlockTender?.();
                                }, className: "w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] disabled:opacity-60 transition", children: [_jsx(Unlock, { className: "w-4 h-4" }), unlocking
                                        ? "Открываем данные..."
                                        : "Открыть тендер бесплатно (списать 1 открытие)"] }), _jsxs("p", { className: "text-[11px] text-center crm-muted", children: ["\u0423 \u0432\u0430\u0441 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0439: ", _jsx("b", { children: openCredits }), ". \u041F\u043E\u0441\u043B\u0435 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u0442\u0435\u043D\u0434\u0435\u0440 \u043D\u0430\u0432\u0441\u0435\u0433\u0434\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0441\u044F \u0432 \u0432\u0430\u0448\u0435\u043C \u041B\u0438\u0447\u043D\u043E\u043C \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0435."] })] })) : (_jsxs("div", { className: "space-y-2 pt-1", children: [_jsxs("button", { type: "button", onClick: () => {
                                    haptic("light");
                                    onOpenTopUpModal?.();
                                }, className: "w-full py-3 px-4 rounded-xl crm-accent-btn text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition", children: [_jsx(KeyRound, { className: "w-4 h-4" }), "\u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F (\u043E\u0442 500 \u20BD \u0437\u0430 \u0442\u0435\u043D\u0434\u0435\u0440)"] }), _jsx("p", { className: "text-[11px] text-center crm-muted", children: "\u041E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0438\u0441\u044C. \u0411\u0430\u043B\u0430\u043D\u0441 \u043F\u043E\u043F\u043E\u043B\u043D\u044F\u0435\u0442\u0441\u044F \u0435\u0436\u0435\u0434\u043D\u0435\u0432\u043D\u043E \u0432 00:00 (\u041D\u0421\u041A) \u0438\u043B\u0438 \u043F\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u0443 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443." })] }))] })), isUnlocked && (Object.keys(calcVariants).length > 0 || supplierGroups.length > 0) && (_jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 flex-wrap", children: [_jsxs("h2", { className: "text-sm font-bold flex items-center gap-1.5", children: [_jsx(MapPin, { className: "w-4 h-4 text-blue-500" }), "\u0412\u0430\u0440\u0438\u0430\u043D\u0442\u044B \u0437\u0430\u043A\u0443\u043F\u043A\u0438 \u0438 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0438"] }), calc?.tax_mode && _jsx("span", { className: "text-[11px] crm-muted", children: calc.tax_mode })] }), availableVariants.length >= 2 && (_jsx("div", { className: "grid gap-2 grid-cols-2", children: availableVariants.map((vKey) => {
                            const vCalc = calcVariants[vKey];
                            const isSelected = selectedVariant === vKey;
                            const isBest = (tender.best_variant || "").trim().toUpperCase() === vKey;
                            return (_jsxs("button", { type: "button", onClick: () => {
                                    haptic("select");
                                    setSelectedVariant(vKey);
                                }, className: `text-left rounded-xl p-3 border transition active:scale-[0.99] ${isSelected
                                    ? "border-blue-500 bg-blue-500/12 ring-1 ring-blue-500/40 shadow-xs"
                                    : "border-[var(--crm-border)] bg-slate-500/5 hover:bg-slate-500/10"}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-1", children: [_jsxs("span", { className: "text-xs font-bold", children: ["\u0412\u0430\u0440\u0438\u0430\u043D\u0442 ", vKey] }), isBest && (_jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/18 text-emerald-700 dark:text-emerald-300 font-semibold", children: "\u2705 \u041B\u0443\u0447\u0448\u0438\u0439" }))] }), _jsx("div", { className: `mt-1 text-sm font-bold ${vCalc?.profit !== null &&
                                            vCalc?.profit !== undefined &&
                                            Number(vCalc.profit) >= profitThreshold
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : vCalc?.profit !== null &&
                                                vCalc?.profit !== undefined &&
                                                Number(vCalc.profit) < 0
                                                ? "text-rose-600 dark:text-rose-400"
                                                : ""}`, children: vCalc ? formatRub(vCalc.profit) : "Поставщики" }), vCalc && (_jsxs("div", { className: "text-[10.5px] crm-muted mt-0.5", children: ["\u0417\u0430\u043A\u0443\u043F\u043A\u0430: ", formatRub(vCalc.purchase)] }))] }, vKey));
                        }) })), activeCalc && availableVariants.length >= 2 && (_jsxs("div", { className: "rounded-xl bg-slate-500/8 border border-[var(--crm-border)] p-3 space-y-2 text-xs", children: [_jsxs("div", { className: "flex items-center justify-between font-semibold", children: [_jsxs("span", { children: ["\u0420\u0430\u0441\u0447\u0451\u0442 \u043F\u043E \u0412\u0430\u0440\u0438\u0430\u043D\u0442\u0443 ", selectedVariant] }), _jsxs("span", { className: "text-emerald-600 dark:text-emerald-400", children: ["\u0427\u0438\u0441\u0442\u0430\u044F \u043F\u0440\u0438\u0431\u044B\u043B\u044C: ", formatRub(activeCalc.profit)] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2 pt-1.5 border-t border-[var(--crm-border)] text-[11px]", children: [_jsxs("div", { children: [_jsx("div", { className: "crm-muted", children: "\u0417\u0430\u043A\u0443\u043F\u043A\u0430" }), _jsx("div", { className: "font-semibold mt-0.5", children: formatRub(activeCalc.purchase) })] }), _jsxs("div", { children: [_jsx("div", { className: "crm-muted", children: "\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430" }), _jsx("div", { className: "font-semibold mt-0.5", children: formatRub(activeCalc.delivery) })] }), _jsxs("div", { children: [_jsx("div", { className: "crm-muted", children: "\u041D\u0430\u043B\u043E\u0433" }), _jsx("div", { className: "font-semibold mt-0.5", children: formatRub(activeCalc.tax) })] })] })] })), variantSupplierGroups.length === 0 ? (_jsxs("div", { className: "rounded-xl bg-slate-500/6 p-3 text-xs crm-muted", children: ["\u041F\u043E \u0412\u0430\u0440\u0438\u0430\u043D\u0442\u0443 ", selectedVariant, " \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0438 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u043E\u0432 \u043F\u043E\u043A\u0430 \u043D\u0435 \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u044B."] })) : (() => {
                        const byStore = new Map();
                        variantSupplierGroups.forEach((group, gIdx) => {
                            const groupTzItem = (tender.details?.items || [])[gIdx];
                            const tzTitle = (groupTzItem?.name || group.position || "").trim();
                            const tzQtyText = groupTzItem?.qty != null
                                ? `${groupTzItem.qty}${groupTzItem.unit ? ` ${groupTzItem.unit}` : ""}`
                                : null;
                            group.offers.forEach((offer, oIdx) => {
                                const isPublicOffer = checkOfferPublicOffer(offer);
                                const matchedMail = findMatchedMailSeller(offer.seller, offer.email, offer.url);
                                const cleanSellerKey = offer.seller.replace(/[«»"']/g, "").toLowerCase().trim();
                                const storeKey = (matchedMail?.key ? `mail:${matchedMail.key}` : "") ||
                                    (offer.email ? `email:${offer.email.toLowerCase().trim()}` : "") ||
                                    `name:${cleanSellerKey}`;
                                const existing = byStore.get(storeKey);
                                if (existing) {
                                    existing.entries.push({
                                        gIdx,
                                        oIdx,
                                        tzItem: groupTzItem,
                                        tzTitle,
                                        tzQtyText,
                                        offer,
                                        isFallback: group.isFallback,
                                    });
                                    if (!existing.email && offer.email)
                                        existing.email = offer.email;
                                    if (!existing.phone && offer.phone)
                                        existing.phone = offer.phone;
                                    if (!existing.pickupAddr && offer.address)
                                        existing.pickupAddr = offer.address;
                                    if (!existing.gisUrl && offer.gisUrl)
                                        existing.gisUrl = offer.gisUrl;
                                    if (isPublicOffer)
                                        existing.isPublicOffer = true;
                                    if (!existing.matchedMail && matchedMail)
                                        existing.matchedMail = matchedMail;
                                }
                                else {
                                    byStore.set(storeKey, {
                                        cardKey: storeKey,
                                        seller: offer.seller,
                                        email: offer.email || matchedMail?.email || undefined,
                                        phone: offer.phone || matchedMail?.телефон || undefined,
                                        pickupAddr: offer.address || tender.pickup_address,
                                        gisUrl: offer.gisUrl || tender.gis_from_url,
                                        isPublicOffer,
                                        matchedMail,
                                        entries: [
                                            {
                                                gIdx,
                                                oIdx,
                                                tzItem: groupTzItem,
                                                tzTitle,
                                                tzQtyText,
                                                offer,
                                                isFallback: group.isFallback,
                                            },
                                        ],
                                    });
                                }
                            });
                        });
                        const sellerCards = Array.from(byStore.values());
                        return (_jsxs("div", { className: "space-y-2.5", children: [_jsxs("div", { className: "text-xs font-semibold crm-muted", children: ["\u041F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0438 \u043F\u043E \u0412\u0430\u0440\u0438\u0430\u043D\u0442\u0443 ", selectedVariant, " (", sellerCards.length, "):"] }), sellerCards.map((card, cIdx) => {
                                    const { matchedMail, isPublicOffer, pickupAddr } = card;
                                    const offerConf = resolveSellerConfirmationState(isPublicOffer, matchedMail, Boolean(tender.prices_confirmed));
                                    const firstAnsObj = matchedMail?.ответы
                                        ? Object.values(matchedMail.ответы)[0]
                                        : undefined;
                                    const leadTime = (firstAnsObj?.срок || "").trim();
                                    const leadLow = leadTime.toLowerCase();
                                    const isOrderOnly = Boolean(leadTime &&
                                        !["по оферте сайта", "в наличии"].includes(leadLow) &&
                                        (leadLow.includes("под заказ") ||
                                            leadLow.includes("заказ") ||
                                            leadLow.includes("после оплаты") ||
                                            /\d+\s*(дн|раб|нед|мес)/.test(leadLow)));
                                    const isInStockConfirmed = (offerConf.state === "confirmed" || offerConf.state === "public_offer") &&
                                        !isOrderOnly &&
                                        firstAnsObj?.в_наличии !== false;
                                    return (_jsxs("div", { className: "rounded-xl bg-slate-500/6 border border-[var(--crm-border)] p-3 text-xs space-y-2.5", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("div", { className: "font-bold text-[13px] leading-snug", children: card.seller }), card.entries.length > 1 && (_jsxs("span", { className: "shrink-0 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/12 text-blue-700 dark:text-blue-300 border border-blue-500/25", children: ["\uD83D\uDCE6 \u041F\u043E\u0437\u0438\u0446\u0438\u0439: ", card.entries.length] }))] }), _jsxs("div", { className: "flex flex-wrap gap-1.5", children: [offerConf.state === "public_offer" ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-[10.5px] font-semibold", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "\u0426\u0435\u043D\u0430 \u043F\u043E \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u043E\u0439 \u043E\u0444\u0435\u0440\u0442\u0435"] })) : offerConf.state === "confirmed" ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10.5px] font-semibold", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), offerConf.badge || "Цена проверена"] })) : offerConf.state === "rejected" ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10.5px] font-semibold", children: [_jsx(AlertTriangle, { className: "w-3 h-3" }), offerConf.badge || "Поставщик отказал"] })) : activeCalc && activeCalc.profit !== null && activeCalc.profit !== undefined && activeCalc.profit < 0 ? (_jsx("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-[10.5px] font-medium", children: "\u041D\u0435 \u0437\u0430\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0435\u0442\u0441\u044F (\u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u0432 \u043C\u0438\u043D\u0443\u0441\u0435)" })) : (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10.5px] font-semibold", children: [_jsx(Clock, { className: "w-3 h-3" }), offerConf.badge || "Ожидает подтверждения"] })), offerConf.state !== "rejected" && isOrderOnly && (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10.5px] font-semibold", children: ["\uD83D\uDCE6 \u041F\u043E\u0434 \u0437\u0430\u043A\u0430\u0437 \u00B7 ", leadTime] })), offerConf.state !== "rejected" && isInStockConfirmed && (_jsx("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10.5px] font-semibold", children: "\u2705 \u0412 \u043D\u0430\u043B\u0438\u0447\u0438\u0438" }))] }), offerConf.proof && (_jsxs("div", { className: "rounded-lg bg-[var(--crm-surface)]/75 border border-[var(--crm-border)] px-2.5 py-1.5 text-[11px] italic crm-muted leading-snug", children: ["\uD83D\uDCAC \u041F\u0440\u0443\u0444: \u00AB", offerConf.proof, "\u00BB"] })), cleanPickupAddress(pickupAddr) && (_jsxs("div", { className: "crm-muted", children: ["\uD83D\uDCCD ", cleanPickupAddress(pickupAddr)] })), _jsx("div", { className: "space-y-2", children: card.entries.map(({ gIdx, oIdx, tzItem, tzTitle, tzQtyText, offer, isFallback }, eIdx) => {
                                                    const offerNrBadge = getOfferNationalRegimeBadge(offer, restr.nationalRegime);
                                                    const cmpKey = `${cIdx}-${gIdx}-${oIdx}-${offer.variant}`;
                                                    const tzChars = Array.isArray(tzItem?.characteristics) ? tzItem.characteristics : [];
                                                    const rows = offer.specsComparison && offer.specsComparison.length > 0
                                                        ? offer.specsComparison
                                                        : tzChars.map((ch) => ({
                                                            name: ch.name || "Параметр",
                                                            required: ch.value || "—",
                                                            found: offer.specsOk ||
                                                                (offerConf.state === "confirmed"
                                                                    ? "Подтверждено по КП"
                                                                    : "Не сверено поэлементно"),
                                                            match: offerConf.state === "confirmed" ? "ok" : "unconfirmed",
                                                        }));
                                                    const isOpen = openSpecCmpKey === cmpKey;
                                                    return (_jsxs("div", { className: "rounded-lg bg-[var(--crm-card)]/65 border border-[var(--crm-border)] p-2.5 space-y-1.5", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "text-[11px] space-y-0.5 min-w-0", children: [_jsxs("div", { children: [_jsxs("span", { className: "font-semibold crm-muted", children: ["\u041F\u043E \u0422\u0417", card.entries.length > 1 ? ` #${gIdx + 1}` : "", ":", " "] }), _jsx("span", { className: "font-medium text-[var(--crm-text)]", children: tzTitle }), tzQtyText && (_jsxs("span", { className: "ml-1 crm-muted", children: ["(", tzQtyText, ")"] }))] }), _jsxs("div", { children: [_jsx("span", { className: "font-semibold crm-muted", children: "\u041D\u0430\u0439\u0434\u0435\u043D\u043E: " }), _jsx("span", { className: "text-[var(--crm-text)]", children: offer.model ||
                                                                                            (offerConf.state === "confirmed"
                                                                                                ? "Подтверждено по КП поставщика"
                                                                                                : "Уточняется по запросу КП") })] })] }), (offer.unitPrice !== null || offer.priceText) && (_jsx("span", { className: `font-bold text-xs shrink-0 ${offer.unitPrice === null && offer.priceText?.includes("(предв.)")
                                                                            ? "text-sky-600 dark:text-sky-300"
                                                                            : "text-emerald-600 dark:text-emerald-400"}`, children: offer.unitPrice !== null
                                                                            ? `${formatRub(offer.unitPrice)} / ед.`
                                                                            : offer.priceText }))] }), (offerNrBadge || isFallback) && (_jsxs("div", { className: "flex flex-wrap gap-1.5", children: [offerNrBadge && (_jsx("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${offerNrBadge.cls}`, title: offerNrBadge.note || offerNrBadge.label, children: offerNrBadge.label })), isFallback && (_jsxs("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-slate-500/12 crm-muted", children: ["\u0438\u0437 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430 ", offer.variant] }))] })), offerNrBadge?.note &&
                                                                !/^(?:проходит|подходит|соблюдается|не требуется)\.?$/i.test(offerNrBadge.note.trim()) && (_jsxs("div", { className: "text-[10.5px] leading-snug crm-muted", children: [_jsx("span", { className: "font-medium text-[var(--crm-text)]", children: "\u041D\u0430\u0446\u0440\u0435\u0436\u0438\u043C \u0442\u043E\u0432\u0430\u0440\u0430:" }), " ", offerNrBadge.note] })), offer.meta && _jsx("div", { className: "text-[11px] crm-muted leading-relaxed", children: offer.meta }), offer.note && _jsx("div", { className: "text-[10.5px] crm-muted leading-relaxed", children: offer.note }), rows.length > 0 && (_jsxs("div", { className: "rounded-lg border border-[var(--crm-border)] bg-[var(--crm-surface)]/50 overflow-hidden", children: [_jsxs("button", { type: "button", onClick: () => setOpenSpecCmpKey(isOpen ? null : cmpKey), className: "w-full flex items-center justify-between gap-2 px-2 py-1.5 text-[10.5px] font-semibold text-[var(--crm-text)] hover:bg-slate-500/8 transition-colors", children: [_jsxs("span", { children: ["\uD83D\uDCCB \u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u043E\u0432 \u0441 \u0422\u0417 (", rows.length, ")"] }), isOpen ? (_jsx(ChevronUp, { className: "w-3.5 h-3.5 crm-muted shrink-0" })) : (_jsx(ChevronDown, { className: "w-3.5 h-3.5 crm-muted shrink-0" }))] }), isOpen && (_jsx("div", { className: "border-t border-[var(--crm-border)] overflow-x-auto", children: _jsxs("table", { className: "w-full text-left border-collapse text-[10.5px]", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-slate-500/8 crm-muted", children: [_jsx("th", { className: "py-1.5 px-2 font-semibold", children: "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440" }), _jsx("th", { className: "py-1.5 px-2 font-semibold", children: "\u0422\u0417" }), _jsx("th", { className: "py-1.5 px-2 font-semibold", children: "\u041D\u0430\u0439\u0434\u0435\u043D\u043E" }), _jsx("th", { className: "py-1.5 px-2 font-semibold text-center", children: "\u0421\u0442\u0430\u0442\u0443\u0441" })] }) }), _jsx("tbody", { className: "divide-y divide-[var(--crm-border)]", children: rows.map((r, rIdx) => {
                                                                                        const m = (r.match || "").toLowerCase();
                                                                                        const badge = m === "better" || m === "лучше"
                                                                                            ? { txt: "⬆️", cls: "text-teal-600 dark:text-teal-400", title: "Лучше ТЗ" }
                                                                                            : m === "ok" || m === "true" || m === "совпадает" || m === "соответствует"
                                                                                                ? { txt: "✅", cls: "text-emerald-600 dark:text-emerald-400", title: "Совпадает" }
                                                                                                : m === "missing" || m === "not_on_site" || m === "нет на сайте" || m === "не указано на сайте"
                                                                                                    ? { txt: "❓", cls: "text-sky-600 dark:text-sky-400", title: "Нет на сайте — уточняется по КП" }
                                                                                                    : m === "mismatch" || m === "worse" || m === "не совпадает"
                                                                                                        ? { txt: "❌", cls: "text-rose-600 dark:text-rose-400", title: "Не совпадает" }
                                                                                                        : { txt: "⚠️", cls: "text-amber-600 dark:text-amber-400", title: "Не сверено на сайте" };
                                                                                        return (_jsxs("tr", { children: [_jsx("td", { className: "py-1.5 px-2 font-medium text-[var(--crm-text)] align-top", children: r.name }), _jsx("td", { className: "py-1.5 px-2 crm-muted align-top", children: r.required }), _jsx("td", { className: "py-1.5 px-2 text-[var(--crm-text)] align-top", children: r.found }), _jsx("td", { className: `py-1.5 px-2 text-center align-top font-bold ${badge.cls}`, title: badge.title, children: badge.txt })] }, rIdx));
                                                                                    }) })] }) }))] })), offer.url && (_jsxs("button", { type: "button", onClick: () => openExternal(offer.url), className: "inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/12 text-blue-700 dark:text-blue-300 text-[10.5px] font-semibold", children: [_jsx(ExternalLink, { className: "w-3 h-3" }), "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0442\u043E\u0432\u0430\u0440 \u043D\u0430 \u0441\u0430\u0439\u0442\u0435"] }))] }, `${gIdx}-${oIdx}-${eIdx}`));
                                                }) }), (() => {
                                                if (!matchedMail)
                                                    return null;
                                                const conv = buildSellerConversation(matchedMail);
                                                if (conv.length === 0)
                                                    return null;
                                                const chatKey = `${card.cardKey}-${matchedMail.key || cIdx}`;
                                                const isChatOpen = openOfferChatKey === chatKey;
                                                const lastMsg = conv[conv.length - 1];
                                                const lastInb = [...conv].reverse().find((m) => m.направление === "inbound");
                                                const previewMsg = lastInb || lastMsg;
                                                return (_jsxs("div", { className: "rounded-lg border border-[var(--crm-border)] bg-[var(--crm-card)]/60 overflow-hidden", children: [_jsxs("button", { type: "button", onClick: () => setOpenOfferChatKey(isChatOpen ? null : chatKey), className: "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--crm-text)] hover:bg-slate-500/8 transition-colors text-left", children: [_jsxs("span", { className: "truncate", children: ["\uD83D\uDCAC \u041F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0430 \u0441 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u043E\u043C (", conv.length, ")"] }), isChatOpen ? (_jsx(ChevronUp, { className: "w-3.5 h-3.5 crm-muted shrink-0" })) : (_jsx(ChevronDown, { className: "w-3.5 h-3.5 crm-muted shrink-0" }))] }), !isChatOpen && previewMsg?.текст && (_jsxs("div", { className: "px-2.5 pb-1.5 text-[10.5px] crm-muted truncate", children: [previewMsg.направление === "inbound" ? "Поставщик: " : "Мы: ", previewMsg.текст.replace(/\s+/g, " ").trim().slice(0, 110)] })), isChatOpen && (_jsx("div", { className: "border-t border-[var(--crm-border)] p-2 space-y-2 max-h-80 overflow-y-auto", children: conv.map((msg, mIdx) => {
                                                                const isInb = msg.направление === "inbound";
                                                                const isRem = msg.направление === "reminder";
                                                                return (_jsxs("div", { className: `rounded-lg p-2 text-[11px] leading-relaxed border ${isInb
                                                                        ? "bg-emerald-500/8 border-emerald-500/25"
                                                                        : isRem
                                                                            ? "bg-amber-500/8 border-amber-500/25"
                                                                            : "bg-slate-500/8 border-[var(--crm-border)]"}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-2 text-[10px] font-semibold crm-muted mb-1", children: [_jsx("span", { children: isInb
                                                                                        ? "📥 Поставщик"
                                                                                        : isRem
                                                                                            ? "🔔 Напоминание"
                                                                                            : "📤 Наш запрос" }), msg.дата && _jsx("span", { children: formatNskDateTime(msg.дата, true) })] }), _jsx("div", { className: "whitespace-pre-wrap break-words text-[var(--crm-text)]", children: msg.текст })] }, msg.id || mIdx));
                                                            }) }))] }));
                                            })(), (() => {
                                                const validPhone = cleanContactPhone(card.phone);
                                                const validEmail = cleanContactEmail(card.email);
                                                if (!validPhone && !validEmail && !card.gisUrl)
                                                    return null;
                                                return (_jsxs("div", { className: "flex flex-wrap gap-2 pt-0.5", children: [validPhone && (_jsxs("a", { href: `tel:${sanitizeTel(validPhone)}`, className: "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium", children: [_jsx(Phone, { className: "w-3.5 h-3.5" }), validPhone] })), validEmail && (_jsxs("a", { href: `mailto:${validEmail}`, className: "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300 font-medium", children: [_jsx(Mail, { className: "w-3.5 h-3.5" }), validEmail] })), card.gisUrl && (_jsxs("button", { type: "button", onClick: () => openExternal(card.gisUrl), className: "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-500/12 font-medium", children: [_jsx(MapPin, { className: "w-3.5 h-3.5" }), "2\u0413\u0418\u0421"] }))] }));
                                            })()] }, card.cardKey || cIdx));
                                })] }));
                    })()] })), storefrontMode && isUnlocked && variantRecipients.length > 0 && (_jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-3", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-sm font-bold flex items-center gap-1.5", children: [_jsx(Mail, { className: "w-4 h-4 text-emerald-500" }), "\u041A\u0430\u043A \u0432\u044B\u043A\u0443\u043F\u0438\u0442\u044C / \u041A\u043E\u043C\u0443 \u043D\u0430\u043F\u0438\u0441\u0430\u0442\u044C (\u0412\u0430\u0440\u0438\u0430\u043D\u0442 ", selectedVariant, ")"] }), _jsx("p", { className: "text-xs crm-muted mt-0.5", children: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u043F\u043E \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0430\u043C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0433\u043E \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430 \u0437\u0430\u043A\u0443\u043F\u043A\u0438:" })] }), _jsx("div", { className: "space-y-3", children: variantRecipients.map((rec, rIdx) => {
                            if (rec.isPublicOffer) {
                                return (_jsxs("div", { className: "rounded-xl border border-teal-500/35 bg-teal-500/8 p-3 space-y-2.5 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2 font-bold text-[13px] text-teal-800 dark:text-teal-200", children: [_jsx(ShoppingCart, { className: "w-4 h-4 shrink-0" }), _jsxs("span", { children: ["\uD83D\uDED2 \u041F\u043E\u043A\u0443\u043F\u043A\u0430 \u043F\u043E \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u043E\u0439 \u043E\u0444\u0435\u0440\u0442\u0435 (", rec.seller, ")"] })] }), _jsx("div", { className: "rounded-lg bg-[var(--crm-surface)]/70 border border-teal-500/25 px-3 py-2 text-[11.5px] leading-relaxed text-[var(--crm-text)]", children: "\u2705 \u0426\u0435\u043D\u0430 \u0443\u0436\u0435 \u0437\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u043D\u0430 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u043E\u0439 \u043E\u0444\u0435\u0440\u0442\u043E\u0439 \u043D\u0430 \u0441\u0430\u0439\u0442\u0435 \u043F\u0440\u043E\u0434\u0430\u0432\u0446\u0430. \u041D\u0438\u043A\u043E\u043C\u0443 \u043F\u0438\u0441\u0430\u0442\u044C \u043F\u0438\u0441\u044C\u043C\u0430 \u0438 \u0436\u0434\u0430\u0442\u044C \u041A\u041F \u043D\u0435 \u043D\u0443\u0436\u043D\u043E \u2014 \u043F\u0440\u043E\u0441\u0442\u043E \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443 \u0442\u043E\u0432\u0430\u0440\u0430 \u043D\u0430 \u0441\u0430\u0439\u0442\u0435, \u043E\u0444\u043E\u0440\u043C\u0438\u0442\u0435 \u043F\u043E\u043A\u0443\u043F\u043A\u0443 (\u0438\u043B\u0438 \u0441\u0447\u0451\u0442 \u043D\u0430 \u0418\u041F/\u041E\u041E\u041E) \u0438 \u0437\u0430\u0431\u0435\u0440\u0438\u0442\u0435 \u0437\u0430\u043A\u0430\u0437." }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [rec.url && (_jsxs("button", { type: "button", onClick: () => openExternal(rec.url), className: "flex-1 min-w-[160px] py-2 px-3 rounded-xl crm-accent-btn font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.99] transition", children: [_jsx(ShoppingCart, { className: "w-3.5 h-3.5" }), "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043D\u0430 \u0441\u0430\u0439\u0442 \u0438 \u043A\u0443\u043F\u0438\u0442\u044C"] })), rec.phone && (_jsxs("a", { href: `tel:${sanitizeTel(rec.phone)}`, className: "flex-1 min-w-[160px] py-2 px-3 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.99] transition", children: [_jsx(Phone, { className: "w-3.5 h-3.5" }), "\u041F\u043E\u0437\u0432\u043E\u043D\u0438\u0442\u044C \u0432 \u043C\u0430\u0433\u0430\u0437\u0438\u043D (", rec.phone, ")"] }))] })] }, rec.key));
                            }
                            if (rec.confirmationState === "rejected") {
                                return (_jsxs("div", { className: "rounded-xl border border-rose-500/40 bg-rose-500/8 p-3 space-y-2 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2 font-bold text-[13px] text-rose-700 dark:text-rose-300", children: [_jsx(AlertTriangle, { className: "w-4 h-4 shrink-0" }), _jsxs("span", { children: ["\u274C ", rec.verdictBadge || "Поставщик отказал", " (", rec.seller, ")"] })] }), (rec.verdictProof || rec.refusalReason || rec.quoteText) && (_jsxs("div", { className: "rounded-lg bg-[var(--crm-surface)]/70 border border-[var(--crm-border)] px-3 py-2 text-[11px] italic crm-muted", children: ["\uD83D\uDCAC \u041F\u0440\u0443\u0444 \u0438\u0437 \u043F\u0438\u0441\u044C\u043C\u0430: \u00AB", rec.verdictProof || rec.refusalReason || rec.quoteText, "\u00BB"] })), _jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 crm-muted", children: [rec.email && _jsxs("span", { children: ["\u2709\uFE0F ", rec.email] }), rec.phone && _jsxs("span", { children: ["\uD83D\uDCDE ", rec.phone] })] })] }, rec.key));
                            }
                            if (rec.confirmationState === "waiting") {
                                return (_jsxs("div", { className: "rounded-xl border border-amber-500/35 bg-amber-500/8 p-3 space-y-2 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2 font-bold text-[13px] text-amber-800 dark:text-amber-200", children: [_jsx(Clock, { className: "w-4 h-4 shrink-0" }), _jsxs("span", { children: ["\u23F3 ", rec.verdictBadge || "Цена ещё не подтверждена", " (", rec.seller, ")"] })] }), rec.verdictProof ? (_jsxs("div", { className: "rounded-lg bg-[var(--crm-surface)]/70 border border-[var(--crm-border)] px-3 py-2 text-[11px] italic crm-muted", children: ["\uD83D\uDCAC \u041F\u0440\u0443\u0444 \u0438\u0437 \u043F\u0438\u0441\u044C\u043C\u0430: \u00AB", rec.verdictProof, "\u00BB"] })) : (_jsx("div", { className: "rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-[11.5px] leading-relaxed", children: "\u041F\u043E \u044D\u0442\u043E\u043C\u0443 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0443 \u0435\u0449\u0451 \u043D\u0435\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F \u043D\u0430\u043B\u0438\u0447\u0438\u044F \u0438 \u0446\u0435\u043D\u044B, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043B\u043E\u0442 \u043D\u0435 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043D\u0430 \u043A\u043B\u0438\u0435\u043D\u0442\u0441\u043A\u043E\u0439 \u0412\u0438\u0442\u0440\u0438\u043D\u0435." })), _jsx("div", { className: "flex flex-wrap gap-2", children: rec.email && (_jsxs("span", { className: "inline-flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-500/8 crm-muted", children: ["\u2709\uFE0F ", rec.email] })) })] }, rec.key));
                            }
                            const subject = buildEmailSubject();
                            const body = buildEmailBody(rec);
                            const copyKey = `tpl_${selectedVariant}_${rIdx}`;
                            const mailtoHref = rec.email
                                ? `mailto:${encodeURIComponent(rec.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                                : null;
                            return (_jsxs("div", { className: "rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-3 space-y-2.5 text-xs", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "font-bold text-[13px]", children: ["\u2709\uFE0F \u041F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A \u0441 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0439 \u0446\u0435\u043D\u043E\u0439 (", rec.seller, ")"] }), _jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 crm-muted", children: [rec.email && _jsxs("span", { children: ["\u2709\uFE0F ", rec.email] }), rec.phone && _jsxs("span", { children: ["\uD83D\uDCDE ", rec.phone] }), !rec.email && rec.url && (_jsx("button", { type: "button", onClick: () => openExternal(rec.url), className: "text-blue-600 dark:text-blue-400 underline", children: "\u0421\u0430\u0439\u0442 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0430" }))] })] }), _jsxs("div", { className: "rounded-lg bg-emerald-500/12 border border-emerald-500/25 px-3 py-2 text-[11.5px] text-emerald-900 dark:text-emerald-100 leading-relaxed", children: ["\u2705 \u041C\u044B \u0443\u0436\u0435 \u0441\u0432\u044F\u0437\u044B\u0432\u0430\u043B\u0438\u0441\u044C \u0441 \u044D\u0442\u0438\u043C \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u043E\u043C \u0441 \u043F\u043E\u0447\u0442\u044B", " ", _jsx("span", { className: "font-mono font-semibold", children: "anton.stepanov.tender@gmail.com" }), " ", "\u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u043B\u0438 \u0446\u0435\u043D\u0443. \u0427\u0442\u043E\u0431\u044B \u0431\u044B\u0441\u0442\u0440\u043E \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0441\u0447\u0451\u0442 \u043D\u0430 \u0441\u0432\u043E\u0451 \u044E\u0440\u043B\u0438\u0446\u043E/\u0418\u041F \u043F\u043E \u044D\u0442\u0438\u043C \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u043C, \u043E\u0442\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u043F\u0438\u0441\u044C\u043C\u043E \u0441\u043E \u0441\u0441\u044B\u043B\u043A\u043E\u0439 \u043D\u0430 \u043D\u0430\u0448 \u0437\u0430\u043F\u0440\u043E\u0441:"] }), rec.quoteText && (_jsxs("div", { className: "rounded-lg bg-[var(--crm-surface)]/70 border border-[var(--crm-border)] px-3 py-2 text-[11px] italic crm-muted", children: ["\uD83D\uDCAC \u041E\u0442\u0432\u0435\u0442 \u043F\u043E\u0441\u0442\u0430\u0432\u0449\u0438\u043A\u0430: \u00AB", rec.quoteText, "\u00BB"] })), _jsxs("div", { className: "rounded-xl bg-[var(--crm-surface)] border border-[var(--crm-border)] p-2.5 space-y-1.5", children: [_jsxs("div", { className: "text-[11px] crm-muted", children: [_jsx("span", { className: "font-semibold text-[var(--crm-text)]", children: "\u0422\u0435\u043C\u0430:" }), " ", subject] }), _jsx("pre", { className: "whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[var(--crm-text)]", children: body })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { type: "button", onClick: () => copyValue(copyKey, body, "Шаблон письма скопирован!"), className: "flex-1 min-w-[150px] py-2 px-3 rounded-xl crm-accent-btn font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.99] transition", children: copiedKey === copyKey ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-3.5 h-3.5" }), "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E!"] })) : (_jsxs(_Fragment, { children: [_jsx(Copy, { className: "w-3.5 h-3.5" }), "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u043F\u0438\u0441\u044C\u043C\u0430"] })) }), mailtoHref && (_jsxs("a", { href: mailtoHref, className: "flex-1 min-w-[150px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.99] transition", children: [_jsx(Mail, { className: "w-3.5 h-3.5" }), "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u043F\u043E\u0447\u0442\u0435 (", rec.email, ")"] })), rec.phone && (_jsxs("a", { href: `tel:${sanitizeTel(rec.phone)}`, className: "flex-1 min-w-[150px] py-2 px-3 rounded-xl bg-slate-500/12 hover:bg-slate-500/20 font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.99] transition", children: [_jsx(Phone, { className: "w-3.5 h-3.5" }), "\u041F\u043E\u0437\u0432\u043E\u043D\u0438\u0442\u044C (", rec.phone, ")"] }))] })] }, rec.key));
                        }) })] })), storefrontMode && isUnlocked && onGenerateDocs && (_jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-3 border border-sky-500/20", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 flex-wrap", children: [_jsxs("div", { className: "space-y-0.5 min-w-0", children: [_jsxs("div", { className: "text-sm font-bold flex items-center gap-1.5", children: [_jsx(FileText, { className: "w-4 h-4 text-sky-400 shrink-0" }), _jsxs("span", { children: ["\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B \u0434\u043B\u044F \u043F\u043E\u0434\u0430\u0447\u0438 \u0437\u0430\u044F\u0432\u043A\u0438 (\u0412\u0430\u0440\u0438\u0430\u043D\u0442 ", selectedVariant, ")"] })] }), _jsx("div", { className: "text-[11px] crm-muted", children: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044F 4 \u0433\u043E\u0442\u043E\u0432\u044B\u0445 \u0444\u0430\u0439\u043B\u043E\u0432 .docx \u0431\u0435\u0437 \u0432\u044B\u0447\u0438\u0442\u043A\u0438 \u0422\u0417 \u0432\u0440\u0443\u0447\u043D\u0443\u044E" })] }), onOpenCompanyProfile && (_jsxs("button", { type: "button", onClick: () => {
                                    haptic("light");
                                    onOpenCompanyProfile();
                                }, className: "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--crm-border)] bg-slate-500/8 hover:bg-slate-500/15 text-[11px] font-semibold transition shrink-0", children: [_jsx(Edit3, { className: "w-3 h-3" }), hasCompanyProfile ? "Реквизиты" : "Заполнить реквизиты"] }))] }), _jsxs("div", { className: "flex items-center justify-between gap-2 rounded-xl bg-slate-500/8 border border-[var(--crm-border)] px-3 py-2 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx(Building2, { className: "w-3.5 h-3.5 text-sky-400 shrink-0" }), _jsx("span", { className: "truncate", children: hasCompanyProfile
                                            ? `${companyProfile?.full_name}${companyProfile?.inn ? ` (ИНН ${companyProfile.inn})` : ""}`
                                            : "Реквизиты ИП/ООО не заполнены — спросим при нажатии" })] }), hasCompanyProfile && (_jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-emerald-400 shrink-0" }))] }), submissionPack?.checklist && submissionPack.checklist.length > 0 && (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-1.5", children: submissionPack.checklist.map((ch) => (_jsxs("div", { className: "rounded-xl bg-slate-500/6 border border-[var(--crm-border)] px-2.5 py-2 flex items-start gap-2", children: [_jsx("span", { className: `mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${ch.status === "auto_docx"
                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                        : ch.status === "auto_etp"
                                            ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`, children: ch.status === "auto_docx"
                                        ? "DOCX"
                                        : ch.status === "auto_etp"
                                            ? "ЭТП"
                                            : "ПРОВЕРИТЬ" }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-xs font-semibold leading-snug", children: ch.title }), ch.note && (_jsx("div", { className: "text-[11px] crm-muted leading-snug", children: ch.note }))] })] }, ch.id))) })), _jsx("button", { type: "button", disabled: generatingDocs, onClick: () => {
                            haptic("light");
                            void onGenerateDocs(selectedVariant);
                        }, className: "w-full py-3 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-[0.99] transition", children: generatingDocs ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), _jsx("span", { children: "\u0424\u043E\u0440\u043C\u0438\u0440\u0443\u0435\u043C 4 \u0444\u0430\u0439\u043B\u0430 .docx..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Sparkles, { className: "w-4 h-4" }), _jsx("span", { children: hasCompanyProfile
                                        ? `Сформировать документы (.docx) — Вариант ${selectedVariant}`
                                        : "Указать реквизиты и сформировать документы (.docx)" })] })) }), generatedDocsResult &&
                        generatedDocsResult.number === tender.number &&
                        generatedDocsResult.variant === selectedVariant && (_jsxs("div", { className: "rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 space-y-2", children: [_jsxs("div", { className: "text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5", children: [_jsx(CheckCircle2, { className: "w-4 h-4 shrink-0" }), _jsx("span", { children: generatedDocsResult.sent_to_telegram
                                            ? `Готово! Отправлены ${generatedDocsResult.telegram_sent_count} файла .docx (Вариант ${generatedDocsResult.variant}) вам в чат с ботом.`
                                            : `Готово! Пакет из ${generatedDocsResult.files.length} файлов .docx сформирован (Вариант ${generatedDocsResult.variant}).` })] }), _jsx("div", { className: "grid grid-cols-1 gap-1.5", children: generatedDocsResult.files.map((f) => (_jsxs("button", { type: "button", onClick: () => {
                                        haptic("light");
                                        downloadBase64Docx(f.filename, f.base64);
                                    }, className: "w-full rounded-xl bg-[var(--crm-surface)] border border-[var(--crm-border)] hover:border-emerald-400/50 px-3 py-2 flex items-center justify-between gap-2 text-left transition", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-xs font-semibold truncate", children: f.title }), _jsx("div", { className: "text-[10px] crm-muted truncate", children: f.filename })] }), _jsxs("span", { className: "inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 shrink-0", children: [_jsx(Download, { className: "w-3.5 h-3.5" }), "\u0421\u043A\u0430\u0447\u0430\u0442\u044C"] })] }, f.filename))) })] })), submissionItems.length > 0 && (_jsxs("div", { className: "rounded-xl border border-[var(--crm-border)] bg-slate-500/5 overflow-hidden", children: [_jsxs("button", { type: "button", onClick: () => {
                                    haptic("light");
                                    setSpecsCheatOpen((v) => !v);
                                }, className: "w-full px-3 py-2.5 flex items-center justify-between gap-2 text-xs font-semibold hover:bg-slate-500/10 transition", children: [_jsxs("span", { children: ["\uD83D\uDCCB \u0428\u043F\u0430\u0440\u0433\u0430\u043B\u043A\u0430 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A \u0434\u043B\u044F \u042D\u0422\u041F (", submissionItems.length, " \u043F\u043E\u0437.)"] }), specsCheatOpen ? (_jsx(ChevronUp, { className: "w-4 h-4 crm-muted shrink-0" })) : (_jsx(ChevronDown, { className: "w-4 h-4 crm-muted shrink-0" }))] }), specsCheatOpen && (_jsx("div", { className: "px-3 pb-3 pt-1 space-y-3 border-t border-[var(--crm-border)]", children: submissionItems.map((it, itemIdx) => (_jsxs("div", { className: "rounded-xl bg-[var(--crm-surface)] border border-[var(--crm-border)] p-2.5 space-y-2 text-xs", children: [_jsxs("div", { className: "font-semibold leading-snug", children: [it.idx, ". ", it.name, it.quantity != null ? ` — ${it.quantity} ${it.unit || ""}` : ""] }), _jsx("div", { className: "grid grid-cols-1 gap-1 text-[11px]", children: [
                                                { label: "Товарный знак", val: it.brand, key: `brand-${itemIdx}` },
                                                { label: "Страна (ОКСМ)", val: it.country, key: `country-${itemIdx}` },
                                                { label: "Реестр (ГИСП/РРП)", val: it.registry, key: `reg-${itemIdx}` },
                                            ].map((row) => (_jsxs("div", { className: "flex items-center justify-between gap-2 rounded-lg bg-slate-500/6 px-2 py-1", children: [_jsxs("span", { className: "crm-muted shrink-0", children: [row.label, ":"] }), _jsx("span", { className: "font-medium truncate flex-1 text-right", children: row.val }), _jsx("button", { type: "button", onClick: () => copyValue(row.key, row.val, `${row.label}: скопировано`), className: "p-1 rounded-md hover:bg-slate-500/15 text-sky-400 shrink-0", title: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C", children: copiedKey === row.key ? (_jsx(Check, { className: "w-3 h-3 text-emerald-400" })) : (_jsx(Copy, { className: "w-3 h-3" })) })] }, row.key))) }), it.specs && it.specs.length > 0 && (_jsxs("div", { className: "space-y-1 pt-1 border-t border-[var(--crm-border)]", children: [_jsx("div", { className: "text-[10px] font-semibold uppercase tracking-wider crm-muted", children: "\u041A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438 (\u0431\u0435\u0437 \u2265/\u2264)" }), it.specs.map((sp, spIdx) => {
                                                    const spKey = `sp-${itemIdx}-${spIdx}`;
                                                    return (_jsxs("div", { className: `flex items-start justify-between gap-2 rounded-lg px-2 py-1 text-[11px] ${sp.is_manual_check
                                                            ? "bg-amber-500/10 border border-amber-500/20"
                                                            : "bg-slate-500/5"}`, children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "crm-muted", children: sp.name }), _jsx("div", { className: "font-semibold break-words", children: sp.concrete_value })] }), _jsx("button", { type: "button", onClick: () => copyValue(spKey, sp.concrete_value, "Показатель скопирован"), className: "p-1 rounded-md hover:bg-slate-500/15 text-sky-400 shrink-0 mt-0.5", title: "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435", children: copiedKey === spKey ? (_jsx(Check, { className: "w-3 h-3 text-emerald-400" })) : (_jsx(Copy, { className: "w-3 h-3" })) })] }, spKey));
                                                })] }))] }, `${it.idx}-${itemIdx}`))) }))] })), submissionPack?.manual_notes && submissionPack.manual_notes.length > 0 && (_jsxs("div", { className: "rounded-xl bg-amber-500/10 border border-amber-500/25 p-2.5 space-y-1", children: [_jsxs("div", { className: "text-xs font-semibold text-amber-300 flex items-center gap-1.5", children: [_jsx(AlertTriangle, { className: "w-3.5 h-3.5 shrink-0" }), _jsx("span", { children: "\u0427\u0442\u043E \u043F\u0435\u0440\u0435\u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u0435\u0440\u0435\u0434 \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u0438\u0435\u043C \u042D\u0426\u041F" })] }), _jsx("ul", { className: "list-disc pl-4 space-y-0.5 text-[11px] leading-snug crm-muted", children: submissionPack.manual_notes.map((note, idx) => (_jsx("li", { children: note }, idx))) })] }))] })), isUnlocked && (_jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-3", children: [_jsxs("div", { className: "text-sm font-semibold flex items-center gap-1.5", children: [_jsx(Package, { className: "w-4 h-4 text-indigo-500" }), "\u0421\u043F\u0435\u0446\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F \u043F\u043E \u0422\u0417 \u0438 \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F \u043A\u043E\u043D\u0442\u0440\u0430\u043A\u0442\u0430"] }), items.length > 0 && (_jsx("div", { className: "space-y-1.5", children: items.map((it, idx) => (_jsxs("div", { className: "rounded-xl bg-slate-500/6 p-2.5 text-xs flex items-start justify-between gap-2", children: [_jsxs("div", { className: "space-y-0.5 min-w-0", children: [_jsxs("div", { className: "font-medium", children: [it.idx ?? idx + 1, ". ", it.name] }), _jsxs("div", { className: "crm-muted", children: ["\u041A\u043E\u043B-\u0432\u043E: ", it.quantity, " ", it.unit || "", it.okpd2 ? ` · ОКПД2 ${it.okpd2}` : ""] })] }), it.total_price !== null && it.total_price !== undefined && (_jsx("div", { className: "font-semibold shrink-0", children: formatRub(it.total_price) }))] }, idx))) })), (tender.security_info ||
                        (conditions?.licenses &&
                            !/^(?:нет|не\s+требу[ею]тся|отсутству|—|-)$/i.test(conditions.licenses.trim()))) && (_jsxs("div", { className: "space-y-1.5 text-xs pt-1 border-t border-[var(--crm-border)]", children: [tender.security_info && (_jsxs("div", { children: [_jsx("span", { className: "crm-muted", children: "\u041E\u0431\u0435\u0441\u043F\u0435\u0447\u0435\u043D\u0438\u0435:" }), " ", tender.security_info] })), conditions?.licenses &&
                                !/^(?:нет|не\s+требу[ею]тся|отсутству|—|-)$/i.test(conditions.licenses.trim()) && (_jsxs("div", { children: [_jsx("span", { className: "crm-muted", children: "\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u0438:" }), " ", conditions.licenses] }))] }))] })), storefrontMode && isUnlocked && (_jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-2", children: [_jsx("label", { className: "text-sm font-semibold block", children: "\uD83D\uDCDD \u041C\u043E\u044F \u0437\u0430\u043C\u0435\u0442\u043A\u0430 \u043F\u043E \u0442\u0435\u043D\u0434\u0435\u0440\u0443" }), _jsx("textarea", { value: userNotes, onChange: (e) => setUserNotes(e.target.value), rows: 2, placeholder: "\u0417\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u0441\u0432\u043E\u0438 \u0440\u0430\u0441\u0447\u0451\u0442\u044B, \u043A\u043E\u043D\u0442\u0430\u043A\u0442 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0430 \u0438\u043B\u0438 \u0441\u0442\u0430\u0442\u0443\u0441 \u0437\u0430\u044F\u0432\u043A\u0438...", className: "w-full rounded-xl border border-[var(--crm-border)] bg-slate-500/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" }), userNotesDirty && (_jsxs("button", { type: "button", disabled: saving, onClick: () => {
                            haptic("success");
                            void onSaveUserNotes?.(userNotes);
                        }, className: "crm-accent-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold", children: [_jsx(Save, { className: "w-3.5 h-3.5" }), saving ? "Сохранение..." : "Сохранить заметку"] }))] })), !storefrontMode && (mailState || inquirySuppliers.length > 0) && (_jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-2.5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-sm font-semibold flex items-center gap-1.5", children: [_jsx(Mail, { className: "w-4 h-4 text-blue-500" }), "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u0446\u0435\u043D \u0438 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0430"] }), mailState?.обновлено && (_jsx("span", { className: "text-[11px] crm-muted", children: formatNskDateTime(mailState.обновлено) }))] }), mailState?.итог && (_jsxs("div", { className: "rounded-xl bg-slate-500/8 p-3 text-xs space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "font-semibold", children: ["\u0418\u0442\u043E\u0433 \u041F\u043E\u0447\u0442\u0430\u043B\u044C\u043E\u043D\u0430: ", mailState.итог.запрос_цен || mailState.запрос_цен || "—"] }), mailState.итог.всего_позиций ? (_jsxs("span", { className: "crm-muted", children: [mailState.итог.подтверждено_позиций ?? 0, "/", mailState.итог.всего_позиций, " \u043F\u043E\u0437."] })) : null] }), mailState.итог.прибыль_новая && (_jsxs("div", { className: "crm-muted", children: ["\u041D\u043E\u0432\u0430\u044F \u043F\u0440\u0438\u0431\u044B\u043B\u044C:", " ", _jsx("b", { className: "text-[var(--crm-text)]", children: formatRub(mailState.итог.прибыль_новая) }), mailState.итог.разница_закупки
                                        ? ` (изм. закупки ${formatRub(mailState.итог.разница_закупки)})`
                                        : ""] })), mailState.итог.внимание && (_jsxs("div", { className: "text-amber-700 dark:text-amber-300 font-medium", children: ["\u26A0\uFE0F ", mailState.итог.внимание] }))] })), mailState?.продавцы && mailState.продавцы.length > 0 && (_jsx("div", { className: "space-y-2", children: mailState.продавцы.map((r, idx) => {
                            const threadKey = r.key || String(idx);
                            const isOpen = Boolean(openThreads[threadKey]);
                            const conversation = buildSellerConversation(r);
                            const answers = r.ответы ? Object.entries(r.ответы) : [];
                            const hasThreadDetails = conversation.length > 0 || answers.length > 0;
                            const isNoReply = r.статус === "не_ответил";
                            return (_jsxs("div", { className: `rounded-xl border overflow-hidden text-xs ${isNoReply
                                    ? "bg-amber-500/6 border-amber-500/35"
                                    : "bg-slate-500/6 border-[var(--crm-border)]"}`, children: [isNoReply && (_jsxs("div", { className: "px-3 pt-2 pb-2 bg-amber-500/12 border-b border-amber-500/25 flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-200", children: [_jsx(Clock, { className: "w-3.5 h-3.5 shrink-0" }), _jsx("span", { children: "\u041D\u0435\u0442 \u043E\u0442\u0432\u0435\u0442\u0430 \u043F\u043E \u043F\u043E\u0447\u0442\u0435 \u0437\u0430 24 \u0440\u0430\u0431. \u0447 \u2014 \u043D\u0435 \u0437\u0432\u043E\u043D\u0438\u043C (\u0442\u0435\u043D\u0434\u0435\u0440 \u043D\u0435 \u043F\u0440\u043E\u0445\u043E\u0434\u0438\u0442 \u043D\u0430 \u0412\u0438\u0442\u0440\u0438\u043D\u0443)" })] })), _jsxs("div", { className: "p-3 flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "font-semibold truncate", children: [r.продавец || "Продавец", " ", _jsxs("span", { className: "crm-muted font-normal", children: ["(", r.роль || "продавец", ")"] })] }), r.статус === "публичная_оферта" ? (_jsxs("div", { className: "mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 text-[10.5px] font-semibold", children: [_jsx(CheckCircle2, { className: "w-3 h-3" }), "\u0426\u0435\u043D\u0430 \u043F\u043E \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u043E\u0439 \u043E\u0444\u0435\u0440\u0442\u0435 (\u0437\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F)"] })) : (_jsx("div", { className: "crm-muted mt-0.5 break-all", children: [
                                                            r.email || null,
                                                            `статус: ${r.статус === "не_ответил" ? "нет ответа (24 раб. ч)" : r.статус || "—"}`,
                                                            r.preliminary_price != null && Number(r.preliminary_price) > 0 && r.статус !== "ответил"
                                                                ? (() => {
                                                                    const est = calcPreliminaryEstimate(tender, r.preliminary_price);
                                                                    if (!est)
                                                                        return null;
                                                                    const diffStr = est.diffPct !== null ? ` (${est.diffPct > 0 ? `+${est.diffPct}` : est.diffPct}% к тендеру)` : "";
                                                                    const profStr = est.prelimProfit !== null ? ` · предв. прибыль ${est.prelimProfit >= 0 ? "+" : ""}${formatRub(est.prelimProfit)}` : "";
                                                                    return `предв. ~${formatRub(est.prelimPrice)}${est.isPerUnit ? "/ед." : ""}${diffStr}${profStr} · ожидается подтверждение`;
                                                                })()
                                                                : null,
                                                            r.отправлено_в ? `отпр. ${formatNskDateTime(r.отправлено_в)}` : null,
                                                            r.ответ_в ? `ответ ${formatNskDateTime(r.ответ_в)}` : null,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" · ") }))] }), _jsx("div", { className: "flex items-center gap-1.5 shrink-0", children: r.email && (_jsxs("a", { href: `mailto:${r.email}`, title: `Написать: ${r.email}`, "aria-label": "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C", className: "inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300 font-medium", children: [_jsx(Mail, { className: "w-3.5 h-3.5" }), _jsx("span", { className: "hidden sm:inline", children: "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C" })] })) })] }), hasThreadDetails && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", onClick: () => {
                                                    haptic("select");
                                                    setOpenThreads((prev) => ({
                                                        ...prev,
                                                        [threadKey]: !prev[threadKey],
                                                    }));
                                                }, className: "w-full px-3 py-2 border-t border-[var(--crm-border)] bg-slate-500/5 hover:bg-slate-500/10 flex items-center justify-between text-[11px] font-medium crm-muted transition", children: [_jsx("span", { children: isOpen
                                                            ? "Свернуть переписку"
                                                            : `Открыть переписку (${conversation.length + answers.length})` }), isOpen ? (_jsx(ChevronUp, { className: "w-3.5 h-3.5" })) : (_jsx(ChevronDown, { className: "w-3.5 h-3.5" }))] }), isOpen && (_jsxs("div", { className: "p-3 pt-2.5 border-t border-[var(--crm-border)] bg-[var(--crm-surface)]/60 space-y-3", children: [conversation.length > 0 && (_jsx("div", { className: "space-y-2", children: conversation.map((msg, mIdx) => {
                                                            const dtText = msg.дата
                                                                ? /^\d{2}\.\d{2}\.\d{4}/.test(msg.дата)
                                                                    ? msg.дата
                                                                    : formatNskDateTime(msg.дата, true)
                                                                : null;
                                                            if (msg.направление === "reminder") {
                                                                return (_jsxs("div", { className: "rounded-xl bg-amber-500/12 border border-amber-500/30 px-3 py-2 text-[11px] flex items-center justify-between gap-2", children: [_jsxs("span", { className: "font-semibold text-amber-800 dark:text-amber-200 inline-flex items-center gap-1.5", children: [_jsx(Bell, { className: "w-3.5 h-3.5 shrink-0" }), "\u041F\u043E\u0432\u0442\u043E\u0440\u043D\u043E\u0435 \u043D\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u043D\u0438\u0435", msg.номер_напоминания ? ` #${msg.номер_напоминания}` : ""] }), dtText && (_jsx("span", { className: "text-[10px] crm-muted shrink-0", children: dtText }))] }, msg.id || mIdx));
                                                            }
                                                            const isInbound = msg.направление === "inbound";
                                                            return (_jsxs("div", { className: `rounded-xl p-2.5 text-[11.5px] leading-relaxed border space-y-1 ${isInbound
                                                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                                                    : "bg-blue-500/8 border-blue-500/25"}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-2 text-[10.5px]", children: [_jsx("span", { className: `font-semibold ${isInbound
                                                                                    ? "text-emerald-700 dark:text-emerald-300"
                                                                                    : "text-blue-700 dark:text-blue-300"}`, children: isInbound ? "📩 Нам ответили" : "📤 Мы отправили" }), dtText && _jsx("span", { className: "crm-muted", children: dtText })] }), _jsx("div", { className: "whitespace-pre-wrap break-words text-[var(--crm-text)]", children: msg.текст })] }, msg.id || mIdx));
                                                        }) })), answers.length > 0 && (_jsxs("div", { className: "space-y-1.5", children: [_jsx("div", { className: "text-[11px] font-semibold crm-muted uppercase tracking-wide", children: "\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u043D\u044B\u0435 \u043E\u0442\u0432\u0435\u0442\u044B \u0438 \u0446\u0438\u0442\u0430\u0442\u044B" }), _jsx("div", { className: "space-y-1.5", children: answers.map(([itemIdx, ans]) => {
                                                                    const posInfo = mailState?.позиции?.find((p) => String(p.idx) === String(itemIdx));
                                                                    return (_jsxs("div", { className: "rounded-lg bg-slate-500/8 p-2.5 text-[11px] space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 font-semibold", children: [_jsxs("span", { className: "truncate", children: ["\u041F\u043E\u0437. ", itemIdx, posInfo?.название ? `: ${posInfo.название}` : ""] }), _jsx("span", { className: ans.в_наличии
                                                                                            ? "text-emerald-600 dark:text-emerald-400 shrink-0"
                                                                                            : "text-rose-600 dark:text-rose-400 shrink-0", children: ans.в_наличии
                                                                                            ? ans.цена
                                                                                                ? formatRub(ans.цена)
                                                                                                : "В наличии"
                                                                                            : "Нет в наличии / Отказ" })] }), (ans.срок || ans.ндс) && (_jsx("div", { className: "crm-muted", children: [
                                                                                    ans.срок ? `срок: ${ans.срок}` : null,
                                                                                    ans.ндс ? `НДС: ${ans.ндс}` : null,
                                                                                ]
                                                                                    .filter(Boolean)
                                                                                    .join(" · ") })), ans.цитата && (_jsxs("blockquote", { className: "italic border-l-2 border-emerald-500/60 pl-2 text-[var(--crm-text)]", children: ["\u00AB", ans.цитата, "\u00BB"] })), ans.примечание && (_jsx("div", { className: "crm-muted", children: ans.примечание }))] }, itemIdx));
                                                                }) })] }))] }))] }))] }, threadKey));
                        }) })), inquirySuppliers.length > 0 && (_jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "text-xs font-medium crm-muted", children: ["\u041E\u043F\u0442\u043E\u0432\u0438\u043A\u0438 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u041A\u041F (", inquirySuppliers.length, "):"] }), inquirySuppliers.map((c, idx) => (_jsxs("div", { className: "rounded-xl bg-slate-500/6 p-2.5 text-xs flex items-center justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "font-medium truncate", children: c.seller || c.name || "Поставщик" }), _jsx("div", { className: "crm-muted truncate", children: [c.city, c.status, c.price ? formatRub(c.price) : null]
                                                    .filter(Boolean)
                                                    .join(" · ") || c.email || "—" })] }), _jsx("div", { className: "flex items-center gap-1.5 shrink-0", children: c.email && (_jsx("a", { href: `mailto:${c.email}`, className: "p-1.5 rounded-lg bg-blue-500/12 text-blue-700 dark:text-blue-300", children: _jsx(Mail, { className: "w-3.5 h-3.5" }) })) })] }, `${c.seller || c.name || idx}`)))] }))] })), !storefrontMode && (_jsxs(_Fragment, { children: [tender.drive_path && (_jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-2", children: [_jsx("div", { className: "text-xs font-semibold crm-muted uppercase tracking-wide", children: "\u041F\u0430\u043F\u043A\u0430 \u043D\u0430 \u0414\u0438\u0441\u043A\u0435" }), _jsxs("button", { type: "button", onClick: () => copyValue("drive", tender.drive_path, "Путь на Диске скопирован"), className: "w-full text-left rounded-xl bg-slate-500/8 px-3 py-2 text-xs flex items-center justify-between gap-2", children: [_jsxs("span", { className: "flex items-center gap-1.5 truncate", children: [_jsx(FolderOpen, { className: "w-3.5 h-3.5 crm-muted shrink-0" }), _jsx("span", { className: "truncate", children: tender.drive_path })] }), _jsx("span", { className: "crm-muted shrink-0", children: copiedKey === "drive" ? "Скопировано" : "Копировать" })] })] })), events.length > 0 && (_jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-2.5", children: [_jsxs("div", { className: "text-sm font-semibold flex items-center gap-1.5", children: [_jsx(History, { className: "w-4 h-4 crm-muted" }), "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043F\u043E \u0442\u0435\u043D\u0434\u0435\u0440\u0443 (", events.length, ")"] }), _jsx("div", { className: "space-y-2", children: events.map((ev) => (_jsxs("div", { className: "text-xs flex items-start justify-between gap-2 border-b border-[var(--crm-border)] pb-2 last:border-b-0 last:pb-0", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: ev.title }), _jsx("div", { className: "text-[11px] crm-muted", children: ev.actor })] }), _jsx("span", { className: "text-[10px] crm-muted shrink-0", children: formatNskDateTime(ev.created_at, true) })] }, ev.id))) })] }))] })), (!storefrontMode || isUnlocked) && (_jsxs("section", { className: "crm-surface rounded-2xl p-4 space-y-2 text-xs", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "space-y-0.5 min-w-0", children: [_jsx("div", { className: "font-semibold flex items-center gap-1", children: _jsx("span", { children: "\uD83D\uDCCD \u041A\u0443\u0434\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0442\u044C:" }) }), _jsx("div", { className: "crm-muted break-words", children: tender.delivery_address || `г. ${cityLabel}` })] }), tender.gis_to_url && (_jsxs("button", { type: "button", onClick: () => openExternal(tender.gis_to_url), className: "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-500/12 hover:bg-slate-500/20 font-medium shrink-0", children: [_jsx(MapPin, { className: "w-3.5 h-3.5 text-rose-500" }), "2\u0413\u0418\u0421"] }))] }), customer && (_jsxs("div", { className: "pt-2 border-t border-[var(--crm-border)] flex items-start gap-1.5", children: [_jsx(Building2, { className: "w-3.5 h-3.5 crm-muted shrink-0 mt-0.5" }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "font-semibold", children: ["\uD83C\uDFDB\uFE0F ", customer.short_name || customer.name] }), _jsx("div", { className: "crm-muted mt-0.5", children: [
                                            customer.law,
                                            customer.inn ? `ИНН ${customer.inn}` : null,
                                            customer.platform,
                                        ]
                                            .filter(Boolean)
                                            .join(" · ") })] })] })), (terms?.delivery_terms || terms?.payment || tender.deliveries_count) && (_jsxs("div", { className: "pt-2 border-t border-[var(--crm-border)] space-y-1", children: [terms?.delivery_terms && (_jsxs("div", { children: [_jsx("span", { className: "crm-muted", children: "\uD83D\uDE9A \u0421\u0440\u043E\u043A \u043F\u043E\u0441\u0442\u0430\u0432\u043A\u0438:" }), " ", terms.delivery_terms, tender.deliveries_count ? ` · Поставок: ${tender.deliveries_count}` : ""] })), !terms?.delivery_terms && tender.deliveries_count && (_jsxs("div", { children: [_jsx("span", { className: "crm-muted", children: "\uD83D\uDE9A \u041F\u043E\u0441\u0442\u0430\u0432\u043E\u043A:" }), " ", tender.deliveries_count] })), terms?.payment && (_jsxs("div", { children: [_jsx("span", { className: "crm-muted", children: "\uD83D\uDCB3 \u041E\u043F\u043B\u0430\u0442\u0430:" }), " ", terms.payment] }))] })), tender.eis_url && (_jsxs("button", { type: "button", onClick: () => openExternal(tender.eis_url), className: "w-full mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl crm-accent-btn text-xs font-semibold shadow-xs active:scale-[0.99] transition", children: [_jsx(ExternalLink, { className: "w-3.5 h-3.5" }), "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u043A\u0443\u043F\u043A\u0443 \u0432 \u0415\u0418\u0421 (zakupki.gov) \u00B7 \u2116 ", tender.number] }))] }))] }));
}
