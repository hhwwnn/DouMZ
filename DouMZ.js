(function () {
    function createPanel() {
        var old = document.getElementById('dousow-panel');
        if (old) old.remove();

        var p = document.createElement('div');
        p.id = 'dousow-panel';
        p.style.position = 'fixed';
        p.style.left = '30px';
        p.style.top = '30px';
        p.style.width = '350px';
        p.style.minHeight = '200px';
        p.style.background = '#4a0e0e';
        p.style.color = '#fff';
        p.style.border = '5px solid #ff3366';
        p.style.zIndex = '2147483647';
        p.style.padding = '20px';
        p.style.fontSize = '16px';
        p.style.boxSizing = 'border-box';

        var title = document.createElement('div');
        title.textContent = '🐷 斗母猪测试面板';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '10px';
        p.appendChild(title);

        var msg = document.createElement('div');
        msg.textContent = '如果你看到这个粉色边框的方块，说明浮窗可以显示。';
        p.appendChild(msg);

        var btn = document.createElement('button');
        btn.textContent = '测试按钮';
        btn.style.marginTop = '10px';
        btn.style.padding = '5px 10px';
        btn.onclick = function () {
            alert('按钮点击成功！');
        };
        p.appendChild(btn);

        document.body.appendChild(p);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createPanel);
    } else {
        createPanel();
    }
})();
