const backendURL = "http://localhost:5001";

// -------------------------
// SIDEBAR
// -------------------------
function toggleSidebar() {
    document.getElementById("userSidebar").classList.toggle("open");
}

// -------------------------
// GOOGLE LOGIN
// -------------------------
function manualGoogleLogin() {
    google.accounts.id.prompt();  
}

function handleCredentialResponse(response) {
    fetch(`${backendURL}/api/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) return alert("Google Login Failed");

            localStorage.setItem("email", data.email);
            localStorage.setItem("name", data.name);
            localStorage.setItem("picture", data.picture);

            document.getElementById("userName").innerText = data.name;
            document.getElementById("userEmail").innerText = data.email;
            document.getElementById("profilePic").src = data.picture;

            document.getElementById("signOutBtn").style.display = "block";
            document.getElementById("showLoginBtn").style.display = "none";

            alert("Login Successful!");
        });
}

// -------------------------
// SIGN OUT
// -------------------------
function signOut() {
    localStorage.clear();
    location.reload();
}

// -------------------------
// FETCH COUNTRY DATA
// -------------------------
async function getData() {
    const country = document.getElementById("searchInput").value.trim();
    if (!country) return alert("Enter a country");

    const res = await fetch(`${backendURL}/api/data?country=${country}`);
    const data = await res.json();

    if (!data.success) return alert("Country not found");

    document.getElementById("flagBox").innerHTML = `<img src="${data.flag}" class="flag-img">`;

    document.getElementById("resultBox").innerHTML = `
        <h2>🌍 ${data.country}</h2>
        <p><strong>Travel Safety:</strong> ${data.safety}</p>
        <p><strong>AQI:</strong> ${data.aqi} (${data.category})</p>
        <p><strong>Temperature:</strong> ${data.temperature}°C</p>
        <p><strong>Weather:</strong> ${data.weather}</p>
    `;

    window.latestResult = data;

    document.getElementById("flagBox").classList.remove("hidden");
    document.getElementById("resultBox").classList.remove("hidden");
}

// -------------------------
// SAVE HISTORY
// -------------------------
async function saveData() {
    if (!window.latestResult) return alert("Search first!");

    const email = localStorage.getItem("email");
    if (!email) return alert("Log in to save!");

    await fetch(`${backendURL}/api/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...latestResult, email })
    });

    alert("Saved!");
}

// -------------------------
// LOAD HISTORY
// -------------------------
async function loadHistory() {
    const email = localStorage.getItem("email");
    if (!email) return alert("Login first!");

    const res = await fetch(`${backendURL}/api/history?email=${email}`);
    const data = await res.json();

    document.getElementById("historyBox").innerHTML =
        data.map(item => `
        <div class="historyItem">
            <p><b>${item.country}</b> (${item.category})</p>
            <p>AQI: ${item.aqi}</p>
            <p>${new Date(item.date).toLocaleString()}</p>
        </div>
    `).join("");

    document.getElementById("historyBox").classList.remove("hidden");
}

window.onload = () => {
    const name = localStorage.getItem("name");
    const email = localStorage.getItem("email");
    const picture = localStorage.getItem("picture");

    if (email) {
        document.getElementById("userName").innerText = name;
        document.getElementById("userEmail").innerText = email;
        document.getElementById("profilePic").src = picture;

        document.getElementById("signOutBtn").style.display = "block";
        document.getElementById("showLoginBtn").style.display = "none";
    }
};
