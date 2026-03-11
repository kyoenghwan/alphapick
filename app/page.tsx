"use client";

import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Crown,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    XCircle,
    User as UserIcon,
    LogOut,
    Settings,
    BrainCircuit,
    History,
    Coins,
    GanttChart,
    Shield,
    ShoppingBag,
    MessageSquare,
    Megaphone
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, doc } from "firebase/firestore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GameMenu } from "@/components/GameMenu";
import { CountdownTimer } from "@/components/CountdownTimer";
import { cn } from "@/lib/utils";

import { AiBotList } from "@/components/AiBotList";
import { LadderResults } from "@/components/results/LadderResults";
import { PowerballResults } from "@/components/results/PowerballResults";

// 테스트를 위한 더미 데이터 (최근 50회차) - 하이드레이션 오류 방지를 위해 고정된 값 사용
const MOCK_RESULTS = Array.from({ length: 50 }, (_, i) => {
    const isOdd = i % 2 === 0;
    const isLeft = i % 3 === 0;
    const isThree = i % 4 === 0;
    return {
        date: "2026-01-06",
        round: 240 - i,
        time: `01:${(60 - i).toString().padStart(2, '0')}`,
        start: isLeft ? "좌" : "우",
        lines: isThree ? 3 : 4,
        result: isOdd ? "홀" : "짝"
    };
});

const MOCK_POWERBALL_RESULTS = Array.from({ length: 50 }, (_, i) => {
    return {
        round: `2026-01-06-${280 - i}`,
        time: `09:${(60 - i).toString().padStart(2, '0')}`,
        pbOddEven: i % 2 === 0 ? "홀" : "짝",
        pbUnderOver: i % 3 === 0 ? "언더" : "오버",
        numOddEven: i % 4 === 0 ? "홀" : "짝",
        numUnderOver: i % 5 === 0 ? "언더" : "오버",
        selection: ["대", "중", "소"][i % 3]
    };
});

