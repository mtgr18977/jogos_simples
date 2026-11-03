# Joguinhos simples

Este repositório contém uma coleção de jogos clássicos desenvolvidos em HTML5 e JavaScript. por enquanto, os jogos incluem Tetris e Pong. A página principal permite ao usuário escolher o jogo e acessar uma seção de ajuda para instruções de cada um.
Conteúdo

- `index.html`: Página inicial onde o usuário pode selecionar o jogo que deseja jogar.
- `tetris.html`: Tetris com 3 modos (Clássico, Tempo, Desafio), peça guardada, sombra, queda rápida, nível e ranking Top 5 por modo.
- `pong.html`: Implementação do jogo Pong, onde o usuário pode ajustar a dificuldade e competir contra uma IA.
- `enduro/`: Enduro (inspirado no Atari 2600) com velocidade, neblina, neve e recorde.
- `assets/game.css`: estilo compartilhado pelos jogos.

## Recursos

### Página Inicial (index.html)
- Interface com estilo moderno.
- Botões para iniciar cada jogo.
- Seção de ajuda que explica o objetivo e os controles de cada jogo.

### Tetris (tetris.html)
- 3 modos de jogo: Clássico, Tempo e Desafio.
- Painel lateral com informações de pontuação, nível e ranking.
- Funcionalidade de ranking de pontuação armazenada localmente.
- Controles: Setas para mover, Q para rotacionar.

### Pong (pong.html)
- Jogo contra IA com níveis de dificuldade.
- Placar em tempo real.
- Controles: Setas para mover a barra e Espaço para pausar.

### Enduro (enduro/game.js)
- Jogo infinito.
- Scroller com diversos blocos, você controla o bloco que se mexe.
- Controles: setas para direita/esquerda para movimentar/desviar dos carros.

## Como Executar
- Baixe ou clone o repositório.
- Abra o arquivo index.html em um navegador compatível.
- Escolha o jogo desejado e divirta-se!

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
| Pong | ↑ ↓ ou W S | Mover a barra (ou arraste o dedo no celular) |
| Pong | Espaço / P | Pausar |
| Enduro | ← → | Desviar |
| Enduro | ↑ / ↓ | Acelerar / frear |
| Enduro | Espaço / P | Pausar |
| Enduro | Enter | Reiniciar |

Os jogos também têm botões de toque em celulares.
