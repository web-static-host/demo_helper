const LOCAL_SERVER = 'http://127.0.0.1:5000';

// Хранилище для объектов файлов
let attachedFiles = {
    license: null,      // ZIP (Лицензия)
    registration: null  // PDF (Карточка)
};

// Хранилище для поиска менеджеров
let allManagers = [];

// --- ИНИЦИАЛИЗАЦИЯ ---
async function initAll() {
    loadLinks(GOOGLE_SHEET_CSV_URL, 'linksContainer');
    loadLinks(OFD_CONFIG_CSV_URL, 'ofdLinksContainer');
    loadLinks(INSTRUCTIONS_CSV_URL, 'instructionsContainer'); 
    loadStaff();
    loadManagers();
    initDragAndDrop(); 
}

window.addEventListener('DOMContentLoaded', initAll);

// --- ЗАГРУЗКА ДАННЫХ ИЗ CSV ---
async function loadLinks(url, targetId) {
    const container = document.getElementById(targetId);
    if (!url) return;
    try {
        const response = await fetch(url);
        const data = await response.text();
        const rows = data.split(/\r?\n/).slice(1);
        
        container.innerHTML = rows.map(row => {
            const cols = row.split(/[,;](?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length < 2) return '';
            const name = cols[0].replace(/"/g, '').trim();
            const val = cols[1].replace(/"/g, '').trim();
            const isDownloadable = val.includes('export=download');
            let actionBtn = '';
            if (targetId !== 'ofdLinksContainer') {
                actionBtn = isDownloadable 
                    ? `<a href="${val}" download class="copy-btn" style="text-decoration:none;" title="Скачать файл">📥</a>`
                    : `<a href="${val}" target="_blank" class="copy-btn" style="text-decoration:none;" title="Открыть ссылку">🔗</a>`;
            }
            const urlDisplay = isDownloadable ? 'display: none;' : '';
            return `<div class="link-item"><div class="link-info"><span class="link-name">${name}</span><span class="link-url" style="${urlDisplay}">${val}</span></div><div style="display:flex; gap:5px;">${actionBtn}<button class="copy-btn" onclick="copyText('${val}', this)">📋</button></div></div>`;
        }).join('');
    } catch(e) { container.innerHTML = "<div style='padding:10px; color:red;'>Ошибка загрузки</div>"; }
}

let staffData = [];
async function loadStaff() {
    if (typeof STAFF_CSV_URL === 'undefined' || !STAFF_CSV_URL) return;
    try {
        const response = await fetch(STAFF_CSV_URL);
        const data = await response.text();
        const rows = data.split(/\r?\n/).slice(1);
        const select = document.getElementById('staffSelect');
        rows.forEach(row => {
            const cols = row.split(/[,;](?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length >= 2) {
                const name = cols[0].replace(/"/g, '').trim();
                const email = cols[1].replace(/"/g, '').trim();
                staffData.push({name, email});
                let opt = document.createElement('option');
                opt.value = email; opt.innerText = name;
                select.appendChild(opt);
            }
        });
    } catch(e) {}
}

async function loadManagers() {
    if (typeof MANAGERS_CSV_URL === 'undefined' || !MANAGERS_CSV_URL) return;
    try {
        const response = await fetch(MANAGERS_CSV_URL);
        const data = await response.text();
        const rows = data.split(/\r?\n/).slice(1);
        
        allManagers = [];
        rows.forEach(row => {
            const cols = row.split(/[,;](?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length >= 2) {
                const name = cols[0].replace(/"/g, '').trim();
                const email = cols[1].replace(/"/g, '').trim();
                if (name && email) allManagers.push({ name, email });
            }
        });
        renderManagerOptions(allManagers);
    } catch(e) { console.error("Ошибка загрузки менеджеров"); }
}

function renderManagerOptions(list) {
    const select = document.getElementById('managerSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Выберите менеджера...</option>';
    list.forEach(m => {
        let opt = document.createElement('option');
        opt.value = m.email; opt.innerText = m.name;
        select.appendChild(opt);
    });
}

function filterManagers() {
    const term = document.getElementById('managerSearch').value.toLowerCase();
    const filtered = allManagers.filter(m => 
        m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term)
    );
    renderManagerOptions(filtered);
    if (filtered.length === 1) {
        document.getElementById('managerSelect').value = filtered[0].email;
        syncManagerEmail();
    }
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function toggleAstral() {
    const box = document.getElementById('astralBox');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

function showStaffEmail() {
    const email = document.getElementById('staffSelect').value;
    const res = document.getElementById('staffEmailResult');
    res.innerHTML = email ? `Почта: <b>${email}</b> <button class="copy-btn" onclick="copyText('${email}', this)">📋</button>` : "";
}

function syncManagerEmail() {
    const select = document.getElementById('managerSelect');
    const input = document.getElementById('mailTo');
    if (select && input) input.value = select.value;
}

function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const old = btn.innerText; btn.innerText = "✅";
        setTimeout(() => btn.innerText = old, 1000);
    });
}

function generatePass() {
    const len = document.getElementById('passLen').value;
    const charset = (document.getElementById('genLower').checked ? "abcdefghijklmnopqrstuvwxyz" : "") +
                    (document.getElementById('genUpper').checked ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : "") +
                    (document.getElementById('genNum').checked ? "0123456789" : "");
    if (!charset) return;
    let res = "";
    for (let i = 0; i < len; i++) res += charset.charAt(Math.floor(Math.random() * charset.length));
    document.getElementById('passResult').innerText = res;
}

function copyPass() {
    const p = document.getElementById('passResult').innerText;
    if (p !== "****") copyText(p, document.getElementById('passResult'));
}

// --- ПОЧТОВАЯ ЛОГИКА ---

function initDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;
    dropZone.onclick = () => document.getElementById('fileLic').click();
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.background = '#e1f5fe'; };
    dropZone.ondragleave = () => { dropZone.style.background = '#fafafa'; };
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.style.background = '#fafafa';
        handleFiles(e.dataTransfer.files);
    };
    document.getElementById('fileLic').onchange = (e) => handleFiles(e.target.files);
}

function handleFiles(files) {
    for (let file of files) {
        if (file.name.toLowerCase().endsWith('.zip')) {
            attachedFiles.license = file; 
        } else if (file.name.toLowerCase().endsWith('.pdf')) {
            attachedFiles.registration = file; 
        }
    }
    renderFileList();
}

function renderFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = "";
    if (attachedFiles.license) fileList.innerHTML += `<div style="color:green">📦 Лицензия (ZIP): ${attachedFiles.license.name}</div>`;
    if (attachedFiles.registration) fileList.innerHTML += `<div style="color:green">📄 Карточка (PDF): ${attachedFiles.registration.name}</div>`;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

function applyTemplate() {
    const delivery = document.getElementById('mailDeliveryName')?.value || "Программный продукт 1С";
    const bodyArea = document.getElementById('mailBody');
    const orderType = document.getElementById('orderTypeSelect')?.value;
    
    const instrBox = document.getElementById('defaultInstructionBox');
    const instrName = document.getElementById('instructionFileName');

    if (!bodyArea) return;

    if (orderType === 'local') {
        if (instrBox) instrBox.style.display = 'flex';
        if (instrName) instrName.innerText = "Инструкция_по_установке_электронной_версии_программы_1С.pdf (по умолчанию)";
    } else if (orderType === 'dop') {
        if (instrBox) instrBox.style.display = 'none';
    } else if (orderType === 'otrasl') {
        if (instrBox) instrBox.style.display = 'flex';
        if (instrName) instrName.innerText = "Инструкция по активации КП Отраслевой.ppsx (по умолчанию)";
    }

    const content = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
  <tr>
    <td align="center">
      <div style="width: 580px; font-family: Arial, sans-serif; font-size: 18px; line-height: 1.2; color: #000000; text-align: center;">
        <h2 style="color: #D71920; font-size: 26px; font-weight: bold; margin-bottom: 20px;">Уважаемый клиент!</h2>
        <p style="margin-bottom: 15px;"><b>Вы заказывали программный продукт<br>${delivery}.</b></p>
        <p style="margin-bottom: 25px;">Отгрузка выполнена, направляю Вам во вложении<br>инструкцию для установки программного продукта, а также архив лицензии.</p>
        <p style="margin-bottom: 10px;">Обращаю Ваше внимание, приложенный архив с лицензией рекомендую отдельно сохранить в надежном месте, на случай переустановки программы или выхода из строя персонального компьютера.</p>
      </div>
    </td>
  </tr>
</table>`.replace(/>\s+</g, '><').replace(/\n/g, ' ').trim();
    
    bodyArea.value = content;
}

async function sendMail() {
    const to = document.getElementById('mailTo')?.value;
    const org = document.getElementById('mailOrg')?.value;
    const delivery = document.getElementById('mailDeliveryName')?.value;
    const body = document.getElementById('mailBody')?.value;
    const orderType = document.getElementById('orderTypeSelect')?.value || 'local';

    if (!to || !org || !delivery) { alert("Заполните Кому, Организацию и Поставку!"); return; }

    if (orderType === 'local') {
        if (!attachedFiles.license || !attachedFiles.registration) {
            alert("Для локальной 1С нужны и Лицензия (ZIP), и Карточка (PDF)!"); return;
        }
    } else if (orderType === 'dop') {
        if (!attachedFiles.license) {
            alert("Прикрепите Лицензию (ZIP)!"); return;
        }
    } else if (orderType === 'otrasl') {
        if (!attachedFiles.license) {
            alert("Для отраслевого КП обязательна Лицензия (ZIP)!"); return;
        }
        if (attachedFiles.registration) {
            alert("Для этого типа отгрузки прикрепляется только Лицензия (ZIP). Удалите Карточку (PDF)."); return;
        }
    }

    try {
        const filesToUpload = [];
        if (attachedFiles.license) {
            filesToUpload.push({ name: attachedFiles.license.name, content: await fileToBase64(attachedFiles.license) });
        }
        if (attachedFiles.registration) {
            filesToUpload.push({ name: attachedFiles.registration.name, content: await fileToBase64(attachedFiles.registration) });
        }

        const payload = { 
            order_type: orderType,
            to, subject: `${delivery} ${org} (лицензия)`.trim(), body,
            files: filesToUpload 
        };

        const response = await fetch(`${LOCAL_SERVER}/send_email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (response.ok && result.status === "success") {
            alert("Окно письма открыто в Thunderbird");
            closeMailModal();
        } else {
            alert("Ошибка шлюза: " + (result.error || "Неизвестная ошибка"));
        }
    } catch (error) { alert("Шлюз не отвечает!"); }
}

// --- УПРАВЛЕНИЕ МОДАЛКОЙ ---
function openMailModal() {
    const modal = document.getElementById('mailModal');
    if (modal) {
        modal.style.display = 'block';
        applyTemplate();
        document.getElementById('mailOrg')?.addEventListener('input', applyTemplate);
        document.getElementById('mailDeliveryName')?.addEventListener('input', applyTemplate);
    }
}

function closeMailModal() {
    document.getElementById('mailModal').style.display = 'none';
    attachedFiles = { license: null, registration: null }; 
    if (document.getElementById('fileList')) document.getElementById('fileList').innerHTML = "";
    if (document.getElementById('fileLic')) document.getElementById('fileLic').value = "";
    if (document.getElementById('managerSearch')) document.getElementById('managerSearch').value = "";
    renderManagerOptions(allManagers);
}

window.onclick = function(event) {
    const modal = document.getElementById('mailModal');
    if (event.target == modal) closeMailModal();
}

// --- ПОИСК РЕКВИЗИТОВ И СФР ---
async function getData() {
    const innRaw = document.getElementById('innInput').value.trim();
    const body = document.getElementById('resBody');
    const errorBox = document.getElementById('errorBox');
    const resDivSfr = document.getElementById('sfrResult');
    
    if (!innRaw) return;
    const inn = innRaw.replace(/\D/g, '');
    
    errorBox.innerText = "";
    resDivSfr.innerHTML = ""; 
    document.getElementById('resTable').style.display = 'none';

    try {
        const response = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Accept": "application/json", 
                "Authorization": "Token " + API_KEY 
            },
            body: JSON.stringify({query: inn})
        });
        
        const result = await response.json();
        if (result.suggestions && result.suggestions.length > 0) {
            const d = result.suggestions[0].data;
            const fields = [
                ["Наименование", d.name?.full_with_opf || "—"],
                ["ИНН", d.inn || "—"],
                ["КПП", d.kpp || "—"],
                ["ОГРН", d.ogrn || "—"],
                ["Адрес", d.address?.value || "—"],
                ["Руководитель", d.management?.name || "—"],
                ["Статус", d.state?.status === "ACTIVE" ? "✅ Действующее" : "⚠️ " + d.state?.status]
            ];

            body.innerHTML = fields.map(f => `
                <tr>
                    <td><b>${f[0]}</b></td>
                    <td>${f[1]} <button class="copy-btn" onclick="copyText('${f[1]}', this)">📋</button></td>
                </tr>
            `).join("") + 
            `<tr>
                <td><b>Код СФР</b></td>
                <td>
                    <strong id="sfrValue" style="color:#007bff;">Не указан</strong>
                    <button class="copy-btn" onclick="getSfrOnly()">Запросить</button>
                </td>
            </tr>`;

            document.getElementById('resTable').style.display = 'table';
            if (document.getElementById('mailOrg')) {
                document.getElementById('mailOrg').value = d.name?.short_with_opf || d.name?.full_with_opf || "";
                applyTemplate();
            }
        } else { errorBox.innerText = "ИНН не найден"; }
    } catch (e) { errorBox.innerText = "Ошибка DaData"; }
}

async function getSfrOnly() {
    const inn = document.getElementById('innInput').value.replace(/\D/g, '');
    const resDiv = document.getElementById('sfrResult');
    try {
        const capResp = await fetch(`${LOCAL_SERVER}/get_captcha`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ inn }) });
        const capData = await capResp.json();
        if (capData.image) {
            resDiv.innerHTML = `<div style="border:1px solid #ddd; padding:10px; background:#fff;"><img src="data:image/png;base64,${capData.image}"><br><input type="text" id="capAns" style="width:60px; margin-top:5px;"><button onclick="confirmSfrOnly('${inn}')">ОК</button></div>`;
        }
    } catch (e) { resDiv.innerHTML = "Gateway не запущен"; }
}

async function confirmSfrOnly(inn) {
    const ans = document.getElementById('capAns').value;
    try {
        const resp = await fetch(`${LOCAL_SERVER}/submit_sfr`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ inn, captchaAnswer: ans }) });
        const result = await resp.json();
        if (result.regNum) { 
            document.getElementById('sfrValue').innerText = result.regNum; 
            document.getElementById('sfrResult').innerHTML = "✅ Код получен";
        }
    } catch (e) {}
}