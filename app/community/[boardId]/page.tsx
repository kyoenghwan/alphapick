"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    query,
    where,
    orderBy,
    doc,
    getDoc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Plus,
    ArrowLeft,
    Clock,
    Eye,
    MessageCircle,
    SlidersHorizontal,
    FileText,
    ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Post {
    id: string;
    title: string;
    authorName: string;
    createdAt: any;
    views: number;
    commentCount?: number;
    description?: string;
}

interface Board {
    id: string;
    name: string;
    description: string;
}

export default function BoardPage() {
    const params = useParams();
    const boardId = params.boardId as string;

    const [board, setBoard] = useState<Board | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch Board Info
        const fetchBoard = async () => {
            try {
                const docRef = doc(db, "community_boards", boardId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setBoard({ id: docSnap.id, ...docSnap.data() } as Board);
                }
            } catch (error) {
                console.error("Error fetching board:", error);
            }
        };

        fetchBoard();

        // Subscribe to Posts
        const q = query(
            collection(db, "community_posts"),
            where("boardId", "==", boardId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Post));
            setPosts(pts);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [boardId]);

    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.authorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return null;

    return (
        <div className="min-h-screen bg-[#050505]">
            {/* Navigation Header */}
            <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/community">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div className="h-4 w-px bg-white/10" />
                        <div>
                            <h1 className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                                <span className="text-blue-500">LAB:</span> {board?.name}
                            </h1>
                        </div>
                    </div>
                    <Link href={`/community/${boardId}/write`}>
                        <Button className="bg-blue-600 hover:bg-blue-500 text-white font-black italic uppercase tracking-tighter text-sm rounded-xl px-6 h-10 shadow-lg shadow-blue-500/20">
                            <Plus className="w-4 h-4 mr-2" />
                            New Research
                        </Button>
                    </Link>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Board Description Area */}
                <div className="mb-12">
                    <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 border-none px-1.5 h-4">
                            Active Sector
                        </Badge>
                    </div>
                    <p className="text-muted-foreground font-medium text-lg italic">
                        "{board?.description}"
                    </p>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                        <Input
                            placeholder="Search by title or author..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border-white/5 pl-11 h-12 rounded-2xl focus:ring-1 focus:ring-blue-500 transition-all font-medium text-sm"
                        />
                    </div>
                    <Button variant="outline" className="h-12 rounded-2xl border-white/5 bg-white/5 text-muted-foreground font-bold text-sm px-6 hover:bg-white/10 transition-colors">
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        Sort Settings
                    </Button>
                </div>

                {/* Post List Table/Cards */}
                <div className="grid gap-px bg-white/5 border border-white/5 rounded-[32px] overflow-hidden">
                    <div className="grid grid-cols-[1fr_120px_100px_100px] gap-4 px-8 py-5 bg-white/[0.02] border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <div>Title / Summary</div>
                        <div className="text-center">Author</div>
                        <div className="text-center">Date</div>
                        <div className="text-center">Stats</div>
                    </div>

                    {filteredPosts.map((post) => (
                        <Link key={post.id} href={`/community/${boardId}/${post.id}`}>
                            <div className="grid grid-cols-[1fr_120px_100px_100px] gap-4 px-8 py-6 bg-[#050505] hover:bg-blue-500/[0.03] transition-colors cursor-pointer group items-center">
                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-[15px] font-black italic tracking-tight text-white group-hover:text-blue-500 transition-colors truncate uppercase">
                                            {post.title}
                                        </h3>
                                        <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-blue-500 transition-all" />
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium truncate max-w-2xl">
                                        {post.description || "Experimental data analysis report..."}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <Badge variant="outline" className="rounded-full bg-white/5 border-white/10 text-muted-foreground text-[10px] font-bold px-2 py-0">
                                        {post.authorName}
                                    </Badge>
                                </div>
                                <div className="text-center text-[10px] font-black text-muted-foreground uppercase opacity-70">
                                    {format(post.createdAt?.toDate() || new Date(), "yyyy.MM.dd", { locale: ko })}
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                    <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground italic">
                                        <Eye className="w-3 h-3 text-blue-500/50" />
                                        {post.views}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground italic">
                                        <MessageCircle className="w-3 h-3 text-orange-500/50" />
                                        {post.commentCount || 0}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {filteredPosts.length === 0 && (
                        <div className="py-32 text-center bg-[#050505]">
                            <div className="w-20 h-20 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h4 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">No Research Found</h4>
                            <p className="text-sm text-muted-foreground font-medium">검색 결과가 없습니다. 다른 검색어를 입력해 컬렉션을 확인해 보세요.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
