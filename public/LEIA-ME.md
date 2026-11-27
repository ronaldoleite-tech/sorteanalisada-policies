# Últimos Resultados das Loterias — Sorte Analisada

Página `/ultimosresultados` com cards das 11 loterias, alimentada 1x por dia por um Worker (Cron) que grava no KV.

## Onde cada arquivo vai

```
sorteanalisada-policies/            <- raiz do projeto
├── functions/
│   └── ultimosresultados.js        <- Pages Function (rota /ultimosresultados)
├── worker/                         <- projeto do Worker, FORA da pasta public
│   ├── wrangler.toml
│   └── src/index.js
└── public/
    └── static/css/
        └── ultimosresultados.css   <- estilos dos cards
```

A pasta `functions` precisa ficar na **raiz do projeto, ao lado de `public`** (não dentro dela).
Arrastar só a pasta `public` no painel (upload direto) **não publica Functions**: use a integração com o Git
ou `npx wrangler pages deploy public` a partir da raiz.

## Passo a passo

1. **Criar o KV** (uma vez):
   ```
   cd worker
   npx wrangler kv namespace create LOTERIAS_KV
   ```
   Copie o `id` exibido para `worker/wrangler.toml` (campo `id`).

2. **Publicar o Worker**:
   ```
   npx wrangler deploy
   ```
   O Cron (`0 6 * * *` = 03:00 de Brasília) já fica ativo.

3. **Ligar o mesmo KV ao projeto do Pages**: Cloudflare → Workers & Pages → seu projeto → Settings →
   Bindings (Functions) → KV namespace → nome da variável **`LOTERIAS_KV`**, escolha o namespace criado
   (Production e Preview). Depois faça um novo deploy do site.

4. **Primeira carga dos dados** (sem esperar as 3h da manhã), ainda na pasta `worker`:
   ```
   npx wrangler dev --remote --test-scheduled
   ```
   Abra `http://localhost:8787/__scheduled` no navegador. Isso executa a coleta de verdade, a partir da
   rede da Cloudflare, e grava no KV. Para conferir:
   ```
   npx wrangler kv key get status --binding=LOTERIAS_KV --remote
   ```
   O `status` mostra quais loterias foram atualizadas e o motivo de qualquer falha.

5. Abra `https://sorteanalisada.com.br/ultimosresultados`.

## Links para adicionar nas outras páginas (não alterei nenhuma)

Menu (`nav-interna`):
```html
<a href="/ultimosresultados">Últimos Resultados</a>
```
Sitemap:
```xml
<url><loc>https://sorteanalisada.com.br/ultimosresultados</loc></url>
```
Confira também se o `_redirects` não tem uma regra genérica que capture `/ultimosresultados`.

## Como funciona e o que protege os dados

- O Worker consulta as 11 APIs da Caixa (1 tentativa extra em caso de erro), valida cada resposta e grava um JSON
  único em `resultados`, com a data/hora da última atualização bem-sucedida.
- Resposta com erro, incompleta ou inválida **não substitui** o dado anterior daquela loteria; concurso mais
  antigo que o salvo também é recusado. Se tudo falhar, `resultados` fica intacto.
- A página só lê o KV. Não consulta a Caixa, não guarda nada de visitantes e não exige login.
- Todo texto vindo do KV é escapado antes de entrar no HTML.

## Anúncios

`INCLUIR_ADSENSE` no topo de `functions/ultimosresultados.js` está `false`: a página não carrega o script do
AdSense. Mude para `true` se quiser anúncios nela (veja a observação sobre conteúdo na conversa).

## Ajustes rápidos

- Horário: `crons` em `wrangler.toml` (UTC; Brasília = UTC-3).
- Ordem dos cards: lista `ORDEM` na Function e `LOTERIAS` no Worker.
- Cache do navegador: `Cache-Control` na Function (hoje 5 minutos).
