// DouSow/index.js
import {
    getContext,
    eventSource,
    event_types,
    SlashCommandParser,
} from '../../../../script.js';

const EXTENSION_NAME = 'DouSow';
const STORAGE_KEY = 'dousow_state_v3';
const EFFECT_KEY = 'dousow_effects_v3';
const UI_KEY = 'dousow_ui_v3';

const DEFAULT_PLAYER_NAMES = ['塞拉', '诺亚', '薇拉'];

// 触发顺序（同时触发多张不同牌时）
const TRIGGER_ORDER = ['3','8','4','5','6','7','10','A','2','J','Q','K','小王','9'];

// 牌面额（扣分用）
const RANK_VALUE = {
    '3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,
    'J':13,'Q':14,'K':15,'A':11,'2':12,'小王':16,'大王':17
};

// ========== 默认效果定义 ==========
const DEFAULT_EFFECTS = {
    '3': { name:'3', desc:'乳头与阴蒂敏感和大小增加3倍，男孩玩弄持续一轮。火箭触发时永久，男孩仅+1轮。', duration:1, stackIntensity:true, boy:'男孩玩弄乳头与阴蒂', locked:false },
    '4': { name:'4', desc:'强制用右手自慰或男孩用手帮忙，持续一轮。', duration:1, stackIntensity:false, boy:'男孩用手帮忙自慰', locked:false },
    '5': { name:'5', desc:'发热发情，男孩用双腿玩素股持续一局。火箭触发时永久，男孩仅+1轮。', duration:1, stackIntensity:true, boy:'男孩用双腿玩素股', locked:false },
    '6': { name:'6', desc:'对应国家男孩强制口交一轮，期间看不到牌与牌桌。', duration:1, stackIntensity:false, boy:'强制口交', locked:false },
    '7': { name:'7', desc:'强制脱一件衣物。全部脱光后，阴道被魔法撑开持续1局，可看清内部。多次触发依次打开子宫→输卵管→尿道→肛门→乳头。', duration:1, stackIntensity:false, boy:'', locked:true },
    '8': { name:'8', desc:'乳房变大、泌乳、敏感翻倍，持续一轮。火箭触发时永久。', duration:1, stackIntensity:true, boy:'可选：男孩从乳头插入乳房性交', locked:false },
    '9': { name:'9', desc:'强制高潮边缘，保持一轮。', duration:1, stackIntensity:false, boy:'', locked:false },
    '10': { name:'10', desc:'强制剧烈高潮，保持一轮。', duration:0, stackIntensity:true, boy:'', locked:true, isInstant:true },
    'J': { name:'J', desc:'三个男孩咬住阴蒂和乳头大力啃咬一轮。', duration:1, stackIntensity:false, boy:'三个男孩啃咬', locked:false },
    'Q': { name:'Q', desc:'肛门被男孩强制性交一轮。', duration:1, stackIntensity:false, boy:'肛门强制性交', locked:false },
    'K': { name:'K', desc:'两个男孩暴力蹂躏两个乳房一轮。', duration:1, stackIntensity:false, boy:'暴力蹂躏乳房', locked:false },
    'A': { name:'A', desc:'强制被男孩性交一轮，期间难以思考。', duration:1, stackIntensity:false, boy:'强制性交', locked:false },
    '2': { name:'2', desc:'强制剧烈高潮并保持高潮状态一整轮。', duration:1, stackIntensity:false, boy:'', locked:false },
    '小王': { name:'小王', desc:'锁定自身状态一整轮。锁定期间时长不减，新效果延迟到小王结束后触发。', duration:1, stackIntensity:false, boy:'', locked:true },
    '大王': { name:'大王', desc:'清空自身所有非永久效果。与其他牌一起出时不触发。', duration:0, stackIntensity:false, boy:'', locked:true },
};

// ========== 状态 ==========
let G = null;
let effectsDB = JSON.parse(JSON.stringify(DEFAULT_EFFECTS));
let uiSettings = { bgColor: '#4a0e0e', minimized: false };

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
        players: DEFAULT_PLAYER_NAMES.map(name => ({
            name,
            role: '',
            score: 1000,
            hand: [],
            effects: [],
            clothes: '',
            baseScore: 0.5,
            bid: null,
            hasGrabbed: false,
        })),
        bottomCards: [],
        playPile: [],
        bombCount: 0,
        rocketCount: 0,
        spring: false,
        antiSpring: false,
        actionHistory: [],
        pendingEffects: [],
        grabQueue: [],
        grabQueueIdx: 0,
        intermissionSeconds: 0,
    };
}

// ========== 持久化 ==========
function saveAll() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(G));
        localStorage.setItem(EFFECT_KEY, JSON.stringify(effectsDB));
        localStorage.setItem(UI_KEY, JSON.stringify(uiSettings));
    } catch(e) { console.warn('[DouSow] save error', e); }
}
function loadAll() {
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        if (s) G = JSON.parse(s);
        const e = localStorage.getItem(EFFECT_KEY);
        if (e) effectsDB = Object.assign({}, DEFAULT_EFFECTS, JSON.parse(e));
        const u = localStorage.getItem(UI_KEY);
        if (u) uiSettings = Object.assign(uiSettings, JSON.parse(u));
    } catch(err) { console.warn('[DouSow] load error', err); }
    if (!G) G = defaultState();
}

