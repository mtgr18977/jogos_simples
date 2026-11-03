/* Efeitos sonoros simples com Web Audio (sem arquivos). Tecla M liga/desliga. */
(function () {
    'use strict';
    let actx = null;
    let muted = false;
    try { muted = localStorage.getItem('sfxMuted') === '1'; } catch (e) { /* ignora */ }

    function ctx() {
        if (!actx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) actx = new AC();
        }
        if (actx && actx.state === 'suspended') actx.resume();
        return actx;
    }

    // freq em Hz, dur em segundos
    function beep(freq, dur = 0.08, type = 'square', vol = 0.06, slideTo = null) {
        if (muted) return;
        const c = ctx();
        if (!c) return;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, c.currentTime);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
        g.gain.setValueAtTime(vol, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
        o.connect(g).connect(c.destination);
        o.start();
        o.stop(c.currentTime + dur);
    }

    function toggle() {
        muted = !muted;
        try { localStorage.setItem('sfxMuted', muted ? '1' : '0'); } catch (e) { /* ignora */ }
        updateButton();
    }

    let button = null;
    function updateButton() { if (button) button.textContent = muted ? '🔇 Som' : '🔊 Som'; }

    document.addEventListener('DOMContentLoaded', () => {
        const bar = document.querySelector('.topbar span:last-child');
        if (bar) {
            button = document.createElement('button');
            button.className = 'btn';
            button.style.cssText = 'font-size:14px;padding:6px 12px';
            button.title = 'Ligar/desligar som (M)';
            button.addEventListener('click', e => { toggle(); e.currentTarget.blur(); });
            const actions = document.createElement('div');
            actions.className = 'actions';
            actions.appendChild(button);
            bar.replaceWith(actions);
            updateButton();
        }
    });
    document.addEventListener('keydown', e => {
        if ((e.key === 'm' || e.key === 'M') && !e.repeat) toggle();
    });

    window.Sfx = {
        beep, toggle,
        // atalhos nomeados
        move:   () => beep(220, 0.03, 'square', 0.03),
        rotate: () => beep(440, 0.05, 'square', 0.04),
        lock:   () => beep(130, 0.07, 'triangle', 0.08),
        clear:  n => { for (let i = 0; i < Math.min(n, 4) + 1; i++) setTimeout(() => beep(520 + i * 140, 0.1, 'square', 0.06), i * 70); },
        hit:    () => beep(480, 0.06, 'square', 0.07),
        wall:   () => beep(300, 0.04, 'square', 0.05),
        point:  () => beep(200, 0.25, 'sawtooth', 0.07, 80),
        eat:    () => beep(660, 0.07, 'square', 0.06, 990),
        win:    () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.15, 'square', 0.06), i * 110)),
        lose:   () => beep(300, 0.5, 'sawtooth', 0.08, 60)
    };
})();
