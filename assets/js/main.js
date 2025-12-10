// 1. IMPORT FIREBASE SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, where, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// 2. CONFIGURATION (GIỮ NGUYÊN)
const defaultConfig = {
    server_name: "CornMiner.top",
    server_ip: "cornminer.top",
    discord_link: "https://discord.gg/cUsA2K4Cpz",
    welcome_title: "Chào mừng đến với CornMiner.top",
    welcome_description: "Thế giới sinh tồn đầy thử thách và sáng tạo!"
};

// 3. FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyAfQZr63_aYH_tqxGEuBupqKPzNAxoQEOw",
    authDomain: "cornminer-edb42.firebaseapp.com",
    projectId: "cornminer-edb42",
    storageBucket: "cornminer-edb42.firebasestorage.app",
    messagingSenderId: "679321936018",
    appId: "1:679321936018:web:01e4660bd723ab2ae8064b",
    measurementId: "G-T4B1T6L981"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentSection = 'home';
window.currentUserRole = 'guest';

// --- ELEMENT SDK LOGIC (CONFIG MÁY CHỦ) ---
async function onConfigChange(config) {
    const serverName = config.server_name || defaultConfig.server_name;
    const serverIP = config.server_ip || defaultConfig.server_ip;
    const navServerName = document.getElementById('nav-server-name');
    if (navServerName) navServerName.textContent = serverName;
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) heroTitle.textContent = config.welcome_title || defaultConfig.welcome_title;
    const ipDisplays = document.querySelectorAll('#server-ip-display, #guide-server-ip');
    ipDisplays.forEach(el => el.textContent = serverIP);
}

if (window.elementSdk) {
    window.elementSdk.init({ defaultConfig, onConfigChange, mapToCapabilities: () => ({}), mapToEditPanelValues: () => new Map() });
}

// ==========================================
// A. UI HELPERS (CHUYỂN TAB, MODAL, MENU)
// ==========================================

window.showSection = (sectionName) => {
    ['home', 'map', 'leaderboard', 'news', 'guide', 'forum'].forEach(sec => {
        const el = document.getElementById(sec + '-section');
        if (el) el.classList.add('section-hidden');
    });

    const target = document.getElementById(sectionName + '-section');
    if (target) {
        target.classList.remove('section-hidden');
        target.classList.add('fade-in');
    }

    // Load data khi chuyển tab
    if (sectionName === 'news') loadNews();
    if (sectionName === 'guide') loadGuides();
    if (sectionName === 'forum') loadForum('approved');
    
    // Đóng mobile menu
    document.getElementById('mobile-menu').classList.add('hidden');
};

window.toggleMobileMenu = () => document.getElementById('mobile-menu').classList.toggle('hidden');
window.copyServerIP = () => { navigator.clipboard.writeText(defaultConfig.server_ip).then(() => alert(`Đã copy IP!`)); };
window.openDiscord = () => window.open(defaultConfig.discord_link, '_blank');
window.toggleAuthModal = () => document.getElementById('authModal').classList.toggle('hidden-force');
window.togglePostModal = () => document.getElementById('createPostModal').classList.toggle('hidden-force');

// [MỚI] XỬ LÝ DROPDOWN MENU USER
window.toggleUserDropdown = () => {
    const menu = document.getElementById('user-dropdown-menu');
    menu.classList.toggle('hidden-force');
};

// [MỚI] ĐÓNG MENU KHI CLICK RA NGOÀI
document.addEventListener('click', (e) => {
    const container = document.querySelector('.user-menu-container');
    if (container && !container.contains(e.target)) {
        document.getElementById('user-dropdown-menu').classList.add('hidden-force');
    }
});

window.switchAuthMode = (mode) => {
    document.getElementById('loginForm').classList.toggle('hidden-force', mode === 'register');
    document.getElementById('registerForm').classList.toggle('hidden-force', mode !== 'register');
};

// Mở Modal Đăng bài
window.openPostModal = (type) => {
    if (!auth.currentUser) return alert("Vui lòng đăng nhập!");
    
    // --- SỬA Ở ĐÂY: Thêm window. vào trước biến ---
    const role = window.currentUserRole || 'guest'; 
    
    if (type === 'news' && !['admin', 'dev'].includes(role)) return alert("Chỉ Admin mới được đăng tin!");
    if (type === 'guide' && !['admin', 'dev', 'helper'].includes(role)) return alert("Chỉ Helper/Admin mới được đăng hướng dẫn!");

    document.getElementById('postType').value = type;
    document.getElementById('postModalTitle').textContent = type === 'forum' ? 'Đăng thảo luận' : (type === 'news' ? 'Đăng tin tức' : 'Viết hướng dẫn');
    document.getElementById('adminCategorySelect').classList.toggle('hidden-force', type !== 'news');
    window.togglePostModal();
};

window.showLeaderboard = (category) => {
    document.querySelectorAll('#leaderboard-section button').forEach(btn => 
        btn.className = 'glass-effect text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-colors font-semibold'
    );
    event.target.className = 'corn-gradient text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all';
    const titles = { 'playtime': '⏱️ Top thời gian', 'kills': '🗡️ Top Kills', 'money': '💰 Top Money' };
    document.getElementById('leaderboard-title').textContent = titles[category] || titles.playtime;
};

// ==========================================
// B. ADMIN PANEL (QUẢN LÝ USER)
// ==========================================

