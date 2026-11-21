const DAY_NAMES_SHORT = {
    1: "Пн",
    2: "Вт",
    3: "Ср",
    4: "Чт",
    5: "Пт",
    6: "Сб",
    7: "Вс",
};
const WEEKDAY_MAP = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
};
const RU_DAY_MAP = {
    пн: 1,
    вт: 2,
    ср: 3,
    чт: 4,
    пт: 5,
    сб: 6,
    вс: 7,
};
function parseMinutes(hhmm) {
    if (!hhmm)
        return null;
    const m = String(hhmm).match(/^(\d{1,2})[:.](\d{2})$/);
    if (!m)
        return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 24 || min < 0 || min > 59)
        return null;
    return h * 60 + min;
}
function parseScheduleFromText(raw, addrHint = "") {
    const txt = raw.trim();
    if (!txt)
        return null;
    const low = txt.toLowerCase();
    let open = null;
    let close = null;
    if (/круглосуточно|24\/7/.test(low)) {
        open = "00:00";
        close = "23:59";
    }
    else {
        const mTm = low.match(/(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})/);
        if (!mTm)
            return null;
        open = `${mTm[1].padStart(2, "0")}:${mTm[2]}`;
        close = `${mTm[3].padStart(2, "0")}:${mTm[4]}`;
    }
    let days = [1, 2, 3, 4, 5];
    if (/ежедневно|без выходных|круглосуточно|24\/7|пн[–—-]вс/.test(low)) {
        days = [1, 2, 3, 4, 5, 6, 7];
    }
    else {
        const mRng = low.match(/(пн|вт|ср|чт|пт|сб|вс)\s*[–—-]\s*(пн|вт|ср|чт|пт|сб|вс)/);
        if (mRng) {
            const d1 = RU_DAY_MAP[mRng[1]];
            const d2 = RU_DAY_MAP[mRng[2]];
            days = [];
            if (d1 <= d2) {
                for (let d = d1; d <= d2; d++)
                    days.push(d);
            }
            else {
                for (let d = d1; d <= 7; d++)
                    days.push(d);
                for (let d = 1; d <= d2; d++)
                    days.push(d);
            }
        }
    }
    const hint = `${txt} ${addrHint}`.toLowerCase();
    const tz = /москв|мск|спб|петербург/.test(hint) ? "Europe/Moscow" : "Asia/Novosibirsk";
    return { текст: txt, дни: days, открыто: open, закрыто: close, часовой_пояс: tz };
}
function getNowInZone(tz) {
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: tz,
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).formatToParts(new Date());
        const wdStr = parts.find((p) => p.type === "weekday")?.value || "Mon";
        const hh = Number(parts.find((p) => p.type === "hour")?.value || "0") % 24;
        const mm = Number(parts.find((p) => p.type === "minute")?.value || "0");
        return {
            weekday: WEEKDAY_MAP[wdStr] || 1,
            minutes: hh * 60 + mm,
        };
    }
    catch {
        const nsk = new Date(Date.now() + 7 * 3600 * 1000);
        const jsDay = nsk.getUTCDay();
        return {
            weekday: jsDay === 0 ? 7 : jsDay,
            minutes: nsk.getUTCHours() * 60 + nsk.getUTCMinutes(),
        };
    }
}
function formatDaysList(days) {
    if (!days || days.length === 0)
        return "Пн–Пт";
    if (days.length === 7)
        return "Ежедневно";
    const sorted = [...new Set(days)].sort((a, b) => a - b);
    const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
    if (contiguous && sorted.length >= 2) {
        return `${DAY_NAMES_SHORT[sorted[0]]}–${DAY_NAMES_SHORT[sorted[sorted.length - 1]]}`;
    }
    return sorted.map((d) => DAY_NAMES_SHORT[d]).filter(Boolean).join(", ");
}
function nextWorkDayLabel(days, currentWeekday) {
    for (let offset = 1; offset <= 7; offset++) {
        const cand = ((currentWeekday - 1 + offset) % 7) + 1;
        if (days.includes(cand)) {
            return offset === 1 ? "завтра" : `в ${DAY_NAMES_SHORT[cand]}`;
        }
    }
    return "";
}
export function evaluateSellerWorkStatus(row) {
    const sched = row.режим_работы ||
        parseScheduleFromText(row.адрес || "") ||
        null;
    if (!sched || (!sched.открыто && !sched.закрыто && !sched.текст)) {
        return {
            hasSchedule: false,
            scheduleText: "График работы не указан",
            isOpenNow: null,
            statusLabel: "Режим работы не определён",
            tzShort: "НСК",
        };
    }
    const tz = sched.часовой_пояс || "Asia/Novosibirsk";
    const tzShort = tz === "Europe/Moscow" ? "МСК" : tz === "Asia/Novosibirsk" ? "НСК" : tz;
    const days = Array.isArray(sched.дни) && sched.дни.length > 0 ? sched.дни : [1, 2, 3, 4, 5];
    const openMin = parseMinutes(sched.открыто);
    const closeMin = parseMinutes(sched.закрыто);
    const scheduleText = sched.текст ||
        `${formatDaysList(days)} ${sched.открыто || ""}–${sched.закрыто || ""}`.trim();
    if (openMin === null || closeMin === null) {
        return {
            hasSchedule: true,
            scheduleText,
            isOpenNow: null,
            statusLabel: scheduleText,
            tzShort,
        };
    }
    if (openMin === 0 && closeMin >= 23 * 60 + 59 && days.length === 7) {
        return {
            hasSchedule: true,
            scheduleText,
            isOpenNow: true,
            statusLabel: "Сейчас работают (круглосуточно)",
            tzShort,
        };
    }
    const now = getNowInZone(tz);
    const isWorkingDay = days.includes(now.weekday);
    if (isWorkingDay && now.minutes >= openMin && now.minutes < closeMin) {
        return {
            hasSchedule: true,
            scheduleText,
            isOpenNow: true,
            statusLabel: `Сейчас работают (до ${sched.закрыто})`,
            tzShort,
        };
    }
    if (isWorkingDay && now.minutes < openMin) {
        return {
            hasSchedule: true,
            scheduleText,
            isOpenNow: false,
            statusLabel: `Сейчас закрыто (откроются в ${sched.открыто})`,
            tzShort,
        };
    }
    const nextDay = nextWorkDayLabel(days, now.weekday);
    return {
        hasSchedule: true,
        scheduleText,
        isOpenNow: false,
        statusLabel: `Сейчас закрыто (откроются ${nextDay} в ${sched.открыто})`,
        tzShort,
    };
}
