let inventoryGroups = [];

async function loadGroups() {
    const res = await fetch('/api/get_groups');
    inventoryGroups = await res.json();
    renderGroupList();
    loadInventory();
};

// helper function for the drop-down in the table
function renderGroupSelect(id, currentGroup) {
    return `<select class="group-select" onchange="updateItem(${id}, 'gruppe', this.value)">
        ${inventoryGroups.map(g => `<option value="${g.name}" ${g.name === currentGroup ? 'selected' : ''}>${g.name}</option>`).join('')}
    </select>`;
};

window.updateItem = async (id, field, value) => {
    const trimmed = value?.toString().trim();
    if (trimmed) {
        const res = await fetch('/api/update_inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, field, value: value.toString().trim() })
        });
        if (!res.ok) {
            const data = await res.json();
            alert("FEHLER: " + data.error);
            location.reload(); // sets name to old 
        };
    }
    else {
        alert("FEHLER: Der Name darf nicht leer sein")
        location.reload(); // sets name to old
    };
};

window.checkAndUpdateQty = async (id, input) => {
    let val = parseInt(input.value);
    if (isNaN(val) || val < 1) {
        val = 1;
        input.value = 1;
    }

    await updateItem(id, 'anzahl', val);
    await loadInventory();
};

window.addGroup = async function () {
    const input = document.getElementById("newGroupName");
    const name = input.value.trim();
    if (!name) return;
    const res = await fetch('/api/add_group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (res.ok) {
        input.value = "";
        await loadGroups();
    }
    else {
        alert(data.error);
    };
};

window.removeGroup = async function (id) {
    if (inventoryGroups.length <= 1) {
        alert("Aktion verweigert: Es muss immer mindestens eine Gruppe existieren!");
        return;
    }

    if (!confirm("Gruppe wirklich löschen? Alle Artikel die dieser Gruppe zugewiesen sind, werden einer anderen Gruppe zugewiesen!")) return;

    const res = await fetch('/api/delete_group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });

    if (res.ok) {
        await loadGroups();
    } else {
        const data = await res.json();
        alert("Fehler: " + (data.error || "Serverfehler"));
    }
};

function renderGroupList() {
    const list = document.getElementById("groupList");
    if (!list) return;
    list.innerHTML = inventoryGroups.map(g => `
        <div style="display:flex; justify-content:space-between; padding:5px; border-bottom:1px solid #eee;">
            <span>${g.name}</span>
            <button class="delete-btn" onclick="removeGroup(${g.id})">🗑</button>
        </div>
    `).join('');
};

async function loadInventory() {
    const res = await fetch('/api/get_inventory');
    const items = await res.json();
    const tbody = document.getElementById("home-table-body");

    tbody.innerHTML = "";
    items.forEach(addRowToUI);
};


function addRowToUI(item) {
    window.canEdit = (typeof USER_ROLE !== 'undefined' && (USER_ROLE === 'Administrator' || USER_ROLE === 'Editor'));
    const tbody = document.getElementById("home-table-body");
    const tr = document.createElement("tr");

    const editAttr = window.canEdit ? 'contenteditable="true"' : 'contenteditable="false"';
    const aktuellVal = (item.aktuell !== undefined) ? item.aktuell : item.anzahl;

    let styleAktuell = "background-color: #f8f9fa; cursor: default;";
    if (aktuellVal < 0) {
        styleAktuell += "color: red; font-weight: bold;";
    } else if (aktuellVal !== item.anzahl) {
        styleAktuell += "color: #007bff; font-weight: bold;";
    }


    tr.innerHTML = `
        <td style="padding-left: 24px; padding-right: 24px; padding-top: 16px; padding-bottom: 16px;">${window.canEdit ? renderGroupSelect(item.id, item.gruppe) : item.gruppe}</td>
        <td style="padding-left: 24px; padding-right: 24px; padding-top: 16px; padding-bottom: 16px; font-weight: 500;" ${editAttr} onblur="updateItem(${item.id}, 'name_id', this.innerText)">${item.name_id}</td>
        <td style="padding-left: 24px; padding-right: 24px; padding-top: 16px; padding-bottom: 16px; color: var(--text-muted);" ${editAttr} onblur="updateItem(${item.id}, 'lagerort', this.innerText)">${item.lagerort}</td>
        <td style="padding-left: 24px; padding-right: 24px; padding-top: 16px; padding-bottom: 16px;>
            ${window.canEdit ? `
                <div class="count-div">
                    <button class="count-minus" onclick="this.nextElementSibling.stepDown(); this.nextElementSibling.dispatchEvent(new Event('change'))">-</button>
                    <input class="count-input"   
                        type="number"
                        value="${item.anzahl || 0}" 
                        min="1" 
                        class="custom-number-input"
                        onchange="checkAndUpdateQty(${item.id}, this)">
                    <button class="count-plus" onclick="this.previousElementSibling.stepUp(); this.previousElementSibling.dispatchEvent(new Event('change'))">+</button>
                </div>` :
            `<span>${item.anzahl}</span>`
        }
        </td>
        <td style="padding-left: 24px; padding-right: 24px; padding-top: 16px; padding-bottom: 16px; font-weight: 600;">${item.aktuell}</td>
        <td style="padding-left: 24px; padding-right: 24px; padding-top: 16px; padding-bottom: 16px; font-weight: 500; color: var(--text-muted);" ${editAttr} onblur="updateItem(${item.id}, 'info', this.innerText)">${item.info}</td>
        <td style="padding-left: 24px; padding-right: 24px; padding-top: 16px; padding-bottom: 16px; text-align: right;">
            <div class="actions">
                <button class="edit-btn"
                    onclick="openPdfModal(${item.id}, '${item.name_id}')" title="Anleitungen">
                    <span class="material-icons-outlined text-sm">📋</span>
                    </button>
                ${window.canEdit ? `
                <button class="delete-btn"
                    onclick="deleteItem(${item.id})">
                    🗑
                </button>` : ''}
            </div>
        </td>
    `;
    tbody.appendChild(tr);
};

// --- PDF MODAL ---
let currentPdfItemId = null;

function openPdfModal(id, name) {
    currentPdfItemId = id;
    document.getElementById('pdfModalTitle').innerText = `Anleitungen: ${name}`;
    toggleModal('pdfModal', true);
    initPdfHandlers();
    loadPdfList();
}

function initPdfHandlers() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('pdfInput');
    if (!dropZone || !fileInput) return;

    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handleFiles(e.target.files);

    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    };
};

