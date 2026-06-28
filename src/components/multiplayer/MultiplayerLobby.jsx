import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { 
  Users, Copy, Check, Play, Crown, Loader2, 
  ArrowLeft, Trophy, Settings, Eye, Download
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useMultiplayerStore } from '../../store'
import toast, { Toaster } from 'react-hot-toast'
import TypingEngine from '../typing/TypingEngine'
import { formatDistanceToNow } from 'date-fns'
import { buildRaceFromSettings, decodeRaceText, generateRoomCode } from './multiplayerUtils'
import { syncUserAchievements } from '../../utils/achievements'

const MIN_ROOM_PLAYERS = 2
const DEFAULT_ROOM_PLAYERS = 5
const MAX_ROOM_PLAYERS = 50
const MIN_ROOM_OBSERVERS = 0
const DEFAULT_ROOM_OBSERVERS = 10
const MAX_OBSERVERS = 10
const PARTICIPANT_SYNC_INTERVAL_MS = 5000
const PROGRESS_BROADCAST_INTERVAL_MS = 120
const PROGRESS_DB_SYNC_INTERVAL_MS = 700
const TYPING_SNAPSHOT_INTERVAL_MS = 160

const clampRoomSize = (value) => {
  if (!Number.isFinite(value)) return DEFAULT_ROOM_PLAYERS
  return Math.min(MAX_ROOM_PLAYERS, Math.max(MIN_ROOM_PLAYERS, Math.round(value)))
}

const clampObserverSize = (value) => {
  if (!Number.isFinite(value)) return DEFAULT_ROOM_OBSERVERS
  return Math.min(MAX_OBSERVERS, Math.max(MIN_ROOM_OBSERVERS, Math.round(value)))
}

