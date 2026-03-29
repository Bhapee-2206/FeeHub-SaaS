function pgDash() {
  if (!DASH_DATA) return '';

  let recentRows = STUDENTS.slice(0, 5).map(s => `
    <tr class="hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer">
        <td class="py-4 px-4 sm:px-6 text-sm font-semibold text-slate-800 whitespace-nowrap">${s.name}</td>
        <td class="py-4 px-4 sm:px-6 text-sm whitespace-nowrap"><span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">${s.course}</span></td>
        <td class="py-4 px-4 sm:px-6 text-sm text-slate-600 font-medium whitespace-nowrap">${fmt(s.totalFees)}</td>
        <td class="py-4 px-4 sm:px-6 text-sm whitespace-nowrap"><span class="${s.totalFees <= s.paid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'} px-3 py-1 rounded-full text-xs font-bold border">${s.totalFees <= s.paid ? 'Paid' : 'Pending'}</span></td>
    </tr>`).join('');

  let tableHTML = STUDENTS.length > 0 
    ? `<div class="overflow-x-auto"><table class="w-full text-left border-collapse min-w-[600px]"><thead><tr class="bg-slate-50 border-b border-slate-100"><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th><th class="py-3 px-4 sm:px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th></tr></thead><tbody>${recentRows}</tbody></table></div>` 
    : `<div class="py-12 flex flex-col items-center justify-center text-slate-400 px-4 text-center">
        <svg class="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
        <p class="font-semibold text-slate-600">No students onboarded</p>
        <p class="text-xs mt-1">Head to the Students tab to add your first record.</p>
       </div>`;

  return `
  <div class="mb-6 sm:mb-8">
    <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Welcome back, ${CU.name.split(' ')[0]} 👋</h2>
    <p class="text-slate-500 text-sm sm:text-base mt-1">Here is what is happening at ${DASH_DATA.institutionName} today.</p>
  </div>
  
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
    <div class="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
            <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <p class="text-slate-500 text-xs sm:text-sm font-semibold mb-1">Total Collected</p>
        <h3 class="text-xl sm:text-2xl font-bold text-slate-900 truncate">${fmt(DASH_DATA.totalCollected)}</h3>
    </div>
    <div class="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
            <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <p class="text-slate-500 text-xs sm:text-sm font-semibold mb-1">Pending Dues</p>
        <h3 class="text-xl sm:text-2xl font-bold text-slate-900 truncate">${fmt(DASH_DATA.pendingDues)}</h3>
    </div>
    <div class="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
            <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z"></path><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"></path></svg>
        </div>
        <p class="text-slate-500 text-xs sm:text-sm font-semibold mb-1">Total Students</p>
        <h3 class="text-xl sm:text-2xl font-bold text-slate-900">${DASH_DATA.totalStudents}</h3>
    </div>
    <div class="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
            <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        </div>
        <p class="text-slate-500 text-xs sm:text-sm font-semibold mb-1">Transactions</p>
        <h3 class="text-xl sm:text-2xl font-bold text-slate-900">0</h3>
    </div>
  </div>
  
  <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <div class="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100"><h3 class="font-bold text-slate-800">Recent Enrollments</h3></div>
    ${tableHTML}
  </div>`;
}
