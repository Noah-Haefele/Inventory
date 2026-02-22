document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("detail-context");
    const EVENT_ID = container.getAttribute("data-event-id");

    loadAssignedItems(EVENT_ID);
    loadInventoryChecklist();

    document.getElementById("open-modal-btn").onclick = () => toggleModal(true);
    document.getElementById("confirm-bulk-add-btn").onclick = () => assignSelectedItems(EVENT_ID);
});

function toggleModal(show) {
    document.getElementById("addItemModal").style.display = show ? "flex" : "none";
}

async function loadInventoryChecklist() {
    const res = await fetch('/api/get_inventory');
    const items = await res.json();
    const listDiv = document.getElementById("inventory-checklist");

    listDiv.innerHTML = items.map(i => `
        <label class="assign-item-row-label">
            <div class="assign-item-row-checkbox-container">
                <input type="checkbox" id="item-${i.id}" value="${i.id}" class="inv-checkbox">
            </div>
            <div for="item-${i.id}" class="assign-item-row-name">
                <strong >${i.name_id}</strong> (${i.gruppe})
            </div>
            <div class="assign-item-row-qty">Verfügbar: ${i.anzahl}</div>
            <button class="count-minus"
                onclick="this.nextElementSibling.stepDown();
                this.nextElementSibling.dispatchEvent(new Event('change'))">
            -</button>
            <input type="number" id="qty-${i.id}" value="1" min="1" max="${i.anzahl}" 
                class="count-input" 
                onblur="validateInput(this, 1, ${i.anzahl})">
            <button class="count-plus"
                onclick="this.previousElementSibling.stepUp();
                this.previousElementSibling.dispatchEvent(new Event('change'))">
            +</button>
        </label>
    `).join('');
}

window.validateInput = (input, min, max) => {
    let val = parseInt(input.value);
    if (isNaN(val) || val < min) val = min;
    if (val > max) {
        alert(`Maximale verfügbare Menge (${max}) überschritten!`);
        val = max;
    }
    input.value = val;
};

window.UpdateQty = async (id, maxAvailable, input) => {
    let val = parseInt(input.value);
    // check for minimum
    if (isNaN(val) || val < 1) {
        val = 1;
        input.value = 1;
    }
    else if (val > maxAvailable) {
        alert(`Nicht genügend Bestand! Maximal ${maxAvailable} verfügbar.`);
        val = maxAvailable;
    }

    val = input.value;
    await fetch('/api/update_assignment_qty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, anzahl: val })
    });

    await loadAssignedItems(EVENT_ID);
};

async function assignSelectedItems(eventId) {
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
    toggleModal(false);
    loadAssignedItems(eventId);
}

async function loadAssignedItems(eventId) {
    const res = await fetch(`/api/get_event_items/${eventId}`);
    const items = await res.json();
    const tbody = document.getElementById("assigned-body");

    tbody.innerHTML = "";
    items.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="content">${item.gruppe}</td>
            <td class="content" style="color: var(--text-muted);">${item.name_id}</td>
            <td class="content">${item.lagerort}</td>
            <td class="qty-column">
                <button class="count-minus"
                    onclick="this.nextElementSibling.stepDown();
                    this.nextElementSibling.dispatchEvent(new Event('change'))">
                -</button>
                <input type="number" value="${item.assigned_qty}" min="1" max="${item.anzahl}" 
                    onchange="validateAndSaveQty(${item.assignment_id}, this, ${item.anzahl})" 
                    class="count-input">
                <button class="count-plus"
                    onclick="this.previousElementSibling.stepUp();
                    this.previousElementSibling.dispatchEvent(new Event('change'))">
                +</button>
                <small>/ ${item.anzahl}</small>               
            </td>
            <td class="content">
                <button class="delete-btn" onclick="removeAssignment(${item.assignment_id})">
                🗑</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.removeAssignment = async (id) => {
    if (!confirm("Gerät von Veranstaltung entfernen?")) return;
    await fetch('/api/remove_assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    const container = document.getElementById("detail-context");
    loadAssignedItems(container.getAttribute("data-event-id"));
};
