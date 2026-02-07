class InventoryManager {
    constructor() {
        this.inventoryGroups = [];
        this.canEdit = false;
        this.currentPdfItemId = null;

        this.initEventListeners();
    }

    initEventListeners() {
        document.addEventListener("DOMContentLoaded", async () => {
            this.canEdit = (typeof USER_ROLE !== 'undefined' &&
                (USER_ROLE === 'Administrator' || USER_ROLE === 'Editor'));

            await this.loadGroups();
            await this.loadInventory();
            this.setupAddRowButton();
            this.setupAddGroupButton();
            this.setupPdfModalHandlers();
        });
    }

    setupAddRowButton() {
        const btn = document.getElementById("add-home-row");
        if (btn) {
            btn.onclick = () => this.addNewInventoryItem();
        }
    }

    setupAddGroupButton() {
        const input = document.getElementById("newGroupName");
        const addButton = input?.nextElementSibling;

        if (input && addButton) {
            // Add event listener to the button
            addButton.onclick = () => this.addGroup();

            // Add event listener for Enter key in input
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addGroup();
                }
            });
        }
    }

    setupPdfModalHandlers() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('pdfInput');

        if (dropZone && fileInput) {
            dropZone.onclick = () => fileInput.click();

            fileInput.onchange = (e) => this.handleFiles(e.target.files);

            dropZone.ondragover = (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            };

            dropZone.ondragleave = () => dropZone.classList.remove('drag-over');

            dropZone.ondrop = (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                this.handleFiles(e.dataTransfer.files);
            };
        }
    }

    async addGroup() {
        const input = document.getElementById("newGroupName");
        const name = input.value.trim();

        if (!name) {
            alert("Bitte geben Sie einen Gruppennamen ein.");
            return;
        }

        // Check if group name already exists
        if (this.inventoryGroups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
            alert("Eine Gruppe mit diesem Namen existiert bereits.");
            return;
        }

        try {
            const res = await fetch('/api/add_group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const data = await res.json();

            if (res.ok) {
                input.value = "";
                await this.loadGroups();

                // Optional: Focus back on the input for convenience
                input.focus();
            } else {
                alert(data.error || "Fehler beim Hinzufügen der Gruppe");
            }
        } catch (error) {
            console.error("Add group error:", error);
            alert("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
        }
    }

    async loadGroups() {
        try {
            const res = await fetch('/api/get_groups');
            this.inventoryGroups = await res.json();
            this.renderGroupList();
        } catch (error) {
            console.error("Error loading groups:", error);
        }
    }

    renderGroupList() {
        const list = document.getElementById("groupList");
        if (!list) return;

        list.innerHTML = this.inventoryGroups.map(g => `
            <div id="groupListLines">
                <span>${g.name}</span>
                <button class="del-icon" onclick="inventoryManager.removeGroup(${g.id})">🗑</button>
            </div>
        `).join('');
    }

    renderGroupSelect(id, currentGroup) {
        return `<select class="group-select" onchange="inventoryManager.updateItem(${id}, 'gruppe', this.value)">
            ${this.inventoryGroups.map(g => `
                <option value="${g.name}" ${g.name === currentGroup ? 'selected' : ''}>
                    ${g.name}
                </option>`).join('')}
        </select>`;
    }

    async loadInventory() {
        try {
            const res = await fetch('/api/get_inventory');
            const items = await res.json();
            const tbody = document.getElementById("home-table-body");

            tbody.innerHTML = "";
            items.forEach(item => this.addRowToUI(item));
        } catch (error) {
            console.error("Error loading inventory:", error);
        }
    }

    addRowToUI(item) {
        const tbody = document.getElementById("home-table-body");
        const tr = document.createElement("tr");

        const editAttr = this.canEdit ? 'contenteditable="true"' : 'contenteditable="false"';
        const aktuellVal = (item.aktuell !== undefined) ? item.aktuell : item.anzahl;

        let styleAktuell = "background-color: #f8f9fa; cursor: default;";
        if (aktuellVal < 0) {
            styleAktuell += "color: red; font-weight: bold;";
        } else if (aktuellVal !== item.anzahl) {
            styleAktuell += "color: #007bff; font-weight: bold;";
        }

        tr.innerHTML = `
            <td>${this.canEdit ? this.renderGroupSelect(item.id, item.gruppe) : item.gruppe}</td>
            <td ${editAttr} onblur="inventoryManager.updateItem(${item.id}, 'name_id', this.innerText)">${item.name_id}</td>
            <td ${editAttr} onblur="inventoryManager.updateItem(${item.id}, 'lagerort', this.innerText)">${item.lagerort}</td>
            <td>
                ${this.renderQuantityControl(item)}
            </td>
            <td style="background: var(--input-bg); color: var(--text-main);">${item.aktuell}</td>
            <td ${editAttr} onblur="inventoryManager.updateItem(${item.id}, 'info', this.innerText)">${item.info}</td>
            <td class="action-cell">
                <button class="action-icon" onclick="inventoryManager.openPdfModal(${item.id}, '${item.name_id}')" title="Anleitungen">📋</button>
                ${this.canEdit ? `<button class="del-icon" onclick="inventoryManager.deleteItem(${item.id})" title="Löschen">🗑</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    }

    renderQuantityControl(item) {
        if (!this.canEdit) {
            return `<span>${item.anzahl}</span>`;
        }
        return `
            <div class="number-wrapper" style="width: 100%;">
                <button style="color: red;" class="qty-btn" onclick="inventoryManager.adjustQuantity(${item.id}, -1)">-</button>
                <input type="number" 
                    value="${item.anzahl || 0}" 
                    min="1" 
                    class="custom-number-input"
                    onchange="inventoryManager.checkAndUpdateQty(${item.id}, this)">
                <button style="color: green;" class="qty-btn" onclick="inventoryManager.adjustQuantity(${item.id}, 1)">+</button>
            </div>
        `;
    }

    adjustQuantity(id, delta) {
        const input = document.querySelector(`input[onchange*="checkAndUpdateQty(${id},"]`);
        if (input) {
            input.value = Math.max(1, parseInt(input.value) + delta);
            input.dispatchEvent(new Event('change'));
        }
    }

    async checkAndUpdateQty(id, input) {
        let val = parseInt(input.value);
        if (isNaN(val) || val < 1) {
            val = 1;
            input.value = 1;
        }

        await this.updateItem(id, 'anzahl', val);
        await this.loadInventory();
    }

    async updateItem(id, field, value) {
        const trimmed = value?.toString().trim();
        if (!trimmed) {
            alert("FEHLER: Der Name darf nicht leer sein");
            location.reload();
            return;
        }

        try {
            const res = await fetch('/api/update_inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, field, value: trimmed })
            });

            if (!res.ok) {
                const data = await res.json();
                alert("FEHLER: " + data.error);
                location.reload();
            }
        } catch (error) {
            console.error("Update error:", error);
            alert("Ein Fehler ist aufgetreten");
        }
    }

    async addNewInventoryItem() {
        if (this.inventoryGroups.length === 0) {
            alert("Zuerst eine Gruppe anlegen!");
            return;
        }

        const newItem = {
            gruppe: this.inventoryGroups[0].name,
            name_id: "NEU-" + Math.floor(1000 + Math.random() * 9000)
        };

        try {
            const res = await fetch('/api/add_inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            const data = await res.json();

            if (data.success) {
                await this.loadInventory();
            }
        } catch (error) {
            console.error("Error adding inventory item:", error);
        }
    }

    async deleteItem(id) {
        if (confirm("Löschen?")) {
            try {
                await fetch('/api/delete_inventory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });
                await this.loadInventory();
            } catch (error) {
                console.error("Delete error:", error);
            }
        }
    }

    async removeGroup(id) {
        if (this.inventoryGroups.length <= 1) {
            alert("Aktion verweigert: Es muss immer mindestens eine Gruppe existieren!");
            return;
        }

        if (!confirm("Gruppe wirklich löschen? Alle Artikel die dieser Gruppe zugewiesen sind, werden einer anderen Gruppe zugewiesen!")) return;

        try {
            const res = await fetch('/api/delete_group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                await this.loadGroups();
            } else {
                const data = await res.json();
                alert("Fehler: " + (data.error || "Serverfehler"));
            }
        } catch (error) {
            console.error("Remove group error:", error);
        }
    }

    // PDF Management Methods
    openPdfModal(id, name) {
        this.currentPdfItemId = id;
        document.getElementById('pdfModalTitle').innerText = `Anleitungen: ${name}`;
        this.toggleModal('pdfModal', true);
        this.initPdfHandlers();
        this.loadPdfList();
    }

    initPdfHandlers() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('pdfInput');
        if (!dropZone || !fileInput) return;

        dropZone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => this.handleFiles(e.target.files);

        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        };
        dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        };
    }

    async handleFiles(files) {
        for (let file of files) {
            if (file.type !== "application/pdf") {
                alert("Nur PDFs erlaubt!");
                continue;
            }
            const formData = new FormData();
            formData.append('file', file);
            formData.append('item_id', this.currentPdfItemId);

            await fetch('/api/upload_pdf', { method: 'POST', body: formData });
        }
        this.loadPdfList();
    }

    async loadPdfList() {
        try {
            const res = await fetch(`/api/get_pdfs/${this.currentPdfItemId}`);
            const pdfs = await res.json();
            const list = document.getElementById('pdfList');

            list.innerHTML = pdfs.length === 0
                ? "<p style='text-align:center; color:#888;'>Keine PDFs vorhanden.</p>"
                : "";

            pdfs.forEach(p => {
                const div = document.createElement("div");
                div.className = "pdf-entry";
                div.innerHTML = `
                    <span style="cursor:pointer; color:#007bff;" 
                        onclick="window.open('/${p.filepath}', '_blank')">📄 ${p.filename}</span>
                    ${this.canEdit ? `<button class="del-icon" onclick="inventoryManager.deletePdf(${p.id})" title="Löschen">🗑</button>` : ''}
                `;
                list.appendChild(div);
            });
        } catch (error) {
            console.error("Load PDF list error:", error);
        }
    }

    async deletePdf(id) {
        if (!confirm("PDF löschen?")) return;

        try {
            await fetch('/api/delete_pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            this.loadPdfList();
        } catch (error) {
            console.error("Delete PDF error:", error);
        }
    }

    toggleModal(id, show) {
        document.getElementById(id).style.display = show ? "flex" : "none";
    }
}

// Create a global instance
const inventoryManager = new InventoryManager();

// Expose methods globally for inline event handlers
window.toggleModal = (id, show) => inventoryManager.toggleModal(id, show);