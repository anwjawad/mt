/**
 * AJ+ API Client (JSONP)
 * Bypasses CORS by injecting script tags.
 */

import { state } from './state.js';

export const api = {

    // Generic JSONP Call
    request(action, params = {}) {
        return new Promise((resolve, reject) => {
            state.setLoading(true);

            const callbackName = 'cb_' + Math.round(100000 * Math.random());
            const script = document.createElement('script');

            // Define global callback
            window[callbackName] = (data) => {
                delete window[callbackName];
                document.body.removeChild(script);
                state.setLoading(false);
                resolve(data);
            };

            // Construct URL
            const url = new URL(state.apiUrl);
            url.searchParams.set('callback', callbackName);
            url.searchParams.set('action', action);

            // Add other params
            Object.keys(params).forEach(key => {
                url.searchParams.set(key, params[key]);
            });

            // Inject
            script.src = url.toString();
            script.onerror = (err) => {
                delete window[callbackName];
                document.body.removeChild(script);
                state.setLoading(false);
                reject(err);
            };

            document.body.appendChild(script);
        });
    },

    // --- Specific Methods ---

    async getTransactions() {
        const res = await this.request('getTransactions');
        if (res.ok) state.transactions = res.data.reverse(); // Newest first
        return res;
    },

    async addTransaction(txData) {
        // txData: { type, amount, category, note, source }
        const res = await this.request('addTransaction', txData);
        if (res.ok) {
            // Optimistic update
            state.transactions.unshift(res.item);
        }
        return res;
    },

    async getBills() {
        const res = await this.request('getBills');
        if (res.ok) state.bills = res.data;
        return res;
    },

    // Shopping
    async getShoppingList() {
        const res = await this.request('getShoppingList');
        if (res.ok) state.shoppingList = res.data.filter(i => i.status !== 'purchased');
        return res;
    },
    async addShoppingItem(name) {
        const res = await this.request('addShoppingItem', { name });
        if (res.ok) state.shoppingList.push(res.item);
        return res;
    },
    async buyShoppingItem(id) {
        const res = await this.request('buyShoppingItem', { id });
        if (res.ok) {
            state.shoppingList = state.shoppingList.filter(i => i.id !== id);
        }
        return res;
    },

    // Goals
    async getGoals() {
        const res = await this.request('getGoals');
        if (res.ok) state.goals = res.data;
        return res;
    },
    async addGoal(name, target) {
        const res = await this.request('addGoal', { name, target });
        if (res.ok) state.goals.push(res.item);
        return res;
    },

    // --- Premium Features Sync ---
    async getPremiumData() {
        const res = await this.request('getPremiumData');
        if (res.ok) {
            state.subscriptions = res.subscriptions || [];
            if (res.challenges && res.challenges.length > 0) {
                state.challenges = res.challenges;
            }
            state.save(); // Persist locally
        }
        return res;
    },

    async syncPremiumData() {
        // Sends the full list of subscriptions and challenges to overwrite cloud
        const res = await this.request('syncPremiumData', {
            subscriptions: JSON.stringify(state.subscriptions),
            challenges: JSON.stringify(state.challenges)
        });
        return res;
    }
};
