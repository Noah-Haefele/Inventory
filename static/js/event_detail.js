class EventDatailManager {
    constructor() {
        this.container = document.querySelector("#user-table tbody");
        if (this.container) {
            this.eventId = this.container.getAttribute("data-event-id");
        }

        this.openModalButton = document.getElementById("open-modal-btn");
        this.confirmAddButton = document.getElementById("confirm-bulk-add-btn");

        this.init();
    }

    init() {
        this.attachEventListeners();
    }

    attachEventListeners() {
        if (this.openModalButton) {
            this.openModalButton.onclick = () => console.log("Debug1")
        }
        if (this.confirmAddButton) {
            this.confirmAddButton.onclick = () => console.log("Debug2")
        }
    }
}


document.addEventListener("DOMContentLoaded", () => {
    new EventDatailManager();
});