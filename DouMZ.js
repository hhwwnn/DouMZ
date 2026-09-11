// DouMZ.js - 斗母猪 SillyTavern 扩展（完整版 v11）
(function () {
    'use strict';

    const EXT_NAME = 'DouSow';
    const STORAGE_KEY = 'dousow_state_v14';
    const EFFECT_KEY = 'dousow_effects_v14';
    const UI_KEY = 'dousow_ui_v14';
    const PLAYER_NAMES = ['塞拉', '诺亚', '薇拉'];
    const TRIGGER_ORDER = ['3','8','4','5','6','7','10','A','2','J','Q','K','小王','9'];
    const RANK_VALUE = { '3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':13,'Q':14,'K':15,'A':11,'2':12,'小王':16,'大王':17 };
    const SORT_KEY = { '大王':0,'小王':1,'2':2,'A':3,'K':4,'Q':5,'J':6,'10':7,'9':8,'8':9,'7':10,'6':11,'5':12,'4':13,'3':14 };
    const MAX_HISTORY = 20;
    const MAX_PILE = 30;
    const PILE_DISPLAY = 3;
    const PILE_INJECT = 8;
    const ROUND_SECONDS_IN = 180;
    const ROUND_SECONDS_OUT = 60;

    const DEFAULT_EFFECTS = {
        '3': { name:'3', desc:'乳头与阴蒂敏感和大小增加3倍，男孩玩弄持续一轮。火箭触发时永久，男孩仅+1轮。', duration:1, stackIntensity:true, boy:'男孩玩弄乳头与阴蒂', locked:false },
        '4': { name:'4', desc:'强制用右手自慰或男孩用手帮忙，持续一轮。', duration:1, stackIntensity:false, boy:'男孩用手帮忙自慰', locked:false },
        '5': { name:'5', desc:'发热发情，男孩用双腿玩素股持续一局。火箭触发时永久，男孩仅+1轮。', duration:1, stackIntensity:true, boy:'男孩用双腿玩素股', locked:false },
        '6': { name:'6', desc:'对应国家男孩强制口交一轮，期间看不到牌与牌桌。', duration:1, stackIntensity:false, boy:'强制口交', locked:false },
        '7': { name:'7', desc:'强制脱一件衣物。全部脱光后，阴道被魔法撑开持续1局。多次触发依次打开子宫→输卵管→尿道→肛门→乳头。', duration:1, stackIntensity:false, boy:'', locked:true },
        '8': { name:'8', desc:'乳房变大、泌乳、敏感翻倍，持续一轮。火箭触发时永久。', duration:1, stackIntensity:true, boy:'可选：男孩从乳头插入乳房性交', locked:false },
        '9': { name:'9', desc:'强制高潮边缘，保持一轮。', duration:1, stackIntensity:false, boy:'', locked:false },
        '10': { name:'10', desc:'强制剧烈高潮。', duration:0, stackIntensity:true, boy:'', locked:true, isInstant:true },
        'J': { name:'J', desc:'三个男孩咬住阴蒂和乳头大力啃咬一轮。', duration:1, stackIntensity:false, boy:'三个男孩啃咬', locked:false },
        'Q': { name:'Q', desc:'肛门被男孩强制性交一轮。', duration:1, stackIntensity:false, boy:'肛门强制性交', locked:false },
        'K': { name:'K', desc:'两个男孩暴力蹂躏两个乳房一轮。', duration:1, stackIntensity:false, boy:'暴力蹂躏乳房', locked:false },
        'A': { name:'A', desc:'强制被男孩性交一轮，期间难以思考。', duration:1, stackIntensity:false, boy:'强制性交', locked:false },
        '2': { name:'2', desc:'强制剧烈高潮并保持高潮状态一整轮。', duration:1, stackIntensity:false, boy:'', locked:false },
        '小王': { name:'小王', desc:'锁定自身状态一整轮。锁定期间时长不减，新效果延迟到小王结束后触发。', duration:1, stackIntensity:false, boy:'', locked:true },
        '大王': { name:'大王', desc:'清空自身所有非永久效果。与其他牌一起出时不触发。', duration:0, stackIntensity:false, boy:'', locked:true }
    };

    const DEFAULT_CLOTHES = [
        ["纯白丝绸长裙", "淡蓝色紧身胸衣", "白色丝质长筒袜", "同色系高腰内裤", "银色细跟高跟鞋", "冰晶皇冠", "蓝宝石项链", "一对蓝宝石耳钉", "左手中指白金戒指", "右手小指细银戒指", "腰间短冰晶杖", "双腕各一只银质手镯", "左脚踝银链", "白色薄纱长手套", "银质腰链", "发间冰晶发钗", "右耳细小白金耳骨钉", "肩上雪白毛皮小披肩"],
        ["深紫色低胸长裙", "黑色紧身胸衣", "黑色渔网吊带袜", "同色系镂空丁字裤", "黑色尖头高跟鞋", "黑色金属冠冕", "黑曜石项链", "一对黑色耳骨钉", "右手食指黑色戒指", "左手中指黑色戒指", "腰间斜挎短刃", "双臂各一只黑色皮革臂带", "右脚踝黑色细链", "黑色半指皮革手套", "黑色细腰链", "发间黑曜石发簪", "左耳两枚细小黑色耳骨钉", "肩侧黑色薄纱披帛"],
        ["黑色丝绒高开叉长裙", "深红色紧身胸衣", "黑色蕾丝吊带袜", "同色系蕾丝丁字裤", "黑色皮质高跟鞋", "黄金皇冠", "红宝石项链", "一对红宝石耳坠", "右手中指黄金戒指", "左手无名指结婚戒指", "腰间细长黄金匕首", "双臂各一只黄金臂环", "右脚踝细金链", "黑色蕾丝长手套", "黄金腰链", "发间一对红宝石发簪", "左耳细小黄金耳骨钉"]
    ];

    let G = null;
    let effectsDB = JSON.parse(JSON.stringify(DEFAULT_EFFECTS));
    let uiSettings = { bgColor: '#4a0e0e' };
    let panel = null;
    let isDragging = false;
    let dragOff = { x: 0, y: 0 };
    let userMovedPanel = false;
    let renderTimer = null;
    let saveTimer = null;
    let stateTextCache = null;

    function defaultState() {
        return {
            phase: 'idle',
            roundNumber: 1,
            multiplier: 1,
            bidStartIndex: 0,
            currentTurn: 0,
            motherIndex: -1,
            tempMotherIndex: -1,
            lastMotherIndex: -1,
            consecutiveMother: [0,0,0],
            hasActed: [false, false, false],
            passCount: 0,
            players: PLAYER_NAMES.map(function (name, idx) {
                return {
                    name: name, role: '', score: 1000, hand: [], effects: [],
                    clothes: DEFAULT_CLOTHES[idx].slice(), pendingStrip: 0,
                    baseScore: 0.5, bid: null, hasGrabbed: false
                };
            }),
            bottomCards: [], playPile: [], bombCount: 0, rocketCount: 0,
            spring: false, antiSpring: false,
            actionHistory: [], pendingEffects: [],
            grabQueue: [], grabQueueIdx: 0,
            intermissionSeconds: 0,
            lastPlayed: null
        };
    }

    function getCtx() {
        try { return window.SillyTavern.getContext(); } catch (e) { return null; }
    }
    function invalidateCache() { stateTextCache = null; }

    function serializeForStorage() {
        var copy = {};
        for (var k in G) {
            if (k === 'actionHistory') continue;
            copy[k] = G[k];
        }
        return JSON.stringify(copy);
    }

    function saveAll() {
        try {
            var s = serializeForStorage();
            var e = JSON.stringify(effectsDB);
            var u = JSON.stringify(uiSettings);
            try {
                localStorage.setItem(STORAGE_KEY, s);
                localStorage.setItem(EFFECT_KEY, e);
                localStorage.setItem(UI_KEY, u);
            } catch (err) {}
            var ctx = getCtx();
            if (ctx && ctx.extensionSettings) {
                if (!ctx.extensionSettings.dousow) ctx.extensionSettings.dousow = {};
                ctx.extensionSettings.dousow.state = s;
                ctx.extensionSettings.dousow.effects = e;
                ctx.extensionSettings.dousow.ui = u;
                if (ctx.saveSettingsDebounced) ctx.saveSettingsDebounced();
            }
        } catch (err) { console.warn('[DouSow] save error', err); }
    }
    function saveNow() {
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        saveAll();
    }
    function saveLazy() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveAll, 500);
    }

    function loadAll() {
        var loaded = false;
        try {
            var ctx = getCtx();
            if (ctx && ctx.extensionSettings && ctx.extensionSettings.dousow) {
                var d = ctx.extensionSettings.dousow;
                if (d.state) { G = JSON.parse(d.state); loaded = true; }
                if (d.effects) effectsDB = Object.assign({}, DEFAULT_EFFECTS, JSON.parse(d.effects));
                if (d.ui) uiSettings = Object.assign(uiSettings, JSON.parse(d.ui));
            }
        } catch (e) {}
        if (!loaded) {
            try {
                var s = localStorage.getItem(STORAGE_KEY);
                if (s) { G = JSON.parse(s); loaded = true; }
                var e2 = localStorage.getItem(EFFECT_KEY);
                if (e2) effectsDB = Object.assign({}, DEFAULT_EFFECTS, JSON.parse(e2));
                var u2 = localStorage.getItem(UI_KEY);
                if (u2) uiSettings = Object.assign(uiSettings, JSON.parse(u2));
            } catch (err) {}
        }
        if (!G) G = defaultState();
        if (!Array.isArray(G.actionHistory)) G.actionHistory = [];
        if (!Array.isArray(G.hasActed)) G.hasActed = [false, false, false];
        if (typeof G.passCount !== 'number') G.passCount = 0;
        for (var i = 0; i < G.players.length; i++) {
            var c = G.players[i].clothes;
            if (typeof c === 'string') {
                G.players[i].clothes = c.trim() ? c.split(/[,，\s]+/).filter(Boolean) : [];
            } else if (!Array.isArray(c)) {
                G.players[i].clothes = [];
            }
            if (typeof G.players[i].pendingStrip !== 'number') G.players[i].pendingStrip = 0;
        }
        if (G.playPile.length > MAX_PILE) G.playPile = G.playPile.slice(-MAX_PILE);
    }

    function pushUndo() {
        G.actionHistory.push(JSON.stringify({
            phase: G.phase,
            roundNumber: G.roundNumber,
            multiplier: G.multiplier,
            currentTurn: G.currentTurn,
            motherIndex: G.motherIndex,
            tempMotherIndex: G.tempMotherIndex,
            consecutiveMother: G.consecutiveMother,
            hasActed: G.hasActed,
            passCount: G.passCount,
            players: G.players.map(function (p) {
                return {
                    name: p.name, role: p.role, score: p.score, hand: p.hand.slice(),
                    effects: JSON.parse(JSON.stringify(p.effects)),
                    clothes: p.clothes.slice(), pendingStrip: p.pendingStrip,
                    baseScore: p.baseScore, bid: p.bid, hasGrabbed: p.hasGrabbed
                };
            }),
            bottomCards: G.bottomCards.slice(),
            playPile: G.playPile.slice(-MAX_PILE),
            pendingEffects: G.pendingEffects.slice(),
            lastPlayed: G.lastPlayed
        }));
        if (G.actionHistory.length > MAX_HISTORY) G.actionHistory.shift();
    }

    function doUndo() {
        if (!G.actionHistory || G.actionHistory.length === 0) { alert('没有可撤回的操作'); return; }
        var prev = JSON.parse(G.actionHistory.pop());
        var hist = G.actionHistory;
        for (var k in prev) G[k] = prev[k];
        G.actionHistory = hist;
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function parseCards(str) {
        if (!str) return [];
        var s = String(str).trim().toUpperCase().replace(/\s+/g, '');
        var out = [];
        var i = 0;
        while (i < s.length) {
            if (s.substr(i, 2) === '10') { out.push('10'); i += 2; continue; }
            if (s[i] === '大') { out.push('大王'); i++; continue; }
            if (s[i] === '小') { out.push('小王'); i++; continue; }
            if (s[i] === '王') { out.push('小王'); i++; continue; }
            var ch = s[i];
            if ('3456789JQKA2'.indexOf(ch) >= 0) out.push(ch);
            i++;
        }
        return out;
    }

    function sortHand(cards) {
        return cards.slice().sort(function (a, b) { return (SORT_KEY[a] || 99) - (SORT_KEY[b] || 99); });
    }

    function getEffectDef(rank) {
        return effectsDB[rank] || effectsDB[rank.toUpperCase()] || null;
    }

    function phaseName(ph) {
        var m = { idle:'空闲', deal:'发牌阶段', bid:'叫母猪', grab:'抢母猪', play:'出牌阶段', rest:'中场休息', ended:'游戏结束' };
        return m[ph] || ph;
    }

    function hasSowLock(playerIdx) {
        var p = G.players[playerIdx];
        for (var i = 0; i < p.effects.length; i++) {
            var e = p.effects[i];
            if (e.rank === '小王' && !e.permanent && e.duration > 0) return true;
        }
        return false;
    }

    function calcTriggerCount(playerIdx, baseCount) {
        var count = baseCount;
        var role = G.players[playerIdx].role;
        if (role === '母猪') {
            count *= 2;
            var consec = G.consecutiveMother[playerIdx] || 0;
            if (consec > 1) count += 2 * (consec - 1);
        }
        return count;
    }

    function getTargets(playerIdx) {
        var role = G.players[playerIdx].role;
        if (role === '婊子') {
            var bitches = [];
            for (var i = 0; i < 3; i++) if (G.players[i].role === '婊子') bitches.push(i);
            return bitches;
        }
        return [playerIdx];
    }

    function addEffect(playerIdx, rank, count, forcePermanent) {
        var def = getEffectDef(rank);
        if (!def) return;

        if (rank === '大王') {
            G.players[playerIdx].effects = G.players[playerIdx].effects.filter(function (e) { return e.permanent; });
            return;
        }

        if (rank === '7') {
            var targets7 = getTargets(playerIdx);
            for (var t7 = 0; t7 < targets7.length; t7++) settleSeven(targets7[t7], count);
            return;
        }

        if (rank === '小王') {
            var targetsS = getTargets(playerIdx);
            for (var ts = 0; ts < targetsS.length; ts++) {
                var tS = G.players[targetsS[ts]];
                var existingS = null;
                for (var is = 0; is < tS.effects.length; is++) {
                    if (tS.effects[is].rank === '小王' && !tS.effects[is].permanent) { existingS = tS.effects[is]; break; }
                }
                if (existingS) existingS.duration += def.duration * count;
                else tS.effects.push({
                    rank: '小王', name: '小王', desc: def.desc,
                    duration: def.duration * count, permanent: false,
                    stacks: 1, boy: '', boyDuration: 0
                });
            }
            return;
        }

        if (rank === '10') {
            var targets10 = getTargets(playerIdx);
            for (var t10 = 0; t10 < targets10.length; t10++) {
                var tP10 = G.players[targets10[t10]];
                var ex10 = null;
                for (var j = 0; j < tP10.effects.length; j++) {
                    if (tP10.effects[j].rank === '10' && !tP10.effects[j].permanent) { ex10 = tP10.effects[j]; break; }
                }
                if (ex10) ex10.remainingCount = (ex10.remainingCount || 0) + count;
                else tP10.effects.push({
                    rank: '10', name: '10', desc: def.desc,
                    duration: 0, permanent: false, stacks: 1,
                    boy: '', boyDuration: 0,
                    isInstant: true, remainingCount: count
                });
            }
            return;
        }

        var targets = getTargets(playerIdx);
        var isPermanent = !!forcePermanent;

        for (var t = 0; t < targets.length; t++) {
            var ti = targets[t];
            var target = G.players[ti];
            var existingE = null;
            for (var k = 0; k < target.effects.length; k++) {
                var ee = target.effects[k];
                if (ee.rank === rank && ee.permanent === isPermanent) { existingE = ee; break; }
            }
            if (existingE) {
                if (def.stackIntensity) existingE.stacks = (existingE.stacks || 1) + count;
                if (!isPermanent) existingE.duration += def.duration * count;
                if (def.boy) {
                    if (isPermanent) existingE.boyDuration = (existingE.boyDuration || 0) + 1;
                    else existingE.boyDuration = (existingE.boyDuration || 0) + def.duration * count;
                }
            } else {
                target.effects.push({
                    rank: rank, name: def.name, desc: def.desc,
                    duration: isPermanent ? 0 : def.duration * count,
                    permanent: isPermanent,
                    stacks: def.stackIntensity ? count : 1,
                    boy: def.boy || '',
                    boyDuration: def.boy ? (isPermanent ? 1 : def.duration * count) : 0
                });
            }
        }
    }

    function settleSeven(playerIdx, count) {
        var p = G.players[playerIdx];
        var available = Math.max(0, (p.clothes.length || 0) - (p.pendingStrip || 0));
        var shouldStrip = Math.min(available, count);
        p.pendingStrip = (p.pendingStrip || 0) + shouldStrip;
        var excess = count - shouldStrip;
        if (excess > 0) handleExpandEffect(playerIdx, excess);
    }

    function handleExpandEffect(playerIdx, count) {
        var p = G.players[playerIdx];
        var existing = null;
        for (var i = 0; i < p.effects.length; i++) {
            if (p.effects[i].rank === '7_expand') { existing = p.effects[i]; break; }
        }
        if (existing) {
            existing.stacks = (existing.stacks || 1) + count;
            if (existing.stacks > 6) {
                var excess = existing.stacks - 6;
                existing.stacks = 6;
                existing.duration = (existing.duration || 1) + excess;
            }
        } else {
            var initStacks = count;
            var initDuration = 1;
            if (initStacks > 6) {
                initDuration = 1 + (initStacks - 6);
                initStacks = 6;
            }
            p.effects.push({
                rank: '7_expand', name: '7扩张',
                desc: '阴道被魔法撑开，内壁扩张合不拢。层数越高打开部位越多。',
                duration: initDuration, permanent: false,
                stacks: initStacks,
                boy: '', boyDuration: 0, isGameDuration: true
            });
        }
    }

    function applyRankEffect(playerIdx, rank, baseCount, ignoreLock) {
        if (rank === '大王') return;
        if (!ignoreLock && hasSowLock(playerIdx) && rank !== '小王' && rank !== '10') {
            G.pendingEffects.push({ playerIdx: playerIdx, rank: rank, count: baseCount });
            return;
        }
        var actualCount = calcTriggerCount(playerIdx, baseCount);
        addEffect(playerIdx, rank, actualCount);
    }

    function triggerEffects(playerIdx, cards, ignoreLock) {
        if (!cards || cards.length === 0) return;
        if (cards.indexOf('小王') >= 0 && cards.indexOf('大王') >= 0 && cards.length === 2) {
            triggerRocket(playerIdx);
            return;
        }
        if (cards.length === 1 && cards[0] === '大王') {
            G.players[playerIdx].effects = G.players[playerIdx].effects.filter(function (e) { return e.permanent; });
            return;
        }
        var counts = {};
        for (var i = 0; i < cards.length; i++) counts[cards[i]] = (counts[cards[i]] || 0) + 1;
        for (var j = 0; j < TRIGGER_ORDER.length; j++) {
            var rank = TRIGGER_ORDER[j];
            if (!counts[rank]) continue;
            applyRankEffect(playerIdx, rank, counts[rank], ignoreLock);
        }
    }

    function triggerRocket(playerIdx) {
        G.rocketCount++;
        G.multiplier += 2;
        var permanentRanks = { '3': true, '5': true, '8': true };
        for (var i = 0; i < TRIGGER_ORDER.length; i++) {
            var rank = TRIGGER_ORDER[i];
            var actual = calcTriggerCount(playerIdx, 4);
            if (permanentRanks[rank]) {
                addEffect(playerIdx, rank, actual, true);
            } else {
                addEffect(playerIdx, rank, actual);
            }
        }
        var sowExtra = calcTriggerCount(playerIdx, 1);
        addEffect(playerIdx, '小王', sowExtra);
    }

    function flushPendingEffects(playerIdx) {
        var pending = [], rest = [];
        for (var i = 0; i < G.pendingEffects.length; i++) {
            if (G.pendingEffects[i].playerIdx === playerIdx) pending.push(G.pendingEffects[i]);
            else rest.push(G.pendingEffects[i]);
        }
        G.pendingEffects = rest;
        if (pending.length === 0) return;
        var rankCounts = {};
        for (var k = 0; k < pending.length; k++) {
            rankCounts[pending[k].rank] = (rankCounts[pending[k].rank] || 0) + pending[k].count;
        }
        for (var m = 0; m < TRIGGER_ORDER.length; m++) {
            var rank = TRIGGER_ORDER[m];
            if (!rankCounts[rank]) continue;
            var actual = calcTriggerCount(playerIdx, rankCounts[rank]);
            addEffect(playerIdx, rank, actual);
        }
    }

    function tickRound(playerIdx) {
        var p = G.players[playerIdx];
        var hasLock = hasSowLock(playerIdx);
        if (hasLock) {
            for (var i = 0; i < p.effects.length; i++) {
                var e = p.effects[i];
                if (e.rank === '小王' && !e.permanent) e.duration = Math.max(0, e.duration - 1);
            }
            if (!hasSowLock(playerIdx)) flushPendingEffects(playerIdx);
        } else {
            for (var j = 0; j < p.effects.length; j++) {
                var ef = p.effects[j];
                if (ef.permanent || ef.isInstant || ef.isGameDuration) continue;
                ef.duration = Math.max(0, ef.duration - 1);
            }
        }
        p.effects = p.effects.filter(function (e) {
            return e.permanent || e.isInstant || e.isGameDuration || e.duration > 0;
        });
    }

    function advanceTurn(nextIdx) {
        if (nextIdx < 0 || nextIdx > 2) return;
        if (G.hasActed[nextIdx]) tickRound(nextIdx);
        G.currentTurn = nextIdx;
    }

    function reduce10(playerIdx) {
        pushUndo();
        var p = G.players[playerIdx];
        for (var i = 0; i < p.effects.length; i++) {
            var e = p.effects[i];
            if (e.rank === '10' && e.isInstant) {
                e.remainingCount = (e.remainingCount || 0) - 1;
                if (e.remainingCount <= 0) p.effects.splice(i, 1);
                break;
            }
        }
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function getCardType(cards) {
        if (!cards || cards.length === 0) return { type: 'invalid' };
        var n = cards.length;
        var counts = {};
        for (var i = 0; i < n; i++) counts[cards[i]] = (counts[cards[i]] || 0) + 1;
        var ranks = Object.keys(counts);
        var vals = ranks.map(function (r) { return counts[r]; });
        var maxCount = Math.max.apply(null, vals);

        if (n === 2 && counts['小王'] && counts['大王']) return { type: 'rocket', main: '大王', len: 2 };
        if (n === 1) return { type: 'single', main: cards[0], len: 1 };
        if (n === 4 && maxCount === 4) return { type: 'bomb', main: ranks[0], len: 4 };
        if (n === 2 && maxCount === 2) return { type: 'pair', main: ranks[0], len: 2 };
        if (n === 3 && maxCount === 3) return { type: 'triple', main: ranks[0], len: 3 };
        if (n === 4 && maxCount === 3) {
            var t3 = ranks.filter(function(r){return counts[r]===3;})[0];
            return { type: 'triple1', main: t3, len: 4 };
        }
        if (n === 5 && maxCount === 3 && vals.indexOf(2) >= 0) {
            var t3b = ranks.filter(function(r){return counts[r]===3;})[0];
            return { type: 'triple2', main: t3b, len: 5 };
        }
        if (n >= 5 && maxCount === 1 && isConsecutive(ranks)) return { type: 'straight', main: highest(ranks), len: n };
        if (n >= 6 && n % 2 === 0 && maxCount === 2 && ranks.length === n / 2 && isConsecutive(ranks)) {
            return { type: 'pairs', main: highest(ranks), len: n };
        }
        if (n >= 6 && n % 3 === 0) {
            var triples = ranks.filter(function (r) { return counts[r] === 3; });
            if (triples.length >= 2 && triples.length * 3 === n && isConsecutive(triples)) {
                return { type: 'plane', main: highest(triples), len: n, mainLen: triples.length };
            }
        }
        if (n >= 8) {
            var triples2 = ranks.filter(function (r) { return counts[r] >= 3; });
            for (var tlen = triples2.length; tlen >= 2; tlen--) {
                var combos = combinations(triples2, tlen);
                for (var c = 0; c < combos.length; c++) {
                    var trip = combos[c];
                    if (!isConsecutive(trip)) continue;
                    var used = {};
                    trip.forEach(function (r) { used[r] = 3; });
                    var restLen = n - tlen * 3;
                    if (restLen === tlen || restLen === tlen * 2) {
                        var restCards = [];
                        for (var rr in counts) {
                            var usedN = used[rr] || 0;
                            for (var u = usedN; u < counts[rr]; u++) restCards.push(rr);
                        }
                        if (restLen === tlen && restCards.length === tlen) {
                            return { type: 'planeWings', main: highest(trip), len: n, mainLen: tlen };
                        }
                        if (restLen === tlen * 2) {
                            var restCounts = {};
                            restCards.forEach(function (r) { restCounts[r] = (restCounts[r] || 0) + 1; });
                            var allPairs = true;
                            for (var rc in restCounts) if (restCounts[rc] !== 2) { allPairs = false; break; }
                            if (allPairs) return { type: 'planeWings', main: highest(trip), len: n, mainLen: tlen };
                        }
                    }
                }
            }
        }
        if (n === 6 || n === 8) {
            var fours = ranks.filter(function (r) { return counts[r] === 4; });
            if (fours.length === 1) {
                var rem = ranks.filter(function (r) { return r !== fours[0]; });
                if (n === 6 && rem.length === 2 && counts[rem[0]] === 1 && counts[rem[1]] === 1) {
                    return { type: 'four2', main: fours[0], len: 6 };
                }
                if (n === 8 && rem.length === 2 && counts[rem[0]] === 2 && counts[rem[1]] === 2) {
                    return { type: 'four2pairs', main: fours[0], len: 8 };
                }
            }
        }
        return { type: 'invalid' };
    }

    function isConsecutive(ranks) {
        if (ranks.indexOf('2') >= 0 || ranks.indexOf('小王') >= 0 || ranks.indexOf('大王') >= 0) return false;
        var sorted = ranks.slice().sort(function (a, b) { return (SORT_KEY[a] || 99) - (SORT_KEY[b] || 99); });
        for (var i = 1; i < sorted.length; i++) {
            if ((SORT_KEY[sorted[i-1]] - SORT_KEY[sorted[i]]) !== 1) return false;
        }
        return true;
    }

    function highest(ranks) {
        return ranks.slice().sort(function (a, b) { return (SORT_KEY[a] || 99) - (SORT_KEY[b] || 99); })[0];
    }

    function combinations(arr, k) {
        if (k === 0) return [[]];
        if (arr.length < k) return [];
        var result = [];
        for (var i = 0; i <= arr.length - k; i++) {
            var rest = combinations(arr.slice(i + 1), k - 1);
            for (var j = 0; j < rest.length; j++) result.push([arr[i]].concat(rest[j]));
        }
        return result;
    }

    function isPlayLegal(cards, lastPlayed) {
        var t = getCardType(cards);
        if (t.type === 'invalid') return false;
        if (!lastPlayed) return true;
        var lt = lastPlayed.type;
        if (t.type === 'rocket') return true;
        if (lt === 'rocket') return false;
        if (t.type === 'bomb' && lt !== 'bomb') return true;
        if (lt === 'bomb' && t.type !== 'bomb' && t.type !== 'rocket') return false;
        if (t.type === 'bomb' && lt === 'bomb') {
            return (SORT_KEY[t.main] || 99) < (SORT_KEY[lastPlayed.main] || 99);
        }
        if (t.type !== lt) return false;
        if (t.len !== lastPlayed.len) return false;
        return (SORT_KEY[t.main] || 99) < (SORT_KEY[lastPlayed.main] || 99);
    }

    function startNewGame() {
        pushUndo();
        G = defaultState();
        G.phase = 'deal';
        G.bidStartIndex = 0;
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function doDeal() {
        pushUndo();
        var deck = [];
        var ranks = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
        for (var i = 0; i < ranks.length; i++) {
            for (var k = 0; k < 4; k++) deck.push(ranks[i]);
        }
        deck.push('小王'); deck.push('大王');
        for (var s = deck.length - 1; s > 0; s--) {
            var r = Math.floor(Math.random() * (s + 1));
            var tmp = deck[s]; deck[s] = deck[r]; deck[r] = tmp;
        }
        G.players[0].hand = sortHand(deck.slice(0, 17));
        G.players[1].hand = sortHand(deck.slice(17, 34));
        G.players[2].hand = sortHand(deck.slice(34, 51));
        G.bottomCards = deck.slice(51);
        G.phase = 'bid';
        G.currentTurn = G.bidStartIndex;
        G.hasActed = [false, false, false];
        G.passCount = 0;
        for (var p = 0; p < 3; p++) {
            G.players[p].bid = null;
            G.players[p].hasGrabbed = false;
            G.players[p].role = '';
            G.players[p].baseScore = 0.5;
        }
        G.tempMotherIndex = -1;
        G.motherIndex = -1;
        G.multiplier = 1;
        G.bombCount = 0;
        G.rocketCount = 0;
        G.playPile = [];
        G.pendingEffects = [];
        G.lastPlayed = null;
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function startGrabPhase() {
        G.phase = 'grab';
        G.grabQueue = [];
        for (var i = 1; i <= 2; i++) {
            var idx = (G.tempMotherIndex + i) % 3;
            if (G.players[idx].bid !== '不叫') G.grabQueue.push(idx);
        }
        G.grabQueueIdx = 0;
        G.currentTurn = G.grabQueue.length > 0 ? G.grabQueue[0] : -1;
        if (G.grabQueue.length === 0) finishGrab();
    }

    function doBid(playerIdx, value) {
        pushUndo();
        var p = G.players[playerIdx];
        p.bid = value;
        if (value === '不叫') {
            p.baseScore = 0.5;
            var exNo = null;
            for (var i = 0; i < p.effects.length; i++) {
                if (p.effects[i].rank === '不叫惩罚') { exNo = p.effects[i]; break; }
            }
            if (exNo) { exNo.stacks += 1; exNo.duration += 2; }
            else p.effects.push({
                rank: '不叫惩罚', name: '不叫惩罚',
                desc: '肛门敏感度翻3倍，连续不叫叠加',
                duration: 2, permanent: false, stacks: 1,
                boy: '', boyDuration: 0
            });
        } else {
            var num = parseInt(value);
            p.baseScore = num;
            p.effects.push({
                rank: '叫分永久', name: '叫' + num + '分永久',
                desc: '立即完整高潮' + num + '次，阴蒂与乳头永久×' + num,
                duration: 0, permanent: true, stacks: num,
                boy: '', boyDuration: 0
            });
            if (num === 3) {
                G.tempMotherIndex = playerIdx;
                startGrabPhase();
                invalidateCache();
                saveNow(); renderUI(); injectState();
                return;
            }
        }
        var nextIdx = (playerIdx + 1) % 3;
        if (nextIdx === G.bidStartIndex) {
            var maxBid = 0, maxIdx = -1;
            for (var j = 0; j < 3; j++) {
                if (G.players[j].bid !== '不叫') {
                    var b = parseInt(G.players[j].bid);
                    if (b > maxBid) { maxBid = b; maxIdx = j; }
                }
            }
            if (maxIdx === -1) {
                for (var m = 0; m < 3; m++) {
                    var cards = G.players[m].hand.slice();
                    triggerEffects(m, cards);
                }
                G.phase = 'deal';
            } else {
                G.tempMotherIndex = maxIdx;
                startGrabPhase();
            }
        } else {
            G.currentTurn = nextIdx;
        }
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function doGrab(playerIdx, grab) {
        pushUndo();
        if (grab) {
            G.players[playerIdx].hasGrabbed = true;
            G.multiplier += 2;
            G.tempMotherIndex = playerIdx;
            G.players[playerIdx].effects.push({
                rank: '抢母猪永久', name: '抢母猪永久',
                desc: '乳房大小翻倍、泌乳、敏感度翻倍（永久）',
                duration: 0, permanent: true, stacks: 1,
                boy: '', boyDuration: 0
            });
        }
        G.grabQueueIdx++;
        if (G.grabQueueIdx >= G.grabQueue.length) finishGrab();
        else G.currentTurn = G.grabQueue[G.grabQueueIdx];
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function finishGrab() {
        G.motherIndex = G.tempMotherIndex;
        for (var i = 0; i < 3; i++) {
            G.players[i].role = (i === G.motherIndex) ? '母猪' : '婊子';
        }
        if (G.lastMotherIndex === G.motherIndex) {
            G.consecutiveMother[G.motherIndex] = (G.consecutiveMother[G.motherIndex] || 0) + 1;
        } else {
            G.consecutiveMother = [0, 0, 0];
            G.consecutiveMother[G.motherIndex] = 1;
        }
        G.lastMotherIndex = G.motherIndex;
        var bottomCopy = G.bottomCards.slice();
        for (var j = 0; j < bottomCopy.length; j++) G.players[G.motherIndex].hand.push(bottomCopy[j]);
        G.players[G.motherIndex].hand = sortHand(G.players[G.motherIndex].hand);
        G.bottomCards = [];
        triggerEffects(G.motherIndex, bottomCopy);
        G.phase = 'play';
        G.currentTurn = G.motherIndex;
        G.hasActed = [false, false, false];
        G.passCount = 0;
        invalidateCache();
    }

    function doPlay(playerIdx, inputStr) {
        var cards = parseCards(inputStr);
        if (cards.length === 0) { alert('无法解析牌面'); return; }
        pushUndo();
        var p = G.players[playerIdx];
        var remaining = p.hand.slice();
        for (var i = 0; i < cards.length; i++) {
            var idx = remaining.indexOf(cards[i]);
            if (idx >= 0) remaining.splice(idx, 1);
        }
        p.hand = remaining;
        G.playPile.push({ player: p.name, cards: cards.join(' ') });
        if (G.playPile.length > MAX_PILE) G.playPile = G.playPile.slice(-MAX_PILE);

        var legal = isPlayLegal(cards, G.lastPlayed);
        var mult = legal ? 1 : 2;

        var counts = {};
        for (var j = 0; j < cards.length; j++) counts[cards[j]] = (counts[cards[j]] || 0) + 1;
        var isRocket = cards.length === 2 && cards.indexOf('小王') >= 0 && cards.indexOf('大王') >= 0;
        if (!isRocket) {
            var vals = Object.keys(counts).map(function (k) { return counts[k]; });
            if (cards.length === 4 && vals.indexOf(4) >= 0) {
                G.bombCount++;
                G.multiplier += 2;
            }
        }

        if (mult > 1) {
            var doubled = [];
            for (var dd = 0; dd < cards.length; dd++) {
                doubled.push(cards[dd]);
                doubled.push(cards[dd]);
            }
            triggerEffects(playerIdx, doubled);
        } else {
            triggerEffects(playerIdx, cards);
        }

        var t = getCardType(cards);
        G.lastPlayed = { playerIdx: playerIdx, cards: cards, type: t.type, main: t.main, len: t.len, legal: legal };
        G.passCount = 0;

        if (p.hand.length === 0) { endRound(playerIdx); return; }
        G.hasActed[playerIdx] = true;
        advanceTurn((playerIdx + 1) % 3);
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function doPass(playerIdx) {
        pushUndo();
        G.playPile.push({ player: G.players[playerIdx].name, cards: '不出' });
        if (G.playPile.length > MAX_PILE) G.playPile = G.playPile.slice(-MAX_PILE);
        G.hasActed[playerIdx] = true;
        G.passCount++;
        if (G.passCount >= 2 && G.lastPlayed) {
            G.lastPlayed = null;
            G.passCount = 0;
        }
        advanceTurn((playerIdx + 1) % 3);
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function doTimeout() {
        var pIdx = G.currentTurn;
        if (pIdx < 0 || pIdx > 2) { alert('当前无行动玩家'); return; }
        pushUndo();
        var p = G.players[pIdx];
        var toTrigger = p.hand.slice();
        if (toTrigger.length > 0) {
            var counts = {};
            for (var i = 0; i < toTrigger.length; i++) {
                counts[toTrigger[i]] = (counts[toTrigger[i]] || 0) + 1;
            }
            for (var j = 0; j < TRIGGER_ORDER.length; j++) {
                var rank = TRIGGER_ORDER[j];
                if (!counts[rank]) continue;
                applyRankEffect(pIdx, rank, counts[rank]);
            }
        }
        G.playPile.push({ player: p.name, cards: '超时' });
        if (G.playPile.length > MAX_PILE) G.playPile = G.playPile.slice(-MAX_PILE);
        G.hasActed[pIdx] = true;
        G.passCount++;
        if (G.passCount >= 2 && G.lastPlayed) {
            G.lastPlayed = null;
            G.passCount = 0;
        }
        advanceTurn((pIdx + 1) % 3);
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function endRound(winnerIdx) {
        for (var i = 0; i < 3; i++) {
            var cards = G.players[i].hand.filter(function (c) { return c !== '大王'; });
            if (cards.length > 0) triggerEffects(i, cards);
        }
        var mother = G.players[G.motherIndex];
        var motherWon = (winnerIdx === G.motherIndex);
        var mult = G.multiplier;
        if (motherWon) {
            mother.score += 2 * mother.baseScore * mult;
            for (var j = 0; j < 3; j++) {
                if (j !== G.motherIndex) G.players[j].score -= G.players[j].baseScore * mult;
            }
        } else {
            mother.score -= 2 * mother.baseScore * mult;
            for (var k = 0; k < 3; k++) {
                if (k !== G.motherIndex) G.players[k].score += G.players[k].baseScore * mult;
            }
        }
        for (var m = 0; m < 3; m++) {
            var pl = G.players[m];
            var extra = 0;
            for (var n = 0; n < pl.effects.length; n++) {
                var e = pl.effects[n];
                if (e.rank === '叫分永久' || e.rank === '抢母猪永久' || e.rank === '不叫惩罚') continue;
                var rankKey = e.rank === '7_expand' ? '7' : e.rank;
                var val = RANK_VALUE[rankKey] || 0;
                if (e.isInstant) extra += val * (e.remainingCount || 0);
                else extra += val * (e.stacks || 1);
            }
            pl.score -= extra;
        }
        for (var q = 0; q < 3; q++) {
            var pp = G.players[q];
            var newEff = [];
            for (var s = 0; s < pp.effects.length; s++) {
                var eff = pp.effects[s];
                if (eff.isGameDuration) {
                    eff.stacks = (eff.stacks || 1) - 1;
                    eff.duration = (eff.duration || 1) - 1;
                    if (eff.stacks > 0 && eff.duration > 0) newEff.push(eff);
                } else {
                    newEff.push(eff);
                }
            }
            pp.effects = newEff;
        }
        for (var r = 0; r < 3; r++) {
            var ppp = G.players[r];
            for (var t = 0; t < ppp.effects.length; t++) {
                var ee = ppp.effects[t];
                if (!ee.permanent && !ee.isInstant && !ee.isGameDuration && ee.duration > 0) {
                    ee.duration *= ROUND_SECONDS_IN;
                    ee.durationType = 'sec';
                }
            }
        }
        G.phase = 'rest';
        G.intermissionSeconds = 0;
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function nextRound() {
        pushUndo();
        G.phase = 'deal';
        G.roundNumber++;
        G.bidStartIndex = (G.motherIndex + 1) % 3;
        G.playPile = [];
        G.bottomCards = [];
        G.pendingEffects = [];
        G.hasActed = [false, false, false];
        G.passCount = 0;
        G.lastPlayed = null;
        for (var i = 0; i < 3; i++) {
            var p = G.players[i];
            for (var j = 0; j < p.effects.length; j++) {
                var e = p.effects[j];
                if (e.durationType === 'sec' && !e.permanent) {
                    e.duration = Math.ceil(e.duration / ROUND_SECONDS_OUT);
                    e.durationType = 'round';
                }
            }
            p.effects = p.effects.filter(function (e) {
                return e.permanent || e.isInstant || e.isGameDuration || e.duration > 0;
            });
            p.hand = [];
            p.role = '';
            p.bid = null;
            p.hasGrabbed = false;
        }
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function applySeconds() {
        var secInput = document.getElementById('dousow-sec');
        var sec = parseInt(secInput && secInput.value) || 0;
        if (sec <= 0) return;
        pushUndo();
        G.intermissionSeconds += sec;
        for (var i = 0; i < 3; i++) {
            var p = G.players[i];
            for (var j = 0; j < p.effects.length; j++) {
                var e = p.effects[j];
                if (e.durationType === 'sec' && !e.permanent) {
                    e.duration = Math.max(0, e.duration - sec);
                }
            }
            p.effects = p.effects.filter(function (e) {
                return e.permanent || e.durationType !== 'sec' || e.duration > 0;
            });
        }
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function triggerRule14For(playerIdx) {
        pushUndo();
        handleExpandEffect(playerIdx, 1);
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function editHand(playerIdx) {
        var p = G.players[playerIdx];
        var cur = p.hand.join(' ');
        var input = prompt('输入该玩家手牌（格式如 34567 10JQKA 大小）：', cur);
        if (input === null) return;
        var cards = parseCards(input);
        if (cards.length === 0) { alert('无法解析'); return; }
        pushUndo();
        p.hand = sortHand(cards);
        invalidateCache();
        saveNow(); renderUI(); injectState();
    }

    function clothesText(p) {
        if (!p.clothes || p.clothes.length === 0) return '全裸';
        var pending = p.pendingStrip || 0;
        var remain = p.clothes.length - pending;
        var s = '剩余 ' + remain + ' 件';
        if (pending > 0) s += '（还要脱 ' + pending + ' 件）';
        return s;
    }

    function buildStateText() {
        if (stateTextCache) return stateTextCache;
        var txt = '【斗母猪当前状态】\n';
        txt += '阶段：' + phaseName(G.phase) + ' | 局数：' + G.roundNumber + ' | 倍数：' + G.multiplier + '\n';
        txt += '当前行动：' + (G.players[G.currentTurn] ? G.players[G.currentTurn].name : '无') + '\n\n';
        if (G.bottomCards && G.bottomCards.length > 0) {
            txt += '底牌（未公开，不可看）：' + G.bottomCards.join(' ') + '\n\n';
        }
        for (var i = 0; i < 3; i++) {
            var p = G.players[i];
            txt += '【' + p.name + '】角色：' + (p.role || '未定') + ' | 分数：' + p.score + ' | 手牌数：' + p.hand.length + '\n';
            txt += '手牌：' + (p.hand.join(' ') || '无') + '\n';
            txt += clothesText(p) + '\n';
            txt += '连续当母猪：' + G.consecutiveMother[i] + '\n';
            if (p.effects.length) {
                txt += '效果：\n';
                for (var j = 0; j < p.effects.length; j++) {
                    var e = p.effects[j];
                    var dur;
                    if (e.permanent) dur = '永久';
                    else if (e.isInstant) dur = '剩余' + (e.remainingCount || 0) + '次';
                    else if (e.isGameDuration) dur = '剩余' + e.duration + '局';
                    else dur = e.duration + (e.durationType === 'sec' ? '秒' : '轮');
                    txt += '  - ' + e.name + '（层数' + (e.stacks || 1) + '，' + dur + '）';
                    if (e.boy && e.boyDuration > 0) txt += ' | 男孩：' + e.boy + '（' + e.boyDuration + '轮）';
                    else if (e.boy) txt += ' | 男孩：' + e.boy;
                    txt += '\n    ' + e.desc + '\n';
                }
            } else {
                txt += '效果：无\n';
            }
            txt += '\n';
        }
        if (G.lastPlayed) {
            txt += '上一手：' + G.players[G.lastPlayed.playerIdx].name + ' 出 ' + G.lastPlayed.cards.join(' ') + (G.lastPlayed.legal ? '' : '（非法）') + '\n';
        } else if (G.phase === 'play') {
            txt += '当前自由出牌\n';
        }
        if (G.playPile.length) {
            var recent = G.playPile.slice(-PILE_INJECT).map(function (x) { return x.player + ':' + x.cards; }).join(' → ');
            txt += '出牌堆：' + recent + '\n';
        }
        stateTextCache = txt;
        return txt;
    }

    function injectState() {
        try {
            var c = getCtx();
            if (c && c.setExtensionPrompt) c.setExtensionPrompt(EXT_NAME, buildStateText(), 0, 0, false, 0);
        } catch (e) {}
        window.DouSowStateText = buildStateText();
    }

    function placePanelBottomRight() {
        if (!panel) return;
        var w = window.innerWidth || document.documentElement.clientWidth || 400;
        var h = window.innerHeight || document.documentElement.clientHeight || 800;
        var pw = panel.offsetWidth || 360;
        var ph = panel.offsetHeight || 400;
        var margin = 20;
        var left = w - pw - margin;
        var top = h - ph - margin;
        if (left < margin) left = margin;
        if (top < margin) top = margin;
        panel.style.setProperty('left', left + 'px', 'important');
        panel.style.setProperty('top', top + 'px', 'important');
        panel.style.setProperty('right', 'auto', 'important');
        panel.style.setProperty('bottom', 'auto', 'important');
    }

    function createUI() {
        var old = document.getElementById('dousow-panel');
        if (old) old.remove();
        panel = document.createElement('div');
        panel.id = 'dousow-panel';
        panel.style.setProperty('position', 'fixed', 'important');
        panel.style.setProperty('left', '10px', 'important');
        panel.style.setProperty('top', '80px', 'important');
        panel.style.setProperty('width', '360px', 'important');
        panel.style.setProperty('max-height', '75vh', 'important');
        panel.style.setProperty('background', uiSettings.bgColor || '#4a0e0e', 'important');
        panel.style.setProperty('color', '#ffe0e8', 'important');
        panel.style.setProperty('border', '2px solid #8b1a3a', 'important');
        panel.style.setProperty('border-radius', '12px', 'important');
        panel.style.setProperty('z-index', '2147483647', 'important');
        panel.style.setProperty('font-size', '12px', 'important');
        panel.style.setProperty('overflow', 'hidden', 'important');
        panel.style.setProperty('display', 'flex', 'important');
        panel.style.setProperty('flex-direction', 'column', 'important');
        panel.style.setProperty('box-shadow', '0 4px 24px rgba(139,26,58,0.6)', 'important');
        panel.style.setProperty('cursor', 'move', 'important');

        var head = document.createElement('div');
        head.style.cssText = 'padding:8px 12px;background:linear-gradient(135deg,#8b1a3a,#c23a6a);color:#fff;font-weight:bold;border-radius:10px 10px 0 0;user-select:none;display:flex;justify-content:space-between;align-items:center;';
        var title = document.createElement('span');
        title.textContent = '🐷 斗母猪';
        head.appendChild(title);
        var btns = document.createElement('span');
        function mkIconBtn(icon, title, handler) {
            var b = document.createElement('button');
            b.textContent = icon; b.title = title;
            b.style.cssText = 'background:#fff;color:#8b1a3a;border:none;border-radius:6px;padding:3px 8px;margin-left:3px;font-size:13px;font-weight:bold;cursor:pointer;';
            b.onclick = handler;
            return b;
        }
        btns.appendChild(mkIconBtn('⏱', '超时', doTimeout));
        btns.appendChild(mkIconBtn('👗', '衣物', openClothesEditor));
        btns.appendChild(mkIconBtn('⚙', '效果', openEffectEditor));
        btns.appendChild(mkIconBtn('🎨', '背景', cycleBg));
        btns.appendChild(mkIconBtn('⌂', '归位', function () { userMovedPanel = false; placePanelBottomRight(); }));
        btns.appendChild(mkIconBtn('—', '最小化', function () {
            var b = document.getElementById('ds-body');
            b.style.display = (b.style.display === 'none') ? 'block' : 'none';
        }));
        head.appendChild(btns);
        panel.appendChild(head);

        var body = document.createElement('div');
        body.id = 'ds-body';
        body.style.cssText = 'padding:8px;overflow-y:auto;flex:1;cursor:auto;';
        panel.appendChild(body);
        document.body.appendChild(panel);

        panel.addEventListener('mousedown', function (e) {
            var tag = e.target.tagName;
            if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            isDragging = true; userMovedPanel = true;
            var r = panel.getBoundingClientRect();
            dragOff.x = e.clientX - r.left; dragOff.y = e.clientY - r.top;
        });
        panel.addEventListener('touchstart', function (e) {
            var tag = e.target.tagName;
            if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            isDragging = true; userMovedPanel = true;
            var t = e.touches[0];
            var r = panel.getBoundingClientRect();
            dragOff.x = t.clientX - r.left; dragOff.y = t.clientY - r.top;
        }, { passive: true });
        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            panel.style.setProperty('left', (e.clientX - dragOff.x) + 'px', 'important');
            panel.style.setProperty('top', (e.clientY - dragOff.y) + 'px', 'important');
            panel.style.setProperty('right', 'auto', 'important');
            panel.style.setProperty('bottom', 'auto', 'important');
        });
        document.addEventListener('touchmove', function (e) {
            if (!isDragging) return;
            var t = e.touches[0];
            panel.style.setProperty('left', (t.clientX - dragOff.x) + 'px', 'important');
            panel.style.setProperty('top', (t.clientY - dragOff.y) + 'px', 'important');
            panel.style.setProperty('right', 'auto', 'important');
            panel.style.setProperty('bottom', 'auto', 'important');
        }, { passive: true });
        document.addEventListener('mouseup', function () { isDragging = false; });
        document.addEventListener('touchend', function () { isDragging = false; });

        setTimeout(function () { if (!userMovedPanel) placePanelBottomRight(); }, 50);
        setTimeout(function () { if (!userMovedPanel) placePanelBottomRight(); }, 300);
        setTimeout(function () { if (!userMovedPanel) placePanelBottomRight(); }, 1000);
        window.addEventListener('resize', function () { if (!userMovedPanel) placePanelBottomRight(); });
        return panel;
    }

    function styledBtn(text, fn, opts) {
        opts = opts || {};
        var b = document.createElement('button');
        b.textContent = text;
        b.style.cssText = 'background:' + (opts.bg || '#c23a6a') + ';color:#fff;border:none;border-radius:6px;padding:5px 10px;margin:2px;font-size:11px;cursor:pointer;';
        b.onclick = fn;
        return b;
    }

    function cycleBg() {
        var colors = ['#4a0e0e','#2d0a2d','#0e2a4a','#4a2e0e','#1a0a0a','#3a1a2a','#2a0a0a'];
        var idx = colors.indexOf(uiSettings.bgColor);
        uiSettings.bgColor = colors[(idx + 1) % colors.length];
        if (panel) panel.style.setProperty('background', uiSettings.bgColor, 'important');
        saveLazy();
    }

    function renderUI() {
        if (renderTimer) return;
        renderTimer = setTimeout(function () { renderTimer = null; doRenderUI(); }, 30);
    }

    function effectLine(e) {
        var dur;
        if (e.permanent) dur = '永久';
        else if (e.isInstant) dur = '剩余' + (e.remainingCount || 0) + '次';
        else if (e.isGameDuration) dur = e.duration + '局';
        else dur = e.duration + (e.durationType === 'sec' ? '秒' : '轮');
        var s = '· ' + e.name + (e.stacks > 1 ? '×' + e.stacks : '') + '（' + dur + '）';
        if (e.boy && e.boyDuration > 0) s += '｜男孩 ' + e.boyDuration + '轮';
        return s;
    }

    function doRenderUI() {
        if (!panel) return;
        var body = document.getElementById('ds-body');
        if (!body || !G) return;
        body.innerHTML = '';

        var status = document.createElement('div');
        status.style.cssText = 'padding:6px;background:rgba(255,51,102,0.2);border-radius:6px;margin-bottom:6px;';
        status.textContent = phaseName(G.phase) + ' | 局' + G.roundNumber + ' | 倍数×' + G.multiplier;
        body.appendChild(status);

        if (G.bottomCards && G.bottomCards.length > 0) {
            var bottomInfo = document.createElement('div');
            bottomInfo.style.cssText = 'padding:4px 6px;background:rgba(200,150,50,0.25);border-radius:6px;margin-bottom:6px;font-size:11px;color:#ffddaa;';
            bottomInfo.textContent = '底牌（未公开）：' + G.bottomCards.join(' ');
            body.appendChild(bottomInfo);
        }

        var row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;';
        row.appendChild(styledBtn('🎮 新游戏', startNewGame));
        if (G.phase === 'deal') row.appendChild(styledBtn('🃏 发牌', doDeal));
        if (G.phase === 'rest') row.appendChild(styledBtn('▶ 下一局', nextRound));
        row.appendChild(styledBtn('↩ 撤回', doUndo));
        body.appendChild(row);

        for (var i = 0; i < 3; i++) {
            var p = G.players[i];
            var isCur = (i === G.currentTurn);
            var card = document.createElement('div');
            card.style.cssText = 'margin-bottom:6px;padding:8px;border-radius:8px;background:rgba(139,26,58,0.2);border-left:3px solid ' + (p.role === '母猪' ? '#ff3366' : '#c23a6a') + ';';

            var nameRow = document.createElement('div');
            nameRow.style.cssText = 'font-weight:bold;color:' + (isCur ? '#ff88bb' : '#ffe0e8') + ';';
            nameRow.textContent = p.name + (p.role ? ' (' + p.role + ')' : '') + ' | ' + p.score + '分 | 手牌' + p.hand.length;
            card.appendChild(nameRow);

            var nameInput = document.createElement('input');
            nameInput.type = 'text'; nameInput.value = p.name;
            nameInput.setAttribute('data-name', i);
            nameInput.style.cssText = 'width:70px;background:#2a1010;color:#fff;border:1px solid #666;border-radius:4px;padding:2px 4px;margin-top:2px;font-size:11px;';
            card.appendChild(nameInput);

            var handDiv = document.createElement('div');
            handDiv.style.cssText = 'font-size:10px;word-break:break-all;margin-top:2px;';
            handDiv.textContent = '手牌：' + (p.hand.join(' ') || '无');
            card.appendChild(handDiv);

            var clothesInfo = document.createElement('div');
            clothesInfo.style.cssText = 'font-size:10px;margin-top:2px;color:#ffbbcc;';
            clothesInfo.textContent = clothesText(p);
            card.appendChild(clothesInfo);

            if (p.effects.length) {
                var effDiv = document.createElement('div');
                effDiv.style.cssText = 'font-size:10px;color:#ff99bb;margin-top:2px;';
                for (var j = 0; j < p.effects.length; j++) {
                    var line = document.createElement('div');
                    line.textContent = effectLine(p.effects[j]);
                    effDiv.appendChild(line);
                }
                card.appendChild(effDiv);
            }

            var btnRow = document.createElement('div');
            btnRow.style.cssText = 'margin-top:4px;display:flex;flex-wrap:wrap;gap:2px;';
            btnRow.appendChild(styledBtn('编辑手牌', (function (idx) { return function () { editHand(idx); }; })(i)));
            var has10 = false;
            for (var k = 0; k < p.effects.length; k++) {
                if (p.effects[k].rank === '10' && p.effects[k].isInstant) { has10 = true; break; }
            }
            if (has10) btnRow.appendChild(styledBtn('10减1', (function (idx) { return function () { reduce10(idx); }; })(i)));
            if (G.phase === 'deal') btnRow.appendChild(styledBtn('未上桌', (function (idx) { return function () { triggerRule14For(idx); }; })(i)));
            card.appendChild(btnRow);

            if (G.phase === 'bid' && i === G.currentTurn) {
                var bidRow = document.createElement('div');
                bidRow.style.cssText = 'margin-top:4px;display:flex;flex-wrap:wrap;gap:2px;';
                bidRow.appendChild(styledBtn('不叫', (function (idx) { return function () { doBid(idx, '不叫'); }; })(i)));
                bidRow.appendChild(styledBtn('1', (function (idx) { return function () { doBid(idx, '1'); }; })(i)));
                bidRow.appendChild(styledBtn('2', (function (idx) { return function () { doBid(idx, '2'); }; })(i)));
                bidRow.appendChild(styledBtn('3', (function (idx) { return function () { doBid(idx, '3'); }; })(i)));
                card.appendChild(bidRow);
            }
            if (G.phase === 'grab' && i === G.currentTurn) {
                var grabRow = document.createElement('div');
                grabRow.style.cssText = 'margin-top:4px;display:flex;gap:2px;';
                grabRow.appendChild(styledBtn('抢', (function (idx) { return function () { doGrab(idx, true); }; })(i)));
                grabRow.appendChild(styledBtn('不抢', (function (idx) { return function () { doGrab(idx, false); }; })(i)));
                card.appendChild(grabRow);
            }
            if (G.phase === 'play') {
                var playRow = document.createElement('div');
                playRow.style.cssText = 'margin-top:4px;display:flex;gap:4px;';
                var input = document.createElement('input');
                input.type = 'text'; input.id = 'ds-play-' + i;
                input.placeholder = '如34567';
                input.style.cssText = 'flex:1;background:#2a1010;color:#fff;border:1px solid #666;border-radius:4px;padding:3px 6px;font-size:11px;min-width:0;';
                playRow.appendChild(input);
                playRow.appendChild(styledBtn('出', (function (idx) { return function () {
                    var inp = document.getElementById('ds-play-' + idx);
                    if (inp) doPlay(idx, inp.value);
                }; })(i)));
                playRow.appendChild(styledBtn('不出', (function (idx) { return function () { doPass(idx); }; })(i)));
                card.appendChild(playRow);
            }
            body.appendChild(card);
        }

        if (G.phase === 'rest') {
            var secRow = document.createElement('div');
            secRow.style.cssText = 'margin-top:6px;';
            secRow.textContent = '已过秒数：';
            var secInput = document.createElement('input');
            secInput.type = 'number'; secInput.id = 'dousow-sec';
            secInput.style.cssText = 'width:70px;background:#2a1010;color:#fff;border:1px solid #666;border-radius:4px;padding:3px;';
            secRow.appendChild(secInput);
            secRow.appendChild(styledBtn('确认', applySeconds));
            body.appendChild(secRow);
        }

        if (G.playPile.length) {
            var pile = document.createElement('div');
            pile.style.cssText = 'font-size:10px;color:#ffccdd;margin-top:4px;';
            var recent = G.playPile.slice(-PILE_DISPLAY).map(function (x) { return x.player + ':' + x.cards; }).join(' → ');
            pile.textContent = '出牌堆：' + recent;
            body.appendChild(pile);
        }

        var nameInputs = body.querySelectorAll('[data-name]');
        for (var n = 0; n < nameInputs.length; n++) {
            (function (inp) {
                inp.onchange = function () {
                    var idx = parseInt(inp.getAttribute('data-name'));
                    G.players[idx].name = inp.value || PLAYER_NAMES[idx];
                    invalidateCache(); saveLazy(); injectState();
                };
            })(nameInputs[n]);
        }
    }

    function openClothesEditor() {
        var exist = document.getElementById('dousow-clothes');
        if (exist) exist.remove();
        var div = document.createElement('div');
        div.id = 'dousow-clothes';
        div.style.cssText = 'position:fixed;left:5%;top:5%;width:90%;max-width:520px;max-height:85vh;background:#2a0a12;color:#ffe0e8;padding:14px;border-radius:12px;z-index:2147483646;overflow:auto;border:2px solid #8b1a3a;font-size:12px;';

        var headerRow = document.createElement('div');
        headerRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
        var h = document.createElement('h3');
        h.style.cssText = 'margin:0;color:#ff88aa;';
        h.textContent = '👗 衣物管理';
        headerRow.appendChild(h);
        var rightBtns = document.createElement('span');
        rightBtns.appendChild(styledBtn('↻ 恢复默认', function () {
            if (!confirm('确定恢复默认衣物？当前修改会丢失。')) return;
            for (var i = 0; i < 3; i++) {
                G.players[i].clothes = DEFAULT_CLOTHES[i].slice();
                G.players[i].pendingStrip = 0;
            }
            invalidateCache(); saveNow(); renderUI(); injectState(); renderList();
        }));
        rightBtns.appendChild(styledBtn('✕ 关闭', function () { div.remove(); }));
        headerRow.appendChild(rightBtns);
        div.appendChild(headerRow);

        var hint = document.createElement('div');
        hint.style.cssText = 'font-size:10px;color:#ffaabb;margin-bottom:8px;';
        hint.textContent = '点"脱"移除一件（可撤回）。7 触发后显示"还要脱 N 件"。';
        div.appendChild(hint);

        function renderList() {
            var listContainer = document.getElementById('ds-clothes-list');
            listContainer.innerHTML = '';
            for (var i = 0; i < 3; i++) {
                var p = G.players[i];
                var block = document.createElement('div');
                block.style.cssText = 'border-top:1px solid #5a1a2a;padding:8px 0;';
                var nameLabel = document.createElement('b');
                nameLabel.style.color = '#ff99bb';
                nameLabel.textContent = p.name + (p.role ? ' (' + p.role + ')' : '') + ' — ' + clothesText(p);
                block.appendChild(nameLabel);

                var listDiv = document.createElement('div');
                listDiv.style.marginTop = '4px';
                if (p.clothes.length === 0) {
                    var empty = document.createElement('div');
                    empty.style.cssText = 'font-size:11px;color:#888;';
                    empty.textContent = '（无衣物）';
                    listDiv.appendChild(empty);
                } else {
                    for (var j = 0; j < p.clothes.length; j++) {
                        (function (playerIdx, itemIdx) {
                            var rw = document.createElement('div');
                            rw.style.cssText = 'display:flex;align-items:center;margin-bottom:3px;gap:4px;';
                            var idxSpan = document.createElement('span');
                            idxSpan.style.cssText = 'color:#ffaabb;min-width:20px;';
                            idxSpan.textContent = '#' + (itemIdx + 1);
                            rw.appendChild(idxSpan);
                            var itemInput = document.createElement('input');
                            itemInput.type = 'text';
                            itemInput.value = G.players[playerIdx].clothes[itemIdx];
                            itemInput.style.cssText = 'flex:1;background:#1a0508;color:#ffe0e8;border:1px solid #c23a6a;border-radius:4px;padding:3px 6px;';
                            itemInput.onchange = function () {
                                G.players[playerIdx].clothes[itemIdx] = itemInput.value;
                                saveLazy(); injectState(); renderUI();
                            };
                            rw.appendChild(itemInput);
                            rw.appendChild(styledBtn('脱', function () {
                                pushUndo();
                                G.players[playerIdx].clothes.splice(itemIdx, 1);
                                if (G.players[playerIdx].pendingStrip > 0) {
                                    G.players[playerIdx].pendingStrip = Math.max(0, G.players[playerIdx].pendingStrip - 1);
                                }
                                invalidateCache();
                                saveNow(); injectState(); renderUI(); renderList();
                            }, { bg: '#8b1a3a' }));
                            listDiv.appendChild(rw);
                        })(i, j);
                    }
                }
                block.appendChild(listDiv);

                var btnLine = document.createElement('div');
                btnLine.style.cssText = 'margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;';
                btnLine.appendChild(styledBtn('+ 添加衣物', (function (playerIdx) {
                    return function () {
                        G.players[playerIdx].clothes.push('新衣物');
                        saveLazy(); injectState(); renderUI(); renderList();
                    };
                })(i)));
                if (G.players[i].pendingStrip > 0) {
                    btnLine.appendChild(styledBtn('已脱完', (function (playerIdx) {
                        return function () {
                            G.players[playerIdx].pendingStrip = 0;
                            invalidateCache(); saveNow(); injectState(); renderUI(); renderList();
                        };
                    })(i), { bg: '#5a8a3a' }));
                }
                block.appendChild(btnLine);
                listContainer.appendChild(block);
            }
        }

        var listContainer = document.createElement('div');
        listContainer.id = 'ds-clothes-list';
        div.appendChild(listContainer);
        document.body.appendChild(div);
        renderList();
    }

    function openEffectEditor() {
        var exist = document.getElementById('dousow-editor');
        if (exist) exist.remove();
        var div = document.createElement('div');
        div.id = 'dousow-editor';
        div.style.cssText = 'position:fixed;left:5%;top:5%;width:90%;max-width:520px;max-height:85vh;background:#2a0a12;color:#ffe0e8;padding:14px;border-radius:12px;z-index:2147483646;overflow:auto;border:2px solid #8b1a3a;font-size:12px;';
        var headerRow = document.createElement('div');
        headerRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
        var h = document.createElement('h3');
        h.style.cssText = 'margin:0;color:#ff88aa;';
        h.textContent = '⚙ 效果编辑器';
        headerRow.appendChild(h);
        headerRow.appendChild(styledBtn('✕ 关闭', function () { div.remove(); }));
        div.appendChild(headerRow);

        var allRanks = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','小王','大王'];
        for (var i = 0; i < allRanks.length; i++) {
            var r = allRanks[i];
            var e = effectsDB[r] || {};
            var locked = e.locked;
            var block = document.createElement('div');
            block.style.cssText = 'border-top:1px solid #5a1a2a;padding:6px 0;';
            var label = document.createElement('b');
            label.style.cssText = 'color:#ff99bb;';
            label.textContent = r + (locked ? ' (锁定)' : '');
            block.appendChild(label);
            var descArea = document.createElement('textarea');
            descArea.setAttribute('data-k', r); descArea.setAttribute('data-f', 'desc');
            descArea.style.cssText = 'width:100%;height:40px;background:#1a0508;color:#ffe0e8;border:1px solid #c23a6a;border-radius:4px;margin-top:3px;font-size:11px;';
            descArea.value = e.desc || '';
            if (locked) descArea.readOnly = true;
            block.appendChild(descArea);
            var durDiv = document.createElement('div');
            durDiv.style.cssText = 'margin-top:3px;';
            durDiv.textContent = '单次轮数：';
            var durInput = document.createElement('input');
            durInput.type = 'number';
            durInput.setAttribute('data-k', r); durInput.setAttribute('data-f', 'duration');
            durInput.value = (e.duration != null ? e.duration : 1);
            durInput.style.cssText = 'width:50px;background:#1a0508;color:#ffe0e8;border:1px solid #c23a6a;border-radius:4px;';
            if (locked) durInput.disabled = true;
            durDiv.appendChild(durInput);
            durDiv.appendChild(document.createTextNode(' 叠加强度：'));
            var stackInput = document.createElement('input');
            stackInput.type = 'checkbox';
            stackInput.setAttribute('data-k', r); stackInput.setAttribute('data-f', 'stackIntensity');
            stackInput.checked = !!e.stackIntensity;
            if (locked) stackInput.disabled = true;
            durDiv.appendChild(stackInput);
            block.appendChild(durDiv);
            var boyDiv = document.createElement('div');
            boyDiv.style.cssText = 'margin-top:3px;';
            boyDiv.textContent = '男孩效果：';
            var boyInput = document.createElement('input');
            boyInput.type = 'text';
            boyInput.setAttribute('data-k', r); boyInput.setAttribute('data-f', 'boy');
            boyInput.value = e.boy || '';
            boyInput.style.cssText = 'width:70%;background:#1a0508;color:#ffe0e8;border:1px solid #c23a6a;border-radius:4px;padding:3px 6px;';
            if (locked) boyInput.readOnly = true;
            boyDiv.appendChild(boyInput);
            block.appendChild(boyDiv);
            div.appendChild(block);
        }
        var btnRow = document.createElement('div');
        btnRow.style.marginTop = '10px';
        btnRow.appendChild(styledBtn('保存全部', saveEffects));
        btnRow.appendChild(styledBtn('导出JSON', exportEffects));
        btnRow.appendChild(styledBtn('导入JSON', importEffects));
        div.appendChild(btnRow);
        var fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.id = 'ds-import-file';
        fileInput.accept = '.json'; fileInput.style.display = 'none';
        div.appendChild(fileInput);
        document.body.appendChild(div);
    }

    function saveEffects() {
        var els = document.querySelectorAll('#dousow-editor [data-k]');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            var k = el.getAttribute('data-k');
            var f = el.getAttribute('data-f');
            if (!effectsDB[k]) effectsDB[k] = {};
            if (f === 'stackIntensity') effectsDB[k][f] = el.checked;
            else if (f === 'duration') effectsDB[k][f] = parseInt(el.value) || 0;
            else effectsDB[k][f] = el.value;
        }
        invalidateCache(); saveNow();
        alert('已保存');
    }

    function exportEffects() {
        var blob = new Blob([JSON.stringify(effectsDB, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'dousow_effects.json'; a.click();
    }

    function importEffects() {
        var input = document.getElementById('ds-import-file');
        input.onchange = function (ev) {
            var file = ev.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (e2) {
                try {
                    effectsDB = Object.assign({}, DEFAULT_EFFECTS, JSON.parse(e2.target.result));
                    invalidateCache(); saveNow();
                    var ed = document.getElementById('dousow-editor');
                    if (ed) ed.remove();
                    openEffectEditor();
                } catch (err) { alert('导入失败：' + err.message); }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function setupEvents() {
        try {
            var c = getCtx();
            if (!c || !c.eventSource || !c.eventTypes) return;
            c.eventSource.on(c.eventTypes.GENERATION_STARTED, function () {
                if (G && G.phase !== 'idle') injectState();
            });
        } catch (e) {}
    }

    function exposeAPI() {
        window.DouSow = {
            startNewGame: startNewGame, doDeal: doDeal, doBid: doBid, doGrab: doGrab,
            doPlay: doPlay, doPass: doPass, doTimeout: doTimeout, doUndo: doUndo,
            nextRound: nextRound, applySeconds: applySeconds, reduce10: reduce10,
            editHand: editHand, openEffectEditor: openEffectEditor, openClothesEditor: openClothesEditor,
            placeBottomRight: placePanelBottomRight,
            getState: function () { return G; }, getStateText: buildStateText
        };
    }

    function init() {
        loadAll();
        createUI();
        doRenderUI();
        injectState();
        setupEvents();
        exposeAPI();
        console.log('[DouSow] 插件已加载 v11');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();