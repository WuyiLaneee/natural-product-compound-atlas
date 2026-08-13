"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  DEMO_LOGIN_SESSION_KEY,
  DEMO_LOGIN_TRANSITION_MS,
  validateDemoCredentials,
} from "../../lib/demo-login";

export function DemoLoginGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const transitionTimer = useRef<number | null>(null);
  const storedAuthentication = useSyncExternalStore(
    () => () => undefined,
    () => window.sessionStorage.getItem(DEMO_LOGIN_SESSION_KEY) === "true",
    () => false,
  );

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (transitionTimer.current !== null) return;
    if (!validateDemoCredentials(username, password)) {
      setError("用户名或密码错误");
      return;
    }

    setError("");
    setLoading(true);
    transitionTimer.current = window.setTimeout(() => {
      transitionTimer.current = null;
      window.sessionStorage.setItem(DEMO_LOGIN_SESSION_KEY, "true");
      if (window.location.pathname !== "/") {
        window.location.assign("/");
        return;
      }
      setAuthenticated(true);
    }, DEMO_LOGIN_TRANSITION_MS);
  }

  if (authenticated || storedAuthentication) return children;
  if (loading) return <DemoLoginTransition />;

  return (
    <main className="demo-login-page">
      <div className="demo-login-grid" aria-hidden="true" />
      <section className="demo-login-shell" aria-labelledby="demo-login-title">
        <div className="demo-login-intro">
          <div className="demo-login-kicker"><i /> TARGETS · PHYTOCHEMISTRY · AI</div>
          <div>
            <span className="demo-login-index">RESEARCH DATABASE / 01</span>
            <h1 id="demo-login-title">
              <span>中国日化前沿</span>
              <span>靶点与植物化学</span>
              <span>数据库检索平台</span>
            </h1>
            <p>连接小分子化合物、天然产物、分子靶点与科研文献数据。</p>
          </div>
          <div className="demo-login-network" aria-hidden="true">
            <span>化学结构</span><i /><span>生物活性</span><i /><span>科学文献</span>
          </div>
        </div>

        <div className="demo-login-form-panel">
          <div className="demo-login-form-heading">
            <span>DATABASE ACCESS</span>
            <h2>登录检索平台</h2>
          </div>
          <form className="demo-login-form" method="post" action="/" onSubmit={submit} noValidate>
            <label htmlFor="demo-login-username">用户名</label>
            <div className="demo-login-input">
              <input
                id="demo-login-username"
                name="username"
                value={username}
                onChange={(event) => { setUsername(event.target.value); setError(""); }}
                autoComplete="username"
                placeholder="请输入用户名"
              />
            </div>
            <label htmlFor="demo-login-password">密码</label>
            <div className="demo-login-input">
              <input
                id="demo-login-password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => { setPassword(event.target.value); setError(""); }}
                autoComplete="current-password"
                placeholder="请输入密码"
              />
            </div>
            <p className="demo-login-error" role="alert">{error}</p>
            <button type="submit">进入检索平台 <span aria-hidden="true">→</span></button>
          </form>
          <div className="demo-login-footer"><i /> DATABASE MODEL COMPUTING CENTER</div>
        </div>
      </section>
    </main>
  );
}

function DemoLoginTransition() {
  return (
    <main className="demo-login-page demo-login-transition-page">
      <div className="demo-login-grid" aria-hidden="true" />
      <section className="demo-login-transition-card" role="status" aria-live="polite" aria-busy="true">
        <div className="demo-login-transition-mark" aria-hidden="true">
          <span /><span /><i />
        </div>
        <p className="demo-login-transition-kicker">ACCESS VERIFIED</p>
        <h1>正在进入检索平台</h1>
        <p>正在载入化学结构、生物活性、分子靶点与文献数据</p>
        <div className="demo-login-transition-progress" aria-hidden="true"><i /></div>
      </section>
    </main>
  );
}
