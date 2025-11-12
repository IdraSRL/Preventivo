// Programmatic config update API
window.setConfigFromCode = function(newCfg){
  if(typeof newCfg!=='object'||!newCfg){console.error('newCfg must be object');return false;}
  if(!window.appConfig){window.appConfig={};}
  Object.assign(window.appConfig,newCfg);
  if(typeof window.renderConfigUI==='function'){try{window.renderConfigUI(window.appConfig);}catch(_){}}
  console.info('[config] updated from code', window.appConfig);
  return true;
};
window.downloadConfig = function(filename='config.json'){
  const data = JSON.stringify(window.appConfig||{},null,2);
  const blob = new Blob([data],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
};
function clampAccessoriesPercent(v){v=Number(v)||0;if(v<0)return 0;if(v>100)return 100;return v;}
let config = {};
let areaCounter = 0;
let extraCounter = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    initializeApp();
});

async function loadConfig() {
    try {
        const savedConfig = localStorage.getItem('cleaningConfig');
        if (savedConfig) {
            config = JSON.parse(savedConfig);
        } else {
            const response = await fetch('config.json');
            config = await response.json();
        }
    } catch (error) {
        console.error('Errore nel caricamento della configurazione:', error);
        config = getDefaultConfig();
    }
}

function getDefaultConfig() {
    return {
        productivityRate_m2_per_h: 120,
        productivityRatesByType: {
            uffici: 120,
            bagni: 40,
            vetrate: 80,
            scale: 60,
            magazzino: 150
        },
        difficultyCoefficients: [1.00, 1.25, 1.50, 1.75, 2.00],
        defaultHourlyCost: 22,
        defaultAccessoryPercent: 10,
        defaultMaterialCostPerM2: 0.05,
        defaultProductUseCoefficients: [1.00, 1.25, 1.50],
        defaultKmCost: 0.50,
        defaultMinimumHours: 1.0,
        roundToQuarterHour: true,
        weeksPerMonth: 4.333,
        defaultMarginLavoro: 30,
        defaultMarginProdotti: 30,
        defaultMarginKm: 30,
        defaultPriceHourly: 28.60,
        defaultPriceProducts: 0.065,
        defaultPriceKm: 0.65
    };
}

function initializeApp() {
    initializeTabs();
    initializeCalculationTab();
    initializeSettingsTab();

    document.getElementById('costoOrario').value = config.defaultHourlyCost;
    document.getElementById('accessoriPercent').value = clampAccessoriesPercent(config.defaultAccessoryPercent);
    document.getElementById('costoProdottiPerMq').value = config.defaultMaterialCostPerM2;
    document.getElementById('costoKm').value = config.defaultKmCost;

    document.getElementById('prezzoLavoro').value = config.defaultMarginLavoro || 30;
    document.getElementById('prezzoProdotti').value = config.defaultMarginProdotti || 30;
    document.getElementById('prezzoKm').value = config.defaultMarginKm || 30;

    setupPriceModalityListeners();
    addArea();
}

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });
}

function initializeCalculationTab() {
    document.getElementById('addArea').addEventListener('click', addArea);
    document.getElementById('addExtra').addEventListener('click', addExtra);

    document.getElementById('tipoPreventivo').addEventListener('change', handleTipoPreventivoChange);

    const inputsTriggerCalc = ['costoOrario', 'accessoriPercent', 'costoProdottiPerMq', 'costoKm', 'kmTotali', 'trasfertaTipo', 'combinazioneInterventi', 'tipoPreventivo',
        'prezzoLavoro', 'prezzoProdotti', 'prezzoKm', 'modalitaPrezzoLavoro', 'modalitaPrezzoProdotti', 'modalitaPrezzoKm'];
    inputsTriggerCalc.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', calculate);
            element.addEventListener('input', calculate);
        }
    });

    document.getElementById('areeContainer').addEventListener('click', (e) => {
        if (e.target.dataset.removeArea) {
            removeArea(parseInt(e.target.dataset.removeArea));
        }
    });

    document.getElementById('extraContainer').addEventListener('click', (e) => {
        if (e.target.dataset.removeExtra) {
            removeExtra(parseInt(e.target.dataset.removeExtra));
        }
    });

    handleTipoPreventivoChange();
}

