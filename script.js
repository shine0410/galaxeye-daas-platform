// Global Variables
let map;
let currentScreen = 'login-screen';
let loginAttempts = 0;
let tutorialStep = 1;
let drawingMode = false;
let currentRectangle = null;
let isFirstLogin = true;
let currentHighlight = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    updateTime();
    setInterval(updateTime, 1000);
    createProgressDots();
});

// Update Current Time
function updateTime() {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        }) + ' UTC';
    }
}

// Screen Management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
    
    if (screenId === 'dashboard-screen') {
        setTimeout(initializeMap, 100);
        if (isFirstLogin) {
            setTimeout(startTutorial, 800);
            isFirstLogin = false;
        }
    }
}

// Event Listeners
function initializeEventListeners() {
    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }
    
    // Upload Area
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => document.getElementById('file-input').click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleFileDrop);
    }
    
    // File Input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
}

// Login Handler
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const captcha = document.getElementById('captcha').checked;
    const attemptsDiv = document.getElementById('login-attempts');
    
    if (!captcha) {
        showNotification('Please complete the CAPTCHA verification', 'warning');
        return;
    }
    
    loginAttempts++;
    
    if (loginAttempts >= 4) {
        attemptsDiv.innerHTML = `
            <div style="background: rgba(255, 0, 110, 0.1); border: 1px solid rgba(255, 0, 110, 0.3); padding: 15px; border-radius: 10px; color: #ff006e; margin-top: 15px;">
                <i class="fas fa-lock"></i> <strong>Account Locked</strong><br>
                <small>Too many failed attempts. Please reset your password or contact support.</small>
            </div>
        `;
        document.getElementById('login-form').querySelectorAll('input, button').forEach(el => el.disabled = true);
        return;
    }
    
    // Show attempt counter
    attemptsDiv.innerHTML = `
        <div style="background: rgba(255, 190, 11, 0.1); border: 1px solid rgba(255, 190, 11, 0.3); padding: 12px; border-radius: 10px; color: #ffbe0b; margin-top: 15px;">
            <i class="fas fa-exclamation-triangle"></i> Login attempt ${loginAttempts}/4
        </div>
    `;
    
    if (loginAttempts === 3) {
        // Success on 3rd attempt for demo
        setTimeout(() => {
            attemptsDiv.innerHTML = `
                <div style="background: rgba(6, 255, 165, 0.1); border: 1px solid rgba(6, 255, 165, 0.3); padding: 12px; border-radius: 10px; color: #06ffa5; margin-top: 15px;">
                    <i class="fas fa-check-circle"></i> Login successful! Redirecting...
                </div>
            `;
            setTimeout(() => showScreen('dashboard-screen'), 1000);
        }, 500);
    }
}

// Registration Handler
function handleRegistration(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('full-name').value;
    const email = document.getElementById('email').value;
    const captcha = document.getElementById('register-captcha').checked;
    
    // Validate full name (alphabetic only)
    if (!/^[A-Za-z\s]+$/.test(fullName)) {
        showNotification('Full Name must contain only alphabetic characters', 'error');
        return;
    }
    
    // Validate email domain
    const allowedDomains = ['organization.com', 'company.com', 'gov.in', 'edu', 'space'];
    const emailDomain = email.split('@')[1];
    if (!allowedDomains.some(domain => emailDomain?.includes(domain))) {
        showNotification('Email must be from an approved organizational domain', 'error');
        return;
    }
    
    if (!captcha) {
        showNotification('Please complete the CAPTCHA verification', 'warning');
        return;
    }
    
    // Check if at least one subscription is selected
    const subscriptions = document.querySelectorAll('input[name="subscription"]:checked');
    if (subscriptions.length === 0) {
        showNotification('Please select at least one data subscription', 'warning');
        return;
    }
    
    // Show success modal
    document.getElementById('success-modal').classList.add('active');
}

// Map Initialization
function initializeMap() {
    if (map) return;
    
    map = L.map('map', {
        center: [20, 0],
        zoom: 2,
        zoomControl: false,
        attributionControl: false
    });
    
    // Dark theme tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd'
    }).addTo(map);
    
    // Add custom attribution
    L.control.attribution({
        position: 'bottomright',
        prefix: 'GalaxEye Space'
    }).addTo(map);
    
    // Add click handler for drawing
    map.on('click', handleMapClick);
}

