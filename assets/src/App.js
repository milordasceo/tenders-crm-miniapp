import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Archive, ArrowUpDown, BarChart3, Bell, CheckCheck, Eye, Flame, KeyRound, Mail, RefreshCw, Search, Settings, Shield, ShieldCheck, ScanSearch, Sparkles, Star, Store, User, Workflow, X, } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AdminAccessModal } from "./components/AdminAccessModal.js?v=mwq061ef";
import { AuthGateScreen } from "./components/AuthGateScreen.js?v=mwq061ef";
import { CabinetView } from "./components/CabinetView.js?v=mwq061ef";
import { CompanyProfileModal } from "./components/CompanyProfileModal.js?v=mwq061ef";
import { CreditsModal } from "./components/CreditsModal.js?v=mwq061ef";
import { PipelineBoardView } from "./components/PipelineBoardView.js?v=mwq061ef";
import { PriceRequestsView } from "./components/PriceRequestsView.js?v=mwq061ef";
import { RejectedArchiveView } from "./components/RejectedArchiveView.js?v=mwq061ef";
import { RevizorQueueView } from "./components/RevizorQueueView.js?v=mwq061ef";
import { StatsView } from "./components/StatsView.js?v=mwq061ef";
import { TrackingView } from "./components/TrackingView.js?v=mwq061ef";
import { TenderCard } from "./components/TenderCard.js?v=mwq061ef";
import { TenderDetail } from "./components/TenderDetail.js?v=mwq061ef";
import { CrmApiError, fetchBootstrap, fetchTenderDetail, generateSubmissionDocs, isPreviewMode, registerWithPassword, resetDemoCredits, saveCompanyProfile, saveSeenState, saveUserNotes, toggleUserFavorite, unlockTender, updateTenderOwner, } from "./lib/api.js?v=mwq061ef";
import { formatNskDateTime, getDeadlineInfo, getTenderRestrictionInfo, isTenderAllPublicOffer, isTenderStorefrontReady, } from "./lib/format.js?v=mwq061ef";
import { getStartParam, haptic, initTelegramApp } from "./lib/telegram.js?v=mwq061ef";
import { computeUpdates, loadOrInitSeenStore, markAllAsSeen, markTenderAsSeen, } from "./lib/updates.js?v=mwq061ef";
export function App() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const [resettingDemo, setResettingDemo] = useState(false);
    const [error, setError] = useState(null);
    const [tenders, setTenders] = useState([]);
    const [events, setEvents] = useState([]);
    const [snapshot, setSnapshot] = useState(null);
    const [nskTime, setNskTime] = useState("");
    const [viewMode, setViewMode] = useState("storefront");
    const [storefrontTab, setStorefrontTab] = useState("showcase");
    const [storefrontChip, setStorefrontChip] = useState("all");
    const [storefrontSort, setStorefrontSort] = useState("newest");
    const [creditsModalOpen, setCreditsModalOpen] = useState(false);
    const [companyProfileOpen, setCompanyProfileOpen] = useState(false);
    const [savingCompanyProfile, setSavingCompanyProfile] = useState(false);
    const [generatingDocs, setGeneratingDocs] = useState(false);
    const [generatedDocsResult, setGeneratedDocsResult] = useState(null);
    const [pendingDocGen, setPendingDocGen] = useState(null);
    const [activeTab, setActiveTab] = useState("pipeline");
    const [search, setSearch] = useState("");
    const [selectedNumber, setSelectedNumber] = useState(() => getStartParam());
    const [detailEvents, setDetailEvents] = useState([]);
    const [toast, setToast] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [seenStore, setSeenStore] = useState(null);
    const [updatesOpen, setUpdatesOpen] = useState(false);
    const [accessOpen, setAccessOpen] = useState(false);
    const showToast = useCallback((msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2600);
    }, []);
    const handleBack = useCallback(() => {
        setSelectedNumber(null);
    }, []);
    useEffect(() => initTelegramApp(), []);
    useLayoutEffect(() => {
        const resetScroll = () => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        };
        resetScroll();
        const rafId = requestAnimationFrame(resetScroll);
        return () => cancelAnimationFrame(rafId);
    }, [selectedNumber, activeTab, storefrontTab, viewMode]);
    const loadData = useCallback(async (silent = false, toastOnRefresh = true) => {
        if (silent && toastOnRefresh)
            setRefreshing(true);
        else if (!silent)
            setLoading(true);
        if (!silent || toastOnRefresh)
            setError(null);
        try {
            const data = await fetchBootstrap();
            setCurrentUser(data.user);
            setTenders(data.tenders);
            setEvents(data.events);
            setSnapshot(data.snapshot);
            setNskTime(data.nsk_time);
            const { store, needsServerSync } = loadOrInitSeenStore(data.user.telegram_id, data.user.seen_state, data.tenders, data.events);
            setSeenStore(store);
            if (needsServerSync) {
                void saveSeenState(store);
            }
            if (silent && toastOnRefresh) {
                const diff = computeUpdates(data.tenders, data.events, store);
                if (diff.feed.length > 0) {
                    showToast(`Новых обновлений: ${diff.feed.length}`);
                }
                else {
                    showToast("Данные обновлены");
                }
            }
            const startNum = getStartParam();
            if (startNum) {
                const existingStart = data.tenders.find((t) => t.number === startNum || t.share_id === startNum);
                if (existingStart) {
                    setSelectedNumber(existingStart.number);
                    const updatedStore = markTenderAsSeen(data.user.telegram_id, store, existingStart, data.events);
                    setSeenStore(updatedStore);
                    void saveSeenState(updatedStore);
                }
                else {
                    try {
                        const single = await fetchTenderDetail(startNum);
                        setTenders((prev) => [single.tender, ...prev]);
                        setSelectedNumber(single.tender.number);
                        setDetailEvents(single.events);
                        const updatedStore = markTenderAsSeen(data.user.telegram_id, store, single.tender, single.events);
                        setSeenStore(updatedStore);
                        void saveSeenState(updatedStore);
                    }
                    catch {
                        setSelectedNumber(null);
                        showToast("Тендер не найден или уже снят с витрины");
                    }
                }
            }
        }
        catch (err) {
            if (err instanceof CrmApiError) {
                setError(err.info);
            }
            else {
                setError({
                    status: 500,
                    error: err instanceof Error ? err.message : "Неизвестная ошибка загрузки",
                });
            }
        }
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    useEffect(() => {
        void loadData(false);
    }, [loadData]);
    useEffect(() => {
        const id = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void loadData(true, false);
            }
        }, 15_000);
        return () => window.clearInterval(id);
    }, [loadData]);
    const isOwner = currentUser?.role === "owner";
    const canAccessCrm = currentUser?.role === "owner" || currentUser?.role === "manager";
    const effectiveViewMode = canAccessCrm ? viewMode : "storefront";
    const openCredits = currentUser?.open_credits ?? 2;
    const effectiveDailyCredits = currentUser?.effective_daily_credits ?? 2;
    const selectedTender = useMemo(() => selectedNumber
        ? tenders.find((t) => t.number === selectedNumber || t.share_id === selectedNumber) || null
        : null, [selectedNumber, tenders]);
    const openTender = useCallback(async (number) => {
        setSelectedNumber(number);
        const uid = currentUser?.telegram_id;
        const localTender = tenders.find((t) => t.number === number);
        if (localTender && seenStore) {
            const nextStore = markTenderAsSeen(uid, seenStore, localTender, events);
            setSeenStore(nextStore);
            void saveSeenState(nextStore);
        }
        try {
            const res = await fetchTenderDetail(number);
            setDetailEvents(res.events);
            setTenders((prev) => prev.map((t) => (t.number === number ? res.tender : t)));
            setSeenStore((prevStore) => {
                if (!prevStore)
                    return prevStore;
                const nextStore = markTenderAsSeen(uid, prevStore, res.tender, res.events);
                void saveSeenState(nextStore);
                return nextStore;
            });
        }
        catch {
            // use cached item and filter global events
        }
    }, [currentUser?.telegram_id, events, seenStore, tenders]);
    const handleToggleUserFavorite = async (tender) => {
        const nextFav = !tender.is_favorite;
        setTenders((prev) => prev.map((t) => (t.number === tender.number ? { ...t, is_favorite: nextFav } : t)));
        try {
            await toggleUserFavorite(tender.number, nextFav);
            showToast(nextFav ? "Добавлено в избранное ⭐" : "Убрано из избранного");
        }
        catch (err) {
            setTenders((prev) => prev.map((t) => t.number === tender.number ? { ...t, is_favorite: tender.is_favorite } : t));
            showToast(err instanceof Error ? err.message : "Ошибка избранного");
        }
    };
    const handleUnlockTender = async (number) => {
        setUnlocking(true);
        try {
            const res = await unlockTender(number);
            const realNumber = res.number || number;
            const prevNumber = res.previous_number || number;
            setCurrentUser((prev) => (prev ? { ...prev, open_credits: res.open_credits } : prev));
            setTenders((prev) => prev.map((t) => t.number === number || t.number === prevNumber
                ? res.tender || {
                    ...t,
                    number: realNumber,
                    is_unlocked: true,
                    unlocked_at: res.unlocked_at,
                }
                : t));
            setSelectedNumber((curr) => curr === number || curr === prevNumber ? realNumber : curr);
            try {
                const detail = await fetchTenderDetail(realNumber);
                setDetailEvents(detail.events);
                setTenders((prev) => prev.map((t) => (t.number === realNumber ? detail.tender : t)));
            }
            catch {
                // fallback already applied from unlock response
            }
            showToast("Тендер открыт! Доступны поставщики и ссылки.");
        }
        catch (err) {
            if (err instanceof CrmApiError && (err.info.code === "NO_CREDITS" || err.info.status === 402)) {
                setCreditsModalOpen(true);
                showToast(err.info.error);
            }
            else {
                showToast(err instanceof Error ? err.message : "Не удалось открыть тендер");
            }
        }
        finally {
            setUnlocking(false);
        }
    };
    const handleSaveUserNotes = async (number, userNotes) => {
        setSaving(true);
        try {
            const res = await saveUserNotes(number, userNotes);
            setTenders((prev) => prev.map((t) => (t.number === number ? { ...t, user_notes: res.user_notes } : t)));
            showToast("Заметка сохранена");
        }
        catch (err) {
            showToast(err instanceof Error ? err.message : "Ошибка сохранения заметки");
        }
        finally {
            setSaving(false);
        }
    };
    const handleResetDemo = async () => {
        setResettingDemo(true);
        try {
            const res = await resetDemoCredits(true);
            setCurrentUser((prev) => (prev ? { ...prev, open_credits: res.open_credits } : prev));
            setTenders((prev) => prev.map((t) => ({ ...t, is_unlocked: false, unlocked_at: null })));
            showToast(`Тест сброшен: начислено ${res.open_credits} открытий`);
        }
        catch (err) {
            showToast(err instanceof Error ? err.message : "Не удалось сбросить тест");
        }
        finally {
            setResettingDemo(false);
        }
    };
    const runGenerateSubmissionDocs = async (number, variant) => {
        setGeneratingDocs(true);
        try {
            const res = await generateSubmissionDocs(number, variant);
            setGeneratedDocsResult(res);
            showToast(res.sent_to_telegram
                ? "4 файла .docx отправлены вам в чат с ботом!"
                : "4 файла .docx сформированы!");
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : "Ошибка формирования документов";
            const code = err instanceof CrmApiError
                ? err.info.code
                : err?.code;
            if (code === "PROFILE_REQUIRED") {
                setPendingDocGen({ number, variant });
                setCompanyProfileOpen(true);
                showToast("Заполните реквизиты один раз для формирования .docx");
            }
            else {
                showToast(msg);
            }
        }
        finally {
            setGeneratingDocs(false);
        }
    };
    const handleGenerateSubmissionDocs = async (number, variant) => {
        const profile = currentUser?.company_profile;
        if (!profile?.full_name?.trim() || !profile?.inn?.trim()) {
            setPendingDocGen({ number, variant });
            setCompanyProfileOpen(true);
            return;
        }
        await runGenerateSubmissionDocs(number, variant);
    };
    const handleSaveCompanyProfile = async (profile) => {
        setSavingCompanyProfile(true);
        try {
            const res = await saveCompanyProfile(profile);
            setCurrentUser((prev) => prev ? { ...prev, company_profile: res.company_profile } : prev);
            setCompanyProfileOpen(false);
            showToast("Реквизиты сохранены");
            if (pendingDocGen) {
                const nextJob = pendingDocGen;
                setPendingDocGen(null);
                await runGenerateSubmissionDocs(nextJob.number, nextJob.variant);
            }
        }
        finally {
            setSavingCompanyProfile(false);
        }
    };
    const handleSaveOwner = async (number, patch) => {
        setSaving(true);
        try {
            const res = await updateTenderOwner(number, patch);
            setTenders((prev) => prev.map((t) => (t.number === number ? res.tender : t)));
            if (res.event) {
                const nextEv = res.event;
                setEvents((prev) => [nextEv, ...prev].slice(0, 50));
                setDetailEvents((prev) => [nextEv, ...prev]);
                setSeenStore((prevStore) => {
                    if (!prevStore)
                        return prevStore;
                    const nextStore = markTenderAsSeen(currentUser?.telegram_id, prevStore, res.tender, [
                        nextEv,
                    ]);
                    void saveSeenState(nextStore);
                    return nextStore;
                });
            }
            showToast("Сохранено");
        }
        catch (err) {
            showToast(err instanceof Error ? err.message : "Ошибка сохранения");
        }
        finally {
            setSaving(false);
        }
    };
    const handleActivateAccessCode = async (code) => {
        if (!currentUser)
            return;
        const res = await registerWithPassword(String(currentUser.telegram_id), code);
        setCurrentUser(res.user);
        showToast(res.user.role === "manager" || res.user.role === "owner"
            ? "Доступ повышен! Открыт режим CRM."
            : "Код доступа активирован!");
        await loadData(true);
    };
    // Активные и отсеянные данные для Админ CRM (без просроченных — просроченные в CRM физически не попадают)
    const crmTenders = useMemo(() => tenders.filter((t) => t.stage !== "overdue" && getDeadlineInfo(t.deadline_at).tone !== "expired"), [tenders]);
    const updatesState = useMemo(() => {
        if (!seenStore) {
            return {
                byTender: {},
                feed: [],
                tabUnread: { pipeline: 0, mail: 0, qc: 0, archive: 0 },
            };
        }
        return computeUpdates(crmTenders, events, seenStore);
    }, [crmTenders, events, seenStore]);
    // Данные для Витрины (клиентский режим — строго после ОТК Ревизора;
    // открытые/избранные клиентом остаются доступными для отслеживания даже после срока)
    const storefrontTenders = useMemo(() => tenders.filter((t) => isTenderStorefrontReady(t)), [tenders]);
    const unlockedTenders = useMemo(() => tenders
        .filter((t) => Boolean(t.is_unlocked))
        .sort((a, b) => new Date(b.unlocked_at || b.synced_at).getTime() -
        new Date(a.unlocked_at || a.synced_at).getTime()), [tenders]);
    const favoriteTenders = useMemo(() => tenders
        .filter((t) => Boolean(t.is_favorite) &&
        t.stage !== "rejected" &&
        t.stage !== "unprofitable")
        .sort((a, b) => new Date(b.synced_at).getTime() - new Date(a.synced_at).getTime()), [tenders]);
    const filteredStorefrontTenders = useMemo(() => {
        const q = search.trim().toLowerCase();
        const baseList = storefrontTab === "favorites"
            ? favoriteTenders
            : storefrontChip === "unlocked"
                ? unlockedTenders
                : storefrontChip === "favorites"
                    ? favoriteTenders
                    : storefrontTenders;
        const list = baseList.filter((t) => {
            if (q) {
                const hay = [
                    t.product,
                    t.subject || "",
                    t.city || "",
                    t.is_unlocked ? t.number : "",
                    t.is_unlocked ? t.details?.customer?.short_name || "" : "",
                    t.is_unlocked ? t.details?.customer?.name || "" : "",
                ]
                    .join(" ")
                    .toLowerCase();
                if (!hay.includes(q))
                    return false;
            }
            if (storefrontTab === "showcase") {
                if (storefrontChip === "medical")
                    return getTenderRestrictionInfo(t).isMedical;
                if (storefrontChip === "restricted")
                    return getTenderRestrictionInfo(t).hasAnyRestriction;
                if (storefrontChip === "high_profit")
                    return Number(t.profit ?? 0) >= 25000;
                if (storefrontChip === "urgent") {
                    const dl = getDeadlineInfo(t.deadline_at);
                    return dl.tone === "critical";
                }
            }
            return true;
        });
        const sorted = [...list];
        sorted.sort((a, b) => {
            if (storefrontSort === "profit") {
                return Number(b.profit ?? -1e12) - Number(a.profit ?? -1e12);
            }
            if (storefrontSort === "newest") {
                return new Date(b.synced_at).getTime() - new Date(a.synced_at).getTime();
            }
            if (storefrontSort === "oldest") {
                return new Date(a.synced_at).getTime() - new Date(b.synced_at).getTime();
            }
            const ta = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
            const tb = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
            return ta - tb;
        });
        return sorted;
    }, [
        favoriteTenders,
        search,
        storefrontChip,
        storefrontSort,
        storefrontTab,
        storefrontTenders,
        unlockedTenders,
    ]);
    // Данные для внутренней Админ CRM (рабочая лошадка конвейера, без Просрочено)
    const tabCounts = useMemo(() => {
        const pipelineCount = crmTenders.filter((t) => ["blanks", "prices", "inquiry", "calc", "review", "tenders"].includes(t.stage)).length;
        const mailCount = crmTenders.filter((t) => {
            if (t.stage === "inquiry")
                return true;
            if (t.stage !== "tenders")
                return false;
            if (isTenderAllPublicOffer(t))
                return false;
            const mailSellers = t.details?.mail_state?.продавцы || [];
            if (mailSellers.length > 0) {
                return !mailSellers.every((s) => s.статус === "публичная_оферта");
            }
            return (t.details?.inquiry_suppliers?.length ?? 0) > 0;
        }).length;
        const qcBlockedCount = crmTenders.filter((t) => t.stage === "tenders" && !isTenderStorefrontReady(t)).length;
        const archiveCount = crmTenders.filter((t) => ["unprofitable", "rejected"].includes(t.stage)).length;
        return {
            pipeline: pipelineCount,
            mail: mailCount,
            qc: qcBlockedCount > 0 ? qcBlockedCount : storefrontTenders.length,
            qcLabel: String(qcBlockedCount > 0 ? qcBlockedCount : storefrontTenders.length),
            archive: archiveCount,
        };
    }, [crmTenders, storefrontTenders.length]);
    if (loading) {
        return (_jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center gap-3 p-4", children: [_jsx("div", { className: "w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" }), _jsx("p", { className: "text-sm crm-muted", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0432\u0438\u0442\u0440\u0438\u043D\u044B \u0422\u0435\u043D\u0434\u0435\u0440\u041C\u044D\u043D..." })] }));
    }
    if (error) {
        return _jsx(AuthGateScreen, { error: error, onRetry: () => void loadData(false) });
    }
    return (_jsxs("div", { className: "min-h-screen w-full max-w-2xl mx-auto px-3 pt-2.5 pb-24 overflow-x-clip", children: [toast && (_jsx("div", { className: "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-lg max-w-[90vw] text-center", children: toast })), creditsModalOpen && (_jsx(CreditsModal, { openCredits: openCredits, dailyCredits: effectiveDailyCredits, resetting: resettingDemo, canResetDemo: isOwner, onClose: () => setCreditsModalOpen(false), onResetDemo: handleResetDemo, onToast: showToast })), accessOpen && isOwner && currentUser && (_jsx(AdminAccessModal, { ownerTelegramId: currentUser.telegram_id, onClose: () => setAccessOpen(false), onToast: showToast, onOwnerCreditsChanged: (nextOpenCredits, nextEffectiveDaily) => {
                    setCurrentUser((prev) => prev
                        ? {
                            ...prev,
                            open_credits: nextOpenCredits,
                            effective_daily_credits: nextEffectiveDaily,
                        }
                        : prev);
                } })), _jsx(CompanyProfileModal, { open: companyProfileOpen, initialProfile: currentUser?.company_profile, saving: savingCompanyProfile, autoContinueDocGen: Boolean(pendingDocGen), onClose: () => {
                    setCompanyProfileOpen(false);
                    setPendingDocGen(null);
                }, onSave: handleSaveCompanyProfile }), selectedTender ? (_jsx(TenderDetail, { tender: selectedTender, events: detailEvents.length > 0
                    ? detailEvents
                    : events.filter((e) => e.tender_number === selectedTender.number), saving: saving, readOnly: currentUser?.role === "viewer", storefrontMode: effectiveViewMode === "storefront", openCredits: openCredits, unlocking: unlocking, onUnlockTender: () => handleUnlockTender(selectedTender.number), onOpenTopUpModal: () => setCreditsModalOpen(true), onToggleFavorite: () => handleToggleUserFavorite(selectedTender), onSaveUserNotes: (notes) => handleSaveUserNotes(selectedTender.number, notes), onToast: showToast, companyProfile: currentUser?.company_profile, generatingDocs: generatingDocs, generatedDocsResult: generatedDocsResult, onOpenCompanyProfile: () => {
                    setPendingDocGen(null);
                    setCompanyProfileOpen(true);
                }, onGenerateDocs: (variant) => handleGenerateSubmissionDocs(selectedTender.number, variant), onBack: handleBack, onSaveOwner: (patch) => handleSaveOwner(selectedTender.number, patch) })) : effectiveViewMode === "storefront" ? (
            /* ================= КЛИЕНТСКАЯ ВИТРИНА + ЛИЧНЫЙ КАБИНЕТ ================= */
            _jsxs("div", { className: "space-y-3", children: [_jsxs("header", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-1.5 min-w-0", children: [_jsxs("button", { type: "button", onClick: () => {
                                            haptic("light");
                                            setCreditsModalOpen(true);
                                        }, className: "rounded-xl px-2.5 py-2 text-xs font-bold inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500/15 to-blue-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 active:scale-95 transition shrink-0", title: "\u0411\u0430\u043B\u0430\u043D\u0441 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0439", children: [_jsx(KeyRound, { className: "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" }), _jsxs("span", { children: ["\u041E\u0442\u043A\u0440\u044B\u0442\u0438\u044F: ", openCredits] })] }), isPreviewMode() && (_jsx("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold shrink-0", children: "\u041F\u0440\u0435\u0434\u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440" }))] }), _jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [_jsxs("button", { type: "button", disabled: refreshing, onClick: () => {
                                            haptic("light");
                                            void loadData(true);
                                        }, className: "crm-surface rounded-xl px-2.5 py-2 text-xs font-medium inline-flex items-center gap-1.5 active:scale-95", title: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C", children: [_jsx(RefreshCw, { className: `w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}` }), _jsx("span", { className: "hidden sm:inline", children: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C" })] }), isOwner && (_jsx("button", { type: "button", onClick: () => {
                                            haptic("light");
                                            setAccessOpen(true);
                                        }, className: "crm-surface rounded-xl p-2 active:scale-95", title: "\u0414\u043E\u0441\u0442\u0443\u043F \u0438 \u043A\u0440\u0435\u0434\u0438\u0442\u044B \u0412\u0438\u0442\u0440\u0438\u043D\u044B", children: _jsx(Shield, { className: "w-3.5 h-3.5 text-blue-500" }) })), canAccessCrm && (_jsxs("button", { type: "button", onClick: () => {
                                            haptic("select");
                                            setViewMode("admin");
                                        }, className: "crm-surface rounded-xl px-2.5 py-2 text-xs font-medium inline-flex items-center gap-1 active:scale-95", title: "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u0432 \u0430\u0434\u043C\u0438\u043D CRM", children: [_jsx(Settings, { className: "w-3.5 h-3.5 text-blue-500" }), _jsx("span", { children: "CRM" })] }))] })] }), storefrontTab === "cabinet" && currentUser ? (_jsx(CabinetView, { user: currentUser, unlockedTenders: unlockedTenders, favoriteTenders: favoriteTenders, resettingDemo: resettingDemo, canResetDemo: isOwner, onOpenTender: (num) => void openTender(num), onToggleFavorite: (item) => void handleToggleUserFavorite(item), onOpenCreditsModal: () => setCreditsModalOpen(true), onOpenCompanyProfile: () => {
                            setPendingDocGen(null);
                            setCompanyProfileOpen(true);
                        }, onResetDemo: handleResetDemo, onActivateAccessCode: handleActivateAccessCode })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "w-4 h-4 crm-muted absolute left-3 top-1/2 -translate-y-1/2" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0442\u043E\u0432\u0430\u0440\u0443, \u0433\u043E\u0440\u043E\u0434\u0443...", className: "w-full crm-surface rounded-xl pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" }), search && (_jsx("button", { type: "button", onClick: () => setSearch(""), className: "absolute right-2.5 top-1/2 -translate-y-1/2 crm-muted", children: _jsx(X, { className: "w-4 h-4" }) }))] }), _jsxs("button", { type: "button", onClick: () => {
                                            haptic("select");
                                            setStorefrontSort((prev) => prev === "profit"
                                                ? "deadline"
                                                : prev === "deadline"
                                                    ? "newest"
                                                    : prev === "newest"
                                                        ? "oldest"
                                                        : "profit");
                                        }, className: "crm-surface rounded-xl px-2.5 py-2 text-xs font-medium inline-flex items-center gap-1 shrink-0", children: [_jsx(ArrowUpDown, { className: "w-3.5 h-3.5" }), storefrontSort === "profit"
                                                ? "Прибыль"
                                                : storefrontSort === "deadline"
                                                    ? "Срок"
                                                    : storefrontSort === "newest"
                                                        ? "Новые"
                                                        : "Старые"] })] }), storefrontTab === "showcase" && (_jsxs("select", { "aria-label": "\u0424\u0438\u043B\u044C\u0442\u0440 \u0432\u0438\u0442\u0440\u0438\u043D\u044B", value: storefrontChip, onChange: (e) => {
                                    haptic("select");
                                    setStorefrontChip(e.target.value);
                                }, className: "w-full crm-surface text-[var(--crm-text)] rounded-xl border border-[var(--crm-border)] px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/40", children: [_jsxs("option", { value: "all", children: ["\u0412\u0441\u0435 \u0433\u043E\u0442\u043E\u0432\u044B\u0435 (", storefrontTenders.length, ")"] }), _jsxs("option", { value: "restricted", children: ["\uD83D\uDCDC \u041E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F / \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 (", storefrontTenders.filter((t) => getTenderRestrictionInfo(t).hasAnyRestriction).length, ")"] }), _jsxs("option", { value: "medical", children: ["\uD83C\uDFE5 \u041C\u0435\u0434\u0442\u043E\u0432\u0430\u0440\u044B (", storefrontTenders.filter((t) => getTenderRestrictionInfo(t).isMedical).length, ")"] }), _jsxs("option", { value: "unlocked", children: ["\uD83D\uDD13 \u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u043C\u043D\u043E\u0439 (", unlockedTenders.length, ")"] }), _jsxs("option", { value: "favorites", children: ["\u2B50 \u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435 (", favoriteTenders.length, ")"] }), _jsx("option", { value: "high_profit", children: "\uD83D\uDCB0 \u041F\u0440\u0438\u0431\u044B\u043B\u044C > 25 000 \u20BD" }), _jsx("option", { value: "urgent", children: "\uD83D\uDD25 \u0414\u043E \u043F\u043E\u0434\u0430\u0447\u0438 < 48\u0447" })] })), filteredStorefrontTenders.length === 0 ? (_jsxs("div", { className: "crm-surface rounded-2xl p-8 text-center space-y-1.5", children: [_jsx("p", { className: "text-sm font-medium", children: storefrontTab === "favorites"
                                            ? "В избранном пока нет тендеров"
                                            : "Подходящих готовых тендеров пока нет" }), _jsx("p", { className: "text-xs crm-muted", children: storefrontTab === "favorites"
                                            ? "Отметьте ⭐ интересные тендеры на Витрине, чтобы быстро возвращаться к ним."
                                            : "Попробуйте сбросить фильтры или обновить витрину." })] })) : (_jsx("div", { className: "space-y-2.5", children: filteredStorefrontTenders.map((t) => (_jsx(TenderCard, { tender: t, storefrontMode: true, onOpen: (item) => void openTender(item.number), onToggleFavorite: (item) => void handleToggleUserFavorite(item) }, t.number))) }))] }))] })) : (
            /* ================= ВНУТРЕННЯЯ АДМИН CRM (ТОЛЬКО ДЛЯ OWNER) ================= */
            _jsxs("div", { className: "space-y-2.5 w-full min-w-0", children: [_jsxs("header", { className: "flex items-center justify-between gap-2 min-w-0", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5 min-w-0", children: [_jsx("h1", { className: "text-base font-bold tracking-tight truncate", children: "\u041A\u043E\u043D\u0432\u0435\u0439\u0435\u0440 CRM" }), currentUser?.role === "viewer" && (_jsx("span", { className: "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-500/15 crm-muted font-semibold shrink-0", children: _jsx(Eye, { className: "w-3 h-3" }) })), isPreviewMode() && (_jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold shrink-0", children: "\u041F\u0440\u0435\u0432\u044C\u044E" }))] }), _jsx("p", { className: "text-[10.5px] crm-muted truncate", children: nskTime || "Новосибирск (UTC+7)" })] }), _jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [_jsxs("button", { type: "button", onClick: () => {
                                            haptic("select");
                                            setViewMode("storefront");
                                        }, className: "rounded-xl px-2.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 active:scale-95", title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043A\u043B\u0438\u0435\u043D\u0442\u0441\u043A\u0443\u044E \u0432\u0438\u0442\u0440\u0438\u043D\u0443", children: [_jsx(Store, { className: "w-3.5 h-3.5" }), _jsxs("span", { children: ["\u0412\u0438\u0442\u0440\u0438\u043D\u0430 \u00B7 ", storefrontTenders.length] })] }), _jsxs("button", { type: "button", onClick: () => {
                                            haptic("select");
                                            setUpdatesOpen((v) => !v);
                                        }, className: `crm-surface rounded-xl p-2 active:scale-95 relative ${updatesOpen ? "ring-1 ring-blue-500/50" : ""}`, title: `Обновления (${updatesState.feed.length})`, children: [_jsx(Bell, { className: "w-3.5 h-3.5 text-blue-500" }), updatesState.feed.length > 0 && (_jsx("span", { className: "absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[9px] font-bold leading-4 text-center", children: updatesState.feed.length > 99 ? "99+" : updatesState.feed.length }))] }), isOwner && (_jsx("button", { type: "button", onClick: () => {
                                            haptic("light");
                                            setAccessOpen(true);
                                        }, className: "crm-surface rounded-xl p-2 active:scale-95", title: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438 \u0438 \u0434\u043E\u0441\u0442\u0443\u043F", children: _jsx(Shield, { className: "w-3.5 h-3.5 text-blue-500" }) })), _jsx("button", { type: "button", disabled: refreshing, onClick: () => {
                                            haptic("light");
                                            void loadData(true);
                                        }, className: "crm-surface rounded-xl p-2 active:scale-95", title: "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C", children: _jsx(RefreshCw, { className: `w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}` }) })] })] }), updatesOpen && (_jsxs("section", { className: "crm-surface rounded-xl border border-blue-500/35 bg-blue-500/8 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 px-3 py-2", children: [_jsxs("span", { className: "text-xs font-semibold text-blue-700 dark:text-blue-300 truncate", children: ["\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043A\u043E\u043D\u0432\u0435\u0439\u0435\u0440\u0430 (", updatesState.feed.length, ")"] }), _jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [_jsxs("button", { type: "button", onClick: () => {
                                                    haptic("light");
                                                    if (seenStore) {
                                                        const nextStore = markAllAsSeen(currentUser?.telegram_id, seenStore, tenders, events);
                                                        setSeenStore(nextStore);
                                                        void saveSeenState(nextStore);
                                                        setUpdatesOpen(false);
                                                        showToast("Все обновления прочитаны");
                                                    }
                                                }, className: "inline-flex items-center gap-1 text-[11px] font-medium crm-muted hover:text-[var(--crm-text)] px-2 py-1 rounded-lg bg-slate-500/10", children: [_jsx(CheckCheck, { className: "w-3 h-3" }), "\u041F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043E"] }), _jsx("button", { type: "button", onClick: () => setUpdatesOpen(false), className: "p-1 crm-muted", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] })] }), _jsxs("div", { className: "border-t border-blue-500/20 max-h-56 overflow-y-auto divide-y divide-[var(--crm-border)]", children: [updatesState.feed.length === 0 && (_jsx("p", { className: "px-3 py-3 text-[11px] crm-muted", children: "\u041D\u043E\u0432\u044B\u0445 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u043D\u0435\u0442. \u041A\u043E\u0433\u0434\u0430 \u043B\u043E\u0442 \u0441\u043C\u0435\u043D\u0438\u0442 \u044D\u0442\u0430\u043F, \u043E\u043D \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C." })), updatesState.feed.slice(0, 30).map((item) => (_jsxs("button", { type: "button", onClick: () => {
                                            haptic("light");
                                            setUpdatesOpen(false);
                                            void openTender(item.number);
                                        }, className: "w-full text-left px-3 py-2 hover:bg-blue-500/10 flex items-start justify-between gap-2 text-xs transition", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5 font-medium truncate", children: [item.kind === "new" ? (_jsx(Sparkles, { className: "w-3 h-3 text-blue-500 shrink-0" })) : (_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" })), _jsxs("span", { className: "truncate", children: [item.tender.icon || "📦", " ", item.tender.product] })] }), _jsx("div", { className: "text-[11px] text-blue-700 dark:text-blue-300 truncate mt-0.5", children: item.reason })] }), _jsx("span", { className: "text-[10px] crm-muted shrink-0", children: formatNskDateTime(item.at, true) })] }, item.number)))] })] })), activeTab === "pipeline" ? (_jsx(PipelineBoardView, { tenders: tenders, snapshot: snapshot, updatesByTender: updatesState.byTender, events: events, readOnly: currentUser?.role === "viewer", isOwner: currentUser?.role === "owner", onSnapshotUpdated: (nextSnap) => setSnapshot(nextSnap), onOpenTender: (num) => void openTender(num), onToggleFavorite: (item) => void handleSaveOwner(item.number, { is_favorite: !item.is_favorite }), onOpenArchive: () => setActiveTab("archive") })) : activeTab === "mail" ? (_jsx(PriceRequestsView, { tenders: crmTenders, updatesByTender: updatesState.byTender, onOpenNumber: (num) => void openTender(num) })) : activeTab === "qc" ? (_jsx(RevizorQueueView, { tenders: crmTenders, updatesByTender: updatesState.byTender, onOpenNumber: (num) => void openTender(num), onOpenStorefront: () => setViewMode("storefront") })) : activeTab === "stats" ? (_jsx(StatsView, { snapshot: snapshot, tenders: tenders })) : activeTab === "tracking" ? (_jsx(TrackingView, { snapshot: snapshot })) : (_jsx(RejectedArchiveView, { tenders: crmTenders, snapshot: snapshot, updatesByTender: updatesState.byTender, readOnly: currentUser?.role === "viewer", onOpenTender: (num) => void openTender(num), onToggleFavorite: (item) => void handleSaveOwner(item.number, { is_favorite: !item.is_favorite }) }))] })), !selectedTender &&
                (effectiveViewMode === "storefront" ? (_jsx("nav", { className: "fixed bottom-0 inset-x-0 z-30 border-t border-[var(--crm-border)] bg-[var(--crm-surface)]/95 backdrop-blur-md", children: _jsx("div", { className: "max-w-2xl mx-auto grid grid-cols-3 px-1 py-1.5", children: ([
                            {
                                id: "showcase",
                                label: "Витрина",
                                icon: Flame,
                                badge: String(storefrontTenders.length),
                                badgeAccent: false,
                            },
                            {
                                id: "favorites",
                                label: "Избранное",
                                icon: Star,
                                badge: String(favoriteTenders.length),
                                badgeAccent: false,
                            },
                            {
                                id: "cabinet",
                                label: "Кабинет",
                                icon: User,
                                badge: `🔑 ${openCredits}`,
                                badgeAccent: true,
                            },
                        ]).map(({ id, label, icon: Icon, badge, badgeAccent }) => {
                            const active = storefrontTab === id;
                            return (_jsxs("button", { type: "button", onClick: () => {
                                    haptic("select");
                                    setStorefrontTab(id);
                                }, className: `flex flex-col items-center justify-center py-1 rounded-xl text-[10.5px] leading-tight font-medium transition relative ${active ? "text-[var(--crm-accent)] font-semibold" : "crm-muted"}`, children: [_jsxs("span", { className: "inline-flex items-center gap-1 px-0.5 whitespace-nowrap", children: [_jsx(Icon, { className: "w-3.5 h-3.5" }), _jsx("span", { children: label }), _jsx("span", { className: `px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${badgeAccent
                                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                                    : "bg-slate-500/12"}`, children: badge })] }), active && (_jsx("span", { className: "mt-1 w-5 h-0.5 rounded-full bg-[var(--crm-accent)]" }))] }, id));
                        }) }) })) : (_jsx("nav", { className: "fixed bottom-0 inset-x-0 z-30 border-t border-[var(--crm-border)] bg-[var(--crm-surface)]/95 backdrop-blur-md", children: _jsx("div", { className: "w-full max-w-2xl mx-auto grid grid-cols-6 px-1 py-1", children: ([
                            {
                                id: "pipeline",
                                label: "Этапы",
                                icon: Workflow,
                                badge: String(tabCounts.pipeline),
                                unread: updatesState.tabUnread.pipeline,
                            },
                            {
                                id: "mail",
                                label: "Почта",
                                icon: Mail,
                                badge: String(tabCounts.mail),
                                unread: updatesState.tabUnread.mail,
                            },
                            {
                                id: "qc",
                                label: "ОТК",
                                icon: ShieldCheck,
                                badge: tabCounts.qcLabel,
                                unread: updatesState.tabUnread.qc,
                            },
                            {
                                id: "stats",
                                label: "Статистика",
                                icon: BarChart3,
                                badge: "",
                                unread: 0,
                            },
                            {
                                id: "tracking",
                                label: "Рынок",
                                icon: ScanSearch,
                                badge: String(snapshot?.engine_info?.tracking?.length || ""),
                                unread: 0,
                            },
                            {
                                id: "archive",
                                label: "Архив",
                                icon: Archive,
                                badge: String(tabCounts.archive),
                                unread: updatesState.tabUnread.archive,
                            },
                        ]).map(({ id, label, icon: Icon, badge, unread }) => {
                            const active = activeTab === id;
                            return (_jsxs("button", { type: "button", onClick: () => {
                                    haptic("select");
                                    setActiveTab(id);
                                }, className: `flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] leading-tight font-medium transition min-w-0 ${active ? "text-[var(--crm-accent)] font-semibold" : "crm-muted"}`, children: [_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx(Icon, { className: "w-4 h-4 shrink-0" }), _jsx("span", { className: "text-[10px] font-bold opacity-80", children: badge }), unread > 0 && (_jsx("span", { title: `Новых обновлений: ${unread}`, className: "w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" }))] }), _jsx("span", { className: "mt-0.5 truncate max-w-full", children: label })] }, id));
                        }) }) })))] }));
}
export default App;
