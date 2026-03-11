import { useState } from 'react';
import { KeyRound, ArrowRight, FileSpreadsheet, Code, Globe, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TokenSetupProps {
  onComplete: (token: string) => void;
}

const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Cek apakah data berupa array (banyak transaksi sekaligus)
    if (Array.isArray(data)) {
      var rows = data.map(function(item) {
        return [item.date, item.type, item.category, item.amount, item.note];
      });
      // Menulis banyak baris sekaligus
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    } else {
      // Jika hanya 1 transaksi
      sheet.appendRow([data.date, data.type, data.category, data.amount, data.note]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({"status": "success", "data": []}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var rows = data.slice(1);
    var result = rows.map(function(row) {
      return {
        date: row[0],
        type: row[1],
        category: row[2],
        amount: row[3],
        note: row[4]
      };
    });
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success", "data": result}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export function TokenSetup({ onComplete }: TokenSetupProps) {
  const [token, setToken] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      localStorage.setItem('spreadsheet_token', token.trim());
      onComplete(token.trim());
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 max-w-xl w-full mb-6"
      >
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
          <KeyRound className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Setup Database</h1>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Aplikasi ini menyimpan data secara offline di HP Anda, dan mencadangkannya ke Google Spreadsheet milik Anda sendiri. Masukkan <strong>Web App URL</strong> dari Google Apps Script Anda di bawah ini.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Web App URL (Token)
            </label>
            <input 
              type="url" 
              required 
              value={token} 
              onChange={e => setToken(e.target.value)} 
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-slate-900 text-sm" 
              placeholder="https://script.google.com/macros/s/.../exec" 
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            Mulai Aplikasi <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </motion.div>

      {/* Tutorial Section */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.2 }}
        className="max-w-xl w-full"
      >
        <button 
          onClick={() => setShowTutorial(!showTutorial)}
          className="w-full flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            Belum punya URL-nya? Lihat cara buatnya disini
          </span>
          {showTutorial ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        <AnimatePresence>
          {showTutorial && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white mt-4 p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                
                {/* Step 1 */}
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm sm:text-base">1</div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2 text-sm sm:text-base">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" /> Buat Spreadsheet
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mb-3">Buka <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline font-medium">Google Sheets</a> dan buat file baru. Buat judul kolom di baris pertama persis seperti ini:</p>
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs sm:text-sm font-medium text-slate-700">
                        <div className="bg-white px-2 py-1.5 rounded border border-slate-100 shadow-sm text-center">A1: Date</div>
                        <div className="bg-white px-2 py-1.5 rounded border border-slate-100 shadow-sm text-center">B1: Type</div>
                        <div className="bg-white px-2 py-1.5 rounded border border-slate-100 shadow-sm text-center">C1: Category</div>
                        <div className="bg-white px-2 py-1.5 rounded border border-slate-100 shadow-sm text-center">D1: Amount</div>
                        <div className="bg-white px-2 py-1.5 rounded border border-slate-100 shadow-sm text-center">E1: Note</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm sm:text-base">2</div>
                  <div className="w-full min-w-0">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2 text-sm sm:text-base">
                      <Code className="w-4 h-4 text-emerald-600 shrink-0" /> Masukkan Kode Script
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mb-3">Di menu Spreadsheet, klik <strong>Ekstensi &gt; Apps Script</strong>. Hapus semua kode yang ada, lalu paste kode di bawah ini: <br/><span className="text-emerald-600 font-medium">*Jika Anda pernah setup sebelumnya, hapus kode lama dan ganti dengan yang baru ini agar fitur Tarik Data berfungsi.</span></p>
                    
                    <div className="relative group">
                      <div className="absolute right-2 top-2">
                        <button 
                          onClick={copyCode}
                          className="p-1.5 sm:p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-1 text-[10px] sm:text-xs font-medium"
                        >
                          {copied ? <><Check className="w-3 h-3 sm:w-3.5 sm:h-3.5"/> Dicopy</> : <><Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5"/> Copy</>}
                        </button>
                      </div>
                      <pre className="bg-slate-900 text-slate-50 p-3 sm:p-4 rounded-xl text-[10px] sm:text-xs overflow-x-auto font-mono leading-relaxed">
                        {APPS_SCRIPT_CODE}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm sm:text-base">3</div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2 text-sm sm:text-base">
                      <Globe className="w-4 h-4 text-emerald-600 shrink-0" /> Deploy & Dapatkan URL
                    </h3>
                    <ul className="text-xs sm:text-sm text-slate-600 space-y-2 list-disc pl-4">
                      <li>Klik tombol biru <strong>Terapkan (Deploy) &gt; Deployment baru</strong> di pojok kanan atas.</li>
                      <li>Pilih jenis: <strong>Aplikasi Web (Web app)</strong>.</li>
                      <li>Beri deskripsi bebas (misal: "API Keuangan").</li>
                      <li>Jalankan sebagai (Execute as): <strong>Saya (Email Anda)</strong>.</li>
                      <li>Siapa yang memiliki akses: <strong>Siapa saja (Anyone)</strong>. <span className="text-rose-500 text-[10px] sm:text-xs block mt-0.5">*Penting agar aplikasi bisa mengirim data tanpa login ulang.</span></li>
                      <li>Klik <strong>Terapkan (Deploy)</strong>. Jika diminta otorisasi, izinkan (Lanjutan &gt; Buka script).</li>
                      <li>Copy <strong>URL Aplikasi Web</strong> yang muncul, lalu paste ke kolom input di atas!</li>
                    </ul>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
