/* Lógica pura do Pong (sem DOM). */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PongLogic = factory();
})(this, function () {
    'use strict';

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    // Onde a bola chegará na vertical `targetX`, considerando rebotes no teto e no chão.
    function predictBallY(ball, targetX, H, R) {
        const t = (targetX - ball.x) / ball.vx;
        const span = H - 2 * R;
        const period = 2 * span;
        let y = (ball.y + ball.vy * t) - R;
        y = ((y % period) + period) % period;
        if (y > span) y = period - y;
        return y + R;
    }

    // Nova velocidade após bater na barra. rel = -1 (ponta de cima) … +1 (ponta de baixo);
    // dir = +1 se a bola deve ir para a direita, -1 para a esquerda.
    function bounceVelocity(rel, speed, dir, maxAngle) {
        const angle = clamp(rel, -1, 1) * maxAngle;
        return { vx: Math.cos(angle) * speed * dir, vy: Math.sin(angle) * speed };
    }

    // Círculo (bola) encostando num retângulo (barra)?
    function ballHitsPaddle(ball, r, paddle, pw, ph) {
        return ball.x + r >= paddle.x && ball.x - r <= paddle.x + pw &&
               ball.y + r >= paddle.y && ball.y - r <= paddle.y + ph;
    }

    return { clamp, predictBallY, bounceVelocity, ballHitsPaddle };
});
