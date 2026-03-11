"use client";

import { cn } from "@/lib/utils";

interface LadderResult {
    round: number;
    start: string;
    lines: number;
    result: string;
}

interface LadderResultsProps {
    results: LadderResult[];
}

export function LadderResults({ results }: LadderResultsProps) {
    return (
        <div className="flex flex-col">
            <div className="grid grid-cols-4 px-4 py-3 bg-muted/40 text-[13px] font-black text-foreground border-b border-border/50 text-center uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
                <span>회차</span>
                <span>시작</span>
                <span>줄수</span>
                <span>결과</span>
            </div>
            <div className="max-h-[280px] overflow-y-auto no-scrollbar divide-y divide-border/10">
                {results.map((res, idx) => (
                    <div key={idx} className="grid grid-cols-4 px-4 py-3 items-center text-sm hover:bg-muted/10 transition-colors text-center">
                        <span className="text-sm font-bold text-foreground/80">{res.round}</span>
                        <div className="flex justify-center">
                            <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center font-bold text-[13px]",
                                res.start === "좌" ? "bg-blue-500/10 text-blue-400 border border-blue-500/10" : "bg-red-500/10 text-red-500 border border-red-500/10"
                            )}>
                                {res.start}
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center font-bold text-[13px]",
                                res.lines === 3 ? "bg-blue-500/10 text-blue-400 border border-blue-500/10" : "bg-red-500/10 text-red-500 border border-red-500/10"
                            )}>
                                {res.lines}
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px]",
                                res.result === "홀"
                                    ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                            )}>
                                {res.result}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
