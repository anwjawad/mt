/**
 * AJ+ Main Logic
 * Connects UI, State, and API.
 */

import { state } from './state.js';
import { api } from './api.js';
import { features } from './features.js';

// Predefined Categories
const CATEGORIES = {
    expense: [
        "مصروف بيت",
        "مصروف امل",
        "مصروف جواد",
        "مصروف ايلين",
        "سيارة",
        "دفعة شهرية",
        "فنكهة",
        "مصروف فجائي",
        "اشتراكات"
    ],
    income: [
        "راتب مستشفى",
        "راتب مركز",
        "عائد خارجي"
    ]
};

class App {
    constructor() {
        this.currentTransType = 'expense';
        this.pendingShoppingId = null; // Track item being bought
        this.init();
    }

    async init() {
        console.log("AJ+ Initializing...");

        // Mobile Layout Init
        this.setMobileLayout(state.mobileLayout);

        // Load Data
        try {
            await Promise.all([
                api.getTransactions(),
                api.getBills(),
                api.getShoppingList(),
                api.getGoals(),
                api.getPremiumData() // Load Subs & Challenges
            ]);
            this.navigate('dashboard');
        } catch (e) {
            console.error(e);
            this.showError("Failed to connect to cloud. Check settings.");
        }
    }

    // --- Navigation ---
    navigate(viewId) {
        state.currentView = viewId;

        // Force close sidebar on nav
        const sidebar = document.querySelector('.mobile-sidebar');
        const overlay = document.querySelector('.mobile-sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

        const main = document.getElementById('main-view');
        if (!main) return;

        switch (viewId) {
            case 'dashboard':
                this.renderDashboard(main);
                break;
            case 'analytics':
                this.renderAnalytics(main);
                break;
            case 'budget':
                this.renderBudget(main);
                break;
            case 'transactions':
                this.renderTransactions(main);
                break;
            case 'bills':
                this.renderBills(main);
                break;
            case 'shopping':
                this.renderShopping(main);
                break;
            case 'goals':
                this.renderGoals(main);
                break;
            case 'settings':
                this.renderSettings(main);
                break;
            case 'subscriptions':
                features.renderSubscriptions(main);
                break;
            case 'challenges':
                features.renderChallenges(main);
                break;
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.mobile-sidebar');
        const overlay = document.querySelector('.mobile-sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        }
    }

    /* --- Custom Dropdown Logic (MockAPI Style) --- */
    generateCustomDropdown(id, options, selectedValue) {
        // Fallback if options empty
        const selectedObj = options.find(o => o.value === selectedValue) || options[0] || { label: 'Select', value: '' };

        return `
            <label class="popup" id="${id}" data-value="${selectedObj.value}">
                <input type="checkbox" id="${id}-checkbox">
                <div class="burger" tabindex="0">
                    <span class="text">${selectedObj.label}</span>
                    <svg class="arrow-icon" viewBox="0 0 24 24">
                        <path d="M7 10l5 5 5-5z"></path>
                    </svg>
                </div>
                <nav class="popup-window">
                    <legend>Select Option</legend>
                    <ul>
                        ${options.map(opt => `
                            <li>
                                <button onclick="app.selectCustomOption('${id}', '${opt.value}', '${opt.label}')">
                                    <span>${opt.label}</span>
                                </button>
                            </li>
                        `).join('')}
                    </ul>
                </nav>
            </label>
        `;
    }

    selectCustomOption(dropdownId, value, label) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;

        // Update Text
        const textSpan = dropdown.querySelector('.burger .text');
        if (textSpan) textSpan.textContent = label;

        // Update Data Value
        dropdown.setAttribute('data-value', value);

        // Close Dropdown (Uncheck box)
        const checkbox = document.getElementById(`${dropdownId}-checkbox`);
        if (checkbox) checkbox.checked = false;

        // Logic Trigger
        if (dropdownId === 'chart-type-filter') {
            this.currentFilterType = value;
            this.updateCharts();
        }
        if (dropdownId === 'chart-cat-filter') {
            // this.currentFilterCat = value;
            this.updateCharts();
        }
    }

    setupCustomDropdowns() {
        // Global close on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.popup')) {
                document.querySelectorAll('.popup input[type="checkbox"]').forEach(cb => cb.checked = false);
            }
        });
    }

    renderAnalytics(container) {
        // Collect all unique categories
        const allCats = new Set([...CATEGORIES.expense, ...CATEGORIES.income]);
        state.transactions.forEach(t => allCats.add(t.category));

        const catOptions = ['All Categories', ...Array.from(allCats)];

        // Initial values
        const currentType = this.currentFilterType || 'expense';
        const currentCat = this.currentFilterCat || 'All Categories'; // Default label

        // Helper to safe-match value/label
        // If cat is 'all', label 'All Categories'
        const typeOptions = [
            { label: 'Expenses 💸', value: 'expense' },
            { label: 'Income 💰', value: 'income' }
        ];

        const mappedCatOptions = catOptions.map(c => ({
            label: c,
            value: c === 'All Categories' ? 'all' : c
        }));

        const currentCatVal = currentCat === 'All Categories' ? 'all' : currentCat;

        container.innerHTML = `
            <div class="glass-card" style="overflow:visible;">
                <div class="flex-between" style="margin-bottom:20px; flex-wrap:wrap; gap:10px;">
                    <h2>Analytics Overview</h2>
                    <div style="display:flex; gap:10px; align-items:center;">
                        
                        <!-- Type Dropdown -->
                        ${this.generateCustomDropdown('chart-type-filter', typeOptions, currentType)}

                        <!-- Category Dropdown -->
                        ${this.generateCustomDropdown('chart-cat-filter', mappedCatOptions, currentCatVal)}

                    </div>
                </div>
                
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:30px; position:relative; z-index:1;">
                    <div>
                        <h4 style="text-align:center; margin-bottom:15px; opacity:0.7;">Breakdown</h4>
                        <div style="height:300px;">
                            <canvas id="pieChart"></canvas>
                        </div>
                    </div>
                    <div>
                        <h4 style="text-align:center; margin-bottom:15px; opacity:0.7;">Trend</h4>
                        <div style="height:300px;">
                            <canvas id="lineChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            this.initCharts();
            this.setupCustomDropdowns();
        }, 100);
    }

    renderDashboard(container) {
        // Calculate Totals
        let income = 0, expense = 0;
        state.transactions.forEach(t => {
            if (t.type === 'income') income += Number(t.amount);
            if (t.type === 'expense') expense += Number(t.amount);
        });
        const balance = income - expense;

        container.innerHTML = `
            <div class="dashboard-grid">
                
                <!-- Right Column (In RTL): Balance -->
                <div class="dash-col-right" style="display:flex; flex-direction:column; gap:20px; width:100%;">
                    
                    <!-- Smart Insights Widget -->
                    <div id="insights-widget"></div>

                    <div class="glass-card" style="text-align:center; padding: 40px 20px; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);">
                        <div>
                            <h3 style="color:var(--text-muted)">Current Balance</h3>
                            <h1 style="font-size: 3.5rem; margin: 15px 0;">₪ ${balance.toLocaleString()}</h1>
                        </div>
                        <div class="flex-between" style="gap:20px; margin-top:10px;">
                            <div style="flex:1; background:rgba(16, 185, 129, 0.1); padding:15px; border-radius:12px;">
                                <div style="color:var(--success); font-size:1.2rem;">💰 Income</div>
                                <div style="font-weight:700;">₪${income.toLocaleString()}</div>
                            </div>
                            <div style="flex:1; background:rgba(239, 68, 68, 0.1); padding:15px; border-radius:12px;">
                                <div style="color:var(--danger); font-size:1.2rem;">💸 Expense</div>
                                <div style="font-weight:700;">₪${expense.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                <!-- Spending Chart (Donut) -->
                <div class="glass-card" style="padding: 20px;">
                    <h3 style="margin-bottom:15px; text-align:center;">Spending Breakdown</h3>
                    <div style="position:relative; height:200px; width:100%; display:flex; justify-content:center;">
                        <canvas id="dashboardChart"></canvas>
                    </div>
                </div>


                </div>

                <!-- Left Column (In RTL): Recent Activity List (Both Mobile & Desktop) -->
                <!-- Mobile: Shows as a list below balance -->
                <div class="dash-col-left">
                    <!-- Removed Header as requested -->
                    
                    <div id="quick-list" class="premium-list">
                        ${state.transactions.slice(0, 10).map(t => `
                            <div class="transaction-tile" onclick="app.editTransaction('${t.id}')">
                                <div class="tile-icon ${t.type}">
                                    ${t.type === 'income' ? '💰' : '💸'}
                                </div>
                                <div class="tile-info">
                                    <div class="tile-top">
                                        <span class="tile-category">${t.category}</span>
                                        <span class="tile-amount ${t.type}">${t.type === 'income' ? '+' : '-'} ${Number(t.amount).toLocaleString()}</span>
                                    </div>
                                    <div class="tile-bottom">
                                        <span class="tile-note">${t.note || 'No details'}</span>
                                        <span class="tile-date">${new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        ${state.transactions.length === 0 ? '<p style="opacity:0.5; text-align:center;">No recent activity</p>' : ''}
                    </div>
                </div>

            </div>
        `;

        // Initialize Chart
        setTimeout(() => {
            // Render Insights
            if (window.features) features.renderInsightsWidget('insights-widget');

            const ctx = document.getElementById('dashboardChart');
            if (ctx) {
                // Aggregate Data
                const expenses = {};
                state.transactions
                    .filter(t => t.type === 'expense')
                    .forEach(t => {
                        expenses[t.category] = (expenses[t.category] || 0) + Number(t.amount);
                    });

                // Sort & Top 5
                const sorted = Object.entries(expenses)
                    .sort(([, a], [, b]) => b - a);

                const labels = [];
                const data = [];
                let otherSum = 0;

                sorted.forEach(([cat, amt], index) => {
                    if (index < 5) {
                        labels.push(cat);
                        data.push(amt);
                    } else {
                        otherSum += amt;
                    }
                });

                if (otherSum > 0) {
                    labels.push('Other');
                    data.push(otherSum);
                }

                // Colors
                const colors = [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'
                ];

                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: colors,
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: { color: '#fff' }
                            }
                        }
                    }
                });
            }
        }, 0);
    }



    renderBudget(container) {
        // Income for Calc
        const income = state.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        container.innerHTML = `
            <div class="glass-card">
                 <div class="flex-between">
                    <h2>🧠 Smart Budget</h2>
                    <div style="font-size:2rem;">50/30/20</div>
                 </div>
                 <p style="opacity:0.7; margin-bottom:20px;">
                    This rule allocates your income into Needs (50%), Wants (30%), and Savings (20%).
                 </p>
                 
                 <div style="background:rgba(255,255,255,0.05); padding:20px; border-radius:15px; text-align:center; margin-bottom:20px;">
                    <div style="color:var(--text-muted); margin-bottom:5px;">Total Income Detected</div>
                    <h1 style="color:var(--success);">₪ ${income.toLocaleString()}</h1>
                 </div>

                 <button class="btn btn-primary" onclick="app.calcBudgetForce()">Calculate Allocation</button>
                 
                 <div id="budget-calc-area" style="margin-top:20px;"></div>
            </div>
        `;
    }

    initCharts() {
        const ctxPie = document.getElementById('pieChart');
        const ctxLine = document.getElementById('lineChart');
        if (!ctxPie || !ctxLine) return;

        // Custom Dropdown Logic: Read data-value attribute
        const typeEl = document.getElementById('chart-type-filter');
        const catEl = document.getElementById('chart-cat-filter');

        const typeFilter = typeEl ? (typeEl.getAttribute('data-value') || 'expense') : 'expense';
        const catFilter = catEl ? (catEl.getAttribute('data-value') || 'all') : 'all';

        let filtered = state.transactions.filter(t => t.type === typeFilter);

        // Apply Category Filter if not "all"
        if (catFilter !== 'all') {
            filtered = filtered.filter(t => t.category === catFilter);
        }

        // Pie Data (If category is selected, maybe show Note breakdown? Or just single slice? 
        // If Category is 'all', show breakdown by Category.
        // If Category is specific, show breakdown by Time or Note (if available), or just 100% slice.
        // Let's keep it simple: Breakdown by Note if specific category is selected, or just single color.)

        const keyMap = {};

        filtered.forEach(t => {
            let k = t.category;
            if (catFilter !== 'all') {
                // If specific category, group by Note (or 'Unknown') to show variety
                k = t.note || 'General';
            } else {
                k = t.category || 'General';
            }
            keyMap[k] = (keyMap[k] || 0) + Number(t.amount);
        });

        // Line Data
        const dates = {};
        const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
        sorted.forEach(t => {
            const d = new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            dates[d] = (dates[d] || 0) + Number(t.amount);
        });

        if (this.pieChartInstance) this.pieChartInstance.destroy();
        if (this.lineChartInstance) this.lineChartInstance.destroy();

        this.pieChartInstance = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: Object.keys(keyMap),
                datasets: [{
                    data: Object.values(keyMap),
                    backgroundColor: ['#8E2DE2', '#4A00E0', '#00b09b', '#ff5f6d', '#ffc371', '#c3cfe2'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: 'white' } } }
            }
        });

        this.lineChartInstance = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: Object.keys(dates),
                datasets: [{
                    label: 'Trend',
                    data: Object.values(dates),
                    borderColor: '#00b09b',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { display: false } },
                    y: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    updateCharts() { this.initCharts(); }

    calcBudget(income) {
        if (income <= 0) { alert("Add income first!"); return; }
        const needs = income * 0.50;
        const wants = income * 0.30;
        const savings = income * 0.20;

        const res = document.getElementById('budget-calc-area') || document.getElementById('budget-result');
        if (!res) return;

        res.innerHTML = `
            <div style="margin-top:15px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; text-align:center;">
                <div style="padding:15px; background:rgba(255,255,255,0.05); border-radius:10px;">
                    <div style="font-size:1.5rem">🏠</div>
                    <div>Needs (50%)</div>
                    <strong style="font-size:1.2rem; color:#60a5fa">₪${needs.toLocaleString()}</strong>
                </div>
                <div style="padding:15px; background:rgba(255,255,255,0.05); border-radius:10px;">
                    <div style="font-size:1.5rem">🎁</div>
                    <div>Wants (30%)</div>
                    <strong style="font-size:1.2rem; color:#c084fc">₪${wants.toLocaleString()}</strong>
                </div>
                <div style="padding:15px; background:rgba(255,255,255,0.05); border-radius:10px;">
                    <div style="font-size:1.5rem">🐷</div>
                    <div>Savings (20%)</div>
                    <strong style="font-size:1.2rem; color:#4ade80">₪${savings.toLocaleString()}</strong>
                </div>
            </div>
        `;
    }

    renderTransactions(container) {
        container.innerHTML = `
            <div class="flex-between">
                <h2>All Transactions</h2>
                <span style="font-size:0.9rem; color:var(--text-muted)">${state.transactions.length} items</span>
            </div>
            <br>
            <div id="full-list">
                ${this.generateTransactionListHTML(state.transactions)}
            </div>
        `;
    }

    generateTransactionListHTML(list) {
        if (list.length === 0) return '<div class="glass-card" style="text-align:center;opacity:0.6;">No transactions yet</div>';
        return list.map(t => `
            <div class="glass-card flex-between" style="padding: 15px; margin-bottom: 10px;">
                <div style="display:flex; align-items:center; gap: 15px;">
                    <div style="font-size:1.5rem;">${t.type === 'income' ? '💰' : '💸'}</div>
                    <div>
                        <div style="font-weight:600;">${t.category} <span style="font-size:0.8rem; font-weight:400; opacity:0.7;">${t.note ? ' • ' + t.note : ''}</span></div>
                        <div style="font-size:0.8rem; color:var(--text-muted)">${new Date(t.date).toLocaleDateString("en-GB")}</div>
                    </div>
                </div>
                <div style="font-weight:700; color: ${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
                    ${t.type === 'income' ? '+' : '-'} ₪${Number(t.amount).toLocaleString()}
                </div>
            </div>
        `).join('');
    }

    renderBills(container) {
        container.innerHTML = `
            <div class="glass-card">
                 <div class="flex-between" style="margin-bottom:15px;">
                    <h2>📅 Smart Bills</h2>
                    <button class="btn btn-primary" style="width:auto; padding: 5px 15px;" onclick="app.addBill()">New Bill</button>
                 </div>
                 ${state.bills.length ? state.bills.map(b => `
                    <div style="border-bottom:1px solid rgba(255,255,255,0.1); padding: 15px 0;">
                        <div class="flex-between">
                            <strong>${b.name}</strong>
                            <strong style="color:var(--text-main)">₪${b.amount}</strong>
                        </div>
                        <div class="flex-between" style="margin-top:10px;">
                             <small style="color:var(--text-muted)">Due: ${new Date(b.dueDate).toLocaleDateString()}</small>
                             ${b.isPaid ?
                '<span class="badge badge-income">PAID ✅</span>' :
                `<button class="btn" style="width:auto; padding:5px 10px; font-size:0.8rem; background:rgba(239, 68, 68, 0.2); color:var(--danger);" onclick="app.payBill('${b.id}', '${b.name}', '${b.amount}')">Pay Now 💸</button>`
            }
                        </div>
                    </div>
                 `).join('') : '<p style="opacity:0.6; text-align:center;">No bills found</p>'}
            </div>
        `;
    }

    renderGoals(container) {
        container.innerHTML = `
            <div class="glass-card">
                 <div class="flex-between" style="margin-bottom:15px;">
                    <h2>🎯 Smart Goals</h2>
                    <button class="btn btn-primary" style="width:auto; padding: 5px 15px;" onclick="app.addGoal()">New Goal</button>
                 </div>
                 ${state.goals.map(g => `
                    <div style="margin-bottom:25px; background:rgba(255,255,255,0.03); padding:15px; border-radius:12px;">
                        <div class="flex-between" style="margin-bottom:10px;">
                            <strong>${g.name}</strong>
                            <small>${Number(g.saved || 0).toLocaleString()} / ${Number(g.target).toLocaleString()}</small>
                        </div>
                        <div style="width:100%; height:10px; background:rgba(255,255,255,0.1); border-radius:5px; overflow:hidden; margin-bottom:15px;">
                            <div style="width:${Math.min(((g.saved || 0) / g.target) * 100, 100)}%; height:100%; background:var(--accent-primary); transition:width 0.5s;"></div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button class="btn" style="flex:1; background:rgba(16, 185, 129, 0.1); color:var(--success); font-size:0.9rem;" onclick="app.depositGoal('${g.id}', '${g.name}')">
                                + Deposit 💰
                            </button>
                        </div>
                    </div>
                 `).join('')}
                 ${state.goals.length === 0 ? '<p style="text-align:center; opacity:0.5; padding:20px;">No goals yet</p>' : ''}
            </div>
             <br>
            <button class="btn-back-uiverse" onclick="app.navigate('dashboard')">
                <div class="circle">
                    <svg class="icon-arrow" viewBox="0 0 1024 1024"><path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"></path><path d="M237.248 512 502.656 777.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"></path></svg>
                </div>
                <p class="text">Go Back</p>
            </button>
        `;
    }

    renderShopping(container) {
        container.innerHTML = `
            <div class="glass-card">
                 <div class="flex-between" style="margin-bottom:15px; align-items:center;">
                    <h2>🛒 Shopping List</h2>
                    
                    <!-- Uiverse Add Button -->
                    <button class="btn-add-uiverse" onclick="app.addItem()">
                        <span class="button__text">Add Item</span>
                        <span class="button__icon">
                            <svg class="svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </span>
                    </button>
                 </div>

                 <div class="shopping-grid">
                     ${state.shoppingList.map(item => `
                        <div class="shopping-item-card">
                            <span style="font-size:1.1rem; font-weight:600; word-break: break-word;">${item.name}</span>
                            
                            <!-- Uiverse Buy Button -->
                            <button class="btn-buy-uiverse" style="width:100%; justify-content:center;" onclick="app.buyItem('${item.id}', '${item.name}')">
                                <span class="button-decor"></span>
                                <div class="button-content">
                                    <div class="button__icon">
                                        <span style="font-size:1.2rem">🛒</span>
                                    </div>
                                    <span class="button__text">Buy</span>
                                </div>
                            </button>
                        </div>
                     `).join('')}
                 </div>
                 
                 ${state.shoppingList.length === 0 ? '<p style="text-align:center; opacity:0.5; padding:20px;">List is empty</p>' : ''}
            </div>
             <br>
            <button class="btn-back-uiverse" onclick="app.navigate('dashboard')">
                <div class="circle">
                    <svg class="icon-arrow" viewBox="0 0 1024 1024"><path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"></path><path d="M237.248 512 502.656 777.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"></path></svg>
                </div>
                <p class="text">Go Back</p>
            </button>
        `;
    }



    renderSettings(container) {
        container.innerHTML = `
            <div class="glass-card">
                 <h2>⚙️ Settings</h2>
                 <br>
                <div class="glass-card">
                    <h3>Mobile Navigation Style</h3>
                    <div style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap;">
                        <button class="btn ${state.mobileLayout === 'bar' ? 'btn-primary' : ''}" 
                            onclick="app.setMobileLayout('bar'); app.navigate('settings')">
                            Bar (Default)
                        </button>
                        <button class="btn ${state.mobileLayout === 'side' ? 'btn-primary' : ''}" 
                            onclick="app.setMobileLayout('side'); app.navigate('settings')">
                            Side Menu
                        </button>
                        <button class="btn ${state.mobileLayout === 'tabs' ? 'btn-primary' : ''}" 
                            onclick="app.setMobileLayout('tabs'); app.navigate('settings')">
                            Tabs
                        </button>
                    </div>
                </div>

                <div class="glass-card">
                    <h3>Categories</h3>
                 <p>Connected to: Google Sheets</p>
                 <br>
                 <label style="font-size:0.8rem; opacity:0.7;">API URL</label>
                 <input type="text" value="${state.apiUrl}" style="font-size:0.8rem;" readonly>
                 <br>
                 <button class="btn btn-danger" onclick="location.reload()">Reload App</button>
            </div>
        `;
    }


    // --- Actions ---

    openAddModal() {
        const modal = document.getElementById('add-modal');
        if (modal) {
            modal.style.display = 'flex'; // Force show
            modal.classList.remove('hidden');

            // If we are NOT in a shopping flow, default to basic expense
            if (!this.pendingShoppingId) {
                this.setTransType('expense');
                document.getElementById('trans-note').value = '';
                document.getElementById('trans-amount').placeholder = "0.00";
            }
            document.getElementById('trans-amount').value = '';
            document.getElementById('trans-amount').focus();
        }
    }

    closeModal() {
        const modal = document.getElementById('add-modal');
        if (modal) {
            modal.style.display = 'none'; // Force hide
            modal.classList.add('hidden');
        }
        // Reset shopping state on close/cancel
        this.pendingShoppingId = null;
    }

    setTransType(type, initialCategory = null) {
        this.currentTransType = type;
        const container = document.getElementById('type-tabs');

        // Toggle Class for CSS Sliding Indicator
        if (type === 'expense') {
            container.classList.add('expense-mode');
            container.classList.remove('income-mode');
            // Update Text Color
            container.children[1].classList.add('selected'); // Expense Tab
            container.children[2].classList.remove('selected'); // Income Tab
        } else {
            container.classList.add('income-mode');
            container.classList.remove('expense-mode');
            // Update Text Color
            container.children[1].classList.remove('selected');
            container.children[2].classList.add('selected');
        }

        // Populate Custom Dropdown
        const options = CATEGORIES[type].map(c => ({ label: c, value: c }));
        const defaultVal = initialCategory || options[0].value;
        const dropdownHTML = this.generateCustomDropdown('trans-category-dropdown', options, defaultVal);

        const dropdownContainer = document.getElementById('custom-category-container');
        if (dropdownContainer) dropdownContainer.innerHTML = dropdownHTML;

        // Ensure it has full width styling if needed
        const newDropdown = document.getElementById('trans-category-dropdown');
        if (newDropdown) newDropdown.style.width = '100%';
    }

    debugCards() {
        const totalTx = state.transactions.length;
        const domCards = document.querySelectorAll('.mobile-card');
        const scrollContainer = document.querySelector('.mobile-scroll-view');

        let msg = `📊 State Transactions: ${totalTx}\n`;
        msg += `🃏 DOM Cards Found: ${domCards.length}\n`;

        if (scrollContainer) {
            const style = window.getComputedStyle(scrollContainer);
            msg += `👀 Container Display: ${style.display}\n`;
            msg += `📏 Container Width: ${scrollContainer.offsetWidth}px\n`;
        } else {
            msg += `❌ Scroll Container NOT FOUND\n`;
        }

        domCards.forEach((c, i) => {
            if (i < 2) msg += `Card ${i} offsetParent: ${c.offsetParent ? 'Visible' : 'Hidden'}\n`;
        });

        alert(msg);
    }

    /* --- Fix for "editTransaction is not a function" error --- */
    editTransaction(id) {
        const tx = state.transactions.find(t => t.id === id);
        if (!tx) return;

        // Open modal
        this.openAddModal();
        this.setTransType(tx.type, tx.category);

        // Populate Fields
        const amountEl = document.getElementById('trans-amount');
        const noteEl = document.getElementById('trans-note');

        if (amountEl) amountEl.value = tx.amount;
        if (noteEl) noteEl.value = tx.note || '';

        // Notify user (Optional, keeps it non-intrusive)
        console.log("Viewing transaction:", tx);
    }

    saveTransaction() {
        const amount = document.getElementById('trans-amount').value;
        const note = document.getElementById('trans-note').value;

        // Custom Dropdown
        const catEl = document.getElementById('trans-category-dropdown');
        const category = catEl ? catEl.getAttribute('data-value') : 'General';

        if (!amount || Number(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        // Capture ID before it gets wiped by closeModal
        const buyingId = this.pendingShoppingId;

        this.closeModal();

        // --- ⚡ Optimistic Update ---
        const tempTx = {
            id: 'temp-' + Date.now(),
            date: new Date().toISOString(),
            type: this.currentTransType,
            amount: amount,
            category: category,
            note: note,
            source: 'me'
        };
        state.transactions.unshift(tempTx);

        // ** shopping Logic **
        if (buyingId) {
            console.log("Processing Buy for item:", buyingId);
            // Remove from list
            state.shoppingList = state.shoppingList.filter(i => i.id !== buyingId);
            // Send API call to mark as bought
            api.buyShoppingItem(buyingId);
        }

        // Render Dashboard to show new balance
        this.navigate('dashboard');

        // Send Transaction to Server
        api.addTransaction({
            type: this.currentTransType,
            amount,
            category: category,
            note: note,
            source: 'me'
        }).then(res => {
            console.log("Synced to cloud:", res);
        });
    }

    async addItem() {
        // Continuous Entry Mode
        let keepAdding = true;

        while (keepAdding) {
            const name = prompt("Enter Item Name (or Cancel to stop):");

            if (!name) {
                keepAdding = false;
                break;
            }

            // --- ⚡ Optimistic Update ---
            const tempItem = {
                id: 'temp-' + Date.now() + Math.random(),
                name: name,
                status: 'pending',
                date: new Date().toISOString()
            };

            // Add & Render
            state.shoppingList.push(tempItem);
            this.renderShopping(document.getElementById('main-view'));

            // Sync
            api.addShoppingItem(name);

            // Re-prompt loop
            await new Promise(r => setTimeout(r, 100));
        }
    }

    buyItem(id, name) {
        // Start Shopping->Expense Flow
        this.pendingShoppingId = id;

        // Open Modal
        this.openAddModal();

        // Customize form
        this.setTransType('expense');
        document.getElementById('trans-note').value = `شراء: ${name}`;
        document.getElementById('trans-amount').placeholder = "سعر " + name;
    }

    addGoal() {
        const name = prompt("Goal Name:");
        const target = prompt("Target Value (NIS):");
        if (name && target) {
            api.addGoal(name, target).then(() => {
                this.navigate('goals');
            });
        }
    }

    addBill() {
        const name = prompt("Bill Name:");
        const amount = prompt("Amount:");
        const date = prompt("Due Date (YYYY-MM-DD):");
        if (name && amount && date) {
            api.request('addBill', { name, amount, dueDate: date }).then(res => {
                if (res.ok) {
                    alert("Bill Added!");
                    state.bills.push(res.item);
                    this.renderBills(document.getElementById('main-view'));
                }
            });
        }
    }

    // --- Smart Logic ---

    payBill(id, name, amount) {
        if (!confirm(`Pay ₪${amount} for ${name}? This will be recorded as an expense.`)) return;

        // 1. Optimistic Update (Bill)
        const bill = state.bills.find(b => b.id === id);
        if (bill) bill.isPaid = true;
        this.renderBills(document.getElementById('main-view'));

        // 2. Add Expense Transaction
        state.transactions.unshift({
            id: 'temp-' + Date.now(),
            date: new Date().toISOString(),
            type: 'expense',
            amount: amount,
            category: 'Bills',
            note: `Bill Payment: ${name}`,
            source: 'me'
        });

        // 3. Sync
        api.request('payBill', { id: id });
        api.addTransaction({
            type: 'expense',
            amount: amount,
            category: 'Bills',
            note: `Bill Payment: ${name}`
        });

        // Flash Success
        alert(`Paid ₪${amount} successfully!`);
    }

    depositGoal(id, name) {
        const amount = prompt(`How much to deposit into '${name}'?`);
        if (!amount || Number(amount) <= 0) return;

        // 1. Optimistic Update (Goal)
        const goal = state.goals.find(g => g.id === id);
        if (goal) goal.saved = (Number(goal.saved) || 0) + Number(amount);
        this.renderGoals(document.getElementById('main-view'));

        // 2. Add Expense Transaction (Money left your wallet -> Goal)
        state.transactions.unshift({
            id: 'temp-' + Date.now(),
            date: new Date().toISOString(),
            type: 'expense',
            amount: amount,
            category: 'Savings',
            note: `Deposit to Goal: ${name}`,
            source: 'me'
        });

        // 3. Sync
        api.request('depositGoal', { id: id, amount: amount });
        api.addTransaction({
            type: 'expense',
            amount: amount,
            category: 'Savings',
            note: `Deposit to Goal: ${name}`
        });
    }

    // --- Mobile Layout Logic ---
    setMobileLayout(mode) {
        state.mobileLayout = mode;
        localStorage.setItem('mobileLayout', mode);

        // Reset Classes
        document.body.classList.remove('layout-bar', 'layout-side', 'layout-tabs');
        document.body.classList.add(`layout-${mode}`);
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.mobile-sidebar');
        const overlay = document.querySelector('.mobile-sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        }
    }

    showError(msg) {
        const main = document.getElementById('main-view');
        if (main) {
            main.innerHTML = `
                <div class="glass-card" style="border-color:var(--danger)">
                    <h3 style="color:var(--danger)">Error</h3>
                    <p>${msg}</p>
                </div>
            `;
        }
    }
}

// Global Export
window.app = new App();
