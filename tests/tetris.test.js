const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tetris-logic.js');

test('rotateCW seguido de rotateCCW devolve a matriz original', () => {
    for (const [name, shape] of Object.entries(T.SHAPES)) {
        assert.deepEqual(T.rotateCCW(T.rotateCW(shape)), shape, name);
    }
});

test('quatro rotações horárias voltam à forma original', () => {
    let m = T.SHAPES.T;
    for (let i = 0; i < 4; i++) m = T.rotateCW(m);
    assert.deepEqual(m, T.SHAPES.T);
});

test('rotacionar NÃO altera a forma original (bug antigo)', () => {
    const copia = JSON.stringify(T.SHAPES.L);
    T.rotateCW(T.SHAPES.L);
    T.rotateCCW(T.SHAPES.L);
    T.cloneMatrix(T.SHAPES.L)[0][0] = 9;
    assert.equal(JSON.stringify(T.SHAPES.L), copia);
});

test('rotateCW gira o J no sentido horário', () => {
    assert.deepEqual(T.rotateCW([[2,0,0],[2,2,2],[0,0,0]]), [[0,2,2],[0,2,0],[0,2,0]]);
});

test('collides: paredes, chão e blocos', () => {
    const arena = T.createArena();
    const o = T.SHAPES.O;
    assert.equal(T.collides(arena, o, 0, 0), false);
    assert.equal(T.collides(arena, o, -1, 0), true);                 // parede esquerda
    assert.equal(T.collides(arena, o, T.COLS - 1, 0), true);         // parede direita
    assert.equal(T.collides(arena, o, 0, T.ROWS - 1), true);         // chão
    assert.equal(T.collides(arena, o, 0, T.ROWS - 2), false);
    arena[5][3] = 1;
    assert.equal(T.collides(arena, o, 2, 4), true);                  // bloco existente
    assert.equal(T.collides(arena, o, 0, -1), false);                // acima do topo é permitido
});

test('sweepLines remove linhas completas e desce o resto', () => {
    const arena = T.createArena();
    arena[T.ROWS - 1].fill(1);
    arena[T.ROWS - 2].fill(1);
    arena[T.ROWS - 3][0] = 5;
    assert.equal(T.sweepLines(arena), 2);
    assert.equal(arena[T.ROWS - 1][0], 5);       // o bloco solto caiu 2 linhas
    assert.equal(arena[T.ROWS - 1][1], 0);
    assert.equal(arena.length, T.ROWS);
});

test('sweepLines com linhas completas não adjacentes', () => {
    const arena = T.createArena();
    arena[T.ROWS - 1].fill(1);
    arena[T.ROWS - 3].fill(1);
    arena[T.ROWS - 2][2] = 3;
    assert.equal(T.sweepLines(arena), 2);
    assert.equal(arena[T.ROWS - 1][2], 3);
});

test('sweepLines ignora linhas incompletas', () => {
    const arena = T.createArena();
    arena[T.ROWS - 1].fill(1);
    arena[T.ROWS - 1][4] = 0;
    assert.equal(T.sweepLines(arena), 0);
});

test('pontuação por linhas multiplica pelo nível', () => {
    assert.equal(T.lineScore(1, 1), 100);
    assert.equal(T.lineScore(4, 3), 2400);
    assert.equal(T.lineScore(0, 5), 0);
});

test('dropInterval diminui com o nível e tem mínimo', () => {
    assert.equal(T.dropInterval(1), 1);
    assert.ok(T.dropInterval(5) < T.dropInterval(4));
    assert.equal(T.dropInterval(100), 0.06);
});

test('7-bag: cada bloco de 7 peças contém as 7 formas', () => {
    const next = T.makeBag();
    for (let rodada = 0; rodada < 20; rodada++) {
        const peças = Array.from({ length: 7 }, next).sort().join('');
        assert.equal(peças, 'IJLOSTZ');
    }
});

test('levelFor: nível base + 1 a cada N linhas', () => {
    assert.equal(T.levelFor(0), 1);
    assert.equal(T.levelFor(9), 1);
    assert.equal(T.levelFor(10), 2);
    assert.equal(T.levelFor(0, 10, 5), 10);       // Turbo começa no 10
    assert.equal(T.levelFor(12, 10, 5), 12);      // e sobe a cada 5 linhas
});

test('modo Turbo é bem mais rápido que o Clássico desde o início', () => {
    assert.ok(T.dropInterval(T.levelFor(0, 10, 5)) < T.dropInterval(T.levelFor(0)) / 3);
});
