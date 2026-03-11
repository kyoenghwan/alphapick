"use client";

import { Settings as SettingsIcon } from "lucide-react";
import { AiConfigSection } from "@/components/admin/AiConfigSection";
import { NewLayoutSection } from "@/components/admin/NewLayoutSection";
import { CommunitySetupSection } from "@/components/admin/CommunitySetupSection";
import { ResultTypeTableSection } from "@/components/admin/ResultTypeTableSection";

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-blue-500" />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">Master Setup</h1>
        </div>
        <p className="text-muted-foreground">결과 데이터 레이아웃(Result Types) 및 마스터 코드를 관리합니다.</p>
      </header>

      <div className="grid gap-6">
        {/* Add New Type */}
        <NewLayoutSection />

        {/* AI & System Keys */}
        <AiConfigSection />

        {/* Community Setup */}
        <CommunitySetupSection />

        {/* Result Type List */}
        <ResultTypeTableSection />
      </div>
    </div>
  );
}
