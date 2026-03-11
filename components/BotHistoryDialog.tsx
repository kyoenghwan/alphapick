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
import { History, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BotHistoryDialogProps {
    botName: string;
    botId: number;
}

// 임시 상세 전적 데이터 (20회차)
const generateMockHistory = () => {
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

export function BotHistoryDialog({ botName, botId }: BotHistoryDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const history = generateMockHistory();

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(true)}
                className="h-8 gap-1 text-xs hover:bg-blue-500/10 hover:text-blue-400"
            >
                <History className="w-3.5 h-3.5" />
                전적 보기
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent
                    className="max-w-md bg-card border-border shadow-2xl"
                    onClose={() => setIsOpen(false)}
                >
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <DialogTitle>{botName} 상세 전적</DialogTitle>
                        </div>
                        <DialogDescription>
                            최근 20회차 동안의 인공지능 분석 결과 및 적중 현황입니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 border rounded-xl overflow-hidden bg-muted/30">
                        <div className="grid grid-cols-4 px-4 py-2 bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b">
                            <span>회차</span>
                            <span>예측</span>
                            <span className="text-center">결과</span>
                            <span className="text-right">시간</span>
                        </div>
                        <div className="h-[400px] overflow-y-auto no-scrollbar">
                            <div className="divide-y divide-border">
                                {history.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-4 px-4 py-3 items-center text-sm hover:bg-muted/20 transition-colors">
                                        <span className="text-muted-foreground font-medium">{item.round}회</span>
                                        <span className="font-bold">{item.prediction}</span>
                                        <div className="flex justify-center">
                                            {item.result === "W" ? (
                                                <Badge className="bg-blue-500/10 text-blue-400 border-none h-6 px-2 hover:bg-blue-500/20">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    WIN
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-red-500/10 text-red-400 border-none h-6 px-2 hover:bg-red-500/20">
                                                    <XCircle className="w-3 h-3 mr-1" />
                                                    LOSS
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-right text-xs text-muted-foreground">{item.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Today Summary</p>
                            <p className="text-sm font-bold">실패 없이 3연승 진행 중</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-blue-500">72%</p>
                            <p className="text-[10px] text-muted-foreground">Hit Rate</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
