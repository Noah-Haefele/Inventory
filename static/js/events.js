class EventManagement {
    constructor() {
        // Select table body and add event button
        this.tableBody = document.getElementById("events-table-body");
        this.addEventButton = document.getElementById("add-event-btn");

        this.init();
    }

    init() {
        if (!this.tableBody) return;

        // Attach event listeners and load initial events
        this.attachEventListeners();
        this.loadEvents();
    }

    attachEventListeners() {
        if (this.addEventButton) {
            this.addEventButton.addEventListener("click", () => this.addEvent());
        }
    }

    async loadEvents() {
        try {
            const [eventsRes, usersRes] = await Promise.all([
                fetch('/api/get_events'),
                fetch('/api/get_users')
            ]);

            const events = await eventsRes.json();
            const allUsers = await usersRes.json();

            this.tableBody.innerHTML = "";

            events.forEach(evt => this.createEventRow(evt, allUsers));
        } catch (error) {
            console.error("Error loading events:", error);
            this.showError("Fehler beim Laden der Veranstaltungen");
        }
    }

    createEventRow(evt, allUsers) {
        const userOptions = allUsers.map(u => 
            `<option value="${u}" ${evt.verantwortlich === u ? 'selected' : ''}>${u}</option>`
        ).join("");

        const tr = document.createElement("tr");
        tr.classList.toggle("active-row", evt.is_active);
        tr.dataset.id = evt.id;  // Add data-id for easier reference

        tr.innerHTML = `
            <td>
                <input type="date" 
                    value="${evt.datum}" 
                    class="select date-picker-input" 
                    onchange="window.updateEvent(${evt.id}, 'datum', this.value)">
            </td>
            <td contenteditable="true" data-field="name" onblur="window.updateEvent(${evt.id}, 'name', this.innerText)">${evt.name}</td>
            <td contenteditable="true" data-field="ort" onblur="window.updateEvent(${evt.id}, 'ort', this.innerText)">${evt.ort}</td>
            <td>
                <select class="select" onchange="window.updateEvent(${evt.id}, 'verantwortlich', this.value)">
                    <option value="-" ${evt.verantwortlich === '-' ? 'selected' : ''}>- kein -</option>
                    ${userOptions}
                </select>
            </td>
            <td contenteditable="true" data-field="info" onblur="window.updateEvent(${evt.id}, 'info', this.innerText)">${evt.info}</td>
            <td class="action-cell">
                <label>
                    <input type="checkbox" name="activeEvent" 
                        class="radio-input"
                        ${evt.is_active ? 'checked data-waschecked="true"' : 'data-waschecked="false"'} 
                        onclick="window.toggleActiveEvent(this, ${evt.id})" title="Aktivieren">
                    <div class="radio-btn-custom">
                        <div class="radio-btn-inner"></div>
                    </div>
                </label>
                <button class="icon" onclick="window.location.href='/event_detail/${evt.id}'" title="Detail"><img src="/static/images/edit.svg" alt="Detail"></button>
                <button class="del-icon icon" onclick="window.deleteEvent(${evt.id})" title="Löschen"><img src="/static/images/delete.svg" alt="Löschen"></button>
            </td>
        `;

        this.tableBody.appendChild(tr);
    }

    async addEvent() {
        try {
            const response = await fetch('/api/add_event', { method: 'POST' });
            
            if (!response.ok) {
                throw new Error('Failed to add event');
            }

            // Reload events after adding
            this.loadEvents();
        } catch (error) {
            console.error("Add event error:", error);
            this.showError("Veranstaltung konnte nicht hinzugefügt werden");
        }
    }

    showError(message) {
        alert(`FEHLER: ${message}`);
    }

    // Static methods for global access
    static async updateEvent(id, field, value) {
        const trimmedValue = value?.toString().trim();
        
        if (!trimmedValue) {
            alert("FEHLER: Der Name darf nicht leer sein");
            location.reload();
            return;
        }

        try {
            const response = await fetch('/api/update_event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, field, value: trimmedValue })
            });

            if (!response.ok) {
                throw new Error('Update failed');
            }
        } catch (error) {
            console.error("Update event error:", error);
            alert("FEHLER: Aktualisierung fehlgeschlagen");
        }
    }

    static async toggleActiveEvent(radio, id) {
        const wasChecked = radio.dataset.waschecked === "true";

        try {
            // Deactivate all events
            document.querySelectorAll('input[name="activeEvent"]').forEach(r => {
                r.dataset.waschecked = "false";
                r.checked = false;
            });

            // Activate or deactivate specific event
            if (!wasChecked) {
                radio.checked = true;
                radio.dataset.waschecked = "true";
            }

            // Send update to server
            const response = await fetch('/api/set_active_event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: wasChecked ? null : id })
            });

            if (!response.ok) {
                throw new Error('Toggle active event failed');
            }

            // Reload events to reflect changes
            window.eventManager.loadEvents();
        } catch (error) {
            console.error("Toggle active event error:", error);
            alert("FEHLER: Änderung des aktiven Events fehlgeschlagen");
        }
    }

    static async deleteEvent(id) {
        if (!confirm("Event wirklich löschen?")) return;

        try {
            const response = await fetch('/api/delete_event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (!response.ok) {
                throw new Error('Delete event failed');
            }

            // Reload events after deletion
            window.eventManager.loadEvents();
        } catch (error) {
            console.error("Delete event error:", error);
            alert("FEHLER: Veranstaltung konnte nicht gelöscht werden");
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    window.eventManager = new EventManagement();

    window.updateEvent = EventManagement.updateEvent;
    window.toggleActiveEvent = EventManagement.toggleActiveEvent;
    window.deleteEvent = EventManagement.deleteEvent;
});
