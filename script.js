// Global state
let currentUser = null;
let jobs = [];
let applications = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    loadUser();
    initPage();
    setupEventListeners();
});

// Core functions
function loadUser() {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        updateUserDisplay();
    } else if (!location.pathname.includes('index.html') && !location.pathname.includes('auth.html')) {
        location.href = 'auth.html';
    }
}

function updateUserDisplay() {
    const el = document.getElementById('userName');
    if (el && currentUser) el.textContent = currentUser.name;
}

function initPage() {
    if (location.pathname.includes('farmDash.html')) loadFarmerDashboard();
    else if (location.pathname.includes('workDash.html')) loadWorkerDashboard();
}

function setupEventListeners() {
    document.addEventListener('click', e => {
        if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    });
}

// Auth functions
function switchAuthTab(tab) {
    const elements = {
        signupTab: document.getElementById('signupTab'),
        loginTab: document.getElementById('loginTab'),
        signupForm: document.getElementById('signupForm'),
        loginForm: document.getElementById('loginForm'),
        authTitle: document.getElementById('authTitle'),
        authDescription: document.getElementById('authDescription')
    };
    
    const isSignup = tab === 'signup';
    elements.signupTab?.classList.toggle('active', isSignup);
    elements.loginTab?.classList.toggle('active', !isSignup);
    elements.signupForm?.classList.toggle('hidden', !isSignup);
    elements.loginForm?.classList.toggle('hidden', isSignup);
    
    if (elements.authTitle) {
        elements.authTitle.textContent = isSignup ? 'Join GramConnect' : 'Welcome Back';
        elements.authDescription.textContent = isSignup ? 
            'Create your account to connect with the farming community' :
            'Sign in to continue to your dashboard';
    }
}

function selectUserType(type) {
    document.getElementById(type).checked = true;
}

function handleSignup(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value,
        location: document.getElementById('location').value,
        userType: document.querySelector('input[name="userType"]:checked').value
    };
    if (!data.password) return alert('Please enter a password');
    signupUser(data);
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    loginUser(email, password);
}

// Dashboard functions
function switchTab(tabName) {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) tab.classList.add('active');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const text = btn.textContent.toLowerCase();
        const matches = {
            overview: text === 'overview',
            jobs: text.includes('jobs'),
            workers: text.includes('workers'),
            bookings: text.includes('bookings'),
            profile: text.includes('profile'),
            messages: text.includes('messages')
        };
        if (matches[tabName]) btn.classList.add('active');
    });
    
    loadTabData(tabName);
}

function loadTabData(tabName) {
    const actions = {
        jobs: () => currentUser?.type === 'farmer' ? loadFarmerJobs() : loadAvailableJobs(),
        workers: loadAvailableWorkers,
        bookings: loadWorkerBookings,
        messages: loadMessages,
        overview: () => currentUser?.type === 'farmer' ? loadFarmerOverview() : loadWorkerOverview()
    };
    actions[tabName]?.();
}

// Farmer dashboard
function loadFarmerDashboard() {
    loadFarmerJobs();
    loadFarmerOverview();
    loadJobApplications();
}

function loadFarmerOverview() {
    const container = document.querySelector('.card-content');
    if (container && applications.length === 0) {
        container.innerHTML = '<p class="no-data">No applications yet. Post a job to get started!</p>';
    }
    updateFarmerStats();
}

function updateFarmerStats() {
    const stats = document.querySelectorAll('.stat-value');
    if (stats[0]) stats[0].textContent = jobs.filter(job => job.status === 'active').length || 0;
    if (stats[1]) stats[1].textContent = applications.length || 0;
    if (stats[2]) stats[2].textContent = jobs.filter(job => job.status === 'completed').length || 0;
}

