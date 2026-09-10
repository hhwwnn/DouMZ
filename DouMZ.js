// DouMZ.js - 斗母猪 SillyTavern 扩展（完整版 v3）
(function () {
    'use strict';

    const EXT_NAME = 'DouSow';
    const STORAGE_KEY = 'dousow_state_v6';
    const EFFECT_KEY = 'dousow_effects_v6';
    const UI_KEY = 'dousow_ui_v6';
    const PLAYER_NAMES = ['塞拉', '诺亚', '薇拉'];
    const TRIGGER_ORDER = ['3','8','4','5','6','7','10','A','2','J','Q','K','小王','9'];
    const RANK_VALUE = { '3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':13,'Q':14,'K':15,'A':11,'2':12,'小王':16,'大王':17 };

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

    let G = null;
    let effectsDB = JSON.parse(JSON.stringify(DEFAULT_EFFECTS));
    let uiSettings = { bgColor: '#4a0e0e' };
    let panel = null;
    let isDragging = false;
    let dragOff = { x: 0, y: 0 };

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
            players: PLAYER_NAMES.map(function (name) {
                return {
                    name: name, role: '', score: 1000, hand: [], effects: [],
                    clothes: [], baseScore: 0.5, bid: null, hasGrabbed: false
                };
            }),
            bottomCards: [], playPile: [], bombCount: 0, rocketCount: 0,
            spring: false, antiSpring: false,
            actionHistory: [], pendingEffects: [],
            grabQueue: [], grabQueueIdx: 0,
            intermissionSeconds: 0
        };
    }

    function saveAll() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(G));
            localStorage.setItem(EFFECT_KEY, JSON.stringify(effectsDB));
            localStorage.setItem(UI_KEY, JSON.stringify(uiSettings));
        } catch (e) { console.warn('[DouSow] save error', e); }
    }

    function loadAll() {
        try {
            var s = localStorage.getItem(STORAGE_KEY);
            if (s) G = JSON.parse(s);
            var e = localStorage.getItem(EFFECT_KEY);
            if (e) effectsDB = Object.assign({}, DEFAULT_EFFECTS, JSON.parse(e));
            var u = localStorage.getItem(UI_KEY);
            if (u) uiSettings = Object.assign(uiSettings, JSON.parse(u));
        } catch (err) { console.warn('[DouSow] load error', err); }
        if (!G) G = defaultState();
        if (!Array.isArray(G.hasActed)) G.hasActed = [false, false, false];
        for (var i = 0; i < G.players.length; i++) {
            var c = G.players[i].clothes;
            if (typeof c === 'string') {
                G.players[i].clothes = c.trim() ? c.split(/[,，\s]+/).filter(Boolean) : [];
            } else if (!Array.isArray(c)) {
                G.players[i].clothes = [];
            }
        }
    }

    function pushUndo() {
        G.actionHistory.push(JSON.stringify(G));
        if (G.actionHistory.length > 200) G.actionHistory.shift();
    }

    function doUndo() {
        if (!G.actionHistory || G.actionHistory.length === 0) { alert('没有可撤回的操作'); return; }
        var prev = G.actionHistory.pop();
        var hist = G.actionHistory;
        G = JSON.parse(prev);
        G.actionHistory = hist;
        saveAll(); renderUI(); injectState();
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

    // 修复：第1次当母猪只翻倍，无额外加成；从第2次起才有额外触发
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
            var p7 = G.players[playerIdx];
            if (p7.clothes && p7.clothes.length > 0) {
                p7.clothes.pop();
                return;
            }
            handleExpandEffect(playerIdx, count);
            return;
        }

        if (rank === '小王') {
            var existing = null;
            for (var i = 0; i < G.players[playerIdx].effects.length; i++) {
                var e = G.players[playerIdx].effects[i];
                if (e.rank === '小王' && !e.permanent) { existing = e; break; }
            }
            if (existing) { existing.duration += def.duration * count; }
            else {
                G.players[playerIdx].effects.push({
                    rank: '小王', name: '小王', desc: def.desc,
                    duration: def.duration * count, permanent: false,
                    stacks: 1, boy: '', boyDuration: 0
                });
            }
            return;
        }

        if (rank === '10') {
            var ex10 = null;
            for (var j = 0; j < G.players[playerIdx].effects.length; j++) {
                var e10 = G.players[playerIdx].effects[j];
                if (e10.rank === '10' && !e10.permanent) { ex10 = e10; break; }
            }
            if (ex10) { ex10.remainingCount = (ex10.remainingCount || 0) + count; }
            else {
                G.players[playerIdx].effects.push({
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
        var durationValue = isPermanent ? 0 : def.duration * count;

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
                if (!isPermanent) existingE.duration += durationValue;
                if (isPermanent && def.boy) {
                    existingE.boyDuration = (existingE.boyDuration || 0) + 1;
                } else if (!isPermanent && def.boy) {
                    existingE.boyDuration = (existingE.boyDuration || 0) + durationValue;
                }
            } else {
                target.effects.push({
                    rank: rank, name: def.name, desc: def.desc,
                    duration: durationValue, permanent: isPermanent,
                    stacks: def.stackIntensity ? count : 1,
                    boy: def.boy || '',
                    boyDuration: isPermanent && def.boy ? 1 : (def.boy ? durationValue : 0)
                });
            }
        }
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
            p.effects.push({
                rank: '7_expand', name: '7扩张',
                desc: '阴道被魔法撑开，内壁扩张合不拢。层数越高打开部位越多。',
                duration: 1, permanent: false,
                stacks: Math.min(count, 6),
                boy: '', boyDuration: 0, isGameDuration: true
            });
        }
    }

    function applyRankEffect(playerIdx, rank, baseCount) {
        if (rank === '大王') return;
        var hasLock = hasSowLock(playerIdx);
        if (hasLock && rank !== '小王' && rank !== '10') {
            G.pendingEffects.push({ playerIdx: playerIdx, rank: rank, count: baseCount });
            return;
        }
        var actualCount = calcTriggerCount(playerIdx, baseCount);
        addEffect(playerIdx, rank, actualCount);
    }

    function triggerEffects(playerIdx, cards) {
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
        var has9 = counts['9'] > 0;
        var has2 = counts['2'] > 0;
        var has10 = counts['10'] > 0;
        for (var j = 0; j < TRIGGER_ORDER.length; j++) {
            var rank = TRIGGER_ORDER[j];
            if (rank === '9') continue;
            if (!counts[rank]) continue;
            applyRankEffect(playerIdx, rank, counts[rank]);
        }
        if (has9) {
            if (has2 || has10) {
                G.pendingEffects.push({ playerIdx: playerIdx, rank: '9', count: counts['9'], type: 'nine_delay' });
            } else {
                applyRankEffect(playerIdx, '9', counts['9']);
            }
        }
    }

    function triggerRocket(playerIdx) {
        G.rocketCount++;
        G.multiplier += 2;
        for (var i = 0; i < TRIGGER_ORDER.length; i++) {
            var rank = TRIGGER_ORDER[i];
            var actual = calcTriggerCount(playerIdx, 4);
            addEffect(playerIdx, rank, actual);
        }
        var sowCount = calcTriggerCount(playerIdx, 1);
        addEffect(playerIdx, '小王', sowCount);
    }

    function flushPendingEffects(playerIdx) {
        var pending = [];
        var rest = [];
        for (var i = 0; i < G.pendingEffects.length; i++) {
            if (G.pendingEffects[i].playerIdx === playerIdx) pending.push(G.pendingEffects[i]);
            else rest.push(G.pendingEffects[i]);
        }
        G.pendingEffects = rest;
        if (pending.length === 0) return;
        var nineDelays = [], normal = [];
        for (var j = 0; j < pending.length; j++) {
            if (pending[j].type === 'nine_delay') nineDelays.push(pending[j]);
            else normal.push(pending[j]);
        }
        var rankCounts = {};
        for (var k = 0; k < normal.length; k++) {
            rankCounts[normal[k].rank] = (rankCounts[normal[k].rank] || 0) + normal[k].count;
        }
        for (var l = 0; l < nineDelays.length; l++) {
            rankCounts['9'] = (rankCounts['9'] || 0) + nineDelays[l].count;
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
                if (e.rank === '小王' && !e.permanent) {
                    e.duration = Math.max(0, e.duration - 1);
                }
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

    // 新增：切换到某玩家回合，如果该玩家本局已行动过，则先减其轮型效果时长
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
                if (e.remainingCount <= 0) { p.effects.splice(i, 1); }
                break;
            }
        }
        saveAll(); renderUI(); injectState();
    }

    function startNewGame() {
        pushUndo();
        G = defaultState();
        G.phase = 'deal';
        G.bidStartIndex = 0;
        saveAll(); renderUI(); injectState();
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
        G.players[0].hand = deck.slice(0, 17);
        G.players[1].hand = deck.slice(17, 34);
        G.players[2].hand = deck.slice(34, 51);
        G.bottomCards = deck.slice(51);
        G.phase = 'bid';
        G.currentTurn = G.bidStartIndex;
        G.hasActed = [false, false, false];
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
        saveAll(); renderUI(); injectState();
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
            else {
                p.effects.push({
                    rank: '不叫惩罚', name: '不叫惩罚',
                    desc: '肛门敏感度翻3倍，连续不叫叠加',
                    duration: 2, permanent: false, stacks: 1,
                    boy: '', boyDuration: 0
                });
            }
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
                saveAll(); renderUI(); injectState();
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
        saveAll(); renderUI(); injectState();
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
        saveAll(); renderUI(); injectState();
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
        G.bottomCards = [];
        triggerEffects(G.motherIndex, bottomCopy);
        G.phase = 'play';
        G.currentTurn = G.motherIndex;
        G.hasActed = [false, false, false];
        saveAll(); renderUI(); injectState();
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
        triggerEffects(playerIdx, cards);
        if (p.hand.length === 0) { endRound(playerIdx); return; }
        G.hasActed[playerIdx] = true;
        advanceTurn((playerIdx + 1) % 3);
        saveAll(); renderUI(); injectState();
    }

    function doPass(playerIdx) {
        pushUndo();
        G.playPile.push({ player: G.players[playerIdx].name, cards: '不出' });
        G.hasActed[playerIdx] = true;
        advanceTurn((playerIdx + 1) % 3);
        saveAll(); renderUI(); injectState();
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
            G.players[q].effects = G.players[q].effects.filter(function (e) { return !e.isGameDuration; });
        }
        for (var r = 0; r < 3; r++) {
            var pp = G.players[r];
            for (var s = 0; s < pp.effects.length; s++) {
                var eff = pp.effects[s];
                if (!eff.permanent && !eff.isInstant && !eff.isGameDuration && eff.duration > 0) {
                    eff.duration *= 180;
                    eff.durationType = 'sec';
                }
            }
        }
        G.phase = 'rest';
        G.intermissionSeconds = 0;
        saveAll(); renderUI(); injectState();
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
        for (var i = 0; i < 3; i++) {
            G.players[i].hand = [];
            G.players[i].role = '';
            G.players[i].bid = null;
            G.players[i].hasGrabbed = false;
        }
        saveAll(); renderUI(); injectState();
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
        saveAll(); renderUI(); injectState();
    }

    function triggerRule14() {
        pushUndo();
        for (var i = 0; i < 3; i++) handleExpandEffect(i, 1);
        saveAll(); renderUI(); injectState();
    }

    function buildStateText() {
        var txt = '【斗母猪当前状态】\n';
        txt += '阶段：' + phaseName(G.phase) + ' | 局数：' + G.roundNumber + ' | 倍数：' + G.multiplier + '\n';
        txt += '当前行动：' + (G.players[G.currentTurn] ? G.players[G.currentTurn].name : '无') + '\n\n';
        for (var i = 0; i < 3; i++) {
            var p = G.players[i];
            txt += '【' + p.name + '】角色：' + (p.role || '未定') + ' | 分数：' + p.score + ' | 手牌数：' + p.hand.length + '\n';
            txt += '手牌：' + (p.hand.join(' ') || '无') + '\n';
            var clothesText = (p.clothes && p.clothes.length > 0) ? p.clothes.join('、') : '（未填写）';
            txt += '衣物：' + clothesText + '\n';
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
                    if (e.boy) txt += ' | 男孩：' + e.boy;
                    txt += '\n    ' + e.desc + '\n';
                }
            } else {
                txt += '效果：无\n';
            }
            txt += '\n';
        }
        if (G.playPile.length) {
            var recent = G.playPile.slice(-8).map(function (x) { return x.player + ':' + x.cards; }).join(' → ');
            txt += '出牌堆：' + recent + '\n';
        }
        return txt;
    }

    function injectState() {
        try {
            var c = window.SillyTavern.getContext();
            if (c && c.setExtensionPrompt) {
                c.setExtensionPrompt(EXT_NAME, buildStateText(), 1, 0, false, 0);
            }
        } catch (e) { console.warn('[DouSow] inject error', e); }
        window.DouSowStateText = buildStateText();
    }

    function createUI() {
        var old = document.getElementById('dousow-panel');
        if (old) old.remove();

        panel = document.createElement('div');
        panel.id = 'dousow-panel';
        panel.style.position = 'fixed';
        panel.style.left = '10px';
        panel.style.top = '80px';
        panel.style.width = '360px';
        panel.style.maxHeight = '75vh';
        panel.style.background = uiSettings.bgColor || '#4a0e0e';
        panel.style.color = '#ffe0e8';
        panel.style.border = '2px solid #8b1a3a';
        panel.style.borderRadius = '12px';
        panel.style.zIndex = '2147483647';
        panel.style.fontSize = '12px';
        panel.style.overflow = 'hidden';
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';
        panel.style.boxShadow = '0 4px 24px rgba(139,26,58,0.6)';

        var head = document.createElement('div');
        head.id = 'ds-head';
        head.style.padding = '8px 12px';
        head.style.background = '#8b1a3a';
        head.style.color = '#fff';
        head.style.fontWeight = 'bold';
        head.style.borderRadius = '10px 10px 0 0';
        head.style.cursor = 'move';
        head.style.userSelect = 'none';
        head.style.display = 'flex';
        head.style.justifyContent = 'space-between';
        head.style.alignItems = 'center';

        var title = document.createElement('span');
        title.textContent = '🐷 斗母猪';
        head.appendChild(title);

        var btns = document.createElement('span');

        var clothesBtn = document.createElement('button');
        clothesBtn.textContent = '👗'; clothesBtn.title = '衣物管理';
        btns.appendChild(clothesBtn);

        var editBtn = document.createElement('button');
        editBtn.textContent = '⚙'; editBtn.title = '效果编辑';
        btns.appendChild(editBtn);

        var bgBtn = document.createElement('button');
        bgBtn.textContent = '🎨'; bgBtn.title = '换背景色';
        btns.appendChild(bgBtn);

        var minBtn = document.createElement('button');
        minBtn.textContent = '—'; minBtn.title = '最小化';
        btns.appendChild(minBtn);

        head.appendChild(btns);
        panel.appendChild(head);

        var body = document.createElement('div');
        body.id = 'ds-body';
        body.style.padding = '8px';
        body.style.overflowY = 'auto';
        body.style.flex = '1';
        panel.appendChild(body);

        document.body.appendChild(panel);

        editBtn.onclick = openEffectEditor;
        clothesBtn.onclick = openClothesEditor;
        bgBtn.onclick = cycleBg;
        minBtn.onclick = function () {
            var b = document.getElementById('ds-body');
            b.style.display = (b.style.display === 'none') ? 'block' : 'none';
        };

        head.addEventListener('mousedown', function (e) {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            var r = panel.getBoundingClientRect();
            dragOff.x = e.clientX - r.left;
            dragOff.y = e.clientY - r.top;
        });
        head.addEventListener('touchstart', function (e) {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            var t = e.touches[0];
            var r = panel.getBoundingClientRect();
            dragOff.x = t.clientX - r.left;
            dragOff.y = t.clientY - r.top;
        }, { passive: true });
        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            panel.style.left = (e.clientX - dragOff.x) + 'px';
            panel.style.top = (e.clientY - dragOff.y) + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });
        document.addEventListener('touchmove', function (e) {
            if (!isDragging) return;
            var t = e.touches[0];
            panel.style.left = (t.clientX - dragOff.x) + 'px';
            panel.style.top = (t.clientY - dragOff.y) + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        }, { passive: true });
        document.addEventListener('mouseup', function () { isDragging = false; });
        document.addEventListener('touchend', function () { isDragging = false; });

        return panel;
    }

    function mkBtn(text, fn) {
        var b = document.createElement('button');
        b.textContent = text;
        b.style.margin = '2px';
        b.onclick = fn;
        return b;
    }

    function cycleBg() {
        var colors = ['#4a0e0e','#2d0a2d','#0e2a4a','#4a2e0e','#1a0a0a','#3a1a2a','#2a0a0a'];
        var idx = colors.indexOf(uiSettings.bgColor);
        uiSettings.bgColor = colors[(idx + 1) % colors.length];
        if (panel) panel.style.background = uiSettings.bgColor;
        saveAll();
    }

    function renderUI() {
        if (!panel) return;
        var body = document.getElementById('ds-body');
        if (!body || !G) return;
        body.innerHTML = '';

        var status = document.createElement('div');
        status.style.padding = '6px';
        status.style.background = 'rgba(255,51,102,0.15)';
        status.style.borderRadius = '6px';
        status.style.marginBottom = '6px';
        status.textContent = phaseName(G.phase) + ' | 局' + G.roundNumber + ' | 倍数×' + G.multiplier;
        body.appendChild(status);

        var row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexWrap = 'wrap';
        row.style.gap = '4px';
        row.style.marginBottom = '6px';

        row.appendChild(mkBtn('🎮 新游戏', startNewGame));
        if (G.phase === 'deal') row.appendChild(mkBtn('🃏 发牌', doDeal));
        if (G.phase === 'deal') row.appendChild(mkBtn('⚠ 规则14', triggerRule14));
        if (G.phase === 'rest') row.appendChild(mkBtn('▶ 下一局', nextRound));
        row.appendChild(mkBtn('↩ 撤回', doUndo));
        body.appendChild(row);

        for (var i = 0; i < 3; i++) {
            var p = G.players[i];
            var isCur = (i === G.currentTurn);

            var card = document.createElement('div');
            card.style.marginBottom = '6px';
            card.style.padding = '8px';
            card.style.borderRadius = '8px';
            card.style.background = 'rgba(139,26,58,0.15)';
            card.style.borderLeft = '3px solid ' + (p.role === '母猪' ? '#ff3366' : '#c23a6a');

            var nameRow = document.createElement('div');
            nameRow.style.fontWeight = 'bold';
            nameRow.style.color = isCur ? '#ff66aa' : '#ffe0e8';
            nameRow.textContent = p.name + (p.role ? ' (' + p.role + ')' : '') + ' | ' + p.score + '分 | 手牌' + p.hand.length;
            card.appendChild(nameRow);

            var nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = p.name;
            nameInput.setAttribute('data-name', i);
            nameInput.style.width = '70px';
            nameInput.style.background = '#2a1010';
            nameInput.style.color = '#fff';
            nameInput.style.border = '1px solid #666';
            nameInput.style.marginTop = '2px';
            card.appendChild(nameInput);

            var handDiv = document.createElement('div');
            handDiv.style.fontSize = '10px';
            handDiv.style.wordBreak = 'break-all';
            handDiv.style.marginTop = '2px';
            handDiv.textContent = '手牌：' + (p.hand.join(' ') || '无');
            card.appendChild(handDiv);

            var clothesInfo = document.createElement('div');
            clothesInfo.style.fontSize = '10px';
            clothesInfo.style.marginTop = '2px';
            clothesInfo.style.color = '#ffbbcc';
            var clothesText = (p.clothes && p.clothes.length > 0) ? ('共' + p.clothes.length + '件：' + p.clothes.join('、')) : '无衣物';
            clothesInfo.textContent = '衣物：' + clothesText;
            card.appendChild(clothesInfo);

            if (p.effects.length) {
                var effDiv = document.createElement('div');
                effDiv.style.fontSize = '10px';
                effDiv.style.color = '#ff99bb';
                effDiv.style.marginTop = '2px';
                for (var j = 0; j < p.effects.length; j++) {
                    var e = p.effects[j];
                    var dur;
                    if (e.permanent) dur = '永久';
                    else if (e.isInstant) dur = '剩余' + (e.remainingCount || 0) + '次';
                    else if (e.isGameDuration) dur = e.duration + '局';
                    else dur = e.duration + (e.durationType === 'sec' ? '秒' : '轮');
                    var line = document.createElement('div');
                    line.textContent = '· ' + e.name + (e.stacks > 1 ? '×' + e.stacks : '') + '（' + dur + '）';
                    effDiv.appendChild(line);
                }
                card.appendChild(effDiv);
            }

            var has10 = false;
            for (var k = 0; k < p.effects.length; k++) {
                if (p.effects[k].rank === '10' && p.effects[k].isInstant) { has10 = true; break; }
            }
            if (has10) {
                var tenRow = document.createElement('div');
                tenRow.style.marginTop = '4px';
                tenRow.appendChild(mkBtn('10减1', (function (idx) { return function () { reduce10(idx); }; })(i)));
                card.appendChild(tenRow);
            }

            if (G.phase === 'bid' && i === G.currentTurn) {
                var bidRow = document.createElement('div');
                bidRow.style.marginTop = '4px';
                bidRow.appendChild(mkBtn('不叫', (function (idx) { return function () { doBid(idx, '不叫'); }; })(i)));
                bidRow.appendChild(mkBtn('1', (function (idx) { return function () { doBid(idx, '1'); }; })(i)));
                bidRow.appendChild(mkBtn('2', (function (idx) { return function () { doBid(idx, '2'); }; })(i)));
                bidRow.appendChild(mkBtn('3', (function (idx) { return function () { doBid(idx, '3'); }; })(i)));
                card.appendChild(bidRow);
            }
            if (G.phase === 'grab' && i === G.currentTurn) {
                var grabRow = document.createElement('div');
                grabRow.style.marginTop = '4px';
                grabRow.appendChild(mkBtn('抢', (function (idx) { return function () { doGrab(idx, true); }; })(i)));
                grabRow.appendChild(mkBtn('不抢', (function (idx) { return function () { doGrab(idx, false); }; })(i)));
                card.appendChild(grabRow);
            }
            if (G.phase === 'play') {
                var playRow = document.createElement('div');
                playRow.style.marginTop = '4px';
                playRow.style.display = 'flex';
                playRow.style.gap = '4px';
                var input = document.createElement('input');
                input.type = 'text';
                input.id = 'ds-play-' + i;
                input.placeholder = '如34567 或10JQKA';
                input.style.flex = '1';
                input.style.background = '#2a1010';
                input.style.color = '#fff';
                input.style.border = '1px solid #666';
                playRow.appendChild(input);
                playRow.appendChild(mkBtn('出', (function (idx) {
                    return function () {
                        var inp = document.getElementById('ds-play-' + idx);
                        if (inp) doPlay(idx, inp.value);
                    };
                })(i)));
                playRow.appendChild(mkBtn('不出', (function (idx) { return function () { doPass(idx); }; })(i)));
                card.appendChild(playRow);
            }

            body.appendChild(card);
        }

        if (G.phase === 'rest') {
            var secRow = document.createElement('div');
            secRow.style.marginTop = '6px';
            secRow.textContent = '已过秒数：';
            var secInput = document.createElement('input');
            secInput.type = 'number';
            secInput.id = 'dousow-sec';
            secInput.style.width = '70px';
            secRow.appendChild(secInput);
            secRow.appendChild(mkBtn('确认', applySeconds));
            body.appendChild(secRow);
        }

        if (G.playPile.length) {
            var pile = document.createElement('div');
            pile.style.fontSize = '10px';
            pile.style.color = '#ffccdd';
            pile.style.marginTop = '4px';
            var recent = G.playPile.slice(-6).map(function (x) { return x.player + ':' + x.cards; }).join(' → ');
            pile.textContent = '出牌堆：' + recent;
            body.appendChild(pile);
        }

        var nameInputs = body.querySelectorAll('[data-name]');
        for (var n = 0; n < nameInputs.length; n++) {
            (function (inp) {
                inp.onchange = function () {
                    var idx = parseInt(inp.getAttribute('data-name'));
                    G.players[idx].name = inp.value || PLAYER_NAMES[idx];
                    saveAll(); injectState();
                };
            })(nameInputs[n]);
        }
    }

    function openClothesEditor() {
        var exist = document.getElementById('dousow-clothes');
        if (exist) { exist.remove(); }

        var div = document.createElement('div');
        div.id = 'dousow-clothes';
        div.style.position = 'fixed';
        div.style.left = '5%';
        div.style.top = '5%';
        div.style.width = '90%';
        div.style.maxWidth = '520px';
        div.style.maxHeight = '85vh';
        div.style.background = '#2a0a12';
        div.style.color = '#ffe0e8';
        div.style.padding = '14px';
        div.style.borderRadius = '12px';
        div.style.zIndex = '2147483646';
        div.style.overflow = 'auto';
        div.style.border = '2px solid #8b1a3a';
        div.style.fontSize = '12px';

        var headerRow = document.createElement('div');
        headerRow.style.display = 'flex';
        headerRow.style.justifyContent = 'space-between';
        headerRow.style.alignItems = 'center';
        headerRow.style.marginBottom = '8px';

        var h = document.createElement('h3');
        h.style.margin = '0';
        h.style.color = '#ff88aa';
        h.textContent = '👗 衣物管理';
        headerRow.appendChild(h);

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ 关闭';
        closeBtn.style.padding = '6px 12px';
        closeBtn.style.background = '#8b1a3a';
        closeBtn.style.color = '#fff';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '6px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = function () { div.remove(); };
        headerRow.appendChild(closeBtn);
        div.appendChild(headerRow);

        var hint = document.createElement('div');
        hint.style.fontSize = '10px';
        hint.style.color = '#ffaabb';
        hint.style.marginBottom = '8px';
        hint.textContent = '每件衣物单独一行。触发7时自动移除最后一件（列表末位）。';
        div.appendChild(hint);

        function renderList() {
            var listContainer = document.getElementById('ds-clothes-list');
            listContainer.innerHTML = '';
            for (var i = 0; i < 3; i++) {
                var p = G.players[i];
                var block = document.createElement('div');
                block.style.borderTop = '1px solid #5a1a2a';
                block.style.padding = '8px 0';

                var nameLabel = document.createElement('b');
                nameLabel.style.color = '#ff99bb';
                nameLabel.textContent = p.name + (p.role ? ' (' + p.role + ')' : '');
                block.appendChild(nameLabel);

                var listDiv = document.createElement('div');
                listDiv.style.marginTop = '4px';

                if (p.clothes.length === 0) {
                    var empty = document.createElement('div');
                    empty.style.fontSize = '11px';
                    empty.style.color = '#888';
                    empty.textContent = '（无衣物）';
                    listDiv.appendChild(empty);
                } else {
                    for (var j = 0; j < p.clothes.length; j++) {
                        (function (playerIdx, itemIdx) {
                            var row = document.createElement('div');
                            row.style.display = 'flex';
                            row.style.alignItems = 'center';
                            row.style.marginBottom = '3px';
                            row.style.gap = '4px';

                            var idxSpan = document.createElement('span');
                            idxSpan.style.color = '#ffaabb';
                            idxSpan.style.minWidth = '20px';
                            idxSpan.textContent = '#' + (itemIdx + 1);
                            row.appendChild(idxSpan);

                            var itemInput = document.createElement('input');
                            itemInput.type = 'text';
                            itemInput.value = G.players[playerIdx].clothes[itemIdx];
                            itemInput.style.flex = '1';
                            itemInput.style.background = '#1a0508';
                            itemInput.style.color = '#ffe0e8';
                            itemInput.style.border = '1px solid #c23a6a';
                            itemInput.style.borderRadius = '4px';
                            itemInput.style.padding = '3px 6px';
                            itemInput.onchange = function () {
                                G.players[playerIdx].clothes[itemIdx] = itemInput.value;
                                saveAll(); injectState(); renderUI();
                            };
                            row.appendChild(itemInput);

                            var delBtn = document.createElement('button');
                            delBtn.textContent = '×';
                            delBtn.style.background = '#5a0a1a';
                            delBtn.style.color = '#fff';
                            delBtn.style.border = 'none';
                            delBtn.style.borderRadius = '4px';
                            delBtn.style.padding = '3px 8px';
                            delBtn.style.cursor = 'pointer';
                            delBtn.onclick = function () {
                                G.players[playerIdx].clothes.splice(itemIdx, 1);
                                saveAll(); injectState(); renderUI(); renderList();
                            };
                            row.appendChild(delBtn);

                            listDiv.appendChild(row);
                        })(i, j);
                    }
                }
                block.appendChild(listDiv);

                var addBtn = document.createElement('button');
                addBtn.textContent = '+ 添加衣物';
                addBtn.style.marginTop = '4px';
                addBtn.style.background = '#8b1a3a';
                addBtn.style.color = '#fff';
                addBtn.style.border = 'none';
                addBtn.style.borderRadius = '6px';
                addBtn.style.padding = '4px 10px';
                addBtn.style.cursor = 'pointer';
                addBtn.onclick = (function (playerIdx) {
                    return function () {
                        G.players[playerIdx].clothes.push('新衣物');
                        saveAll(); injectState(); renderUI(); renderList();
                    };
                })(i);
                block.appendChild(addBtn);

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
        if (exist) { exist.remove(); }

        var div = document.createElement('div');
        div.id = 'dousow-editor';
        div.style.position = 'fixed';
        div.style.left = '5%';
        div.style.top = '5%';
        div.style.width = '90%';
        div.style.maxWidth = '520px';
        div.style.maxHeight = '85vh';
        div.style.background = '#2a0a12';
        div.style.color = '#ffe0e8';
        div.style.padding = '14px';
        div.style.borderRadius = '12px';
        div.style.zIndex = '2147483646';
        div.style.overflow = 'auto';
        div.style.border = '2px solid #8b1a3a';
        div.style.fontSize = '12px';

        var headerRow = document.createElement('div');
        headerRow.style.display = 'flex';
        headerRow.style.justifyContent = 'space-between';
        headerRow.style.alignItems = 'center';
        headerRow.style.marginBottom = '8px';

        var h = document.createElement('h3');
        h.style.margin = '0';
        h.style.color = '#ff88aa';
        h.textContent = '⚙ 效果编辑器';
        headerRow.appendChild(h);

        var closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ 关闭';
        closeBtn.style.padding = '6px 12px';
        closeBtn.style.background = '#8b1a3a';
        closeBtn.style.color = '#fff';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '6px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = function () { div.remove(); };
        headerRow.appendChild(closeBtn);
        div.appendChild(headerRow);

        var hint = document.createElement('div');
        hint.style.fontSize = '10px';
        hint.style.color = '#ffaabb';
        hint.style.marginBottom = '8px';
        hint.textContent = '修改后点保存立即生效。锁定的卡不可编辑。';
        div.appendChild(hint);

        var allRanks = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','小王','大王'];
        for (var i = 0; i < allRanks.length; i++) {
            var r = allRanks[i];
            var e = effectsDB[r] || {};
            var locked = e.locked;

            var block = document.createElement('div');
            block.style.borderTop = '1px solid #5a1a2a';
            block.style.padding = '6px 0';

            var label = document.createElement('b');
            label.style.color = '#ff99bb';
            label.textContent = r + (locked ? ' (锁定)' : '');
            block.appendChild(label);

            var descDiv = document.createElement('div');
            descDiv.style.marginTop = '3px';
            descDiv.textContent = '描述：';
            var descArea = document.createElement('textarea');
            descArea.setAttribute('data-k', r);
            descArea.setAttribute('data-f', 'desc');
            descArea.style.width = '100%';
            descArea.style.height = '40px';
            descArea.style.background = '#1a0508';
            descArea.style.color = '#ffe0e8';
            descArea.style.border = '1px solid #c23a6a';
            descArea.style.borderRadius = '4px';
            descArea.value = e.desc || '';
            if (locked) descArea.readOnly = true;
            descDiv.appendChild(descArea);
            block.appendChild(descDiv);

            var durDiv = document.createElement('div');
            durDiv.style.marginTop = '3px';
            durDiv.textContent = '单次轮数：';
            var durInput = document.createElement('input');
            durInput.type = 'number';
            durInput.setAttribute('data-k', r);
            durInput.setAttribute('data-f', 'duration');
            durInput.value = (e.duration != null ? e.duration : 1);
            durInput.style.width = '50px';
            durInput.style.background = '#1a0508';
            durInput.style.color = '#ffe0e8';
            durInput.style.border = '1px solid #c23a6a';
            if (locked) durInput.disabled = true;
            durDiv.appendChild(durInput);

            durDiv.appendChild(document.createTextNode(' 叠加强度：'));
            var stackInput = document.createElement('input');
            stackInput.type = 'checkbox';
            stackInput.setAttribute('data-k', r);
            stackInput.setAttribute('data-f', 'stackIntensity');
            stackInput.checked = !!e.stackIntensity;
            if (locked) stackInput.disabled = true;
            durDiv.appendChild(stackInput);
            block.appendChild(durDiv);

            var boyDiv = document.createElement('div');
            boyDiv.style.marginTop = '3px';
            boyDiv.textContent = '男孩效果：';
            var boyInput = document.createElement('input');
            boyInput.type = 'text';
            boyInput.setAttribute('data-k', r);
            boyInput.setAttribute('data-f', 'boy');
            boyInput.value = e.boy || '';
            boyInput.style.width = '70%';
            boyInput.style.background = '#1a0508';
            boyInput.style.color = '#ffe0e8';
            boyInput.style.border = '1px solid #c23a6a';
            boyInput.style.borderRadius = '4px';
            boyInput.style.padding = '3px 6px';
            if (locked) boyInput.readOnly = true;
            boyDiv.appendChild(boyInput);
            block.appendChild(boyDiv);

            div.appendChild(block);
        }

        var btnRow = document.createElement('div');
        btnRow.style.marginTop = '10px';
        btnRow.appendChild(mkBtn('保存全部', saveEffects));
        btnRow.appendChild(mkBtn('导出JSON', exportEffects));
        btnRow.appendChild(mkBtn('导入JSON', importEffects));
        div.appendChild(btnRow);

        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'ds-import-file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
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
        saveAll();
        alert('已保存');
    }

    function exportEffects() {
        var blob = new Blob([JSON.stringify(effectsDB, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'dousow_effects.json';
        a.click();
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
                    saveAll();
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
            var c = window.SillyTavern.getContext();
            if (!c || !c.eventSource || !c.eventTypes) return;
            c.eventSource.on(c.eventTypes.GENERATION_STARTED, function () {
                if (G && G.phase !== 'idle') injectState();
            });
        } catch (e) { console.warn('[DouSow] setupEvents', e); }
    }

    function exposeAPI() {
        window.DouSow = {
            startNewGame: startNewGame,
            doDeal: doDeal,
            doBid: doBid,
            doGrab: doGrab,
            doPlay: doPlay,
            doPass: doPass,
            doUndo: doUndo,
            nextRound: nextRound,
            applySeconds: applySeconds,
            triggerRule14: triggerRule14,
            reduce10: reduce10,
            openEffectEditor: openEffectEditor,
            openClothesEditor: openClothesEditor,
            getState: function () { return G; },
            getStateText: buildStateText
        };
    }

    function init() {
        loadAll();
        createUI();
        renderUI();
        injectState();
        setupEvents();
        exposeAPI();
        console.log('[DouSow] 插件已加载 v3');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();