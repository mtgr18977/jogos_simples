# Joguinhos simples

Este repositório contém uma coleção de jogos clássicos desenvolvidos em HTML5 e JavaScript puro. Os jogos incluem Tetris, Pong, Enduro e Snake. A página principal permite ao usuário escolher o jogo e acessar uma seção de ajuda para instruções de cada um.

## Jogos

| Jogo | Destaques |
|------|-----------|
| Tetris | 3 modos (Clássico, Tempo, Desafio), sorteio 7-bag, sombra, queda rápida, peça guardada, ranking Top 5 por modo, partículas ao limpar linhas |
| Pong | 1 jogador (IA com 3 dificuldades) ou 2 jogadores no mesmo teclado; ângulo da rebatida e aceleração; vitórias/derrotas salvas |
| Enduro | Velocidade controlável, ultrapassagens, neblina e neve, recorde |
| Snake | Paredes sólidas ou atravessáveis, aceleração progressiva, recorde por modo |

Todos têm efeitos sonoros (tecla **M** liga/desliga), pausa automática ao trocar de aba e botões de toque no celular.

## Estrutura

```
index.html            menu e ajuda de cada jogo
tetris.html/.js       interface do Tetris      ← tetris-logic.js (lógica pura)
pong.html/.js         interface do Pong        ← pong-logic.js   (lógica pura)
snake.html/.js        interface do Snake       ← snake-logic.js  (lógica pura)
enduro/               Enduro (index.html + game.js)
assets/game.css       estilo compartilhado
assets/audio.js       efeitos sonoros (Web Audio, sem arquivos)
tests/                testes automatizados da lógica pura
```

Os arquivos `*-logic.js` não tocam no DOM, por isso rodam tanto no navegador quanto no Node, onde são testados.

## Como Executar
- Baixe ou clone o repositório.
- Abra o arquivo index.html em um navegador compatível (ou rode `npm run serve` e acesse http://localhost:8000).
- Escolha o jogo desejado e divirta-se!

## Testes

```bash
npm test
```

Requer Node 20+ (usa o `node:test` nativo, sem instalar nada).

## Publicação

Um workflow do GitHub Actions (`.github/workflows/pages.yml`) roda os testes e publica o site no GitHub Pages a cada push na `main`. Para ativar, vá em *Settings → Pages → Source: GitHub Actions*.

## Tecnologias Utilizadas
- HTML5 para estrutura de conteúdo.
- CSS para estilização e responsividade.
- JavaScript para lógica de jogo e interação.

## Controles dos Jogos

| Jogo | Tecla | Ação |
|------|-------|------|
| Tetris | ← → | Mover |
| Tetris | ↑ / Q | Girar horário / anti-horário |
| Tetris | ↓ | Descer (1 ponto por célula) |
| Tetris | Espaço | Queda rápida (2 pontos por célula) |
| Tetris | C / Shift | Guardar peça |
| Tetris | P / Esc | Pausar |
| Pong | ↑ ↓ ou W S | Mover a barra (1 jogador) |
| Pong 2P | W S / ↑ ↓ | Barra da esquerda / da direita |
| Pong | Espaço / P | Pausar |
| Enduro | ← → | Desviar |
| Enduro | ↑ / ↓ | Acelerar / frear |
| Enduro | Espaço / P | Pausar |
| Enduro | Enter | Reiniciar |
| Snake | ← ↑ ↓ → ou WASD | Direção |
| Snake | Espaço / P | Pausar |
| Todos | M | Liga/desliga o som |

Os jogos também têm botões de toque em celulares.
