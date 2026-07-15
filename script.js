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

// 품목 정의 (PDF: DRYICE 주문 & 생산현황 열 구성)
const PRODUCTS = [
    { key: 'p100', label: '100kg' },
    { key: 'p200', label: '200kg' },
    { key: 'b150', label: '150kg' },
    { key: 'b200', label: '200kg' },
    { key: 'b250', label: '250kg' },
    { key: 'g400', label: '400g' },
    { key: 'g500', label: '500g' },
    { key: 'g600', label: '600g' },
    { key: 'k30a', label: '블럭' },
    { key: 'k30b', label: '조각' },
    { key: 'k30c', label: '#2' },
    { key: 'k20ap', label: '20kg(AP)' },
    { key: 'k20p', label: '3/16펠렛' }
];

// 거래처 정의 (고정 14곳, PDF 기준)
const CLIENTS = [
    { name: '화일공항', dest: '공항' },
    { name: '화일경보', dest: '공항' },
    { name: '화일상사(A)', dest: '용인' },
    { name: '화일상사(B)', dest: '용인' },
    { name: '영재상사', dest: '서울' },
    { name: '한국콜드체인(A)', dest: '이천' },
    { name: '한국콜드체인(B)', dest: '이천' },
    { name: '경기남부(A)', dest: '평택' },
    { name: '경기남부(B)', dest: '평택' },
    { name: '용인드라이', dest: '서산' },
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

// 익일 예상 물량 - 좌/우 거래처 목록
const FC_LEFT = [
    { id: 'fc_export', label: '수출', special: true },
    { id: 'fc_airport', label: '공항' },
    { id: 'fc_gyeongbo', label: '경보' },
    { id: 'fc_sejong', label: '세종상사' },
    { id: 'fc_kcc_a', label: '한국콜드체인(A)' },
    { id: 'fc_kcc_b', label: '한국콜드체인(B)' },
    { id: 'fc_gnb', label: '경기남부' },
    { id: 'fc_mnm', label: '엠엔엠' },
    { id: 'fc_hwail', label: '화일상사' }
];
const FC_RIGHT = [
    { id: 'fc_yongin', label: '용인드라이' },
    { id: 'fc_frame', label: '프레임' },
    { id: 'fc_file', label: '화일' },
    { id: 'fc_youngjae', label: '영재' }
];

function parseCommaNum(str) {
    const n = parseInt(String(str).replace(/,/g, ''), 10);
    return isNaN(n) ? 0 : n;
}
function formatCommaNum(num) {
    if (!num) return '';
    return num.toLocaleString('ko-KR');
}

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

    // ── 메인 그리드(거래처 x 품목) 동적 생성 ──
    const dgBody = document.getElementById('dg-body');

    CLIENTS.forEach((client, ci) => {
        ROW_TYPES.forEach((rt, ri) => {
            const tr = document.createElement('tr');
            tr.className = rt.cls + (ci % 2 === 0 ? ' client-even' : ' client-odd') + (ri === 0 ? ' client-start' : '');

            let html = '';
            if (ri === 0) {
                html += `<td class="client-cell" rowspan="3">${client.name}</td>`;
            }
            html += `<td class="rowtype-cell">${rt.label}</td>`;

            PRODUCTS.forEach(p => {
                if (rt.key === 'unprod') {
                    html += `<td id="c${ci}_${p.key}_unprod" class="unprod-cell"></td>`;
                } else {
                    html += `<td><input type="text" inputmode="numeric" class="qty-cell sync-item qty-input" id="c${ci}_${p.key}_${rt.key}" placeholder=""></td>`;
                }
            });

            html += `<td id="c${ci}_row_${rt.key}_total" class="row-total-cell"></td>`;

            if (ri === 0) {
                html += `<td class="dest-cell" rowspan="3">${client.dest}</td>`;
                html += `<td class="remark-cell" rowspan="3"><textarea id="c${ci}_remark" class="sync-item" placeholder="비고"></textarea></td>`;
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

    // ── 익일 예상 물량 표 생성 ──
    const fcLeftBody = document.getElementById('fc-left-body');
    FC_LEFT.forEach(row => {
        const tr = document.createElement('tr');
        if (row.special) {
            tr.innerHTML = `
                <td class="font-bold w-28 align-top py-2" rowspan="1">${row.label}</td>
                <td class="text-left text-xs leading-6 py-1">
                    <div class="flex items-center gap-2">
                        <span>대만(블록:594+로스30개) :</span>
                        <input type="text" id="fc_export_tw" class="fc-input sync-item flex-1 min-w-[60px]">
                    </div>
                    <div class="flex items-center gap-2">
                        <span>일본(블록:540+로스45개) :</span>
                        <input type="text" id="fc_export_jp" class="fc-input sync-item flex-1 min-w-[60px]">
                    </div>
                    <div class="text-slate-400 print:text-black">컨테이너 작업시간 최대 2시간 / 사진 촬영요망</div>
                </td>`;
        } else {
            tr.innerHTML = `
                <td class="font-bold w-28">${row.label}</td>
                <td><input type="text" id="${row.id}" class="fc-input sync-item"></td>`;
        }
        fcLeftBody.appendChild(tr);
    });

    const fcRightBody = document.getElementById('fc-right-body');
    FC_RIGHT.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-bold w-28">${row.label}</td>
            <td><input type="text" id="${row.id}" class="fc-input sync-item"></td>`;
        fcRightBody.appendChild(tr);
    });

    // ── 자동 계산 엔진 ──
    function recalcAll() {
        let grandOrderTotal = 0;
        const colOrderTotals = {};
        PRODUCTS.forEach(p => { colOrderTotals[p.key] = 0; });

        CLIENTS.forEach((client, ci) => {
            let rowOrderSum = 0, rowProdSum = 0;

            PRODUCTS.forEach(p => {
                const oInput = document.getElementById(`c${ci}_${p.key}_order`);
                const pInput = document.getElementById(`c${ci}_${p.key}_prod`);
                const uCell = document.getElementById(`c${ci}_${p.key}_unprod`);

                const oRaw = oInput.value.trim();
                const pRaw = pInput.value.trim();
                const oVal = parseCommaNum(oRaw);
                const pVal = parseCommaNum(pRaw);

                rowOrderSum += oVal;
                rowProdSum += pVal;
                colOrderTotals[p.key] += oVal;

                if (oRaw === '' && pRaw === '') {
                    uCell.textContent = '';
                } else {
                    uCell.textContent = (oVal - pVal).toLocaleString('ko-KR');
                }
            });

            grandOrderTotal += rowOrderSum;
            const rowUnprodSum = rowOrderSum - rowProdSum;

            document.getElementById(`c${ci}_row_order_total`).textContent = formatCommaNum(rowOrderSum);
            document.getElementById(`c${ci}_row_prod_total`).textContent = formatCommaNum(rowProdSum);
            document.getElementById(`c${ci}_row_unprod_total`).textContent = formatCommaNum(rowUnprodSum);
        });

        PRODUCTS.forEach(p => {
            document.getElementById(`col_${p.key}_total`).textContent = formatCommaNum(colOrderTotals[p.key]);
        });
        document.getElementById('grand_total').textContent = grandOrderTotal.toLocaleString('ko-KR');
    }

    // 수량 입력 필터링 (숫자 + 콤마 포맷)
    document.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = val === '' ? '' : parseInt(val, 10).toLocaleString('ko-KR');
            recalcAll();
        });
    });

    recalcAll();

    // 🛡️ 2. Firebase 실시간 동기화 커넥션 코어
    const syncItems = document.querySelectorAll('.sync-item');
    let currentRef = null;

    function loadLogData(dateStr) {
        if (currentRef) currentRef.off();
        currentRef = db.ref('dryice_status/' + dateStr);

        currentRef.on('value', snapshot => {
            const data = snapshot.val() || {};
            syncItems.forEach(item => {
                if (document.activeElement !== item) {
                    item.value = data[item.id] || '';
                }
            });
            recalcAll();
        });
    }

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            syncItems.forEach(item => {
                item.addEventListener('input', e => {
                    if (currentRef) {
                        currentRef.child(e.target.id).set(e.target.value);
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
            window.location.replace("index.html");
        }
    });
});

// 자정 경과 시 자동 세션 새로고침 안전장치
function scheduleMidnightRefresh() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => { window.location.reload(true); }, msUntilMidnight);
}
scheduleMidnightRefresh();
