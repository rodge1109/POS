$file = "c:\website\pos-system\src\App.jsx"
$content = Get-Content $file
$newContent = @()
$buttonCode = @(
'              </div>',
'',
'              {/* Action Buttons */}',
'              <div className="p-6 bg-white border-t-2 border-gray-100 flex gap-4 flex-shrink-0">',
'                <button',
'                  onClick={() => setShowPaymentModal(false)}',
'                  className="px-8 py-5 border-2 border-gray-100 rounded-2xl font-black text-gray-400 hover:bg-gray-50 uppercase tracking-widest transition-all"',
'                >',
'                  Cancel',
'                </button>',
'                <button',
'                  id="complete-payment-btn"',
'                  onClick={processPayment}',
'                  className="flex-1 py-5 bg-cyan-600 text-white rounded-3xl font-black text-xl hover:bg-cyan-700 shadow-[0_10px_30px_rgba(8,145,178,0.3)] transition-all active:scale-95 uppercase tracking-[0.1em]"',
'                >',
'                  Complete Order & Print',
'                </button>',
'              </div>'
)

for ($i=0; $i -lt $content.Length; $i++) {
    if ($i -eq 6598) {
        foreach ($line in $buttonCode) {
            $newContent += $line
        }
    } else {
        $newContent += $content[$i]
    }
}
$newContent | Set-Content $file
