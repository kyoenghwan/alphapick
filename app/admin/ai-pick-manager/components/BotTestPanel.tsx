"use client";

import { useState, ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, Database, FileJson, CheckCircle2, ChevronRight, ChevronDown, Eye, Info, Calculator, MessageSquare, Bot, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface BotTestPanelProps {
    getApiUrl: (funcName: string) => string;
    gameId: string;
}

export function BotTestPanel({ getApiUrl, gameId }: BotTestPanelProps) {
    const [targetDate, setTargetDate] = useState("20260101");
    const [targetRound, setTargetRound] = useState("1");
    const [selectedBot, setSelectedBot] = useState("BOT_01");

    // Step Results
    const [step1Result, setStep1Result] = useState<any>(null);
    const [step2Result, setStep2Result] = useState<any>(null);
    const [step3Result, setStep3Result] = useState<any>(null);
    const [step4Result, setStep4Result] = useState<any>(null);
    const [step5Result, setStep5Result] = useState<any>(null);

    // States
    const [loadingStep, setLoadingStep] = useState<number | null>(null);
    const [editedPrompt, setEditedPrompt] = useState("");

    const botList = [
        "BOT_01", "BOT_02", "BOT_03", "BOT_04", "BOT_05",
        "BOT_06", "BOT_07", "BOT_08", "BOT_09", "BOT_10",
        "BOT_11", "BOT_12", "BOT_13", "BOT_14", "BOT_15",
        "BOT_16", "BOT_17", "BOT_18", "BOT_19", "BOT_20"
    ];

    const runStep = async (step: number, payload: any) => {
        setLoadingStep(step);
        try {
            const url = getApiUrl("runBotTestStep");
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...payload,
                    step,
                    gameId,
                    date: targetDate,
                    round: targetRound ? parseInt(targetRound) : undefined
                })
            });
            const data = await res.json();

            if (data.success) {
                if (step === 1) setStep1Result(data.result);
                if (step === 2) setStep2Result(data.result);
                if (step === 3) setStep3Result(data.result);
                if (step === 4) {
                    setStep4Result(data.result);
                    setEditedPrompt(data.result.promptText); // Initialize editable prompt
                }
                if (step === 5) setStep5Result(data.result);
            } else {
                alert(`Step ${step} Error: ` + (data.message || data.error));
            }
        } catch (e: any) {
            alert(`Step ${step} Exception: ` + e.message);
        } finally {
            setLoadingStep(null);
        }
    };

    const JsonViewer = ({ data, label }: { data: any, label: string }) => {
        const [isOpen, setIsOpen] = useState(false);
        if (!data) return null;
        return (
            <div className="mt-2 border rounded-md overflow-hidden bg-slate-50 dark:bg-slate-900">
                <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span className="text-xs font-semibold flex items-center gap-2">
                        <FileJson className="w-3 h-3" /> {label}
                    </span>
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
                {isOpen && (
                    <div className="p-3 bg-slate-950 text-slate-50 border-t overflow-auto max-h-60 custom-scrollbar">
                        <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Common Inputs */}
            <Card className="bg-slate-50 dark:bg-slate-900/50">
                <CardContent className="pt-6 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Target Date:</span>
                        <Input
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            placeholder="YYYYMMDD"
                            className="w-32 h-8"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Target Bot:</span>
                        <Select value={selectedBot} onValueChange={setSelectedBot}>
                            <SelectTrigger className="w-40 h-8">
                                <SelectValue placeholder="Select Bot" />
                            </SelectTrigger>
                            <SelectContent>
                                {botList.map(bot => <SelectItem key={bot} value={bot}>{bot}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Target Round:</span>
                        <Input
                            value={targetRound}
                            onChange={(e) => setTargetRound(e.target.value)}
                            placeholder="Optional"
                            className="w-24 h-8"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Model Selection (Static Info) */}
            <Card className="bg-slate-50 dark:bg-slate-900/50">
                <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">AI Model:</span>
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                            <Zap className="w-3 h-3" />
                            Gemini 2.5 Flash
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Step 1: Fetch & Inspect */}
            <Card className={cn(step1Result ? "border-green-500/50" : "")}>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-blue-500" />
                            Step 1: Fetch 30-Day History
                        </div>
                        <Button
                            onClick={() => runStep(1, {})}
                            disabled={!!loadingStep}
                            size="sm"
                            variant={step1Result ? "outline" : "default"}
                        >
                            {loadingStep === 1 && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            {step1Result ? "Re-Fetch" : "Fetch Data"}
                        </Button>
                    </CardTitle>
                </CardHeader>
                {step1Result && (
                    <CardContent className="pb-4 text-sm">
                        <div className="text-green-600 font-medium flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4" /> Data Fetched Successfully
                        </div>
                        <div className="text-slate-500">
                            Saved to: {step1Result.savedPath}
                        </div>
                        {step1Result.logs && (
                            <div className="mt-2 text-xs text-slate-400 bg-slate-950 p-2 rounded">
                                {step1Result.logs.map((l: string, i: number) => <div key={i}>{l}</div>)}
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* Step 2: General Summary */}
            <Card className={cn(!step1Result ? "opacity-50" : "", step2Result ? "border-green-500/50" : "")}>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-orange-500" />
                            Step 2: Generate General Stats
                        </div>
                        <Button
                            onClick={() => runStep(2, { botId: selectedBot })}
                            disabled={!step1Result || !!loadingStep}
                            size="sm"
                            variant={step2Result ? "outline" : "secondary"}
                        >
                            {loadingStep === 2 && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            Analyze General
                        </Button>
                    </CardTitle>
                </CardHeader>
                {step2Result && (
                    <CardContent className="pb-4">
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">
                                Total Rounds: <b>{step2Result.totalDataCount}</b>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded">
                                Date Range: <b>{step2Result.dateRange?.start} ~ {step2Result.dateRange?.end}</b>
                            </div>
                        </div>
                        <JsonViewer data={step2Result} label="View Full Stats JSON" />
                    </CardContent>
                )}
            </Card>

            {/* Step 3: Bot Summary */}
            <Card className={cn(!step2Result ? "opacity-50" : "", step3Result ? "border-green-500/50" : "")}>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-purple-500" />
                            Step 3: Generate Bot ({selectedBot}) Summary
                        </div>
                        <Button
                            onClick={() => runStep(3, { botId: selectedBot })}
                            disabled={!step2Result || !!loadingStep}
                            size="sm"
                            variant={step3Result ? "outline" : "secondary"}
                        >
                            {loadingStep === 3 && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            Run Algo
                        </Button>
                    </CardTitle>
                </CardHeader>
                {step3Result && (
                    <CardContent className="pb-4">
                        <JsonViewer data={step3Result} label={`View ${selectedBot} Algorithm Output`} />
                    </CardContent>
                )}
            </Card>

            {/* Step 4: Prompt Generation */}
            <Card className={cn(!step3Result ? "opacity-50" : "", step4Result ? "border-green-500/50" : "")}>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-yellow-500" />
                            Step 4: Construct AI Prompt
                        </div>
                        <Button
                            onClick={() => runStep(4, { botId: selectedBot })}
                            disabled={!step3Result || !!loadingStep}
                            size="sm"
                            variant={step4Result ? "outline" : "secondary"}
                        >
                            {loadingStep === 4 && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            Build Prompt
                        </Button>
                    </CardTitle>
                </CardHeader>
                {step4Result && (
                    <CardContent className="pb-4">
                        <div className="text-xs font-semibold mb-1">Prompt Preview (Editable for testing):</div>
                        <Textarea
                            value={editedPrompt}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditedPrompt(e.target.value)}
                            className="text-xs font-mono h-40 bg-slate-50 dark:bg-slate-950"
                        />
                    </CardContent>
                )}
            </Card>

            {/* Step 5: Execute AI */}
            <Card className={cn(!step4Result ? "opacity-50" : "", step5Result ? "border-green-500/50" : "")}>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-red-500" />
                            Step 5: Execute AI Prediction
                        </div>
                        <Button
                            onClick={() => runStep(5, { prompt: editedPrompt })}
                            disabled={!step4Result || !!loadingStep}
                            size="sm"
                            variant={step5Result ? "outline" : "destructive"}
                        >
                            {loadingStep === 5 && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            Run Gemini
                        </Button>
                    </CardTitle>
                </CardHeader>
                {step5Result && (
                    <CardContent className="pb-4">
                        <div className="mb-2 p-2 bg-slate-950 text-green-400 font-mono text-sm rounded">
                            Confidence: {step5Result.calculated_confidence}%
                        </div>
                        <div className="max-h-60 overflow-auto bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs whitespace-pre-wrap">
                            {step5Result.parsedResult?.reason || step5Result.rawResponse}
                        </div>
                        <JsonViewer data={step5Result} label="View AI Raw Output" />
                    </CardContent>
                )}
            </Card>

            <div className="border-t my-4 py-4">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Parallel Execution Test (Batch)
                </h3>
                <ParallelTestPanel getApiUrl={getApiUrl} gameId={gameId} targetDate={targetDate} round={targetRound} />
            </div>
        </div>
    );
}

interface ParallelTestPanelProps {
    getApiUrl: (funcName: string) => string;
    gameId: string;
    targetDate: string;
    round: string;
}

function ParallelTestPanel({ getApiUrl, gameId, targetDate, round }: ParallelTestPanelProps) {
    const [group, setGroup] = useState("ST");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Date Range State (Default to targetDate)
    const [batchStartDate, setBatchStartDate] = useState(targetDate);
    const [batchEndDate, setBatchEndDate] = useState(targetDate);

    // Sync with parent targetDate if needed (optional, but good for UX)
    // useEffect(() => { setBatchStartDate(targetDate); setBatchEndDate(targetDate); }, [targetDate]);

    const runBatch = async () => {
        setLoading(true);
        setResult(null);
        try {
            const url = getApiUrl("runBatchTest");
            const isRange = batchStartDate !== batchEndDate;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    gameId,
                    date: targetDate, // Single Date (Legacy support / Fallback)
                    startDate: batchStartDate, // New: Range Start
                    endDate: batchEndDate,     // New: Range End
                    // If running a Range Sim, force round 0 (Full Simulation Loop). 
                    // Otherwise respect the round input for specific round debugging.
                    round: isRange ? 0 : (round ? parseInt(round) : 0),
                    group
                })
            });
            const data = await res.json();
            if (data.success) {
                setResult(data);
            } else {
                alert("Batch Error: " + data.error);
            }
        } catch (e: any) {
            alert("Batch Exception: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-slate-50 dark:bg-slate-900/50 border-blue-500/30">
            <CardContent className="pt-6">
                <div className="space-y-4 mb-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">Range:</span>
                            <Input
                                value={batchStartDate}
                                onChange={(e) => setBatchStartDate(e.target.value)}
                                placeholder="YYYYMMDD"
                                className="w-24 h-8 text-xs"
                            />
                            <span className="text-xs text-slate-400">~</span>
                            <Input
                                value={batchEndDate}
                                onChange={(e) => setBatchEndDate(e.target.value)}
                                placeholder="YYYYMMDD"
                                className="w-24 h-8 text-xs"
                            />
                        </div>

                        <Select value={group} onValueChange={setGroup}>
                            <SelectTrigger className="w-48 h-8 text-xs">
                                <SelectValue placeholder="Select Group" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ST">Short-Term (Bots 01-05)</SelectItem>
                                <SelectItem value="MT">Mid-Term (Bots 06-10)</SelectItem>
                                <SelectItem value="LT">Long-Term (Bots 11-15)</SelectItem>
                                <SelectItem value="LOCAL_15">All Local Bots (Bots 01-15)</SelectItem>
                                <SelectItem value="ALL_20">All Bots (Bots 01-20)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button onClick={runBatch} disabled={loading} className="w-32 h-8 text-xs" size="sm">
                            {loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                            {/* If Range is different, it's a Range Sim (which forces round 0) */}
                            {batchStartDate !== batchEndDate ? "Run Range Sim" :
                                (round === "0" || round === "" ? "Run Full Sim" : "Run Single")
                            }
                        </Button>
                    </div>
                    {(batchStartDate !== batchEndDate) && (
                        <div className="text-[10px] text-blue-500">
                            * Running batch test across multiple days ({batchStartDate} ~ {batchEndDate})
                        </div>
                    )}
                </div>

                {result && result.type === "SINGLE_ROUND" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                            <div className="text-sm font-semibold text-green-600">
                                Execution Time:
                            </div>
                            <div className="text-2xl font-mono font-bold text-green-500">
                                {(result.durationMs / 1000).toFixed(2)}s
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {result.results.map((r: any) => {
                                const startTime = r.timings ? new Date(r.timings.start).toLocaleTimeString() : "-";
                                const duration = r.executionTime ? (typeof r.executionTime === 'number' ? (r.executionTime / 1000).toFixed(2) + 's' : r.executionTime) : "-";

                                return (
                                    <div key={r.botId} className={cn("p-3 rounded border text-xs", r.success ? "bg-white dark:bg-slate-950" : "bg-red-50 dark:bg-red-900/20 border-red-500")}>
                                        <div className="font-bold mb-1 flex justify-between">
                                            <span>{r.botId}</span>
                                            <span className={cn(r.confidence >= 80 ? "text-green-500" : "text-slate-500")}>
                                                {r.confidence}%
                                            </span>
                                        </div>
                                        <div className="font-mono text-lg font-black mb-1">{r.prediction}</div>
                                        <div className="text-[10px] text-blue-500 font-mono mb-2">
                                            Duration: {duration}
                                        </div>
                                        <div className="text-slate-500 line-clamp-2 h-8" title={r.reason}>
                                            {r.reason}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {result && result.type === "FULL_SIMULATION" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                            <div>
                                <div className="text-sm font-semibold text-blue-600">Simulation Report</div>
                                <div className="text-xs text-slate-400">Total Rounds: {result.totalRoundsProcessed}</div>
                            </div>
                            <div className="text-2xl font-mono font-bold text-blue-500">
                                {(result.durationMs / 1000).toFixed(2)}s
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="text-slate-500 bg-slate-100 dark:bg-slate-900 font-medium">
                                    <tr>
                                        <th className="p-2">Bot ID</th>
                                        <th className="p-2">Win Rate</th>
                                        <th className="p-2">Total Trades</th>
                                        <th className="p-2 text-green-600">Win</th>
                                        <th className="p-2 text-red-600">Loss</th>
                                        <th className="p-2">Streak (Cur/MaxW/MaxL)</th>
                                        <th className="p-2">Recent (20)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {Object.entries(result.stats).map(([botId, stats]: [string, any]) => (
                                        <tr key={botId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-2 font-bold">{botId}</td>
                                            <td className={cn("p-2 font-bold", stats.winRate >= 50 ? "text-green-600" : "text-red-500")}>
                                                {stats.winRate}%
                                            </td>
                                            <td className="p-2">{stats.total}</td>
                                            <td className="p-2 text-green-600">{stats.win}</td>
                                            <td className="p-2 text-red-500">{stats.loss}</td>
                                            <td className="p-2 font-mono">
                                                <span className={cn(stats.currentStreak > 0 ? "text-green-500" : "text-red-500")}>
                                                    {stats.currentStreak > 0 ? `+${stats.currentStreak}` : stats.currentStreak}
                                                </span>
                                                <span className="text-slate-300 mx-1">|</span>
                                                <span className="text-green-700">+{stats.maxWinStreak}</span>
                                                <span className="text-slate-300 mx-1">/</span>
                                                <span className="text-red-700">-{stats.maxLossStreak}</span>
                                            </td>
                                            <td className="p-2 flex gap-0.5 items-center mt-1">
                                                {stats.history.slice(-20).map((h: number, i: number) => (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "w-1.5 h-3 rounded-sm",
                                                            h === 1 ? "bg-green-500" : h === -1 ? "bg-red-500" : "bg-slate-300"
                                                        )}
                                                    />
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
