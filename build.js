#!/usr/bin/env node
/**
 * Gera index.html (publico, sem nenhum recurso de edicao) a partir de
 * admin.html (arquivo-fonte, mantido sempre por quem edita o site).
 *
 * admin.html tem os trechos exclusivos de administracao marcados com:
 *   <!-- ADMIN:START -->  ... conteudo HTML ...  <!-- ADMIN:END -->
 *   // ADMIN:START        ... conteudo JS ...    // ADMIN:END
 *
 * Este script remove tudo entre cada par de marcadores (inclusive os
 * proprios marcadores) e grava o resultado em index.html. admin.html
 * nunca e alterado por este script - ele e a fonte da verdade.
 *
 * Uso:  node build.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'admin.html');
const OUT = path.join(__dirname, 'index.html');

const source = fs.readFileSync(SRC, 'utf8');

const startCount = (source.match(/ADMIN:START/g) || []).length;
const endCount = (source.match(/ADMIN:END/g) || []).length;
if (startCount !== endCount) {
    console.error(`ERRO: marcadores desbalanceados — ${startCount} ADMIN:START vs ${endCount} ADMIN:END. Nada foi gerado.`);
    process.exit(1);
}

// Remove cada bloco (HTML <!-- --> ou JS //), incluindo a linha inteira e a
// quebra de linha final, para nao deixar linhas em branco sobrando.
const blockPattern = /[ \t]*(?:<!--\s*ADMIN:START\s*-->|\/\/\s*ADMIN:START)[\s\S]*?(?:<!--\s*ADMIN:END\s*-->|\/\/\s*ADMIN:END)[ \t]*\r?\n?/g;

const stripped = source.replace(blockPattern, '');

const leftoverStart = stripped.includes('ADMIN:START');
const leftoverEnd = stripped.includes('ADMIN:END');
if (leftoverStart || leftoverEnd) {
    console.error('ERRO: sobrou marcador ADMIN sem par correspondente depois da remocao. Nada foi gerado.');
    process.exit(1);
}

fs.writeFileSync(OUT, stripped, 'utf8');
console.log(`OK: index.html gerado a partir de admin.html (${startCount} blocos de admin removidos).`);
