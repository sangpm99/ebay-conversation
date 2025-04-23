// 👉 Get all element from popup.html
document.addEventListener("DOMContentLoaded", () => {
    const tokenInput = document.getElementById("tokenInput");
    const storeIdInput = document.getElementById("storeIdInput");
    const timerInput = document.getElementById("timerInput");
    const startButton = document.getElementById("startButton");
    const finishButton = document.getElementById("finishButton");
    const production = document.getElementById("production");
    const development = document.getElementById("development");
    const btnRunning = document.getElementById("btnRunning");
    const btnNotStarted = document.getElementById("btnNotStarted");
    const cookies = document.getElementById("cookies");
    const copyCookies = document.getElementById("copyCookies");
    const userAgent = document.getElementById("userAgent");
    const copyUserAgent = document.getElementById("copyUserAgent");
    const csrfNonce = document.getElementById("csrfNonce");
    const copyCsrfNonce = document.getElementById("copyCsrfNonce");
    const startDateSpan = document.getElementById("startDateSpan");
    const sentSpan = document.getElementById("sentSpan");
    const sentSuccessSpan = document.getElementById("sentSuccessSpan");
    const sentFailSpan = document.getElementById("sentFailSpan");

    // 👉 Get value storage in localStorage to fill UI
    tokenInput.value = localStorage.getItem("token") || "";
    storeIdInput.value = localStorage.getItem("storeId") || "";
    timerInput.value = localStorage.getItem("timer") || "1080";
    const server = localStorage.getItem("server") || "production";
    if (server === "development") {
        development.checked = true;
        production.checked = false;
    } else {
        development.checked = false;
        production.checked = true;
    }
    cookies.value = localStorage.getItem("cookies") || "";
    userAgent.value = localStorage.getItem("userAgent") || "";
    csrfNonce.value = localStorage.getItem("csrfNonce") || "";
    startDateSpan.innerText = localStorage.getItem("startDateSpan") || ""
    sentSpan.innerText = localStorage.getItem("sentSpan") || "0"
    sentSuccessSpan.innerText = localStorage.getItem("sentSuccessSpan") || "0"
    sentFailSpan.innerText = localStorage.getItem("sentFailSpan") || "0"

    btnNotStarted.style.display = localStorage.getItem("btnNotStarted") || "inline-block";

    if(localStorage.getItem("status") === "running") {
        btnNotStarted.style.display = "none";
        btnRunning.style.display = "inline-block";
    } else {
        btnNotStarted.style.display = "inline-block";
        btnRunning.style.display = "none";
    }

    // 👉 Event when starting
    startButton.addEventListener("click", () => {
        onRunning();
        // 👉 First Run
        userAgent.value = "Please wait...";
        csrfNonce.value = "Please wait...";
        cookies.value = "Please wait...";

        startDateSpan.innerText = getTimeNow();
        sentSpan.innerText = "0";
        sentSuccessSpan.innerText = "0";
        sentFailSpan.innerText = "0";

        localStorage.setItem("token", tokenInput.value || "");
        localStorage.setItem("storeId", storeIdInput.value || "");
        localStorage.setItem("timer", timerInput.value || "1080");
        localStorage.setItem("server", development.checked ? "development" : "production");

        localStorage.setItem("startDateSpan", getTimeNow());
        localStorage.setItem("sentSpan", sentSpan.innerText || "0");
        localStorage.setItem("sentSuccessSpan", sentSuccessSpan.innerText || "0");
        localStorage.setItem("sentFailSpan", sentFailSpan.innerText || "0");

        const token = localStorage.getItem("token") || "";
        const storeId = localStorage.getItem("storeId") || "";
        const timer = Number(localStorage.getItem("timer")) || 1080;
        const server = localStorage.getItem("server") || "production";

        chrome.runtime.sendMessage({
            action: "startCookieExtractor",
            token,
            storeId,
            timer,
            server,
        });
    });

    finishButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "finishCookieExtractor" });
    });

    // 👉 Data response from background.js
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "sendData") {
            try {
                const data = message.data;
                console.log(data)
                userAgent.value = data.userAgent || "Data Not Found";
                csrfNonce.value = data.csrfNonce || "Data Not Found";
                cookies.value = data.cookies ? JSON.stringify(data.cookies) : "Data Not Found";
                sentSpan.innerText = data.sent;
                sentSuccessSpan.innerText = data.sentSuccess;
                sentFailSpan.innerText = data.sentFail;

                localStorage.setItem("userAgent", data.userAgent);
                localStorage.setItem("csrfNonce", data.csrfNonce);
                localStorage.setItem("cookies", JSON.stringify(data.cookies));
                localStorage.setItem("sentSpan", JSON.stringify(data.sent));
                localStorage.setItem("sentSuccessSpan", JSON.stringify(data.sentSuccess));
                localStorage.setItem("sentFailSpan", JSON.stringify(data.sentFail));
            } catch (error) {
                console.log(error);
            }
        }
        if(message.action === "finish") {
            onNotStart();
            sentSpan.innerText = "0";
            sentSuccessSpan.innerText = "0";
            sentFailSpan.innerText = "0";
            localStorage.setItem("sentSpan", "0");
            localStorage.setItem("sentSuccessSpan", "0");
            localStorage.setItem("sentFailSpan", "0");
        }
    });

    const onNotStart = () => {
        btnNotStarted.style.display = "inline-block";
        btnRunning.style.display = "none";
        localStorage.setItem("status", "notStarted");
    }

    const onRunning = () => {
        btnNotStarted.style.display = "none";
        btnRunning.style.display = "inline-block";
        localStorage.setItem("status", "running");
    }

    // 👉 Handle copy cookies
    copyCookies.addEventListener("click", () => {
        if (cookies.value) {
            navigator.clipboard.writeText(cookies.value);
        }
    });

    // 👉 Handle copy csrfNonce
    copyCsrfNonce.addEventListener("click", () => {
        if (csrfNonce.value) {
            navigator.clipboard.writeText(csrfNonce.value);
        }
    });

    // 👉 Handle copy userAgent
    copyUserAgent.addEventListener("click", () => {
        navigator.clipboard.writeText(userAgent.value);
    });
});

const getTimeNow = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    return(`${day}/${month}/${year}`);
}
