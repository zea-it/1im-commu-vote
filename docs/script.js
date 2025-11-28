// ==========================================
// 🔴 แก้ไขการตั้งค่าตรงนี้ 🔴
const SCRIPT_URL = "[https://script.google.com/macros/s/AKfycbxzBP1KTOwKYil3v-OOE6o3fwXchmP9MnU29Nx5uqyrRod9aI7YycaxTRN0eogfBLy64g/exec](https://script.google.com/macros/s/AKfycbxzBP1KTOwKYil3v-OOE6o3fwXchmP9MnU29Nx5uqyrRod9aI7YycaxTRN0eogfBLy64g/exec)"; 
const CLIENT_ID = "1435981351290409103"; 
// ==========================================

const REDIRECT_URI = window.location.href.split('?')[0]; 

let sessionKey = localStorage.getItem("vote_session_key");
let userProfile = JSON.parse(localStorage.getItem("vote_user_profile") || "null");
let isVotingOpen = false;
let allItems = []; let allComments = []; 
let currentImageIndex = 0; let serverStatusGlobal = "WAITING"; 

// Image Zoom Variables
let currentScale = 1; let isDragging = false;
let startX, startY, translateX = 0, translateY = 0;
const imgElement = document.getElementById("img01");

function zoomImage(step) {
    currentScale += step;
    if (currentScale < 1) currentScale = 1; 
    if (currentScale > 5) currentScale = 5;
    updateTransform();
}
function resetZoom() { currentScale = 1; translateX = 0; translateY = 0; updateTransform(); }
function updateTransform() {
    imgElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
    imgElement.style.cursor = currentScale > 1 ? "grab" : "default";
}

imgElement.addEventListener('mousedown', (e) => {
    if (currentScale > 1) { isDragging = true; startX = e.clientX - translateX; startY = e.clientY - translateY; imgElement.style.cursor = "grabbing"; }
});
window.addEventListener('mousemove', (e) => {
    if (isDragging) { e.preventDefault(); translateX = e.clientX - startX; translateY = e.clientY - startY; updateTransform(); }
});
window.addEventListener('mouseup', () => { isDragging = false; if(currentScale > 1) imgElement.style.cursor = "grab"; });
imgElement.addEventListener('touchstart', (e) => {
    if (currentScale > 1 && e.touches.length === 1) { isDragging = true; startX = e.touches[0].clientX - translateX; startY = e.touches[0].clientY - translateY; }
});
window.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) { translateX = e.touches[0].clientX - startX; translateY = e.touches[0].clientY - startY; updateTransform(); }
});
window.addEventListener('touchend', () => { isDragging = false; });

function toggleFullScreen() {
    const modal = document.getElementById("modal");
    if (!document.fullscreenElement) {
        if(modal.requestFullscreen) modal.requestFullscreen();
        else if(modal.webkitRequestFullscreen) modal.webkitRequestFullscreen();
    } else { if(document.exitFullscreen) document.exitFullscreen(); }
}

function toggleCommentSheet() {
    document.getElementById("commentSheet").classList.toggle("active");
}

async function checkLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
        try {
            const loginRes = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "login", code: code }) });
            const loginData = await loginRes.json();
            if (loginData.status === "success") {
                sessionKey = loginData.session_key; userProfile = loginData.user;
                localStorage.setItem("vote_session_key", sessionKey); localStorage.setItem("vote_user_profile", JSON.stringify(userProfile));
                window.history.replaceState({}, document.title, window.location.pathname);
            } else { alert("Login Failed"); }
        } catch (e) {}
    }
    renderUserBar();
}

function renderUserBar() {
    const bar = document.getElementById("userBar");
    if (userProfile) {
        const avatarUrl = userProfile.avatar ? `https://cdn.discordapp.com/avatars/${userProfile.id}/${userProfile.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`;
        bar.innerHTML = `<div class="user-info"><img src="${avatarUrl}" class="user-avatar"><span class="user-name">${userProfile.username}</span><button onclick="logout()" style="margin-left:8px; border:none; background:none; cursor:pointer; color:#ff5555;"><i class="fa-solid fa-right-from-bracket"></i></button></div>`;
    } else {
        const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
        bar.innerHTML = `<a href="${authUrl}" class="login-btn"><i class="fa-brands fa-discord"></i> Login</a>`;
    }
}
function logout() { if(confirm("ออกจากระบบ?")) { localStorage.removeItem("vote_session_key"); localStorage.removeItem("vote_user_profile"); location.reload(); } }

