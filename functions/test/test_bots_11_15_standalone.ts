
// Mock Interfaces (same as before)
interface IPipelineSummary { botId: string; layer1_macro: any; layer2_rolling: { summary_text: string }; layer3_raw: string[]; }
interface IBotSummaryGenerator { generate(allRounds: string[]): IPipelineSummary; }

// --- PASTE BOT CLASSES (Simplified/Copied) ---

// [BOT_11] LLN
class Gen_BOT11_LLN implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_11";
        const RAW_WINDOW = 50;
        const rawData = allRounds.slice(-RAW_WINDOW);
        const calcLLN = (seq: string[], checker: (s: string) => boolean) => {
            const count = seq.filter(checker).length;
            const rate = count / seq.length;
            const diff = 0.5 - rate;
            return {
                rate: (rate * 100).toFixed(2),
                diff: (diff * 100).toFixed(2),
                force: Math.abs(diff) > 0.05 ? (diff > 0 ? "Strong Push Up" : "Strong Pull Down") : "Balanced"
            };
        };
        const llnD = calcLLN(allRounds, r => r.includes('L'));
        const llnL = calcLLN(allRounds, r => r.includes('3'));
        const llnO = calcLLN(allRounds, r => r.includes('O'));
        const summaryText = `Law of Large Numbers (Total ${allRounds.length} Rounds):
[Direction L (Target 50%)]
- Actual: ${llnD.rate}% (Diff: ${llnD.diff}%)
- Force: ${llnD.force}

[Line 3 (Target 50%)]
- Actual: ${llnL.rate}% (Diff: ${llnL.diff}%)
- Force: ${llnL.force}

[Odd/Even Odd (Target 50%)]
- Actual: ${llnO.rate}% (Diff: ${llnO.diff}%)
- Force: ${llnO.force}

Focus: Long-term convergence towards 50.0%. Large deviations imply strong corrective force.`;
        return { botId: BOT_ID, layer1_macro: {}, layer2_rolling: { summary_text: summaryText }, layer3_raw: rawData } as any;
    }
}

// [BOT_12] Z-Score Macro
class Gen_BOT12_ZScoreMacro implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_12";
        const RAW_WINDOW = 50;
        const rawData = allRounds.slice(-RAW_WINDOW);
        const calcZMacro = (all: string[], checker: (s: string) => boolean) => {
            const recentWin = 480;
            const recentData = all.slice(-recentWin);
            const n = recentData.length;
            if (n < 50) return { z: "0", status: "Insufficient Data" };
            const count = recentData.filter(checker).length;
            const p = 0.5;
            const mean = n * p;
            const sigma = Math.sqrt(n * p * (1 - p));
            const z = (count - mean) / sigma;
            let status = "Balanced";
            if (z > 1.96) status = "Over-extended (High)";
            else if (z < -1.96) status = "Over-extended (Low)";
            return { z: z.toFixed(2), status };
        };
        const zmD = calcZMacro(allRounds, r => r.includes('L'));
        const zmL = calcZMacro(allRounds, r => r.includes('3'));
        const zmO = calcZMacro(allRounds, r => r.includes('O'));
        const summaryText = `Z-Score Macro Analysis (30-Day Data):
[Direction L/R]
- Z-Score: ${zmD.z} -> ${zmD.status}

[Line 3/4]
- Z-Score: ${zmL.z} -> ${zmL.status}

[Odd/Even O/E]
- Z-Score: ${zmO.z} -> ${zmO.status}

Focus: Statistical abnormalities on a massive scale (Law of Large Numbers Extreme).`;
        return { botId: BOT_ID, layer1_macro: {}, layer2_rolling: { summary_text: summaryText }, layer3_raw: rawData } as any;
    }
}

// [BOT_13] Regression
class Gen_BOT13_Regression implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_13";
        const ROLLING_WINDOW = 720;
        const RAW_WINDOW = 50;
        const rollingData = allRounds.slice(-ROLLING_WINDOW);
        const rawData = allRounds.slice(-RAW_WINDOW);
        const findSimChunk = (rolling: string[], all: string[], checker: (s: string) => number, label: string) => {
            const target = rolling.map(checker);
            const tLen = target.length;
            let bestDiff = 999;
            let bestNext = 0.5;
            const scanStep = 20; // Reduced for speed in test
            for (let i = 0; i < all.length - tLen - 1; i += scanStep) {
                const chunk = all.slice(i, i + tLen).map(checker);
                const tMean = target.reduce((a, b) => a + b, 0); // Logic simplified
                const cMean = chunk.reduce((a, b) => a + b, 0);
                if (Math.abs(tMean - cMean) < bestDiff) {
                    bestDiff = Math.abs(tMean - cMean);
                    bestNext = checker(all[i + tLen]);
                }
            }
            return { diff: bestDiff.toFixed(1), pred: bestNext === 1 ? label : "Opposite" };
        };
        const regD = findSimChunk(rollingData, allRounds, r => r.includes('L') ? 1 : 0, 'L');
        const regL = findSimChunk(rollingData, allRounds, r => r.includes('3') ? 1 : 0, '3');
        const regO = findSimChunk(rollingData, allRounds, r => r.includes('O') ? 1 : 0, 'Odd');
        const summaryText = `Regression/Similarity Pattern (Chunk Matching):
[Direction L/R]
- Best Match Diff: ${regD.diff}
- Predicted Next: ${regD.pred}

[Line 3/4]
- Best Match Diff: ${regL.diff}
- Predicted Next: ${regL.pred}

[Odd/Even O/E]
- Best Match Diff: ${regO.diff}
- Predicted Next: ${regO.pred}

Focus: Using long-term history to find the 'closest' historical scenario and its outcome.`;
        return { botId: BOT_ID, layer1_macro: {}, layer2_rolling: { summary_text: summaryText }, layer3_raw: rawData } as any;
    }
}

