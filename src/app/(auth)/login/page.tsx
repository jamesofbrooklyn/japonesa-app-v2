import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-japonesa-red text-2xl font-bold tracking-widest">
          JAPONESA
        </h1>
        <p className="text-xs text-stone-500 mt-1">Poblacion · Executive Dashboard</p>
      </div>
      <div className="rounded-lg border border-stone-200 bg-white shadow-sm p-6">
        <LoginForm />
      </div>
    </div>
  );
}
