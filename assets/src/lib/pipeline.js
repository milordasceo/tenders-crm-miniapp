import { formatRub, getDeadlineInfo, isTenderAllPublicOffer, isTenderStorefrontReady } from "./format.js?v=mx0305v6";
export const ACTIVE_PIPELINE_LANES = [
    {
        id: "prices",
        stage: "prices",
        stepNumber: 1,
        folderPath: "Поиск цен/",
        emoji: "🔍",
        bot: "Черипикер",
        shortLabel: "Поиск цен",
        title: "1. Поиск цен · Черипикер",
        goalText: "Отобранные тендеры: ищем открытые цены в городе → сразу на ОТК или в Запрос КП.",
    },
    {
        id: "inquiry",
        stage: "inquiry",
        stepNumber: 2,
        folderPath: "Запрос цен/",
        emoji: "✉️",
        bot: "Почтальон",
        shortLabel: "Запрос КП",
        title: "2. Запрос КП · Почтальон",
        goalText: "Переписка с поставщиками (SLA 24 раб. ч) → расчёт и передача на ОТК.",
    },
    {
        id: "crm_work",
        stage: "tenders",
        stepNumber: 3,
        folderPath: "CRM/",
        emoji: "🛡",
        bot: "Ревизор ОТК",
        shortLabel: "Проверка ОТК",
        title: "3. Проверка ОТК · Ревизор",
        goalText: "Маржа посчитана: финальное подтверждение и 6 проверок ОТК → на Витрину.",
    },
    {
        id: "storefront",
        stage: "tenders",
        stepNumber: 4,
        folderPath: "Витрина/",
        emoji: "✅",
        bot: "Витрина",
        shortLabel: "Витрина",
        title: "4. Витрина · Готово ✅",
        goalText: "Все проверки ОТК пройдены: карточка открыта клиентам на Витрине.",
    },
];
export const STAGE_LABELS_RU = {
    blanks: "Отбор (Фатима)",
    prices: "Поиск цен",
    inquiry: "Запрос КП",
    calc: "Расчёт маржи",
    review: "Проверка ОТК",
    tenders: "Проверка ОТК / Витрина",
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
        { id: "cheripiker", bot: "Черипикер", label: "Поиск цен", emoji: "🔍" },
        { id: "inquiry", bot: "Почтальон", label: "Запрос КП", emoji: "✉️" },
        { id: "pochtalyon", bot: "Ревизор ОТК", label: "Проверка ОТК", emoji: "🛡" },
        { id: "storefront", bot: "Витрина", label: "Витрина", emoji: "✅" },
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
            laneId: "prices",
            folderPath: "Бланки/",
            botName: "Фатима",
            shortTag: "Отбор",
            stageBadge: "📋 Отбор ТЗ · Фатима",
            substage: meta?.substage || "Ожидает отбора ТЗ",
            nextStepHint: "Далее: Поиск цен (или в Архив при отсеве)",
            progress: {
                done: doneChecks,
                total: 3,
                label: hasItems ? "ТЗ заполнено, проверка правил" : "Ждёт отбора ТЗ",
            },
            badgeCls: "bg-slate-500/12 text-slate-700 dark:text-slate-200 border-slate-500/25",
            stepNumber: 1,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: dl.tone === "expired",
            attentionText: dl.tone === "expired" ? "Срок истёк до отбора" : null,
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
            shortTag: "Поиск цен",
            stageBadge: "🔍 1. Поиск цен · Черипикер",
            substage: meta?.substage || "Поиск открытых цен в городе",
            nextStepHint: "Далее: сразу на Проверку ОТК (оферта) или в Запрос КП",
            progress: {
                done: posFound,
                total: Math.max(1, posTotal),
                label: posTotal > 0 ? `Позиций с ценой: ${posFound}/${posTotal}` : "Поиск поставщиков",
            },
            badgeCls: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25",
            stepNumber: 1,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: dl.tone === "expired",
            attentionText: dl.tone === "expired" ? "Срок истёк на поиске цен" : null,
            steps: buildSteps(0, dl.tone === "expired" ? "blocked" : "active", 0),
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
            botName: "Почтальон",
            shortTag: "Запрос КП",
            stageBadge: "✉️ 2. Запрос КП · Почтальон",
            substage: sub,
            nextStepHint: hasNoReply && answered === 0
                ? "До поставщиков не дописались за 24 раб. ч — не попадёт на Витрину"
                : "Далее: получить КП → расчёт и Проверка ОТК",
            progress: {
                done: answered > 0 ? answered : sent,
                total: Math.max(1, total),
                label: sub,
            },
            badgeCls: hasNoReply && answered === 0
                ? "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30"
                : "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
            stepNumber: 2,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: (hasNoReply && answered === 0) || dl.tone === "expired",
            attentionText: hasNoReply && answered === 0 ? "Нет ответа за 24 раб. ч" : null,
            steps: buildSteps(1, (hasNoReply && answered === 0) || dl.tone === "expired" ? "blocked" : "active", 1),
        };
    }
    if (t.stage === "calc") {
        return {
            laneId: "crm_work",
            folderPath: "К расчёту/",
            botName: "Очкарик",
            shortTag: "Расчёт",
            stageBadge: "🧮 Расчёт маржи · Очкарик",
            substage: meta?.substage || "Расчёт маржи А/Б",
            nextStepHint: dl.tone === "expired"
                ? "Срок истёк → в Архив"
                : "Далее: Проверка ОТК (или Архив при низкой марже)",
            progress: {
                done: 1,
                total: 2,
                label: "Цены готовы, расчёт маржи",
            },
            badgeCls: "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/25",
            stepNumber: 3,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: dl.tone === "expired",
            attentionText: dl.tone === "expired" ? "Срок истёк до расчёта" : null,
            steps: buildSteps(2, dl.tone === "expired" ? "blocked" : "active", 2),
        };
    }
    if (t.stage === "review") {
        return {
            laneId: "crm_work",
            folderPath: "CRM/",
            botName: "Ревизор ОТК",
            shortTag: "Проверка ОТК",
            stageBadge: "🛡 3. Проверка ОТК",
            substage: meta?.substage || "Подготовка к проверке ОТК",
            nextStepHint: dl.tone === "expired"
                ? "Срок истёк → в Архив"
                : "Далее: подтверждение цен + ОТК → на Витрину",
            progress: {
                done: 4,
                total: 6,
                label: "Маржа посчитана, идёт проверка ОТК",
            },
            badgeCls: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
            stepNumber: 3,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: dl.tone === "expired",
            attentionText: dl.tone === "expired" ? "Срок истёк на проверке ОТК" : null,
            steps: buildSteps(2, dl.tone === "expired" ? "blocked" : "active", 2),
        };
    }
    if (t.stage === "tenders") {
        if (ready) {
            return {
                laneId: "storefront",
                folderPath: "Витрина/",
                botName: "Витрина",
                shortTag: "Витрина",
                stageBadge: "✅ 4. Витрина · Готово",
                substage: isTenderAllPublicOffer(t)
                    ? "Публичная оферта · ОТК 6/6 пройдено"
                    : "Цены подтверждены · ОТК 6/6 пройдено",
                nextStepHint: "Опубликован на клиентской Витрине",
                progress: {
                    done: 6,
                    total: 6,
                    label: "ОТК 6/6 · На Витрине",
                },
                badgeCls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
                stepNumber: 4,
                isTerminalReject: false,
                isStorefrontReady: true,
                rejectReason: null,
                needsAttention: false,
                attentionText: null,
                steps: buildSteps(3, "done", 3),
            };
        }
        const qcProgress = countQcPassed(t);
        const firstBlocker = qc?.blockers?.[0] || null;
        const profitTooLow = t.profit !== null && Number(t.profit) < (Number(t.nmck) > 0 && Number(t.nmck) < 30000 ? 6000 : 11000);
        const isBlocked = dl.tone === "expired" || hasNoReply || hasRefusal || profitTooLow || qc?.approved === false;
        const substage = firstBlocker ||
            meta?.substage ||
            (hasNoReply
                ? "Нет ответа по почте за 24 раб. ч"
                : profitTooLow
                    ? `Прибыль ${formatRub(t.profit)} ниже порога`
                    : t.price_request_status || "Подтверждение цен и допуск ОТК");
        const nextHint = profitTooLow
            ? `Прибыль ниже порога (сейчас ${formatRub(t.profit)}) — нужен пересчёт`
            : hasNoReply
                ? "Не дописались за 24 раб. ч — на Витрину не попадает"
                : firstBlocker || "Дождаться подтверждения и пройти ОТК (6/6) → на Витрину";
        return {
            laneId: "crm_work",
            folderPath: "CRM/",
            botName: hasNoReply || hasRefusal ? "Почтальон" : "Ревизор ОТК",
            shortTag: hasNoReply
                ? "ОТК · Нет ответа"
                : profitTooLow
                    ? "ОТК · Низкая маржа"
                    : "Проверка ОТК",
            stageBadge: hasNoReply
                ? "⏳ 3. Проверка ОТК · Нет ответа"
                : profitTooLow
                    ? "⚠️ 3. Проверка ОТК · Низкая маржа"
                    : "🛡 3. Проверка ОТК",
            substage,
            nextStepHint: nextHint,
            progress: {
                done: qcProgress.passed,
                total: qcProgress.total,
                label: `ОТК: ${qcProgress.passed}/${qcProgress.total} → Витрина`,
            },
            badgeCls: hasNoReply || profitTooLow || hasRefusal
                ? "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30"
                : "bg-blue-500/12 text-blue-700 dark:text-blue-300 border-blue-500/25",
            stepNumber: 3,
            isTerminalReject: false,
            isStorefrontReady: false,
            rejectReason: null,
            needsAttention: isBlocked,
            attentionText: nextHint,
            steps: buildSteps(2, isBlocked ? "blocked" : "active", 2),
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
