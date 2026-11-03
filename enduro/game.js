(() => {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;     // tamanho lógico (400×600)
    const fit = Fit.setup(canvas, W, H);

    const overlay = document.getElementById('overlay');
    const ovTitle = document.getElementById('ov-title');
    const ovText = document.getElementById('ov-text');
    const ovButton = document.getElementById('ov-button');

    // ---------- Constantes ----------
    const ROAD_LEFT = 90, ROAD_RIGHT = W - 90, ROAD_W = ROAD_RIGHT - ROAD_LEFT;
    const LANES = 5, LANE_W = ROAD_W / LANES;
    const CAR_W = 24, CAR_H = 40;
    // Modos de jogo (velocidades em km/h)
    const MODES = {
        normal: { label: 'Normal', min: 40,  max: 240, start: 80,  accel: 40, steer: 230, obsMin: 50, obsVar: 50,  spawn: 1,   key: 'enduroBest' },
        turbo:  { label: 'Turbo',  min: 120, max: 360, start: 180, accel: 60, steer: 300, obsMin: 90, obsVar: 80,  spawn: 0.7, key: 'enduroBestTurbo' }
    };
    let mode = MODES.normal;
    const PX_PER_KMH = 2.2;                       // km/h → pixels por segundo de rolagem
    const STEP = 1 / 120;

    const CAR_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00'];
    const WEATHER_LABEL = { clear: 'Limpo', fog: 'Neblina', snow: 'Neve' };

    // ---------- Estado ----------
    const keys = {};
    let state = 'menu';            // menu | playing | paused | over
    let player, obstacles, trees, flakes;
    let scroll, spawnTimer, passed, distance, speed;
    let weather, weatherTimer, weatherMix;   // weatherMix: 0..1 (intensidade do efeito atual)
    let best = 0;
    function loadBest() {
        best = 0;
        try { best = parseInt(localStorage.getItem(mode.key), 10) || 0; } catch (e) { /* ignora */ }
    }
    const modeSelect = document.getElementById('mode');
    modeSelect.addEventListener('change', () => { mode = MODES[modeSelect.value]; loadBest(); if (state === 'menu') describeMenu(); });
    loadBest();

    function reset() {
        player = { x: W / 2 - CAR_W / 2, y: H - 110, vx: 0 };
        obstacles = [];
        trees = [];
        flakes = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 30 + Math.random() * 60 }));
        for (let i = 0; i < 10; i++) addTree(Math.random() * H);
        scroll = 0;
        spawnTimer = 0.6;
        passed = 0;
        distance = 0;
        speed = mode.start;
        weather = 'clear';
        weatherTimer = 25;
        weatherMix = 0;
    }

    function addTree(y) {
        const left = Math.random() < 0.5;
        trees.push({ x: left ? 10 + Math.random() * 55 : ROAD_RIGHT + 25 + Math.random() * 55, y, r: 8 + Math.random() * 6 });
    }

    // ---------- Entrada ----------
    const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
    document.addEventListener('keydown', e => {
        if (GAME_KEYS.includes(e.key)) e.preventDefault();
        keys[e.key] = true;
        if (e.repeat) return;
        if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (state === 'playing' || state === 'paused') togglePause();
        }
        if (e.key === 'Enter' && (state === 'over' || state === 'menu')) start();
    });
    document.addEventListener('keyup', e => { keys[e.key] = false; });
    window.addEventListener('blur', () => {
        for (const k in keys) keys[k] = false;
        if (state === 'playing') togglePause();
    });

    // Botões de toque simulam as teclas
    document.getElementById('touch').addEventListener('pointerdown', e => {
        const b = e.target.closest('button[data-key]');
        if (b) { e.preventDefault(); keys[b.dataset.key] = true; }
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t =>
        document.getElementById('touch').addEventListener(t, e => {
            const b = e.target.closest('button[data-key]');
            if (b) keys[b.dataset.key] = false;
            else ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].forEach(k => (keys[k] = false));
        }));

    // ---------- Fluxo ----------
    function showOverlay(title, text, button) {
        modeSelect.parentElement.style.display = state === 'paused' ? 'none' : '';
        ovTitle.textContent = title;
        ovText.textContent = text;
        ovButton.textContent = button;
        overlay.hidden = false;
        ovButton.focus();
    }
    function start() {
        reset();
        overlay.hidden = true;
        state = 'playing';
    }
    function togglePause() {
        if (state === 'playing') {
            state = 'paused';
            showOverlay('Pausado', 'Espaço ou P para continuar', 'Continuar');
        } else if (state === 'paused') {
            state = 'playing';
            overlay.hidden = true;
        }
    }
    ovButton.addEventListener('click', () => { if (state === 'paused') togglePause(); else start(); });

    function gameOver() {
        state = 'over';
        const isRecord = passed > best;
        if (isRecord) {
            best = passed;
            try { localStorage.setItem(mode.key, String(best)); } catch (e) { /* ignora */ }
        }
        showOverlay('Batida! 💥',
            `Carros ultrapassados: ${passed}\nDistância: ${(distance / 1000).toFixed(1)} km\n` +
            (isRecord ? '🏆 Novo recorde!' : `Recorde: ${best}`),
            'Jogar novamente');
    }

    // ---------- Lógica ----------
    function spawnObstacle() {
        // Evita criar carro colado em outro da mesma faixa
        const lane = Math.floor(Math.random() * LANES);
        const x = ROAD_LEFT + lane * LANE_W + (LANE_W - CAR_W) / 2;
        if (obstacles.some(o => o.lane === lane && o.y < CAR_H * 3)) return;
        obstacles.push({
            lane, x, y: -CAR_H - 10, counted: false,
            speed: mode.obsMin + Math.random() * mode.obsVar,                        // km/h do carro
            color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
        });
    }

    function overlaps(a, b, shrink) {
        // Caixa de colisão levemente menor que o desenho: mais justo para o jogador
        return a.x + shrink < b.x + CAR_W - shrink && a.x + CAR_W - shrink > b.x + shrink &&
               a.y + shrink < b.y + CAR_H - shrink && a.y + CAR_H - shrink > b.y + shrink;
    }

    function updateWeather(dt) {
        weatherTimer -= dt;
        if (weatherTimer <= 0) {
            // Alterna entre limpo e um clima ruim aleatório
            if (weather === 'clear') weather = Math.random() < 0.5 ? 'fog' : 'snow';
            else weather = 'clear';
            weatherTimer = weather === 'clear' ? 20 + Math.random() * 15 : 15 + Math.random() * 10;
        }
        const goal = weather === 'clear' ? 0 : 1;
        weatherMix += Math.sign(goal - weatherMix) * Math.min(Math.abs(goal - weatherMix), dt * 0.4);
    }

    function update(dt) {
        if (state !== 'playing') return;

        // Velocidade: ↑ acelera, ↓ freia, senão perde velocidade devagar
        if (keys.ArrowUp) speed += mode.accel * dt;
        else if (keys.ArrowDown) speed -= mode.accel * 3.5 * dt;
        else speed -= mode.accel * 0.375 * dt;
        speed = Math.max(mode.min, Math.min(mode.max, speed));

        // Direção: na neve o carro "escorrega" (responde mais devagar)
        const grip = weather === 'snow' ? 1 - 0.6 * weatherMix : 1;
        const dir = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
        const targetVx = dir * mode.steer;
        player.vx += (targetVx - player.vx) * Math.min(1, 12 * grip * dt);
        player.x += player.vx * dt;
        player.x = Math.max(ROAD_LEFT + 2, Math.min(ROAD_RIGHT - CAR_W - 2, player.x));

        const pxPerSec = speed * PX_PER_KMH;
        scroll = (scroll + pxPerSec * dt) % 40;
        distance += speed / 3.6 * dt;                 // metros

        // Obstáculos: movem-se pela velocidade relativa ao jogador
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
            spawnObstacle();
            spawnTimer = (0.5 + Math.random() * 0.7) * (150 / Math.max(speed, 60)) * mode.spawn;
        }
        for (const o of obstacles) {
            o.y += (speed - o.speed) * PX_PER_KMH * dt;
            if (overlaps(player, o, 3)) { gameOver(); return; }
            // Ultrapassagem = o carro ficou totalmente atrás do jogador
            if (!o.counted && o.y > player.y + CAR_H) { o.counted = true; passed++; }
        }
        obstacles = obstacles.filter(o => o.y < H + 60 && o.y > -400);

        // Cenário
        for (const t of trees) t.y += pxPerSec * dt;
        trees = trees.filter(t => t.y < H + 30);
        while (trees.length < 10) addTree(-20 - Math.random() * 60);

        // Neve cai um pouco mais rápido que o cenário
        for (const f of flakes) {
            f.y += (f.s + pxPerSec * 0.3) * dt;
            if (f.y > H) { f.y = -5; f.x = Math.random() * W; }
        }

        updateWeather(dt);
    }

    // ---------- Desenho ----------
    function drawCar(x, y, color, isPlayer) {
        ctx.fillStyle = '#111';                                    // pneus
        ctx.fillRect(x - 2, y + 5, 4, 10);
        ctx.fillRect(x + CAR_W - 2, y + 5, 4, 10);
        ctx.fillRect(x - 2, y + CAR_H - 15, 4, 10);
        ctx.fillRect(x + CAR_W - 2, y + CAR_H - 15, 4, 10);
        ctx.fillStyle = color;                                     // carroceria
        ctx.fillRect(x, y, CAR_W, CAR_H);
        ctx.fillStyle = 'rgba(0,0,0,.45)';                         // vidros
        ctx.fillRect(x + 3, y + 10, CAR_W - 6, 8);
        ctx.fillRect(x + 4, y + CAR_H - 12, CAR_W - 8, 5);
        if (isPlayer) {
            ctx.fillStyle = 'rgba(255,255,255,.8)';
            ctx.fillRect(x + CAR_W / 2 - 1, y, 2, CAR_H);          // faixa
        }
    }

    function draw() {
        fit.apply(ctx);
        // Grama
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(0, 0, W, H);

        // Árvores
        for (const t of trees) {
            ctx.fillStyle = '#1b5e20';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Estrada
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(ROAD_LEFT, 0, ROAD_W, H);

        // Zebras (acostamento listrado) e divisórias de faixa se movendo
        for (let y = -40 + scroll; y < H; y += 40) {
            ctx.fillStyle = '#d32f2f';
            ctx.fillRect(ROAD_LEFT - 6, y, 6, 20);
            ctx.fillRect(ROAD_RIGHT, y, 6, 20);
            ctx.fillStyle = '#fff';
            ctx.fillRect(ROAD_LEFT - 6, y + 20, 6, 20);
            ctx.fillRect(ROAD_RIGHT, y + 20, 6, 20);
            ctx.fillStyle = 'rgba(255,255,255,.7)';
            for (let l = 1; l < LANES; l++) ctx.fillRect(ROAD_LEFT + l * LANE_W - 1, y, 2, 20);
        }

        for (const o of obstacles) drawCar(o.x, o.y, o.color, false);
        drawCar(player.x, player.y, '#fff', true);

        // Clima
        if (weatherMix > 0) {
            if (weather === 'snow' || (weather === 'clear' && weatherMix > 0 && lastBad === 'snow')) {
                ctx.fillStyle = `rgba(255,255,255,${0.9 * weatherMix})`;
                for (const f of flakes) ctx.fillRect(f.x, f.y, 2, 2);
            }
            if (weather === 'fog' || (weather === 'clear' && lastBad === 'fog')) {
                const g = ctx.createLinearGradient(0, 0, 0, H * 0.75);
                g.addColorStop(0, `rgba(220,225,235,${0.95 * weatherMix})`);
                g.addColorStop(1, 'rgba(220,225,235,0)');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, W, H * 0.75);
            }
        }
        if (weather !== 'clear') lastBad = weather;

        drawHud();
    }
    let lastBad = 'fog';

    function drawHud() {
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(0, 0, W, 34);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Carros: ${passed} (rec. ${best})`, 10, 22);
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(speed)} km/h`, W / 2 + 40, 22);
        ctx.textAlign = 'right';
        ctx.fillText(`${WEATHER_LABEL[weather]}`, W - 10, 22);
    }

    // ---------- Loop com passo fixo ----------
    let last = performance.now(), acc = 0;
    function frame(now) {
        acc += Math.min((now - last) / 1000, 0.1);
        last = now;
        while (acc >= STEP) { update(STEP); acc -= STEP; }
        draw();
        requestAnimationFrame(frame);
    }

    reset();
    function describeMenu() {
        showOverlay('Enduro',
            'Ultrapasse o máximo de carros que conseguir.\nCuidado com a neblina e a neve!\n\n' +
            `Recorde (${mode.label}): ${best}`, 'Começar');
    }
    describeMenu();
    requestAnimationFrame(frame);
})();
