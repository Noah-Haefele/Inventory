document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.querySelector("#user-table tbody");
    const addUserBtn = document.getElementById("add-user-btn");

    if (!tableBody) return;

    function attachUserEvents(cell) {
        const field = cell.getAttribute("data-field");
        if (!field) return;

        if (field === "password") {
            let realValue = "";
            cell.addEventListener("focus", () => { realValue = ""; cell.innerText = ""; });
            cell.addEventListener("input", () => {
                const text = cell.innerText.replace(/\n/g, "");
                const diff = text.length - realValue.length;
                if (diff > 0) realValue += text.slice(-diff);
                else if (diff < 0) realValue = realValue.slice(0, diff);
                cell.innerText = "•".repeat(realValue.length);
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(cell);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            });
            cell.addEventListener("blur", () => {
                if (realValue) saveUserData(cell, "password", realValue);
                cell.innerText = "••••••••";
                realValue = "";
            });
        } else {
            cell.addEventListener("blur", () => saveUserData(cell, field, cell.innerText.trim()));
        }
    }

    async function saveUserData(element, field, value) {
        const trimmed = value?.toString().trim();
        const id = element.closest("tr").getAttribute("data-id");
        if (trimmed) {
            const res = await fetch('/api/update_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, field, value })
            });
            if (!res.ok) {
                const data = await res.json();
                alert("FEHLER: " + data.error);
                location.reload(); // sets name to old 
            }
        }
        else {
            alert("FEHLER: Der Name darf nicht leer sein")
            location.reload(); // sets name to old
        }

    }

    if (addUserBtn) {
        addUserBtn.addEventListener("click", () => {
            fetch('/api/add_user', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    location.reload();
                });
        });
    }

    window.deleteRow = function (btn) {
        if (!confirm("Wirklich löschen?")) return;
        const row = btn.closest("tr");
        const id = row.getAttribute("data-id");
        fetch('/api/delete_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        }).then(() => row.remove());
    };

    window.updateRole = async function(selectElement) {
        const row = selectElement.closest("tr");
        const id = row.getAttribute("data-id");
        const value = selectElement.value;

        const res = await fetch('/api/update_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id: id, 
                field: 'role', 
                value: value 
            })
        });

        if (!res.ok) {
            const data = await res.json();
            alert("FEHLER beim Speichern der Rolle: " + data.error);
            location.reload();
        } else {
            console.log("Rolle erfolgreich aktualisiert");
        }
    };

    document.querySelectorAll("#user-table [contenteditable]").forEach(attachUserEvents);
});