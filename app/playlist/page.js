'use client'
import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

function PlaylistContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [user, setUser] = useState(null)
  const [playlist, setPlaylist] = useState(null)
  const [songs, setSongs] = useState([])
  const [comments, setComments] = useState([])
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [currentSong, setCurrentSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddSong, setShowAddSong] = useState(false)
  const [newSongUrl, setNewSongUrl] = useState('')
  const [newSongTitle, setNewSongTitle] = useState('')
  const [newSongArtist, setNewSongArtist] = useState('')
  const playerRef = useRef(null)
  const songsRef = useRef([])
  const currentSongRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return }
      setUser(session.user)
      if (id) fetchAll(session.user.id)
      else setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (window.YT) return
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }, [])

  useEffect(() => {
    if (!currentSong) return
    currentSongRef.current = currentSong
    const videoId = getYoutubeId(currentSong.youtube_url)
    if (!videoId) return

    function initPlayer() {
      if (playerRef.current && playerRef.current.loadVideoById) {
        playerRef.current.loadVideoById(videoId)
        return
      }
      playerRef.current = new window.YT.Player('yt-player', {
        videoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.ENDED) {
              playNextAuto()
            }
          }
        }
      })
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      window.onYouTubeIframeAPIReady = initPlayer
    }
  }, [currentSong])

  function playNextAuto() {
    const current = currentSongRef.current
    const songsList = songsRef.current
    const idx = songsList.findIndex(s => s.id === current?.id)
    if (idx < songsList.length - 1) setCurrentSong(songsList[idx + 1])
  }

  function playNext() {
    const idx = songs.findIndex(s => s.id === currentSong?.id)
    if (idx < songs.length - 1) setCurrentSong(songs[idx + 1])
  }

  function playPrev() {
    const idx = songs.findIndex(s => s.id === currentSong?.id)
    if (idx > 0) setCurrentSong(songs[idx - 1])
  }

  async function fetchAll(userId) {
    const { data: pl } = await supabase
      .from('playlists').select('*, profiles(nickname)')
      .eq('id', id).single()
    setPlaylist(pl)

    const { data: s } = await supabase
      .from('songs').select('*')
      .eq('playlist_id', id).order('order_index')
    setSongs(s || [])
    songsRef.current = s || []
    if (s && s.length > 0) {
      setCurrentSong(s[0])
      currentSongRef.current = s[0]
    }

    const { count } = await supabase
      .from('likes').select('*', { count: 'exact', head: true })
      .eq('playlist_id', id)
    setLikeCount(count || 0)

    const { data: myLike } = await supabase
      .from('likes').select('id')
      .eq('playlist_id', id).eq('user_id', userId).maybeSingle()
    setLiked(!!myLike)

    const { data: mySave } = await supabase
      .from('saves').select('id')
      .eq('playlist_id', id).eq('user_id', userId).maybeSingle()
    setSaved(!!mySave)

    fetchComments()
    setLoading(false)
  }

  async function fetchComments() {
    const { data } = await supabase
      .from('comments').select('*, profiles(nickname)')
      .eq('playlist_id', id).is('parent_id', null)
      .order('created_at', { ascending: true })

    const withReplies = await Promise.all((data || []).map(async (c) => {
      const { data: replies } = await supabase
        .from('comments').select('*, profiles(nickname)')
        .eq('parent_id', c.id).order('created_at', { ascending: true })
      return { ...c, replies: replies || [] }
    }))
    setComments(withReplies)
  }

  async function toggleLike() {
    if (!user) return
    if (liked) {
      await supabase.from('likes').delete().eq('playlist_id', id).eq('user_id', user.id)
      setLikeCount(p => p - 1)
    } else {
      await supabase.from('likes').insert({ playlist_id: id, user_id: user.id })
      setLikeCount(p => p + 1)
    }
    setLiked(!liked)
  }

  async function toggleSave() {
    if (!user) return
    if (saved) {
      await supabase.from('saves').delete().eq('playlist_id', id).eq('user_id', user.id)
    } else {
      await supabase.from('saves').insert({ playlist_id: id, user_id: user.id })
    }
    setSaved(!saved)
  }

  async function addNewSong() {
    if (!newSongUrl.includes('youtube') && !newSongUrl.includes('youtu.be')) {
      alert('올바른 YouTube 링크를 입력해주세요')
      return
    }
    const shortMatch = newSongUrl.match(/youtu\.be\/([^?&\s]+)/)
    const longMatch = newSongUrl.match(/[?&]v=([^&\s]+)/)
    const videoId = shortMatch ? shortMatch[1] : longMatch ? longMatch[1] : null

    if (!videoId) {
      alert('올바른 YouTube 링크를 입력해주세요')
      return
    }

    let title = 'YouTube 곡'
    let artist = 'YouTube'
    try {
      const res = await fetch(
        'https://urfvlqbftchgiiweabho.supabase.co/functions/v1/get-youtube-title',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId })
        }
      )
      const data = await res.json()
      if (data.title) title = data.title
      if (data.artist) artist = data.artist
    } catch {}

    const { error } = await supabase.from('songs').insert({
      playlist_id: id,
      title,
      artist,
      youtube_url: newSongUrl,
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/0.jpg`,
      order_index: songs.length
    })
    if (!error) {
      setNewSongUrl('')
      setNewSongTitle('')
      setNewSongArtist('')
      setShowAddSong(false)
      fetchAll(user.id)
    }
  }

  async function deleteSong(songId) {
    if (!confirm('이 곡을 삭제할까요?')) return
    await supabase.from('songs').delete().eq('id', songId)
    fetchAll(user.id)
  }

  async function deletePlaylist() {
    if (!confirm('플레이리스트를 삭제할까요? 되돌릴 수 없어요.')) return
    await supabase.from('songs').delete().eq('playlist_id', id)
    await supabase.from('likes').delete().eq('playlist_id', id)
    await supabase.from('saves').delete().eq('playlist_id', id)
    await supabase.from('comments').delete().eq('playlist_id', id)
    await supabase.from('playlists').delete().eq('id', id)
    router.push('/feed')
  }

  async function addComment() {
    if (!commentText.trim() || !user) return
    await supabase.from('comments').insert({
      playlist_id: id, user_id: user.id, content: commentText, parent_id: null
    })
    setCommentText('')
    fetchComments()
  }

  async function addReply(parentId) {
    if (!replyText.trim() || !user) return
    await supabase.from('comments').insert({
      playlist_id: id, user_id: user.id, content: replyText, parent_id: parentId
    })
    setReplyText('')
    setReplyTo(null)
    fetchComments()
  }

  async function deleteComment(commentId) {
    await supabase.from('comments').delete().eq('id', commentId)
    fetchComments()
  }

  function getYoutubeId(url) {
    if (!url) return null
    const shortMatch = url.match(/youtu\.be\/([^?&\s]+)/)
    if (shortMatch) return shortMatch[1]
    const longMatch = url.match(/[?&]v=([^&\s]+)/)
    if (longMatch) return longMatch[1]
    return null
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b9ff66', fontSize: '16px' }}>
      🎵 불러오는 중...
    </div>
  )

  if (!playlist) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <div style={{ color: '#f0f0f0', fontSize: '16px' }}>플레이리스트를 찾을 수 없어요</div>
      <button onClick={() => router.push('/feed')} style={{ padding: '10px 20px', background: '#b9ff66', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: '600' }}>피드로 돌아가기</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', paddingBottom: '40px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.push('/feed')} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1c1c27', border: '1px solid rgba(255,255,255,0.07)', color: '#f0f0f0', cursor: 'pointer', fontSize: '16px' }}>←</button>
        <div style={{ flex: 1, fontSize: '15px', fontWeight: '500', color: '#f0f0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlist.title}</div>
      </div>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '20px' }}>

        {currentSong && (
          <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
            <div id="yt-player" style={{ width: '100%', aspectRatio: '16/9' }}></div>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f0f0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.title}</div>
                <div style={{ fontSize: '12px', color: '#6b6b80', marginTop: '2px' }}>{currentSong.artist}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={playPrev} disabled={songs.findIndex(s => s.id === currentSong?.id) === 0} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1c1c27', border: '1px solid rgba(255,255,255,0.07)', color: songs.findIndex(s => s.id === currentSong?.id) === 0 ? '#3a3a4a' : '#f0f0f0', cursor: songs.findIndex(s => s.id === currentSong?.id) === 0 ? 'not-allowed' : 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏮</button>
                <button onClick={playNext} disabled={songs.findIndex(s => s.id === currentSong?.id) === songs.length - 1} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#b9ff66', border: 'none', color: songs.findIndex(s => s.id === currentSong?.id) === songs.length - 1 ? '#888' : '#0a0a0f', cursor: songs.findIndex(s => s.id === currentSong?.id) === songs.length - 1 ? 'not-allowed' : 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏭</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#f0f0f0', marginBottom: '6px' }}>{playlist.title}</div>
          {playlist.description && <div style={{ fontSize: '13px', color: '#6b6b80', marginBottom: '10px', lineHeight: '1.5' }}>{playlist.description}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#b9ff66', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', color: '#0a0a0f' }}>
              {playlist.profiles?.nickname?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: '12px', color: '#f0f0f0' }}>{playlist.profiles?.nickname}</span>
            <span style={{ fontSize: '11px', color: '#6b6b80' }}>· {new Date(playlist.created_at).toLocaleDateString('ko-KR')}</span>
          </div>
          {playlist.tags && playlist.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {playlist.tags.map((tag, i) => (
                <span key={i} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', background: '#1c1c27', color: '#6b6b80', border: '1px solid rgba(255,255,255,0.07)' }}>#{tag}</span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={toggleLike} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid', borderColor: liked ? 'rgba(255,107,107,0.3)' : 'rgba(255,255,255,0.07)', background: liked ? 'rgba(255,107,107,0.12)' : '#1c1c27', color: liked ? '#ff6b6b' : '#6b6b80', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              {liked ? '♥' : '♡'} {likeCount}
            </button>
            <button onClick={toggleSave} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid', borderColor: saved ? 'rgba(185,255,102,0.3)' : 'rgba(255,255,255,0.07)', background: saved ? 'rgba(185,255,102,0.12)' : '#1c1c27', color: saved ? '#b9ff66' : '#6b6b80', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              {saved ? '❤️ 저장됨' : '🤍 저장'}
            </button>
            {user?.id === playlist?.user_id && (
              <button onClick={deletePlaylist} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,107,107,0.3)', background: 'rgba(255,107,107,0.12)', color: '#ff6b6b', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                🗑 삭제
              </button>
            )}
          </div>
        </div>

        <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '500', color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.8px' }}>곡 목록 {songs.length}개</div>
            {user?.id === playlist?.user_id && (
              <button onClick={() => setShowAddSong(!showAddSong)} style={{ padding: '5px 12px', background: showAddSong ? '#1c1c27' : '#b9ff66', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', color: showAddSong ? '#6b6b80' : '#0a0a0f', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                {showAddSong ? '닫기' : '+ 곡 추가'}
              </button>
            )}
          </div>

          {showAddSong && user?.id === playlist?.user_id && (
            <div style={{ marginBottom: '14px', padding: '14px', background: '#1c1c27', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: '12px', color: '#6b6b80', marginBottom: '8px' }}>🔗 YouTube 링크로 추가</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input value={newSongUrl} onChange={e => setNewSongUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  style={{ flex: 1, background: '#13131a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '9px 12px', fontSize: '12px', color: '#f0f0f0', outline: 'none' }} />
                <button onClick={addNewSong} style={{ padding: '0 14px', background: '#b9ff66', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '600', color: '#0a0a0f', cursor: 'pointer', whiteSpace: 'nowrap' }}>추가</button>
              </div>
            </div>
          )}

          {songs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b6b80', fontSize: '13px' }}>곡이 없어요</div>
          ) : songs.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', background: currentSong?.id === s.id ? 'rgba(185,255,102,0.07)' : 'transparent', border: currentSong?.id === s.id ? '1px solid rgba(185,255,102,0.15)' : '1px solid transparent', marginBottom: '4px' }}>
              <div onClick={() => setCurrentSong(s)} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <span style={{ fontSize: '11px', color: '#6b6b80', width: '16px' }}>{i + 1}</span>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#1c1c27', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', overflow: 'hidden', flexShrink: 0 }}>
                  {s.thumbnail_url ? <img src={s.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🎵'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: currentSong?.id === s.id ? '#b9ff66' : '#f0f0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                  <div style={{ fontSize: '11px', color: '#6b6b80' }}>{s.artist}</div>
                </div>
              </div>
              {user?.id === playlist?.user_id && (
                <button onClick={() => deleteSong(s.id)} style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'rgba(255,107,107,0.15)', color: '#ff6b6b', cursor: 'pointer', fontSize: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '500', color: '#6b6b80', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>댓글 {comments.length}</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#b9ff66', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#0a0a0f', flexShrink: 0 }}>
              {user?.user_metadata?.nickname?.[0]?.toUpperCase() || '나'}
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                placeholder="댓글을 입력하세요..." style={{ flex: 1, background: '#1c1c27', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', color: '#f0f0f0', outline: 'none' }} />
              <button onClick={addComment} style={{ padding: '0 14px', background: '#b9ff66', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', color: '#0a0a0f', cursor: 'pointer' }}>↑</button>
            </div>
          </div>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b6b80', fontSize: '13px' }}>첫 댓글을 남겨보세요! 💬</div>
          ) : comments.map(c => (
            <div key={c.id} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#7F77DD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#fff', flexShrink: 0 }}>
                  {c.profiles?.nickname?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#f0f0f0' }}>{c.profiles?.nickname}</span>
                    <span style={{ fontSize: '10px', color: '#6b6b80' }}>{new Date(c.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#f0f0f0', lineHeight: '1.5', marginBottom: '6px' }}>{c.content}</div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} style={{ fontSize: '11px', color: '#6b6b80', cursor: 'pointer' }}>↩ 답글</span>
                    {user?.id === c.user_id && <span onClick={() => deleteComment(c.id)} style={{ fontSize: '11px', color: '#ff6b6b', cursor: 'pointer' }}>삭제</span>}
                  </div>
                </div>
              </div>
              {c.replies && c.replies.length > 0 && (
                <div style={{ marginLeft: '36px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {c.replies.map(r => (
                    <div key={r.id} style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', color: '#fff', flexShrink: 0 }}>
                        {r.profiles?.nickname?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '500', color: '#f0f0f0' }}>{r.profiles?.nickname}</span>
                          <span style={{ fontSize: '10px', color: '#6b6b80' }}>{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#f0f0f0', lineHeight: '1.5' }}>{r.content}</div>
                        {user?.id === r.user_id && <span onClick={() => deleteComment(r.id)} style={{ fontSize: '11px', color: '#ff6b6b', cursor: 'pointer' }}>삭제</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {replyTo === c.id && (
                <div style={{ marginLeft: '36px', marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <input value={replyText} onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addReply(c.id)}
                    placeholder="답글을 입력하세요..." style={{ flex: 1, background: '#1c1c27', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '7px 12px', fontSize: '12px', color: '#f0f0f0', outline: 'none' }} />
                  <button onClick={() => addReply(c.id)} style={{ padding: '0 12px', background: '#b9ff66', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '600', color: '#0a0a0f', cursor: 'pointer' }}>↑</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PlaylistPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b9ff66', fontSize: '16px' }}>
        🎵 불러오는 중...
      </div>
    }>
      <PlaylistContent />
    </Suspense>
  )
}