// ========== 输入解析 ==========
// 支持：34567 / 10JQKA / 大小 / 8883
function parseCards(str) {
    if (!str) return [];
    const s = String(str).trim().toUpperCase().replace(/\s+/g, '');
    const out = [];
    let i = 0;
    while (i < s.length) {
        if (s.substr(i, 2) === '10') { out.push('10'); i += 2; continue; }
        if (s[i] === '大') { out.push('大王'); i++; continue; }
        if (s[i] === '小') { out.push('小王'); i++; continue; }
        if (s[i] === '王') { out.push('小王'); i++; continue; }
        const ch = s[i];
        if ('3456789JQKA2'.includes(ch)) out.push(ch);
        i++;
    }
    return out;
}

// ========== 效果引擎 ==========
function getEffectDef(rank) {
    return effectsDB[rank] || effectsDB[rank.toUpperCase()] || null;
}

// 玩家是否有小王锁定（且未结束）
function hasSowLock(playerIdx) {
    return G.players[playerIdx].effects.some(e => e.rank === '小王' && !e.permanent && e.duration > 0);
}

// 计算实际触发次数（母猪翻倍 + 连续母猪额外）
function calcTriggerCount(playerIdx, baseCount) {
    let count = baseCount;
    const role = G.players[playerIdx].role;
    if (role === '母猪') {
        count *= 2;
        const consec = G.consecutiveMother[playerIdx] || 0;
        if (consec > 0) count += 2 * consec;
    }
    return count;
}

// 获取效果目标玩家（婊子共享）
function getTargets(playerIdx) {
    const role = G.players[playerIdx].role;
    if (role === '婊子') {
        const bitches = [];
        for (let i = 0; i < 3; i++) if (G.players[i].role === '婊子') bitches.push(i);
        return bitches;
    }
    return [playerIdx];
}

// 添加效果
function addEffect(playerIdx, rank, count, forcePermanent = false) {
    const def = getEffectDef(rank);
    if (!def) return;

    // 大王：清空非永久效果
    if (rank === '大王') {
        G.players[playerIdx].effects = G.players[playerIdx].effects.filter(e => e.permanent);
        return;
    }

    // 7 特殊：检查衣物
    if (rank === '7') {
        const p = G.players[playerIdx];
        if (p.clothes && p.clothes.trim()) {
            // 有衣物，本次触发被消耗（用户手动减衣物）
            return;
        }
        // 无衣物 → 扩张效果
        handleExpandEffect(playerIdx, count);
        return;
    }

    // 小王：锁定效果
    if (rank === '小王') {
        const existing = G.players[playerIdx].effects.find(e => e.rank === '小王' && !e.permanent);
        if (existing) {
            existing.duration += def.duration * count;
        } else {
            G.players[playerIdx].effects.push({
                rank: '小王', name: '小王', desc: def.desc,
                duration: def.duration * count,
                permanent: false,
                stacks: 1,
                boy: '',
                boyDuration: 0,
            });
        }
        return;
    }

    // 10 特殊：即时效果，累计剩余次数
    if (rank === '10') {
        const existing = G.players[playerIdx].effects.find(e => e.rank === '10' && !e.permanent);
        if (existing) {
            existing.remainingCount = (existing.remainingCount || 0) + count;
        } else {
            G.players[playerIdx].effects.push({
                rank: '10', name: '10', desc: def.desc,
                duration: 0, permanent: false, stacks: 1,
                boy: '', boyDuration: 0,
                isInstant: true,
                remainingCount: count,
            });
        }
        return;
    }

    // 普通效果
    const targets = getTargets(playerIdx);
    const isPermanent = forcePermanent;
    const durationValue = isPermanent ? 0 : def.duration * count;

    for (const ti of targets) {
        const p = G.players[ti];
        // 匹配：同 rank 且同 permanent
        const existing = p.effects.find(e => e.rank === rank && e.permanent === isPermanent);

        if (existing) {
            if (def.stackIntensity) existing.stacks = (existing.stacks || 1) + count;
            if (!isPermanent) existing.duration += durationValue;
            // 男孩效果：永久触发时男孩仅+1轮
            if (isPermanent && def.boy) {
                existing.boyDuration = (existing.boyDuration || 0) + 1;
            } else if (!isPermanent && def.boy) {
                existing.boyDuration = (existing.boyDuration || 0) + durationValue;
            }
        } else {
            p.effects.push({
                rank, name: def.name, desc: def.desc,
                duration: durationValue,
                permanent: isPermanent,
                stacks: def.stackIntensity ? count : 1,
                boy: def.boy || '',
                boyDuration: isPermanent && def.boy ? 1 : (def.boy ? durationValue : 0),
            });
        }
    }
}

// 7 的扩张效果处理
function handleExpandEffect(playerIdx, count) {
    const p = G.players[playerIdx];
    const existing = p.effects.find(e => e.rank === '7_expand');
    if (existing) {
        existing.stacks = (existing.stacks || 1) + count;
        // 第7次起，只增加时长不增加强度
        if (existing.stacks > 6) {
            const excess = existing.stacks - 6;
            existing.stacks = 6;
            existing.duration = (existing.duration || 1) + excess;
        }
    } else {
        p.effects.push({
            rank: '7_expand',
            name: '7扩张',
            desc: '阴道被魔法撑开，内壁扩张合不拢。层数越高打开部位越多。',
            duration: 1,
            permanent: false,
            stacks: Math.min(count, 6),
            boy: '',
            boyDuration: 0,
            isGameDuration: true, // 以局为单位，扣分后消失
        });
    }
}

