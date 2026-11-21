import { formatRub, getDeadlineInfo, isTenderAllPublicOffer, isTenderStorefrontReady } from "./format.js?v=mwq061ef";
export const ACTIVE_PIPELINE_LANES = [
    {
        id: "blanks",
        stage: "blanks",
        stepNumber: 1,
        folderPath: "Бланки/",
        emoji: "📋",
        bot: "Фатима",
        shortLabel: "Бланки",
        title: "1. Бланки/ · Фатима",
        goalText: "Разбор ТЗ и ограничений (≥ 60 ч, поставка ≤ 21 дн.) → в Поиск цен/.",
    },
    {
        id: "prices",
        stage: "prices",
        stepNumber: 2,
        folderPath: "Поиск цен/",
        emoji: "🔍",
        bot: "Черипикер",
        shortLabel: "Поиск цен",
        title: "2. Поиск цен/ · Черипикер",
        goalText: "Поиск 2 цен в НСО: розница → в К расчёту/, опт/КП → в Запрос цен/.",
    },
    {
        id: "inquiry",
        stage: "inquiry",
        stepNumber: 3,
        folderPath: "Запрос цен/",
        emoji: "✉️",
        bot: "Почтальон КП",
        shortLabel: "Запрос цен",
        title: "3. Запрос цен/ · Почтальон КП",
        goalText: "Сбор КП у оптовиков (SLA 24 раб. ч) → в К расчёту/.",
    },
    {
        id: "calc",
        stage: "calc",
        stepNumber: 4,
        folderPath: "К расчёту/",
        emoji: "🧮",
        bot: "Очкарик",
        shortLabel: "К расчёту",
        title: "4. К расчёту/ · Очкарик",
        goalText: "Расчёт маржи А/Б (прибыль ≥ 11 000 ₽) → напрямую в CRM/.",
    },
    {
        id: "crm_work",
        stage: "tenders",
        stepNumber: 5,
        folderPath: "CRM/",
        emoji: "📬",
        bot: "Почтальон + Ревизор",
        shortLabel: "CRM",
        title: "5. CRM/ · Доводка и ОТК",
        goalText: "Подтверждение цен/наличия + 6 проверок ОТК Ревизора → в Витрина/.",
    },
    {
        id: "storefront",
        stage: "tenders",
        stepNumber: 6,
        folderPath: "Витрина/",
        emoji: "✅",
        bot: "ОТК Ревизор",
        shortLabel: "Витрина",
        title: "6. Витрина/ · ОТК ✅",
        goalText: "Все 6 условий ОТК выполнены: лот опубликован на клиентской Витрине.",
    },
];
export const STAGE_LABELS_RU = {
    blanks: "Фатима (Бланки)",
    prices: "Черипикер (Цены)",
    inquiry: "Почтальон (КП)",
    calc: "Очкарик (Расчёт)",
    review: "Сисадмин (Ввод)",
    tenders: "CRM (Доводка / Витрина)",
    unprofitable: "Нерентабельно",
    overdue: "Просрочено",
    rejected: "Отсев",
};
export function getRejectFolderCategory(t) {
    const folder = t.details?.pipeline?.folder || "";
    const status = t.pipeline_status || "";
    for (const name of ["Запрещено", "Долгая поставка", "Не поставки"]) {
        if (folder.includes(name) || status.includes(name))
            return name;
    }
    if (t.stage === "unprofitable")
        return "Нерентабельно";
    if (t.stage === "overdue")
        return "Просрочено";
    return "Отсев";
}
function buildSteps(activeIdx, statusMode, failedAtIdx) {
    const defs = [
        { id: "fatima", bot: "Фатима", label: "Бланки/", emoji: "📋" },
        { id: "cheripiker", bot: "Черипикер", label: "Поиск цен/", emoji: "🔍" },
        { id: "inquiry", bot: "Почтальон КП", label: "Запрос цен/", emoji: "✉️" },
        { id: "ochkarik", bot: "Очкарик", label: "К расчёту/", emoji: "🧮" },
        { id: "pochtalyon", bot: "Почтальон/ОТК", label: "CRM/", emoji: "📬" },
        { id: "storefront", bot: "Ревизор", label: "Витрина/", emoji: "✅" },
    ];
    return defs.map((d, idx) => {
        let state = "pending";
        if (statusMode === "done") {
            state = "done";
        }
        else if (statusMode === "rejected") {
            if (idx < failedAtIdx)
                state = "done";
            else if (idx === failedAtIdx)
                state = "rejected";
            else
                state = "pending";
        }
        else if (statusMode === "blocked") {
            if (idx < activeIdx)
                state = "done";
            else if (idx === activeIdx)
                state = "blocked";
            else
                state = "pending";
        }
        else {
            if (idx < activeIdx)
                state = "done";
            else if (idx === activeIdx)
                state = "active";
            else
                state = "pending";
        }
        return { ...d, state };
    });
}
function countQcPassed(t) {
    const dl = getDeadlineInfo(t.deadline_at);
    const checks = t.details?.qc?.checks;
    const list = [
        checks?.stage_ok ?? t.stage === "tenders",
        checks?.deadline_ok ?? dl.tone !== "expired",
        checks?.prices_confirmed_ok ?? t.prices_confirmed,
        checks?.no_refusals_ok ?? true,
        checks?.profit_ok ?? (t.profit !== null && Number(t.profit) >= 11000),
        checks?.docs_ok ?? Boolean(t.details?.items?.length),
    ];
    return {
        passed: list.filter(Boolean).length,
        total: list.length,
    };
}
/** Откуда взялась причина этапа. Только факты из карточки, без догадки. */
export function stageProof(t) {
    if (isTenderStorefrontReady(t))
        return "";
    const dl = getDeadlineInfo(t.deadline_at);
    const sellers = t.details?.mail_state?.продавцы || [];
    const quote = (t.details?.pipeline?.reject_proof || "").trim();
    const sellerLine = sellers
        .slice(0, 4)
        .map((s) => `${s.продавец || "поставщик"}: ${s.статус || "без статуса"}`)
        .join("; ");
    if (t.stage === "blanks") {
        return t.deadline_at
            ? `Срок в карточке: ${dl.nskFormatted}. Папка Бланки/, решение Фатимы ещё не записано.`
            : "В карточке нет срока подачи. Папка Бланки/.";
    }
    if (t.stage === "prices") {
        const found = t.details?.suppliers_prices?.length ?? 0;
        const total = t.details?.items?.length ?? 0;
        return total > 0
            ? `В расчёте цен: ${found} из ${total} позиций.`
            : "Файл цен ещё без позиций.";
    }
    if (t.stage === "inquiry") {
        return sellerLine || "В подтверждение.json ещё нет продавцов.";
    }
    if (t.stage === "calc" || t.stage === "review") {
        return t.profit !== null && t.profit !== undefined
            ? `В расчёте прибыль ${formatRub(t.profit)}, порог 11 000 ₽.`
            : "Прибыль в карточке ещё не записана. Папка ждёт Очкарика.";
    }
    if (t.stage === "tenders") {
        const blocker = t.details?.qc?.blockers?.[0];
        if (blocker)
            return `Проверка ОТК: ${blocker}`;
        if (sellerLine)
            return sellerLine;
        if (t.profit !== null && t.profit !== undefined) {
            return `В расчёте прибыль ${formatRub(t.profit)}. Цены подтверждены: ${t.prices_confirmed ? "да" : "нет"}.`;
        }
        return "В карточке нет ни проверки ОТК, ни ответа поставщика.";
    }
    if (t.stage === "unprofitable") {
        return t.profit !== null && t.profit !== undefined
            ? `В расчёте прибыль ${formatRub(t.profit)}, порог 11 000 ₽.`
            : "Суммы прибыли в карточке нет.";
    }
    if (t.stage === "overdue") {
        return t.deadline_at ? `Срок в карточке: ${dl.nskFormatted}.` : "Срок подачи в карточке не записан.";
    }
    if (quote)
        return quote;
    const reason = (t.details?.pipeline?.reject_reason || "").trim();
    const fromReason = reason.includes("Цитата:") ? reason.split("Цитата:").slice(1).join("Цитата:").trim() : "";
    return fromReason || "Цитаты из документа нет. Это старое решение без проверки фразы в файле.";
}
export function resolvePipelineView(t) {
    const meta = t.details?.pipeline;
    const dl = getDeadlineInfo(t.deadline_at);
    const mailSellers = t.details?.mail_state?.продавцы || [];
    const hasNoReply = mailSellers.some((s) => s.статус === "не_ответил");
    const hasRefusal = mailSellers.some((s) => s.статус === "отказ");
    const qc = t.details?.qc;
    const ready = isTenderStorefrontReady(t);
    if (t.stage === "blanks") {
        const hasItems = (t.details?.items?.length ?? 0) > 0;
        const hasDeadline = Boolean(t.deadline_at);
        const doneChecks = (hasDeadline ? 1 : 0) + (hasItems ? 1 : 0);
        return {
            laneId: "blanks",
            folderPath: "Бланки/",
            botName: "Фатима",
            shortTag: "Бланки/",
            stageBadge: "📋 1. Бланки/ · Фатима",
            substage: meta?.substage || "Ожидает разбора ТЗ",
            nextStepHint: "Далее: разбор ТЗ (≥ 60 ч, ≤ 21 дн.) → в Поиск цен/",
            progress: {
                done: doneChecks,
                total: 3,
                label: hasItems ? "ТЗ заполнено, проверка правил" : "Ждёт разбора ТЗ",
            },
            badgeCls: "bg-slate-500/12 text-slate-700 dark:text-slate-200 border-slate-500/25",
            stepNumber: 1,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: dl.tone === "expired",
            attentionText: dl.tone === "expired" ? "Срок истёк до разбора" : null,
            steps: buildSteps(0, dl.tone === "expired" ? "blocked" : "active", 0),
        };
    }
    if (t.stage === "prices") {
        const posFound = t.details?.suppliers_prices?.length ?? 0;
        const posTotal = t.details?.items?.length ?? 0;
        return {
            laneId: "prices",
            folderPath: "Поиск цен/",
            botName: "Черипикер",
            shortTag: "Поиск цен/",
            stageBadge: "🔍 2. Поиск цен/ · Черипикер",
            substage: meta?.substage || "Поиск 2 цен в НСО",
            nextStepHint: "Далее: в К расчёту/ (розница) или в Запрос цен/ (КП)",
            progress: {
                done: posFound,
                total: Math.max(1, posTotal),
                label: posTotal > 0 ? `Позиций с ценой: ${posFound}/${posTotal}` : "Поиск поставщиков",
            },
            badgeCls: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25",
            stepNumber: 2,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: dl.tone === "expired",
            attentionText: dl.tone === "expired" ? "Срок истёк на поиске цен" : null,
            steps: buildSteps(1, dl.tone === "expired" ? "blocked" : "active", 1),
        };
    }
    if (t.stage === "inquiry") {
        const sent = mailSellers.filter((s) => ["отправлено", "напоминание", "ответил", "не_ответил", "отказ"].includes(s.статус || "")).length;
        const answered = mailSellers.filter((s) => s.статус === "ответил").length;
        const total = mailSellers.length || t.details?.inquiry_suppliers?.length || 0;
        const sub = hasNoReply && answered === 0
            ? "Нет ответа за 24 раб. ч — недоступен"
            : answered > 0
                ? `Получено КП: ${answered} из ${total}`
                : sent > 0
                    ? `Отправлено ${sent} из ${total} писем`
                    : total > 0
                        ? `Собрано ${total} контактов для КП`
                        : "Подготовка рассылки КП";
        return {
            laneId: "inquiry",
            folderPath: "Запрос цен/",
            botName: "Почтальон КП",
            shortTag: "Запрос цен/",
            stageBadge: "✉️ 3. Запрос цен/ · Почтальон КП",
            substage: sub,
            nextStepHint: hasNoReply && answered === 0
                ? "До оптовиков не дописались за 24 раб. ч — не попадёт на Витрину"
                : "Далее: собрать КП → передать в К расчёту/",
            progress: {
                done: answered > 0 ? answered : sent,
                total: Math.max(1, total),
                label: sub,
            },
            badgeCls: hasNoReply && answered === 0
                ? "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30"
                : "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
            stepNumber: 3,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: (hasNoReply && answered === 0) || dl.tone === "expired",
            attentionText: hasNoReply && answered === 0 ? "Нет ответа за 24 раб. ч" : null,
            steps: buildSteps(2, (hasNoReply && answered === 0) || dl.tone === "expired" ? "blocked" : "active", 2),
        };
    }
    if (t.stage === "calc") {
        return {
            laneId: "calc",
            folderPath: "К расчёту/",
            botName: "Очкарик",
            shortTag: "К расчёту/",
            stageBadge: "🧮 4. К расчёту/ · Очкарик",
            substage: meta?.substage || "Расчёт маржи А/Б",
            nextStepHint: dl.tone === "expired"
                ? "Срок истёк → в Архив/Просрочено/"
                : "Далее: прибыль ≥ 11 000 ₽ → в CRM/ (или Архив/Нерентабельно/)",
            progress: {
                done: 1,
                total: 2,
                label: "Цены готовы, ждёт расчёта",
            },
            badgeCls: "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/25",
            stepNumber: 4,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: dl.tone === "expired",
            attentionText: dl.tone === "expired" ? "Срок истёк до расчёта" : null,
            steps: buildSteps(3, dl.tone === "expired" ? "blocked" : "active", 3),
        };
    }
    if (t.stage === "review") {
        return {
            laneId: "crm_work",
            folderPath: "CRM/",
            botName: "Очкарик / CRM",
            shortTag: "CRM/",
            stageBadge: "📬 5. CRM/ · Ввод",
            substage: meta?.substage || "Проверка фильтров перед доводкой",
            nextStepHint: dl.tone === "expired"
                ? "Срок истёк → в Архив/Просрочено/"
                : "Далее: подтверждение цен + ОТК → в Витрина/",
            progress: {
                done: 4,
                total: 6,
                label: "Маржа посчитана, передаётся в CRM/",
            },
            badgeCls: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
            stepNumber: 5,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: dl.tone === "expired",
            attentionText: dl.tone === "expired" ? "Срок истёк до ввода в CRM" : null,
            steps: buildSteps(4, dl.tone === "expired" ? "blocked" : "active", 4),
        };
    }
    if (t.stage === "tenders") {
        if (ready) {
            return {
                laneId: "storefront",
                folderPath: "Витрина/",
                botName: "ОТК Ревизор",
                shortTag: "Витрина/",
                stageBadge: "✅ 6. Витрина/ · ОТК ✅",
                substage: isTenderAllPublicOffer(t)
                    ? "Публичная оферта · ОТК 6/6 пройдено"
                    : "Цены подтверждены · ОТК 6/6 пройдено",
                nextStepHint: "Опубликован на клиентской Витрине",
                progress: {
                    done: 6,
                    total: 6,
                    label: "ОТК 6/6 · В папке Витрина/",
                },
                badgeCls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
                stepNumber: 6,
                isTerminalReject: false,
                isStorefrontReady: true,
                rejectReason: null,
                needsAttention: false,
                attentionText: null,
                steps: buildSteps(5, "done", 5),
            };
        }
        const qcProgress = countQcPassed(t);
        const firstBlocker = qc?.blockers?.[0] || null;
        const profitTooLow = t.profit !== null && Number(t.profit) < 11000;
        const isBlocked = dl.tone === "expired" || hasNoReply || hasRefusal || profitTooLow || qc?.approved === false;
        const substage = firstBlocker ||
            meta?.substage ||
            (hasNoReply
                ? "Нет ответа по почте за 24 раб. ч"
                : profitTooLow
                    ? `Прибыль ${formatRub(t.profit)} < 11 000 ₽`
                    : t.price_request_status || "Подтверждение цен и допуск ОТК");
        const nextHint = profitTooLow
            ? `Нужна прибыль ≥ 11 000 ₽ (сейчас ${formatRub(t.profit)}) или пересчёт`
            : hasNoReply
                ? "Не дописались за 24 раб. ч — на Витрину не попадает"
                : firstBlocker || "Дождаться ответа продавца и пройти ОТК (6/6) → в Витрина/";
        return {
            laneId: "crm_work",
            folderPath: "CRM/",
            botName: hasNoReply || hasRefusal ? "Почтальон" : "Почтальон + Ревизор",
            shortTag: hasNoReply
                ? "CRM/ · Нет ответа"
                : profitTooLow
                    ? "CRM/ · < 11к"
                    : "CRM/",
            stageBadge: hasNoReply
                ? "⏳ 5. CRM/ · Нет ответа"
                : profitTooLow
                    ? "⚠️ 5. CRM/ · Маржа < 11к"
                    : "📬 5. CRM/ · Доводка",
            substage,
            nextStepHint: nextHint,
            progress: {
                done: qcProgress.passed,
                total: qcProgress.total,
                label: `ОТК: ${qcProgress.passed}/${qcProgress.total} → Витрина/`,
            },
            badgeCls: hasNoReply || profitTooLow || hasRefusal
                ? "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30"
                : "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/25",
            stepNumber: 5,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: isBlocked,
            attentionText: nextHint,
            steps: buildSteps(4, isBlocked ? "blocked" : "active", 4),
        };
    }
    if (t.stage === "unprofitable") {
        const deficit = t.profit !== null ? Math.max(0, 11000 - Number(t.profit)) : null;
        const reason = meta?.reject_reason ||
            (t.profit !== null
                ? `Прибыль ${formatRub(t.profit)}${deficit ? ` (не хватило ${formatRub(deficit)})` : ""}`
                : "Прибыль ниже порога 11 000 ₽");
        return {
            laneId: "unprofitable",
            folderPath: "Архив/Нерентабельно/",
            botName: "Очкарик",
            shortTag: "Нерент.",
            stageBadge: "📉 Архив/Нерентабельно/",
            substage: reason,
            nextStepHint: reason,
            progress: { done: 0, total: 1, label: reason },
            badgeCls: "bg-orange-500/12 text-orange-700 dark:text-orange-300 border-orange-500/25",
            stepNumber: 4,
            isTerminalReject: true,
            isStorefrontReady: false,
            rejectReason: reason,
            needsAttention: false,
            attentionText: null,
            steps: buildSteps(3, "rejected", 3),
        };
    }
    if (t.stage === "overdue") {
        const reason = meta?.reject_reason || "Срок подачи истёк или < 60 ч";
        const hadCalc = t.profit !== null;
        const failedIdx = hadCalc ? 4 : 1;
        return {
            laneId: "overdue",
            folderPath: "Архив/Просрочено/",
            botName: "Контроль сроков",
            shortTag: "Просроч.",
            stageBadge: "⏰ Архив/Просрочено/",
            substage: reason,
            nextStepHint: reason,
            progress: { done: 0, total: 1, label: reason },
            badgeCls: "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25",
            stepNumber: hadCalc ? 5 : 2,
            isTerminalReject: true,
            isStorefrontReady: false,
            rejectReason: reason,
            needsAttention: false,
            attentionText: null,
            steps: buildSteps(failedIdx, "rejected", failedIdx),
        };
    }
    const cat = getRejectFolderCategory(t);
    const reason = meta?.reject_reason || cat;
    return {
        laneId: "rejected",
        folderPath: `Архив/${cat}/`,
        botName: "Фатима / Сисадмин",
        shortTag: cat,
        stageBadge: `🚫 Архив/${cat}/`,
        substage: `Отсев: ${reason}`,
        nextStepHint: `Отсеян (${reason})`,
        progress: { done: 0, total: 1, label: `Отсев: ${reason}` },
        badgeCls: "bg-slate-500/12 text-slate-600 dark:text-slate-300 border-slate-500/25",
        stepNumber: 1,
        isTerminalReject: true,
        isStorefrontReady: false,
        rejectReason: reason,
        needsAttention: false,
        attentionText: null,
        steps: buildSteps(0, "rejected", 0),
    };
}
