class EventManagement {
    constructor() {
        // Select table body and add event button
        this.tableBody = document.getElementById("events-table-body");
        this.addEventButton = document.getElementById("add-event-btn");

        // Initialize the class
        this.init();
    }

    init() {
        // Ensure table body exists before setting up
        if (!this.tableBody) return;

        // Attach event listeners and load initial events
        this.attachEventListeners();
        this.loadEvents();
    }

    attachEventListeners() {
        // Add event listener to "Add Event" button
        if (this.addEventButton) {
            this.addEventButton.addEventListener("click", () => this.addEvent());
        }
    }

    async loadEvents() {
        try {
            // Fetch events and users in parallel
            const [eventsRes, usersRes] = await Promise.all([
                fetch('/api/get_events'),
                fetch('/api/get_users')
            ]);

            // Parse JSON responses
            const events = await eventsRes.json();
            const allUsers = await usersRes.json();

            // Clear existing table rows
            this.tableBody.innerHTML = "";

            // Populate table with events
            events.forEach(evt => this.createEventRow(evt, allUsers));
        } catch (error) {
            console.error("Error loading events:", error);
            this.showError("Fehler beim Laden der Veranstaltungen");
        }
    }

    createEventRow(evt, allUsers) {
        // Create user options for dropdown
        const userOptions = allUsers.map(u => 
            `<option value="${u}" ${evt.verantwortlich === u ? 'selected' : ''}>${u}</option>`
        ).join("");

        // Create row element
        const tr = document.createElement("tr");
        tr.classList.toggle("active-row", evt.is_active);
        tr.dataset.id = evt.id;  // Add data-id for easier reference

        // Populate row with event details
        tr.innerHTML = `
            <td>
                <input type="date" 
                    value="${evt.datum}" 
                    class="date-picker-input" 
                    onchange="window.updateEvent(${evt.id}, 'datum', this.value)">
            </td>
            <td contenteditable="true" data-field="name" onblur="window.updateEvent(${evt.id}, 'name', this.innerText)">${evt.name}</td>
            <td contenteditable="true" data-field="ort" onblur="window.updateEvent(${evt.id}, 'ort', this.innerText)">${evt.ort}</td>
            <td>
                <select class="role-select" onchange="window.updateEvent(${evt.id}, 'verantwortlich', this.value)">
                    <option value="-" ${evt.verantwortlich === '-' ? 'selected' : ''}>- kein -</option>
                    ${userOptions}
                </select>
            </td>
            <td contenteditable="true" data-field="info" onblur="window.updateEvent(${evt.id}, 'info', this.innerText)">${evt.info}</td>
            <td class="action-cell">
                <input type="radio" name="activeEvent" 
                       ${evt.is_active ? 'checked data-waschecked="true"' : 'data-waschecked="false"'} 
                       onclick="window.toggleActiveEvent(this, ${evt.id})" title="Aktivieren">
                <button class="action-icon" onclick="window.location.href='/event_detail/${evt.id}'" title="Detail">👁</button>
                <button class="del-icon" onclick="window.deleteEvent(${evt.id})" title="Löschen">🗑</button>
            </td>
        `;

        // Append row to table body
        this.tableBody.appendChild(tr);
    }

    async addEvent() {
        try {
            const response = await fetch('/api/add_event', { method: 'POST' });
            
            // Optional: Check response and handle accordingly
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
    // Create global instance of EventManagement
    window.eventManager = new EventManagement();

    // Make static methods globally accessible
    window.updateEvent = EventManagement.updateEvent;
    window.toggleActiveEvent = EventManagement.toggleActiveEvent;
    window.deleteEvent = EventManagement.deleteEvent;
});
