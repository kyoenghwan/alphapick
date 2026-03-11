"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layout, Trash2 } from "lucide-react";

interface ResultType {
    id: string;
    name: string;
    description: string;
    createdAt: any;
}

export function ResultTypeTableSection() {
    const [resultTypes, setResultTypes] = useState<ResultType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = collection(db, "result_types");
        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const types = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as ResultType));
                setResultTypes(types);
                setLoading(false);
            },
            (error) => {
                console.error("Result types fetch error:", error);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const handleDeleteType = async (id: string) => {
        if (!confirm(`'${id}' 타입을 마스터 관리에서 삭제하시겠습니까? 이 타입을 사용하는 게임이 있을 경우 UI 오류가 발생할 수 있습니다.`)) return;
        try {
            await deleteDoc(doc(db, "result_types", id));
            alert("삭제되었습니다.");
        } catch (error) {
            console.error("Error deleting result type:", error);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };

    if (loading) return null;

    return (
        <Card className="border-border bg-card/30 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Layout className="w-5 h-5 text-foreground" />
                    등록된 레이아웃 마스터
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="divide-y divide-border/50">
                    {resultTypes.map((type) => (
                        <div key={type.id} className="py-4 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-[15px]">{type.name}</span>
                                        <Badge variant="outline" className="font-mono text-[10px] h-4 bg-muted/50 border-none px-1.5">
                                            {type.id}
                                        </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground mt-0.5">{type.description || "설명 없음"}</span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteType(type.id)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    {resultTypes.length === 0 && (
                        <div className="py-12 text-center text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">
                            등록된 마스터 타입이 없습니다.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
