"use client";

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
import { format } from "date-fns";

interface RoundData {
  round: number;
  result: string | null;
  predicted_pick: string | null;
  is_hit: boolean | null;
  model_used: string | null;
  updatedAt: any;
}

interface RecentRoundsProps {
  rounds: RoundData[];
}

export function RecentRounds({ rounds }: RecentRoundsProps) {
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, "HH:mm:ss");
    } catch {
      return "-";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 회차 리스트</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>회차</TableHead>
              <TableHead>AI픽</TableHead>
              <TableHead>결과</TableHead>
              <TableHead>적중여부</TableHead>
              <TableHead>사용모델</TableHead>
              <TableHead>수집시간</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rounds.length > 0 ? (
              rounds.map((round) => (
                <TableRow key={round.round}>
                  <TableCell className="font-medium">{round.round}</TableCell>
                  <TableCell>{round.predicted_pick || "-"}</TableCell>
                  <TableCell>{round.result || "-"}</TableCell>
                  <TableCell>
                    {round.is_hit === null ? (
                      <Badge variant="outline">대기</Badge>
                    ) : round.is_hit ? (
                      <Badge variant="success">적중</Badge>
                    ) : (
                      <Badge variant="destructive">미적중</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {round.model_used ? (
                      <Badge variant="secondary">
                        {round.model_used === "flash" ? "Flash" : "Pro"}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{formatTimestamp(round.updatedAt)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  데이터가 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

