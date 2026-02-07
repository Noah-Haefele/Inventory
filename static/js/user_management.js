class UserManagement {
    constructor() {
        this.tableBody = document.querySelector("#user-table tbody");
        this.addUserBtn = document.getElementById("add-user-btn");
        
        this.init();
    }

    init() {
        if (!this.tableBody) return;

        this.attachEventListeners();
        this.initEditableCells();
    }

    attachEventListeners() {
        if (this.addUserBtn) {
            this.addUserBtn.addEventListener("click", () => this.addUser());
        }
    }

    initEditableCells() {
        const editableCells = document.querySelectorAll("#user-table [contenteditable]");
        editableCells.forEach(cell => this.setupCellEvents(cell));
    }

    setupCellEvents(cell) {
        const field = cell.getAttribute("data-field");
        if (!field) return;

        if (field === "password") {
            this.setupPasswordCellEvents(cell);
        } else {
            cell.addEventListener("blur", () => this.saveUserData(cell, field, cell.innerText.trim()));
        }
    }

    setupPasswordCellEvents(cell) {
        let realValue = "";

        cell.addEventListener("focus", () => {
            realValue = "";
            cell.innerText = "";
        });

        cell.addEventListener("input", () => {
            const text = cell.innerText.replace(/\n/g, "");
            const diff = text.length - realValue.length;

            if (diff > 0) {
                realValue += text.slice(-diff);
            } else if (diff < 0) {
                realValue = realValue.slice(0, diff);
            }

            cell.innerText = "•".repeat(realValue.length);
            this.moveCursorToEnd(cell);
        });

        cell.addEventListener("blur", () => {
            if (realValue) {
                this.saveUserData(cell, "password", realValue);
            }
            cell.innerText = "••••••••";
            realValue = "";
        });
    }

    moveCursorToEnd(element) {
        const range = document.createRange();
        const selection = window.getSelection();
        
        range.selectNodeContents(element);
        range.collapse(false);
        
        selection.removeAllRanges();
        selection.addRange(range);
    }

    async saveUserData(element, field, value) {
        const trimmedValue = value?.toString().trim();
        const row = element.closest("tr");
        const id = row.getAttribute("data-id");

        if (!trimmedValue) {
            this.showError("Der Name darf nicht leer sein");
            return;
        }

        try {
            const response = await fetch('/api/update_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, field, value: trimmedValue })
            });

            if (!response.ok) {
                const errorData = await response.json();
                this.showError(errorData.error);
            }
        } catch (error) {
            this.showError("Ein Fehler ist aufgetreten");
            console.error("Update error:", error);
        }
    }

    async addUser() {
        try {
            const response = await fetch('/api/add_user', { method: 'POST' });
            const data = await response.json();
            location.reload();
        } catch (error) {
            this.showError("Benutzer konnte nicht hinzugefügt werden");
            console.error("Add user error:", error);
        }
    }

    showError(message) {
        alert(`FEHLER: ${message}`);
        location.reload();
    }

    // Global methods for onclick events in HTML
    static deleteRow(btn) {
        if (!confirm("Wirklich löschen?")) return;
        
        const row = btn.closest("tr");
        const id = row.getAttribute("data-id");

        fetch('/api/delete_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        })
        .then(response => {
            if (response.ok) {
                row.remove();
            } else {
                throw new Error('Deletion failed');
            }
        })
        .catch(error => {
            console.error("Delete user error:", error);
            alert("FEHLER: Benutzer konnte nicht gelöscht werden");
        });
    }

    static async updateRole(selectElement) {
        const row = selectElement.closest("tr");
        const id = row.getAttribute("data-id");
        const value = selectElement.value;

        try {
            const response = await fetch('/api/update_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: id, 
                    field: 'role', 
                    value: value 
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(`FEHLER beim Speichern der Rolle: ${errorData.error}`);
                location.reload();
            } else {
                console.log("Rolle erfolgreich aktualisiert");
            }
        } catch (error) {
            console.error("Update role error:", error);
            alert("FEHLER: Rolle konnte nicht aktualisiert werden");
        }
    }
}

// Initialize the user management when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Make static methods globally accessible
    window.deleteRow = UserManagement.deleteRow;
    window.updateRole = UserManagement.updateRole;

    // Create instance of UserManagement
    new UserManagement();
});
