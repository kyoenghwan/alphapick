
export class LocalBotExecutor {

    // Helper: Valid Combination Logic (Tournament -> Top 2 -> Pattern)
    private static determineFinalPrediction(probs: any): { pred: string, conf: number, reason: string } {
        // 1. Pairwise Selection (Tournament)
        const bestDir = probs.L >= probs.R ? { val: 'L', prob: probs.L } : { val: 'R', prob: probs.R };
        const bestLine = probs['3'] >= probs['4'] ? { val: '3', prob: probs['3'] } : { val: '4', prob: probs['4'] };
        const bestOE = probs.O >= probs.E ? { val: 'O', prob: probs.O } : { val: 'E', prob: probs.E };

        // 2. Select Top 2 from the 3 winners
        const winners = [
            { ...bestDir, type: 'dir' },
            { ...bestLine, type: 'line' },
            { ...bestOE, type: 'oe' }
        ].sort((a, b) => b.prob - a.prob);

        const top1 = winners[0];
        const top2 = winners[1];

        // 3. Match Valid Patterns (L3O, L4E, R3E, R4O)
        const patterns = [
            { code: "L3O", components: ['L', '3', 'O'] },
            { code: "L4E", components: ['L', '4', 'E'] },
            { code: "R3E", components: ['R', '3', 'E'] },
            { code: "R4O", components: ['R', '4', 'O'] }
        ];

        let bestPattern = "PASS";
        // Find pattern with both Top 2 components
        const match = patterns.find(p => p.components.includes(top1.val) && p.components.includes(top2.val));

        if (match) {
            bestPattern = match.code;
        }

        if (bestPattern !== "PASS") {
            // Recalculate Confidence based on the selected pattern's components
            const pL = bestPattern.includes('L') ? probs.L : probs.R;
            const pLine = bestPattern.includes('3') ? probs['3'] : probs['4'];
            const pOE = bestPattern.includes('O') ? probs.O : probs.E;

            const avgConf = Math.round((pL + pLine + pOE) / 3);
            return { pred: bestPattern, conf: avgConf, reason: `Winners[${top1.val},${top2.val}] -> ${bestPattern}` };
        }

        // Fallback: Use Top 1 and force a valid pattern
        // If Top 1 is L, check best of 3 vs 4? 
        // For simplicity, default to L3O or R4O based on Top 1
        return { pred: "L3O", conf: 0, reason: "Fallback (No Valid Pattern)" };
    }

    /**
     * [Hybrid Strategy A] Full Hybrid (Weighted Mix)
     * Combines L2 (Short-term) and L1 (Macro) probabilities.
     * Default Weight: L2 70% + L1 30%
     */
    private static resolveHybridProb(l2Prob: number, l1Prob: number, weightL2: number = 0.7): number {
        return parseFloat(((l2Prob * weightL2) + (l1Prob * (1 - weightL2))).toFixed(1));
    }

    /**
     * [Hybrid Strategy B] Tie-breaker (Fallback)
     * Uses L2 primarily. If L2 is neutral (e.g. 50:50), follows L1 trend.
     */
    private static resolveTieBreaker(l2ProbMain: number, l2ProbOpp: number, l1ProbMain: number): number {
        // If L2 is decisive (diff >= 1%), stick to L2
        if (Math.abs(l2ProbMain - l2ProbOpp) >= 1.0) {
            return l2ProbMain;
        }
        // If Tie, follow L1
        return l1ProbMain;
    }

    public static execute(botId: string, summary: any): any {
        switch (botId) {
            case "BOT_01": return this.runBot01(summary);
            case "BOT_02": return this.runBot02(summary);
            case "BOT_03": return this.runBot03(summary);
            case "BOT_04": return this.runBot04(summary);
            case "BOT_05": return this.runBot05(summary);
            case "BOT_06": return this.runBot06(summary);
            case "BOT_07": return this.runBot07(summary);
            case "BOT_08": return this.runBot08(summary);
            case "BOT_09": return this.runBot09(summary);
            case "BOT_10": return this.runBot10(summary);
            case "BOT_11": return this.runBot11(summary);
            case "BOT_12": return this.runBot12(summary);
            case "BOT_13": return this.runBot13(summary);
            case "BOT_14": return this.runBot14(summary);
            case "BOT_15": return this.runBot15(summary);
            default: return this.runBot01(summary);
        }
    }

