import { 
    subscribeToAuth, loginGoogle, logout,
    fetchNews, fetchGuides, fetchForumPosts, createPost, 
    fetchAllUsers, deleteUserAndData, updateUserProfile, editDocument, 
    deleteDocument, fetchComments, addComment, deleteComment
} from './core.js';

let currentTab = 'dashboard';

// 1. KIỂM TRA QUYỀN ADMIN KHI VÀO TRANG
subscribeToAuth((user, role) => {
    if (!user || !['admin', 'dev'].includes(role)) {
        alert("⛔ BẠN KHÔNG CÓ QUYỀN TRUY CẬP TRANG NÀY!");
        window.location.href = 'index.html'; // Đá về trang chủ
    } else {
        // Load dữ liệu lần đầu
        loadDashboard();
    }
});

document.getElementById('logout-btn').onclick = async () => {
    await signOut(auth);
    window.location.href = 'index.html';
};

// 2. CHUYỂN TAB
window.switchTab = (tabName) => {
    // Ẩn tất cả tab
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.add('hidden'));
    // Hiện tab được chọn
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    
    // Highlight sidebar
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');

    // Load dữ liệu tương ứng
    if(tabName === 'dashboard') loadDashboard();
    if(tabName === 'users') loadUsers();
    if(tabName === 'news') loadPosts('news');
    if(tabName === 'guides') loadPosts('guides');
    if(tabName === 'forum') loadPendingForum();
};

