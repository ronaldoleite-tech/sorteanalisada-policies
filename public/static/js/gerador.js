// ==============================
//      GERADOR DE DEZENAS (simples)
//      Roda inteiramente no navegador: nada é enviado nem armazenado.
// ==============================
(function () {
    "use strict";

    // Regras básicas de cada loteria (1 jogo simples)
    const LOTERIAS = {
        megasena:   { nome: "Mega-Sena",    dezenas: 6,  max: 60 },
        quina:      { nome: "Quina",        dezenas: 5,  max: 80 },
        duplasena:  { nome: "Dupla-Sena",   dezenas: 6,  max: 50 },
        lotofacil:  { nome: "Lotofácil",    dezenas: 15, max: 25 },
        diadesorte: { nome: "Dia de Sorte", dezenas: 7,  max: 31, mesDaSorte: true },
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

    function formatar(n) {
        return String(n).padStart(2, "0");
    }

    // Super Sete: um dígito (0 a 9) por coluna, sorteados de forma independente
    function sortearColunas(qtd, maxDigito) {
        const colunas = [];
        for (let i = 0; i < qtd; i++) colunas.push(inteiroAleatorio(maxDigito + 1));
        return colunas;
    }

    function gerarJogo(chave) {
        const regra = LOTERIAS[chave];
        if (!regra) return null;
        const jogo = { chave: chave, nome: regra.nome };
        if (regra.colunas) {
            jogo.colunas = sortearColunas(regra.colunas, regra.maxColuna);
        } else {
            jogo.dezenas = sortearDezenas(regra.dezenas, regra.max);
        }
        if (regra.mesDaSorte) jogo.mes = MESES[inteiroAleatorio(MESES.length)];
        if (regra.trevos) jogo.trevos = sortearDezenas(regra.trevos, regra.maxTrevo);
        return jogo;
    }

    function textoParaCopiar(jogo) {
        let texto;
        if (jogo.colunas) {
            texto = jogo.nome + ": " + jogo.colunas.join(" - ") + "\n(colunas 1 a " + jogo.colunas.length + ", nessa ordem)";
        } else {
            texto = jogo.nome + ": " + jogo.dezenas.map(formatar).join(" - ");
        }
        if (jogo.mes) texto += "\nMês de Sorte: " + jogo.mes;
        if (jogo.trevos) texto += "\nTrevos: " + jogo.trevos.join(" - ");
        return texto;
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
        const btnGerar = document.getElementById("gerador-gerar");
        const btnCopiar = document.getElementById("gerador-copiar");
        const area = document.getElementById("gerador-resultado");
        const status = document.getElementById("gerador-status");
        if (!select || !btnGerar || !btnCopiar || !area) return;

        const MENSAGEM_VAZIA = "Escolha a loteria e clique em “Gerar números”.";
        const ROTULO_COPIAR = btnCopiar.innerHTML;
        let jogoAtual = null;
        let timerCopiar = null;

        function mostrarVazio() {
            jogoAtual = null;
            area.innerHTML = "";
            area.appendChild(criar("p", "gerador-vazio", MENSAGEM_VAZIA));
            btnCopiar.disabled = true;
        }

        function mostrarJogo(jogo) {
            jogoAtual = jogo;
            area.innerHTML = "";

            area.appendChild(criar("p", "gerador-nome", jogo.nome));

            const lista = criar("div", "bolas");
            lista.setAttribute("role", "list");
            lista.setAttribute("aria-label", "Números gerados para " + jogo.nome);
            if (jogo.colunas) {
                // Super Sete: cada dígito aparece sob o rótulo da sua coluna
                jogo.colunas.forEach(function (n, i) {
                    const item = criar("div", "coluna");
                    item.setAttribute("role", "listitem");
                    item.appendChild(criar("span", "coluna-rotulo", "Coluna " + (i + 1)));
                    const bola = criar("span", "bola", String(n));
                    bola.style.setProperty("--i", String(i));
                    item.appendChild(bola);
                    lista.appendChild(item);
                });
            } else {
                jogo.dezenas.forEach(function (n, i) {
                    const bola = criar("span", "bola", formatar(n));
                    bola.setAttribute("role", "listitem");
                    bola.style.setProperty("--i", String(i));
                    lista.appendChild(bola);
                });
            }
            area.appendChild(lista);

            if (jogo.mes) {
                const extra = criar("p", "gerador-extra");
                extra.appendChild(criar("span", "gerador-extra-rotulo", "Mês de Sorte: "));
                extra.appendChild(criar("span", "bola-mes", jogo.mes));
                area.appendChild(extra);
            }

            if (jogo.trevos) {
                const extra = criar("p", "gerador-extra");
                extra.appendChild(criar("span", "gerador-extra-rotulo", "Trevos: "));
                jogo.trevos.forEach(function (t) {
                    const trevo = criar("span", "bola-trevo");
                    trevo.innerHTML = '<i class="fa-solid fa-clover" aria-hidden="true"></i> ';
                    trevo.appendChild(document.createTextNode(String(t)));
                    extra.appendChild(trevo);
                });
                area.appendChild(extra);
            }

            btnCopiar.disabled = false;
        }

        btnGerar.addEventListener("click", function () {
            const jogo = gerarJogo(select.value);
            if (jogo) mostrarJogo(jogo);
        });

        // Trocar de loteria limpa o resultado (ele pertence à loteria anterior)
        select.addEventListener("change", mostrarVazio);

        btnCopiar.addEventListener("click", function () {
            if (!jogoAtual) return;
            const texto = textoParaCopiar(jogoAtual);

            function feedback(ok) {
                clearTimeout(timerCopiar);
                btnCopiar.innerHTML = ok
                    ? '<i class="fa-solid fa-check" aria-hidden="true"></i> Copiado!'
                    : '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Não foi possível copiar';
                if (status) status.textContent = ok ? "Números copiados." : "Não foi possível copiar.";
                timerCopiar = setTimeout(function () {
                    btnCopiar.innerHTML = ROTULO_COPIAR;
                    if (status) status.textContent = "";
                }, 2000);
            }

            copiarTexto(texto).then(function () { feedback(true); }, function () { feedback(false); });
        });

        mostrarVazio();
    }

    document.addEventListener("DOMContentLoaded", iniciarGerador);
})();
