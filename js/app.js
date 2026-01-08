/**
 * AJ+ Main Logic
 * Connects UI, State, and API.
 */

import { state } from './state.js';
import { api } from './api.js';

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

        // Load Data
        try {
            await Promise.all([
                api.getTransactions(),
                api.getBills(),
                api.getShoppingList(),
                api.getGoals()
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
        }
    }

    renderAnalytics(container) {
        container.innerHTML = `
            <div class="glass-card">
                <div class="flex-between" style="margin-bottom:20px;">
                    <h2>Analytics Overview</h2>
                    <select id="chart-filter" class="custom-input" style="width:auto; padding:5px 15px; height:auto;" onchange="app.updateCharts()">
                         <option value="expense">Expenses</option>
                         <option value="income">Income</option>
                    </select>
                </div>
                
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:30px;">
                    <div>
                        <h4 style="text-align:center; margin-bottom:15px; opacity:0.7;">Category Breakdown</h4>
                        <div style="height:300px;">
                            <canvas id="pieChart"></canvas>
                        </div>
                    </div>
                    <div>
                        <h4 style="text-align:center; margin-bottom:15px; opacity:0.7;">Spending Trend</h4>
                        <div style="height:300px;">
                            <canvas id="lineChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
        setTimeout(() => this.initCharts(), 100);
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
                <div class="dash-col-right" style="display:flex; flex-direction:column; gap:20px;">
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

                    <!-- 3D Recent Activity Carousel -->
                    <!-- 3D Recent Activity Carousel (Desktop Only) -->
                    ${state.transactions.length > 0 ? `
                    <div class="desktop-only" style="justify-content:center;">
                        <div class="wrapper">
                            <div class="inner" style="--quantity: ${Math.min(state.transactions.length, 8)};">
                                ${state.transactions.slice(0, 8).map((t, index) => `
                                    <div class="card-3d" style="--index: ${index}; border-color: ${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
                                        <div class="card-3d-content">
                                            <div class="card-3d-icon">${t.type === 'income' ? '💰' : '💸'}</div>
                                            <div style="font-size:0.9rem; margin-bottom:5px;">${t.category}</div>
                                            <div class="card-3d-amount" style="color:${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
                                                ${t.amount}
                                            </div>
                                            <div class="card-3d-date">${new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Mobile Cards Scroll (Mobile Only) -->
                     <div class="mobile-only mobile-scroll-view">
                        ${state.transactions.slice(0, 8).map(t => `
                            <div class="mobile-card">
                                <div class="top-section">
                                    <div class="border"></div>
                                    <div class="icons">
                                        <div class="logo">
                                            ${t.type === 'income' ? '💰' : '💸'}
                                        </div>
                                    </div>
                                </div>
                                <div class="bottom-section">
                                    <span class="title">${t.category}</span>
                                    <div class="row">
                                        <div class="item">
                                            <span class="big-text">${new Date(t.date).getDate()}</span>
                                            <span class="regular-text">${new Date(t.date).toLocaleString('default', { month: 'short' })}</span>
                                        </div>
                                        <div class="item">
                                            <span class="big-text">${Number(t.amount).toLocaleString()}</span>
                                            <span class="regular-text">NIS</span>
                                        </div>
                                        <div class="item">
                                            <span class="big-text">${t.type === 'income' ? 'In' : 'Out'}</span>
                                            <span class="regular-text">Type</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                     </div>
                    ` : ''}

                     <!-- Mobile Only Quick Links (Hidden on Desktop via CSS if needed, but useful generally) -->
                </div>

                <!-- Left Column (In RTL): Recent Activity -->
                <div class="dash-col-left">
                    <div class="flex-between" style="margin-bottom:15px;">
                        <h3>Recent Activity</h3>
                        <button class="btn" style="width:auto; padding:5px 12px; font-size:0.8rem; background:rgba(255,255,255,0.05);" onclick="app.navigate('transactions')">View All</button>
                    </div>
                    <div id="quick-list">
                        ${this.generateTransactionListHTML(state.transactions.slice(0, 8))}
                    </div>
                </div>

            </div>
        `;
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

        const mode = document.getElementById('chart-filter') ? document.getElementById('chart-filter').value : 'expense';
        const filtered = state.transactions.filter(t => t.type === mode);

        // Pie Data
        const cats = {};
        filtered.forEach(t => {
            const cat = t.category || 'General';
            cats[cat] = (cats[cat] || 0) + Number(t.amount);
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
                labels: Object.keys(cats),
                datasets: [{
                    data: Object.values(cats),
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

    setTransType(type) {
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

        // Populate Categories
        const select = document.getElementById('trans-category');
        select.innerHTML = '';
        CATEGORIES[type].forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            select.appendChild(opt);
        });
    }

    saveTransaction() {
        const amount = document.getElementById('trans-amount').value;
        const category = document.getElementById('trans-category').value;
        const note = document.getElementById('trans-note').value;

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