// 3. LOAD DASHBOARD (THỐNG KÊ)
async function loadDashboard() {
    const users = await fetchAllUsers();
    const pending = await fetchForumPosts('pending');
    const news = await fetchNews();
    const guides = await fetchGuides();

    document.getElementById('stat-users').innerText = users.length;
    document.getElementById('stat-pending').innerText = pending.length;
    document.getElementById('stat-news').innerText = news.length;
    document.getElementById('stat-guides').innerText = guides.length;

    // Badge thông báo bài chờ duyệt
    const badge = document.getElementById('pending-badge');
    if(pending.length > 0) {
        badge.innerText = pending.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// hien thi ảnh xem trước
document.getElementById('edit-image').addEventListener('input', (e) => {
    const img = document.getElementById('edit-image-preview');
    const url = e.target.value.trim();
    if (url) {
        img.src = url;
        img.classList.remove('hidden');
    } else {
        img.classList.add('hidden');
    }
});

// 4. QUẢN LÝ USER (CÓ BAN/UNBAN & BẢO VỆ ADMIN)
async function loadUsers() {
    const list = document.getElementById('user-list');
    list.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500">Đang tải...</td></tr>';
    
    const users = await fetchAllUsers();
    
    list.innerHTML = users.map(u => {
        const isBanned = u.isBanned === true;
        const banClass = isBanned ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500';
        const banText = isBanned ? 'Đã BAN' : 'Hoạt động';
        
        // 1. Kiểm tra xem user này có phải là ADMIN không
        const isAdmin = u.role === 'admin';

        // 2. Xử lý Cột Chọn Role (Quyền)
        let roleDisplay = '';
        if (isAdmin) {
            // Nếu là Admin -> Hiện mác tĩnh, KHÔNG cho dropdown để sửa
            roleDisplay = `<span class="bg-red-900/50 text-red-400 font-bold px-3 py-1.5 rounded text-xs border border-red-500/30 shadow-[0_0_10px_rgba(248,113,113,0.2)]">👑 ADMIN</span>`;
        } else {
            // Nếu không phải Admin -> Hiện Dropdown bình thường
            // LƯU Ý: Đã xóa 'admin' ra khỏi danh sách này để không ai cấp quyền admin được
            const roles = ['member', 'vip', 'media', 'helper', 'dev'];
            roleDisplay = `
                <select onchange="window.updateUserRole('${u.id}', this.value)" class="bg-black border border-gray-700 text-xs rounded px-2 py-1 text-white hover:border-cyan-500 transition outline-none">
                    ${roles.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r.toUpperCase()}</option>`).join('')}
                </select>
            `;
        }

        // 3. Xử lý Cột Nút Bấm Thao Tác (Ban/Unban)
        let actionButton = '';
        if (isAdmin) {
            // Bảo vệ Admin: Không có nút BAN
            actionButton = `<span class="text-[10px] text-gray-600 italic font-bold">VÔ HIỆU HÓA THAO TÁC</span>`;
        } else {
            // User thường: Hiện nút thao tác bình thường
            actionButton = `
                <button onclick="window.toggleBanUser('${u.id}', ${isBanned})" 
                    class="text-xs font-bold px-3 py-1 rounded border ${isBanned ? 'border-green-500 text-green-500 hover:bg-green-500/10' : 'border-red-500 text-red-500 hover:bg-red-500/10'} transition">
                    ${isBanned ? 'MỞ KHÓA' : 'BAN'}
                </button>
            `;
        }

        return `
        <tr class="hover:bg-white/5 transition border-b border-white/5">
            <td class="p-4 flex items-center gap-3">
                <img src="${u.photoURL || `https://mc-heads.net/avatar/${u.username}`}" class="w-8 h-8 rounded border border-gray-700 object-cover bg-black">
                <span class="font-bold text-white">${u.username}</span>
            </td>
            <td class="p-4 text-gray-400 text-xs">${u.email}</td>
            <td class="p-4">${roleDisplay}</td>
            <td class="p-4"><span class="text-xs px-2 py-1 rounded font-bold ${banClass}">${banText}</span></td>
            <td class="p-4 text-right">
                ${actionButton}
            </td>
        </tr>`;
    }).join('');
}

window.updateUserRole = async (uid, newRole) => {
    if(confirm(`Đổi quyền user này thành ${newRole}?`)) {
        await editDocument('users', uid, { role: newRole });
        alert("Đã cập nhật!");
    }
};

window.toggleBanUser = async (uid, currentStatus) => {
    // Nếu currentStatus = true (đang ban) -> Muốn mở -> isBanned = false
    const action = currentStatus ? "MỞ KHÓA" : "BAN VĨNH VIỄN";
    if(confirm(`Bạn có chắc muốn ${action} người dùng này?`)) {
        await editDocument('users', uid, { isBanned: !currentStatus });
        loadUsers(); // Load lại bảng
    }
};

// 5. QUẢN LÝ BÀI VIẾT (TIN TỨC / HƯỚNG DẪN)
async function loadPosts(collectionName) {
    const container = document.getElementById(`${collectionName}-list`);
    container.innerHTML = '<div class="text-center text-gray-500">Đang tải...</div>';
    
    let items = [];
    if(collectionName === 'news') items = await fetchNews();
    else items = await fetchGuides();

    container.innerHTML = items.map(item => `
        <div class="admin-card p-4 rounded-lg flex justify-between items-center">
            <div>
                <h4 class="font-bold text-lg text-white">${item.title}</h4>
                <p class="text-xs text-gray-500">ID: ${item.id} • ${new Date(item.createdAt?.seconds*1000).toLocaleDateString()}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="window.prepareEdit('${collectionName}', '${item.id}')" class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-500">Sửa</button>
                <button onclick="window.deleteItem('${collectionName}', '${item.id}')" class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-500">Xóa</button>
            </div>
        </div>
    `).join('');
}

// 6. FORM EDITOR (THÊM / SỬA)
window.openEditor = (collectionName) => {
    // Reset form để thêm mới
    document.getElementById('editor-form').reset();
    document.getElementById('edit-id').value = ''; 
    document.getElementById('edit-collection').value = collectionName;
    document.getElementById('editor-modal').classList.remove('hidden');
    document.getElementById('edit-collection').value = collectionName;
    document.getElementById('editor-form').reset();
    document.getElementById('edit-id').value = ''; 
    document.getElementById('edit-collection').value = collectionName;
    document.getElementById('edit-image').value = '';
    document.getElementById('edit-image-preview').classList.add('hidden');
    document.getElementById('edit-image-preview').src = '';
    
    let title = '';
    if (collectionName === 'news') title = 'THÊM TIN TỨC';
    else if (collectionName === 'guides') title = 'THÊM HƯỚNG DẪN';
    else if (collectionName === 'forum_posts') title = 'THÊM BÀI VIẾT DIỄN ĐÀN'; 
    
    document.getElementById('editor-title').innerText = title;
    
    // Ẩn/Hiện ô danh mục (chỉ news cần)
    const catInput = document.getElementById('edit-cat').parentElement;
    if(collectionName === 'news') catInput.classList.remove('hidden');
    else catInput.classList.add('hidden');

    document.getElementById('editor-modal').classList.remove('hidden');
};

window.closeEditor = () => document.getElementById('editor-modal').classList.add('hidden');

window.prepareEdit = async (collectionName, id) => {
    // Tìm bài viết trong list hiện tại (đã load) để đỡ fetch lại
    // Hoặc fetch lại single doc nếu cần. Ở đây ta dùng trick lấy text từ UI hoặc load lại list array toàn cục (để đơn giản ta sẽ không fetch lại mà giả sử loadPosts đã chạy).
    // Tốt nhất là fetch lại list để tìm object.
    
    let items = collectionName === 'news' ? await fetchNews() : await fetchGuides();
    const item = items.find(i => i.id === id);

    if(item) {
        document.getElementById('edit-id').value = item.id;
        document.getElementById('edit-collection').value = collectionName;
        document.getElementById('edit-title').value = item.title;
        document.getElementById('edit-content').value = item.content;
        document.getElementById('edit-cat').value = item.category || '';

        const imgInput = document.getElementById('edit-image');
        const imgPreview = document.getElementById('edit-image-preview');
        
        imgInput.value = item.imageUrl || ''; // Lấy link ảnh từ database
        if (item.imageUrl) {
            imgPreview.src = item.imageUrl;
            imgPreview.classList.remove('hidden');
        } else {
            imgPreview.classList.add('hidden');
        }
        
        document.getElementById('editor-title').innerText = `SỬA ${collectionName.toUpperCase()}`;
        document.getElementById('editor-modal').classList.remove('hidden');
    }
};

document.getElementById('editor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const collectionName = document.getElementById('edit-collection').value;
    const data = {
        title: document.getElementById('edit-title').value,
        content: document.getElementById('edit-content').value,
        category: document.getElementById('edit-cat').value,
        imageUrl: document.getElementById('edit-image').value.trim()
    };

    try {
        if(id) {
            // Sửa
            await editDocument(collectionName, id, data);
            alert("Đã cập nhật bài viết!");
        } else {
            // Thêm mới
            await createPost(collectionName, data);
            alert("Đã thêm bài viết mới!");
        }
        closeEditor();
        loadPosts(collectionName); // Refresh list
    } catch(err) {
        alert("Lỗi: " + err.message);
    }
});

window.deleteItem = async (col, id) => {
    if(confirm("Xóa vĩnh viễn bài viết này?")) {
        await deleteDocument(col, id);
        loadPosts(col);
    }
};

// 7. DUYỆT BÀI DIỄN ĐÀN
async function loadPendingForum() {
    const list = document.getElementById('forum-pending-list');
    list.innerHTML = '<div class="text-gray-500">Đang tải bài chờ duyệt...</div>';
    
    const posts = await fetchForumPosts('pending');
    
    if(posts.length === 0) {
        list.innerHTML = '<div class="p-8 text-center bg-white/5 rounded-xl">✅ Không có bài viết nào chờ duyệt!</div>';
        return;
    }

    list.innerHTML = posts.map(p => `
        <div class="admin-card p-6 rounded-xl border-l-4 border-yellow-500">
            <h4 class="font-bold text-xl text-yellow-400 mb-2">${p.title}</h4>
            <div class="bg-black/30 p-3 rounded mb-3 text-sm text-gray-300 whitespace-pre-line">${p.content}</div>
            <div class="flex justify-between items-center">
                <span class="text-xs text-gray-500">Tác giả: ${p.author} • ${new Date(p.createdAt?.seconds*1000).toLocaleString()}</span>
                <div class="flex gap-3">
                    <button onclick="window.approveForumPost('${p.id}')" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold text-sm">✅ DUYỆT</button>
                    <button onclick="window.deleteItem('forum_posts', '${p.id}')" class="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold text-sm">🗑️ XÓA</button>
                </div>
            </div>
        </div>
    `).join('');
}

window.approveForumPost = async (id) => {
    if(confirm("Duyệt bài viết này lên trang chủ?")) {
        await editDocument('forum_posts', id, { status: 'approved' });
        loadPendingForum(); // Refresh list
        loadDashboard(); // Refresh badge
    }
};