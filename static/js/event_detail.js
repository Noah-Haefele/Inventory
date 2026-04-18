class EventDatailManager {
    constructor() {
        this.container = document.getElementById("detail-context");
        if (this.container) {
            this.eventId = this.container.getAttribute("data-event-id");
        }

        this.openModalButton = document.getElementById("open-modal-btn");
        this.confirmAddButton = document.getElementById("confirm-bulk-add-btn");

        this.assignedItems = [];
        this.checklistItems = [];
        this.currentAssignedSort = 'default';
        this.currentChecklistSort = 'default';

        this.loadAssignedItems(this.eventId);
        this.loadInventoryChecklists();
        this.loadSortPreferences();
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.setupSortRadioButtons();
    }

    loadSortPreferences() {
        const savedAssigned = localStorage.getItem('eventDetailAssignedSort');
        if (savedAssigned) {
            this.currentAssignedSort = savedAssigned;
        }
        const savedChecklist = localStorage.getItem('eventDetailChecklistSort');
        if (savedChecklist) {
            this.currentChecklistSort = savedChecklist;
        }
    }

    setupSortRadioButtons() {
        const assignedRadios = document.querySelectorAll('input[name="assignedSort"]');
        assignedRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.setAssignedSort(e.target.value);
            });
        });
        this.updateAssignedSortRadios();

        const checklistRadios = document.querySelectorAll('input[name="checklistSort"]');
        checklistRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.setChecklistSort(e.target.value);
            });
        });
        this.updateChecklistSortRadios();
    }

    updateAssignedSortRadios() {
        const radios = document.querySelectorAll('input[name="assignedSort"]');
        radios.forEach(radio => {
            radio.checked = (radio.value === this.currentAssignedSort);
        });
    }

    updateChecklistSortRadios() {
        const radios = document.querySelectorAll('input[name="checklistSort"]');
        radios.forEach(radio => {
            radio.checked = (radio.value === this.currentChecklistSort);
        });
    }

    setAssignedSort(sortOption) {
        this.currentAssignedSort = sortOption;
        localStorage.setItem('eventDetailAssignedSort', sortOption);
        this.renderAssignedItems();
        this.updateAssignedSortRadios();
    }

    setChecklistSort(sortOption) {
        this.currentChecklistSort = sortOption;
        localStorage.setItem('eventDetailChecklistSort', sortOption);
        this.renderChecklistItems();
        this.updateChecklistSortRadios();
    }

    applySorting(items, sortType) {
        const sorted = [...items];
        
        switch (sortType) {
            case 'name-asc':
                sorted.sort((a, b) => a.name_id.localeCompare(b.name_id, 'de', { numeric: true }));
                break;
            case 'name-desc':
                sorted.sort((a, b) => b.name_id.localeCompare(a.name_id, 'de', { numeric: true }));
                break;
            case 'group':
                sorted.sort((a, b) => {
                    const groupCmp = a.gruppe.localeCompare(b.gruppe, 'de');
                    return groupCmp !== 0 ? groupCmp : a.name_id.localeCompare(b.name_id, 'de', { numeric: true });
                });
                break;
            case 'lagerort':
                sorted.sort((a, b) => {
                    const lagerCmp = (a.lagerort || '').localeCompare((b.lagerort || ''), 'de');
                    return lagerCmp !== 0 ? lagerCmp : a.name_id.localeCompare(b.name_id, 'de', { numeric: true });
                });
                break;
            case 'default':
            default:
                break;
        }
        
        return sorted;
    }

    attachEventListeners() {
        if (this.openModalButton) {
            this.openModalButton.onclick = () => this.toggleModal(true);
        }
        if (this.confirmAddButton) {
            this.confirmAddButton.onclick = () => this.assignSelectedItems(this.eventId);
        }
    }

    toggleModal(show) {
        document.getElementById("addItemModal").style.display = show ? "flex" : "none";
    }

    UpdateQty = async (id, maxAvailable, input) => {
        let val = parseInt(input.value);
        // checks for minimum
        if (isNaN(val) || val < 1) {
            val = 1;
            input.value = 1;
        }
        else if (val > maxAvailable) {
            alert(`Nicht genügend Bestand! Maximal ${maxAvailable} verfügbar.`);
            val = maxAvailable;
            input.value = maxAvailable
        }

        await fetch('/api/update_assignment_qty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, anzahl: val })
        });

        await window.eventDetailManager.loadAssignedItems(
            window.eventDetailManager.eventId
        );
    }

    removeAssignment = async (id) => {
        if (!confirm("Gerät von Veranstaltung entfernen?")) return;
        await fetch('/api/remove_assignment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( {id} )
        });
        const container = document.getElementById("detail-context");
        window.eventDetailManager.loadAssignedItems(
            container.getAttribute("data-event-id")
        );
    }

    validateInput = (input, min, max) => {
        let val = parseInt(input.value);
        if (isNaN(val) || val < min) val = min;
        if (val > max) {
            alert(`Maximale verfügbare Menge (${max}) überschritten`);
            val = max;
        }
        input.value = val;
    }

    async assignSelectedItems(eventId) {
        const checkboxes = document.querySelectorAll(".inv-checkbox:checked");
        const promises = Array.from(checkboxes).map(cb => {
            const qty = document.getElementById(`qty-${cb.value}`).value;
            return fetch('/api/assign_item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_id: eventId, inventory_id: cb.value, anzahl: qty })
            });
        });
        await Promise.all(promises);
        this.toggleModal(false);
        this.loadAssignedItems(this.eventId);
    }

    async loadAssignedItems(eventId) {
        const res = await fetch(`/api/get_event_items/${eventId}`);
        this.assignedItems = await res.json();
        this.renderAssignedItems();
    }

    renderAssignedItems() {
        const sortedItems = this.applySorting(this.assignedItems, this.currentAssignedSort);
        const tbody = document.getElementById("assigned-body");

        tbody.innerHTML = "";
        sortedItems.forEach(item => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.gruppe}</td>
                <td>${item.name_id}</td>
                <td>${item.lagerort}</td>
                <td class="qty-column">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div class="number-wrapper" style="width: 80%;">
                            <button style="color: red;" class="qty-btn" onclick="this.nextElementSibling.stepDown(); this.nextElementSibling.dispatchEvent(new Event('change'))">-</button>
                                <input type="number" 
                                    value="${item.assigned_qty || 0}" 
                                    min="1" 
                                    max="${item.anzahl}"
                                    class="custom-number-input"
                                    onchange="UpdateQty(${item.assignment_id},${item.anzahl}, this)">
                            <button style="color: green;" class="qty-btn" onclick="this.previousElementSibling.stepUp(); this.previousElementSibling.dispatchEvent(new Event('change'))">+</button>
                        </div>
                        <small>/ ${item.anzahl}</small>
                    </div>
                </td>
                <td class="action-cell"><button class="del-icon icon" onclick="removeAssignment(${item.assignment_id})" title="Löschen"><img src="/static/images/delete.svg" alt="Löschen"></button></td>
            `;
            tbody.appendChild(tr);
        })
    }

    async loadInventoryChecklists() {
        const res = await fetch('/api/get_inventory');
        this.checklistItems = await res.json();
        this.renderChecklistItems();
    }

    renderChecklistItems() {
        const sortedItems = this.applySorting(this.checklistItems, this.currentChecklistSort);
        const listDiv = document.getElementById("inventory-checklist");

        listDiv.innerHTML = sortedItems.map(i => `
            <div class="check-item">
                <label>
                    <input type="checkbox" name="activeEvent" 
                        class="radio-input inv-checkbox" id="item-${i.id}" value="${i.id}">
                    <div class="radio-btn-custom">
                        <div class="radio-btn-inner"></div>
                    </div>
                </label>
                <label for="item-${i.id}" style="flex-grow:1;"><strong>${i.name_id}</strong> (${i.gruppe})</label>
                <div style="font-size: 0.8em; color: #666;">Verfügbar: ${i.anzahl}</div>


                <div class="number-wrapper" style="width: 8%;">
                    <button style="color: red;" class="qty-btn" onclick="this.nextElementSibling.stepDown(); this.nextElementSibling.dispatchEvent(new Event('change'))">-</button>
                        <input type="number" 
                            id="qty-${i.id}"
                            value="1" 
                            min="1" 
                            max="${i.anzahl}"
                            class="custom-number-input"
                            onblur="validateInput(this, 1, ${i.anzahl})">
                    <button style="color: green;" class="qty-btn" onclick="this.previousElementSibling.stepUp(); this.previousElementSibling.dispatchEvent(new Event('change'))">+</button>
                </div>                
            </div>
        `).join('');
    }
}


document.addEventListener("DOMContentLoaded", () => {
    window.eventDetailManager = new EventDatailManager();

    window.toggleModal = (show) => window.eventDetailManager.toggleModal(show);
    window.toggleSortModal = (modalId, show) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = show ? "flex" : "none";
    };
    window.UpdateQty = (id, maxAvailable, input) => window.eventDetailManager.UpdateQty(id, maxAvailable, input);
    window.removeAssignment = (id) => window.eventDetailManager.removeAssignment(id);
    window.validateInput = (input, min, max) => window.eventDetailManager.validateInput(input, min, max);
});