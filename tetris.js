    (() => {
        'use strict';

        // ---------- Elementos ----------
        const $ = id => document.getElementById(id);
        const canvas = $('board'), ctx = canvas.getContext('2d');
        const nextCanvas = $('next'), nextCtx = nextCanvas.getContext('2d');
        const holdCanvas = $('hold'), holdCtx = holdCanvas.getContext('2d');
        const overlay = $('overlay');

        // ---------- Constantes ----------
        const { COLS, ROWS, SHAPES, cloneMatrix, rotateCW, rotateCCW, createArena,
                collides: collidesIn, sweepLines, lineScore, dropInterval: dropIntervalFor, levelFor, makeBag } = TetrisLogic;
        const CELL = 24;
        const LW = COLS * CELL, LH = ROWS * CELL;      // tamanho lógico do tabuleiro (240×480)
        const fit = Fit.setup(canvas, LW, LH, {
            // 230 = painel lateral + espaço; em telas estreitas o painel vai para baixo do tabuleiro
            extraW: () => (window.innerWidth < 640 ? 0 : 230)
        });
        const TIME_LIMIT = 120;        // segundos (modo Tempo)
        const CHALLENGE_GOAL = 20;     // linhas (modo Desafio)
        const CHALLENGE_GARBAGE = 8;   // linhas de lixo iniciais
        const MODE_NAMES = { classic: 'Clássico', time: 'Tempo', challenge: 'Desafio', turbo: 'Turbo' };
        // baseLevel: nível inicial · perLevel: linhas necessárias para subir de nível
        const MODE_RULES = {
            classic:   { baseLevel: 1,  perLevel: 10 },
            time:      { baseLevel: 1,  perLevel: 10 },
            challenge: { baseLevel: 3,  perLevel: 10 },
            turbo:     { baseLevel: 10, perLevel: 5 }      // começa rápido e acelera depressa
        };
        const COLORS = [null, '#00e5ee', '#3b5bff', '#ff9f1a', '#ffd400', '#2ecc40', '#b455f0', '#ff3b3b'];

        let nextType = makeBag();
        let particles = [];

        // ---------- Estado ----------
        const g = {
            state: 'menu',        // menu | playing | paused | over
            mode: 'classic',
            arena: [],
            cur: null,            // { type, m, x, y }
            next: null,
            hold: null,
            canHold: true,
            score: 0, lines: 0, level: 1, baseLevel: 1,
            elapsed: 0,           // segundos de jogo efetivo (não conta a pausa)
            dropAcc: 0,
            result: ''
        };

        // ---------- Colisão e movimentos ----------
        const collides = (m, px, py) => collidesIn(g.arena, m, px, py);

        function spawn(type) {
            const m = cloneMatrix(SHAPES[type]);
            g.cur = { type, m, x: Math.floor((COLS - m[0].length) / 2), y: 0 };
            g.canHold = true;
            g.dropAcc = 0;
            return !collides(g.cur.m, g.cur.x, g.cur.y);
        }

        function move(dx) {
            if (g.state !== 'playing') return;
            if (!collides(g.cur.m, g.cur.x + dx, g.cur.y)) { g.cur.x += dx; Sfx.move(); }
        }

        function rotate(dir) {
            if (g.state !== 'playing' || g.cur.type === 'O') return;
            const rotated = dir > 0 ? rotateCW(g.cur.m) : rotateCCW(g.cur.m);
            // "Wall kick": tenta deslocar a peça se ela bater na parede/outra peça
            for (const dx of [0, -1, 1, -2, 2]) {
                if (!collides(rotated, g.cur.x + dx, g.cur.y)) {
                    g.cur.m = rotated;
                    g.cur.x += dx;
                    Sfx.rotate();
                    return;
                }
            }
        }

        function softDrop() {
            if (g.state !== 'playing') return;
            if (!collides(g.cur.m, g.cur.x, g.cur.y + 1)) {
                g.cur.y++;
                g.score += 1;
                g.dropAcc = 0;
            } else {
                lock();
            }
        }

        function ghostY() {
            let y = g.cur.y;
            while (!collides(g.cur.m, g.cur.x, y + 1)) y++;
            return y;
        }

        function hardDrop() {
            if (g.state !== 'playing') return;
            const y = ghostY();
            g.score += (y - g.cur.y) * 2;
            g.cur.y = y;
            lock();
        }

        function hold() {
            if (g.state !== 'playing' || !g.canHold) return;
            const type = g.cur.type;
            let ok;
            if (g.hold) {
                ok = spawn(g.hold);
            } else {
                ok = spawn(g.next);
                g.next = nextType();
            }
            g.hold = type;
            g.canHold = false;
            if (!ok) finish('Game Over');
        }

        // ---------- Travar peça, limpar linhas, pontuar ----------
        function lock() {
            const { m, x, y } = g.cur;
            let topOut = false;
            m.forEach((row, cy) => row.forEach((v, cx) => {
                if (!v) return;
                if (y + cy < 0) { topOut = true; return; }
                g.arena[y + cy][x + cx] = v;
            }));
            if (topOut) { finish('Game Over'); return; }
            Sfx.lock();

            const fullRows = g.arena.map((r, i) => r.every(Boolean) ? i : -1).filter(i => i >= 0);
            const cleared = sweepLines(g.arena);
            if (cleared) {
                burst(fullRows);
                Sfx.clear(cleared);
                g.score += lineScore(cleared, g.level);
                g.lines += cleared;
                g.level = levelFor(g.lines, g.baseLevel, MODE_RULES[g.mode].perLevel);
            }

            if (g.mode === 'challenge' && g.lines >= CHALLENGE_GOAL) {
                finish('Desafio completo! 🎉');
                return;
            }

            // Só agora (depois de limpar as linhas) a próxima peça entra
            if (!spawn(g.next)) { finish('Game Over'); return; }
            g.next = nextType();
        }

        function addGarbage(rows) {
            for (let i = 0; i < rows; i++) {
                const hole = Math.floor(Math.random() * COLS);
                const row = new Array(COLS).fill(0).map((_, x) => (x === hole ? 0 : 8));
                g.arena.shift();
                g.arena.push(row);
            }
        }

        // ---------- Ciclo de vida ----------
        const dropInterval = () => dropIntervalFor(g.level);

        function startGame(mode) {
            g.mode = mode;
            g.arena = createArena();
            g.score = 0; g.lines = 0;
            g.baseLevel = MODE_RULES[mode].baseLevel;
            g.level = g.baseLevel;
            g.elapsed = 0;
            g.hold = null;
            nextType = makeBag();
            if (mode === 'challenge') addGarbage(CHALLENGE_GARBAGE);
            g.next = nextType();
            spawn(nextType());
            g.state = 'playing';
            overlay.hidden = true;
            renderPanel();
            renderRanking();
        }

        function finish(title) {
            g.state = 'over';
            renderPanel();
            const rank = saveScore();
            g.result = title;
            renderRanking();
            const lines = [`Pontos: ${g.score} · Linhas: ${g.lines}`];
            if (rank > 0) lines.push(rank === 1 ? '🏆 Novo recorde!' : `Você entrou no ranking (#${rank})`);
            (title.startsWith('Desafio') ? Sfx.win : Sfx.lose)();
            showOverlay(title, lines.join('\n'), 'menu');
        }

        function togglePause() {
            if (g.state === 'playing') {
                g.state = 'paused';
                showOverlay('Pausado', 'Pressione P para continuar', 'pause');
            } else if (g.state === 'paused') {
                g.state = 'playing';
                overlay.hidden = true;
            }
        }

        // ---------- Overlay ----------
        const ovTitle = $('ov-title'), ovText = $('ov-text'), ovModes = $('ov-modes'), ovButton = $('ov-button');
        function showOverlay(title, text, kind) {
            ovTitle.textContent = title;
            ovText.textContent = text;
            ovText.style.whiteSpace = 'pre-line';
            ovModes.style.display = kind === 'menu' ? 'flex' : 'none';
            ovButton.hidden = kind !== 'pause';
            if (kind === 'menu' && title !== 'Tetris') {
                ovText.textContent = text + '\n\nJogar novamente — escolha um modo:';
            }
            overlay.hidden = false;
            (kind === 'pause' ? ovButton : ovModes.firstElementChild).focus();
        }
        ovModes.addEventListener('click', e => {
            const btn = e.target.closest('button[data-mode]');
            if (btn) startGame(btn.dataset.mode);
        });
        ovButton.addEventListener('click', togglePause);

        // ---------- Ranking (por modo) ----------
        const RANK_KEY = 'tetrisRankingV2';
        function loadAllRankings() {
            try {
                const r = JSON.parse(localStorage.getItem(RANK_KEY));
                if (r && typeof r === 'object') return r;
            } catch (e) { /* ignora */ }
            return {};
        }
        // Devolve a posição (1–5) alcançada, ou 0 se ficou fora do top 5
        function saveScore() {
            if (g.score <= 0) return 0;
            const all = loadAllRankings();
            const list = all[g.mode] || [];
            const entry = { score: g.score, lines: g.lines, date: new Date().toLocaleDateString('pt-BR') };
            list.push(entry);
            list.sort((a, b) => b.score - a.score);
            const pos = list.indexOf(entry) + 1;
            all[g.mode] = list.slice(0, 5);
            try { localStorage.setItem(RANK_KEY, JSON.stringify(all)); } catch (e) { /* ignora */ }
            return pos <= 5 ? pos : 0;
        }
        function renderRanking() {
            const list = loadAllRankings()[g.mode] || [];
            $('rank-title').textContent = `TOP 5 — ${MODE_NAMES[g.mode].toUpperCase()}`;
            const tbody = $('ranking').querySelector('tbody');
            tbody.innerHTML = '';
            if (!list.length) {
                const tr = tbody.insertRow();
                const td = tr.insertCell();
                td.colSpan = 3;
                td.textContent = 'Sem registros ainda';
                return;
            }
            list.forEach((e, i) => {
                const tr = tbody.insertRow();
                [`${i + 1}º`, e.score, e.date].forEach(v => { tr.insertCell().textContent = v; });
            });
        }

        // ---------- Painel lateral ----------
        const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
        function renderPanel() {
            $('s-mode').textContent = MODE_NAMES[g.mode];
            $('s-score').textContent = g.score;
            $('s-level').textContent = g.level;
            $('s-lines').textContent = g.mode === 'challenge' ? `${g.lines}/${CHALLENGE_GOAL}` : g.lines;
            if (g.mode === 'time') {
                $('s-time-label').textContent = 'Restante';
                $('s-time').textContent = fmtTime(Math.max(0, TIME_LIMIT - g.elapsed));
            } else {
                $('s-time-label').textContent = 'Tempo';
                $('s-time').textContent = fmtTime(g.elapsed);
            }
        }

        // ---------- Partículas (explosão ao limpar linhas) ----------
        function burst(rows) {
            for (const row of rows) {
                for (let i = 0; i < 28; i++) {
                    particles.push({
                        x: Math.random() * COLS * CELL, y: row * CELL + CELL / 2,
                        vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 200 - 20,
                        life: 0.6 + Math.random() * 0.4, color: COLORS[1 + Math.floor(Math.random() * 7)]
                    });
                }
            }
        }
        function updateParticles(dt) {
            for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt; }
            particles = particles.filter(p => p.life > 0);
        }
        function drawParticles() {
            for (const p of particles) {
                ctx.globalAlpha = Math.min(1, p.life * 2);
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, 4, 4);
            }
            ctx.globalAlpha = 1;
        }

        // ---------- Desenho ----------
        function drawCell(c, x, y, size, color, alpha = 1) {
            c.globalAlpha = alpha;
            c.fillStyle = color;
            c.fillRect(x, y, size, size);
            c.fillStyle = 'rgba(255,255,255,.35)';
            c.fillRect(x, y, size, 3);
            c.fillRect(x, y, 3, size);
            c.fillStyle = 'rgba(0,0,0,.35)';
            c.fillRect(x, y + size - 3, size, 3);
            c.fillRect(x + size - 3, y, 3, size);
            c.globalAlpha = 1;
        }

        function drawMatrix(c, m, ox, oy, size, alpha) {
            m.forEach((row, y) => row.forEach((v, x) => {
                if (v) drawCell(c, (ox + x) * size, (oy + y) * size, size, COLORS[v] || '#777', alpha);
            }));
        }

        function drawPreview(c, cv, type) {
            c.fillStyle = '#222';
            c.fillRect(0, 0, cv.width, cv.height);
            if (!type) return;
            const m = SHAPES[type];
            // Centraliza considerando só as linhas/colunas ocupadas
            const rows = m.map((r, i) => r.some(Boolean) ? i : -1).filter(i => i >= 0);
            const cols = m[0].map((_, i) => m.some(r => r[i]) ? i : -1).filter(i => i >= 0);
            const size = 20;
            const w = cols.length, h = rows.length;
            const ox = (cv.width / size - w) / 2 - cols[0];
            const oy = (cv.height / size - h) / 2 - rows[0];
            drawMatrix(c, m, ox, oy, size, 1);
        }

        function draw() {
            fit.apply(ctx);
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, LW, LH);

            // Grade discreta
            ctx.strokeStyle = 'rgba(255,255,255,.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 1; x < COLS; x++) { ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, LH); }
            for (let y = 1; y < ROWS; y++) { ctx.moveTo(0, y * CELL); ctx.lineTo(LW, y * CELL); }
            ctx.stroke();

            g.arena.forEach((row, y) => row.forEach((v, x) => {
                if (v) drawCell(ctx, x * CELL, y * CELL, CELL, v === 8 ? '#777' : COLORS[v]);
            }));

            if (g.cur && g.state !== 'menu') {
                drawMatrix(ctx, g.cur.m, g.cur.x, ghostY(), CELL, 0.2);   // sombra de onde vai cair
                drawMatrix(ctx, g.cur.m, g.cur.x, g.cur.y, CELL, 1);
            }
            drawParticles();
            drawPreview(nextCtx, nextCanvas, g.next);
            drawPreview(holdCtx, holdCanvas, g.hold);
        }

        // ---------- Loop ----------
        let last = performance.now();
        function frame(now) {
            const dt = Math.min((now - last) / 1000, 0.1);
            last = now;
            updateParticles(dt);

            if (g.state === 'playing') {
                g.elapsed += dt;
                g.dropAcc += dt;
                while (g.state === 'playing' && g.dropAcc >= dropInterval()) {
                    g.dropAcc -= dropInterval();
                    if (!collides(g.cur.m, g.cur.x, g.cur.y + 1)) g.cur.y++;
                    else { lock(); g.dropAcc = 0; }
                }
                if (g.mode === 'time' && g.elapsed >= TIME_LIMIT && g.state === 'playing') {
                    g.elapsed = TIME_LIMIT;
                    finish('Tempo esgotado!');
                }
                renderPanel();
            }
            draw();
            requestAnimationFrame(frame);
        }

        // ---------- Entrada ----------
        const KEYMAP = {
            ArrowLeft: () => move(-1),
            ArrowRight: () => move(1),
            ArrowDown: () => softDrop(),
            ArrowUp: () => rotate(1),
            q: () => rotate(-1), Q: () => rotate(-1),
            ' ': () => hardDrop(),
            c: () => hold(), C: () => hold(),
            Shift: () => hold()
        };
        const NO_REPEAT = new Set(['ArrowUp', 'q', 'Q', ' ', 'c', 'C', 'Shift']);

        document.addEventListener('keydown', e => {
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                if (g.state === 'playing' || g.state === 'paused') { togglePause(); e.preventDefault(); }
                return;
            }
            if (g.state !== 'playing') return;
            const action = KEYMAP[e.key];
            if (!action) return;
            e.preventDefault();                       // impede a página de rolar com as setas/espaço
            if (e.repeat && NO_REPEAT.has(e.key)) return;
            action();
        });

        // Pausa sozinho se a aba/janela perder o foco
        document.addEventListener('visibilitychange', () => { if (document.hidden && g.state === 'playing') togglePause(); });
        window.addEventListener('blur', () => { if (g.state === 'playing') togglePause(); });

        // Botões de toque (com repetição ao segurar ← → ▼)
        const TOUCH = {
            left: () => move(-1), right: () => move(1), down: () => softDrop(),
            rotate: () => rotate(1), drop: () => hardDrop(), hold: () => hold()
        };
        const REPEATABLE = new Set(['left', 'right', 'down']);
        let repeatTimer = null;
        function stopRepeat() { clearTimeout(repeatTimer); clearInterval(repeatTimer); repeatTimer = null; }
        $('touch').addEventListener('pointerdown', e => {
            const btn = e.target.closest('button[data-act]');
            if (!btn) return;
            e.preventDefault();
            const act = TOUCH[btn.dataset.act];
            act();
            if (REPEATABLE.has(btn.dataset.act)) {
                stopRepeat();
                repeatTimer = setTimeout(() => { repeatTimer = setInterval(act, 80); }, 220);
            }
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => $('touch').addEventListener(t, stopRepeat));

        // ---------- Início ----------
        g.arena = createArena();
        renderRanking();
        renderPanel();
        showOverlay('Tetris', 'Escolha um modo de jogo', 'menu');
        requestAnimationFrame(frame);
    })();
    