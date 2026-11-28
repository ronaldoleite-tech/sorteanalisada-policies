// ==============================
//      GERADOR DE DEZENAS (10 jogos por vez)
//      Modos: Aleatório e Monte Carlo (dezenas sorteadas com peso proporcional
//      à frequência obtida em simulações, lida de /monte_carlo_data/*.json).
//      Roda inteiramente no navegador: nada é enviado nem armazenado.
// ==============================
(function () {
    "use strict";

    // Pasta (em /public) com os arquivos de simulação Monte Carlo
    const MC_PASTA = "/monte_carlo_data/";

    // Regras básicas de cada loteria (1 jogo simples)
    // arquivoMC = arquivo de simulação; sem ele, a loteria só tem o modo aleatório
    const LOTERIAS = {
        megasena:   { nome: "Mega-Sena",    dezenas: 6,  max: 60, arquivoMC: "monte_carlo_data_megasena.json" },
        quina:      { nome: "Quina",        dezenas: 5,  max: 80, arquivoMC: "monte_carlo_data_quina.json" },
        duplasena:  { nome: "Dupla-Sena",   dezenas: 6,  max: 50, arquivoMC: "monte_carlo_data_duplasena.json" },
        lotofacil:  { nome: "Lotofácil",    dezenas: 15, max: 25, arquivoMC: "monte_carlo_data_lotofacil.json" },
        diadesorte: { nome: "Dia de Sorte", dezenas: 7,  max: 31, mesDaSorte: true, arquivoMC: "monte_carlo_data_dia_de_sorte.json" },
        maismilionaria: { nome: "+Milionária", dezenas: 6, max: 50, trevos: 2, maxTrevo: 6 },
        // Super Sete: 7 colunas independentes, cada uma com um dígito de 0 a 9
        // (pode repetir entre colunas e NÃO é colocado em ordem crescente)
        supersete:  { nome: "Super Sete",   colunas: 7, maxColuna: 9 }
    };

    const MESES = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // Inteiro aleatório em [0, maxExclusivo) sem viés (crypto + rejeição)
    function inteiroAleatorio(maxExclusivo) {
        const c = window.crypto || window.msCrypto;
        if (c && c.getRandomValues) {
            const limite = Math.floor(0x100000000 / maxExclusivo) * maxExclusivo;
            const buf = new Uint32Array(1);
            let x;
            do {
                c.getRandomValues(buf);
                x = buf[0];
            } while (x >= limite);
            return x % maxExclusivo;
        }
        return Math.floor(Math.random() * maxExclusivo);
    }

    // Sorteia "qtd" dezenas distintas entre 1 e "max" (Fisher-Yates parcial), em ordem crescente
    function sortearDezenas(qtd, max) {
        const pool = Array.from({ length: max }, (_, i) => i + 1);
        for (let i = 0; i < qtd; i++) {
            const j = i + inteiroAleatorio(max - i);
            const tmp = pool[i];
            pool[i] = pool[j];
            pool[j] = tmp;
        }
        return pool.slice(0, qtd).sort((a, b) => a - b);
    }

    // Sorteia "qtd" dezenas distintas com peso (sem reposição), em ordem crescente.
    // itens = [{ n: dezena, peso: inteiro > 0 }]
    function sortearPonderado(itens, qtd) {
        const pool = itens.map(function (i) { return { n: i.n, peso: i.peso }; });
        const escolhidas = [];
        for (let k = 0; k < qtd && pool.length; k++) {
            let total = 0;
            for (let i = 0; i < pool.length; i++) total += pool[i].peso;
            let r = inteiroAleatorio(total);
            for (let i = 0; i < pool.length; i++) {
                if (r < pool[i].peso) {
                    escolhidas.push(pool[i].n);
                    pool.splice(i, 1);
                    break;
                }
                r -= pool[i].peso;
            }
        }
        return escolhidas.sort((a, b) => a - b);
    }

    // Carrega (uma única vez por loteria) e valida os dados da simulação Monte Carlo
    const cacheMC = {};
    function carregarMC(chave) {
        const regra = LOTERIAS[chave];
        if (!regra || !regra.arquivoMC) return Promise.reject(new Error("sem arquivo"));
        if (!cacheMC[chave]) {
            cacheMC[chave] = fetch(MC_PASTA + regra.arquivoMC)
                .then(function (r) {
                    if (!r.ok) throw new Error("HTTP " + r.status);
                    return r.json();
                })
                .then(function (dados) {
                    const freq = dados && dados.frequencia_numeros;
                    if (!freq) throw new Error("formato inesperado");
                    const itens = [];
                    Object.keys(freq).forEach(function (k) {
                        const n = parseInt(k, 10);
                        const peso = Math.round(Number(freq[k]));
                        if (n >= 1 && n <= regra.max && isFinite(peso)) {
                            itens.push({ n: n, peso: Math.max(1, peso) });
                        }
                    });
                    // precisa ter todas as dezenas da loteria, senão alguma nunca seria sorteada
                    if (itens.length !== regra.max) throw new Error("dados incompletos");

                    // Dia de Sorte: o arquivo também traz a frequência dos meses (opcional;
                    // sem os 12 meses válidos, o Mês de Sorte continua sendo sorteado ao acaso)
                    let meses = null;
                    if (regra.mesDaSorte && dados.frequencia_meses) {
                        const lista = MESES.map(function (nome) {
                            return { nome: nome, peso: Math.round(Number(dados.frequencia_meses[nome])) };
                        });
                        if (lista.every(function (m) { return isFinite(m.peso) && m.peso > 0; })) meses = lista;
                    }
                    return { itens: itens, simulacoes: Number(dados.num_simulacoes) || 0, meses: meses };
                })
                .catch(function (e) {
                    delete cacheMC[chave];   // permite tentar de novo depois
                    throw e;
                });
        }
        return cacheMC[chave];
    }

    function formatar(n) {
        return String(n).padStart(2, "0");
    }

    // Super Sete: um dígito (0 a 9) por coluna, sorteados de forma independente
    function sortearColunas(qtd, maxDigito) {
        const colunas = [];
        for (let i = 0; i < qtd; i++) colunas.push(inteiroAleatorio(maxDigito + 1));
        return colunas;
    }

    // Quantidade de jogos gerados a cada clique
    const QTD_JOGOS = 10;

    // Gera UM jogo. dadosMC (opcional): dados já validados de carregarMC() → modo Monte Carlo
    function gerarJogo(chave, dadosMC) {
        const regra = LOTERIAS[chave];
        const jogo = {};
        if (regra.colunas) {
            jogo.colunas = sortearColunas(regra.colunas, regra.maxColuna);
        } else if (dadosMC) {
            jogo.dezenas = sortearPonderado(dadosMC.itens, regra.dezenas);
        } else {
            jogo.dezenas = sortearDezenas(regra.dezenas, regra.max);
        }
        if (regra.mesDaSorte) {
            jogo.mes = (dadosMC && dadosMC.meses)
                ? MESES[sortearPonderado(dadosMC.meses.map(function (m, i) { return { n: i, peso: m.peso }; }), 1)[0]]
                : MESES[inteiroAleatorio(MESES.length)];
        }
        if (regra.trevos) jogo.trevos = sortearDezenas(regra.trevos, regra.maxTrevo);
        return jogo;
    }

    // Gera os 10 jogos, todos com combinações diferentes entre si
    function gerarJogos(chave, dadosMC) {
        const regra = LOTERIAS[chave];
        if (!regra) return null;
        const conjunto = { chave: chave, nome: regra.nome, metodo: "aleatorio", jogos: [] };
        if (dadosMC && !regra.colunas) {
            conjunto.metodo = "montecarlo";
            conjunto.simulacoes = dadosMC.simulacoes;
        }
        const vistos = new Set();
        let tentativas = 0;
        while (conjunto.jogos.length < QTD_JOGOS && tentativas < QTD_JOGOS * 50) {
            tentativas++;
            const jogo = gerarJogo(chave, dadosMC);
            const marca = (jogo.dezenas || jogo.colunas).join(",");
            if (vistos.has(marca)) continue;
            vistos.add(marca);
            conjunto.jogos.push(jogo);
        }
        return conjunto;
    }

    function textoParaCopiar(c) {
        const linhas = [c.nome + " - " + c.jogos.length + " jogos"];
        c.jogos.forEach(function (j, i) {
            let linha = String(i + 1).padStart(2, "0") + ": " +
                (j.colunas ? j.colunas.join(" - ") : j.dezenas.map(formatar).join(" - "));
            if (j.mes) linha += " | Mês de Sorte: " + j.mes;
            if (j.trevos) linha += " | Trevos: " + j.trevos.join(" - ");
            linhas.push(linha);
        });
        if (c.jogos.length && c.jogos[0].colunas) {
            linhas.push("(colunas 1 a " + c.jogos[0].colunas.length + ", nessa ordem)");
        }
        if (c.metodo === "montecarlo") linhas.push("(modo Monte Carlo)");
        return linhas.join("\n");
    }

    function copiarTexto(texto) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(texto);
        }
        return new Promise(function (resolve, reject) {
            const area = document.createElement("textarea");
            area.value = texto;
            area.style.position = "fixed";
            area.style.opacity = "0";
            document.body.appendChild(area);
            area.select();
            try {
                document.execCommand("copy") ? resolve() : reject(new Error("copy"));
            } catch (e) {
                reject(e);
            } finally {
                document.body.removeChild(area);
            }
        });
    }

    function criar(tag, classe, texto) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (texto !== undefined) el.textContent = texto;
        return el;
    }

    function iniciarGerador() {
        const select = document.getElementById("gerador-loteria");
        const areaModo = document.getElementById("gerador-modo-area");
        const selectModo = document.getElementById("gerador-modo");
        const notaModo = document.getElementById("gerador-modo-nota");
        const btnGerar = document.getElementById("gerador-gerar");
        const btnCopiar = document.getElementById("gerador-copiar");
        const area = document.getElementById("gerador-resultado");
        const status = document.getElementById("gerador-status");
        if (!select || !btnGerar || !btnCopiar || !area) return;

        const MENSAGEM_VAZIA = "Escolha a loteria e clique em “Gerar 10 jogos”.";
        const ROTULO_COPIAR = btnCopiar.innerHTML;
        let conjuntoAtual = null;
        let timerCopiar = null;
        let pedido = 0;   // identifica a última solicitação (descarta respostas antigas)

        function temMC() {
            const regra = LOTERIAS[select.value];
            return !!(regra && regra.arquivoMC);
        }

        function modoMC() {
            return temMC() && selectModo && selectModo.value === "montecarlo";
        }

        // O seletor de modo só aparece nas loterias que têm dados de simulação
        function atualizarModo() {
            if (areaModo) areaModo.hidden = !temMC();
            if (notaModo) notaModo.hidden = !modoMC();
        }

        function mostrarVazio() {
            conjuntoAtual = null;
            area.innerHTML = "";
            area.appendChild(criar("p", "gerador-vazio", MENSAGEM_VAZIA));
            btnCopiar.disabled = true;
        }

        function mostrarJogos(c) {
            conjuntoAtual = c;
            area.innerHTML = "";

            area.appendChild(criar("p", "gerador-nome", c.nome));
            if (c.jogos.length && c.jogos[0].colunas) {
                area.appendChild(criar("p", "gerador-vazio",
                    "Dígitos das colunas 1 a " + c.jogos[0].colunas.length + ", nessa ordem."));
            }

            const lista = criar("div", "jogos-lista");
            lista.setAttribute("role", "list");
            lista.setAttribute("aria-label", c.jogos.length + " jogos gerados para " + c.nome);

            c.jogos.forEach(function (jogo, k) {
                const rotulo = "Jogo " + String(k + 1).padStart(2, "0");
                const linha = criar("div", "jogo-linha");
                linha.setAttribute("role", "listitem");
                linha.appendChild(criar("span", "jogo-rotulo", rotulo));

                const bolas = criar("div", "bolas bolas-peq");
                const valores = jogo.colunas ? jogo.colunas.map(String) : jogo.dezenas.map(formatar);
                if (valores.length > 8) bolas.classList.add("bolas-longa");   // ex.: Lotofácil (ver CSS)
                bolas.setAttribute("role", "group");
                bolas.setAttribute("aria-label", rotulo + ": " + valores.join(", "));
                valores.forEach(function (v, i) {
                    const bola = criar("span", "bola", v);
                    bola.style.setProperty("--i", String(i));
                    bolas.appendChild(bola);
                });
                linha.appendChild(bolas);

                if (jogo.mes) linha.appendChild(criar("span", "bola-mes", jogo.mes));
                if (jogo.trevos) {
                    jogo.trevos.forEach(function (t) {
                        const trevo = criar("span", "bola-trevo");
                        trevo.innerHTML = '<i class="fa-solid fa-clover" aria-hidden="true"></i> ';
                        trevo.appendChild(document.createTextNode(String(t)));
                        linha.appendChild(trevo);
                    });
                }
                lista.appendChild(linha);
            });
            area.appendChild(lista);

            if (c.metodo === "montecarlo") {
                const sims = c.simulacoes ? c.simulacoes.toLocaleString("pt-BR") + " simulações" : "simulações";
                area.appendChild(criar("p", "gerador-vazio", "Modo Monte Carlo · " + sims));
            } else if (c.avisoMC) {
                area.appendChild(criar("p", "gerador-vazio",
                    "Não foi possível carregar os dados do Monte Carlo agora; estes jogos foram gerados no modo aleatório."));
            }

            btnCopiar.disabled = false;
        }

        btnGerar.addEventListener("click", function () {
            const chave = select.value;
            const atual = ++pedido;

            if (!modoMC()) {
                const c = gerarJogos(chave);
                if (c) mostrarJogos(c);
                return;
            }

            btnGerar.disabled = true;
            if (status) status.textContent = "Carregando dados da simulação…";
            carregarMC(chave).then(
                function (dados) { return gerarJogos(chave, dados); },
                function () {
                    const c = gerarJogos(chave);
                    if (c) c.avisoMC = true;
                    return c;
                }
            ).then(function (c) {
                if (atual !== pedido) return;   // o usuário mudou de loteria/modo no meio do caminho
                if (c) mostrarJogos(c);
            }).then(function () {
                btnGerar.disabled = false;
                if (status) status.textContent = "";
            });
        });

        // Trocar de loteria ou de modo limpa o resultado (ele pertence à escolha anterior)
        function aoMudarEscolha() {
            pedido++;
            btnGerar.disabled = false;
            atualizarModo();
            mostrarVazio();
        }
        select.addEventListener("change", aoMudarEscolha);
        if (selectModo) selectModo.addEventListener("change", aoMudarEscolha);

        btnCopiar.addEventListener("click", function () {
            if (!conjuntoAtual) return;
            const texto = textoParaCopiar(conjuntoAtual);

            function feedback(ok) {
                clearTimeout(timerCopiar);
                btnCopiar.innerHTML = ok
                    ? '<i class="fa-solid fa-check" aria-hidden="true"></i> Copiado!'
                    : '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Não foi possível copiar';
                if (status) status.textContent = ok ? "Jogos copiados." : "Não foi possível copiar.";
                timerCopiar = setTimeout(function () {
                    btnCopiar.innerHTML = ROTULO_COPIAR;
                    if (status) status.textContent = "";
                }, 2000);
            }

            copiarTexto(texto).then(function () { feedback(true); }, function () { feedback(false); });
        });

        atualizarModo();
        mostrarVazio();
    }

    document.addEventListener("DOMContentLoaded", iniciarGerador);
})();
