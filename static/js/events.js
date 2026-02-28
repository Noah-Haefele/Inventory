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
            <td class="content" style="font-size: 14px; line-height: 20px; white-space: nowrap;">
                <input type="date" 
                    style="color: #36454F; border-width: 1px; border-color: var(--border-color); background-color: var(--bg-card); color: var(--text-main); font-size: 12px; line-height: 16px; padding-left: 8px; padding-right: 8px; padding-top: 4px; padding-bottom: 4px; border-radius: 6px; outline: none; transition: all 0.2s ease-in-out; width: 128px;"
                    value="${evt.datum}"
                    onchange="updateEvent(${evt.id}, 'datum', this.value)">
            </td>
            <td class="content" style="font-size: 14px; line-height: 20px; color: var(--text-main); font-weight: 600;" contenteditable="true" onblur="updateEvent(${evt.id}, 'name', this.innerText)">${evt.name}</td>
            <td class="content" style="font-size: 14px; line-height: 20px; color: var(--text-muted);" contenteditable="true" onblur="updateEvent(${evt.id}, 'ort', this.innerText)">${evt.ort}</td>
            <td class="content" style="font-size: 14px; line-height: 20px;">
                <select style="color: #36454F; border-width: 1px; border-color: var(--border-color); background-color: var(--bg-card); color: var(--text-main); font-size: 12px; line-height: 16px; padding-left: 8px; padding-right: 8px; padding-top: 4px; padding-bottom: 4px; border-radius: 6px; outline: none; transition: all 0.2s ease-in-out; width: 128px;" onchange="updateEvent(${evt.id}, 'verantwortlich', this.value)">
                    <option value="-" ${evt.verantwortlich === '-' ? 'selected' : ''}>- kein -</option>
                    ${userOptions}
                </select>
            </td>
            <td style="font-size: 14px; line-height: 20px; color: var(--text-muted);" class="content" contenteditable="true" onblur="updateEvent(${evt.id}, 'info', this.innerText)">${evt.info}</td>
            <td style="text-align: right;" white-space: nowrap;" class="content actions">
                <div style="display: flex; align-items: center; justify-content: center; margin-left: 20px;">
                    <label style="display: flex; position: relative; align-items: center; cursor: pointer;">
                        <input type="checkbox" name="activeEvent"
                            class="radio-input" 
                            ${evt.is_active ? 'checked data-waschecked="true"' : 'data-waschecked="false"'} 
                            onclick="toggleActiveEvent(this, ${evt.id})">
                        <div class="radio-btn-custom">
                            <div class="radio-btn-inner"></div>
                        </div>
                    </label>
                    <div style="display: flex; align-items: center; margin-left: 12px;" >
                        <button class="action-icon" onclick="window.location.href='/event_detail/${evt.id}'">👁</button>
                        <button class="delete-btn" style="margin-left: 12px;" onclick="deleteEvent(${evt.id})">🗑</button>
                    </div>
                </div>
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