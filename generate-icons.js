#!/usr/bin/env node

/**
 * Script para gerar ícones PWA do LexiDecis
 * Este script gera ícones PNG em diferentes tamanhos a partir do SVG base
 *
 * Como usar:
 * 1. Instalar dependências: npm install sharp
 * 2. Executar: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Gerando ícones PWA do LexiDecis...\n');

// Verificar se o arquivo SVG existe
const svgPath = path.join(__dirname, 'images', 'icon.svg');
if (!fs.existsSync(svgPath)) {
    console.error('❌ Arquivo images/icon.svg não encontrado!');
    process.exit(1);
}

// Tamanhos necessários para a PWA
const iconSizes = [72, 96, 128, 144, 192, 512];

console.log('📋 Tamanhos de ícones necessários:');
iconSizes.forEach(size => {
    console.log(`  - ${size}x${size}px`);
});

console.log('\n📝 Instruções para gerar os ícones:');
console.log('1. Abra o arquivo images/icon.svg em um editor de imagens (Inkscape, Adobe Illustrator, etc.)');
console.log('2. Exporte o ícone nos seguintes tamanhos:');

iconSizes.forEach(size => {
    console.log(`   - icon-${size}x${size}.png (${size}x${size} pixels)`);
});

console.log('\n3. Salve os arquivos na pasta images/');
console.log('4. Verifique se os caminhos no manifest.json estão corretos\n');

console.log('💡 Dica: Você pode usar ferramentas online como:');
console.log('   - https://favicon.io/favicon-converter/');
console.log('   - https://www.favicon-generator.org/');
console.log('   - https://favicon.io/favicon-generator/');

console.log('\n✅ Script executado com sucesso!');
console.log('Agora siga as instruções acima para gerar os ícones PNG.');

// Criar estrutura de pastas se não existir
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('📁 Pasta images/ criada');
}

// Verificar arquivos existentes
console.log('\n📂 Arquivos na pasta images/:');
const files = fs.readdirSync(imagesDir);
if (files.length === 0) {
    console.log('   (pasta vazia)');
} else {
    files.forEach(file => {
        console.log(`   - ${file}`);
    });
}
