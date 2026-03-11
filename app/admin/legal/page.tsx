"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, FileText, CheckCircle2, History, RotateCcw, Clock } from "lucide-react";

export default function LegalManagementPage() {
    const [termsOfService, setTermsOfService] = useState("");
    const [privacyPolicy, setPrivacyPolicy] = useState("");
    const [version, setVersion] = useState("");
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        fetchLegalTerms();
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const { collection, query, orderBy, getDocs, limit } = await import("firebase/firestore");
            const q = query(collection(db, "legal_versions"), orderBy("updatedAt", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            const historyData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setHistory(historyData);
        } catch (error) {
            console.error("히스토리 조회 실패:", error);
        }
    };

    const fetchLegalTerms = async () => {
        setIsLoading(true);
        try {
            const docRef = doc(db, "settings", "legal");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setTermsOfService(data.termsOfService || "");
                setPrivacyPolicy(data.privacyPolicy || "");
                setVersion(data.version || "");
            }
        } catch (error) {
            console.error("약관 조회 실패:", error);
            setMessage({ type: "error", text: "약관 데이터를 불러오는 중 오류가 발생했습니다." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage({ type: "", text: "" });

        try {
            // 1. 가장 최신 버전 조회 및 새로운 버전 계산
            const { collection, query, orderBy, getDocs, limit: firestoreLimit } = await import("firebase/firestore");
            const q = query(collection(db, "legal_versions"), orderBy("updatedAt", "desc"), firestoreLimit(1));
            const querySnapshot = await getDocs(q);

            let nextVersion = "v1.0";
            if (!querySnapshot.empty) {
                const lastDoc = querySnapshot.docs[0].data();
                const lastVersionStr = lastDoc.version || "v1.0";
                // "v1.1" -> 1.1 소수점 추출
                const currentNum = parseFloat(lastVersionStr.replace("v", ""));
                if (!isNaN(currentNum)) {
                    nextVersion = `v${(currentNum + 0.1).toFixed(1)}`;
                }
            }

            // 만약 사용자가 수동으로 버전을 입력했다면 그것을 우선 사용, 없으면 자동 계산된 다음 버전
            const finalVersion = version || nextVersion;

            // 2. 히스토리에 백업 저장
            const historyRef = doc(db, "legal_versions", finalVersion);
            await setDoc(historyRef, {
                termsOfService,
                privacyPolicy,
                version: finalVersion,
                updatedAt: serverTimestamp(),
            });

            // 3. 현재 활성 약관 저장
            const activeRef = doc(db, "settings", "legal");
            await setDoc(activeRef, {
                termsOfService,
                privacyPolicy,
                version: finalVersion,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            setMessage({ type: "success", text: `약관(${finalVersion})이 저장되고 백업되었습니다.` });
            setVersion(""); // 저장 후 입력창을 비워 다음 저장 시 자동 계산되도록 유도
            fetchHistory(); // 히스토리 갱신

            // 3초 후 메시지 제거
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        } catch (error) {
            console.error("약관 저장 실패:", error);
            setMessage({ type: "error", text: "약관을 저장하는 중 오류가 발생했습니다." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestore = (item: any) => {
        if (confirm(`${item.version || item.id} 버전의 데이터로 복구하시겠습니까? 현재 작성 중인 내용은 사라집니다.`)) {
            setTermsOfService(item.termsOfService || "");
            setPrivacyPolicy(item.privacyPolicy || "");
            setVersion(item.version || "");
            setMessage({ type: "success", text: "과거 데이터를 불러왔습니다. '저장하기'를 눌러야 적용됩니다." });
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">로딩 중...</span>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">약관 관리</h1>
                    <p className="text-muted-foreground">
                        회원가입 시 표시될 서비스 이용약관 및 개인정보 처리방침을 관리합니다.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border border-border">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Version</span>
                        <input
                            type="text"
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold w-16 focus:ring-0 text-blue-500"
                            placeholder="v1.0"
                        />
                    </div>
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        저장하기
                    </Button>
                </div>
            </div>

            {message.text && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                    }`}>
                    {message.type === "success" && <CheckCircle2 className="h-5 w-5" />}
                    {message.text}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-4">
                <div className="lg:col-span-3 grid gap-6">
                    {/* 이용약관 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <FileText className="h-5 w-5 text-blue-500" />
                                서비스 이용약관
                            </CardTitle>
                            <CardDescription>
                                회원가입 시 [필수] 이용약관 동의 항목에 표시될 내용입니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                className="min-h-[400px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="이용약관 내용을 입력하세요..."
                                value={termsOfService}
                                onChange={(e) => setTermsOfService(e.target.value)}
                            />
                        </CardContent>
                    </Card>

                    {/* 개인정보 처리방침 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <FileText className="h-5 w-5 text-indigo-500" />
                                개인정보 처리방침
                            </CardTitle>
                            <CardDescription>
                                회원가입 시 [필수] 개인정보 수집 및 이용 동의 항목에 표시될 내용입니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                className="min-h-[400px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="개인정보 처리방침 내용을 입력하세요..."
                                value={privacyPolicy}
                                onChange={(e) => setPrivacyPolicy(e.target.value)}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* 히스토리 사이드바 */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <History className="h-5 w-5 text-muted-foreground" />
                                백업 히스토리
                            </CardTitle>
                            <CardDescription>최근 저장된 10개의 백업</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {history.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">기록이 없습니다.</p>
                            ) : (
                                <div className="space-y-2">
                                    {history.map((item) => (
                                        <div
                                            key={item.id}
                                            className="group flex flex-col gap-1 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-blue-500 truncate max-w-[100px]">
                                                    {item.version || "Untitled"}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleRestore(item)}
                                                    title="이 데이터 불러오기"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {item.updatedAt?.toDate ?
                                                    item.updatedAt.toDate().toLocaleString('ko-KR', {
                                                        month: 'numeric',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : '---'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
