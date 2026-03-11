"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database, Loader2, RefreshCw, RotateCcw, LayoutGrid } from "lucide-react";
import { format, eachDayOfInterval, parse } from "date-fns";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";

interface MigrationStatus {
  status: "idle" | "checking" | "migrating" | "success" | "error";
  message: string;
  progress?: number;
}

interface DateCountInfo {
  date: string;
  dateStr: string;
  count: number;
  isComplete: boolean;
}

interface Category {
  id: string;
  name: string;
  gameCode: string;
}

export default function MigrationPage() {
  const [fromDate, setFromDate] = useState(""); // Changed initial state
  const [toDate, setToDate] = useState(""); // Changed initial state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedGameCode, setSelectedGameCode] = useState("");
  const [dateCounts, setDateCounts] = useState<DateCountInfo[]>([]);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    status: "idle",
    message: "",
  });
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // 브라우저 화면 보기 옵션 (Headless 모드 끄기)
  const [showBrowser, setShowBrowser] = useState(false);

  // 게임 카테고리 목록 가져오기
  useEffect(() => {
    // isActive 필터와 orderBy를 같이 쓰면 색인(Index)이 필요하므로, 여기서는 전체를 가져와서 메모리에서 필터링합니다.
    const q = query(collection(db, "categories"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs
        .map(doc => ({
          id: doc.id,
          name: doc.data().name,
          gameCode: doc.data().gameCode,
          isActive: doc.data().isActive
        } as any))
        .filter(cat => cat.isActive === true);

      setCategories(cats);
      // 기본값 설정 (보글사다리 우선)
      if (cats.length > 0 && !selectedGameCode) {
        const defaultCat = cats.find(c => c.gameCode === "bubble_ladder") || cats[0];
        setSelectedGameCode(defaultCat.gameCode);
      }
    });
    return () => unsubscribe();
  }, [selectedGameCode]);

  // [일자별 COUNT 조회 로직]
  // 선택된 날짜 범위의 문서들을 확인하여 수집된 총 게임 수를 가져옵니다.
  const fetchDateCounts = async (showError = true) => {
    if (!fromDate || !toDate || !selectedGameCode) {
      if (showError && !selectedGameCode) alert("게임을 선택해주세요.");
      return;
    }

    setIsLoadingCounts(true);
    try {
      const startDate = parse(fromDate, "yyyy-MM-dd", new Date());
      const endDate = parse(toDate, "yyyy-MM-dd", new Date());
      const dates = eachDayOfInterval({ start: startDate, end: endDate });

      const counts: DateCountInfo[] = [];

      console.log("FETCH DEBUG: Project ID:", db.app.options.projectId);

      for (const date of dates) {
        const dateStr = format(date, "yyyyMMdd");
        const year = dateStr.substring(0, 4);
        // 변경된 경로: games/{year}_{gameCode}/counts/{dateStr}
        const docId = `${year}_${selectedGameCode}`;
        const countRef = doc(db, "games", docId, "counts", dateStr);
        console.log(`FETCH DEBUG: Reading path ${countRef.path}`);
        const countDoc = await getDoc(countRef);
        console.log(`FETCH DEBUG: Doc ${dateStr} exists?`, countDoc.exists(), "Data:", countDoc.data());

        const totalCollected = countDoc.exists()
          ? countDoc.data()?.total_collected || 0
          : 0;

        counts.push({
          date: format(date, "yyyy-MM-dd"),
          dateStr,
          count: totalCollected,
          // 480회차 이상(하루 치 전체)이면 완료된 것으로 간주합니다.
          isComplete: totalCollected >= 480,
        });
      }

      setDateCounts(counts);
    } catch (error: any) {
      console.error("COUNT 조회 실패:", error);
      // showError가 true일 때만 alert 표시 (COUNT 조회 버튼 클릭 시)
      if (showError) {
        alert(`COUNT 조회 실패: ${error.message}`);
      }
    } finally {
      setIsLoadingCounts(false);
    }
  };

  // useEffect 제거 - 버튼 클릭 시에만 조회

  // [마이그레이션 실행 로직]
  // 선택된 날짜 범위에 대해 순차적으로 마이그레이션 API를 호출합니다.
  const startMigration = async () => {
    console.log("마이그레이션 시작 버튼 클릭");

    if (!fromDate || !toDate) {
      alert("날짜 범위를 선택해주세요.");
      return;
    }

    const startDate = parse(fromDate, "yyyy-MM-dd", new Date());
    const endDate = parse(toDate, "yyyy-MM-dd", new Date());

    if (startDate > endDate) {
      alert("시작 날짜가 종료 날짜보다 늦을 수 없습니다.");
      return;
    }

    // COUNT 조회를 하지 않았거나 데이터가 없으면 확인 없이 진행
    // COUNT 조회를 했고 모든 날짜가 완료 상태(480개)일 때만 확인 메시지 표시
    if (dateCounts.length > 0 && incompleteDates.length === 0) {
      const confirm = window.confirm(
        "모든 날짜가 완료 상태입니다. 그래도 마이그레이션을 실행하시겠습니까?"
      );
      if (!confirm) return;
    }

    setMigrationStatus({
      status: "migrating",
      message: "마이그레이션 시작...",
      progress: 0,
    });

    try {
      const dates = eachDayOfInterval({ start: startDate, end: endDate });
      const totalDates = dates.length;
      let completedDates = 0;
      let totalCollected = 0;

      // API 라우트를 통해 마이그레이션 실행 (CORS 문제 해결을 위해 백엔드 프록시 역할 수행)
      const functionUrl = "/api/migrate";

      console.log("마이그레이션 URL:", functionUrl);
      console.log("마이그레이션할 날짜 수:", totalDates);

      // 모든 날짜를 마이그레이션 시도 (Cloud Function 내부에서 예외 처리됨)
      const datesToMigrate = dates;

      console.log("실제 마이그레이션할 날짜 수:", datesToMigrate.length);

      for (const date of datesToMigrate) {
        const dateStr = format(date, "yyyyMMdd");

        setMigrationStatus({
          status: "migrating",
          message: `${format(date, "yyyy-MM-dd")} 마이그레이션 중... (${completedDates + 1}/${datesToMigrate.length})`,
          progress: Math.round((completedDates / datesToMigrate.length) * 100),
        });

        try {
          console.log(`마이그레이션 요청: ${dateStr} (${selectedGameCode})`);
          const response = await fetch(functionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              date: dateStr,
              gameCode: selectedGameCode,
              runHeadless: !showBrowser,
            }),
          });

          console.log(`마이그레이션 응답: ${dateStr}`, response.status);

          if (response.ok) {
            const result = await response.json();
            console.log(`마이그레이션 결과: ${dateStr}`, result);
            totalCollected += result.collected || 0;
          } else {
            // 에러 응답 처리
            const errorText = await response.text().catch(() => "알 수 없는 오류");
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch {
              // HTML 응답이거나 JSON이 아닌 경우
              if (errorText.includes('<html>') || errorText.includes('<!DOCTYPE')) {
                errorData = {
                  error: "Cloud Function 배포 필요",
                  message: "Cloud Function이 배포되지 않았습니다. Firebase Functions를 배포해주세요."
                };
              } else {
                errorData = {
                  error: "알 수 없는 오류",
                  message: errorText || `HTTP ${response.status}: ${response.statusText}`
                };
              }
            }
            console.error(`마이그레이션 실패: ${dateStr}`, errorData);

            setMigrationStatus({
              status: "migrating",
              message: `${format(date, "yyyy-MM-dd")} 마이그레이션 실패: ${errorData.message || errorData.error || "알 수 없는 오류"}`,
              progress: Math.round((completedDates / datesToMigrate.length) * 100),
            });
          }
        } catch (error: any) {
          console.error(`${dateStr} 마이그레이션 실패:`, error);
          const errorMessage = error.message || error.toString() || "알 수 없는 오류";
          setMigrationStatus({
            status: "migrating",
            message: `${format(date, "yyyy-MM-dd")} 마이그레이션 실패: ${errorMessage}`,
            progress: Math.round((completedDates / datesToMigrate.length) * 100),
          });
        }

        completedDates++;
      }

      setMigrationStatus({
        status: "success",
        message: `마이그레이션이 완료되었습니다. 총 ${totalCollected}개 회차가 수집되었습니다.`,
        progress: 100,
      });

      // COUNT 다시 조회 (에러 메시지 표시 안 함)
      await fetchDateCounts(false);
    } catch (error: any) {
      console.error("마이그레이션 오류:", error);

      setMigrationStatus({
        status: "error",
        message: `마이그레이션 실패: ${error.message}`,
      });
    }
  };

  const incompleteDates = dateCounts.filter((d) => !d.isComplete);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">데이터 마이그레이션</h1>
        <p className="text-muted-foreground">
          과거 날짜 범위의 데이터를 수집하여 Firestore에 저장합니다. 일자별 COUNT를
          확인하고 480개 미만인 날짜를 마이그레이션할 수 있습니다.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            마이그레이션 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-2">
              <label htmlFor="game-select" className="text-sm font-medium leading-none flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
                분석 게임 선택
              </label>
              <select
                id="game-select"
                value={selectedGameCode}
                onChange={(e) => {
                  setSelectedGameCode(e.target.value);
                  setDateCounts([]); // 게임 변경 시 기존 카운트 초기화
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.gameCode}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 items-end">
              <div className="grid gap-2 flex-1">
                <label htmlFor="from-date" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  시작 날짜 (FROM)
                </label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2 flex-1">
                <label htmlFor="to-date" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  종료 날짜 (TO)
                </label>
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-4">
              <input
                type="checkbox"
                id="show-browser"
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={showBrowser}
                onChange={(e) => setShowBrowser(e.target.checked)}
              />
              <label htmlFor="show-browser" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                브라우저 화면 보기 (로컬 동작 확인용)
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fetchDateCounts(true)}
                disabled={isLoadingCounts}
              >
                {isLoadingCounts ? (
                  <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                COUNT 조회
              </Button>
              <Button
                onClick={startMigration}
                disabled={
                  migrationStatus.status === "migrating" ||
                  isLoadingCounts
                }
                className="flex-1"
              >
                {migrationStatus.status === "migrating" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    마이그레이션 중...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    마이그레이션 시작 ({incompleteDates.length}개 날짜)
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {dateCounts.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>일자별 COUNT 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>COUNT</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dateCounts.map((item) => (
                    <TableRow key={item.dateStr}>
                      <TableCell className="font-medium">{item.date}</TableCell>
                      <TableCell>{item.count} / 480</TableCell>
                      <TableCell>
                        {item.isComplete ? (
                          <Badge variant="success">완료</Badge>
                        ) : (
                          <Badge variant="destructive">
                            미완료 ({480 - item.count}개 부족)
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              총 {dateCounts.length}개 날짜 중{" "}
              <span className="font-semibold text-destructive">
                {incompleteDates.length}개
              </span>
              가 미완료 상태입니다.
            </div>
          </CardContent>
        </Card>
      )}

      {migrationStatus.status !== "idle" && (
        <Card>
          <CardHeader>
            <CardTitle>마이그레이션 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={migrationStatus.status} />
                <span className="text-sm">{migrationStatus.message}</span>
              </div>
              {migrationStatus.progress !== undefined && (
                <div className="mt-4">
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${migrationStatus.progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground text-center">
                    {migrationStatus.progress}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>마이그레이션 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              날짜 범위를 선택하면 자동으로 일자별 COUNT를 조회합니다.
            </li>
            <li>
              COUNT가 480개 미만인 날짜만 마이그레이션이 실행됩니다.
            </li>
            <li>
              마이그레이션은 bepick.net 사이트에서 해당 날짜의 모든 회차 데이터를
              수집합니다.
            </li>
            <li>
              수집된 데이터는 Firestore의 games/`{`{year}_{gameCode}`}`/result/
              `{`{YYYYMMDD}`}`/rounds 경로에 저장됩니다.
            </li>
            <li>
              마이그레이션은 시간이 걸릴 수 있습니다. 진행 중에는 페이지를
              닫지 마세요.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: MigrationStatus["status"] }) {
  const variants = {
    idle: "outline",
    checking: "secondary",
    migrating: "secondary",
    success: "success",
    error: "destructive",
  } as const;

  const labels = {
    idle: "대기",
    checking: "확인 중",
    migrating: "마이그레이션 중",
    success: "완료",
    error: "오류",
  };

  return (
    <Badge variant={variants[status] || "outline"}>{labels[status]}</Badge>
  );
}
