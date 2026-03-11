"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { format } from "date-fns";
import { StatCards } from "@/components/admin/StatCards";
import { LossStreakChart } from "@/components/admin/LossStreakChart";
import { RecentRounds } from "@/components/admin/RecentRounds";
import { ManualControl } from "@/components/admin/ManualControl";

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [counts, setCounts] = useState<any>(null);
  const [recentRounds, setRecentRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const today = new Date();
    const year = today.getFullYear().toString();
    const dateStr = format(today, "yyyyMMdd");
    const gameCode = "bubble_ladder";

    // Firestore에서 통계 및 최근 회차 실시간 리스너
    const countRef = doc(db, `games/${year}_${gameCode}`, "result", dateStr);
    const roundsRef = collection(db, `games/${year}_${gameCode}/result/${dateStr}/rounds`);
    const recentQ = query(roundsRef, orderBy("round", "desc"), limit(10));

    const unsubscribeCount = onSnapshot(countRef, (docSnap) => {
      if (docSnap.exists()) {
        setCounts(docSnap.data());
      }
    }, (error) => {
      console.error("Dashboard counts sync error:", error);
    });

    const unsubscribeRounds = onSnapshot(recentQ, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setRecentRounds(data);
      setLoading(false);
    }, (error) => {
      console.error("Dashboard rounds sync error:", error);
      setLoading(false);
    });

    return () => {
      if (unsubscribeCount) unsubscribeCount();
      if (unsubscribeRounds) unsubscribeRounds();
    };
  }, []);

  const totalCollected = counts?.total_collected || 0;
  const winRate = counts?.win_rate || 0;
  const maxLossStreak = counts?.max_loss_streak || 0;
  const currentLossStreak = recentRounds.length > 0 ? recentRounds[0].current_loss_streak || 0 : 0;
  const lossDistribution = counts?.loss_streak_distribution || {};

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!mounted) {
    return <div className="p-8 h-screen bg-background flex items-center justify-center">로딩 중...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">관리자 대시보드</h1>
          <p className="text-muted-foreground">
            AlphaPick 게임 데이터 현황 및 관리
          </p>
        </div>
        <ManualControl onRefresh={handleRefresh} />
      </div>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-muted-foreground">데이터를 불러오는 중입니다...</div>
        </div>
      ) : (
        <div className="space-y-6">
          <StatCards
            totalCollected={totalCollected}
            winRate={winRate}
            maxLossStreak={maxLossStreak}
            currentLossStreak={currentLossStreak}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <LossStreakChart
              distribution={lossDistribution}
            />
          </div>

          <RecentRounds rounds={recentRounds} />
        </div>
      )}
    </div>
  );
}