// Drawing Tool
let drawStart = null;

function activateDrawTool() {
    drawingMode = !drawingMode;
    const toolBtn = document.querySelector('[data-tool="draw"]');
    
    if (drawingMode) {
        toolBtn.classList.add('active');
        map.getContainer().style.cursor = 'crosshair';
        showNotification('Draw Mode: Click twice to create a rectangle', 'info');
    } else {
        toolBtn.classList.remove('active');
        map.getContainer().style.cursor = '';
        drawStart = null;
    }
}

function handleMapClick(e) {
    if (!drawingMode) return;
    
    if (!drawStart) {
        drawStart = e.latlng;
        showNotification('Click again to complete the rectangle', 'info');
    } else {
        const bounds = L.latLngBounds(drawStart, e.latlng);
        
        // Remove previous rectangle
        if (currentRectangle) {
            map.removeLayer(currentRectangle);
        }
        
        // Calculate area
        const area = calculateArea(bounds);
        const isValid = area >= 1 && area <= 10000; // 1 to 10,000 sq km
        
        // Draw rectangle
        currentRectangle = L.rectangle(bounds, {
            color: isValid ? '#06ffa5' : '#ff006e',
            weight: 3,
            fillOpacity: 0.2
        }).addTo(map);
        
        // Update AOI info
        updateAOIInfo(area, isValid, bounds);
        
        drawStart = null;
        drawingMode = false;
        map.getContainer().style.cursor = '';
        document.querySelector('[data-tool="draw"]').classList.remove('active');
        
        // Fit map to bounds
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

function calculateArea(bounds) {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    // Rough calculation in sq km
    const latDiff = Math.abs(ne.lat - sw.lat);
    const lngDiff = Math.abs(ne.lng - sw.lng);
    
    return Math.round(latDiff * lngDiff * 12100); // Approximate
}

function updateAOIInfo(area, isValid, bounds) {
    const infoBox = document.getElementById('aoi-info');
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    infoBox.className = 'info-box glass-effect ' + (isValid ? 'valid' : 'invalid');
    infoBox.innerHTML = `
        <p><i class="fas fa-map-marked-alt"></i> <strong>AOI Selected</strong></p>
        <p style="margin-top: 10px;"><strong>Area:</strong> ${area.toLocaleString()} sq. km</p>
        <p><strong>Status:</strong> ${isValid ? '<i class="fas fa-check-circle"></i> Valid' : '<i class="fas fa-times-circle"></i> Invalid'}</p>
        <p style="font-size: 0.85rem; margin-top: 8px; color: var(--text-muted);">
            Bounds: ${sw.lat.toFixed(4)}, ${sw.lng.toFixed(4)} to ${ne.lat.toFixed(4)}, ${ne.lng.toFixed(4)}
        </p>
        ${!isValid ? '<p style="color: #ff006e; margin-top: 8px;"><small><i class="fas fa-exclamation-triangle"></i> Area must be between 1 and 10,000 sq. km</small></p>' : ''}
    `;
}

// Map Controls
function zoomIn() {
    if (map) map.zoomIn();
}

function zoomOut() {
    if (map) map.zoomOut();
}

function resetView() {
    if (map) {
        map.setView([20, 0], 2);
        if (currentRectangle) {
            map.removeLayer(currentRectangle);
            currentRectangle = null;
            document.getElementById('aoi-info').innerHTML = '<p><i class="fas fa-map-marker-alt"></i> No AOI selected</p><p class="info-hint">Draw or upload an area to begin</p>';
            document.getElementById('aoi-info').className = 'info-box glass-effect';
        }
    }
}

function toggleLayer() {
    showNotification('Layer switching coming soon!', 'info');
}

function toggleMeasure() {
    showNotification('Measurement tool coming soon!', 'info');
}

// Upload Dialog
function showUploadDialog() {
    document.getElementById('upload-dialog').classList.add('active');
}

function closeUploadDialog() {
    document.getElementById('upload-dialog').classList.remove('active');
    document.getElementById('upload-status').innerHTML = '';
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function processFile(file) {
    const validExtensions = ['.kml', '.kmz', '.geojson', '.json', '.txt', '.zip'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    const statusDiv = document.getElementById('upload-status');
    
    if (!validExtensions.includes(fileExt)) {
        statusDiv.innerHTML = `
            <div style="background: rgba(255, 0, 110, 0.1); border: 1px solid rgba(255, 0, 110, 0.3); padding: 15px; border-radius: 10px; color: #ff006e; margin-top: 15px;">
                <i class="fas fa-times-circle"></i> Invalid file format<br>
                <small>Supported: KML, KMZ, GeoJSON, JSON, TXT, Shapefile (.zip)</small>
            </div>
        `;
        return;
    }
    
    // Check if it's a shapefile
    if (fileExt === '.zip') {
        statusDiv.innerHTML = `
            <div style="background: rgba(255, 190, 11, 0.1); border: 1px solid rgba(255, 190, 11, 0.3); padding: 15px; border-radius: 10px; color: #ffbe0b; margin-top: 15px;">
                <i class="fas fa-spinner fa-spin"></i> Validating Shapefile components...
            </div>
        `;
        setTimeout(() => {
            statusDiv.innerHTML = `
                <div style="background: rgba(6, 255, 165, 0.1); border: 1px solid rgba(6, 255, 165, 0.3); padding: 15px; border-radius: 10px; color: #06ffa5; margin-top: 15px;">
                    <i class="fas fa-check-circle"></i> Shapefile validated! AOI loaded on map.
                </div>
            `;
            setTimeout(closeUploadDialog, 2000);
        }, 1500);
    } else {
        statusDiv.innerHTML = `
            <div style="background: rgba(6, 255, 165, 0.1); border: 1px solid rgba(6, 255, 165, 0.3); padding: 15px; border-radius: 10px; color: #06ffa5; margin-top: 15px;">
                <i class="fas fa-check-circle"></i> "${file.name}" uploaded successfully!
            </div>
        `;
        setTimeout(closeUploadDialog, 2000);
    }
}

// Search Dialog
function showSearchDialog() {
    document.getElementById('search-dialog').classList.add('active');
}

function closeSearchDialog() {
    document.getElementById('search-dialog').classList.remove('active');
    document.getElementById('search-results').innerHTML = '';
}

function searchLocation() {
    const query = document.getElementById('location-search').value;
    const resultsDiv = document.getElementById('search-results');
    
    if (!query) {
        resultsDiv.innerHTML = `
            <div style="background: rgba(255, 0, 110, 0.1); border: 1px solid rgba(255, 0, 110, 0.3); padding: 12px; border-radius: 10px; color: #ff006e; margin-top: 15px;">
                <i class="fas fa-exclamation-circle"></i> Please enter a location name
            </div>
        `;
        return;
    }
    
    resultsDiv.innerHTML = `
        <div style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); padding: 15px; border-radius: 10px; margin-top: 15px;">
            <i class="fas fa-spinner fa-spin"></i> Searching for "${query}"...
        </div>
    `;
    
    // Demo: Simulate search
    setTimeout(() => {
        resultsDiv.innerHTML = `
            <div style="background: rgba(6, 255, 165, 0.1); border: 1px solid rgba(6, 255, 165, 0.3); padding: 15px; border-radius: 10px; margin-top: 15px; color: #06ffa5;">
                <p><i class="fas fa-map-marker-alt"></i> <strong>${query}</strong></p>
                <p style="font-size: 0.9rem; margin-top: 5px; color: var(--text-secondary);">Location found! Navigating...</p>
            </div>
        `;
        
        setTimeout(() => {
            closeSearchDialog();
            if (map) {
                // Example coordinates (you can customize based on query)
                map.setView([28.6139, 77.2090], 10);
            }
        }, 1500);
    }, 1000);
}

// Tutorial Functions
function createProgressDots() {
    const dotsContainer = document.getElementById('progress-dots');
    if (dotsContainer) {
        for (let i = 1; i <= 6; i++) {
            const dot = document.createElement('div');
            dot.className = 'progress-dot' + (i === 1 ? ' active' : '');
            dot.dataset.step = i;
            dotsContainer.appendChild(dot);
        }
    }
}

function startTutorial() {
    document.getElementById('tutorial-overlay').classList.add('active');
    showTutorialStep(1);
}

function showTutorialStep(step) {
    tutorialStep = step;
    
    // Remove previous highlight
    removeHighlight();
    
    // Hide all steps
    document.querySelectorAll('.tutorial-step').forEach(s => s.classList.remove('active'));
    
    // Show current step
    const currentStepElement = document.querySelector(`.tutorial-step[data-step="${step}"]`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
    
    // Update progress dots
    document.querySelectorAll('.progress-dot').forEach((dot, index) => {
        dot.classList.toggle('active', index + 1 === step);
    });
    
    // Update step indicator
    document.getElementById('tutorial-step-indicator').textContent = `${step} / 6`;
    
    // Update buttons
    document.getElementById('prev-btn').disabled = step === 1;
    
    const nextBtn = document.getElementById('next-btn');
    if (step === 6) {
        nextBtn.innerHTML = '<span>Finish</span><i class="fas fa-check"></i>';
    } else {
        nextBtn.innerHTML = '<span>Next</span><i class="fas fa-arrow-right"></i>';
    }
    
    // Add highlight for current step
    addHighlight(step);
}

function addHighlight(step) {
    let targetElement = null;
    let highlightConfig = {};
    
    switch(step) {
        case 1:
            // Welcome - highlight entire sidebar
            targetElement = document.querySelector('.sidebar');
            highlightConfig = { padding: 10 };
            break;
        case 2:
            // Upload AOI - highlight upload button
            targetElement = document.querySelector('.menu-section:first-of-type');
            highlightConfig = { padding: 15 };
            break;
        case 3:
            // Draw AOI - highlight draw tool button
            targetElement = document.querySelector('.map-toolbar');
            highlightConfig = { padding: 15 };
            break;
        case 4:
            // Search - highlight search button
            targetElement = document.querySelector('[data-tool="search"]')?.parentElement;
            highlightConfig = { padding: 10 };
            break;
        case 5:
            // Map controls - highlight control section
            targetElement = document.querySelector('.menu-section:nth-of-type(2)');
            highlightConfig = { padding: 15 };
            break;
        case 6:
            // Completion - no highlight
            break;
    }
    
    if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const padding = highlightConfig.padding || 10;
        
        // Create highlight overlay
        const highlight = document.createElement('div');
        highlight.className = 'tutorial-highlight';
        highlight.style.position = 'fixed';
        highlight.style.top = (rect.top - padding) + 'px';
        highlight.style.left = (rect.left - padding) + 'px';
        highlight.style.width = (rect.width + padding * 2) + 'px';
        highlight.style.height = (rect.height + padding * 2) + 'px';
        highlight.style.border = '3px solid #ffbe0b';
        highlight.style.borderRadius = '15px';
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '9999';
        highlight.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.7)';
        highlight.style.animation = 'pulse-border 2s ease-in-out infinite';
        
        document.body.appendChild(highlight);
        currentHighlight = highlight;
    }
}

function removeHighlight() {
    if (currentHighlight) {
        currentHighlight.remove();
        currentHighlight = null;
    }
}

function nextTutorialStep() {
    if (tutorialStep < 6) {
        showTutorialStep(tutorialStep + 1);
    } else {
        skipTutorial();
    }
}

function previousTutorialStep() {
    if (tutorialStep > 1) {
        showTutorialStep(tutorialStep - 1);
    }
}

function skipTutorial() {
    removeHighlight();
    document.getElementById('tutorial-overlay').classList.remove('active');
}

// Utility Functions
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        input.type = 'password';
        button.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

function logout() {
    if (confirm('Are you sure you want to logout from GalaxEye Mission Drishti?')) {
        loginAttempts = 0;
        isFirstLogin = true;
        document.getElementById('login-form').querySelectorAll('input, button').forEach(el => el.disabled = false);
        document.getElementById('login-form').reset();
        document.getElementById('login-attempts').innerHTML = '';
        showScreen('login-screen');
    }
}

function closeSuccessModal() {
    document.getElementById('success-modal').classList.remove('active');
    showScreen('login-screen');
}

function showNotification(message, type) {
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
    
    if (event.target.classList.contains('tutorial-overlay')) {
        // Don't close tutorial on outside click
        return;
    }
}

// Add CSS for pulse animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse-border {
        0%, 100% {
            border-color: #ffbe0b;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px #ffbe0b;
        }
        50% {
            border-color: #00d4ff;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 30px #00d4ff;
        }
    }
`;
document.head.appendChild(style);

console.log('🛰️ GalaxEye Space - Mission Drishti Platform Loaded');