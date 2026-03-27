import EmailVerifyForm from "@/components/auth/EmailVerifyForm";

export default function AdminVerifyPage() {
  return (
    <div className="container py-5" style={{ maxWidth: 520 }}>
      <EmailVerifyForm />
    </div>
  );
}