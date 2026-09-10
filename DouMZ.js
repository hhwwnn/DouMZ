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