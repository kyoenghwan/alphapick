"use client";

import { Sidebar } from "@/components/admin/Sidebar";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * 어드민 페이지 공통 레이아웃
 * 좌측 사이드바와 우측 컨텐츠 영역으로 구성됩니다.
 * 'super' 권한이 있는 사용자만 접근 가능합니다.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="text-destructive font-bold text-lg">로그인이 필요합니다</div>
        <p className="text-muted-foreground">관리자 페이지에 접근하려면 로그인이 필요합니다.</p>
        <button
          onClick={() => router.push("/login")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

