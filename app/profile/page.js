'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [myPlaylists, setMyPlaylists] = useState([])
  const [savedPlaylists, setSavedPlaylists] = useState([])
  const [activeTab, setActiveTab] = useState('my')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      fetchAll(session.user.id)
    })
  }, [])

  async function fetchAll(userId) {
    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', userId).single()
    setProfile(prof)

    const { data: mine } = await supabase
      .from('playlists')
      .select('*, songs(id, thumbnail_url), likes(id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setMyPlaylists(mine || [])

    const { data: saves } = await supabase
      .from('saves')
      .select('*, playlists(*, songs(id, thumbnail_url), likes(id), profiles(nickname))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setSavedPlaylists(saves?.map(s => s.playlists).filter(Boolean) || [])

    setLoading(false)
  }

  function PlaylistGrid({ playlists, emptyMsg }) {
    if (playlists.length === 0) return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b6b80' }}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎵</div>
        <div style={{ fontSize: '13px' }}>{emptyMsg}</div>
      </div>
    )
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {playlists.map(pl => (
          <div key={pl.id} onClick={() => router.push(`/playlist?id=${pl.id}`)} style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}>
            <div style={{ width: '100%', aspectRatio: '1', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', overflow: 'hidden' }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ background: '#1c1c27', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {pl.songs?.[i]?.thumbnail_url ? (
                    <img src={pl.songs[i].thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '16px' }}>🎵</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: '#f0f0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>{pl.title}</div>
              <div style={{ fontSize: '10px', color: '#6b6b80' }}>{pl.songs?.length || 0}곡 · ♥ {pl.likes?.length || 0}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b9ff66', fontSize: '16px' }}>
      🎵 불러오는 중...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', paddingBottom: '40px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.push('/feed')} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1c1c27', border: '1px solid rgba(255,255,255,0.07)', color: '#f0f0f0', cursor: 'pointer', fontSize: '16px' }}>←</button>
        <div style={{ flex: 1, fontSize: '16px', fontWeight: '500', color: '#f0f0f0' }}>프로필</div>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.07)', maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#b9ff66', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: '#0a0a0f' }}>
          {profile?.nickname?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#f0f0f0', marginBottom: '4px' }}>{profile?.nickname}</div>
          <div style={{ fontSize: '12px', color: '#6b6b80' }}>{user?.email}</div>
        </div>
        <div style={{ display: 'flex', gap: '32px', marginTop: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#f0f0f0' }}>{myPlaylists.length}</div>
            <div style={{ fontSize: '11px', color: '#6b6b80' }}>플레이리스트</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#f0f0f0' }}>{savedPlaylists.length}</div>
            <div style={{ fontSize: '11px', color: '#6b6b80' }}>저장한 플리</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#f0f0f0' }}>
              {myPlaylists.reduce((acc, pl) => acc + (pl.likes?.length || 0), 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#6b6b80' }}>받은 좋아요</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', maxWidth: '520px', margin: '0 auto' }}>
        <div onClick={() => setActiveTab('my')} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: activeTab === 'my' ? '#b9ff66' : '#6b6b80', borderBottom: activeTab === 'my' ? '2px solid #b9ff66' : '2px solid transparent' }}>
          🎵 내 플리
        </div>
        <div onClick={() => setActiveTab('saved')} style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: activeTab === 'saved' ? '#b9ff66' : '#6b6b80', borderBottom: activeTab === 'saved' ? '2px solid #b9ff66' : '2px solid transparent' }}>
          🤍 저장한 플리
        </div>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px 20px' }}>
        {activeTab === 'my' ? (
          <PlaylistGrid playlists={myPlaylists} emptyMsg="아직 올린 플레이리스트가 없어요" />
        ) : (
          <PlaylistGrid playlists={savedPlaylists} emptyMsg="저장한 플레이리스트가 없어요" />
        )}
      </div>
    </div>
  )
}