    // [BOT_01] Markov Logic
    private static runBot01(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats) {
            return { bot_id: "BOT_01", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "No Stats Found" };
        }

        const { transitions } = stats;

        const probL = Math.max(transitions.dir.LL, transitions.dir.RL);
        const probR = Math.max(transitions.dir.RR, transitions.dir.LR);

        const lastLine = stats.lastRound.line; // "3" or "4"
        let prob3 = 50, prob4 = 50;
        if (lastLine === "3") {
            prob3 = transitions.line.L33;
            prob4 = transitions.line.L34;
        } else {
            prob3 = transitions.line.L43;
            prob4 = transitions.line.L44;
        }

        const lastOE = stats.lastRound.oe;
        let probO = 50, probE = 50;
        if (lastOE === "O" || lastOE === "Odd") {
            probO = transitions.oe.OO;
            probE = transitions.oe.OE;
        } else {
            probO = transitions.oe.EO;
            probE = transitions.oe.EE;
        }

        const probs = {
            L: parseFloat(probL.toFixed(1)), R: parseFloat(probR.toFixed(1)),
            "3": parseFloat(prob3.toFixed(1)), "4": parseFloat(prob4.toFixed(1)),
            O: parseFloat(probO.toFixed(1)), E: parseFloat(probE.toFixed(1))
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_01",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 80 ? "LOW" : "MID",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_02] Pongdang (Alternation)
    private static runBot02(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.pongdang) return { bot_id: "BOT_02", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { pongdang, lastRound } = stats;

        const resolveProbs = (pObj: any, lastVal: string, labelMain: string, labelOpp: string) => {
            const flipProb = pObj.rate;
            const sameProb = 100 - flipProb;

            if (lastVal === labelMain) {
                return { [labelMain]: sameProb, [labelOpp]: flipProb };
            } else {
                return { [labelMain]: flipProb, [labelOpp]: sameProb };
            }
        };

        const dProbs = resolveProbs(pongdang.dir, lastRound.dir, 'L', 'R');
        const lProbs = resolveProbs(pongdang.line, lastRound.line, '3', '4');

        const lastOVal = (lastRound.oe === 'O' || lastRound.oe === 'Odd') ? 'O' : 'E';
        const oProbs = resolveProbs(pongdang.oe, lastOVal, 'O', 'E');

        // Hybrid Strategy B: Tie-breaker
        // If Pongdang stats are neutral (e.g. 50:50) or weak, defer to Layer 1 Macro Trend.
        const macro = summary.layer1_macro;

        // 1. Direction
        const l2ProbL = dProbs.L;
        const l2ProbR = dProbs.R;
        // If Tie (diff < 1.0%), use Macro L
        const finalProbL = this.resolveTieBreaker(l2ProbL, l2ProbR, macro.today_l_prob);
        // Recalculate R based on decision (If L chosen, R is 100-L ?? No, resolveTieBreaker returns a probability value)
        // Wait, resolveTieBreaker returns the *Probability of Main Option*.
        // If it chose L2, it returned L2 Main. If it chose L1, it returned L1 Main.
        // Actually resolveTieBreaker logic: "If diff >= 1.0, return l2ProbMain. Else return l1ProbMain."
        // So finalProbL is the new probability for L.
        const finalProbR = parseFloat((100 - finalProbL).toFixed(1));

        // 2. Line
        const l2Prob3 = lProbs['3'];
        const l2Prob4 = lProbs['4'];
        const finalProb3 = this.resolveTieBreaker(l2Prob3, l2Prob4, macro.today_3_prob);
        const finalProb4 = parseFloat((100 - finalProb3).toFixed(1));

        // 3. OE
        const l2ProbO = oProbs.O;
        const l2ProbE = oProbs.E;
        const finalProbO = this.resolveTieBreaker(l2ProbO, l2ProbE, macro.today_o_prob);
        const finalProbE = parseFloat((100 - finalProbO).toFixed(1));

        const probs = {
            L: finalProbL, R: finalProbR,
            "3": finalProb3, "4": finalProb4,
            O: finalProbO, E: finalProbE
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_02",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 70 ? "LOW" : "HIGH",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_03] EMA (Momentum)
    private static runBot03(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.ema) return { bot_id: "BOT_03", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { ema } = stats;

        const getPred = (val: number, labelPlus: string, labelMinus: string) => {
            const conf = Math.min(50 + Math.abs(val) * 0.5, 95);
            if (val > 0) return { pred: labelPlus, conf };
            else return { pred: labelMinus, conf };
        };

        const d = getPred(ema.dir.val, 'L', 'R');
        const l = getPred(ema.line.val, '3', '4');
        const o = getPred(ema.oe.val, 'O', 'E');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_03",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 75 ? "LOW" : "MID",
            reason: `[EMA] Val: D(${ema.dir.val}) L(${ema.line.val}) O(${ema.oe.val}) -> ${final.reason}`,
            probabilities: probs
        };
    }

    // [BOT_04] Z-Score (Mean Reversion)
    private static runBot04(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.zscore) return { bot_id: "BOT_04", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { zscore } = stats;

        const getRevPred = (zVal: number, labelPlus: string, labelMinus: string) => {
            const absZ = Math.abs(zVal);
            const conf = Math.min(50 + (absZ * 10), 95);
            if (zVal > 0) return { pred: labelMinus, conf };
            else return { pred: labelPlus, conf };
        };

        const d = getRevPred(zscore.dir.z, 'L', 'R');
        const l = getRevPred(zscore.line.z, '3', '4');
        const o = getRevPred(zscore.oe.z, 'O', 'E');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_04",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 80 ? "LOW" : "HIGH",
            reason: `[Z-Score] D(${zscore.dir.z}) L(${zscore.line.z}) O(${zscore.oe.z}) -> ${final.reason}`,
            probabilities: probs
        };
    }

    // [BOT_05] KNN (Pattern Matching)
    private static runBot05(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.knn) return { bot_id: "BOT_05", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { knn } = stats;

        const getPred = (k: any, labelPlus: string, labelMinus: string) => {
            if (k.count < 1) return { pred: labelPlus, conf: 50 };
            if (k.prob > 50) return { pred: labelPlus, conf: k.prob };
            else if (k.prob < 50) return { pred: labelMinus, conf: 100 - k.prob };
            else return { pred: labelPlus, conf: 50 };
        };

        const d = getPred(knn.dir, 'L', 'R');
        const l = getPred(knn.line, '3', '4');
        const o = getPred(knn.oe, 'O', 'E');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_05",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 70 ? "LOW" : "HIGH",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_06] Bayes (Trend Analysis)
    private static runBot06(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.bayes) return { bot_id: "BOT_06", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { bayes } = stats;

        const getPred = (b: any, labelPlus: string, labelMinus: string) => {
            if (b.post > 50) return { pred: labelPlus, conf: b.post };
            else return { pred: labelMinus, conf: 100 - b.post };
        };

        const d = getPred(bayes.dir, 'L', 'R');
        const l = getPred(bayes.line, '3', '4');
        const o = getPred(bayes.oe, 'O', 'E');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_06",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 60 ? "MID" : "HIGH",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_07] Deviation (Gap Analysis)
    private static runBot07(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.deviation) return { bot_id: "BOT_07", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { deviation } = stats;

        const getPred = (dev: any, labelPlus: string, labelMinus: string) => {
            const gap = dev.gap;
            let conf = 50 + Math.min(Math.abs(gap) * 2, 45);
            if (gap > 0) return { pred: labelPlus, conf };
            else return { pred: labelMinus, conf };
        };

        const d = getPred(deviation.dir, 'L', 'R');
        const l = getPred(deviation.line, '3', '4');
        const o = getPred(deviation.oe, 'O', 'E');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_07",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 65 ? "MID" : "HIGH",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_08] Cycle (Wave Analysis)
    private static runBot08(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.cycle) return { bot_id: "BOT_08", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { cycle } = stats;

        const getPred = (c: any, labelPlus: string, labelMinus: string) => {
            let conf = 50 + (c.slope * 40);
            if (conf > 99) conf = 99;
            if (conf < 1) conf = 1;

            if (conf > 50) return { pred: labelPlus, conf: conf };
            else return { pred: labelMinus, conf: 100 - conf };
        };

        const d = getPred(cycle.dir, 'L', 'R');
        const l = getPred(cycle.line, '3', '4');
        const o = getPred(cycle.oe, 'O', 'E');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_08",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 60 ? "MID" : "HIGH",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_09] Trend (Golden/Dead Cross)
    private static runBot09(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.trend) return { bot_id: "BOT_09", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { trend } = stats;

        const getPred = (t: any, labelPlus: string, labelMinus: string) => {
            const gap = t.gap || 0;
            let conf = 50 + Math.abs(gap * 150);

            if (conf > 95) conf = 95;
            if (conf < 50) conf = 50;

            if (gap > 0) return { pred: labelPlus, conf: Math.round(conf) };
            else return { pred: labelMinus, conf: Math.round(conf) };
        };

        const d = getPred(trend.dir, 'L', 'R');
        const l = getPred(trend.line, '3', '4');
        const o = getPred(trend.oe, 'O', 'E');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_09",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 65 ? "MID" : "HIGH",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_10] Pattern (Streak Reversal)
    private static runBot10(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.pattern) return { bot_id: "BOT_10", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { pattern } = stats;

        const raw = summary.layer3_raw;
        const last = raw && raw.length > 0 ? raw[raw.length - 1] : "";

        const getPredReal = (p: any, lastVal: string, labelOpp: string) => {
            const prob = p.prob;
            if (prob > 50) return { pred: labelOpp, conf: prob };
            else if (prob < 50) return { pred: lastVal, conf: 100 - prob };
            else return { pred: lastVal, conf: 50 };
        };

        const lastD = last.includes('L') ? 'L' : 'R';
        const lastL = last.includes('3') ? '3' : '4';
        const lastO = last.includes('O') ? 'O' : 'X';

        // Normalize 'X' to 'E' in internal logic if needed, but lastO is just a string.
        // We need to parse pattern.oe prob correctly.
        // pattern.oe.prob is Prob of REVERSAL.

        const d = getPredReal(pattern.dir, lastD, lastD === 'L' ? 'R' : 'L');
        const l = getPredReal(pattern.line, lastL, lastL === '3' ? '4' : '3');
        const o = getPredReal(pattern.oe, lastO === 'O' ? 'O' : 'E', lastO === 'O' ? 'E' : 'O');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_10",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 80 ? "LOW" : "MID",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_11] LLN (Large Numbers)
    private static runBot11(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.lln) return { bot_id: "BOT_11", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { lln } = stats;

        const getPred = (l: any, label: string, labelOpp: string) => {
            const diff = l.diff;
            const absDiff = Math.abs(diff);
            let conf = 50 + Math.min(absDiff * 3, 40);

            if (diff > 0) return { pred: label, conf };
            else return { pred: labelOpp, conf };
        };

        const d = getPred(lln.dir, 'L', 'R');
        const l = getPred(lln.line, '3', '4');
        const o = getPred(lln.oe, 'O', 'E');

        // Hybrid Strategy A: Full Hybrid (Weighted)
        // Combine L2 stats (Short-term LLN) with L1 Macro (Long-term LLN)
        const macro = summary.layer1_macro;

        // 1. Direction
        const finalProbL = this.resolveHybridProb(d.pred === 'L' ? d.conf : 100 - d.conf, macro.today_l_prob, 0.7);
        const finalProbR = parseFloat((100 - finalProbL).toFixed(1));

        // 2. Line
        const finalProb3 = this.resolveHybridProb(l.pred === '3' ? l.conf : 100 - l.conf, macro.today_3_prob, 0.7);
        const finalProb4 = parseFloat((100 - finalProb3).toFixed(1));

        // 3. OE
        const finalProbO = this.resolveHybridProb(o.pred === 'O' ? o.conf : 100 - o.conf, macro.today_o_prob, 0.7);
        const finalProbE = parseFloat((100 - finalProbO).toFixed(1));

        const probs = {
            L: finalProbL, R: finalProbR,
            "3": finalProb3, "4": finalProb4,
            O: finalProbO, E: finalProbE
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_11",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 60 ? "MID" : "HIGH",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_12] Z-Score Macro (Long Term)
    private static runBot12(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.zmacro) return { bot_id: "BOT_12", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { zmacro } = stats;

        const getPred = (z: any, label: string, labelOpp: string) => {
            const val = z.z;
            const absZ = Math.abs(val);
            let conf = 50 + Math.min(absZ * 10, 45);

            if (val > 1.0) return { pred: labelOpp, conf };
            else if (val < -1.0) return { pred: label, conf };
            else return { pred: label, conf: 50 };
        };

        const d = getPred(zmacro.dir, 'L', 'R');
        const l = getPred(zmacro.line, '3', '4');
        const o = getPred(zmacro.oe, 'O', 'E');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_12",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 65 ? "MID" : "HIGH",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_13] Regression (Similarity)
    private static runBot13(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.regression) return { bot_id: "BOT_13", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { regression } = stats;

        const getPred = (r: any, label: string, labelOpp: string) => {
            const similarity = r.diff;
            let conf = similarity;
            if (conf < 60) conf = 50;
            if (conf > 90) conf = 90;

            let pStr = r.pred;
            if (pStr === "Opposite") pStr = labelOpp;
            if (pStr === "Odd") pStr = 'O';
            if (pStr === "Even") pStr = 'E';

            return { pred: pStr, conf: Math.round(conf) };
        };

        const d = getPred(regression.dir, 'L', 'R');
        const l = getPred(regression.line, '3', '4');
        const o = getPred(regression.oe, 'O', 'E');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_13",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 75 ? "LOW" : "MID",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_14] Giant Cycle (Expansion/Contraction)
    private static runBot14(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.giant) return { bot_id: "BOT_14", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { giant } = stats;

        const getPred = (g: any, label: string, labelOpp: string) => {
            if (g.phase.includes("Expansion")) return { pred: label, conf: 65 };
            else if (g.phase.includes("Contraction")) return { pred: labelOpp, conf: 65 };
            else return { pred: label, conf: 50 };
        };

        const d = getPred(giant.dir, 'L', 'R');
        const l = getPred(giant.line, '3', '4');
        const o = getPred(giant.oe, 'O', 'E');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_14",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 60 ? "MID" : "HIGH",
            reason: final.reason,
            probabilities: probs
        };
    }

    // [BOT_15] Rare Pattern (Chaos Theory)
    private static runBot15(summary: any): any {
        const stats = summary.layer2_rolling.stats;
        if (!stats || !stats.rare) return { bot_id: "BOT_15", prediction: "PASS", confidence: 0, risk_level: "ERROR", reason: "Stats Missing" };

        const { rare } = stats;

        const raw = summary.layer3_raw;
        const last = raw && raw.length > 0 ? raw[raw.length - 1] : "";

        const lastD = last.includes('L') ? 'L' : 'R';
        const lastL = last.includes('3') ? '3' : '4';
        const lastO = last.includes('O') ? 'O' : 'X';

        const getPred = (r: any, lastVal: string, labelOpp: string) => {
            const streak = r.curStr;
            let conf = 50 + (streak * 5);
            if (conf > 95) conf = 95;
            return { pred: labelOpp, conf: conf };
        };

        const d = getPred(rare.dir, lastD, lastD === 'L' ? 'R' : 'L');
        const l = getPred(rare.line, lastL, lastL === '3' ? '4' : '3');
        const o = getPred(rare.oe, lastO === 'O' ? 'O' : 'E', lastO === 'O' ? 'E' : 'O');

        const probs = {
            L: d.pred === 'L' ? d.conf : 100 - d.conf,
            R: d.pred === 'R' ? d.conf : 100 - d.conf,
            "3": l.pred === '3' ? l.conf : 100 - l.conf,
            "4": l.pred === '4' ? l.conf : 100 - l.conf,
            O: o.pred === 'O' ? o.conf : 100 - o.conf,
            E: o.pred === 'E' || o.pred === 'X' ? o.conf : 100 - o.conf
        };

        const final = this.determineFinalPrediction(probs);

        return {
            bot_id: "BOT_15",
            prediction: final.pred,
            confidence: final.conf,
            risk_level: final.conf > 70 ? "MID" : (d.conf > 80 ? "LOW" : "HIGH"),
            reason: final.reason,
            probabilities: probs
        };
    }
}