// 清除非永久效果（大王）
function clearNonPermanent(playerIdx) {
    G.players[playerIdx].effects = G.players[playerIdx].effects.filter(e => e.permanent);
}

// 触发效果（一次出牌）
function triggerEffects(playerIdx, cards) {
    if (cards.length === 0) return;

    // 火箭
    if (cards.includes('小王') && cards.includes('大王') && cards.length === 2) {
        triggerRocket(playerIdx);
        return;
    }

    // 单独大王
    if (cards.length === 1 && cards[0] === '大王') {
        clearNonPermanent(playerIdx);
        return;
    }

    // 统计每张牌的数量
    const counts = {};
    for (const c of cards) counts[c] = (counts[c] || 0) + 1;

    // 特殊顺序：2 → 10 → 9
    // 9 延迟处理
    const has9 = counts['9'] > 0;
    const has2 = counts['2'] > 0;
    const has10 = counts['10'] > 0;

    // 先按触发顺序处理非9的牌
    for (const rank of TRIGGER_ORDER) {
        if (rank === '9') continue;
        if (!counts[rank]) continue;
        applyRankEffect(playerIdx, rank, counts[rank]);
    }

    // 如果同时有9且2或10，9延迟
    if (has9) {
        if (has2 || has10) {
            G.pendingEffects.push({ playerIdx, rank: '9', count: counts['9'], type: 'nine_delay' });
        } else {
            applyRankEffect(playerIdx, '9', counts['9']);
        }
    }
}

// 应用单张牌效果
function applyRankEffect(playerIdx, rank, baseCount) {
    // 大王与其他牌一起出时不触发
    if (rank === '大王') return;

    const hasLock = hasSowLock(playerIdx);
    // 10 不被锁，但被延迟
    if (hasLock && rank !== '小王' && rank !== '10') {
        G.pendingEffects.push({ playerIdx, rank, count: baseCount });
        return;
    }

    const actualCount = calcTriggerCount(playerIdx, baseCount);
    addEffect(playerIdx, rank, actualCount);
}

// 火箭特殊效果
function triggerRocket(playerIdx) {
    G.rocketCount++;
    G.multiplier += 2;

    // 所有牌效果4次（除大小王）
    for (const rank of TRIGGER_ORDER) {
        const actual = calcTriggerCount(playerIdx, 4);
        addEffect(playerIdx, rank, actual);
    }
    // 小王 1 次
    const sowCount = calcTriggerCount(playerIdx, 1);
    addEffect(playerIdx, '小王', sowCount);
    // 大王不触发
}

// 小王结束后触发延迟队列
function flushPendingEffects(playerIdx) {
    const pending = G.pendingEffects.filter(p => p.playerIdx === playerIdx);
    G.pendingEffects = G.pendingEffects.filter(p => p.playerIdx !== playerIdx);
    if (pending.length === 0) return;

    // 全部按触发顺序
    // 先处理 9 延迟
    const nineDelays = pending.filter(p => p.type === 'nine_delay');
    const normal = pending.filter(p => p.type !== 'nine_delay');

    // 收集所有待触发的牌
    const rankCounts = {};
    for (const p of normal) {
        rankCounts[p.rank] = (rankCounts[p.rank] || 0) + p.count;
    }
    for (const p of nineDelays) {
        rankCounts['9'] = (rankCounts['9'] || 0) + p.count;
    }

    // 按触发顺序触发
    for (const rank of TRIGGER_ORDER) {
        if (!rankCounts[rank]) continue;
        const actual = calcTriggerCount(playerIdx, rankCounts[rank]);
        addEffect(playerIdx, rank, actual);
    }
}

// ========== 轮次推进 ==========
// 轮到某人出牌时，减少其轮型效果
function tickRound(playerIdx) {
    const p = G.players[playerIdx];
    const hasLock = hasSowLock(playerIdx);

    if (hasLock) {
        // 只减小王
        for (const e of p.effects) {
            if (e.rank === '小王' && !e.permanent) {
                e.duration = Math.max(0, e.duration - 1);
            }
        }
        // 小王归零 → 触发延迟队列
        if (!hasSowLock(playerIdx)) {
            flushPendingEffects(playerIdx);
        }
    } else {
        for (const e of p.effects) {
            if (e.permanent) continue;
            if (e.isInstant) continue; // 10 手动减
            if (e.isGameDuration) continue; // 扩张不按轮减
            e.duration = Math.max(0, e.duration - 1);
        }
    }
    // 清理归零的
    p.effects = p.effects.filter(e => e.permanent || e.duration > 0 || e.isInstant || e.isGameDuration);
}

// 手动减少 10
function reduceInstant10(playerIdx) {
    pushUndo();
    const p = G.players[playerIdx];
    const e = p.effects.find(x => x.rank === '10' && x.isInstant);
    if (!e) return;
    e.remainingCount = (e.remainingCount || 0) - 1;
    if (e.remainingCount <= 0) {
        p.effects = p.effects.filter(x => x !== e);
    }
    saveAll();
    renderUI();
    injectState();
}

// ========== 游戏流程 ==========
function pushUndo() {
    G.actionHistory.push(JSON.stringify(G));
    if (G.actionHistory.length > 100) G.actionHistory.shift();
}

