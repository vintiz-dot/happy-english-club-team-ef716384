/**
 * AccessCardDocument — the printable card handed to a family at the desk.
 *
 * Rendered off-screen and rasterised by the same engine as the student
 * reports (src/lib/reportPdf.ts), so it prints identically to what the admin
 * sees and handles Vietnamese names correctly.
 *
 * It carries a live, single-use credential, so the copy has to do real work:
 * the family must understand this is theirs alone, that it works once, and
 * what to do with it. Instructions are in English and Vietnamese because the
 * person holding it is usually a parent, not the student.
 */

interface Props {
  studentName: string;
  className?: string | null;
  siblings?: string[];
  loginEmail: string;
  code: string;
  expiresAt: string;
  claimUrl: string;
}

export function AccessCardDocument({
  studentName, className, siblings = [], loginEmail, code, expiresAt, claimUrl,
}: Props) {
  const expiry = new Date(expiresAt);
  const expiryText = expiry.toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="bg-white text-black" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="border-2 border-violet-600 rounded-2xl overflow-hidden">
        {/* Letterhead */}
        <div className="flex items-center gap-3 px-5 py-4 bg-violet-600 text-white">
          <img
            src="/images/hec_logo.png"
            alt="Happy English Club"
            className="h-12 w-12 rounded-xl object-contain bg-white p-1 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight">Happy English Club</p>
            <p className="text-[11px] opacity-90">hanoienglish.com</p>
          </div>
          <p className="text-sm font-bold">Access Card</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Who it belongs to */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Student</p>
            <p className="text-xl font-black leading-tight">{studentName}</p>
            {className && <p className="text-xs text-gray-600">{className}</p>}
            {siblings.length > 0 && (
              <p className="text-[11px] text-gray-600 mt-1">
                This login also covers: {siblings.join(", ")}
              </p>
            )}
          </div>

          {/* The two things they need */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-300 p-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Your login</p>
              <p className="text-sm font-bold break-all leading-snug">{loginEmail}</p>
            </div>
            <div className="rounded-xl border-2 border-violet-600 bg-violet-50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-violet-700">One-time code</p>
              <p
                className="text-xl font-black tracking-[0.15em] leading-snug"
                style={{ fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}
              >
                {code}
              </p>
            </div>
          </div>

          {/* What to do */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3">
            <ol className="text-xs space-y-1">
              <li><span className="font-bold">1.</span> Go to <span className="font-bold">{claimUrl}</span></li>
              <li><span className="font-bold">2.</span> Enter the one-time code above</li>
              <li><span className="font-bold">3.</span> Choose your own password — then sign in with your login</li>
            </ol>
            <p className="text-[11px] text-gray-600 mt-2 leading-snug">
              Truy cập <span className="font-semibold">{claimUrl}</span>, nhập mã một lần ở trên,
              rồi tự đặt mật khẩu của bạn. Mã chỉ dùng được một lần.
            </p>
          </div>

          {/* The warning that makes it safe to hand over */}
          <div className="flex items-start gap-2 text-[11px] text-gray-700">
            <span className="font-black text-violet-600">!</span>
            <p className="leading-snug">
              Keep this card private — it works <span className="font-bold">once</span> and expires on{" "}
              <span className="font-bold">{expiryText}</span>. The school never knows your password.
              If you lose it, ask us for a new card.
              <span className="block text-gray-500">
                Giữ riêng thẻ này. Mã dùng một lần và hết hạn ngày {expiryText}.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
