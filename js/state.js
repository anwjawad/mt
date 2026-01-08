/**
 * AJ+ State Management
 * Central store for all application data.
 */

export const state = {
    // CONFIG: REPLACE THIS WITH YOUR NEW DEPLOYMENT URL
    apiUrl: "https://script.google.com/macros/s/AKfycbwV1p4Y2FKL0RwWES0Mur7zeQA1pfM2DKSzJIFskXFLiX7I6DXDSl0hSAVNrApKVSP77A/exec",

    // Data
    transactions: JSON.parse(localStorage.getItem('transactions')) || [],
    bills: JSON.parse(localStorage.getItem('bills')) || [],
    shoppingList: JSON.parse(localStorage.getItem('shoppingList')) || [],
    goals: JSON.parse(localStorage.getItem('goals')) || [],

    // Premium Features Data
    subscriptions: JSON.parse(localStorage.getItem('subscriptions')) || [],
    challenges: JSON.parse(localStorage.getItem('challenges')) || [],

    userProfile: JSON.parse(localStorage.getItem('userProfile')) || { name: 'Dr. A' },
    mobileLayout: localStorage.getItem('mobileLayout') || 'bar', // 'bar', 'side', 'tabs'

    // UI State
    currentView: 'dashboard',
    isLoading: false,

    // Methods
    save() {
        localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
        localStorage.setItem('bills', JSON.stringify(this.bills));
        localStorage.setItem('shoppingList', JSON.stringify(this.shoppingList));
        localStorage.setItem('goals', JSON.stringify(this.goals));
        localStorage.setItem('mobileLayout', this.mobileLayout);

        // Save Premium Data
        localStorage.setItem('subscriptions', JSON.stringify(this.subscriptions));
        localStorage.setItem('challenges', JSON.stringify(this.challenges));
    },

    // Helpers
    setLoading(loading) {
        this.isLoading = loading;
        const main = document.getElementById('main-view');
        if (main) {
            if (loading) {
                main.style.opacity = '0.5';
                main.style.pointerEvents = 'none';
            } else {
                main.style.opacity = '1';
                main.style.pointerEvents = 'all';
            }
        }
    }
};