export default function Home() {
    const { user, signOut, loading: authLoading } = useAuth();
    const [latestPick, setLatestPick] = useState<any>(null);
    const [activeGame, setActiveGame] = useState<any>(null);
    const [stats, setStats] = useState({ winRate: 0, streak: 0, lossDistribution: {} });
    const [recentResults, setRecentResults] = useState<any[]>([]);
    const [nextRound, setNextRound] = useState<number | string>("---");
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const displayResults = recentResults.length > 0 ? recentResults : MOCK_RESULTS;

    // 실시간 AI 픽 및 통계 데이터 구독
    useEffect(() => {
        if (!activeGame?.gameCode) return;

        const year = new Date().getFullYear().toString();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const docId = `${year}_${activeGame.gameCode}`;

        // 1. 실시간 AI 픽 구독
        const qPred = query(
            collection(db, "predictions"),
            orderBy("createdAt", "desc"),
            limit(1)
        );

        const unsubscribePred = onSnapshot(qPred, (snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                setLatestPick({
                    ...data,
                    time: data.createdAt?.toDate ?
                        data.createdAt.toDate().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) :
                        "--:--"
                });
            } else {
                setLatestPick({
                    round: "---",
                    prediction: "데이터 수집 중",
                    confidence: 0,
                    status: "pending",
                    time: "--:--"
                });
            }
        }, (error) => {
            console.error("Prediction subscription error:", error);
        });

        // 2. 당일 집계 결과 구독
        const countRef = doc(db, "games", docId, "counts", dateStr);
        const unsubscribeCount = onSnapshot(countRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStats({
                    winRate: data.win_rate || 0,
                    streak: data.max_loss_streak || 0,
                    lossDistribution: data.loss_streak_distribution || {}
                });
            }
        }, (error) => {
            console.error("Stats subscription error:", error);
        });

        // 3. 최근 회차 정보 구독
        const resultRef = collection(db, "games", docId, "result", dateStr, "rounds");
        const qResults = query(resultRef, orderBy("round", "desc"), limit(100));

        const unsubscribeResults = onSnapshot(qResults, (snapshot) => {
            const results = snapshot.docs
                .map(doc => doc.data())
                .filter(d => d.result !== null);

            if (results.length > 0) {
                setRecentResults(results as any[]);
            }
        }, (error) => {
            console.error("Results subscription error:", error);
        });

        return () => {
            unsubscribePred();
            unsubscribeCount();
            unsubscribeResults();
        };
    }, [activeGame?.gameCode]);

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-blue-500/30">
            {/* Premium Header */}
            <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
                <div className="container mx-auto px-4">
                    {/* Top Bar: Logo & Main Actions */}
                    <div className="h-14 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <BrainCircuit className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                                AlphaPick
                            </span>
                        </Link>

                        <div className="flex items-center gap-3">

                            <ThemeToggle />

                            {user ? (
                                <div className="flex items-center gap-3">
                                    {(user.role === "super" || user.role === "master") && (
                                        <Link href={user.role === "super" ? "/admin" : "/master"}>
                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-blue-500/30 hover:bg-blue-500/10 text-blue-400">
                                                <GanttChart className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            ) : !authLoading && (
                                <Link href="/login">
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 font-bold px-5">
                                        로그인
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Bottom Bar: Multi-row Game Menu */}
                    <div className="py-2 border-t border-border/10 overflow-visible">
                        <GameMenu onCategoryChange={(cat) => setActiveGame(cat)} />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Main AI Hero Card */}
                <div className="grid lg:grid-cols-5 gap-6 items-start">
                    <Card className="lg:col-span-3 relative overflow-hidden border-border bg-card backdrop-blur-sm shadow-xl ring-1 ring-white/5">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex flex-col gap-1">
                                    <CardTitle className="flex items-center gap-2 text-2xl font-black italic tracking-tighter uppercase whitespace-nowrap overflow-hidden">
                                        <Crown className="w-6 h-6 text-yellow-500 shadow-sm shrink-0" />
                                        <span className="truncate">{activeGame?.name || (isMounted ? "게임 선택" : "")}</span>
                                        {isMounted && activeGame?.selectedSubName && (
                                            <span className="text-blue-500 font-black text-lg">[{activeGame.selectedSubName}]</span>
                                        )}
                                    </CardTitle>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/50">
                                        <Badge variant="outline" className="text-[10px] h-4 bg-blue-500/10 text-blue-500 border-none px-1.5 font-black uppercase tracking-widest">
                                            NEXT
                                        </Badge>
                                        <span className="text-muted-foreground text-sm font-bold tracking-tight whitespace-nowrap">
                                            <span className="text-blue-600 font-black text-lg mr-1">{nextRound}</span> 대기 중
                                        </span>
                                    </div>
                                    <CountdownTimer
                                        intervalSeconds={activeGame?.interval}
                                        totalRounds={activeGame?.totalRounds}
                                        timeOffset={activeGame?.timeOffset}
                                        variant="minimal"
                                        onRoundChange={setNextRound}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                            {activeGame?.resultType === "powerball" ? (
                                <PowerballResults results={MOCK_POWERBALL_RESULTS} />
                            ) : (
                                <LadderResults results={displayResults} />
                            )}
                        </CardContent>
                    </Card>

                    {/* Stats Sidebar */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="flex flex-col border-border bg-card/50 backdrop-blur-md overflow-hidden ring-1 ring-white/5 shadow-xl">
                            <CardHeader className="pb-3 border-b border-border/50 bg-muted/30">
                                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <UserIcon className="w-4 h-4 text-blue-500" />
                                            {user ? "내 정보" : "회원 서비스"}
                                        </div>
                                        {user && (
                                            <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-muted rounded-full">
                                                <Settings className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {user ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => signOut()}
                                                className="h-7 px-2 text-[10px] font-bold text-red-400 hover:text-red-500 hover:bg-red-500/5 gap-1.5"
                                            >
                                                <LogOut className="w-3 h-3" /> 로그아웃
                                            </Button>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                                GUEST MODE
                                            </div>
                                        )}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1 flex flex-col">
                                {user ? (
                                    <div className="flex-1 flex flex-col space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                                <UserIcon className="w-8 h-8" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-black text-lg truncate">{user.displayName || user.email?.split('@')[0]}</span>
                                                    <Badge className="bg-yellow-500/10 text-yellow-500 border-none text-[10px] h-5 px-2 font-bold uppercase tracking-wider">GOLD VIP</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group">
                                                <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1 group-hover:text-yellow-500 transition-colors">
                                                    <Coins className="w-3 h-3" /> 보유 포인트
                                                </div>
                                                <div className="text-base font-black text-foreground">{user.points?.toLocaleString() || "50,000"} P</div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group">
                                                <div className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1 group-hover:text-green-500 transition-colors">
                                                    <Shield className="w-3 h-3" /> 멤버십
                                                </div>
                                                <div className="text-base font-black text-green-500 uppercase">PRO</div>
                                            </div>
                                        </div>

                                        {/* 추가된 영역: 오늘의 활동/공지 */}
                                        <div className="flex-1 min-h-[100px] p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest">오늘의 맞춤 정보</span>
                                                <Megaphone className="w-3.5 h-3.5 text-blue-500/50" />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">이달의 AI 승률 기여</span>
                                                    <span className="font-bold text-foreground">상위 5%</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">멤버십 만료 D-Day</span>
                                                    <span className="font-bold text-foreground">24일 남음</span>
                                                </div>
                                                <div className="text-[11px] text-blue-400/80 leading-relaxed pt-1 italic font-medium">
                                                    * 민경환님, 오늘도 AI Alpha Bot의 프리미엄 픽이 업데이트 되었습니다!
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col justify-center text-center py-4">
                                        <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center border border-border/50">
                                            <UserIcon className="w-8 h-8 text-muted-foreground/30" />
                                        </div>
                                        <h3 className="text-lg font-black text-foreground mb-2">프리미엄 픽을 확인하세요</h3>
                                        <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-[200px] mx-auto">
                                            지금가입하고 AI가 제안하는<br />
                                            최적의 데이터를 확인해 보세요.
                                        </p>
                                        <div className="space-y-2 max-w-[260px] mx-auto w-full">
                                            <Link href="/login" className="block w-full">
                                                <Button className="w-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 font-black tracking-wider uppercase text-xs h-11">
                                                    로그인
                                                </Button>
                                            </Link>
                                            <Link href="/signup" className="block w-full">
                                                <Button variant="outline" className="w-full border-border/50 font-black tracking-wider uppercase text-xs h-11">
                                                    회원가입
                                                </Button>
                                            </Link>
                                        </div>
                                        <div className="mt-8 pt-6 border-t border-border/50">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">ALPHA PICK BENEFITS</p>
                                            <div className="grid grid-cols-3 gap-2 mt-3">
                                                <div className="text-[10px] font-bold text-blue-500/70 bg-blue-500/5 py-1 rounded-md">AI 리포트</div>
                                                <div className="text-[10px] font-bold text-green-500/70 bg-green-500/5 py-1 rounded-md">실시간 알림</div>
                                                <div className="text-[10px] font-bold text-orange-500/70 bg-orange-500/5 py-1 rounded-md">전용 채팅</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </div>
                </div>

                {/* AI Bot Selection Area */}
                <AiBotList gameType={activeGame?.resultType} />

                {!user && !authLoading && (
                    <section className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-blue-600/10 to-transparent border border-blue-500/20">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">프리미엄 정보를 더 원하시나요?</h2>
                                <p className="text-muted-foreground italic">로그인하여 상세한 패턴 분석 리포트와 실시간 알림 기능을 이용해 보세요.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link href="/login">
                                    <Button size="lg" variant="outline" className="border-border hover:bg-muted">
                                        이미 계정이 있습니다
                                    </Button>
                                </Link>
                                <Link href="/signup">
                                    <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-8">
                                        지금 무료 가입하기
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                {/* Feature Sections */}
                <section className="mt-16">
                    <h2 className="text-2xl font-bold text-foreground mb-6">AI 분석 엔진 안내</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { title: "실시간 패턴 분석", desc: "최근 50회차 이상의 데이터를 실시간으로 수집하여 일정한 패턴과 흐름을 읽어냅니다.", icon: BrainCircuit },
                            { title: "데이터 공백 대응", desc: "회차 누락 발생 시에도 가용한 가장 최신 데이터를 바탕으로 지능적으로 판단합니다.", icon: AlertCircle },
                            { title: "고성능 Gemini 기반", desc: "구글의 최신 AI Gemini Pro를 활용하여 정교한 확률적 예측 모델을 구동합니다.", icon: Crown }
                        ].map((item, idx) => (
                            <div key={idx} className="p-6 rounded-2xl bg-muted/30 border border-border hover:border-blue-500/30 transition-colors group">
                                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <item.icon className="w-6 h-6 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <footer className="mt-20 border-t border-border py-12">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-muted-foreground text-sm">© 2026 AlphaPick AI. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

