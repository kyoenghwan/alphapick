"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Save,
    ArrowLeft,
    AlertCircle,
    ShieldCheck,
    Info,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";

export default function WritePostPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const boardId = params.boardId as string;

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        if (!title.trim() || !content.trim()) {
            alert("제목과 내용을 입력해주세요.");
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, "community_posts"), {
                boardId,
                title,
                description,
                content,
                authorId: user.uid,
                authorName: user.displayName || user.email?.split("@")[0] || "Researcher",
                views: 0,
                likes: 0,
                status: "active",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            router.push(`/community/${boardId}`);
        } catch (error) {
            console.error("Error creating post:", error);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] selection:bg-blue-500/30">
            {/* Nav Header */}
            <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.back()}
                            className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="h-4 w-px bg-white/10" />
                        <h1 className="text-xl font-black italic uppercase tracking-tight text-white">
                            New Research <span className="text-blue-500">Entry</span>
                        </h1>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="grid lg:grid-cols-[1fr_280px] gap-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card className="bg-white/5 border-white/5 rounded-[32px] overflow-hidden">
                            <CardContent className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">Report Title</label>
                                    <Input
                                        placeholder="Enter the title of your analysis..."
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="bg-transparent border-0 border-b border-white/10 rounded-none h-14 text-2xl font-black italic tracking-tight uppercase focus:border-blue-500 transition-all placeholder:text-muted-foreground/30"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Brief Abstract</label>
                                    <Input
                                        placeholder="Summarize your analysis in one sentence..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="bg-white/5 border-white/5 rounded-xl h-12 font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Detailed Analysis Content</label>
                                    <Textarea
                                        placeholder="Document your findings, methodology, and data interpretations here..."
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="min-h-[400px] bg-white/5 border-white/5 rounded-2xl p-6 font-medium leading-relaxed resize-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.back()}
                                className="font-bold text-muted-foreground uppercase tracking-widest text-xs"
                            >
                                Discard
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-black italic uppercase tracking-tighter px-10 h-14 rounded-2xl shadow-xl shadow-blue-500/20 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {submitting ? "Publishing..." : "Submit Report"}
                            </Button>
                        </div>
                    </form>

                    {/* Sidebar Guidelines */}
                    <div className="space-y-6">
                        <Card className="bg-blue-600 border-none rounded-[32px] overflow-hidden shadow-2xl shadow-blue-600/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-white text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5" />
                                    Data Ethics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-blue-100 text-[11px] font-black uppercase tracking-wider leading-relaxed">
                                    건전한 데이터 분석 문화를 위해 다음 내용을 준수해주세요.
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        "사행성 정보(배팅/사이트) 금지",
                                        "데이터 중심의 논리적 분석",
                                        "타인 비방 및 도배 행위 금지",
                                        "허위 데이터 유포 금지"
                                    ].map((text, i) => (
                                        <li key={i} className="flex items-start gap-2 text-[11px] text-white/90 font-bold">
                                            <CheckCircle2 className="w-3 h-3 text-white/50 shrink-0 mt-0.5" />
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <div className="p-6 rounded-[32px] bg-white/5 border border-white/10">
                            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 mb-4">
                                <Info className="w-4 h-4" />
                                Editor Guide
                            </h4>
                            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed italic">
                                작성하신 연구 보고서는 관리자의 검토를 거쳐 부적절한 내용이 포함될 경우 예고 없이 비공개 처리될 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
