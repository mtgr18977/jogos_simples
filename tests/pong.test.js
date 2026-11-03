const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../pong-logic.js');

const H = 500, R = 9;

test('clamp', () => {
    assert.equal(P.clamp(5, 0, 3), 3);
    assert.equal(P.clamp(-1, 0, 3), 0);
    assert.equal(P.clamp(2, 0, 3), 2);
});

test('predictBallY: trajetória reta sem rebote', () => {
    const y = P.predictBallY({ x: 100, y: 200, vx: 100, vy: 50 }, 300, H, R);
    assert.ok(Math.abs(y - 300) < 1e-9);
});

test('predictBallY: rebate no chão', () => {
    // sairia de y=450 com vy=+100 durante 1s → 550; reflete em 491 (H - R)
    const y = P.predictBallY({ x: 0, y: 450, vx: 100, vy: 100 }, 100, H, R);
    assert.ok(Math.abs(y - (2 * (H - R) - 550)) < 1e-9);
});

test('predictBallY: resultado sempre dentro do campo', () => {
    for (let i = 0; i < 500; i++) {
        const ball = { x: Math.random() * 700, y: R + Math.random() * (H - 2 * R),
                       vx: 100 + Math.random() * 600, vy: (Math.random() - 0.5) * 900 };
        const y = P.predictBallY(ball, 790, H, R);
        assert.ok(y >= R - 1e-9 && y <= H - R + 1e-9, `y=${y}`);
    }
});

test('bounceVelocity: centro devolve reto, extremos inclinam, módulo preservado', () => {
    const max = Math.PI / 3;
    const c = P.bounceVelocity(0, 400, 1, max);
    assert.ok(Math.abs(c.vx - 400) < 1e-9 && Math.abs(c.vy) < 1e-9);
    const top = P.bounceVelocity(-1, 400, -1, max);
    assert.ok(top.vx < 0 && top.vy < 0);
    assert.ok(Math.abs(Math.hypot(top.vx, top.vy) - 400) < 1e-9);
    const out = P.bounceVelocity(5, 400, 1, max);                    // fora do intervalo é limitado
    assert.ok(Math.abs(out.vy - Math.sin(max) * 400) < 1e-9);
});

test('ballHitsPaddle considera o raio da bola', () => {
    const paddle = { x: 20, y: 100 };
    assert.equal(P.ballHitsPaddle({ x: 40, y: 150 }, 9, paddle, 12, 90), true);
    assert.equal(P.ballHitsPaddle({ x: 60, y: 150 }, 9, paddle, 12, 90), false);   // longe demais
    assert.equal(P.ballHitsPaddle({ x: 30, y: 95 }, 9, paddle, 12, 90), true);     // raspando pelo raio
    assert.equal(P.ballHitsPaddle({ x: 30, y: 80 }, 9, paddle, 12, 90), false);
});
