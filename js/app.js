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

    // --- Rendering ---

    renderDashboard(container) {
        // Calculate Totals
        let income = 0, expense = 0;
        state.transactions.forEach(t => {
            if (t.type === 'income') income += Number(t.amount);
            if (t.type === 'expense') expense += Number(t.amount);
        });
        const balance = income - expense;

        container.innerHTML = `
            <div class="glass-card" style="text-align:center; padding: 40px 20px;">
                <h3 style="color:var(--text-muted)">Current Balance</h3>
                <h1 style="font-size: 3rem; margin: 10px 0;">₪ ${balance.toLocaleString()}</h1>
                <div class="flex-between" style="max-width: 200px; margin: 0 auto; margin-top: 20px;">
                    <span class="badge badge-income">▼ ${income.toLocaleString()}</span>
                    <span class="badge badge-expense">▲ ${expense.toLocaleString()}</span>
                </div>
            </div>
            
            <div class="flex-between" style="gap:10px; margin-bottom:20px;">
                <button class="glass-card" style="flex:1; text-align:center; padding:15px; cursor:pointer;" onclick="app.navigate('shopping')">
                    <span style="font-size:2rem">🛒</span><br><span style="font-weight:600">Shopping</span>
                </button>
                <button class="glass-card" style="flex:1; text-align:center; padding:15px; cursor:pointer;" onclick="app.navigate('goals')">
                    <span style="font-size:2rem">🎯</span><br><span style="font-weight:600">Goals</span>
                </button>
            </div>

            <!-- Charts Section -->
            <div class="glass-card">
                <div class="flex-between">
                    <h3>📊 Analytics</h3>
                    <select id="chart-filter" style="width:auto; padding:5px; font-size:0.8rem; background:rgba(0,0,0,0.3); color:white; border:none;" onchange="app.updateCharts()">
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                    </select>
                </div>
                <div style="height:200px; margin-top:10px;">
                    <canvas id="pieChart"></canvas>
                </div>
                <div style="height:150px; margin-top:20px;">
                    <canvas id="lineChart"></canvas>
                </div>
            </div>

            <!-- Calculator -->
            <div class="glass-card">
                 <div class="flex-between">
                    <h3>🧠 Smart Budget</h3>
                    <button class="btn btn-primary" style="width:auto; padding:5px 12px;" onclick="app.calcBudget(${income})">Calc 50/30/20</button>
                 </div>
                 <div id="budget-result" style="margin-top:10px; display:none;"></div>
            </div>

            <h3 style="margin: 20px 0 10px;">Recent Activity</h3>
            <div id="quick-list">
                ${this.generateTransactionListHTML(state.transactions.slice(0, 5))}
            </div>
        `;

        // Render Charts after DOM update
        setTimeout(() => this.initCharts(), 100);
    }

    // --- Chart Logic ---
    initCharts() {
        const ctxPie = document.getElementById('pieChart');
        const ctxLine = document.getElementById('lineChart');
        if (!ctxPie || !ctxLine) return;

        const mode = document.getElementById('chart-filter') ? document.getElementById('chart-filter').value : 'expense';
        const filtered = state.transactions.filter(t => t.type === mode);

        // 1. Pie Data (By Category)
        const cats = {};
        filtered.forEach(t => {
            const cat = t.category || 'General';
            cats[cat] = (cats[cat] || 0) + Number(t.amount);
        });

        // 2. Line Data (By Date - Last 30 Daysish)
        // Simple bucket by date string
        const dates = {};
        const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
        sorted.forEach(t => {
            const d = new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            dates[d] = (dates[d] || 0) + Number(t.amount);
        });

        // Destroy old if exists
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

    updateCharts() {
        this.initCharts();
    }

    // --- Tools ---
    calcBudget(income) {
        if (income <= 0) { alert("Add income first!"); return; }
        const needs = income * 0.50;
        const wants = income * 0.30;
        const savings = income * 0.20;

        const res = document.getElementById('budget-result');
        res.style.display = 'block';
        res.innerHTML = `
            <div class="flex-between" style="border-bottom:1px solid rgba(255,255,255,0.1); padding:5px 0;">
                <span>🏠 Needs (50%)</span> <strong>₪${needs.toLocaleString()}</strong>
            </div>
            <div class="flex-between" style="border-bottom:1px solid rgba(255,255,255,0.1); padding:5px 0;">
                <span>🎁 Wants (30%)</span> <strong>₪${wants.toLocaleString()}</strong>
            </div>
            <div class="flex-between" style="padding:5px 0;">
                <span>🐷 Savings (20%)</span> <strong>₪${savings.toLocaleString()}</strong>
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
                        <div style="font-weight:600;">${t.category || (t.type === 'income' ? 'Income' : 'Expense')}</div>
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
                    <h2>📅 Bills</h2>
                    <button class="btn btn-primary" style="width:auto; padding: 5px 15px;" onclick="app.addBill()">New Bill</button>
                 </div>
                 ${state.bills.length ? state.bills.map(b => `
                    <div style="border-bottom:1px solid rgba(255,255,255,0.1); padding: 15px 0;">
                        <div class="flex-between">
                            <strong>${b.name}</strong>
                            <strong style="color:var(--text-main)">₪${b.amount}</strong>
                        </div>
                        <div class="flex-between" style="margin-top:5px;">
                             <small style="color:var(--text-muted)">Due: ${new Date(b.dueDate).toLocaleDateString()}</small>
                             <small class="badge ${b.isPaid ? 'badge-income' : 'badge-expense'}">${b.isPaid ? 'Paid' : 'Unpaid'}</small>
                        </div>
                    </div>
                 `).join('') : '<p style="opacity:0.6; text-align:center;">No bills found</p>'}
            </div>
        `;
    }

    renderShopping(container) {
        container.innerHTML = `
            <div class="glass-card">
                 <div class="flex-between" style="margin-bottom:15px;">
                    <h2>🛒 Shopping List</h2>
                    <button class="btn btn-primary" style="width:auto; padding: 5px 15px;" onclick="app.addItem()">Add Item</button>
                 </div>
                 
                 ${state.shoppingList.map(item => `
                    <div class="flex-between" style="margin-bottom:10px; padding:12px; background:rgba(255,255,255,0.05); border-radius:10px;">
                        <span style="font-size:1.1rem">${item.name}</span>
                        <button class="btn btn-primary" style="width:auto; padding: 5px 12px; font-size:0.8rem;" onclick="app.buyItem('${item.id}', '${item.name}')">Buy</button>
                    </div>
                 `).join('')}
                 ${state.shoppingList.length === 0 ? '<p style="text-align:center; opacity:0.5; padding:20px;">List is empty</p>' : ''}
            </div>
            
            <br>
            <button class="btn" style="background:rgba(255,255,255,0.1)" onclick="app.navigate('dashboard')">Back to Dashboard</button>
        `;
    }

    renderGoals(container) {
        container.innerHTML = `
            <div class="glass-card">
                 <div class="flex-between" style="margin-bottom:15px;">
                    <h2>🎯 Goals</h2>
                    <button class="btn btn-primary" style="width:auto; padding: 5px 15px;" onclick="app.addGoal()">New Goal</button>
                 </div>
                 
                 ${state.goals.map(g => `
                    <div style="margin-bottom:20px;">
                        <div class="flex-between" style="margin-bottom:5px;">
                            <strong>${g.name}</strong>
                            <small>${g.saved || 0} / ${g.target}</small>
                        </div>
                        <div style="width:100%; height:10px; background:rgba(255,255,255,0.1); border-radius:5px; overflow:hidden;">
                            <div style="width:${Math.min(((g.saved || 0) / g.target) * 100, 100)}%; height:100%; background:var(--accent-primary);"></div>
                        </div>
                    </div>
                 `).join('')}
                 ${state.goals.length === 0 ? '<p style="text-align:center; opacity:0.5; padding:20px;">No goals yet</p>' : ''}
            </div>
             <br>
            <button class="btn" style="background:rgba(255,255,255,0.1)" onclick="app.navigate('dashboard')">Back to Dashboard</button>
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
            modal.classList.remove('hidden');
            this.setTransType('expense'); // Default
            document.getElementById('trans-amount').value = '';
            document.getElementById('trans-note').value = '';
            document.getElementById('trans-amount').focus();
        }
    }

    closeModal() {
        const modal = document.getElementById('add-modal');
        if (modal) modal.classList.add('hidden');
    }

    setTransType(type) {
        this.currentTransType = type;
        const isExp = type === 'expense';

        // Update Buttons
        document.getElementById('btn-type-expense').style.opacity = isExp ? '1' : '0.6';
        document.getElementById('btn-type-expense').style.background = isExp ? 'var(--danger-grad)' : 'transparent';

        document.getElementById('btn-type-income').style.opacity = !isExp ? '1' : '0.6';
        document.getElementById('btn-type-income').style.background = !isExp ? 'var(--success-grad)' : 'transparent';

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

        this.closeModal();

        // --- ⚡ Optimistic Update (The Illusion) ---
        // 1. Create temporary object immediately
        const tempTx = {
            id: 'temp-' + Date.now(),
            date: new Date().toISOString(),
            type: this.currentTransType,
            amount: amount,
            category: category,
            note: note,
            source: 'me'
        };

        // 2. Inject into State immediately
        state.transactions.unshift(tempTx);

        // 3. Update UI immediately
        this.renderDashboard(document.getElementById('main-view'));

        // 4. Send to Server in Background
        api.addTransaction({
            type: this.currentTransType,
            amount,
            category: category,
            note: note,
            source: 'me'
        }).then(res => {
            console.log("Synced to cloud:", res);
        }).catch(err => {
            console.error("Sync failed", err);
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

            // 1. Add to local state & Render
            state.shoppingList.push(tempItem);
            this.renderShopping(document.getElementById('main-view'));

            // 2. Send to server (Background)
            api.addShoppingItem(name);

            // Loop continues immediately to next prompt
            await new Promise(r => setTimeout(r, 100));
        }
    }

    buyItem(id) {
        // ⚡ Immediate Feedback
        state.shoppingList = state.shoppingList.filter(i => i.id !== id);
        this.renderShopping(document.getElementById('main-view'));
        api.buyShoppingItem(id);
    }

    addGoal() {
        const name = prompt("Goal Name:");
        const target = prompt("Target Value (NIS):");
        if (name && target) {
            // Optimistic
            state.goals.push({ name, target, saved: 0 });
            this.navigate('goals');
            api.addGoal(name, target);
        }
    }

    addBill() {
        const name = prompt("Bill Name:");
        const amount = prompt("Amount:");
        const date = prompt("Due Date (YYYY-MM-DD):");
        if (name && amount && date) {
            // Optimistic
            state.bills.push({ name, amount, dueDate: date, isPaid: false });
            this.renderBills(document.getElementById('main-view'));
            api.request('addBill', { name, amount, dueDate: date });
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
