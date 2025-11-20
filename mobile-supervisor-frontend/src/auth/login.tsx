import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./login.module.css";
import { useAuth } from "./AuthContext";
import authService from "../services/auth.js";

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await authService.login(formData.email, formData.password);
      login(res.user, res.accessToken);
      navigate("/", { replace: true });
    } catch (err) {
      setError("Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <h1 className={styles.loginTitle}>Đăng nhập</h1>
          <p className={styles.loginSubtitle}>
            Vui lòng đăng nhập vào tài khoản của bạn
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={styles.formInput}
              placeholder="example@email.com"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={styles.formInput}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <button
            type="submit"
            className={`${styles.loginButton} ${
              isLoading ? styles.loading : ""
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.buttonContent}>
                <span className={styles.spinner}></span>
                Đang đăng nhập...
              </span>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <p className={styles.forgotPassword}>
            Quên mật khẩu?
            <a href="#" className={styles.forgotLink}>
              Nhấn vào đây
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
