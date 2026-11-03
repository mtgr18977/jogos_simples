(() => {
    'use strict';

    const canvas = document.getElementById('snake');
    const ctx = canvas.getContext('2d');
    const LW = canvas.width, LH = canvas.height;     // tamanho lógico (480×480)
    const COLS = 20, ROWS = 20, CELL = LW / COLS;
    const fit = Fit.setup(canvas, LW, LH);

    const overlay = document.getElementById('overlay');
    const ovTitle = document.getElementById('ov-title');
    const ovText = document.getElementById('ov-text');
    const ovButton = document.getElementById('ov-button');
    const wallsSelect = document.getElementById('walls');
    const bestBody = document.querySelector('#best tbody');

    let s = SnakeLogic.create(COLS, ROWS);
    let state = 'menu';              // menu | playing | paused | over
    let wrap = false;
    let acc = 0;
    let particles = [];
    let best = { solid: 0, wrap: 0 };
    const LABEL = { solid: 'Sólidas', wrap: 'Atravessáveis' };

    try {
        const b = JSON.parse(localStorage.getItem('snakeBest'));
        if (b && typeof b === 'object') best = { solid: b.solid | 0, wrap: b.wrap | 0 };
    } catch (e) { /* ignora */ }

    function renderBest() {
        bestBody.innerHTML = '';
        for (const k of ['solid', 'wrap']) {
            const tr = bestBody.insertRow();
            tr.insertCell().textContent = LABEL[k];
            tr.insertCell().textContent = best[k];
        }
    }

    function showOverlay(title, text, button) {
        ovTitle.textContent = title;
        ovText.textContent = text;
        ovButton.textContent = button;
        wallsSelect.parentElement.style.display = state === 'paused' ? 'none' : '';
        renderBest();
        overlay.hidden = false;
        ovButton.focus();
    }

    function start() {
        wrap = wallsSelect.value === 'wrap';
        s = SnakeLogic.create(COLS, ROWS);
        acc = 0;
        particles = [];
        state = 'playing';
        overlay.hidden = true;
    }

    function togglePause() {
        if (state === 'playing') { state = 'paused'; showOverlay('Pausado', 'Espaço ou P para continuar', 'Continuar'); }
        else if (state === 'paused') { state = 'playing'; overlay.hidden = true; }
    }

    function die(won) {
        state = 'over';
        const key = wrap ? 'wrap' : 'solid';
        const record = s.score > best[key];
        if (record) {
            best[key] = s.score;
            try { localStorage.setItem('snakeBest', JSON.stringify(best)); } catch (e) { /* ignora */ }
        }
        (won ? Sfx.win : Sfx.lose)();
        showOverlay(won ? 'Você zerou o jogo! 🏆' : 'Fim de jogo',
            `Maçãs: ${s.score}` + (record && s.score > 0 ? '\n🏆 Novo recorde!' : ''), 'Jogar novamente');
    }

    ovButton.addEventListener('click', () => { if (state === 'paused') togglePause(); else start(); });

    // ---------- Entrada ----------
    const DIRS = {
        ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
        ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
        ArrowDown: [0, 1], s: [0, 1], S: [0, 1]
    };
    document.addEventListener('keydown', e => {
        if (DIRS[e.key]) {
            e.preventDefault();
            if (state === 'playing') SnakeLogic.turn(s, ...DIRS[e.key]);
            return;
        }
        if (e.repeat) return;
        if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (state === 'playing' || state === 'paused') { e.preventDefault(); togglePause(); }
        } else if (e.key === 'Enter' && (state === 'over' || state === 'menu')) start();
    });
    window.addEventListener('blur', () => { if (state === 'playing') togglePause(); });

    document.getElementById('touch').addEventListener('pointerdown', e => {
        const b = e.target.closest('button[data-dir]');
        if (!b || state !== 'playing') return;
        e.preventDefault();
        SnakeLogic.turn(s, ...b.dataset.dir.split(',').map(Number));
    });

    // Deslizar o dedo na tela
    let touch0 = null;
    canvas.addEventListener('pointerdown', e => { touch0 = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => {
        if (!touch0 || state !== 'playing') return;
        const dx = e.clientX - touch0.x, dy = e.clientY - touch0.y;
        touch0 = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
        if (Math.abs(dx) > Math.abs(dy)) SnakeLogic.turn(s, Math.sign(dx), 0);
        else SnakeLogic.turn(s, 0, Math.sign(dy));
    });

    // ---------- Loop ----------
    function burst(x, y) {
        for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 140;
            particles.push({ x: (x + 0.5) * CELL, y: (y + 0.5) * CELL, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 });
        }
    }

    function update(dt) {
        for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
        particles = particles.filter(p => p.life > 0);
        if (state !== 'playing') return;
        acc += dt;
        const interval = SnakeLogic.stepInterval(s.score);
        while (acc >= interval && state === 'playing') {
            acc -= interval;
            const r = SnakeLogic.step(s, wrap);
            if (r === 'eat' || r === 'win') { Sfx.eat(); burst(s.snake[0].x, s.snake[0].y); }
            if (r === 'dead') die(false);
            else if (r === 'win') die(true);
        }
    }

    function draw() {
        fit.apply(ctx);
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, LW, LH);
        // Tabuleiro quadriculado
        for (let y = 0; y < ROWS; y++)
            for (let x = 0; x < COLS; x++) {
                ctx.fillStyle = (x + y) % 2 ? '#161b22' : '#1b212a';
                ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            }
        if (!wrap) { ctx.strokeStyle = '#8b949e'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, LW - 2, LH - 2); }

        if (s.food) {                                   // maçã
            ctx.fillStyle = '#e53935';
            ctx.beginPath();
            ctx.arc((s.food.x + 0.5) * CELL, (s.food.y + 0.5) * CELL, CELL * 0.38, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#43a047';
            ctx.fillRect((s.food.x + 0.5) * CELL - 1, s.food.y * CELL + 2, 3, 6);
        }
        s.snake.forEach((p, i) => {                     // cobra: cabeça mais clara, corpo em degradê
            ctx.fillStyle = i === 0 ? '#9be564' : `hsl(110, 55%, ${Math.max(28, 48 - i * 1.2)}%)`;
            const pad = i === 0 ? 1 : 2;
            ctx.fillRect(p.x * CELL + pad, p.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
        });
        const h = s.snake[0];                           // olhos
        ctx.fillStyle = '#000';
        const ex = s.dir.x, ey = s.dir.y;
        for (const o of [-1, 1]) {
            ctx.fillRect((h.x + 0.5) * CELL + (ex ? ex * 5 : o * 5) - 2, (h.y + 0.5) * CELL + (ey ? ey * 5 : o * 5) - 2, 4, 4);
        }

        ctx.fillStyle = '#fff';
        for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillRect(p.x, p.y, 3, 3); }
        ctx.globalAlpha = 1;

        ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillText(`Maçãs: ${s.score}`, 10, 22);
    }

    let last = performance.now();
    function frame(now) {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        update(dt);
        draw();
        requestAnimationFrame(frame);
    }

    showOverlay('Snake', 'Coma as maçãs sem bater em você mesma.', 'Jogar');
    requestAnimationFrame(frame);
})();
