export default function AuthLayout({ children, bgImage = '/background 2.png' }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background bg-cover bg-center bg-no-repeat px-4 py-10"
      style={{ backgroundImage: `url('${bgImage}')` }}
    >
      <div className="bg-surface p-8 sm:p-10 rounded-2xl shadow-lg w-full max-w-md flex flex-col items-center border border-divider">
        <div className="flex items-center gap-2.5 mb-2">
          <img src="/Logo.png" alt="" className="h-11 w-11 object-contain" />
          <span className="text-2xl font-bold text-primary tracking-tight">Levit</span>
        </div>
        {children}
      </div>
    </div>
  );
}
