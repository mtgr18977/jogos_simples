/* Ajusta o canvas ao tamanho da janela (mantendo a proporção) e nítido em telas HiDPI.
   Uso:  const fit = Fit.setup(canvas, larguraLógica, alturaLógica, { extraW: 0 });
         e, no início de cada draw():  fit.apply(ctx);
   O jogo continua desenhando em coordenadas "lógicas"; o Fit cuida da escala. */
(function () {
    'use strict';

    const MAX_SCALE = 3;

    function visibleHeight(sel) {
        const el = document.querySelector(sel);
        if (!el) return 0;
        const cs = getComputedStyle(el);
        if (cs.display === 'none') return 0;
        return el.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
    }

    function setup(canvas, LW, LH, opts = {}) {
        // largura ocupada ao lado do canvas (ex.: painel do Tetris): número ou função
        const extra = typeof opts.extraW === 'function' ? opts.extraW : () => opts.extraW || 0;
        const state = { scale: 1 };

        function resize() {
            const pad = 24;                  // padding do body
            const availW = window.innerWidth - pad - extra() - 4;
            const availH = window.innerHeight - pad - 4 -
                visibleHeight('.topbar') - visibleHeight('.hint') - visibleHeight('.touch-controls');
            const scale = Math.max(0.4, Math.min(availW / LW, availH / LH, MAX_SCALE));
            const dpr = window.devicePixelRatio || 1;
            canvas.style.maxWidth = 'none';
            canvas.style.width = Math.floor(LW * scale) + 'px';
            canvas.style.height = Math.floor(LH * scale) + 'px';
            canvas.width = Math.round(LW * scale * dpr);
            canvas.height = Math.round(LH * scale * dpr);
            state.scale = canvas.width / LW;       // pixels reais por unidade lógica
        }

        window.addEventListener('resize', resize);
        document.addEventListener('fullscreenchange', resize);
        resize();
        document.addEventListener('DOMContentLoaded', resize);   // topbar/hint já existem
        window.addEventListener('load', resize);

        return {
            apply(ctx) { ctx.setTransform(state.scale, 0, 0, state.scale, 0, 0); },
            resize
        };
    }

    // Botão de tela cheia (tecla F)
    function toggleFullscreen() {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    }
    document.addEventListener('DOMContentLoaded', () => {
        const bar = document.querySelector('.topbar');
        if (!bar || !document.documentElement.requestFullscreen) return;
        let actions = bar.querySelector('.actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'actions';
            const spacer = bar.querySelector('span:last-child');
            if (spacer) spacer.replaceWith(actions); else bar.appendChild(actions);
        }
        const b = document.createElement('button');
        b.className = 'btn';
        b.style.cssText = 'font-size:14px;padding:6px 12px';
        b.textContent = '⛶ Tela cheia';
        b.title = 'Tela cheia (F)';
        b.addEventListener('click', e => { toggleFullscreen(); e.currentTarget.blur(); });
        actions.appendChild(b);
    });
    document.addEventListener('keydown', e => {
        if ((e.key === 'f' || e.key === 'F') && !e.repeat && !e.ctrlKey && !e.metaKey) toggleFullscreen();
    });

    window.Fit = { setup, toggleFullscreen };
})();
