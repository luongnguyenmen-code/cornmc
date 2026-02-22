// ==========================================
// 1. IMPORT (Lấy hết các hàm từ data.js)
// ==========================================
import {
    subscribeToAuth, loginEmail, registerEmail, loginGoogle, logout,
    fetchNews, fetchGuides, fetchForumPosts, createPost,
    fetchAllUsers, fetchMyPosts, defaultConfig, loginUser, deleteUserAndData,
    updateUserProfile, editDocument, registerUser, resetPassword,
    deleteDocument, fetchComments, addComment, deleteComment
} from './core.js';

// Biến toàn cục lưu trạng thái
let currentUser = null;
let currentRole = 'guest';

function showCustomModal(title, message, type = 'info', onConfirm = null) {
    const modal = document.getElementById('global-modal');
    const titleEl = document.getElementById('global-modal-title');
    const msgEl = document.getElementById('global-modal-message');
    const actionsEl = document.getElementById('global-modal-actions');
    const iconEl = document.getElementById('global-modal-icon');

    // 1. Set nội dung
    titleEl.innerText = title;
    msgEl.innerHTML = message.replace(/\n/g, '<br>'); // Hỗ trợ xuống dòng
    actionsEl.innerHTML = ''; // Xóa nút cũ

    // 2. Set Icon & Màu tiêu đề tùy loại
    if (type === 'danger') {
        iconEl.innerText = '⚠️';
        titleEl.className = "text-2xl font-black title-font text-red-500 mb-2";
    } else if (type === 'confirm') {
        iconEl.innerText = '❓';
        titleEl.className = "text-2xl font-black title-font text-yellow-400 mb-2";
    } else {
        iconEl.innerText = '🔔';
        titleEl.className = "text-2xl font-black title-font text-cyan-400 mb-2";
    }

    // 3. Tạo nút bấm
    if (type === 'confirm' || type === 'danger') {
        // Nút Hủy
        const btnCancel = document.createElement('button');
        btnCancel.className = "text-gray-400 hover:text-white font-bold text-sm px-4 py-2 transition";
        btnCancel.innerText = "HỦY BỎ";
        btnCancel.onclick = () => modal.classList.remove('active');
        actionsEl.appendChild(btnCancel);

        // Nút Đồng ý
        const btnOk = document.createElement('button');
        btnOk.className = type === 'danger' 
            ? "bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-red-900/50 transition"
            : "cyber-btn px-6 py-2 rounded-lg font-bold text-sm text-white transition";
        
        btnOk.innerText = type === 'danger' ? "XÓA NGAY" : "ĐỒNG Ý";
        
        btnOk.onclick = async () => {
            modal.classList.remove('active');
            if (onConfirm) await onConfirm();
        };
        actionsEl.appendChild(btnOk);
    } else {
        // Chỉ hiện nút Đóng (Info/Alert)
        const btnClose = document.createElement('button');
        btnClose.className = "cyber-btn px-8 py-2 rounded-lg font-bold text-sm text-white";
        btnClose.innerText = "ĐÃ HIỂU";
        btnClose.onclick = () => modal.classList.remove('active');
        actionsEl.appendChild(btnClose);
    }

    // 4. Hiện Modal
    modal.classList.add('active');
}

// ==========================================
// 2. GLOBAL HANDLERS (Gắn vào Window để HTML gọi được)
// ==========================================

// --- Tiện ích ---
window.copyServerIP = () => {
    navigator.clipboard.writeText("cornnetwork.site").then(() => {
        showCustomModal("SERVER IP", "✅ Đã copy IP thành công:\n cornnetwork.site", "info");
    });
};

window.openDiscord = () => {
    window.open("https://discord.gg/cUsA2K4Cpz", "_blank");
};

