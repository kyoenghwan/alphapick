"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Brain, Power, RefreshCw, Save, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiConfigSection() {
    const [geminiKey, setGeminiKey] = useState("");
    const [isEnabled, setIsEnabled] = useState(true);
    const [isSavingAi, setIsSavingAi] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // 봇 그룹별 활성화 상태
    const [activeST, setActiveST] = useState(true);
    const [activeMT, setActiveMT] = useState(true);
    const [activeLT, setActiveLT] = useState(true);
    const [activeComp1, setActiveComp1] = useState(true);
    const [activeComp2, setActiveComp2] = useState(true);
    const [activeFinal, setActiveFinal] = useState(true);

    useEffect(() => {
        const unsubAi = onSnapshot(doc(db, "settings", "ai_config"), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setGeminiKey(data.gemini_api_key || "");
                setIsEnabled(data.is_enabled !== false);
                setActiveST(data.active_st !== false);
                setActiveMT(data.active_mt !== false);
                setActiveLT(data.active_lt !== false);
                setActiveComp1(data.active_comp1 !== false);
                setActiveComp2(data.active_comp2 !== false);
                setActiveFinal(data.active_final !== false);
                setHasChanges(false);
            }
        });
        return () => unsubAi();
    }, []);

    const handleSaveAiConfig = async () => {
        setIsSavingAi(true);
        try {
            await setDoc(doc(db, "settings", "ai_config"), {
                gemini_api_key: geminiKey,
                is_enabled: isEnabled,
                active_st: activeST,
                active_mt: activeMT,
                active_lt: activeLT,
                active_comp1: activeComp1,
                active_comp2: activeComp2,
                active_final: activeFinal,
                updatedAt: new Date()
            }, { merge: true });
            setHasChanges(false);
            alert("AI 설정이 성공적으로 저장되었습니다.");
        } catch (error) {
            console.error("Error saving AI config:", error);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setIsSavingAi(false);
        }
    };

    return (
        <Card className="border-purple-500/20 bg-purple-500/5 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-3 bg-purple-500/10">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Brain className="w-6 h-6 text-purple-600" />
                        AI & System Configuration
                    </CardTitle>
                    {hasChanges && (
                        <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded animate-pulse">
                            변경사항 있음
                        </span>
                    )}
                </div>
                <CardDescription>Gemini 분석 엔진 및 각 예측 봇 그룹의 활성화 여부를 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                    {/* Main Status Toggle */}
                    <div className="flex items-center justify-between bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-purple-500/10 shadow-sm transition-all hover:bg-white/80 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "p-3 rounded-full transition-all",
                                isEnabled ? "bg-green-100 text-green-600 shadow-green-100/50" : "bg-red-100 text-red-600 shadow-red-100/50",
                                "shadow-lg"
                            )}>
                                <Power className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-base">전체 AI 시스템 상태</div>
                                <div className="text-xs text-muted-foreground">
                                    {isEnabled ? "시스템이 현재 활성화되어 예측을 수행합니다." : "시스템이 강제로 중단되었습니다."}
                                </div>
                            </div>
                        </div>
                        <Switch
                            checked={isEnabled}
                            onCheckedChange={(val) => {
                                setIsEnabled(val);
                                setHasChanges(true);
                            }}
                        />
                    </div>

                    {/* Gemini API Key */}
                    <div className="space-y-2 group">
                        <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                            <span>Google Gemini API KEY</span>
                            {geminiKey === "" && <span className="text-red-500 normal-case">(입력 필수)</span>}
                        </label>
                        <div className="flex gap-2">
                            <Input
                                type="password"
                                placeholder="Gemini API 키를 입력하세요"
                                value={geminiKey}
                                onChange={(e) => {
                                    setGeminiKey(e.target.value);
                                    setHasChanges(true);
                                }}
                                className="bg-white/60 flex-1 font-mono focus:bg-white transition-all border-purple-500/10 focus:border-purple-500/30"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground ml-1">
                            * 이 키는 시뮬레이션 및 결과 예측 시 Gemini 1.5/2.0 호출에 사용됩니다.
                        </p>
                    </div>

                    {/* Bot Groups Control */}
                    <div className="pt-4 border-t border-purple-500/10">
                        <h3 className="text-xs font-black uppercase mb-4 flex items-center gap-2 text-purple-700">
                            <Boxes className="w-4 h-4" />
                            BOT GROUP ACTIVATION CONTROL
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[
                                { id: "st", label: "단기 (1~5)", state: activeST, setState: setActiveST },
                                { id: "mt", label: "중기 (6~10)", state: activeMT, setState: setActiveMT },
                                { id: "lt", label: "장기 (11~15)", state: activeLT, setState: setActiveLT },
                                { id: "comp1", label: "1차 종합 (16~18)", state: activeComp1, setState: setActiveComp1 },
                                { id: "comp2", label: "2차 종합 (19)", state: activeComp2, setState: setActiveComp2 },
                                { id: "final", label: "최종 (20)", state: activeFinal, setState: setActiveFinal },
                            ].map((group) => (
                                <div key={group.id} className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-transparent group hover:border-purple-500/30 hover:bg-white transition-all shadow-sm">
                                    <span className="text-xs font-bold text-slate-700">{group.label}</span>
                                    <Switch
                                        checked={group.state}
                                        onCheckedChange={(val) => {
                                            group.setState(val);
                                            setHasChanges(true);
                                        }}
                                        className="scale-90"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Master Save Button */}
                    <div className="pt-6">
                        <Button
                            onClick={handleSaveAiConfig}
                            disabled={isSavingAi || (!hasChanges && geminiKey !== "")}
                            className={cn(
                                "w-full h-12 text-base font-black uppercase italic tracking-wider transition-all shadow-lg",
                                hasChanges ? "bg-purple-600 hover:bg-purple-500 text-white scale-[1.01]" : "bg-slate-100 text-slate-400"
                            )}
                        >
                            {isSavingAi ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <Save className="w-5 h-5" />
                                    Apply All AI Settings
                                </div>
                            )}
                        </Button>
                        {!hasChanges && geminiKey !== "" && (
                            <p className="text-center text-[10px] text-muted-foreground mt-2">
                                현재 모든 설정이 최신 상태입니다.
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
