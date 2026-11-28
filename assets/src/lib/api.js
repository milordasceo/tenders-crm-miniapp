import { getInitData } from "./telegram.js?v=mx0305v6";
const SUPABASE_URL = ("https://zljfthayunbennxzitch.supabase.co" || "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = "sb_publishable_k4S6wqTcp57NctcpQozLFg_F3El1o_u" || "";
export class CrmApiError extends Error {
    info;
    constructor(info) {
        super(info.error);
        this.info = info;
    }
}
export function isPreviewMode() {
    if (!false)
        return false;
    return new URLSearchParams(window.location.search).get("preview") === "1";
}
function endpointUrl(query = "") {
    if (!SUPABASE_URL) {
        throw new CrmApiError({
            status: 500,
            error: "Не задан VITE_SUPABASE_URL в конфигурации сборки.",
        });
    }
    return `${SUPABASE_URL}/functions/v1/crm-api${query}`;
}
async function requestJson(method, query = "", body) {
    const initData = getInitData();
    const headers = {
        "Content-Type": "application/json",
        "x-telegram-init-data": initData,
    };
    if (SUPABASE_ANON_KEY) {
        headers.apikey = SUPABASE_ANON_KEY;
    }
    let res;
    try {
        res = await fetch(endpointUrl(query), {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    }
    catch (err) {
        throw new CrmApiError({
            status: 0,
            error: err instanceof Error ? `Сетевая ошибка: ${err.message}` : "Сетевая ошибка",
        });
    }
    const data = (await res.json().catch(() => ({})));
    if (!res.ok || data.ok === false) {
        throw new CrmApiError({
            status: res.status,
            code: typeof data.code === "string" ? data.code : undefined,
            error: typeof data.error === "string" ? data.error : `Ошибка сервера (${res.status})`,
            telegram_id: typeof data.telegram_id === "number" ? data.telegram_id : undefined,
            username: typeof data.username === "string" ? data.username : null,
            first_name: typeof data.first_name === "string" ? data.first_name : null,
        });
    }
    return data;
}
export async function fetchBootstrap() {
    if (isPreviewMode()) {
        const mod = await import("./devPreview.js?v=mx0305v6");
        return mod.getDevBootstrap();
    }
    return requestJson("GET");
}
export async function fetchTenderDetail(number) {
    if (isPreviewMode()) {
        const mod = await import("./devPreview.js?v=mx0305v6");
        return mod.getDevTender(number);
    }
    return requestJson("GET", `?number=${encodeURIComponent(number)}`);
}
export async function updateTenderOwner(number, patch) {
    if (isPreviewMode()) {
        const mod = await import("./devPreview.js?v=mx0305v6");
        return mod.updateDevTender(number, patch);
    }
    return requestJson("POST", "", {
        action: "update_tender",
        number,
        ...patch,
    });
}
export async function changeTenderStage(number, stage) {
    if (isPreviewMode()) {
        const mod = await import("./devPreview.js?v=mx0305v6");
        return mod.setDevStage(number, stage);
    }
    return requestJson("POST", "", {
        action: "set_stage",
        number,
        stage,
    });
}
export async function registerWithPassword(telegramId, password) {
    return requestJson("POST", "", {
        action: "register_with_password",
        telegram_id: telegramId.trim(),
        password,
    });
}
export async function saveSeenState(seenState) {
    if (isPreviewMode())
        return;
    try {
        await requestJson("POST", "", {
            action: "save_seen_state",
            seen_state: seenState,
        });
    }
    catch {
        // ignore background seen-state sync error
    }
}
export async function toggleUserFavorite(number, is_favorite) {
    if (isPreviewMode()) {
        const mod = await import("./devPreview.js?v=mx0305v6");
        return mod.toggleDevFavorite(number, is_favorite);
    }
    return requestJson("POST", "", {
        action: "toggle_favorite",
        number,
        is_favorite,
    });
}
export async function saveUserNotes(number, user_notes) {
    if (isPreviewMode()) {
        const mod = await import("./devPreview.js?v=mx0305v6");
        return mod.saveDevUserNotes(number, user_notes);
    }
    return requestJson("POST", "", {
        action: "save_user_notes",
        number,
        user_notes,
    });
}
export async function unlockTender(number) {
    if (isPreviewMode()) {
        const mod = await import("./devPreview.js?v=mx0305v6");
        return mod.unlockDevTender(number);
    }
    return requestJson("POST", "", {
        action: "unlock_tender",
        number,
    });
}
export async function resetDemoCredits(clear_unlocks = true) {
    if (isPreviewMode()) {
        const mod = await import("./devPreview.js?v=mx0305v6");
        return mod.resetDevDemoCredits(clear_unlocks);
    }
    return requestJson("POST", "", {
        action: "reset_demo_credits",
        clear_unlocks,
    });
}
export async function saveCompanyProfile(company_profile) {
    if (isPreviewMode()) {
        const mod = await import("./devPreview.js?v=mx0305v6");
        return mod.saveDevCompanyProfile(company_profile);
    }
    return requestJson("POST", "", {
        action: "save_company_profile",
        company_profile,
    });
}
export async function generateSubmissionDocs(number, variant = "А") {
    if (isPreviewMode()) {
        const mod = await import("./devPreview.js?v=mx0305v6");
        return mod.generateDevSubmissionDocs(number, variant);
    }
    return requestJson("POST", "", {
        action: "generate_submission_docs",
        number,
        variant,
    });
}
export async function fetchAccessOverview() {
    return requestJson("POST", "", { action: "admin_access_overview" });
}
export async function updateCrmSettings(default_daily_credits, apply_today = true) {
    return requestJson("POST", "", {
        action: "admin_update_settings",
        default_daily_credits,
        apply_today,
    });
}
export async function updateCrmUserCredits(params) {
    return requestJson("POST", "", {
        action: "admin_update_user_credits",
        ...params,
    });
}
export async function createAccessPassword(params) {
    return requestJson("POST", "", {
        action: "admin_create_password",
        ...params,
    });
}
export async function toggleAccessPassword(id, is_active) {
    return requestJson("POST", "", {
        action: "admin_toggle_password",
        id,
        is_active,
    });
}
export async function deleteAccessPassword(id) {
    return requestJson("POST", "", {
        action: "admin_delete_password",
        id,
    });
}
export async function updateCrmUserRole(target_telegram_id, role) {
    return requestJson("POST", "", {
        action: "admin_update_user_role",
        target_telegram_id,
        role,
    });
}
export async function setPipelineControl(desired_status, reason = "") {
    return requestJson("POST", "", {
        action: "admin_pipeline_control",
        desired_status,
        reason,
    });
}
export async function adminPurgeArchive() {
    return requestJson("POST", "", {
        action: "admin_purge_archive",
    });
}
export async function deleteCrmUser(target_telegram_id) {
    return requestJson("POST", "", {
        action: "admin_delete_user",
        target_telegram_id,
    });
}
export async function recordCallResult(payload) {
    return requestJson("POST", "", {
        action: "record_call_result",
        ...payload,
    });
}
