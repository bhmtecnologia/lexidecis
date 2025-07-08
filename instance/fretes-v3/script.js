document.addEventListener('DOMContentLoaded', () => {

    const FILE_PATH = 'data/dados.csv';

    // Mapeamento de colunas (ajuste se os nomes no seu CSV forem diferentes)
    const COLUMN_MAPPING = {
        cliente: 'Local Solicitante',
        valor: 'Val.Total',
        peso: 'Peso_Total_kg',
        quantidade: 'Qtd',
        produto: 'Produto',
        data: 'Data',
        origem: 'local'
    };

    // --- Funções de Limpeza e Formatação ---

    const parseBrazilianNumber = (str) => {
        if (typeof str !== 'string') return str;
        return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    };

    const parseDate = (dateStr) => { // Formato esperado: DD/MM/YYYY
        if (!dateStr || typeof dateStr !== 'string') return null;
        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;
        // Ano, Mês (0-11), Dia
        return new Date(parts[2], parts[1] - 1, parts[0]);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatNumber = (value, unit = '') => {
        const suffix = unit ? ` ${unit}` : '';
        return new Intl.NumberFormat('pt-BR').format(value) + suffix;
    };

    // --- Simulador de Frete ---
    const VEHICLE_TYPES = {
        pequeno: { capacidade: 600, nome: 'Pequeno' },
        medio: { capacidade: 1500, nome: 'Médio' },
        grande: { capacidade: 3000, nome: 'Grande' }
    };

    // Objeto para armazenar distâncias dos destinos
    let DESTINOS = {};
    
    // Função para carregar destinos únicos dos dados
    const carregarDestinos = (data) => {
        const destinosUnicos = [...new Set(data.map(row => row[COLUMN_MAPPING.cliente]))].sort();
        
        // Definir distâncias padrão para alguns destinos conhecidos
        const distanciasPadrao = {
            '5090 - FARMÁCIA - HRC': 27.5,
            '5007 - FARMÁCIA - HRT': 21.3,
            '5065 - FARMÁCIA - HRAN': 19.0,
            '5060 - FARMÁCIA - HRS': 36.8
        };
        
        // Carregar distâncias salvas do localStorage
        const distanciasSalvas = JSON.parse(localStorage.getItem('distanciasDestinos') || '{}');
        
        // Inicializar DESTINOS com todos os destinos únicos
        destinosUnicos.forEach(destino => {
            // Priorizar distâncias salvas, depois padrão, depois 25km
            DESTINOS[destino] = distanciasSalvas[destino] || distanciasPadrao[destino] || 25.0;
        });
        
        // Preencher o dropdown
        const select = document.getElementById('destino-select');
        select.innerHTML = '';
        
        // Adicionar opção "Todos" como primeira opção
        const optionTodos = document.createElement('option');
        optionTodos.value = 'TODOS';
        optionTodos.textContent = 'Todos os Destinos';
        select.appendChild(optionTodos);
        
        destinosUnicos.forEach(destino => {
            const option = document.createElement('option');
            option.value = destino;
            option.textContent = `${destino} (${DESTINOS[destino]} km)`;
            select.appendChild(option);
        });
        
        // Selecionar "Todos" por padrão
        select.value = 'TODOS';
        atualizarCalculosCards();
    };

    // Função para obter destino e distância atuais
    const getDestinoAtual = () => {
        const select = document.getElementById('destino-select');
        const destino = select.value;
        
        // Se "TODOS" estiver selecionado, usar distância padrão de 25km
        if (destino === 'TODOS') {
            const distanciaManual = document.getElementById('distancia-manual').value;
            const distancia = distanciaManual ? parseFloat(distanciaManual) : 25.0;
            const isManual = !!distanciaManual;
            return { destino, distancia, isManual };
        }
        
        // Verificar se há uma distância manual definida
        const distanciaManual = document.getElementById('distancia-manual').value;
        const distancia = distanciaManual ? parseFloat(distanciaManual) : (DESTINOS[destino] || 25.0);
        const isManual = !!distanciaManual;
        
        return { destino, distancia, isManual };
    };

    // Função para obter preços atuais dos campos de entrada
    const getPrecosAtuais = () => {
        return {
            pequeno: parseFloat(document.getElementById('preco-pequeno').value) || 0.85,
            medio: parseFloat(document.getElementById('preco-medio').value) || 1.90,
            grande: parseFloat(document.getElementById('preco-grande').value) || 2.90
        };
    };

    // Função para obter o valor do ad valorem
    const getAdValorem = () => {
        return parseFloat(document.getElementById('ad-valorem').value) || 1.0;
    };

    // Função para atualizar cálculos dos cards
    const atualizarCalculosCards = () => {
        const precos = getPrecosAtuais();
        const { distancia, isManual } = getDestinoAtual();
        
        // Atualizar distância exibida
        document.getElementById('distancia-atual').textContent = `${distancia} km`;
        
        // Atualizar indicador de distância
        const indicator = document.getElementById('distancia-indicator');
        indicator.className = 'distancia-indicator';
        if (isManual) {
            indicator.textContent = 'MANUAL';
            indicator.classList.add('manual');
        } else {
            indicator.textContent = 'AUTO';
            indicator.classList.add('auto');
        }
        
        // Pequeno
        const fretePequeno = VEHICLE_TYPES.pequeno.capacidade * precos.pequeno * distancia;
        document.getElementById('frete-pequeno').textContent = `Frete: ${formatCurrency(fretePequeno)}`;
        document.getElementById('calculo-pequeno').textContent = `(${VEHICLE_TYPES.pequeno.capacidade} kg × R$ ${precos.pequeno.toFixed(2)} × ${distancia} km)`;
        
        // Médio
        const freteMedio = VEHICLE_TYPES.medio.capacidade * precos.medio * distancia;
        document.getElementById('frete-medio').textContent = `Frete: ${formatCurrency(freteMedio)}`;
        document.getElementById('calculo-medio').textContent = `(${VEHICLE_TYPES.medio.capacidade} kg × R$ ${precos.medio.toFixed(2)} × ${distancia} km)`;
        
        // Grande
        const freteGrande = VEHICLE_TYPES.grande.capacidade * precos.grande * distancia;
        document.getElementById('frete-grande').textContent = `Frete: ${formatCurrency(freteGrande)}`;
        document.getElementById('calculo-grande').textContent = `(${VEHICLE_TYPES.grande.capacidade} kg × R$ ${precos.grande.toFixed(2)} × ${distancia} km)`;
    };

    const calcularFrete = (pesoKg, valorMercadoria = 0) => {
        let tipoVeiculo = 'pequeno';
        if (pesoKg > VEHICLE_TYPES.medio.capacidade) {
            tipoVeiculo = 'grande';
        } else if (pesoKg > VEHICLE_TYPES.pequeno.capacidade) {
            tipoVeiculo = 'medio';
        }
        
        const veiculo = VEHICLE_TYPES[tipoVeiculo];
        const precos = getPrecosAtuais();
        const precoPorKg = precos[tipoVeiculo];
        const { distancia } = getDestinoAtual();
        const adValoremPercentual = getAdValorem();
        
        // Verificar modo de cálculo
        const modoCalculo = document.querySelector('input[name="calculation-mode"]:checked').value;
        
        let pesoCalculo, valorFrete;
        if (modoCalculo === 'peso-real') {
            pesoCalculo = pesoKg;
            valorFrete = pesoKg * precoPorKg * distancia;
        } else {
            pesoCalculo = veiculo.capacidade;
            valorFrete = veiculo.capacidade * precoPorKg * distancia;
        }
        
        // Calcular ad valorem
        const valorAdValorem = valorMercadoria * (adValoremPercentual / 100);
        
        return {
            tipoVeiculo: tipoVeiculo,
            nomeVeiculo: veiculo.nome,
            capacidade: veiculo.capacidade,
            valorFrete: valorFrete,
            valorAdValorem: valorAdValorem,
            adValoremPercentual: adValoremPercentual,
            precoPorKg: precoPorKg,
            distancia: distancia,
            pesoCalculo: pesoCalculo,
            modoCalculo: modoCalculo,
            taraCalculada: veiculo.capacidade * precoPorKg
        };
    };

    const renderSimuladorFrete = (data) => {
        const { destino } = getDestinoAtual();
        const dadosDestino = destino === 'TODOS' ? data : data.filter(row => row[COLUMN_MAPPING.cliente] === destino);
        
        if (dadosDestino.length === 0) {
            document.getElementById('frete-calculation').innerHTML = '<p>Nenhum dado encontrado para este destino.</p>';
            return;
        }

        // Agrupar por semana
        const getWeekOfYear = (date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
            const yearStart = new Date(d.getFullYear(), 0, 1);
            const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
            return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
        };

        const formatWeek = (weekStr) => {
            const [year, week] = weekStr.split('-W');
            const startDate = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            const formatDate = (date) => {
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            };
            return `Semana ${week} (${formatDate(startDate)} - ${formatDate(endDate)})`;
        };

        const semanaAgg = dadosDestino.reduce((acc, line) => {
            const week = getWeekOfYear(line[COLUMN_MAPPING.data]);
            if (!acc[week]) acc[week] = { peso: 0, valor: 0, quantidade: 0 };
            acc[week].peso += line[COLUMN_MAPPING.peso];
            acc[week].valor += line[COLUMN_MAPPING.valor];
            acc[week].quantidade += line[COLUMN_MAPPING.quantidade];
            return acc;
        }, {});

        const semanasOrdenadas = Object.entries(semanaAgg).sort(([a], [b]) => a.localeCompare(b));

        const modoCalculo = document.querySelector('input[name="calculation-mode"]:checked').value;
        const tituloModo = modoCalculo === 'peso-real' ? 'Peso Real da Mercadoria' : 'Tara do Veículo';
        
        let html = '<div class="frete-results">';
        html += `<h3>Cálculo de Frete por Semana (Baseado na ${tituloModo})</h3>`;
        html += '<table class="frete-table">';
        html += '<thead><tr><th>Semana</th><th>Peso Mercadoria (kg)</th><th>Valor Mercadoria (R$)</th><th>Veículo</th><th>Cálculo Frete</th><th>Valor Frete (R$)</th><th>Ad Valorem (R$)</th><th>Total (R$)</th></tr></thead>';
        html += '<tbody>';

        let totalFrete = 0;
        let totalMercadoria = 0;
        let totalAdValorem = 0;

        semanasOrdenadas.forEach(([semana, dados]) => {
            const frete = calcularFrete(dados.peso, dados.valor);
            totalFrete += frete.valorFrete;
            totalMercadoria += dados.valor;
            totalAdValorem += frete.valorAdValorem;

            html += `<tr>
                <td>${formatWeek(semana)}</td>
                <td>${formatNumber(dados.peso, 'kg')}</td>
                <td>${formatCurrency(dados.valor)}</td>
                <td>${frete.nomeVeiculo} (${formatNumber(frete.capacidade, 'kg')})</td>
                <td>${formatNumber(frete.pesoCalculo)} kg × R$ ${frete.precoPorKg.toFixed(2)} × ${frete.distancia} km</td>
                <td>${formatCurrency(frete.valorFrete)}</td>
                <td>${formatCurrency(frete.valorAdValorem)} (${frete.adValoremPercentual}%)</td>
                <td>${formatCurrency(dados.valor + frete.valorFrete + frete.valorAdValorem)}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        const observacao = modoCalculo === 'peso-real' 
            ? 'Obs: Frete calculado baseado no peso real da mercadoria.'
            : 'Obs: Frete calculado baseado na capacidade máxima do veículo (tara), não no peso real da mercadoria.';
            
        html += '<div class="frete-totals">';
        html += `<p><strong>Total Mercadoria:</strong> ${formatCurrency(totalMercadoria)}</p>`;
        html += `<p><strong>Total Frete (${tituloModo}):</strong> ${formatCurrency(totalFrete)}</p>`;
        html += `<p><strong>Total Ad Valorem:</strong> ${formatCurrency(totalAdValorem)}</p>`;
        html += `<p><strong>Total Geral:</strong> ${formatCurrency(totalMercadoria + totalFrete + totalAdValorem)}</p>`;
        html += `<p><em>${observacao}</em></p>`;
        html += '</div></div>';

        document.getElementById('frete-calculation').innerHTML = html;
    };

    // --- Event Listeners para Preços ---
    const setupPriceListeners = () => {
        // Atualizar cálculos quando os campos mudarem
        document.getElementById('preco-pequeno').addEventListener('input', () => {
            atualizarCalculosCards();
            updateKPIs(processedData);
        });
        document.getElementById('preco-medio').addEventListener('input', () => {
            atualizarCalculosCards();
            updateKPIs(processedData);
        });
        document.getElementById('preco-grande').addEventListener('input', () => {
            atualizarCalculosCards();
            updateKPIs(processedData);
        });
        
        // Atualizar quando o ad valorem mudar
        document.getElementById('ad-valorem').addEventListener('input', () => {
            renderSimuladorFrete(processedData);
        });
        
        // Atualizar quando o destino mudar
        document.getElementById('destino-select').addEventListener('change', () => {
            // Limpar campo de distância manual quando mudar destino
            document.getElementById('distancia-manual').value = '';
            atualizarCalculosCards();
            updateKPIs(processedData);
            renderSimuladorFrete(processedData);
        });
        
        // Atualizar quando a distância manual mudar
        document.getElementById('distancia-manual').addEventListener('input', atualizarCalculosCards);
        
        // Botão para aplicar distância manual
        document.getElementById('aplicar-distancia').addEventListener('click', () => {
            atualizarCalculosCards();
            renderSimuladorFrete(processedData);
        });
        
        // Botão para resetar distância manual
        document.getElementById('reset-distancia').addEventListener('click', () => {
            document.getElementById('distancia-manual').value = '';
            atualizarCalculosCards();
            renderSimuladorFrete(processedData);
        });
        
        // Botão para salvar distância para o destino atual
        document.getElementById('salvar-distancia').addEventListener('click', () => {
            const distanciaManual = document.getElementById('distancia-manual').value;
            const destinoAtual = document.getElementById('destino-select').value;
            
            if (distanciaManual && destinoAtual && destinoAtual !== 'TODOS') {
                DESTINOS[destinoAtual] = parseFloat(distanciaManual);
                
                // Atualizar o texto da opção no dropdown
                const select = document.getElementById('destino-select');
                const option = select.querySelector(`option[value="${destinoAtual}"]`);
                if (option) {
                    option.textContent = `${destinoAtual} (${distanciaManual} km)`;
                }
                
                // Salvar no localStorage
                localStorage.setItem('distanciasDestinos', JSON.stringify(DESTINOS));
                
                alert(`Distância de ${distanciaManual} km salva para ${destinoAtual}`);
            } else if (destinoAtual === 'TODOS') {
                alert('Não é possível salvar distância para "Todos os Destinos". Selecione um destino específico.');
            } else {
                alert('Por favor, selecione um destino e digite uma distância.');
            }
        });
        
        // Event listeners para modo de cálculo
        document.querySelectorAll('input[name="calculation-mode"]').forEach(radio => {
            radio.addEventListener('change', () => {
                atualizarCalculosCards();
                renderSimuladorFrete(processedData);
            });
        });
        
        // Botão para aplicar preços e recalcular tabela
        document.getElementById('aplicar-precos').addEventListener('click', () => {
            renderSimuladorFrete(processedData);
        });
        
        // Botão para limpar todas as distâncias salvas
        document.getElementById('limpar-distancias').addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar todas as distâncias salvas? Isso não pode ser desfeito.')) {
                localStorage.removeItem('distanciasDestinos');
                
                // Recarregar destinos com distâncias padrão
                carregarDestinos(processedData);
                
                // Limpar campo de distância manual
                document.getElementById('distancia-manual').value = '';
                atualizarCalculosCards();
                renderSimuladorFrete(processedData);
                
                alert('Todas as distâncias salvas foram removidas.');
            }
        });
    };

    // --- Processamento de Dados ---

    const processData = (data) => {
        return data.map(row => {
            const newRow = { ...row };
            try {
                newRow[COLUMN_MAPPING.valor] = parseBrazilianNumber(row[COLUMN_MAPPING.valor] || '0');
                newRow[COLUMN_MAPPING.peso] = parseBrazilianNumber(row[COLUMN_MAPPING.peso] || '0');
                // A quantidade é absoluta para representar movimentação (entrada ou saída)
                newRow[COLUMN_MAPPING.quantidade] = Math.abs(parseBrazilianNumber(row[COLUMN_MAPPING.quantidade] || '0'));
                newRow[COLUMN_MAPPING.data] = parseDate(row[COLUMN_MAPPING.data]);
            } catch (error) {
                console.error('Erro ao processar linha:', row, error);
            }
            return newRow;
        }).filter(row => row[COLUMN_MAPPING.cliente] && row[COLUMN_MAPPING.data]);
    };

    // --- Funções de UI ---

    const updateKPIs = (data) => {
        const { destino } = getDestinoAtual();
        const precos = getPrecosAtuais();
        
        // Filtrar dados pelo destino selecionado
        const dadosDestino = destino === 'TODOS' ? data : data.filter(item => item[COLUMN_MAPPING.cliente] === destino);
        
        // Calcular totais gerais
        const totalValor = data.reduce((sum, item) => sum + item[COLUMN_MAPPING.valor], 0);
        const totalPeso = data.reduce((sum, item) => sum + item[COLUMN_MAPPING.peso], 0);
        const totalQuantidade = data.reduce((sum, item) => sum + item[COLUMN_MAPPING.quantidade], 0);
        
        // Calcular totais do destino selecionado
        const totalValorDestino = dadosDestino.reduce((sum, item) => sum + item[COLUMN_MAPPING.valor], 0);
        const totalPesoDestino = dadosDestino.reduce((sum, item) => sum + item[COLUMN_MAPPING.peso], 0);
        
        // Calcular valor tara (usando capacidade dos veículos)
        let valorTara = 0;
        dadosDestino.forEach(item => {
            const pesoKg = item[COLUMN_MAPPING.peso];
            let tipoVeiculo = 'pequeno';
            if (pesoKg > VEHICLE_TYPES.medio.capacidade) {
                tipoVeiculo = 'grande';
            } else if (pesoKg > VEHICLE_TYPES.pequeno.capacidade) {
                tipoVeiculo = 'medio';
            }
            const veiculo = VEHICLE_TYPES[tipoVeiculo];
            const precoPorKg = precos[tipoVeiculo];
            const { distancia } = getDestinoAtual();
            valorTara += veiculo.capacidade * precoPorKg * distancia;
        });
        
        // Calcular valor peso real
        const { distancia } = getDestinoAtual();
        const valorPesoReal = totalPesoDestino * precos.pequeno * distancia; // Usando preço pequeno como base

        document.getElementById('total-valor').textContent = formatCurrency(totalValor);
        document.getElementById('total-peso').textContent = formatNumber(totalPeso, 'kg');
        document.getElementById('total-quantidade').textContent = formatNumber(totalQuantidade);
        document.getElementById('total-tara').textContent = formatCurrency(valorTara);
        document.getElementById('total-peso-real').textContent = formatCurrency(valorPesoReal);
    };

    // --- Tabela Destino → Semana → Produto ---
    const renderTableByWeek = (data) => {
        const tableBody = document.getElementById('data-table-week').querySelector('tbody');
        const tableHead = document.getElementById('data-table-week').querySelector('thead tr');
        tableBody.innerHTML = '';
        tableHead.innerHTML = '';

        // Função para obter a semana de uma data
        const getWeekOfYear = (date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + 4 - (d.getDay() || 7));
            const yearStart = new Date(d.getFullYear(), 0, 1);
            const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
            return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
        };

        // Função para formatar a semana de forma legível
        const formatWeek = (weekStr) => {
            const [year, week] = weekStr.split('-W');
            const startDate = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            const formatDate = (date) => {
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            };
            return `Semana ${week} (${formatDate(startDate)} - ${formatDate(endDate)})`;
        };

        // Agrupar dados por destino e depois por semana
        const destWeekAgg = data.reduce((acc, line) => {
            const dest = line[COLUMN_MAPPING.cliente];
            const week = getWeekOfYear(line[COLUMN_MAPPING.data]);
            if (!acc[dest]) acc[dest] = {};
            if (!acc[dest][week]) acc[dest][week] = { q: 0, p: 0, v: 0, linhas: [] };
            acc[dest][week].q += line[COLUMN_MAPPING.quantidade];
            acc[dest][week].p += line[COLUMN_MAPPING.peso];
            acc[dest][week].v += line[COLUMN_MAPPING.valor];
            acc[dest][week].linhas.push(line);
            return acc;
        }, {});

        // Calcular totais por destino
        const destTotals = {};
        Object.entries(destWeekAgg).forEach(([dest, weeks]) => {
            destTotals[dest] = { q: 0, p: 0, v: 0 };
            Object.values(weeks).forEach(week => {
                destTotals[dest].q += week.q;
                destTotals[dest].p += week.p;
                destTotals[dest].v += week.v;
            });
        });

        // Ordenar destinos por quantidade total
        const sortedDests = Object.entries(destTotals).sort(([,a], [,b]) => b.q - a.q);

        ['', 'Destino', 'Quantidade', 'Peso (kg)', 'Valor (R$)'].forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            tableHead.appendChild(th);
        });

        sortedDests.forEach(([dest, total]) => {
            const tr = document.createElement('tr');
            tr.classList.add('dest-week-row');
            tr.innerHTML = `<td class="toggle">+</td><td>${dest}</td><td>${formatNumber(total.q)}</td><td>${formatNumber(total.p, 'kg')}</td><td>${formatCurrency(total.v)}</td>`;
            tableBody.appendChild(tr);

            tr.addEventListener('click', (e) => {
                if (e.target && e.target.classList.contains('toggle')) {
                    const expanded = e.target.textContent === '−';
                    if (expanded) {
                        e.target.textContent = '+';
                        const next = tr.nextSibling;
                        if (next && next.classList.contains('detail-week-row')) next.remove();
                    } else {
                        e.target.textContent = '−';
                        const detailTr = document.createElement('tr');
                        detailTr.classList.add('detail-week-row');
                        const td = document.createElement('td');
                        td.colSpan = 5;
                        const innerTable = document.createElement('table');
                        innerTable.classList.add('inner-table');
                        const head = document.createElement('thead');
                        head.innerHTML = '<tr><th></th><th>Semana</th><th>Quantidade</th><th>Peso (kg)</th><th>Valor (R$)</th></tr>';
                        innerTable.appendChild(head);
                        const body = document.createElement('tbody');
                        const sortedWeeks = Object.entries(destWeekAgg[dest]).sort(([a], [b]) => a.localeCompare(b));
                        sortedWeeks.forEach(([week, info]) => {
                            const r = document.createElement('tr');
                            r.classList.add('week-row');
                            r.innerHTML = `<td class="sub-toggle">+</td><td>${formatWeek(week)}</td><td>${formatNumber(info.q)}</td><td>${formatNumber(info.p, 'kg')}</td><td>${formatCurrency(info.v)}</td>`;
                            body.appendChild(r);
                            r.addEventListener('click', (ev) => {
                                if (ev.target && ev.target.classList.contains('sub-toggle')) {
                                    const exp = ev.target.textContent === '−';
                                    if (exp) {
                                        ev.target.textContent = '+';
                                        const nxt = r.nextSibling;
                                        if (nxt && nxt.classList.contains('product-week-row')) nxt.remove();
                                    } else {
                                        ev.target.textContent = '−';
                                        const prodTr = document.createElement('tr');
                                        prodTr.classList.add('product-week-row');
                                        const tdProd = document.createElement('td');
                                        tdProd.colSpan = 5;
                                        const prodTable = document.createElement('table');
                                        prodTable.classList.add('inner-table');
                                        prodTable.innerHTML = '<thead><tr><th>Produto</th><th>Quantidade</th><th>Peso (kg)</th><th>Valor (R$)</th></tr></thead>';
                                        const prodBody = document.createElement('tbody');
                                        const prodAgg = info.linhas.reduce((a, l) => {
                                            const prod = l[COLUMN_MAPPING.produto];
                                            if (!a[prod]) a[prod] = { q: 0, p: 0, v: 0 };
                                            a[prod].q += l[COLUMN_MAPPING.quantidade];
                                            a[prod].p += l[COLUMN_MAPPING.peso];
                                            a[prod].v += l[COLUMN_MAPPING.valor];
                                            return a;
                                        }, {});
                                        Object.entries(prodAgg).sort(([,a], [,b]) => b.q - a.q).forEach(([prod, totp]) => {
                                            const pr = document.createElement('tr');
                                            pr.innerHTML = `<td>${prod}</td><td>${formatNumber(totp.q)}</td><td>${formatNumber(totp.p, 'kg')}</td><td>${formatCurrency(totp.v)}</td>`;
                                            prodBody.appendChild(pr);
                                        });
                                        prodTable.appendChild(prodBody);
                                        tdProd.appendChild(prodTable);
                                        prodTr.appendChild(tdProd);
                                        r.parentNode.insertBefore(prodTr, r.nextSibling);
                                    }
                                }
                            });
                        });
                        innerTable.appendChild(body);
                        td.appendChild(innerTable);
                        detailTr.appendChild(td);
                        tr.parentNode.insertBefore(detailTr, tr.nextSibling);
                    }
                }
            });
        });
    };

    // --- Inicialização ---
    let originalData = [];
    let processedData = [];

    Papa.parse(FILE_PATH, {
        download: true,
        header: true,
        complete: function(results) {
            originalData = results.data;
            processedData = processData(originalData);
            carregarDestinos(processedData); // Carregar destinos dinamicamente
            updateKPIs(processedData);
            renderTableByWeek(processedData);
            renderSimuladorFrete(processedData); // Adicionado para renderizar o simulador de frete
            setupPriceListeners(); // Adicionado para configurar os listeners de preços
        }
    });
}); 