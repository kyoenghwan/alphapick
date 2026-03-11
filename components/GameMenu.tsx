"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown, ShoppingBag, Megaphone } from "lucide-react";

interface SubCategory {
    id: string;
    name: string;
    order: number;
    resultType?: "ladder" | "powerball";
}

interface Category {
    id: string;
    name: string;
    subcategories: SubCategory[];
    isActive: boolean;
    interval?: number;
    totalRounds?: number;
    gameCode?: string;
    resultType?: "ladder" | "powerball";
    selectedSubName?: string;
    timeOffset?: number;
    order: number;
}

interface GameMenuProps {
    onCategoryChange?: (category: Category) => void;
}

export function GameMenu({ onCategoryChange }: GameMenuProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, "categories"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cats = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    const subcategories = (data.subcategories || [])
                        .map((sub: any) => ({
                            id: sub.id,
                            name: sub.name,
                            order: sub.order ?? 0
                        }))
                        .sort((a: any, b: any) => a.order - b.order);

                    return {
                        id: doc.id,
                        ...data,
                        subcategories
                    } as Category;
                })
                .filter(cat => cat.isActive === true);

            setCategories(cats);

            if (cats.length > 0) {
                const bogle = cats.find(c => c.name === "보글사다리" || c.gameCode === "bubble_ladder");
                const defaultCat = bogle || cats[0];
                setActiveCategory(defaultCat.id);

                // 초기 로딩 시 첫 번째 하위 카테고리의 설정을 적용
                const firstSub = defaultCat.subcategories?.[0];
                onCategoryChange?.({
                    ...defaultCat,
                    selectedSubName: firstSub?.name || "",
                    resultType: firstSub?.resultType || defaultCat.resultType || "ladder"
                });
            }
        }, (error) => {
            console.error("Categories subscription error:", error);
        });
        return () => unsubscribe();
    }, [onCategoryChange]);

    const handleCategoryClick = (category: Category) => {
        setActiveCategory(category.id);
        const firstSub = category.subcategories?.[0];
        onCategoryChange?.({
            ...category,
            selectedSubName: firstSub?.name || "",
            resultType: firstSub?.resultType || category.resultType || "ladder"
        });
    };

    const handleSubCategoryClick = (category: Category, sub: SubCategory) => {
        setActiveCategory(category.id);
        onCategoryChange?.({
            ...category,
            name: `${category.name}`, // 메인 이름은 유지하되
            selectedSubName: sub.name,  // 선택된 서브 이름을 따로 넘김
            resultType: sub.resultType || category.resultType || "ladder"
        });
        setOpenSubMenu(null); // 메뉴 닫기
    };

    return (
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {categories.map((category) => (
                <div
                    key={category.id}
                    className="relative"
                    onMouseEnter={() => setOpenSubMenu(category.id)}
                    onMouseLeave={() => setOpenSubMenu(null)}
                >
                    <button
                        className={cn(
                            "px-3 py-1.5 text-[13px] font-bold transition-all relative rounded-md",
                            activeCategory === category.id
                                ? "text-[#00CCCC] bg-[#00CCCC]/5"
                                : "text-foreground/70 hover:text-foreground hover:bg-secondary/50"
                        )}
                        onClick={() => handleCategoryClick(category)}
                    >
                        {category.name}
                        {activeCategory === category.id && (
                            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#00CCCC] rounded-t-full shadow-[0_0_8px_rgba(0,204,204,0.4)]" />
                        )}
                    </button>

                    {/* Submenu */}
                    {openSubMenu === category.id && category.subcategories.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-max min-w-[150px] bg-popover border border-border shadow-[0_10px_30px_rgba(0,0,0,0.15)] z-[100] overflow-hidden rounded-lg animate-in fade-in zoom-in-95 duration-150">
                            <div className="h-0.5 w-full bg-[#00CCCC]" />
                            <div className="py-1">
                                {category.subcategories.map((sub) => (
                                    <button
                                        key={sub.id}
                                        className="w-full text-left px-4 py-2.5 text-xs transition-all hover:bg-[#00CCCC]/10 font-bold group/item"
                                        onClick={() => handleSubCategoryClick(category, sub)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground group-hover/item:text-[#00CCCC] transition-colors">
                                                {sub.name}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* Additional Links: Store & Community */}
            <div className="flex items-center gap-1 ml-auto shrink-0 border-l border-border/40 pl-2">
                <Link href="/store">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-bold text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5 transition-all rounded-md">
                        <ShoppingBag className="w-4 h-4 text-blue-500" />
                        <span>이용권 구매</span>
                    </button>
                </Link>
                <Link href="/community">
                    <button className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-bold text-muted-foreground hover:text-orange-500 hover:bg-orange-500/5 transition-all rounded-md">
                        <Megaphone className="w-4 h-4 text-orange-500" />
                        <span>커뮤니티</span>
                    </button>
                </Link>
            </div>
        </nav>
    );
}