async function loadData() {
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        serverStatusGlobal = data.votingStatus; 
        handleTimer(data.endTime, serverStatusGlobal);
        allComments = data.comments || [];
        
        const gallery = document.getElementById("gallery"); gallery.innerHTML = ""; 
        if (data.entries.length === 0) { gallery.innerHTML = "<p style='margin-top:50px;'>ไม่พบข้อมูล</p>"; return; }

        allItems = data.entries.map(item => ({ ...item, score: data.votes[item.id] || 0 }));
        if (serverStatusGlobal === "CLOSED") allItems.sort((a, b) => b.score - a.score); else allItems.sort((a, b) => a.id - b.id);

        allItems.forEach((item, index) => {
            const card = document.createElement("div"); card.className = "card";
            let rankBadge = ""; let btnText = 'โหวต'; let btnClass = ""; let btnDisabled = false;

            if (serverStatusGlobal === "CLOSED") {
                btnText = "จบ"; btnDisabled = true;
                if (index === 0) { card.classList.add("winner-1"); rankBadge = "<div class='rank-badge gold'><i class='fa-solid fa-crown'></i></div>"; }
                else if (index === 1) { card.classList.add("winner-2"); rankBadge = "<div class='rank-badge silver'><i class='fa-solid fa-medal'></i></div>"; }
                else if (index === 2) { card.classList.add("winner-3"); rankBadge = "<div class='rank-badge bronze'><i class='fa-solid fa-medal'></i></div>"; }
                else { rankBadge = `<div class='rank-badge' style='color:#555; border:2px solid #eee; font-size:1.2em; font-weight:bold;'>${index + 1}</div>`; }
            } else if (serverStatusGlobal === "WAITING") {
                btnText = 'รอเปิดโหวต'; btnClass = "waiting"; btnDisabled = true;
            }

            card.innerHTML = `
                ${rankBadge}
                <div class="votes-count"><i class="fa-solid fa-star text-warning"></i> ${item.score}</div>
                <div class="img-container"><img src="${item.url}" onclick="openModal(${index})" loading="lazy"></div>
                <div class="info">
                    <div class="author"><i class="fa-solid fa-user-pen"></i> ${item.author}</div>
                    <button class="vote-btn ${btnClass}" id="btn-${item.id}" onclick="vote('${item.id}')" ${btnDisabled ? 'disabled' : ''}>${btnText}</button>
                </div>`;
            gallery.appendChild(card);
        });
    } catch (error) { console.error(error); }
}

function handleTimer(endTimeStr, status) {
    const timerElem = document.getElementById("timer");
    if (status === "WAITING") { timerElem.innerHTML = "รอ Admin เปิดโหวต..."; timerElem.style.color = "#d4a017"; isVotingOpen = false; return; }
    if (status === "CLOSED") { timerElem.innerHTML = "การโหวตสิ้นสุดลงแล้ว"; timerElem.style.color = "#d4a017"; isVotingOpen = false; return; }
    const interval = setInterval(() => {
        const distance = new Date(endTimeStr).getTime() - new Date().getTime();
        if (distance < 0) { clearInterval(interval); timerElem.innerHTML = "หมดเวลา"; isVotingOpen = false; setTimeout(() => location.reload(), 2000); }
        else { isVotingOpen = true; const h = Math.floor(distance/3600000); const m = Math.floor((distance%3600000)/60000); timerElem.innerHTML = `ปิดโหวตใน: ${h}ชม. ${m}น.`; }
    }, 1000);
}

function vote(itemId) {
    if (!isVotingOpen) return;
    if (!sessionKey) { alert("กรุณา Login"); return; }
    // UI updates...
    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type':'text/plain'}, body: JSON.stringify({ action: "vote", session_key: sessionKey, voted_for_id: itemId }) })
    .then(() => { setTimeout(() => { alert("บันทึกแล้ว!"); location.reload(); }, 500); });
}

