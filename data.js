// 📦 품목 · 거래처 마스터 데이터
// PC 화면(script.js)과 휴대폰 화면(mobile.html)이 이 파일 하나를 함께 사용합니다.
// ⚠️ 거래처 순번이 곧 DB 저장 키(c0_, c1_ ...)이므로 두 화면이 반드시 같은 목록을 써야 합니다.

const PRODUCTS = [
  { key: "p100", label: "100kg", full: "PELLET 100kg (16mm)" },
  { key: "p200", label: "200kg", full: "PELLET 200kg (3mm)" },
  { key: "b150", label: "150kg", full: "B 타입 150kg" },
  { key: "b200", label: "200kg", full: "B 타입 200kg" },
  { key: "b250", label: "250kg", full: "B 타입 250kg" },
  { key: "g400", label: "400g", full: "1F 자동화 400g (19.2kg)" },
  { key: "g500", label: "500g", full: "1F 자동화 500g (21kg)" },
  { key: "g600", label: "600g", full: "1F 자동화 600g (21.6kg)" },
  { key: "k30a", label: "블럭", full: "30kg 블럭" },
  { key: "k30b", label: "8P", full: "30kg 조각 8P" },
  { key: "k30c", label: "16P", full: "30kg 조각 16P" },
  { key: "k20ap", label: "20kg(AP)", full: "20kg (AP)" },
];

// 🚚 거래처 마스터 데이터 (🍒 '컬리'와 '대만(BUSH)' 사이에 '( 기타 )' 항목 추가 완료!)
const CLIENTS = [
  { name: "화일공항", dest: "공항" },
  { name: "화일경보", dest: "공항" },
  { name: "빙그레(논산)", dest: "충청" },
  { name: "화일(빙그레)용인", dest: "용인" },
  { name: "화일(빙그레)검단", dest: "검단" },
  { name: "화일상사(1)", dest: "용인" },
  { name: "화일상사(2)", dest: "용인" },
  { name: "영재상사", dest: "서울" },
  { name: "한국콜드체인(1)", dest: "이천" },
  { name: "한국콜드체인(2)", dest: "이천" },
  { name: "경기남부", dest: "평택" },
  { name: "용인드라이", dest: "서산" },
  { name: "용인드라이(D)", dest: "서산" },
  { name: "엠엔엠", dest: "서산" },
  { name: "프레임", dest: "서울" },
  { name: "세종상사", dest: "이천" },
  { name: "컬리", dest: "평택" },
  { name: "( 기타 )", dest: "" }, // ✨ 긴급/미등록 거래처 수용을 위한 신규 슬롯 추가!
  { name: "대만(BUSH)", dest: "대만" },
];