function setupPriceModalityListeners() {
    document.getElementById('modalitaPrezzoLavoro').addEventListener('change', function() {
        const label = document.getElementById('labelPrezzoLavoro');
        if (this.value === 'percentuale') {
            label.textContent = 'Margine Lavoro (%)';
            document.getElementById('prezzoLavoro').value = config.defaultMarginLavoro || 30;
        } else {
            label.textContent = 'Prezzo Lavoro (€/h)';
            document.getElementById('prezzoLavoro').value = config.defaultPriceHourly || 28.60;
        }
        calculate();
    });

    document.getElementById('modalitaPrezzoProdotti').addEventListener('change', function() {
        const label = document.getElementById('labelPrezzoProdotti');
        if (this.value === 'percentuale') {
            label.textContent = 'Margine Prodotti (%)';
            document.getElementById('prezzoProdotti').value = config.defaultMarginProdotti || 30;
        } else {
            label.textContent = 'Prezzo Prodotti (€/mq)';
            document.getElementById('prezzoProdotti').value = config.defaultPriceProducts || 0.065;
        }
        calculate();
    });

    document.getElementById('modalitaPrezzoKm').addEventListener('change', function() {
        const label = document.getElementById('labelPrezzoKm');
        if (this.value === 'percentuale') {
            label.textContent = 'Margine Km (%)';
            document.getElementById('prezzoKm').value = config.defaultMarginKm || 30;
        } else {
            label.textContent = 'Prezzo Km (€/km)';
            document.getElementById('prezzoKm').value = config.defaultPriceKm || 0.65;
        }
        calculate();
    });
}

function handleTipoPreventivoChange() {
    const tipoPreventivo = document.getElementById('tipoPreventivo').value;
    const combinazioneGroup = document.getElementById('combinazioneGroup');

    if (tipoPreventivo === 'POR') {
        combinazioneGroup.style.display = 'block';
    } else {
        combinazioneGroup.style.display = 'none';
    }

    calculate();
}

