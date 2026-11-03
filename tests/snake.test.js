const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../snake-logic.js');

const fixed = v => () => v;   // rng determinístico

test('estado inicial: cobra de 3 segmentos e comida fora dela', () => {
    const s = S.create(20, 20, fixed(0));
    assert.equal(s.snake.length, 3);
    assert.ok(!s.snake.some(p => p.x === s.food.x && p.y === s.food.y));
});

test('mover avança a cabeça e mantém o tamanho', () => {
    const s = S.create(20, 20, fixed(0));
    s.food = { x: 0, y: 0 };
    const head = { ...s.snake[0] };
    assert.equal(S.step(s), 'move');
    assert.equal(s.snake[0].x, head.x + 1);
    assert.equal(s.snake.length, 3);
});

test('comer cresce e pontua', () => {
    const s = S.create(20, 20, fixed(0));
    s.food = { x: s.snake[0].x + 1, y: s.snake[0].y };
    assert.equal(S.step(s), 'eat');
    assert.equal(s.snake.length, 4);
    assert.equal(s.score, 1);
});

test('bater na parede mata (paredes sólidas)', () => {
    const s = S.create(5, 5, fixed(0));
    s.food = { x: 0, y: 0 };
    let r;
    for (let i = 0; i < 10 && s.alive; i++) r = S.step(s);
    assert.equal(r, 'dead');
    assert.equal(s.alive, false);
});

test('atravessar a parede (wrap)', () => {
    const s = S.create(5, 5, fixed(0));
    s.food = { x: 0, y: 0 };
    for (let i = 0; i < 10; i++) assert.notEqual(S.step(s, true), 'dead');
    assert.ok(s.snake[0].x >= 0 && s.snake[0].x < 5);
});

test('não permite reverter 180°', () => {
    const s = S.create(20, 20, fixed(0));
    assert.equal(S.turn(s, -1, 0), false);
    assert.equal(S.turn(s, 1, 0), false);       // mesma direção
    assert.equal(S.turn(s, 0, -1), true);
});

test('duas viradas rápidas no mesmo quadro não causam colisão em si mesma', () => {
    const s = S.create(20, 20, fixed(0));
    s.food = { x: 0, y: 0 };
    S.turn(s, 0, -1);
    assert.equal(S.turn(s, -1, 0), true);       // cima, depois esquerda (relativo à direção pendente)
    assert.notEqual(S.step(s), 'dead');
    assert.notEqual(S.step(s), 'dead');
});

test('colidir com o próprio corpo mata', () => {
    const s = S.create(20, 20, fixed(0));
    s.snake = [{x:5,y:5},{x:5,y:6},{x:4,y:6},{x:4,y:5},{x:4,y:4}];
    s.dir = { x: 0, y: -1 };
    s.food = { x: 0, y: 0 };
    S.turn(s, -1, 0);
    assert.equal(S.step(s), 'dead');
});

test('a cauda libera a casa no mesmo passo (perseguir a cauda é permitido)', () => {
    const s = S.create(20, 20, fixed(0));
    s.snake = [{x:2,y:2},{x:2,y:3},{x:3,y:3},{x:3,y:2}];   // quadrado 2x2
    s.dir = { x: 1, y: 0 };
    s.food = { x: 0, y: 0 };
    assert.equal(S.step(s), 'move');
});

test('tabuleiro cheio = vitória', () => {
    const s = S.create(2, 1, fixed(0));          // só cabem 2 casas: força situação simplificada
    s.snake = [{ x: 0, y: 0 }];
    s.dir = { x: 1, y: 0 };
    s.food = { x: 1, y: 0 };
    assert.equal(S.step(s), 'win');
});

test('stepInterval acelera e tem piso', () => {
    assert.ok(S.stepInterval(10) < S.stepInterval(0));
    assert.equal(S.stepInterval(1000), 0.06);
});
