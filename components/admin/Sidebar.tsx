"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Users, Settings, Database, List, FileText, Brain, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/detail", label: "상세조회", icon: Search },
  { href: "/admin/ai-pick-manager", label: "AI 분석 매니저", icon: Brain },
  { href: "/admin/analysis", label: "봇 분석", icon: BarChart3 },
  { href: "/admin/migration", label: "마이그레이션", icon: Database },
  { href: "/admin/categories", label: "카테고리 관리", icon: List },
  { href: "/admin/legal", label: "약관 관리", icon: FileText },
  { href: "/admin/users", label: "유저관리", icon: Users },
  { href: "/admin/settings", label: "설정", icon: Settings },
];

/**
 * 사이드바 네비게이션 컴포넌트
 * 어드민 페이지의 주요 메뉴 이동을 담당합니다.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      {/* 로고 영역 */}
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">AlphaPick Admin</h1>
      </div>

      {/* 메뉴 리스트 */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                // 현재 활성화된 페이지인 경우 하이라이트 처리를 합니다.
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

