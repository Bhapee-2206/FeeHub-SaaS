

function pgFeeS() { 
    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500 mx-auto max-w-2xl mt-4">
        <div class="text-4xl mb-4">📋</div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Fee Structure Module</h3>
        <p class="text-sm">Define master fees for your courses here.</p>
        <button onclick="openFeeModal()" class="mt-6 bg-brand-500 text-slate-900 px-6 py-2.5 rounded-xl font-bold shadow-lg">
            Create New Structure
        </button>
    </div>`; 
}

function pgFeeP() { 
    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center text-slate-500 mx-auto max-w-2xl mt-4">
        <div class="text-4xl mb-4">💳</div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Fee Payments Ledger</h3>
        <p class="text-sm">Transaction history will appear here.</p>
    </div>`; 
}
