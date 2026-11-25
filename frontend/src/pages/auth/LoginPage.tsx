
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Lock,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="login-container">
      <div className="login-shell">
        <section className="login-visual">
          <div className="login-visual-glow login-glow-one" />
          <div className="login-visual-glow login-glow-two" />

          <div className="login-visual-content">
            <div className="login-brand">
              <div className="login-brand-icon">
                <Building2 size={27} />
              </div>
              <span>ApartmentCare</span>
            </div>

            <div className="login-hero">
              <span className="login-eyebrow">
                <span className="login-eyebrow-dot" />
                SMARTER LIVING, SIMPLIFIED
              </span>

              <h1>
                Your building.
                <br />
                Your community.
                <br />
                <span>One platform.</span>
              </h1>

              <p>
                Manage your apartment community with ease.
                Stay connected, keep things organized, and
                make everyday living simpler.
              </p>

              <div className="login-feature-list">
                <div className="login-feature">
                  <span className="login-feature-icon">
                    <CheckCircle2 size={17} />
                  </span>
                  <span>Simple maintenance management</span>
                </div>

                <div className="login-feature">
                  <span className="login-feature-icon">
                    <CheckCircle2 size={17} />
                  </span>
                  <span>Community announcements</span>
                </div>

                <div className="login-feature">
                  <span className="login-feature-icon">
                    <CheckCircle2 size={17} />
                  </span>
                  <span>One place for apartment services</span>
                </div>
              </div>
            </div>

            <div className="login-visual-footer">
              <ShieldCheck size={17} />
              <span>Designed for your apartment community</span>
            </div>
          </div>

          <div className="login-building-art" aria-hidden="true">
            <div className="login-art-building building-back">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="login-art-building building-front">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-content">
            <div className="login-mobile-brand">
              <div className="login-brand-icon">
                <Building2 size={25} />
              </div>
              <span>ApartmentCare</span>
            </div>

            <div className="login-heading">
              <span className="login-welcome-tag">WELCOME BACK</span>
              <h2>Sign in to your account</h2>
              <p>
                Enter your details below to access your
                ApartmentCare workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="role">I am signing in as</label>

                <div className="login-select-wrap">
                  <ShieldCheck size={18} />
                  <select
                    id="role"
                    value={role}
                    onChange={(event) =>
                      setRole(event.target.value as UserRole)
                    }
                  >
                    <option value="admin">Administrator</option>
                    <option value="building_manager">
                      Building Manager
                    </option>
                    <option value="resident">Resident</option>
                  </select>
                </div>
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
                    autoComplete="username"
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
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="login-password-label">
                  <label htmlFor="password">Password</label>
                </div>

                <div className="login-input">
                  <Lock size={18} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="login-submit-button"
                disabled={isSubmitting}
              >
                <span>
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </span>
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="login-security-note">
              <ShieldCheck size={17} />
              <span>Your account is protected by secure authentication.</span>
            </div>

            <p className="login-copyright">
              © {new Date().getFullYear()} ApartmentCare. All rights reserved.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
