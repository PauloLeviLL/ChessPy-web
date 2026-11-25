# ChessPy-Web

Aplicação web de xadrez desenvolvida em Python e JavaScript, com tabuleiro interativo, sprites em pixel art, modos de partida contra outro jogador ou Bot, persistência de partidas em SQLite e análise lance a lance integrada ao motor UCI **Stockfish**.

---

## Sumário

* [Visão Geral](#visão-geral)
* [Principais Funcionalidades](#principais-funcionalidades)
* [Como Funciona a Análise com Stockfish](#como-funciona-a-análise-com-stockfish)
* [Arquitetura e Estrutura do Projeto](#arquitetura-e-estrutura-do-projeto)
* [Configuração e Execução](#configuração-e-execução)
* [Controles e Atalhos Visuais](#controles-e-atalhos-visuais)
* [Próximos Passos e Melhorias](#próximos-passos-e-melhorias)

---

## Visão Geral

O **ChessPy-Web** reúne criação e gerenciamento de partidas, controle de relógio, histórico persistido e revisão detalhada de lances em uma interface web única. O backend processa a lógica da partida e consulta o **Stockfish** via `python-chess` (`chess.engine.SimpleEngine`), enquanto o frontend em `board.js` cuida da renderização do tabuleiro, animações, setas vetoriais em SVG, navegação entre lances e visualização da análise.

---

## Principais Funcionalidades

### 1. Configuração de Partida
* **Modos de jogo:** partida presencial (2 jogadores) ou contra o Bot com **10 níveis** de dificuldade (`Iniciante` até `Mestre`).
* **Escolha de lado e orientação:** seleção de cor (`Brancas`, `Pretas` ou `Aleatório` no modo Bot) e opção de inverter o tabuleiro.
* **Controles de tempo:** suporte a relógios com tempo base e acréscimo (`incrementSeconds`), além de modo **Sem tempo** (`∞`).
* **Temas visuais:** alternância de tema do tabuleiro direto pela interface (`Padrão` e `Roxo`).

### 2. Tabuleiro Interativo e Fluxo de Jogo
* **Movimentação fluida:** jogar clicando na peça e no destino ou arrastando e soltando (com suporte a mouse e toque).
* **Feedback visual no tabuleiro:** destaque para último lance, casa em xeque, rei vencedor/perdedor (`#` no xeque-mate), casas legais e indicadores de captura.
* **Animação e navegação:** animação interpolada na execução dos lances e ao navegar pelo histórico (`anterior`, `próximo`, `desfazer`, `reiniciar` ou clique direto na tabela de lances).
* **Setas táticas (botão direito):** desenho e remoção de setas em SVG diretamente sobre o tabuleiro, incluindo dobra ortogonal em **"L"** para saltos de cavalo.

### 3. Histórico de Partidas e Persistência
* **Registro automático:** partidas finalizadas ou interrompidas são enviadas ao backend para persistência em SQLite.
* **Busca, filtros e prévia:** filtragem por resultado, busca textual, mini-tabuleiro da posição final, contagem de jogadas/meio-lances e exibição do PGN.
* **Remoção de registros:** exclusão de partidas salvas diretamente pela aba de histórico.

---

## Como Funciona a Análise com Stockfish

O módulo `stockfish_analyzer.py` avalia a partida lance a lance e monta um relatório estruturado com avaliação, classificação, precisão e comentários:

* **Avaliação em centipeões e Pontos Esperados:** converte a pontuação da engine para a perspectiva das Brancas (`evalCp`, `evalScore`, `evalText`) e calcula `expectedPoints` no intervalo `[0.00, 1.00]`, onde `0.50` indica equilíbrio.
* **Classificação de lances:** avalia cada lance com base na perda de Pontos Esperados (`expected_points_loss`), condição de melhor lance, sacrifício tático, viradas críticas e livro de aberturas (`OPENING_BOOK_LINES`):
  * `Brilhante` (`!!`)
  * `Grande Lance` (`!`)
  * `Melhor` (`★`)
  * `Excelente` (`👍` na UI)
  * `Bom` (`✓`)
  * `Livro` (`B`)
  * `Imprecisão` (`?!`)
  * `Erro` (`?`)
  * `Capivarada` (`??`)
* **Precisão aproximada (estilo CAPS2):** calcula uma estimativa percentual de precisão para Brancas e Pretas a partir da perda de pontos esperados por lance.
* **Comentários do treinador (`generate_coach_commentary`):** gera explicações em português comparando o lance jogado com a sugestão do Stockfish (identificando lances teóricos, xeque-mate, sacrifícios, ataques duplos, peças penduradas, promoções perdidas ou mates permitidos).
* **Tela de análise (`board.js`):** exibe barra de avaliação vertical, resumo de classificações por cor, seta para o melhor lance recomendado, seta para o lance jogado, badges sobre o tabuleiro, setas manuais e navegação por meio-lance.

---

## Arquitetura e Estrutura do Projeto

```text
.
├── run.py                  # Ponto de entrada para iniciar a aplicação web
├── stockfish_analyzer.py   # Integração UCI com Stockfish, métricas EP/CAPS2, classificação e comentários
├── board.js              # Lógica da UI, tabuleiro, setas SVG, relógios, histórico e aba de análise
├── bin/                  # Executável local opcional do Stockfish (ex.: bin/stockfish.exe)
└── static/sprites/       # Sprites das peças de xadrez organizados por cor e tipo

Detalhes dos módulos principais

    run.py: inicializa e executa o servidor da aplicação.

    stockfish_analyzer.py:

        find_stockfish_binary() — busca o binário via STOCKFISH_PATH, bin/stockfish.exe, PATH do sistema ou caminhos padrão.

        evaluate_position(...) — executa análise com multipv=2 respeitando limites de tempo e profundidade (safe_time, safe_depth) e configura Hash quando suportado.

        classify_move_with_expected_points(...) — aplica as regras de classificação por lance.

        compute_caps2_accuracy(...) — agrega a precisão por lado.

        analyze_game_with_stockfish(...) — orquestra a validação de lances SAN, avaliação inicial (ply: 0), loop por meio-lance e retorno do relatório completo.

    board.js:

        Gerencia o estado da partida, rascunho/configuração ativa, relógio regressivo com acréscimo, animações, histórico em SQLite e consumo de /api/games/analyze.

Configuração e Execução
1. Pré-requisitos

    Python 3.10+ e pip.

    Stockfish (motor UCI) disponível no ambiente.

2. Instalação das dependências

No terminal, dentro da pasta do projeto, instale as dependências necessárias:
Bash

pip install -r requirements.txt

(Caso não tenha requirements.txt criado, instale diretamente os pacotes usados pelo projeto, como python-chess e o framework web do backend.)
3. Disponibilizando o binário do Stockfish

O stockfish_analyzer.py procura o executável na seguinte ordem:

    Variável de ambiente STOCKFISH_PATH (ex.: C:\caminho\para\stockfish.exe no Windows ou /usr/bin/stockfish no Linux).

    <raiz_do_projeto>/bin/stockfish.exe.

    Comando stockfish no PATH do sistema (/usr/games/stockfish, /usr/bin/stockfish, bin/stockfish.exe, ../bin/stockfish.exe).

4. Rodando o projeto

Com as dependências instaladas e o Stockfish acessível, execute no terminal:
Bash

python run.py

Depois, abra o endereço local exibido no terminal no navegador, configure o modo de jogo na aba inicial e clique para começar.
Controles e Atalhos Visuais

    Clique esquerdo: seleciona peça, move para casa válida ou limpa setas desenhadas.

    Arrastar e soltar: move a peça diretamente para a casa de destino.

    Arrastar com botão direito: desenha/alterna setas no tabuleiro (inclusive em "L" para cavalo); clique esquerdo limpa as setas.

    Tabela de lances: clique em qualquer lance para inspecionar a posição correspondente na partida ou na análise.