"use client";

import { useState } from "react";
import { BotAnalysisPanel } from "../ai-pick-manager/components/BotAnalysisPanel";

export default function AnalysisPage() {
    // API Basic Address Setup (Emulator vs Production)
    const getApiUrl = (funcName: string) => {
        const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
        if (isLocal) {
            // Emulator Address (Project ID: alphapick-a9b9e, Region: us-central1)
            return `http://127.0.0.1:5001/alphapick-a9b9e/us-central1/${funcName}`;
        }
        // Production Address
        return `https://${funcName}-kqf7pzhpsq-uc.a.run.app`;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                        봇 분석 & 시뮬레이션
                    </h1>
                    <p className="text-muted-foreground mt-1">봇의 과거 성과를 분석하고 다양한 배팅 전략을 시뮬레이션합니다.</p>
                </div>
            </header>

            <BotAnalysisPanel getApiUrl={getApiUrl} gameId="bubble_ladder" />
        </div>
    );
}
