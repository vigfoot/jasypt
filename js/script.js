let algorithms = {};
const HOST_URL = location.host.indexOf('localhost') !== -1 ? '/jasypt' : '';

/**
 * 1. 초기화 및 이벤트 바인딩
 */
async function init() {
    try {
        const response = await fetch(`${HOST_URL}/data/jasypt_algorithms.json`);
        if (!response.ok) throw new Error("Failed to load data.");
        algorithms = await response.json();

        const selectEl = document.getElementById('algorithm');
        selectEl.innerHTML = '';
        Object.keys(algorithms).forEach(id => {
            selectEl.add(new Option(algorithms[id].name, id));
        });

        // 초기 실행 시 딱 한 번만 UI 업데이트
        if (Object.keys(algorithms).length > 0) {
            updateUIByAlgorithm(selectEl.value);
        }

        // 이벤트 리스너는 여기서 딱 한 번만 등록
        attachEventListeners();
    } catch (error) {
        console.error("Init Error:", error);
    }
}

function attachEventListeners() {
    const selectEl = document.getElementById('algorithm');
    const versionBtns = document.querySelectorAll('.btn-version');

    versionBtns.forEach(btn => {
        // 기존 리스너가 중복되지 않도록 방어 로직 (익명함수 대신 명확한 처리)
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation(); // 이벤트 버블링 방지

            const target = btn.getAttribute('data-version');
            const id = Object.keys(algorithms).find(k => algorithms[k].springBootDefault === target);

            if (id) {
                selectEl.value = id;
                updateUIByAlgorithm(id);
            }
        };
    });

    selectEl.onchange = (e) => {
        updateUIByAlgorithm(e.target.value);
    };

    document.getElementById('encryptBtn').onclick = () => handleAction('encrypt');
    document.getElementById('decryptBtn').onclick = () => handleAction('decrypt');
    document.getElementById('copyBtn').onclick = () => copyToClipboard();
}

/**
 * 3. 알고리즘 선택 시 UI 업데이트 (기존 onSelectAlgorithm 역할)
 */
