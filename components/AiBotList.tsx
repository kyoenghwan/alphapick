"use client";

import { useState, useMemo, useEffect } from "react";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronRight,
    History,
    CheckCircle2,
    XCircle
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// 임시 상세 전적 데이터 생성 함수
const generateMockHistory = (botId: number) => {
    const history = [];
    const results = ["W", "L"];
    const predictions = ["좌3 홀", "우3 짝", "좌4 짝", "우4 홀"];

    for (let i = 0; i < 20; i++) {
        history.push({
            round: 300 - i,
            prediction: predictions[Math.floor(Math.random() * predictions.length)],
            result: results[Math.floor(Math.random() * results.length)],
            time: "12:34"
        });
    }
    return history;
};
const generateMockBots = () => {
    const bots = [];
    const results = ["W", "L"];
    const sides = ["좌", "우"];
    const lines = ["3", "4"];
    const outcomes = ["홀", "짝"];
    const pbResults = ["홀", "짝"];
    const pbOvers = ["언더", "오버"];
    const numSizes = ["대", "중", "소"];

    for (let i = 1; i <= 25; i++) {
        const recentResults = Array.from({ length: 5 }, () => results[Math.floor(Math.random() * results.length)]);

        // 연승/연패 계산
        let streakCount = 0;
        const lastResult = recentResults[recentResults.length - 1];
        for (let j = recentResults.length - 1; j >= 0; j--) {
            if (recentResults[j] === lastResult) {
                streakCount++;
            } else {
                break;
            }
        }

        bots.push({
            id: i,
            name: `ALPHA BOT #${String(i).padStart(2, '0')}`,
            prediction: {
                side: sides[Math.floor(Math.random() * sides.length)],
                line: lines[Math.floor(Math.random() * lines.length)],
                outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
                pbOddEven: pbResults[Math.floor(Math.random() * pbResults.length)],
                pbUnderOver: pbOvers[Math.floor(Math.random() * pbOvers.length)],
                numSize: numSizes[Math.floor(Math.random() * numSizes.length)]
            },
            winRate: parseFloat((Math.random() * 20 + 50).toFixed(1)), // 50% ~ 70%
            recentResults,
            streakValue: lastResult === "W" ? streakCount : -streakCount,
            streakText: `${streakCount}연${lastResult === "W" ? "승" : "패"} 중`,
            lastUpdated: "방금 전"
        });
    }
    return bots;
};

type SortKey = "name" | "winRate" | "streakValue";
type SortDirection = "asc" | "desc" | null;


interface AiBotListProps {
    gameType?: "ladder" | "powerball";
}

