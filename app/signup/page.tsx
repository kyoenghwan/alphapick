"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrainCircuit, Loader2, ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useEffect } from "react";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // 인증 관련 상태
    const [verificationCode, setVerificationCode] = useState("");
    const [sentCode, setSentCode] = useState(""); // 로컬 테스트용 (실제는 DB/서버에서 확인)
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [isVerificationSent, setIsVerificationSent] = useState(false);
    const [verificationLoading, setVerificationLoading] = useState(false);

    // 약관 관련 상태
    const [agreements, setAgreements] = useState({
        terms: false,
        privacy: false,
        marketing: false,
    });
    const [legalData, setLegalData] = useState({
        termsOfService: "이용약관을 불러오는 중입니다...",
        privacyPolicy: "개인정보 처리방침을 불러오는 중입니다...",
    });

    // 모달 상태
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

    const router = useRouter();

    useEffect(() => {
        fetchLegalTerms();
    }, []);

    const fetchLegalTerms = async () => {
        try {
            const docRef = doc(db, "settings", "legal");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setLegalData({
                    termsOfService: data.termsOfService || "등록된 이용약관이 없습니다.",
                    privacyPolicy: data.privacyPolicy || "등록된 개인정보 처리방침이 없습니다.",
                });
            }
        } catch (error) {
            console.error("약관 조회 실패:", error);
        }
    };

    const handleSendVerification = async () => {
        if (!email) {
            setError("이메일을 먼저 입력해 주세요.");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("올바른 이메일 형식을 입력해 주세요.");
            return;
        }

        setVerificationLoading(true);
        setError("");
        try {
            // 0. 이메일 중복 체크
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setError("이미 가입된 이메일입니다. 로그인해 주세요.");
                setVerificationLoading(false);
                return;
            }

            // 1. 6자리 난수 생성
            const code = Math.floor(100000 + Math.random() * 900000).toString();

            // 2. Firestore에 인증 코드 저장 (테스트용)
            await setDoc(doc(db, "verification_codes", email), {
                code,
                createdAt: serverTimestamp(),
            });

            setSentCode(code); // 임시 저장
            setIsVerificationSent(true);
            alert(`인증번호가 발송되었습니다. (테스트용 번호: ${code})\n실제 운영 시에는 입력하신 메일로 발송됩니다.`);
        } catch (err) {
            console.error("인증번호 발송 실패:", err);
            setError("인증번호 발송 중 오류가 발생했습니다.");
        } finally {
            setVerificationLoading(false);
        }
    };

    const handleVerifyCode = () => {
        if (verificationCode === sentCode) {
            setIsEmailVerified(true);
            setError("");
            alert("이메일 인증이 완료되었습니다.");
        } else {
            setError("인증번호가 일치하지 않습니다.");
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        // 약관 동의 확인
        if (!agreements.terms || !agreements.privacy) {
            setError("필수 이용약관 및 개인정보 처리방침에 동의해 주세요.");
            return;
        }

        // 이메일 인증 확인
        if (!isEmailVerified) {
            setError("이메일 인증을 완료해 주세요.");
            return;
        }

        // 비밀번호 확인 검사
        if (password !== confirmPassword) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
        }

        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("올바른 이메일 형식을 입력해 주세요.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // 1. Firebase Auth 유저 생성
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. 프로필 업데이트 (이름)
            await updateProfile(user, { displayName });

            // 3. Firestore에 유저 정보 저장 (기본값 설정)
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                displayName,
                role: "user",        // 기본 사용자 역할
                membership: "none",  // 기본 무료 멤버십
                points: 1000,        // 가입 축하 기본 포인트
                isEmailVerified: false,
                createdAt: new Date().toISOString(),
            });

            router.push("/");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "회원가입 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]" />
            </div>

            <Card className="w-full max-w-md border-border bg-card backdrop-blur-xl relative z-10">
                <CardHeader className="text-center pb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6 mx-auto">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <BrainCircuit className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">AlphaPick</span>
                    </Link>
                    <CardTitle className="text-2xl font-bold text-foreground">무료 회원가입</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        실시간 AI 예측 픽과 정교한 통계 데이터를 무료로 확인하세요.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">이름</label>
                            <Input
                                type="text"
                                placeholder="홍길동"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                                className="bg-muted/50 border-input text-foreground focus:ring-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">이메일</label>
                            <div className="flex gap-2">
                                <Input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isEmailVerified || isVerificationSent}
                                    className="bg-muted/50 border-input text-foreground focus:ring-blue-500"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSendVerification}
                                    disabled={verificationLoading || isEmailVerified || isVerificationSent}
                                    className="shrink-0"
                                >
                                    {verificationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "인증발송"}
                                </Button>
                                {isVerificationSent && !isEmailVerified && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setIsVerificationSent(false);
                                            setSentCode("");
                                            setVerificationCode("");
                                        }}
                                        className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        이메일 수정
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* 인증번호 입력 칸 */}
                        {isVerificationSent && !isEmailVerified && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-sm font-medium text-muted-foreground">인증번호 (6자리)</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        className="bg-muted/50 border-input text-foreground focus:ring-blue-500"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleVerifyCode}
                                        className="shrink-0 bg-blue-600 hover:bg-blue-500"
                                    >
                                        확인
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">메일로 발송된 6자리 번호를 입력해 주세요.</p>
                            </div>
                        )}

                        {isEmailVerified && (
                            <p className="text-xs text-green-500 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> 이메일 인증이 완료되었습니다.
                            </p>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">비밀번호</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-muted/50 border-input text-foreground focus:ring-blue-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">비밀번호 확인</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="bg-muted/50 border-input text-foreground focus:ring-blue-500"
                            />
                        </div>

                        {/* 약관 동의 섹션 */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={agreements.terms}
                                    onChange={(e) => setAgreements(prev => ({ ...prev, terms: e.target.checked }))}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="flex-1 flex items-center justify-between">
                                    <label htmlFor="terms" className="text-sm font-medium text-foreground cursor-pointer">
                                        [필수] 이용약관 동의
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsTermsOpen(true)}
                                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                                    >
                                        보기
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="privacy"
                                    checked={agreements.privacy}
                                    onChange={(e) => setAgreements(prev => ({ ...prev, privacy: e.target.checked }))}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <div className="flex-1 flex items-center justify-between">
                                    <label htmlFor="privacy" className="text-sm font-medium text-foreground cursor-pointer">
                                        [필수] 개인정보 수집 및 이용 동의
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsPrivacyOpen(true)}
                                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                                    >
                                        보기
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="marketing"
                                    checked={agreements.marketing}
                                    onChange={(e) => setAgreements(prev => ({ ...prev, marketing: e.target.checked }))}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="marketing" className="text-sm font-medium text-muted-foreground cursor-pointer">
                                    [선택] 마케팅 정보 수신 동의
                                </label>
                            </div>
                        </div>

                        {/* 약관 모달 */}
                        <Dialog open={isTermsOpen} onOpenChange={setIsTermsOpen}>
                            <DialogContent onClose={() => setIsTermsOpen(false)} className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>서비스 이용약관</DialogTitle>
                                </DialogHeader>
                                <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
                                    {legalData.termsOfService}
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen}>
                            <DialogContent onClose={() => setIsPrivacyOpen(false)} className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>개인정보 처리방침</DialogTitle>
                                </DialogHeader>
                                <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
                                    {legalData.privacyPolicy}
                                </div>
                            </DialogContent>
                        </Dialog>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11 text-lg font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>가입하기 <ArrowRight className="ml-2 w-5 h-5" /></>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-border text-center">
                        <p className="text-sm text-muted-foreground">
                            이미 계정이 있으신가요?{" "}
                            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-bold">
                                로그인하기
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