function updateUIByAlgorithm(id) {
    const selected = algorithms[id];
    if (!selected) return;

    // 1. Iterations 세팅
    const iterInput = document.getElementById('iterations');
    iterInput.value = selected.defaultIterations;

    // 2. 버전 버튼 하이라이트 (버블링 이슈를 피하기 위해 클래스만 깔끔하게 교체)
    const versionBtns = document.querySelectorAll('.btn-version');
    versionBtns.forEach(btn => {
        const btnVersion = btn.getAttribute('data-version');
        if (selected.springBootDefault === btnVersion) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    console.log(`[UI Sync] Algorithm: ${id}, Version: ${selected.springBootDefault}`);
}

function onSelectAlgorithm(id) {
    const selected = algorithms[id];
    if (selected) {
        // 1. Iterations 자동 세팅
        const iterInput = document.getElementById('iterations');
        iterInput.value = selected.defaultIterations;

        // 2. 버전 버튼 액티브 처리 (추가된 로직)
        const versionBtns = document.querySelectorAll('.btn-version');
        versionBtns.forEach(btn => {
            const btnVersion = btn.getAttribute('data-version');
            // 현재 선택된 알고리즘의 springBootDefault 값과 버튼의 버전이 일치하면 active 추가
            if (selected.springBootDefault === btnVersion) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        console.log(`[Algorithm Selected] ID: ${id} | Sync Version: ${selected.springBootDefault || 'None'}`);
    }
}

/**
 * 2. 통합 핸들러
 */
function handleAction(mode) {
    const password = document.getElementById('password').value;
    const algorithmId = document.getElementById('algorithm').value;
    const iterations = parseInt(document.getElementById('iterations').value);
    const resultArea = document.getElementById('outputText');
    const algoInfo = algorithms[algorithmId];

    try {
        const inputId = mode === 'encrypt' ? 'encryptText' : 'decryptText';
        const inputText = document.getElementById(inputId).value.trim();

        if (!password || !inputText) {
            alert("Please enter Secret Key and Input Text.");
            return;
        }

        let result = "";
        if (algoInfo.category === "Modern") {
            result = mode === 'encrypt'
                ? jasyptEncryptModern(inputText, password, iterations)
                : jasyptDecryptModern(inputText, password, iterations);
        } else {
            result = mode === 'encrypt'
                ? jasyptEncryptLegacy(inputText, password, iterations, algorithmId)
                : jasyptDecryptLegacy(inputText, password, iterations, algorithmId);
        }

        resultArea.value = result;
    } catch (e) {
        console.error("Action Error:", e);
        resultArea.value = "ERROR: Decryption failed. Possible wrong password or salt mismatch.";
    }
}

/**
 * 3. Modern 로직 (AES-256)
 */
function jasyptEncryptModern(text, pass, iter) {
    const salt = CryptoJS.lib.WordArray.random(16);
    const iv = CryptoJS.lib.WordArray.random(16);

    const key = CryptoJS.PBKDF2(pass, salt, {
        keySize: 256 / 32,
        iterations: iter,
        hasher: CryptoJS.algo.SHA512
    });

    const encrypted = CryptoJS.AES.encrypt(text, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
    });

    // Jasypt 포맷: [Salt(16)] + [IV(16)] + [Ciphertext]
    const combined = salt.clone().concat(iv).concat(encrypted.ciphertext);
    return combined.toString(CryptoJS.enc.Base64);
}

function jasyptDecryptModern(base64, pass, iter) {
    const encryptedFull = CryptoJS.enc.Base64.parse(base64);

    // 16바이트(128비트)씩 정확히 추출하기 위한 helper
    const extract = (wordArray, startByte, lengthByte) => {
        const startWord = startByte / 4;
        const endWord = (startByte + lengthByte) / 4;
        const newWords = wordArray.words.slice(startWord, endWord);
        return CryptoJS.lib.WordArray.create(newWords, lengthByte);
    };

    // Jasypt 구조 분해: Salt(16) | IV(16) | Ciphertext(rest)
    const salt = extract(encryptedFull, 0, 16);
    const iv = extract(encryptedFull, 16, 16);
    const ciphertext = CryptoJS.lib.WordArray.create(
        encryptedFull.words.slice(8),
        encryptedFull.sigBytes - 32
    );

    const key = CryptoJS.PBKDF2(pass, salt, {
        keySize: 256 / 32,
        iterations: iter,
        hasher: CryptoJS.algo.SHA512
    });

    const decrypted = CryptoJS.AES.decrypt({ciphertext: ciphertext}, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC
    });

    const result = decrypted.toString(CryptoJS.enc.Utf8);

    // 복호화 결과 검증
    if (!result || result.length === 0) {
        throw new Error("Decryption failed. Check password or IV/Salt structure.");
    }

    return result;
}

/**
 * 4. Legacy 로직 보강 (DES/3DES 대응)
 */
function getLegacyConfig(algoId) {
    if (algoId.includes("TripleDES") || algoId.includes("DESede")) {
        return {cipher: CryptoJS.TripleDES, keyLen: 24, ivLen: 8};
    }
    return {cipher: CryptoJS.DES, keyLen: 8, ivLen: 8};
}

// Jasypt StandardPBE 키 유도 로직 (핵심)
function deriveLegacyKey(pass, salt, iter, keyLen, ivLen) {
    let passwordBytes = CryptoJS.enc.Latin1.parse(pass);
    let data = passwordBytes.concat(salt);

    let hash = CryptoJS.MD5(data);
    for (let i = 1; i < iter; i++) {
        hash = CryptoJS.MD5(hash);
    }

    const key = CryptoJS.lib.WordArray.create(hash.words.slice(0, keyLen / 4));
    const iv = CryptoJS.lib.WordArray.create(hash.words.slice(keyLen / 4, (keyLen + ivLen) / 4));

    return {key, iv};
}

function jasyptEncryptLegacy(text, pass, iter, id) {
    const config = getLegacyConfig(id);
    const salt = CryptoJS.lib.WordArray.random(8);
    const derived = deriveLegacyKey(pass, salt, iter, config.keyLen, config.ivLen);
    const enc = config.cipher.encrypt(text, derived.key, {iv: derived.iv, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC});
    return salt.clone().concat(enc.ciphertext).toString(CryptoJS.enc.Base64);
}

function jasyptDecryptLegacy(base64, pass, iter, id) {
    const config = getLegacyConfig(id);
    const full = CryptoJS.enc.Base64.parse(base64);
    const salt = CryptoJS.lib.WordArray.create(full.words.slice(0, 2)); // 8 bytes
    const cipher = CryptoJS.lib.WordArray.create(full.words.slice(2));
    const derived = deriveLegacyKey(pass, salt, iter, config.keyLen, config.ivLen);

    const dec = config.cipher.decrypt({ciphertext: cipher}, derived.key, {iv: derived.iv, padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC});
    return dec.toString(CryptoJS.enc.Utf8);
}

function copyToClipboard() {
    const val = document.getElementById('outputText').value;
    if (!val || val === "ERROR") return;
    navigator.clipboard.writeText(val);
    const btn = document.getElementById('copyBtn');
    btn.innerText = "Done!";
    setTimeout(() => btn.innerText = "Copy", 2000);
}

document.addEventListener('DOMContentLoaded', init, { once: true });