export function AiBotList({ gameType = "ladder" }: AiBotListProps) {
    const [bots] = useState(generateMockBots());
    const [selectedBotId, setSelectedBotId] = useState<number>(1);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
        key: "winRate",
        direction: "desc"
    });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    const handleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key
                ? prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc"
                : "desc"
        }));
    };

    const sortedBots = useMemo(() => {
        if (!sortConfig.direction) return bots;

        return [...bots].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [bots, sortConfig]);

    const selectedBot = bots.find(b => b.id === selectedBotId) || bots[0];
    const botHistory = generateMockHistory(selectedBotId);

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortConfig.key !== column || !sortConfig.direction) return <ArrowUpDown className="ml-1 w-3 h-3 opacity-50" />;
        return sortConfig.direction === "asc" ? <ArrowUp className="ml-1 w-3 h-3 text-blue-500" /> : <ArrowDown className="ml-1 w-3 h-3 text-blue-500" />;
    };

    if (!isMounted) return <div className="mt-12 h-[600px] flex items-center justify-center bg-card/10 rounded-3xl border border-dashed border-border"><span className="text-xs font-black italic uppercase tracking-widest text-muted-foreground animate-pulse">Initializing AI Neural Network...</span></div>;

    return (
        <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <h2 className="text-xl font-black tracking-tight text-foreground uppercase italic">Alpha Bot 실시간 분석</h2>
                    <span className="text-xs text-muted-foreground font-bold">
                        AI 엔진이 각각의 확률로 독립적인 예측을 수행합니다.
                    </span>
                    <span className="text-xs text-red-500 font-bold ml-1">
                        ※ AI 예측은 참고용으로만 활용하시기 바랍니다.
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* 왼쪽: 봇 리스트 (3/5) */}
                <div className="lg:col-span-3">
                    <div className="rounded-2xl border border-border bg-card/50 overflow-hidden shadow-sm">
                        <div className={cn(
                            "grid px-6 py-3 bg-muted/50 text-[13px] font-black uppercase tracking-wider text-foreground border-b items-center",
                            gameType === "powerball"
                                ? "grid-cols-[1.2fr_2fr_1fr_1.2fr_1fr_0.8fr]"
                                : "grid-cols-[1.5fr_1.2fr_1fr_1.2fr_1fr_0.8fr]"
                        )}>
                            <button
                                onClick={() => handleSort("name")}
                                className="flex items-center justify-center hover:text-foreground transition-colors"
                            >
                                {gameType === "powerball" ? "BOT" : "봇 엔진"} <SortIcon column="name" />
                            </button>
                            <span className="text-center">{gameType === "powerball" ? "예측 조합" : "현재 예측"}</span>
                            <button
                                onClick={() => handleSort("winRate")}
                                className="flex items-center justify-center hover:text-foreground transition-colors"
                            >
                                승률 <SortIcon column="winRate" />
                            </button>
                            <span className="text-center">최근 5</span>
                            <button
                                onClick={() => handleSort("streakValue")}
                                className="flex items-center justify-center hover:text-foreground transition-colors"
                            >
                                전적 <SortIcon column="streakValue" />
                            </button>
                            <span className="text-center">상세</span>
                        </div>
                        <div className="divide-y divide-border/30">
                            {sortedBots.map((bot) => (
                                <div
                                    key={bot.id}
                                    className={cn(
                                        "grid items-center cursor-pointer group hover:bg-muted/30 transition-colors text-center py-4 px-6",
                                        gameType === "powerball"
                                            ? "grid-cols-[1.2fr_2fr_1fr_1.2fr_1fr_0.8fr]"
                                            : "grid-cols-[1.5fr_1.2fr_1fr_1.2fr_1fr_0.8fr]",
                                        selectedBotId === bot.id && "bg-blue-500/5 hover:bg-blue-500/5 ring-1 ring-inset ring-blue-500/20"
                                    )}
                                    onClick={() => setSelectedBotId(bot.id)}
                                >
                                    <div className="font-bold flex justify-center">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-2.5 h-2.5 rounded-full flex-shrink-0",
                                                selectedBotId === bot.id ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "bg-green-500 animate-pulse"
                                            )} />
                                            <span className="text-[14px] truncate font-black text-foreground">{bot.name.replace("ALPHA BOT", "BOT")}</span>
                                        </div>
                                    </div>
                                    <div>
                                        {gameType === "powerball" ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <Badge variant="outline" className="text-[10px] font-black border-blue-500/20 bg-blue-500/5 text-blue-500 px-1.5 h-5">
                                                    PB {bot.prediction.pbOddEven} {bot.prediction.pbUnderOver === "언더" ? "언" : "오"}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] font-black border-purple-500/20 bg-purple-500/5 text-purple-500 px-1.5 h-5">
                                                    NUM {bot.prediction.numSize}
                                                </Badge>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1.5">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full border flex items-center justify-center text-[13px] font-black",
                                                    ["좌", "3", "홀"].includes(bot.prediction.side)
                                                        ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                                        : "bg-red-500/10 border-red-500/20 text-red-500"
                                                )}>
                                                    {bot.prediction.side}
                                                </div>
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full border flex items-center justify-center text-[13px] font-black",
                                                    ["좌", "3", "홀"].includes(bot.prediction.line)
                                                        ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                                        : "bg-red-500/10 border-red-500/20 text-red-500"
                                                )}>
                                                    {bot.prediction.line}
                                                </div>
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full border flex items-center justify-center text-[13px] font-black",
                                                    ["좌", "3", "홀"].includes(bot.prediction.outcome)
                                                        ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                                        : "bg-red-500/10 border-red-500/20 text-red-500"
                                                )}>
                                                    {bot.prediction.outcome}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[15px] font-black text-foreground">{bot.winRate}%</span>
                                            <div className="w-12 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${bot.winRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-1">
                                            {bot.recentResults.map((res, idx) => (
                                                <div
                                                    key={idx}
                                                    className={cn(
                                                        "w-3.5 h-3.5 rounded-full flex items-center justify-center",
                                                        res === "W" ? "bg-green-500" : "bg-red-500"
                                                    )}
                                                >
                                                    {res === "W" ? (
                                                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                                    ) : (
                                                        <XCircle className="w-2.5 h-2.5 text-white" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-center">
                                        <span className={cn(
                                            "text-[13px] font-black whitespace-nowrap",
                                            bot.streakText.includes("승") ? "text-green-500" : "text-red-500"
                                        )}>
                                            {bot.streakText}
                                        </span>
                                    </div>
                                    <div className="flex justify-center">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-8 gap-1 text-[13px] font-black transition-all px-3 whitespace-nowrap",
                                                selectedBotId === bot.id
                                                    ? "text-blue-500 bg-blue-500/10"
                                                    : "text-muted-foreground group-hover:bg-blue-500/10 group-hover:text-blue-500"
                                            )}
                                        >
                                            상세보기
                                            <ChevronRight className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 오른쪽: 상세보기 영역 (2/5) */}
                <div className="lg:col-span-2">
                    <div className="flex flex-col gap-6 sticky top-6">
                        {/* 봇 상태 요약 카드 */}
                        <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden p-6 space-y-5 bg-gradient-to-b from-card to-background">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider bg-blue-500/5 w-fit px-2 py-0.5 rounded-full">AI Bot Engine</p>
                                    <h3 className="text-xl font-black tracking-tight">{selectedBot.name}</h3>
                                </div>
                                <div className="bg-blue-500/10 p-3 rounded-2xl">
                                    <History className="w-6 h-6 text-blue-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col justify-between">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2">Win Rate</p>
                                    <p className="text-3xl font-black text-blue-500 leading-none">{selectedBot.winRate}<span className="text-sm ml-0.5 opacity-70">%</span></p>
                                </div>
                                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col justify-between">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2">Today Pick</p>
                                    <div className="flex items-center gap-1.5">
                                        <div className={cn(
                                            "w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold",
                                            ["좌", "3", "홀"].includes(selectedBot.prediction.side)
                                                ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                                : "bg-red-500/10 border-red-500/20 text-red-500"
                                        )}>
                                            {selectedBot.prediction.side}
                                        </div>
                                        <div className={cn(
                                            "w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold",
                                            ["좌", "3", "홀"].includes(selectedBot.prediction.line)
                                                ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                                : "bg-red-500/10 border-red-500/20 text-red-500"
                                        )}>
                                            {selectedBot.prediction.line}
                                        </div>
                                        <div className={cn(
                                            "w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold",
                                            ["좌", "3", "홀"].includes(selectedBot.prediction.outcome)
                                                ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                                : "bg-red-500/10 border-red-500/20 text-red-500"
                                        )}>
                                            {selectedBot.prediction.outcome}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 shadow-inner">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-bold text-foreground">최근 전적 현황</span>
                                    <Badge className="bg-blue-500 text-white border-none h-5 px-2 text-[10px] font-black">72% Hit</Badge>
                                </div>
                                <div className="grid grid-cols-10 gap-1.5">
                                    {botHistory.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={cn(
                                                "w-full aspect-square rounded-sm flex items-center justify-center text-[10px] font-black shadow-sm",
                                                item.result === "W" ? "bg-blue-500 text-white" : "bg-red-500/80 text-white"
                                            )}
                                        >
                                            {item.result}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 상세 내역 테이블 */}
                        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-[288px]">
                            <div className="grid grid-cols-3 px-6 py-3 bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b text-center">
                                <span>회차</span>
                                <span>예측</span>
                                <span>결과</span>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border/30">
                                {botHistory.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-3 px-6 py-3 items-center text-xs hover:bg-muted/30 transition-colors text-center">
                                        <span className="text-muted-foreground font-semibold">{item.round}회</span>
                                        <span className="font-black text-foreground">{item.prediction}</span>
                                        <div className="flex justify-center">
                                            {item.result === "W" ? (
                                                <Badge className="bg-blue-500/10 text-blue-400 border-none h-5 px-2 text-[9px] font-bold hover:bg-blue-500/20">
                                                    WIN
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-red-500/10 text-red-500 border-none h-5 px-2 text-[9px] font-bold hover:bg-red-500/20">
                                                    LOSS
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
