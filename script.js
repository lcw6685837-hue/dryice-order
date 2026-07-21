function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`전체화면 에러: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// 🛡️ 1. Firebase 설정 초기화
const firebaseConfig = {
    apiKey: "AIzaSyA_JNWO5Ke5ZVJDnwP06QW9WsZXNZFv0bc",
    authDomain: "sundochem-dashboard.firebaseapp.com",
    databaseURL: "https://sundochem-dashboard-default-rtdb.firebaseio.com",
    projectId: "sundochem-dashboard",
    storageBucket: "sundochem-dashboard.firebasestorage.app",
    messagingSenderId: "360796635566",
    appId: "1:360796635566:web:d3bf85eb5e5e1574b5483f"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// 🎨 글로벌 활성화 차수 변수
let currentGlobalPhase = '1';

// 📦 품목 정의 및 고시인성 툴팁용 마스터 데이터 개편
const PRODUCTS = [
    { key: 'p100', label: '100kg', full: 'PELLET 100kg (16mm)' },
    { key: 'p200', label: '200kg', full: 'PELLET 200kg (3mm)' },
    { key: 'b150', label: '150kg', full: 'B 타입 150kg' },
    { key: 'b200', label: '200kg', full: 'B 타입 200kg' },
    { key: 'b250', label: '250kg', full: 'B 타입 250kg' },
    { key: 'g400', label: '400g', full: '1F 자동화 400g (19.2kg)' },
    { key: 'g500', label: '500g', full: '1F 자동화 500g (21kg)' },
    { key: 'g600', label: '600g', full: '1F 자동화 600g (21.6kg)' },
    { key: 'k30a', label: '블럭', full: '30kg 블럭' },
    { key: 'k30b', label: '8P', full: '30kg 조각 8P' }, 
    { key: 'k30c', label: '16P', full: '30kg 조각 16P' }, 
    { key: 'k20ap', label: '20kg(AP)', full: '20kg (AP)' }
];

// 🚚 거래처 마스터 데이터 개편 (용인드라이(대상) 아래 용인드라이(D) 반영)
const CLIENTS = [
    { name: '화일공항', dest: '공항' },
    { name: '화일경보', dest: '공항' },
    { name: '빙그레(논산)', dest: '충청' }, 
    { name: '화일(빙그레)용인', dest: '용인' }, 
    { name: '화일상사', dest: '용인' }, 
    { name: '영재상사', dest: '서울' },
    { name: '한국콜드체인', dest: '이천' }, 
    { name: '경기남부', dest: '평택' }, 
    { name: '용인드라이(대상)', dest: '서산' }, 
    { name: '용인드라이(D)', dest: '서산' },
    { name: '엠엔엠', dest: '서산' },
    { name: '프레임', dest: '서울' },
    { name: '세종상사', dest: '이천' },
    { name: '대만(BUSH)', dest: '대만' }
];

const ROW_TYPES = [
    { key: 'order', label: '주문수량', cls: 'row-order' },
    { key: 'prod', label: '생산량', cls: 'row-prod' },
    { key: 'unprod', label: '미생산', cls: 'row-unprod' }
];

// 익일 예상 물량 데이터셋 좌측 패널
const FC_LEFT = [
    { id: 'fc_export', label: '수출', special: true },
    { id: 'fc_airport', label: '공항', type: 'airport' },
    { id: 'fc_gyeongbo', label: '경보', type: 'gyeongbo' },
    { id: 'fc_sejong', label: '세종상사', type: 'sejong' },
    { id: 'fc_kcc_a', label: '한국콜드체인', type: 'normal' }, 
    { id: 'fc_gnb', label: '경기남부', type: 'normal' },
    { id: 'fc_mnm', label: '엠엔엠', type: 'normal' },
    { id: 'fc_hwail', label: '화일상사', type: 'normal' }
];

// 익일 예상 물량 데이터셋 우측 패널
const FC_RIGHT = [
    { id: 'fc_yongin', label: '용인드라이(D)', type: 'normal' }, 
    { id: 'fc_yongin_daesang', label: '용인드라이(대상)', type: 'normal' },
    { id: 'fc_frame', label: '프레임', type: 'normal' },
    { id: 'fc_file', label: '세종(빙그레)', type: 'normal' }, 
    { id: 'fc_youngjae', label: '영재', type: 'normal' },
    { id: 'fc_hwail_bing', label: '화일(빙그레)', type: 'normal' },
    { id: 'fc_hwail_sangsa', label: '화일상사', type: 'normal' }
];

function parseCommaNum(str) {
    const n = parseInt(String(str).replace(/,/g, ''), 10);
    return isNaN(n) ? 0 : n;
}
function formatCommaNum(num) {
    if (!num) return '';
    return num.toLocaleString('ko-KR');
}

// ── 🏰 웹 로딩 성벽 시작 ──
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('log-date');
    const dayDisplay = document.getElementById('log-day');
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

    function updateDayDisplay(dateStr) {
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj)) {
            dayDisplay.textContent = daysOfWeek[dateObj.getDay()] + '요일';
        }
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    updateDayDisplay(dateInput.value);

    // ── 📅 1. 원클릭 날짜 이동 기능 제어부 ──
    const prevBtn = document.getElementById('btn-prev-date');
    const nextBtn = document.getElementById('btn-next-date');

    function shiftDate(days) {
        const currentDate = new Date(dateInput.value);
        if (!isNaN(currentDate)) {
            currentDate.setDate(currentDate.getDate() + days);
            const yyyy = currentDate.getFullYear();
            const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
            const dd = String(currentDate.getDate()).padStart(2, '0');
            dateInput.value = `${yyyy}-${mm}-${dd}`;
            
            dateInput.dispatchEvent(new Event('change'));
        }
    }

    if (prevBtn) prevBtn.addEventListener('click', () => shiftDate(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => shiftDate(1));


    // ── 🎨 2. 주문수량 차수 제어 로직 ──
    function setOrderPhase(phase, saveToDb = true) {
        currentGlobalPhase = phase;

        const btn1 = document.getElementById('btn-phase-1');
        const btn2 = document.getElementById('btn-phase-2');
        const btn3 = document.getElementById('btn-phase-3');
        const btn4 = document.getElementById('btn-phase-4');

        // 버튼 디자인 원복
        [btn1, btn2, btn3, btn4].forEach(btn => {
            if (!btn) return;
            btn.className = "phase-btn px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700/50 transition flex items-center gap-1";
            btn.querySelector('span').className = "w-1.5 h-1.5 rounded-full bg-slate-500";
        });

        // 선택한 차수 하이라이트 활성화
        if (phase === '1') {
            btn1.className = "phase-btn px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-sky-500/20 text-sky-400 border border-sky-500/40 hover:bg-sky-500/30 transition flex items-center gap-1";
            btn1.querySelector('span').className = "w-1.5 h-1.5 rounded-full bg-sky-400";
        } else if (phase === '2') {
            btn2.className = "phase-btn px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 transition flex items-center gap-1";
            btn2.querySelector('span').className = "w-1.5 h-1.5 rounded-full bg-rose-400";
        } else if (phase === '3') {
            btn3.className = "phase-btn px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition flex items-center gap-1";
            btn3.querySelector('span').className = "w-1.5 h-1.5 rounded-full bg-emerald-400";
        } else if (phase === '4') { 
            btn4.className = "phase-btn px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30 transition flex items-center gap-1";
            btn4.querySelector('span').className = "w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse";
        }

        // 값이 비어있는 모든 주문 입력창만 현재 활성화된 차수 색상으로 대기
        document.querySelectorAll('.qty-cell-order').forEach(item => {
            if (item.value === '') {
                item.classList.remove('phase-1', 'phase-2', 'phase-3', 'phase-4');
                item.classList.add(`phase-${phase}`);
            }
        });

        if (saveToDb && currentRef) {
            currentRef.child('order_phase').set(phase);
        }
    }

    document.getElementById('btn-phase-1').addEventListener('click', () => setOrderPhase('1'));
    document.getElementById('btn-phase-2').addEventListener('click', () => setOrderPhase('2'));
    document.getElementById('btn-phase-3').addEventListener('click', () => setOrderPhase('3'));
    document.getElementById('btn-phase-4').addEventListener('click', () => setOrderPhase('4')); 


    // ── 메인 그리드(거래처 x 품목) 동적 생성 ──
    const dgBody = document.getElementById('dg-body');

    CLIENTS.forEach((client, ci) => {
        ROW_TYPES.forEach((rt, ri) => {
            const tr = document.createElement('tr');
            tr.className = rt.cls + (ci % 2 === 0 ? ' client-even' : ' client-odd') + (ri === 0 ? ' client-start' : '');

            let html = '';
            if (ri === 0) {
                html += `<td class="client-cell transition-all duration-300" id="client_cell_${ci}" rowspan="3">${client.name}</td>`;
            }
            html += `<td class="rowtype-cell">${rt.label}</td>`;

            // 빙그레(논산) 예외 락인 표시
            if (client.name === '빙그레(논산)') {
                html += `<td colspan="8" class="no-prod-block">생산(X)</td>`;
                
                if (rt.key === 'unprod') {
                    html += `<td id="c${ci}_k30a_unprod" class="unprod-cell"></td>`;
                } else {
                    const isOrder = rt.key === 'order';
                    const extraClass = isOrder ? 'qty-cell-order phase-1' : '';
                    const tooltipColor = isOrder ? 'border-sky-500/40 text-sky-400' : 'border-slate-600 text-slate-300';
                    
                    html += `<td class="p-0" style="overflow: visible !important;">
                        <div class="relative group w-full h-full">
                            <input type="text" inputmode="numeric" class="qty-cell sync-item qty-input ${extraClass}" id="c${ci}_k30a_${rt.key}" placeholder="">
                            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2.5 py-1 bg-slate-950/95 border ${tooltipColor} text-[11px] font-bold rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30">
                                30kg 블럭
                            </div>
                        </div>
                    </td>`;
                }

                html += `<td colspan="3" class="no-prod-block">생산(X)</td>`;
            } else {
                PRODUCTS.forEach(p => {
                    if (rt.key === 'unprod') {
                        html += `<td id="c${ci}_${p.key}_unprod" class="unprod-cell"></td>`;
                    } else {
                        const isOrder = rt.key === 'order';
                        const extraClass = isOrder ? 'qty-cell-order phase-1' : '';
                        const tooltipColor = isOrder ? 'border-sky-500/40 text-sky-400' : 'border-slate-600 text-slate-300';
                        
                        html += `<td class="p-0" style="overflow: visible !important;">
                            <div class="relative group w-full h-full">
                                <input type="text" inputmode="numeric" class="qty-cell sync-item qty-input ${extraClass}" id="c${ci}_${p.key}_${rt.key}" placeholder="">
                                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2.5 py-1 bg-slate-950/95 border ${tooltipColor} text-[11px] font-bold rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30">
                                    ${p.full}
                                </div>
                            </div>
                        </td>`;
                    }
                });
            }

            html += `<td id="c${ci}_row_${rt.key}_total" class="row-total-cell"></td>`;

            if (ri === 0) {
                html += `<td class="dest-cell" rowspan="3">${client.dest}</td>`;
                html += `<td class="remark-cell" rowspan="3">
                    <textarea id="c${ci}_remark" class="sync-item" placeholder="비고"></textarea>
                    <div id="c${ci}_remark_print" class="print-remark-mirror"></div>
                </td>`;
            }

            tr.innerHTML = html;
            dgBody.appendChild(tr);
        });
    });

    // ── 합계 행(tfoot) 셀 생성 ──
    const totalRow = document.getElementById('dg-total-row');
    PRODUCTS.forEach(p => {
        const td = document.createElement('td');
        td.id = `col_${p.key}_total`;
        totalRow.appendChild(td);
    });
    const grandTd = document.createElement('td');
    grandTd.id = 'grand_total';
    totalRow.appendChild(grandTd);
    const emptyTd = document.createElement('td');
    emptyTd.colSpan = 2;
    totalRow.appendChild(emptyTd);

    // ── 익일 예상 물량 표 생성 (너비 확장 및 줄바꿈 강제 차단 반영) ──
    const fcLeftBody = document.getElementById('fc-left-body');
    FC_LEFT.forEach(row => {
        const tr = document.createElement('tr');
        if (row.special) {
            tr.innerHTML = `
                <td class="font-bold w-32 whitespace-nowrap align-top py-2 text-center" rowspan="1">${row.label}</td>
                <td class="text-left text-xs leading-6 py-1">
                    <div class="flex flex-col gap-2 p-1">
                        <div class="flex items-center gap-2">
                            <span class="text-slate-300 font-semibold print:text-black">대만(블록:594+로스30개) :</span>
                            <input type="text" id="fc_export_tw" class="fc-sub-input fc-note-input sync-item text-center">
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-slate-300 font-semibold print:text-black">일본(블록:540+로스45개) :</span>
                            <input type="text" id="fc_export_jp" class="fc-sub-input fc-note-input sync-item text-center">
                        </div>
                        <div class="text-slate-400 print:text-black text-[11px] font-semibold">컨테이너 작업시간 최대 2시간 / 사진 촬영요망</div>
                    </div>
                </td>`;
        } else if (row.type === 'airport') {
            tr.innerHTML = `
                <td class="font-bold w-32 whitespace-nowrap text-center">${row.label}</td>
                <td>
                    <div class="flex items-center justify-between w-full gap-2 px-1">
                        <div class="flex items-center gap-1 text-xs font-semibold text-slate-300 print:text-black">
                            <span>B타입:</span>
                            <input type="text" id="fc_airport_b" class="fc-sub-input fc-qty-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>개, 펠렛:</span>
                            <input type="text" id="fc_airport_p" class="fc-sub-input fc-qty-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>개</span>
                        </div>
                        <div class="flex items-center gap-1 text-xs font-bold text-slate-400 print:text-black shrink-0">
                            <span>(</span>
                            <input type="text" id="fc_airport_sh1" class="fc-sub-input fc-time-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>/</span>
                            <input type="text" id="fc_airport_sh2" class="fc-sub-input fc-time-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>출고)</span>
                        </div>
                    </div>
                </td>`;
        } else if (row.type === 'gyeongbo') {
            tr.innerHTML = `
                <td class="font-bold w-32 whitespace-nowrap text-center">${row.label}</td>
                <td>
                    <div class="flex items-center justify-between w-full gap-2 px-1">
                        <div class="flex items-center gap-1 text-xs font-semibold text-slate-300 print:text-black">
                            <span>150KG:</span>
                            <input type="text" id="fc_gyeongbo_150" class="fc-sub-input fc-qty-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>개, 200KG:</span>
                            <input type="text" id="fc_gyeongbo_200" class="fc-sub-input fc-qty-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>개</span>
                        </div>
                        <div class="flex items-center gap-1 text-xs font-bold text-slate-400 print:text-black shrink-0">
                            <span>(</span>
                            <input type="text" id="fc_gyeongbo_sh1" class="fc-sub-input fc-time-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>/</span>
                            <input type="text" id="fc_gyeongbo_sh2" class="fc-sub-input fc-time-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>출고)</span>
                        </div>
                    </div>
                </td>`;
        } else if (row.type === 'sejong') {
            tr.innerHTML = `
                <td class="font-bold w-32 whitespace-nowrap text-center">${row.label}</td>
                <td>
                    <div class="flex items-center justify-between w-full gap-2 px-1">
                        <div class="flex items-center gap-1 text-xs font-semibold text-slate-300 print:text-black">
                            <span>블록:</span>
                            <input type="text" id="fc_sejong_bl" class="fc-sub-input fc-qty-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>개, 8P:</span>
                            <input type="text" id="fc_sejong_8p" class="fc-sub-input fc-qty-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>개, 로스블록:</span>
                            <input type="text" id="fc_sejong_lbl" class="fc-sub-input fc-qty-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>개</span>
                        </div>
                        <div class="flex items-center gap-1 text-xs font-bold text-slate-400 print:text-black shrink-0">
                            <span>(</span>
                            <input type="text" id="fc_sejong_sh1" class="fc-sub-input fc-time-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>/</span>
                            <input type="text" id="fc_sejong_sh2" class="fc-sub-input fc-time-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>출고)</span>
                        </div>
                    </div>
                </td>`;
        } else {
            tr.innerHTML = `
                <td class="font-bold w-32 whitespace-nowrap text-center">${row.label}</td>
                <td>
                    <div class="flex items-center justify-between w-full gap-2 px-1">
                        <input type="text" id="${row.id}_note" class="fc-sub-input fc-note-input sync-item flex-1 bg-transparent border-none outline-none text-[#fde68a] font-bold py-1" placeholder="">
                        <div class="flex items-center gap-1 text-xs font-bold text-slate-400 print:text-black shrink-0">
                            <span>(</span>
                            <input type="text" id="${row.id}_sh1" class="fc-sub-input fc-time-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>/</span>
                            <input type="text" id="${row.id}_sh2" class="fc-sub-input fc-time-input sync-item text-center text-amber-300 font-bold" placeholder="">
                            <span>출고)</span>
                        </div>
                    </div>
                </td>`;
        }
        fcLeftBody.appendChild(tr);
    });

    const fcRightBody = document.getElementById('fc-right-body');
    FC_RIGHT.forEach(row => {
        const tr = document.createElement('tr');
        // 🍒 '용인드라이(대상)' 등 길어진 거래처명이 한 줄로 명확하게 고정되도록 w-32 및 whitespace-nowrap 정격 주입
        tr.innerHTML = `
            <td class="font-bold w-32 whitespace-nowrap text-center">${row.label}</td>
            <td>
                <div class="flex items-center justify-between w-full gap-2 px-1">
                    <input type="text" id="${row.id}_note" class="fc-sub-input fc-note-input sync-item flex-1 bg-transparent border-none outline-none text-[#fde68a] font-bold py-1" placeholder="">
                    <div class="flex items-center gap-1 text-xs font-bold text-slate-400 print:text-black shrink-0">
                        <span>(</span>
                        <input type="text" id="${row.id}_sh1" class="fc-sub-input fc-time-input sync-item text-center text-amber-300 font-bold" placeholder="">
                        <span>/</span>
                        <input type="text" id="${row.id}_sh2" class="fc-sub-input fc-time-input sync-item text-center text-amber-300 font-bold" placeholder="">
                        <span>출고)</span>
                    </div>
                </div>
            </td>`;
        fcRightBody.appendChild(tr);
    });

    // ── ✍️ 특이사항 패널 배치 ──
    const remarkTr = document.createElement('tr');
    remarkTr.innerHTML = `
        <td colspan="2" class="p-1 align-top border-t border-slate-700/50">
            <textarea id="fc_right_remark" class="sync-item w-full bg-transparent border-none outline-none text-[#fde68a] font-bold text-[1.1rem] p-3 resize-none overflow-hidden" placeholder="" style="min-height: 250px; height: auto;"></textarea>
        </td>`;
    fcRightBody.appendChild(remarkTr);

    function adjustRemarkHeight() {
        const textarea = document.getElementById('fc_right_remark');
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
    }

    const rTextarea = document.getElementById('fc_right_remark');
    if (rTextarea) {
        rTextarea.addEventListener('input', adjustRemarkHeight);
    }


    // ── 자동 계산 엔진 및 실시간 형광 모니터링 시스템 ──
    function recalcAll() {
        let grandOrderTotal = 0;
        const colOrderTotals = {};
        PRODUCTS.forEach(p => { colOrderTotals[p.key] = 0; });

        CLIENTS.forEach((client, ci) => {
            let rowOrderSum = 0, rowProdSum = 0;
            let hasUnproduced = false;

            PRODUCTS.forEach(p => {
                if (client.name === '빙그레(논산)' && p.key !== 'k30a') return;

                const oInput = document.getElementById(`c${ci}_${p.key}_order`);
                const pInput = document.getElementById(`c${ci}_${p.key}_prod`);
                const uCell = document.getElementById(`c${ci}_${p.key}_unprod`);

                const oRaw = oInput ? oInput.value.trim() : '';
                const pRaw = pInput ? pInput.value.trim() : '';
                const oVal = parseCommaNum(oRaw);
                const pVal = parseCommaNum(pRaw);

                rowOrderSum += oVal;
                rowProdSum += pVal;
                colOrderTotals[p.key] += oVal;

                const unprodVal = oVal - pVal;
                if (uCell) {
                    if (oRaw === '' && pRaw === '') {
                        uCell.textContent = '';
                    } else {
                        uCell.textContent = unprodVal.toLocaleString('ko-KR');
                    }
                }

                if (unprodVal > 0) {
                    hasUnproduced = true;
                }
            });

            grandOrderTotal += rowOrderSum;
            const rowUnprodSum = rowOrderSum - rowProdSum;

            document.getElementById(`c${ci}_row_order_total`).textContent = formatCommaNum(rowOrderSum);
            document.getElementById(`c${ci}_row_prod_total`).textContent = formatCommaNum(rowProdSum);
            document.getElementById(`c${ci}_row_unprod_total`).textContent = formatCommaNum(rowUnprodSum);

            const clientCell = document.getElementById(`client_cell_${ci}`);
            if (clientCell) {
                if (hasUnproduced) {
                    clientCell.className = "client-cell !bg-lime-500/20 !text-lime-400 font-black border-2 border-lime-400/60 shadow-[0_0_15px_rgba(132,204,22,0.4)] transition-all duration-300";
                } else {
                    clientCell.className = "client-cell transition-all duration-300";
                }
            }
        });

        PRODUCTS.forEach(p => {
            document.getElementById(`col_${p.key}_total`).textContent = formatCommaNum(colOrderTotals[p.key]);
        });
        document.getElementById('grand_total').textContent = grandOrderTotal.toLocaleString('ko-KR');
    }

    // 수량 입력 필터링
    document.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val === '' ? '' : parseInt(val, 10).toLocaleString('ko-KR');
            recalcAll();

            if (e.target.id.endsWith('_order')) {
                e.target.classList.remove('phase-1', 'phase-2', 'phase-3', 'phase-4');
                e.target.classList.add(`phase-${currentGlobalPhase}`);
            }
        });
    });

    recalcAll();

    // ── ⌨️ 스마트 공간 내비게이션 구현 ──
    function getActiveInputs() {
        return Array.from(document.querySelectorAll('input.qty-input, input.fc-input, .fc-sub-input, textarea.sync-item, .remark-cell textarea'))
            .filter(el => !el.disabled && !el.readOnly && el.offsetParent !== null);
    }

    function isCursorAtBoundary(textarea, direction) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;

        if (direction === 'up' || direction === 'left') {
            return start === 0 && end === 0;
        }
        if (direction === 'down' || direction === 'right') {
            return start === val.length && end === val.length;
        }
        return false;
    }

    function findSpatialTarget(currentEl, direction) {
        const inputs = getActiveInputs();
        const curRect = currentEl.getBoundingClientRect();
        const curX = curRect.left + curRect.width / 2;
        const curY = curRect.top + curRect.height / 2;

        let candidates = [];

        inputs.forEach(el => {
            if (el === currentEl) return;
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            if (direction === 'up' && y < curY - 5) {
                candidates.push({ el, x, y });
            } else if (direction === 'down' && y > curY + 5) {
                candidates.push({ el, x, y });
            }
        });

        if (candidates.length === 0) return null;

        candidates.sort((a, b) => {
            const dyA = Math.abs(a.y - curY);
            const dyB = Math.abs(b.y - curY);

            if (Math.abs(dyA - dyB) > 15) {
                return dyA - dyB;
            }
            return Math.abs(a.x - curX) - Math.abs(b.x - curX);
        });

        return candidates[0].el;
    }

    document.addEventListener('keydown', (e) => {
        const target = e.target;
        if (!target.matches('input.qty-input, input.fc-input, .fc-sub-input, textarea')) return;

        const isTextarea = target.tagName.toLowerCase() === 'textarea';

        if (isTextarea && e.key === 'Enter') {
            return;
        }

        const inputs = getActiveInputs();
        const index = inputs.indexOf(target);
        if (index === -1) return;

        let nextTarget = null;

        if (e.key === 'ArrowLeft') {
            if (isTextarea && !isCursorAtBoundary(target, 'left')) return;
            if (index > 0) {
                nextTarget = inputs[index - 1];
            }
            e.preventDefault();
        } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
            if (isTextarea && e.key === 'ArrowRight' && !isCursorAtBoundary(target, 'right')) return;
            if (index < inputs.length - 1) {
                nextTarget = inputs[index + 1];
            }
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            if (isTextarea && !isCursorAtBoundary(target, 'up')) return;
            e.preventDefault();
            nextTarget = findSpatialTarget(target, 'up');
        } else if (e.key === 'ArrowDown') {
            if (isTextarea && !isCursorAtBoundary(target, 'down')) return;
            e.preventDefault();
            nextTarget = findSpatialTarget(target, 'down');
        }

        if (nextTarget) {
            nextTarget.focus();
            if (typeof nextTarget.select === 'function' && nextTarget.tagName.toLowerCase() !== 'textarea') {
                nextTarget.select();
            }
        }
    });

    // 🛡️ 3. Firebase 실시간 동기화 커넥션 코어
    const syncItems = document.querySelectorAll('.sync-item');
    let currentRef = null;

    function loadLogData(dateStr) {
        if (currentRef) currentRef.off();
        currentRef = db.ref('dryice_status/' + dateStr);

        currentRef.on('value', snapshot => {
            const data = snapshot.val() || {};
            syncItems.forEach(item => {
                if (document.activeElement !== item) {
                    const dbValue = data[item.id];
                    item.value = (dbValue === null || dbValue === undefined || dbValue === 'null') ? '' : dbValue;
                }

                if (item.id.endsWith('_order')) {
                    const savedCellPhase = data[item.id + '_phase'];
                    item.classList.remove('phase-1', 'phase-2', 'phase-3', 'phase-4');
                    if (item.value === '') {
                        item.classList.add(`phase-${currentGlobalPhase}`);
                    } else {
                        item.classList.add(`phase-${savedCellPhase || '1'}`);
                    }
                }

                if (item.id.endsWith('_remark')) {
                    const mirror = document.getElementById(item.id + '_print');
                    if (mirror) {
                        mirror.textContent = item.value;
                    }
                }
            });

            const savedPhase = data['order_phase'] || '1';
            setOrderPhase(savedPhase, false); 

            recalcAll();
            
            setTimeout(syncWidth, 100);
            setTimeout(adjustRemarkHeight, 50);
        });
    }

    // ── 🔄 가상 상단 스크롤바 양방향 미러링 엔진 ──
    const topScrollWrapper = document.getElementById('top-scroll-wrapper');
    const topScrollSpacer = document.getElementById('top-scroll-spacer');
    const tableWrapper = document.getElementById('table-wrapper');

    function syncWidth() {
        if (topScrollSpacer && tableWrapper) {
            topScrollSpacer.style.width = tableWrapper.scrollWidth + 'px';
        }
    }

    if (topScrollWrapper && topScrollSpacer && tableWrapper) {
        syncWidth();
        window.addEventListener('resize', syncWidth);

        topScrollWrapper.addEventListener('scroll', () => {
            if (tableWrapper.scrollLeft !== topScrollWrapper.scrollLeft) {
                tableWrapper.scrollLeft = topScrollWrapper.scrollLeft;
            }
        });

        tableWrapper.addEventListener('scroll', () => {
            if (topScrollWrapper.scrollLeft !== tableWrapper.scrollLeft) {
                topScrollWrapper.scrollLeft = tableWrapper.scrollLeft;
            }
        });
    }

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            syncItems.forEach(item => {
                item.addEventListener('input', e => {
                    if (currentRef) {
                        currentRef.child(e.target.id).set(e.target.value);
                        
                        if (e.target.id.endsWith('_order')) {
                            if (e.target.value === '') {
                                currentRef.child(e.target.id + '_phase').remove();
                            } else {
                                currentRef.child(e.target.id + '_phase').set(currentGlobalPhase);
                            }
                        }

                        if (e.target.id.endsWith('_remark')) {
                            const mirror = document.getElementById(e.target.id + '_print');
                            if (mirror) {
                                mirror.textContent = e.target.value;
                            }
                        }
                    }
                });
            });

            dateInput.addEventListener('change', e => {
                loadLogData(e.target.value);
                updateDayDisplay(e.target.value);
            });

            loadLogData(dateInput.value);
            updateDayDisplay(dateInput.value);
        } else {
            window.location.replace("login.html");
        }
    });
});
// ── 🏰 웹 로딩 성벽 끝 ──

function scheduleMidnightRefresh() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => { window.location.reload(true); }, msUntilMidnight);
}
scheduleMidnightRefresh();