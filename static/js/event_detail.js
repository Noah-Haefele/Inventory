class EventDatailManager {
    constructor() {
        this.container = document.getElementById("detail-context");
        if (this.container) {
            this.eventId = this.container.getAttribute("data-event-id");
        }

        this.openModalButton = document.getElementById("open-modal-btn");
        this.confirmAddButton = document.getElementById("confirm-bulk-add-btn");

        this.loadAssignedItems(this.eventId);
        this.loadInventoryChecklists();
        this.init();
    }

    init() {
        this.attachEventListeners();
    }

    attachEventListeners() {
        if (this.openModalButton) {
            this.openModalButton.onclick = () => this.toggleModal(true);
        }
        if (this.confirmAddButton) {
            this.confirmAddButton.onclick = () => this.assignSelectedItems(this.eventId);
        }
    }

    static toggleModal(show) {
        document.getElementById("addItemModal").style.display = show ? "flex" : "none";
    }

    static UpdateQty = async (id, maxAvailable, input) => {
        let val = parseInt(input.value);
        // checks for minimum
        if (isNaN(val) || val < 1) {
            val = 1;
            input.value = 1;
        }
        else if (val > maxAvailable) {
            alert(`Nicht genügend Bestand! Maximal ${maxAvailable} verfügbar.`);
            val = maxAvailable;
        }
        else {
            val = input.value;
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

    static removeAssignment = async (id) => {
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

    static validateInput = (input, min, max) => {
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
        EventDatailManager.toggleModal(false);
        this.loadAssignedItems(this.eventId);
    }

    async loadAssignedItems(eventId) {
        const res = await fetch(`/api/get_event_items/${eventId}`);
        const items = await res.json();
        const tbody = document.getElementById("assigned-body");

        tbody.innerHTML = "";
        items.forEach(item => {
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
                <td><button style="width: 100%; height: 100%;" class="del-icon" onclick="removeAssignment(${item.assignment_id})" title="Löschen">🗑</button></td>
            `;
            tbody.appendChild(tr);
        })
    }

    async loadInventoryChecklists() {
        const res = await fetch('/api/get_inventory');
        const items = await res.json();
        const listDiv = document.getElementById("inventory-checklist");

        listDiv.innerHTML = items.map(i => `
            <div class="check-item">
                <input type="checkbox" id="item-${i.id}" value="${i.id}" class="inv-checkbox">
                <label for="item-${i.id}" style="flex-grow:1;"><strong>${i.name_id}</strong> (${i.gruppe})</label>
                <div style="font-size: 0.8em; color: #666;">Verfügbar: ${i.anzahl}</div>
                <input type="number" id="qty-${i.id}" value="1" min="1" max="${i.anzahl}" 
                    class="qty-input" 
                    onblur="validateInput(this, 1, ${i.anzahl})">
            </div>
        `).join('');
    }
}


document.addEventListener("DOMContentLoaded", () => {
    window.eventDetailManager = new EventDatailManager();

    window.toggleModal = EventDatailManager.toggleModal;
    window.UpdateQty = EventDatailManager.UpdateQty;
    window.removeAssignment = EventDatailManager.removeAssignment;
    window.validateInput = EventDatailManager.validateInput;
});