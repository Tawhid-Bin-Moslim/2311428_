
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, Mail, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>("resident");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({
        role,
        user_id: userId.trim(),
        email: email.trim(),
        password,
      });

      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to login."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon">
            <Building2 size={25} />
          </div>

          <h1>ApartmentCare</h1>
          <p>Apartment Management System</p>
        </div>

        <div className="login-heading">
          <h2>Welcome Back</h2>
          <p>Sign in to access your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="role">Login As</label>

            <select
              id="role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as UserRole)
              }
            >
              <option value="admin">Admin</option>
              <option value="building_manager">Building Manager</option>
              <option value="resident">Resident</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="userId">User ID / Flat Number</label>

            <div className="login-input">
              <User size={18} />
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="Enter your ID"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Registered Email</label>

            <div className="login-input">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your registered email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="login-input">
              <Lock size={18} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="primary-button login-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
