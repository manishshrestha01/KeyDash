import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Copy, Check, Play, Crown, Loader2, 
  ArrowLeft, Trophy, Settings
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useMultiplayerStore } from '../../store'
import toast, { Toaster } from 'react-hot-toast'
import TypingEngine from '../typing/TypingEngine'
import { formatDistanceToNow } from 'date-fns'
import { buildRaceFromSettings, decodeRaceText, generateRoomCode } from './multiplayerUtils'

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

  const channelRef = useRef(null)
  const inviteChannelRef = useRef(null)
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
  const canApplyRoomSettings = roomMode !== 'custom' || roomCustomTrimmedLength >= 30

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
    }
  }, [status])

  useEffect(() => {
    setRoomMode(activeRace.mode || 'sentence')
    setRoomSentenceDifficulty(activeRace.sentenceDifficulty || 'medium')
    setRoomTimedDuration(activeRace.timedDuration || 60)
    setRoomCustomText(activeRace.mode === 'custom' ? (activeRace.text || '') : '')
  }, [activeRace.mode, activeRace.sentenceDifficulty, activeRace.timedDuration, activeRace.text])

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
    if (status === 'racing' && participants.length > 0) {
      const allFinished = participants.every(p => p.progress >= 100 || p.finished_at)
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
  }, [participants, status, isHost, currentRoom?.id])

  // Subscribe to room changes
  useEffect(() => {
    if (!currentRoom?.id) return

    const roomId = currentRoom.id
    let cancelled = false

    // Keep participants in sync even if a realtime event is missed.
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('multiplayer_participants')
        .select('*')
        .eq('room_id', roomId)
      if (!cancelled && data) setParticipants(data)
    }
    fetchParticipants()
    const syncInterval = setInterval(fetchParticipants, 3000)

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
      }, async () => {
        await fetchParticipants()
      })
      .on('broadcast', { event: 'countdown' }, ({ payload }) => {
        setFinished(false)
        setMyProgress(0)
        setMyWpm(0)
        setStatus('countdown')
        setCountdown(payload.count)
      })
      .on('broadcast', { event: 'start' }, () => {
        setFinished(false)
        setMyProgress(0)
        setMyWpm(0)
        setStatus('racing')
      })
      .on('broadcast', { event: 'progress' }, ({ payload }) => {
        updateParticipant(payload.userId, {
          progress: payload.progress,
          wpm: payload.wpm,
        })
      })
      .on('broadcast', { event: 'finish' }, ({ payload }) => {
        updateParticipant(payload.userId, {
          progress: 100,
          wpm: payload.wpm,
          finished_at: new Date().toISOString(),
        })
      })
      .on('broadcast', { event: 'new_race' }, ({ payload }) => {
        // Reset state for new race - get fresh currentRoom from store
        const { currentRoom: freshRoom } = useMultiplayerStore.getState()
        setRoom({ ...freshRoom, status: 'waiting', race_text: payload.text })
        setStatus('waiting')
        setFinished(false)
        setMyProgress(0)
        setMyWpm(0)
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [currentRoom?.id, leaveRoom])

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
          max_players: 5,
          current_players: 1,
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
  }, [activeRace.mode, activeRace.sentenceDifficulty, activeRace.timedDuration, activeRace.text])

  const handleToggleRoomSettings = useCallback(() => {
    if (!isHost || status !== 'waiting') return
    if (!roomSettingsOpen) syncRoomSettingsFromActiveRace()
    setRoomSettingsOpen((prev) => !prev)
  }, [isHost, roomSettingsOpen, status, syncRoomSettingsFromActiveRace])

  const handleApplyRoomSettings = useCallback(async () => {
    if (!isHost || !currentRoom?.id || !user?.id || status !== 'waiting') return

    if (!canApplyRoomSettings) {
      toast.error('Custom mode needs at least 30 characters')
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
        .update({ race_text: nextRaceText })
        .eq('id', currentRoom.id)
        .eq('host_id', user.id)
        .eq('status', 'waiting')
        .select()
        .single()

      if (error) throw error

      if (updatedRoom) {
        setRoom(updatedRoom)
      } else {
        setRoom({ ...currentRoom, race_text: nextRaceText })
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
    isHost,
    roomCustomText,
    roomMode,
    roomSentenceDifficulty,
    roomTimedDuration,
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

      // Use live participant count to avoid stale current_players values
      const { count: participantCount, error: participantCountError } = await supabase
        .from('multiplayer_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)

      if (participantCountError) {
        console.error('Error checking room capacity:', participantCountError)
        toast.error('Failed to verify room capacity')
        setLoading(false)
        return
      }

      const currentPlayers = participantCount || 0

      if (currentPlayers >= room.max_players) {
        toast.error('Room is full')
        setLoading(false)
        return
      }

      // Check if user is already in the room
      const { data: existingParticipant } = await supabase
        .from('multiplayer_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .single()

      if (!existingParticipant) {
        const { displayName, avatarUrl } = await resolveCurrentUserIdentity('Player')

        // Add self as participant
        const { error: joinError } = await supabase.from('multiplayer_participants').insert({
          room_id: room.id,
          user_id: user.id,
          display_name: displayName,
          avatar_url: avatarUrl,
        })

        if (joinError) {
          console.error('Error joining:', joinError)
          toast.error('Failed to join room')
          setLoading(false)
          return
        }

        // Update room player count
        const { error: roomCountError } = await supabase
          .from('multiplayer_rooms')
          .update({ current_players: currentPlayers + 1 })
          .eq('id', room.id)

        if (roomCountError) {
          console.error('Error updating room player count:', roomCountError)
        }
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
      
      toast.success('Joined room!')
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

      const { count: participantCount, error: participantCountError } = await supabase
        .from('multiplayer_participants')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)

      if (participantCountError) throw participantCountError
      const currentPlayers = participantCount || 0

      if (currentPlayers >= room.max_players) {
        toast.error('Challenge room is full')
        await handleDeclineInvite(invite)
        return
      }

      const { data: existingParticipant } = await supabase
        .from('multiplayer_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingParticipant) {
        const { displayName, avatarUrl } = await resolveCurrentUserIdentity('Player')
        const { error: joinError } = await supabase
          .from('multiplayer_participants')
          .insert({
            room_id: room.id,
            user_id: user.id,
            display_name: displayName,
            avatar_url: avatarUrl,
          })

        if (joinError) throw joinError

        const { count: syncedCount, error: syncedCountError } = await supabase
          .from('multiplayer_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)

        if (!syncedCountError) {
          await supabase
            .from('multiplayer_rooms')
            .update({ current_players: syncedCount || currentPlayers + 1 })
            .eq('id', room.id)
        }
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

  // Start the race (host only)
  const handleStartRace = async () => {
    if (!isHost || !currentRoom?.id) return
    
    // Require at least 2 participants
    if (participants.length < 2) {
      toast.error('Need at least 2 players to start the race')
      return
    }

    try {
      setFinished(false)
      setMyProgress(0)
      setMyWpm(0)
      setCountdown(3)

      // Countdown
      setStatus('countdown')
      for (let i = 3; i >= 0; i--) {
        setCountdown(i)
        await supabase.channel(`room:${currentRoom.id}`).send({
          type: 'broadcast',
          event: 'countdown',
          payload: { count: i },
        })
        await new Promise(r => setTimeout(r, 1000))
      }

      // Start race
      await supabase
        .from('multiplayer_rooms')
        .update({ status: 'racing', started_at: new Date().toISOString() })
        .eq('id', currentRoom.id)

      await supabase.channel(`room:${currentRoom.id}`).send({
        type: 'broadcast',
        event: 'start',
        payload: {},
      })
    } catch (error) {
      console.error('Error starting race:', error)
      toast.error('Failed to start race')
    }
  }

  // Handle progress update - memoized to prevent infinite loops
  const handleProgress = useCallback(async (progress, wpm) => {
    if (!currentRoom?.id || !user?.id) return

    setMyProgress(progress)
    setMyWpm(wpm)

    // Update own participant record
    await supabase
      .from('multiplayer_participants')
      .update({ progress, wpm })
      .eq('room_id', currentRoom.id)
      .eq('user_id', user.id)

    // Broadcast progress
    await supabase.channel(`room:${currentRoom.id}`).send({
      type: 'broadcast',
      event: 'progress',
      payload: { userId: user.id, progress, wpm },
    })
  }, [currentRoom?.id, user?.id])

  // Handle typing complete - memoized to prevent re-renders
  const handleComplete = useCallback(async (resultData) => {
    if (!currentRoom?.id || !user?.id) return

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

    // Broadcast finish
    await supabase.channel(`room:${currentRoom.id}`).send({
      type: 'broadcast',
      event: 'finish',
      payload: { userId: user.id, wpm: resultData.wpm },
    })

    // Save to typing history
    await supabase.from('typing_history').insert({
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
  }, [
    activeRace.mode,
    activeRace.sentenceDifficulty,
    activeRace.timedDuration,
    activeRaceText,
    currentRoom?.id,
    currentRoom?.room_code,
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
        const { count, error: countError } = await supabase
          .from('multiplayer_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', currentRoom.id)

        if (!countError) {
          const { error: roomUpdateError } = await supabase
            .from('multiplayer_rooms')
            .update({ current_players: count || 0 })
            .eq('id', currentRoom.id)

          if (roomUpdateError) {
            console.error('Error syncing room player count on leave:', roomUpdateError)
          }
        } else {
          console.error('Error counting participants on leave:', countError)
        }
      }
    } catch (error) {
      console.error('Error leaving room:', error)
    } finally {
      leaveRoom()
    }
  }

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
              Players ({participants.length}/5)
            </h2>

            <div className="space-y-3">
              {participants.map((p, idx) => (
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
                  {p.is_ready && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                      Ready
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Start Button (Host only) */}
          {isHost && (
            <motion.button
              whileHover={{ scale: participants.length >= 2 ? 1.02 : 1 }}
              whileTap={{ scale: participants.length >= 2 ? 0.98 : 1 }}
              onClick={handleStartRace}
              disabled={participants.length < 2}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-yellow-400 text-black rounded-xl font-bold text-lg hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-6 h-6" />
              {participants.length < 2 ? 'Waiting for players...' : 'Start Race'}
            </motion.button>
          )}

          {!isHost && (
            <div className="text-center text-gray-400">
              Waiting for host to start the race...
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
              <h2 className="text-lg font-semibold">Race Progress</h2>
              <span className="text-sm text-gray-400">{raceModeLabel}</span>
            </div>
            <div className="space-y-4">
              {participants
                .sort((a, b) => (b.progress || 0) - (a.progress || 0))
                .map((p, idx) => (
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
          {!finished && activeRaceText && (
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

          {!finished && !activeRaceText && (
            <div className="text-center py-10 bg-[#1a1f2e] rounded-2xl border border-gray-700/50">
              <Loader2 className="w-10 h-10 text-yellow-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-400">Loading race text...</p>
            </div>
          )}

          {finished && (
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
              {participants
                .sort((a, b) => (b.wpm || 0) - (a.wpm || 0))
                .map((p, idx) => (
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
    </div>
  )
}

export default MultiplayerLobby
