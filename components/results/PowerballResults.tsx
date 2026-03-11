"use client";

import { cn } from "@/lib/utils";

interface PowerballResult {
    round: string | number; // e.g. "2026-01-06-279" or 279
    time: string;  // e.g. "09:18"
    pbOddEven: string;    // 파워볼 홀/짝
    pbUnderOver: string;  // 파워볼 언/오버
    numOddEven: string;   // 숫자 홀/짝
    numUnderOver: string; // 숫자 언/오버
    selection: string;    // 대/중/소
}

interface PowerballResultsProps {
    results: PowerballResult[];
}

export function PowerballResults({ results }: PowerballResultsProps) {
    return (
        <div className="flex flex-col">
            {/* Double Row Header */}
            <div className="bg-muted/40 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
                <div className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr_1fr_0.8fr] text-[12px] font-black text-foreground text-center uppercase tracking-widest">
                    <div className="py-2 border-r border-border/50 flex items-center justify-center">날짜/회차</div>
                    <div className="py-2 border-r border-border/50 flex items-center justify-center">시간</div>
                    <div className="col-span-2 py-1 border-r border-border/50 border-b border-border/50">파워볼</div>
                    <div className="col-span-3 py-1">숫자</div>
                </div>
                <div className="grid grid-cols-[1.5fr_0.8fr_0.5fr_0.5fr_0.33fr_0.33fr_0.33fr] text-[11px] font-bold text-muted-foreground text-center uppercase tracking-tighter">
                    <div className="border-r border-border/50"></div>
                    <div className="border-r border-border/50"></div>
                    <div className="py-1.5 border-r border-border/50">홀짝</div>
                    <div className="py-1.5 border-r border-border/50">언오버</div>
                    <div className="py-1.5 border-r border-border/50">홀짝</div>
                    <div className="py-1.5 border-r border-border/50">언오버</div>
                    <div className="py-1.5">대중소</div>
                </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto no-scrollbar divide-y divide-border/10">
                {results.map((res, idx) => (
                    <div key={idx} className="grid grid-cols-[1.5fr_0.8fr_0.5fr_0.5fr_0.33fr_0.33fr_0.33fr] px-0 py-2 items-center text-sm hover:bg-muted/10 transition-colors text-center">
                        <span className="text-[11px] font-bold text-foreground/70 border-r border-border/5">{res.round}</span>
                        <span className="text-[11px] font-medium text-muted-foreground border-r border-border/5">{res.time}</span>

                        {/* 파워볼 홀짝 */}
                        <div className="flex justify-center border-r border-border/5">
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]",
                                res.pbOddEven === "홀" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                            )}>
                                {res.pbOddEven}
                            </div>
                        </div>

                        {/* 파워볼 언오버 */}
                        <div className="flex justify-center border-r border-border/5">
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]",
                                res.pbUnderOver === "언더" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                            )}>
                                {res.pbUnderOver === "언더" ? "언" : "오"}
                            </div>
                        </div>

                        {/* 숫자 홀짝 */}
                        <div className="flex justify-center border-r border-border/5">
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]",
                                res.numOddEven === "홀" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                            )}>
                                {res.numOddEven}
                            </div>
                        </div>

                        {/* 숫자 언오버 */}
                        <div className="flex justify-center border-r border-border/5">
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]",
                                res.numUnderOver === "언더" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                            )}>
                                {res.numUnderOver === "언더" ? "언" : "오"}
                            </div>
                        </div>

                        {/* 대중소 */}
                        <div className="flex justify-center">
                            <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px]",
                                res.selection === "대" ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                    res.selection === "중" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                                        "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            )}>
                                {res.selection}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
