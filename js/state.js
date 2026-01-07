/**
 * AJ+ State Management
 * Central store for all application data.
 */

export const state = {
    // CONFIG: REPLACE THIS WITH YOUR NEW DEPLOYMENT URL
    apiUrl: "https://script.google.com/macros/s/AKfycbwV1p4Y2FKL0RwWES0Mur7zeQA1pfM2DKSzJIFskXFLiX7I6DXDSl0hSAVNrApKVSP77A/exec",

    // Data Stores
    transactions: [],
    bills: [],
    shoppingList: [],
    goals: [],

    userProfile: {
        name: "You",
        avatar: "👤"
    },

    // UI State
    currentView: 'dashboard',
    isLoading: false,

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
