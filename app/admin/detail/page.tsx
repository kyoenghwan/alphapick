"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Search, Download, AlertCircle } from "lucide-react";

interface GameCategory {
  id: string;
  name: string;
  gameCode: string;
  totalRounds: number;
}

interface RoundData {
  round: number;
  result: string | null;
  resultOriginal: string | null;
  predicted_pick: string | null;
  is_hit: boolean | null;
  model_used: string | null;
  current_loss_streak: number;
  updatedAt: any;
  createdAt: any;
}

export default function DetailPage() {
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("");
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 게임 카테고리 목록 가져오기
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "categories"), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GameCategory));
      setCategories(cats);
      if (cats.length > 0 && !selectedGame) {
        setSelectedGame(cats[0].gameCode);
      }
    });
    return () => unsubscribe();
  }, []);

  // [상세 조회 로직]
  const fetchRounds = async () => {
    if (!selectedDate || !selectedGame) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const dateStr = selectedDate.replace(/-/g, ""); // YYYY-MM-DD -> YYYYMMDD
      const year = dateStr.substring(0, 4);
      const gameInfo = categories.find(c => c.gameCode === selectedGame);
      const maxRounds = gameInfo?.totalRounds || 480;

      // 수정된 경로: games/${year}_${gameCode}/result/${dateStr}/rounds
      const roundsRef = collection(
        db,
        `games/${year}_${selectedGame}/result/${dateStr}/rounds`
      );

      const q = query(roundsRef, orderBy("round", "asc"));
      const snapshot = await getDocs(q);

      const dbDataMap = new Map();
      snapshot.forEach((doc) => {
        dbDataMap.set(doc.id, doc.data());
      });

      // 1번부터 최대 회차까지 빈 데이터 포함하여 생성
      const fullRounds: RoundData[] = [];
      for (let i = 1; i <= maxRounds; i++) {
        const roundStr = String(i).padStart(3, "0");
        if (dbDataMap.has(roundStr)) {
          fullRounds.push(dbDataMap.get(roundStr) as RoundData);
        } else {
          // 데이터가 없는 경우 기본값 생성
          fullRounds.push({
            round: i,
            result: null,
            resultOriginal: null,
            predicted_pick: null,
            is_hit: null,
            model_used: null,
            current_loss_streak: 0,
            updatedAt: null,
            createdAt: null,
          });
        }
      }

      setRounds(fullRounds);
    } catch (error: any) {
      console.error("데이터 조회 실패:", error);
      alert(`데이터 조회 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadJson = () => {
    const dataStr = JSON.stringify(rounds, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `alphapick_${selectedGame}_${selectedDate}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, "yyyy-MM-dd HH:mm:ss");
    } catch {
      return "-";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr.replace(/-/g, "/"));
      return format(date, "yyyy년 MM월 dd일");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">결과 조회</h1>
          <p className="text-muted-foreground">
            게임과 날짜를 선택하여 모든 회차 데이터를 조회하고 누락 여부를 확인합니다.
          </p>
        </div>
        {hasSearched && rounds.length > 0 && (
          <Button variant="outline" onClick={handleDownloadJson} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            JSON 다운로드
          </Button>
        )}
      </div>

      {/* 조회 조건 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            조회 조건
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-2 block text-sm font-medium">대상 게임</label>
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.gameCode}>
                    {cat.name} ({cat.gameCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="mb-2 block text-sm font-medium">날짜</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <Button onClick={fetchRounds} disabled={isLoading} className="w-full md:w-auto">
              <Search className="mr-2 h-4 w-4" />
              {isLoading ? "조회 중..." : "조회하기"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 조회 결과 */}
      {hasSearched && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>
              {formatDate(selectedDate)} - {categories.find(c => c.gameCode === selectedGame)?.name}
            </CardTitle>
            <div className="text-sm font-medium text-muted-foreground">
              총 {rounds.length}개 회차 (데이터 있음: {rounds.filter(r => r.result).length})
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-20 flex-col gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div className="text-muted-foreground">데이터를 불러오는 중입니다...</div>
              </div>
            ) : rounds.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">회차</TableHead>
                      <TableHead>결과</TableHead>
                      <TableHead>원본데이터</TableHead>
                      <TableHead>AI 픽</TableHead>
                      <TableHead>적중여부</TableHead>
                      <TableHead>연패상태</TableHead>
                      <TableHead>업데이트 시간</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rounds.map((round) => (
                      <TableRow key={round.round} className={!round.result ? "bg-red-50" : ""}>
                        <TableCell className="font-bold">{round.round}</TableCell>
                        <TableCell>
                          {round.result ? (
                            <span className="font-mono font-bold">{round.result}</span>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600 font-bold">
                              <AlertCircle className="h-3 w-3" />
                              데이터 누락
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {round.resultOriginal || "-"}
                        </TableCell>
                        <TableCell>{round.predicted_pick || "-"}</TableCell>
                        <TableCell>
                          {round.is_hit === null ? (
                            "-"
                          ) : round.is_hit ? (
                            <Badge className="bg-green-500 hover:bg-green-600">WIN</Badge>
                          ) : (
                            <Badge variant="destructive">LOSE</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {round.current_loss_streak > 0 ? (
                            <span className="text-red-500 font-bold underline">
                              {round.current_loss_streak}연패
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTimestamp(round.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Search className="h-10 w-10 mb-4 opacity-20" />
                선택한 조건에 해당하는 결과가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
