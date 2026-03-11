"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, RefreshCw, DollarSign, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface BotAnalysisPanelProps {
    getApiUrl: (funcName: string) => string;
    gameId: string;
}

interface PickHistory {
    date: string;
    round: number;
    prediction: string;
    confidence: number;
    risk_level: string;
    result: string;
    isWin: boolean;
}

export function BotAnalysisPanel({ getApiUrl, gameId }: BotAnalysisPanelProps) {
    // Query State
    const [startDate, setStartDate] = useState("20260101");
    const [endDate, setEndDate] = useState("20260120");
    const [selectedBots, setSelectedBots] = useState<string[]>(["BOT_01"]);
    const [activeBot, setActiveBot] = useState<string | null>(null); // Bot to show details for
    const [loading, setLoading] = useState(false);

    // Data State
    // Store history per bot: { "BOT_01": [...], "BOT_02": [...] }
    const [allBotHistory, setAllBotHistory] = useState<Record<string, PickHistory[]>>({});
    const [botStats, setBotStats] = useState<any[]>([]);

    // Sort state for comparison table
    const [tableSort, setTableSort] = useState<{ key: string, dir: "asc" | "desc" }>({ key: "profit", dir: "desc" });

    // History Table Sort specific to active bot
    const [historySort, setHistorySort] = useState<{ key: keyof PickHistory | "date-round", direction: "asc" | "desc" }>({ key: "date-round", direction: "desc" });

    // Simulation Config
    const [initialBalance, setInitialBalance] = useState(1000000);
    const [baseBet, setBaseBet] = useState(10000);
    const [strategy, setStrategy] = useState("FLAT");
    const [multiplier, setMultiplier] = useState(2.0);
    const [entryDelay, setEntryDelay] = useState(0); // New: Enter after N losses

    const botList = Array.from({ length: 15 }, (_, i) => `BOT_${String(i + 1).padStart(2, '0')}`);

    const toggleBot = (bot: string) => {
        setSelectedBots(prev => {
            if (prev.includes(bot)) return prev.filter(b => b !== bot);
            return [...prev, bot];
        });
    };

    const toggleAllBots = () => {
        if (selectedBots.length === botList.length) setSelectedBots([]);
        else setSelectedBots([...botList]);
    };

    const loadData = async () => {
        if (selectedBots.length === 0) {
            alert("봇을 최소 하나 이상 선택해주세요.");
            return;
        }

        setLoading(true);
        setBotStats([]);
        setAllBotHistory({});
        setActiveBot(null);

        try {
            const historyMap: Record<string, PickHistory[]> = {};
            const statsList: any[] = [];

            // Parallel Fetch
            await Promise.all(selectedBots.map(async (botId) => {
                const url = getApiUrl("getBotHistory");
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ gameId, botId, startDate, endDate })
                });
                const data = await res.json();
                if (data.success && data.history) {
                    historyMap[botId] = data.history;
                    // Calculate Stats immediately
                    const stats = calculateBotStats(botId, data.history, baseBet, strategy, multiplier, initialBalance, entryDelay);
                    statsList.push(stats);
                }
            }));

            setAllBotHistory(historyMap);
            setBotStats(statsList);

            // Set active bot to the best performing one by default, or the first one
            if (statsList.length > 0) {
                // Default sort by profit desc
                const sorted = [...statsList].sort((a, b) => b.profit - a.profit);
                setActiveBot(sorted[0].botId);
            }

        } catch (e: any) {
            alert("Exception: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const calculateBotStats = (botId: string, history: PickHistory[], bet: number, strat: string, mult: number, startBal: number, delay: number) => {
        let currentBalance = startBal;
        let currentBet = bet;
        let maxBalance = currentBalance;
        let maxDrawdown = 0;
        let winCount = 0;
        let tradeCount = 0;

        // Streak Vars for metrics
        let maxWinStreak = 0;
        let maxLossStreak = 0;

        // Tracking for simulation (Virtual Logic)
        let observedStreak = 0; // + for win, - for loss (Virtual)

        // Streak Distribution Counts
        const streakCounts: Record<string, number> = {}; // "L1", "L2", "L3" etc.

        // Sort history by date/round for simulation
        const sortedHistory = [...history].sort((a, b) => a.date.localeCompare(b.date) || a.round - b.round);

        const chartData = sortedHistory.map((item, idx) => {
            if (item.result === "PASS") return null;

            const isWin = item.isWin;

            // 1. Update Observed Streak (The global reality regardless of whether we bet)
            // We need to determine if we *would have* bet on this round based on PREVIOUS streak.
            // But first, let's update the "global" streak counters based on this result to track distribution.
            // Wait, betting decision depends on streak BEFORE this result.

            const canBet = (delay === 0) || (observedStreak <= -delay);

            // Update Observed Streak Logic & Distribution
            if (isWin) {
                // If we were on a loss streak, that loss streak has ended. Record it.
                if (observedStreak < 0) {
                    const key = `L${Math.abs(observedStreak)}`;
                    streakCounts[key] = (streakCounts[key] || 0) + 1;
                }

                if (observedStreak > 0) observedStreak++;
                else observedStreak = 1;

                if (observedStreak > maxWinStreak) maxWinStreak = observedStreak;
            } else {
                // If we were on a win streak, it ended.
                if (observedStreak > 0) {
                    // Optional: Record win streaks too if needed
                    // const key = `W${observedStreak}`;
                    // streakCounts[key] = (streakCounts[key] || 0) + 1;
                }

                if (observedStreak < 0) observedStreak--;
                else observedStreak = -1;

                if (Math.abs(observedStreak) > maxLossStreak) maxLossStreak = Math.abs(observedStreak);
            }

            // 2. Betting Logic (Applied only if condition met)
            let profit = 0;
            if (canBet) {
                tradeCount++;
                if (isWin) {
                    profit = currentBet * 0.9;
                    winCount++;
                    if (strat === "MARTINGALE") currentBet = baseBet;
                } else {
                    profit = -(currentBet * 3.0);
                    if (strat === "MARTINGALE") currentBet = currentBet * mult;
                }

                currentBalance += profit;
                if (currentBalance > maxBalance) maxBalance = currentBalance;
                const dd = maxBalance - currentBalance;
                if (dd > maxDrawdown) maxDrawdown = dd;
            }

            return {
                idx: tradeCount, // Only increment if we traded
                label: `${item.date}-${item.round}`,
                balance: currentBalance,
                profit,
                skipped: !canBet
            };
        }).filter(Boolean);

        const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;
        const totalProfit = currentBalance - startBal;

        return {
            botId,
            winRate,
            profit: totalProfit,
            finalBalance: currentBalance,
            maxDrawdown,
            maxWinStreak,
            maxLossStreak,
            totalTrades: tradeCount,
            winCount,
            lossCount: tradeCount - winCount,
            chartData: chartData.filter(d => !d?.skipped),
            streakCounts
        };
    };

    // Re-run simulation for Active Bot if params change (Optional - for now assume loadData refreshes everything)
    // Actually, if user changes BaseBet, we should re-calc all... 
    // For simplicity, let's require "Run Analysis" to refresh valid stats.

    // Detailed Simulation Data for Active Bot
    const activeBotStats = botStats.find(s => s.botId === activeBot);
    const activeHistory = allBotHistory[activeBot || ""] || [];

    // Sorting Helper for Comparison Table
    const sortedStats = [...botStats].sort((a, b) => {
        const modifier = tableSort.dir === "asc" ? 1 : -1;
        // @ts-ignore
        return (a[tableSort.key] > b[tableSort.key] ? 1 : -1) * modifier;
    });

    const handleTableSort = (key: string) => {
        setTableSort(prev => ({
            key,
            dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc"
        }));
    };

    // Sorting Helper for History Table
    const handleHistorySort = (key: keyof PickHistory | "date-round") => {
        setHistorySort(current => ({
            key,
            direction: current.key === key && current.direction === "desc" ? "asc" : "desc"
        }));
    };

    const sortedActiveHistory = [...activeHistory].sort((a, b) => {
        const modifier = historySort.direction === "asc" ? 1 : -1;
        if (historySort.key === "date-round") {
            return (a.date.localeCompare(b.date) || a.round - b.round) * modifier;
        }
        if (historySort.key === "confidence") {
            return (a.confidence - b.confidence) * modifier;
        }
        return 0;
    });

    // Aggregate Streak Counts for ALL bots
    const aggregatedStreakCounts: Record<string, number> = {};
    botStats.forEach(stat => {
        Object.entries(stat.streakCounts).forEach(([key, count]) => {
            // @ts-ignore
            aggregatedStreakCounts[key] = (aggregatedStreakCounts[key] || 0) + (count as number);
        });
    });

    return (
        <div className="space-y-4">
            {/* Control Panel */}
            <Card className="bg-slate-50 dark:bg-slate-900/50">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Period & Params */}
                        <div className="md:col-span-1 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold">기간 선택 (YYYYMMDD)</label>
                                <div className="flex items-center gap-2">
                                    <Input value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs" />
                                    <span className="text-slate-400">~</span>
                                    <Input value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold">시뮬레이션 설정</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-slate-500">시작 금액</label>
                                        <Input type="number" value={initialBalance} onChange={e => setInitialBalance(Number(e.target.value))} className="h-7 text-xs" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500">기본 배팅</label>
                                        <Input type="number" value={baseBet} onChange={e => setBaseBet(Number(e.target.value))} className="h-7 text-xs" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bot Selection */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-semibold flex items-center justify-between">
                                <span>봇 선택 ({selectedBots.length})</span>
                                <Button variant="ghost" size="sm" onClick={toggleAllBots} className="h-4 text-[10px] px-1">전체 선택/해제</Button>
                            </label>
                            <div className="grid grid-cols-5 gap-2 bg-white dark:bg-black/20 p-2 rounded border max-h-32 overflow-y-auto">
                                {botList.map(bot => (
                                    <div key={bot} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`chk-${bot}`}
                                            checked={selectedBots.includes(bot)}
                                            onChange={() => toggleBot(bot)}
                                            className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor={`chk-${bot}`} className="text-[10px] cursor-pointer select-none">{bot}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action */}
                        <div className="md:col-span-1 flex flex-col justify-end">
                            <Button onClick={loadData} disabled={loading} size="default" className="w-full bg-blue-600 hover:bg-blue-700">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                                분석 실행
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Aggregated Streak Distribution */}
            {botStats.length > 0 && (
                <Card className="border-blue-200 dark:border-blue-800">
                    <CardHeader className="py-2 px-4 bg-blue-50/50 dark:bg-blue-900/20">
                        <CardTitle className="text-xs font-bold text-blue-700 dark:text-blue-300">전체 봇 연미(패배 연속) 분포 합산</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-10 gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <div key={n} className="bg-white dark:bg-slate-800 p-2 rounded text-center border shadow-sm">
                                    <div className="text-[10px] text-slate-400">{n}연미</div>
                                    <div className="text-sm font-bold text-red-500">{aggregatedStreakCounts[`L${n}`] || 0}회</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Comparison Table */}
            {sortedStats.length > 0 && (
                <Card>
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">봇 성과 비교 (클릭하여 상세 보기)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-center">
                                <thead className="bg-slate-100 dark:bg-slate-900 border-b">
                                    <tr>
                                        <th className="p-2 cursor-pointer" onClick={() => handleTableSort("botId")}>봇 ID</th>
                                        <th className="p-2 cursor-pointer" onClick={() => handleTableSort("winRate")}>승률 {tableSort.key === "winRate" && (tableSort.dir === "asc" ? "▲" : "▼")}</th>
                                        <th className="p-2 cursor-pointer" onClick={() => handleTableSort("profit")}>수익 {tableSort.key === "profit" && (tableSort.dir === "asc" ? "▲" : "▼")}</th>
                                        <th className="p-2 cursor-pointer" onClick={() => handleTableSort("maxWinStreak")}>최대 연승 {tableSort.key === "maxWinStreak" && (tableSort.dir === "asc" ? "▲" : "▼")}</th>
                                        <th className="p-2 cursor-pointer" onClick={() => handleTableSort("maxLossStreak")}>최대 연미 {tableSort.key === "maxLossStreak" && (tableSort.dir === "asc" ? "▲" : "▼")}</th>
                                        <th className="p-2 cursor-pointer" onClick={() => handleTableSort("totalTrades")}>거래수</th>
                                        <th className="p-2 cursor-pointer" onClick={() => handleTableSort("lossCount")}>패배수 {tableSort.key === "lossCount" && (tableSort.dir === "asc" ? "▲" : "▼")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {sortedStats.map(stat => (
                                        <tr
                                            key={stat.botId}
                                            className={cn(
                                                "hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors",
                                                activeBot === stat.botId && "bg-blue-100 dark:bg-blue-900/40 font-semibold"
                                            )}
                                            onClick={() => setActiveBot(stat.botId)}
                                        >
                                            <td className="p-2">{stat.botId}</td>
                                            <td className={cn("p-2", stat.winRate >= 77 ? "text-green-600 font-bold" : "")}>{stat.winRate.toFixed(2)}%</td>
                                            <td className={cn("p-2", stat.profit >= 0 ? "text-green-600" : "text-red-500")}>{stat.profit.toLocaleString()}</td>
                                            <td className="p-2 text-blue-600 font-bold">{stat.maxWinStreak}</td>
                                            <td className="p-2 text-red-500 font-bold">{stat.maxLossStreak}</td>
                                            {/* <td className="p-2 text-slate-500">{stat.maxDrawdown.toLocaleString()}</td> */}
                                            <td className="p-2 text-slate-500">{stat.totalTrades}</td>
                                            <td className="p-2 text-red-500">{stat.lossCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Detailed View for Active Bot */}
            {activeBotStats ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2">
                    {/* Graph */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="h-full">
                            <CardHeader className="py-3 px-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                                <CardTitle className="text-sm flex justify-between items-center">
                                    <span className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-primary" />
                                        {activeBot} 상세 분석
                                    </span>
                                    <span className={cn("text-xs px-2 py-1 rounded", activeBotStats.profit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                        Total: {activeBotStats.profit.toLocaleString()}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={activeBotStats.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                            <XAxis dataKey="idx" hide />
                                            <YAxis fontSize={10} width={50} />
                                            <Tooltip
                                                contentStyle={{ fontSize: '12px', borderRadius: '4px' }}
                                                labelFormatter={(v) => `거래 #${v}`}
                                                formatter={(val: number) => [val.toLocaleString(), "잔액"]}
                                            />
                                            <ReferenceLine y={initialBalance} stroke="#666" strokeDasharray="3 3" />
                                            <Line
                                                type="monotone"
                                                dataKey="balance"
                                                stroke={activeBotStats.finalBalance >= initialBalance ? "#10b981" : "#ef4444"}
                                                dot={false}
                                                strokeWidth={2}
                                                animationDuration={500}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Streak Distribution */}
                                <div className="border-t pt-4">
                                    <h4 className="text-xs font-bold mb-2 text-slate-600">연미(패배 연속) 분포 현황</h4>
                                    <div className="grid grid-cols-6 gap-2">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                            <div key={n} className="bg-slate-50 dark:bg-slate-800 p-2 rounded text-center border">
                                                <div className="text-[10px] text-slate-400">{n}연미</div>
                                                <div className="text-sm font-bold text-red-500">{activeBotStats.streakCounts[`L${n}`] || 0}회</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* History */}
                    <div className="lg:col-span-1">
                        <Card className="h-full max-h-[400px] flex flex-col">
                            <CardHeader className="py-3 px-4 border-b">
                                <CardTitle className="text-sm">픽 기록 ({activeBotStats.totalTrades})</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-auto p-0">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10 font-bold text-slate-500">
                                        <tr>
                                            <th className="p-2 text-left cursor-pointer" onClick={() => handleHistorySort("date-round")}>
                                                회차 {historySort.key === "date-round" && (historySort.direction === "asc" ? "▲" : "▼")}
                                            </th>
                                            <th className="p-2 text-center">예측</th>
                                            <th className="p-2 text-center">결과</th>
                                            <th className="p-2 text-right cursor-pointer" onClick={() => handleHistorySort("confidence")}>
                                                확률 {historySort.key === "confidence" && (historySort.direction === "asc" ? "▲" : "▼")}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {sortedActiveHistory.map((h, i) => (
                                            <tr key={i} className={cn("hover:bg-slate-50 dark:hover:bg-slate-800/50", !h.isWin && "bg-red-50/50 dark:bg-red-900/10")}>
                                                <td className="p-2 text-slate-500">{h.date.slice(4)}-{String(h.round).padStart(3, '0')}</td>
                                                <td className="p-2 text-center font-mono font-bold">{h.prediction}</td>
                                                <td className="p-2 text-center font-mono text-slate-500">{h.result}</td>
                                                <td className={cn("p-2 text-right", h.isWin ? "text-green-600 font-bold" : "text-red-500")}>
                                                    {h.confidence}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                !loading && <div className="text-center text-slate-400 py-10">분석할 봇을 선택하고 실행해주세요.</div>
            )}
        </div>
    );
}
