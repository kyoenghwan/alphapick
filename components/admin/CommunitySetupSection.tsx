"use client";

import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, RefreshCw } from "lucide-react";

export function CommunitySetupSection() {
    const handleInitCommunity = async () => {
        if (!confirm("커뮤니티 기본 게시판 구조를 생성하시겠습니까? 기존 설정이 초기화될 수 있습니다.")) return;

        const defaultBoards = [
            { id: "notice", name: "공지사항", description: "공식 시스템 업데이트 및 주요 공지", icon: "Megaphone", order: 0 },
            { id: "analysis", name: "데이터 분석실", description: "통계 및 알고리즘 기반 데이터 해석 공유", icon: "Boxes", order: 1 },
            { id: "guide", name: "이용 가이드 & 팁", description: "서비스 기능 100% 활용 노하우", icon: "Info", order: 2 },
            { id: "feedback", name: "서비스 건의 & 신고", description: "발전을 위한 소중한 의견 창구", icon: "MessageSquare", order: 3 }
        ];

        try {
            for (const board of defaultBoards) {
                await setDoc(doc(db, "community_boards", board.id), {
                    ...board,
                    isActive: true,
                    createdAt: new Date()
                });
            }
            alert("커뮤니티 마스터 데이터가 생성되었습니다.");
        } catch (error) {
            console.error("Error initializing community:", error);
            alert("초기화 중 오류가 발생했습니다.");
        }
    };

    return (
        <Card className="border-orange-500/20 bg-orange-500/5 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-orange-500" />
                    커뮤니티 관리 (Data Lab)
                </CardTitle>
                <CardDescription>커뮤니티 게시판 구조 및 설정을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 rounded-xl border border-orange-500/20 bg-background/50">
                    <div>
                        <p className="text-sm font-black italic uppercase tracking-tighter">Community Master Initialization</p>
                        <p className="text-xs text-muted-foreground mt-0.5">최초 1회 실행하여 게시판 기본 구조를 생성합니다.</p>
                    </div>
                    <Button
                        onClick={handleInitCommunity}
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-500 text-white font-black uppercase italic"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Run Initialize
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
