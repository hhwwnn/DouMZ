/**
 * 斗母猪 - SillyTavern 第三方扩展
 * 文件路径建议：data/<用户名>/extensions/third-party/DouSow.js
 * 使用方式：右下角浮窗 + 斜杠命令 /dousow
 *
 * 本插件只负责：
 * - 牌局状态管理、手牌/效果/衣物/分数记录
 * - 用户手动输入出牌/不出/叫分/抢母猪
 * - 自动把当前状态注入 AI 提示词
 * - 效果时长与叠加层数记录（具体RP由AI执行）
 * - 不计牌型合法性校验、不给出牌建议
 */

(function () {
    'use strict';

    const EXTENSION_NAME = 'DouSow';
    const STORAGE_KEY = 'dousow_game_state_v1';
    const EFFECT_KEY = 'dousow_effects_v1';
    const UI_KEY = 'dousow_ui_v1';

    // ===================== 默认点数映射（仅用于扣分） =====================
    const RANK_SCORE = {
        '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        '十': 10, '10': 10,
        'J': 13, 'j': 13, 'Q': 14, 'q': 14, 'K': 15, 'k': 15,
        'A': 11, 'a': 11, '2': 12,
        '小王': 16, '大王': 17, '王': 16
    };

    // ===================== 默认效果定义 =====================
    const DEFAULT_EFFECTS = {
        '3': {
            name: '3',
            desc: '乳头与阴蒂敏感和大小在当前基础上增加3倍，随后男孩玩弄乳头与阴蒂持续一轮。火箭触发时大小/敏感永久，玩弄仅+1轮。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: true,
            boyEffect: '男孩玩弄乳头与阴蒂',
            editable: true
        },
        '4': {
            name: '4',
            desc: '强制用右手自慰，或要求男孩用手帮忙，持续一整轮。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: false,
            boyEffect: '男孩用手帮忙自慰',
            editable: true
        },
        '5': {
            name: '5',
            desc: '发热+发情（全身发热、下身湿润、夹腿、无意识蹭物），一名男孩用双腿玩素股持续一整局。发情影响意识。火箭触发时发热/发情永久，素股仅+1轮。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: true,
            boyEffect: '男孩用双腿玩素股',
            editable: true
        },
        '6': {
            name: '6',
            desc: '对应国家男孩上前抱住头强制口交一轮，期间看不到牌与牌桌。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: false,
            boyEffect: '强制口交',
            editable: true
        },
        '7': {
            name: '7',
            desc: '强制脱一件衣物。全部脱光后变为：阴道被魔法撑开到能直接看清内部，内壁扩张合不拢，持续一整局。多次触发依次打开子宫→输卵管→尿道→肛门→乳头。纯魔法。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: false,
            boyEffect: '',
            editable: false // 设计指令类，锁定
        },
        '8': {
            name: '8',
            desc: '乳房（不含乳头）变大、开始泌乳且敏感度翻倍，持续一轮。火箭触发时永久。可选择被男孩从乳头插入乳房性交，射精后大小减半但敏感再翻倍且时长+1轮。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: true,
            boyEffect: '可选：男孩从乳头插入乳房性交',
            editable: true
        },
        '9': {
            name: '9',
            desc: '强制高潮边缘：立刻推到即将高潮但不能真正高潮，保持一轮。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: false,
            boyEffect: '',
            editable: true
        },
        '10': {
            name: '10',
            desc: '强制高潮（完整一次：潮吹/痉挛/消退）。多次触发则在一次完整高潮结束后才触发下一次。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: false,
            boyEffect: '',
            editable: true
        },
        'J': {
            name: 'J',
            desc: '三个男孩分别咬住阴蒂和两个乳头大力啃咬，持续一整轮。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: false,
            boyEffect: '三个男孩啃咬阴蒂与乳头',
            editable: true
        },
        'Q': {
            name: 'Q',
            desc: '肛门被一个男孩强制性交一整轮。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: false,
            boyEffect: '肛门强制性交',
            editable: true
        },
        'K': {
            name: 'K',
            desc: '两个男孩受魔法强化，分别暴力蹂躏两个乳房（不含乳头），持续一整轮。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: false,
            boyEffect: '暴力蹂躏乳房',
            editable: true
        },
        'A': {
            name: 'A',
            desc: '强制被对应国家一个男孩性交一整轮，期间难以思考。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: false,
            boyEffect: '强制性交',
            editable: true
        },
        '2': {
            name: '2',
            desc: '强制剧烈高潮并保持高潮状态一整轮，期间无法思考且看不清牌与牌桌。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: false,
            boyEffect: '',
            editable: true
        },
        '小王': {
            name: '小王',
            desc: '锁定自身状态一整轮，无法被改变。锁定期间时长不减，新效果延迟到小王结束后按顺序触发。',
            durationType: 'round',
            defaultDuration: 1,
            stackIntensity: false,
            boyEffect: '',
            editable: false
        },
        '大王': {
            name: '大王',
            desc: '清空自身所有非永久效果。与其他牌一起出时不触发。',
            durationType: 'instant',
            defaultDuration: 0,
            stackIntensity: false,
            boyEffect: '',
            editable: false
        }
    };

    // ===================== 游戏状态 =====================
    let state = {
        phase: 'idle', // idle | deal | bid | grab | play | rest | end
        round: 0,
        multiplier: 1,
        currentPlayerIndex: 0, // 0=塞拉, 1=诺亚, 2=薇拉
        bidStartIndex: 0,
        motherIndex: -1,
        tempMotherIndex: -1,
        lastMotherIndex: -1,
        consecutiveMother: [0, 0, 0], // 连续当母猪次数
        players: [
            { name: '塞拉', role: '', score: 1000, hand: [], effects: [], clothes: '', baseScore: 0.5, bid: null, hasGrabbed: false },
            { name: '诺亚', role: '', score: 1000, hand: [], effects: [], clothes: '', baseScore: 0.5, bid: null, hasGrabbed: false },
            { name: '薇拉', role: '', score: 1000, hand: [], effects: [], clothes: '', baseScore: 0.5, bid: null, hasGrabbed: false }
        ],
        bottomCards: [],
        playPile: [],
        bombCount: 0,
        rocketCount: 0,
        spring: false,
        antiSpring: false,
        undoStack: [],
        lastActionMsgId: null
    };

    let effectsDB = JSON.parse(JSON.stringify(DEFAULT_EFFECTS));
    let uiSettings = {
        bgColor: '#4a0e0e',
        minimized: false,
        pos: { x: null, y: null }
    };

    // ===================== 工具函数 =====================
    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        localStorage.setItem(EFFECT_KEY, JSON.stringify(effectsDB));
        localStorage.setItem(UI_KEY, JSON.stringify(uiSettings));
    }

    function loadState() {
        try {
            const s = localStorage.getItem(STORAGE_KEY);
            if (s) state = Object.assign(state, JSON.parse(s));
            const e = localStorage.getItem(EFFECT_KEY);
            if (e) effectsDB = Object.assign({}, DEFAULT_EFFECTS, JSON.parse(e));
            const u = localStorage.getItem(UI_KEY);
            if (u) uiSettings = Object.assign(uiSettings, JSON.parse(u));
        } catch (err) {
            console.warn('[DouSow] loadState error', err);
        }
    }

    function pushUndo() {
        state.undoStack.push(JSON.parse(JSON.stringify(state)));
        if (state.undoStack.length > 30) state.undoStack.shift();
        saveState();
    }

    function doUndo() {
        if (state.undoStack.length === 0) {
            toastr.info('没有可撤回的操作');
            return;
        }
        const prev = state.undoStack.pop();
        // 保留 undoStack 本身
        const stack = state.undoStack;
        state = prev;
        state.undoStack = stack;
        saveState();
        renderUI();
        injectStateToPrompt();
        toastr.success('已撤回上一步');
    }

    // 解析用户输入的牌面字符串 → 点数数组
    // 支持：3 4 5 6 7  /  十  /  JQK  /  小王大王  /  5555  /  王炸
    function parseCards(input) {
        if (!input || !input.trim()) return [];
        let str = input.trim().replace(/\s+/g, '');
        // 特殊处理
        str = str.replace(/王炸|大小王|火箭/g, '小王大王');
        str = str.replace(/十/g, '10');
        const result = [];
        let i = 0;
        while (i < str.length) {
            if (str.substr(i, 2) === '10') {
                result.push('10');
                i += 2;
            } else if (str.substr(i, 2) === '小王') {
                result.push('小王');
                i += 2;
            } else if (str.substr(i, 2) === '大王') {
                result.push('大王');
                i += 2;
            } else {
                const ch = str[i].toUpperCase();
                if ('3456789JQKA2'.includes(ch) || ch === '王') {
                    result.push(ch === '王' ? '小王' : ch);
                }
                i++;
            }
        }
        return result;
    }

    function getRankScore(rank) {
        return RANK_SCORE[rank] || RANK_SCORE[rank.toUpperCase()] || 0;
    }

    // ===================== 效果系统核心 =====================
    function addEffect(playerIndex, cardRank, times = 1, isPermanent = false) {
        const p = state.players[playerIndex];
        const def = effectsDB[cardRank] || effectsDB[cardRank.toUpperCase()];
        if (!def) return;

        // 母猪翻倍 + 连续母猪额外
        let realTimes = times;
        if (p.role === '母猪') {
            realTimes *= 2;
            const consec = state.consecutiveMother[playerIndex] || 0;
            if (consec > 0) realTimes += 2 * consec;
        }

        // 婊子共享
        const targets = [];
        if (p.role === '婊子') {
            state.players.forEach((pl, idx) => {
                if (pl.role === '婊子') targets.push(idx);
            });
        } else {
            targets.push(playerIndex);
        }

        targets.forEach(ti => {
            const target = state.players[ti];
            let existing = target.effects.find(e => e.rank === cardRank);

            if (def.name === '7') {
                // 特殊处理7：先检测衣物
                handleSeven(ti, realTimes);
                return;
            }

            if (def.name === '大王') {
                // 清空非永久
                target.effects = target.effects.filter(e => e.permanent);
                return;
            }

            if (def.name === '小王') {
                // 锁定
                if (existing) {
                    existing.duration += def.defaultDuration * realTimes;
                } else {
                    target.effects.push({
                        rank: '小王',
                        name: '小王',
                        duration: def.defaultDuration * realTimes,
                        permanent: false,
                        stacks: 1,
                        boy: def.boyEffect || '',
                        desc: def.desc
                    });
                }
                return;
            }

            const addDuration = isPermanent ? 99999 : (def.defaultDuration * realTimes);
            const boyOnlyOneRound = isPermanent && def.boyEffect;

            if (existing) {
                if (def.stackIntensity) {
                    existing.stacks += realTimes;
                }
                existing.duration += addDuration;
                if (boyOnlyOneRound) {
                    // 男孩部分只+1轮，这里用标记
                    existing.boyDuration = (existing.boyDuration || 0) + 1;
                }
            } else {
                target.effects.push({
                    rank: cardRank,
                    name: def.name,
                    duration: addDuration,
                    permanent: isPermanent,
                    stacks: def.stackIntensity ? realTimes : 1,
                    boy: def.boyEffect || '',
                    boyDuration: boyOnlyOneRound ? 1 : addDuration,
                    desc: def.desc
                });
            }
        });
    }

    function handleSeven(playerIndex, times) {
        const p = state.players[playerIndex];
        // 衣物检测
        let clothesList = (p.clothes || '').split(/[,，\s]+/).filter(Boolean);
        for (let t = 0; t < times; t++) {
            if (clothesList.length > 0) {
                clothesList.pop();
                p.clothes = clothesList.join('，');
                // 脱衣是永久记录，不需要效果条目
            } else {
                // 已脱光 → 扩张效果（1局）
                let existing = p.effects.find(e => e.rank === '7_expand');
                if (existing) {
                    existing.stacks = (existing.stacks || 1) + 1;
                    existing.duration = 1; // 保持1局
                } else {
                    p.effects.push({
                        rank: '7_expand',
                        name: '7扩张',
                        duration: 1,
                        permanent: false,
                        stacks: 1,
                        boy: '',
                        desc: '阴道被魔法撑开，内壁扩张合不拢，可看清内部。层数越高打开部位越多（子宫→输卵管→尿道→肛门→乳头）。'
                    });
                }
            }
        }
    }

    // 轮到某人出牌时，减少其轮型效果时长
    function tickRoundEffects(playerIndex) {
        const p = state.players[playerIndex];
        // 先检查是否有小王锁定
        const hasLock = p.effects.some(e => e.rank === '小王' && e.duration > 0);
        if (hasLock) {
            // 只减小王
            p.effects.forEach(e => {
                if (e.rank === '小王') e.duration = Math.max(0, e.duration - 1);
            });
        } else {
            p.effects.forEach(e => {
                if (!e.permanent && e.durationType !== 'sec') {
                    e.duration = Math.max(0, e.duration - 1);
                }
            });
        }
        // 清理归零
        p.effects = p.effects.filter(e => e.permanent || e.duration > 0);
    }

    // ===================== 阶段逻辑 =====================
    function startNewGame() {
        pushUndo();
        state = {
            phase: 'deal',
            round: 0,
            multiplier: 1,
            currentPlayerIndex: 0,
            bidStartIndex: 0,
            motherIndex: -1,
            tempMotherIndex: -1,
            lastMotherIndex: -1,
            consecutiveMother: [0, 0, 0],
            players: state.players.map(p => ({
                name: p.name,
                role: '',
                score: 1000,
                hand: [],
                effects: [],
                clothes: p.clothes || '',
                baseScore: 0.5,
                bid: null,
                hasGrabbed: false
            })),
            bottomCards: [],
            playPile: [],
            bombCount: 0,
            rocketCount: 0,
            spring: false,
            antiSpring: false,
            undoStack: state.undoStack,
            lastActionMsgId: null
        };
        saveState();
        renderUI();
        injectStateToPrompt();
        toastr.success('新游戏已开始，请点击「发牌」');
    }

    function doDeal() {
        pushUndo();
        // 简单随机发牌（仅点数，无花色）
        const deck = [];
        ['3','4','5','6','7','8','9','10','J','Q','K','A','2'].forEach(r => {
            for (let i = 0; i < 4; i++) deck.push(r);
        });
        deck.push('小王', '大王');
        // 洗牌
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        state.players[0].hand = deck.slice(0, 17).sort(rankSort);
        state.players[1].hand = deck.slice(17, 34).sort(rankSort);
        state.players[2].hand = deck.slice(34, 51).sort(rankSort);
        state.bottomCards = deck.slice(51);
        state.phase = 'bid';
        state.round += 1;
        state.currentPlayerIndex = state.bidStartIndex;
        state.players.forEach(p => {
            p.bid = null;
            p.hasGrabbed = false;
            p.role = '';
            p.baseScore = 0.5;
        });
        state.tempMotherIndex = -1;
        state.motherIndex = -1;
        state.multiplier = 1;
        state.bombCount = 0;
        state.rocketCount = 0;
        saveState();
        renderUI();
        injectStateToPrompt();
        toastr.success('发牌完成，开始叫母猪');
    }

    function rankSort(a, b) {
        const order = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','小王','大王'];
        return order.indexOf(a) - order.indexOf(b);
    }

    function doBid(playerIndex, value) {
        pushUndo();
        const p = state.players[playerIndex];
        p.bid = value;
        if (value === '不叫') {
            p.baseScore = 0.5;
            // 肛门敏感翻3倍，持续2局（简单记录）
            p.effects.push({
                rank: '不叫惩罚',
                name: '不叫惩罚',
                duration: 2,
                permanent: false,
                stacks: 1,
                boy: '',
                desc: '肛门敏感度翻3倍（连续不叫叠加）'
            });
        } else {
            const num = parseInt(value);
            p.baseScore = num;
            // 叫分永久效果（高潮次数 + 敏感放大）
            p.effects.push({
                rank: '叫分永久',
                name: `叫${num}分永久`,
                duration: 99999,
                permanent: true,
                stacks: num,
                boy: '',
                desc: `立即完整高潮${num}次，阴蒂与乳头大小敏感永久×${num}`
            });
            if (num === 3) {
                state.tempMotherIndex = playerIndex;
            }
        }

        // 下一个
        let next = (playerIndex + 1) % 3;
        let allBid = state.players.every(pl => pl.bid !== null);
        if (allBid) {
            // 确定临时母猪
            if (state.tempMotherIndex === -1) {
                let max = 0;
                state.players.forEach((pl, idx) => {
                    if (pl.bid !== '不叫' && parseInt(pl.bid) > max) {
                        max = parseInt(pl.bid);
                        state.tempMotherIndex = idx;
                    }
                });
            }
            if (state.tempMotherIndex === -1) {
                // 全不叫
                state.players.forEach((pl, idx) => {
                    pl.hand.forEach(c => addEffect(idx, c, 1));
                });
                toastr.warning('全不叫，触发手牌效果后重新发牌');
                state.phase = 'deal';
            } else {
                state.phase = 'grab';
                state.currentPlayerIndex = (state.tempMotherIndex + 1) % 3;
            }
        } else {
            state.currentPlayerIndex = next;
        }
        saveState();
        renderUI();
        injectStateToPrompt();
    }

    function doGrab(playerIndex, grab) {
        pushUndo();
        if (grab) {
            state.players[playerIndex].hasGrabbed = true;
            state.multiplier += 2;
            // 永久乳房效果
            state.players[playerIndex].effects.push({
                rank: '抢母猪永久',
                name: '抢母猪永久',
                duration: 99999,
                permanent: true,
                stacks: 1,
                boy: '',
                desc: '乳房（不含乳头）大小翻倍、开始泌乳、敏感度翻倍（永久）'
            });
            state.tempMotherIndex = playerIndex;
        }
        // 检查是否所有可抢的人都决定完
        let canGrab = state.players.filter((p, i) => p.bid !== '不叫' && i !== state.tempMotherIndex && !p.hasGrabbed);
        // 简化：轮流一次后结束
        let next = (playerIndex + 1) % 3;
        let rounds = 0;
        while (rounds < 3 && (state.players[next].bid === '不叫' || state.players[next].hasGrabbed || next === state.tempMotherIndex)) {
            next = (next + 1) % 3;
            rounds++;
        }
        if (rounds >= 3 || next === playerIndex) {
            // 结束抢
            state.motherIndex = state.tempMotherIndex;
            state.players[state.motherIndex].role = '母猪';
            state.players.forEach((p, i) => {
                if (i !== state.motherIndex) p.role = '婊子';
            });
            // 连续母猪
            if (state.lastMotherIndex === state.motherIndex) {
                state.consecutiveMother[state.motherIndex]++;
            } else {
                state.consecutiveMother = [0, 0, 0];
                state.consecutiveMother[state.motherIndex] = 1;
            }
            state.lastMotherIndex = state.motherIndex;
            // 收底牌
            state.players[state.motherIndex].hand.push(...state.bottomCards);
            state.players[state.motherIndex].hand.sort(rankSort);
            state.bottomCards.forEach(c => addEffect(state.motherIndex, c, 1));
            state.phase = 'play';
            state.currentPlayerIndex = state.motherIndex;
            toastr.success(`${state.players[state.motherIndex].name} 成为母猪`);
        } else {
            state.currentPlayerIndex = next;
        }
        saveState();
        renderUI();
        injectStateToPrompt();
    }

    function doPlay(playerIndex, cardsStr) {
        pushUndo();
        const cards = parseCards(cardsStr);
        if (cards.length === 0) {
            toastr.error('无法解析牌面');
            return;
        }
        const p = state.players[playerIndex];
        // 简单从手牌移除（不做严格校验）
        cards.forEach(c => {
            const idx = p.hand.indexOf(c);
            if (idx >= 0) p.hand.splice(idx, 1);
        });
        state.playPile.push({ player: p.name, cards: cards.join('') });

        // 触发效果（按顺序）
        const order = ['3','8','4','5','6','7','10','A','2','J','Q','K','小王','9'];
        const counts = {};
        cards.forEach(c => {
            counts[c] = (counts[c] || 0) + 1;
        });

        // 火箭特殊
        if (cards.includes('小王') && cards.includes('大王')) {
            state.rocketCount++;
            state.multiplier += 2;
            // 触发所有其他牌4次 + 小王1次
            Object.keys(effectsDB).forEach(r => {
                if (r !== '大王' && r !== '小王') addEffect(playerIndex, r, 4);
            });
            addEffect(playerIndex, '小王', 1);
        } else {
            // 普通
            if (cards.filter(c => c === cards[0]).length === 4 && cards.length === 4) {
                state.bombCount++;
                state.multiplier += 2;
            }
            order.forEach(r => {
                if (counts[r]) addEffect(playerIndex, r, counts[r]);
            });
            // 大王单独
            if (cards.length === 1 && cards[0] === '大王') {
                addEffect(playerIndex, '大王', 1);
            }
        }

        // 检查是否出完
        if (p.hand.length === 0) {
            endRound(playerIndex);
            return;
        }

        // 下一玩家
        tickRoundEffects(playerIndex);
        state.currentPlayerIndex = (playerIndex + 1) % 3;
        saveState();
        renderUI();
        injectStateToPrompt();
    }

    function doPass(playerIndex) {
        pushUndo();
        // 不出：阴蒂被弹一下（仅记录）
        state.playPile.push({ player: state.players[playerIndex].name, cards: '不出' });
        tickRoundEffects(playerIndex);
        state.currentPlayerIndex = (playerIndex + 1) % 3;
        saveState();
        renderUI();
        injectStateToPrompt();
    }

    function endRound(winnerIndex) {
        // 触发剩余手牌
        state.players.forEach((p, idx) => {
            p.hand.forEach(c => {
                if (c !== '大王') addEffect(idx, c, 1);
            });
        });

        // 计分
        const mother = state.players[state.motherIndex];
        const isMotherWin = winnerIndex === state.motherIndex;
        const mult = state.multiplier;

        if (isMotherWin) {
            mother.score += 2 * mother.baseScore * mult;
            state.players.forEach((p, i) => {
                if (i !== state.motherIndex) p.score -= p.baseScore * mult;
            });
        } else {
            mother.score -= 2 * mother.baseScore * mult;
            state.players.forEach((p, i) => {
                if (i !== state.motherIndex) p.score += p.baseScore * mult;
            });
        }

        // 额外扣分：剩余效果 牌面额 × 层数
        state.players.forEach(p => {
            let extra = 0;
            p.effects.forEach(e => {
                if (e.rank === '叫分永久' || e.rank === '抢母猪永久' || e.rank === '不叫惩罚') return;
                const score = getRankScore(e.rank.replace('_expand', '7'));
                extra += score * (e.stacks || 1);
            });
            p.score -= extra;
        });

        state.phase = 'rest';
        // 转换轮→秒
        state.players.forEach(p => {
            p.effects.forEach(e => {
                if (!e.permanent && e.duration < 1000) {
                    e.duration *= 180;
                    e.durationType = 'sec';
                }
            });
        });

        saveState();
        renderUI();
        injectStateToPrompt();
        toastr.success(`本局结束！${state.players[winnerIndex].name} 出完`);
    }

    function nextRound() {
        pushUndo();
        state.phase = 'deal';
        state.bidStartIndex = (state.motherIndex + 1) % 3;
        state.playPile = [];
        state.bottomCards = [];
        state.players.forEach(p => {
            p.hand = [];
            p.role = '';
            p.bid = null;
            p.hasGrabbed = false;
        });
        saveState();
        renderUI();
        injectStateToPrompt();
    }

    // ===================== AI 状态注入 =====================
    function buildStateText() {
        let txt = `【斗母猪当前状态】\n`;
        txt += `阶段：${phaseName(state.phase)} | 局数：${state.round} | 倍数：${state.multiplier}\n`;
        txt += `当前行动玩家：${state.players[state.currentPlayerIndex]?.name || '无'}\n\n`;

        state.players.forEach((p, i) => {
            txt += `【${p.name}】角色：${p.role || '未定'} | 分数：${p.score} | 手牌数：${p.hand.length}\n`;
            txt += `手牌：${p.hand.join(' ') || '无'}\n`;
            txt += `剩余衣物：${p.clothes || '（未填写）'}\n`;
            txt += `连续当母猪次数：${state.consecutiveMother[i]}\n`;
            if (p.effects.length) {
                txt += `当前效果：\n`;
                p.effects.forEach(e => {
                    const dur = e.permanent ? '永久' : (e.durationType === 'sec' ? e.duration + '秒' : e.duration + '轮');
                    txt += `  - ${e.name}（层数${e.stacks || 1}，剩余${dur}）${e.boy ? ' | 男孩：' + e.boy : ''}\n`;
                    txt += `    ${e.desc}\n`;
                });
            } else {
                txt += `当前效果：无\n`;
            }
            txt += `\n`;
        });

        if (state.bottomCards.length) {
            txt += `底牌：${state.bottomCards.join(' ')}\n`;
        }
        if (state.playPile.length) {
            txt += `出牌记录：${state.playPile.slice(-8).map(x => x.player + ':' + x.cards).join(' → ')}\n`;
        }
        return txt;
    }

    function phaseName(ph) {
        const map = { idle: '空闲', deal: '发牌阶段', bid: '叫母猪', grab: '抢母猪', play: '出牌阶段', rest: '中场休息', end: '游戏结束' };
        return map[ph] || ph;
    }

    function injectStateToPrompt() {
        // SillyTavern 常见注入方式：通过全局变量或 event
        if (typeof window.syllabus_prompt_injection !== 'undefined') {
            // 兼容部分扩展
        }
        // 最通用：挂到 window 供其他脚本或手动复制
        window.DouSowStateText = buildStateText();
        // 如果 ST 支持 extension prompt injection
        if (window.SillyTavern && window.SillyTavern.getContext) {
            try {
                const ctx = window.SillyTavern.getContext();
                // 部分版本支持 setExtensionPrompt
                if (ctx.setExtensionPrompt) {
                    ctx.setExtensionPrompt('DouSow', buildStateText(), 1, false);
                }
            } catch (e) {}
        }
    }

    // ===================== UI =====================
    let panel = null;

    function createUI() {
        if (document.getElementById('dousow-panel')) return;

        panel = document.createElement('div');
        panel.id = 'dousow-panel';
        panel.innerHTML = `
            <div id="dousow-header" style="cursor:move;padding:8px 12px;background:#2a0000;color:#ffb6c1;font-weight:bold;display:flex;justify-content:space-between;align-items:center;border-radius:8px 8px 0 0;">
                <span>🐷 斗母猪</span>
                <div>
                    <button id="dousow-min" style="margin-right:6px;">—</button>
                    <button id="dousow-close" style="display:none;">×</button>
                </div>
            </div>
            <div id="dousow-body" style="padding:10px;max-height:70vh;overflow-y:auto;font-size:13px;"></div>
        `;
        Object.assign(panel.style, {
            position: 'fixed',
            right: '10px',
            bottom: '10px',
            width: 'min(360px, 95vw)',
            background: uiSettings.bgColor,
            color: '#ffe4e1',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            zIndex: 99999,
            fontFamily: 'sans-serif',
            userSelect: 'none'
        });
        document.body.appendChild(panel);

        // 拖动
        makeDraggable(panel, document.getElementById('dousow-header'));

        document.getElementById('dousow-min').onclick = () => {
            const body = document.getElementById('dousow-body');
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
            uiSettings.minimized = body.style.display === 'none';
            saveState();
        };

        renderUI();
    }

    function makeDraggable(el, handle) {
        let ox, oy, dragging = false;
        handle.addEventListener('mousedown', e => {
            dragging = true;
            ox = e.clientX - el.getBoundingClientRect().left;
            oy = e.clientY - el.getBoundingClientRect().top;
        });
        handle.addEventListener('touchstart', e => {
            dragging = true;
            const t = e.touches[0];
            ox = t.clientX - el.getBoundingClientRect().left;
            oy = t.clientY - el.getBoundingClientRect().top;
        }, { passive: true });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            el.style.left = (e.clientX - ox) + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.top = (e.clientY - oy) + 'px';
        });
        document.addEventListener('touchmove', e => {
            if (!dragging) return;
            const t = e.touches[0];
            el.style.left = (t.clientX - ox) + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.top = (t.clientY - oy) + 'px';
        }, { passive: true });
        document.addEventListener('mouseup', () => dragging = false);
        document.addEventListener('touchend', () => dragging = false);
    }

    function renderUI() {
        if (!panel) return;
        const body = document.getElementById('dousow-body');
        if (!body) return;

        let html = `
            <div style="margin-bottom:8px;font-size:12px;opacity:0.9;">
                ${phaseName(state.phase)} | 局${state.round} | 倍数×${state.multiplier}
            </div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
                <button class="ds-btn" onclick="window.DouSow.startNewGame()">🎮 新游戏</button>
                ${state.phase === 'deal' ? '<button class="ds-btn" onclick="window.DouSow.doDeal()">🃏 发牌</button>' : ''}
                ${state.phase === 'deal' ? '<button class="ds-btn" onclick="window.DouSow.triggerRule14()">⚠ 规则14</button>' : ''}
                ${state.phase === 'rest' ? '<button class="ds-btn" onclick="window.DouSow.nextRound()">▶ 下一局</button>' : ''}
                <button class="ds-btn" onclick="window.DouSow.doUndo()">↩ 撤回</button>
                <button class="ds-btn" onclick="window.DouSow.openEffectEditor()">⚙ 效果</button>
                <button class="ds-btn" onclick="window.DouSow.changeBg()">🎨</button>
            </div>
        `;

        // 玩家信息
        state.players.forEach((p, i) => {
            const isCurrent = i === state.currentPlayerIndex && (state.phase === 'bid' || state.phase === 'grab' || state.phase === 'play');
            html += `
                <div style="border:1px solid ${isCurrent ? '#ff69b4' : '#5a2a2a'};border-radius:6px;padding:6px;margin-bottom:6px;background:rgba(0,0,0,0.25);">
                    <div style="font-weight:bold;">${p.name} ${p.role ? '(' + p.role + ')' : ''} | ${p.score}分 | 手牌${p.hand.length}</div>
                    <div style="font-size:11px;word-break:break-all;">${p.hand.join(' ') || '无'}</div>
                    <div style="font-size:11px;">衣物：<input data-idx="${i}" class="ds-clothes" value="${p.clothes || ''}" style="width:70%;background:#2a1010;color:#fff;border:1px solid #666;border-radius:3px;padding:2px;"></div>
                    <div style="font-size:11px;margin-top:2px;">效果：${p.effects.map(e => e.name + (e.stacks > 1 ? '×' + e.stacks : '') + (e.permanent ? '(永久)' : '(' + e.duration + ')')).join('，') || '无'}</div>
            `;

            if (state.phase === 'bid' && i === state.currentPlayerIndex) {
                html += `<div style="margin-top:4px;">
                    <button class="ds-btn" onclick="window.DouSow.doBid(${i},'不叫')">不叫</button>
                    <button class="ds-btn" onclick="window.DouSow.doBid(${i},'1分')">1分</button>
                    <button class="ds-btn" onclick="window.DouSow.doBid(${i},'2分')">2分</button>
                    <button class="ds-btn" onclick="window.DouSow.doBid(${i},'3分')">3分</button>
                </div>`;
            }
            if (state.phase === 'grab' && i === state.currentPlayerIndex && p.bid !== '不叫') {
                html += `<div style="margin-top:4px;">
                    <button class="ds-btn" onclick="window.DouSow.doGrab(${i},true)">抢母猪</button>
                    <button class="ds-btn" onclick="window.DouSow.doGrab(${i},false)">不抢</button>
                </div>`;
            }
            if (state.phase === 'play') {
                html += `<div style="margin-top:4px;display:flex;gap:4px;">
                    <input id="ds-input-${i}" placeholder="输入牌面 如34567或十JQK" style="flex:1;background:#2a1010;color:#fff;border:1px solid #666;border-radius:3px;padding:3px;font-size:12px;">
                    <button class="ds-btn" onclick="window.DouSow.doPlay(${i}, document.getElementById('ds-input-${i}').value)">出</button>
                    <button class="ds-btn" onclick="window.DouSow.doPass(${i})">不出</button>
                </div>`;
            }
            html += `</div>`;
        });

        if (state.phase === 'rest') {
            html += `
                <div style="margin-top:8px;">
                    中场已过秒数：<input id="ds-sec" type="number" style="width:80px;background:#2a1010;color:#fff;border:1px solid #666;">
                    <button class="ds-btn" onclick="window.DouSow.applySeconds()">确认扣除</button>
                </div>
            `;
        }

        if (state.bottomCards.length && state.phase !== 'deal' && state.phase !== 'bid') {
            html += `<div style="font-size:12px;margin-top:6px;">底牌：${state.bottomCards.join(' ')}</div>`;
        }

        html += `<div style="font-size:11px;margin-top:8px;opacity:0.7;">出牌记录：${state.playPile.slice(-6).map(x => x.player + ':' + x.cards).join(' → ') || '无'}</div>`;
        html += `<div style="font-size:10px;margin-top:6px;opacity:0.5;">状态已自动注入 window.DouSowStateText，可复制给AI</div>`;

        body.innerHTML = html;

        // 衣物输入绑定
        body.querySelectorAll('.ds-clothes').forEach(inp => {
            inp.onchange = () => {
                const idx = parseInt(inp.dataset.idx);
                state.players[idx].clothes = inp.value;
                saveState();
                injectStateToPrompt();
            };
        });

        // 样式
        if (!document.getElementById('dousow-style')) {
            const style = document.createElement('style');
            style.id = 'dousow-style';
            style.textContent = `
                .ds-btn {
                    background: #8b0000;
                    color: #ffe4e1;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 12px;
                    cursor: pointer;
                    margin: 1px;
                }
                .ds-btn:active { background: #a52a2a; }
            `;
            document.head.appendChild(style);
        }
    }

    function openEffectEditor() {
        let html = '<div style="max-height:60vh;overflow:auto;">';
        Object.keys(effectsDB).forEach(key => {
            const e = effectsDB[key];
            html += `
                <div style="border-bottom:1px solid #5a2a2a;padding:6px 0;">
                    <b>${key}</b> ${e.editable ? '' : '(锁定)'}
                    <div>描述：<textarea data-key="${key}" data-field="desc" ${e.editable ? '' : 'readonly'} style="width:100%;height:40px;background:#2a1010;color:#fff;border:1px solid #666;">${e.desc}</textarea></div>
                    <div>默认轮数：<input data-key="${key}" data-field="defaultDuration" type="number" value="${e.defaultDuration}" ${e.editable ? '' : 'readonly'} style="width:50px;background:#2a1010;color:#fff;"></div>
                    <div>叠加强度：<input data-key="${key}" data-field="stackIntensity" type="checkbox" ${e.stackIntensity ? 'checked' : ''} ${e.editable ? '' : 'disabled'}></div>
                    <div>男孩效果：<input data-key="${key}" data-field="boyEffect" value="${e.boyEffect || ''}" ${e.editable ? '' : 'readonly'} style="width:90%;background:#2a1010;color:#fff;"></div>
                </div>
            `;
        });
        html += '<button class="ds-btn" onclick="window.DouSow.saveEffects()">保存效果</button></div>';

        // 简单弹窗
        const div = document.createElement('div');
        div.id = 'dousow-editor';
        div.style.cssText = 'position:fixed;top:10%;left:5%;width:90%;max-width:400px;background:#3a0a0a;color:#fff;padding:12px;border-radius:8px;z-index:100000;max-height:80vh;overflow:auto;';
        div.innerHTML = html + '<br><button class="ds-btn" onclick="this.parentElement.remove()">关闭</button>';
        document.body.appendChild(div);
    }

    function saveEffects() {
        document.querySelectorAll('#dousow-editor [data-key]').forEach(el => {
            const key = el.dataset.key;
            const field = el.dataset.field;
            if (field === 'stackIntensity') {
                effectsDB[key][field] = el.checked;
            } else if (field === 'defaultDuration') {
                effectsDB[key][field] = parseInt(el.value) || 1;
            } else {
                effectsDB[key][field] = el.value;
            }
        });
        saveState();
        toastr.success('效果已保存');
        document.getElementById('dousow-editor')?.remove();
    }

    function changeBg() {
        const colors = ['#4a0e0e', '#2d0a2d', '#0e2a4a', '#4a2e0e', '#1a0a0a', '#3a1a2a'];
        const idx = colors.indexOf(uiSettings.bgColor);
        uiSettings.bgColor = colors[(idx + 1) % colors.length];
        if (panel) panel.style.background = uiSettings.bgColor;
        saveState();
    }

    function triggerRule14() {
        pushUndo();
        // 规则14 = 变更后的7（扩张）
        state.players.forEach((p, i) => {
            p.effects.push({
                rank: '7_expand',
                name: '规则14扩张',
                duration: 1,
                permanent: false,
                stacks: 1,
                boy: '',
                desc: '开局未上桌：阴道被魔法撑开到能直接看清内部，持续一整局，随后高潮并被触手拖回座位。'
            });
        });
        saveState();
        renderUI();
        injectStateToPrompt();
        toastr.warning('已触发规则14惩罚');
    }

    function applySeconds() {
        const sec = parseInt(document.getElementById('ds-sec')?.value) || 0;
        if (sec <= 0) return;
        pushUndo();
        state.players.forEach(p => {
            p.effects.forEach(e => {
                if (e.durationType === 'sec' && !e.permanent) {
                    e.duration = Math.max(0, e.duration - sec);
                }
            });
            p.effects = p.effects.filter(e => e.permanent || e.duration > 0);
        });
        saveState();
        renderUI();
        injectStateToPrompt();
        toastr.success(`已扣除 ${sec} 秒`);
    }

    // ===================== 初始化与导出 =====================
    function init() {
        loadState();
        createUI();
        injectStateToPrompt();

        // 斜杠命令
        if (window.SillyTavern && window.SillyTavern.getContext) {
            try {
                const ctx = window.SillyTavern.getContext();
                if (ctx.registerSlashCommand) {
                    ctx.registerSlashCommand('dousow', () => {
                        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                    }, [], '切换斗母猪面板', true, true);
                }
            } catch (e) {}
        }

        // 暴露给按钮
        window.DouSow = {
            startNewGame,
            doDeal,
            doBid,
            doGrab,
            doPlay,
            doPass,
            doUndo,
            nextRound,
            openEffectEditor,
            saveEffects,
            changeBg,
            triggerRule14,
            applySeconds,
            getStateText: buildStateText
        };

        console.log('[DouSow] 斗母猪插件已加载');
    }

    // 等待 DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