async function handleFiles(files) {
    for (let file of files) {
        if (file.type !== "application/pdf") {
            alert("Nur PDFs erlaubt!");
            continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('item_id', currentPdfItemId);

        await fetch('/api/upload_pdf', { method: 'POST', body: formData });
    }
    loadPdfList();
};

async function loadPdfList() {
    const res = await fetch(`/api/get_pdfs/${currentPdfItemId}`);
    const pdfs = await res.json();
    const list = document.getElementById('pdfList');
    list.innerHTML = pdfs.length === 0 ? "<p style='text-align:center; color:#888;'>Keine PDFs vorhanden.</p>" : "";

    pdfs.forEach(p => {
        const div = document.createElement("div");
        div.className = "pdf-entry";
        div.innerHTML = `
            <div
                class="pdf-modal-list-item">
                <div class="flex items-center gap-3 overflow-hidden">
                    <span
                        class="material-symbols-outlined text-slate-600 dark:text-slate-700 text-xl flex-shrink-0">description</span>
                    <span class="text-sm font-medium text-slate-700 dark:text-slate-800 truncate" onclick="window.open('/${p.filepath}', '_blank')">${p.filename}</span>
                ${window.canEdit ? `
                </div>
                <button class="delete-btn"
                    onclick="deletePdf(${p.id})">
                   🗑
                </button>` : ''}
            </div>
        `;
        list.appendChild(div);
    });
};

async function deletePdf(id) {
    if (!confirm("PDF löschen?")) return;
    await fetch('/api/delete_pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    loadPdfList();
};

window.deleteItem = async (id, btn) => {
    if (confirm("Löschen?")) {
        await fetch('/api/delete_inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        loadInventory()
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    await loadGroups();
    await loadInventory();

    const btn = document.getElementById("add-home-row");
    if (btn) {
        btn.onclick = async () => {
            if (inventoryGroups.length === 0) {
                alert("Zuerst eine Gruppe anlegen!");
                return;
            }
            const newItem = {
                gruppe: inventoryGroups[0].name,
                name_id: "NEU-" + Math.floor(1000 + Math.random() * 9000)
            };
            const res = await fetch('/api/add_inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            const data = await res.json();
            if (data.success) {
                loadInventory();
            }
        };
    }
});

window.toggleModal = (id, show) => {
    document.getElementById(id).style.display = show ? "flex" : "none";
};