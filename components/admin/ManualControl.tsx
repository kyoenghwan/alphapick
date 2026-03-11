"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Edit, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { format } from "date-fns";

interface ManualControlProps {
  onRefresh?: () => void;
}

/**
 * 어드민 대시보드에서 게임 회차 결과를 수동으로 제어하는 컴포넌트입니다.
 */
export function ManualControl({ onRefresh }: ManualControlProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [round, setRound] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // [회차 결과 수동 수정 로직]
  const handleEditRound = async () => {
    if (!round || !result) {
      alert("회차와 결과를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const today = new Date();
      const year = today.getFullYear().toString();
      const dateStr = format(today, "yyyyMMdd");
      const gameCode = "bubble_ladder"; // 기본값
      const roundStr = String(parseInt(round)).padStart(3, "0");

      // 수정할 문서의 참조를 가져옵니다.
      const roundRef = doc(
        db,
        `games/${year}_${gameCode}/result/${dateStr}/rounds/${roundStr}`
      );

      // Firestore의 필드를 직접 업데이트합니다.
      await updateDoc(roundRef, {
        result: result,
        resultOriginal: result,
        updatedAt: new Date(),
      });

      alert("수정 완료!");
      setIsEditModalOpen(false);
      setRound("");
      setResult("");
      onRefresh?.(); // 성공 후 부모 컴포넌트의 데이터를 새로고침합니다.
    } catch (error: any) {
      console.error("수정 실패:", error);
      alert(`수정 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // [AI 분석 재실행 로직 - 향후 구현]
  const handleRetryAnalysis = async () => {
    if (!confirm("AI 분석을 다시 실행하시겠습니까?")) return;

    setIsLoading(true);
    try {
      // TODO: 결과를 바탕으로 예측 성공 여부 등을 다시 계산하는 로직이 필요합니다.
      alert("AI 분석 재실행 기능은 추후 구현 예정입니다.");
    } catch (error: any) {
      console.error("재실행 실패:", error);
      alert(`재실행 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-4">
      {/* 결과 수정 버튼 */}
      <Button
        onClick={() => setIsEditModalOpen(true)}
        variant="outline"
        disabled={isLoading}
      >
        <Edit className="mr-2 h-4 w-4" />
        회차 결과 수정
      </Button>

      {/* 분석 재실행 버튼 */}
      <Button
        onClick={handleRetryAnalysis}
        variant="outline"
        disabled={isLoading}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        AI 분석 재실행
      </Button>

      {/* 회차 수정 모달 (Dialog) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent onClose={() => setIsEditModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>회차 결과 수정</DialogTitle>
            <DialogDescription>
              특정 회차의 결과를 직접 입력하거나 수정할 수 있습니다. (예: R4O)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="mb-2 block text-sm font-medium">회차 실별</label>
              <Input
                type="number"
                placeholder="예: 1"
                value={round}
                onChange={(e) => setRound(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">결과 코드 (Converted)</label>
              <Input
                placeholder="예: R4O (우4홀)"
                value={result}
                onChange={(e) => setResult(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isLoading}
              >
                취소
              </Button>
              <Button onClick={handleEditRound} disabled={isLoading}>
                {isLoading ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