const MultiplayerLobby = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const {
    currentRoom, roomCode, isHost, status, participants, raceText, countdown,
    setRoom, setIsHost, setParticipants, setStatus, setCountdown, updateParticipant, leaveRoom
  } = useMultiplayerStore()

  const sentenceOptions = useMemo(
    () => [
      { key: 'easy', name: 'Easy' },
      { key: 'medium', name: 'Medium' },
      { key: 'hard', name: 'Hard' },
      { key: 'extreme', name: 'Extreme' },
    ],
    []
  )
  const timedOptions = useMemo(() => [15, 30, 60, 120], [])

  const [joinCode, setJoinCode] = useState('')
  const [joinAsObserver, setJoinAsObserver] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [myProgress, setMyProgress] = useState(0)
  const [myWpm, setMyWpm] = useState(0)
  const [finished, setFinished] = useState(false)
  const [incomingInvites, setIncomingInvites] = useState([])
  const [inviteActionLoading, setInviteActionLoading] = useState({})
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false)
  const [roomSettingsSaving, setRoomSettingsSaving] = useState(false)
  const [roomMode, setRoomMode] = useState('sentence') // sentence | timed | custom
  const [roomSentenceDifficulty, setRoomSentenceDifficulty] = useState('medium')
  const [roomTimedDuration, setRoomTimedDuration] = useState(60)
  const [roomCustomText, setRoomCustomText] = useState('')
  const [roomName, setRoomName] = useState('')
  const [roomMaxPlayers, setRoomMaxPlayers] = useState(DEFAULT_ROOM_PLAYERS)
  const [roomMaxObservers, setRoomMaxObservers] = useState(DEFAULT_ROOM_OBSERVERS)
  const [liveTypingSnapshots, setLiveTypingSnapshots] = useState({})
  const [spectateUserId, setSpectateUserId] = useState(null)
  const [participantActionLoading, setParticipantActionLoading] = useState({})
  const [isDownloadingLeaderboardImage, setIsDownloadingLeaderboardImage] = useState(false)
  const [isDownloadingLeaderboardPdf, setIsDownloadingLeaderboardPdf] = useState(false)

  const channelRef = useRef(null)
  const inviteChannelRef = useRef(null)
  const leaderboardExportRef = useRef(null)
  const lastTypingSnapshotSentRef = useRef({ at: 0, text: '' })
  const lastProgressBroadcastRef = useRef({ at: 0, progress: -1, wpm: -1 })
  const lastProgressDbSyncRef = useRef({ at: 0, progress: -1, wpm: -1 })
  const pendingProgressDbSyncRef = useRef(null)
  const progressDbSyncInFlightRef = useRef(false)
  const finalProgressLockedRef = useRef(false)
  const bufferedBroadcastProgressRef = useRef(new Map())
  const bufferedBroadcastProgressFlushTimerRef = useRef(null)
  const isCurrentUserObserverRef = useRef(false)
  const spectateUserIdRef = useRef(null)
  const isStartingRaceRef = useRef(false)
  const isLeavingRoomRef = useRef(false)
  const encodedRaceText = raceText || currentRoom?.race_text || ''

  const activeRace = useMemo(() => decodeRaceText(encodedRaceText), [encodedRaceText])
  const activeRaceText = activeRace.text || ''
  const isTimedRace = activeRace.mode === 'timed'
  const raceModeLabel = useMemo(() => {
    if (activeRace.mode === 'timed') return `Timed ${activeRace.timedDuration}s`
    if (activeRace.mode === 'custom') return 'Custom'
    const sentenceLabel = sentenceOptions.find((o) => o.key === activeRace.sentenceDifficulty)?.name || 'Medium'
    return `Sentence ${sentenceLabel}`
  }, [activeRace.mode, activeRace.sentenceDifficulty, activeRace.timedDuration, sentenceOptions])

  const roomCustomTrimmedLength = roomCustomText.trim().length
  const playerParticipants = useMemo(
    () => participants.filter((p) => !p?.is_observer),
    [participants]
  )
  const observerParticipants = useMemo(
    () => participants.filter((p) => !!p?.is_observer && !p?.is_bot),
    [participants]
  )
  const botParticipants = useMemo(
    () => participants.filter((p) => !!p?.is_bot),
    [participants]
  )
  const currentUserParticipant = useMemo(
    () => participants.find((p) => p.user_id === user?.id) || null,
    [participants, user?.id]
  )
  const isCurrentUserObserver = !!currentUserParticipant?.is_observer
  const sortedRacePlayers = useMemo(
    () => [...playerParticipants].sort((a, b) => (b.progress || 0) - (a.progress || 0)),
    [playerParticipants]
  )
  const sortedResultPlayers = useMemo(
    () => [...playerParticipants].sort((a, b) => (b.wpm || 0) - (a.wpm || 0)),
    [playerParticipants]
  )
  const raceTrackerParticipants = useMemo(
    () => (isCurrentUserObserver ? sortedRacePlayers : sortedRacePlayers.slice(0, 5)),
    [isCurrentUserObserver, sortedRacePlayers]
  )
  const hiddenRaceTrackerCount = Math.max(0, sortedRacePlayers.length - raceTrackerParticipants.length)
  const spectatedPlayer = useMemo(
    () => sortedRacePlayers.find((p) => p.user_id === spectateUserId) || sortedRacePlayers[0] || null,
    [sortedRacePlayers, spectateUserId]
  )
  const spectatedSnapshot = useMemo(
    () => (spectatedPlayer ? liveTypingSnapshots[spectatedPlayer.user_id] || null : null),
    [liveTypingSnapshots, spectatedPlayer]
  )
  const spectatedTypedText = useMemo(
    () => (typeof spectatedSnapshot?.typedText === 'string' ? spectatedSnapshot.typedText : ''),
    [spectatedSnapshot]
  )
  const spectatedCaretIndex = Math.min(
    Math.max(0, spectatedTypedText.length),
    activeRaceText.length
  )
  const spectatedLiveWpm = spectatedSnapshot?.wpm ?? spectatedPlayer?.wpm ?? 0
  const spectatedLiveProgress = spectatedSnapshot?.progress ?? spectatedPlayer?.progress ?? 0
  const spectatedRenderedChars = useMemo(() => {
    if (!activeRaceText) return []

    return [...activeRaceText].map((targetChar, idx) => {
      const isTyped = idx < spectatedTypedText.length
      const typedChar = isTyped ? spectatedTypedText[idx] : ''
      const isCorrect = isTyped && typedChar === targetChar
      const isError = isTyped && typedChar !== targetChar
      const isCaret = idx === spectatedCaretIndex

      let charClass = 'text-gray-500'
      if (isCorrect) charClass = 'text-white'
      if (isError) charClass = 'text-red-400 bg-red-500/20 rounded-sm'

      let displayChar = targetChar
      if (targetChar === '\n') displayChar = '↵\n'
      if (targetChar === '\t') displayChar = '⇥ '

      return (
        <span key={`spectate-char-${idx}`} className={`relative ${charClass}`}>
          {isCaret && !finished && (
            <span className="absolute left-0 top-0 h-full w-0.5 bg-blue-300 animate-pulse" />
          )}
          {displayChar}
        </span>
      )
    })
  }, [activeRaceText, finished, spectatedCaretIndex, spectatedTypedText])
  const isRoomSizeValid = roomMaxPlayers >= MIN_ROOM_PLAYERS && roomMaxPlayers <= MAX_ROOM_PLAYERS
  const isObserverSizeValid = roomMaxObservers >= MIN_ROOM_OBSERVERS && roomMaxObservers <= MAX_OBSERVERS
  const currentRoomObserverLimit = clampObserverSize(currentRoom?.max_observers ?? DEFAULT_ROOM_OBSERVERS)
  const canApplyRoomSettings =
    (roomMode !== 'custom' || roomCustomTrimmedLength >= 30) &&
    isRoomSizeValid &&
    isObserverSizeValid &&
    roomMaxObservers >= observerParticipants.length &&
    roomMaxPlayers >= playerParticipants.length

  // Reset local race UI state whenever room changes.
  useEffect(() => {
    setFinished(false)
    setMyProgress(0)
    setMyWpm(0)
  }, [currentRoom?.id])

  // Ensure countdown/waiting states always start from a clean local finish state.
  useEffect(() => {
    if (status === 'waiting' || status === 'countdown') {
      setFinished(false)
      setMyProgress(0)
      setMyWpm(0)
      setLiveTypingSnapshots({})
      lastTypingSnapshotSentRef.current = { at: 0, text: '' }
      lastProgressBroadcastRef.current = { at: 0, progress: -1, wpm: -1 }
      lastProgressDbSyncRef.current = { at: 0, progress: -1, wpm: -1 }
      pendingProgressDbSyncRef.current = null
      progressDbSyncInFlightRef.current = false
      finalProgressLockedRef.current = false
      bufferedBroadcastProgressRef.current.clear()
      if (bufferedBroadcastProgressFlushTimerRef.current) {
        clearTimeout(bufferedBroadcastProgressFlushTimerRef.current)
        bufferedBroadcastProgressFlushTimerRef.current = null
      }
    }
  }, [status])

  useEffect(() => {
    setLiveTypingSnapshots({})
    setSpectateUserId(null)
    lastTypingSnapshotSentRef.current = { at: 0, text: '' }
    lastProgressBroadcastRef.current = { at: 0, progress: -1, wpm: -1 }
    lastProgressDbSyncRef.current = { at: 0, progress: -1, wpm: -1 }
    pendingProgressDbSyncRef.current = null
    progressDbSyncInFlightRef.current = false
    finalProgressLockedRef.current = false
    bufferedBroadcastProgressRef.current.clear()
    if (bufferedBroadcastProgressFlushTimerRef.current) {
      clearTimeout(bufferedBroadcastProgressFlushTimerRef.current)
      bufferedBroadcastProgressFlushTimerRef.current = null
    }
  }, [currentRoom?.id])

  useEffect(() => {
    if (!currentRoom?.id || !user?.id || isHost || isLeavingRoomRef.current) return
    if (participants.length === 0) return

    const stillInRoom = participants.some((p) => p.user_id === user.id)
    if (!stillInRoom) {
      toast.error('You were removed from the room by host')
      leaveRoom()
    }
  }, [currentRoom?.id, isHost, leaveRoom, participants, user?.id])

  useEffect(() => {
    if (!isCurrentUserObserver) {
      setSpectateUserId(null)
      return
    }

    if (sortedRacePlayers.length === 0) {
      setSpectateUserId(null)
      return
    }

    const selectedStillExists = sortedRacePlayers.some((p) => p.user_id === spectateUserId)
    if (!selectedStillExists) {
      setSpectateUserId(sortedRacePlayers[0].user_id)
    }
  }, [isCurrentUserObserver, sortedRacePlayers, spectateUserId])

  useEffect(() => {
    isCurrentUserObserverRef.current = isCurrentUserObserver
  }, [isCurrentUserObserver])

  useEffect(() => {
    spectateUserIdRef.current = spectateUserId
  }, [spectateUserId])

  useEffect(() => {
    setRoomMode(activeRace.mode || 'sentence')
    setRoomSentenceDifficulty(activeRace.sentenceDifficulty || 'medium')
    setRoomTimedDuration(activeRace.timedDuration || 60)
    setRoomCustomText(activeRace.mode === 'custom' ? (activeRace.text || '') : '')
    setRoomName(currentRoom?.room_name || '')
    setRoomMaxPlayers(clampRoomSize(currentRoom?.max_players || DEFAULT_ROOM_PLAYERS))
    setRoomMaxObservers(clampObserverSize(currentRoom?.max_observers ?? DEFAULT_ROOM_OBSERVERS))
  }, [activeRace.mode, activeRace.sentenceDifficulty, activeRace.timedDuration, activeRace.text, currentRoom?.max_players, currentRoom?.max_observers, currentRoom?.room_name])

  useEffect(() => {
    if (status !== 'waiting') {
      setRoomSettingsOpen(false)
    }
  }, [status])

  // Fetch user profile
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data))
    }
  }, [user])

  const isInviteTableMissingError = (error) =>
    error?.code === '42P01' || /multiplayer_invitations/i.test(error?.message || '')

  const fetchInvites = useCallback(async () => {
    if (!user?.id) return

    try {
      const incomingRes = await supabase
        .from('multiplayer_invitations')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(12)

      if (incomingRes.error) {
        if (isInviteTableMissingError(incomingRes.error)) {
          setIncomingInvites([])
          return
        }
        throw incomingRes.error
      }

      const incomingRows = incomingRes.data || []
      const senderIds = [...new Set(incomingRows.map((row) => row.sender_id).filter(Boolean))]
      const roomIds = [...new Set(incomingRows.map((row) => row.room_id).filter(Boolean))]

      const [senderProfilesRes, roomsRes] = await Promise.all([
        senderIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .in('id', senderIds)
          : Promise.resolve({ data: [], error: null }),
        roomIds.length > 0
          ? supabase
              .from('multiplayer_rooms')
              .select('id, room_code, status, max_players, current_players')
              .in('id', roomIds)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (senderProfilesRes.error) throw senderProfilesRes.error
      if (roomsRes.error) throw roomsRes.error

      const senderMap = new Map((senderProfilesRes.data || []).map((p) => [p.id, p]))
      const roomMap = new Map((roomsRes.data || []).map((r) => [r.id, r]))

      setIncomingInvites(
        incomingRows.map((row) => ({
          ...row,
          senderProfile: senderMap.get(row.sender_id) || null,
          room: roomMap.get(row.room_id) || null,
        }))
      )
    } catch (error) {
      console.error('Error fetching multiplayer invites:', error)
    }
  }, [user?.id])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  useEffect(() => {
    if (!user?.id) return

    inviteChannelRef.current = supabase
      .channel(`multiplayer-invites:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'multiplayer_invitations',
        filter: `receiver_id=eq.${user.id}`,
      }, async (payload) => {
        if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
          toast.success('You received a multiplayer challenge invite')
        }
        await fetchInvites()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'multiplayer_invitations',
        filter: `sender_id=eq.${user.id}`,
      }, (payload) => {
        const previousStatus = payload.old?.status
        const currentStatus = payload.new?.status

        if (payload.eventType === 'UPDATE' && previousStatus !== currentStatus) {
          if (currentStatus === 'accepted') {
            toast.success('Your challenge invite was accepted')
          } else if (currentStatus === 'declined') {
            toast.error('Your challenge invite was declined')
          }
        }
      })
      .subscribe()

    return () => {
      if (inviteChannelRef.current) {
        supabase.removeChannel(inviteChannelRef.current)
        inviteChannelRef.current = null
      }
    }
  }, [fetchInvites, user?.id])

  // Check if all players have finished
  useEffect(() => {
    if (status === 'racing' && playerParticipants.length > 0) {
      const allFinished = playerParticipants.every((p) => p.progress >= 100 || p.finished_at)
      if (allFinished) {
        // All players finished - update room status
        setStatus('finished')
        if (isHost && currentRoom?.id) {
          supabase
            .from('multiplayer_rooms')
            .update({ status: 'finished', finished_at: new Date().toISOString() })
            .eq('id', currentRoom.id)
        }
      }
    }
  }, [playerParticipants, status, isHost, currentRoom?.id, setStatus])

  // Subscribe to room changes
  useEffect(() => {
    if (!currentRoom?.id) return

    const roomId = currentRoom.id
    let cancelled = false
    let lastParticipantSignature = ''

    // Keep participants in sync even if a realtime event is missed.
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('multiplayer_participants')
        .select('id, room_id, user_id, display_name, avatar_url, is_observer, is_ready, progress, wpm, accuracy, errors, finished_at, joined_at')
        .eq('room_id', roomId)
      if (cancelled || !data) return

      const signature = [...data]
        .sort((a, b) => (a.user_id || '').localeCompare(b.user_id || ''))
        .map((p) => [
          p.user_id,
          p.progress ?? 0,
          p.wpm ?? 0,
          p.accuracy ?? 100,
          p.errors ?? 0,
          p.finished_at || '',
          p.is_observer ? 1 : 0,
          p.display_name || '',
          p.is_ready ? 1 : 0,
        ].join(':'))
        .join('|')

      if (signature !== lastParticipantSignature) {
        lastParticipantSignature = signature
        setParticipants(data)
      }
    }
    fetchParticipants()
    const syncInterval = setInterval(fetchParticipants, PARTICIPANT_SYNC_INTERVAL_MS)

    // Subscribe to room updates
    channelRef.current = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'multiplayer_rooms',
        filter: `id=eq.${roomId}`,
      }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          toast.error('Room was closed by host')
          leaveRoom()
          return
        }

        if (payload.new) {
          setRoom(payload.new)
          setStatus(payload.new.status)
        }

        await fetchParticipants()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'multiplayer_participants',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          await fetchParticipants()
          return
        }

        if (payload.eventType !== 'UPDATE') return

        const previous = payload.old || {}
        const next = payload.new || {}
        const hasIdentityChange =
          previous.is_observer !== next.is_observer ||
          previous.display_name !== next.display_name ||
          previous.avatar_url !== next.avatar_url ||
          previous.is_ready !== next.is_ready

        if (hasIdentityChange || !next?.user_id) {
          await fetchParticipants()
          return
        }

        const finishedAtChanged = (previous.finished_at || '') !== (next.finished_at || '')
        if (finishedAtChanged) {
          updateParticipant(next.user_id, {
            progress: next.progress ?? 100,
            wpm: next.wpm ?? 0,
            accuracy: next.accuracy ?? 100,
            errors: next.errors ?? 0,
            finished_at: next.finished_at || null,
          })
        }
      })
      .on('broadcast', { event: 'countdown' }, ({ payload }) => {
        setFinished(false)
        setMyProgress(0)
        setMyWpm(0)
        setLiveTypingSnapshots({})
        setStatus('countdown')
        setCountdown(payload.count)
      })
      .on('broadcast', { event: 'start' }, () => {
        setFinished(false)
        setMyProgress(0)
        setMyWpm(0)
        setLiveTypingSnapshots({})
        setStatus('racing')
      })
      .on('broadcast', { event: 'progress' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === user?.id) return

        bufferedBroadcastProgressRef.current.set(payload.userId, {
          progress: Number.isFinite(payload.progress) ? payload.progress : 0,
          wpm: Number.isFinite(payload.wpm) ? payload.wpm : 0,
        })
        scheduleBufferedBroadcastProgressFlush()
      })
      .on('broadcast', { event: 'typing_snapshot' }, ({ payload }) => {
        if (!payload?.userId) return
        if (!isCurrentUserObserverRef.current) return
        if (payload.userId === user?.id) return

        const activeSpectateId = spectateUserIdRef.current
        if (activeSpectateId && payload.userId !== activeSpectateId) return

        setLiveTypingSnapshots((prev) => ({
          ...prev,
          [payload.userId]: {
            ...(prev[payload.userId] || {}),
            typedText: typeof payload.typedText === 'string' ? payload.typedText : (prev[payload.userId]?.typedText || ''),
            progress: Number.isFinite(payload.progress) ? payload.progress : (prev[payload.userId]?.progress || 0),
            wpm: Number.isFinite(payload.wpm) ? payload.wpm : (prev[payload.userId]?.wpm || 0),
            accuracy: Number.isFinite(payload.accuracy) ? payload.accuracy : (prev[payload.userId]?.accuracy || 100),
            errors: Number.isFinite(payload.errors) ? payload.errors : (prev[payload.userId]?.errors || 0),
            updatedAt: Date.now(),
          },
        }))
      })
      .on('broadcast', { event: 'finish' }, ({ payload }) => {
        if (!payload?.userId) return
        if (payload.userId === user?.id) return

        bufferedBroadcastProgressRef.current.delete(payload.userId)
        updateParticipant(payload.userId, {
          progress: 100,
          wpm: payload.wpm,
          finished_at: new Date().toISOString(),
        })

        if (isCurrentUserObserverRef.current) {
          setLiveTypingSnapshots((prev) => ({
            ...prev,
            [payload.userId]: {
              ...(prev[payload.userId] || {}),
              typedText: typeof payload.typedText === 'string' ? payload.typedText : (prev[payload.userId]?.typedText || ''),
              progress: 100,
              wpm: payload.wpm,
              accuracy: Number.isFinite(payload.accuracy) ? payload.accuracy : (prev[payload.userId]?.accuracy || 100),
              errors: Number.isFinite(payload.errors) ? payload.errors : (prev[payload.userId]?.errors || 0),
              updatedAt: Date.now(),
            },
          }))
        }
      })
      .on('broadcast', { event: 'new_race' }, ({ payload }) => {
        // Reset state for new race - get fresh currentRoom from store
        const { currentRoom: freshRoom } = useMultiplayerStore.getState()
        setRoom({ ...freshRoom, status: 'waiting', race_text: payload.text })
        setStatus('waiting')
        setFinished(false)
        setMyProgress(0)
        setMyWpm(0)
        setLiveTypingSnapshots({})
        toast.info('New race starting!')
      })
      .on('presence', { event: 'sync' }, () => {
        // Handle presence sync
      })
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          fetchParticipants()
        }
      })

    return () => {
      cancelled = true
      clearInterval(syncInterval)
      bufferedBroadcastProgressRef.current.clear()
      if (bufferedBroadcastProgressFlushTimerRef.current) {
        clearTimeout(bufferedBroadcastProgressFlushTimerRef.current)
        bufferedBroadcastProgressFlushTimerRef.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [currentRoom?.id, leaveRoom, user?.id])

  const resolveCurrentUserIdentity = useCallback(async (fallbackLabel = 'Player') => {
    let displayName = profile?.display_name
    let avatarUrl = profile?.avatar_url

    if (!displayName && user?.id) {
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (freshProfile) {
        displayName = freshProfile.display_name
        avatarUrl = freshProfile.avatar_url
        setProfile(freshProfile)
      }
    }

    if (!displayName) {
      displayName = user?.email?.split('@')[0] || fallbackLabel
    }

    return { displayName, avatarUrl }
  }, [profile?.avatar_url, profile?.display_name, user?.email, user?.id])

  const fetchRoomParticipantSnapshot = useCallback(async (roomId) => {
    const { data, error } = await supabase
      .from('multiplayer_participants')
      .select('id, user_id, is_observer')
      .eq('room_id', roomId)

    if (error) {
      const mightBeMissingObserverColumn =
        typeof error.message === 'string' &&
        error.message.toLowerCase().includes('is_observer')

      if (!mightBeMissingObserverColumn) {
        return { rows: [], error }
      }

      // Backward-compatible fallback when migration is not yet applied.
      const fallback = await supabase
        .from('multiplayer_participants')
        .select('id, user_id')
        .eq('room_id', roomId)

      return {
        rows: (fallback.data || []).map((row) => ({ ...row, is_observer: false })),
        error: fallback.error,
      }
    }

    return { rows: data || [], error: null }
  }, [])

  const syncRoomPlayerCount = useCallback(async (roomId, fallbackCount = 0) => {
    const { rows, error } = await fetchRoomParticipantSnapshot(roomId)
    if (error) return fallbackCount

    const playerCount = rows.filter((row) => !row.is_observer).length
    const { error: updateError } = await supabase
      .from('multiplayer_rooms')
      .update({ current_players: playerCount })
      .eq('id', roomId)

    if (updateError) {
      console.error('Error syncing room player count:', updateError)
    }

    return playerCount
  }, [fetchRoomParticipantSnapshot])

  const sendRoomBroadcast = useCallback(async (event, payload = {}) => {
    const roomId = currentRoom?.id
    if (!roomId) return false

    try {
      const activeChannel = channelRef.current
      if (!activeChannel) return false
      const targetChannel = activeChannel
      await targetChannel.send({
        type: 'broadcast',
        event,
        payload,
      })
      return true
    } catch (error) {
      console.error(`Failed to broadcast "${event}" in room ${roomId}:`, error)
      return false
    }
  }, [currentRoom?.id])

  const queueProgressDbSync = useCallback(async () => {
    if (progressDbSyncInFlightRef.current) return
    if (!pendingProgressDbSyncRef.current) return

    progressDbSyncInFlightRef.current = true
    try {
      while (pendingProgressDbSyncRef.current) {
        const nextPayload = pendingProgressDbSyncRef.current
        pendingProgressDbSyncRef.current = null

        const { roomId, userId, progress, wpm } = nextPayload
        if (finalProgressLockedRef.current && progress < 100) {
          continue
        }

        const { error } = await supabase
          .from('multiplayer_participants')
          .update({ progress, wpm })
          .eq('room_id', roomId)
          .eq('user_id', userId)

        if (error) {
          console.error('Failed to sync multiplayer progress:', error)
        }
      }
    } finally {
      progressDbSyncInFlightRef.current = false
    }
  }, [])

  const flushBufferedBroadcastProgress = useCallback(() => {
    bufferedBroadcastProgressFlushTimerRef.current = null
    const bufferedEntries = Array.from(bufferedBroadcastProgressRef.current.entries())
    if (bufferedEntries.length === 0) return

    bufferedBroadcastProgressRef.current.clear()
    const updatesByUser = new Map(bufferedEntries)
    const { participants: latestParticipants } = useMultiplayerStore.getState()

    let participantsChanged = false
    const nextParticipants = latestParticipants.map((participant) => {
      const update = updatesByUser.get(participant.user_id)
      if (!update) return participant

      const nextProgress = Number.isFinite(update.progress)
        ? update.progress
        : (participant.progress || 0)
      const nextWpm = Number.isFinite(update.wpm)
        ? update.wpm
        : (participant.wpm || 0)
      const isAlreadyFinished = !!participant.finished_at || (participant.progress || 0) >= 100

      if (isAlreadyFinished && nextProgress < 100) return participant
      if ((participant.progress || 0) === nextProgress && (participant.wpm || 0) === nextWpm) {
        return participant
      }

      participantsChanged = true
      return {
        ...participant,
        progress: nextProgress,
        wpm: nextWpm,
      }
    })

    if (participantsChanged) {
      setParticipants(nextParticipants)
    }

    if (!isCurrentUserObserverRef.current) return

    setLiveTypingSnapshots((prev) => {
      let changed = false
      const next = { ...prev }
      const updatedAt = Date.now()

      bufferedEntries.forEach(([userId, update]) => {
        const existing = next[userId] || {}
        const nextProgress = Number.isFinite(update.progress)
          ? update.progress
          : (existing.progress || 0)
        const nextWpm = Number.isFinite(update.wpm)
          ? update.wpm
          : (existing.wpm || 0)
        const isExistingFinished = (existing.progress || 0) >= 100

        if (isExistingFinished && nextProgress < 100) return
        if (existing.progress === nextProgress && existing.wpm === nextWpm) return

        changed = true
        next[userId] = {
          ...existing,
          progress: nextProgress,
          wpm: nextWpm,
          updatedAt,
        }
      })

      return changed ? next : prev
    })
  }, [setParticipants])

  const scheduleBufferedBroadcastProgressFlush = useCallback(() => {
    if (bufferedBroadcastProgressFlushTimerRef.current) return
    bufferedBroadcastProgressFlushTimerRef.current = setTimeout(
      flushBufferedBroadcastProgress,
      PROGRESS_BROADCAST_INTERVAL_MS
    )
  }, [flushBufferedBroadcastProgress])

  // Create a new room
  const handleCreateRoom = async () => {
    // Wait for auth to be ready
    if (authLoading) return
    
    if (!user?.id) {
      navigate('/login')
      return
    }

    setLoading(true)
    try {
      const code = generateRoomCode()
      const text = buildRaceFromSettings({
        mode: 'sentence',
        sentenceDifficulty: 'medium',
        timedDuration: 60,
        customText: '',
      })

      const { displayName, avatarUrl } = await resolveCurrentUserIdentity('Host')

      const { data: room, error } = await supabase
        .from('multiplayer_rooms')
        .insert({
          room_code: code,
          host_id: user.id,
          race_text: text,
          status: 'waiting',
          max_players: DEFAULT_ROOM_PLAYERS,
          max_observers: DEFAULT_ROOM_OBSERVERS,
          current_players: 1,
          room_name: roomName.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      // Add self as participant
      const { data: participant, error: participantError } = await supabase
        .from('multiplayer_participants')
        .insert({
          room_id: room.id,
          user_id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          is_observer: false,
          is_ready: true,
        })
        .select()
        .single()

      if (participantError) throw participantError

      // Set room and initial participant in store
      setRoom(room)
      setIsHost(true)
      setParticipants([participant])
      
      toast.success('Room created!')
    } catch (error) {
      console.error('Error creating room:', error)
      toast.error('Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  const syncRoomSettingsFromActiveRace = useCallback(() => {
    setRoomMode(activeRace.mode || 'sentence')
    setRoomSentenceDifficulty(activeRace.sentenceDifficulty || 'medium')
    setRoomTimedDuration(activeRace.timedDuration || 60)
    setRoomCustomText(activeRace.mode === 'custom' ? (activeRace.text || '') : '')
    setRoomName(currentRoom?.room_name || '')
    setRoomMaxPlayers(clampRoomSize(currentRoom?.max_players || DEFAULT_ROOM_PLAYERS))
    setRoomMaxObservers(clampObserverSize(currentRoom?.max_observers ?? DEFAULT_ROOM_OBSERVERS))
  }, [activeRace.mode, activeRace.sentenceDifficulty, activeRace.timedDuration, activeRace.text, currentRoom?.max_players, currentRoom?.max_observers, currentRoom?.room_name])

  const handleToggleRoomSettings = useCallback(() => {
    if (!isHost || status !== 'waiting') return
    if (!roomSettingsOpen) syncRoomSettingsFromActiveRace()
    setRoomSettingsOpen((prev) => !prev)
  }, [isHost, roomSettingsOpen, status, syncRoomSettingsFromActiveRace])

  const handleApplyRoomSettings = useCallback(async () => {
    if (!isHost || !currentRoom?.id || !user?.id || status !== 'waiting') return

    if (!canApplyRoomSettings) {
      if (roomMode === 'custom' && roomCustomTrimmedLength < 30) {
        toast.error('Custom mode needs at least 30 characters')
      } else if (!isRoomSizeValid) {
        toast.error(`Room size must be between ${MIN_ROOM_PLAYERS} and ${MAX_ROOM_PLAYERS}`)
      } else if (!isObserverSizeValid) {
        toast.error(`Observer size must be between ${MIN_ROOM_OBSERVERS} and ${MAX_OBSERVERS}`)
      } else if (roomMaxObservers < observerParticipants.length) {
        toast.error(`Observer size cannot be lower than current observers (${observerParticipants.length})`)
      } else if (roomMaxPlayers < playerParticipants.length) {
        toast.error(`Room size cannot be lower than current players (${playerParticipants.length})`)
      }
      return
    }

    setRoomSettingsSaving(true)
    try {
      const nextRaceText = buildRaceFromSettings({
        mode: roomMode,
        sentenceDifficulty: roomSentenceDifficulty,
        timedDuration: roomTimedDuration,
        customText: roomCustomText,
      })

      const { data: updatedRoom, error } = await supabase
        .from('multiplayer_rooms')
        .update({
          race_text: nextRaceText,
          room_name: roomName.trim() || null,
          max_players: clampRoomSize(roomMaxPlayers),
          max_observers: clampObserverSize(roomMaxObservers),
        })
        .eq('id', currentRoom.id)
        .eq('host_id', user.id)
        .eq('status', 'waiting')
        .select()
        .single()

      if (error) throw error

      if (updatedRoom) {
        setRoom(updatedRoom)
      } else {
        setRoom({
          ...currentRoom,
          race_text: nextRaceText,
          room_name: roomName.trim() || null,
          max_players: clampRoomSize(roomMaxPlayers),
          max_observers: clampObserverSize(roomMaxObservers),
        })
      }

      setRoomSettingsOpen(false)
      toast.success('Room settings updated')
    } catch (error) {
      console.error('Error updating room settings:', error)
      toast.error('Failed to update room settings')
    } finally {
      setRoomSettingsSaving(false)
    }
  }, [
    canApplyRoomSettings,
    currentRoom,
    isObserverSizeValid,
    isRoomSizeValid,
    isHost,
    observerParticipants.length,
    roomCustomText,
    roomMaxObservers,
    roomMaxPlayers,
    roomMode,
    roomName,
    roomSentenceDifficulty,
    roomTimedDuration,
    roomCustomTrimmedLength,
    playerParticipants.length,
    setRoom,
    status,
    user?.id,
  ])

  // Join a room
  const handleJoinRoom = async () => {
    // Wait for auth to be ready
    if (authLoading) return
    
    if (!user?.id) {
      navigate('/login')
      return
    }

    if (!joinCode.trim()) {
      toast.error('Enter a room code')
      return
    }

    setLoading(true)
    try {
      const { data: room, error: roomError } = await supabase
        .from('multiplayer_rooms')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .single()

      if (roomError || !room) {
        toast.error('Room not found')
        setLoading(false)
        return
      }

      if (room.status !== 'waiting') {
        toast.error('Race already started')
        setLoading(false)
        return
      }

      // Use live participant snapshot to validate player/observer capacity.
      const { rows: roomParticipantRows, error: participantSnapshotError } = await fetchRoomParticipantSnapshot(room.id)
      if (participantSnapshotError) {
        console.error('Error checking room capacity:', participantSnapshotError)
        toast.error('Failed to verify room capacity')
        setLoading(false)
        return
      }

      const currentPlayers = roomParticipantRows.filter((row) => !row.is_observer).length
      const currentObservers = roomParticipantRows.filter((row) => !!row.is_observer).length
      const existingParticipant = roomParticipantRows.find((row) => row.user_id === user.id) || null
      const roomPlayerLimit = clampRoomSize(room.max_players ?? DEFAULT_ROOM_PLAYERS)
      const roomObserverLimit = clampObserverSize(room.max_observers ?? DEFAULT_ROOM_OBSERVERS)

      if (!existingParticipant) {
        if (joinAsObserver) {
          if (currentObservers >= roomObserverLimit) {
            toast.error(`Observer slots full (${roomObserverLimit}/${roomObserverLimit})`)
            setLoading(false)
            return
          }
        } else if (currentPlayers >= roomPlayerLimit) {
          toast.error('Room is full')
          setLoading(false)
          return
        }

        const { displayName, avatarUrl } = await resolveCurrentUserIdentity('Player')

        // Add self as participant
        const { error: joinError } = await supabase.from('multiplayer_participants').insert({
          room_id: room.id,
          user_id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
          is_observer: joinAsObserver,
        })

        if (joinError) {
          console.error('Error joining:', joinError)
          toast.error('Failed to join room')
          setLoading(false)
          return
        }

        if (!joinAsObserver) {
          await syncRoomPlayerCount(room.id, currentPlayers + 1)
        }
      } else if (joinAsObserver !== !!existingParticipant.is_observer) {
        toast.error(
          existingParticipant.is_observer
            ? 'You already joined this room as an observer.'
            : 'You already joined this room as a player.'
        )
        setLoading(false)
        return
      }

      // Fetch all participants
      const { data: participantsData } = await supabase
        .from('multiplayer_participants')
        .select('*')
        .eq('room_id', room.id)

      // Set room and participants in store
      setRoom(room)
      setIsHost(false)
      setParticipants(participantsData || [])
      
      toast.success(joinAsObserver ? 'Joined room as observer!' : 'Joined room!')
    } catch (error) {
      console.error('Error joining room:', error)
      toast.error('Failed to join room')
    } finally {
      setLoading(false)
    }
  }

  const handleDeclineInvite = async (invite) => {
    if (!user?.id || !invite?.id) return

    setInviteActionLoading((prev) => ({ ...prev, [invite.id]: true }))
    try {
      const { error } = await supabase
        .from('multiplayer_invitations')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')

      if (error) {
        if (isInviteTableMissingError(error)) {
          toast.error('Invite system is not available yet. Please apply latest database migration.')
          return
        }
        throw error
      }

      toast.success('Challenge declined')
      await fetchInvites()
    } catch (error) {
      console.error('Error declining invite:', error)
      toast.error('Failed to decline invite')
    } finally {
      setInviteActionLoading((prev) => ({ ...prev, [invite.id]: false }))
    }
  }

  const handleAcceptInvite = async (invite) => {
    if (!user?.id || !invite?.id || !invite?.room_id) return

    setInviteActionLoading((prev) => ({ ...prev, [invite.id]: true }))
    try {
      const { data: room, error: roomError } = await supabase
        .from('multiplayer_rooms')
        .select('*')
        .eq('id', invite.room_id)
        .single()

      if (roomError || !room) {
        toast.error('This challenge room is no longer available')
        await handleDeclineInvite(invite)
        return
      }

      if (room.status !== 'waiting') {
        toast.error('Challenge already started')
        await handleDeclineInvite(invite)
        return
      }

      const { rows: roomParticipantRows, error: participantSnapshotError } = await fetchRoomParticipantSnapshot(room.id)
      if (participantSnapshotError) throw participantSnapshotError
      const currentPlayers = roomParticipantRows.filter((row) => !row.is_observer).length
      const roomPlayerLimit = clampRoomSize(room.max_players ?? DEFAULT_ROOM_PLAYERS)

      if (currentPlayers >= roomPlayerLimit) {
        toast.error('Challenge room is full')
        await handleDeclineInvite(invite)
        return
      }

      const existingParticipant = roomParticipantRows.find((row) => row.user_id === user.id) || null

      if (!existingParticipant) {
        const { displayName, avatarUrl } = await resolveCurrentUserIdentity('Player')
        const { error: joinError } = await supabase
          .from('multiplayer_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            display_name: displayName,
            avatar_url: avatarUrl,
            is_observer: false,
          })

        if (joinError) throw joinError

        await syncRoomPlayerCount(room.id, currentPlayers + 1)
      } else if (existingParticipant.is_observer) {
        toast.error('Leave observer mode and rejoin this challenge as a player.')
        await handleDeclineInvite(invite)
        return
      }

      const { error: inviteUpdateError } = await supabase
        .from('multiplayer_invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')

      if (inviteUpdateError) throw inviteUpdateError

      const { data: participantsData, error: participantFetchError } = await supabase
        .from('multiplayer_participants')
        .select('*')
        .eq('room_id', room.id)

      if (participantFetchError) throw participantFetchError

      setRoom(room)
      setIsHost(room.host_id === user.id)
      setParticipants(participantsData || [])
      toast.success('Challenge accepted. Joined multiplayer room.')
      await fetchInvites()
    } catch (error) {
      if (isInviteTableMissingError(error)) {
        toast.error('Invite system is not available yet. Please apply latest database migration.')
      } else {
        console.error('Error accepting invite:', error)
        toast.error('Failed to accept invite')
      }
    } finally {
      setInviteActionLoading((prev) => ({ ...prev, [invite.id]: false }))
    }
  }

  const handleKickParticipant = useCallback(async (participant) => {
    if (!isHost || !currentRoom?.id || !participant?.user_id) return
    if (participant.user_id === user?.id) {
      toast.error('Host cannot kick themselves')
      return
    }

    const actionKey = `kick:${participant.user_id}`
    setParticipantActionLoading((prev) => ({ ...prev, [actionKey]: true }))
    try {
      const { data: removedRows, error } = await supabase
        .from('multiplayer_participants')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', participant.user_id)
        .select('user_id')

      if (error) throw error
      if (!removedRows || removedRows.length === 0) {
        toast.error('Kick was blocked by database policy. Apply latest multiplayer migration.')
        return
      }

      const { participants: latestParticipants } = useMultiplayerStore.getState()
      setParticipants(latestParticipants.filter((p) => p.user_id !== participant.user_id))

      if (!participant.is_observer) {
        const fallbackCount = Math.max(0, playerParticipants.length - 1)
        await syncRoomPlayerCount(currentRoom.id, fallbackCount)
      }

      toast.success(`${participant.display_name || 'User'} removed from room`)
    } catch (error) {
      console.error('Error kicking participant:', error)
      toast.error('Failed to remove user')
    } finally {
      setParticipantActionLoading((prev) => ({ ...prev, [actionKey]: false }))
    }
  }, [
    currentRoom?.id,
    isHost,
    playerParticipants.length,
    setParticipants,
    syncRoomPlayerCount,
    user?.id,
  ])

  const handleSwitchParticipantRole = useCallback(async (participant, nextIsObserver) => {
    if (!isHost || !currentRoom?.id || !participant?.user_id) return

    const currentIsObserver = !!participant.is_observer
    if (currentIsObserver === nextIsObserver) return

    const roomPlayerLimit = clampRoomSize(currentRoom?.max_players || DEFAULT_ROOM_PLAYERS)
    const roomObserverLimit = clampObserverSize(currentRoom?.max_observers ?? DEFAULT_ROOM_OBSERVERS)

    if (!nextIsObserver && currentIsObserver && playerParticipants.length >= roomPlayerLimit) {
      toast.error(`Player slots full (${playerParticipants.length}/${roomPlayerLimit})`)
      return
    }

    if (nextIsObserver && !currentIsObserver && observerParticipants.length >= roomObserverLimit) {
      toast.error(`Observer slots full (${observerParticipants.length}/${roomObserverLimit})`)
      return
    }

    const actionKey = `switch:${participant.user_id}`
    setParticipantActionLoading((prev) => ({ ...prev, [actionKey]: true }))
    try {
      const { data: updatedRows, error } = await supabase
        .from('multiplayer_participants')
        .update({ is_observer: nextIsObserver })
        .eq('room_id', currentRoom.id)
        .eq('user_id', participant.user_id)
        .select('user_id, is_observer')

      if (error) throw error
      if (!updatedRows || updatedRows.length === 0) {
        toast.error('Role switch was blocked by database policy. Apply latest multiplayer migration.')
        return
      }

      const { participants: latestParticipants } = useMultiplayerStore.getState()
      setParticipants(
        latestParticipants.map((p) =>
          p.user_id === participant.user_id ? { ...p, is_observer: nextIsObserver } : p
        )
      )

      const nextPlayerCount = playerParticipants.length + (currentIsObserver ? 1 : -1)
      await syncRoomPlayerCount(currentRoom.id, Math.max(0, nextPlayerCount))

      toast.success(
        nextIsObserver
          ? `${participant.display_name || 'User'} moved to observers`
          : `${participant.display_name || 'User'} moved to players`
      )
    } catch (error) {
      console.error('Error switching participant role:', error)
      toast.error('Failed to switch role')
    } finally {
      setParticipantActionLoading((prev) => ({ ...prev, [actionKey]: false }))
    }
  }, [
    currentRoom?.id,
    currentRoom?.max_observers,
    currentRoom?.max_players,
    isHost,
    observerParticipants.length,
    playerParticipants.length,
    setParticipants,
    syncRoomPlayerCount,
  ])

  // Start the race (host only)
  const handleStartRace = async () => {
    if (!isHost || !currentRoom?.id) return
    if (isStartingRaceRef.current) return
    
    // Require at least 2 racers (observers excluded)
    if (playerParticipants.length < 2) {
      toast.error('Need at least 2 players to start the race')
      return
    }

    isStartingRaceRef.current = true
    try {
      setFinished(false)
      setMyProgress(0)
      setMyWpm(0)
      setCountdown(3)

      // Countdown
      setStatus('countdown')
      for (let i = 3; i > 0; i -= 1) {
        setCountdown(i)
        await sendRoomBroadcast('countdown', { count: i })
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      setCountdown(0)
      await sendRoomBroadcast('countdown', { count: 0 })
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Start race
      const startedAt = new Date().toISOString()
      const { error: startError } = await supabase
        .from('multiplayer_rooms')
        .update({ status: 'racing', started_at: startedAt, finished_at: null })
        .eq('id', currentRoom.id)
        .eq('host_id', user?.id)

      if (startError) throw startError

      setStatus('racing')
      await sendRoomBroadcast('start', { startedAt })
    } catch (error) {
      console.error('Error starting race:', error)
      toast.error('Failed to start race')
    } finally {
      isStartingRaceRef.current = false
    }
  }

  // Handle progress update - memoized to prevent infinite loops
  const handleProgress = useCallback((progress, wpm, meta = {}) => {
    if (!currentRoom?.id || !user?.id || isCurrentUserObserver) return
    if (finalProgressLockedRef.current) return

    setMyProgress(progress)
    setMyWpm(wpm)

    const now = Date.now()
    const lastProgressBroadcast = lastProgressBroadcastRef.current
    const shouldBroadcastProgress =
      progress >= 100 ||
      now - lastProgressBroadcast.at >= PROGRESS_BROADCAST_INTERVAL_MS ||
      Math.abs(progress - lastProgressBroadcast.progress) >= 1 ||
      Math.abs((wpm || 0) - (lastProgressBroadcast.wpm || 0)) >= 2

    if (shouldBroadcastProgress) {
      lastProgressBroadcastRef.current = { at: now, progress, wpm: wpm || 0 }
      // Fire-and-forget to keep typing path responsive.
      sendRoomBroadcast('progress', {
        userId: user.id,
        progress,
        wpm,
      })
    }

    const lastDbSync = lastProgressDbSyncRef.current
    const shouldSyncDb =
      progress >= 100 ||
      now - lastDbSync.at >= PROGRESS_DB_SYNC_INTERVAL_MS ||
      Math.abs(progress - lastDbSync.progress) >= 2

    if (shouldSyncDb) {
      lastProgressDbSyncRef.current = { at: now, progress, wpm: wpm || 0 }
      pendingProgressDbSyncRef.current = {
        roomId: currentRoom.id,
        userId: user.id,
        progress,
        wpm,
      }
      queueProgressDbSync()
    }

    const typedText = typeof meta?.typedText === 'string'
      ? meta.typedText.slice(0, activeRaceText.length)
      : ''
    const lastSnapshot = lastTypingSnapshotSentRef.current
    const shouldPublishSnapshot =
      observerParticipants.length > 0 &&
      typedText !== lastSnapshot.text &&
      (
        now - lastSnapshot.at >= TYPING_SNAPSHOT_INTERVAL_MS ||
        progress >= 100 ||
        typedText.length === activeRaceText.length
      )

    if (shouldPublishSnapshot) {
      lastTypingSnapshotSentRef.current = { at: now, text: typedText }
      sendRoomBroadcast('typing_snapshot', {
        userId: user.id,
        typedText,
        progress,
        wpm,
        accuracy: Number.isFinite(meta?.accuracy) ? meta.accuracy : 100,
        errors: Number.isFinite(meta?.errors) ? meta.errors : 0,
      })
    }
  }, [
    activeRaceText.length,
    currentRoom?.id,
    isCurrentUserObserver,
    observerParticipants.length,
    queueProgressDbSync,
    sendRoomBroadcast,
    user?.id,
  ])

  // Handle typing complete - memoized to prevent re-renders
  const handleComplete = useCallback(async (resultData) => {
    if (!currentRoom?.id || !user?.id || isCurrentUserObserver) return

    finalProgressLockedRef.current = true
    setFinished(true)

    const raceSubMode =
      activeRace.mode === 'timed'
        ? `timed_${activeRace.timedDuration}s`
        : activeRace.mode === 'custom'
          ? 'custom'
          : `sentence_${activeRace.sentenceDifficulty}`
    const historySubMode = currentRoom?.room_code
      ? `${currentRoom.room_code}:${raceSubMode}`
      : raceSubMode

    // Update participant record
    await supabase
      .from('multiplayer_participants')
      .update({
        progress: 100,
        wpm: resultData.wpm,
        accuracy: resultData.acc,
        errors: resultData.mistakes,
        finished_at: new Date().toISOString(),
      })
      .eq('room_id', currentRoom.id)
      .eq('user_id', user.id)

    lastProgressDbSyncRef.current = { at: Date.now(), progress: 100, wpm: resultData.wpm || 0 }
    pendingProgressDbSyncRef.current = {
      roomId: currentRoom.id,
      userId: user.id,
      progress: 100,
      wpm: resultData.wpm || 0,
    }
    queueProgressDbSync()

    // Broadcast finish
    await sendRoomBroadcast('finish', {
      userId: user.id,
      wpm: resultData.wpm,
      typedText: (resultData.input || '').slice(0, activeRaceText.length),
      accuracy: resultData.acc,
      errors: resultData.mistakes || 0,
    })
    setLiveTypingSnapshots((prev) => ({
      ...prev,
      [user.id]: {
        ...(prev[user.id] || {}),
        typedText: (resultData.input || '').slice(0, activeRaceText.length),
        progress: 100,
        wpm: resultData.wpm || 0,
        accuracy: resultData.acc || 100,
        errors: resultData.mistakes || 0,
        updatedAt: Date.now(),
      },
    }))

    // Save to typing history
    const { error: historyError } = await supabase.from('typing_history').insert({
      user_id: user.id,
      mode: 'multiplayer',
      sub_mode: historySubMode,
      original_text: activeRaceText,
      typed_text: resultData.input || '',
      wpm: Math.round(resultData.wpm || 0),
      raw_wpm: Math.round(resultData.rawWpm || resultData.wpm || 0),
      accuracy: parseFloat((resultData.acc || 100).toFixed(2)),
      errors: resultData.mistakes || 0,
      correct_chars: resultData.correctChars || 0,
      total_chars: resultData.totalChars || 0,
      duration_seconds: parseFloat((resultData.durationSec || 0).toFixed(2)),
      mistake_indices: resultData.mistakenIndices || [],
      corrections: resultData.corrections || 0,
      is_completed: true,
    })
    if (historyError) {
      console.error('Failed to save multiplayer typing history:', historyError)
    } else {
      syncUserAchievements({ userId: user.id })
        .then((unlockRes) => {
          if (unlockRes?.error) {
            console.error('Failed to sync achievements:', unlockRes.error)
          }
        })
        .catch((unlockError) => {
          console.error('Failed to sync achievements:', unlockError)
        })
    }
  }, [
    activeRace.mode,
    activeRace.sentenceDifficulty,
    activeRace.timedDuration,
    activeRaceText,
    currentRoom?.id,
    currentRoom?.room_code,
    isCurrentUserObserver,
    queueProgressDbSync,
    sendRoomBroadcast,
    user?.id,
  ])

  // Copy room code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  // Leave room
  const handleLeaveRoom = async () => {
    if (!currentRoom?.id || !user?.id) {
      leaveRoom()
      return
    }

    isLeavingRoomRef.current = true
    try {
      const { error: participantDeleteError } = await supabase
        .from('multiplayer_participants')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id)

      if (participantDeleteError) throw participantDeleteError

      if (isHost) {
        // Cancel outstanding invites for this room before deleting it.
        const { error: inviteCancelError } = await supabase
          .from('multiplayer_invitations')
          .update({
            status: 'declined',
            responded_at: new Date().toISOString(),
          })
          .eq('room_id', currentRoom.id)
          .eq('sender_id', user.id)
          .eq('status', 'pending')

        if (inviteCancelError && !isInviteTableMissingError(inviteCancelError)) {
          console.error('Error cancelling pending invites on room close:', inviteCancelError)
        }

        // Delete room if host leaves
        const { error: roomDeleteError } = await supabase
          .from('multiplayer_rooms')
          .delete()
          .eq('id', currentRoom.id)

        if (roomDeleteError) throw roomDeleteError
      } else {
        // Keep current_players in sync so rooms don't get stuck as "full"
        await syncRoomPlayerCount(currentRoom.id, 0)
      }
    } catch (error) {
      console.error('Error leaving room:', error)
    } finally {
      leaveRoom()
      isLeavingRoomRef.current = false
    }
  }

  const getLeaderboardFileBaseName = useCallback(() => {
    const safeRoomCode = (currentRoom?.room_code || 'room').toLowerCase()
    return `keydash-multiplayer-${safeRoomCode}-leaderboard`
  }, [currentRoom?.room_code])

  const captureLeaderboardImage = useCallback(async () => {
    if (!leaderboardExportRef.current) {
      toast.error('Leaderboard preview is not ready yet')
      return null
    }

    const pixelRatio =
      typeof window !== 'undefined'
        ? Math.min(4, Math.max(2, window.devicePixelRatio || 2))
        : 2

    try {
      return await toPng(leaderboardExportRef.current, {
        cacheBust: true,
        pixelRatio,
        backgroundColor: '#0b1220',
      })
    } catch (error) {
      console.error('Failed to generate leaderboard image:', error)
      toast.error('Could not generate leaderboard image')
      return null
    }
  }, [])

  const handleDownloadLeaderboardImage = useCallback(async () => {
    if (!isCurrentUserObserver || status !== 'finished') return

    setIsDownloadingLeaderboardImage(true)
    try {
      const dataUrl = await captureLeaderboardImage()
      if (!dataUrl) return

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${getLeaderboardFileBaseName()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Leaderboard image downloaded')
    } finally {
      setIsDownloadingLeaderboardImage(false)
    }
  }, [captureLeaderboardImage, getLeaderboardFileBaseName, isCurrentUserObserver, status])

  const handleDownloadLeaderboardPdf = useCallback(async () => {
    if (!isCurrentUserObserver || status !== 'finished') return

    setIsDownloadingLeaderboardPdf(true)
    try {
      const dataUrl = await captureLeaderboardImage()
      if (!dataUrl) return

      const image = new Image()
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        image.src = dataUrl
      })

      const pdf = new jsPDF({
        orientation: image.width >= image.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 8
      const widthRatio = (pageWidth - margin * 2) / image.width
      const heightRatio = (pageHeight - margin * 2) / image.height
      const renderRatio = Math.min(widthRatio, heightRatio)
      const renderWidth = image.width * renderRatio
      const renderHeight = image.height * renderRatio
      const x = (pageWidth - renderWidth) / 2
      const y = (pageHeight - renderHeight) / 2

      pdf.addImage(dataUrl, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST')
      pdf.save(`${getLeaderboardFileBaseName()}.pdf`)
      toast.success('Leaderboard PDF downloaded')
    } catch (error) {
      console.error('Failed to generate leaderboard PDF:', error)
      toast.error('Could not generate leaderboard PDF')
    } finally {
      setIsDownloadingLeaderboardPdf(false)
    }
  }, [captureLeaderboardImage, getLeaderboardFileBaseName, isCurrentUserObserver, status])

  // Not in a room - show lobby
  if (!currentRoom) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <Toaster position="top-center" />

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400/20 rounded-2xl mb-4">
            <Users className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Multiplayer Race</h1>
          <p className="text-gray-400">Race against friends in real-time</p>
        </div>

        <div className="space-y-6">
          {/* Incoming Invites */}
          {incomingInvites.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1f2e] rounded-2xl p-6 border border-yellow-500/30"
            >
              <h2 className="text-xl font-semibold mb-4 text-yellow-300">Challenge Invites</h2>
              <div className="space-y-3">
                {incomingInvites.map((invite) => {
                  const senderName = invite.senderProfile?.display_name || 'Player'
                  const roomCodeLabel = invite.room?.room_code || '------'
                  const actionBusy = !!inviteActionLoading[invite.id]

                  return (
                    <div key={invite.id} className="p-4 bg-[#252b3b] rounded-xl border border-gray-700/60">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-white font-medium">{senderName} challenged you</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Room: <span className="font-mono tracking-wider">{roomCodeLabel}</span> ·{' '}
                            {invite.created_at
                              ? formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })
                              : 'recently'}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => handleDeclineInvite(invite)}
                            disabled={actionBusy}
                            className="flex-1 sm:flex-none px-3 py-1.5 bg-gray-700 text-gray-200 rounded-lg text-sm hover:bg-gray-600 transition disabled:opacity-50"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptInvite(invite)}
                            disabled={actionBusy}
                            className="flex-1 sm:flex-none px-3 py-1.5 bg-yellow-400 text-black rounded-lg text-sm font-semibold hover:bg-yellow-300 transition disabled:opacity-50"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Create Room */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50"
          >
            <h2 className="text-xl font-semibold mb-4">Create a Room</h2>
            <p className="text-gray-400 mb-4">
              Start a new race, then configure mode from the room settings icon
            </p>

            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-300 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Create Room
                </>
              )}
            </button>
          </motion.div>

          {/* Join Room */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50"
          >
            <h2 className="text-xl font-semibold mb-4">Join a Room</h2>
            <p className="text-gray-400 mb-4">
              Enter a room code to join an existing race
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setJoinAsObserver(false)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                  !joinAsObserver
                    ? 'border-yellow-400/70 bg-yellow-400/10 text-yellow-300'
                    : 'border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                Join as Player
              </button>
              <button
                onClick={() => setJoinAsObserver(true)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                  joinAsObserver
                    ? 'border-yellow-400/70 bg-yellow-400/10 text-yellow-300'
                    : 'border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                Join as Observer
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Players race in the match. Host can configure observer slots (up to {MAX_OBSERVERS}).
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter code..."
                maxLength={6}
                className="flex-1 px-4 py-3 bg-[#252b3b] border border-gray-700 rounded-xl
                         text-white text-center text-xl tracking-widest font-mono uppercase
                         placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
              />
              <button
                onClick={handleJoinRoom}
                disabled={loading || !joinCode.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // In a room - show waiting/racing/results
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <button
          onClick={handleLeaveRoom}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors self-start"
        >
          <ArrowLeft className="w-5 h-5" />
          Leave Room
        </button>

        {/* Room Code */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <span className="text-gray-400 text-sm sm:text-base">Room Code:</span>
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#252b3b] rounded-lg font-mono text-base sm:text-xl tracking-[0.2em] sm:tracking-widest"
          >
            {roomCode}
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {status === 'countdown' && countdown >= 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={`text-7xl sm:text-9xl font-bold ${countdown === 0 ? 'text-green-400' : 'text-yellow-400'}`}
            >
              {countdown === 0 ? 'GO!' : countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting State */}
      {status === 'waiting' && (
        <div className="space-y-6">
          <div className="bg-[#1a1f2e] rounded-2xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-400">Race Mode</span>
                <div className="font-semibold text-yellow-300">{raceModeLabel}</div>
              </div>
              {isHost && (
                <button
                  onClick={handleToggleRoomSettings}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-[#252b3b] text-gray-200 hover:border-gray-600 transition"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              )}
            </div>

            {isHost && roomSettingsOpen && (
              <div className="mt-4 pt-4 border-t border-gray-700/70 space-y-4">
                {/* Room Name Input */}
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter a room name (optional)"
                    maxLength={50}
                    className="w-full px-3 py-2 bg-[#252b3b] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    This name will be visible to other players joining the room
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'sentence', label: 'Sentence' },
                    { key: 'timed', label: 'Timed' },
                    { key: 'custom', label: 'Custom' },
                  ].map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setRoomMode(option.key)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                        roomMode === option.key
                          ? 'border-yellow-400/70 bg-yellow-400/10 text-yellow-300'
                          : 'border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {roomMode === 'sentence' && (
                  <div className="flex flex-wrap gap-2">
                    {sentenceOptions.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => setRoomSentenceDifficulty(option.key)}
                        className={`px-3 py-1.5 rounded-full border text-sm transition ${
                          roomSentenceDifficulty === option.key
                            ? 'border-yellow-400/70 bg-yellow-400/10 text-yellow-300'
                            : 'border-gray-700 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}

                {roomMode === 'timed' && (
                  <div className="flex flex-wrap gap-2">
                    {timedOptions.map((duration) => (
                      <button
                        key={duration}
                        onClick={() => setRoomTimedDuration(duration)}
                        className={`px-3 py-1.5 rounded-full border text-sm transition ${
                          roomTimedDuration === duration
                            ? 'border-yellow-400/70 bg-yellow-400/10 text-yellow-300'
                            : 'border-gray-700 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        {duration}s
                      </button>
                    ))}
                  </div>
                )}

                {roomMode === 'custom' && (
                  <div>
                    <textarea
                      value={roomCustomText}
                      onChange={(e) => setRoomCustomText(e.target.value)}
                      placeholder="Paste or type custom race text..."
                      className="w-full min-h-[110px] p-3 bg-[#252b3b] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
                    />
                    <p className={`mt-2 text-xs ${roomCustomTrimmedLength >= 30 ? 'text-green-400' : 'text-gray-500'}`}>
                      {roomCustomTrimmedLength}/30 minimum characters
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <span className="text-sm text-gray-300">Room Size</span>
                    <span className="text-sm font-semibold text-yellow-300">
                      {roomMaxPlayers} players
                    </span>
                  </div>
                  <input
                    type="range"
                    min={MIN_ROOM_PLAYERS}
                    max={MAX_ROOM_PLAYERS}
                    step={1}
                    value={roomMaxPlayers}
                    onChange={(e) => setRoomMaxPlayers(clampRoomSize(Number(e.target.value)))}
                    className="w-full accent-yellow-400"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={MIN_ROOM_PLAYERS}
                      max={MAX_ROOM_PLAYERS}
                      value={roomMaxPlayers}
                      onChange={(e) => setRoomMaxPlayers(clampRoomSize(Number(e.target.value)))}
                      className="w-24 px-2 py-1 rounded-lg bg-[#252b3b] border border-gray-700 text-white focus:outline-none focus:border-yellow-400/50"
                    />
                    <p className="text-xs text-gray-400">
                      Min {MIN_ROOM_PLAYERS}, max {MAX_ROOM_PLAYERS}. Cannot be lower than current players ({playerParticipants.length}).
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <span className="text-sm text-gray-300">Observer Slots</span>
                    <span className="text-sm font-semibold text-blue-300">
                      {roomMaxObservers} observers
                    </span>
                  </div>
                  <input
                    type="range"
                    min={MIN_ROOM_OBSERVERS}
                    max={MAX_OBSERVERS}
                    step={1}
                    value={roomMaxObservers}
                    onChange={(e) => setRoomMaxObservers(clampObserverSize(Number(e.target.value)))}
                    className="w-full accent-blue-300"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={MIN_ROOM_OBSERVERS}
                      max={MAX_OBSERVERS}
                      value={roomMaxObservers}
                      onChange={(e) => setRoomMaxObservers(clampObserverSize(Number(e.target.value)))}
                      className="w-24 px-2 py-1 rounded-lg bg-[#252b3b] border border-gray-700 text-white focus:outline-none focus:border-blue-300/70"
                    />
                    <p className="text-xs text-gray-400">
                      Min {MIN_ROOM_OBSERVERS}, max {MAX_OBSERVERS}. Cannot be lower than current observers ({observerParticipants.length}).
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleApplyRoomSettings}
                    disabled={roomSettingsSaving || !canApplyRoomSettings}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {roomSettingsSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Settings className="w-4 h-4" />
                    )}
                    Apply Setup
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-400" />
              Players ({playerParticipants.length}/{currentRoom?.max_players || DEFAULT_ROOM_PLAYERS})
            </h2>

            <div className="space-y-3">
              {playerParticipants.map((p) => {
                const switchActionKey = `switch:${p.user_id}`
                const kickActionKey = `kick:${p.user_id}`
                const switchBusy = !!participantActionLoading[switchActionKey]
                const kickBusy = !!participantActionLoading[kickActionKey]
                const isParticipantHost = p.user_id === currentRoom.host_id
                const canKick = !isParticipantHost

                return (
                <div
                  key={p.user_id}
                  className="flex flex-wrap items-center gap-3 p-3 bg-[#252b3b] rounded-xl"
                >
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url?.trim()}
                      alt={p.display_name || ''}
                      className="w-10 h-10 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-9 1.67-9 5v1h18v-1c0-3.33-5.69-5-9-5z'/></svg>")}`
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{p.display_name || 'Player'}</span>
                      {p.user_id === currentRoom.host_id && (
                        <Crown className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  </div>
                  {isParticipantHost ? (
                    <span className="px-2 py-1 bg-yellow-400/15 text-yellow-300 rounded text-sm font-semibold">
                      Host
                    </span>
                  ) : (
                    p.is_ready && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                        Ready
                      </span>
                    )
                  )}

                  {isHost && (
                    <div className="flex flex-wrap gap-2 ml-auto">
                      <button
                        onClick={() => handleSwitchParticipantRole(p, true)}
                        disabled={switchBusy || kickBusy}
                        className="px-2.5 py-1 rounded-lg border border-blue-400/40 bg-blue-500/10 text-blue-300 text-xs hover:bg-blue-500/20 transition disabled:opacity-50"
                      >
                        {switchBusy ? 'Switching...' : 'Move to Observer'}
                      </button>
                      {canKick && (
                        <button
                          onClick={() => handleKickParticipant(p)}
                          disabled={switchBusy || kickBusy}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-400/40 bg-red-500/10 text-red-300 text-xs hover:bg-red-500/20 transition disabled:opacity-50"
                        >
                          {kickBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                          Kick
                        </button>
                      )}
                    </div>
                  )}
                </div>
                )
              })}
              {playerParticipants.length === 0 && (
                <p className="text-sm text-gray-400">No players joined yet.</p>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-gray-700/60">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-100">
                <Eye className="w-5 h-5 text-blue-300" />
                Observers ({observerParticipants.length}/{currentRoomObserverLimit})
              </h3>
              <div className="space-y-3">
                {observerParticipants.map((p) => {
                  const switchActionKey = `switch:${p.user_id}`
                  const kickActionKey = `kick:${p.user_id}`
                  const switchBusy = !!participantActionLoading[switchActionKey]
                  const kickBusy = !!participantActionLoading[kickActionKey]
                  const isParticipantHost = p.user_id === currentRoom.host_id
                  const canKick = !isParticipantHost

                  return (
                  <div
                    key={p.user_id}
                    className="flex flex-wrap items-center gap-3 p-3 bg-[#252b3b] rounded-xl border border-blue-400/20"
                  >
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url?.trim()}
                        alt={p.display_name || ''}
                        className="w-10 h-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-9 1.67-9 5v1h18v-1c0-3.33-5.69-5-9-5z'/></svg>")}`
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{p.display_name || 'Observer'}</span>
                        {isParticipantHost && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                    </div>
                    {isParticipantHost && (
                      <span className="px-2 py-1 bg-yellow-400/15 text-yellow-300 rounded text-sm font-semibold">
                        Host
                      </span>
                    )}

                    {isHost && (
                      <div className="flex flex-wrap gap-2 ml-auto">
                        <button
                          onClick={() => handleSwitchParticipantRole(p, false)}
                          disabled={switchBusy || kickBusy}
                          className="px-2.5 py-1 rounded-lg border border-yellow-400/40 bg-yellow-500/10 text-yellow-300 text-xs hover:bg-yellow-500/20 transition disabled:opacity-50"
                        >
                          {switchBusy ? 'Switching...' : 'Move to Player'}
                        </button>
                        {canKick && (
                          <button
                            onClick={() => handleKickParticipant(p)}
                            disabled={switchBusy || kickBusy}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-400/40 bg-red-500/10 text-red-300 text-xs hover:bg-red-500/20 transition disabled:opacity-50"
                          >
                            {kickBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                            Kick
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  )
                })}
                {observerParticipants.length === 0 && (
                  <p className="text-sm text-gray-400">No observers joined.</p>
                )}
              </div>
            </div>
          </div>

          {/* Start Button (Host only) */}
          {isHost && (
            <motion.button
              whileHover={{ scale: playerParticipants.length >= 2 ? 1.02 : 1 }}
              whileTap={{ scale: playerParticipants.length >= 2 ? 0.98 : 1 }}
              onClick={handleStartRace}
              disabled={playerParticipants.length < 2}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-yellow-400 text-black rounded-xl font-bold text-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-6 h-6" />
              {playerParticipants.length < 2 ? 'Waiting for players...' : 'Start Race'}
            </motion.button>
          )}

          {!isHost && (
            <div className="text-center text-gray-400">
              {isCurrentUserObserver
                ? 'You are observing this room. Waiting for host to start the race...'
                : 'Waiting for host to start the race...'}
            </div>
          )}

        </div>
      )}

      {/* Racing State */}
      {status === 'racing' && (
        <div className="space-y-6">
          {/* Progress Bars */}
          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Race Progress {isCurrentUserObserver ? '' : '(Top 5)'}
              </h2>
              <span className="text-sm text-gray-400">{raceModeLabel}</span>
            </div>
            {!isCurrentUserObserver && hiddenRaceTrackerCount > 0 && (
              <p className="text-xs text-gray-500 mb-3">
                Showing top 5 racers. {hiddenRaceTrackerCount} more player
                {hiddenRaceTrackerCount > 1 ? 's are' : ' is'} hidden.
              </p>
            )}
            <div className="space-y-4">
              {raceTrackerParticipants.map((p, idx) => (
                  <div key={p.user_id} className="space-y-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {idx === 0 && <Trophy className="w-4 h-4 text-yellow-400" />}
                        <span className={`truncate ${p.user_id === user?.id ? 'text-yellow-400' : ''}`}>
                          {p.display_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto text-xs sm:text-sm">
                        <span className="text-yellow-400">{p.wpm || 0} WPM</span>
                        <span className="text-gray-400">{p.progress || 0}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${p.user_id === user?.id ? 'bg-yellow-400' : 'bg-blue-400'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${p.progress || 0}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Typing Area */}
          {isCurrentUserObserver && (
            <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-blue-400/30">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-gray-200 font-semibold flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-300" />
                    Observer Spectate
                  </p>
                  <p className="text-sm text-gray-400">Select any racer to view their live typing screen.</p>
                </div>
                {spectatedPlayer && (
                  <div className="text-sm text-right">
                    <div className="text-blue-300 font-semibold truncate max-w-[180px]">
                      {spectatedPlayer.display_name || 'Player'}
                    </div>
                    <div className="text-gray-400">
                      {Math.round(spectatedLiveWpm)} WPM · {Math.min(100, Math.max(0, Math.round(spectatedLiveProgress)))}%
                    </div>
                  </div>
                )}
              </div>

              {sortedRacePlayers.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {sortedRacePlayers.map((p) => (
                      <button
                        key={`spectate-${p.user_id}`}
                        onClick={() => setSpectateUserId(p.user_id)}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                          spectatedPlayer?.user_id === p.user_id
                            ? 'border-blue-300/70 bg-blue-500/20 text-blue-200'
                            : 'border-gray-700 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        {p.display_name || 'Player'}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl border border-gray-700/70 bg-[#0d111d]">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">
                      Live Typing Screen
                    </p>
                    {activeRaceText ? (
                      <div className="font-mono text-base sm:text-lg leading-7 whitespace-pre-wrap break-words max-h-[360px] overflow-y-auto">
                        {spectatedRenderedChars}
                        {spectatedCaretIndex >= activeRaceText.length && !finished && (
                          <span className="inline-block align-middle h-6 w-0.5 bg-blue-300 animate-pulse ml-0.5" />
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400">Waiting for race text...</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-400">No racers available to spectate yet.</div>
              )}
            </div>
          )}

          {!isCurrentUserObserver && !finished && activeRaceText && (
            <TypingEngine
              text={activeRaceText}
              mode={isTimedRace ? 'timed' : 'multiplayer'}
              subMode={isTimedRace ? `${activeRace.timedDuration}s` : activeRace.mode}
              timeLimit={isTimedRace ? activeRace.timedDuration : null}
              startImmediately={isTimedRace}
              historyModeOverride="multiplayer"
              onProgress={handleProgress}
              onComplete={handleComplete}
              showLiveStats={false}
              showRestartButton={false}
            />
          )}

          {!isCurrentUserObserver && !finished && !activeRaceText && (
            <div className="text-center py-10 bg-[#1a1f2e] rounded-2xl border border-gray-700/50">
              <Loader2 className="w-10 h-10 text-yellow-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-400">Loading race text...</p>
            </div>
          )}

          {!isCurrentUserObserver && finished && (
            <div className="text-center py-10 bg-[#1a1f2e] rounded-2xl border border-gray-700/50">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Finished!</h2>
              <p className="text-gray-400">
                Your WPM: <span className="text-yellow-400 font-bold">{myWpm}</span>
              </p>
              <p className="text-gray-400 mt-2">Waiting for other players...</p>
            </div>
          )}
        </div>
      )}

      {/* Finished State */}
      {status === 'finished' && (
        <div className="space-y-6">
          <div className="bg-[#1a1f2e] rounded-2xl p-6 border border-gray-700/50">
            <h2 className="text-2xl font-bold mb-6 text-center">🏁 Race Results</h2>
            
            <div className="space-y-3">
              {sortedResultPlayers.map((p, idx) => (
                  <div
                    key={p.user_id}
                    className={`flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 p-4 rounded-xl ${
                      idx === 0 ? 'bg-yellow-400/10 border border-yellow-400/30' : 'bg-[#252b3b]'
                    }`}
                  >
                    <div className="text-2xl font-bold w-8 shrink-0">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                    </div>
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url?.trim()}
                        alt={p.display_name || ''}
                        className="w-12 h-12 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.31 0-9 1.67-9 5v1h18v-1c0-3.33-5.69-5-9-5z'/></svg>")}`
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-600 rounded-full" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{p.display_name}</div>
                      <div className="text-sm text-gray-400">
                        {(Number(p.accuracy || 0)).toFixed(1)}% accuracy
                      </div>
                    </div>
                    <div className="text-right w-full sm:w-auto">
                      <div className="text-2xl font-bold text-yellow-400">{p.wpm || 0}</div>
                      <div className="text-sm text-gray-400">WPM</div>
                    </div>
                  </div>
                ))}
            </div>

            {isCurrentUserObserver && (
              <div className="mt-6 pt-4 border-t border-gray-700/70">
                <p className="text-sm text-gray-300 mb-3">
                  Observer tools: download final leaderboard of all racers.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleDownloadLeaderboardImage}
                    disabled={isDownloadingLeaderboardImage || isDownloadingLeaderboardPdf || sortedResultPlayers.length === 0}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/40 hover:bg-blue-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDownloadingLeaderboardImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download Image
                  </button>
                  <button
                    onClick={handleDownloadLeaderboardPdf}
                    disabled={isDownloadingLeaderboardPdf || isDownloadingLeaderboardImage || sortedResultPlayers.length === 0}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-300 border border-green-400/40 hover:bg-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDownloadingLeaderboardPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download PDF
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleLeaveRoom}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
            >
              Leave
            </button>
          </div>
        </div>
      )}

      {/* Off-screen export snapshot to avoid CORS issues from avatar images */}
      <div className="fixed -left-[10000px] top-0 pointer-events-none opacity-0" aria-hidden="true">
        <div
          ref={leaderboardExportRef}
          className="w-[860px] bg-[#0b1220] text-white p-8 rounded-xl border border-gray-700"
        >
          <h3 className="text-2xl font-bold mb-2">KeyDash Multiplayer Leaderboard</h3>
          <p className="text-sm text-gray-300 mb-1">
            Room: <span className="font-mono tracking-widest">{roomCode || '------'}</span>
          </p>
          <p className="text-sm text-gray-300 mb-1">Mode: {raceModeLabel}</p>
          <p className="text-sm text-gray-300 mb-6">
            Exported: {new Date().toLocaleString()}
          </p>

          <div className="space-y-2">
            {sortedResultPlayers.map((p, idx) => (
              <div
                key={`export-${p.user_id}`}
                className={`grid grid-cols-[70px_1fr_100px_120px] items-center gap-4 px-4 py-2 rounded-lg ${
                  idx === 0 ? 'bg-yellow-400/20 border border-yellow-400/40' : 'bg-[#1a2333]'
                }`}
              >
                <div className="font-bold text-lg">#{idx + 1}</div>
                <div className="truncate">{p.display_name || 'Player'}</div>
                <div className="text-right text-yellow-300 font-semibold">{p.wpm || 0} WPM</div>
                <div className="text-right text-gray-300">{(Number(p.accuracy || 0)).toFixed(1)}% acc</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MultiplayerLobby
