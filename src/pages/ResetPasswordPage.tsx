import { Navigate } from "react-router-dom";

/** Legacy token links redirect into the OTP forgot-password flow. */
export function ResetPasswordPage() {
  return <Navigate to="/forgot-password" replace />;
}
