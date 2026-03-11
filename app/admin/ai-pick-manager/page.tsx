"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    query,
    orderBy,
    limit,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from "recharts";
import {
    Play,
    RotateCcw,
    Settings,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Brain,
    ListFilter,
    BarChart3,
    Loader2,
    Eye,
    TestTube2,
} from "lucide-react";
import { BotTestPanel } from "./components/BotTestPanel";

interface DayReport {
    date: string;
    collected: number;
    missing: number;
    grade: "Golden" | "Danger" | "Mixed";
}

interface BotConfig {
    bot_id: string;
    group: string;
    strategy_name: string;
    temperature: number;
    weight: number;
}

export default function AiPickManagerPage() {
    const [reports, setReports] = useState<DayReport[]>([]);
    const [bots, setBots] = useState<BotConfig[]>([]);
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [selectedGame, setSelectedGame] = useState("bubble_ladder");
    const [selectedYear, setSelectedYear] = useState("2026");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"extractor" | "simulator" | "config" | "bot_test">("extractor");
    const [startRound, setStartRound] = useState<string>("1");
    const [endRound, setEndRound] = useState<string>("480");

    // 시뮬레이션 상세 데이터 상태
    const [simRounds, setSimRounds] = useState<any[]>([]);
    const [simDailyInfo, setSimDailyInfo] = useState<any>(null);
    const [simProgress, setSimProgress] = useState(0);

    // 프롬프트 미리보기 상태
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [showPreviewDialog, setShowPreviewDialog] = useState(false);
    const [showForcePrompt, setShowForcePrompt] = useState(false);
    const [showStep2Prompt, setShowStep2Prompt] = useState(false);

    // 원본 데이터(회차) 조회 상태
    const [rawRounds, setRawRounds] = useState<any[]>([]);
    const [isRawLoading, setIsRawLoading] = useState(false);
    const [showRawDialog, setShowRawDialog] = useState(false);
    const [rawDate, setRawDate] = useState("");
    const [selectedReportDate, setSelectedReportDate] = useState<string | null>(null);

    // API 기본 주소 설정 (에뮬레이터 vs 운영)
    const getApiUrl = (funcName: string) => {
        const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
        if (isLocal) {
            // 에뮬레이터 주소 (프로젝트 ID: alphapick-a9b9e, 리전: us-central1)
            return `http://127.0.0.1:5001/alphapick-a9b9e/us-central1/${funcName}`;
        }
        // 운영 주소
        return `https://${funcName}-kqf7pzhpsq-uc.a.run.app`;
    };

    // 데이터 조회 로직 (Backend API 호출)
    const fetchReport = async () => {
        if (!selectedGame || !selectedYear) {
            alert("게임과 연도를 선택해주세요.");
            return;
        }

        setLoading(true);
        const url = getApiUrl("getAiAnalysisReport");
        console.log("Fetching report from:", url);

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gameId: selectedGame,
                    year: selectedYear,
                    startDate: startDate.replace(/-/g, ""), // YYYY-MM-DD -> YYYYMMDD
                    endDate: endDate.replace(/-/g, ""),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Backend Error Details:", errorData);
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setReports(data.report);
            }
        } catch (error: any) {
            console.error("Report fetch error:", error);
            alert(`데이터 추출 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 초기 데이터 조회 (카테고리 & 봇)
    useEffect(() => {
        // 카테고리 (게임 리스트) 조회
        const unsubCategories = onSnapshot(collection(db, "categories"), (snapshot) => {
            const cats = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
            setCategories(cats);
        });

        // 봇 설정 실시간 조회
        const unsubBots = onSnapshot(collection(db, "ai_bots"), (snapshot) => {
            const bData = snapshot.docs.map(d => d.data() as BotConfig);
            setBots(bData.sort((a, b) => a.bot_id.localeCompare(b.bot_id)));
        }, (error) => {
            console.error("Bots snapshot permission error:", error);
        });

        return () => {
            unsubCategories();
            unsubBots();
        };
    }, []);

    const handleViewPrompt = async (date: string) => {
        setIsPreviewLoading(true);
        setPreviewError(null);
        setPreviewData(null);
        setShowForcePrompt(false);
        setShowStep2Prompt(false);
        setShowPreviewDialog(true);
        const url = getApiUrl("getAiPromptPreview");
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gameId: selectedGame,
                    date,
                    startRound: parseInt(startRound),
                    endRound: parseInt(endRound)
                }),
            });
            const result = await response.json();
            if (result.success) {
                setPreviewData(result);
            } else {
                setPreviewError(result.message || result.error || "알 수 없는 오류가 발생했습니다.");
            }
        } catch (error: any) {
            console.error("Preview error:", error);
            setPreviewError(`서버와의 통신 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handleViewRawData = async (date: string, silent = false) => {
        setRawDate(date);
        if (!silent) {
            setIsRawLoading(true);
            setShowRawDialog(true);
        }
        setSelectedReportDate(date);
        setRawRounds([]);

        try {
            const roundsRef = collection(db, "games", `${selectedYear}_${selectedGame}`, "result", date, "rounds");
            const q = query(roundsRef, orderBy("round", "asc"));

            // 실시간 리스너 등록 후 상태 업데이트
            onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => doc.data());
                setRawRounds(data);
                setIsRawLoading(false);
            }, (err) => {
                console.error("Raw rounds fetch error:", err);
                setIsRawLoading(false);
            });
        } catch (error) {
            console.error("Raw data fetch error:", error);
            setIsRawLoading(false);
        }
    };

    const handleStartSimulation = async (date: string) => {
        setSelectedDate(date);
        setIsSimulating(true);
        setSimProgress(0);
        setSimRounds([]);
        setSimDailyInfo(null);
        setActiveTab("simulator");

        const url = getApiUrl("startAiSimulation");
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gameId: selectedGame,
                    date,
                    startRound: parseInt(startRound),
                    endRound: parseInt(endRound)
                }),
            });
            const result = await response.json();
            if (result.success) {
                // 시뮬레이션 종료 시점에 대한 추가 처리 가능
            } else {
                throw new Error(result.error || "Unknown server error");
            }
        } catch (error: any) {
            console.error("Simulation error:", error);
            alert(`시뮬레이션 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsSimulating(false);
            setSimProgress(100);
        }
    };

    // 시뮬레이션 실시간 리스너
    useEffect(() => {
        if (!selectedDate || activeTab !== "simulator") return;

        const dayRef = doc(db, "ai_analysis", `${selectedYear}_${selectedGame}`, "days", selectedDate);
        const roundsRef = collection(dayRef, "rounds");

        // 1. 일자별 요약 리스너
        const unsubDay = onSnapshot(dayRef, (docSnap) => {
            if (docSnap.exists()) {
                setSimDailyInfo(docSnap.data());
            }
        });

        // 2. 회차별 결과 리스너
        const unsubRounds = onSnapshot(query(roundsRef, orderBy("metadata.timestamp", "asc")), (snapshot) => {
            const roundsData = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));
            setSimRounds(roundsData);

            const sR = parseInt(startRound) || 1;
            const eR = parseInt(endRound) || 480;
            const expectedCount = Math.max(1, eR - sR + 1);

            const progress = (roundsData.length / expectedCount) * 100;
            setSimProgress(Math.min(100, progress));
        });

        return () => {
            unsubDay();
            unsubRounds();
        };
    }, [selectedDate, selectedGame, selectedYear, activeTab]);

    // 차트 데이터 변환
    const chartData = simRounds.map(r => ({
        name: `${r.round_info.round}회`,
        profit: r.final_decision.cumulative_profit,
    })).filter((_, index) => index % 10 === 0 || index === simRounds.length - 1);

    const totalProfit = simDailyInfo?.total_profit || 0;
    const wins = simRounds.filter(r => r.final_decision.status === "WIN").length;
    const totalSimRounds = simRounds.length;
    const winRate = totalSimRounds > 0 ? ((wins / totalSimRounds) * 100).toFixed(1) : "0";
    const maxLossStreak = Math.max(0, ...simRounds.map(r => r.metadata?.loss_streak || 0));

    const updateBotConfig = async (botId: string, field: string, value: number) => {
        try {
            const botRef = doc(db, "ai_bots", botId);
            await setDoc(botRef, { [field]: value }, { merge: true });
        } catch (error) {
            console.error("Bot update error:", error);
        }
    };

    const getGradeBadge = (grade: string) => {
        switch (grade) {
            case "Golden": return <Badge className="bg-yellow-500">Golden</Badge>;
            case "Danger": return <Badge variant="destructive">Danger</Badge>;
            default: return <Badge variant="secondary">Mixed</Badge>;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                        <Brain className="w-10 h-10 text-primary" />
                        AI Pick Manager
                    </h1>
                    <p className="text-muted-foreground mt-1">과거 데이터 추출 및 Gemini 2.0 기반 수익률 시뮬레이션 시스템</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={activeTab === "extractor" ? "default" : "outline"}
                        onClick={() => setActiveTab("extractor")}
                        className="font-bold uppercase italic"
                    >
                        <ListFilter className="w-4 h-4 mr-2" />
                        Extractor
                    </Button>
                    <Button
                        variant={activeTab === "simulator" ? "default" : "outline"}
                        onClick={() => setActiveTab("simulator")}
                        className="font-bold uppercase italic"
                    >
                        <Play className="w-4 h-4 mr-2" />
                        Simulator
                    </Button>
                    <Button
                        variant={activeTab === "config" ? "default" : "outline"}
                        onClick={() => setActiveTab("config")}
                        className="font-bold uppercase italic"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Config
                    </Button>
                    <Button
                        variant={activeTab === "bot_test" ? "default" : "outline"}
                        onClick={() => setActiveTab("bot_test")}
                        className="font-bold uppercase italic"
                    >
                        <TestTube2 className="w-4 h-4 mr-2" />
                        Bot Test
                    </Button>
                </div>
            </header>

            {/* [Tab: Extractor] */}
            {activeTab === "extractor" && (
                <div className="grid gap-6">
                    <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-xl">Test Date Extraction Filters</CardTitle>
                            <CardDescription>과거 회차 데이터를 분석하여 시뮬레이션에 적합한 날짜를 탐색합니다.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 rounded-xl border bg-background/50">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Select Game</label>
                                    <select
                                        value={selectedGame}
                                        onChange={(e) => setSelectedGame(e.target.value)}
                                        className="w-full p-2 rounded-lg border bg-background font-bold"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Year</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-full p-2 rounded-lg border bg-background font-bold"
                                    >
                                        <option value="2026">2026</option>
                                        <option value="2025">2025</option>
                                        <option value="2024">2024</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full p-2 rounded-lg border bg-background font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full p-2 rounded-lg border bg-background font-bold"
                                    />
                                </div>
                                <div className="md:col-span-4 flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleViewPrompt(startDate.replace(/-/g, "") || "20260101")}
                                        className="font-bold border-primary text-primary hover:bg-primary/10"
                                    >
                                        <Eye className="w-5 h-5 mr-2" />
                                        PROMPT PREVIEW
                                    </Button>
                                    <Button
                                        onClick={fetchReport}
                                        disabled={loading}
                                        className="w-full md:w-auto px-10 bg-primary font-black italic tracking-tighter uppercase"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ListFilter className="w-5 h-5 mr-2" />}
                                        EXTRACT DATA
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-xl border bg-background overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="font-bold">대상 일자</TableHead>
                                            <TableHead className="font-bold text-center">수집/기대 (480)</TableHead>
                                            <TableHead className="font-bold text-center">누락 개수</TableHead>
                                            <TableHead className="font-bold text-center">데이터 등급</TableHead>
                                            <TableHead className="font-bold text-right">시뮬레이션</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reports.map((report) => (
                                            <TableRow key={report.date}>
                                                <TableCell className="font-mono font-bold">{report.date}</TableCell>
                                                <TableCell className="text-center font-bold">
                                                    <span className={report.collected === 480 ? "text-green-600" : "text-orange-500"}>
                                                        {report.collected}
                                                    </span>
                                                    <span className="text-muted-foreground ml-1">/ 480</span>
                                                </TableCell>
                                                <TableCell className={`text-center font-bold ${report.missing > 0 ? "text-red-500" : "text-green-500"}`}>
                                                    {report.missing}
                                                </TableCell>
                                                <TableCell className="text-center">{getGradeBadge(report.grade)}</TableCell>
                                                <TableCell className="text-right flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleViewPrompt(report.date)}
                                                        className="font-bold border-primary/30 text-primary hover:bg-primary/10"
                                                    >
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        PROMPT
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleStartSimulation(report.date)}
                                                        disabled={isSimulating}
                                                        className="bg-primary hover:bg-primary/90 font-black italic tracking-tighter"
                                                    >
                                                        RUN SIM
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {reports.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                                    분석된 데이터가 없습니다.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                        </CardContent>
                    </Card>
                </div>
            )}

            {/* [Tab: Simulator] */}
            {activeTab === "simulator" && (
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Simulation Header */}
                    <Card className="md:col-span-3">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold">Active Simulation: {selectedDate || "Not Started"}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {isSimulating ? "Gemini 2.5 Flash Deep Simulation Engine Running..." : "Simulation Analysis Complete."}
                                    </p>
                                </div>
                                {(isSimulating || simProgress < 100) && (
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                        <span className="font-black italic text-primary animate-pulse">ANALYZING... ({Math.round(simProgress)}%)</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border bg-background/50">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Simulation Start Round</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="480"
                                        value={startRound}
                                        onChange={(e) => setStartRound(e.target.value)}
                                        className="w-full p-2 rounded-lg border bg-background font-mono font-bold text-sm"
                                        placeholder="1"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Simulation End Round</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="480"
                                        value={endRound}
                                        onChange={(e) => setEndRound(e.target.value)}
                                        className="w-full p-2 rounded-lg border bg-background font-mono font-bold text-sm"
                                        placeholder="480"
                                    />
                                </div>
                                <div className="col-span-2 flex items-end">
                                    <p className="text-[10px] text-muted-foreground italic leading-tight">
                                        * 시뮬레이션 범위를 지정합니다. (기본 1 ~ 480회차)
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-primary h-full transition-all duration-500"
                                    style={{ width: `${simProgress}%` }}
                                ></div>
                            </div>

                            {/* 장기 트렌드 분석 요약 표시 */}
                            {simDailyInfo?.historical_summary && (
                                <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                                    <h4 className="text-xs font-bold uppercase text-primary mb-1">30-Day Trend Summary (AI Insight)</h4>
                                    <p className="text-sm leading-relaxed">{simDailyInfo.historical_summary}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Stats Cards */}
                    <Card className={`border-2 ${totalProfit >= 0 ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Cumulative Profit</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-black ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {totalProfit > 0 ? "+" : ""}{totalProfit.toLocaleString()}원
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">vs Initial Balance: 0원</p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-500/20 bg-blue-500/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Win Rate (Void Excl.)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-blue-600">{winRate}%</div>
                            <p className="text-xs text-muted-foreground mt-1">Hits: {wins} / Total: {totalSimRounds}</p>
                        </CardContent>
                    </Card>

                    <Card className="border-2 border-red-500/20 bg-red-500/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Max Loss Streak</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-red-600">{maxLossStreak}연패</div>
                            <p className="text-xs text-muted-foreground mt-1">진행중인 최대 연패 수치</p>
                        </CardContent>
                    </Card>

                    {/* Profit Chart */}
                    <Card className="md:col-span-3">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Profit Growth Simulation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 10000}만`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "12px", color: "white" }}
                                        labelStyle={{ fontWeight: "bold" }}
                                    />
                                    <Area type="monotone" dataKey="profit" stroke="#8884d8" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Simulation Logs (Real-time) */}
                    <Card className="md:col-span-3">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                <ListFilter className="w-4 h-4" />
                                Real-time Simulation Log
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border bg-muted/30 overflow-hidden max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead className="w-20 text-center">회차</TableHead>
                                            <TableHead className="w-32 text-center">결과(실제)</TableHead>
                                            <TableHead className="w-32 text-center">AI 예측(BOT_01)</TableHead>
                                            <TableHead className="w-24 text-center">매칭</TableHead>
                                            <TableHead className="w-24 text-center">상태</TableHead>
                                            <TableHead className="text-right">수익</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...simRounds].reverse().map((round) => (
                                            <TableRow key={round.id}>
                                                <TableCell className="text-center font-bold">{round.round_info.round}회</TableCell>
                                                <TableCell className="text-center font-mono text-xs">{round.round_info.result || "GAP"}</TableCell>
                                                <TableCell className="text-center font-mono text-xs text-primary">{round.final_decision.pick}</TableCell>
                                                <TableCell className="text-center font-bold">{round.final_decision.match_count}개</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={round.final_decision.status === "WIN" ? "default" : "destructive"} className="text-[10px]">
                                                        {round.final_decision.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={`text-right font-black ${round.final_decision.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                    {round.final_decision.profit > 0 ? "+" : ""}{round.final_decision.profit.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {simRounds.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">
                                                    {isSimulating ? "AI 분석 엔진 가동 중..." : "시뮬레이션 데이터가 없습니다."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
            }

            {/* [Tab: Config] */}
            {
                activeTab === "config" && (
                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Bot Optimization</CardTitle>
                                <CardDescription>시뮬레이션에 참여하는 20개 봇의 성능 파라미터를 실시간 튜닝합니다.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {bots.map((bot) => (
                                        <div key={bot.bot_id} className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold">{bot.group}</Badge>
                                                    <h4 className="font-bold text-sm mt-1">{bot.bot_id}: {bot.strategy_name}</h4>
                                                </div>
                                                <div className="p-1.5 bg-primary/10 rounded-lg">
                                                    <Settings className="w-3 h-3 text-primary" />
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                                                        <span>Temperature</span>
                                                        <span>{bot.temperature}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0" max="1" step="0.1"
                                                        value={bot.temperature}
                                                        onChange={(e) => updateBotConfig(bot.bot_id, "temperature", parseFloat(e.target.value))}
                                                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                                                        <span>Decision Weight</span>
                                                        <span>{bot.weight.toFixed(1)}x</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0.1" max="2" step="0.1"
                                                        value={bot.weight}
                                                        onChange={(e) => updateBotConfig(bot.bot_id, "weight", parseFloat(e.target.value))}
                                                        className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {/* [Tab: Bot Test] */}
            {
                activeTab === "bot_test" && (
                    <BotTestPanel getApiUrl={getApiUrl} gameId={selectedGame} />
                )
            }

            {/* 원본 회차 데이터 다이얼로그 */}
            <Dialog open={showRawDialog} onOpenChange={setShowRawDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-muted-foreground" />
                            Raw Round Data: {rawDate} ({rawRounds.length} Rounds)
                        </DialogTitle>
                        <DialogDescription>
                            Firestore에 저장된 실제 회차 결과 데이터입니다. (Golden 등급 확인용)
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 pb-6">
                        {isRawLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                                <p className="font-bold text-muted-foreground">FETCHING RAW DATA...</p>
                            </div>
                        ) : rawRounds.length > 0 ? (
                            <div className="rounded-xl border bg-muted/20 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="text-center">회차</TableHead>
                                            <TableHead className="text-center">시간</TableHead>
                                            <TableHead className="text-center">결과 Code</TableHead>
                                            <TableHead className="text-right">원본 텍스트</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rawRounds.map((r, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-center font-bold">{r.round}회</TableCell>
                                                <TableCell className="text-center text-xs text-muted-foreground">{r.time}</TableCell>
                                                <TableCell className="text-center font-mono font-bold text-primary">{r.result}</TableCell>
                                                <TableCell className="text-right text-xs">{r.resultOriginal}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="py-20 text-center text-muted-foreground italic">
                                데이터가 없습니다.
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-muted/50 flex justify-end">
                        <Button onClick={() => setShowRawDialog(false)} variant="secondary" className="font-bold">
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 프롬프트 미리보기 다이얼로그 */}
            <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                            <Eye className="w-6 h-6 text-primary" />
                            Actual AI Prompt Preview
                        </DialogTitle>
                        <DialogDescription>
                            Gemini 2.5 Flash에게 실제로 전달되는 프롬프트 전문입니다. 장기 트렌드와 봇별 개별 지침이 포함되어 있습니다.
                        </DialogDescription>
                    </DialogHeader>

                    {isPreviewLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="font-bold text-muted-foreground animate-pulse">GENERATING ACTUAL PROMPT...</p>
                        </div>
                    ) : previewData ? (
                        <div className="space-y-6">
                            {/* 단계별 체크리스트 UI */}
                            <div className="grid gap-4 p-6 rounded-2xl border-2 border-primary/10 bg-primary/5">
                                <h4 className="text-sm font-black uppercase text-primary flex items-center gap-2 mb-2">
                                    <ListFilter className="w-4 h-4" />
                                    Prompt Generation Validation
                                </h4>

                                <div className="space-y-3">
                                    {/* Step 1: 30일 데이터 확인 */}
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                                        {previewData.validation_steps?.data_check.passed ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                                        )}
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold">Step 1: 과거 30일 데이터 추출</p>
                                            <p className="text-xs text-muted-foreground">{previewData.validation_steps?.data_check.message}</p>
                                            {previewData.validation_steps?.data_check.passed && (
                                                <Badge variant="outline" className="text-[10px] font-mono bg-green-500/10 text-green-600 border-none">
                                                    COUNT: {previewData.validation_steps?.data_check.count} DAYS
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Step 2: 트렌드 요약 확인 */}
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                                        {previewData.validation_steps?.summary_check.passed ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                                        )}
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-bold">Step 2: AI 트렌드 요약 분석</p>
                                            <p className="text-xs text-muted-foreground">{previewData.validation_steps?.summary_check.message}</p>

                                            <div className="flex items-center gap-3 mt-2">
                                                {!previewData.validation_steps?.summary_check.passed && (
                                                    <button
                                                        onClick={() => setShowForcePrompt(!showForcePrompt)}
                                                        className="text-[10px] font-bold text-primary underline decoration-dotted underline-offset-4 hover:text-primary/70"
                                                    >
                                                        {showForcePrompt ? "검토 닫기" : "프롬프트 강제 확인하기 (분석 실패 무시)"}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setShowStep2Prompt(!showStep2Prompt)}
                                                    className="text-[10px] font-bold text-slate-500 underline decoration-dotted underline-offset-4 hover:text-slate-700"
                                                >
                                                    {showStep2Prompt ? "분석 프롬프트 숨기기" : "분석 요청 프롬프트 보기"}
                                                </button>
                                            </div>

                                            {showStep2Prompt && (
                                                <div className="space-y-2 mt-2">
                                                    {previewData.validation_steps?.summary_check.debug_info?.prompt && (
                                                        <div className="p-3 rounded-lg bg-slate-900 text-slate-300 text-[10px] font-mono whitespace-pre-wrap border border-white/10 max-h-[200px] overflow-y-auto">
                                                            <div className="mb-2 text-primary font-bold border-b border-primary/20 pb-1">AI SUMMARIZATION REQUEST PROMPT:</div>
                                                            {previewData.validation_steps.summary_check.debug_info.prompt}
                                                        </div>
                                                    )}

                                                    {previewData.validation_steps?.summary_check.debug_info?.error && (
                                                        <div className="p-3 rounded-lg bg-red-500/10 text-red-600 text-[10px] font-mono border border-red-500/20">
                                                            <div className="mb-1 font-bold">ANALYSIS ERROR:</div>
                                                            {previewData.validation_steps.summary_check.debug_info.error}
                                                        </div>
                                                    )}

                                                    {previewData.validation_steps?.summary_check.debug_info?.raw_text && (
                                                        <div className="p-3 rounded-lg bg-slate-950 text-emerald-400 text-[10px] font-mono whitespace-pre-wrap border border-white/10 max-h-[200px] overflow-y-auto">
                                                            <div className="mb-2 text-emerald-500 font-bold border-b border-emerald-500/20 pb-1">RAW AI RESPONSE:</div>
                                                            {previewData.validation_steps.summary_check.debug_info.raw_text}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Step 3: 프롬프트 준비 완료 */}
                                    <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold">Step 3: AI 입력 프롬프트 생성</p>
                                            <p className="text-xs text-muted-foreground">모든 데이터가 템플릿에 주입되었습니다.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 조건부 표시: 모든 단계 통과 시 또는 강제 보기 선택 시 */}
                            {(previewData.validation_steps?.data_check.passed && previewData.validation_steps?.summary_check.passed) || showForcePrompt ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                    {showForcePrompt && (
                                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-xs text-orange-600 font-bold flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            주의: 트렌드 분석이 실패한 상태의 프롬프트입니다.
                                        </div>
                                    )}
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                        <h4 className="text-xs font-black uppercase text-primary mb-2">Long-term Historical Summary</h4>
                                        <p className="text-sm leading-relaxed">{previewData.summary}</p>
                                    </div>

                                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                                        <h4 className="text-xs font-black uppercase text-blue-600 mb-2">Bot-Specific Advice Sample (BOT_01)</h4>
                                        <p className="text-sm leading-relaxed italic">"{previewData.bot_advice_sample}"</p>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="text-xs font-black uppercase text-muted-foreground">Full Batch Prompt (Raw Text)</h4>
                                        <pre className="p-4 rounded-xl bg-slate-950 text-slate-300 text-[11px] overflow-x-auto overflow-y-auto max-h-[500px] whitespace-pre-wrap font-mono border-2 border-white/5">
                                            {previewData.full_prompt_preview}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 rounded-2xl border-2 border-dashed border-orange-500/20 bg-orange-500/5 text-center space-y-3">
                                    <div className="inline-flex p-3 rounded-full bg-orange-500/10 mb-2">
                                        <AlertTriangle className="w-8 h-8 text-orange-500" />
                                    </div>
                                    <h4 className="text-lg font-bold text-orange-600">분석 조건 미달</h4>
                                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                        과거 데이터가 부족하거나 트렌드 분석이 이루어지지 않아 <br />
                                        정확한 프롬프트를 생성할 수 없습니다. 데이터를 먼저 수집해주세요.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : previewError ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="p-4 rounded-full bg-red-500/10">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-red-600">데이터를 불러오지 못했습니다</p>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                    {previewError}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center text-muted-foreground italic">
                            내용이 없습니다.
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button onClick={() => setShowPreviewDialog(false)} className="px-10 font-bold uppercase italic">
                            Close Preview
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

