# Last Call Dispatch Operator — Fase 2.1 (corrigido)

Esta build é **100% HTML/CSS/JS** (sem custos) e roda em:
- GitHub Pages
- Vercel
- Qualquer servidor estático

## O que foi corrigido em relação ao print
No seu print, a chamada ficava "travada" (campos não atualizavam / ações não avançavam). Nesta versão:
- Os campos **Endereço / Detalhes / Vítimas** são renderizados **sempre** a partir de `call.collected`.
- Cada ação do protocolo chama `ui.renderCallFields(call)` e `ui.renderCallActions(call)`.
- O transcript usa typewriter, mas não bloqueia o estado.

## Como jogar
1. Clique **Iniciar turno**.
2. Selecione uma chamada na fila e clique **Atender selecionada**.
3. Use os botões de protocolo para coletar endereço/detalhes.
4. Um marcador `!` aparecerá no mapa.
5. Clique no marcador para selecionar o incidente, depois clique em uma unidade disponível para despachar.

## Deploy (GitHub Pages)
- Suba a pasta inteira no repositório.
- Ative Pages apontando para a branch/pasta.

## Deploy (Vercel)
- Importe o repo.
- Framework: "Other".
- Build: vazio.
- Output: `/`.

## Estrutura
- `index.html`
- `styles.css`
- `js/` (módulos)
- `data/` (JSON de cidade e chamadas)

> Próximo passo (Fase 3): integrar Leaflet + OpenStreetMap, múltiplas cidades e progressão.
