"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertCircle, Activity } from "lucide-react";

import { useState, useEffect } from "react";

interface StatCardsProps {
  totalCollected: number;
  winRate: number;
  maxLossStreak: number;
  currentLossStreak: number;
}

export function StatCards({
  totalCollected,
  winRate,
  maxLossStreak,
  currentLossStreak,
}: StatCardsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">오늘 총 수집 회차</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCollected}</div>
          <p className="text-xs text-muted-foreground">3분 주기 자동 수집</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">현재 승률</CardTitle>
          {winRate >= 50 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mounted ? (Number(winRate) || 0).toFixed(1) : "0.0"}%</div>
          <p className="text-xs text-muted-foreground">
            {(Number(winRate) || 0) >= 50 ? "양호한 성과" : "개선 필요"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">오늘 최대 미적중</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{maxLossStreak}</div>
          <p className="text-xs text-muted-foreground">Max Loss Streak</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">현재 연패 상황</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentLossStreak}</div>
          <p className="text-xs text-muted-foreground">
            {currentLossStreak > 0 ? "연패 진행 중" : "연패 없음"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