// 1. Mở Modal & Tải danh sách
window.openAdminUsersModal = async () => {
    document.getElementById('adminUsersModal').classList.remove('hidden-force');
    window.toggleUserDropdown(); // Đóng menu nhỏ
    
    const tbody = document.getElementById('admin-user-list');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-10"><div class="loader"></div><p class="mt-2 text-gray-400">Đang tải dữ liệu...</p></td></tr>';
    
    try {
        const q = query(collection(db, "users"), orderBy("joinedAt", "desc"));
        const snap = await getDocs(q);
        
        let html = '';
        let count = 0;

        snap.forEach(doc => {
            const u = doc.data();
            count++;
            const isMe = auth.currentUser.uid === doc.id;
            
            // Format ngày tham gia
            const joinedDate = u.joinedAt ? new Date(u.joinedAt.seconds * 1000).toLocaleDateString('vi-VN') : 'N/A';
            
            // Avatar
            const avatarUrl = u.photoURL || `https://mc-heads.net/avatar/${u.username}`;

            // Select Role
            const roles = ['member', 'vip', 'media', 'helper', 'dev', 'admin'];
            let options = roles.map(r => 
                `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r.toUpperCase()}</option>`
            ).join('');

            const rowClass = isMe ? 'bg-orange-500/10' : '';

            html += `
            <tr class="${rowClass} user-row">
                <td>
                    <div class="user-cell">
                        <img src="${avatarUrl}" alt="skin">
                        <div class="user-info">
                            <h4>${u.username} ${isMe ? '<span class="text-xs text-orange-400">(Bạn)</span>' : ''}</h4>
                            <span class="role-badge role-${u.role}">${u.role}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="text-sm text-gray-300">${u.email || 'Không có email'}</div>
                    <div class="text-[10px] text-gray-600 font-mono mt-1">ID: ${doc.id}</div>
                </td>
                <td class="text-gray-400 text-sm">${joinedDate}</td>
                <td>
                    <div class="role-select-wrapper">
                        <select onchange="changeUserRole('${doc.id}', this.value)" class="role-select text-xs font-bold text-center border-orange-500/30 focus:border-orange-500">
                            ${options}
                        </select>
                    </div>
                </td>
                <td>
                    ${!isMe ? `<button onclick="deleteUserDB('${doc.id}', '${u.username}')" class="text-gray-500 hover:text-red-500 transition-colors" title="Xóa khỏi Database"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>` : ''}
                </td>
            </tr>`;
        });
        
        tbody.innerHTML = html;
        document.getElementById('total-users-count').innerText = count;

    } catch (e) { 
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="5" class="text-red-500 text-center py-4">Lỗi: ${e.message} (Có thể cần tạo Index)</td></tr>`; 
    }
};

window.filterUsers = () => {
    const input = document.getElementById('userSearchInput');
    const filter = input.value.toLowerCase();
    const rows = document.getElementsByClassName('user-row');

    for (let i = 0; i < rows.length; i++) {
        const text = rows[i].textContent || rows[i].innerText;
        if (text.toLowerCase().indexOf(filter) > -1) {
            rows[i].style.display = "";
        } else {
            rows[i].style.display = "none";
        }
    }
};

window.deleteUserDB = async (uid, name) => {
    if(!confirm(`CẢNH BÁO: Bạn có chắc muốn xóa data của [${name}] khỏi danh sách? (User vẫn có thể đăng nhập lại nhưng sẽ mất Role/Stats)`)) return;
    try {
        await deleteDoc(doc(db, "users", uid));
        openAdminUsersModal();
    } catch(e) { alert("Lỗi: " + e.message); }
};

window.changeUserRole = async (uid, newRole) => {
    if(!confirm(`Xác nhận cấp quyền [${newRole.toUpperCase()}] cho user này?`)) return;
    try {
        await updateDoc(doc(db, "users", uid), { role: newRole });
        alert("✅ Cập nhật quyền thành công!");
        window.openAdminUsersModal(); 
    } catch(e) { alert("Lỗi: " + e.message); }
};

// ==========================================
// C. AUTH LOGIC (ĐĂNG NHẬP / ROLE)
// ==========================================

// --- BẮT ĐẦU ĐOẠN CODE MỚI ---
onAuthStateChanged(auth, async (user) => {
    // 1. KHAI BÁO BIẾN CHO CẢ DESKTOP VÀ MOBILE
    const guestActions = document.getElementById('guest-actions');
    const userActions = document.getElementById('user-actions');
    
    // Các biến cho Mobile (Mới thêm)
    const mobileGuest = document.getElementById('mobile-guest-action');
    const mobileUser = document.getElementById('mobile-user-action');

    if (user) {
        // ==============================
        // TRƯỜNG HỢP: ĐÃ ĐĂNG NHẬP
        // ==============================
        
        // A. Ẩn/Hiện Nút Đăng nhập/User
        // Desktop
        if(guestActions) guestActions.classList.add('hidden-force');
        if(userActions) userActions.classList.remove('hidden-force');
        // Mobile (MỚI)
        if(mobileGuest) mobileGuest.classList.add('hidden-force');
        if(mobileUser) mobileUser.classList.remove('hidden-force');

        // B. Cập nhật Avatar và Tên hiển thị
        const displayName = user.displayName || "Người chơi";
        const avatar = user.photoURL || `https://mc-heads.net/avatar/${displayName}`;
        
        // Điền vào Desktop
        const desktopName = document.getElementById('user-name');
        const desktopAvatar = document.getElementById('user-avatar');
        if(desktopName) desktopName.textContent = displayName;
        if(desktopAvatar) desktopAvatar.src = avatar;

        // Điền vào Mobile (MỚI)
        const mobName = document.getElementById('mobile-user-name');
        const mobAvatar = document.getElementById('mobile-user-avatar');
        if(mobName) mobName.textContent = displayName;
        if(mobAvatar) mobAvatar.src = avatar;

        try {
            // C. Lấy Role từ Database
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
            
            if (snap.exists()) {
                window.currentUserRole = snap.data().role || 'member';
            } else {
                window.currentUserRole = 'member';
                // Tạo user backup nếu lỡ bị xóa
                await setDoc(userRef, {
                    username: displayName, email: user.email, photoURL: user.photoURL, role: 'member', joinedAt: serverTimestamp()
                });
            }
            
            // D. Hiển thị Role lên màn hình
            // Desktop
            const roleBadge = document.getElementById('user-role');
            if(roleBadge) {
                roleBadge.textContent = window.currentUserRole;
                roleBadge.className = `role-badge role-${window.currentUserRole} mt-1 ml-0`;
            }

            // Mobile (MỚI)
            const mobRole = document.getElementById('mobile-user-role');
            if(mobRole) {
                mobRole.textContent = window.currentUserRole.toUpperCase();
                mobRole.className = `text-xs px-2 py-0.5 rounded font-bold uppercase role-${window.currentUserRole}`;
            }
            
            // E. Cập nhật quyền Admin (để hiện nút đăng bài)
            updateAdminUI();

            // F. Tải lại diễn đàn nếu đang xem (để hiện nút duyệt bài cho admin)
            const forumSection = document.getElementById('forum-section');
            if (forumSection && !forumSection.classList.contains('section-hidden')) {
                const isPendingTab = document.getElementById('btn-pending-posts')?.classList.contains('bg-yellow-600');
                loadForum(isPendingTab ? 'pending' : 'approved');
            }

        } catch (e) { 
            console.error("Lỗi sync user:", e);
        }
    } else {
        // ==============================
        // TRƯỜNG HỢP: CHƯA ĐĂNG NHẬP (GUEST)
        // ==============================
        window.currentUserRole = 'guest';
        
        // Reset Desktop
        if(guestActions) guestActions.classList.remove('hidden-force');
        if(userActions) userActions.classList.add('hidden-force');
        
        // Reset Mobile (MỚI) - Hiện nút đăng nhập, ẩn thông tin user
        if(mobileGuest) mobileGuest.classList.remove('hidden-force');
        if(mobileUser) mobileUser.classList.add('hidden-force');

        updateAdminUI();
        
        // Nếu đang ở tab Duyệt bài mà đăng xuất -> Load lại về bài đã duyệt
        loadForum('approved'); 
    }
});

