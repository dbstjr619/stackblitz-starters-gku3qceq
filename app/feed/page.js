'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Feed() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/')
      else {
        setUser(session.user)
        fetchPlaylists()
      }
    })
  }, [])

  async function fetchPlaylists() {
    const { data, error } = await supabase
      .from('playlists')
      .select(`*, profiles (nickname), songs (id, thumbnail_url), likes (id)`)
      .order('created_at', { ascending: false })
    if (!error) setPlaylists(data || [])
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b9ff66', fontSize: '16px' }}>
      🎵 불러오는 중...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif' }}>

      {/* 네비게이션 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: '700', color: '#f0f0f0', letterSpacing: '3px' }}>
          GROO<span style={{ color: '#b9ff66' }}>V</span>Y
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '13px', color: '#6b6b80' }}>
            {user?.user_metadata?.nickname || user?.email}
          </div>
          <button onClick={() => router.push('/upload')} style={{ padding: '6px 14px', background: '#b9ff66', border: 'none', borderRadius: '20px', color: '#0a0a0f', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
            + 올리기
          </button>
          <button onClick={() => router.push('/profile')} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', color: '#6b6b80', fontSize: '12px', cursor: 'pointer' }}>
            👤 프로필
          </button>
          <button onClick={handleLogout} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', color: '#6b6b80', fontSize: '12px', cursor: 'pointer' }}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 피드 */}
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '20px' }}>
        {playlists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b6b80' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎵</div>
            <div style={{ fontSize: '16px', marginBottom: '8px', color: '#f0f0f0' }}>아직 플레이리스트가 없어요</div>
            <div style={{ fontSize: '13px' }}>첫 번째 플레이리스트를 올려보세요!</div>
            <button onClick={() => router.push('/upload')} style={{ marginTop: '20px', padding: '12px 24px', background: '#b9ff66', border: 'none', borderRadius: '20px', fontSize: '14px', fontWeight: '600', color: '#0a0a0f', cursor: 'pointer' }}>
              + 첫 플레이리스트 올리기
            </button>
          </div>
        ) : (
          playlists.map(pl => (
            <div key={pl.id} onClick={() => router.push(`/playlist?id=${pl.id}`)} style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', cursor: 'pointer' }}>

              {/* 4분할 썸네일 */}
              <div style={{ width: '100%', aspectRatio: '16/9', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', overflow: 'hidden' }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ background: '#1c1c27', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {pl.songs?.[i]?.thumbnail_url ? (
                      <img src={pl.songs[i].thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '24px' }}>🎵</span>
                    )}
                  </div>
                ))}
              </div>

              {/* 본문 */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#b9ff66', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#0a0a0f' }}>
                    {pl.profiles?.nickname?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#f0f0f0' }}>{pl.profiles?.nickname || '알 수 없음'}</div>
                    <div style={{ fontSize: '10px', color: '#6b6b80' }}>{new Date(pl.created_at).toLocaleDateString('ko-KR')}</div>
                  </div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#f0f0f0', marginBottom: '6px' }}>{pl.title}</div>
                {pl.description && (
                  <div style={{ fontSize: '13px', color: '#6b6b80', marginBottom: '10px', lineHeight: '1.5' }}>{pl.description}</div>
                )}
                {pl.tags && pl.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {pl.tags.map((tag, i) => (
                      <span key={i} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', background: '#1c1c27', color: '#6b6b80', border: '1px solid rgba(255,255,255,0.07)' }}>#{tag}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize: '12px', color: '#6b6b80' }}>🎵 {pl.songs?.length || 0}곡</span>
                  <span style={{ fontSize: '12px', color: '#6b6b80' }}>♥ {pl.likes?.length || 0}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
