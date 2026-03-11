"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface LossStreakChartProps {
  distribution: Record<string, number>;
}

export function LossStreakChart({ distribution }: LossStreakChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // loss_streak_distribution을 차트 데이터 형식으로 변환
  // 예: { "1_loss": 5, "2_loss": 3, "3_loss": 2 } -> [{ streak: "1미적", count: 5 }, ...]
  const chartData = Object.entries(distribution)
    .map(([key, value]) => {
      const streak = key.replace("_loss", "");
      return {
        streak: `${streak}미적`,
        count: value,
      };
    })
    .sort((a, b) => parseInt(a.streak) - parseInt(b.streak));

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>연패 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            로딩 중...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>연패 분포</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="streak" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--chart-1))" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        )}
      </CardContent>
    </Card>
  );
}

