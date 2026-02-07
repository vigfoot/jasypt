let algorithms = {};
const HOST_URL = location.host.indexOf('localhost') !== -1 ? '/jasypt' : ''

/**
 * 1. 초기화 함수: 데이터 로드 및 UI 구성
 */
async function init() {
    try {
        const response = await fetch(`${HOST_URL}/data/jasypt_algorithms.json`);
        if (!response.ok) throw new Error("Failed to load algorithm data.");

        algorithms = await response.json();

        const selectEl = document.getElementById('algorithm');

        // 기존 하드코딩된 옵션이 있다면 제거 (Optional)
        selectEl.innerHTML = '';

        // Object.keys를 순회하며 옵션 동적 생성
        Object.keys(algorithms).forEach(id => {
            const algo = algorithms[id];
            const option = new Option(algo.name, id);

            // 데이터셋 기반으로 추가 정보(Spring version 등)를 속성에 넣을 수 있음
            option.title = algo.description;
            selectEl.add(option);
        });

        // 초기 로드 시 첫 번째 알고리즘의 설정값 반영
        if (Object.keys(algorithms).length > 0) {
            onSelectAlgorithm(selectEl.value);
        }

        // 이벤트 리스너 주입
        attachEventListeners();

    } catch (error) {
        console.error("Initialization Error:", error);
        alert("Critical error: Could not load encryption configurations.");
    }
}

/**
 * 2. 이벤트 리스너 주입 (Event Binding)
 */
function attachEventListeners() {
    const selectEl = document.getElementById('algorithm');
    const encryptBtn = document.getElementById('encryptBtn');
    const decryptBtn = document.getElementById('decryptBtn');
    const copyBtn = document.getElementById('copyBtn');
    const versionBtns = document.querySelectorAll('.btn-version');

    // 버전 퀵 셀렉트 버튼 이벤트
    versionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetVersion = btn.getAttribute('data-version');

            // 모든 버튼에서 active 제거 후 클릭한 버튼에 추가
            versionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // JSON 데이터를 뒤져서 해당 버전의 기본 알고리즘 찾기
            const defaultAlgoId = Object.keys(algorithms).find(id =>
                algorithms[id].springBootDefault === targetVersion
            );

            if (defaultAlgoId) {
                selectEl.value = defaultAlgoId;
                onSelectAlgorithm(defaultAlgoId);
            }
        });
    });

    // 알고리즘 선택 변경 시
    selectEl.addEventListener('change', (e) => {
        onSelectAlgorithm(e.target.value);
    });

    // 암호화 버튼
    encryptBtn.addEventListener('click', () => {
        handleAction('encrypt');
    });

    // 복호화 버튼
    decryptBtn.addEventListener('click', () => {
        handleAction('decrypt');
    });

    // 복사 버튼
    copyBtn.addEventListener('click', () => {
        copyToClipboard();
    });
}

/**
 * 3. 알고리즘 선택 시 UI 업데이트
 */
function onSelectAlgorithm(id) {
    const selected = algorithms[id];
    if (selected) {
        // Iterations 자동 세팅
        const iterInput = document.getElementById('iterations');
        iterInput.value = selected.defaultIterations;

        // 콘솔 및 로그 확인 (나중에 UI에 Spring 버전을 표시할 수도 있음)
        console.log(`[Algorithm Selected] ID: ${id} | Spring Boot: ${selected.springBootVersion}`);
    }
}

/**
 * 4. 암/복호화 핸들러 (Jasypt 호환 로직)
 */
function handleAction(mode) {
    const password = document.getElementById('password').value;
    const inputText = document.getElementById('inputText').value.trim();
    const algorithmId = document.getElementById('algorithm').value;
    const iterations = parseInt(document.getElementById('iterations').value);
    const resultArea = document.getElementById('outputText');

    if (!password || !inputText) {
        alert("Please enter both the Secret Key and Input Text.");
        return;
    }

    try {
        if (mode === 'encrypt') {
            const encrypted = jasyptEncrypt(inputText, password, iterations, algorithmId);
            resultArea.value = encrypted;
        } else {
            const decrypted = jasyptDecrypt(inputText, password, iterations, algorithmId);
            resultArea.value = decrypted;
        }
    } catch (e) {
        console.error(e);
        alert("Operation failed. Please check your Secret Key or Algorithm compatibility.");
        resultArea.value = "ERROR: Could not process the data.";
    }
}

/**
 * Jasypt 호환 암호화 로직 (AES-256 기준)
 */
function jasyptEncrypt(plainText, password, iterations, algoId) {
    const salt = CryptoJS.lib.WordArray.random(16); // 16-byte random salt
    const iv = CryptoJS.lib.WordArray.random(16);   // 16-byte random IV

    // PBKDF2를 이용한 키 생성 (Jasypt 방식)
    const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: iterations,
        hasher: CryptoJS.algo.SHA512
    });

    const encrypted = CryptoJS.AES.encrypt(plainText, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
    });

    // Jasypt 포맷: [Salt(16)] + [IV(16)] + [Ciphertext]
    const combined = salt.clone().concat(iv).concat(encrypted.ciphertext);
    return combined.toString(CryptoJS.enc.Base64);
}

/**
 * Jasypt 호환 복호화 로직
 */
function jasyptDecrypt(base64Text, password, iterations, algoId) {
    const encryptedFull = CryptoJS.enc.Base64.parse(base64Text);

    // Salt와 IV 추출 (앞선 32바이트)
    const salt = CryptoJS.lib.WordArray.create(encryptedFull.words.slice(0, 4));
    const iv = CryptoJS.lib.WordArray.create(encryptedFull.words.slice(4, 8));
    const ciphertext = CryptoJS.lib.WordArray.create(encryptedFull.words.slice(8));

    const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: iterations,
        hasher: CryptoJS.algo.SHA512
    });

    const decrypted = CryptoJS.AES.decrypt({ciphertext: ciphertext}, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
    });

    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) throw new Error("Invalid password or corrupted data.");
    return result;
}

/**
 * 5. 결과값 복사 기능
 */
function copyToClipboard() {
    const outputText = document.getElementById('outputText');
    if (!outputText.value) return;

    outputText.select();
    document.execCommand('copy'); // 최신 브라우저는 navigator.clipboard.writeText 추천

    const copyBtn = document.getElementById('copyBtn');
    const originalText = copyBtn.innerText;
    copyBtn.innerText = "Done!";
    setTimeout(() => copyBtn.innerText = originalText, 2000);
}

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', init);