# 🍃 Jasypt ForestFull
> **Online Jasypt Encryption & Decryption Tool for Spring Boot Developers**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x%20%2F%202.x-brightgreen)](https://spring.io/projects/spring-boot)

**Jasypt ForestFull**은 Spring Boot 환경에서 프로퍼티 암호화에 사용되는 Jasypt 알고리즘을 웹에서 간편하게 테스트하고 생성할 수 있는 도구입니다. 복잡한 Java 코드 실행 없이 브라우저에서 즉시 암/복호화 결과를 확인할 수 있습니다.



---

## ✨ Key Features

* **Dual Mode Support**: Spring Boot 3.x(Modern)와 2.x(Legacy) 기본 알고리즘을 완벽하게 지원합니다.
* **Smart Auto-Sync**: 알고리즘 선택 시 해당되는 Spring 버전 버튼과 Iterations 값이 자동으로 활성화됩니다.
* **Broad Algorithm Support**:
    * **Modern**: AES-256 (PBKDF2 / SHA512)
    * **Legacy**: PBEWithMD5AndDES, TripleDES 등 모든 PBE 방식 대응
* **No Server-Side Storage**: 모든 암/복호화 로직은 클라이언트 사이드(JavaScript)에서 처리되어 사용자의 Secret Key가 서버로 전송되지 않습니다.
* **Responsive UI**: 800px 최대 너비의 깔끔한 카드 레이아웃으로 모바일 환경에서도 쾌적하게 사용 가능합니다.

---

## 🚀 How to Use

1.  **Select Version**: 사용 중인 Spring Boot 버전에 맞춰 `3.x` 또는 `2.x` 버튼을 클릭하세요.
2.  **Input Credentials**:
    * `Secret Key`: Jasypt 설정에 사용한 비밀키를 입력합니다.
    * `Iterations`: 반복 횟수를 확인합니다 (기본값: 1000).
3.  **Encrypt/Decrypt**:
    * 암호화할 평문을 입력하거나, 복호화할 `ENC(...)` 내부 문자열을 입력합니다.
4.  **Copy Result**: 결과창의 `Copy` 버튼을 눌러 즉시 클립보드에 복사하세요.

---

## 🛠️ Technical Stack

* **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS)
* **Security**: [CryptoJS](https://github.com/brix/crypto-js)
* **Hosting**: GitHub Pages
* **Domain**: Route 53 & Cloudflare DNS

---

## 📂 Project Structure

```text
.
├── index.html          # 메인 UI 레이아웃
├── css/
│   └── style.css       # 맞춤형 스타일링 및 반응형 디자인
├── js/
│   └── script.js      # Jasypt 호환 암/복호화 핵심 로직
└── data/
    └── jasypt_algorithms.json  # 알고리즘 메타데이터