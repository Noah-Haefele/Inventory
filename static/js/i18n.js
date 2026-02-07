const language = navigator.language || "en";
const lang = language.toLowerCase().startsWith("de") ? "de" : "en";

const translation = {
    de: {
        // navbar
        title: "Inventur",
        home: "Startseite",
        events: "Veranstaltungen",
        userManagement: "Benutzerverwaltung",
        loggedInAs: "Angemeldet als",
        logOutBtn: "Abmelden",
        // table
        infoC: "Info",
        actionC: "Aktionen",
        deletB: "Löschen"
    },
    en: {
        // navbar
        title: "Inventory",
        home: "Home",
        events: "Events",
        userManagement: "User Management",
        loggedInAs: "Logged in as",
        logOutBtn: "Logout",
        // table
        infoC: "Info",
        actionC: "Actions",
        deletB: "Delete"
    }
}

function t(key) {
    return translation[lang][key] ?? key;
}

export { lang, t };