"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Clock,
    Eye,
    MessageCircle,
    Share2,
    Heart,
    User,
    Calendar,
    ChevronLeft
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Post {
    id: string;
    title: string;
    description?: string;
    content: string;
    authorName: string;
    createdAt: any;
    views: number;
    likes: number;
}

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const boardId = params.boardId as string;
    const postId = params.postId as string;

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const docRef = doc(db, "community_posts", postId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setPost({ id: docSnap.id, ...docSnap.data() } as Post);

                    // Increment View Count
                    await updateDoc(docRef, {
                        views: increment(1)
                    });
                }
                setLoading(false);
            } catch (error) {
                console.error("Error fetching post:", error);
                setLoading(false);
            }
        };

        fetchPost();
    }, [postId]);

    if (loading) return null;
    if (!post) return <div className="p-20 text-center text-white font-black italic uppercase">Research Paper Not Found (404)</div>;

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
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <div className="h-4 w-px bg-white/10" />
                        <Link href={`/community/${boardId}`}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors">
                                Return to Laboratory
                            </span>
                        </Link>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <article className="space-y-12">
                    {/* Header Metadata */}
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border-none px-2 h-5">
                                Research Report
                            </Badge>
                            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-[0.95] text-white">
                                {post.title}
                            </h1>
                            {post.description && (
                                <p className="text-xl text-muted-foreground font-medium italic border-l-2 border-blue-500 pl-4 py-1">
                                    {post.description}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-6 py-6 border-y border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                    <User className="w-4 h-4 text-blue-500" />
                                </div>
                                <span className="text-sm font-black italic uppercase text-white">{post.authorName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-tight">
                                    {format(post.createdAt?.toDate() || new Date(), "yyyy MMM dd HH:mm", { locale: ko })}
                                </span>
                            </div>
                            <div className="flex items-center gap-6 ml-auto">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Eye className="w-4 h-4" />
                                    <span className="text-xs font-black italic">{post.views}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Heart className="w-4 h-4" />
                                    <span className="text-xs font-black italic">{post.likes}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Post Content */}
                    <Card className="bg-transparent border-none">
                        <CardContent className="p-0">
                            <div className="prose prose-invert max-w-none prose-p:text-lg prose-p:font-medium prose-p:leading-relaxed prose-p:text-foreground/90 prose-headings:font-black prose-headings:italic prose-headings:uppercase prose-headings:tracking-tighter">
                                {post.content.split('\n').map((line, i) => (
                                    <p key={i} className="mb-4">{line}</p>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Footer Actions */}
                    <div className="flex flex-col items-center gap-10 pt-20 border-t border-white/5">
                        <div className="flex gap-4">
                            <Button className="h-16 px-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl group">
                                <Heart className="w-6 h-6 text-pink-500 group-hover:scale-110 transition-transform" />
                                <span className="ml-3 font-black italic uppercase tracking-tighter text-lg">Like Factor</span>
                                <span className="ml-2 py-0.5 px-2 bg-pink-500/10 text-pink-500 rounded-lg text-xs">{post.likes}</span>
                            </Button>
                            <Button className="h-16 w-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl flex items-center justify-center">
                                <Share2 className="w-6 h-6 text-blue-500" />
                            </Button>
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">AlphaPick Laboratory Protocol</p>
                            <p className="text-xs text-muted-foreground/50 max-w-sm italic">
                                모든 연구 보고서는 지적 자산이며, 무단 배포를 금합니다.
                                전문성 있는 토론 문화를 유지해 주세요.
                            </p>
                        </div>
                    </div>
                </article>
            </main>
        </div>
    );
}
