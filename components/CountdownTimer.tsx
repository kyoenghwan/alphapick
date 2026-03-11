"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Timer } from "lucide-react";

interface CountdownTimerProps {
    className?: string;
    variant?: "default" | "minimal";
    onRoundChange?: (round: number) => void;
    intervalSeconds?: number;
    totalRounds?: number;
    timeOffset?: number;
}

export function CountdownTimer({
    className,
    variant = "default",
    onRoundChange,
    intervalSeconds = 180,
    totalRounds = 480,
    timeOffset = 5
}: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [currentRound, setCurrentRound] = useState<number>(0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const calculateTime = () => {
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const secondsPassed = Math.floor((now.getTime() - startOfDay.getTime()) / 1000);

            // 실제 경과 시간에서 오차를 뺍니다.
            const adjustedSeconds = secondsPassed - timeOffset;
            const roundRaw = Math.floor(adjustedSeconds / intervalSeconds) + 1;

            // 24시간 주기를 넘어가는 경우 처리 (예: 480회차 이후 다시 1회차)
            const round = ((roundRaw - 1) % totalRounds) + 1;
            const remaining = intervalSeconds - (adjustedSeconds % intervalSeconds);

            setTimeLeft(remaining);
            if (round !== currentRound) {
                setCurrentRound(round);
                onRoundChange?.(round);
            }
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);

        return () => clearInterval(interval);
    }, [currentRound, onRoundChange, intervalSeconds, totalRounds, timeOffset]);

    if (!isMounted) return null; // Hydration mismatch 방지

    const formatTime = (seconds: number) => {
        const mm = Math.floor(seconds / 60);
        const ss = seconds % 60;
        return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {variant === "default" ? (
                <div className="flex flex-col items-center md:items-start text-right md:text-left">
                    <span className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-tighter">
                        제 {currentRound}회차 마감까지
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Timer className="w-3 h-3 md:w-4 md:h-4 text-[#00CCCC] animate-pulse" />
                        <span className="text-xl md:text-2xl font-black font-mono tracking-wider tabular-nums text-foreground">
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Timer className="w-6 h-6 text-blue-500 animate-pulse" />
                    <span className="text-2xl md:text-4xl font-black font-mono tabular-nums text-blue-500 tracking-tighter">
                        {formatTime(timeLeft)}
                    </span>
                </div>
            )}
        </div>
    );
}
