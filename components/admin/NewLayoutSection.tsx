"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save } from "lucide-react";

export function NewLayoutSection() {
    const [newTypeId, setNewTypeId] = useState("");
    const [newTypeName, setNewTypeName] = useState("");
    const [newTypeDesc, setNewTypeDesc] = useState("");

    const handleAddType = async () => {
        if (!newTypeId.trim() || !newTypeName.trim()) {
            alert("ID와 이름을 모두 입력해주세요.");
            return;
        }

        const typeId = newTypeId.toLowerCase().trim();

        try {
            await setDoc(doc(db, "result_types", typeId), {
                name: newTypeName,
                description: newTypeDesc,
                createdAt: new Date()
            });
            setNewTypeId("");
            setNewTypeName("");
            setNewTypeDesc("");
            alert("새 레이아웃 타입이 추가되었습니다.");
        } catch (error) {
            console.error("Error adding result type:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    };

    return (
        <Card className="border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-500" />
                    새 레이아웃 타입 추가
                </CardTitle>
                <CardDescription>신규 게임 구조(예: Baccarat, Slot)가 추가될 때 마스터 ID를 생성합니다.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Type ID (영문)</label>
                        <Input
                            placeholder="예: baccarat"
                            value={newTypeId}
                            onChange={(e) => setNewTypeId(e.target.value)}
                            className="bg-background font-mono"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">표시 이름 (한글/영문)</label>
                        <Input
                            placeholder="예: 바카라"
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            className="bg-background"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button onClick={handleAddType} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase italic tracking-tighter">
                            <Save className="w-4 h-4 mr-2" />
                            Master Save
                        </Button>
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">설명 (선택사항)</label>
                        <Input
                            placeholder="이 레이아웃 형식에 대한 설명을 입력하세요."
                            value={newTypeDesc}
                            onChange={(e) => setNewTypeDesc(e.target.value)}
                            className="bg-background"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
