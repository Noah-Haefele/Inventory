// if page was succesfully opened and all html pages loaded
document.addEventListener("DOMContentLoaded", () => {
    loadEvents();
    const addBtn = document.getElementById("add-event-btn");
    if (addBtn) {
        addBtn.addEventListener("click", async () => { // always listens on addEventListener button
            await fetch('/api/add_event', { method: 'POST' });
            loadEvents();
        });
    }
});

async function loadEvents() {
    // load users and events in parallel
    const [eventsRes, usersRes] = await Promise.all([ // stopps code until all data has completly arrived
        fetch('/api/get_events'),
        fetch('/api/get_users')
    ]);

    const events = await eventsRes.json();
    const allUsers = await usersRes.json();

    const tbody = document.getElementById("events-table-body");
    tbody.innerHTML = "";

    // creates row for each event
    events.forEach(evt => {
        const tr = document.createElement("tr"); // creates new row 
        if (evt.is_active) tr.classList.add("active-row");

        // selectbox for responsible persons
        let userOptions = allUsers.map(u => // .map checks every entry in array allUsers
            `<option value="${u}" ${evt.verantwortlich === u ? 'selected' : ''}>${u}</option>`
        ).join("");


        tr.innerHTML = `
            <td>
                <input type="date" 
                    value="${evt.datum}" 
                    class="date-picker-input" 
                    onchange="updateEvent(${evt.id}, 'datum', this.value)">
            </td>
            <td contenteditable="true" onblur="updateEvent(${evt.id}, 'name', this.innerText)">${evt.name}</td>
            <td contenteditable="true" onblur="updateEvent(${evt.id}, 'ort', this.innerText)">${evt.ort}</td>
            <td>
                <select class="role-select" onchange="updateEvent(${evt.id}, 'verantwortlich', this.value)">
                    <option value="-" ${evt.verantwortlich === '-' ? 'selected' : ''}>- kein -</option>
                    ${userOptions}
                </select>
            </td>
            <td contenteditable="true" onblur="updateEvent(${evt.id}, 'info', this.innerText)">${evt.info}</td>
            <td class="action-cell">
                <input type="radio" name="activeEvent" 
                       ${evt.is_active ? 'checked data-waschecked="true"' : 'data-waschecked="false"'} 
                       onclick="toggleActiveEvent(this, ${evt.id})">
                <button class="action-icon" onclick="window.location.href='/event_detail/${evt.id}'">👁</button>
                <button class="del-icon" onclick="deleteEvent(${evt.id})">🗑</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.toggleActiveEvent = async (radio, id) => {
    const wasChecked = radio.dataset.waschecked === "true";

    if (wasChecked) {
        // deactivate
        radio.checked = false;
        radio.dataset.waschecked = "false";
        await fetch('/api/set_active_event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: null })
        });
    } else {
        // deactivate all
        document.querySelectorAll('input[name="activeEvent"]').forEach(r => {
            r.dataset.waschecked = "false";
        });
        // activate one
        radio.dataset.waschecked = "true";
        await fetch('/api/set_active_event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
    }
    loadEvents(); // reload table for highlighting
};

function updateEvent(id, field, value) {
    const trimmed = value?.toString().trim();
    if (trimmed) {
        fetch('/api/update_event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, field, value: value.trim() })
        });
    }
    else {
        alert("FEHLER: Der Name darf nicht leer sein")
        location.reload(); // sets name to old
    }
}

async function deleteEvent(id) {
    if (!confirm("Event wirklich löschen?")) return;
    await fetch('/api/delete_event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    loadEvents();
}