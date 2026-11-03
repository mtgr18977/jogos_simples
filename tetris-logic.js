/* Lógica pura do Tetris (sem DOM): pode ser testada no Node e usada no navegador. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TetrisLogic = factory();
})(this, function () {
    'use strict';

    const COLS = 10, ROWS = 20;
    const LINE_POINTS = [0, 100, 300, 500, 800];

    // O valor de cada célula é o índice da cor
    const SHAPES = {
        I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
        J: [[2,0,0],[2,2,2],[0,0,0]],
        L: [[0,0,3],[3,3,3],[0,0,0]],
        O: [[4,4],[4,4]],
        S: [[0,5,5],[5,5,0],[0,0,0]],
        T: [[0,6,0],[6,6,6],[0,0,0]],
        Z: [[7,7,0],[0,7,7],[0,0,0]]
    };

    // Todas devolvem uma CÓPIA, nunca alteram a forma original.
    const cloneMatrix = m => m.map(r => r.slice());
    const rotateCW  = m => m[0].map((_, x) => m.map(r => r[x]).reverse());
    const rotateCCW = m => m[0].map((_, x) => m.map(r => r[m[0].length - 1 - x]));

    const createArena = (cols = COLS, rows = ROWS) =>
        Array.from({ length: rows }, () => new Array(cols).fill(0));

    // A matriz m, posicionada em (px, py), bate numa parede, no chão ou em blocos da arena?
    function collides(arena, m, px, py) {
        const rows = arena.length, cols = arena[0].length;
        for (let y = 0; y < m.length; y++) {
            for (let x = 0; x < m[y].length; x++) {
                if (!m[y][x]) continue;
                const nx = px + x, ny = py + y;
                if (nx < 0 || nx >= cols || ny >= rows) return true;
                if (ny >= 0 && arena[ny][nx]) return true;
            }
        }
        return false;
    }

    // Remove as linhas completas (altera a arena) e devolve quantas foram removidas.
    function sweepLines(arena) {
        let cleared = 0;
        for (let y = arena.length - 1; y >= 0; y--) {
            if (arena[y].every(v => v !== 0)) {
                arena.splice(y, 1);
                arena.unshift(new Array(arena[0].length).fill(0));
                cleared++;
                y++;   // reavalia a mesma posição: as linhas de cima desceram
            }
        }
        return cleared;
    }

    const lineScore = (cleared, level) => (LINE_POINTS[cleared] || 0) * level;

    // Intervalo de queda em segundos para cada nível (mínimo 60 ms)
    const dropInterval = level => Math.max(60, 1000 * Math.pow(0.85, level - 1)) / 1000;

    // Nível pelo total de linhas: base + 1 a cada `perLevel` linhas
    const levelFor = (lines, base = 1, perLevel = 10) => base + Math.floor(lines / perLevel);

    // Sorteio 7-bag: cada peça aparece exatamente 1x a cada 7. rng devolve [0,1).
    function makeBag(rng = Math.random) {
        let bag = [];
        return function next() {
            if (bag.length === 0) {
                bag = Object.keys(SHAPES);
                for (let i = bag.length - 1; i > 0; i--) {
                    const j = Math.floor(rng() * (i + 1));
                    [bag[i], bag[j]] = [bag[j], bag[i]];
                }
            }
            return bag.pop();
        };
    }

    return { COLS, ROWS, LINE_POINTS, SHAPES, cloneMatrix, rotateCW, rotateCCW,
             createArena, collides, sweepLines, lineScore, dropInterval, levelFor, makeBag };
});
