
// Configuration object
const defaultConfig = {
    server_name: "CornMiner.top",
    server_ip: "cornminer.top",
    discord_link: "https://discord.gg/cUsA2K4Cpz",
    welcome_title: "Chào mừng đến với CornMiner.top",
    welcome_description: "Thế giới sinh tồn đầy thử thách và sáng tạo! Tại đây, bạn có thể khám phá thông tin về máy chủ, hướng dẫn người chơi mới, xem hình ảnh và công trình nổi bật trong server."
};

let currentSection = 'home';

// Element SDK initialization
async function onConfigChange(config) {
    const serverName = config.server_name || defaultConfig.server_name;
    const serverIP = config.server_ip || defaultConfig.server_ip;
    const welcomeTitle = config.welcome_title || defaultConfig.welcome_title;
    const welcomeDescription = config.welcome_description || defaultConfig.welcome_description;

    // Update navigation
    const navServerName = document.getElementById('nav-server-name');
    if (navServerName) navServerName.textContent = serverName;

    // Update hero section
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) heroTitle.textContent = welcomeTitle;

    const heroDescription = document.getElementById('hero-description');
    if (heroDescription) heroDescription.textContent = welcomeDescription;

    // Update server IP displays
    const serverIPDisplay = document.getElementById('server-ip-display');
    if (serverIPDisplay) serverIPDisplay.textContent = serverIP;

    const guideServerIP = document.getElementById('guide-server-ip');
    if (guideServerIP) guideServerIP.textContent = serverIP;
}

function mapToCapabilities(config) {
    return {
        recolorables: [
            {
                get: () => config.primary_color || "#ff6b35",
                set: (value) => {
                    config.primary_color = value;
                    if (window.elementSdk) {
                        window.elementSdk.setConfig({ primary_color: value });
                    }
                }
            },
            {
                get: () => config.secondary_color || "#ffcc02",
                set: (value) => {
                    config.secondary_color = value;
                    if (window.elementSdk) {
                        window.elementSdk.setConfig({ secondary_color: value });
                    }
                }
            },
            {
                get: () => config.background_color || "#1a0b2e",
                set: (value) => {
                    config.background_color = value;
                    if (window.elementSdk) {
                        window.elementSdk.setConfig({ background_color: value });
                    }
                }
            }
        ],
        borderables: [],
        fontEditable: {
            get: () => config.font_family || "Courier New",
            set: (value) => {
                config.font_family = value;
                if (window.elementSdk) {
                    window.elementSdk.setConfig({ font_family: value });
                }
            }
        },
        fontSizeable: {
            get: () => config.font_size || 16,
            set: (value) => {
                config.font_size = value;
                if (window.elementSdk) {
                    window.elementSdk.setConfig({ font_size: value });
                }
            }
        }
    };
}

function mapToEditPanelValues(config) {
    return new Map([
        ["server_name", config.server_name || defaultConfig.server_name],
        ["server_ip", config.server_ip || defaultConfig.server_ip],
        ["discord_link", config.discord_link || defaultConfig.discord_link],
        ["welcome_title", config.welcome_title || defaultConfig.welcome_title],
        ["welcome_description", config.welcome_description || defaultConfig.welcome_description]
    ]);
}

// Initialize Element SDK
if (window.elementSdk) {
    window.elementSdk.init({
        defaultConfig,
        onConfigChange,
        mapToCapabilities,
        mapToEditPanelValues
    });
}

function showSection(sectionName) {
    // Hide all sections
    const sections = ['home', 'map', 'leaderboard', 'news', 'guide'];
    sections.forEach(section => {
        const element = document.getElementById(section + '-section');
        if (element) {
            element.classList.add('section-hidden');
        }
    });

    // Show target section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.remove('section-hidden');
        targetSection.classList.add('fade-in');
        currentSection = sectionName;
    }

    // Close mobile menu
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
}

function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('hidden');
    }
}

function copyServerIP() {
    const config = window.elementSdk ? window.elementSdk.config : defaultConfig;
    const serverIP = config.server_ip || defaultConfig.server_ip;

    navigator.clipboard.writeText(serverIP).then(() => {
        showSuccessMessage(`Đã sao chép IP: ${serverIP}`);
    }).catch(() => {
        showSuccessMessage(`IP máy chủ: ${serverIP}`);
    });
}

function openDiscord() {
    const config = window.elementSdk ? window.elementSdk.config : defaultConfig;
    const discordLink = config.discord_link || defaultConfig.discord_link;
    window.open(discordLink, '_blank', 'noopener,noreferrer');
}

function showLeaderboard(category) {
    const title = document.getElementById('leaderboard-title');
    const buttons = document.querySelectorAll('#leaderboard-section button');

    // Reset button styles
    buttons.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes('showLeaderboard')) {
            btn.className = 'glass-effect text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-colors font-semibold';
        }
    });

    // Highlight active button
    event.target.className = 'corn-gradient text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all';

    // Update title based on category
    const titles = {
        'playtime': '⏱️ Top thời gian chơi',
        'kills': '🗡️ Top tiêu diệt',
        'money': '💰 Top tài sản',
        'achievements': '🧱 Top thành tựu'
    };

    if (title) {
        title.textContent = titles[category] || titles.playtime;
    }
}

function showSuccessMessage(message) {
    const successMessage = document.getElementById('success-message');
    const successText = document.getElementById('success-text');

    if (successText) successText.textContent = message;
    if (successMessage) {
        successMessage.classList.remove('section-hidden');

        setTimeout(() => {
            successMessage.classList.add('section-hidden');
        }, 4000);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    showSection('home');
});