function loadFarmerJobs() {
    const list = document.getElementById('jobsList');
    if (!list) return;
    
    if (jobs.length === 0) {
        list.innerHTML = createEmptyState('briefcase', 'No Jobs Posted Yet', 
            'Start by posting your first job to find workers in your area.',
            '<button class="btn btn-primary" onclick="openPostJobModal()"><i data-lucide="plus"></i>Post Your First Job</button>');
        lucide?.createIcons();
        return;
    }
    
    list.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="job-header">
                <h3 class="job-title">${job.title}</h3>
                <span class="job-status ${job.status || 'active'}">${job.status || 'Active'}</span>
            </div>
            <p class="job-description">${job.description}</p>
            <div class="job-details">
                <span><i data-lucide="dollar-sign"></i> ₹${job.payRate}/day</span>
                <span><i data-lucide="clock"></i> ${job.duration}</span>
                <span><i data-lucide="users"></i> ${job.applications || 0} applications</span>
            </div>
            <div class="job-actions">
                <button class="btn btn-outline" onclick="viewJobApplications('${job.id}')">View Applications</button>
                <button class="btn btn-danger" onclick="deleteJob('${job.id}')">Delete Job</button>
            </div>
        </div>
    `).join('');
    lucide?.createIcons();
}

// Worker dashboard
function loadWorkerDashboard() {
    loadAvailableJobs();
    loadWorkerOverview();
    loadWorkerBookings();
}

function loadWorkerOverview() {
    const container = document.querySelector('.card-content');
    if (container && jobs.length === 0) {
        container.innerHTML = '<p class="no-data">No job opportunities available. Check back later!</p>';
    }
    updateWorkerStats();
}

function updateWorkerStats() {
    const stats = document.querySelectorAll('.stat-value');
    if (stats[0]) stats[0].textContent = '₹0';
    if (stats[1]) stats[1].textContent = '0';
    if (stats[2]) stats[2].textContent = '0.0';
    if (stats[3]) stats[3].textContent = jobs.length || 0;
}

function loadAvailableJobs() {
    const list = document.getElementById('availableJobsList');
    if (!list) return;
    
    if (jobs.length === 0) {
        list.innerHTML = createEmptyState('search', 'No Jobs Available',
            'There are currently no job opportunities in your area. Check back later or adjust your filters.');
        lucide?.createIcons();
        return;
    }
    
    list.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="job-header">
                <div>
                    <h3 class="job-title">${job.title}</h3>
                    <p class="job-farmer">by ${job.farmerName}</p>
                </div>
                <span class="job-pay">₹${job.payRate}/day</span>
            </div>
            <p class="job-description">${job.description}</p>
            <div class="job-details">
                <span><i data-lucide="clock"></i> ${job.timeSlot || 'Flexible'}</span>
                <span><i data-lucide="calendar"></i> ${job.duration}</span>
                <span><i data-lucide="map-pin"></i> ${job.location || 'Local Area'}</span>
            </div>
            <div class="job-actions">
                <button class="btn btn-primary" onclick="applyForJob('${job.id}')">Apply Now</button>
                <button class="btn btn-outline" onclick="contactFarmer('${job.farmerPhone}')">Contact Farmer</button>
            </div>
        </div>
    `).join('');
    lucide?.createIcons();
    
    const badge = document.getElementById('jobsFoundBadge');
    if (badge) badge.textContent = `${jobs.length} jobs found`;
}

function loadWorkerBookings() {
    const list = document.getElementById('bookingsList');
    if (list) {
        list.innerHTML = createEmptyState('calendar', 'No Bookings Yet', 'Apply for jobs to see your bookings here.');
        lucide?.createIcons();
    }
}

