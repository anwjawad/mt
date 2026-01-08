
import { state } from './state.js';
import { api } from './api.js';

class Features {
    constructor() {
        console.log("Features Module Loaded");
    }

    // --- Subscriptions Manager ---
    renderSubscriptions(container) {
        let totalMonthly = state.subscriptions.reduce((sum, sub) => sum + Number(sub.cost), 0);

        container.innerHTML = `
            <div class="glass-card">
                <div class="flex-between">
                    <h2>💎 Subscriptions</h2>
                    <button class="btn btn-primary" style="width:auto;" onclick="features.addSubscription()">+ Add</button>
                </div>
                <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:12px; margin:20px 0; text-align:center;">
                    <span style="opacity:0.7;">Monthly Cost</span>
                    <h1 style="color:var(--accent);">₪${totalMonthly.toLocaleString()}</h1>
                    <span style="font-size:0.8rem; opacity:0.5;">That's ₪${(totalMonthly * 12).toLocaleString()} / year</span>
                </div>

                <div class="premium-list">
                    ${state.subscriptions.map(sub => `
                        <div class="transaction-tile">
                            <div class="tile-icon income" style="background:rgba(139, 92, 246, 0.2); color:#a78bfa;">📺</div>
                            <div class="tile-info">
                                <div class="tile-top">
                                    <span class="tile-category">${sub.name}</span>
                                    <span class="tile-amount expense">- ₪${sub.cost}</span>
                                </div>
                                <div class="tile-bottom">
                                    <span class="tile-date">Renews on day ${sub.day}</span>
                                    <button onclick="features.removeSubscription('${sub.id}')" style="background:none; border:none; color:var(--danger); font-size:0.8rem;">Remove</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    ${state.subscriptions.length === 0 ? '<p style="text-align:center; opacity:0.5;">No subscriptions tracked.</p>' : ''}
                </div>
            </div>
        `;
    }

    addSubscription() {
        const name = prompt("Service Name (e.g. Netflix):");
        if (!name) return;
        const cost = prompt("Monthly Cost (₪):");
        if (!cost) return;
        const day = prompt("Renewal Day (1-31):");

        state.subscriptions.push({
            id: Date.now().toString(),
            name,
            cost: Number(cost),
            day: day || 1
        });
        state.save();
        api.syncPremiumData(); // Cloud Sync
        app.navigate('subscriptions');
    }

    removeSubscription(id) {
        if (!confirm("Stop tracking this subscription?")) return;
        state.subscriptions = state.subscriptions.filter(s => s.id !== id);
        state.save();
        api.syncPremiumData(); // Cloud Sync
        app.navigate('subscriptions');
    }

    // --- Savings Challenges ---
    renderChallenges(container) {
        // Ensure default challenge exists
        if (state.challenges.length === 0) {
            state.challenges.push({
                id: '52week',
                title: '52 Week Challenge',
                target: 1378,
                current: 0,
                weeksCompleted: 0
            });
        }

        const challenge = state.challenges[0];
        const percent = Math.min(100, (challenge.current / challenge.target) * 100).toFixed(1);

        container.innerHTML = `
            <div class="glass-card" style="text-align:center;">
                <h2>🏆 Savings Challenge</h2>
                <p style="opacity:0.7; margin-bottom:20px;">Save a little each week to reach BIG goals!</p>

                <div style="position:relative; width:150px; height:150px; margin:0 auto; display:flex; align-items:center; justify-content:center; border:5px solid rgba(255,255,255,0.1); border-radius:50%; border-top-color:var(--success);">
                    <div>
                        <div style="font-size:2rem; font-weight:bold;">${percent}%</div>
                        <div style="font-size:0.8rem; opacity:0.7;">Completed</div>
                    </div>
                </div>

                <div style="margin:20px 0;">
                    <h3>${challenge.title}</h3>
                    <p>Saved: <span style="color:var(--success);">₪${challenge.current}</span> / ₪${challenge.target}</p>
                </div>

                <button class="btn btn-primary" onclick="features.addChallengeDeposit()">+ Deposit This Week</button>
                <button class="btn" style="margin-top:10px; background:rgba(255,255,255,0.1);" onclick="alert('In this challenge, you save 1₪ week 1, 2₪ week 2... up to 52₪!')">How it works?</button>
            </div>
        `;
    }

    addChallengeDeposit() {
        const challenge = state.challenges[0];
        const amount = Number(challenge.weeksCompleted) + 1; // Simple logic: Week 1 = 1, Week 2 = 2

        if (confirm(`Deposit ₪${amount} for Week ${amount}?`)) {
            challenge.current += amount;
            challenge.weeksCompleted++;
            state.save();
            api.syncPremiumData(); // Cloud Sync

            // Also deduct from wallet
            api.addTransaction({
                type: 'expense',
                category: 'Savings',
                amount: amount,
                note: `Challenge Week ${challenge.weeksCompleted}`,
                date: new Date().toISOString()
            });

            app.navigate('challenges');
            alert("Great job! Keep it up! 🏆");
        }
    }

    // --- Smart Insights ---
    getInsights() {
        const insights = [];

        // 1. Spending Spike
        const expenses = state.transactions.filter(t => t.type === 'expense');
        if (expenses.length > 5) {
            const recent = expenses.slice(0, 3).reduce((sum, t) => sum + Number(t.amount), 0);
            if (recent > 1000) {
                insights.push({ icon: '📉', text: `High spending alert! You spent ₪${recent} in your last 3 transactions.` });
            }
        }

        // 2. Subscription Alert
        const upcomingSub = state.subscriptions.find(s => {
            const today = new Date().getDate();
            return s.day >= today && s.day <= today + 3;
        });
        if (upcomingSub) {
            insights.push({ icon: '🔔', text: `Upcoming Bill: ${upcomingSub.name} (₪${upcomingSub.cost}) is due soon.` });
        }

        // 3. Positive Reinforcement
        if (state.goals.some(g => Number(g.saved) >= Number(g.target))) {
            insights.push({ icon: '🎉', text: "You've reached a savings goal! Time to celebrate?" });
        }

        // Default
        if (insights.length === 0) {
            insights.push({ icon: '💡', text: "Tip: Tracking every penny is the secret to wealth." });
        }

        return insights[0]; // Return top insight
    }

    renderInsightsWidget(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const insight = this.getInsights();
        container.innerHTML = `
            <div class="glass-card" style="background: linear-gradient(to right, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1)); border-left: 4px solid var(--accent);">
                <div class="flex-between" style="justify-content: flex-start; gap: 15px;">
                    <div style="font-size:1.5rem;">${insight.icon}</div>
                    <div style="font-size:0.9rem; line-height:1.4;">
                        <strong>Smart Insight:</strong><br>
                        ${insight.text}
                    </div>
                </div>
            </div>
        `;
    }
}

export const features = new Features();
window.features = features; // Expose for HTML onclicks
