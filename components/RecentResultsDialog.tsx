"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RecentResultsDialogProps {
    gameName: string;
    results: any[];
}

export function RecentResultsDialog({ gameName, results }: RecentResultsDialogProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="h-9 px-6 gap-2 text-xs font-bold text-blue-500 hover:bg-blue-500/10 hover:text-blue-600 transition-all rounded-full border border-blue-500/20"
            >
                전체 결과 보기
                <ChevronRight className="w-4 h-4" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent
                    className="max-w-md bg-card border-border shadow-2xl"
                    onClose={() => setIsOpen(false)}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-400" />
                            {gameName} 최근 결과 역대기
                        </DialogTitle>
                        <DialogDescription>
                            실시간으로 수집된 최근 회차들의 실제 결과 목록입니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 border rounded-xl overflow-hidden bg-muted/30">
                        <div className="grid grid-cols-5 px-4 py-2 bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b text-center">
                            <span className="text-left">날짜/회차</span>
                            <span>시간</span>
                            <span>출줄</span>
                            <span>줄수</span>
                            <span>홀짝</span>
                        </div>
                        <div className="h-[450px] overflow-y-auto no-scrollbar">
                            <div className="divide-y divide-border">
                                {results.length > 0 ? (
                                    results.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-5 px-4 py-3 items-center text-sm hover:bg-muted/20 transition-colors text-center">
                                            <span className="text-left text-xs text-muted-foreground font-medium">
                                                {item.date}-{item.round}
                                            </span>
                                            <span className="text-xs">{item.time}</span>
                                            <div className="flex justify-center">
                                                <div className={cn(
                                                    "w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs",
                                                    item.start === "좌" ? "border-blue-500/30 text-blue-400 bg-blue-500/5" : "border-red-500/30 text-red-500 bg-red-500/5"
                                                )}>
                                                    {item.start}
                                                </div>
                                            </div>
                                            <div className="flex justify-center">
                                                <div className={cn(
                                                    "w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs",
                                                    item.lines === 3 ? "border-blue-500/30 text-blue-400 bg-blue-500/5" : "border-red-500/30 text-red-500 bg-red-500/5"
                                                )}>
                                                    {item.lines}
                                                </div>
                                            </div>
                                            <div className="flex justify-center">
                                                <Badge className={cn(
                                                    "border-none h-6 w-10 justify-center font-bold",
                                                    item.result === "홀" ? "bg-blue-500 text-white" : "bg-red-500 text-white"
                                                )}>
                                                    {item.result}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-10 text-center text-muted-foreground italic text-sm">
                                        기록된 데이터가 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