function openModal(index) {
    currentImageIndex = index; updateModalContent();
    document.getElementById("modal").style.display = "block";
    document.body.classList.add("modal-open"); // ปิด Scrollbar หลัก
    resetZoom();
}
function closeModal() {
    document.getElementById("modal").style.display = "none";
    document.body.classList.remove("modal-open");
    document.getElementById("commentSheet").classList.remove("active");
}

function updateModalContent() {
    if (allItems.length === 0) return;
    const item = allItems[currentImageIndex];
    document.getElementById("img01").src = item.url;
    document.querySelector("#modal-author span").innerText = item.author;

    const btn = document.getElementById("modal-vote-btn");
    btn.onclick = () => vote(item.id);
    
    // 🔥 แก้ไข Logic ปุ่มรอให้ถูกต้อง
    btn.classList.remove('waiting');
    if (serverStatusGlobal === "CLOSED") { btn.innerText = "จบ"; btn.disabled = true; }
    else if (serverStatusGlobal === "WAITING") { 
        btn.innerText = "รอเปิดโหวต"; 
        btn.disabled = true; 
        btn.classList.add('waiting'); // ใส่ class สีเหลือง
    }
    else { btn.innerText = "โหวต"; btn.disabled = !isVotingOpen; }

    renderComments(item.id);
}

function renderComments(imageId) {
    const comments = allComments.filter(c => c.imageId.replace(/'/g, '') == String(imageId).replace(/'/g, ''));
    document.getElementById("comment-count-badge").innerText = comments.length;
    
    const list = document.getElementById("comments-list");
    list.innerHTML = "";
    if (comments.length === 0) list.innerHTML = "<div style='text-align:center; color:#ccc; margin-top:20px;'>ยังไม่มีความคิดเห็น</div>";
    else {
        comments.forEach(c => {
            const avatar = c.avatar ? `https://cdn.discordapp.com/avatars/${c.userId.replace(/'/g, '')}/${c.avatar}.png` : `https://cdn.discordapp.com/embed/avatars/0.png`;
            const time = new Date(c.timestamp).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            list.insertAdjacentHTML('beforeend', `
                <div class="comment-item">
                    <img src="${avatar}" class="comment-avatar">
                    <div class="comment-bubble">
                        <div class="comment-user">${c.username}</div>
                        <div class="comment-text">${c.text}</div>
                        <div class="comment-time">${time}</div>
                    </div>
                </div>
            `);
        });
    }
    
    document.getElementById("comment-input-area").style.display = sessionKey ? "flex" : "none";
    document.getElementById("login-warning").style.display = sessionKey ? "none" : "block";
}

function sendComment() {
    if (!sessionKey) return;
    const input = document.getElementById("comment-input");
    const text = input.value.trim();
    const item = allItems[currentImageIndex];
    if (!text || !item) return;

    const payload = JSON.stringify({ action: "add_comment", session_key: sessionKey, image_id: item.id, comment: text });
    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type':'text/plain'}, body: payload })
    .then(() => {
        allComments.push({ timestamp: new Date().toISOString(), imageId: item.id, userId: userProfile.id, username: userProfile.username, avatar: userProfile.avatar, text: text });
        renderComments(item.id); input.value = "";
    });
}

function changeImage(step) {
    currentImageIndex += step;
    if (currentImageIndex >= allItems.length) currentImageIndex = 0; else if (currentImageIndex < 0) currentImageIndex = allItems.length - 1;
    updateModalContent(); resetZoom();
}

document.addEventListener('keydown', (e) => {
    if (document.getElementById("modal").style.display === "block") {
        if (e.key === "ArrowLeft") changeImage(-1); if (e.key === "ArrowRight") changeImage(1); if (e.key === "Escape") closeModal();
    }
});

let touchStartX = 0;
const modalContent = document.getElementById("modal");
modalContent.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
modalContent.addEventListener('touchend', (e) => {
    if(currentScale === 1 && Math.abs(e.changedTouches[0].screenX - touchStartX) > 50) changeImage(e.changedTouches[0].screenX < touchStartX ? 1 : -1);
}, {passive: true});

function openPrivacyModal() { document.getElementById("privacyModal").style.display = "block"; }
function closePrivacyModal() { document.getElementById("privacyModal").style.display = "none"; }
window.onclick = function(event) { if (event.target == document.getElementById("modal")) closeModal(); if (event.target == document.getElementById("privacyModal")) closePrivacyModal(); }

checkLogin(); loadData();