function doUndo() {
    if (G.actionHistory.length === 0) return;
    const prev = G.actionHistory.pop();
    const hist = G.actionHistory;
    G = JSON.parse(prev);
    G.actionHistory = hist;
    saveAll();
    renderUI();
    injectState();
}

function startNewGame() {
    pushUndo();
    G = defaultState();
    G.phase = 'deal';
    G.bidStartIndex = 0;
    saveAll();
    renderUI();
    injectState();
}

function doDeal() {
    pushUndo();
    const deck = [];
    const ranks = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
    for (const r of ranks) for (let i = 0; i < 4; i++) deck.push(r);
    deck.push('小王', '大王');
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    G.players[0].hand = deck.slice(0, 17);
    G.players[1].hand = deck.slice(17, 34);
    G.players[2].hand = deck.slice(34, 51);
    G.bottomCards = deck.slice(51);
    G.phase = 'bid';
    G.currentTurn = G.bidStartIndex;
    for (const p of G.players) {
        p.bid = null;
        p.hasGrabbed = false;
        p.role = '';
        p.baseScore = 0.5;
    }
    G.tempMotherIndex = -1;
    G.motherIndex = -1;
    G.multiplier = 1;
    G.bombCount = 0;
    G.rocketCount = 0;
    G.playPile = [];
    G.pendingEffects = [];
    saveAll();
    renderUI();
    injectState();
}