function updateAdminUI() {
    const role = window.currentUserRole || 'guest'; // <--- SỬA LẠI CHO CHUẨN
    const isStaff = ['admin', 'dev'].includes(role);
    const isHelper = ['admin', 'dev', 'helper'].includes(role);
    
    document.getElementById('btn-add-news').classList.toggle('hidden-force', !isStaff);
    document.getElementById('btn-add-guide').classList.toggle('hidden-force', !isHelper);
    document.getElementById('btn-pending-posts').classList.toggle('hidden-force', !isStaff);
    document.getElementById('btn-admin-panel').classList.toggle('hidden-force', !isStaff);
}

// Sự kiện Submit Form
document.addEventListener('DOMContentLoaded', () => {
    
    // [QUAN TRỌNG] Xử lý Google Login + Sync Database
    document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
        try { 
            const result = await signInWithPopup(auth, googleProvider); 
            const user = result.user;

            // --- BẮT ĐẦU ĐỒNG BỘ USER VÀO FIRESTORE ---
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                console.log("User mới, đang tạo database...");
                await setDoc(userRef, {
                    username: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    role: "member", 
                    joinedAt: serverTimestamp()
                });
                console.log("Đã tạo user thành công!");
            }
            // ------------------------------------------

            window.toggleAuthModal(); 
        } 
        catch (e) { alert("Lỗi đăng nhập: " + e.message); }
    });

    // Email
    document.getElementById('emailLoginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('loginUser').value;
        const p = document.getElementById('loginPass').value;
        try { await signInWithEmailAndPassword(auth, `${u}@corn.local`, p); window.toggleAuthModal(); } 
        catch (e) { alert("Sai thông tin!"); }
    });

    // Register
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('regUser').value;
        const p = document.getElementById('regPass').value;
        try {
            const cred = await createUserWithEmailAndPassword(auth, `${u}@corn.local`, p);
            await updateProfile(cred.user, { displayName: u });
            // Tạo data cho user đăng ký thường
            await setDoc(doc(db, "users", cred.user.uid), { 
                username: u, 
                role: 'member', 
                photoURL: null,
                joinedAt: serverTimestamp() 
            });
            window.toggleAuthModal();
        } catch (e) { alert(e.message); }
    });

    // Post
    document.getElementById('createPostForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('postType').value;
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const category = document.getElementById('postCategory').value;

        let status = 'approved';
        if (type === 'forum' && !['admin', 'dev'].includes(currentUserRole)) status = 'pending';

        const coll = type === 'forum' ? 'forum_posts' : (type === 'news' ? 'news' : 'guides');

        try {
            await addDoc(collection(db, coll), {
                title, content, category: type==='news'?category:null,
                author: auth.currentUser.displayName, 
                authorRole: currentUserRole,
                authorId: auth.currentUser.uid,
                status: status,
                createdAt: serverTimestamp()
            });
            alert(status === 'pending' ? "Đang chờ duyệt!" : "Đăng thành công!");
            window.togglePostModal();
            if(type === 'news') loadNews();
            if(type === 'guide') loadGuides();
            if(type === 'forum') loadForum('approved');
        } catch(e) { alert(e.message); }
    });
});

window.handleLogout = () => { if(confirm("Đăng xuất?")) signOut(auth); };

// ==========================================
// D. CONTENT LOGIC (LOAD, DELETE, APPROVE)
// ==========================================

window.deletePost = async (collectionName, docId) => {
    if(!confirm("⚠️ Xóa bài viết này?")) return;
    try {
        await deleteDoc(doc(db, collectionName, docId));
        alert("Đã xóa!");
        if(collectionName === 'news') loadNews();
        if(collectionName === 'guides') loadGuides();
        if(collectionName === 'forum_posts') loadForum('approved');
    } catch(e) { alert(e.message); }
};

