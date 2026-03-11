"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    writeBatch,
    getDocs
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, RotateCcw, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SubCategory {
    id: string;
    name: string;
    order: number;
    resultType?: "ladder" | "powerball";
}

interface Category {
    id: string;
    name: string;
    order: number;
    subcategories: SubCategory[];
    isActive?: boolean;
    interval?: number;
    totalRounds?: number;
    gameCode?: string;
    resultType?: "ladder" | "powerball";
    timeOffset?: number;
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [availableResultTypes, setAvailableResultTypes] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        // Fetch Result Types Master
        const unsubscribeTypes = onSnapshot(collection(db, "result_types"), (snapshot) => {
            const types = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
            setAvailableResultTypes(types);
        });

        const q = query(collection(db, "categories"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const cats = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Category));
                setCategories(cats);
                setLoading(false);
            },
            (error) => {
                console.error("Firestore onSnapshot error:", error);
                setLoading(false);
            }
        );
        return () => {
            unsubscribe();
            unsubscribeTypes();
        };
    }, []);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        const gameCode = "new_game_" + Date.now();
        try {
            const newDocRef = doc(db, "categories", gameCode);
            await setDoc(newDocRef, {
                name: newCategoryName,
                order: categories.length,
                isActive: true,
                interval: 180,
                totalRounds: 480,
                gameCode: gameCode,
                timeOffset: 0,
                subcategories: [
                    { id: "system", name: "시스템배팅", order: 0, resultType: "ladder" },
                    { id: "single", name: "단폴", order: 1, resultType: "ladder" }
                ]
            });
            setNewCategoryName("");
        } catch (error) {
            console.error("Error adding category:", error);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("정말 이 카테고리를 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "categories", id));
        } catch (error) {
            console.error("Error deleting category:", error);
        }
    };

    const handleAddSubCategory = async (categoryId: string) => {
        const name = prompt("새 하위 카테고리 이름을 입력하세요:");
        if (!name) return;

        const category = categories.find(c => c.id === categoryId);
        if (!category) return;

        const newSub = {
            id: Date.now().toString(),
            name,
            order: category.subcategories.length
        };

        try {
            await updateDoc(doc(db, "categories", categoryId), {
                subcategories: [...category.subcategories, newSub]
            });
        } catch (error) {
            console.error("Error adding subcategory:", error);
        }
    };

    const handleDeleteSubCategory = async (categoryId: string, subId: string) => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return;

        try {
            await updateDoc(doc(db, "categories", categoryId), {
                subcategories: category.subcategories.filter(s => s.id !== subId)
            });
        } catch (error) {
            console.error("Error deleting subcategory:", error);
        }
    };

    const handleInitializeDefaults = async () => {
        if (!confirm("모든 카테고리를 초기화하고 기본 데이터를 생성하시겠습니까? 기존 데이터는 삭제될 수 있습니다.")) return;

        try {
            const batch = writeBatch(db);

            // 기존 데이터 삭제
            const snapshot = await getDocs(collection(db, "categories"));
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            const defaultConfigs = [
                { name: "EOS 파워볼 5분", code: "eos_powerball_5", interval: 300, rounds: 288, offset: 0, layout: "powerball" },
                { name: "동행 파워볼", code: "dh_powerball", interval: 300, rounds: 288, offset: 0, layout: "powerball" },
                { name: "코인 파워볼 3분", code: "coin_powerball_3", interval: 180, rounds: 480, offset: 0, layout: "powerball" },
                { name: "보글 파워볼", code: "bubble_powerball", interval: 300, rounds: 288, offset: 0, layout: "powerball" },
                { name: "보글 사다리", code: "bubble_ladder", interval: 180, rounds: 480, offset: -5, layout: "ladder" },
                { name: "엔트리 파워볼", code: "entry_powerball", interval: 300, rounds: 288, offset: 0, layout: "powerball" },
                { name: "네임드 사다리", code: "named_ladder", interval: 300, rounds: 288, offset: 0, layout: "ladder" },
            ];

            defaultConfigs.forEach((config, index) => {
                // gameCode(config.code)를 문서 ID로 직접 사용
                const newDocRef = doc(db, "categories", config.code);
                batch.set(newDocRef, {
                    name: config.name,
                    gameCode: config.code,
                    order: index,
                    isActive: true,
                    interval: config.interval,
                    totalRounds: config.rounds,
                    timeOffset: config.offset,
                    resultType: config.layout as "ladder" | "powerball",
                    subcategories: [
                        { id: "system", name: "시스템배팅", order: 0, resultType: config.layout as any },
                        { id: "single", name: "단폴", order: 1, resultType: config.layout as any }
                    ]
                });
            });

            await batch.commit();
            alert("기본 데이터가 초기화되었습니다.");
        } catch (error) {
            console.error("Error initializing defaults:", error);
            alert("초기화 중 오류가 발생했습니다.");
        }
    };

    const handleMoveOrder = async (id: string, direction: 'up' | 'down') => {
        const index = categories.findIndex(c => c.id === id);
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === categories.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const currentCat = categories[index];
        const targetCat = categories[targetIndex];

        try {
            const batch = writeBatch(db);
            batch.update(doc(db, "categories", currentCat.id), { order: targetIndex });
            batch.update(doc(db, "categories", targetCat.id), { order: index });
            await batch.commit();
        } catch (error) {
            console.error("Error moving order:", error);
        }
    };

    if (loading) return <div className="p-8">로딩 중...</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                        카테고리 관리
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        게임 목록 및 하위 메뉴(시스템배팅/단폴 등)를 관리합니다.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInitializeDefaults}
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    초기값 생성
                </Button>
            </div>

            <Card className="mb-8 border-blue-500/20 bg-blue-500/5">
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <Input
                            placeholder="새 게임 이름 입력 (예: 보글사다리)"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            className="bg-background"
                        />
                        <Button onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-500 text-white shrink-0">
                            <Plus className="w-4 h-4 mr-2" />
                            게임 추가
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4">
                {categories.map((category) => (
                    <Card key={category.id} className="border-border hover:border-blue-500/30 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between py-4 space-y-0">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveOrder(category.id, 'up')}>
                                        <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveOrder(category.id, 'down')}>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </div>
                                <CardTitle className="text-xl font-bold">{category.name}</CardTitle>
                                <Badge variant="outline" className="text-[10px] text-muted-foreground uppercase">
                                    Order: {category.order}
                                </Badge>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-red-400"
                                onClick={() => handleDeleteCategory(category.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-0 pb-6">
                            {/* Game Settings Section */}
                            <div className="mb-6 p-4 rounded-xl bg-muted/30 border border-border/50">
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-blue-400" />
                                    게임 설정
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">게임 코드</label>
                                        <Input
                                            value={category.gameCode || ""}
                                            onChange={(e) => updateDoc(doc(db, "categories", category.id), { gameCode: e.target.value })}
                                            className="h-9 text-xs font-mono"
                                            placeholder="bubble_ladder"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">주기(초)</label>
                                        <Input
                                            type="number"
                                            value={category.interval || 180}
                                            onChange={(e) => updateDoc(doc(db, "categories", category.id), { interval: parseInt(e.target.value) || 0 })}
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">총 라운드</label>
                                        <Input
                                            type="number"
                                            value={category.totalRounds || 480}
                                            onChange={(e) => updateDoc(doc(db, "categories", category.id), { totalRounds: parseInt(e.target.value) || 0 })}
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">시간 보정(초)</label>
                                        <Input
                                            type="number"
                                            value={category.timeOffset || 0}
                                            onChange={(e) => updateDoc(doc(db, "categories", category.id), { timeOffset: parseInt(e.target.value) || 0 })}
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">기본 결과 레이아웃</label>
                                        <select
                                            value={category.resultType || "ladder"}
                                            onChange={(e) => updateDoc(doc(db, "categories", category.id), { resultType: e.target.value })}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        >
                                            {availableResultTypes.length > 0 ? (
                                                availableResultTypes.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="ladder">사다리 (Ladder)</option>
                                                    <option value="powerball">파워볼 (Powerball)</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-muted-foreground">활성화 상태:</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "h-7 px-3 text-[10px] font-bold transition-all",
                                                category.isActive !== false
                                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                                                    : "hover:bg-muted"
                                            )}
                                            onClick={() => updateDoc(doc(db, "categories", category.id), { isActive: category.isActive === false })}
                                        >
                                            {category.isActive !== false ? "ACTIVE" : "INACTIVE"}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-blue-400" />
                                    하위 메뉴 설정
                                </h3>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {category.subcategories.map((sub, sIdx) => (
                                        <div
                                            key={sub.id}
                                            className="flex flex-col gap-2 p-3 rounded-xl bg-background border border-border group relative min-w-[200px]"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black">{sub.name}</span>
                                                <button
                                                    onClick={() => handleDeleteSubCategory(category.id, sub.id)}
                                                    className="text-muted-foreground hover:text-red-400 transition-opacity"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-muted-foreground uppercase">레이아웃</label>
                                                <select
                                                    value={sub.resultType || category.resultType || "ladder"}
                                                    onChange={(e) => {
                                                        const newSubs = [...category.subcategories];
                                                        newSubs[sIdx] = { ...sub, resultType: e.target.value as any };
                                                        updateDoc(doc(db, "categories", category.id), { subcategories: newSubs });
                                                    }}
                                                    className="flex h-7 w-full rounded bg-muted/50 px-2 py-1 text-[10px] font-bold border-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    {availableResultTypes.length > 0 ? (
                                                        availableResultTypes.map(t => (
                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                        ))
                                                    ) : (
                                                        <>
                                                            <option value="ladder">사다리</option>
                                                            <option value="powerball">파워볼</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-dashed border-border"
                                        onClick={() => handleAddSubCategory(category.id)}
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        항목 추가
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {categories.length === 0 && (
                    <div className="text-center py-20 bg-muted/20 border border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground">생성된 카테고리가 없습니다.</p>
                        <p className="text-sm text-muted-foreground mt-2">상단의 '게임 추가' 또는 '초기값 생성' 버튼을 이용해 주세요.</p>
                    </div>
                )}
            </div>


        </div>
    );
}