function doBid(playerIdx, value) {
    pushUndo();
    const p = G.players[playerIdx];
    p.bid = value;

    if (value === '不叫') {
        p.baseScore = 0.5;
        // 不叫惩罚（肛门敏感×3，2局）
        const existing = p.effects.find(e => e.rank === '不叫惩罚');
        if (existing) {
            existing.stacks += 1;
            existing.duration += 2;
        } else {
            p.effects.push({
                rank: '不叫惩罚', name: '不叫惩罚',
                desc: '肛门敏感度翻3倍，连续不叫叠加',
                duration: 2, permanent: false, stacks: 1,
                boy: '', boyDuration: 0,
            });
        }
    } else {
        const num = parseInt(value);
        p.baseScore = num;
        // 叫分永久效果
        p.effects.push({
            rank: '叫分永久', name: `叫${num}分永久`,
            desc: `立即完整高潮${num}次，阴蒂与乳头永久×${num}`,
            duration: 0, permanent: true, stacks: num,
            boy: '', boyDuration: 0,
        });
        if (num === 3) {
            G.tempMotherIndex = playerIdx;
            startGrabPhase();
            saveAll(); renderUI(); injectState();
            return;
        }
    }

    // 下一个
    const nextIdx = (playerIdx + 1) % 3;
    if (nextIdx === G.bidStartIndex) {
        // 所有人叫完
        let maxBid = 0, maxIdx = -1;
        for (let i = 0; i < 3; i++) {
            if (G.players[i].bid !== '不叫') {
                const b = parseInt(G.players[i].bid);
                if (b > maxBid) { maxBid = b; maxIdx = i; }
            }
        }
        if (maxIdx === -1) {
            // 全不叫
            for (let i = 0; i < 3; i++) {
                G.players[i].hand.forEach(c => addEffect(i, c, 1));
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

function startGrabPhase() {
    G.phase = 'grab';
    G.grabQueue = [];
    for (let i = 1; i <= 2; i++) {
        const idx = (G.tempMotherIndex + i) % 3;
        if (G.players[idx].bid !== '不叫') G.grabQueue.push(idx);
    }
    G.grabQueueIdx = 0;
    G.currentTurn = G.grabQueue.length > 0 ? G.grabQueue[0] : -1;
    if (G.grabQueue.length === 0) finishGrab();
}

function doGrab(playerIdx, grab) {
    pushUndo();
    if (grab) {
        G.players[playerIdx].hasGrabbed = true;
        G.multiplier += 2;
        G.tempMotherIndex = playerIdx;
        // 永久乳房效果
        G.players[playerIdx].effects.push({
            rank: '抢母猪永久', name: '抢母猪永久',
            desc: '乳房大小翻倍、泌乳、敏感度翻倍（永久）',
            duration: 0, permanent: true, stacks: 1,
            boy: '', boyDuration: 0,
        });
    }
    G.grabQueueIdx++;
    if (G.grabQueueIdx >= G.grabQueue.length) {
        finishGrab();
    } else {
        G.currentTurn = G.grabQueue[G.grabQueueIdx];
    }
    saveAll(); renderUI(); injectState();
}

function finishGrab() {
    G.motherIndex = G.tempMotherIndex;
    for (let i = 0; i < 3; i++) {
        G.players[i].role = (i === G.motherIndex) ? '母猪' : '婊子';
    }
    // 连续母猪
    if (G.lastMotherIndex === G.motherIndex) {
        G.consecutiveMother[G.motherIndex] = (G.consecutiveMother[G.motherIndex] || 0) + 1;
    } else {
        G.consecutiveMother = [0, 0, 0];
        G.consecutiveMother[G.motherIndex] = 1;
    }
    G.lastMotherIndex = G.motherIndex;

    // 收底牌
    const bottomCopy = [...G.bottomCards];
    for (const c of bottomCopy) G.players[G.motherIndex].hand.push(c);
    G.bottomCards = [];
    // 底牌效果
    triggerEffects(G.motherIndex, bottomCopy);

    G.phase = 'play';
    G.currentTurn = G.motherIndex;
}

function doPlay(playerIdx, inputStr) {
    const cards = parseCards(inputStr);
    if (cards.length === 0) { alert('无法解析牌面'); return; }
    pushUndo();

    const p = G.players[playerIdx];
    // 从手牌移除
    const remaining = [...p.hand];
    for (const c of cards) {
        const idx = remaining.indexOf(c);
        if (idx >= 0) remaining.splice(idx, 1);
    }
    p.hand = remaining;
    G.playPile.push({ player: p.name, cards: cards.join(' ') });

    // 炸弹 / 火箭倍数
    const counts = {};
    for (const c of cards) counts[c] = (counts[c] || 0) + 1;
    if (cards.length === 2 && cards.includes('小王') && cards.includes('大王')) {
        // 火箭，已在 triggerEffects 处理
    } else if (cards.length === 4 && Object.values(counts).includes(4)) {
        G.bombCount++;
        G.multiplier += 2;
    }

    // 触发效果
    triggerEffects(playerIdx, cards);

    // 出完检查
    if (p.hand.length === 0) {
        endRound(playerIdx);
        return;
    }

    // 轮次推进
    tickRound(playerIdx);
    G.currentTurn = (playerIdx + 1) % 3;
    saveAll(); renderUI(); injectState();
}

function doPass(playerIdx) {
    pushUndo();
    G.playPile.push({ player: G.players[playerIdx].name, cards: '不出' });
    tickRound(playerIdx);
    G.currentTurn = (playerIdx + 1) % 3;
    saveAll(); renderUI(); injectState();
}

function endRound(winnerIdx) {
    // 一局结束触发剩余手牌效果（排除大王）
    for (let i = 0; i < 3; i++) {
        const cards = G.players[i].hand.filter(c => c !== '大王');
        if (cards.length > 0) triggerEffects(i, cards);
    }

    // 计分
    const mother = G.players[G.motherIndex];
    const motherWon = (winnerIdx === G.motherIndex);
    const mult = G.multiplier;

    if (motherWon) {
        mother.score += 2 * mother.baseScore * mult;
        for (let i = 0; i < 3; i++) {
            if (i !== G.motherIndex) G.players[i].score -= G.players[i].baseScore * mult;
        }
    } else {
        mother.score -= 2 * mother.baseScore * mult;
        for (let i = 0; i < 3; i++) {
            if (i !== G.motherIndex) G.players[i].score += G.players[i].baseScore * mult;
        }
    }

    // 额外扣分（局末剩余效果，含刚触发的）
    for (const p of G.players) {
        let extra = 0;
        for (const e of p.effects) {
            if (e.rank === '叫分永久' || e.rank === '抢母猪永久' || e.rank === '不叫惩罚') continue;
            const rankKey = e.rank === '7_expand' ? '7' : e.rank;
            const val = RANK_VALUE[rankKey] || 0;
            if (e.isInstant) {
                extra += val * (e.remainingCount || 0);
            } else {
                extra += val * (e.stacks || 1);
            }
        }
        p.score -= extra;
    }

    // 7扩张效果扣分后消失
    for (const p of G.players) {
        p.effects = p.effects.filter(e => !e.isGameDuration);
    }

    // 轮→秒转换（中场）
    for (const p of G.players) {
        for (const e of p.effects) {
            if (!e.permanent && !e.isInstant && !e.isGameDuration && e.duration > 0) {
                e.duration *= 180;
                e.durationType = 'sec';
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
    for (const p of G.players) {
        p.hand = [];
        p.role = '';
        p.bid = null;
        p.hasGrabbed = false;
    }
    saveAll(); renderUI(); injectState();
}

function applySeconds() {
    const sec = parseInt(document.getElementById('dousow-sec')?.value) || 0;
    if (sec <= 0) return;
    pushUndo();
    G.intermissionSeconds += sec;
    for (const p of G.players) {
        for (const e of p.effects) {
            if (e.durationType === 'sec' && !e.permanent) {
                e.duration = Math.max(0, e.duration - sec);
            }
        }
        p.effects = p.effects.filter(e => e.permanent || e.durationType !== 'sec' || e.duration > 0);
    }
    saveAll(); renderUI(); injectState();
}

function triggerRule14() {
    pushUndo();
    // 对所有未上桌玩家（默认所有）触发扩张
    for (let i = 0; i < 3; i++) {
        handleExpandEffect(i, 1);
    }
    saveAll(); renderUI(); injectState();
}

// ========== 状态注入 ==========
function buildStateText() {
    let txt = '【斗母猪当前状态】\n';
    txt += `阶段：${phaseName(G.phase)} | 局数：${G.roundNumber} | 倍数：${G.multiplier}\n`;
    txt += `当前行动：${G.players[G.currentTurn]?.name || '无'}\n\n`;

    for (let i = 0; i < 3; i++) {
        const p = G.players[i];
        txt += `【${p.name}】角色：${p.role || '未定'} | 分数：${p.score} | 手牌数：${p.hand.length}\n`;
        txt += `手牌：${p.hand.join(' ') || '无'}\n`;
        txt += `衣物：${p.clothes || '（未填写）'}\n`;
        txt += `连续当母猪：${G.consecutiveMother[i]}\n`;
        if (p.effects.length) {
            txt += `效果：\n`;
            for (const e of p.effects) {
                let dur;
                if (e.permanent) dur = '永久';
                else if (e.isInstant) dur = `剩余${e.remainingCount || 0}次`;
                else if (e.isGameDuration) dur = `剩余${e.duration}局`;
                else dur = `${e.duration}${e.durationType === 'sec' ? '秒' : '轮'}`;
                txt += `  - ${e.name}（层数${e.stacks || 1}，${dur}）`;
                if (e.boy) txt += ` | 男孩：${e.boy}`;
                txt += `\n    ${e.desc}\n`;
            }
        } else {
            txt += `效果：无\n`;
        }
        txt += '\n';
    }

    if (G.playPile.length) {
        txt += `出牌堆：${G.playPile.slice(-8).map(x => x.player + ':' + x.cards).join(' → ')}\n`;
    }
    return txt;
}

function phaseName(ph) {
    return ({ idle:'空闲', deal:'发牌阶段', bid:'叫母猪', grab:'抢母猪', play:'出牌阶段', rest:'中场休息', ended:'游戏结束' })[ph] || ph;
}

function injectState() {
    try {
        const ctx = getContext();
        if (ctx && ctx.setExtensionPrompt) {
            ctx.setExtensionPrompt(EXTENSION_NAME, buildStateText(), 1, 0, false, 0);
        }
    } catch(e) {}
    window.DouSowStateText = buildStateText();
}

function getLastAIMessageId() {
    try {
        const ctx = getContext();
        const chat = ctx?.chat || [];
        for (let i = chat.length - 1; i >= 0; i--) {
            if (!chat[i].is_user) return chat[i].message_id ?? i;
        }
    } catch(e) {}
    return null;
}

// ========== UI ==========
let panel = null;
let isDragging = false;
let dragOff = { x: 0, y: 0 };

function createUI() {
    if (document.getElementById('dousow-panel')) { panel = document.getElementById('dousow-panel'); return; }
    panel = document.createElement('div');
    panel.id = 'dousow-panel';
    panel.innerHTML = `
    <style>
    #dousow-panel {
        position: fixed; right: 10px; bottom: 10px;
        width: min(95vw, 400px); max-height: min(85vh, 640px);
        background: ${uiSettings.bgColor}; color: #ffe0e8;
        border: 2px solid #8b1a3a; border-radius: 12px;
        z-index: 99999; font-size: 12px;
        display: flex; flex-direction: column;
        box-shadow: 0 4px 24px rgba(139,26,58,0.6);
    }
    #dousow-panel .ds-header {
        padding: 8px 12px; cursor: move;
        background: linear-gradient(135deg,#8b1a3a,#c23a6a);
        display: flex; justify-content: space-between; align-items: center;
        border-radius: 10px 10px 0 0; color: #fff; font-weight: bold;
        user-select: none;
    }
    #dousow-panel .ds-body { padding: 8px; overflow-y: auto; flex: 1; }
    #dousow-panel .ds-player {
        margin-bottom: 6px; padding: 8px; border-radius: 8px;
        background: rgba(139,26,58,0.15); border-left: 3px solid #c23a6a;
    }
    #dousow-panel .ds-player.sow { border-left-color: #ff3366; background: rgba(255,51,102,0.12); }
    #dousow-panel .ds-player.bitch { border-left-color: #ff88aa; }
    #dousow-panel input[type="text"], #dousow-panel input[type="number"] {
        background: rgba(30,10,20,0.9); border: 1px solid #c23a6a;
        color: #ffe0e8; padding: 3px 5px; border-radius: 4px;
        font-size: 11px; min-width: 0;
    }
    #dousow-panel button {
        background: #8b1a3a; border: 1px solid #c23a6a; color: #fff;
        padding: 3px 7px; border-radius: 4px; cursor: pointer;
        font-size: 11px; white-space: nowrap;
    }
    #dousow-panel button:active { background: #c23a6a; }
    #dousow-panel .ds-row { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
    #dousow-panel .ds-status {
        padding: 6px; background: rgba(255,51,102,0.15);
        border-radius: 6px; font-size: 11px; margin-bottom: 6px; color: #ffbbcc;
    }
    #dousow-panel .ds-effect-item { font-size: 10px; color: #ff99bb; margin-top: 2px; }
    #dousow-panel .ds-playpile { font-size: 10px; color: #ffccdd; padding: 4px; background: rgba(0,0,0,0.3); border-radius: 4px; margin-top: 4px; }
    </style>
    <div class="ds-header" id="ds-drag">
        <span>🐷 斗母猪</span>
        <span>
            <button id="ds-edit">⚙</button>
            <button id="ds-bg">🎨</button>
            <button id="ds-min">—</button>
        </span>
    </div>
    <div class="ds-body" id="ds-body"></div>
    `;
    document.body.appendChild(panel);

    const drag = document.getElementById('ds-drag');
    const onStart = (x, y) => {
        isDragging = true;
        const r = panel.getBoundingClientRect();
        dragOff.x = x - r.left;
        dragOff.y = y - r.top;
    };
    drag.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
    drag.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    document.addEventListener('mousemove', e => {
        if (!isDragging) return;
        panel.style.left = (e.clientX - dragOff.x) + 'px';
        panel.style.top = (e.clientY - dragOff.y) + 'px';
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
    });
    document.addEventListener('touchmove', e => {
        if (!isDragging) return;
        panel.style.left = (e.touches[0].clientX - dragOff.x) + 'px';
        panel.style.top = (e.touches[0].clientY - dragOff.y) + 'px';
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
    }, { passive: true });
    document.addEventListener('mouseup', () => isDragging = false);
    document.addEventListener('touchend', () => isDragging = false);

    document.getElementById('ds-edit').onclick = openEffectEditor;
    document.getElementById('ds-bg').onclick = cycleBg;
    document.getElementById('ds-min').onclick = () => {
        const b = document.getElementById('ds-body');
        b.style.display = b.style.display === 'none' ? 'block' : 'none';
    };
}

function cycleBg() {
    const colors = ['#4a0e0e','#2d0a2d','#0e2a4a','#4a2e0e','#1a0a0a','#3a1a2a','#2a0a0a'];
    const idx = colors.indexOf(uiSettings.bgColor);
    uiSettings.bgColor = colors[(idx + 1) % colors.length];
    panel.style.background = uiSettings.bgColor;
    saveAll();
}

function renderUI() {
    if (!panel) createUI();
    const body = document.getElementById('ds-body');
    if (!body || !G) return;

    let html = `<div class="ds-status">${phaseName(G.phase)} | 局${G.roundNumber} | 倍数×${G.multiplier}</div>`;

    html += `<div class="ds-row">
        <button onclick="window.DouSow.startNewGame()">🎮 新游戏</button>
        ${G.phase === 'deal' ? '<button onclick="window.DouSow.doDeal()">🃏 发牌</button>' : ''}
        ${G.phase === 'deal' ? '<button onclick="window.DouSow.triggerRule14()">⚠ 规则14</button>' : ''}
        ${G.phase === 'rest' ? '<button onclick="window.DouSow.nextRound()">▶ 下一局</button>' : ''}
        <button onclick="window.DouSow.doUndo()">↩ 撤回</button>
    </div>`;

    for (let i = 0; i < 3; i++) {
        const p = G.players[i];
        const cls = p.role === '母猪' ? 'sow' : p.role === '婊子' ? 'bitch' : '';
        const isCurrent = i === G.currentTurn;

        html += `<div class="ds-player ${cls}">`;
        html += `<div style="font-weight:bold;${isCurrent ? 'color:#ff66aa;' : ''}">
            <input type="text" value="${p.name}" data-name="${i}" style="width:60px;">
            ${p.role ? '(' + p.role + ')' : ''} | ${p.score}分 | 手牌${p.hand.length} | 连续母猪${G.consecutiveMother[i]}
        </div>`;
        html += `<div style="font-size:10px;color:#ffccdd;word-break:break-all;">手牌：${p.hand.join(' ') || '无'}</div>`;
        html += `<div style="font-size:10px;margin-top:2px;">衣物：<input type="text" data-clothes="${i}" value="${p.clothes || ''}" style="width:70%;"></div>`;

        // 效果
        if (p.effects.length > 0) {
            html += `<div style="font-size:10px;margin-top:2px;">效果：</div>`;
            for (let ei = 0; ei < p.effects.length; ei++) {
                const e = p.effects[ei];
                let dur;
                if (e.permanent) dur = '永久';
                else if (e.isInstant) dur = `剩余${e.remainingCount || 0}次`;
                else if (e.isGameDuration) dur = `${e.duration}局`;
                else dur = `${e.duration}${e.durationType === 'sec' ? '秒' : '轮'}`;
                const stack = (e.stacks && e.stacks > 1) ? `×${e.stacks}` : '';
                html += `<div class="ds-effect-item">· ${e.name}${stack}（${dur}）`;
                if (e.boy) html += ` [${e.boy}]`;
                html += `</div>`;
            }
        }
        // 10 减少按钮
        const has10 = p.effects.some(e => e.rank === '10' && e.isInstant);
        if (has10) {
            html += `<div class="ds-row"><button onclick="window.DouSow.reduce10(${i})">10减1</button></div>`;
        }

        // 阶段相关操作
        if (G.phase === 'bid' && i === G.currentTurn) {
            html += `<div class="ds-row">
                <button onclick="window.DouSow.doBid(${i},'不叫')">不叫</button>
                <button onclick="window.DouSow.doBid(${i},'1')">1分</button>
                <button onclick="window.DouSow.doBid(${i},'2')">2分</button>
                <button onclick="window.DouSow.doBid(${i},'3')">3分</button>
            </div>`;
        }
        if (G.phase === 'grab' && i === G.currentTurn) {
            html += `<div class="ds-row">
                <button onclick="window.DouSow.doGrab(${i},true)">抢母猪</button>
                <button onclick="window.DouSow.doGrab(${i},false)">不抢</button>
            </div>`;
        }
        if (G.phase === 'play') {
            html += `<div class="ds-row">
                <input type="text" id="ds-play-${i}" placeholder="如34567 或10JQKA" style="flex:1;">
                <button onclick="window.DouSow.doPlay(${i})">出</button>
                <button onclick="window.DouSow.doPass(${i})">不出</button>
            </div>`;
        }
        html += `</div>`;
    }

    if (G.phase === 'rest') {
        html += `<div class="ds-row">
            已过秒数：<input type="number" id="dousow-sec" style="width:70px;">
            <button onclick="window.DouSow.applySeconds()">确认扣除</button>
        </div>`;
    }

    if (G.playPile.length) {
        html += `<div class="ds-playpile">出牌堆：${G.playPile.slice(-6).map(x => x.player + ':' + x.cards).join(' → ')}</div>`;
    }

    body.innerHTML = html;

    // 绑定名字和衣物
    body.querySelectorAll('[data-name]').forEach(inp => {
        inp.onchange = () => { G.players[+inp.dataset.name].name = inp.value || DEFAULT_PLAYER_NAMES[+inp.dataset.name]; saveAll(); injectState(); };
    });
    body.querySelectorAll('[data-clothes]').forEach(inp => {
        inp.onchange = () => { G.players[+inp.dataset.clothes].clothes = inp.value; saveAll(); injectState(); };
    });
}

// ========== 效果编辑器 ==========
function openEffectEditor() {
    if (document.getElementById('dousow-editor')) { document.getElementById('dousow-editor').style.display = 'block'; return; }
    const div = document.createElement('div');
    div.id = 'dousow-editor';
    div.style.cssText = 'position:fixed;top:5%;left:5%;width:90%;max-width:520px;max-height:85vh;background:#2a0a12;color:#ffe0e8;padding:14px;border-radius:12px;z-index:100001;overflow:auto;border:2px solid #8b1a3a;font-size:12px;';

    let html = `<h3 style="color:#ff88aa;margin:0 0 8px;">⚙ 效果编辑器</h3>`;
    html += `<div style="font-size:10px;color:#ffaabb;margin-bottom:8px;">修改后点保存立即生效。锁定的卡不可编辑。</div>`;

    const allRanks = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','小王','大王'];
    for (const r of allRanks) {
        const e = effectsDB[r] || {};
        const locked = e.locked;
        const ro = locked ? 'readonly disabled' : '';
        html += `<div style="border-top:1px solid #5a1a2a;padding:6px 0;">
            <b style="color:#ff99bb;">${r}</b> ${locked ? '<span style="color:#888;">(锁定)</span>' : ''}
            <div style="margin-top:3px;">描述：<textarea data-k="${r}" data-f="desc" ${ro} style="width:100%;height:40px;background:#1a0508;color:#ffe0e8;border:1px solid #c23a6a;border-radius:4px;font-size:11px;">${e.desc || ''}</textarea></div>
            <div style="margin-top:3px;">单次轮数：<input type="number" data-k="${r}" data-f="duration" value="${e.duration ?? 1}" ${ro} style="width:50px;">
                叠加强度：<input type="checkbox" data-k="${r}" data-f="stackIntensity" ${e.stackIntensity ? 'checked' : ''} ${locked ? 'disabled' : ''}>
            </div>
            <div style="margin-top:3px;">男孩效果：<input type="text" data-k="${r}" data-f="boy" value="${(e.boy || '').replace(/"/g,'&quot;')}" ${ro} style="width:70%;"></div>
        </div>`;
    }

    html += `<div class="ds-row" style="margin-top:10px;">
        <button onclick="window.DouSow.saveEffects()">保存全部</button>
        <button onclick="window.DouSow.exportEffects()">导出JSON</button>
        <button onclick="window.DouSow.importEffects()">导入JSON</button>
        <button onclick="document.getElementById('dousow-editor').style.display='none'">关闭</button>
    </div>`;
    html += `<input type="file" id="ds-import-file" style="display:none;" accept=".json">`;

    div.innerHTML = html;
    document.body.appendChild(div);
}

function saveEffects() {
    document.querySelectorAll('#dousow-editor [data-k]').forEach(el => {
        const k = el.dataset.k, f = el.dataset.f;
        if (!effectsDB[k]) effectsDB[k] = {};
        if (f === 'stackIntensity') effectsDB[k][f] = el.checked;
        else if (f === 'duration') effectsDB[k][f] = parseInt(el.value) || 0;
        else effectsDB[k][f] = el.value;
    });
    saveAll();
    alert('已保存');
}

function exportEffects() {
    const blob = new Blob([JSON.stringify(effectsDB, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dousow_effects.json';
    a.click();
}

function importEffects() {
    const input = document.getElementById('ds-import-file');
    input.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                effectsDB = Object.assign({}, DEFAULT_EFFECTS, JSON.parse(ev.target.result));
                saveAll();
                document.getElementById('dousow-editor').style.display = 'none';
                openEffectEditor();
            } catch(err) { alert('导入失败：' + err.message); }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ========== 事件监听 ==========
function setupEvents() {
    try {
        eventSource.on(event_types.GENERATION_STARTED, () => {
            if (G && G.phase !== 'idle') injectState();
        });
        eventSource.on(event_types.MESSAGE_DELETED, (msgId) => {
            if (!G) return;
            // 简单处理：不自动回滚，提示用户手动撤回
            console.log('[DouSow] 消息被删除，建议手动撤回');
        });
    } catch(e) { console.warn('[DouSow] event setup', e); }
}

// ========== 斜杠命令 ==========
function setupCommands() {
    try {
        SlashCommandParser.addCommand({
            name: 'dousow',
            description: '斗母猪插件',
            callback: () => {
                if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
                return '';
            },
        });
    } catch(e) {}
}

// ========== 暴露方法 ==========
function exposeAPI() {
    window.DouSow = {
        startNewGame, doDeal, doBid, doGrab, doPlay, doPass, doUndo,
        nextRound, applySeconds, triggerRule14, reduce10,
        openEffectEditor, saveEffects, exportEffects, importEffects,
        getState: () => G,
        getStateText: buildStateText,
    };
}

// ========== 初始化 ==========
function init() {
    loadAll();
    createUI();
    renderUI();
    injectState();
    setupEvents();
    setupCommands();
    exposeAPI();
    console.log('[DouSow] 插件已加载');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}