// --- Chức năng Admin: Quản lý User ---
window.handleRoleChange = async (uid, newRole) => {
    showCustomModal(
        "XÁC NHẬN PHÂN QUYỀN", 
        `Bạn có chắc muốn đổi quyền thành viên này sang [${newRole.toUpperCase()}]?`, 
        "confirm", 
        async () => {
            try {
                await editDocument('users', uid, { role: newRole });
                showCustomModal("THÀNH CÔNG", "✅ Đã cập nhật quyền thành công!", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

window.handleDeleteUser = async (uid, name) => {
    showCustomModal(
        "CẢNH BÁO XÓA USER", 
        `⛔ Bạn đang xóa toàn bộ dữ liệu của [${name}]?\nHành động này KHÔNG THỂ khôi phục!`, 
        "danger", 
        async () => {
            try {
                await deleteUserAndData(uid);
                renderAdminTable();
                showCustomModal("THÀNH CÔNG", "Đã xóa thành viên!", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

window.deletePost = (collectionName, docId) => {
    showCustomModal(
        "XÓA BÀI VIẾT",
        "🗑️ Bạn chắc chắn muốn xóa bài viết này vĩnh viễn?",
        "danger",
        async () => {
            try {
                await deleteDocument(collectionName, docId);
                // Load lại trang tương ứng
                if (collectionName === 'news') renderNews();
                if (collectionName === 'guides') renderGuides();
                if (collectionName === 'forum_posts') {
                    const isPending = document.getElementById('tab-pending')?.classList.contains('active');
                    renderForum(isPending ? 'pending' : 'approved');
                }
                showCustomModal("THÔNG BÁO", "Đã xóa bài viết.", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

window.approvePost = (docId) => {
    showCustomModal(
        "DUYỆT BÀI",
        "✅ Bạn muốn duyệt bài viết này hiển thị công khai?",
        "confirm",
        async () => {
            try {
                await editDocument('forum_posts', docId, { status: 'approved' });
                renderForum('pending'); 
                showCustomModal("THÀNH CÔNG", "Đã duyệt bài!", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

// --- Chức năng Diễn đàn ---
window.filterForum = (status) => {
    const btnApproved = document.getElementById('tab-approved');
    const btnPending = document.getElementById('tab-pending');
    const btnMine = document.getElementById('tab-mine');

    [btnApproved, btnPending, btnMine].forEach(btn => {
        if (btn) btn.className = "px-5 py-2 rounded-lg font-bold text-sm transition border border-gray-700 text-gray-400 hover:bg-white/5";
    });

    if (status === 'approved' && btnApproved) {
        btnApproved.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)] border border-cyan-400";
    } else if (status === 'pending' && btnPending) {
        btnPending.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-yellow-600 text-white shadow-[0_0_10px_rgba(202,138,4,0.5)] border border-yellow-400";
    } else if (status === 'mine' && btnMine) {
        btnMine.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)] border border-purple-400";
    }
    renderForum(status);
};

window.toggleComments = (postId) => {
    const section = document.getElementById(`comments-section-${postId}`);
    section.classList.toggle('hidden');
    if (!section.classList.contains('hidden')) {
        renderComments(postId);
    }
};

window.sendComment = async (postId) => {
    if (!currentUser) return showCustomModal("YÊU CẦU", "Vui lòng đăng nhập để bình luận!", "info");
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();

    if (!content) return;

    try {
        await addComment(postId, content, currentRole);
        input.value = '';
        renderComments(postId);
    } catch (e) { showCustomModal("LỖI", "Gửi comment thất bại: " + e.message, "danger"); }
};

window.deleteCommentAction = (postId, commentId) => {
    showCustomModal(
        "XÓA BÌNH LUẬN",
        "Bạn muốn xóa bình luận này?",
        "danger",
        async () => {
            try {
                await deleteComment(postId, commentId);
                renderComments(postId);
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

// ==========================================
// 3. RENDER FUNCTIONS (Hiển thị dữ liệu)
// ==========================================

async function renderNews() {
    const container = document.getElementById('news-container');
    if (!container) return;

    const news = await fetchNews();
    const isStaff = ['admin', 'dev'].includes(currentRole);

    if (news.length === 0) {
        container.innerHTML = `<div class="glass-panel p-6 text-center text-gray-400">Chưa có tin tức nào.</div>`;
        return;
    }

    container.innerHTML = news.map(item => {
        const imageHTML = item.imageUrl 
            ? `<img src="${item.imageUrl}" class="w-full h-auto max-h-96 object-cover rounded-lg mb-4 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">` 
            : '';

        return `
    <div class="glass-panel p-6 rounded-xl forum-post mb-4 border-l-4 bg-gradient-to-r from-white/10 to-transparent hover:bg-white/15 transition relative group shadow-[0_0_15px_rgba(34,211,238,0.15)]">
        <div class="flex items-start space-x-4">
            <span class="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">📰</span>
            <div class="flex-1 min-w-0"> <div class="flex items-center space-x-3 mb-2">
                    <span class="text-xs text-white bg-purple-600/40 border border-purple-400/30 px-2 rounded shadow-sm">${new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    <span class="bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-[0_0_10px_rgba(34,211,238,0.3)]">${item.category || 'TIN TỨC'}</span>
                </div>
                
                <h3 class="text-xl font-bold title-font mb-2 text-cyan-100 drop-shadow-md">${item.title}</h3>
                
                ${imageHTML}
                
                <div class="text-gray-100 text-sm leading-relaxed whitespace-pre-line">${item.content}</div>
                
                <div class="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                    <span class="text-xs text-gray-400 group-hover:text-white transition">Đăng bởi: <b class="text-cyan-300">${item.author}</b></span>
                    ${isStaff ? `<button onclick="window.deletePost('news', '${item.id}')" class="text-red-400 text-xs hover:text-red-200 font-bold opacity-0 group-hover:opacity-100 transition bg-red-900/30 px-2 py-1 rounded border border-red-500/30">🗑️ XÓA BÀI</button>` : ''}
                </div>
            </div>
        </div>
    </div>
    `}).join('');
}

async function renderGuides() {
    const container = document.getElementById('guide-container');
    if (!container) return;

    const guides = await fetchGuides();
    const isStaff = ['admin', 'dev', 'helper'].includes(currentRole);

    if (guides.length === 0) {
        container.innerHTML = `<p class="col-span-2 text-center text-gray-400">Chưa có hướng dẫn.</p>`;
        return;
    }

    container.innerHTML = guides.map(item => {
        const headerDisplay = item.imageUrl 
            ? `<div class="w-full h-48 mb-4 overflow-hidden rounded-lg border border-purple-500/30 relative">
                 <img src="${item.imageUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
               </div>`
            : `<div class="text-4xl mb-4 filter drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">📘</div>`;

        return `
    <div class="glass-panel p-6 rounded-2xl feature-card tilt-card relative group flex flex-col h-full bg-gradient-to-b from-white/5 to-black/20 border border-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)] transition-all duration-300">
        
        ${headerDisplay}

        <h3 class="text-2xl font-bold title-font mb-3 text-cyan-300 group-hover:text-cyan-200 transition-colors drop-shadow-sm">${item.title}</h3>
        <p class="text-gray-200 leading-relaxed mb-4 line-clamp-3 flex-grow font-light">${item.content}</p>
        <div class="flex justify-between items-end mt-4 pt-4 border-t border-white/10">
            <button onclick="alert('${item.content.replace(/'/g, "\\'").replace(/\n/g, '\\n')}')" class="text-cyan-300 hover:text-white font-bold text-sm hover:underline title-font flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                ĐỌC TIẾP <span class="text-lg">→</span>
            </button>
            ${isStaff ? `<button onclick="window.deletePost('guides', '${item.id}')" class="text-red-400 text-xs hover:text-white bg-red-900/20 px-3 py-1 rounded border border-red-500/30 opacity-0 group-hover:opacity-100 transition">XÓA</button>` : ''}
        </div>
    </div>
`}).join('');
}

async function renderForum(filterMode = 'approved') {
    // filterMode có 3 dạng: 'approved' (chung), 'pending' (admin duyệt), 'mine' (bài của tôi)

    const container = document.getElementById('forum-container');
    if (!container) return;

    // 1. VẼ THANH TAB (Tùy theo quyền hạn)
    if (!document.getElementById('forum-tabs')) {
        let tabsHTML = `
        <div id="forum-tabs" class="flex flex-wrap gap-3 mb-6">
            <button id="tab-approved" onclick="window.filterForum('approved')" 
                class="px-5 py-2 rounded-lg font-bold text-sm transition border border-cyan-500/30 bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                🌐 CỘNG ĐỒNG
            </button>`;

        // Nếu là Admin/Dev -> Hiện tab Duyệt bài
        if (['admin', 'dev', 'helper'].includes(currentRole)) {
            tabsHTML += `
            <button id="tab-pending" onclick="window.filterForum('pending')" 
                class="px-5 py-2 rounded-lg font-bold text-sm transition border border-yellow-500/30 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10">
                🛡️ KHO DUYỆT BÀI ⚠️
            </button>`;
        }

        // Nếu đã đăng nhập (bất kể role nào) -> Hiện tab Bài của tôi
        if (currentUser) {
            tabsHTML += `
            <button id="tab-mine" onclick="window.filterForum('mine')" 
                class="px-5 py-2 rounded-lg font-bold text-sm transition border border-purple-500/30 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10">
                👤 BÀI CỦA TÔI
            </button>`;
        }

        tabsHTML += `</div><div id="forum-list" class="space-y-4"></div>`;
        container.innerHTML = tabsHTML;
    }

    // 2. CẬP NHẬT TRẠNG THÁI NÚT BẤM (Active State)
    const buttons = {
        'approved': document.getElementById('tab-approved'),
        'pending': document.getElementById('tab-pending'),
        'mine': document.getElementById('tab-mine')
    };

    // Reset style tất cả nút
    Object.values(buttons).forEach(btn => {
        if (btn) {
            btn.className = "px-5 py-2 rounded-lg font-bold text-sm transition border border-gray-700 text-gray-400 hover:bg-white/5";
        }
    });

    // Highlight nút đang chọn
    if (filterMode === 'approved' && buttons.approved) {
        buttons.approved.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)] border border-cyan-400";
    } else if (filterMode === 'pending' && buttons.pending) {
        buttons.pending.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-yellow-600 text-white shadow-[0_0_10px_rgba(202,138,4,0.5)] border border-yellow-400";
    } else if (filterMode === 'mine' && buttons.mine) {
        buttons.mine.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)] border border-purple-400";
    }

    // 3. LẤY DỮ LIỆU
    const listContainer = document.getElementById('forum-list');
    listContainer.innerHTML = '<div class="text-center py-8"><div class="loader-ring w-8 h-8 mx-auto"></div><p class="text-xs text-gray-500 mt-2">Đang tải dữ liệu...</p></div>';

    let posts = [];
    try {
        if (filterMode === 'mine' && currentUser) {
            posts = await fetchMyPosts(currentUser.uid);
        } else {
            // Nếu filter là 'pending' nhưng user ko phải admin -> Ép về 'approved' để bảo mật
            if (filterMode === 'pending' && !['admin', 'dev'].includes(currentRole)) filterMode = 'approved';
            posts = await fetchForumPosts(filterMode);
        }
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div class="text-red-500 text-center">Lỗi tải dữ liệu. (Có thể cần tạo Index Firestore)</div>`;
        return;
    }

    const isStaff = ['admin', 'dev'].includes(currentRole);

    if (posts.length === 0) {
        let emptyMsg = "Chưa có bài viết nào.";
        if (filterMode === 'pending') emptyMsg = "Tuyệt vời! Đã duyệt hết bài.";
        if (filterMode === 'mine') emptyMsg = "Bạn chưa đăng bài viết nào.";

        listContainer.innerHTML = `<div class="glass-panel p-8 text-center text-gray-500 italic border border-dashed border-gray-700 rounded-xl">${emptyMsg}</div>`;
        return;
    }

    // 4. RENDER DANH SÁCH
    listContainer.innerHTML = posts.map(post => {
        const isOwner = currentUser && currentUser.uid === post.authorId;
        const canDelete = isStaff || isOwner;

        // Logic hiển thị Badge trạng thái (Cho tab Bài của tôi)
        let statusBadge = '';
        if (filterMode === 'mine') {
            if (post.status === 'approved') statusBadge = `<span class="bg-green-500/20 text-green-400 border border-green-500/50 text-[10px] px-2 py-0.5 rounded uppercase font-bold">✅ Đã duyệt</span>`;
            else statusBadge = `<span class="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 text-[10px] px-2 py-0.5 rounded uppercase font-bold">⏳ Đang chờ</span>`;
        }

        return `
        <div class="glass-panel p-6 rounded-xl forum-post hover:bg-white/5 transition relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-purple-600 opacity-0 group-hover:opacity-100 transition"></div>

            <div class="flex items-start space-x-4">
                <img src="${post.avatar || `https://mc-heads.net/avatar/${post.author}`}" class="w-12 h-12 rounded-lg border border-purple-500/30 shadow-sm bg-gray-900 object-cover">
                <div class="flex-1 w-full min-w-0">
                    <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <h4 class="font-bold title-font text-white truncate max-w-[150px] sm:max-w-xs">${post.author}</h4>
                            <span class="text-[10px] bg-gray-800 border border-gray-700 px-2 py-0.5 rounded text-gray-400">${post.authorRole || 'Member'}</span>
                            ${statusBadge}
                        </div>
                        <span class="text-xs text-purple-300/70 font-mono">${new Date(post.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                    
                    <h3 class="text-lg sm:text-xl font-bold title-font mb-2 text-cyan-200 break-words">${post.title}</h3>
                    <div class="text-purple-100/80 text-sm mb-4 whitespace-pre-line bg-black/20 p-3 rounded-lg border border-white/5 overflow-hidden break-words">${post.content}</div>
                    
                    <div class="flex items-center justify-between border-t border-gray-700/50 pt-3 mt-2">
                        <button onclick="window.toggleComments('${post.id}')" class="text-xs sm:text-sm text-gray-400 hover:text-cyan-400 transition flex items-center gap-2 group-btn">
                            <span class="group-btn-hover:scale-110 transition">💬</span> Bình luận
                        </button>
                        
                        <div class="flex gap-2">
                            ${filterMode === 'pending' && isStaff ? `<button onclick="window.approvePost('${post.id}')" class="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold shadow-lg shadow-green-900/20">✅ DUYỆT NGAY</button>` : ''}
                            ${canDelete ? `<button onclick="window.deletePost('forum_posts', '${post.id}')" class="text-red-500 hover:text-red-300 text-xs font-bold border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded transition">🗑️ Xóa</button>` : ''}
                        </div>
                    </div>

                    <div id="comments-section-${post.id}" class="hidden mt-4 pl-0 sm:pl-4 border-l-0 sm:border-l-2 border-purple-500/20">
                        <div id="comments-list-${post.id}" class="space-y-3 mb-3 max-h-60 overflow-y-auto custom-scrollbar p-1"></div>
                        ${currentUser ? `
                        <div class="flex gap-2 relative">
                            <input type="text" id="comment-input-${post.id}" class="cyber-input w-full px-4 py-2 rounded-full text-sm pr-10" placeholder="Viết bình luận..." onkeydown="if(event.key==='Enter') window.sendComment('${post.id}')">
                            <button onclick="window.sendComment('${post.id}')" class="absolute right-1 top-1 bg-cyan-600 hover:bg-cyan-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition">➤</button>
                        </div>` : '<p class="text-xs text-gray-500 italic bg-black/30 p-2 rounded text-center">Đăng nhập để tham gia thảo luận.</p>'}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

async function renderComments(postId) {
    const container = document.getElementById(`comments-list-${postId}`);
    container.innerHTML = '<div class="text-xs text-gray-500">Đang tải...</div>';

    try {
        const comments = await fetchComments(postId);
        const isStaff = ['admin', 'dev'].includes(currentRole);

        if (comments.length === 0) {
            container.innerHTML = '<div class="text-xs text-gray-600 italic">Chưa có bình luận nào.</div>';
            return;
        }

        container.innerHTML = comments.map(c => {
            const isOwner = currentUser && currentUser.uid === c.uid;
            const canDel = isStaff || isOwner;
            return `
            <div class="flex gap-3">
                <img src="${c.avatar}" class="w-6 h-6 rounded-full border border-gray-600">
                <div class="bg-gray-800/50 rounded-lg px-3 py-2 w-full border border-gray-700">
                    <div class="flex justify-between items-baseline mb-1">
                        <span class="text-xs font-bold text-cyan-400">${c.username}</span>
                        <div class="flex gap-2 items-center">
                            <span class="text-[10px] text-gray-500">${new Date(c.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            ${canDel ? `<button onclick="window.deleteCommentAction('${postId}', '${c.id}')" class="text-red-500 hover:text-white text-[10px]">✕</button>` : ''}
                        </div>
                    </div>
                    <p class="text-sm text-gray-300">${c.content}</p>
                </div>
            </div>`;
        }).join('');
    } catch (e) { console.error(e); }
}

async function renderAdminTable() {
    const tbody = document.getElementById('admin-user-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-purple-300">⏳ Đang tải dữ liệu...</td></tr>';

    try {
        const users = await fetchAllUsers();
        document.getElementById('total-users-count').innerText = users.length;

        tbody.innerHTML = users.map(u => {
            const isMe = currentUser && currentUser.uid === u.id;
            const avatar = u.photoURL || `https://mc-heads.net/avatar/${u.username}`;
            const roles = ['member', 'vip', 'media', 'helper', 'dev', 'admin'];

            return `
            <tr class="hover:bg-white/5 transition border-b border-purple-500/10 user-row">
                <td class="p-4 flex items-center gap-3">
                    <img src="${avatar}" class="w-8 h-8 rounded border border-purple-500/30">
                    <div>
                        <div class="font-bold text-white text-sm">${u.username} ${isMe ? '<span class="text-cyan-400">(Bạn)</span>' : ''}</div>
                    </div>
                </td>
                <td class="p-4 text-gray-400 text-xs">${u.email}</td>
                <td class="p-4 text-gray-400 text-xs">${u.joinedAt ? new Date(u.joinedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                <td class="p-4">
                    <select onchange="window.handleRoleChange('${u.id}', this.value)" class="bg-black/50 border border-purple-500/30 text-xs text-white rounded px-2 py-1 outline-none">
                        ${roles.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''} class="bg-gray-900">${r.toUpperCase()}</option>`).join('')}
                    </select>
                </td>
                <td class="p-4 text-center">
                    ${!isMe ? `<button onclick="window.handleDeleteUser('${u.id}', '${u.username}')" class="text-red-500 hover:text-white bg-red-500/10 p-1.5 rounded">🗑️</button>` : ''}
                </td>
            </tr>`;
        }).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" class="text-red-500 text-center">Lỗi: ${e.message}</td></tr>`; }
}

// ==========================================
// 4. AUTH & INIT (Khởi động)
// ==========================================

// Chuyển đổi giữa các form Login / Register / Forgot
window.switchAuthForm = (formId) => {
    document.querySelectorAll('.auth-form').forEach(el => el.classList.add('hidden'));
    document.getElementById(`form-${formId}`).classList.remove('hidden');
};

function setupAuthForms() {
    // Login
    document.getElementById('email-login-form').onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        try {
            await loginEmail(input, pass);
            document.getElementById('auth-modal').classList.remove('active');
        } catch (err) { alert("Đăng nhập thất bại: " + err.message); }
    };

    // Register
    document.getElementById('email-register-form').onsubmit = async (e) => {
        e.preventDefault();
        const user = document.getElementById('reg-username').value;
        const pass = document.getElementById('reg-pass').value;
        try {
            await registerEmail(user, pass);
            alert("Đăng ký thành công!");
            document.getElementById('auth-modal').classList.remove('active');
        } catch (err) { alert("Đăng ký lỗi: " + err.message); }
    };

    // Forgot Password
    document.getElementById('forgot-pass-form').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        try {
            await resetPassword(email);
            alert("Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư!");
            window.switchAuthForm('login');
        } catch (err) { alert("Lỗi: " + err.message); }
    };

    // Google
    document.getElementById('google-login-btn').onclick = async () => {
        try { await loginGoogle(); document.getElementById('auth-modal').classList.remove('active'); }
        catch (e) { alert(e.message); }
    };
}

function handleAuthUI(user, role) {
    currentUser = user;
    currentRole = role;
    const authDisplay = document.getElementById('auth-display');

    if (user) {
        // 1. XỬ LÝ GIAO DIỆN ĐĂNG NHẬP
        const avatar = user.photoURL || `https://mc-heads.net/avatar/${user.displayName}`; 
        authDisplay.innerHTML = `
            <div class="relative group z-50">
                <button class="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-full hover:bg-white/10 transition border border-cyan-400/30">
                    <img src="${avatar}" class="w-8 h-8 rounded-full border border-cyan-400 object-cover">
                    <div class="text-left hidden sm:block">
                        <div class="text-sm font-bold text-white leading-none">${user.displayName}</div>
                        <div class="text-[10px] text-purple-300 font-bold uppercase">${role}</div>
                    </div>
                </button>
                <div class="absolute right-0 mt-2 w-48 bg-[#0f0f1a] border border-purple-500/30 rounded-xl shadow-2xl invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 overflow-hidden">
                    <button id="btn-profile" class="block w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-purple-500/20 hover:text-white">👤 Hồ sơ</button>
                    ${['admin'].includes(role) ? `<button id="btn-admin" class="block w-full text-left px-4 py-3 text-sm hover:bg-yellow-500/20 font-bold">👤 Quản Lý User</button>` : ''}
                    ${['admin', 'dev'].includes(role) ? `<a href="admin.html" class="block w-full text-left px-4 py-3 text-sm text-yellow-400 hover:bg-yellow-500/20 font-bold no-underline">🛡️ Admin Panel</a>` : ''}
                    <button id="btn-logout" class="block w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/20 border-t border-gray-700">⏏ Đăng xuất</button>
                </div>
            </div>`;

        // Gán sự kiện click
        document.getElementById('btn-logout').onclick = () => { showCustomModal("ĐĂNG XUẤT", "Bạn có chắc chắn muốn đăng xuất?", "confirm", () => logout()); };
        document.getElementById('btn-profile').onclick = () => {
            document.getElementById('edit-name').value = user.displayName;
            document.getElementById('edit-avatar').value = user.photoURL || '';
            document.getElementById('profile-preview').src = avatar;
            document.getElementById('profile-modal').classList.add('active');
        };
        if (document.getElementById('btn-admin')) {
            document.getElementById('btn-admin').onclick = () => {
                document.getElementById('admin-modal').classList.add('active');
                renderAdminTable();
            };
        }

        // 2. SỬA LỖI MEMBER KHÔNG THẤY NÚT ĐĂNG BÀI
        // Thêm 'member' vào danh sách cho phép
        if (['admin', 'dev', 'helper', 'member'].includes(role)) {
            const btn = document.getElementById('create-post-trigger');
            if (btn) btn.classList.remove('hidden');
        }

        const oldTabs = document.getElementById('forum-tabs');
        if (oldTabs) oldTabs.remove();

        // 2. Nếu đang đứng ở trang Diễn đàn, VẼ LẠI CÁI MỚI NGAY
        if (document.getElementById('section-forum').classList.contains('active')) {
            renderForum('approved');
        }

    } else {
        // ... (Giữ nguyên phần chưa đăng nhập)
        authDisplay.innerHTML = `<button id="login-trigger" class="cyber-btn px-6 py-2.5 rounded-lg font-bold text-sm title-font">LOGIN ⚡</button>`;
        document.getElementById('login-trigger').onclick = () => document.getElementById('auth-modal').classList.add('active');
        const btn = document.getElementById('create-post-trigger');
        if (btn) btn.classList.add('hidden');

        // Nếu logout, cũng cần reset lại forum để mất nút Duyệt
        const oldTabs = document.getElementById('forum-tabs');
        if (oldTabs) oldTabs.remove();
        if (document.getElementById('section-forum').classList.contains('active')) renderForum('approved');
    }
}

// Particle Effect 
const initParticles = () => {
    const canvas = document.getElementById('particle-network');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particlesArray = [];

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.color = Math.random() > 0.5 ? '#8b5cf6' : '#22d3ee';
        }
        update() {
            this.x += this.speedX; this.y += this.speedY;
            if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
            if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
        }
        draw() {
            ctx.fillStyle = this.color; ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    for (let i = 0; i < Math.floor((canvas.width * canvas.height) / 20000); i++) particlesArray.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update(); particlesArray[i].draw();
            for (let j = i; j < particlesArray.length; j++) {
                const dx = particlesArray[i].x - particlesArray[j].x;
                const dy = particlesArray[i].y - particlesArray[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    ctx.beginPath(); ctx.strokeStyle = `rgba(139, 92, 246, ${0.1 - dist / 1000})`;
                    ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                    ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
};

window.addEventListener('load', async () => {
    // 1. Setup UI
    initParticles();
    setTimeout(() => document.getElementById('preloader')?.classList.add('hidden'), 800);

    // 2. Setup Modals Close Logic
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
        m.querySelectorAll('.close-modal').forEach(b => b.onclick = () => m.classList.remove('active'));
    });

    window.showCustomModal = showCustomModal;

    setupAuthForms();

    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const desktopLinks = document.getElementById('nav-links');

    if (mobileBtn && mobileMenu && desktopLinks) {
        // 1. Tạo link cho mobile từ menu desktop (để không phải viết lại HTML)
        const links = desktopLinks.querySelectorAll('a');
        let mobileHtml = '';
        
        links.forEach(link => {
            const target = link.getAttribute('data-nav');
            const text = link.innerText;
            // Tạo thẻ a mới với style phù hợp cho mobile
            mobileHtml += `<a href="#${target}" 
                class="nav-link block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg font-bold title-font transition mb-1" 
                data-nav="${target}">
                ${text}
            </a>`;
        });
        mobileMenu.innerHTML = mobileHtml;

        // 2. Bắt sự kiện click nút Menu
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        // 3. Tự động đóng menu khi click vào link
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // 3. Setup Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Active Link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show Section
            const target = link.getAttribute('data-nav');
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${target}`).classList.add('active');

            // Render content khi chuyển tab
            if (target === 'news') renderNews();
            if (target === 'guide') renderGuides();
            if (target === 'forum') renderForum('approved');
            if (target === 'admin') renderAdminTable();

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // 4. Setup Profile Save
    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.innerHTML = "⏳...";
        try {
            await updateUserProfile(document.getElementById('edit-name').value, document.getElementById('edit-avatar').value);
            showCustomModal("THÀNH CÔNG", "Hồ sơ đã được cập nhật!", "info");
            document.getElementById('profile-modal').classList.remove('active');
        } catch (err) { showCustomModal("LỖI", err.message, "danger"); }
        finally { btn.innerHTML = "LƯU THAY ĐỔI 💾"; }
    });

    // 6. Setup Create Post
    document.getElementById('create-post-trigger')?.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('active');
    });

    document.getElementById('forum-post-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('forum-title').value;
        const content = document.getElementById('forum-content').value;
        try {
            const status = ['admin', 'dev'].includes(currentRole) ? 'approved' : 'pending';
            await createPost('forum_posts', { title, content, status, authorRole: currentRole });
            showCustomModal(status === 'approved' ? "ĐĂNG BÀI THÀNH CÔNG" : "ĐÃ GỬI DUYỆT", status === 'approved' ? "Bài viết đã được đăng!" : "Bài viết đang chờ admin duyệt.", "info");
            document.getElementById('post-modal').classList.remove('active');
            renderForum(status === 'approved' ? 'approved' : 'pending');
        } catch (e) { showCustomModal("LỖI ĐĂNG BÀI", e.message, "danger"); }
    });

    // 7. Setup Search Admin
    document.getElementById('user-search')?.addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.user-row').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
        });
    });

    // 8. Load Content & Auth
    renderNews();
    renderGuides();
    renderForum('approved');
    subscribeToAuth(handleAuthUI);
});

// Các sự kiện click nút trang chủ
document.getElementById('copy-ip-btn').onclick = window.copyServerIP;
document.getElementById('discord-btn').onclick = window.openDiscord;