// [BOT_14] Giant Cycle
class Gen_BOT14_GiantCycle implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_14";
        const RAW_WINDOW = 50;
        const rawData = allRounds.slice(-RAW_WINDOW);
        const checkCyclePosition = (all: string[], checker: (s: string) => boolean) => {
            if (all.length < 100) return { phase: "Insufficient Data", val: "0", base: "0" };
            const calcMA = (period: number) => {
                const slice = all.slice(-period);
                return slice.filter(checker).length / slice.length;
            };
            const maS = calcMA(100);
            const maL = calcMA(500);
            let phase = "Neutral";
            if (maS > maL + 0.02) phase = "Expansion Phase (Bull)";
            else if (maS < maL - 0.02) phase = "Contraction Phase (Bear)";
            return { phase, val: maS.toFixed(2), base: maL.toFixed(2) };
        };
        const cycD = checkCyclePosition(allRounds, r => r.includes('L'));
        const cycL = checkCyclePosition(allRounds, r => r.includes('3'));
        const cycO = checkCyclePosition(allRounds, r => r.includes('O'));
        const summaryText = `Giant Cycle Analysis (Global Trend):
[Direction L/R]
- Phase: ${cycD.phase} (MA100=${cycD.val} vs MA500=${cycD.base})

[Line 3/4]
- Phase: ${cycL.phase} (MA100=${cycL.val} vs MA500=${cycL.base})

[Odd/Even O/E]
- Phase: ${cycO.phase} (MA100=${cycO.val} vs MA500=${cycO.base})

Focus: Identifying major multi-day trends (Expansion vs Contraction).`;
        return { botId: BOT_ID, layer1_macro: {}, layer2_rolling: { summary_text: summaryText }, layer3_raw: rawData } as any;
    }
}

// [BOT_15] Rare Pattern
class Gen_BOT15_RarePattern implements IBotSummaryGenerator {
    generate(allRounds: string[]): IPipelineSummary {
        const BOT_ID = "BOT_15";
        const RAW_WINDOW = 50;
        const rawData = allRounds.slice(-RAW_WINDOW);
        const checkRare = (seq: string[], checker: (s: string) => boolean) => {
            let maxStr = 0;
            let curStr = 0;
            let lastVal = false;
            for (const item of seq) {
                const val = checker(item);
                if (val === lastVal) curStr++;
                else { if (curStr > maxStr) maxStr = curStr; curStr = 1; lastVal = val; }
            }
            if (curStr > maxStr) maxStr = curStr;

            let currentRun = 0;
            if (seq.length > 0) {
                const last = checker(seq[seq.length - 1]);
                for (let i = seq.length - 1; i >= 0; i--) {
                    if (checker(seq[i]) === last) currentRun++; else break;
                }
            }
            const isRare = currentRun >= 7;
            const warning = isRare ? `CRITICAL WARNING: Rare Streak (${currentRun}) Detected!` : "No rare patterns.";
            return { maxStr, curStr: currentRun, warning };
        };

        const rareD = checkRare(allRounds, r => r.includes('L'));
        const rareL = checkRare(allRounds, r => r.includes('3'));
        const rareO = checkRare(allRounds, r => r.includes('O'));

        const summaryText = `Rare Pattern Detector (Alert System):
[Direction L/R]
- Max Streak Found: ${rareD.maxStr}
- Status: ${rareD.warning}

[Line 3/4]
- Max Streak Found: ${rareL.maxStr}
- Status: ${rareL.warning}

[Odd/Even O/E]
- Max Streak Found: ${rareO.maxStr}
- Status: ${rareO.warning}

Focus: If a rare pattern is active, tread carefully or bet on breakage.`;
        return { botId: BOT_ID, layer1_macro: {}, layer2_rolling: { summary_text: summaryText }, layer3_raw: rawData } as any;
    }
}

// --- TEST RUNNER ---
const generateData1000 = () => {
    const rounds = [];
    // 1000 rounds. Skewed L for the first 800, then Balanced.
    // This should trigger LLN force and Rare Pattern streak maybe.
    for (let i = 0; i < 800; i++) rounds.push((Math.random() < 0.35 ? 'L' : 'R') + '3O'); // Heavy R bias (0.65) -> L will be ~0.35
    for (let i = 800; i < 1000; i++) rounds.push('L3O'); // Massive L streak at the end (200 rounds!) for Rare detection
    return rounds;
};

const run = () => {
    const data = generateData1000();
    console.log("=== Running BOTS 11-15 Verification (1000 Rounds) ===");

    [new Gen_BOT11_LLN(), new Gen_BOT12_ZScoreMacro(), new Gen_BOT13_Regression(), new Gen_BOT14_GiantCycle(), new Gen_BOT15_RarePattern()].forEach(bot => {
        const res = bot.generate(data);
        console.log(`\n--- ${res.botId} ---`);
        console.log(res.layer2_rolling.summary_text);
    });
};

run();