async function loadNews() {
    // 1. Chọn section bao quanh để render lại toàn bộ giao diện
    const el = document.getElementById('news-section'); 
    
    // 2. Hiển thị trạng thái Loading + Tiêu đề
    el.innerHTML = `
        <div class="mb-10 flex justify-between items-end">
            <div>
                <h1 class="text-4xl font-bold minecraft-font mb-2 corn-text">Tin tức & Cập nhật</h1>
                <p class="text-xl text-gray-300">Thông tin mới nhất</p>
            </div>
            <button id="btn-add-news" onclick="openPostModal('news')" class="hidden-force bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold">➕ Đăng tin</button>
        </div>
        <div class="text-center py-10"><div class="loader inline-block"></div><div class="mt-2 text-gray-500">Đang tải dữ liệu...</div></div>`;

    try {
        // 3. Lấy dữ liệu từ Firestore (Tin mới nhất lên đầu)
        const q = query(collection(db, "news"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        // --- PHẦN A: TIN TỨC ĐỘNG (TỪ DATABASE) ---
        let dynamicNewsHtml = '';
        
        snap.forEach(doc => {
            const d = doc.data();
            const date = d.createdAt ? new Date(d.createdAt.seconds*1000).toLocaleDateString('vi-VN') : 'Mới';
            // Dùng window.currentUserRole để check quyền xóa chính xác
            const isStaff = ['admin','dev'].includes(window.currentUserRole);
            let delBtn = isStaff ? `<button onclick="deletePost('news','${doc.id}')" class="text-red-500 border border-red-500 px-2 rounded text-xs hover:bg-red-500 hover:text-white transition ml-2">Xóa</button>` : '';
            
            // Xử lý nội dung an toàn cho alert
            const safeContent = d.content ? d.content.replace(/'/g, "\\'").replace(/\n/g, '\\n') : '';

            dynamicNewsHtml += `
            <div class="glass-effect rounded-2xl p-6 border border-gray-800 mb-6 hover:border-orange-500/30 transition-all card-hover">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex gap-2 items-center">
                        <span class="corn-gradient text-white px-2 py-1 rounded text-xs font-bold uppercase">${d.category||'TIN'}</span>
                        <span class="text-gray-500 text-xs">${date}</span>
                    </div>
                    ${delBtn}
                </div>
                <h3 class="text-xl font-bold mt-2 text-orange-50">${d.title}</h3>
                <p class="text-gray-300 mt-2 text-sm whitespace-pre-line line-clamp-3">${d.content}</p>
                <div class="mt-3 flex justify-between items-center border-t border-gray-700 pt-2">
                    <span class="text-xs text-gray-500">Đăng bởi: ${d.author}</span>
                    <button onclick="alert('${safeContent}')" class="corn-text hover:text-orange-300 text-sm font-semibold">Đọc thêm →</button>
                </div>
            </div>`;
        });

        // --- PHẦN B: TIN TỨC TĨNH (HTML CỐ ĐỊNH BẠN GỬI) ---
        const staticNewsHtml = `
            <div class="glass-effect rounded-2xl p-10 mb-10 card-hover">
                <div class="flex items-start justify-between mb-6">
                    <div><span class="corn-gradient text-white px-4 py-2 rounded-full text-sm font-bold">SỰ KIỆN NỔI BẬT</span>
                        <h2 class="text-3xl font-bold minecraft-font mt-4 corn-text">Lễ hội Halloween CornMiner 2024</h2>
                        <p class="text-gray-400 text-base mt-2">15 tháng 10, 2024 • Phiên bản 1.20.4</p>
                    </div>
                    <div class="text-6xl floating-icon">🎃</div>
                </div>
                <p class="text-gray-300 mb-6 text-lg leading-relaxed">Tham gia lễ hội Halloween lớn nhất từ trước đến nay! Khám phá Vương quốc Ma quái mới, tham gia các trận chiến với quái vật Halloween, xây dựng những tác phẩm kinh dị và nhận những phần thưởng độc quyền theo chủ đề Halloween. Sự kiện kéo dài đến 15 tháng 11 với các thử thách hàng ngày!</p>
                <div class="flex flex-wrap gap-3">
                    <span class="bg-orange-500/20 text-orange-300 px-3 py-2 rounded-xl text-sm font-semibold">Khu vực mới</span> 
                    <span class="bg-purple-500/20 text-purple-300 px-3 py-2 rounded-xl text-sm font-semibold">Vật phẩm đặc biệt</span> 
                    <span class="bg-red-500/20 text-red-300 px-3 py-2 rounded-xl text-sm font-semibold">Có thời hạn</span>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="news-card rounded-2xl p-8 card-hover">
                    <div class="flex items-start justify-between mb-6">
                        <div>
                            <h3 class="text-xl font-bold minecraft-font corn-text">Cân bằng hệ thống kinh tế</h3>
                            <p class="text-gray-400 text-sm mt-2">10 tháng 10, 2024 • Bản vá 1.20.3b</p>
                        </div>
                        <div class="text-3xl">💰</div>
                    </div>
                    <p class="text-gray-300 text-base mb-6 leading-relaxed">Chúng tôi đã điều chỉnh giá cả cửa hàng và cơ chế giao dịch để tạo ra một nền kinh tế cân bằng hơn. Giá kim cương đã giảm 15% và thêm nhiều cơ hội giao dịch mới.</p>
                    <div class="flex justify-between items-center">
                        <div class="flex gap-2">
                            <span class="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-xs font-semibold">Kinh tế</span> 
                            <span class="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-semibold">Cân bằng</span>
                        </div>
                        <button class="corn-text hover:text-orange-300 text-sm font-semibold">Đọc thêm →</button>
                    </div>
                </div>
                <div class="news-card rounded-2xl p-8 card-hover">
                    <div class="flex items-start justify-between mb-6">
                        <div>
                            <h3 class="text-xl font-bold minecraft-font corn-text">Đấu trường PvP mới</h3>
                            <p class="text-gray-400 text-sm mt-2">8 tháng 10, 2024 • Cập nhật nội dung</p>
                        </div>
                        <div class="text-3xl">⚔️</div>
                    </div>
                    <p class="text-gray-300 text-base mb-6 leading-relaxed">Đấu trường Colosseum đã mở cửa cho các trận chiến PvP hoành tráng! Có nhiều chế độ game bao gồm đấu tay đôi 1v1, chiến đấu đội nhóm và thi đấu vua của ngọn đồi.</p>
                    <div class="flex justify-between items-center">
                        <div class="flex gap-2">
                            <span class="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs font-semibold">PvP</span>
                            <span class="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-semibold">Đấu trường</span>
                        </div>
                        <button class="corn-text hover:text-orange-300 text-sm font-semibold">Đọc thêm →</button>
                    </div>
                </div>
                <div class="news-card rounded-2xl p-8 card-hover">
                    <div class="flex items-start justify-between mb-6">
                        <div>
                            <h3 class="text-xl font-bold minecraft-font corn-text">Phù phép tùy chỉnh mới</h3>
                            <p class="text-gray-400 text-sm mt-2">5 tháng 10, 2024 • Cập nhật tính năng</p>
                        </div>
                        <div class="text-3xl">✨</div>
                    </div>
                    <p class="text-gray-300 text-base mb-6 leading-relaxed">Khám phá 15 phù phép tùy chỉnh mới bao gồm Telekinesis, Auto-Smelt và Lightning Strike. Tìm sách phù phép trong kho báu dungeon hoặc giao dịch với NPC Enchanter mới.</p>
                    <div class="flex justify-between items-center">
                        <div class="flex gap-2">
                            <span class="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-semibold">Phù phép</span> 
                            <span class="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs font-semibold">Tùy chỉnh</span>
                        </div>
                        <button class="corn-text hover:text-orange-300 text-sm font-semibold">Đọc thêm →</button>
                    </div>
                </div>
                <div class="news-card rounded-2xl p-8 card-hover">
                    <div class="flex items-start justify-between mb-6">
                        <div>
                            <h3 class="text-xl font-bold minecraft-font corn-text">Tăng hiệu suất máy chủ</h3>
                            <p class="text-gray-400 text-sm mt-2">1 tháng 10, 2024 • Cập nhật kỹ thuật</p>
                        </div>
                        <div class="text-3xl">⚡</div>
                    </div>
                    <p class="text-gray-300 text-base mb-6 leading-relaxed">Các tối ưu hóa máy chủ lớn đã được triển khai, giảm lag 45% và cải thiện tốc độ tải chunk. Tận hưởng gameplay mượt mà hơn và khám phá thế giới nhanh hơn!</p>
                    <div class="flex justify-between items-center">
                        <div class="flex gap-2">
                            <span class="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs font-semibold">Hiệu suất</span> 
                            <span class="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-semibold">Tối ưu hóa</span>
                        </div>
                        <button class="corn-text hover:text-orange-300 text-sm font-semibold">Đọc thêm →</button>
                    </div>
                </div>
            </div>`;

        // --- PHẦN 4: GỘP TẤT CẢ LẠI ---
        el.innerHTML = `
            <div class="mb-10 flex justify-between items-end">
                <div>
                    <h1 class="text-4xl font-bold minecraft-font mb-2 corn-text">Tin tức & Cập nhật</h1>
                    <p class="text-xl text-gray-300">Thông tin mới nhất</p>
                </div>
                <button id="btn-add-news" onclick="openPostModal('news')" class="hidden-force bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold">➕ Đăng tin</button>
            </div>
            
            <div id="news-container">
                <div class="mb-10">
                    ${dynamicNewsHtml ? `<h3 class="text-lg font-bold text-gray-400 mb-4 border-b border-gray-700 pb-2">📌 Tin mới nhất</h3>` : ''}
                    ${dynamicNewsHtml}
                </div>
                
                ${staticNewsHtml}
            </div>
        `;
        
        // Cập nhật lại giao diện Admin (ẩn/hiện nút đăng tin)
        updateAdminUI();

    } catch(e) { 
        console.error(e);
        el.innerHTML += `<div class="text-center text-red-500">Lỗi tải tin tức: ${e.message}</div>`; 
    }
}

async function loadGuides() {
    const el = document.getElementById('guide-section'); // Note: Targeting the main section, not just the container
    
    // Show loading state
    el.innerHTML = `
        <div class="mb-10 flex justify-between items-end">
            <div><h1 class="text-4xl font-bold minecraft-font mb-2 corn-text">Hướng dẫn</h1></div>
            <button id="btn-add-guide" onclick="openPostModal('guide')" class="hidden-force bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold">➕ Viết hướng dẫn</button>
        </div>
        <div class="text-center py-10"><div class="loader inline-block"></div></div>`;

    try {
        // Fetch dynamic guides from Firestore
        const q = query(collection(db, "guides"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        // 1. Generate HTML for Dynamic Guides (from Database)
        let dynamicGuidesHtml = '';
        
        // Add a default static card first if you want, or remove this block
        dynamicGuidesHtml += `
            <div class="glass-effect rounded-2xl p-8 border border-gray-800 card-hover">
                <div class="text-4xl mb-4">📜</div>
                <h3 class="text-xl font-bold mb-2 corn-text">Lệnh cơ bản</h3>
                <p class="text-gray-300 text-sm mb-4">Các lệnh cần biết: /spawn, /home set, /tpa...</p>
            </div>`;

        snap.forEach(doc => {
            const d = doc.data();
            const isOwner = auth.currentUser && auth.currentUser.uid === d.authorId;
            const isStaff = ['admin', 'dev'].includes(window.currentUserRole); // Ensure window.currentUserRole is used
            let delBtn = (isStaff || isOwner) ? `<button onclick="deletePost('guides','${doc.id}')" class="text-red-500 text-xs hover:underline">Xóa</button>` : '';

            // Safe content escape for alert
            const safeContent = d.content ? d.content.replace(/'/g, "\\'").replace(/\n/g, '\\n') : '';

            dynamicGuidesHtml += `
            <div class="glass-effect rounded-2xl p-8 border border-gray-800 card-hover flex flex-col justify-between">
                <div>
                    <div class="text-4xl mb-4">📘</div>
                    <h3 class="text-xl font-bold mb-2 corn-text">${d.title}</h3>
                    <p class="text-gray-300 text-sm mb-4 line-clamp-3">${d.content}</p>
                    <button onclick="alert('${safeContent}')" class="text-orange-400 text-sm hover:underline font-bold">Đọc tiếp</button>
                </div>
                <div class="mt-4 flex justify-between items-center border-t border-gray-700 pt-2">
                    <span class="text-xs text-gray-500">Bởi: ${d.author}</span>
                    ${delBtn}
                </div>
            </div>`;
        });

        // 2. Static HTML Content (Quick Start & Categories)
        // I've moved your provided HTML into this variable
        const staticContentHtml = `
            <br>
            <div class="glass-effect rounded-2xl p-10 mb-10">
                <h2 class="text-3xl font-bold minecraft-font mb-8 corn-text">🚀 Hướng dẫn bắt đầu nhanh</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                        <h3 class="text-xl font-bold mb-6 corn-text">Bắt đầu chơi</h3>
                        <div class="space-y-4">
                            <div class="flex items-start">
                                <span class="corn-gradient text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">1</span>
                                <div>
                                    <p class="font-bold text-lg">Tham gia máy chủ</p>
                                    <p class="text-gray-400">Sử dụng IP: <span id="guide-server-ip" class="corn-text font-semibold">cornminer.top</span></p>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <span class="corn-gradient text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">2</span>
                                <div>
                                    <p class="font-bold text-lg">Đọc luật chơi</p>
                                    <p class="text-gray-400">Gõ <code class="bg-gray-800 px-2 py-1 rounded text-orange-300">/rules</code> trong chat</p>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <span class="corn-gradient text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">3</span>
                                <div>
                                    <p class="font-bold text-lg">Bảo vệ đất đai</p>
                                    <p class="text-gray-400">Sử dụng <code class="bg-gray-800 px-2 py-1 rounded text-orange-300">/claim</code> để bảo vệ công trình</p>
                                </div>
                            </div>
                            <div class="flex items-start">
                                <span class="corn-gradient text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">4</span>
                                <div>
                                    <p class="font-bold text-lg">Bắt đầu xây dựng</p>
                                    <p class="text-gray-400">Tìm một vị trí đẹp và tạo căn cứ đầu tiên của bạn</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold mb-6 corn-text">Lệnh cần thiết</h3>
                        <div class="space-y-3">
                            <div class="bg-gray-800 rounded-xl p-4"><code class="text-orange-400 font-bold">/spawn</code> <span class="text-gray-400 ml-3">- Quay về điểm spawn</span></div>
                            <div class="bg-gray-800 rounded-xl p-4"><code class="text-orange-400 font-bold">/home set [tên]</code> <span class="text-gray-400 ml-3">- Đặt vị trí nhà</span></div>
                            <div class="bg-gray-800 rounded-xl p-4"><code class="text-orange-400 font-bold">/tpa [người chơi]</code> <span class="text-gray-400 ml-3">- Yêu cầu dịch chuyển đến người chơi</span></div>
                            <div class="bg-gray-800 rounded-xl p-4"><code class="text-orange-400 font-bold">/shop</code> <span class="text-gray-400 ml-3">- Mở cửa hàng máy chủ</span></div>
                            <div class="bg-gray-800 rounded-xl p-4"><code class="text-orange-400 font-bold">/balance</code> <span class="text-gray-400 ml-3">- Kiểm tra số tiền của bạn</span></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div class="halloween-card rounded-2xl p-8 card-hover">
                    <div class="text-center">
                        <div class="text-5xl mb-6 floating-icon">🏠</div>
                        <h3 class="text-xl font-bold minecraft-font mb-4 corn-text">Xây dựng &amp; Bảo vệ</h3>
                        <p class="text-gray-300 text-base mb-6 leading-relaxed">Học cách bảo vệ công trình và tạo ra những cấu trúc tuyệt vời</p>
                        <button class="w-full corn-gradient text-white py-3 px-6 rounded-xl font-bold hover:shadow-lg transition-all">Đọc hướng dẫn</button>
                    </div>
                </div>
                <div class="halloween-card rounded-2xl p-8 card-hover">
                    <div class="text-center">
                        <div class="text-5xl mb-6 floating-icon">💰</div>
                        <h3 class="text-xl font-bold minecraft-font mb-4 corn-text">Hệ thống kinh tế</h3>
                        <p class="text-gray-300 text-base mb-6 leading-relaxed">Làm chủ giao dịch, cửa hàng và chiến lược kiếm tiền</p>
                        <button class="w-full bg-green-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-green-700 transition-colors">Đọc hướng dẫn</button>
                    </div>
                </div>
                <div class="halloween-card rounded-2xl p-8 card-hover">
                    <div class="text-center">
                        <div class="text-5xl mb-6 floating-icon">⚔️</div>
                        <h3 class="text-xl font-bold minecraft-font mb-4 corn-text">PvP &amp; Chiến đấu</h3>
                        <p class="text-gray-300 text-base mb-6 leading-relaxed">Trở thành chiến binh bậc thầy với mẹo và chiến thuật chiến đấu</p>
                        <button class="w-full bg-red-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-red-700 transition-colors">Đọc hướng dẫn</button>
                    </div>
                </div>
                <div class="halloween-card rounded-2xl p-8 card-hover">
                    <div class="text-center">
                        <div class="text-5xl mb-6 floating-icon">🎭</div>
                        <h3 class="text-xl font-bold minecraft-font mb-4 corn-text">Sự kiện &amp; Minigame</h3>
                        <p class="text-gray-300 text-base mb-6 leading-relaxed">Tham gia các sự kiện máy chủ và minigame cạnh tranh</p>
                        <button class="w-full bg-purple-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-purple-700 transition-colors">Đọc hướng dẫn</button>
                    </div>
                </div>
                <div class="halloween-card rounded-2xl p-8 card-hover">
                    <div class="text-center">
                        <div class="text-5xl mb-6 floating-icon">🔧</div>
                        <h3 class="text-xl font-bold minecraft-font mb-4 corn-text">Tính năng tùy chỉnh</h3>
                        <p class="text-gray-300 text-base mb-6 leading-relaxed">Khám phá các plugin độc đáo và cơ chế tùy chỉnh của máy chủ</p>
                        <button class="w-full bg-orange-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-orange-700 transition-colors">Đọc hướng dẫn</button>
                    </div>
                </div>
                <div class="halloween-card rounded-2xl p-8 card-hover">
                    <div class="text-center">
                        <div class="text-5xl mb-6 floating-icon">📋</div>
                        <h3 class="text-xl font-bold minecraft-font mb-4 corn-text">Luật &amp; Hướng dẫn</h3>
                        <p class="text-gray-300 text-base mb-6 leading-relaxed">Luật máy chủ quan trọng và hướng dẫn cộng đồng</p>
                        <button class="w-full bg-gray-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-gray-700 transition-colors">Đọc hướng dẫn</button>
                    </div>
                </div>
            </div>`;

        // 3. Assemble Final HTML
        const finalHtml = `
            <div class="mb-10 flex justify-between items-end">
                <div><h1 class="text-4xl font-bold minecraft-font mb-2 corn-text">Hướng dẫn</h1><p class="text-xl text-gray-300">Cẩm nang sinh tồn</p></div>
                <button id="btn-add-guide" onclick="openPostModal('guide')" class="hidden-force bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold">➕ Viết hướng dẫn</button>
            </div>
            
            <div id="guide-container" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${dynamicGuidesHtml}
            </div>
            
            ${staticContentHtml}
        `;
        
        el.innerHTML = finalHtml;
        
        // Re-run Admin UI check to show/hide the button if needed
        updateAdminUI(); 

    } catch (e) { 
        console.error(e); 
        el.innerHTML += `<div class="text-center text-red-500 mt-10">Lỗi tải dữ liệu: ${e.message}</div>`;
    }
}

window.filterForum = (status) => loadForum(status);

async function loadForum(status) {
    const el = document.getElementById('forum-container');
    el.innerHTML = '<div class="text-center py-10"><div class="loader inline-block"></div><div class="mt-2 text-gray-400">Đang tải dữ liệu...</div></div>';
    
    // Đổi màu tab
    const btnApproved = document.querySelector("button[onclick=\"filterForum('approved')\"]");
    const btnPending = document.getElementById('btn-pending-posts');
    if (btnApproved && btnPending) {
        if (status === 'pending') {
            btnApproved.className = "px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition";
            btnPending.className = "px-4 py-2 rounded-lg bg-yellow-600 text-white font-bold shadow-lg transition";
        } else {
            btnApproved.className = "px-4 py-2 rounded-lg bg-orange-600 text-white font-bold shadow-lg transition";
            btnPending.className = "px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition";
        }
    }

    try {
        const q = query(collection(db, "forum_posts"), where("status", "==", status), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        // Quyền hạn
        const currentUid = auth.currentUser ? auth.currentUser.uid : null;
        const myAdminID = "VvsvQiQsymd03LR6neezKTjoKbz1"; 
        const isStaff = ['admin', 'dev'].includes(window.currentUserRole) || currentUid === myAdminID;

        let html = '';
        let hasPost = false; 

        if (snap.empty) {
            html = `<div class="text-center text-gray-500 py-10">${status === 'pending' ? 'Không có bài chờ duyệt.' : 'Chưa có bài viết nào.'}</div>`;
        } else {
            snap.forEach(doc => {
                const d = doc.data();
                const date = d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleString('vi-VN') : 'Vừa xong';
                const isOwner = currentUid && currentUid === d.authorId;

                if (status === 'pending' && !isStaff && !isOwner) return;
                hasPost = true;

                // Nút hành động chính
                let actions = '';
                if (status === 'pending' && isStaff) {
                    actions += `<button onclick="window.approvePost('${doc.id}')" class="bg-green-600 border border-green-400 text-white px-3 py-1 rounded text-xs font-bold mr-2 hover:bg-green-500 shadow-lg">✅ DUYỆT</button>`;
                }
                if (isStaff || isOwner) {
                    actions += `<button onclick="deletePost('forum_posts', '${doc.id}')" class="text-red-500 border border-red-500 px-2 py-1 rounded text-xs hover:bg-red-500 hover:text-white transition">🗑️ Xóa</button>`;
                }

                // --- PHẦN BÌNH LUẬN (MỚI) ---
                const commentSection = `
                    <div class="mt-4 pt-3 border-t border-gray-700/50">
                        <button onclick="toggleComments('${doc.id}')" class="text-gray-400 hover:text-orange-400 text-sm flex items-center gap-2 transition">
                            💬 Bình luận / Thảo luận ▼
                        </button>
                        
                        <div id="comments-section-${doc.id}" class="hidden-force mt-3 pl-4 border-l-2 border-gray-700">
                            <div id="comments-list-${doc.id}" class="mb-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar"></div>
                            
                            ${auth.currentUser ? `
                            <div class="flex gap-2">
                                <input type="text" id="comment-input-${doc.id}" 
                                    class="w-full bg-black/40 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                                    placeholder="Viết bình luận..." onkeydown="if(event.key==='Enter') sendComment('${doc.id}')">
                                <button id="btn-send-${doc.id}" onclick="sendComment('${doc.id}')" class="bg-orange-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-500">➤</button>
                            </div>` : `<div class="text-xs text-gray-500">Đăng nhập để bình luận.</div>`}
                        </div>
                    </div>
                `;
                // -----------------------------

                let statusBadge = status === 'pending' ? `<span class="text-[10px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 px-2 py-0.5 rounded ml-2">⏳ Chờ duyệt</span>` : '';

                html += `
                <div class="glass-effect rounded-xl p-5 border border-gray-700 hover:bg-white/5 transition-colors mb-4 shadow-lg">
                    <div class="flex gap-4">
                        <img src="https://mc-heads.net/avatar/${d.author || 'Steve'}" class="w-10 h-10 rounded-lg border border-gray-600 shadow-sm">
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <div class="flex items-center gap-2">
                                    <h4 class="font-bold text-lg text-orange-400">${d.title || 'Không tiêu đề'}</h4>
                                    ${statusBadge}
                                </div>
                                <span class="text-[10px] text-gray-500 bg-black/50 px-2 py-1 rounded h-fit">${date}</span>
                            </div>
                            
                            <div class="text-xs text-gray-400 mb-2 flex items-center gap-2">
                                <span class="font-bold text-gray-300">${d.author || 'Ẩn danh'}</span>
                                <span class="role-badge role-${d.authorRole || 'member'}">${d.authorRole || 'Member'}</span>
                            </div>
                            
                            <div class="text-gray-200 text-sm whitespace-pre-line bg-black/20 p-3 rounded-lg border border-white/5 mb-2">
                                ${d.content || ''}
                            </div>

                            <div class="flex justify-between items-center mt-2">
                                <div></div>
                                <div class="flex items-center gap-2">${actions}</div>
                            </div>
                            
                            ${commentSection} </div>
                    </div>
                </div>`;
            });
        }
        el.innerHTML = html;

    } catch (e) {
        console.error("LỖI:", e); 
        el.innerHTML = `<div class="text-center text-red-400">Lỗi tải dữ liệu: ${e.message}</div>`;
    }
}
// Hàm duyệt bài (Đã thêm bắt lỗi permission)
window.approvePost = async (id) => {
    if (!confirm("Bạn có chắc chắn muốn duyệt bài viết này không?")) return;
    
    try {
        await updateDoc(doc(db, "forum_posts", id), { status: 'approved' });
        // Thông báo nhỏ (Toast) hoặc alert
        alert("✅ Đã duyệt bài viết thành công!");
        // Tải lại danh sách đang chờ
        loadForum('pending'); 
    } catch (e) {
        console.error("Lỗi duyệt bài:", e);
        alert("❌ Lỗi: Bạn không có quyền duyệt bài hoặc hệ thống gặp sự cố.\n" + e.message);
    }
};

// ==========================================
// E. HỆ THỐNG BÌNH LUẬN (COMMENT SYSTEM)
// ==========================================

// 1. Ẩn/Hiện khung bình luận
window.toggleComments = (postId) => {
    const section = document.getElementById(`comments-section-${postId}`);
    const isHidden = section.classList.contains('hidden-force');
    
    if (isHidden) {
        section.classList.remove('hidden-force');
        loadComments(postId); // Mở ra thì mới tải comment cho nhẹ
    } else {
        section.classList.add('hidden-force');
    }
};

// 2. Tải danh sách bình luận
async function loadComments(postId) {
    const container = document.getElementById(`comments-list-${postId}`);
    container.innerHTML = '<div class="text-xs text-gray-500 text-center">Đang tải bình luận...</div>';

    try {
        // Query vào sub-collection 'comments'
        const q = query(
            collection(db, "forum_posts", postId, "comments"), 
            orderBy("createdAt", "asc") // Cũ nhất hiện trước (giống chat)
        );
        const snap = await getDocs(q);

        let html = '';
        if (snap.empty) {
            html = '<div class="text-xs text-gray-600 text-center italic py-2">Chưa có bình luận nào. Hãy là người đầu tiên!</div>';
        } else {
            snap.forEach(doc => {
                const c = doc.data();
                const time = c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleString('vi-VN') : '';
                
                // Check quyền xóa comment
                const currentUid = auth.currentUser ? auth.currentUser.uid : null;
                const isMyComment = currentUid === c.uid;
                const isStaff = ['admin', 'dev'].includes(window.currentUserRole);
                
                let deleteBtn = '';
                if (isStaff || isMyComment) {
                    deleteBtn = `<button onclick="deleteComment('${postId}', '${doc.id}')" class="text-red-500 hover:text-red-400 ml-2 text-[10px] font-bold">XÓA</button>`;
                }

                html += `
                <div class="flex gap-3 mb-3 animate-fade-in">
                    <img src="${c.avatar}" class="w-8 h-8 rounded-full border border-gray-600">
                    <div class="bg-gray-800/50 rounded-xl px-3 py-2 border border-gray-700 w-full">
                        <div class="flex justify-between items-baseline">
                            <span class="text-orange-300 text-xs font-bold">${c.username} <span class="text-gray-500 font-normal">(${c.role})</span></span>
                            <span class="text-[10px] text-gray-600">${time} ${deleteBtn}</span>
                        </div>
                        <p class="text-gray-300 text-sm mt-1">${c.content}</p>
                    </div>
                </div>`;
            });
        }
        container.innerHTML = html;
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="text-red-500 text-xs">Lỗi tải bình luận.</div>';
    }
}

// 3. Gửi bình luận mới
window.sendComment = async (postId) => {
    if (!auth.currentUser) return alert("Vui lòng đăng nhập để bình luận!");
    
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    // Hiệu ứng gửi
    const btn = document.getElementById(`btn-send-${postId}`);
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "forum_posts", postId, "comments"), {
            content: content,
            uid: auth.currentUser.uid,
            username: auth.currentUser.displayName,
            avatar: auth.currentUser.photoURL || `https://mc-heads.net/avatar/${auth.currentUser.displayName}`,
            role: window.currentUserRole || 'member',
            createdAt: serverTimestamp()
        });

        input.value = ''; // Xóa ô nhập
        loadComments(postId); // Tải lại list
    } catch (e) {
        alert("Lỗi: " + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

// 4. Xóa bình luận
window.deleteComment = async (postId, commentId) => {
    if(!confirm("Xóa bình luận này?")) return;
    try {
        await deleteDoc(doc(db, "forum_posts", postId, "comments", commentId));
        loadComments(postId);
    } catch(e) { alert("Lỗi: " + e.message); }
};

function createSnowflake() {
        const snowflake = document.createElement('div');
        snowflake.classList.add('snowflake');
        snowflake.innerHTML = '❄'; // Có thể đổi thành ❅ hoặc ❆
        snowflake.style.left = Math.random() * 100 + 'vw';
        snowflake.style.animationDuration = Math.random() * 3 + 5 + 's'; // Tốc độ rơi 5-8s
        snowflake.style.fontSize = Math.random() * 10 + 10 + 'px'; // Kích thước
        snowflake.style.opacity = Math.random();
        
        document.body.appendChild(snowflake);

        // Xóa tuyết sau khi rơi xong để nhẹ máy
        setTimeout(() => {
            snowflake.remove();
        }, 8000);
    }
    // Tạo tuyết mỗi 200ms
    setInterval(createSnowflake, 200);

showSection('home');
