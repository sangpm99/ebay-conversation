let intervalId = null;
const dev = "https://api.cyberonegate.com";
const pro = "https://api.2hglobalstore.com";
let token = "";
let storeId = "";
let timer = 1080;
let server = "production";
const delayTime = 10000;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startCookieExtractor") {
        token = message.token;
        storeId = message.storeId;
        timer = Number(message.timer);
        server = message.server;

        chrome.tabs.query({ }, (tabs) => {
            (async () => {
                const executeProcess = async () => {
                    try {
                        const storageData = await new Promise(resolve =>
                            chrome.storage.local.get(["sentSpan", "sentSuccessSpan", "sentFailSpan"], resolve)
                        );

                        let sent = Number(storageData.sentSpan || 0);
                        let sentSuccess = Number(storageData.sentSuccessSpan || 0);
                        let sentFail = Number(storageData.sentFailSpan || 0);

                        const etsyTab = tabs.find(tab => tab.url && tab.url.includes("https://www.ebay.com"));

                        if (!etsyTab) {
                            console.error("Không tìm thấy tab Ebay nào.");
                            return;
                        }

                        await new Promise((resolve) => {
                            chrome.tabs.reload(etsyTab.id, { bypassCache: true }, resolve);
                        });

                        await new Promise(resolve => setTimeout(resolve, delayTime));

                        const checkDataReady = async () => {
                            while (true) {
                                const domResult = await new Promise(resolve => {
                                    chrome.scripting.executeScript({
                                        target: { tabId: etsyTab.id },
                                        function: handleInteractDOM
                                    }, (result) => resolve(result));
                                });

                                // Phần xử lý cookies và gửi dữ liệu cũ
                                const domData = domResult[0]?.result || {};

                                const cookies = await Promise.all([
                                    getCookies("www.ebay.com"),
                                    getCookies(".ebay.com")
                                ]).then(arr => arr.flat());

                                // Kiểm tra dữ liệu DOM và cookies có đủ không
                                if (domData.csrfNonce && domData.userAgent) {
                                    return { domData, cookies }; // 👈 Dừng lặp nếu dữ liệu đủ
                                }

                                // Chờ 1s trước khi kiểm tra lại (có thể điều chỉnh)
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }

                        // Chờ đến khi dữ liệu sẵn sàng
                        const { domData, cookies } = await checkDataReady();

                        const isDone = await sendApi(cookies, domData.userAgent, domData.csrfNonce);

                        await chrome.storage.local.set({
                            sentSpan: JSON.stringify(sent + 1),
                            sentSuccessSpan: JSON.stringify(isDone ? sentSuccess + 1 : sentSuccess),
                            sentFailSpan: JSON.stringify(isDone ? sentFail : sentFail + 1)
                        });

                        if(isDone) {
                            await chrome.runtime.sendMessage({
                                action: "sendData",
                                data: {
                                    ...domData,
                                    cookies,
                                    sent: sent + 1,
                                    sentSuccess: sentSuccess + 1,
                                    sentFail
                                }
                            });
                        } else {
                            await chrome.runtime.sendMessage({
                                action: "sendData",
                                data: {
                                    ...domData,
                                    cookies,
                                    sent: sent + 1,
                                    sentSuccess,
                                    sentFail: sentFail + 1
                                }
                            });
                        }
                    } catch (error) {
                        console.error("Lỗi trong quá trình xử lý:", error);
                    }
                }

                await executeProcess();

                intervalId = setInterval(
                    executeProcess,
                    timer * 60 * 1000
                );
            })()
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ error: error.message }))
                .finally(() => sendResponse({ finished: true })); // 👉 Keep chanel always close
        });
        return true; // 👉 Keep chanel always open
    }

    if (message.action === "finishCookieExtractor") {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            console.log("Stopped interval time");
        }
        chrome.storage.local.set({
            sentSpan: "0",
            sentSuccessSpan: "0",
            sentFailSpan: "0"
        });
        chrome.runtime.sendMessage({
            action: "finish",
        });
        return true;
    }
});

// 👉 Get Element from DOM
const handleInteractDOM = () => {
    // 👉 Get user agent
    const agent = navigator.userAgent;
    // 👉 Get csrfNonce
    let scriptTags = document.querySelectorAll('script');
    let srtValue = null;

    scriptTags.forEach(script => {
        if (script.textContent.includes('"srt":"')) {
            let match = script.textContent.match(/"srt":"([^"]+)"/);
            if (match && match[1]) {
                srtValue = match[1];
            }
        }
    });
    const csrf = srtValue || "No Data";

    return {
        csrfNonce: csrf,
        userAgent: agent,
    }
}

const getCookies = (domain) => {
    return new Promise(resolve => {
        chrome.cookies.getAll({ domain }, resolve);
    });
};

const sendApi = async (cookies, userAgent, csrfNonce) => {
    let urlApi = server === "development" ? dev : pro;
    const query = {
        keyword: "credentials",
        value: JSON.stringify({
            cookies: JSON.stringify(cookies),
            userAgent: userAgent,
            csrfNonce: csrfNonce
        })
    }
    try {
        const res = await fetch(`${urlApi}/Store/UpdateMetadata/${storeId}`, {
            method: "PUT",
            body: JSON.stringify(query),
            headers: {
                "Content-Type": "application/json",
                Authorization: token
            }
        })
        return res.status >= 200 && res.status <= 299;
    } catch (err) {
        return false;
    }
}
