# Last Call Dispatch Operator — Protótipo (Fase 2)

Este é um protótipo **100% front-end** (HTML/CSS/JS) para rodar no navegador e publicar no **Vercel** ou **GitHub Pages**.

## Como rodar localmente
- Opção 1 (recomendado): use um servidor estático.
  - VS Code: extensão **Live Server**
  - ou `python -m http.server 8080`
- Depois abra: `http://localhost:8080`

> Observação: abrir direto via `file://` pode bloquear `fetch()` em alguns navegadores.  
> O projeto tem **fallback embutido**, então ainda deve funcionar, mas o modo servidor é melhor.

## Como jogar (Fase 2)
1. Clique **Iniciar turno**.
2. Selecione uma chamada na **Fila** e clique **Atender selecionada**.
3. Faça triagem: endereço, o que está acontecendo e vítimas.
4. Dê **instruções pré-chegada** (se disponível).
5. Clique **Criar ocorrência e preparar despacho**.
6. No mapa, clique no pino do incidente `!`, selecione uma unidade e clique **Despachar unidade**.
7. Acompanhe a unidade até resolver a ocorrência.

## Estrutura
- `index.html` / `styles.css`
- `js/` lógica (estado, chamadas, despacho)
- `data/` conteúdo em JSON (cidades e chamadas)

## Próximas fases (exemplos)
- Carreira, upgrades, mais cidades
- Mais variedade de chamadas e scripts ramificados
- Áudio com arquivos reais + vozes
- Mapa real (Leaflet/OSM) e rota real
