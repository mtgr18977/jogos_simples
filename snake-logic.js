/* Lógica pura do Snake (sem DOM). */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SnakeLogic = factory();
})(this, function () {
    'use strict';

    function placeFood(s, rng) {
        const free = [];
        for (let y = 0; y < s.rows; y++)
            for (let x = 0; x < s.cols; x++)
                if (!s.snake.some(p => p.x === x && p.y === y)) free.push({ x, y });
        s.food = free.length ? free[Math.floor(rng() * free.length)] : null;   // null = tabuleiro cheio
    }

    function create(cols = 20, rows = 20, rng = Math.random) {
        const y = Math.floor(rows / 2);
        const s = {
            cols, rows, rng,
            snake: [{ x: 5, y }, { x: 4, y }, { x: 3, y }],   // [0] = cabeça
            dir: { x: 1, y: 0 },
            queue: [],            // viradas pendentes (evita "morrer" ao apertar duas teclas rápido)
            food: null, score: 0, alive: true
        };
        placeFood(s, rng);
        return s;
    }

    // Enfileira uma virada, ignorando reversão de 180° e repetição.
    function turn(s, dx, dy) {
        const ref = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
        if (dx === -ref.x && dy === -ref.y) return false;
        if (dx === ref.x && dy === ref.y) return false;
        if (s.queue.length >= 2) return false;
        s.queue.push({ x: dx, y: dy });
        return true;
    }

    // Avança um passo. Devolve 'move', 'eat', 'win' ou 'dead'. wrap = atravessa as paredes.
    function step(s, wrap = false) {
        if (!s.alive) return 'dead';
        if (s.queue.length) s.dir = s.queue.shift();
        let nx = s.snake[0].x + s.dir.x, ny = s.snake[0].y + s.dir.y;
        if (wrap) { nx = (nx + s.cols) % s.cols; ny = (ny + s.rows) % s.rows; }
        else if (nx < 0 || ny < 0 || nx >= s.cols || ny >= s.rows) { s.alive = false; return 'dead'; }

        const eating = s.food && nx === s.food.x && ny === s.food.y;
        // A cauda sai do lugar no mesmo passo (se não crescer), então pode ser ocupada.
        const body = eating ? s.snake : s.snake.slice(0, -1);
        if (body.some(p => p.x === nx && p.y === ny)) { s.alive = false; return 'dead'; }

        s.snake.unshift({ x: nx, y: ny });
        if (eating) {
            s.score++;
            placeFood(s, s.rng);
            if (!s.food) { s.alive = false; return 'win'; }
            return 'eat';
        }
        s.snake.pop();
        return 'move';
    }

    // Intervalo entre passos (s): acelera a cada comida, mínimo 60 ms
    const stepInterval = score => Math.max(0.06, 0.14 - score * 0.003);

    return { create, turn, step, placeFood, stepInterval };
});
