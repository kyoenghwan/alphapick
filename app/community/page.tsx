"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Megaphone,
    Boxes,
    Info,
    MessageSquare,
    ChevronRight,
    ShieldCheck,
    ArrowUpRight,
    Users,
    Activity
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Board {
    id: string;
    name: string;
    description: string;
    icon: string;
    order: number;
}

const ICON_MAP: Record<string, any> = {
    Megaphone,
    Boxes,
    Info,
    MessageSquare
};

export default function CommunityPage() {
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "community_boards"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const bds = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Board));
            setBoards(bds);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
                    <span className="text-sm font-black italic uppercase tracking-tighter animate-pulse">Establishing Connection...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-foreground selection:bg-blue-500/30">
            {/* Header Section */}
            <div className="relative border-b border-white/5 bg-gradient-to-b from-blue-500/5 to-transparent pt-20 pb-16 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                                    AlphaPick Intelligence
                                </Badge>
                                <div className="h-px w-8 bg-white/10" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">v2.0 Data Lab</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-[0.9]">
                                Intelligence <br />
                                <span className="text-blue-500 underline decoration-blue-500/30 underline-offset-8">Community</span>
                            </h1>
                            <p className="mt-6 text-muted-foreground max-w-xl text-lg font-medium leading-relaxed">
                                사행성 조장 및 배팅 정보를 일절 금지하며, <br className="hidden md:block" />
                                오직 데이터 분석과 기술적인 노하우를 공유하는 전문적인 공간입니다.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                                <Users className="w-6 h-6 text-blue-500 mb-2" />
                                <div className="text-2xl font-black italic uppercase tracking-tighter">Active</div>
                                <div className="text-xs text-muted-foreground font-bold">Research Members</div>
                            </div>
                            <div className="p-6 rounded-3xl bg-blue-500 border border-blue-400">
                                <ShieldCheck className="w-6 h-6 text-white mb-2" />
                                <div className="text-2xl font-black italic uppercase tracking-tighter text-white">Trust</div>
                                <div className="text-xs text-blue-100 font-bold">Data Security</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Board Selection Grid */}
            <main className="max-w-7xl mx-auto px-6 py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {boards.map((board) => {
                        const Icon = ICON_MAP[board.icon] || Boxes;
                        return (
                            <Link key={board.id} href={`/community/${board.id}`}>
                                <Card className="group relative h-full bg-white/5 border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-500 overflow-hidden cursor-pointer rounded-3xl">
                                    {/* Background Accent */}
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Icon className="w-32 h-32" />
                                    </div>

                                    <CardHeader className="relative pt-10 px-8">
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                            <Icon className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter group-hover:text-blue-500 transition-colors">
                                            {board.name}
                                        </CardTitle>
                                        <CardDescription className="text-sm font-medium leading-relaxed mt-2 text-muted-foreground group-hover:text-foreground/80 transition-colors">
                                            {board.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="relative px-8 pb-10">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/70 group-hover:text-blue-500 transition-colors">
                                            Enter Board
                                            <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </div>
                                    </CardContent>

                                    {/* Bottom Indicator */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Card>
                            </Link>
                        );
                    })}
                </div>

                {/* Regulation Banner */}
                <div className="mt-20 p-8 rounded-[40px] bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
                        <div className="max-w-2xl">
                            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white mb-2">
                                Professional Data Integrity
                            </h2>
                            <p className="text-blue-100 text-sm md:text-md font-medium">
                                AlphaPick 커뮤니티는 모든 사용자의 데이터 자산을 보호하며, 사행성 및 불법 정보에 대해서는 무관용 원칙을 고수합니다.
                                전문적인 분석 문화 정착에 함께해 주세요.
                            </p>
                        </div>
                        <Link href="/support/rules">
                            <button className="px-8 py-4 bg-white text-blue-600 font-black italic uppercase tracking-tighter rounded-2xl hover:scale-105 transition-transform active:scale-95 shadow-xl">
                                Read Guidelines
                            </button>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
