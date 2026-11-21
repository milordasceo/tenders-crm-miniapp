export function getWebApp() {
    return window.Telegram?.WebApp;
}
export function applyTelegramTheme() {
    const tg = getWebApp();
    const root = document.documentElement;
    const tp = tg?.themeParams || {};
    const isDark = tg?.colorScheme === "dark" ||
        (!tg?.colorScheme && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = isDark ? "dark" : "light";
    if (tp.secondary_bg_color) {
        root.style.setProperty("--crm-bg", tp.secondary_bg_color);
    }
    else {
        root.style.setProperty("--crm-bg", isDark ? "#0d1117" : "#f3f5f8");
    }
    if (tp.bg_color) {
        root.style.setProperty("--crm-surface", tp.bg_color);
    }
    else {
        root.style.setProperty("--crm-surface", isDark ? "#161b22" : "#ffffff");
    }
    if (tp.text_color) {
        root.style.setProperty("--crm-text", tp.text_color);
    }
    else {
        root.style.setProperty("--crm-text", isDark ? "#f0f6fc" : "#111827");
    }
    if (tp.hint_color) {
        root.style.setProperty("--crm-hint", tp.hint_color);
    }
    else {
        root.style.setProperty("--crm-hint", isDark ? "#8b949e" : "#64748b");
    }
    if (tp.button_color) {
        root.style.setProperty("--crm-accent", tp.button_color);
    }
    if (tp.button_text_color) {
        root.style.setProperty("--crm-accent-text", tp.button_text_color);
    }
}
export function initTelegramApp() {
    const tg = getWebApp();
    applyTelegramTheme();
    tg?.ready();
    tg?.expand();
    const onThemeChange = () => applyTelegramTheme();
    tg?.onEvent?.("themeChanged", onThemeChange);
    return () => {
        tg?.offEvent?.("themeChanged", onThemeChange);
    };
}
export function getInitData() {
    return getWebApp()?.initData || "";
}
export function getStartParam() {
    const fromSdk = getWebApp()?.initDataUnsafe?.start_param?.trim();
    const params = new URLSearchParams(window.location.search);
    const raw = fromSdk ||
        params.get("startapp")?.trim() ||
        params.get("tgWebAppStartParam")?.trim() ||
        params.get("tender")?.trim() ||
        null;
    if (!raw)
        return null;
    return raw.replace(/^(lot_|tender_|t_)/i, "");
}
export function haptic(type) {
    const hf = getWebApp()?.HapticFeedback;
    if (!hf)
        return;
    try {
        if (type === "select")
            hf.selectionChanged();
        else if (type === "success")
            hf.notificationOccurred("success");
        else if (type === "error")
            hf.notificationOccurred("error");
        else
            hf.impactOccurred("light");
    }
    catch {
        // ignore outside Telegram
    }
}
export function openExternal(url) {
    const tg = getWebApp();
    if (tg?.openLink) {
        tg.openLink(url);
    }
    else {
        window.open(url, "_blank", "noopener,noreferrer");
    }
}
export function openTelegramLink(url) {
    const tg = getWebApp();
    if (tg?.openTelegramLink) {
        tg.openTelegramLink(url);
    }
    else if (tg?.openLink) {
        tg.openLink(url);
    }
    else {
        window.open(url, "_blank", "noopener,noreferrer");
    }
}
export function bindBackButton(visible, handler) {
    const bb = getWebApp()?.BackButton;
    if (!bb)
        return () => { };
    if (visible) {
        bb.onClick(handler);
        bb.show();
    }
    else {
        bb.hide();
    }
    return () => {
        bb.offClick(handler);
        if (visible)
            bb.hide();
    };
}
