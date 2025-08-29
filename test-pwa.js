#!/usr/bin/env node

/**
 * Script de teste da PWA LexiDecis
 * Verifica se todos os arquivos necessários existem e estão configurados corretamente
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testando PWA LexiDecis...\n');

const checks = [
    {
        name: 'Manifest.json',
        path: 'manifest.json',
        type: 'file',
        critical: true
    },
    {
        name: 'Service Worker',
        path: 'sw.js',
        type: 'file',
        critical: true
    },
    {
        name: 'Página offline',
        path: 'offline.html',
        type: 'file',
        critical: false
    },
    {
        name: 'Favicon principal',
        path: 'favicon.ico',
        type: 'file',
        critical: true
    },
    {
        name: 'Ícone principal (512x512)',
        path: 'images/vtc_contratos_seguros.png',
        type: 'file',
        critical: true
    },
    {
        name: 'Ícone secundário (256x256)',
        path: 'images/gpts/image_lexi-ico.png',
        type: 'file',
        critical: false
    },
    {
        name: 'Ícone SVG base',
        path: 'images/icon.svg',
        type: 'file',
        critical: false
    }
];

let allPassed = true;

checks.forEach(check => {
    const fullPath = path.join(__dirname, check.path);

    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${check.name}: OK`);
    } else {
        const status = check.critical ? '❌ CRÍTICO' : '⚠️  AVISO';
        console.log(`${status} ${check.name}: ARQUIVO NÃO ENCONTRADO`);
        if (check.critical) {
            allPassed = false;
        }
    }
});

console.log('\n📋 Verificações adicionais:');

// Verificar se o manifest.json é válido JSON
try {
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    console.log('✅ Manifest.json: JSON válido');

    // Verificar campos críticos
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
    requiredFields.forEach(field => {
        if (manifest[field]) {
            console.log(`✅ Manifest.${field}: OK`);
        } else {
            console.log(`❌ Manifest.${field}: AUSENTE`);
            allPassed = false;
        }
    });

} catch (error) {
    console.log('❌ Manifest.json: JSON INVÁLIDO');
    allPassed = false;
}

// Verificar se o HTML inclui o manifest
try {
    const html = fs.readFileSync('index.html', 'utf8');
    if (html.includes('manifest.json')) {
        console.log('✅ HTML: Manifest referenciado');
    } else {
        console.log('❌ HTML: Manifest NÃO referenciado');
        allPassed = false;
    }

    if (html.includes('sw.js')) {
        console.log('✅ HTML: Service Worker referenciado');
    } else {
        console.log('❌ HTML: Service Worker NÃO referenciado');
        allPassed = false;
    }

} catch (error) {
    console.log('❌ HTML: Erro ao ler arquivo');
    allPassed = false;
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
    console.log('🎉 PWA LexiDecis: TODAS AS VERIFICAÇÕES PASSARAM!');
    console.log('\n🚀 A PWA deve funcionar corretamente agora.');
    console.log('📱 Teste:');
    console.log('   1. Abra http://localhost:5501 no navegador');
    console.log('   2. Verifique se o banner de instalação aparece');
    console.log('   3. Teste a instalação como app nativo');
    console.log('   4. Teste o funcionamento offline');
} else {
    console.log('⚠️  PWA LexiDecis: ALGUMAS VERIFICAÇÕES FALHARAM');
    console.log('\n🔧 Corrija os problemas acima antes de testar.');
}

console.log('\n💡 Dica: Execute este script sempre que fizer alterações na PWA');
console.log('   node test-pwa.js');
