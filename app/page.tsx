'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './lib/supabase';

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError('이메일 또는 비밀번호가 틀렸어요');
    } else {
      router.push('/feed');
    }
    setLoading(false);
  }

  async function handleSignup() {
    setLoading(true);
    setError('');
    if (!nickname) {
      setError('닉네임을 입력해주세요');
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname } },
    });
    if (error) setError(error.message);
    else setSuccess('가입 완료! 이메일을 확인해주세요 📧');
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              background: '#b9ff66',
              borderRadius: '16px',
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}
          >
            🎵
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#f0f0f0',
              letterSpacing: '4px',
            }}
          >
            GROO<span style={{ color: '#b9ff66' }}>V</span>Y
          </div>
          <div style={{ fontSize: '13px', color: '#6b6b80', marginTop: '4px' }}>
            친구들과 음악 취향을 공유하세요
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            background: '#13131a',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {['login', 'signup'].map((t) => (
            <div
              key={t}
              onClick={() => {
                setTab(t);
                setError('');
                setSuccess('');
              }}
              style={{
                flex: 1,
                padding: '10px',
                textAlign: 'center',
                borderRadius: '9px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                background: tab === t ? '#b9ff66' : 'transparent',
                color: tab === t ? '#0a0a0f' : '#6b6b80',
              }}
            >
              {t === 'login' ? '로그인' : '회원가입'}
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#13131a',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px',
            padding: '24px',
          }}
        >
          {tab === 'signup' && (
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: '#6b6b80',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                }}
              >
                닉네임
              </label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="groovy_user"
                style={{
                  width: '100%',
                  background: '#1c1c27',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px',
                  padding: '11px 14px',
                  fontSize: '14px',
                  color: '#f0f0f0',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: '#6b6b80',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
              }}
            >
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@groovy.com"
              style={{
                width: '100%',
                background: '#1c1c27',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                padding: '11px 14px',
                fontSize: '14px',
                color: '#f0f0f0',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: '#6b6b80',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
              }}
            >
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상"
              style={{
                width: '100%',
                background: '#1c1c27',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                padding: '11px 14px',
                fontSize: '14px',
                color: '#f0f0f0',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(255,107,107,0.1)',
                border: '1px solid rgba(255,107,107,0.3)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#ff6b6b',
                marginBottom: '14px',
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              style={{
                background: 'rgba(185,255,102,0.1)',
                border: '1px solid rgba(185,255,102,0.3)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#b9ff66',
                marginBottom: '14px',
              }}
            >
              {success}
            </div>
          )}

          <button
            onClick={tab === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '10px',
              border: 'none',
              background: loading ? '#888' : '#b9ff66',
              color: '#0a0a0f',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '처리 중...' : tab === 'login' ? '로그인' : '시작하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