function addArea() {
    areaCounter++;
    const container = document.getElementById('areeContainer');

    const areaCard = document.createElement('div');
    areaCard.className = 'area-card';
    areaCard.id = `area-${areaCounter}`;

    const tipoPreventivo = document.getElementById('tipoPreventivo').value;
    const showFrequenza = tipoPreventivo === 'POR';

    areaCard.innerHTML = `
        <div class="area-card-header">
            <h3>Area ${areaCounter}</h3>
            <button class="btn-remove" type="button" data-remove-area="${areaCounter}">Rimuovi</button>
        </div>
        <div class="form-group">
            <label>Nome Area</label>
            <input type="text" class="area-nome" placeholder="es. Ufficio Marketing" data-area="${areaCounter}">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Tipo Area</label>
                <select class="area-tipo" data-area="${areaCounter}">
                    <option value="uffici">Uffici</option>
                    <option value="bagni">Bagni</option>
                    <option value="vetrate">Vetrate</option>
                    <option value="scale">Scale</option>
                    <option value="magazzino">Magazzino</option>
                </select>
            </div>
            <div class="form-group">
                <label>Metri Quadri (mq)</label>
                <input type="number" class="area-mq" step="0.1" min="0" value="0" data-area="${areaCounter}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Coefficiente Difficoltà</label>
                <select class="area-difficolta" data-area="${areaCounter}">
                    <option value="1.00">1.00 - Facile</option>
                    <option value="1.25">1.25 - Normale</option>
                    <option value="1.50" selected>1.50 - Media</option>
                    <option value="1.75">1.75 - Difficile</option>
                    <option value="2.00">2.00 - Molto Difficile</option>
                </select>
            </div>
            <div class="form-group">
                <label>Uso Prodotti</label>
                <select class="area-prodotti" data-area="${areaCounter}">
                    <option value="1.00" selected>1.00 - Basso</option>
                    <option value="1.25">1.25 - Medio</option>
                    <option value="1.50">1.50 - Alto</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Tipo Intervento</label>
                <select class="area-tipo-intervento" data-area="${areaCounter}" onchange="handleAreaTipoInterventoChange(${areaCounter})">
                    <option value="POR">POR - Ordinaria</option>
                    <option value="PST">PST - Straordinaria</option>
                </select>
            </div>
            <div class="form-group area-frequenza-group" id="frequenza-group-${areaCounter}" style="${showFrequenza ? '' : 'display: none;'}">
                <label>Frequenza</label>
                <div class="frequency-group">
                    <input type="number" class="area-frequenza" step="1" min="1" value="1" data-area="${areaCounter}">
                    <select class="area-frequenza-tipo" data-area="${areaCounter}">
                        <option value="settimana">x/settimana</option>
                        <option value="mese">x/mese</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    container.appendChild(areaCard);

    const inputs = areaCard.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', calculate);
        input.addEventListener('input', calculate);
    });

    calculate();
}

function removeArea(areaId) {
    const areaCard = document.getElementById(`area-${areaId}`);
    if (areaCard) {
        areaCard.remove();
        calculate();
    }
}

function handleAreaTipoInterventoChange(areaId) {
    const tipoIntervento = document.querySelector(`.area-tipo-intervento[data-area="${areaId}"]`).value;
    const frequenzaGroup = document.getElementById(`frequenza-group-${areaId}`);

    if (tipoIntervento === 'POR') {
        frequenzaGroup.style.display = 'block';
    } else {
        frequenzaGroup.style.display = 'none';
    }

    calculate();
}

function addExtra() {
    extraCounter++;
    const container = document.getElementById('extraContainer');

    const extraCard = document.createElement('div');
    extraCard.className = 'extra-card';
    extraCard.id = `extra-${extraCounter}`;

    extraCard.innerHTML = `
        <div class="extra-card-header">
            <h3>Extra ${extraCounter}</h3>
            <button class="btn-remove" type="button" data-remove-extra="${extraCounter}">Rimuovi</button>
        </div>
        <div class="form-group">
            <label>Descrizione</label>
            <input type="text" class="extra-desc" placeholder="es. Pulizia tappeti" data-extra="${extraCounter}">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Quantità</label>
                <input type="number" class="extra-qty" step="1" min="1" value="1" data-extra="${extraCounter}">
            </div>
            <div class="form-group">
                <label>Costo Unitario (€)</label>
                <input type="number" class="extra-cost" step="0.01" min="0" value="0" data-extra="${extraCounter}">
            </div>
        </div>
        <div class="form-group">
            <label>Tipo Costo</label>
            <select class="extra-tipo" data-extra="${extraCounter}">
                <option value="per_intervento">Per intervento</option>
                <option value="una_tantum">Una tantum</option>
            </select>
        </div>
    `;

    container.appendChild(extraCard);

    const inputs = extraCard.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', calculate);
        input.addEventListener('input', calculate);
    });

    calculate();
}

function removeExtra(extraId) {
    const extraCard = document.getElementById(`extra-${extraId}`);
    if (extraCard) {
        extraCard.remove();
        calculate();
    }
}

function calculate() {
    const tipoPreventivo = document.getElementById('tipoPreventivo').value;
    const costoOrario = parseFloat(document.getElementById('costoOrario').value) || 0;
    const accessoriPercent = parseFloat(clampAccessoriesPercent(document.getElementById('accessoriPercent').value)) || 0;
    const costoProdottiPerMq = parseFloat(document.getElementById('costoProdottiPerMq').value) || 0;
    const costoKm = parseFloat(document.getElementById('costoKm').value) || 0;
    const kmTotali = parseFloat(document.getElementById('kmTotali').value) || 0;
    const trasfertaTipo = document.getElementById('trasfertaTipo').value;
    const combinazione = document.getElementById('combinazioneInterventi').value;

    const modalitaPrezzoLavoro = document.getElementById('modalitaPrezzoLavoro').value;
    const prezzoLavoro = parseFloat(document.getElementById('prezzoLavoro').value) || 0;
    const modalitaPrezzoProdotti = document.getElementById('modalitaPrezzoProdotti').value;
    const prezzoProdotti = parseFloat(document.getElementById('prezzoProdotti').value) || 0;
    const modalitaPrezzoKm = document.getElementById('modalitaPrezzoKm').value;
    const prezzoKm = parseFloat(document.getElementById('prezzoKm').value) || 0;

    const aree = collectAreas();
    const extras = collectExtras();

    const areeDetails = calculateAree(aree, costoProdottiPerMq);

    let oreOperative = areeDetails.reduce((sum, area) => sum + area.oreBase, 0);
    let oreTotali = oreOperative * (1 + accessoriPercent / 100);

    if (config.roundToQuarterHour) {
        oreTotali = Math.ceil(oreTotali * 4) / 4;
    }

    if (oreTotali < config.defaultMinimumHours) {
        oreTotali = config.defaultMinimumHours;
    }

    const costoLavoro = oreTotali * costoOrario;
    const costoProdotti = areeDetails.reduce((sum, area) => sum + area.costoProdotti, 0);
    const costoTrasferta = kmTotali * costoKm;

    let prezzoLavoroCalc = 0;
    if (modalitaPrezzoLavoro === 'percentuale') {
        prezzoLavoroCalc = costoLavoro * (1 + prezzoLavoro / 100);
    } else {
        prezzoLavoroCalc = oreTotali * prezzoLavoro;
    }

    let prezzoProdottiCalc = 0;
    const mqTotali = areeDetails.reduce((sum, area) => sum + area.mq, 0);
    if (modalitaPrezzoProdotti === 'percentuale') {
        prezzoProdottiCalc = costoProdotti * (1 + prezzoProdotti / 100);
    } else {
        prezzoProdottiCalc = mqTotali * prezzoProdotti;
    }

    let prezzoTrasfertaCalc = 0;
    if (modalitaPrezzoKm === 'percentuale') {
        prezzoTrasfertaCalc = costoTrasferta * (1 + prezzoKm / 100);
    } else {
        prezzoTrasfertaCalc = kmTotali * prezzoKm;
    }

    const extraCostoPerIntervento = extras.filter(e => e.tipo === 'per_intervento')
        .reduce((sum, e) => sum + (e.qty * e.cost), 0);
    const extraCostoUnaTantum = extras.filter(e => e.tipo === 'una_tantum')
        .reduce((sum, e) => sum + (e.qty * e.cost), 0);

    let costoTrasfertaPerIntervento = 0;
    let costoTrasfertaUnaTantum = 0;
    let prezzoTrasfertaPerIntervento = 0;
    let prezzoTrasfertaUnaTantum = 0;

    if (trasfertaTipo === 'per_intervento') {
        costoTrasfertaPerIntervento = costoTrasferta;
        prezzoTrasfertaPerIntervento = prezzoTrasfertaCalc;
    } else {
        costoTrasfertaUnaTantum = costoTrasferta;
        prezzoTrasfertaUnaTantum = prezzoTrasfertaCalc;
    }

    const costoRicorrente = costoLavoro + costoProdotti + costoTrasfertaPerIntervento + extraCostoPerIntervento;
    const costoUnaTantum = costoTrasfertaUnaTantum + extraCostoUnaTantum;

    const prezzoRicorrente = prezzoLavoroCalc + prezzoProdottiCalc + prezzoTrasfertaPerIntervento + extraCostoPerIntervento;
    const prezzoUnaTantum = prezzoTrasfertaUnaTantum + extraCostoUnaTantum;

    let costoPerIntervento = 0;
    let prezzoPerIntervento = 0;
    let costoMensile = 0;
    let prezzoMensile = 0;
    let fattoreMensile = 0;

    if (tipoPreventivo === 'PST') {
        costoPerIntervento = costoRicorrente + costoUnaTantum;
        prezzoPerIntervento = prezzoRicorrente + prezzoUnaTantum;
    } else {
        costoPerIntervento = costoRicorrente;
        prezzoPerIntervento = prezzoRicorrente;

        fattoreMensile = calculateFattoreMensile(aree, combinazione);
        costoMensile = costoRicorrente * fattoreMensile + costoUnaTantum;
        prezzoMensile = prezzoRicorrente * fattoreMensile + prezzoUnaTantum;
    }

    const marginePerIntervento = prezzoPerIntervento - costoPerIntervento;
    const marginePercentualePerIntervento = costoPerIntervento > 0 ? (marginePerIntervento / costoPerIntervento) * 100 : 0;

    let margineMensile = 0;
    let marginePercentualeMensile = 0;
    if (tipoPreventivo === 'POR') {
        margineMensile = prezzoMensile - costoMensile;
        marginePercentualeMensile = costoMensile > 0 ? (margineMensile / costoMensile) * 100 : 0;
    }

    const areeDetailsWithCosts = calculateAreeWithCosts(areeDetails, costoLavoro, prezzoLavoroCalc, costoPerIntervento, fattoreMensile, combinazione);

    let euroPerMq = 0;
    if (mqTotali > 0) {
        if (tipoPreventivo === 'PST') {
            euroPerMq = prezzoPerIntervento / mqTotali;
        } else {
            euroPerMq = prezzoMensile / mqTotali;
        }
    }

    renderResults({
        tipoPreventivo,
        oreOperative,
        oreTotali,
        costoLavoro,
        prezzoLavoroCalc,
        costoProdotti,
        prezzoProdottiCalc,
        costoTrasferta,
        prezzoTrasfertaCalc,
        trasfertaTipo,
        extraCostoPerIntervento,
        extraCostoUnaTantum,
        costoPerIntervento,
        prezzoPerIntervento,
        costoMensile,
        prezzoMensile,
        marginePerIntervento,
        marginePercentualePerIntervento,
        margineMensile,
        marginePercentualeMensile,
        euroPerMq,
        areeDetails: areeDetailsWithCosts,
        combinazione
    });
}

function collectAreas() {
    const aree = [];
    const areaCards = document.querySelectorAll('.area-card');

    areaCards.forEach(card => {
        const areaId = card.id.split('-')[1];
        const nome = card.querySelector('.area-nome').value || `Area ${areaId}`;
        const tipo = card.querySelector('.area-tipo').value;
        const mq = parseFloat(card.querySelector('.area-mq').value) || 0;
        const difficolta = parseFloat(card.querySelector('.area-difficolta').value) || 1.0;
        const prodotti = parseFloat(card.querySelector('.area-prodotti').value) || 1.0;
        const tipoIntervento = card.querySelector('.area-tipo-intervento').value;

        let frequenza = 1;
        let frequenzaTipo = 'settimana';

        if (tipoIntervento === 'POR') {
            const frequenzaInput = card.querySelector('.area-frequenza');
            const frequenzaTipoSelect = card.querySelector('.area-frequenza-tipo');
            if (frequenzaInput && frequenzaTipoSelect) {
                frequenza = parseFloat(frequenzaInput.value) || 1;
                frequenzaTipo = frequenzaTipoSelect.value;
            }
        }

        aree.push({
            id: areaId,
            nome,
            tipo,
            mq,
            difficolta,
            prodotti,
            tipoIntervento,
            frequenza,
            frequenzaTipo
        });
    });

    return aree;
}

function collectExtras() {
    const extras = [];
    const extraCards = document.querySelectorAll('.extra-card');

    extraCards.forEach(card => {
        const extraId = card.id.split('-')[1];
        const desc = card.querySelector('.extra-desc').value || `Extra ${extraId}`;
        const qty = parseFloat(card.querySelector('.extra-qty').value) || 0;
        const cost = parseFloat(card.querySelector('.extra-cost').value) || 0;
        const tipo = card.querySelector('.extra-tipo').value;

        extras.push({ desc, qty, cost, tipo });
    });

    return extras;
}

function calculateAree(aree, costoProdottiPerMq) {
    return aree.map(area => {
        const resa = config.productivityRatesByType[area.tipo] || config.productivityRate_m2_per_h;
        const oreBase = (area.mq / resa) * area.difficolta;
        const costoProdotti = area.mq * costoProdottiPerMq * area.prodotti;

        return {
            ...area,
            resa,
            oreBase,
            costoProdotti
        };
    });
}

function calculateFattoreMensile(aree, combinazione) {
    const areePOR = aree.filter(a => a.tipoIntervento === 'POR');

    if (areePOR.length === 0) return 0;

    if (combinazione === 'MAX') {
        const frequenze = areePOR.map(area => {
            if (area.frequenzaTipo === 'settimana') {
                return area.frequenza * config.weeksPerMonth;
            } else {
                return area.frequenza;
            }
        });
        return Math.max(...frequenze);
    } else {
        const somma = areePOR.reduce((sum, area) => {
            if (area.frequenzaTipo === 'settimana') {
                return sum + (area.frequenza * config.weeksPerMonth);
            } else {
                return sum + area.frequenza;
            }
        }, 0);
        return somma;
    }
}

function calculateAreeWithCosts(areeDetails, costoLavoroTotale, prezzoLavoroTotale, costoTotalePerIntervento, fattoreMensile, combinazione) {
    const oreTotali = areeDetails.reduce((sum, area) => sum + area.oreBase, 0);

    return areeDetails.map(area => {
        const costoLavoroArea = oreTotali > 0 ? (area.oreBase / oreTotali) * costoLavoroTotale : 0;
        const prezzoLavoroArea = oreTotali > 0 ? (area.oreBase / oreTotali) * prezzoLavoroTotale : 0;

        const costoAreaPerIntervento = costoLavoroArea + area.costoProdotti;

        let interventiMese = 0;
        let prezzoAreaMensile = 0;

        if (area.tipoIntervento === 'POR') {
            if (area.frequenzaTipo === 'settimana') {
                interventiMese = area.frequenza * config.weeksPerMonth;
            } else {
                interventiMese = area.frequenza;
            }

            if (combinazione === 'MAX') {
                const fattoreArea = interventiMese;
                prezzoAreaMensile = costoAreaPerIntervento * fattoreArea;
            } else {
                prezzoAreaMensile = costoAreaPerIntervento * interventiMese;
            }
        } else {
            interventiMese = 0;
            prezzoAreaMensile = 0;
        }

        return {
            ...area,
            costoLavoroArea,
            costoAreaPerIntervento,
            interventiMese,
            prezzoAreaMensile
        };
    });
}

function renderResults(results) {
    const container = document.getElementById('resultsContent');

    const isPOR = results.tipoPreventivo === 'POR';

    let html = `
        <div class="results-section">
            <h3>Ore</h3>
            <div class="results-item">
                <span class="results-item-label">Ore Operative</span>
                <span class="results-item-value">${results.oreOperative.toFixed(2)} h</span>
            </div>
            <div class="results-item">
                <span class="results-item-label">Ore Totali (con accessori)</span>
                <span class="results-item-value">${results.oreTotali.toFixed(2)} h</span>
            </div>
        </div>

        <div class="results-section">
            <h3 style="color: #10b981;">Costi Azienda</h3>
            <div class="cost-price-grid">
                <div class="cost-price-item cost-item">
                    <div class="label">Lavoro</div>
                    <div class="value">€ ${results.costoLavoro.toFixed(2)}</div>
                </div>
                <div class="cost-price-item cost-item">
                    <div class="label">Prodotti</div>
                    <div class="value">€ ${results.costoProdotti.toFixed(2)}</div>
                </div>
                <div class="cost-price-item cost-item">
                    <div class="label">Trasferta</div>
                    <div class="value">€ ${results.costoTrasferta.toFixed(2)}</div>
                </div>
                ${results.extraCostoPerIntervento > 0 ? `
                <div class="cost-price-item cost-item">
                    <div class="label">Extra/int</div>
                    <div class="value">€ ${results.extraCostoPerIntervento.toFixed(2)}</div>
                </div>
                ` : ''}
                ${results.extraCostoUnaTantum > 0 ? `
                <div class="cost-price-item cost-item">
                    <div class="label">Extra una tantum</div>
                    <div class="value">€ ${results.extraCostoUnaTantum.toFixed(2)}</div>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="results-section">
            <h3 style="color: #60a5fa;">Prezzi Vendita</h3>
            <div class="cost-price-grid">
                <div class="cost-price-item price-item">
                    <div class="label">Lavoro</div>
                    <div class="value">€ ${results.prezzoLavoroCalc.toFixed(2)}</div>
                </div>
                <div class="cost-price-item price-item">
                    <div class="label">Prodotti</div>
                    <div class="value">€ ${results.prezzoProdottiCalc.toFixed(2)}</div>
                </div>
                <div class="cost-price-item price-item">
                    <div class="label">Trasferta</div>
                    <div class="value">€ ${results.prezzoTrasfertaCalc.toFixed(2)}</div>
                </div>
                ${results.extraCostoPerIntervento > 0 ? `
                <div class="cost-price-item price-item">
                    <div class="label">Extra/int</div>
                    <div class="value">€ ${results.extraCostoPerIntervento.toFixed(2)}</div>
                </div>
                ` : ''}
                ${results.extraCostoUnaTantum > 0 ? `
                <div class="cost-price-item price-item">
                    <div class="label">Extra una tantum</div>
                    <div class="value">€ ${results.extraCostoUnaTantum.toFixed(2)}</div>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="margin-card">
            <h3>Margine per Intervento</h3>
            <div class="margin-grid">
                <div class="margin-item">
                    <div class="label">Costo</div>
                    <div class="value">€ ${results.costoPerIntervento.toFixed(2)}</div>
                </div>
                <div class="margin-item">
                    <div class="label">Prezzo</div>
                    <div class="value">€ ${results.prezzoPerIntervento.toFixed(2)}</div>
                </div>
                <div class="margin-item">
                    <div class="label">Margine</div>
                    <div class="value">€ ${results.marginePerIntervento.toFixed(2)}<br>(${results.marginePercentualePerIntervento.toFixed(1)}%)</div>
                </div>
            </div>
        </div>

        ${isPOR ? `
        <div class="margin-card">
            <h3>Margine Mensile</h3>
            <div class="margin-grid">
                <div class="margin-item">
                    <div class="label">Costo</div>
                    <div class="value">€ ${results.costoMensile.toFixed(2)}</div>
                </div>
                <div class="margin-item">
                    <div class="label">Prezzo</div>
                    <div class="value">€ ${results.prezzoMensile.toFixed(2)}</div>
                </div>
                <div class="margin-item">
                    <div class="label">Margine</div>
                    <div class="value">€ ${results.margineMensile.toFixed(2)}<br>(${results.marginePercentualeMensile.toFixed(1)}%)</div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="results-section">
            <h3>Altri Dati</h3>
            <div class="results-item">
                <span class="results-item-label">€/mq ${isPOR ? '(mensile)' : ''}</span>
                <span class="results-item-value">€ ${results.euroPerMq.toFixed(2)}</span>
            </div>
        </div>

        <div class="results-section">
            <h3>Dettaglio Aree</h3>
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Tipo area</th>
                        <th>Tipo</th>
                        <th>mq</th>
                        <th>Diff.</th>
                        <th>Prod.</th>
                        <th>Ore</th>
                        <th>€ Prod.</th>
                        <th>€/int</th>
                        ${isPOR ? '<th>Int/mese</th>' : ''}
                        ${isPOR ? '<th>€/mese</th>' : ''}
                    </tr>
                </thead>
                <tbody>
                    ${results.areeDetails.map(area => `
                        <tr>
                            <td>${area.nome}</td>
                            <td>${area.tipo || area.tipoArea || ''}</td>
                            <td>${area.tipoIntervento || area.tipo || ''}</td>
                            <td>${area.mq.toFixed(1)}</td>
                            <td>${area.difficolta.toFixed(2)}</td>
                            <td>${area.prodotti.toFixed(2)}</td>
                            <td>${area.oreBase.toFixed(2)}</td>
                            <td>€ ${area.costoProdotti.toFixed(2)}</td>
                            <td>€ ${area.costoAreaPerIntervento.toFixed(2)}</td>
                            ${isPOR ? `<td>${area.interventiMese.toFixed(1)}</td>` : ''}
                            ${isPOR ? `<td>€ ${area.prezzoAreaMensile.toFixed(2)}</td>` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="results-note">
            <strong>Note:</strong><br>
            • Il costo lavoro è ripartito proporzionalmente alle ore area.<br>
            • I margini sono calcolati applicando le percentuali o prezzi fissi ai costi azienda.<br>
            • Trasferta (${results.trasfertaTipo === 'per_intervento' ? 'per intervento' : 'una tantum'}).<br>
            ${isPOR ? '• Per POR, le una tantum sono conteggiate nel totale mensile.<br>' : ''}
            ${isPOR && results.combinazione === 'MAX' ? '• Modalità MAX: le aree sono combinate nello stesso passaggio.<br>' : ''}
            ${isPOR && results.combinazione === 'SUM' ? '• Modalità SUM: gli interventi non sono combinabili.<br>' : ''}
        </div>
    `;

    container.innerHTML = html;
}

function initializeSettingsTab() {
    loadSettingsFromConfig();

    const settingsInputs = [
        'set_productivityRate', 'set_hourlyCost', 'set_accessoryPercent',
        'set_materialCost', 'set_kmCost', 'set_minimumHours',
        'set_roundToQuarter', 'set_weeksPerMonth'
    ];

    settingsInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', saveSettingsToConfig);
        }
    });

    document.getElementById('downloadConfig').addEventListener('click', downloadConfig);
    document.getElementById('importConfig').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', importConfig);
    document.getElementById('exportConfig').addEventListener('click', exportConfig);
    document.getElementById('showConfig').addEventListener('click', showConfig);

    renderReseTipoArea();
    renderCoefficientiDifficolta();
    renderMoltiplicatoriProdotti();
}

function loadSettingsFromConfig() {
    document.getElementById('set_productivityRate').value = config.productivityRate_m2_per_h;
    document.getElementById('set_hourlyCost').value = config.defaultHourlyCost;
    document.getElementById('set_accessoryPercent').value = config.defaultAccessoryPercent;
    document.getElementById('set_materialCost').value = config.defaultMaterialCostPerM2;
    document.getElementById('set_kmCost').value = config.defaultKmCost;
    document.getElementById('set_minimumHours').value = config.defaultMinimumHours;
    document.getElementById('set_roundToQuarter').checked = config.roundToQuarterHour;
    document.getElementById('set_weeksPerMonth').value = config.weeksPerMonth;
}

function saveSettingsToConfig() {
    config.productivityRate_m2_per_h = parseFloat(document.getElementById('set_productivityRate').value);
    config.defaultHourlyCost = parseFloat(document.getElementById('set_hourlyCost').value);
    config.defaultAccessoryPercent = parseFloat(document.getElementById('set_accessoryPercent').value);
    config.defaultMaterialCostPerM2 = parseFloat(document.getElementById('set_materialCost').value);
    config.defaultKmCost = parseFloat(document.getElementById('set_kmCost').value);
    config.defaultMinimumHours = parseFloat(document.getElementById('set_minimumHours').value);
    config.roundToQuarterHour = document.getElementById('set_roundToQuarter').checked;
    config.weeksPerMonth = parseFloat(document.getElementById('set_weeksPerMonth').value);

    localStorage.setItem('cleaningConfig', JSON.stringify(config));

    document.getElementById('costoOrario').value = config.defaultHourlyCost;
    document.getElementById('accessoriPercent').value = clampAccessoriesPercent(config.defaultAccessoryPercent);
    document.getElementById('costoProdottiPerMq').value = config.defaultMaterialCostPerM2;
    document.getElementById('costoKm').value = config.defaultKmCost;

    calculate();
}

function renderReseTipoArea() {
    const container = document.getElementById('reseTipoAreaContainer');
    const types = Object.keys(config.productivityRatesByType);

    let html = '';
    types.forEach(tipo => {
        html += `
            <div class="form-group">
                <label>${tipo.charAt(0).toUpperCase() + tipo.slice(1)} (mq/h)</label>
                <input type="number"
                       id="resa-${tipo}"
                       value="${config.productivityRatesByType[tipo]}"
                       step="1"
                       min="0"
                       onchange="updateResaTipoArea('${tipo}', this.value)">
            </div>
        `;
    });

    container.innerHTML = html;
}

function updateResaTipoArea(tipo, value) {
    config.productivityRatesByType[tipo] = parseFloat(value);
    localStorage.setItem('cleaningConfig', JSON.stringify(config));
    calculate();
}

function renderCoefficientiDifficolta() {
    const container = document.getElementById('coefficientiDifficoltaContainer');

    let html = '<div class="form-row">';
    config.difficultyCoefficients.forEach((coeff, index) => {
        html += `
            <div class="form-group">
                <label>Livello ${index + 1}</label>
                <input type="number"
                       id="diff-${index}"
                       value="${coeff}"
                       step="0.01"
                       min="0"
                       onchange="updateDifficulty(${index}, this.value)">
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

function updateDifficulty(index, value) {
    config.difficultyCoefficients[index] = parseFloat(value);
    localStorage.setItem('cleaningConfig', JSON.stringify(config));
    calculate();
}

function renderMoltiplicatoriProdotti() {
    const container = document.getElementById('moltiplicatoriProdottiContainer');
    const labels = ['Basso', 'Medio', 'Alto'];

    let html = '<div class="form-row">';
    config.defaultProductUseCoefficients.forEach((coeff, index) => {
        html += `
            <div class="form-group">
                <label>${labels[index]}</label>
                <input type="number"
                       id="prod-${index}"
                       value="${coeff}"
                       step="0.01"
                       min="0"
                       onchange="updateProductCoeff(${index}, this.value)">
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

function updateProductCoeff(index, value) {
    config.defaultProductUseCoefficients[index] = parseFloat(value);
    localStorage.setItem('cleaningConfig', JSON.stringify(config));
    calculate();
}

function downloadConfig() {
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'config.json';
    link.click();
    URL.revokeObjectURL(url);
}

function importConfig(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            config = JSON.parse(e.target.result);
            localStorage.setItem('cleaningConfig', JSON.stringify(config));
            loadSettingsFromConfig();
            renderReseTipoArea();
            renderCoefficientiDifficolta();
            renderMoltiplicatoriProdotti();
            calculate();
            alert('Configurazione importata con successo!');
        } catch (error) {
            alert('Errore nell\'importazione del file JSON');
        }
    };
    reader.readAsText(file);
}

function exportConfig() {
    downloadConfig();
}

function showConfig() {
    const display = document.getElementById('jsonDisplay');
    if (display.style.display === 'none') {
        display.style.display = 'block';
        display.value = JSON.stringify(config, null, 2);
        document.getElementById('showConfig').textContent = 'Nascondi JSON';
    } else {
        display.style.display = 'none';
        document.getElementById('showConfig').textContent = 'Mostra JSON';
    }
}
