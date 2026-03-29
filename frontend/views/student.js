function downloadStudentTemplate() {
    const csvContent = "ID,Name,Course,Batch,Email,Phone,Parent\n"
        + "1,Arjun Kumar,BCA,2025-2028,arjun.k81@gmail.com,9880000001,Rajesh Kumar\n"
        + "2,Priya Sharma,BCA,2025-2028,priya.s2@gmail.com,9880000002,Suresh Sharma\n"
        + "3,Rahul Verma,BBA,2026-2029,rahul.v681@gmail.com,9880000003,Anil Verma";
        
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Student_Data_Template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function openStudentModal() {
    G('MTL').textContent = 'Register New Student';
    G('MBD').innerHTML = `
        <form id="studentForm" onsubmit="saveStudent(event)" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label><input type="text" id="sName" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm"></div>
                <div><label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Course/Class</label><input type="text" id="sCourse" required placeholder="e.g. BCA" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Batch Year</label><input type="text" id="sBatch" required placeholder="2024-2027" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm"></div>
                <div><label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Total Fees (₹)</label><input type="number" id="sFees" required class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm"></div>
            </div>
            <div class="pt-4 border-t border-slate-100 mt-6"><button type="submit" id="saveStuBtn" class="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md">Save Student Record</button></div>
        </form>
    `;
    G('OV').classList.replace('hidden', 'flex'); 
}

async function saveStudent(e) {
    e.preventDefault(); 
    const btn = G('saveStuBtn'); btn.textContent = 'Saving...'; btn.disabled = true;
    const payload = { name: G('sName').value, course: G('sCourse').value, batch: G('sBatch').value, totalFees: Number(G('sFees').value) };
    try {
        const res = await fetch('http:
        if ((await res.json()).success) { closeM(); await fetchStudents(); render(); } else { alert('Error saving'); btn.textContent = 'Save'; btn.disabled = false; }
    } catch (error) { alert('Server Error.'); btn.textContent = 'Save'; btn.disabled = false; }
}

function pgStu() { 
    let rows = STUDENTS.map(s => `
        <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors">
            <td class="py-4 px-4 sm:px-6 whitespace-nowrap"><p class="text-sm font-bold text-slate-900">${s.name}</p><p class="text-xs text-slate-400 mt-0.5">${s.batch}</p></td>
            <td class="py-4 px-4 sm:px-6 whitespace-nowrap"><span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">${s.course}</span></td>
            <td class="py-4 px-4 sm:px-6 text-sm text-slate-600 font-medium whitespace-nowrap">${fmt(s.totalFees)}</td>
            <td class="py-4 px-4 sm:px-6 text-sm text-slate-600 font-medium whitespace-nowrap">${fmt(s.paid)}</td>
            <td class="py-4 px-4 sm:px-6 whitespace-nowrap"><span class="${s.totalFees <= s.paid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'} px-3 py-1 rounded-full text-xs font-bold border">${s.totalFees <= s.paid ? 'Paid' : 'Pending'}</span></td>
        </tr>`).join('');

    let tableHTML = STUDENTS.length > 0 
        ? `<div class="overflow-x-auto"><table class="w-full text-left border-collapse min-w-[700px]"><thead><tr class="bg-slate-50 border-b border-slate-100"><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Info</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Fees</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Paid</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th></tr></thead><tbody>${rows}</tbody></table></div>` 
        : `<div class="py-12 sm:py-16 flex flex-col items-center justify-center text-slate-400 px-4 text-center">
            <svg class="w-20 h-20 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <p class="font-bold text-slate-600 text-base sm:text-lg">Your directory is empty</p>
            <p class="text-xs sm:text-sm mt-1 mb-6">Start by adding your first student record.</p>
            <button onclick="openStudentModal()" class="bg-white border-2 border-slate-200 text-slate-600 font-bold py-2 px-6 rounded-xl hover:bg-slate-50 transition-all">Add Student</button>
           </div>`;

    return `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white gap-4">
            <h3 class="font-bold text-slate-800 text-lg flex items-center">Directory <span class="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs ml-2">${STUDENTS.length}</span></h3>
            <div class="flex gap-2 w-full sm:w-auto">
                <button onclick="downloadStudentTemplate()" class="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold py-2 px-4 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Template CSV
                </button>
                <button onclick="openStudentModal()" class="flex-1 sm:flex-none bg-blue-600 text-white font-semibold py-2 px-4 rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-600/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> Add Student
                </button>
            </div>
        </div>
        ${tableHTML}
    </div>`; 
}
