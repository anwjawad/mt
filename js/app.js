/**
 * AJ+ Main Logic
 * Connects UI, State, and API.
 */

import { state } from './state.js';
import { api } from './api.js';

class App {
    constructor() {
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

        // Update Nav Icons
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        // (Visual update logic left simple for now)

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

            <h3 style="margin: 20px 0 10px;">Recent Activity</h3>
            <div id="quick-list">
                ${this.generateTransactionListHTML(state.transactions.slice(0, 5))}
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
                        <button class="btn btn-primary" style="width:auto; padding: 5px 12px; font-size:0.8rem;" onclick="app.buyItem('${item.id}')">Buy</button>
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
        // Quick Modal Logic without complex HTML overhead for now
        const typeStart = confirm("Click OK for [Income] 💰\nClick Cancel for [Expense] 💸");
        const type = typeStart ? 'income' : 'expense';

        const amount = prompt(`Enter ${type.toUpperCase()} Amount (NIS):`);
        if (!amount) return;

        const category = prompt("Category (e.g. Salary, Food, Bills):", "General");
        const note = prompt("Note (Optional):", "");

        if (amount) {
            api.addTransaction({
                type,
                amount,
                category: category || 'General',
                note: note || '',
                source: 'me'
            }).then(() => {
                alert("Saved Successfully! ✅");
                this.init(); // Reload data
            });
        }
    }

    addItem() {
        const name = prompt("Item Name (e.g. Milk, Bread):");
        if (name) {
            api.addShoppingItem(name).then(() => {
                this.navigate('shopping'); // Re-render
            });
        }
    }

    buyItem(id) {
        if (confirm("Confirm purchase? This will remove it from the list.")) {
            api.buyShoppingItem(id).then(() => {
                // Optimistically remove from state or reload
                state.shoppingList = state.shoppingList.filter(i => i.id !== id);
                this.renderShopping(document.getElementById('main-view'));
            });
        }
    }

    addGoal() {
        const name = prompt("Goal Name (e.g. New Laptop):");
        const target = prompt("Target Value (NIS):");
        if (name && target) {
            api.addGoal(name, target).then(() => {
                this.navigate('goals');
            });
        }
    }

    addBill() {
        const name = prompt("Bill Name (e.g. Internet):");
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