// Job applications view (NEW FEATURE)
function viewJobApplications(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    // Get applications for this job
    const jobApps = applications.filter(app => app.jobId === jobId);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>Applications for "${job.title}"</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                ${jobApps.length === 0 ? 
                    '<p class="no-data">No applications received yet.</p>' :
                    jobApps.map(app => `
                        <div class="application-card" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <h4 style="margin: 0 0 5px 0;">${app.workerName}</h4>
                                    <p style="color: #666; margin: 0 0 10px 0;">${app.workerLocation}</p>
                                    <p style="margin: 0 0 10px 0;"><strong>Experience:</strong> ${app.experience || 'Not specified'}</p>
                                    <p style="margin: 0 0 15px 0;"><strong>Skills:</strong> ${app.skills || 'General farm work'}</p>
                                    <p style="margin: 0; color: #888; font-size: 0.9em;">Applied: ${new Date(app.appliedAt).toLocaleDateString()}</p>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button class="btn btn-primary" onclick="contactWorker('${app.workerPhone}')">
                                        Contact
                                    </button>
                                    <button class="btn btn-success" onclick="acceptApplication('${app.id}')">
                                        Accept
                                    </button>
                                    <button class="btn btn-danger" onclick="rejectApplication('${app.id}')">
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function contactWorker(phone) {
    if (phone) {
        window.open(`tel:${phone}`, '_self');
    } else {
        alert('Worker contact information not available');
    }
}

function acceptApplication(appId) {
    const app = applications.find(a => a.id === appId);
    if (app) {
        app.status = 'accepted';
        alert(`Application from ${app.workerName} has been accepted!`);
        // Close modal and refresh
        document.querySelector('.modal')?.remove();
    }
}

function rejectApplication(appId) {
    if (confirm('Are you sure you want to reject this application?')) {
        const app = applications.find(a => a.id === appId);
        if (app) {
            app.status = 'rejected';
            alert(`Application from ${app.workerName} has been rejected.`);
            document.querySelector('.modal')?.remove();
        }
    }
}

// Utility functions
function createEmptyState(icon, title, description, actions = '') {
    return `
        <div class="empty-state">
            <div class="empty-icon"><i data-lucide="${icon}"></i></div>
            <h3>${title}</h3>
            <p>${description}</p>
            ${actions}
        </div>
    `;
}

function openPostJobModal() {
    document.getElementById('postJobModal').style.display = 'block';
}

function closePostJobModal() {
    document.getElementById('postJobModal').style.display = 'none';
}

function handlePostJob(e) {
    e.preventDefault();
    const data = {
        title: document.getElementById('jobTitle').value,
        description: document.getElementById('jobDescription').value,
        skillsRequired: document.getElementById('skillsRequired').value,
        timeSlot: document.getElementById('timeSlot').value,
        duration: document.getElementById('duration').value,
        payRate: document.getElementById('payRate').value
    };
    createJob(data);
    closePostJobModal();
    e.target.reset();
}

function applyForJob(jobId) {
    if (!currentUser) return alert('Please log in to apply for jobs');
    applyToJob(jobId);
}

function contactFarmer(phone) {
    phone ? window.open(`tel:${phone}`, '_self') : alert('Farmer contact information not available');
}

function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this job?')) {
        jobs = jobs.filter(job => job.id !== jobId);
        loadFarmerJobs();
    }
}

function loadMessages() {
    ['conversationsList', 'workerConversationsList', 'chatMessages', 'workerChatMessages'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="empty-state-small"><p>No conversations yet</p></div>';
    });
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    if (input?.value.trim()) {
        alert('Messaging feature coming soon!');
        input.value = '';
    }
}

function sendWorkerMessage() {
    const input = document.getElementById('workerMessageInput');
    if (input?.value.trim()) {
        alert('Messaging feature coming soon!');
        input.value = '';
    }
}

function loadAvailableWorkers() {
    const grid = document.getElementById('workersGrid');
    if (grid) {
        grid.innerHTML = createEmptyState('users', 'No Workers Available', 
            'Worker profiles will appear here once they join the platform.');
        lucide?.createIcons();
    }
}

function loadJobApplications() {
    applications = [];
}

function logout() {
    localStorage.removeItem('currentUser');
    location.href = 'index.html';
}

// Navigation
const navigateToAuth = () => location.href = 'auth.html';
const navigateToLanding = () => location.href = 'index.html';
const toggleMobileMenu = () => document.getElementById('mobileMenu')?.classList.toggle('show');
const openEditProfileModal = () => document.getElementById('editProfileModal').style.display = 'block';
const closeEditProfileModal = () => document.getElementById('editProfileModal').style.display = 'none';
const handleEditProfile = e => { e.preventDefault(); alert('Profile update feature coming soon!'); closeEditProfileModal(); };

// API Functions
async function signupUser(userData) {
    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            location.href = result.user.type === 'farmer' ? 'farmDash.html' : 'workDash.html';
        } else {
            alert('Signup failed: ' + result.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function loginUser(email, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            location.href = result.user.type === 'farmer' ? 'farmDash.html' : 'workDash.html';
        } else {
            alert('Login failed: ' + result.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function createJob(jobData) {
    try {
        const response = await fetch('/api/jobs', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'user-id': currentUser?.id
            },
            body: JSON.stringify(jobData)
        });
        const result = await response.json();
        
        if (result.success) {
            jobs.unshift(result.job);
            loadFarmerJobs();
            updateFarmerStats();
            alert('Job posted successfully!');
        } else {
            alert('Failed to post job: ' + result.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function applyToJob(jobId) {
    try {
        const response = await fetch('/api/apply', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'user-id': currentUser?.id
            },
            body: JSON.stringify({ jobId })
        });
        const result = await response.json();
        
        if (result.success) {
            // Add application to local state
            const newApp = {
                id: Date.now(),
                jobId: jobId,
                workerId: currentUser.id,
                workerName: currentUser.name,
                workerPhone: currentUser.phone,
                workerLocation: currentUser.location,
                experience: currentUser.experience || '2+ years',
                skills: currentUser.skills || 'General farm work, harvesting, planting',
                appliedAt: new Date().toISOString(),
                status: 'pending'
            };
            applications.push(newApp);
            
            // Update job application count
            const job = jobs.find(j => j.id === jobId);
            if (job) {
                job.applications = (job.applications || 0) + 1;
                loadAvailableJobs(); // Refresh the display
            }
            
            alert('Application submitted successfully!');
        } else {
            alert('Failed to apply: ' + result.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function loadJobsFromServer() {
    try {
        const response = await fetch('/api/jobs');
        const result = await response.json();
        
        if (result.success) {
            jobs = result.jobs || [];
            
            // Load applications after jobs are loaded
            await loadJobApplications();
            
            // Update dashboard displays
            if (currentUser?.type === 'farmer') {
                loadFarmerJobs();
                updateFarmerStats();
            } else {
                loadAvailableJobs();
                updateWorkerStats();
            }
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        jobs = [];
        applications = [];
    }
}

// Load jobs on page load
window.addEventListener('load', () => currentUser && loadJobsFromServer());